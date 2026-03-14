import type { SchemaRef, SpecFile, ValidationError, ValidationResult } from "./types";

const VALID_STEP_TYPES = ["text", "promptString", "pickString", "snippet"];
const VALID_PRIMITIVES = ["string", "number", "boolean"];

function isRef(v: unknown): v is SchemaRef {
  return typeof v === "object" && v !== null && "$ref" in v;
}

export function validateSpec(spec: SpecFile): ValidationResult {
  const errors: ValidationError[] = [];

  // ─── Required top-level fields ─────────────────────────────────────────────
  for (const field of ["ref", "id", "name", "description", "version"] as const) {
    if (!spec[field] || typeof spec[field] !== "string") {
      errors.push({
        path: field,
        message: `Required field "${field}" is missing or not a string`,
      });
    }
  }

  if (!spec.meta) {
    errors.push({ path: "meta", message: 'Required field "meta" is missing' });
    return { valid: false, errors };
  }

  // ─── Schema types ──────────────────────────────────────────────────────────
  const definedTypes = new Set<string>();

  if (spec.meta.schema?.types) {
    for (const [typeName, typeVal] of Object.entries(spec.meta.schema.types)) {
      definedTypes.add(typeName);

      if (Array.isArray(typeVal)) {
        // enum: must be non-empty array of strings
        if (typeVal.length === 0) {
          errors.push({
            path: `meta.schema.types.${typeName}`,
            message: `Enum type "${typeName}" must have at least one value`,
          });
        }
        for (const v of typeVal) {
          if (typeof v !== "string") {
            errors.push({
              path: `meta.schema.types.${typeName}`,
              message: `Enum values in "${typeName}" must be strings`,
            });
            break;
          }
        }
      } else if (typeof typeVal === "object" && typeVal !== null) {
        // entity type — validate field values
        for (const [fieldName, fieldVal] of Object.entries(typeVal as Record<string, unknown>)) {
          if (typeof fieldVal === "string") {
            if (!VALID_PRIMITIVES.includes(fieldVal)) {
              errors.push({
                path: `meta.schema.types.${typeName}.${fieldName}`,
                message: `Invalid primitive type "${fieldVal}"`,
              });
            }
          } else if (isRef(fieldVal)) {
            // ref check deferred to after all types collected
          } else {
            errors.push({
              path: `meta.schema.types.${typeName}.${fieldName}`,
              message: `Field must be a primitive type string or a $ref`,
            });
          }
        }
      } else {
        errors.push({
          path: `meta.schema.types.${typeName}`,
          message: `Type must be an enum array or entity object`,
        });
      }
    }

    // ─── Resolve $ref in types ──────────────────────────────────────────────
    for (const [typeName, typeVal] of Object.entries(spec.meta.schema.types)) {
      if (typeof typeVal === "object" && !Array.isArray(typeVal)) {
        for (const [fieldName, fieldVal] of Object.entries(typeVal as Record<string, unknown>)) {
          if (isRef(fieldVal)) {
            const refName = (fieldVal as SchemaRef).$ref.replace("[]", "");
            if (!definedTypes.has(refName)) {
              errors.push({
                path: `meta.schema.types.${typeName}.${fieldName}`,
                message: `$ref "${(fieldVal as SchemaRef).$ref}" references undefined type "${refName}"`,
              });
            }
          }
        }
      }
    }
  }

  // ─── Schema data $refs ─────────────────────────────────────────────────────
  if (spec.meta.schema?.data) {
    for (const [key, val] of Object.entries(spec.meta.schema.data)) {
      if (!isRef(val)) {
        errors.push({
          path: `meta.schema.data.${key}`,
          message: `Data shape entry must be a $ref object`,
        });
      } else {
        const refName = val.$ref.replace("[]", "");
        if (!definedTypes.has(refName)) {
          errors.push({
            path: `meta.schema.data.${key}`,
            message: `$ref "${val.$ref}" references undefined type "${refName}"`,
          });
        }
      }
    }
  }

  // ─── Data structural check ─────────────────────────────────────────────────
  if (spec.meta.schema?.data && spec.data) {
    for (const key of Object.keys(spec.meta.schema.data)) {
      if (!(key in spec.data)) {
        errors.push({
          path: `data.${key}`,
          message: `Data is missing key "${key}" declared in meta.schema.data`,
        });
      }
    }
    const schemaRef = spec.meta.schema.data;
    for (const key of Object.keys(spec.meta.schema.data)) {
      const ref = schemaRef[key];
      if (isRef(ref) && ref.$ref.endsWith("[]")) {
        const val = spec.data[key];
        if (val !== undefined && !Array.isArray(val)) {
          errors.push({
            path: `data.${key}`,
            message: `Expected an array for "${key}" (schema declares ${ref.$ref})`,
          });
        }
      }
    }
  }

  // ─── Directives step types ─────────────────────────────────────────────────
  if (spec.meta.directives) {
    for (const [dirName, dir] of Object.entries(spec.meta.directives)) {
      if (!dir.steps || !Array.isArray(dir.steps)) {
        errors.push({
          path: `meta.directives.${dirName}.steps`,
          message: `Directive "${dirName}" must have a steps array`,
        });
        continue;
      }
      for (let i = 0; i < dir.steps.length; i++) {
        const step = dir.steps[i];
        if (!VALID_STEP_TYPES.includes(step.type)) {
          errors.push({
            path: `meta.directives.${dirName}.steps[${i}]`,
            message: `Invalid step type "${step.type}"`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
