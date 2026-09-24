// Golden-check driver, not part of upstream libaddressinput. Reads
// test/golden/corpus.json, runs each entry's address through upstream's
// real GetFormattedNationalAddress, and writes JSON with the same shape as
// scripts/gen-golden-js.ts's output so the two can be diffed directly. See
// test/golden/README.md.

#include <libaddressinput/address_data.h>
#include <libaddressinput/address_formatter.h>

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

using i18n::addressinput::AddressData;
using i18n::addressinput::GetFormattedNationalAddress;

namespace {

std::string GetStr(const rapidjson::Value& obj, const char* key) {
  if (obj.HasMember(key) && obj[key].IsString()) {
    return obj[key].GetString();
  }
  return std::string();
}

AddressData BuildAddress(const rapidjson::Value& obj) {
  AddressData address;
  address.region_code = GetStr(obj, "regionCode");
  address.administrative_area = GetStr(obj, "administrativeArea");
  address.locality = GetStr(obj, "locality");
  address.dependent_locality = GetStr(obj, "dependentLocality");
  address.postal_code = GetStr(obj, "postalCode");
  address.sorting_code = GetStr(obj, "sortingCode");
  address.language_code = GetStr(obj, "languageCode");
  address.organization = GetStr(obj, "organization");
  address.recipient = GetStr(obj, "recipient");
  if (obj.HasMember("addressLine") && obj["addressLine"].IsArray()) {
    for (const auto& line : obj["addressLine"].GetArray()) {
      if (line.IsString()) address.address_line.emplace_back(line.GetString());
    }
  }
  return address;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc != 3) {
    std::cerr << "Usage: " << argv[0] << " <corpus.json> <output.json>" << std::endl;
    return 1;
  }

  std::ifstream in(argv[1]);
  if (!in.is_open()) {
    std::cerr << "Could not open " << argv[1] << std::endl;
    return 1;
  }
  std::stringstream buffer;
  buffer << in.rdbuf();
  std::string content = buffer.str();

  rapidjson::Document doc;
  doc.Parse(content.c_str());
  if (doc.HasParseError() || !doc.IsArray()) {
    std::cerr << "Failed to parse corpus JSON" << std::endl;
    return 1;
  }

  rapidjson::Document out;
  out.SetArray();
  auto& allocator = out.GetAllocator();

  for (const auto& entry : doc.GetArray()) {
    const rapidjson::Value& addressJson = entry["address"];
    AddressData address = BuildAddress(addressJson);

    std::vector<std::string> lines;
    GetFormattedNationalAddress(address, &lines);

    rapidjson::Value result(rapidjson::kObjectType);
    result.AddMember(
        "regionCode",
        rapidjson::Value(address.region_code.c_str(), allocator).Move(),
        allocator);

    rapidjson::Value formatted(rapidjson::kArrayType);
    for (const auto& line : lines) {
      formatted.PushBack(rapidjson::Value(line.c_str(), allocator).Move(), allocator);
    }
    result.AddMember("formatted", formatted, allocator);

    out.PushBack(result, allocator);
  }

  rapidjson::StringBuffer sb;
  rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
  out.Accept(writer);

  std::ofstream outFile(argv[2]);
  outFile << sb.GetString();
  outFile.close();

  std::cout << "Wrote " << argv[2] << ": " << doc.Size() << " corpus entries." << std::endl;
  return 0;
}
