import { mkdir } from "fs/promises";
import { resolve } from "path";

const AGENT_TEMPLATE_PATH = resolve(import.meta.dir, "../templates/agent.template.md");

export async function setupCommand(_positional: string[], _flags: Record<string, string | boolean>) {
  const outDir = resolve(process.cwd(), ".github/agents");
  const outPath = resolve(outDir, "spectra.agent.md");

  const file = Bun.file(outPath);
  if (await file.exists()) {
    console.warn(`Already exists: ${outPath}`);
    console.warn("Skipping setup. Delete the file if you want to regenerate it.");
    return;
  }

  await mkdir(outDir, { recursive: true });
  const template = await Bun.file(AGENT_TEMPLATE_PATH).text();
  await Bun.write(outPath, template);
  console.log(`Created ${outPath}`);
}
