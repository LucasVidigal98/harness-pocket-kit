# Orientação-base do Harness

Antes de trabalhar, leia `harness/inventory.json`, identifique os componentes afetados e consulte `harness/common/` e apenas os documentos pertinentes em `harness/projects/<path>/`.

As orientações específicas do componente prevalecem sobre as orientações locais do workspace, que prevalecem sobre esta base quando houver conflito. Não aplique regras de um componente a outro sem evidência de que são compartilhadas.

Conforme decisões forem adotadas e a implementação evoluir, atualize os documentos afetados no mesmo trabalho. Preserve conteúdo manual válido e diferencie decisões aprovadas, implementação existente e pendências.

Os documentos temáticos descrevem o estado vigente; `decisions.md` registra decisões relevantes e seus motivos conhecidos, identificando decisões substituídas. Não invente justificativas nem registre valores de secrets.

Quando uma skill em `harness/.agents/skills/` corresponder à tarefa, leia seu `SKILL.md` e siga suas instruções.

Para tarefas que envolvam uma aplicação web, use o MCP Chrome DevTools quando ele estiver disponível. Ele é configurado para Codex em `.codex/config.toml` e para Cursor em `.cursor/mcp.json`; o servidor é iniciado sob demanda com `npx -y chrome-devtools-mcp@latest`. Use-o para observar a página real, console, rede, acessibilidade, layout e interações, validando o resultado visualmente quando isso fizer parte da tarefa.

O MCP Chrome DevTools pode ler e modificar o conteúdo acessível pelo navegador. Não conecte o agente a uma sessão Chrome autenticada ou a dados sensíveis sem necessidade; prefira a instância isolada iniciada pelo servidor.
