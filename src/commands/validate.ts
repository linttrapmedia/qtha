import { stat } from "fs/promises";
import { resolve } from "path";
import { updateConfigResults, type ValidateResult } from "../lib/config";
import { scanForSpecs } from "../lib/scanner";
import { readSpec } from "../lib/spec";
import { validateSpec } from "../lib/validator";

export async function validateCommand(positional: string[], _flags: Record<string, string | boolean>) {
  const target = positional[0];
  if (!target) {
    console.error("Usage: spectra validate <file|dir>");
    process.exit(1);
  }

  const targetPath = resolve(process.cwd(), target);
  const info = await stat(targetPath);
  let specFiles: string[];

  if (info.isDirectory()) {
    specFiles = await scanForSpecs(targetPath);
  } else {
    specFiles = [targetPath];
  }

  if (specFiles.length === 0) {
    console.log("No .spec.json files found");
    return;
  }

  let hasErrors = false;
  const results: ValidateResult[] = [];

  for (const filePath of specFiles) {
    const spec = await readSpec(filePath);
    const result = validateSpec(spec);
    results.push({ filePath, valid: result.valid, errors: result.errors });

    if (result.valid) {
      console.log(`✓ ${filePath}`);
    } else {
      hasErrors = true;
      console.log(`✗ ${filePath}`);
      for (const err of result.errors) {
        console.log(`  ${err.path}: ${err.message}`);
      }
    }
  }

  await updateConfigResults("validate", results);

  if (hasErrors) {
    process.exit(1);
  }
}
