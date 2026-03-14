# Plan: Spectra — Bun.js CLI & Library

## TL;DR

Build `@linttrap/spectra` as a Bun.js package that provides both a CLI tool (`spectra`) and a programmatic TypeScript API for managing `.spec.json` files. The CLI compiles spec templates into VS Code Copilot `.prompt.md` files from spec directives, reports what spec files exist in a codebase, provides detailed info about specs, diagnoses issues in spec files, validates specs against their schemas, and scaffolds a `.agent.md` file. The library exports CRUD helpers for programmatic spec manipulation. An `examples/` directory demonstrates end-to-end usage.

---

## Phase 1: Project Scaffold

1. **Initialize project** — `bun init` with `package.json` configured for dual CLI + library exports:
   - `name`: `@linttrap/spectra`
   - `bin.spectra` → `./src/cli.ts` (use Bun's native TS execution; no build step needed for dev)
   - `exports["."]` → `./src/index.ts` (programmatic API)
   - `type`: `module`
   - Add `bun link` instructions in README for local CLI dev

2. **Create `tsconfig.json`** — strict mode, target ESNext, moduleResolution Bundler, paths alias `@spectra/*` → `src/*`.

3. **Directory structure:**
   ```
   spectra/
   ├── src/
   │   ├── index.ts            # Public API barrel export
   │   ├── cli.ts              # CLI entry (shebang #!/usr/bin/env bun)
   │   ├── commands/           # One file per CLI command
   │   │   ├── init.ts
   │   │   ├── compile.ts
   │   │   ├── scan.ts
   │   │   ├── info.ts
   │   │   ├── doctor.ts
   │   │   ├── validate.ts
   │   │   └── setup.ts
   │   ├── lib/                # Core library logic (shared by CLI + API)
   │   │   ├── spec.ts         # CRUD helpers for .spec.json
   │   │   ├── prompt.ts       # Prompt generation logic
   │   │   ├── validator.ts    # Schema validation
   │   │   ├── scanner.ts      # Recursive .spec.json discovery
   │   │   └── types.ts        # TypeScript types/interfaces for the spec schema
   │   └── templates/          # Template files
   │       ├── spec.template.json
   │       └── agent.template.md
   ├── examples/
   │   ├── my-app.spec.json    # Example spec with directives
   │   └── README.md           # Walkthrough of running spectra commands
   ├── package.json
   ├── tsconfig.json
   └── README.md               # Updated with full usage docs + bun link setup
   ```

**Files to create/modify:**

- `package.json` — new
- `tsconfig.json` — new
- All `src/` files — new
- `examples/` — new
- `README.md` — update with setup & usage docs

---

## Phase 2: TypeScript Types (`src/lib/types.ts`)

4. **Define comprehensive TS interfaces** mirroring the spec.json schema from the README:
   - `SpecFile` — root type with `ref`, `id`, `name`, `description`, `version`, `meta`, `data`
   - `SpecMeta` — `changeLog`, `design`, `directives`, `schema`
   - `ChangeLogEntry` — `change`, `directive`, `timestamp`, `authors`, `references`, `tags`
   - `DesignEntry` — `decision`, `rationale`, `date`, `references`, `tags`, `authors`
   - `Directive` — `description`, `steps: DirectiveStep[]`
   - `DirectiveStep` — discriminated union: `TextStep | PromptStringStep | PickStringStep | SnippetStep`
   - `SchemaTypes`, `SchemaData`, `SchemaRef` — for the `meta.schema` subsection

---

## Phase 3: Core Library (`src/lib/`)

5. **`spec.ts` — CRUD helpers** (_parallel with step 6, 7, 8_)
   - `readSpec(filePath: string): Promise<SpecFile>` — read & parse with validation
   - `writeSpec(filePath: string, spec: SpecFile): Promise<void>` — write with pretty-print
   - `createSpec(filePath: string, options?: CreateSpecOptions): Promise<SpecFile>` — generate from template
   - `updateSpecData(filePath: string, data: Record<string, unknown>): Promise<SpecFile>` — merge into `data`
   - `addChangeLogEntry(filePath: string, entry: ChangeLogEntry): Promise<SpecFile>`
   - `addDesignEntry(filePath: string, entry: DesignEntry): Promise<SpecFile>`
   - `addDirective(filePath: string, name: string, directive: Directive): Promise<SpecFile>`
   - `removeDirective(filePath: string, name: string): Promise<SpecFile>`
   - `getDirective(filePath: string, name: string): Promise<Directive | undefined>`
   - `listDirectives(filePath: string): Promise<string[]>`

6. **`prompt.ts` — Prompt compilation** (_parallel with step 5, 7, 8_)
   - `compilePromptFile(specFile: SpecFile, directiveName: string, ide: "vscode"): string` — renders a `.prompt.md` string from a directive
   - The `.prompt.md` output should include:
     - A header with spec name, directive name, description
     - Full context: spec description, relevant design decisions, changelog
     - Each directive step rendered as numbered instructions
     - `promptString` / `pickString` steps rendered as user-input sections
     - `snippet` steps rendered as fenced code blocks
   - `compilePromptFiles(specPath: string, outputDir: string, ide: "vscode"): Promise<string[]>` — writes all directive prompts for a spec, returns file paths written

7. **`validator.ts` — Schema validation** (_parallel with step 5, 6, 8_)
   - `validateSpec(spec: SpecFile): ValidationResult` — validates:
     - Required top-level fields present
     - `meta.schema.types` are well-formed (primitives, enums, entities, $refs resolve)
     - `meta.schema.data` $refs resolve to defined types
     - `data` shape matches `meta.schema.data` (structural check)
     - `meta.directives` steps have valid `type` discriminators
   - `ValidationResult` — `{ valid: boolean; errors: ValidationError[] }`
   - `ValidationError` — `{ path: string; message: string }`

8. **`scanner.ts` — Recursive discovery** (_parallel with step 5, 6, 7_)
   - `scanForSpecs(rootDir: string, options?: ScanOptions): Promise<string[]>` — uses `Bun.Glob` to recursively find `**/*.spec.json`, respects `.gitignore` patterns, returns absolute paths
   - `ScanOptions` — `{ ignore?: string[]; maxDepth?: number }`

8b. **`info.ts` — Spec information reporting** (_parallel with step 5, 6, 7_)

- `getSpecInfo(specPath: string): Promise<SpecInfo>` — reads a spec file and returns a summary object with name, description, version, directive names/descriptions, schema type count, data shape overview, changelog entry count, and design decision count
- `SpecInfo` — `{ filePath: string; name: string; description: string; version: string; directives: { name: string; description: string; stepCount: number }[]; schemaTypeCount: number; dataKeys: string[]; changeLogCount: number; designDecisionCount: number }`

8c. **`doctor.ts` — Spec diagnostics** (_parallel with step 5, 6, 7_)

- `diagnoseSpec(specPath: string): Promise<DiagnosticResult>` — runs a battery of checks on a spec file and reports issues:
  - File is valid JSON
  - Required fields present and non-empty (`ref`, `id`, `name`, `description`, `version`)
  - `meta.schema` types are well-formed and internally consistent
  - `meta.schema.data` `$ref` references resolve to defined types
  - `data` conforms to `meta.schema.data`
  - Directives have valid step types and non-empty descriptions
  - Changelog entries have required fields
  - Design entries have required fields
  - Warns on empty directives, empty data, missing changelog, missing design docs
- `DiagnosticResult` — `{ filePath: string; errors: DiagnosticIssue[]; warnings: DiagnosticIssue[]; ok: boolean }`
- `DiagnosticIssue` — `{ severity: "error" | "warning"; path: string; message: string; suggestion?: string }`

---

## Phase 4: CLI Commands (`src/commands/`)

9. **`src/cli.ts` — CLI entry point** — Use Bun's built-in `process.argv` parsing (no external dep like Commander) or optionally use a lightweight arg parser. Route to command handlers. Print help/usage on `--help` or no args.

   CLI interface:

   ```
   spectra init [file]              # Create a new .spec.json template
   spectra compile <file|dir>       # Compile .prompt.md files from spec(s)
     --ide vscode                   # IDE target (default: vscode)
     --out <dir>                    # Output directory (default: .github/prompts/)
   spectra scan [dir]               # Recursively find and report all *.spec.json files
   spectra info [file|dir]          # Report detailed info about spec file(s)
   spectra doctor [file|dir]        # Diagnose and report issues in spec file(s)
   spectra validate <file|dir>      # Validate spec(s) against their schemas
   spectra setup                    # Scaffold .github/agents/spectra.agent.md
   ```

10. **`commands/init.ts`** — (_depends on step 5_)
    - Prompts are unnecessary since it just writes a template
    - Accepts optional `[file]` arg (defaults to `spectra.spec.json`)
    - Uses `createSpec()` from `spec.ts` to write a well-commented template

11. **`commands/compile.ts`** — (_depends on step 6_)
    - Accepts a file path or directory
    - If directory, finds all `*.spec.json` in that directory (non-recursive, use `scan` for recursive)
    - Calls `compilePromptFiles()` for each spec
    - Reports files compiled to stdout

12. **`commands/scan.ts`** — (_depends on step 8_)
    - Calls `scanForSpecs()` to find all spec files recursively
    - Reports a summary listing of discovered spec files: path, name, and description for each
    - Summary output: X spec files found

12b. **`commands/info.ts`** — (_depends on step 8b_) - Accepts an optional file or directory argument (defaults to current directory) - If directory, discovers all `*.spec.json` recursively - Calls `getSpecInfo()` for each spec - Pretty-prints a detailed report per spec: name, description, version, directives (with step counts), schema type count, data keys, changelog entry count, design decision count

12c. **`commands/doctor.ts`** — (_depends on step 8c_) - Accepts an optional file or directory argument (defaults to current directory) - If directory, discovers all `*.spec.json` recursively - Calls `diagnoseSpec()` for each spec - Pretty-prints errors and warnings with file paths, JSON paths, messages, and suggestions - Summary output: X specs checked, Y errors, Z warnings - Exit code 1 if any errors found

13. **`commands/validate.ts`** — (_depends on step 7_)
    - Accepts a file or directory
    - Runs `validateSpec()` on each
    - Pretty-prints errors with file path and JSON path
    - Exit code 1 if any validation errors

14. **`commands/setup.ts`** — (_depends on nothing_)
    - Writes `.github/agents/spectra.agent.md` from a template
    - The agent file teaches Copilot about Spectra conventions: how to read specs, run the CLI, use directives
    - Includes tool restrictions (file operations, terminal for `spectra` commands)
    - Skips if file already exists (warns user)

---

## Phase 5: Templates (`src/templates/`)

15. **`spec.template.json`** — A minimal but complete `.spec.json` skeleton with placeholder values and all sections present (meta, changeLog with initial entry, empty design, one example directive, minimal schema, empty data).

16. **`agent.template.md`** — A `.agent.md` file with YAML frontmatter (`name: Spectra`, `description`, tool restrictions) and body sections teaching the agent about Spectra conventions, CLI commands, and spec structure.

---

## Phase 6: Public API Barrel (`src/index.ts`)

17. **Export everything from `src/lib/`** — Re-export all types and functions so consumers can `import { readSpec, SpecFile } from "@linttrap/spectra"`.

---

## Phase 7: Examples

18. **`examples/my-app.spec.json`** — A realistic example spec based on the README's User/Team example, with 2-3 directives (e.g., `addEntity`, `generateTypes`, `seedData`).

19. **`examples/README.md`** — Step-by-step walkthrough:
    - `cd examples && spectra validate my-app.spec.json`
    - `spectra compile my-app.spec.json --ide vscode`
    - Show the compiled `.prompt.md` output
    - `spectra scan .`
    - `spectra info .`
    - `spectra doctor .`

---

## Phase 8: Documentation & Setup

20. **Update `README.md`** — (_depends on all above_)
    - Keep existing spec format docs
    - Add sections: Installation, Quick Start, CLI Reference, Library API, Setup (`bun link`), Examples
    - `bun link` instructions:
      ```
      git clone ...
      cd spectra
      bun install
      bun link
      # Now `spectra` is available globally
      spectra --help
      ```

---

## Relevant Files

- `package.json` — new; `bin.spectra` → `./src/cli.ts`, exports `./src/index.ts`, `@linttrap/spectra`
- `tsconfig.json` — new; strict, ESNext, Bundler resolution
- `src/cli.ts` — new; CLI entry with shebang, arg routing
- `src/index.ts` — new; barrel re-export of all lib functions & types
- `src/lib/types.ts` — new; all TypeScript interfaces for .spec.json schema
- `src/lib/spec.ts` — new; CRUD helpers (`readSpec`, `writeSpec`, `createSpec`, `addChangeLogEntry`, `addDirective`, etc.)
- `src/lib/prompt.ts` — new; `.prompt.md` generation from directives (`generatePromptFile`, `writePromptFiles`)
- `src/lib/validator.ts` — new; schema validation (`validateSpec` returning `ValidationResult`)
- `src/lib/scanner.ts` — new; recursive glob discovery (`scanForSpecs` using `Bun.Glob`)
- `src/commands/init.ts` — new; `spectra init` handler
- `src/commands/generate.ts` — new; `spectra generate` handler
- `src/commands/scan.ts` — new; `spectra scan` handler
- `src/commands/validate.ts` — new; `spectra validate` handler
- `src/commands/setup.ts` — new; `spectra setup` handler, writes agent template
- `src/templates/spec.template.json` — new; skeleton spec file
- `src/templates/agent.template.md` — new; agent file template for VS Code
- `examples/my-app.spec.json` — new; realistic example spec
- `examples/README.md` — new; usage walkthrough
- `README.md` — update; add installation, CLI reference, API docs, bun link setup

## Verification

1. **`bun link` test** — After scaffold, run `bun install && bun link`, then `spectra --help` should print usage.
2. **`spectra init test.spec.json`** — Verify output is valid JSON matching `SpecFile` interface.
3. **`spectra validate examples/my-app.spec.json`** — Should pass with exit code 0.
4. **`spectra generate examples/my-app.spec.json`** — Should create `.github/prompts/` with one `.prompt.md` per directive.
5. **`spectra scan examples/`** — Should discover `my-app.spec.json` and generate prompts.
6. **`spectra setup`** — Should create `.github/agents/spectra.agent.md`.
7. **Programmatic API test** — `import { readSpec, validateSpec } from "@linttrap/spectra"` works in a test script.
8. **Type checking** — `bun run tsc --noEmit` passes with no errors.

## Decisions

- **No external CLI framework** — Bun's native `process.argv` + a minimal hand-rolled parser keeps deps at zero. If complexity grows, `commander` or `citty` can be added later.
- **No build step for dev** — Bun executes `.ts` directly; `bin` points to `src/cli.ts` with `#!/usr/bin/env bun` shebang. For npm publishing, a `bun build` step producing `dist/` can be added later.
- **VS Code only for now** — `--ide` flag defaults to `vscode`. The `prompt.ts` module is structured so other IDE adapters can be added as separate functions later.
- **Validation is structural, not semantic** — The validator checks types resolve, required fields exist, and data shape matches schema. It does NOT validate data values against type constraints deeply (e.g., enum membership checking in data is a nice-to-have for later).
- **Package name**: `@linttrap/spectra` (scoped)
- **Setup command**: produces only `.github/agents/spectra.agent.md` (no `copilot-instructions.md`)
