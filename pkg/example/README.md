# Qtha Examples

This directory contains a sample `.qtha.json` file to demonstrate Qtha CLI usage.

## Prerequisites

Install Qtha as a dev dependency:

```bash
bun add -d @linttrap/qtha
```

## Walkthrough

### 1. Validate the example spec

```bash
cd examples
bunx qtha validate my-app.qtha.json
```

Expected output:

```
✓ /path/to/examples/my-app.qtha.json
```

### 2. Get info about the spec

```bash
bunx qtha info my-app.qtha.json
```

This prints a detailed report: name, description, version, directives with step counts, schema type count, data keys, changelog entries, and design decisions.

### 3. Run the doctor

```bash
bunx qtha doctor my-app.qtha.json
```

Reports any errors or warnings in the spec structure.

### 4. Compile prompt files

```bash
# First, set up qtha.json config (or ensure it exists)
bunx qtha setup

# Then compile (uses ide/out from qtha.json)
bunx qtha compile my-app.qtha.json
```

This creates one `.prompt.md` file per directive in the output directory configured in `qtha.json` (default: `.github/prompts/`):

- `my-app.addEntity.prompt.md`
- `my-app.generateTypes.prompt.md`
- `my-app.seedData.prompt.md`

Each file is a complete VS Code Copilot prompt with context, design decisions, changelog, and step-by-step instructions.

### 5. Create a named spec

```bash
bunx qtha create --name "Test App"
```

Creates `test-app.qtha.json` with the name and id pre-filled.

### 6. Create a spec from template

```bash
bunx qtha init test.qtha.json
```

Creates a minimal `test.qtha.json` template ready for editing.
