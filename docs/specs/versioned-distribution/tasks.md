# Tasks: distribuição e atualização versionada

- [x] Confirmar o nome e o escopo disponíveis no npm e registrar a política SemVer inicial.
- [x] Separar a orientação oficial em `harness/base/guidance.md` e manter `common/` como fonte pertencente ao projeto consumidor.
- [x] Atualizar os templates e a validação dos pontos de entrada para consultar orientação-base, orientação local e documentos dos componentes.
- [x] Definir a lista explícita de arquivos distribuídos e criar o gerador sem dependências do manifesto com hashes SHA-256.
- [x] Adicionar o pacote npm sem dependências, com `bin`, versão e allowlist de publicação.
- [x] Implementar `install` e registrar `.harness-kit/installed.json` sem sobrescrever estado local existente.
- [x] Implementar `status` e `--dry-run`, garantindo que não realizem escrita.
- [x] Implementar o preflight de `update`: validar manifests, comparar hashes, classificar adições/alterações/remoções e detectar conflitos antes da escrita.
- [x] Implementar aplicação transacional da atualização, com staging temporário, restauração em falha e gravação tardia do manifesto instalado.
- [x] Preservar arquivos fora do manifesto e remover arquivos oficiais descontinuados somente quando permanecerem intactos.
- [x] Bloquear mudanças de major por padrão e aceitar `--allow-major` com resumo e referência às notas da versão.
- [x] Implementar migrações idempotentes e executar `harness.mjs check` antes de concluir a atualização.
- [x] Implementar `adopt` para reconhecer a base legada, preservar customizações e registrar a primeira versão gerenciada.
- [x] Cobrir instalação, status, dry-run, update, conflitos, rollback, major, skills locais, migrações e adoção com fixtures temporárias.
- [x] Adicionar matriz de CI para Linux e Windows e validar que pacote, manifesto e versão são coerentes.
- [x] Documentar instalação, consulta, atualização, seleção de versão, customização local, resolução de conflitos e migração do modelo atual.
- [x] Criar changelog e automação de release que publique a mesma versão em tag Git, GitHub Release e npm.
- [x] Testar uma release candidata em pelo menos um monorepo novo e uma cópia legada antes da publicação inicial.
