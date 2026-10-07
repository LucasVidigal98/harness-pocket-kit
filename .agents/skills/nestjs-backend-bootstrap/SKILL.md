---
name: nestjs-backend-bootstrap
description: Plan or initialize a NestJS backend using Clean Architecture, DDD, and Hexagonal Architecture (Ports & Adapters). Use when defining project choices in a reviewable YAML architecture file, or when implementing infrastructure from a YAML the user has validated.
---

# NestJS Backend Bootstrap

Plan a maintainable NestJS backend organized around business capabilities. Use DDD to model the domain, Clean Architecture to control dependency direction, and Ports & Adapters to isolate external technologies. Keep the bootstrap generic: databases, brokers, Docker, and vendors are optional choices, not assumptions. Work in two phases: first produce an architecture YAML for the user's review; initialize the project only after the user validates it and asks you to proceed.

## Start with project discovery

Before scaffolding or changing code, inspect the repository and ask the user a concise, grouped set of questions about unresolved project decisions. Do not ask again for facts that are already clear from the repository or the user's instructions. For a new project, cover:

1. **Runtime and tooling:** ask whether development should use tools installed on the computer or run entirely in Docker, especially if Node.js or the selected package manager is unavailable locally. Also establish the Node.js version, package manager, NestJS version (or whether to choose a compatible stable version), and relevant TypeScript preferences.
2. **Architecture and naming:** monolith or another deployment shape; feature/module organization; directory naming convention (`kebab-case`, `camelCase`, etc.); preferred root layout (`src/modules`, `src/features`, or another convention); whether to use singular/plural feature names.
3. **Path aliases:** confirm the `@domain`, `@application`, `@infrastructure`, `@presentation`, and optionally `@shared` aliases, and whether aliases should target each feature's layer or a shared top-level layer. Recommend feature-scoped aliases when they avoid collisions and preserve module boundaries.
4. **Infrastructure:** whether Docker is needed for local development, production, both, or neither; which external services are actually required (database, cache, queue, email, storage, third-party APIs); configuration/secrets approach.
5. **API and quality baseline:** REST, GraphQL, messaging, or combination; validation/API documentation needs; test framework and desired checks; logging/health-check needs if in scope.

Use the available user-input mechanism or an equivalent concise interaction. Bundle related questions rather than asking one at a time. If many decisions remain open, ask only what is needed for a sound foundation and record other choices as explicit defaults. Never block on optional details: recommend a simple default, state it, and continue when the user asked you to proceed autonomously.

For an existing repository, inspect files first and ask only about consequential ambiguities. Preserve existing working conventions unless the user requests a change or they conflict with the dependency rules below. Do not overwrite files or restructure unrelated code without need.

## Architecture rules

- Organize by bounded context or feature, then by layer. Avoid global folders that mix unrelated feature internals.
- Keep domain entities, value objects, domain services, domain errors, and domain-owned repository contracts free of NestJS decorators and vendor/persistence types.
- Application use cases orchestrate operations and depend on domain types and outbound ports, never concrete infrastructure clients.
- Inbound adapters (HTTP controllers, message consumers, CLI handlers) translate external input into application commands and map results to transport DTOs.
- Outbound adapters implement ports for whichever external capabilities the project selects: persistence, queues, email, third-party APIs, clocks, file storage, and others.
- Dependencies point inward: presentation and infrastructure may depend on application/domain; domain must not depend on application frameworks or infrastructure.
- Bind abstractions to implementations in Nest modules using stable injection tokens or typed symbols. Keep the composition root explicit.
- Keep transport DTOs, persistence representations, and domain models distinct when their responsibilities or shapes differ. Map explicitly at boundaries.
- Use repository contracts for aggregate persistence, with methods named in domain language. Do not wrap every external client in a speculative generic abstraction.
- Add a port only when it protects an inward dependency or provides a meaningful test/alternative boundary. Do not create an interface for every class.

## Path aliases

Use path aliases to shorten imports across architectural layers. The preferred alias vocabulary is `@domain`, `@application`, `@infrastructure`, `@presentation`, and `@shared`; adapt only when the project's chosen directory convention requires a different mapping.

