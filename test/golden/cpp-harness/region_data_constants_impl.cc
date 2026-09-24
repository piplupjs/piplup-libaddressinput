// Not part of upstream libaddressinput. Implements region_data_constants.h
// by parsing testdata/countryinfo.txt at process start — the same source
// file scripts/gen-fallback.ts parses to build the JS port's fallback data
// (see .planning/PLAN.md Phase 1/2 and DIVERGENCES.md: upstream's real
// region_data_constants.cc is generated at Google's internal build time and
// isn't in the OSS repo). Using the same input file on both sides makes
// this a genuine cross-language algorithm check: any difference in output
// is a bug in one of the two ports, not a data difference.

#include "region_data_constants.h"

#include <algorithm>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <string>
#include <vector>

namespace i18n {
namespace addressinput {

namespace {

struct DataTable {
  std::map<std::string, std::string> data;      // "data/US" -> raw json
  std::vector<std::string> region_codes;         // sorted, excludes ZZ
  std::string default_region_data;               // data/ZZ
  std::map<std::string, size_t> max_depth;       // region code -> depth

  DataTable() { Load(); }

  void Load() {
    const char* path = std::getenv("LAI_COUNTRYINFO_PATH");
    if (path == nullptr) {
      std::cerr << "LAI_COUNTRYINFO_PATH not set" << std::endl;
      std::exit(1);
    }
    std::ifstream file(path);
    if (!file.is_open()) {
      std::cerr << "Could not open " << path << std::endl;
      std::exit(1);
    }
    std::string line;
    while (std::getline(file, line)) {
      if (line.empty()) continue;
      size_t eq = line.find('=');
      if (eq == std::string::npos) continue;
      std::string key = line.substr(0, eq);
      if (key.size() < 5 || key.compare(0, 5, "data/") != 0) continue;
      std::string json = line.substr(eq + 1);
      // Strip a trailing '\r' if the file has CRLF line endings.
      if (!json.empty() && json.back() == '\r') json.pop_back();
      data[key] = json;
    }

    for (const auto& entry : data) {
      const std::string& key = entry.first;
      // "data/XX" (7 chars) is a top-level region.
      if (key.size() == 7 && key != "data/ZZ") {
        region_codes.push_back(key.substr(5));
      }
    }
    std::sort(region_codes.begin(), region_codes.end());

    auto zz = data.find("data/ZZ");
    if (zz != data.end()) {
      default_region_data = zz->second;
    }
    data.erase("data/ZZ");

    for (const auto& code : region_codes) {
      std::string prefix = "data/" + code + "/";
      size_t depth = 0;
      for (const auto& entry : data) {
        if (entry.first.compare(0, prefix.size(), prefix) == 0) {
          size_t segments = std::count(
              entry.first.begin() + prefix.size(), entry.first.end(), '/') + 1;
          if (segments > depth) depth = segments;
        }
      }
      if (depth > 0) max_depth[code] = depth;
    }
  }
};

const DataTable& GetTable() {
  static const DataTable table;
  return table;
}

}  // namespace

// static
bool RegionDataConstants::IsSupported(const std::string& region_code) {
  const auto& codes = GetTable().region_codes;
  return std::find(codes.begin(), codes.end(), region_code) != codes.end();
}

// static
const std::vector<std::string>& RegionDataConstants::GetRegionCodes() {
  return GetTable().region_codes;
}

// static
std::string RegionDataConstants::GetRegionData(const std::string& region_code) {
  auto it = GetTable().data.find("data/" + region_code);
  return it != GetTable().data.end() ? it->second : std::string();
}

// static
const std::string& RegionDataConstants::GetDefaultRegionData() {
  return GetTable().default_region_data;
}

// static
size_t RegionDataConstants::GetMaxLookupKeyDepth(const std::string& region_code) {
  auto it = GetTable().max_depth.find(region_code);
  return it != GetTable().max_depth.end() ? it->second : 0;
}

}  // namespace addressinput
}  // namespace i18n
