---
name: spring-java-bootstrap
description: Plan or initialize a Java Spring Boot project using Clean Architecture, DDD, and Hexagonal Architecture (Ports & Adapters). Use when deciding project tooling in a reviewable YAML file or implementing a project from a YAML the user validated.
---

# Spring Java Bootstrap

Bootstrap Spring Boot projects around business capabilities. Keep domain code independent from Spring and external technologies; use Clean Architecture, DDD, and Ports & Adapters only where they clarify real boundaries. Work in two phases: prepare a reviewable architecture YAML, then initialize only after the user validates it and asks you to proceed.

## Discover project choices

Inspect the repository first. Ask only about unresolved decisions; do not repeat facts evident in the repo or user request. Group questions and cover:

1. **Initializr settings:** Java language, Spring Boot version, Java version, Maven or Gradle (and Groovy or Kotlin DSL), packaging (JAR/WAR), configuration format (properties/YAML), group, artifact, name, package name, and project description.
2. **Version and dependency source:** use Spring Initializr metadata at `https://start.spring.io/` (or its metadata API) at decision time for valid Boot/Java versions, project types, and dependency IDs. Do not hardcode a version list or assume a dependency is compatible. If metadata cannot be reached, ask the user to choose in Initializr or record the version as unresolved; do not guess a current version.
3. **Architecture and naming:** deployment shape; feature-first or layer-first organization; package and directory naming; source layout; singular/plural feature names; whether aliases are desired. Java packages normally use lowercase names; do not introduce filesystem aliases unless a concrete tool supports the need.
4. **Infrastructure:** Docker for development, production, both, or neither; only required services such as database, cache, queue, email, storage, and third-party APIs; configuration and secrets approach.
5. **Application baseline:** REST, GraphQL, messaging, or combination; validation and API documentation; test framework; formatting/static checks; logging and health checks when in scope.

Recommend simple defaults for optional choices and record them as defaults when the user asked you to proceed autonomously. Do not ask about every Initializr field if a sensible default can be stated. Existing projects retain their conventions; do not overwrite files or restructure unrelated code.

## Architecture rules

- Organize by feature or bounded context, then by layer when that makes ownership clear. Small projects may use a simpler layout.
- Keep domain entities, value objects, domain services, errors, and repository contracts free of Spring annotations and persistence/vendor types.
- Application use cases coordinate behavior and depend on domain types and outbound ports, not infrastructure implementations.
- Inbound adapters (REST controllers, message listeners, CLI) translate transport input into application calls and map results to transport DTOs.
- Outbound adapters implement selected ports for persistence, queues, email, external APIs, clocks, and storage.
- Dependencies point inward. Spring configuration/composition wires ports to adapters; keep framework wiring out of the domain.
- Keep transport DTOs, persistence entities, and domain objects distinct when their shape or responsibilities differ. Map at boundaries.
- Add a port only when it protects dependency direction or gives a useful test/alternative boundary. Do not create interfaces for every class.
- Use Spring Boot conventions and Initializr-selected starters. Do not add a second dependency-injection framework.

## Phase 1: architecture plan

1. Inspect the project and gather answers/defaults.
2. Create or update `architecture.yaml` at the project root unless the user specifies another path. Do not include secrets.
3. Record Java, Spring Boot, build tool/DSL, packaging, config format, package coordinates, development environment, architecture/layout, selected Initializr dependency IDs, API and quality choices, integrations, Docker scope, defaults, and unresolved questions.
4. Resolve versions and dependency IDs against Spring Initializr metadata when available. Keep optional or unselected infrastructure absent, not invented.
5. Validate YAML syntax, summarize decisions, and ask the user to validate the plan. Stop: do not generate the project, install dependencies, or initialize infrastructure in this phase.

Example shape (omit irrelevant fields):

```yaml
project:
  language: java
  spring_boot_version: "<Initializr version>"
  java_version: "<Initializr-supported version>"
  build_tool: maven
  build_dsl: xml
  packaging: jar
  configuration_format: yaml
  group: com.example
  artifact: service
  package_name: com.example.service
  development_environment: local
architecture:
  style: clean-architecture-ddd-hexagonal
  organization: feature-first
  source_layout: src/main/java
  package_naming: lowercase
api:
  style: rest
quality:
  tests: spring-boot-test
dependencies: [] # Initializr dependency IDs selected by the user
integrations: []
docker:
  development: false
  app_container: false
  compose: false
decisions: []
open_questions: []
```

## Phase 2: initialize

Start only after the user validates the YAML and explicitly asks to initialize. Treat that YAML as source of truth; ask only about consequential gaps. Then:

1. Inspect current state and preserve existing work. For existing applications, inspect build/test setup before edits.
2. Generate or configure the project using the selected Initializr options and dependency IDs. For a new project, prefer the Initializr service or its official project-generation endpoint over hand-written build boilerplate.
3. Create the smallest useful foundation and one vertical feature slice, following chosen packages and dependency direction.
4. Add only selected integrations, with vendor configuration and persistence details in adapters/configuration. Keep secrets out of source control and validate required configuration at startup.
5. Add only selected Docker files/services; mentioning Docker alone does not imply Compose or an app image.
6. Add focused checks for meaningful domain/use-case behavior and selected adapters. Run relevant build, tests, and static checks; report exact commands and blockers, and never claim a check passed unless it ran.
7. Summarize changes, selected integrations, verification, and practical extension points.

## Keep it proportionate

Do not add CQRS, event sourcing, generic result frameworks, base repositories, domain-event buses, microservices, Docker, databases, or multiple DI containers unless the requirements call for them. Avoid empty layers and pass-through services. Spring Boot starters are optional selections, not a mandate to include every common feature.

For an example feature layout and dependency direction, read [references/architecture.md](references/architecture.md).
