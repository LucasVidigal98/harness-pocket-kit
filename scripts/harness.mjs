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
const livingGuidance = `Antes de trabalhar, consulte os documentos do Harness pertinentes à tarefa. Conforme o usuário adota decisões e o projeto evolui, atualize os documentos afetados no mesmo trabalho.
Preserve conteúdo manual válido. Diferencie decisões aprovadas, implementação existente e pendências; ideias em discussão não são decisões. Não invente justificativas nem registre valores de secrets.
Os documentos temáticos descrevem o estado vigente; decisions.md registra decisões relevantes e seus motivos conhecidos em tópicos curtos, identificando decisões substituídas. Atualize também orientações compartilhadas quando a decisão realmente valer para outros projetos.
Documentos podem ser adicionados, renomeados ou removidos conforme a necessidade. Após mudar a lista ou as fontes de orientação da ferramenta, execute a sincronização indicada abaixo. Não é necessário executar bootstrap para manter a documentação.
Quando uma skill em .agents/skills/ corresponder à tarefa, leia seu SKILL.md e siga suas instruções.`;

const documents = {
  'architecture.md': ['Arquitetura', 'Organização, camadas, responsabilidades, limites e direção das dependências adotadas.'],
  'api_conventions.md': ['Convenções da API', 'Rotas, verbos e status HTTP, DTOs, validação, requisições, respostas e erros; paginação e versionamento quando aplicáveis.'],
  'persistence.md': ['Persistência', 'Armazenamento SQL, NoSQL, arquivos ou outras soluções; acesso, repositórios, mapeamentos, transações e migrations (ferramenta, nomes, versões e controle de execução).'],
  'configuration.md': ['Configuração', 'Inventário e localização de YAML, properties, .env, perfis, data sources e integrações; variáveis obrigatórias, padrões e precedência. Referencie a origem de secrets, nunca seus valores.'],
  'tests.md': ['Testes unitários', 'Ferramentas, organização, execução, mocks/fakes/stubs e cobertura. Testes unitários devem verificar comportamentos sem banco, rede ou infraestrutura externa. Metas de cobertura somente quando definidas.'],
  'api_docs.md': ['Documentação da API', 'Biblioteca, configuração, geração, acesso e convenções para endpoints, DTOs, respostas e erros. Swagger é o padrão para novas APIs compatíveis; preserve a solução existente ou a alternativa escolhida pelo usuário.'],
  'decisions.md': ['Decisões do projeto', 'Registre em tópicos curtos o que foi decidido ou alterado, o motivo quando conhecido e decisões substituídas. Diferencie decisão aprovada de implementação concluída.'],
  'business_rules.md': ['Regras de negócio', 'Condições, restrições, cálculos e comportamentos vigentes, agrupados por área do domínio; exemplos quando úteis.'],
  'security.md': ['Segurança', 'Autenticação, autorização, API keys e mecanismos de acesso adotados. Referencie credenciais sem registrar valores. Escolhas futuras podem permanecer pendentes.'],
};

