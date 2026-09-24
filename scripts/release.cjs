#!/usr/bin/env node

/**
 * Release script: Bumps versions and updates CHANGELOG
 *
 * Usage: node scripts/release.js [patch|minor|major]
 *
 * Defaults to 'patch' if no argument provided.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const releaseType = process.argv[2] || "patch";

// Derive GitHub repo URL from git config
let repoUrl = "https://github.com/piplup/libaddressinput";
try {
  const originUrl = execSync("git config --get remote.origin.url", { encoding: "utf-8" }).trim();
  if (originUrl) {
    // Convert git@github.com:owner/repo.git or https://github.com/owner/repo.git to https://github.com/owner/repo
    repoUrl = originUrl
      .replace(/^git@github\.com:/, "https://github.com/")
      .replace(/\.git$/, "");
  }
} catch {
  console.warn("⚠️  Could not read git remote URL, using default");
}

if (!["patch", "minor", "major"].includes(releaseType)) {
  console.error(`Invalid release type: ${releaseType}`);
  console.error("Must be one of: patch, minor, major");
  process.exit(1);
}

try {
  console.log(`🚀 Preparing ${releaseType} release...`);

  // Get current version from root package.json
  const rootPkgPath = path.join(__dirname, "../package.json");
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));

  // Parse current version
  const [major, minor, patch] = rootPkg.version.split(".").map(Number);

  let newVersion;
  switch (releaseType) {
    case "major":
      newVersion = `${major + 1}.0.0`;
      break;
    case "minor":
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case "patch":
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  console.log(`📝 Updating versions: ${rootPkg.version} → ${newVersion}`);

  // Update root package.json
  rootPkg.version = newVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");

  // Update packages/core/package.json
  const corePkgPath = path.join(__dirname, "../packages/core/package.json");
  const corePkg = JSON.parse(fs.readFileSync(corePkgPath, "utf-8"));
  corePkg.version = newVersion;
  fs.writeFileSync(corePkgPath, JSON.stringify(corePkg, null, 2) + "\n");

  // Update packages/react/package.json
  const reactPkgPath = path.join(__dirname, "../packages/react/package.json");
  const reactPkg = JSON.parse(fs.readFileSync(reactPkgPath, "utf-8"));
  reactPkg.version = newVersion;
  fs.writeFileSync(reactPkgPath, JSON.stringify(reactPkg, null, 2) + "\n");

  // Update CHANGELOG.md
  console.log("📋 Updating CHANGELOG.md...");
  const changelogPath = path.join(__dirname, "../CHANGELOG.md");
  let changelog = fs.readFileSync(changelogPath, "utf-8");

  const date = new Date().toISOString().split("T")[0];
  const releaseHeader = `## [${newVersion}] - ${date}`;

  // Replace [Unreleased] section with new version
  changelog = changelog.replace(
    "## [Unreleased]\n",
    `## [Unreleased]\n\n### Added\n- (nothing yet)\n\n${releaseHeader}\n`,
  );

  // Update links at bottom
  changelog = changelog.replace(
    `[Unreleased]: ${repoUrl}/compare/v${rootPkg.version}...HEAD`,
    `[Unreleased]: ${repoUrl}/compare/v${newVersion}...HEAD\n[${newVersion}]: ${repoUrl}/compare/v${rootPkg.version}...v${newVersion}`,
  );

  fs.writeFileSync(changelogPath, changelog);

  // Stage changes
  console.log("📦 Staging changes...");
  execSync("git add package.json packages/*/package.json CHANGELOG.md", {
    stdio: "inherit",
  });

  // Create commit
  console.log("💾 Creating commit...");
  execSync(`git commit -m "chore(release): bump version to ${newVersion}"`, {
    stdio: "inherit",
  });

  // Create git tag
  console.log("🏷️  Creating git tag...");
  execSync(`git tag v${newVersion}`, { stdio: "inherit" });

  console.log("✅ Release prepared successfully!");
  console.log(`\nNext steps:`);
  console.log(`  1. Review the changes: git log -1`);
  console.log(`  2. Push to remote: git push origin main --tags`);
  console.log(`  3. Publish to npm: pnpm run release:publish`);
} catch (error) {
  console.error("❌ Release script failed:", error.message);
  process.exit(1);
}
