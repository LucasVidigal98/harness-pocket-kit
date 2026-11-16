import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(packageRoot, 'distribution', 'manifest.json');
const legacyManifestPath = path.join(packageRoot, 'distribution', 'legacy-manifest.json');
const installedRelative = '.harness-kit/installed.json';

function usage() {
  console.log(`Uso:\n  harness-pocket-kit install [--dry-run]\n  harness-pocket-kit status\n  harness-pocket-kit update [--dry-run] [--allow-major]\n  harness-pocket-kit adopt [--dry-run]`);
}

function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.posix.isAbsolute(value) || path.posix.normalize(value) !== value) throw new Error(`Caminho inválido no manifesto: ${String(value)}`);
  if (value.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Caminho inválido no manifesto: ${value}`);
  if (!['base/', 'scripts/', '.agents/skills/'].some((prefix) => value.startsWith(prefix))) throw new Error(`Caminho fora da superfície gerenciada: ${value}`);
  return value;
}

async function statOrNull(value) {
  try { return await lstat(value); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function readJson(value, label) {
  let parsed;
  try { parsed = JSON.parse(await readFile(value, 'utf8')); } catch (error) { throw new Error(`${label} inválido: ${error.message}`); }
  return parsed;
}

function validateManifest(value, label) {
  if (value?.formatVersion !== 1 || typeof value.packageName !== 'string' || typeof value.packageVersion !== 'string' || !Array.isArray(value.files)) throw new Error(`${label} usa formato incompatível.`);
  const seen = new Set();
  for (const file of value.files) {
    safeRelative(file?.path);
    if (!/^[a-f0-9]{64}$/.test(file?.sha256)) throw new Error(`Hash inválido em ${label}: ${file?.path}`);
    if (seen.has(file.path)) throw new Error(`Caminho duplicado em ${label}: ${file.path}`);
    seen.add(file.path);
  }
  return value;
}

async function hashFile(value) {
  const info = await statOrNull(value);
  if (!info || !info.isFile() || info.isSymbolicLink()) return null;
  return createHash('sha256').update(await readFile(value)).digest('hex');
}

async function inspectManagedPath(harness, relative) {
  let current = harness;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    const info = await statOrNull(current);
    if (!info) return { info: null, hash: null };
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Destino gerenciado usa caminho inseguro: ${current}`);
  }
  const destination = path.join(harness, ...relative.split('/'));
  const info = await statOrNull(destination);
  return { info, hash: await hashFile(destination) };
}

function versionParts(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) throw new Error(`Versão SemVer não suportada: ${value}`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = versionParts(left); const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  return 0;
}

function changeKind(from, to) {
  const a = versionParts(from); const b = versionParts(to);
  if (a[0] !== b[0]) return 'major';
  if (a[1] !== b[1]) return 'minor';
  if (a[2] !== b[2]) return 'patch';
  return 'nenhuma';
}

async function assertRoot(root) {
  const git = await statOrNull(path.join(root, '.git'));
  if (!git || git.isSymbolicLink() || (!git.isDirectory() && !git.isFile())) throw new Error('Execute na raiz de um repositório Git.');
}

async function assertHarnessDir(harness) {
  const info = await statOrNull(harness);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) throw new Error('harness/ precisa ser um diretório real na raiz do repositório.');
}

async function loadTarget() {
  const manifest = validateManifest(await readJson(manifestPath, 'Manifesto do pacote'), 'Manifesto do pacote');
  const packageInfo = await readJson(path.join(packageRoot, 'package.json'), 'package.json');
  if (manifest.packageName !== packageInfo.name || manifest.packageVersion !== packageInfo.version) throw new Error('Manifesto, nome e versão do pacote não correspondem.');
  return manifest;
}

async function loadInstalled(harness) {
  const value = validateManifest(await readJson(path.join(harness, installedRelative), 'Manifesto instalado'), 'Manifesto instalado');
  return value;
}

async function ensureDestination(harness, relative) {
  let current = harness;
  for (const part of path.posix.dirname(relative).split('/').filter((item) => item !== '.')) {
    current = path.join(current, part);
    const info = await statOrNull(current);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error(`Destino inseguro: ${current}`);
    if (!info) await mkdir(current);
  }
}

async function verifySources(manifest) {
  for (const file of manifest.files) {
    if ((await inspectManagedPath(packageRoot, file.path)).hash !== file.sha256) throw new Error(`O pacote não corresponde ao manifesto: ${file.path}`);
  }
}

