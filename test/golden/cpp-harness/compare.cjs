// Compares the C++ harness's output (main.cc, which never normalizes —
// it has no AddressNormalizer wired up) against js-output.json's
// `formattedRaw` (also never normalized — see gen-golden-js.ts). Both sides
// format the address exactly as given in corpus.json, so this is a true
// apples-to-apples check of GetFormattedNationalAddress's port. (`formatted`,
// js-output.json's other field, normalizes first and will legitimately
// differ for entries like the BR/KR ones in corpus.json — that's not a bug,
// see ../README.md.)

const fs = require("fs");

const cpp = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const js = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

let mismatches = 0;
for (let i = 0; i < cpp.length; i++) {
  const c = cpp[i];
  const j = js[i];
  const jFormatted = j.formattedRaw;
  const same = JSON.stringify(c.formatted) === JSON.stringify(jFormatted);
  if (!same) {
    mismatches++;
    console.log(`--- entry ${i} (${c.regionCode}) MISMATCH ---`);
    console.log("  input:", JSON.stringify(j.input.address));
    console.log("  C++ :", JSON.stringify(c.formatted));
    console.log("  JS  :", JSON.stringify(jFormatted));
  }
}
console.log(`\n${cpp.length - mismatches}/${cpp.length} entries match.`);
if (mismatches > 0) process.exitCode = 1;
