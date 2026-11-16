# Orientação-base do Harness

Antes de trabalhar, leia `harness/inventory.json`, identifique os componentes afetados e consulte `harness/common/` e apenas os documentos pertinentes em `harness/projects/<path>/`.

As orientações específicas do componente prevalecem sobre as orientações locais do workspace, que prevalecem sobre esta base quando houver conflito. Não aplique regras de um componente a outro sem evidência de que são compartilhadas.

Conforme decisões forem adotadas e a implementação evoluir, atualize os documentos afetados no mesmo trabalho. Preserve conteúdo manual válido e diferencie decisões aprovadas, implementação existente e pendências.

Os documentos temáticos descrevem o estado vigente; `decisions.md` registra decisões relevantes e seus motivos conhecidos, identificando decisões substituídas. Não invente justificativas nem registre valores de secrets.

Quando uma skill em `harness/.agents/skills/` corresponder à tarefa, leia seu `SKILL.md` e siga suas instruções.
