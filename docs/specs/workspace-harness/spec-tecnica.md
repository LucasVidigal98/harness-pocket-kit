# Especificação técnica: Harness para monorepo

## Estrutura conceitual

```text
monorepo/
├── .git/
├── AGENTS.md
├── CLAUDE.md
├── .cursor/rules/harness.mdc
├── harness/
│   ├── inventory.json
│   ├── common/guidance.md
│   ├── projects/<component-path>/
│   ├── .agents/skills/
│   └── scripts/harness.mjs
├── apps/web/
│   └── AGENTS.md
└── services/api/
    └── AGENTS.md
```

Os nomes são exemplos. O caminho relativo completo identifica o componente. Todos os arquivos pertencem ao mesmo Git.

## Inventário

```json
{
  "version": 2,
  "projects": [
    { "path": "apps/web" },
    { "path": "services/api" }
  ]
}
```

Os caminhos usam `/`, são relativos à raiz e não admitem segmentos vazios, `.` ou `..`. `harness` e `.git` não podem ser o primeiro segmento. Diretórios symlink no caminho são rejeitados.

## Pontos de entrada

`init` cria, somente quando ausentes:

- `AGENTS.md` para Codex;
- `CLAUDE.md` para Claude;
- `.cursor/rules/harness.mdc` para Cursor.

Eles instruem o agente a ler `inventory.json`, `common/guidance.md`, os documentos dos componentes afetados e skills correspondentes em `harness/.agents/skills/`. Se um destino já existir, o script o preserva e avisa quando não encontra referência a `harness/`.

`add` cria também `<component-path>/AGENTS.md` como arquivo regular. Seu conteúdo usa caminhos relativos calculados a partir da profundidade do componente e encaminha o Codex diretamente à orientação geral, à documentação específica e às skills. `init` garante esse arquivo para componentes já registrados. Arquivos existentes são preservados e precisam mencionar `harness/` para que `check` seja aprovado.

Os pontos de entrada não incorporam nem geram cópias das fontes. Por isso, edições de conteúdo, adições, renomeações e remoções são percebidas diretamente.

## Inicializador

`scripts/harness.mjs` não tem dependências e oferece:

- `init`: valida a raiz Git, cria fontes compartilhadas e pontos de entrada ausentes, inicializa ou migra o inventário e garante os templates registrados;
- `add <path>`: valida e registra explicitamente um componente existente, criando seus templates e `AGENTS.md` uma vez;
- `check [path]`: valida fontes, pontos de entrada, componentes e documentação temática.

Não existem `link` ou `sync`. O script não procura `.git` em componentes nem infere diretórios de código.

## Migração da versão 1

`init` converte cada item de `repositories` em `{ "path": ... }` dentro de `projects` e descarta o campo `tool`. Fontes específicas por ferramenta, arquivos gerados e symlinks existentes não são apagados. Eles ficam disponíveis para revisão e remoção manual após a migração.

## Documentação viva

Os nove Markdown temáticos ficam em `harness/projects/<path>/`. `.guidance-initialized` registra a criação inicial para que documentos removidos não reapareçam. Conteúdo é preenchido pela IA, não pelo script.

O agente carrega somente orientações pertinentes à tarefa, aplica precedência específica sobre geral, preserva conteúdo manual e distingue estado vigente, decisões e pendências. O YAML de bootstrap é apenas o plano inicial.

Validação automatizada: `node --test scripts/harness.test.mjs` com monorepos temporários.
