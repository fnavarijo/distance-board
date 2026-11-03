// Deploys the rules, waits for a changed ruleset to propagate, then runs the rule tests
// against the real project (TEST-1).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// Firebase says releases take "several minutes" to propagate fully.
const SETTLE_SECONDS = Number(process.env.RULES_SETTLE_SECONDS ?? 120);
const HASH_FILE = ".firebase/deployed-rules-hash";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function deployedHash() {
  try {
    return readFileSync(HASH_FILE, "utf8");
  } catch {
    return null;
  }
}

const hash = createHash("sha256")
  .update(readFileSync("firestore.rules"))
  .digest("hex");
const changed = hash !== deployedHash();

run("pnpm", ["-s", "rules:deploy"]);
mkdirSync(".firebase", { recursive: true });
writeFileSync(HASH_FILE, hash);

if (changed) {
  console.log(`Rules changed. Waiting ${SETTLE_SECONDS}s for them to propagate.`);
  await sleep(SETTLE_SECONDS * 1000);
}

run("pnpm", ["exec", "vitest", "run", "--config", "vitest.rules.config.ts", ...process.argv.slice(2)]);
