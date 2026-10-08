# Repository Guidelines

## Propósito

O Harness Pocket Kit reúne skills reutilizáveis para iniciar e desenvolver projetos pessoais ou de pequenos grupos com rapidez. Priorize uma implementação simples, verificável e capaz de crescer quando houver necessidade real. Evite processos corporativos, especificações extensas e abstrações antecipadas. Registre decisões que afetam o uso ou a manutenção do projeto, sem transformar cada mudança em uma cerimônia.

## Estrutura do repositório

Cada skill deve ocupar `.agents/skills/<nome-da-skill>/SKILL.md`. Use nomes curtos em `kebab-case`. O `SKILL.md` precisa de `name` e `description` no frontmatter; a descrição deve dizer claramente quando usar a skill. Coloque `scripts/`, `references/` ou `assets/` dentro da própria skill somente quando necessários. O `README.md` explica o propósito do kit e como ele é consumido. Não há aplicação, build ou testes globais neste repositório.

## Uso em outros projetos

Copie a estrutura base para uma pasta `harness` na raiz de um workspace com vários repositórios e execute `node harness/scripts/harness.mjs init`. O harness mantém `inventory.json` com caminhos relativos, skills, orientações gerais por ferramenta e orientações específicas por repositório. Cada repositório recebe links simbólicos para as skills e orientações mantidas sob `harness`. Os nomes dos repositórios são livres. Se a ferramenta não puder ser identificada, o agente pergunta ao usuário. Remover um repositório do inventário não apaga seus arquivos nem links.

O comando esperado é “Configure o harness para este workspace”. O agente pode criar e editar orientações e usar skills de bootstrap para projetos novos. O inicializador Node.js não tem dependências e funciona em Windows e Linux, desde que o sistema permita criar symlinks. Consulte `docs/specs/workspace-harness/` para o contrato e os destinos suportados.

## Desenvolvimento de skills

Mantenha cada skill focada em uma tarefa e descreva entradas, passos e resultado esperado. Prefira instruções a scripts quando a execução não exigir automação determinística. Inclua exemplos e uma checagem pequena quando houver comportamento não trivial. Antes de concluir, revise o gatilho da `description` e teste a skill com uma solicitação representativa. Não adicione dependências, ferramentas ou etapas de aprovação sem necessidade concreta.

## Comandos e contribuições

Ainda não há comandos de instalação, lint ou teste para todo o kit. Documente comandos específicos dentro da skill que os exigir. Como o repositório ainda não tem histórico Git, use commits com assunto curto e imperativo. Em uma proposta de mudança, explique o problema, a skill alterada e como você a verificou.
