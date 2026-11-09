#include "tamv/audio_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace tamv {
namespace {

constexpr double kPi = 3.141592653589793238462643383279502884;

bool isPowerOfTwo(std::size_t value) {
  return value > 0 && (value & (value - 1)) == 0;
}

}  // namespace

Fft::Fft(std::size_t size) : size_(size) {
  if (!isPowerOfTwo(size_) || size_ < 2) {
    throw std::invalid_argument("FFT size must be a power of two greater than one");
  }

  bitReverse_.resize(size_);
  std::size_t bits = 0;
  while ((std::size_t{1} << bits) < size_) ++bits;
  for (std::size_t index = 0; index < size_; ++index) {
    std::size_t reversed = 0;
    for (std::size_t bit = 0; bit < bits; ++bit) {
      if ((index >> bit) & 1U) reversed |= std::size_t{1} << (bits - 1 - bit);
    }
    bitReverse_[index] = reversed;
  }

  twiddles_.resize(size_ / 2);
  for (std::size_t index = 0; index < size_ / 2; ++index) {
    const double angle = -2.0 * kPi * static_cast<double>(index) / static_cast<double>(size_);
    twiddles_[index] = std::complex<double>(std::cos(angle), std::sin(angle));
  }
}

void Fft::forward(const double* input, std::complex<double>* output) const {
  for (std::size_t index = 0; index < size_; ++index) {
    output[index] = std::complex<double>(input[bitReverse_[index]], 0.0);
  }

  for (std::size_t length = 2; length <= size_; length <<= 1) {
    const std::size_t half = length / 2;
    const std::size_t stride = size_ / length;
    for (std::size_t start = 0; start < size_; start += length) {
      for (std::size_t offset = 0; offset < half; ++offset) {
        const std::complex<double> even = output[start + offset];
        const std::complex<double> odd =
            output[start + offset + half] * twiddles_[offset * stride];
        output[start + offset] = even + odd;
        output[start + offset + half] = even - odd;
      }
    }
  }
}

void Fft::inverse(const std::complex<double>* input, double* output) const {
  std::vector<std::complex<double>> conjugated(size_);
  for (std::size_t index = 0; index < size_; ++index) {
    conjugated[index] = std::conj(input[index]);
  }

  std::vector<std::complex<double>> transformed(size_);
  for (std::size_t index = 0; index < size_; ++index) {
    transformed[index] = std::complex<double>(conjugated[bitReverse_[index]].real(),
                                              conjugated[bitReverse_[index]].imag());
  }

  for (std::size_t length = 2; length <= size_; length <<= 1) {
    const std::size_t half = length / 2;
    const std::size_t stride = size_ / length;
    for (std::size_t start = 0; start < size_; start += length) {
      for (std::size_t offset = 0; offset < half; ++offset) {
        const std::complex<double> even = transformed[start + offset];
        const std::complex<double> odd =
            transformed[start + offset + half] * twiddles_[offset * stride];
        transformed[start + offset] = even + odd;
        transformed[start + offset + half] = even - odd;
      }
    }
  }

  for (std::size_t index = 0; index < size_; ++index) {
    output[index] = std::conj(transformed[index]).real() / static_cast<double>(size_);
  }
}

std::vector<double> hannWindow(std::size_t size) {
  std::vector<double> window(size, 1.0);
  if (size == 0) return window;
  if (size == 1) {
    window[0] = 0.0;
    return window;
  }
  for (std::size_t index = 0; index < size; ++index) {
    window[index] = 0.5 - 0.5 * std::cos(2.0 * kPi * static_cast<double>(index) /
                                        static_cast<double>(size - 1));
  }
  return window;
}

std::vector<double> powerSpectrumDb(const float* samples, std::size_t count,
                                    const AudioConfig& config,
                                    std::size_t frameOffset) {
  if (samples == nullptr || count == 0) {
    throw std::invalid_argument("powerSpectrumDb requires non-empty samples");
  }
  const Fft fft(config.fftSize);
  const auto window = hannWindow(config.fftSize);
  std::vector<double> frame(config.fftSize, 0.0);
  const std::size_t available = count > frameOffset ? count - frameOffset : 0;
  const std::size_t take = std::min(available, config.fftSize);
  for (std::size_t index = 0; index < take; ++index) {
    frame[index] = static_cast<double>(samples[frameOffset + index]) * window[index];
  }

  std::vector<std::complex<double>> spectrum(config.fftSize);
  fft.forward(frame.data(), spectrum.data());

  const std::size_t bins = config.fftSize / 2;
  std::vector<double> db(bins, -100.0);
  const double scale = 2.0 / static_cast<double>(config.fftSize);
  for (std::size_t bin = 0; bin < bins; ++bin) {
    const double magnitude = std::abs(spectrum[bin]) * scale;
    db[bin] = 20.0 * std::log10(magnitude + 1e-12);
  }
  return db;
}

}  // namespace tamv
