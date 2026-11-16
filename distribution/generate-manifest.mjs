#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distributionDir = path.join(packageRoot, 'distribution');

function assertManagedPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.posix.isAbsolute(value)) {
    throw new Error(`Caminho gerenciado inválido: ${String(value)}`);
  }
  const parts = value.split('/');
  if (path.posix.normalize(value) !== value || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Caminho gerenciado não é relativo e normalizado: ${value}`);
  }
  return value;
}

async function statOrThrow(filePath, label) {
  let info;
  try {
    info = await lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} não existe: ${filePath}`);
    throw error;
  }
  if (info.isSymbolicLink()) throw new Error(`${label} não pode ser link simbólico: ${filePath}`);
  return info;
}

async function assertSafeSourcePath(relativePath) {
  let current = packageRoot;
  const root = await statOrThrow(current, 'Raiz do pacote');
  if (!root.isDirectory()) throw new Error(`Raiz do pacote não é diretório: ${packageRoot}`);
  for (const part of relativePath.split('/')) {
    current = path.join(current, part);
    const info = await statOrThrow(current, 'Arquivo da distribuição');
    if (part !== relativePath.split('/').at(-1) && !info.isDirectory()) {
      throw new Error(`Diretório esperado na distribuição: ${current}`);
    }
  }
  const fileInfo = await statOrThrow(current, 'Arquivo da distribuição');
  if (!fileInfo.isFile()) throw new Error(`Arquivo regular esperado na distribuição: ${current}`);
  return current;
}

async function walkManagedSurface(relativePath, discovered) {
  const fullPath = path.join(packageRoot, ...relativePath.split('/'));
  const info = await statOrThrow(fullPath, 'Superfície gerenciada');
  if (info.isFile()) {
    discovered.add(relativePath);
    return;
  }
  if (!info.isDirectory()) throw new Error(`Arquivo ou diretório regular esperado: ${fullPath}`);
  const entries = await readdir(fullPath, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = `${relativePath}/${entry.name}`;
    const childPath = path.join(fullPath, entry.name);
    const childInfo = await statOrThrow(childPath, 'Superfície gerenciada');
    if (childInfo.isDirectory()) await walkManagedSurface(child, discovered);
    else if (childInfo.isFile()) discovered.add(child);
    else throw new Error(`Tipo de arquivo não suportado na distribuição: ${childPath}`);
  }
}

async function main() {
  const packageInfo = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const declaration = JSON.parse(await readFile(path.join(distributionDir, 'managed-files.json'), 'utf8'));
  if (declaration?.formatVersion !== 1 || !Array.isArray(declaration.paths)) {
    throw new Error('managed-files.json inválido; esperado formatVersion 1 e paths.');
  }
  const paths = declaration.paths.map(assertManagedPath).sort();
  if (new Set(paths).size !== paths.length) throw new Error('managed-files.json contém caminhos duplicados.');

  const discovered = new Set();
  for (const root of ['base', 'scripts/harness.mjs', '.agents/skills']) {
    await walkManagedSurface(root, discovered);
  }
  for (const discoveredPath of discovered) {
    if (!paths.includes(discoveredPath)) throw new Error(`Arquivo gerenciado sem declaração explícita: ${discoveredPath}`);
  }
  for (const declaredPath of paths) {
    if (!discovered.has(declaredPath)) throw new Error(`Arquivo declarado não encontrado na distribuição: ${declaredPath}`);
  }

  const files = [];
  for (const relativePath of paths) {
    const sourcePath = await assertSafeSourcePath(relativePath);
    const content = await readFile(sourcePath);
    files.push({ path: relativePath, sha256: createHash('sha256').update(content).digest('hex') });
  }
  const manifest = {
    formatVersion: 1,
    packageName: packageInfo.name,
    packageVersion: packageInfo.version,
    files,
  };
  await writeFile(path.join(distributionDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`Erro ao gerar manifesto: ${error.message}`);
  process.exitCode = 1;
});
