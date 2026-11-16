# Especificação técnica: distribuição e atualização versionada

## Decisão de distribuição

A distribuição proposta usa uma CLI npm sem dependências. O npm já acompanha o Node.js exigido pelo inicializador atual e fornece resolução de versões, download, cache e verificação de integridade em Windows e Linux. O projeto não precisa implementar cliente de registry, extração de pacotes ou autoatualização do próprio updater.

O GitHub continua sendo a fonte canônica. Uma tag `vX.Y.Z`, uma GitHub Release e o pacote npm `X.Y.Z` representam a mesma entrega. O pacote não usa scripts automáticos de `postinstall`; a mudança no projeto ocorre somente quando a pessoa executa explicitamente o comando da CLI.

## Separação entre ferramenta e estado local

O conteúdo instalado em `harness/` passa a ter limites explícitos:

```text
harness/
├── .harness-kit/
│   └── installed.json       # versão e manifesto efetivamente instalados
├── base/
│   └── guidance.md          # orientação oficial gerenciada pelo kit
├── .agents/skills/          # mistura segura por manifesto: oficiais e locais
├── scripts/                 # scripts oficiais gerenciados
├── inventory.json           # estado local do workspace
├── common/                  # orientações locais compartilhadas
└── projects/                # orientações locais por componente
```

O manifesto oficial enumera arquivos, não diretórios inteiros. Assim, uma pasta local em `.agents/skills/<nome-local>/` é preservada enquanto não colidir com um caminho publicado pelo kit.

`base/guidance.md` recebe as regras gerais mantidas neste repositório. `common/guidance.md` permanece disponível para decisões do workspace consumidor. Os pontos de entrada gerados passam a encaminhar o agente para `base/guidance.md`, `common/` e os documentos pertinentes em `projects/`.

## Pacote e CLI

O pacote se chama `harness-pocket-kit`, começa em `1.0.0` e contém uma lista explícita de arquivos publicados e um executável Node.js. A consulta ao registry em 15 de novembro de 2026 retornou `E404`; a publicação ainda é necessária para reservar o nome.

Comandos propostos:

- `npx harness-pocket-kit@latest install`: instala a versão-alvo e chama a inicialização do workspace;
- `npx harness-pocket-kit@latest status`: compara a versão do pacote executado com a versão instalada sem escrever;
- `npx harness-pocket-kit@latest update`: atualiza uma instalação já versionada;
- `npx harness-pocket-kit@<versão> update`: instala uma versão-alvo explícita;
- `npx harness-pocket-kit@1.0.0 adopt`: registra com segurança uma instalação legada;
- opção `--allow-major`: autoriza uma mudança de major;
- opção `--dry-run`: executa descoberta, comparação e validações prévias sem escrever.

A versão-alvo é a própria versão da CLI selecionada pelo `npx`. Não há resolução manual de `latest` dentro do código do projeto.

O `scripts/harness.mjs` instalado continua responsável apenas por `init`, `add` e `check`. Operações de rede e publicação não entram nesse script, preservando seu funcionamento offline e sem dependências.

## Manifestos

O pacote contém um manifesto de distribuição gerado durante a preparação da release:

```json
{
  "formatVersion": 1,
  "packageVersion": "1.2.0",
  "files": [
    {
      "path": ".agents/skills/exemplo/SKILL.md",
      "sha256": "..."
    }
  ]
}
```

Somente caminhos relativos normalizados podem entrar no manifesto. Caminhos absolutos, segmentos `.` ou `..`, links simbólicos e destinos fora de `harness/` são rejeitados.

Após instalação ou atualização, `.harness-kit/installed.json` guarda:

- versão e formato instalados;
- identificação do pacote oficial;
- mapa de caminhos gerenciados e hashes da versão instalada.

Esse arquivo deve ser versionado junto com o projeto consumidor. Ele permite reproduzir a versão e distinguir uma alteração oficial anterior de uma edição local.

## Algoritmo de atualização

1. Resolver a raiz Git e confirmar que `harness/` ocupa a localização esperada.
2. Ler e validar o manifesto instalado e o manifesto contido na CLI alvo.
3. Recusar downgrade, salvo quando uma opção explícita de rollback for definida futuramente.
4. Recusar mudança de major sem `--allow-major`.
5. Para cada arquivo do manifesto instalado, calcular o hash local:
   - hash igual ao instalado: arquivo elegível para atualização ou remoção;
   - arquivo ausente ou hash diferente: conflito local.
6. Preservar todo arquivo que não pertença ao manifesto instalado, inclusive skills locais.
7. Calcular a operação completa e interromper sem escrita quando existir conflito.
8. Em `--dry-run`, exibir a operação e encerrar.
9. Preparar os novos arquivos em diretório temporário, validar hashes e manter cópia temporária dos alvos afetados.
10. Aplicar adições, substituições e remoções. Uma remoção só é permitida para arquivo gerenciado cujo hash local ainda seja o oficial instalado.
11. Executar migrações da faixa de versões e depois `node harness/scripts/harness.mjs check`.
12. Gravar `installed.json` somente depois das validações.
13. Se escrita, migração ou `check` falhar, restaurar os arquivos afetados e o manifesto anterior.
14. Exibir resumo com versão anterior, versão nova, arquivos alterados e itens preservados.

