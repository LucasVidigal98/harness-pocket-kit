#!/usr/bin/env node
import { lstat, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const harnessDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const monorepoDir = path.dirname(harnessDir);
const inventoryPath = path.join(harnessDir, 'inventory.json');
const baseGuidancePath = path.join(harnessDir, 'base', 'guidance.md');
const commonGuidancePath = path.join(harnessDir, 'common', 'guidance.md');

const localGuidance = `Registre aqui somente convenções e decisões compartilhadas específicas deste workspace.
As orientações locais complementam \`harness/base/guidance.md\` e prevalecem sobre a base quando houver conflito explícito.`;

const documents = {
  'architecture.md': ['Arquitetura', 'Organização, camadas, responsabilidades, limites e direção das dependências adotadas.'],
  'api_conventions.md': ['Convenções da API', 'Rotas, verbos e status HTTP, DTOs, validação, requisições, respostas e erros; paginação e versionamento quando aplicáveis.'],
  'persistence.md': ['Persistência', 'Armazenamento SQL, NoSQL, arquivos ou outras soluções; acesso, repositórios, mapeamentos, transações e migrations (ferramenta, nomes, versões e controle de execução).'],
  'configuration.md': ['Configuração', 'Inventário e localização de YAML, properties, .env, perfis, data sources e integrações; variáveis obrigatórias, padrões e precedência. Referencie a origem de secrets, nunca seus valores.'],
  'tests.md': ['Testes unitários', 'Ferramentas, organização, execução, mocks/fakes/stubs e cobertura. Testes unitários devem verificar comportamentos sem banco, rede ou infraestrutura externa. Metas de cobertura somente quando definidas.'],
  'api_docs.md': ['Documentação da API', 'Biblioteca, configuração, geração, acesso e convenções para endpoints, DTOs, respostas e erros. Swagger é o padrão para novas APIs compatíveis; preserve a solução existente ou a alternativa escolhida pelo usuário.'],
  'decisions.md': ['Decisões do projeto', 'Registre em tópicos curtos o que foi decidido ou alterado, o motivo quando conhecido e decisões substituídas. Diferencie decisão aprovada de implementação concluída.'],
  'business_rules.md': ['Regras de negócio', 'Condições, restrições, cálculos e comportamentos vigentes, agrupados por área do domínio com exemplos quando úteis.'],
  'security.md': ['Segurança', 'Autenticação, autorização, API keys e mecanismos de acesso adotados. Referencie credenciais sem registrar valores. Escolhas futuras podem permanecer pendentes.'],
};

const entryPointBody = `# Harness

Este monorepo usa orientações centralizadas em \`harness/\`.

Antes de trabalhar:

1. Leia \`harness/inventory.json\` e identifique os componentes afetados pela tarefa.
2. Leia \`harness/base/guidance.md\` e \`harness/common/guidance.md\`.
3. Leia os documentos pertinentes em \`harness/projects/<caminho-do-componente>/\` para cada componente afetado.
4. Quando uma skill em \`harness/.agents/skills/\` corresponder à tarefa, leia o respectivo \`SKILL.md\` e siga suas instruções.

As orientações específicas prevalecem sobre as gerais. Mantenha a documentação viva conforme decisões e implementação mudarem.
`;

const entryPoints = [
  [path.join(monorepoDir, 'AGENTS.md'), entryPointBody],
  [path.join(monorepoDir, 'CLAUDE.md'), entryPointBody],
  [path.join(monorepoDir, '.cursor', 'rules', 'harness.mdc'), `---\ndescription: Encaminha o agente para as orientações centrais do Harness\nalwaysApply: true\n---\n\n${entryPointBody}`],
];

function usage() {
  console.log(`Uso:\n  node harness/scripts/harness.mjs init\n  node harness/scripts/harness.mjs add <caminho-relativo>\n  node harness/scripts/harness.mjs check [caminho-relativo]`);
}

function relativeProjectPath(value) {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  const parts = normalized.split('/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:/i.test(normalized) || parts.some((part) => !part || part === '.' || part === '..') || parts[0] === 'harness' || parts[0] === '.git') {
    throw new Error(`Caminho de componente inválido: ${value}`);
  }
  return normalized;
}

function projectGuidanceDir(projectPath) {
  return path.join(harnessDir, 'projects', ...projectPath.split('/'));
}

function projectCodeDir(projectPath) {
  return path.join(monorepoDir, ...projectPath.split('/'));
}

function componentEntryPoint(projectPath) {
  const componentDir = projectCodeDir(projectPath);
  const relativeHarness = path.relative(componentDir, harnessDir).split(path.sep).join('/');
  return `# Harness

Este componente pertence ao monorepo e usa as orientações centralizadas em \`${relativeHarness}/\`.

Antes de trabalhar:

1. Leia \`${relativeHarness}/inventory.json\`, \`${relativeHarness}/base/guidance.md\` e \`${relativeHarness}/common/guidance.md\`.
2. Leia os documentos pertinentes em \`${relativeHarness}/projects/${projectPath}/\`.
3. Quando uma skill em \`${relativeHarness}/.agents/skills/\` corresponder à tarefa, leia seu \`SKILL.md\` e siga suas instruções.

As orientações específicas deste componente prevalecem sobre as gerais. Atualize a documentação viva quando decisões ou implementação mudarem.
`;
}

async function statOrNull(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function exists(filePath) {
  return Boolean(await statOrNull(filePath));
}

async function ensureRealDirectory(root, directory, label) {
  const relative = path.relative(root, directory);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Caminho fora de ${label}: ${directory}`);
  }
  const rootStat = await statOrNull(root);
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`${label} precisa ser um diretório real: ${root}`);
  }
  let current = root;
  for (const part of relative ? relative.split(path.sep) : []) {
    current = path.join(current, part);
    const stat = await statOrNull(current);
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
      throw new Error(`Diretório não pode ser link nem arquivo: ${current}`);
    }
    if (!stat) await mkdir(current);
  }
}

async function writeHarnessFileIfMissing(filePath, content) {
  if (await exists(filePath)) return false;
  await ensureRealDirectory(harnessDir, path.dirname(filePath), 'harness');
  await writeFile(filePath, content, { flag: 'wx' });
  return true;
}

function legacyEntryPointContent(content) {
  return content
    .replace(/Leia (`[^`]*base\/guidance\.md`) e (`[^`]*common\/guidance\.md`)/, 'Leia $2')
    .replace(/(`[^`]*inventory\.json`), (`[^`]*base\/guidance\.md`) e (`[^`]*common\/guidance\.md`)/, '$1 e $3');
}

async function writeEntryPointIfMissing(filePath, content) {
  if (await exists(filePath)) {
    const stat = await lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      console.warn(`Atenção: ponto de entrada ocupado e preservado: ${filePath}`);
      return false;
    }
    const current = await readFile(filePath, 'utf8');
    if (current === legacyEntryPointContent(content)) {
      await writeFile(filePath, content);
      console.log(`Ponto de entrada oficial atualizado: ${filePath}`);
      return true;
    }
    if (!current.includes('harness/') || !current.includes('base/guidance.md')) {
      console.warn(`Atenção: integre manualmente as instruções do Harness no arquivo existente: ${filePath}`);
    }
    return false;
  }
  await ensureRealDirectory(monorepoDir, path.dirname(filePath), 'monorepo');
  await writeFile(filePath, content, { flag: 'wx' });
  return true;
}

