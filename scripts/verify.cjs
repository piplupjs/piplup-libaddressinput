#!/usr/bin/env node

/**
 * Verification script: Checks project health before release
 *
 * Usage: node scripts/verify.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const checks = [
  {
    name: "Git status",
    fn: () => {
      const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
      if (status) throw new Error("Working directory is not clean");
    },
  },
  {
    name: "TypeScript compilation",
    fn: () => {
      execSync("pnpm typecheck", { stdio: "pipe" });
    },
  },
  {
    name: "ESLint",
    fn: () => {
      execSync("pnpm lint", { stdio: "pipe" });
    },
  },
  {
    name: "Tests",
    fn: () => {
      execSync("pnpm test", { stdio: "pipe" });
    },
  },
  {
    name: "Build",
    fn: () => {
      execSync("pnpm build", { stdio: "pipe" });
    },
  },
  {
    name: "Package.json versions match",
    fn: () => {
      const root = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      const core = JSON.parse(fs.readFileSync("packages/core/package.json", "utf-8"));
      const react = JSON.parse(fs.readFileSync("packages/react/package.json", "utf-8"));

      if (root.version !== core.version || root.version !== react.version) {
        throw new Error(
          `Version mismatch: root=${root.version}, core=${core.version}, react=${react.version}`,
        );
      }
    },
  },
  {
    name: "README files exist",
    fn: () => {
      if (!fs.existsSync("packages/core/README.md"))
        throw new Error("packages/core/README.md missing");
      if (!fs.existsSync("packages/react/README.md"))
        throw new Error("packages/react/README.md missing");
    },
  },
  {
    name: "Contributing guide exists",
    fn: () => {
      if (!fs.existsSync("CONTRIBUTING.md")) throw new Error("CONTRIBUTING.md missing");
    },
  },
  {
    name: "Changelog exists",
    fn: () => {
      if (!fs.existsSync("CHANGELOG.md")) throw new Error("CHANGELOG.md missing");
    },
  },
  {
    name: "Dist folders exist",
    fn: () => {
      if (!fs.existsSync("packages/core/dist"))
        throw new Error("packages/core/dist missing — run pnpm build");
      if (!fs.existsSync("packages/react/dist"))
        throw new Error("packages/react/dist missing — run pnpm build");
    },
  },
];

let passed = 0;
let failed = 0;

console.log("🔍 Verifying project health...\n");

for (const check of checks) {
  try {
    process.stdout.write(`  ${check.name}... `);
    check.fn();
    console.log("✓");
    passed++;
  } catch (error) {
    console.log(`✗`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\n❌ Project verification failed!");
  process.exit(1);
} else {
  console.log("\n✅ Project is healthy and ready for release!");
}
