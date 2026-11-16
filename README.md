# Harness Pocket Kit

Kit de skills e orientações para iniciar e desenvolver sistemas pessoais ou de pequenos grupos com apoio de agentes de IA. As skills de bootstrap incluem `angular-frontend-bootstrap`, `nestjs-backend-bootstrap` e `spring-java-bootstrap`. `harness-feature-planning` apoia o planejamento de features; `orchestrate` e `orchestrate-6` orientam trabalhos com subagentes.

## Instalação versionada

Use uma única raiz Git para o sistema inteiro. Na raiz desse repositório, instale a versão mais recente:

```sh
npx harness-pocket-kit@latest install
```

Também é possível fixar uma versão, por exemplo `npx harness-pocket-kit@1.0.0 install`. O comando instala apenas os arquivos oficiais em `harness/`, registra a versão e os hashes em `harness/.harness-kit/installed.json`, cria `inventory.json` e prepara pontos de entrada mínimos para Codex (`AGENTS.md`), Claude (`CLAUDE.md`) e Cursor (`.cursor/rules/harness.mdc`). Arquivos locais existentes são preservados; quando um ponto de entrada personalizado não encaminha para `harness/`, integre a instrução manualmente.

Instalações feitas por cópia antes da versão 1.0.0 podem ser adotadas uma única vez:

```sh
npx harness-pocket-kit@1.0.0 adopt
```

O fluxo interrompe sem escrever quando um arquivo que passará a ser oficial não puder ser classificado com segurança.

## Atualizações

Consulte a diferença sem modificar o workspace:

```sh
npx harness-pocket-kit@latest status
npx harness-pocket-kit@latest update --dry-run
```

Depois de revisar o [changelog](CHANGELOG.md), atualize com `npx harness-pocket-kit@latest update`. Uma mudança de major é bloqueada por padrão e exige `--allow-major`; para escolher uma versão específica, troque `latest` pelo SemVer desejado.

Antes de atualizar, a CLI compara cada arquivo oficial com o hash instalado. Se algum tiver sido editado ou removido, nenhuma escrita é feita e os conflitos são listados. Mova customizações para `harness/common/`, para os documentos em `harness/projects/` ou para uma skill local com nome próprio; depois restaure o arquivo oficial e repita. Falhas durante aplicação, migração ou validação restauram os arquivos afetados.

## Monorepo com Harness compartilhado

A orientação oficial atualizável fica em `harness/base/guidance.md`. Decisões do workspace pertencem a `harness/common/`; documentos de componentes pertencem a `harness/projects/`. Skills não enumeradas pelo manifesto também são locais e permanecem intactas.

Registre explicitamente cada componente de código, sem presumir nomes ou profundidade:

```sh
node harness/scripts/harness.mjs add apps/web
node harness/scripts/harness.mjs add services/api
```

O inventário guarda caminhos relativos em `projects`. Todos os componentes, a pasta `harness/` e os pontos de entrada pertencem ao mesmo repositório Git. `add` também cria um `AGENTS.md` pequeno dentro do componente, apontando pelos caminhos relativos corretos para suas orientações centrais e específicas. Não são criados symlinks e o script não procura repositórios internos.

Peça ao agente: **“Configure o harness para este workspace.”** O agente consulta a base, o inventário e os componentes relevantes e mantém as orientações locais diretamente em `harness/common/` e `harness/projects/<caminho>/`.

## Orientações vivas por componente

Cada componente começa com `architecture.md`, `api_conventions.md`, `persistence.md`, `configuration.md`, `tests.md`, `api_docs.md`, `decisions.md`, `business_rules.md` e `security.md`. O script cria templates mínimos; a IA preenche o conteúdo com base no código existente e nas decisões adotadas.

As orientações específicas prevalecem sobre as gerais. O agente deve carregar somente os documentos pertinentes aos componentes afetados, preservar conteúdo manual válido e distinguir decisões, implementação existente e pendências. O YAML de bootstrap permanece como plano inicial; os Markdown acompanham a evolução.

O marcador `.guidance-initialized` evita recriar documentos removidos. Adições, renomeações e remoções passam a valer diretamente, sem sincronização. Para validar inventário, componentes, fontes e pontos de entrada, execute:

```sh
node harness/scripts/harness.mjs check
```

Inventários da versão 1 são migrados por `init` para `version: 2`; fontes e links legados são preservados para revisão manual.

Consulte [a especificação funcional](docs/specs/workspace-harness/spec.md) e [a especificação técnica](docs/specs/workspace-harness/spec-tecnica.md).

Verificação completa: `npm test`. Os testes usam monorepos temporários, não acessam a rede e não exigem dependências de runtime.

## Licença

Distribuído sob a [licença MIT](LICENSE).
