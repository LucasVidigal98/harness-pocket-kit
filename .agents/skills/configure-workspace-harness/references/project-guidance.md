# Living project guidance

Keep documents directly under `harness/projects/<relative-path>/`. The script creates minimal templates once, guarded by `.guidance-initialized`; it does not infer architecture or inspect application code. The agent fills them from evidence and adopted user decisions. Preserve the marker so removed documents remain removed.

## Initial documents

| File | Content |
| --- | --- |
| `architecture.md` | Adopted architecture, modules/layers, responsibilities, boundaries and dependency direction as applied to this project. |
| `api_conventions.md` | Route names, HTTP verbs/statuses, DTOs, validation, request/response/error formats; pagination, filtering, ordering and versioning when applicable. Not a duplicate endpoint catalog. |
| `persistence.md` | SQL, NoSQL, files or other storage; access libraries (such as JPA), repositories, mappings, transactions and migrations, including naming, versions and execution tracking. |
| `configuration.md` | Locations and purposes of YAML, properties, .env and other configuration; profiles, data sources, integrations, required variables, defaults, precedence and secret sources, never secret values. |
| `tests.md` | Unit-test tools, layout, execution, mocks/stubs/fakes and coverage measurement. Unit tests run without databases, network or external infrastructure. Test behavior and errors; record coverage targets only when adopted. |
| `api_docs.md` | Documentation library, configuration, generation/access and conventions for endpoints, DTOs, responses and errors. Swagger is the default for new compatible APIs; preserve existing tooling or the user's alternative. Do not force Swagger on projects without an applicable API. |
| `decisions.md` | Short entries for adopted business/technical decisions, changes and known reasons. Identify superseded decisions. Do not invent reasons or log every prompt. |
| `business_rules.md` | Current domain conditions, constraints, calculations and behaviors, grouped by business area with examples when useful. |
| `security.md` | Adopted authentication, authorization, API keys and access mechanisms; reference credentials without recording values. |

## Fill progressively

- Empty project: keep headings, short purpose and pending topics. Record existing user decisions without pretending implementation exists.
- Existing/partial application: inspect relevant code, configuration and tests; describe observed behavior. Do not invent historical rationale or use bootstrap to reinitialize it.
- Initial bootstrap: record validated choices and update implemented details as each part is built. Pending persistence/security must not block independent domain/application work. Distinguish undecided infrastructure from a deliberate choice not to use it.
- Mark topics not applicable when supported by project scope. The initial list can evolve: add, rename or remove documents when the task calls for it, preserving useful manual content.

## Maintain during normal development

Consult relevant documents before working. When an authorized task adopts a decision or changes relevant behavior, update affected documents as part of that task. Distinguish approved direction, current implementation and remaining work. Exploratory questions or analysis-only requests do not authorize unrelated edits or turn suggestions into decisions.

Example: the user chooses SQL instead of MongoDB. Record the change and known reason in `decisions.md`; update `persistence.md` to show SQL as the chosen destination and MongoDB as the current implementation until migration is complete. Update configuration or architecture only if affected. Do not claim migrations ran until verified.

Preserve valid manual guidance. When the user explicitly changes an earlier rule, revise affected text and mark the old decision superseded. Clarify material contradictions not resolved by the task or source. Change shared guidance only when the decision applies across repositories.

The bootstrap YAML is the initial review/implementation plan. These documents are the continuing guidance after initialization; an old YAML must not override newer adopted decisions or become a second maintenance requirement.

## Tool entry points

Only prepare the chosen tool. Codex's generated `AGENTS.md` and Cursor's generated `harness-documents.mdc` contain maintenance instructions and an index of regular `.md` files directly in the project guidance directory. Paths are relative to the application repository root, including nested repositories, not to the symlink destination.

Run `node harness/scripts/harness.mjs sync <relative-path>` from the workspace root after changing document names or tool-specific sources; use `sync` for shared changes. Content-only document edits take effect directly because agents read the source. Never edit generated outputs. Preserve occupied link destinations and existing sources.
