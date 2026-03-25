#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const INTEGRITY_FILE = path.join(
  REPO_ROOT,
  "supabase",
  ".migration-integrity.json",
);

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getMigrationFiles() {
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function buildSnapshot() {
  const files = getMigrationFiles();
  const hashes = {};
  for (const fileName of files) {
    const fullPath = path.join(MIGRATIONS_DIR, fileName);
    hashes[fileName] = sha256File(fullPath);
  }

  return {
    version: 1,
    algorithm: "sha256",
    generatedAt: new Date().toISOString(),
    migrationsDir: "supabase/migrations",
    fileCount: files.length,
    hashes,
  };
}

function writeSnapshot() {
  const snapshot = buildSnapshot();
  fs.writeFileSync(
    INTEGRITY_FILE,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Wrote migration integrity snapshot: supabase/.migration-integrity.json (${snapshot.fileCount} files)`,
  );
}

function readSnapshot() {
  if (!fs.existsSync(INTEGRITY_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(INTEGRITY_FILE, "utf8"));
}

function verifySnapshot() {
  const saved = readSnapshot();
  if (!saved) {
    console.error("Missing supabase/.migration-integrity.json");
    console.error("Run: npm run db:migrations:snapshot");
    process.exit(1);
  }

  const current = buildSnapshot();
  const changed = [];
  const missing = [];
  const added = [];

  // Enforce immutability for files that were already known.
  for (const [fileName, savedHash] of Object.entries(saved.hashes || {})) {
    const currentHash = current.hashes[fileName];
    if (!currentHash) {
      missing.push(fileName);
      continue;
    }
    if (currentHash !== savedHash) {
      changed.push(fileName);
    }
  }

  // Added files are okay (expected for new migrations), but report them.
  for (const fileName of Object.keys(current.hashes)) {
    if (!saved.hashes || !(fileName in saved.hashes)) {
      added.push(fileName);
    }
  }

  if (missing.length || changed.length) {
    console.error("Migration integrity check failed.");
    if (changed.length) {
      console.error("Modified previously-snapshotted migration files:");
      for (const fileName of changed) {
        console.error(`  - ${fileName}`);
      }
    }
    if (missing.length) {
      console.error("Deleted previously-snapshotted migration files:");
      for (const fileName of missing) {
        console.error(`  - ${fileName}`);
      }
    }
    console.error(
      "Do not edit past migrations. Create a new migration instead.",
    );
    process.exit(1);
  }

  console.log("Migration integrity check passed.");
  if (added.length) {
    console.log("New migration files detected (allowed):");
    for (const fileName of added) {
      console.log(`  - ${fileName}`);
    }
  }
}

const command = process.argv[2];
if (command === "snapshot") {
  writeSnapshot();
} else if (command === "verify") {
  verifySnapshot();
} else {
  console.error("Usage: node scripts/migration-integrity.js <snapshot|verify>");
  process.exit(1);
}
