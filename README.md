# Harness Pocket Kit

Kit de skills para manter orientações de agentes e apoiar o início e o desenvolvimento de projetos pessoais ou de pequenos grupos. As skills atuais incluem `nestjs-backend-bootstrap` e `spring-java-bootstrap`.

## Workspace com vários repositórios

Copie a estrutura deste kit para `workspace/harness` e inicialize o inventário com Node.js:

```sh
node harness/scripts/harness.mjs init
```

Na primeira execução, ele registra os repositórios Git nas pastas diretamente sob o workspace. Para incluir um projeto aninhado ou ainda sem Git, use `node harness/scripts/harness.mjs add <caminho-relativo>`. Depois peça ao agente: **“Configure o harness para este workspace.”** Ele cria ou atualiza orientações em `harness/` e liga cada repositório à ferramenta escolhida e às skills por symlink. Remover um projeto do inventário não apaga seus links.

Consulte [a especificação do workspace](docs/specs/workspace-harness/spec.md) e [AGENTS.md](AGENTS.md) para detalhes.

## Orientações vivas por projeto

Cada `harness/projects/<caminho>/` começa com `architecture.md`, `api_conventions.md`, `persistence.md`, `configuration.md`, `tests.md`, `api_docs.md`, `decisions.md`, `business_rules.md` e `security.md`. O script cria templates mínimos; a IA preenche o conteúdo com base no código existente ou nas decisões e etapas consolidadas do bootstrap. Persistência e segurança podem continuar pendentes enquanto outras partes avançam. Swagger é o padrão para novas APIs compatíveis, respeitando alternativas escolhidas e ferramentas existentes.

Somente a ferramenta selecionada recebe novos arquivos de orientação. Os documentos temáticos são compartilhados entre ferramentas e referenciados pelo ponto de entrada de Codex ou Cursor. No trabalho cotidiano, a IA deve consultar e atualizar os documentos afetados pelas decisões e mudanças, preservando conteúdo manual válido. O YAML do bootstrap permanece como plano inicial; os Markdown acompanham a evolução.

A lista inicial pode mudar. Após adicionar, renomear ou remover documentos diretamente na pasta do projeto, execute `node harness/scripts/harness.mjs sync <caminho>` da raiz do workspace. Edições apenas no conteúdo são lidas diretamente. O marcador `.guidance-initialized` evita recriar documentos removidos; preserve-o. Fontes existentes e destinos ocupados são preservados, inclusive durante a atualização de um Harness anterior.

Verificação específica do inicializador: `node --test scripts/harness.test.mjs`. Os testes usam workspaces temporários e não exigem dependências.

## Licença

Distribuído sob a [licença MIT](LICENSE).
