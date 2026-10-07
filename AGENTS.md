# Repository Guidelines

## Propósito

O Harness Pocket Kit reúne skills reutilizáveis para iniciar e desenvolver projetos pessoais ou de pequenos grupos com rapidez. Priorize uma implementação simples, verificável e capaz de crescer quando houver necessidade real. Evite processos corporativos, especificações extensas e abstrações antecipadas. Registre decisões que afetam o uso ou a manutenção do projeto, sem transformar cada mudança em uma cerimônia.

## Estrutura do repositório

Cada skill deve ocupar `.agents/skills/<nome-da-skill>/SKILL.md`. Use nomes curtos em `kebab-case`. O `SKILL.md` precisa de `name` e `description` no frontmatter; a descrição deve dizer claramente quando usar a skill. Coloque `scripts/`, `references/` ou `assets/` dentro da própria skill somente quando necessários. O `README.md` explica o propósito do kit e como ele é consumido. Não há aplicação, build ou testes globais neste repositório.

## Uso em outros projetos

Quando o usuário pedir para configurar um projeto com este kit, localize este repositório e crie, no projeto de destino, `.agents/skills/<nome-da-skill>` como link simbólico para cada pasta de skill daqui. Preserve skills já existentes no destino: não substitua arquivos ou links sem orientação do usuário. Verifique que cada link resolve para um `SKILL.md` e informe quais skills ficaram disponíveis. Links refletem alterações feitas aqui; se o kit mudar de lugar ou não estiver presente na máquina, será preciso recriá-los. Não copie as skills como configuração padrão.

## Desenvolvimento de skills

Mantenha cada skill focada em uma tarefa e descreva entradas, passos e resultado esperado. Prefira instruções a scripts quando a execução não exigir automação determinística. Inclua exemplos e uma checagem pequena quando houver comportamento não trivial. Antes de concluir, revise o gatilho da `description` e teste a skill com uma solicitação representativa. Não adicione dependências, ferramentas ou etapas de aprovação sem necessidade concreta.

## Comandos e contribuições

Ainda não há comandos de instalação, lint ou teste para todo o kit. Documente comandos específicos dentro da skill que os exigir. Como o repositório ainda não tem histórico Git, use commits com assunto curto e imperativo. Em uma proposta de mudança, explique o problema, a skill alterada e como você a verificou.
