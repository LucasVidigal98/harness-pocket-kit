---
name: bootstrap-workspace-project
description: Start a new repository in a Harness workspace and prepare its agent guidance. Use when asked to bootstrap a new workspace project or connect an existing repository to Harness.
---

# Bootstrap a Workspace Project

Use this skill when a user wants to start a project in a workspace managed by Harness. Keep the repository's application code in its own directory and keep Harness instructions under `harness/`.

1. Identify the workspace root and read `harness/inventory.json`. If the harness is not initialized, follow `configure-workspace-harness` first.
2. For a new repository, use the name and relative path supplied by the user. Create its directory only when the user has asked to start that project. Register it with `node harness/scripts/harness.mjs add <relative-path>`.
3. Inspect the project request and select an existing stack bootstrap skill when it applies, such as `nestjs-backend-bootstrap` or `spring-java-bootstrap`. Follow that skill's discovery and review steps; do not add an unrequested stack or infrastructure.
4. Identify whether Codex or Cursor is being used. If the repository gives no clear signal, ask the user which tool to configure.
5. Write project-specific agent guidance in `harness/projects/<relative-path>/codex/project.md` for Codex or `harness/projects/<relative-path>/cursor/project.mdc` for Cursor. Describe the project's purpose, chosen architecture and conventions, important paths, and any real constraints discovered. Keep shared rules in `harness/common/`.
6. Run `node harness/scripts/harness.mjs link <relative-path> codex` for Codex or `node harness/scripts/harness.mjs link <relative-path> cursor` for Cursor. The link command synchronizes the selected tool's guidance before creating links.
7. Confirm the inventory entry, source guidance, and symlink destinations. Preserve and report any existing destination instead of replacing it.
