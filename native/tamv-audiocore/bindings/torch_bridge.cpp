#include <torch/extension.h>

#include <cstddef>

#include "tamv/audio_core.hpp"

namespace {

torch::Tensor waveformChroma(torch::Tensor waveform, int64_t sampleRate, int64_t fftSize) {
  TORCH_CHECK(waveform.dim() == 1, "waveform must be a 1-D mono tensor");
  TORCH_CHECK(waveform.numel() > 0, "waveform must not be empty");
  TORCH_CHECK(waveform.scalar_type() == torch::kFloat32 || waveform.scalar_type() == torch::kFloat64,
              "waveform must be float32 or float64");

  auto contiguous = waveform.contiguous().to(torch::kFloat32);
  tamv::AudioConfig config;
  config.sampleRate = static_cast<std::size_t>(sampleRate);
  config.fftSize = static_cast<std::size_t>(fftSize);
  config.hopSize = config.fftSize / 4;

  const auto analysis = tamv::analyseWaveform(contiguous.data_ptr<float>(),
                                              static_cast<std::size_t>(contiguous.numel()), config);
  auto output = torch::zeros({12}, torch::dtype(torch::kFloat32));
  for (std::size_t index = 0; index < analysis.chroma.size(); ++index) {
    output[static_cast<int64_t>(index)] = static_cast<float>(analysis.chroma[index]);
  }
  return output;
}

}  // namespace

PYBIND11_MODULE(TORCH_EXTENSION_NAME, module) {
  module.doc() = "TAMV-AudioCore optional LibTorch tensor bridge";
  module.def("waveform_chroma", &waveformChroma, py::arg("waveform"),
             py::arg("sample_rate") = 48'000, py::arg("fft_size") = 2'048,
             "Return the 12-class chroma of a 1-D waveform tensor as float32.");
}
