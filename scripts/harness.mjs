#!/usr/bin/env node
import { readdir, lstat, mkdir, readFile, readlink, rename, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const harnessDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDir = path.dirname(harnessDir);
const inventoryPath = path.join(harnessDir, 'inventory.json');
const commonCodexPath = path.join(harnessDir, 'common', 'codex', 'AGENTS.md');
const commonCursorPath = path.join(harnessDir, 'common', 'cursor', 'rules', 'general.mdc');
const skillsPath = path.join(harnessDir, '.agents', 'skills');

const templates = [
  [commonCodexPath, '# Regras gerais do workspace\n\nAdicione aqui orientações compartilhadas pelos repositórios deste workspace.\n'],
  [commonCursorPath, '---\ndescription: Regras gerais compartilhadas pelo workspace\nalwaysApply: true\n---\n\nAdicione aqui orientações compartilhadas pelos repositórios deste workspace. Quando uma skill em `.agents/skills/` corresponder à tarefa, leia seu `SKILL.md` e siga suas instruções.\n'],
];

function usage() {
  console.log(`Uso:\n  node harness/scripts/harness.mjs init\n  node harness/scripts/harness.mjs add <caminho-relativo>\n  node harness/scripts/harness.mjs sync [caminho-relativo]\n  node harness/scripts/harness.mjs link <caminho-relativo> [codex|cursor]`);
}

function relativeRepoPath(value) {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  const parts = normalized.split('/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:/i.test(normalized) || parts.some((part) => !part || part === '.' || part === '..') || parts[0] === 'harness') {
    throw new Error(`Caminho de repositório inválido: ${value}`);
  }
  return normalized;
}

function projectDir(repoPath) {
  return path.join(harnessDir, 'projects', ...repoPath.split('/'));
}

function repoDir(repoPath) {
  return path.join(workspaceDir, ...repoPath.split('/'));
}

async function exists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function ensureHarnessDirectory(directory) {
  const relative = path.relative(harnessDir, directory);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Caminho fora de harness: ${directory}`);
  }
  let current = harnessDir;
  for (const part of relative ? relative.split(path.sep) : []) {
    const stat = await lstat(current).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
      throw new Error(`Diretório de harness não pode ser um link nem um arquivo: ${current}`);
    }
    if (!stat) await mkdir(current);
    current = path.join(current, part);
  }
  const finalStat = await lstat(current).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (finalStat && (!finalStat.isDirectory() || finalStat.isSymbolicLink())) {
    throw new Error(`Diretório de harness não pode ser um link nem um arquivo: ${current}`);
  }
  if (!finalStat) await mkdir(current);
}

async function writeIfMissing(filePath, content) {
  if (await exists(filePath)) return false;
  await ensureHarnessDirectory(path.dirname(filePath));
  await writeFile(filePath, content, { flag: 'wx' });
  return true;
}

function projectTemplates(repoPath) {
  const name = path.posix.basename(repoPath);
  const base = projectDir(repoPath);
  return [
    [path.join(base, 'codex', 'project.md'), `# Orientações específicas: ${name}\n\nDescreva aqui o propósito, os limites e as convenções deste repositório.\n`],
    [path.join(base, 'cursor', 'project.mdc'), `---\ndescription: Orientações específicas do repositório ${name}\nalwaysApply: true\n---\n\nDescreva aqui o propósito, os limites e as convenções deste repositório.\n`],
  ];
}

async function loadInventory() {
  let inventory;
  try {
    const info = await lstat(inventoryPath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('O inventário precisa ser um arquivo regular, não um link.');
    inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, repositories: [] };
    throw new Error(`Não foi possível ler ${inventoryPath}: ${error.message}`);
  }
  if (inventory?.version !== 1 || !Array.isArray(inventory.repositories)) {
    throw new Error('Inventário inválido. Esperado { "version": 1, "repositories": [...] }.');
  }

  const seen = new Set();
  for (const repo of inventory.repositories) {
    if (!repo || typeof repo.path !== 'string' || relativeRepoPath(repo.path) !== repo.path || (repo.tool !== null && repo.tool !== 'codex' && repo.tool !== 'cursor')) {
      throw new Error('Inventário inválido: cada repositório precisa de um path relativo e tool null, codex ou cursor.');
    }
    if (seen.has(repo.path)) throw new Error(`Inventário contém caminho duplicado: ${repo.path}`);
    seen.add(repo.path);
  }
  return inventory;
}

