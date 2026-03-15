import { relative, resolve } from "path";
import { bold, cyan, dim, LOGO } from "../lib/color";
import { updateConfigResults, type ScanResult } from "../lib/config";
import { scanForSpecs } from "../lib/scanner";
import { readSpec } from "../lib/spec";

export async function scanCommand(positional: string[], _flags: Record<string, string | boolean>) {
  const rootDir = resolve(process.cwd(), positional[0] ?? ".");
  const specFiles = await scanForSpecs(rootDir);

  if (specFiles.length === 0) {
    console.log("No .spec.json files found");
    return;
  }

  console.log(`${cyan(LOGO)} ${bold("scan")}\n`);
  const results: ScanResult[] = [];

  for (const filePath of specFiles) {
    try {
      const spec = await readSpec(filePath);
      const relPath = relative(process.cwd(), filePath);
      results.push({ filePath: relPath, name: spec.name, description: spec.description });
      console.log(`  ${cyan("●")} ${relPath}`);
      console.log(`    ${bold(spec.name)} ${dim("—")} ${dim(spec.description)}`);
    } catch {
      console.log(`  ${dim("●")} ${dim(`${filePath} (unreadable)`)}`);
    }
  }

  await updateConfigResults("scan", results);
  console.log(`\n${dim(`${specFiles.length} spec file(s) found`)}`);
}