async function assertMonorepoRoot() {
  if (path.basename(harnessDir) !== 'harness') {
    throw new Error('Copie este kit para a pasta harness na raiz do monorepo antes de executar o inicializador.');
  }
  const gitEntry = await statOrNull(path.join(monorepoDir, '.git'));
  if (!gitEntry || gitEntry.isSymbolicLink() || (!gitEntry.isDirectory() && !gitEntry.isFile())) {
    throw new Error('A pasta que contém harness precisa ser a raiz de um único repositório Git.');
  }
}

function validateProjects(projects) {
  if (!Array.isArray(projects)) throw new Error('Inventário inválido: projects precisa ser uma lista.');
  const seen = new Set();
  for (const project of projects) {
    if (!project || typeof project.path !== 'string' || relativeProjectPath(project.path) !== project.path) {
      throw new Error('Inventário inválido: cada componente precisa de um path relativo válido.');
    }
    if (seen.has(project.path)) throw new Error(`Inventário contém caminho duplicado: ${project.path}`);
    seen.add(project.path);
  }
}

async function loadInventory() {
  let inventory;
  try {
    const info = await lstat(inventoryPath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('O inventário precisa ser um arquivo regular, não um link.');
    inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { inventory: { version: 2, projects: [] }, existed: false, migrated: false };
    throw new Error(`Não foi possível ler ${inventoryPath}: ${error.message}`);
  }
  if (inventory?.version === 1 && Array.isArray(inventory.repositories)) {
    const projects = inventory.repositories.map((repository) => ({ path: relativeProjectPath(repository.path) }));
    validateProjects(projects);
    return { inventory: { version: 2, projects }, existed: true, migrated: true };
  }
  if (inventory?.version !== 2) {
    throw new Error('Inventário inválido. Esperado { "version": 2, "projects": [...] }.');
  }
  validateProjects(inventory.projects);
  return { inventory, existed: true, migrated: false };
}

async function saveInventory(inventory) {
  await ensureRealDirectory(harnessDir, harnessDir, 'harness');
  const temporaryPath = `${inventoryPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(inventory, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryPath, inventoryPath);
}

async function assertSafeProject(projectPath) {
  let current = monorepoDir;
  for (const part of projectPath.split('/')) {
    current = path.join(current, part);
    const stat = await statOrNull(current);
    if (!stat) throw new Error(`Caminho do componente não existe: ${projectPath}`);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`O caminho do componente precisa usar diretórios reais dentro do monorepo: ${projectPath}`);
    }
  }
}

async function scaffoldProject(projectPath) {
  const base = projectGuidanceDir(projectPath);
  const marker = path.join(base, '.guidance-initialized');
  await ensureRealDirectory(harnessDir, base, 'harness');
  if (await exists(marker)) return;
  for (const [filename, [title, description]] of Object.entries(documents)) {
    await writeHarnessFileIfMissing(path.join(base, filename), `# ${title}\n\n${description}\n\n## Definições\n\nA preencher com decisões consolidadas e o estado real deste componente.\n\n## Pendências\n\nAinda não avaliado. Indique o que falta definir ou se o assunto não se aplica.\n`);
  }
  await writeHarnessFileIfMissing(marker, 'Templates iniciais criados. Não remover: documentos ausentes não devem ser recriados automaticamente.\n');
}

