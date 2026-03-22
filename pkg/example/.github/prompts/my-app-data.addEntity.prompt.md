---
name: "My App"
description: "Procedure for adding a new entity type to the spec schema and data"
---

# My App — addEntity

> User and team management data for My App, with schema-driven types and LLM directives

**Directive:** Procedure for adding a new entity type to the spec schema and data

## Design Decisions

- **Use UUIDs for all entity identities** — Allows distributed ID generation and simplifies merges across environments
- **Inline addresses rather than separate address collection** — Addresses are always 1:1 with users; no need for a separate top-level collection

## Recent Changes

- `init` — Initial spec with User, Team, and Address entities (2026-03-01T00:00:00Z)
- `addEntity` — Added addEntity directive for scaffolding new entities (2026-03-05T00:00:00Z)

## Steps

1. Review the current schema types in meta.schema.types to understand existing entities and avoid naming conflicts.

2. **Input — Name your new entity (PascalCase, e.g. 'Product').** (`{{entityName}}`)
   - Default: `NewEntity`

3. Define the fields for the new entity in meta.schema.types, using primitives (string, number, boolean) or $ref to existing types.

4. Add a $ref entry in meta.schema.data to expose the new entity at the top level of data (e.g. "products": { "$ref": "Product[]" }).

5. Add an empty array in data for the new collection, then add at least one sample record.

6. Add a changelog entry documenting the new entity addition.
