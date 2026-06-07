import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;

if (typeof version !== "string" || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("Invalid or missing version in package.json");
  process.exit(1);
}

const cargoPath = join(root, "src-tauri", "Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
const versionLine = /^version = "([^"]+)"$/m;
const match = cargo.match(versionLine);

if (!match) {
  console.error("Could not find version field in src-tauri/Cargo.toml");
  process.exit(1);
}

if (match[1] === version) {
  process.exit(0);
}

writeFileSync(cargoPath, cargo.replace(versionLine, `version = "${version}"`));
console.log(`Synced Cargo.toml version to ${version}`);
