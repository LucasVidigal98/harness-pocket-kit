# Harness Pocket Kit

Kit de skills para projetos pessoais e de pequenos grupos. A ideia é sair rapidamente de uma proposta para código funcional, com verificações proporcionais ao risco e espaço para evoluir a arquitetura conforme o projeto cresce.

As skills ficam em `.agents/skills/<nome-da-skill>/SKILL.md`. Cada pasta é independente e pode incluir seus próprios recursos. A primeira skill é `nestjs-backend-bootstrap`, para iniciar ou estender backends NestJS. Ainda não há instalador.

## Usar em um projeto

Peça ao agente: **“Configure este projeto a partir do Harness Pocket Kit.”** Ele deve criar um link simbólico em `<projeto>/.agents/skills/` para cada pasta de skill deste repositório e conferir se os links funcionam. Assim, mudanças nas skills do kit passam a ser vistas pelos projetos ligados a ele. O kit precisa continuar acessível no mesmo caminho; links locais não são portáveis para outra máquina sem recriação.

Consulte [AGENTS.md](AGENTS.md) para as regras de desenvolvimento e integração das skills.
