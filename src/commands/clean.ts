import { rm, stat } from "fs/promises";
import { resolve } from "path";
import { bold, cyan, dim, green, LOGO, yellow } from "../lib/color";
import { defaultConfig, readConfig, writeConfig } from "../lib/config";

export async function cleanCommand(_positional: string[], _flags: Record<string, string | boolean>) {
  console.log(`${cyan(LOGO)} ${bold("clean")}\n`);

  const config = await readConfig();
  const outDir = resolve(process.cwd(), config.out);

  // ─── Remove compiled prompt files ────────────────────────────────────────
  const dirExists = await stat(outDir)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (dirExists) {
    const glob = new Bun.Glob("*.prompt.md");
    let removed = 0;
    for await (const path of glob.scan({ cwd: outDir, absolute: true })) {
      await rm(path);
      console.log(`  ${green("✓")} Removed ${dim(path)}`);
      removed++;
    }
    if (removed === 0) {
      console.log(`  ${yellow("●")} No prompt files found in ${dim(outDir)}`);
    }
  } else {
    console.log(`  ${yellow("●")} Output directory does not exist: ${dim(outDir)}`);
  }

  // ─── Remove scaffolded agent file ────────────────────────────────────────
  const agentPath = resolve(process.cwd(), ".github/agents/spectra.agent.md");
  const agentFile = Bun.file(agentPath);
  if (await agentFile.exists()) {
    await rm(agentPath);
    console.log(`  ${green("✓")} Removed ${dim(agentPath)}`);
  } else {
    console.log(`  ${yellow("●")} No agent file found at ${dim(agentPath)}`);
  }

  // ─── Clear results in config ─────────────────────────────────────────────
  const cfgFile = Bun.file(resolve(process.cwd(), "spectra.json"));
  if (await cfgFile.exists()) {
    config.results = defaultConfig().results;
    await writeConfig(config);
    console.log(`  ${green("✓")} Cleared results in ${dim("spectra.json")}`);
  } else {
    console.log(`  ${yellow("●")} No config file found`);
  }

  console.log(`\n${dim("Clean complete.")}`);
}
