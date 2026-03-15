import { resolve } from "path";
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

  const results: ScanResult[] = [];

  for (const filePath of specFiles) {
    try {
      const spec = await readSpec(filePath);
      results.push({ filePath, name: spec.name, description: spec.description });
      console.log(`  ${filePath}`);
      console.log(`    name: ${spec.name}`);
      console.log(`    description: ${spec.description}`);
    } catch {
      console.log(`  ${filePath} (unreadable)`);
    }
  }

  await updateConfigResults("scan", results);
  console.log(`\n${specFiles.length} spec file(s) found`);
}
