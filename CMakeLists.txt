cmake_minimum_required(VERSION 3.20)
project(nativefiledialog_js LANGUAGES C CXX)

set(NFD_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/nativefiledialog" CACHE PATH "nativefiledialog-extended source directory")
if(NOT EXISTS "${NFD_SOURCE_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "nativefiledialog-extended submodule is missing; run git submodule update --init --recursive")
endif()
if(NOT NODE_ARCH)
  message(FATAL_ERROR "Build with cmake-js: vp run build:native")
endif()

set(BUILD_SHARED_LIBS ON CACHE BOOL "" FORCE)
set(NFD_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(NFD_INSTALL OFF CACHE BOOL "" FORCE)
set(CMAKE_CXX_STANDARD 17)
add_subdirectory("${NFD_SOURCE_DIR}" nativefiledialog)

if(APPLE)
  set(platform darwin)
elseif(WIN32)
  set(platform win32)
  set_property(TARGET nfd PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
elseif(CMAKE_SYSTEM_NAME STREQUAL "Linux")
  set(platform linux)
else()
  message(FATAL_ERROR "Unsupported platform: ${CMAKE_SYSTEM_NAME}")
endif()

set(output "${CMAKE_CURRENT_SOURCE_DIR}/lib/${platform}-${NODE_ARCH}")
# Ship a single unversioned library in each platform directory.
set_property(TARGET nfd PROPERTY VERSION)
set_property(TARGET nfd PROPERTY SOVERSION)
set_target_properties(nfd PROPERTIES
  LIBRARY_OUTPUT_DIRECTORY "${output}/$<0:>"
  RUNTIME_OUTPUT_DIRECTORY "${output}/$<0:>"
  ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/lib"
)
