#!/usr/bin/env bash
# Builds and runs the C++ golden harness, then diffs its output against
# test/golden/js-output.json. See ../README.md for what this does and does
# not prove.
#
# Prerequisites (verified working with these exact versions on Windows via
# winget; any reasonably modern equivalents should work — e.g. on Debian/
# Ubuntu: `apt-get install g++ cmake ninja-build`):
#   - g++ (MinGW-W64 16.1.0, or any C++17 compiler)
#   - cmake (4.4.1) + ninja (1.13.2), to build RE2
#   - git, to fetch RE2 and rapidjson sources
#
# Usage: run from the repo root: bash test/golden/cpp-harness/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEPS="$ROOT/.build-deps"        # scratch dir, gitignored — not committed
LAI="$ROOT/third_party/libaddressinput"
HARNESS="$ROOT/test/golden/cpp-harness"

mkdir -p "$DEPS"
cd "$DEPS"

# --- Fetch build-only dependencies (not vendored — see README) ---
if [ ! -d re2 ]; then
  # A pre-Abseil-dependency release: newer RE2 requires Abseil, which is a
  # much bigger dependency to stand up for this one-off harness.
  git clone --depth 1 --branch 2022-04-01 https://github.com/google/re2.git re2
fi
if [ ! -d rapidjson ]; then
  git clone --depth 1 https://github.com/Tencent/rapidjson.git
fi

# --- Build RE2 (static lib) ---
# Note: RE2's repo has a Bazel `BUILD` file at its root, which collides with
# a `build/` output directory on case-insensitive filesystems (Windows/
# macOS) — hence `cmakebuild`, not `build`.
if [ ! -f re2/cmakebuild/libre2.a ]; then
  cmake -G Ninja -S re2 -B re2/cmakebuild \
    -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DRE2_BUILD_TESTING=OFF
  cmake --build re2/cmakebuild -j
fi

# --- Compile the harness ---
# -O0: an -O1+ build of this exact combination (this RE2 version + this
# rapidjson version + this GCC version) segfaults on startup; -O0 doesn't.
# Not investigated further — performance doesn't matter for a one-off
# comparison tool, and the miscompiled build never produced any output to
# second-guess. If you hit the same thing with a different toolchain, try
# -O0 first before assuming it's a bug in the ported code.
g++ -std=c++17 -O0 \
  -I"$LAI/cpp/include" -I"$LAI/cpp/src" -I"$HARNESS" \
  -I"$DEPS/re2" -I"$DEPS/rapidjson/include" \
  "$HARNESS/main.cc" \
  "$HARNESS/region_data_constants_impl.cc" \
  "$LAI/cpp/src/address_data.cc" \
  "$LAI/cpp/src/address_field.cc" \
  "$LAI/cpp/src/address_field_util.cc" \
  "$LAI/cpp/src/format_element.cc" \
  "$LAI/cpp/src/address_formatter.cc" \
  "$LAI/cpp/src/language.cc" \
  "$LAI/cpp/src/rule.cc" \
  "$LAI/cpp/src/util/json.cc" \
  "$LAI/cpp/src/util/string_split.cc" \
  "$LAI/cpp/src/util/cctype_tolower_equal.cc" \
  "$DEPS/re2/cmakebuild/libre2.a" \
  -o "$DEPS/golden.exe"

# --- Run it ---
export LAI_COUNTRYINFO_PATH="$LAI/testdata/countryinfo.txt"
"$DEPS/golden.exe" "$ROOT/test/golden/corpus.json" "$ROOT/test/golden/cpp-output.json"

echo
echo "Wrote test/golden/cpp-output.json. Comparing against js-output.json..."
node "$HARNESS/compare.cjs" "$ROOT/test/golden/cpp-output.json" "$ROOT/test/golden/js-output.json"
