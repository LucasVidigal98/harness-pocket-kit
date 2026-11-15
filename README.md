# Harness Pocket Kit

Kit de skills e orientações para iniciar e desenvolver sistemas pessoais ou de pequenos grupos com apoio de agentes de IA. As skills de bootstrap incluem `angular-frontend-bootstrap`, `nestjs-backend-bootstrap` e `spring-java-bootstrap`. `harness-feature-planning` apoia o planejamento de features; `orchestrate` e `orchestrate-6` orientam trabalhos com subagentes.

## Monorepo com Harness compartilhado

Use uma única raiz Git para o sistema inteiro. Copie este kit para a pasta `harness/` nessa raiz e execute:

```sh
node harness/scripts/harness.mjs init
```

O comando cria `harness/inventory.json`, a orientação geral e pontos de entrada mínimos para Codex (`AGENTS.md`), Claude (`CLAUDE.md`) e Cursor (`.cursor/rules/harness.mdc`). Arquivos existentes são preservados; quando não encaminham para `harness/`, integre a instrução manualmente.

Registre explicitamente cada componente de código, sem presumir nomes ou profundidade:

```sh
node harness/scripts/harness.mjs add apps/web
node harness/scripts/harness.mjs add services/api
```

O inventário guarda caminhos relativos em `projects`. Todos os componentes, a pasta `harness/` e os pontos de entrada pertencem ao mesmo repositório Git. `add` também cria um `AGENTS.md` pequeno dentro do componente, apontando pelos caminhos relativos corretos para suas orientações centrais e específicas. Não são criados symlinks e o script não procura repositórios internos.

Peça ao agente: **“Configure o harness para este workspace.”** O agente consulta o inventário, inspeciona os componentes relevantes e mantém as orientações diretamente em `harness/common/` e `harness/projects/<caminho>/`.

## Orientações vivas por componente

Cada componente começa com `architecture.md`, `api_conventions.md`, `persistence.md`, `configuration.md`, `tests.md`, `api_docs.md`, `decisions.md`, `business_rules.md` e `security.md`. O script cria templates mínimos; a IA preenche o conteúdo com base no código existente e nas decisões adotadas.

As orientações específicas prevalecem sobre as gerais. O agente deve carregar somente os documentos pertinentes aos componentes afetados, preservar conteúdo manual válido e distinguir decisões, implementação existente e pendências. O YAML de bootstrap permanece como plano inicial; os Markdown acompanham a evolução.

O marcador `.guidance-initialized` evita recriar documentos removidos. Adições, renomeações e remoções passam a valer diretamente, sem sincronização. Para validar inventário, componentes, fontes e pontos de entrada, execute:

```sh
node harness/scripts/harness.mjs check
```

Inventários da versão 1 são migrados por `init` para `version: 2`; fontes e links legados são preservados para revisão manual.

Consulte [a especificação funcional](docs/specs/workspace-harness/spec.md) e [a especificação técnica](docs/specs/workspace-harness/spec-tecnica.md).

Verificação do inicializador: `node --test scripts/harness.test.mjs`. Os testes usam monorepos temporários e não exigem dependências.

## Licença

Distribuído sob a [licença MIT](LICENSE).
