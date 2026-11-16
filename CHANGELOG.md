# Changelog

Todas as mudanças relevantes deste projeto serão documentadas aqui. As versões seguem [Semantic Versioning](https://semver.org/lang/pt-BR/).

## 1.0.0 - não publicada

### Adicionado

- CLI npm sem dependências para `install`, `status`, `update` e `adopt`.
- Manifesto SHA-256 dos arquivos oficiais e registro legível da versão instalada.
- Atualizações com detecção prévia de conflitos, bloqueio de major e restauração em falha.
- Separação entre a orientação-base atualizável e as orientações locais do workspace.

### Migração

- Instalações anteriores podem ser adotadas com `npx harness-pocket-kit@1.0.0 adopt`.
- Pontos de entrada personalizados precisam mencionar `harness/base/guidance.md`; a CLI os preserva e informa quando a integração deve ser manual.
