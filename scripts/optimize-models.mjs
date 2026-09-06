import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sourceDir = "source-models";
const outputDir = "public/models";
const extraError = new Set(["castelo-manguinhos.glb", "bio-manguinhos-ctv.glb"]);

mkdirSync(outputDir, { recursive: true });

for (const file of readdirSync(sourceDir).filter((name) => name.endsWith(".glb"))) {
  const ratio = extraError.has(file) ? "0.015" : "0.03";
  const error = extraError.has(file) ? "0.004" : "0.0015";
  const args = [
    "--yes",
    "@gltf-transform/cli",
    "optimize",
    join(sourceDir, file),
    join(outputDir, file),
    "--simplify",
    "true",
    "--simplify-ratio",
    ratio,
    "--simplify-error",
    error,
    "--texture-size",
    "512",
    "--texture-compress",
    "webp",
    "--compress",
    "meshopt",
    "--meshopt-level",
    "high",
  ];
  console.log(`Optimizing ${file} (ratio ${ratio}, error ${error})`);
  const result = spawnSync("npx", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
