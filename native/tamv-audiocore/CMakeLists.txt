cmake_minimum_required(VERSION 3.16)
project(tamv_audiocore VERSION 2.0.0 LANGUAGES CXX)

option(TAMV_BUILD_TESTS "Build the C++ contract tests" ON)
option(TAMV_ENABLE_AVX2 "Compile the SIMD path with AVX2 (x86-64 only)" OFF)
option(TAMV_ENABLE_AVX512 "Compile the SIMD path with AVX-512F (x86-64 only)" OFF)
option(TAMV_WITH_PYBIND11 "Build the optional pybind11 extension" OFF)
option(TAMV_WITH_TORCH "Build the optional LibTorch tensor bridge" OFF)

add_library(tamv_audiocore
  src/fft.cpp
  src/audio_core.cpp
)
add_library(tamv::audiocore ALIAS tamv_audiocore)

target_compile_features(tamv_audiocore PUBLIC cxx_std_17)
target_include_directories(tamv_audiocore
  PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
set_target_properties(tamv_audiocore PROPERTIES
  POSITION_INDEPENDENT_CODE ON
  CXX_EXTENSIONS OFF
)

if(MSVC)
  target_compile_options(tamv_audiocore PRIVATE /W4 /O2)
else()
  target_compile_options(tamv_audiocore PRIVATE -O3 -Wall -Wextra -Wpedantic)
endif()

if(TAMV_ENABLE_AVX2)
  if(MSVC)
    target_compile_options(tamv_audiocore PRIVATE /arch:AVX2)
  else()
    target_compile_options(tamv_audiocore PRIVATE -mavx2)
  endif()
endif()

if(TAMV_ENABLE_AVX512)
  if(MSVC)
    target_compile_options(tamv_audiocore PRIVATE /arch:AVX512)
  else()
    target_compile_options(tamv_audiocore PRIVATE -mavx512f)
  endif()
endif()

if(TAMV_BUILD_TESTS)
  enable_testing()
  add_executable(tamv_audio_core_tests tests/test_audio_core.cpp)
  target_link_libraries(tamv_audio_core_tests PRIVATE tamv_audiocore)
  if(MSVC)
    target_compile_options(tamv_audio_core_tests PRIVATE /W4)
  else()
    target_compile_options(tamv_audio_core_tests PRIVATE -Wall -Wextra -Wpedantic)
  endif()
  add_test(NAME tamv_audio_core_contract COMMAND tamv_audio_core_tests)
endif()

if(TAMV_WITH_PYBIND11)
  find_package(pybind11 CONFIG REQUIRED)
  pybind11_add_module(tamv_audio_core_ext bindings/pybind_module.cpp)
  target_link_libraries(tamv_audio_core_ext PRIVATE tamv_audiocore)
  target_include_directories(tamv_audio_core_ext PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
endif()

if(TAMV_WITH_TORCH)
  find_package(Torch REQUIRED)
  add_library(tamv_torch_bridge MODULE bindings/torch_bridge.cpp)
  target_include_directories(tamv_torch_bridge PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
  target_link_libraries(tamv_torch_bridge PRIVATE tamv_audiocore ${TORCH_LIBRARIES})
  target_compile_definitions(tamv_torch_bridge PRIVATE TORCH_EXTENSION_NAME=tamv_torch_bridge)
  set_target_properties(tamv_torch_bridge PROPERTIES PREFIX "")
endif()

include(GNUInstallDirs)
install(TARGETS tamv_audiocore
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
