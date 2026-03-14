import { stat } from "fs/promises";
import { resolve } from "path";
import { getSpecInfo } from "../lib/info";
import { scanForSpecs } from "../lib/scanner";

export async function infoCommand(positional: string[], _flags: Record<string, string | boolean>) {
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

  for (const filePath of specFiles) {
    const specInfo = await getSpecInfo(filePath);

    console.log(`━━━ ${specInfo.name} ━━━`);
    console.log(`  File:        ${specInfo.filePath}`);
    console.log(`  Description: ${specInfo.description}`);
    console.log(`  Version:     ${specInfo.version}`);
    console.log(`  Directives:  ${specInfo.directives.length}`);
    for (const d of specInfo.directives) {
      console.log(`    • ${d.name} — ${d.description} (${d.stepCount} steps)`);
    }
    console.log(`  Schema types:      ${specInfo.schemaTypeCount}`);
    console.log(`  Data keys:         ${specInfo.dataKeys.join(", ") || "(none)"}`);
    console.log(`  Changelog entries: ${specInfo.changeLogCount}`);
    console.log(`  Design decisions:  ${specInfo.designDecisionCount}`);
    console.log("");
  }
}
