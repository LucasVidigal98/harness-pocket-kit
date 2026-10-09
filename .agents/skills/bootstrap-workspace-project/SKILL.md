---
name: bootstrap-workspace-project
description: Initialize a new application in a Harness workspace and progressively populate its guidance with the selected stack bootstrap. Use configure-workspace-harness for existing applications.
---

# Bootstrap a Workspace Project

Use this skill when a user wants to start a project in a workspace managed by Harness. Keep the repository's application code in its own directory and keep Harness instructions under `harness/`.

1. Identify the workspace root and read `harness/inventory.json`. If the harness is not initialized, follow `configure-workspace-harness` first.
2. For a new repository, use the name and relative path supplied by the user. Create its directory only when the user has asked to start that project. Register it with `node harness/scripts/harness.mjs add <relative-path>`.
3. Inspect the project request and select an existing stack bootstrap skill when it applies, such as `nestjs-backend-bootstrap` or `spring-java-bootstrap`. Follow that skill's discovery and review steps; do not add an unrequested stack or infrastructure.
   Bootstrap is only for initial creation, including continuation of an unfinished initialization. For initialized applications, use `configure-workspace-harness` to connect/document them and normal development for requested changes. Validate the consolidated scope without waiting for unrelated optional decisions.
4. Identify whether Codex or Cursor is being used. If the repository gives no clear signal, ask the user which tool to configure.
5. Write project-specific agent guidance in `harness/projects/<relative-path>/codex/project.md` for Codex or `harness/projects/<relative-path>/cursor/project.mdc` for Cursor. Describe the project's purpose, chosen architecture and conventions, important paths, and any real constraints discovered. Keep shared rules in `harness/common/`.
   Read [the project guidance contract](../configure-workspace-harness/references/project-guidance.md). Coordinate the selected stack skill to populate thematic Markdown files directly under `harness/projects/<relative-path>/` as choices are validated and each part is implemented. Keep the tool-specific source concise and reference thematic documents rather than duplicating them. Preserve manual content and prepare only the selected tool. Pending persistence/security must not block independent work.
6. Run `node harness/scripts/harness.mjs link <relative-path> codex` for Codex or `node harness/scripts/harness.mjs link <relative-path> cursor` for Cursor. The link command synchronizes the selected tool's guidance before creating links.
7. Confirm the inventory entry, source guidance, and symlink destinations. Preserve and report any existing destination instead of replacing it.
8. Report pending decisions and implementation gaps. Normal development maintains living documents through tool entry-point instructions; do not rerun bootstrap on an initialized application. The YAML remains the initial plan, not a competing source for later decisions.
