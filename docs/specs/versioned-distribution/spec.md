# Distribuição e atualização versionada do Harness

## Problema

Hoje o kit é copiado para `harness/` dentro de cada monorepo. Depois da cópia, não existe uma identidade de versão nem um canal padronizado para receber correções, novas skills ou alterações nas orientações-base. Cada instalação passa a evoluir isoladamente, e substituir a pasta inteira arriscaria apagar inventário e documentação próprios do projeto consumidor.

## Objetivo

Publicar o Harness Pocket Kit como ferramenta open source versionada e permitir que qualquer pessoa instale ou atualize sua cópia por comando, de forma explícita e verificável, sem atualização contínua em segundo plano.

O GitHub permanece como fonte pública, histórico e canal de releases. A CLI sem dependências `harness-pocket-kit`, distribuída pelo npm, entrega a versão escolhida ao projeto consumidor. O nome estava disponível no registry na consulta realizada em 15 de novembro de 2026; a publicação ainda é necessária para reservá-lo.

## Modelo de propriedade

Uma instalação distingue dois grupos de arquivos:

- **Gerenciados pelo kit:** orientações-base oficiais, skills oficiais, scripts e metadados necessários ao funcionamento e à atualização. Esses arquivos acompanham uma versão publicada.
- **Pertencentes ao projeto:** `inventory.json`, orientações locais em `common/`, documentos em `projects/`, pontos de entrada personalizados e skills locais que não façam parte do manifesto oficial.

As orientações-base oficiais ficam separadas das orientações locais. Agentes leem ambas, com a orientação específica do projeto ou componente prevalecendo quando houver conflito.

Uma skill oficial não deve ser editada como forma normal de customização. O usuário pode criar outra skill, com nome próprio, no diretório de skills. Arquivos locais que não constem no manifesto da versão instalada são preservados.

## Fluxos esperados

### Nova instalação

1. A pessoa executa `npx harness-pocket-kit@latest install` na raiz de um repositório Git.
2. A CLI instala os arquivos gerenciados em `harness/`, registra a versão e executa a inicialização existente.
3. A pessoa registra os componentes do workspace com os comandos já suportados pelo `harness.mjs`.

Também é possível selecionar uma versão específica substituindo `latest` por uma versão SemVer.

### Consulta de atualização

1. A pessoa executa `npx harness-pocket-kit@latest status`.
2. A CLI informa a versão instalada, a versão-alvo e se a mudança é patch, minor ou major.
3. Nenhum arquivo é alterado.

As GitHub Releases e seu changelog são o canal humano para anunciar versões. Não existe processo residente nem atualização automática.

### Atualização

1. A pessoa revisa as notas da versão e executa `npx harness-pocket-kit@latest update` ou escolhe uma versão explícita.
2. A CLI compara os arquivos gerenciados locais com o manifesto da versão instalada antes de escrever.
3. Se não houver conflito, prepara a nova versão, aplica migrações necessárias, valida o Harness e registra a nova versão.
4. A CLI apresenta um resumo dos arquivos adicionados, atualizados, removidos e preservados.

Uma mudança de major é recusada por padrão e exige confirmação explícita por opção de comando, pois pode demandar ações manuais descritas nas notas da versão.

### Conflito local

Se um arquivo oficial tiver sido alterado desde a instalação, a atualização para antes de qualquer escrita e lista os conflitos. O usuário decide se transforma a alteração em uma skill ou orientação local, restaura a versão oficial ou mantém um fork do kit. A primeira versão desse mecanismo não realiza merge automático nem substituição forçada.

### Instalação anterior ao versionamento

Instalações criadas pelo modelo atual passam por uma adoção única com `npx harness-pocket-kit@1.0.0 adopt`. A adoção reconhece apenas arquivos oficiais conhecidos, preserva conteúdo local e registra o primeiro manifesto instalado. Diferenças em arquivos potencialmente oficiais são apresentadas para resolução manual.

## Política de versões

O projeto usa SemVer:

- **patch:** correções compatíveis em scripts, skills ou documentação;
- **minor:** novas skills, novas orientações ou funcionalidades compatíveis;
- **major:** mudança incompatível no contrato, estrutura ou comportamento de atualização.

Cada versão publicada possui changelog, tag Git correspondente e pacote npm com o mesmo número.

## Critérios de aceite

- Qualquer usuário com Node.js e npm consegue instalar o kit em um repositório por um comando documentado.
- Uma instalação registra de forma legível a versão do kit e os hashes dos arquivos gerenciados.
- O usuário pode consultar se há atualização sem modificar arquivos.
- O usuário pode atualizar para a versão mais recente ou para uma versão SemVer específica.
- Atualizações de major exigem opção explícita e apontam para as notas da versão.
- Novas skills e mudanças nas orientações-base chegam aos consumidores por atualização.
- `inventory.json`, `common/`, `projects/` e arquivos locais fora do manifesto não são sobrescritos.
- Skills locais com nomes não gerenciados são preservadas.
- Alterações locais em arquivos oficiais são detectadas antes da escrita e impedem atualização parcial.
- Arquivos removidos de uma release são apagados somente quando ainda correspondem à versão oficial instalada.
- Falha durante escrita, migração ou validação restaura o estado anterior dos arquivos afetados.
- A validação existente do workspace é executada após uma atualização bem-sucedida.
- Instalações anteriores ao versionamento possuem um fluxo único e seguro de adoção.
- A CLI e o pacote permanecem sem dependências de runtime e funcionam em Windows e Linux.
- O código permanece público no GitHub, e cada publicação npm corresponde a uma tag e uma GitHub Release.

## Fora de escopo

- Enviar atualizações automaticamente para computadores de usuários.
- Executar um serviço residente, telemetria ou verificação silenciosa em segundo plano.
- Fazer merge automático de alterações locais em arquivos oficiais.
- Atualizar dependências, código ou configuração dos componentes registrados no workspace.
- Sincronizar conteúdo próprio entre diferentes projetos consumidores.
- Oferecer uma interface gráfica para instalação ou atualização.

## Questões em aberto

- Política de suporte a majors anteriores depois que uma nova major for publicada.
- Uso de npm Trusted Publishing ou token de automação no primeiro fluxo de release.
