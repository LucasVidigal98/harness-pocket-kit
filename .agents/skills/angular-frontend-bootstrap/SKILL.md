---
name: angular-frontend-bootstrap
description: Plan or initialize a new Angular frontend using a reviewable architecture plan and a validated implementation scope. Use for new projects or unfinished initialization, not to reinitialize existing applications.
---

# Angular Frontend Bootstrap

Plan Angular applications around user-facing features and clear UI boundaries. Use Angular's platform conventions first; apply domain modeling or layered architecture only where they clarify real behavior. Keep backend services and optional infrastructure out of scope unless selected. Work in two phases: prepare a reviewable `architecture.yaml`, then initialize only after the user validates it and asks you to proceed.

## Discover project choices

Inspect the repository first. Ask only about unresolved choices; do not repeat facts evident in the repo or request. For a new project, cover:

1. **Tooling and compatibility:** Node.js version, package manager, Angular CLI/framework version, TypeScript preferences, and local versus Docker development. Check the official Angular documentation and CLI options at decision time for supported versions and commands; do not hardcode a current-version list or assume compatibility. If sources are unavailable, record the version as unresolved rather than guessing.
2. **Application shape:** SPA, server-side rendering/prerendering, or another supported rendering mode; app name, deployment target, and any browser or accessibility requirements.
3. **Organization:** feature/page-first layout, route boundaries, naming convention, shared UI policy, and whether a small app needs more than Angular's standard structure. Prefer standalone components and Angular's current CLI defaults unless the project or user has a reason to choose otherwise; do not introduce NgModules or extra layers by habit.
4. **UI and behavior:** routing, forms and validation, UI/design system, localization, and state management only if the app needs shared or complex state. Prefer built-in Angular capabilities before adding libraries.
5. **Backend and quality:** API contracts/services the frontend consumes (do not invent or bootstrap a backend), authentication integration if selected, test framework and checks, lint/format approach, and accessibility expectations.

Recommend simple defaults for optional choices and record them as defaults when the user asked you to proceed autonomously. Do not ask about every option if a sound default can be stated. Preserve existing conventions and work.

## Scope and Harness guidance

This skill is for initial creation, including continuation of an unfinished initialization. For an existing application, use normal development for requested changes and `configure-workspace-harness` for guidance setup; do not reinitialize it. Do not overwrite files or restructure unrelated code.

When working in a Harness workspace, coordinate with `bootstrap-workspace-project` and read [the project guidance contract](../configure-workspace-harness/references/project-guidance.md). Fill thematic documents as choices are validated and implementation progresses. Keep decisions, observed implementation, and pending work distinct. Outside a Harness workspace, do not create a Harness implicitly.

The YAML review may approve only the foundation ready to begin. Leave unrelated choices in `open_questions` and implement the approved scope. An undecided backend or authentication choice must not block independent frontend work or force a vendor. After initialization, the Markdown documents track later decisions; the YAML remains the initial plan.

## Architecture rules

- Organize routes, pages, and supporting code by user-facing feature when that makes ownership clear. Small applications may use a simpler structure.
- Keep components focused on presentation and interaction; move meaningful reusable behavior into services or feature-level functions. Avoid pass-through wrappers and empty layers.
- Use Angular dependency injection for real shared services and platform integrations. Add interfaces or abstraction tokens only when they protect a meaningful boundary or support a real alternative/test.
- Keep HTTP calls and API-specific mapping in a small service or data-access area where that separation helps; do not create a repository/use-case layer for every screen.
- Keep forms and validation at the UI boundary. Choose template-driven or reactive forms based on form complexity and project conventions; do not configure both without need.
- Use built-in signals, RxJS, and router features where they fit. Add a state library only for demonstrated cross-feature state or workflow complexity.
- Keep environment-specific configuration free of secrets. Treat browser-delivered values as public; secrets belong on a server.
- Respect semantic HTML, keyboard operation, focus behavior, and accessible labels. Do not trade accessibility for visual shortcuts.
- Follow Angular's current CLI and framework conventions; do not add a second rendering, dependency-injection, or build system.

## Phase 1: architecture plan

1. Inspect the repository and gather answers/defaults. For partial work, identify existing conventions and consequential gaps.
2. Create or update `architecture.yaml` at the project root unless the user specifies another path. Do not include secrets.
3. Record the Angular/Node/package-manager choices, development mode, rendering and deployment shape, folder/naming conventions, routes, form/state choices, selected UI/API integrations, quality baseline, defaults, and unresolved questions.
4. Check versions and CLI options against official Angular documentation when available. Keep optional libraries and backend integrations absent unless selected.
5. Validate YAML syntax, summarize the decisions, and ask the user to validate the plan. Stop: do not scaffold, install dependencies, or initialize infrastructure in this phase.

Example shape (omit irrelevant fields):

```yaml
project:
  name: example
  framework: angular
  angular_version: "<selected version>"
  node_version: "<compatible version>"
  package_manager: npm
  development_environment: local
  rendering: spa
  deployment_target: static-host
architecture:
  organization: feature-first
  source_layout: src/app/features
  naming: kebab-case
  standalone: true
ui:
  design_system: none
  forms: reactive
  state: angular-signals
integrations: []
quality:
  tests: "<selected framework or CLI default>"
  lint: "<selected tool or none>"
  accessibility: semantic-html-and-keyboard
decisions: []
open_questions: []
```

## Phase 2: initialize

Start only after the user validates the YAML and explicitly asks to initialize. Treat it as the source of truth; ask only about consequential gaps.

1. Inspect current files and preserve existing work. For an existing app, inspect its scripts, build setup, and tests before edits.
2. Scaffold with the official Angular CLI using the selected options, or update the existing project in place. Avoid hand-writing generated boilerplate when the CLI supports the choice.
3. Implement the smallest useful shell and one representative routed feature or screen using the approved structure.
4. Add only selected UI, API, authentication, or rendering integrations. Keep credentials out of frontend source and configuration.
5. Add focused tests for meaningful component or service behavior using the chosen setup.
6. Run relevant build, tests, lint, and accessibility checks available in the project. Report exact commands and blockers; never claim a check passed unless it ran.
7. Summarize the implementation, selected integrations, verification, and practical extension points.

## Keep it proportionate

Do not add a state library, component library, backend, authentication provider, Docker, SSR, PWA, or architectural layers unless the requirements call for them. Do not mix multiple UI kits or create shared abstractions for one-off screens.
