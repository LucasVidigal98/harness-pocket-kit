# Harness para monorepo

## Problema

Um sistema pode reunir frontend, backend, infraestrutura e outros componentes sob o mesmo Git. Agentes de IA precisam compartilhar orientações sem duplicá-las em cada diretório e sem depender de links simbólicos.

## Objetivo

Manter skills e orientações gerais e específicas em uma única pasta `harness/`, consultada diretamente por Codex, Cursor e Claude a partir da raiz do monorepo.

## Fluxo esperado

1. A pessoa cria ou usa um único repositório Git e copia o kit para `<raiz>/harness`.
2. Executa `node harness/scripts/harness.mjs init` na raiz. O comando cria o inventário, a orientação geral e pontos de entrada ausentes para as ferramentas suportadas.
3. Registra somente os componentes de código desejados com `add <caminho-relativo>`. O comando cria os templates e um `AGENTS.md` mínimo no componente. Não há descoberta por nome, posição ou presença de `.git`.
4. O agente lê o inventário, identifica os componentes afetados e consulta a orientação geral e os documentos específicos correspondentes.
5. O agente mantém esses documentos conforme decisões são adotadas e a implementação muda.
6. `check [path]` valida inventário, caminhos, documentos e encaminhamento dos pontos de entrada.

## Critérios de aceite

- A pasta que contém `harness/` é a raiz de um único repositório Git.
- O inventário v2 identifica componentes por caminhos relativos livres e não guarda uma ferramenta por componente.
- Codex, Cursor e Claude encontram o Harness por pequenos arquivos de entrada na raiz.
- Cada componente registrado possui um `AGENTS.md` regular, sem symlink, que usa o caminho relativo correto até `harness/`.
- Orientações e skills permanecem sob `harness/` e são lidas diretamente, sem cópias ou symlinks.
- Pontos de entrada existentes não são substituídos; conflitos são informados para integração manual.
- Componentes aninhados e ainda vazios podem ser registrados explicitamente.
- Caminhos que escapam da raiz, entram em `harness/` ou atravessam symlinks são rejeitados.
- Alterar a lista ou o conteúdo dos documentos não exige sincronização.
- A migração do inventário v1 preserva fontes e links legados; a limpeza permanece manual.
- O inicializador usa Node.js sem dependências e funciona em Windows e Linux.

## Documentação viva

Cada componente começa com nove templates mínimos: `architecture.md`, `api_conventions.md`, `persistence.md`, `configuration.md`, `tests.md`, `api_docs.md`, `decisions.md`, `business_rules.md` e `security.md`.

O agente preenche projetos existentes a partir de evidências. Pastas vazias mantêm templates e decisões já conhecidas. Documentos podem ser adicionados, renomeados ou removidos. As orientações específicas prevalecem sobre as gerais; regras de um componente não devem vazar para outro.

## Fora de escopo

- Criar ou administrar repositórios Git separados dentro do monorepo.
- Criar, atualizar ou remover symlinks.
- Descobrir automaticamente quais diretórios representam componentes.
- Apagar fontes ou links do modelo anterior durante a migração.
- Duplicar integralmente a documentação do Harness nos pontos de entrada das ferramentas.
