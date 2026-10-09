import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, readdir, rename, unlink, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = path.dirname(fileURLToPath(import.meta.url));
const filenames = ['api_conventions.md', 'api_docs.md', 'architecture.md', 'business_rules.md', 'configuration.md', 'decisions.md', 'persistence.md', 'security.md', 'tests.md'];

async function fixture(t) {
  const workspace = await mkdtemp(path.join(tmpdir(), 'harness-test-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const harness = path.join(workspace, 'harness');
  await mkdir(path.join(harness, 'scripts'), { recursive: true });
  await mkdir(path.join(harness, '.agents', 'skills', 'example'), { recursive: true });
  await cp(path.join(source, 'harness.mjs'), path.join(harness, 'scripts', 'harness.mjs'));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [path.join(harness, 'scripts', 'harness.mjs'), ...args], { cwd: workspace, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result;
  };
  return { workspace, harness, run };
}

test('empty and existing projects: selected tools, templates, portable references and idempotence', async (t) => {
  const { workspace, harness, run } = await fixture(t);
  await mkdir(path.join(workspace, 'existing', '.git'), { recursive: true });
  await writeFile(path.join(workspace, 'existing', 'app.js'), 'export const businessRule = 42;\n');
  await mkdir(path.join(workspace, 'services', 'empty backend'), { recursive: true });
  run('init');
  assert.deepEqual(JSON.parse(await readFile(path.join(harness, 'inventory.json'))).repositories, [{ path: 'existing', tool: null }]);
  run('add', 'services/empty backend');
  const base = path.join(harness, 'projects', 'services', 'empty backend');
  assert.deepEqual((await readdir(base)).filter((name) => name.endsWith('.md')).sort(), filenames);
  await assert.rejects(lstat(path.join(base, 'codex')), { code: 'ENOENT' });
  await assert.rejects(lstat(path.join(harness, 'common')), { code: 'ENOENT' });
  run('link', 'services/empty backend', 'codex');
  await assert.rejects(lstat(path.join(base, 'cursor')), { code: 'ENOENT' });
  await assert.rejects(lstat(path.join(harness, 'common', 'cursor')), { code: 'ENOENT' });
  const entry = path.join(workspace, 'services', 'empty backend', 'AGENTS.md');
  const instructions = await readFile(entry, 'utf8');
  const references = instructions.split('\n').filter((line) => line.startsWith('- "')).map((line) => JSON.parse(line.slice(2)));
  assert.equal(references.length, 9);
  for (const ref of references) assert.ok((await readFile(path.resolve(path.dirname(entry), ref), 'utf8')).startsWith('# '));
  await writeFile(path.join(base, 'business_rules.md'), '# Regra manual\nSaldo não pode ser negativo.\n');
  run('sync');
  run('link', 'services/empty backend', 'codex');
  assert.equal(await readFile(entry, 'utf8'), instructions);
  assert.equal(await readFile(path.join(base, 'business_rules.md'), 'utf8'), '# Regra manual\nSaldo não pode ser negativo.\n');
  run('link', 'existing', 'cursor');
  const cursorBase = path.join(harness, 'projects', 'existing');
  await assert.rejects(lstat(path.join(cursorBase, 'codex')), { code: 'ENOENT' });
  const cursorEntry = path.join(workspace, 'existing', '.cursor', 'rules', 'harness-documents.mdc');
  const cursorInstructions = await readFile(cursorEntry, 'utf8');
  assert.match(cursorInstructions, /alwaysApply: true/);
  for (const line of cursorInstructions.split('\n').filter((line) => line.startsWith('- "'))) {
    await readFile(path.resolve(workspace, 'existing', JSON.parse(line.slice(2))));
  }
  assert.equal(await readFile(path.join(workspace, 'existing', 'app.js'), 'utf8'), 'export const businessRule = 42;\n');
  run('sync');
  assert.equal(await readFile(cursorEntry, 'utf8'), cursorInstructions);
});

test('document additions, renames and removals survive every command and refresh both indexes', async (t) => {
  const { workspace, harness, run } = await fixture(t);
  for (const [repo, tool] of [['a', 'codex'], ['b', 'cursor']]) {
    await mkdir(path.join(workspace, repo));
    run('add', repo);
    run('link', repo, tool);
    const base = path.join(harness, 'projects', repo);
    await unlink(path.join(base, 'security.md'));
    await rename(path.join(base, 'tests.md'), path.join(base, 'quality.md'));
    await writeFile(path.join(base, 'operations.md'), '# Operations\n');
    run('init');
    run('add', repo);
    run('link', repo, tool);
    run('sync', repo);
    await assert.rejects(lstat(path.join(base, 'security.md')), { code: 'ENOENT' });
    await assert.rejects(lstat(path.join(base, 'tests.md')), { code: 'ENOENT' });
    const index = await readFile(path.join(base, tool === 'codex' ? 'codex/AGENTS.md' : '.cursor/rules/harness-documents.mdc'), 'utf8');
    assert.match(index, /quality\.md/);
    assert.match(index, /operations\.md/);
    assert.doesNotMatch(index, /\/security\.md|\/tests\.md/);
  }
});

test('legacy migration preserves sources and occupied destinations', async (t) => {
  const { workspace, harness, run } = await fixture(t);
  await mkdir(path.join(workspace, 'legacy'));
  const base = path.join(harness, 'projects', 'legacy');
  await mkdir(path.join(base, 'codex'), { recursive: true });
  await mkdir(path.join(harness, 'common', 'codex'), { recursive: true });
  await writeFile(path.join(base, 'architecture.md'), '# Arquitetura manual\n');
  await writeFile(path.join(base, 'codex', 'project.md'), '# Regras manuais\n');
  await writeFile(path.join(harness, 'common', 'codex', 'AGENTS.md'), '# Compartilhadas manuais\n');
  await writeFile(path.join(harness, 'inventory.json'), JSON.stringify({ version: 1, repositories: [{ path: 'legacy', tool: 'codex' }] }));
  run('init');
  run('link', 'legacy');
  assert.equal(await readFile(path.join(base, 'architecture.md'), 'utf8'), '# Arquitetura manual\n');
  assert.equal(await readFile(path.join(base, 'codex', 'project.md'), 'utf8'), '# Regras manuais\n');
  const entry = await readFile(path.join(workspace, 'legacy', 'AGENTS.md'), 'utf8');
  assert.match(entry, /Compartilhadas manuais/);
  assert.match(entry, /Documentação viva/);
  assert.match(entry, /architecture\.md/);
  await mkdir(path.join(workspace, 'occupied'));
  await writeFile(path.join(workspace, 'occupied', 'AGENTS.md'), 'manual');
  run('add', 'occupied');
  const result = spawnSync(process.execPath, [path.join(harness, 'scripts', 'harness.mjs'), 'link', 'occupied', 'codex'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(path.join(workspace, 'occupied', 'AGENTS.md'), 'utf8'), 'manual');
});