O código deve usar operações de filesystem do Node.js e diretório temporário do sistema. Não depende de comandos Unix, PowerShell ou ferramentas globais além de Node/npm/Git já exigidos pelo fluxo.

## Migrações e pontos de entrada

Migrações são funções versionadas na CLI alvo e executadas em ordem depois da cópia dos arquivos oficiais. Devem ser idempotentes e cobertas por teste.

Para a primeira versão:

- criar `base/guidance.md` como fonte oficial atualizável;
- preservar `common/guidance.md` como conteúdo local;
- atualizar um ponto de entrada somente quando ele corresponder exatamente a um template oficial conhecido;
- preservar pontos de entrada personalizados e emitir instrução objetiva para que passem a mencionar `harness/base/guidance.md`;
- fazer `check` validar as referências à orientação oficial e às fontes locais aplicáveis.

Nenhuma migração deduz ou reescreve texto manual por aproximação.

## Adoção de instalações legadas

`adopt` é separado de `update`, pois uma instalação legada ainda não possui manifesto confiável.

A versão inicial publicada inclui hashes dos arquivos oficiais do último estado não versionado. O comando:

1. reconhece arquivos que correspondam exatamente a essa base conhecida;
2. classifica arquivos desconhecidos ou modificados como locais/conflitantes;
3. instala a orientação-base separada e os metadados de versão;
4. atualiza somente pontos de entrada que correspondam exatamente ao template legado;
5. preserva inventário, orientações e skills não reconhecidas;
6. interrompe sem escrita se não conseguir classificar com segurança um caminho que a nova versão pretende gerenciar.

Depois da adoção, atualizações seguem o fluxo normal. Projetos criados a partir da primeira versão publicada já recebem `installed.json` durante `install`.

## Preparação e publicação de releases

Um script sem dependências gera o manifesto, calcula SHA-256 e falha se encontrar symlink, caminho fora da lista permitida ou arquivo não declarado. A lista de distribuição inclui apenas artefatos necessários ao uso do kit; documentação de desenvolvimento e testes do repositório não são copiados automaticamente para projetos consumidores.

O fluxo de publicação:

1. atualizar versão e changelog;
2. executar testes do inicializador, da CLI, das migrações e do manifesto;
3. executar `npm pack --dry-run` e inspecionar a lista de arquivos;
4. criar a tag `vX.Y.Z` a partir de commit aprovado;
5. publicar o pacote com a mesma versão;
6. criar GitHub Release com notas de migração e exemplos dos comandos;
7. falhar se tag, `package.json` e manifesto divergirem.

A automação usa GitHub Actions e npm Trusted Publishing com permissão OIDC. Tokens de publicação não entram no repositório nem na documentação do Harness.

## Verificações automatizadas

Os testes continuam usando diretórios temporários e não dependem de rede. Devem cobrir:

- instalação nova e repetida;
- `status` e `--dry-run` sem escrita;
- atualização patch/minor e seleção de versão explícita;
- recusa de major sem autorização;
- adição, alteração e remoção de arquivos oficiais;
- preservação de `inventory.json`, `common/`, `projects/` e skills locais;
- detecção de arquivo oficial modificado, sem atualização parcial;
- restauração após falha simulada de escrita, migração ou `check`;
- adoção de instalação legada intacta e com customizações;
- preservação de pontos de entrada personalizados;
- rejeição de path traversal e symlinks;
- execução em CI Linux e Windows;
- correspondência entre versão do pacote, manifesto e tag simulada.

## Compatibilidade e segurança

- A CLI não coleta telemetria.
- A instalação não usa `postinstall` nem executa código baixado fora do pacote npm selecionado.
- O pacote permanece sem dependências de runtime.
- Hashes SHA-256 detectam corrupção e alterações locais; a integridade do pacote em trânsito fica a cargo do npm.
- Atualizações são iniciadas explicitamente e deixam mudanças visíveis no Git do projeto consumidor.
- O formato do manifesto possui versão própria; uma CLI incompatível deve falhar com instrução de migração, nunca interpretar parcialmente o formato.

## Decisões e pendências

Decidido para o planejamento:

- distribuição primária por CLI npm, com GitHub como fonte e canal de releases;
- SemVer e atualização manual por comando;
- separação entre arquivos oficiais gerenciados e estado local;
- conflito local interrompe a operação, sem merge ou força na primeira versão;
- orientação-base oficial separada de `common/`;
- nenhuma dependência de runtime.

Pendente para a publicação inicial:

- definir por quanto tempo uma major anterior recebe patches.
