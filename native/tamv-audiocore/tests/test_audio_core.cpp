#include <algorithm>
#include <cmath>
#include <complex>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "tamv/audio_core.hpp"

namespace {

constexpr double kPi = 3.141592653589793238462643383279502884;
int failures = 0;

void check(bool condition, const std::string& label) {
  if (condition) {
    std::cout << "PASS " << label << '\n';
  } else {
    std::cout << "FAIL " << label << '\n';
    ++failures;
  }
}

std::vector<double> spectrumAt(std::initializer_list<double> frequencies,
                               const tamv::AudioConfig& config) {
  const std::size_t bins = config.fftSize / 2;
  std::vector<double> db(bins, -100.0);
  const double binHz = static_cast<double>(config.sampleRate) / static_cast<double>(config.fftSize);
  for (double frequency : frequencies) {
    const double center = frequency / binHz;
    for (std::size_t bin = 1; bin < bins; ++bin) {
      const double distance = (static_cast<double>(bin) - center) / 1.2;
      const double value = -100.0 + 100.0 * std::exp(-0.5 * distance * distance);
      if (value > db[bin]) db[bin] = value;
    }
  }
  return db;
}

std::vector<float> sine(double frequency, std::size_t length, double amplitude,
                        std::size_t sampleRate) {
  std::vector<float> samples(length);
  for (std::size_t index = 0; index < length; ++index) {
    samples[index] = static_cast<float>(
        amplitude * std::sin(2.0 * kPi * frequency * static_cast<double>(index) /
                             static_cast<double>(sampleRate)));
  }
  return samples;
}

double rmsDifference(const std::vector<double>& left, const std::vector<float>& right,
                     std::size_t from, std::size_t to) {
  const std::size_t end = std::min({left.size(), right.size(), to});
  if (from >= end) return 0.0;
  double sum = 0.0;
  for (std::size_t index = from; index < end; ++index) {
    const double delta = left[index] - static_cast<double>(right[index]);
    sum += delta * delta;
  }
  return std::sqrt(sum / static_cast<double>(end - from));
}

void testFftRoundTrip() {
  const std::size_t size = 1024;
  tamv::Fft fft(size);
  std::vector<double> input(size);
  for (std::size_t index = 0; index < size; ++index) {
    input[index] = std::sin(2.0 * kPi * 100.0 * static_cast<double>(index) / 48'000.0);
  }
  std::vector<std::complex<double>> spectrum(size);
  fft.forward(input.data(), spectrum.data());

  std::size_t peak = 0;
  double peakMagnitude = 0.0;
  for (std::size_t bin = 1; bin < size / 2; ++bin) {
    const double magnitude = std::abs(spectrum[bin]);
    if (magnitude > peakMagnitude) {
      peakMagnitude = magnitude;
      peak = bin;
    }
  }
  const double binHz = 48'000.0 / static_cast<double>(size);
  check(peak == 2 || std::abs(static_cast<double>(peak) - 100.0 / binHz) < 1.0,
        "FFT finds the 100 Hz bin");

  std::vector<double> reconstructed(size);
  fft.inverse(spectrum.data(), reconstructed.data());
  double maxError = 0.0;
  for (std::size_t index = 0; index < size; ++index) {
    maxError = std::max(maxError, std::abs(reconstructed[index] - input[index]));
  }
  check(maxError < 1e-9, "FFT inverse reconstructs the original frame");
}

void testChromaAndKey() {
  tamv::AudioConfig config;
  const auto a4 = tamv::analyseSpectrum(spectrumAt({440.0}, config).data(),
                                        config.fftSize / 2, config);
  std::size_t argmax = 0;
  for (std::size_t index = 1; index < a4.chroma.size(); ++index) {
    if (a4.chroma[index] > a4.chroma[argmax]) argmax = index;
  }
  check(argmax == 9, "A4 lands on pitch class A");
  check(a4.key.valid && a4.key.tonic == "A", "A4 tonic is A");

  const auto cMajor = tamv::analyseSpectrum(
      spectrumAt({261.63, 329.63, 392.0}, config).data(), config.fftSize / 2, config);
  check(cMajor.key.valid && cMajor.key.key == "C major", "C major triad is detected");
  check(cMajor.chroma.size() == 12, "chroma always has 12 classes");
  check(cMajor.contrast.bands.size() == 7 && cMajor.contrast.hasMean && cMajor.contrast.meanDb > 0.0,
        "spectral contrast has seven defined bands");

  const auto aMinor = tamv::analyseSpectrum(
      spectrumAt({440.0, 523.25, 659.25}, config).data(), config.fftSize / 2, config);
  check(aMinor.key.valid && aMinor.key.key == "A minor", "A minor triad is detected");

  std::vector<double> silence(config.fftSize / 2, -100.0);
  const auto empty = tamv::analyseSpectrum(silence.data(), silence.size(), config);
  check(!empty.key.valid && empty.key.key.empty(), "silence does not invent a key");
  check(empty.level == 0.0, "silence has zero level");
}

void testStftIstft() {
  tamv::AudioConfig config;
  config.fftSize = 1024;
  config.hopSize = 256;
  const auto samples = sine(220.0, 8192, 0.5, 48'000);

  const auto transformed = tamv::stft(samples.data(), samples.size(), config);
  check(transformed.frames > 1 && transformed.bins == config.fftSize / 2,
        "STFT produces multiple frames");
  check(transformed.magnitudesDb.size() == transformed.frames * transformed.bins,
        "STFT magnitude buffer matches frame layout");

  const auto reconstructed = tamv::istft(transformed);
  const double error = rmsDifference(reconstructed, samples, config.fftSize,
                                     samples.size() - config.fftSize);
  check(reconstructed.size() == samples.size(), "ISTFT preserves length");
  check(error < 1e-3, "ISTFT reconstructs the waveform in the interior");
}

void testCqt() {
  tamv::AudioConfig config;
  const auto samples = sine(440.0, 24'000, 0.6, 48'000);
  const auto transformed = tamv::cqt(samples.data(), samples.size(), config, 12, 220.0, 880.0);
  check(transformed.frames >= 1 && transformed.bins >= 20, "CQT has frames and semitone bins");
  check(transformed.centerHz.front() > 219.0 && transformed.centerHz.front() < 221.0,
        "CQT starts at the requested frequency");

  double best = 0.0;
  std::size_t bestBin = 0;
  for (std::size_t bin = 0; bin < transformed.bins; ++bin) {
    const double magnitude = transformed.magnitudes[bin];
    if (magnitude > best) {
      best = magnitude;
      bestBin = bin;
    }
  }
  const double ratio = transformed.centerHz[bestBin] / 440.0;
  const double semitones = 12.0 * std::log2(ratio);
  check(std::abs(semitones) <= 1.0, "CQT peak is within one semitone of A4");
}

void testMel() {
  tamv::AudioConfig config;
  config.nMel = 32;
  const auto filterbank = tamv::melFilterbank(config, 20.0, 12'000.0);
  check(filterbank.bands == 32 && filterbank.bins == config.fftSize / 2,
        "Mel filterbank has the requested shape");
  bool nonNegative = true;
  bool hasWeight = false;
  for (double weight : filterbank.weights) {
    if (!std::isfinite(weight) || weight < 0.0) nonNegative = false;
    if (weight > 0.0) hasWeight = true;
  }
  check(nonNegative && hasWeight, "Mel weights are finite and non-negative");

  std::vector<double> power(filterbank.bins, 1.0);
  const auto energies = tamv::applyMel(power.data(), power.size(), filterbank);
  bool positive = true;
  for (double energy : energies) {
    if (!std::isfinite(energy) || energy <= 0.0) positive = false;
  }
  check(energies.size() == config.nMel && positive, "Mel energies are positive for flat power");
}

void testWavAnalysis() {
  tamv::AudioConfig config;
  const auto samples = sine(440.0, 4096, 0.7, 48'000);
  const auto analysis = tamv::analyseWaveform(samples.data(), samples.size(), config);
  check(analysis.chroma.size() == 12 && analysis.binHz > 0.0, "waveform analysis exposes the contract");
  check(analysis.level > 0.0 && analysis.level <= 1.0, "waveform level is bounded");
}

}  // namespace

int main() {
  std::cout << "TAMV-AudioCore " << tamv::coreVersion() << " tests\n";
  testFftRoundTrip();
  testChromaAndKey();
  testStftIstft();
  testCqt();
  testMel();
  testWavAnalysis();

  if (failures > 0) {
    std::cout << failures << " checks failed\n";
    return EXIT_FAILURE;
  }
  std::cout << "All native audio core checks passed\n";
  return EXIT_SUCCESS;
}
