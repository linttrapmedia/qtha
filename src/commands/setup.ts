import { mkdir } from "fs/promises";
import { resolve } from "path";
import { bold, cyan, dim, green, LOGO, yellow } from "../lib/color";
import { configPath, initConfig } from "../lib/config";

const AGENT_TEMPLATE_PATH = resolve(import.meta.dir, "../templates/agent.template.md");

export async function setupCommand(_positional: string[], flags: Record<string, string | boolean>) {
  console.log(`${cyan(LOGO)} ${bold("setup")}\n`);

  // ─── Initialize coda.json config ──────────────────────────────────────
  const cfgPath = configPath();
  const cfgFile = Bun.file(cfgPath);
  if (await cfgFile.exists()) {
    console.log(`${yellow("●")} Config already exists: ${dim(cfgPath)}`);
  } else {
    const ide = typeof flags.ide === "string" ? flags.ide : "vscode";
    const out = typeof flags.out === "string" ? flags.out : ".github/prompts";
    await initConfig({ ide, out });
    console.log(`${green("✓")} Created ${dim(cfgPath)}`);
  }

  // ─── Scaffold agent file ─────────────────────────────────────────────────
  const outDir = resolve(process.cwd(), ".github/agents");
  const outPath = resolve(outDir, "coda.agent.md");

  const file = Bun.file(outPath);
  if (await file.exists()) {
    console.log(`${yellow("●")} Already exists: ${dim(outPath)}`);
    console.log(dim("  Skipping agent setup. Delete the file if you want to regenerate it."));
    return;
  }

  await mkdir(outDir, { recursive: true });
  const template = await Bun.file(AGENT_TEMPLATE_PATH).text();
  await Bun.write(outPath, template);
  console.log(`${green("✓")} Created ${dim(outPath)}`);
}