function plan(installed, target) {
  const before = new Map(installed.files.map((file) => [file.path, file.sha256]));
  const after = new Map(target.files.map((file) => [file.path, file.sha256]));
  return {
    added: [...after].filter(([name]) => !before.has(name)).map(([name]) => name),
    updated: [...after].filter(([name, hash]) => before.has(name) && before.get(name) !== hash).map(([name]) => name),
    removed: [...before].filter(([name]) => !after.has(name)).map(([name]) => name),
  };
}

async function conflictsFor(harness, installed) {
  const conflicts = [];
  for (const file of installed.files) if ((await inspectManagedPath(harness, file.path)).hash !== file.sha256) conflicts.push(file.path);
  return conflicts;
}

function printPlan(before, target, operation) {
  console.log(`Versão: ${before ?? 'não instalada'} -> ${target.packageVersion}`);
  for (const key of ['added', 'updated', 'removed']) console.log(`${key}: ${operation[key].length ? operation[key].join(', ') : '-'}`);
}

async function writeInstalled(harness, manifest) {
  const destination = path.join(harness, installedRelative);
  await ensureDestination(harness, installedRelative);
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  await rm(destination, { force: true });
  await rename(temporary, destination);
}

function runHarness(root, command) {
  const result = spawnSync(process.execPath, [path.join(root, 'harness', 'scripts', 'harness.mjs'), command], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || `harness ${command} falhou.`);
  if (result.stdout) process.stdout.write(result.stdout);
}