async function saveInventory(inventory) {
  await ensureHarnessDirectory(harnessDir);
  const temporaryPath = `${inventoryPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(inventory, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryPath, inventoryPath);
}

async function scaffoldProject(repoPath) {
  for (const [filePath, content] of projectTemplates(repoPath)) await writeIfMissing(filePath, content);
}

async function addRepository(inventory, inputPath) {
  const repoPath = relativeRepoPath(inputPath);
  const directory = repoDir(repoPath);
  if (!(await exists(directory)) || !(await lstat(directory)).isDirectory()) {
    throw new Error(`Diretório do repositório não encontrado: ${directory}`);
  }
  const repoStat = await lstat(directory);
  if (repoStat.isSymbolicLink()) throw new Error(`Não adiciono diretórios que sejam links simbólicos: ${directory}`);
  await assertSafeRepo(repoPath);
  let repo = inventory.repositories.find((item) => item.path === repoPath);
  if (!repo) {
    repo = { path: repoPath, tool: null };
    inventory.repositories.push(repo);
  }
  await scaffoldProject(repoPath);
  return repo;
}

async function ensureTemplateFiles() {
  for (const [filePath, content] of templates) await writeIfMissing(filePath, content);
}

async function init() {
  await mkdir(harnessDir, { recursive: true });
  await ensureTemplateFiles();
  const inventoryExisted = await exists(inventoryPath);
  const inventory = await loadInventory();
  if (!inventoryExisted) {
    const entries = await readdir(workspaceDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === path.basename(harnessDir)) continue;
      const candidate = path.join(workspaceDir, entry.name);
      if (await exists(path.join(candidate, '.git'))) {
        await addRepository(inventory, entry.name);
      }
    }
    await saveInventory(inventory);
    console.log(`Inventário criado com ${inventory.repositories.length} repositório(s).`);
  } else {
    for (const repo of inventory.repositories) await scaffoldProject(repo.path);
    console.log('Inventário existente preservado. Use "add" para registrar repositórios novos.');
  }
  console.log(`Inventário: ${inventoryPath}`);
}

async function add(inputPath) {
  const inventory = await loadInventory();
  const repo = await addRepository(inventory, inputPath);
  await saveInventory(inventory);
  console.log(`Repositório registrado: ${repo.path}`);
}

async function assertSafeRepo(repoPath) {
  let current = workspaceDir;
  for (const part of repoPath.split('/')) {
    current = path.join(current, part);
    const stat = await lstat(current).catch((error) => {
      if (error.code === 'ENOENT') throw new Error(`Caminho do inventário não existe: ${repoPath}`);
      throw error;
    });
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`O caminho do repositório precisa usar diretórios reais dentro do workspace: ${repoPath}`);
    }
  }
}

function generatedAgents(common, specific) {
  return `<!-- Gerado por harness/scripts/harness.mjs; edite as fontes em common/codex e projects/<path>/codex. -->\n${common.trim()}\n\n${specific.trim()}\n`;
}

async function ensureFileLink(target, linkPath) {
  if (await exists(linkPath)) {
    const info = await lstat(linkPath);
    if (!info.isSymbolicLink()) throw new Error(`Destino ocupado; preservado sem alteração: ${linkPath}`);
    const current = await readlink(linkPath);
    if (path.resolve(path.dirname(linkPath), current) !== path.resolve(target)) {
      throw new Error(`Link existente aponta para outro destino; preservado: ${linkPath}`);
    }
    return;
  }
  const relativeTarget = path.relative(path.dirname(linkPath), target);
  await symlink(relativeTarget, linkPath, 'file');
}

async function ensureDirectoryLink(target, linkPath) {
  if (await exists(linkPath)) {
    const info = await lstat(linkPath);
    if (!info.isSymbolicLink()) throw new Error(`Destino ocupado; preservado sem alteração: ${linkPath}`);
    const current = await readlink(linkPath);
    if (path.resolve(path.dirname(linkPath), current) !== path.resolve(target)) {
      throw new Error(`Link existente aponta para outro destino; preservado: ${linkPath}`);
    }
    return;
  }
  const relativeTarget = path.relative(path.dirname(linkPath), target);
  await symlink(relativeTarget, linkPath, 'dir');
}

async function linkSkills(repoPath) {
  const agentsDir = path.join(repoDir(repoPath), '.agents');
  const targetSkillsDir = path.join(agentsDir, 'skills');
  if (await exists(agentsDir)) {
    const info = await lstat(agentsDir);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Destino de skills ocupado; preservado: ${agentsDir}`);
  }
  if (await exists(targetSkillsDir)) {
    const info = await lstat(targetSkillsDir);
    if (info.isSymbolicLink()) {
      const current = await readlink(targetSkillsDir);
      if (path.resolve(path.dirname(targetSkillsDir), current) === path.resolve(skillsPath)) return;
      throw new Error(`Diretório de skills aponta para outro destino; preservado: ${targetSkillsDir}`);
    }
    if (!info.isDirectory()) throw new Error(`Destino de skills ocupado; preservado: ${targetSkillsDir}`);
  } else {
    await mkdir(targetSkillsDir, { recursive: true });
  }

  const skills = await readdir(skillsPath, { withFileTypes: true });
  for (const skill of skills) {
    if (skill.isDirectory()) await ensureDirectoryLink(path.join(skillsPath, skill.name), path.join(targetSkillsDir, skill.name));
  }
}