const templates = [
  [commonCodexPath, `# Regras gerais do workspace\n\n${livingGuidance}\n`],
  [commonCursorPath, `---\ndescription: Regras gerais compartilhadas pelo workspace\nalwaysApply: true\n---\n\n${livingGuidance}\n`],
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

function projectTemplates(repoPath, tool) {
  const name = path.posix.basename(repoPath);
  const base = projectDir(repoPath);
  return [
    [path.join(base, 'codex', 'project.md'), `# Orientações específicas: ${name}\n\nDescreva aqui o propósito, os limites e as convenções deste repositório.\n`],
    [path.join(base, 'cursor', 'project.mdc'), `---\ndescription: Orientações específicas do repositório ${name}\nalwaysApply: true\n---\n\nDescreva aqui o propósito, os limites e as convenções deste repositório.\n`],
  ].filter(([filePath]) => path.basename(path.dirname(filePath)) === tool);
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
  const base = projectDir(repoPath);
  const marker = path.join(base, '.guidance-initialized');
  await ensureHarnessDirectory(base);
  if (await exists(marker)) return;
  for (const [filename, [title, description]] of Object.entries(documents)) {
    await writeIfMissing(path.join(base, filename), `# ${title}\n\n${description}\n\n## Definições\n\nA preencher com decisões consolidadas e o estado real do projeto.\n\n## Pendências\n\nAinda não avaliado. Indique o que falta definir ou se o assunto não se aplica.\n`);
  }
  await writeIfMissing(marker, 'Templates iniciais criados. Não remover: documentos ausentes não devem ser recriados automaticamente.\n');
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

async function ensureTemplateFiles(tool) {
  for (const [filePath, content] of templates) {
    if (filePath === (tool === 'codex' ? commonCodexPath : commonCursorPath)) await writeIfMissing(filePath, content);
  }
}

async function init() {
  await mkdir(harnessDir, { recursive: true });
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

async function documentGuide(repoPath) {
  const base = projectDir(repoPath);
  const relativeBase = path.relative(repoDir(repoPath), base).split(path.sep).join('/');
  const entries = await readdir(base, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => entry.name).sort();
  const script = path.relative(repoDir(repoPath), path.join(harnessDir, 'scripts', 'harness.mjs')).split(path.sep).join('/');
  return `# Documentação viva do projeto\n\n${livingGuidance}\n\nTodos os caminhos abaixo são relativos à raiz do repositório da aplicação, não ao arquivo de regras nem ao destino do symlink. As fontes ficam em ${JSON.stringify(relativeBase)}.\n\n${names.map((name) => `- ${JSON.stringify(`${relativeBase}/${name}`)}`).join('\n') || 'Nenhum documento temático presente.'}\n\nSincronização a partir da raiz do repositório: node ${JSON.stringify(script)} sync ${JSON.stringify(repoPath)}\n`;
}

async function writeGenerated(output, content) {
  if (await exists(output)) {
    const stat = await lstat(output);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Arquivo de saída inválido; preservado: ${output}`);
    const existing = await readFile(output, 'utf8');
    if (!existing.includes('<!-- Gerado por harness/scripts/harness.mjs;')) throw new Error(`Arquivo de saída não gerado pelo harness; preservado: ${output}`);
    if (existing === content) return;
    const temporaryPath = `${output}.tmp`;
    await writeFile(temporaryPath, content, { flag: 'wx' });
    await rename(temporaryPath, output);
  } else {
    await writeIfMissing(output, content);
  }
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
  await ensureTemplateFiles(tool);
  for (const [filePath, content] of projectTemplates(repoPath, tool)) await writeIfMissing(filePath, content);
  const guide = await documentGuide(repoPath);
  const generatedNotice = '<!-- Gerado por harness/scripts/harness.mjs; edite as fontes em common/ e projects/<path>/. -->';
  if (tool === 'codex') {
    const common = await readFile(commonCodexPath, 'utf8');
    const specific = await readFile(path.join(base, 'codex', 'project.md'), 'utf8');
    const output = path.join(base, 'codex', 'AGENTS.md');
    await writeGenerated(output, `${generatedNotice}\n${common.trim()}\n\n${specific.trim()}\n\n${guide}`);
  }

  if (tool === 'cursor') {
    const cursorRulesDir = path.join(base, '.cursor', 'rules');
    await ensureHarnessDirectory(cursorRulesDir);
    const generalRule = path.join(cursorRulesDir, 'harness-general.mdc');
    const projectRule = path.join(cursorRulesDir, 'harness-project.mdc');
    await ensureFileLink(commonCursorPath, generalRule);
    await ensureFileLink(path.join(base, 'cursor', 'project.mdc'), projectRule);
    await writeGenerated(path.join(cursorRulesDir, 'harness-documents.mdc'), `---\ndescription: Documentação viva do projeto\nalwaysApply: true\n---\n${generatedNotice}\n${guide}`);
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
