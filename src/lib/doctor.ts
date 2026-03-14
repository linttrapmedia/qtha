import type { DiagnosticIssue, DiagnosticResult, SchemaRef } from "./types";

function isRef(v: unknown): v is SchemaRef {
  return typeof v === "object" && v !== null && "$ref" in v;
}

const VALID_STEP_TYPES = ["text", "promptString", "pickString", "snippet"];
const VALID_PRIMITIVES = ["string", "number", "boolean"];

export async function diagnoseSpec(specPath: string): Promise<DiagnosticResult> {
  const errors: DiagnosticIssue[] = [];
  const warnings: DiagnosticIssue[] = [];

  // ─── Read & parse ──────────────────────────────────────────────────────────
  let raw: string;
  try {
    raw = await Bun.file(specPath).text();
  } catch {
    errors.push({
      severity: "error",
      path: specPath,
      message: "File not found or unreadable",
    });
    return { filePath: specPath, errors, warnings, ok: false };
  }

  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    errors.push({
      severity: "error",
      path: specPath,
      message: `Invalid JSON: ${(e as Error).message}`,
      suggestion: "Fix JSON syntax errors",
    });
    return { filePath: specPath, errors, warnings, ok: false };
  }

  // ─── Required top-level fields ─────────────────────────────────────────────
  for (const field of ["ref", "id", "name", "description", "version"]) {
    const val = spec[field];
    if (!val || typeof val !== "string") {
      errors.push({
        severity: "error",
        path: field,
        message: `Required field "${field}" is missing or empty`,
        suggestion: `Add a non-empty "${field}" string`,
      });
    }
  }

  const meta = spec.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") {
    errors.push({
      severity: "error",
      path: "meta",
      message: 'Required field "meta" is missing or not an object',
    });
    return { filePath: specPath, errors, warnings, ok: errors.length === 0 };
  }

  // ─── Schema types ──────────────────────────────────────────────────────────
  const schema = meta.schema as Record<string, unknown> | undefined;
  const definedTypes = new Set<string>();

  if (schema?.types && typeof schema.types === "object") {
    const types = schema.types as Record<string, unknown>;
    for (const [typeName, typeVal] of Object.entries(types)) {
      definedTypes.add(typeName);

      if (Array.isArray(typeVal)) {
        if (typeVal.length === 0) {
          warnings.push({
            severity: "warning",
            path: `meta.schema.types.${typeName}`,
            message: `Enum "${typeName}" is empty`,
            suggestion: "Add at least one enum value",
          });
        }
      } else if (typeof typeVal === "object" && typeVal !== null) {
        for (const [fieldName, fieldVal] of Object.entries(typeVal as Record<string, unknown>)) {
          if (typeof fieldVal === "string" && !VALID_PRIMITIVES.includes(fieldVal)) {
            errors.push({
              severity: "error",
              path: `meta.schema.types.${typeName}.${fieldName}`,
              message: `Invalid primitive "${fieldVal}"`,
              suggestion: `Use one of: ${VALID_PRIMITIVES.join(", ")}`,
            });
          }
        }
      }
    }

    // Resolve $refs inside types
    for (const [typeName, typeVal] of Object.entries(types)) {
      if (typeof typeVal === "object" && !Array.isArray(typeVal) && typeVal !== null) {
        for (const [fieldName, fieldVal] of Object.entries(typeVal as Record<string, unknown>)) {
          if (isRef(fieldVal)) {
            const refName = (fieldVal as SchemaRef).$ref.replace("[]", "");
            if (!definedTypes.has(refName)) {
              errors.push({
                severity: "error",
                path: `meta.schema.types.${typeName}.${fieldName}`,
                message: `$ref "${(fieldVal as SchemaRef).$ref}" references undefined type "${refName}"`,
                suggestion: `Define type "${refName}" in meta.schema.types`,
              });
            }
          }
        }
      }
    }
  }

  // ─── Schema data $refs ────────────────────────────────────────────────────
  if (schema?.data && typeof schema.data === "object") {
    for (const [key, val] of Object.entries(schema.data as Record<string, unknown>)) {
      if (isRef(val)) {
        const refName = (val as SchemaRef).$ref.replace("[]", "");
        if (!definedTypes.has(refName)) {
          errors.push({
            severity: "error",
            path: `meta.schema.data.${key}`,
            message: `$ref "${(val as SchemaRef).$ref}" references undefined type "${refName}"`,
            suggestion: `Define type "${refName}" in meta.schema.types`,
          });
        }
      }
    }
  }

  // ─── Data vs schema ────────────────────────────────────────────────────────
  const data = spec.data as Record<string, unknown> | undefined;
  if (!data || Object.keys(data).length === 0) {
    warnings.push({
      severity: "warning",
      path: "data",
      message: "Data section is empty",
      suggestion: "Add data matching your schema definition",
    });
  } else if (schema?.data && typeof schema.data === "object") {
    for (const key of Object.keys(schema.data as Record<string, unknown>)) {
      if (!(key in data)) {
        errors.push({
          severity: "error",
          path: `data.${key}`,
          message: `Missing data key "${key}" declared in meta.schema.data`,
        });
      }
    }
  }

  // ─── Directives ────────────────────────────────────────────────────────────
  const directives = meta.directives as Record<string, unknown> | undefined;
  if (!directives || Object.keys(directives).length === 0) {
    warnings.push({
      severity: "warning",
      path: "meta.directives",
      message: "No directives defined",
      suggestion: "Add at least one directive",
    });
  } else {
    for (const [dirName, dirVal] of Object.entries(directives)) {
      const dir = dirVal as Record<string, unknown>;
      if (!dir.description) {
        warnings.push({
          severity: "warning",
          path: `meta.directives.${dirName}.description`,
          message: `Directive "${dirName}" has no description`,
        });
      }
      const steps = dir.steps as unknown[] | undefined;
      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        warnings.push({
          severity: "warning",
          path: `meta.directives.${dirName}.steps`,
          message: `Directive "${dirName}" has no steps`,
          suggestion: "Add at least one step",
        });
      } else {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i] as Record<string, unknown>;
          if (!step.type || !VALID_STEP_TYPES.includes(step.type as string)) {
            errors.push({
              severity: "error",
              path: `meta.directives.${dirName}.steps[${i}].type`,
              message: `Invalid step type "${step.type}"`,
              suggestion: `Use one of: ${VALID_STEP_TYPES.join(", ")}`,
            });
          }
          if (!step.description) {
            warnings.push({
              severity: "warning",
              path: `meta.directives.${dirName}.steps[${i}].description`,
              message: `Step ${i} in "${dirName}" has no description`,
            });
          }
        }
      }
    }
  }

  // ─── Changelog ─────────────────────────────────────────────────────────────
  const changeLog = meta.changeLog as unknown[] | undefined;
  if (!changeLog || changeLog.length === 0) {
    warnings.push({
      severity: "warning",
      path: "meta.changeLog",
      message: "No changelog entries",
      suggestion: "Add a changelog entry documenting initial creation",
    });
  } else {
    for (let i = 0; i < changeLog.length; i++) {
      const entry = changeLog[i] as Record<string, unknown>;
      for (const field of ["change", "directive", "timestamp"]) {
        if (!entry[field]) {
          errors.push({
            severity: "error",
            path: `meta.changeLog[${i}].${field}`,
            message: `Changelog entry missing required field "${field}"`,
          });
        }
      }
    }
  }

  // ─── Design ────────────────────────────────────────────────────────────────
  const design = meta.design as unknown[] | undefined;
  if (!design || design.length === 0) {
    warnings.push({
      severity: "warning",
      path: "meta.design",
      message: "No design decisions documented",
      suggestion: "Document key design decisions for LLM context",
    });
  } else {
    for (let i = 0; i < design.length; i++) {
      const entry = design[i] as Record<string, unknown>;
      for (const field of ["decision", "rationale", "date"]) {
        if (!entry[field]) {
          errors.push({
            severity: "error",
            path: `meta.design[${i}].${field}`,
            message: `Design entry missing required field "${field}"`,
          });
        }
      }
    }
  }

  return {
    filePath: specPath,
    errors,
    warnings,
    ok: errors.length === 0,
  };
}
