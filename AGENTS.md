# Repository Guidelines

## Propósito

O Harness Pocket Kit reúne skills reutilizáveis para iniciar e desenvolver projetos pessoais ou de pequenos grupos com rapidez. Priorize uma implementação simples, verificável e capaz de crescer quando houver necessidade real. Evite processos corporativos, especificações extensas e abstrações antecipadas. Registre decisões que afetam o uso ou a manutenção do projeto, sem transformar cada mudança em uma cerimônia.

## Estrutura do repositório

Cada skill deve ocupar `.agents/skills/<nome-da-skill>/SKILL.md`. Use nomes curtos em `kebab-case`. O `SKILL.md` precisa de `name` e `description` no frontmatter; a descrição deve dizer claramente quando usar a skill. Coloque `scripts/`, `references/` ou `assets/` dentro da própria skill somente quando necessários. O `README.md` explica o propósito do kit e como ele é consumido. Não há aplicação ou build global neste repositório.

## Uso em outros projetos

Copie a estrutura base para `harness/` na raiz de um monorepo e execute `node harness/scripts/harness.mjs init`. A raiz, os componentes de código e `harness/` pertencem ao mesmo repositório Git. O inventário v2 mantém caminhos relativos em `projects`; registre componentes com `add <path>`, sem presumir nomes ou quantidade fixa.

Codex, Cursor e Claude recebem pontos de entrada mínimos na raiz e consultam diretamente `harness/common/`, `harness/projects/<path>/` e `harness/.agents/skills/`. Cada componente também mantém um `AGENTS.md` mínimo para preservar o contexto quando Codex é aberto dentro dele. Não crie symlinks nem distribua cópias das orientações. Preserve pontos de entrada existentes e peça integração manual quando eles não encaminharem para o Harness.

O comando esperado é “Configure o harness para este workspace”. O agente pode criar e editar orientações e usar skills de bootstrap para componentes novos. O inicializador Node.js não tem dependências e funciona em Windows e Linux. Consulte `docs/specs/workspace-harness/` para o contrato.

## Desenvolvimento de skills

As orientações do Harness são documentação viva: conforme tarefas adotam decisões ou alteram o projeto, atualize os documentos pertinentes, preservando conteúdo manual válido. Distinga decisões aprovadas, implementação existente e pendências. Mantenha o estado vigente nos documentos temáticos e o histórico resumido em `decisions.md`. O bootstrap serve à criação inicial; a manutenção continua durante o desenvolvimento.

Mantenha cada skill focada em uma tarefa e descreva entradas, passos e resultado esperado. Prefira instruções a scripts quando a execução não exigir automação determinística. Inclua exemplos e uma checagem pequena quando houver comportamento não trivial. Antes de concluir, revise o gatilho da `description` e teste a skill com uma solicitação representativa. Não adicione dependências, ferramentas ou etapas de aprovação sem necessidade concreta.

## Comandos e contribuições

Não há comandos de instalação ou lint para todo o kit. A validação do inicializador é `node --test scripts/harness.test.mjs`. Documente comandos específicos dentro da skill que os exigir. Use commits com assunto curto e imperativo. Em uma proposta de mudança, explique o problema, a skill alterada e como você a verificou.
