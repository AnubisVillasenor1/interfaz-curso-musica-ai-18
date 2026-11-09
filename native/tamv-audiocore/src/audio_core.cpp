#include "tamv/audio_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <numeric>
#include <stdexcept>

#if defined(__AVX2__)
#include <immintrin.h>
#endif

namespace tamv {
namespace {

constexpr double kPi = 3.141592653589793238462643383279502884;
constexpr double kFloorDb = -100.0;

const std::array<const char*, 12> kNoteNames = {
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};

const std::array<double, 12> kMajorProfile = {
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88};
const std::array<double, 12> kMinorProfile = {
    6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17};

const std::array<std::array<double, 2>, 7> kBands = {{
    {{0.0, 200.0}},
    {{200.0, 400.0}},
    {{400.0, 800.0}},
    {{800.0, 1600.0}},
    {{1600.0, 3200.0}},
    {{3200.0, 6400.0}},
    {{6400.0, 12000.0}},
}};

const std::array<int, 7> kMajorScale = {0, 2, 4, 5, 7, 9, 11};
const std::array<int, 7> kMinorScale = {0, 2, 3, 5, 7, 8, 10};

double clamp(double value, double minValue, double maxValue) {
  return std::min(maxValue, std::max(minValue, value));
}

double round4(double value) {
  return std::round(value * 10'000.0) / 10'000.0;
}

double dbToAmplitude(double db) {
  if (!std::isfinite(db) || db <= kFloorDb) return 0.0;
  return std::pow(10.0, std::min(0.0, db) / 20.0);
}

std::vector<double> normalizeL2(const std::vector<double>& values) {
  double sum = 0.0;
  for (double value : values) sum += value * value;
  const double norm = std::sqrt(sum);
  if (!std::isfinite(norm) || norm <= 1e-12) return std::vector<double>(values.size(), 0.0);
  std::vector<double> result(values.size());
  for (std::size_t index = 0; index < values.size(); ++index) result[index] = values[index] / norm;
  return result;
}

double pearson(const std::vector<double>& x, const std::vector<double>& y) {
  const std::size_t length = std::min(x.size(), y.size());
  if (length == 0) return 0.0;
  double meanX = 0.0;
  double meanY = 0.0;
  for (std::size_t index = 0; index < length; ++index) {
    meanX += x[index];
    meanY += y[index];
  }
  meanX /= static_cast<double>(length);
  meanY /= static_cast<double>(length);

  double numerator = 0.0;
  double denomX = 0.0;
  double denomY = 0.0;
  for (std::size_t index = 0; index < length; ++index) {
    const double dx = x[index] - meanX;
    const double dy = y[index] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const double denominator = std::sqrt(denomX * denomY);
  return denominator <= 1e-12 ? 0.0 : numerator / denominator;
}

std::array<double, 12> rotate(const std::array<double, 12>& profile, int tonic) {
  std::array<double, 12> rotated{};
  for (int index = 0; index < 12; ++index) {
    rotated[static_cast<std::size_t>((index + tonic) % 12)] = profile[static_cast<std::size_t>(index)];
  }
  return rotated;
}

double keyAffinity(const std::vector<double>& chroma, int tonic, bool major) {
  const auto& scale = major ? kMajorScale : kMinorScale;
  const int third = major ? 4 : 3;
  std::array<double, 12> weights{};
  for (int pc : scale) weights[static_cast<std::size_t>(pc)] = 0.25;
  weights[0] = 1.0;
  weights[static_cast<std::size_t>(third)] = 0.8;
  weights[7] = 0.7;

  double score = 0.0;
  double total = 0.0;
  for (int pc = 0; pc < 12; ++pc) {
    const int relative = ((pc - tonic) % 12 + 12) % 12;
    const double weight = weights[static_cast<std::size_t>(relative)];
    score += chroma[static_cast<std::size_t>(pc)] * weight;
    total += weight;
  }
  return total > 0.0 ? score / total : 0.0;
}

double hzToMel(double hz) {
  return 2595.0 * std::log10(1.0 + hz / 700.0);
}

double melToHz(double mel) {
  return 700.0 * (std::pow(10.0, mel / 2595.0) - 1.0);
}

#if defined(__AVX2__)
double dotAvx2(const double* a, const double* b, std::size_t length) {
  __m256d accumulator = _mm256_setzero_pd();
  std::size_t index = 0;
  for (; index + 4 <= length; index += 4) {
    const __m256d left = _mm256_loadu_pd(a + index);
    const __m256d right = _mm256_loadu_pd(b + index);
    accumulator = _mm256_add_pd(accumulator, _mm256_mul_pd(left, right));
  }
  alignas(32) double lanes[4];
  _mm256_store_pd(lanes, accumulator);
  double total = lanes[0] + lanes[1] + lanes[2] + lanes[3];
  for (; index < length; ++index) total += a[index] * b[index];
  return total;
}
#endif

}  // namespace

std::vector<double> chromaFromSpectrum(const double* spectrumDb, std::size_t size,
                                       const AudioConfig& config) {
  std::vector<double> chroma(12, 0.0);
  if (spectrumDb == nullptr || size == 0 || config.fftSize == 0) return chroma;

  const double binHz = static_cast<double>(config.sampleRate) / static_cast<double>(config.fftSize);
  const double sigma = config.sigmaSemitones > 0.0 ? config.sigmaSemitones : 0.5;

  for (std::size_t bin = 1; bin < size; ++bin) {
    const double frequency = static_cast<double>(bin) * binHz;
    if (frequency < config.minHz || frequency > config.maxHz) continue;
    const double amplitude = dbToAmplitude(spectrumDb[bin]);
    if (amplitude <= 0.0) continue;

    // Cada bin aporta a la clase más cercana, no a las doce. Repartir con una
    // gaussiana amplia inventaba clases vecinas en el registro grave.
    const double midi = 69.0 + 12.0 * std::log2(frequency / config.a4);
    const int nearest = static_cast<int>(std::round(midi));
    const double distance = std::abs(midi - static_cast<double>(nearest));
    if (distance > sigma * 3.0) continue;
    const double weight = std::exp(-0.5 * (distance / sigma) * (distance / sigma));
    if (weight <= 1e-4) continue;
    const int pitchClass = ((nearest % 12) + 12) % 12;
    chroma[static_cast<std::size_t>(pitchClass)] += amplitude * weight;
  }

  return normalizeL2(chroma);
}

KeyEstimate estimateKey(const std::vector<double>& chroma) {
  KeyEstimate estimate;
  if (chroma.size() != 12) return estimate;

  double energy = 0.0;
  for (double value : chroma) energy += std::max(0.0, value);
  if (energy <= 1e-9) return estimate;

  std::vector<KeyCandidate> candidates;
  candidates.reserve(24);
  for (int tonic = 0; tonic < 12; ++tonic) {
    for (int mode = 0; mode < 2; ++mode) {
      const bool major = mode == 0;
      const auto& profile = major ? kMajorProfile : kMinorProfile;
      const auto rotated = rotate(profile, tonic);
      const std::vector<double> profileVector(rotated.begin(), rotated.end());
      const double correlation = clamp(pearson(chroma, profileVector), 0.0, 1.0);
      const double affinity = clamp(keyAffinity(chroma, tonic, major) * 2.5, 0.0, 1.0);
      const double confidence = clamp(0.35 * correlation + 0.65 * affinity, 0.0, 1.0);
      candidates.push_back({std::string(kNoteNames[static_cast<std::size_t>(tonic)]) + (major ? " major" : " minor"),
                            round4(confidence)});
    }
  }

  std::stable_sort(candidates.begin(), candidates.end(),
                   [](const KeyCandidate& left, const KeyCandidate& right) {
                     return left.confidence > right.confidence;
                   });

  estimate.valid = true;
  estimate.key = candidates.front().key;
  estimate.confidence = candidates.front().confidence;
  const std::size_t space = estimate.key.find(' ');
  estimate.tonic = space == std::string::npos ? estimate.key : estimate.key.substr(0, space);
  estimate.mode = estimate.key.size() > space + 1 ? estimate.key.substr(space + 1) : "";
  for (std::size_t index = 0; index < 3 && index < candidates.size(); ++index) {
    estimate.candidates.push_back(candidates[index]);
  }
  return estimate;
}

SpectralContrast spectralContrast(const double* spectrumDb, std::size_t size,
                                  const AudioConfig& config) {
  SpectralContrast contrast;
  if (spectrumDb == nullptr || size == 0 || config.fftSize == 0) return contrast;

  const double binHz = static_cast<double>(config.sampleRate) / static_cast<double>(config.fftSize);
  double sum = 0.0;
  std::size_t defined = 0;

  for (const auto& band : kBands) {
    std::vector<double> values;
    for (std::size_t bin = 1; bin < size; ++bin) {
      const double frequency = static_cast<double>(bin) * binHz;
      if (frequency >= band[0] && frequency < band[1] && std::isfinite(spectrumDb[bin])) {
        values.push_back(spectrumDb[bin]);
      }
    }

    SpectralBand result;
    result.lowHz = band[0];
    result.highHz = band[1];
    if (values.size() < 3) {
      contrast.bands.push_back(result);
      continue;
    }

    std::sort(values.begin(), values.end());
    const std::size_t edge = std::max<std::size_t>(1, static_cast<std::size_t>(std::floor(values.size() * 0.1)));
    const double valley = std::accumulate(values.begin(), values.begin() + static_cast<std::ptrdiff_t>(edge), 0.0) /
                          static_cast<double>(edge);
    const double peak = std::accumulate(values.end() - static_cast<std::ptrdiff_t>(edge), values.end(), 0.0) /
                        static_cast<double>(edge);
    result.defined = true;
    result.valleyDb = valley;
    result.peakDb = peak;
    result.contrastDb = peak - valley;
    contrast.bands.push_back(result);
    sum += result.contrastDb;
    ++defined;
  }

  if (defined > 0) {
    contrast.hasMean = true;
    contrast.meanDb = sum / static_cast<double>(defined);
  }
  return contrast;
}

SpectrumAnalysis analyseSpectrum(const double* spectrumDb, std::size_t size,
                                 const AudioConfig& config) {
  SpectrumAnalysis analysis;
  analysis.binHz = config.fftSize > 0 ? static_cast<double>(config.sampleRate) / static_cast<double>(config.fftSize) : 0.0;
  analysis.chroma = chromaFromSpectrum(spectrumDb, size, config);
  analysis.key = estimateKey(analysis.chroma);
  analysis.contrast = spectralContrast(spectrumDb, size, config);

  if (spectrumDb != nullptr && size > 1) {
    double linear = 0.0;
    std::size_t count = 0;
    for (std::size_t bin = 1; bin < size; ++bin) {
      linear += dbToAmplitude(spectrumDb[bin]);
      ++count;
    }
    analysis.level = count > 0 ? clamp(linear / static_cast<double>(count), 0.0, 1.0) : 0.0;
  }
  return analysis;
}

SpectrumAnalysis analyseWaveform(const float* samples, std::size_t count,
                                 const AudioConfig& config) {
  const auto spectrum = powerSpectrumDb(samples, count, config);
  return analyseSpectrum(spectrum.data(), spectrum.size(), config);
}

StftResult stft(const float* samples, std::size_t count, const AudioConfig& config) {
  if (samples == nullptr || count == 0) throw std::invalid_argument("stft requires samples");
  const Fft fft(config.fftSize);
  const auto window = hannWindow(config.fftSize);
  const std::size_t bins = config.fftSize / 2;
  const std::size_t frames = count <= config.fftSize
                                 ? 1
                                 : 1 + (count - config.fftSize) / config.hopSize;

  StftResult result;
  result.inputLength = count;
  result.fftSize = config.fftSize;
  result.hopSize = config.hopSize;
  result.frames = frames;
  result.bins = bins;
  result.spectrum.resize(frames * bins);
  result.magnitudesDb.resize(frames * bins);

  std::vector<double> frame(config.fftSize, 0.0);
  std::vector<std::complex<double>> transformed(config.fftSize);
  const double scale = 2.0 / static_cast<double>(config.fftSize);
  for (std::size_t frameIndex = 0; frameIndex < frames; ++frameIndex) {
    std::fill(frame.begin(), frame.end(), 0.0);
    const std::size_t offset = frameIndex * config.hopSize;
    const std::size_t take = std::min(config.fftSize, count - offset);
    for (std::size_t index = 0; index < take; ++index) {
      frame[index] = static_cast<double>(samples[offset + index]) * window[index];
    }
    fft.forward(frame.data(), transformed.data());
    for (std::size_t bin = 0; bin < bins; ++bin) {
      result.spectrum[frameIndex * bins + bin] = transformed[bin];
      const double magnitude = std::abs(transformed[bin]) * scale;
      result.magnitudesDb[frameIndex * bins + bin] =
          20.0 * std::log10(magnitude + 1e-12);
    }
  }
  return result;
}

std::vector<double> istft(const StftResult& result, std::size_t outputLength) {
  if (result.fftSize == 0 || result.hopSize == 0 || result.frames == 0 || result.bins == 0) {
    return {};
  }
  const std::size_t length = outputLength > 0 ? outputLength : result.inputLength;
  if (length == 0) return {};

  const Fft fft(result.fftSize);
  const auto window = hannWindow(result.fftSize);
  std::vector<double> output(length, 0.0);
  std::vector<double> weight(length, 0.0);
  std::vector<std::complex<double>> full(result.fftSize);
  std::vector<double> frame(result.fftSize, 0.0);

  for (std::size_t frameIndex = 0; frameIndex < result.frames; ++frameIndex) {
    std::fill(full.begin(), full.end(), std::complex<double>(0.0, 0.0));
    for (std::size_t bin = 0; bin < result.bins; ++bin) {
      full[bin] = result.spectrum[frameIndex * result.bins + bin];
    }
    full[0] = std::complex<double>(full[0].real(), 0.0);
    for (std::size_t bin = result.bins; bin < result.fftSize; ++bin) {
      full[bin] = std::conj(full[result.fftSize - bin]);
    }
    full[result.fftSize / 2] = std::complex<double>(0.0, 0.0);

    fft.inverse(full.data(), frame.data());
    const std::size_t offset = frameIndex * result.hopSize;
    const std::size_t take = std::min(result.fftSize, length - std::min(offset, length));
    for (std::size_t index = 0; index < take; ++index) {
      output[offset + index] += frame[index] * window[index];
      weight[offset + index] += window[index] * window[index];
    }
  }

  for (std::size_t index = 0; index < length; ++index) {
    output[index] = weight[index] > 1e-8 ? output[index] / weight[index] : 0.0;
  }
  return output;
}

CqtResult cqt(const float* samples, std::size_t count, const AudioConfig& config,
              std::size_t binsPerOctave, double fMin, double fMax) {
  if (samples == nullptr || count == 0) throw std::invalid_argument("cqt requires samples");
  if (binsPerOctave == 0 || fMin <= 0.0 || fMax <= fMin) {
    throw std::invalid_argument("cqt requires binsPerOctave > 0 and 0 < fMin < fMax");
  }
  const double safeMax = std::min(fMax, static_cast<double>(config.sampleRate) * 0.5);
  const std::size_t bins =
      static_cast<std::size_t>(std::ceil(static_cast<double>(binsPerOctave) * std::log2(safeMax / fMin))) + 1;
  const std::size_t frames = count <= config.fftSize
                                 ? 1
                                 : 1 + (count - config.fftSize) / config.hopSize;
  const auto window = hannWindow(config.fftSize);
  const double windowSum = std::accumulate(window.begin(), window.end(), 0.0);

  CqtResult result;
  result.frames = frames;
  result.bins = bins;
  result.centerHz.resize(bins);
  result.magnitudes.assign(frames * bins, 0.0);

  for (std::size_t bin = 0; bin < bins; ++bin) {
    result.centerHz[bin] = fMin * std::pow(2.0, static_cast<double>(bin) / static_cast<double>(binsPerOctave));
  }

  for (std::size_t frameIndex = 0; frameIndex < frames; ++frameIndex) {
    const std::size_t offset = frameIndex * config.hopSize;
    const std::size_t take = std::min(config.fftSize, count - offset);
    for (std::size_t bin = 0; bin < bins; ++bin) {
      const double omega = 2.0 * kPi * result.centerHz[bin] / static_cast<double>(config.sampleRate);
      const double stepCos = std::cos(omega);
      const double stepSin = std::sin(omega);
      double cosine = 1.0;
      double sine = 0.0;
      double real = 0.0;
      double imaginary = 0.0;
      for (std::size_t index = 0; index < take; ++index) {
        const double value = static_cast<double>(samples[offset + index]) * window[index];
        real += value * cosine;
        imaginary -= value * sine;
        const double nextCosine = cosine * stepCos - sine * stepSin;
        sine = sine * stepCos + cosine * stepSin;
        cosine = nextCosine;
      }
      const double magnitude =
          windowSum > 0.0 ? 2.0 * std::sqrt(real * real + imaginary * imaginary) / windowSum : 0.0;
      result.magnitudes[frameIndex * bins + bin] = magnitude;
    }
  }
  return result;
}

MelFilterbank melFilterbank(const AudioConfig& config, double fMin, double fMax) {
  MelFilterbank filterbank;
  const std::size_t bands = config.nMel;
  const std::size_t bins = config.fftSize / 2;
  if (bands == 0 || bins == 0 || config.sampleRate == 0) return filterbank;

  const double high = fMax > 0.0 ? fMax : static_cast<double>(config.sampleRate) * 0.5;
  const double low = std::max(0.0, fMin);
  const double lowMel = hzToMel(low);
  const double highMel = hzToMel(high);

  std::vector<double> points(bands + 2);
  for (std::size_t index = 0; index < points.size(); ++index) {
    const double mel = lowMel + (highMel - lowMel) * static_cast<double>(index) /
                                    static_cast<double>(bands + 1);
    points[index] = melToHz(mel);
  }

  filterbank.bands = bands;
  filterbank.bins = bins;
  filterbank.weights.assign(bands * bins, 0.0);
  for (std::size_t band = 0; band < bands; ++band) {
    const double left = points[band];
    const double center = points[band + 1];
    const double right = points[band + 2];
    for (std::size_t bin = 0; bin < bins; ++bin) {
      const double frequency = static_cast<double>(bin) * static_cast<double>(config.sampleRate) /
                               static_cast<double>(config.fftSize);
      double weight = 0.0;
      if (frequency > left && frequency <= center) {
        weight = (frequency - left) / std::max(1e-9, center - left);
      } else if (frequency > center && frequency < right) {
        weight = (right - frequency) / std::max(1e-9, right - center);
      }
      filterbank.weights[band * bins + bin] = weight;
    }
  }
  return filterbank;
}

std::vector<double> applyMel(const double* power, std::size_t size,
                             const MelFilterbank& filterbank) {
  std::vector<double> output(filterbank.bands, 0.0);
  if (power == nullptr || size == 0 || filterbank.bands == 0) return output;
  const std::size_t bins = std::min(size, filterbank.bins);
  for (std::size_t band = 0; band < filterbank.bands; ++band) {
    const double* row = filterbank.weights.data() + band * filterbank.bins;
#if defined(__AVX2__)
    output[band] = dotAvx2(power, row, bins);
#else
    double sum = 0.0;
    for (std::size_t bin = 0; bin < bins; ++bin) sum += power[bin] * row[bin];
    output[band] = sum;
#endif
  }
  return output;
}

std::string coreVersion() {
  return "2.0.0";
}

}  // namespace tamv