async function applyTransaction(root, target, operation) {
  const harness = path.join(root, 'harness');
  const temporary = await mkdtemp(path.join(tmpdir(), 'harness-kit-'));
  const backupHarness = path.join(temporary, 'harness');
  const staging = path.join(temporary, 'staging');
  const entryPoints = ['AGENTS.md', 'CLAUDE.md', '.cursor/rules/harness.mdc'];
  try {
    const inventory = JSON.parse(await readFile(path.join(harness, 'inventory.json'), 'utf8'));
    const projects = inventory.version === 2 ? inventory.projects : inventory.repositories;
    if (Array.isArray(projects)) for (const project of projects) if (typeof project?.path === 'string') entryPoints.push(`${project.path}/AGENTS.md`);
  } catch {}
  const entryBackup = path.join(temporary, 'entries');
  const existingEntries = new Set();
  try {
    await verifySources(target);
    await cp(harness, backupHarness, { recursive: true });
    for (const relative of entryPoints) {
      const source = path.join(root, ...relative.split('/'));
      if (await statOrNull(source)) {
        existingEntries.add(relative);
        const destination = path.join(entryBackup, ...relative.split('/'));
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(source, destination, { recursive: true });
      }
    }
    for (const relative of [...operation.added, ...operation.updated]) {
      const staged = path.join(staging, ...relative.split('/'));
      await mkdir(path.dirname(staged), { recursive: true });
      await cp(path.join(packageRoot, ...relative.split('/')), staged);
      await ensureDestination(harness, relative);
      await cp(staged, path.join(harness, ...relative.split('/')));
    }
    for (const relative of operation.removed) await rm(path.join(harness, ...relative.split('/')));
    runHarness(root, 'init');
    runHarness(root, 'check');
    await writeInstalled(harness, target);
  } catch (error) {
    await rm(harness, { recursive: true, force: true });
    if (await statOrNull(backupHarness)) await cp(backupHarness, harness, { recursive: true });
    for (const relative of entryPoints) {
      const destination = path.join(root, ...relative.split('/'));
      if (existingEntries.has(relative)) {
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(path.join(entryBackup, ...relative.split('/')), destination, { recursive: true });
      } else await rm(destination, { recursive: true, force: true });
    }
    throw error;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

async function install(root, dryRun) {
  const harness = path.join(root, 'harness'); const target = await loadTarget();
  await verifySources(target);
  if (await statOrNull(harness)) throw new Error('harness/ já existe. Use update para instalação versionada ou adopt para instalação legada.');
  const operation = { added: target.files.map((file) => file.path), updated: [], removed: [] };
  printPlan(null, target, operation); if (dryRun) return;
  const entryPoints = ['AGENTS.md', 'CLAUDE.md', '.cursor/rules/harness.mdc'];
  const existingEntries = new Set();
  for (const relative of entryPoints) if (await statOrNull(path.join(root, ...relative.split('/')))) existingEntries.add(relative);
  await mkdir(harness);
  try { await applyTransaction(root, target, operation); } catch (error) {
    await rm(harness, { recursive: true, force: true });
    for (const relative of entryPoints) if (!existingEntries.has(relative)) await rm(path.join(root, ...relative.split('/')), { force: true });
    throw error;
  }
}

async function status(root) {
  const harness = path.join(root, 'harness'); await assertHarnessDir(harness);
  const target = await loadTarget(); const installed = await loadInstalled(harness);
  await verifySources(target);
  if (installed.packageName !== target.packageName) throw new Error(`Pacote instalado incompatível: ${installed.packageName}.`);
  const comparison = compareVersions(installed.packageVersion, target.packageVersion);
  console.log(`Instalada: ${installed.packageVersion}\nAlvo: ${target.packageVersion}\nMudança: ${changeKind(installed.packageVersion, target.packageVersion)}\nEstado: ${comparison < 0 ? 'atualização disponível' : comparison > 0 ? 'alvo mais antigo' : 'atual'}`);
}

async function update(root, dryRun, allowMajor) {
  const harness = path.join(root, 'harness'); await assertHarnessDir(harness);
  const target = await loadTarget(); const installed = await loadInstalled(harness);
  await verifySources(target);
  if (installed.packageName !== target.packageName) throw new Error(`Pacote instalado incompatível: ${installed.packageName}.`);
  const comparison = compareVersions(installed.packageVersion, target.packageVersion);
  if (comparison > 0) throw new Error('Downgrade recusado. Execute uma versão igual ou mais nova da CLI.');
  if (changeKind(installed.packageVersion, target.packageVersion) === 'major' && !allowMajor) throw new Error(`Atualização major recusada. Revise https://github.com/LucasVidigal98/harness-pocket-kit/releases/tag/v${target.packageVersion} e repita com --allow-major.`);
  const conflicts = await conflictsFor(harness, installed);
  const operation = plan(installed, target);
  const targetHashes = new Map(target.files.map((file) => [file.path, file.sha256]));
  for (const relative of operation.added) {
    const local = await inspectManagedPath(harness, relative);
    if (local.info && local.hash !== targetHashes.get(relative)) conflicts.push(relative);
  }
  if (conflicts.length) throw new Error(`Arquivos oficiais alterados, ausentes ou em colisão; nenhuma escrita realizada:\n${conflicts.join('\n')}`);
  printPlan(installed.packageVersion, target, operation); if (dryRun || comparison === 0) return;
  await applyTransaction(root, target, operation);
}

async function adopt(root, dryRun) {
  const harness = path.join(root, 'harness');
  if (!(await statOrNull(harness))) throw new Error('harness/ não encontrado. Use install.');
  await assertHarnessDir(harness);
  if (await statOrNull(path.join(harness, installedRelative))) throw new Error('Instalação já é versionada. Use update.');
  const target = await loadTarget(); const legacy = validateManifest(await readJson(legacyManifestPath, 'Manifesto legado'), 'Manifesto legado');
  await verifySources(target);
  const known = new Map(legacy.files.map((file) => [file.path, file.sha256])); const conflicts = [];
  for (const file of target.files) {
    const local = await inspectManagedPath(harness, file.path);
    if (local.info && (!local.hash || (local.hash !== file.sha256 && local.hash !== known.get(file.path)))) conflicts.push(file.path);
  }
  if (conflicts.length) throw new Error(`Arquivos legados não puderam ser classificados; nenhuma escrita realizada:\n${conflicts.join('\n')}`);
  const existing = [];
  for (const file of target.files) {
    const localHash = (await inspectManagedPath(harness, file.path)).hash;
    if (localHash) existing.push({ path: file.path, sha256: localHash });
  }
  const adopted = { files: existing };
  const operation = plan(adopted, target); printPlan('legada', target, operation); if (dryRun) return;
  await applyTransaction(root, target, operation);
}

export async function runCli(args, options = {}) {
  const command = args[0]; const flags = new Set(args.slice(1));
  if (!command || command === '--help' || command === '-h') return usage();
  const root = path.resolve(options.cwd ?? process.cwd()); await assertRoot(root);
  for (const flag of flags) if (!['--dry-run', '--allow-major'].includes(flag)) throw new Error(`Opção desconhecida: ${flag}`);
  if (command === 'install' && !flags.has('--allow-major')) return install(root, flags.has('--dry-run'));
  if (command === 'status' && flags.size === 0) return status(root);
  if (command === 'update') return update(root, flags.has('--dry-run'), flags.has('--allow-major'));
  if (command === 'adopt' && !flags.has('--allow-major')) return adopt(root, flags.has('--dry-run'));
  throw new Error(`Comando inválido: ${command}`);
}

export const testing = { compareVersions, changeKind, validateManifest, plan };
