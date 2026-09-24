// Compares the C++ harness's output (main.cc, which never normalizes —
// it has no AddressNormalizer wired up) against js-output.json's
// `formattedRaw` (also never normalized — see gen-golden-js.ts) and
// `problemsOffline` (computed against the same bundled countryinfo.txt dataset).
// Both sides format and validate the address exactly as given in corpus.json
// using identical input data, so this is a true apples-to-apples cross-check
// of GetFormattedNationalAddress and AddressValidator::Validate. (`formatted`,
// js-output.json's other field, normalizes first and will legitimately
// differ for entries like the BR/KR ones in corpus.json — that's not a bug,
// see ../README.md.)

const fs = require("fs");

const cpp = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const js = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

function sortProblems(problems) {
  return [...(problems || [])].sort((a, b) => {
    const byField = a.field.localeCompare(b.field);
    return byField !== 0 ? byField : a.problem.localeCompare(b.problem);
  });
}

let formatMismatches = 0;
let problemMismatches = 0;

for (let i = 0; i < cpp.length; i++) {
  const c = cpp[i];
  const j = js[i];
  const jFormatted = j.formattedRaw;
  const sameFormat = JSON.stringify(c.formatted) === JSON.stringify(jFormatted);
  if (!sameFormat) {
    formatMismatches++;
    console.log(`--- entry ${i} (${c.regionCode}) FORMAT MISMATCH ---`);
    console.log("  input:", JSON.stringify(j.input.address));
    console.log("  C++ :", JSON.stringify(c.formatted));
    console.log("  JS  :", JSON.stringify(jFormatted));
  }

  const cProblems = sortProblems(c.problems);
  const jProblems = sortProblems(j.problemsOffline);
  const sameProblems = JSON.stringify(cProblems) === JSON.stringify(jProblems);
  if (!sameProblems) {
    problemMismatches++;
    console.log(`--- entry ${i} (${c.regionCode}) VALIDATION MISMATCH ---`);
    console.log("  input:", JSON.stringify(j.input.address));
    console.log("  C++ :", JSON.stringify(cProblems));
    console.log("  JS  :", JSON.stringify(jProblems));
  }
}

const total = cpp.length;
console.log(`\nFormatting: ${total - formatMismatches}/${total} entries match.`);
console.log(`Validation: ${total - problemMismatches}/${total} entries match.`);

if (formatMismatches > 0 || problemMismatches > 0) {
  process.exitCode = 1;
}
