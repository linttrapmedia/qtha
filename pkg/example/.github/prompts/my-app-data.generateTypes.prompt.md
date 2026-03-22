---
name: "My App"
description: "Generate TypeScript type definitions from the spec schema"
---

# My App — generateTypes

> User and team management data for My App, with schema-driven types and LLM directives

**Directive:** Generate TypeScript type definitions from the spec schema

## Design Decisions

- **Use UUIDs for all entity identities** — Allows distributed ID generation and simplifies merges across environments
- **Inline addresses rather than separate address collection** — Addresses are always 1:1 with users; no need for a separate top-level collection

## Recent Changes

- `init` — Initial spec with User, Team, and Address entities (2026-03-01T00:00:00Z)
- `addEntity` — Added addEntity directive for scaffolding new entities (2026-03-05T00:00:00Z)

## Steps

1. Read all types defined in meta.schema.types and generate corresponding TypeScript interfaces and type aliases.

2. **Input — Output file path for generated types** (`{{outputPath}}`)
   - Default: `src/types/generated.ts`

3. Run the type generation script

```bash
bun scripts/generateTypes.ts --spec my-app.qtha.json --out ${input:outputPath}
```
