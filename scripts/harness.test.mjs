import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = path.dirname(fileURLToPath(import.meta.url));
const filenames = ['api_conventions.md', 'api_docs.md', 'architecture.md', 'business_rules.md', 'configuration.md', 'decisions.md', 'persistence.md', 'security.md', 'tests.md'];

async function fixture(t) {
  const monorepo = await mkdtemp(path.join(tmpdir(), 'harness-test-'));
  t.after(() => rm(monorepo, { recursive: true, force: true }));
  await mkdir(path.join(monorepo, '.git'));
  const harness = path.join(monorepo, 'harness');
  await mkdir(path.join(harness, 'scripts'), { recursive: true });
  await mkdir(path.join(harness, '.agents', 'skills', 'example'), { recursive: true });
  await cp(path.join(source, 'harness.mjs'), path.join(harness, 'scripts', 'harness.mjs'));
  const execute = (...args) => spawnSync(process.execPath, [path.join(harness, 'scripts', 'harness.mjs'), ...args], { cwd: monorepo, encoding: 'utf8' });
  const run = (...args) => {
    const result = execute(...args);
    assert.equal(result.status, 0, result.stderr);
    return result;
  };
  return { monorepo, harness, execute, run };
}

test('init creates a version 2 inventory and root entry points without discovering arbitrary directories', async (t) => {
  const { monorepo, harness, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'frontend'));
  run('init');
  assert.deepEqual(JSON.parse(await readFile(path.join(harness, 'inventory.json'))), { version: 2, projects: [] });
  assert.match(await readFile(path.join(monorepo, 'AGENTS.md'), 'utf8'), /harness\/inventory\.json/);
  assert.match(await readFile(path.join(monorepo, 'CLAUDE.md'), 'utf8'), /harness\/common\/guidance\.md/);
  assert.match(await readFile(path.join(monorepo, '.cursor', 'rules', 'harness.mdc'), 'utf8'), /alwaysApply: true/);
  assert.match(await readFile(path.join(harness, 'common', 'guidance.md'), 'utf8'), /orientações específicas/i);
});

test('add registers arbitrary nested components, scaffolds guidance and remains idempotent', async (t) => {
  const { monorepo, harness, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'apps', 'web client'), { recursive: true });
  run('init');
  run('add', 'apps/web client');
  run('add', 'apps/web client');
  const inventory = JSON.parse(await readFile(path.join(harness, 'inventory.json')));
  assert.deepEqual(inventory.projects, [{ path: 'apps/web client' }]);
  const base = path.join(harness, 'projects', 'apps', 'web client');
  assert.deepEqual((await readdir(base)).filter((name) => name.endsWith('.md')).sort(), filenames);
  const componentEntry = path.join(monorepo, 'apps', 'web client', 'AGENTS.md');
  const componentInstructions = await readFile(componentEntry, 'utf8');
  assert.match(componentInstructions, /\.\.\/\.\.\/harness\/common\/guidance\.md/);
  assert.equal((await lstat(componentEntry)).isSymbolicLink(), false);
  await writeFile(path.join(base, 'business_rules.md'), '# Regra manual\nSaldo não pode ser negativo.\n');
  run('init');
  assert.equal(await readFile(path.join(base, 'business_rules.md'), 'utf8'), '# Regra manual\nSaldo não pode ser negativo.\n');
  run('check');
  run('check', 'apps/web client');
});

test('document additions, renames and removals survive init and validation', async (t) => {
  const { monorepo, harness, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'services', 'api'), { recursive: true });
  run('init');
  run('add', 'services/api');
  const base = path.join(harness, 'projects', 'services', 'api');
  await unlink(path.join(base, 'security.md'));
  await rename(path.join(base, 'tests.md'), path.join(base, 'quality.md'));
  await writeFile(path.join(base, 'operations.md'), '# Operations\n');
  run('init');
  await assert.rejects(lstat(path.join(base, 'security.md')), { code: 'ENOENT' });
  await assert.rejects(lstat(path.join(base, 'tests.md')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(base, 'quality.md'), 'utf8').then((value) => value.startsWith('# ')), true);
  run('check', 'services/api');
});

test('init migrates a version 1 inventory without deleting legacy sources', async (t) => {
  const { monorepo, harness, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'backend'));
  await mkdir(path.join(harness, 'projects', 'backend', 'codex'), { recursive: true });
  await writeFile(path.join(harness, 'projects', 'backend', 'architecture.md'), '# Arquitetura manual\n');
  await writeFile(path.join(harness, 'projects', 'backend', 'codex', 'project.md'), '# Fonte legada\n');
  await writeFile(path.join(harness, 'inventory.json'), JSON.stringify({ version: 1, repositories: [{ path: 'backend', tool: 'codex' }] }));
  run('init');
  assert.deepEqual(JSON.parse(await readFile(path.join(harness, 'inventory.json'))), { version: 2, projects: [{ path: 'backend' }] });
  assert.equal(await readFile(path.join(harness, 'projects', 'backend', 'architecture.md'), 'utf8'), '# Arquitetura manual\n');
  assert.equal(await readFile(path.join(harness, 'projects', 'backend', 'codex', 'project.md'), 'utf8'), '# Fonte legada\n');
  run('check');
});

test('existing root files are preserved and check requires a Harness reference', async (t) => {
  const { monorepo, execute, run } = await fixture(t);
  await writeFile(path.join(monorepo, 'AGENTS.md'), '# Regras manuais\n');
  run('init');
  assert.equal(await readFile(path.join(monorepo, 'AGENTS.md'), 'utf8'), '# Regras manuais\n');
  const validation = execute('check');
  assert.notEqual(validation.status, 0);
});

test('existing component AGENTS.md is preserved and must reference Harness', async (t) => {
  const { monorepo, execute, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'backend'));
  await writeFile(path.join(monorepo, 'backend', 'AGENTS.md'), '# Regras locais\n');
  run('init');
  run('add', 'backend');
  assert.equal(await readFile(path.join(monorepo, 'backend', 'AGENTS.md'), 'utf8'), '# Regras locais\n');
  assert.notEqual(execute('check', 'backend').status, 0);
});

test('component paths cannot escape the monorepo or cross symbolic links', async (t) => {
  const { monorepo, execute, run } = await fixture(t);
  await mkdir(path.join(monorepo, 'real'));
  await symlink(path.join(monorepo, 'real'), path.join(monorepo, 'linked'), 'dir');
  run('init');
  for (const invalid of ['../outside', 'harness/projects', '.git/hooks', 'linked']) {
    const result = execute('add', invalid);
    assert.notEqual(result.status, 0, invalid);
  }
});

test('commands require harness at the root of one Git repository', async (t) => {
  const { monorepo, execute } = await fixture(t);
  await rm(path.join(monorepo, '.git'), { recursive: true });
  const result = execute('init');
  assert.notEqual(result.status, 0);
});