For a feature-scoped layout, prefer aliases that make the feature explicit, such as `@users/domain/*`, `@users/application/*`, and `@users/infrastructure/*`, or establish aliases inside each feature if the toolchain supports it. For a single-context/small backend, top-level `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, and `@shared/*` may be sufficient. Ask which naming and scope the user prefers when starting from scratch; do not silently mix both schemes.

Configure the same mappings consistently in all tools that resolve imports:

- TypeScript `compilerOptions.baseUrl` and `paths` in the authoritative tsconfig.
- Build config used by Nest/TypeScript, including any separate production tsconfig.
- Test runner (Jest/Vitest) module name mapping.
- Runtime execution when paths are not rewritten by the build output; select a compatible resolver/rewriter only if needed.
- IDE/lint/import tooling when it requires explicit configuration.

Use aliases for architectural boundaries and stable module imports, not as a replacement for clear local relative imports within a small folder. Avoid ambiguous aliases such as several different paths resolving to the same layer. After setup, verify aliases by running the actual build and test commands and, where applicable, starting the app or a smoke test. Do not claim runtime alias support based only on a successful TypeScript typecheck.

## Optional infrastructure and Docker

- Add only the external integrations the user selected or the feature demonstrably needs. Do not assume MongoDB or any other database.
- Keep vendor SDKs, schemas, connection details, client configuration, and query specifics in infrastructure adapters/providers.
- If the user chooses development entirely in Docker, make the development commands and required tools run in containers so local Node.js/package-manager installation is unnecessary. Clarify or infer whether they also need local infrastructure services, an app image, or Compose orchestration. If they choose local tools, use what is installed and add Docker only for selected needs. Do not add container files just because Docker was mentioned.
- Keep secrets out of source control. Add an example environment file with placeholder names only; validate required configuration at startup using the project's selected configuration approach.
- Make health checks and graceful shutdown match the actual infrastructure selected. Avoid placeholder adapters that look production-ready but do not work.

## Phase 1: architecture YAML

1. Inspect the repository and gather answers/defaults from discovery. For an existing project, record its relevant conventions and current state.
2. Create or update a reviewable `.yaml` file containing the architecture and implementation choices. Use `architecture.yaml` at the project root unless the user names another path. Do not include secrets.
3. Include the selected runtime and package manager, local-versus-Docker development mode, architecture and folder/naming conventions, path aliases, API and quality baseline, selected integrations, and explicit defaults or unresolved decisions. Represent optional or unselected infrastructure as absent/disabled rather than inventing a choice.
4. Ensure the file is valid YAML, then summarize its key decisions and ask the user to validate it. Stop here: do not scaffold, install dependencies, or initialize project infrastructure in this phase.

The YAML should be straightforward to review and edit. Use this shape, omitting sections that do not apply:

```yaml
project:
  name: example
  runtime: node
  node_version: "<selected version>"
  package_manager: "<selected manager>"
  development_environment: local # or docker
architecture:
  style: clean-architecture-ddd-hexagonal
  organization: feature-first
  source_layout: src/modules
  naming: kebab-case
  aliases:
    scope: feature
    mappings: {}
api:
  style: rest
  validation: "<selected approach or none>"
quality:
  tests: "<selected framework or default>"
  lint: "<selected tool or default>"
integrations: []
docker:
  development: false
  app_container: false
  compose: false
decisions: []
open_questions: []
```

## Phase 2: initialize the project

Begin only after the user validates the YAML and explicitly asks to initialize the project. Treat the validated YAML as the source of truth; if it is missing or has consequential gaps, ask only about those before making dependent changes.

1. Inspect the repository and record its current state. Confirm the app builds and inspect existing tests before edits when working in an existing project.
2. Create the smallest useful foundation and a vertical feature slice using the validated folder and naming conventions.
3. Implement domain types and invariants first, then application use cases and ports.
4. Add inbound adapters and validation at the transport boundary.
5. Add only selected outbound adapters and explicit mappings.
6. Register providers/tokens in feature modules. Keep `AppModule` for application-wide composition/configuration, not as a dumping ground for every feature provider.
7. Configure path aliases consistently across compiler, test, and runtime tooling.
8. Add focused tests for domain behavior and use cases using fake ports. Add adapter or integration tests when they verify a meaningful external contract.
9. Run the relevant format, lint, typecheck/build, tests, and alias/runtime smoke checks. Report exact commands and blockers; never claim checks passed unless they ran successfully.
10. Summarize the implementation, selected infrastructure, verification, and clear extension points.

## Keep the bootstrap proportionate

Do not add CQRS, event sourcing, generic Result frameworks, base repositories, domain-event buses, microservice abstractions, Docker, databases, or multiple DI containers unless requirements call for them. Avoid anemic pass-through services: use cases should express real operations, and domain objects should own their invariants.

For the folder layout, dependency example, and alias configuration example, read [references/architecture.md](references/architecture.md).
