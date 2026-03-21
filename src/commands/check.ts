import { stat } from "fs/promises";
import { relative, resolve } from "path";
import { bold, cyan, dim, green, LOGO, red, yellow } from "../lib/color";
import { updateConfigResults, type ValidateResult } from "../lib/config";
import { diagnoseSpec } from "../lib/doctor";
import { scanForSpecs } from "../lib/scanner";
import { readSpec } from "../lib/spec";
import type { DiagnosticResult } from "../lib/types";
import { validateSpec } from "../lib/validator";

export async function checkCommand(positional: string[], _flags: Record<string, string | boolean>) {
  const target = resolve(process.cwd(), positional[0] ?? ".");
  const info = await stat(target);
  let specFiles: string[];

  if (info.isDirectory()) {
    specFiles = await scanForSpecs(target);
  } else {
    specFiles = [target];
  }

  if (specFiles.length === 0) {
    console.log("No .qtha.json files found");
    return;
  }

  console.log(`${cyan(LOGO)} ${bold("check")}\n`);

  // ─── Validate ────────────────────────────────────────────────────────────
  console.log(bold("Validate\n"));
  let hasValidationErrors = false;
  const validateResults: ValidateResult[] = [];

  for (const filePath of specFiles) {
    const relPath = relative(process.cwd(), filePath);
    try {
      const spec = await readSpec(filePath);
      const result = validateSpec(spec);
      validateResults.push({ filePath: relPath, valid: result.valid, errors: result.errors });

      if (result.valid) {
        console.log(`${green("✓")} ${relPath}`);
      } else {
        hasValidationErrors = true;
        console.log(`${red("✗")} ${relPath}`);
        for (const err of result.errors) {
          console.log(`  ${dim(err.path + ":")} ${err.message}`);
        }
      }
    } catch (e) {
      hasValidationErrors = true;
      console.log(`${red("✗")} ${relPath}`);
      console.log(`  ${dim("parse:")} ${(e as Error).message}`);
      validateResults.push({
        filePath: relPath,
        valid: false,
        errors: [{ path: "parse", message: (e as Error).message }],
      });
    }
  }

  await updateConfigResults("validate", validateResults);

  // ─── Doctor ──────────────────────────────────────────────────────────────
  console.log(`\n${bold("Doctor\n")}`);
  let totalErrors = 0;
  let totalWarnings = 0;
  const doctorResults: DiagnosticResult[] = [];

  for (const filePath of specFiles) {
    const result = await diagnoseSpec(filePath);
    const relPath = relative(process.cwd(), filePath);
    doctorResults.push({ ...result, filePath: relPath });
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    if (result.ok && result.warnings.length === 0) {
      console.log(`${green("✓")} ${relPath}`);
      continue;
    }

    console.log(`${cyan("━━━")} ${bold(relPath)} ${cyan("━━━")}`);
    for (const err of result.errors) {
      console.log(`  ${red("✗ ERROR")}   ${dim(err.path + ":")} ${err.message}`);
      if (err.suggestion) {
        console.log(`            ${dim("→")} ${err.suggestion}`);
      }
    }
    for (const warn of result.warnings) {
      console.log(`  ${yellow("⚠ WARNING")} ${dim(warn.path + ":")} ${warn.message}`);
      if (warn.suggestion) {
        console.log(`            ${dim("→")} ${warn.suggestion}`);
      }
    }
    console.log("");
  }

  await updateConfigResults("doctor", doctorResults);
  console.log(dim(`${specFiles.length} spec(s) checked, ${totalErrors} error(s), ${totalWarnings} warning(s)`));

  if (hasValidationErrors || totalErrors > 0) {
    process.exit(1);
  }
}
