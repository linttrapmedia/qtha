---
name: "My App"
description: "Generate seed data records for a given entity type"
---

# My App — seedData

> User and team management data for My App, with schema-driven types and LLM directives

**Directive:** Generate seed data records for a given entity type

## Design Decisions

- **Use UUIDs for all entity identities** — Allows distributed ID generation and simplifies merges across environments
- **Inline addresses rather than separate address collection** — Addresses are always 1:1 with users; no need for a separate top-level collection

## Recent Changes

- `init` — Initial spec with User, Team, and Address entities (2026-03-01T00:00:00Z)
- `addEntity` — Added addEntity directive for scaffolding new entities (2026-03-05T00:00:00Z)

## Steps

1. **Select — Select the entity type to generate seed data for** (`{{entityType}}`)
   - Options: `User`, `Team`
   - Default: `User`

2. **Input — Number of seed records to generate** (`{{count}}`)
   - Default: `5`

3. Generate realistic sample records matching the entity schema. Ensure IDs are unique, required fields are populated, and $ref fields use valid IDs from existing data.

4. Append the generated records to the corresponding array in data and add a changelog entry.
