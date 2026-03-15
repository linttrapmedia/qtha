import { mkdir } from "fs/promises";
import { resolve } from "path";
import { configPath, initConfig } from "../lib/config";

const AGENT_TEMPLATE_PATH = resolve(import.meta.dir, "../templates/agent.template.md");

export async function setupCommand(_positional: string[], flags: Record<string, string | boolean>) {
  // ─── Initialize spectra.json config ──────────────────────────────────────
  const cfgPath = configPath();
  const cfgFile = Bun.file(cfgPath);
  if (await cfgFile.exists()) {
    console.log(`Config already exists: ${cfgPath}`);
  } else {
    const ide = typeof flags.ide === "string" ? flags.ide : "vscode";
    const out = typeof flags.out === "string" ? flags.out : ".github/prompts";
    await initConfig({ ide, out });
    console.log(`Created ${cfgPath}`);
  }

  // ─── Scaffold agent file ─────────────────────────────────────────────────
  const outDir = resolve(process.cwd(), ".github/agents");
  const outPath = resolve(outDir, "spectra.agent.md");

  const file = Bun.file(outPath);
  if (await file.exists()) {
    console.warn(`Already exists: ${outPath}`);
    console.warn("Skipping agent setup. Delete the file if you want to regenerate it.");
    return;
  }

  await mkdir(outDir, { recursive: true });
  const template = await Bun.file(AGENT_TEMPLATE_PATH).text();
  await Bun.write(outPath, template);
  console.log(`Created ${outPath}`);
}
