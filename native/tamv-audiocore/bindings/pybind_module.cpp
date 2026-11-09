#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <string>
#include <vector>

#include "tamv/audio_core.hpp"

namespace py = pybind11;

namespace {

py::dict analysisToDict(const tamv::SpectrumAnalysis& analysis) {
  py::dict result;
  result["chroma"] = py::cast(analysis.chroma);
  result["level"] = analysis.level;
  result["binHz"] = analysis.binHz;
  result["coreVersion"] = tamv::coreVersion();

  py::dict key;
  key["valid"] = analysis.key.valid;
  if (analysis.key.valid) {
    key["key"] = analysis.key.key;
    key["tonic"] = analysis.key.tonic;
    key["mode"] = analysis.key.mode;
  } else {
    key["key"] = py::none();
    key["tonic"] = py::none();
    key["mode"] = py::none();
  }
  key["confidence"] = analysis.key.confidence;
  py::list candidates;
  for (const auto& candidate : analysis.key.candidates) {
    py::dict item;
    item["key"] = candidate.key;
    item["confidence"] = candidate.confidence;
    candidates.append(item);
  }
  key["candidates"] = candidates;
  result["key"] = key;

  py::dict contrast;
  contrast["hasMean"] = analysis.contrast.hasMean;
  if (analysis.contrast.hasMean) {
    contrast["meanDb"] = analysis.contrast.meanDb;
  } else {
    contrast["meanDb"] = py::none();
  }
  py::list bands;
  for (const auto& band : analysis.contrast.bands) {
    py::dict item;
    item["lowHz"] = band.lowHz;
    item["highHz"] = band.highHz;
    if (band.defined) {
      item["peakDb"] = band.peakDb;
      item["valleyDb"] = band.valleyDb;
      item["contrastDb"] = band.contrastDb;
    } else {
      item["peakDb"] = py::none();
      item["valleyDb"] = py::none();
      item["contrastDb"] = py::none();
    }
    bands.append(item);
  }
  contrast["bands"] = bands;
  result["contrast"] = contrast;
  return result;
}

tamv::AudioConfig makeConfig(int sampleRate, int fftSize, int hopSize) {
  if (sampleRate < 8'000 || sampleRate > 192'000) {
    throw std::invalid_argument("sample_rate must be between 8000 and 192000");
  }
  if (fftSize < 256 || fftSize > 32'768 || (fftSize & (fftSize - 1)) != 0) {
    throw std::invalid_argument("fft_size must be a power of two between 256 and 32768");
  }
  if (hopSize < 1 || hopSize > fftSize) {
    throw std::invalid_argument("hop_size must be between 1 and fft_size");
  }
  tamv::AudioConfig config;
  config.sampleRate = static_cast<std::size_t>(sampleRate);
  config.fftSize = static_cast<std::size_t>(fftSize);
  config.hopSize = static_cast<std::size_t>(hopSize);
  return config;
}

py::dict analyseWaveform(
    py::array_t<float, py::array::c_style | py::array::forcecast> samples,
    int sampleRate,
    int fftSize,
    int hopSize) {
  const auto config = makeConfig(sampleRate, fftSize, hopSize);
  const auto buffer = samples.request();
  if (buffer.size == 0) throw std::invalid_argument("samples must not be empty");
  const auto analysis = tamv::analyseWaveform(static_cast<const float*>(buffer.ptr),
                                              static_cast<std::size_t>(buffer.size), config);
  return analysisToDict(analysis);
}

py::dict analyseSpectrumDb(
    py::array_t<double, py::array::c_style | py::array::forcecast> spectrumDb,
    int sampleRate,
    int fftSize) {
  const auto config = makeConfig(sampleRate, fftSize, fftSize / 2);
  const auto buffer = spectrumDb.request();
  if (buffer.size < 2) throw std::invalid_argument("spectrum_db must contain at least two bins");
  const auto analysis = tamv::analyseSpectrum(static_cast<const double*>(buffer.ptr),
                                              static_cast<std::size_t>(buffer.size), config);
  return analysisToDict(analysis);
}

py::dict stftMagnitudes(
    py::array_t<float, py::array::c_style | py::array::forcecast> samples,
    int sampleRate,
    int fftSize,
    int hopSize) {
  const auto config = makeConfig(sampleRate, fftSize, hopSize);
  const auto buffer = samples.request();
  if (buffer.size == 0) throw std::invalid_argument("samples must not be empty");
  const auto transformed = tamv::stft(static_cast<const float*>(buffer.ptr),
                                      static_cast<std::size_t>(buffer.size), config);
  py::dict result;
  result["frames"] = transformed.frames;
  result["bins"] = transformed.bins;
  result["fftSize"] = transformed.fftSize;
  result["hopSize"] = transformed.hopSize;
  result["magnitudesDb"] = py::cast(transformed.magnitudesDb);
  return result;
}

py::dict cqtMagnitudes(
    py::array_t<float, py::array::c_style | py::array::forcecast> samples,
    int sampleRate,
    int fftSize,
    int hopSize,
    int binsPerOctave,
    double fMin,
    double fMax) {
  const auto config = makeConfig(sampleRate, fftSize, hopSize);
  const auto buffer = samples.request();
  if (buffer.size == 0) throw std::invalid_argument("samples must not be empty");
  const auto transformed = tamv::cqt(static_cast<const float*>(buffer.ptr),
                                     static_cast<std::size_t>(buffer.size), config,
                                     static_cast<std::size_t>(binsPerOctave), fMin, fMax);
  py::dict result;
  result["frames"] = transformed.frames;
  result["bins"] = transformed.bins;
  result["centerHz"] = py::cast(transformed.centerHz);
  result["magnitudes"] = py::cast(transformed.magnitudes);
  return result;
}

py::dict melEnergies(
    py::array_t<double, py::array::c_style | py::array::forcecast> power,
    int sampleRate,
    int fftSize,
    int melBands) {
  tamv::AudioConfig config = makeConfig(sampleRate, fftSize, fftSize / 2);
  config.nMel = static_cast<std::size_t>(melBands);
  const auto buffer = power.request();
  if (buffer.size == 0) throw std::invalid_argument("power must not be empty");
  const auto filterbank = tamv::melFilterbank(config);
  const auto energies = tamv::applyMel(static_cast<const double*>(buffer.ptr),
                                       static_cast<std::size_t>(buffer.size), filterbank);
  py::dict result;
  result["bands"] = filterbank.bands;
  result["bins"] = filterbank.bins;
  result["energies"] = py::cast(energies);
  return result;
}

}  // namespace

PYBIND11_MODULE(tamv_audio_core_ext, module) {
  module.doc() = "TAMV-AudioCore v2.0 native DSP extension";
  module.attr("__version__") = tamv::coreVersion();

  module.def("analyse_waveform", &analyseWaveform, py::arg("samples"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             py::arg("hop_size") = 512,
             "Analyze a mono float32 waveform and return chroma, key and contrast.");

  module.def("analyse_spectrum_db", &analyseSpectrumDb, py::arg("spectrum_db"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             "Analyze an FFT magnitude spectrum expressed in dB.");

  module.def("stft_magnitudes", &stftMagnitudes, py::arg("samples"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             py::arg("hop_size") = 512, "Return STFT magnitudes in dB.");

  module.def("cqt_magnitudes", &cqtMagnitudes, py::arg("samples"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             py::arg("hop_size") = 512, py::arg("bins_per_octave") = 12,
             py::arg("f_min") = 32.7, py::arg("f_max") = 10'000.0,
             "Return a reference constant-Q transform.");

  module.def("mel_energies", &melEnergies, py::arg("power"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             py::arg("mel_bands") = 128, "Apply a triangular Mel filterbank.");
}
