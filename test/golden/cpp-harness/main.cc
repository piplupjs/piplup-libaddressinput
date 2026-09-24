// Golden-check driver, not part of upstream libaddressinput. Reads
// test/golden/corpus.json, runs each entry's address through upstream's
// real GetFormattedNationalAddress AND AddressValidator::Validate, and
// writes JSON with the same shape as scripts/gen-golden-js.ts's output so
// the two can be diffed directly. See test/golden/README.md.

#include <libaddressinput/address_data.h>
#include <libaddressinput/address_field.h>
#include <libaddressinput/address_formatter.h>
#include <libaddressinput/address_problem.h>
#include <libaddressinput/address_validator.h>
#include <libaddressinput/callback.h>
#include <libaddressinput/null_storage.h>
#include <libaddressinput/preload_supplier.h>
#include <libaddressinput/supplier.h>

#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

#include "testdata_source.h"

using i18n::addressinput::AddressData;
using i18n::addressinput::AddressField;
using i18n::addressinput::AddressProblem;
using i18n::addressinput::AddressValidator;
using i18n::addressinput::BuildCallback;
using i18n::addressinput::FieldProblemMap;
using i18n::addressinput::GetFormattedNationalAddress;
using i18n::addressinput::NullStorage;
using i18n::addressinput::PreloadSupplier;
using i18n::addressinput::TestdataSource;

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

const char* FieldName(AddressField field) {
  switch (field) {
    case i18n::addressinput::COUNTRY: return "COUNTRY";
    case i18n::addressinput::ADMIN_AREA: return "ADMIN_AREA";
    case i18n::addressinput::LOCALITY: return "LOCALITY";
    case i18n::addressinput::DEPENDENT_LOCALITY: return "DEPENDENT_LOCALITY";
    case i18n::addressinput::SORTING_CODE: return "SORTING_CODE";
    case i18n::addressinput::POSTAL_CODE: return "POSTAL_CODE";
    case i18n::addressinput::STREET_ADDRESS: return "STREET_ADDRESS";
    case i18n::addressinput::ORGANIZATION: return "ORGANIZATION";
    case i18n::addressinput::RECIPIENT: return "RECIPIENT";
  }
  return "UNKNOWN";
}

const char* ProblemName(AddressProblem problem) {
  switch (problem) {
    case i18n::addressinput::UNEXPECTED_FIELD: return "UNEXPECTED_FIELD";
    case i18n::addressinput::MISSING_REQUIRED_FIELD: return "MISSING_REQUIRED_FIELD";
    case i18n::addressinput::UNKNOWN_VALUE: return "UNKNOWN_VALUE";
    case i18n::addressinput::INVALID_FORMAT: return "INVALID_FORMAT";
    case i18n::addressinput::MISMATCHING_VALUE: return "MISMATCHING_VALUE";
    case i18n::addressinput::USES_P_O_BOX: return "USES_P_O_BOX";
    case i18n::addressinput::UNSUPPORTED_FIELD: return "UNSUPPORTED_FIELD";
  }
  return "UNKNOWN";
}

// Everything here resolves synchronously in practice: TestdataSource reads
// a local file and invokes its callback immediately, with no real async I/O
// or threading, so by the time LoadRules()/Validate() returns, the
// corresponding *Sync helper below has already captured its result.

class LoadSync {
 public:
  LoadSync() : callback_(BuildCallback(this, &LoadSync::OnLoaded)), success_(false) {}
  void Run(PreloadSupplier* supplier, const std::string& region_code) {
    supplier->LoadRules(region_code, *callback_);
  }
  bool success() const { return success_; }

 private:
  void OnLoaded(bool success, const std::string&, int) { success_ = success; }
  const std::unique_ptr<const PreloadSupplier::Callback> callback_;
  bool success_;
};

class ValidateSync {
 public:
  ValidateSync()
      : callback_(BuildCallback(this, &ValidateSync::OnValidated)), success_(false) {}
  void Run(AddressValidator* validator, const AddressData& address, bool allow_postal,
          bool require_name, const FieldProblemMap* filter, FieldProblemMap* problems) {
    validator->Validate(address, allow_postal, require_name, filter, problems, *callback_);
  }
  bool success() const { return success_; }

 private:
  void OnValidated(bool success, const AddressData&, const FieldProblemMap&) {
    success_ = success;
  }
  const std::unique_ptr<const AddressValidator::Callback> callback_;
  bool success_;
};

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

  const char* countryinfo_path = std::getenv("LAI_COUNTRYINFO_PATH");
  if (countryinfo_path == nullptr) {
    std::cerr << "LAI_COUNTRYINFO_PATH not set" << std::endl;
    return 1;
  }

  PreloadSupplier supplier(
      new TestdataSource(/*aggregate=*/true, countryinfo_path),
      new NullStorage);
  AddressValidator validator(&supplier);
  std::map<std::string, bool> loaded_regions;

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

    // --- Validation ---
    bool allow_postal = false;
    if (entry.HasMember("validateOptions") && entry["validateOptions"].IsObject()) {
      const auto& opts = entry["validateOptions"];
      if (opts.HasMember("allowPostal") && opts["allowPostal"].IsBool()) {
        allow_postal = opts["allowPostal"].GetBool();
      }
    }

    if (!address.region_code.empty()) {
      auto it = loaded_regions.find(address.region_code);
      if (it == loaded_regions.end()) {
        LoadSync load;
        load.Run(&supplier, address.region_code);
        loaded_regions[address.region_code] = load.success();
      }
    }

    FieldProblemMap problems;
    ValidateSync validate;
    validate.Run(&validator, address, allow_postal, /*require_name=*/false,
                /*filter=*/nullptr, &problems);

    rapidjson::Value problemsJson(rapidjson::kArrayType);
    if (validate.success()) {
      for (const auto& pair : problems) {
        rapidjson::Value p(rapidjson::kObjectType);
        p.AddMember("field", rapidjson::Value(FieldName(pair.first), allocator).Move(),
                   allocator);
        p.AddMember("problem", rapidjson::Value(ProblemName(pair.second), allocator).Move(),
                   allocator);
        problemsJson.PushBack(p, allocator);
      }
    }
    result.AddMember("problems", problemsJson, allocator);
    result.AddMember("validateSuccess", validate.success(), allocator);

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
