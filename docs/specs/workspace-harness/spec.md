# Harness para workspace

## Problema

As orientações do agente precisam acompanhar vários repositórios de código sem serem copiadas para dentro de cada um. O Harness Pocket Kit deve manter essas orientações em um só lugar no workspace e expô-las aos repositórios por links simbólicos.

## Objetivo

Permitir configurar e manter as orientações de agente de todos os repositórios de um workspace a partir de uma pasta `harness` compartilhada.

## Fluxo esperado

1. Ao iniciar um workspace, a pessoa copia para `workspace/harness` a estrutura base do Harness Pocket Kit.
2. A pessoa executa `node harness/scripts/harness.mjs init`. Na primeira execução, o inicializador registra no inventário os repositórios Git que são filhos diretos do workspace. Repositórios aninhados ou sem Git podem ser registrados com `add <caminho-relativo>`.
3. O inventário guarda caminhos relativos à raiz do workspace. O nome de cada diretório identifica o projeto; não há categorias obrigatórias como backend ou frontend. Em execuções seguintes, o inventário existente é preservado e novos repositórios são adicionados explicitamente.
4. O agente identifica a ferramenta de agente usada em cada repositório. Se não conseguir, pergunta qual ferramenta configurar.
5. O agente cria ou atualiza as orientações gerais e específicas do repositório, sincroniza os arquivos derivados e cria links simbólicos de filesystem para disponibilizá-las no repositório. Destinos ocupados são preservados e reportados.
6. Quando um repositório novo for iniciado ou adicionado, o agente pode usar uma skill de bootstrap para preparar ou revisar suas orientações.

## Critérios de aceite

- A estrutura base pode ser copiada para um workspace e configurada sem exigir que os repositórios contenham o código do harness.
- O inventário identifica repositórios por seus caminhos relativos; seus nomes podem ser quaisquer nomes de diretório válidos.
- Cada repositório configurado recebe por links simbólicos as orientações gerais da ferramenta escolhida, as orientações específicas daquele repositório e as skills do Harness. Codex usa `AGENTS.md`; Cursor usa `.cursor/rules/`.
- Uma atualização nas orientações compartilhadas fica disponível nos repositórios ligados sem cópia manual.
- A configuração pergunta a ferramenta ao usuário quando não consegue identificá-la.
- O agente pode criar e editar orientações, inclusive durante o bootstrap de um projeto novo.
- Retirar um repositório do inventário não remove seus arquivos nem seus links automaticamente.
- O inicializador é uma implementação Node.js sem dependências e funciona em Windows e Linux quando o sistema permite criar symlinks.

## Fora de escopo

- Remover links ou orientações quando um repositório sai do inventário.
- Exigir uma ferramenta específica de agente para todos os repositórios.
- Guardar código de aplicação dos repositórios dentro de `harness`.

## Limite da descoberta inicial

A descoberta automática considera apenas os diretórios Git filhos diretos do workspace. Repositórios aninhados ou projetos ainda sem Git são adicionados pelo caminho relativo, evitando registrar repositórios internos por acidente.