async function ensureComponentEntryPoint(projectPath) {
  await assertSafeProject(projectPath);
  return writeEntryPointIfMissing(path.join(projectCodeDir(projectPath), 'AGENTS.md'), componentEntryPoint(projectPath));
}

async function ensureSharedSources() {
  if (!(await exists(baseGuidancePath))) {
    throw new Error(`Orientação-base oficial ausente: ${baseGuidancePath}. Reinstale os arquivos gerenciados do Harness.`);
  }
  await writeHarnessFileIfMissing(commonGuidancePath, `# Orientações locais do workspace\n\n${localGuidance}\n`);
  for (const [filePath, content] of entryPoints) await writeEntryPointIfMissing(filePath, content);
}

async function init() {
  const { inventory, existed, migrated } = await loadInventory();
  await ensureSharedSources();
  for (const project of inventory.projects) {
    await scaffoldProject(project.path);
    try {
      await ensureComponentEntryPoint(project.path);
    } catch (error) {
      console.warn(`Atenção: não foi possível preparar ${project.path}/AGENTS.md: ${error.message}`);
    }
  }
  if (!existed || migrated) await saveInventory(inventory);
  if (!existed) console.log('Inventário criado sem componentes. Use "add <caminho-relativo>" para registrá-los.');
  else if (migrated) console.log('Inventário migrado da versão 1 para a versão 2. Ferramentas agora são configuradas na raiz do monorepo.');
  else console.log('Inventário existente preservado.');
  console.log(`Inventário: ${inventoryPath}`);
}

async function add(inputPath) {
  const projectPath = relativeProjectPath(inputPath);
  await assertSafeProject(projectPath);
  const { inventory, migrated } = await loadInventory();
  let project = inventory.projects.find((item) => item.path === projectPath);
  if (!project) {
    project = { path: projectPath };
    inventory.projects.push(project);
  }
  await ensureSharedSources();
  await scaffoldProject(projectPath);
  await ensureComponentEntryPoint(projectPath);
  await saveInventory(inventory);
  if (migrated) console.log('Inventário migrado para a versão 2.');
  console.log(`Componente registrado: ${project.path}`);
}

async function checkEntryPoint(filePath) {
  const stat = await statOrNull(filePath);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) return `Ponto de entrada ausente ou inválido: ${filePath}`;
  const content = await readFile(filePath, 'utf8');
  if (!content.includes('harness/')) return `Ponto de entrada não encaminha para harness/: ${filePath}`;
  if (!content.includes('base/guidance.md')) return `Ponto de entrada não encaminha para a orientação-base: ${filePath}`;
  return null;
}

async function check(inputPath) {
  const { inventory, migrated } = await loadInventory();
  if (migrated) throw new Error('Execute "init" para migrar o inventário para a versão 2 antes da validação.');
  const selected = inputPath ? [relativeProjectPath(inputPath)] : inventory.projects.map((project) => project.path);
  const failures = [];
  if (!(await exists(baseGuidancePath))) failures.push(`Orientação-base oficial ausente: ${baseGuidancePath}`);
  if (!(await exists(commonGuidancePath))) failures.push(`Orientação geral ausente: ${commonGuidancePath}`);
  for (const [filePath] of entryPoints) {
    const failure = await checkEntryPoint(filePath);
    if (failure) failures.push(failure);
  }
  for (const projectPath of selected) {
    if (!inventory.projects.some((project) => project.path === projectPath)) {
      failures.push(`Componente não encontrado no inventário: ${projectPath}`);
      continue;
    }
    try {
      await assertSafeProject(projectPath);
      const entryPointFailure = await checkEntryPoint(path.join(projectCodeDir(projectPath), 'AGENTS.md'));
      if (entryPointFailure) failures.push(entryPointFailure);
      const entries = await readdir(projectGuidanceDir(projectPath), { withFileTypes: true });
      if (!entries.some((entry) => entry.isFile() && entry.name.endsWith('.md'))) {
        failures.push(`Nenhum documento temático encontrado para: ${projectPath}`);
      }
    } catch (error) {
      failures.push(`${projectPath}: ${error.message}`);
    }
  }
  if (failures.length) throw new Error(`Validação encontrou problemas:\n${failures.join('\n')}`);
  console.log(`Harness válido para ${selected.length} componente(s).`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') return usage();
  await assertMonorepoRoot();
  if (command === 'init' && args.length === 0) return init();
  if (command === 'add' && args.length === 1) return add(args[0]);
  if (command === 'check' && args.length <= 1) return check(args[0]);
  usage();
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
