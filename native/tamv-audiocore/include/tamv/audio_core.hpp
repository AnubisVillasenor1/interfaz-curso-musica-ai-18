#pragma once

#include <complex>
#include <cstddef>
#include <string>
#include <vector>

namespace tamv {

/** Contrato compartido con el DSP de navegador y la referencia Python. */
struct AudioConfig {
  std::size_t sampleRate = 48'000;
  std::size_t fftSize = 2'048;
  std::size_t hopSize = 512;
  std::size_t nMel = 128;
  std::size_t nChroma = 12;
  double a4 = 440.0;
  double minHz = 32.7;
  double maxHz = 10'000.0;
  double sigmaSemitones = 0.5;
};

struct KeyCandidate {
  std::string key;
  double confidence = 0.0;
};

struct KeyEstimate {
  bool valid = false;
  std::string key;
  std::string tonic;
  std::string mode;
  double confidence = 0.0;
  std::vector<KeyCandidate> candidates;
};

struct SpectralBand {
  double lowHz = 0.0;
  double highHz = 0.0;
  bool defined = false;
  double peakDb = 0.0;
  double valleyDb = 0.0;
  double contrastDb = 0.0;
};

struct SpectralContrast {
  std::vector<SpectralBand> bands;
  bool hasMean = false;
  double meanDb = 0.0;
};

struct SpectrumAnalysis {
  std::vector<double> chroma;
  KeyEstimate key;
  SpectralContrast contrast;
  double level = 0.0;
  double binHz = 0.0;
};

/** FFT radix-2 iterativa; tamaños potencia de dos. */
class Fft {
 public:
  explicit Fft(std::size_t size);

  std::size_t size() const { return size_; }

  void forward(const double* input, std::complex<double>* output) const;
  void inverse(const std::complex<double>* input, double* output) const;

 private:
  std::size_t size_;
  std::vector<std::size_t> bitReverse_;
  std::vector<std::complex<double>> twiddles_;
};

std::vector<double> hannWindow(std::size_t size);

/** Espectro de magnitud en dB de un frame; bins = fftSize / 2. */
std::vector<double> powerSpectrumDb(const float* samples, std::size_t count,
                                    const AudioConfig& config,
                                    std::size_t frameOffset = 0);

std::vector<double> chromaFromSpectrum(const double* spectrumDb,
                                       std::size_t size,
                                       const AudioConfig& config);

KeyEstimate estimateKey(const std::vector<double>& chroma);

SpectralContrast spectralContrast(const double* spectrumDb, std::size_t size,
                                  const AudioConfig& config);

SpectrumAnalysis analyseSpectrum(const double* spectrumDb, std::size_t size,
                                 const AudioConfig& config);

SpectrumAnalysis analyseWaveform(const float* samples, std::size_t count,
                                 const AudioConfig& config);

struct StftResult {
  std::size_t inputLength = 0;
  std::size_t fftSize = 0;
  std::size_t hopSize = 0;
  std::size_t frames = 0;
  std::size_t bins = 0;
  std::vector<std::complex<double>> spectrum;
  std::vector<double> magnitudesDb;
};

StftResult stft(const float* samples, std::size_t count, const AudioConfig& config);

/** Reconstrucción por overlap-add con normalización de ventana. */
std::vector<double> istft(const StftResult& result, std::size_t outputLength = 0);

struct CqtResult {
  std::size_t frames = 0;
  std::size_t bins = 0;
  std::vector<double> centerHz;
  std::vector<double> magnitudes;
};

/** CQT de referencia por suma directa; no es la ruta SIMD de bajada. */
CqtResult cqt(const float* samples, std::size_t count, const AudioConfig& config,
              std::size_t binsPerOctave = 12, double fMin = 32.7, double fMax = 10'000.0);

struct MelFilterbank {
  std::size_t bands = 0;
  std::size_t bins = 0;
  std::vector<double> weights;
};

MelFilterbank melFilterbank(const AudioConfig& config, double fMin = 0.0,
                            double fMax = 0.0);

std::vector<double> applyMel(const double* power, std::size_t size,
                             const MelFilterbank& filterbank);

std::string coreVersion();

}  // namespace tamv
