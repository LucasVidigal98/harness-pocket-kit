# Tasks: Harness para monorepo

- [x] Substituir o modelo de vários repositórios por um único repositório Git com componentes livres.
- [x] Definir o inventário v2 com `projects` identificados por caminho relativo.
- [x] Remover descoberta de repositórios e escolha de ferramenta por componente.
- [x] Remover criação e configuração de symlinks.
- [x] Criar pontos de entrada mínimos para Codex, Cursor e Claude na raiz.
- [x] Manter um `AGENTS.md` regular em cada componente registrado, sem symlink.
- [x] Fazer agentes consultarem diretamente orientações e skills em `harness/`.
- [x] Substituir `link` e `sync` por validação com `check`.
- [x] Preservar documentos removidos ou renomeados após a inicialização.
- [x] Migrar inventários v1 sem apagar fontes ou links legados.
- [x] Atualizar README, orientações do repositório, especificações e testes.
- [ ] Atualizar as skills `configure-workspace-harness` e `bootstrap-workspace-project` para o contrato de monorepo.
