# Harness Pocket Kit

Kit de skills para manter orientações de agentes e apoiar o início e o desenvolvimento de projetos pessoais ou de pequenos grupos. As skills atuais incluem `nestjs-backend-bootstrap` e `spring-java-bootstrap`.

## Workspace com vários repositórios

Copie a estrutura deste kit para `workspace/harness` e inicialize o inventário com Node.js:

```sh
node harness/scripts/harness.mjs init
```

Na primeira execução, ele registra os repositórios Git nas pastas diretamente sob o workspace. Para incluir um projeto aninhado ou ainda sem Git, use `node harness/scripts/harness.mjs add <caminho-relativo>`. Depois peça ao agente: **“Configure o harness para este workspace.”** Ele cria ou atualiza orientações em `harness/` e liga cada repositório à ferramenta escolhida e às skills por symlink. Remover um projeto do inventário não apaga seus links.

Consulte [a especificação do workspace](docs/specs/workspace-harness/spec.md) e [AGENTS.md](AGENTS.md) para detalhes.
