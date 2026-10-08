# Especificação técnica: Harness para workspace

## Estrutura conceitual

```text
workspace/
├── harness/
│   ├── inventory.json         # caminhos relativos e ferramenta escolhida
│   ├── scripts/harness.mjs    # inicialização, sincronização e links
│   ├── common/                # orientações gerais por ferramenta
│   └── projects/<repo-path>/  # orientações específicas por repositório
├── backend/                   # apenas código e links para orientações
└── frontend/
```

Os nomes `backend` e `frontend` são exemplos. O caminho relativo completo é a identidade do repositório, permitindo nomes de diretório repetidos em subpastas. O nome é derivado do último segmento do caminho.

O inventário usa JSON:

```json
{
  "version": 1,
  "repositories": [
    { "path": "backend", "tool": "codex" }
  ]
}
```

`tool` aceita `codex`, `cursor` ou `null` enquanto não houver escolha. Caminhos são relativos, usam `/` e não podem conter `.` ou `..` como segmentos.

## Configuração

- O comando de configuração é orientado por uma skill do harness. `init` descobre somente repositórios Git que são filhos diretos do workspace na primeira execução; repositórios aninhados ou sem Git são registrados com `add <path>`. Nas seguintes, o inventário existente é a lista controlada.
- A configuração pode criar ou editar tanto as orientações gerais da ferramenta quanto as específicas de cada repositório.
- A ferramenta é detectada pela estrutura existente do repositório quando possível; caso contrário, o agente pergunta ao usuário.
- Para Codex, o script gera `harness/projects/<path>/codex/AGENTS.md` combinando a orientação geral e a específica; `<repo>/AGENTS.md` é um symlink relativo para esse arquivo. Depois de editar fontes comuns ou específicas, a skill executa `sync` para atualizar a composição.
- Para Cursor, `<repo>/.cursor` é um symlink relativo para a pasta de regras montada em `harness/projects/<path>/.cursor/rules/`. As regras gerais e específicas dentro dela são symlinks para seus arquivos fonte.
- As skills de `harness/.agents/skills/<skill>` são ligadas individualmente em `<repo>/.agents/skills/<skill>`, preservando skills locais existentes. Isso mantém as skills disponíveis ao trabalhar no repositório sem copiar seus arquivos.
- O script cria apenas destinos ausentes ou links que já apontam ao destino esperado. Arquivos, diretórios e links diferentes nos destinos causam erro sem substituição. Caminhos de repositório que atravessam diretórios symlink são rejeitados.
- A remoção de um projeto do inventário não executa limpeza. A pessoa decide manualmente se remove os links do repositório.

## Inicializador

O inicializador é `scripts/harness.mjs`, executado com Node.js sem dependências. Comandos: `init`, `add <path>`, `sync [path]` e `link <path> [codex|cursor]`. `init` cria fontes e inventário sem substituir arquivos existentes. `sync` atualiza somente os repositórios com ferramenta escolhida; se um path está ausente, ele informa o erro e continua com os demais. No Windows, criação de symlink pode exigir Developer Mode ou privilégio equivalente; não há fallback que copie arquivos.

## Decisões adotadas

- A descoberta inicial é limitada aos repositórios Git em pastas filhas diretas do workspace. O usuário pode adicionar outros caminhos explicitamente.
- Codex usa um `AGENTS.md` gerado a partir das duas fontes; Cursor carrega regras MDC compartilhadas e específicas por link.
- Se o inventário estiver inválido ou um destino de link estiver ocupado, o comando para e preserva os dados existentes.
- Paths do inventário são relativos e os symlinks também são relativos para manter a estrutura portátil quando o workspace é movido.
