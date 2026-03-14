import { readSpec } from "./spec";
import type { SpecInfo } from "./types";

export async function getSpecInfo(specPath: string): Promise<SpecInfo> {
  const spec = await readSpec(specPath);

  const directives = Object.entries(spec.meta.directives ?? {}).map(([name, dir]) => ({
    name,
    description: dir.description,
    stepCount: dir.steps?.length ?? 0,
  }));

  return {
    filePath: specPath,
    name: spec.name,
    description: spec.description,
    version: spec.version,
    directives,
    schemaTypeCount: Object.keys(spec.meta.schema?.types ?? {}).length,
    dataKeys: Object.keys(spec.data ?? {}),
    changeLogCount: spec.meta.changeLog?.length ?? 0,
    designDecisionCount: spec.meta.design?.length ?? 0,
  };
}
