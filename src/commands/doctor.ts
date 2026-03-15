import { stat } from "fs/promises";
import { resolve } from "path";
import { updateConfigResults } from "../lib/config";
import { diagnoseSpec } from "../lib/doctor";
import { scanForSpecs } from "../lib/scanner";
import type { DiagnosticResult } from "../lib/types";

export async function doctorCommand(positional: string[], _flags: Record<string, string | boolean>) {
  const target = resolve(process.cwd(), positional[0] ?? ".");
  const info = await stat(target);
  let specFiles: string[];

  if (info.isDirectory()) {
    specFiles = await scanForSpecs(target);
  } else {
    specFiles = [target];
  }

  if (specFiles.length === 0) {
    console.log("No .spec.json files found");
    return;
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  const results: DiagnosticResult[] = [];

  for (const filePath of specFiles) {
    const result = await diagnoseSpec(filePath);
    results.push(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    if (result.ok && result.warnings.length === 0) {
      console.log(`✓ ${filePath}`);
      continue;
    }

    console.log(`━━━ ${filePath} ━━━`);
    for (const err of result.errors) {
      console.log(`  ✗ ERROR   ${err.path}: ${err.message}`);
      if (err.suggestion) {
        console.log(`            → ${err.suggestion}`);
      }
    }
    for (const warn of result.warnings) {
      console.log(`  ⚠ WARNING ${warn.path}: ${warn.message}`);
      if (warn.suggestion) {
        console.log(`            → ${warn.suggestion}`);
      }
    }
    console.log("");
  }

  await updateConfigResults("doctor", results);
  console.log(`${specFiles.length} spec(s) checked, ${totalErrors} error(s), ${totalWarnings} warning(s)`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}
