import { mkdir } from "fs/promises";
import { resolve } from "path";
import { bold, cyan, dim, green, LOGO, yellow } from "../lib/color";
import { configPath, initConfig } from "../lib/config";

const AGENT_TEMPLATE_PATH = resolve(import.meta.dir, "../templates/agent.template.md");

function parseKwargs(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

export async function configCommand(_positional: string[], flags: Record<string, string | boolean>) {
  console.log(`${cyan(LOGO)} ${bold("config")}\n`);

  const kwargs = typeof flags.kwargs === "string" ? parseKwargs(flags.kwargs) : {};

  // ─── Initialize qtha.json config ──────────────────────────────────────
  const cfgPath = configPath();
  const cfgFile = Bun.file(cfgPath);
  if (await cfgFile.exists()) {
    console.log(`${yellow("●")} Config already exists: ${dim(cfgPath)}`);
  } else {
    const overrides: Record<string, string> = {};
    if (kwargs.ide) overrides.ide = kwargs.ide;
    if (kwargs.out) overrides.out = kwargs.out;
    await initConfig(overrides);
    console.log(`${green("✓")} Created ${dim(cfgPath)}`);
  }

  // ─── Scaffold agent file ─────────────────────────────────────────────────
  const outDir = resolve(process.cwd(), ".github/agents");
  const outPath = resolve(outDir, "qtha.agent.md");

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
