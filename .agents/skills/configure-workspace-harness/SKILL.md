---
name: configure-workspace-harness
description: Configure or update Harness for a workspace with multiple code repositories. Use for requests such as “Configure o harness para este workspace”, or when registering repositories, choosing an agent tool, or synchronizing shared and repository-specific guidance.
---

# Configure Workspace Harness

Use this skill for requests such as “Configure o harness para este workspace”. The workspace contains a `harness` directory alongside code repositories.

## Configure

1. Find the workspace root and `harness/scripts/harness.mjs`. Run commands from the workspace root.
2. Run `node harness/scripts/harness.mjs init`. On the first run, the initializer registers immediate child directories that contain `.git` (directory or worktree file). It does not scan recursively. On later runs, it preserves the inventory; register new or nested repositories with `node harness/scripts/harness.mjs add <relative-path>`.
3. Read `harness/inventory.json`. Keep repository paths relative to the workspace and use the full path as identity. Do not remove entries just because a directory is missing; report it and leave cleanup to the user.
4. For each repository, detect its agent tool from recognized files. `AGENTS.md` suggests Codex; `.cursor/` suggests Cursor. If neither or multiple tools are plausible, ask which one to configure. Save the chosen tool using `node harness/scripts/harness.mjs link <relative-path> <codex|cursor>` after writing its guidance.
5. Read the repository's instructions and enough of its source to write useful, accurate guidance. Edit only the sources under `harness/common/` and `harness/projects/<relative-path>/`; do not put harness guidance in the code repository.
6. For Codex, edit `harness/common/codex/AGENTS.md` and `harness/projects/<relative-path>/codex/project.md`. Link each configured repository with `node harness/scripts/harness.mjs link <relative-path> codex`; this generates the combined instruction file.
7. For Cursor, edit `harness/common/cursor/rules/general.mdc` and `harness/projects/<relative-path>/cursor/project.mdc`. Link each configured repository with `node harness/scripts/harness.mjs link <relative-path> cursor`. The link exposes both shared and project rules in `.cursor/rules/`.
8. The shared files are source of truth. After changing common guidance, run `node harness/scripts/harness.mjs sync` so Codex's combined `AGENTS.md` files reflect it. Cursor rules point directly to the shared source.
9. Report registered repositories, tool choices, created links, and any paths or destinations that need manual attention.

## Safety

- The inventory is `harness/inventory.json`; preserve its version and existing records.
- Links are relative filesystem symlinks. The initializer never replaces an occupied destination or a link pointing elsewhere. It also links each Harness skill under the repository's `.agents/skills/`, preserving existing skills.
- Do not delete files, links, or inventory records when a repository is removed or unavailable.
- If Windows refuses symlink creation, explain that Developer Mode or symlink privileges are needed. Do not copy files as a fallback.
- The supported tools are currently Codex and Cursor. Ask before adapting an unlisted tool.