async function syncProject(repoPath, tool) {
  await assertSafeRepo(repoPath);
  const base = projectDir(repoPath);
  await scaffoldProject(repoPath);
  if (tool === 'codex') {
    const common = await readFile(commonCodexPath, 'utf8');
    const specific = await readFile(path.join(base, 'codex', 'project.md'), 'utf8');
    const output = path.join(base, 'codex', 'AGENTS.md');
    const content = generatedAgents(common, specific);
    if (await exists(output)) {
      if ((await lstat(output)).isSymbolicLink()) {
        throw new Error(`Arquivo de saída não pode ser um link simbólico; preservado: ${output}`);
      }
      const existing = await readFile(output, 'utf8');
      if (!existing.startsWith('<!-- Gerado por harness/scripts/harness.mjs;')) {
        throw new Error(`Arquivo de saída existe e não foi gerado pelo harness; preservado: ${output}`);
      }
      if (existing !== content) {
        const temporaryPath = `${output}.tmp`;
        await writeFile(temporaryPath, content, { flag: 'wx' });
        await rename(temporaryPath, output);
      }
    } else {
      await writeIfMissing(output, content);
    }
  }

  if (tool === 'cursor') {
    const cursorRulesDir = path.join(base, '.cursor', 'rules');
    await ensureHarnessDirectory(cursorRulesDir);
    const generalRule = path.join(cursorRulesDir, 'harness-general.mdc');
    const projectRule = path.join(cursorRulesDir, 'harness-project.mdc');
    await ensureFileLink(commonCursorPath, generalRule);
    await ensureFileLink(path.join(base, 'cursor', 'project.mdc'), projectRule);
  }
}

async function sync(inputPath) {
  const inventory = await loadInventory();
  const selected = inputPath ? [relativeRepoPath(inputPath)] : inventory.repositories.filter((repo) => repo.tool).map((repo) => repo.path);
  const failures = [];
  for (const repoPath of selected) {
    const repo = inventory.repositories.find((item) => item.path === repoPath);
    if (!repo) throw new Error(`Repositório não encontrado no inventário: ${repoPath}`);
    if (repo.tool !== 'codex' && repo.tool !== 'cursor') throw new Error(`Escolha a ferramenta antes de sincronizar: ${repoPath}`);
    try {
      await syncProject(repoPath, repo.tool);
      console.log(`Orientações sincronizadas: ${repoPath}`);
    } catch (error) {
      failures.push(`${repoPath}: ${error.message}`);
    }
  }
  if (failures.length) throw new Error(`Alguns repositórios não foram sincronizados:\n${failures.join('\n')}`);
}

async function link(inputPath, selectedTool) {
  const inventory = await loadInventory();
  const repoPath = relativeRepoPath(inputPath);
  const repo = inventory.repositories.find((item) => item.path === repoPath);
  if (!repo) throw new Error(`Repositório não encontrado no inventário: ${repoPath}`);
  const tool = selectedTool || repo.tool;
  if (tool !== 'codex' && tool !== 'cursor') throw new Error('Defina a ferramenta informando codex ou cursor.');
  await syncProject(repoPath, tool);
  const target = tool === 'codex'
    ? path.join(projectDir(repoPath), 'codex', 'AGENTS.md')
    : path.join(projectDir(repoPath), '.cursor');
  const destination = tool === 'codex'
    ? path.join(repoDir(repoPath), 'AGENTS.md')
    : path.join(repoDir(repoPath), '.cursor');

  if (tool === 'codex') await ensureFileLink(target, destination);
  else await ensureDirectoryLink(target, destination);
  await linkSkills(repoPath);
  repo.tool = tool;
  await saveInventory(inventory);
  console.log(`Link ${tool} pronto: ${repoPath}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') return usage();
  if (path.basename(harnessDir) !== 'harness') {
    throw new Error('Copie este kit para a pasta workspace/harness antes de executar o inicializador.');
  }
  if (command === 'init' && args.length === 0) return init();
  if (command === 'add' && args.length === 1) return add(args[0]);
  if (command === 'sync' && args.length <= 1) return sync(args[0]);
  if (command === 'link' && (args.length === 1 || args.length === 2)) return link(args[0], args[1]);
  usage();
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    console.error('No Windows, habilite Developer Mode ou execute em um terminal com permissão para criar symlinks.');
  }
  process.exitCode = 1;
});
