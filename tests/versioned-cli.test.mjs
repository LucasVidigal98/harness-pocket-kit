import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { testing } from '../lib/cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'bin', 'harness-pocket-kit.mjs');

async function fixture(t) {
  const workspace = await mkdtemp(path.join(tmpdir(), 'versioned-harness-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(path.join(workspace, '.git'));
  const execute = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: workspace, encoding: 'utf8' });
  const run = (...args) => { const result = execute(...args); assert.equal(result.status, 0, result.stderr); return result; };
  return { workspace, execute, run };
}

test('SemVer comparison and update plan are deterministic', () => {
  assert.equal(testing.compareVersions('1.2.3', '1.3.0'), -1);
  assert.equal(testing.changeKind('1.2.3', '2.0.0'), 'major');
  assert.deepEqual(testing.plan({ files: [{ path: 'a', sha256: '1' }, { path: 'b', sha256: '2' }] }, { files: [{ path: 'b', sha256: '3' }, { path: 'c', sha256: '4' }] }), { added: ['c'], updated: ['b'], removed: ['a'] });
  assert.throws(() => testing.validateManifest({ formatVersion: 1, packageName: 'x', packageVersion: '1.0.0', files: [{ path: '../escape', sha256: 'a'.repeat(64) }] }, 'teste'), /Caminho inválido/);
});

test('install creates a managed Harness while preserving local ownership boundaries', async (t) => {
  const { workspace, run } = await fixture(t);
  run('install');
  const installed = JSON.parse(await readFile(path.join(workspace, 'harness', '.harness-kit', 'installed.json'), 'utf8'));
  assert.equal(installed.packageVersion, '1.0.0');
  assert.equal(JSON.parse(await readFile(path.join(workspace, 'harness', 'inventory.json'), 'utf8')).version, 2);
  assert.match(await readFile(path.join(workspace, 'AGENTS.md'), 'utf8'), /base\/guidance\.md/);
  await writeFile(path.join(workspace, 'harness', 'common', 'local.md'), '# local\n');
  run('update', '--dry-run');
  assert.equal(await readFile(path.join(workspace, 'harness', 'common', 'local.md'), 'utf8'), '# local\n');
});

test('install dry-run does not create harness', async (t) => {
  const { workspace, run } = await fixture(t);
  run('install', '--dry-run');
  await assert.rejects(stat(path.join(workspace, 'harness')), { code: 'ENOENT' });
});

test('status and dry-run do not write files', async (t) => {
  const { workspace, run } = await fixture(t);
  run('install');
  const installedPath = path.join(workspace, 'harness', '.harness-kit', 'installed.json');
  const before = await stat(installedPath);
  assert.match(run('status').stdout, /Estado: atual/);
  run('update', '--dry-run');
  const after = await stat(installedPath);
  assert.equal(after.mtimeMs, before.mtimeMs);
});

test('update refuses major changes and detects local official edits before writing', async (t) => {
  const { workspace, execute, run } = await fixture(t);
  run('install');
  const installedPath = path.join(workspace, 'harness', '.harness-kit', 'installed.json');
  const installed = JSON.parse(await readFile(installedPath, 'utf8'));
  installed.packageVersion = '0.9.0';
  await writeFile(installedPath, `${JSON.stringify(installed, null, 2)}\n`);
  assert.match(execute('update').stderr, /major recusada/);
  await writeFile(path.join(workspace, 'harness', 'base', 'guidance.md'), '# customização indevida\n');
  const conflict = execute('update', '--allow-major');
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /base\/guidance\.md/);
  assert.equal(JSON.parse(await readFile(installedPath, 'utf8')).packageVersion, '0.9.0');
});

test('failed post-update validation restores the installed manifest', async (t) => {
  const { workspace, execute, run } = await fixture(t);
  run('install');
  const installedPath = path.join(workspace, 'harness', '.harness-kit', 'installed.json');
  const installed = JSON.parse(await readFile(installedPath, 'utf8'));
  installed.packageVersion = '0.9.0';
  await writeFile(installedPath, `${JSON.stringify(installed, null, 2)}\n`);
  await writeFile(path.join(workspace, 'AGENTS.md'), '# personalizado sem encaminhamento\n');
  const result = execute('update', '--allow-major');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Validação encontrou problemas/);
  assert.equal(JSON.parse(await readFile(installedPath, 'utf8')).packageVersion, '0.9.0');
});

test('adopt classifies an intact legacy copy and preserves local content', async (t) => {
  const { workspace, run } = await fixture(t);
  const harness = path.join(workspace, 'harness');
  await mkdir(harness);
  await cp(path.join(root, 'scripts'), path.join(harness, 'scripts'), { recursive: true });
  await cp(path.join(root, '.agents'), path.join(harness, '.agents'), { recursive: true });
  await mkdir(path.join(harness, 'common'));
  await writeFile(path.join(harness, 'common', 'guidance.md'), '# decisão local\n');
  run('adopt');
  assert.equal(await readFile(path.join(harness, 'common', 'guidance.md'), 'utf8'), '# decisão local\n');
  assert.equal(JSON.parse(await readFile(path.join(harness, '.harness-kit', 'installed.json'), 'utf8')).packageVersion, '1.0.0');
});
