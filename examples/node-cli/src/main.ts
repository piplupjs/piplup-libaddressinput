#!/usr/bin/env node
// A CLI that formats, validates, and normalizes an address — with no UI
// at all. Shows @piplup/libaddressinput's headless design: everything here
// is a plain function or a small state-free object, nothing renders.
//
// Usage:
//   pnpm start -- --region US --admin-area CA --locality "Mountain View" \
//     --postal-code 94043 --address-line "1600 Amphitheatre Pkwy" --recipient "Jane Doe"
//   pnpm start -- --help

import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  formatAddress,
  normalize,
  validate,
  getUserProblems,
  type AddressData,
} from "@piplup/libaddressinput";

function printHelp(): void {
  console.log(`Usage: node main.ts [options]

Options:
  --region <CC>            CLDR region code, e.g. US, JP, CA (required)
  --admin-area <value>     Administrative area (state/province)
  --locality <value>       City/town
  --dependent-locality <v> Sub-locality (suburb, district, ...)
  --postal-code <value>    Postal/ZIP code
  --sorting-code <value>   Sorting code (e.g. French CEDEX)
  --address-line <value>   Street address line (repeatable)
  --organization <value>   Organization/company name
  --recipient <value>      Recipient name
  --language <tag>         BCP-47 language tag for the address's content
  --help                   Show this message
`);
}

function parseArgs(argv: string[]): AddressData | undefined {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return undefined;
  }

  const address: AddressData = { regionCode: "" };
  const addressLine: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[++i];
    switch (flag) {
      case "--region":
        address.regionCode = value ?? "";
        break;
      case "--admin-area":
        address.administrativeArea = value;
        break;
      case "--locality":
        address.locality = value;
        break;
      case "--dependent-locality":
        address.dependentLocality = value;
        break;
      case "--postal-code":
        address.postalCode = value;
        break;
      case "--sorting-code":
        address.sortingCode = value;
        break;
      case "--address-line":
        if (value !== undefined) addressLine.push(value);
        break;
      case "--organization":
        address.organization = value;
        break;
      case "--recipient":
        address.recipient = value;
        break;
      case "--language":
        address.languageCode = value;
        break;
      default:
        console.error(`Unknown option: ${flag}`);
        printHelp();
        process.exit(1);
    }
  }

  if (addressLine.length > 0) address.addressLine = addressLine;

  if (address.regionCode.length === 0) {
    console.error("Error: --region is required.\n");
    printHelp();
    process.exit(1);
  }

  return address;
}

async function main(): Promise<void> {
  const address = parseArgs(process.argv.slice(2));
  if (address === undefined) return; // --help

  const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());
  const loaded = await supplier.loadRules(address.regionCode);
  if (!loaded.success) {
    console.error(`Could not load address data for region "${address.regionCode}".`);
    process.exitCode = 1;
    return;
  }

  const normalized = normalize(supplier, address);

  console.log("Formatted address:");
  for (const line of formatAddress(normalized)) {
    console.log(`  ${line}`);
  }

  const problems = getUserProblems(await validate(supplier, normalized));
  if (problems.length === 0) {
    console.log("\nNo validation problems found.");
  } else {
    console.log(`\n${problems.length} validation problem(s):`);
    for (const problem of problems) {
      console.log(`  ${problem.field}: ${problem.problem}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
