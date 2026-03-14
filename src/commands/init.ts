import { resolve } from "path";
import { createSpec } from "../lib/spec";

export async function initCommand(positional: string[], _flags: Record<string, string | boolean>) {
  const fileName = positional[0] ?? "spectra.spec.json";
  const filePath = resolve(process.cwd(), fileName);

  const file = Bun.file(filePath);
  if (await file.exists()) {
    console.error(`File already exists: ${filePath}`);
    process.exit(1);
  }

  await createSpec(filePath);
  console.log(`Created ${fileName}`);
}
