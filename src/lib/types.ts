// ─── Primitive & Utility Types ───────────────────────────────────────────────

export type PrimitiveTypeName = "string" | "number" | "boolean";

export interface SchemaRef {
  $ref: string;
}

/** A schema type value can be a primitive name, an enum (string[]), a ref, or an entity object */
export type SchemaTypeValue =
  | PrimitiveTypeName
  | string[] // enum
  | SchemaRef
  | { [field: string]: PrimitiveTypeName | SchemaRef };

export type SchemaTypes = Record<string, SchemaTypeValue>;

export type SchemaData = Record<string, SchemaRef>;

export interface SpecSchema {
  types: SchemaTypes;
  data: SchemaData;
}

// ─── Changelog & Design ─────────────────────────────────────────────────────

export interface ChangeLogEntry {
  change: string;
  directive: string;
  timestamp: string;
  authors: string[];
  references: string[];
  tags: string[];
}

export interface DesignEntry {
  decision: string;
  rationale: string;
  date: string;
  references: string[];
  tags: string[];
  authors: string[];
}

// ─── Directive Steps (discriminated union) ───────────────────────────────────

export interface TextStep {
  type: "text";
  description: string;
}

export interface PromptStringStep {
  type: "promptString";
  id: string;
  description: string;
  default?: string;
  hidden?: boolean;
}

export interface PickStringStep {
  type: "pickString";
  id: string;
  description: string;
  options: string[];
  default?: string;
}

export interface SnippetStep {
  type: "snippet";
  fence: string;
  snippet: string;
  description: string;
}

export type DirectiveStep = TextStep | PromptStringStep | PickStringStep | SnippetStep;

// ─── Directive ───────────────────────────────────────────────────────────────

export interface Directive {
  description: string;
  steps: DirectiveStep[];
}

// ─── Meta ────────────────────────────────────────────────────────────────────

export interface SpecMeta {
  changeLog: ChangeLogEntry[];
  design: DesignEntry[];
  directives: Record<string, Directive>;
  schema: SpecSchema;
}

// ─── Root ────────────────────────────────────────────────────────────────────

export interface SpecFile {
  ref: string;
  id: string;
  name: string;
  description: string;
  version: string;
  meta: SpecMeta;
  data: Record<string, unknown>;
}

// ─── Options & Results ───────────────────────────────────────────────────────

export interface CreateSpecOptions {
  name?: string;
  description?: string;
  id?: string;
  ref?: string;
  version?: string;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ScanOptions {
  ignore?: string[];
  maxDepth?: number;
}

export interface SpecInfo {
  filePath: string;
  name: string;
  description: string;
  version: string;
  directives: { name: string; description: string; stepCount: number }[];
  schemaTypeCount: number;
  dataKeys: string[];
  changeLogCount: number;
  designDecisionCount: number;
}

export interface DiagnosticIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
  suggestion?: string;
}

export interface DiagnosticResult {
  filePath: string;
  errors: DiagnosticIssue[];
  warnings: DiagnosticIssue[];
  ok: boolean;
}
