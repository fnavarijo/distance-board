// Proves the test-only sign-in is absent from production builds (TEST-4). It builds with
// the flag first, so the check can't pass just because the marker text is wrong, and
// without it last, so the build left behind is the production one.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const MARKER = "distance-board-test-sign-in";

function build(flag) {
  // next build doesn't clear old chunks, so a flagged build would otherwise fail the next check.
  rmSync(".next", { recursive: true, force: true });
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_TEST_SIGN_IN;
  if (flag) env.NEXT_PUBLIC_TEST_SIGN_IN = "1";
  const result = spawnSync("pnpm", ["-s", "build"], { stdio: "ignore", env });
  if (result.status !== 0) {
    console.error(`Build failed with the flag ${flag ? "on" : "off"}.`);
    process.exit(1);
  }
}

function containsMarker(directory) {
  return readdirSync(directory).some((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return containsMarker(path);
    return /\.(js|html|rsc)$/.test(name) && readFileSync(path, "utf8").includes(MARKER);
  });
}

const inBuild = () => containsMarker(".next/static") || containsMarker(".next/server");

build(true);
if (!inBuild()) {
  console.error("The marker is missing from the flagged build, so this check proves nothing.");
  process.exit(1);
}

build(false);
if (inBuild()) {
  console.error("Test sign-in is present in a production build.");
  process.exit(1);
}

console.log("OK: test sign-in is present only when the flag is set.");
