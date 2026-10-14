---
name: harness-feature-planning
description: 'Planejar uma feature em qualquer projeto usando SDD: analisar o contexto, fechar dúvidas com perguntas interativas e criar ou atualizar Spec, Spec Técnica e Tasks sem implementar o código.'
---

# Harness Feature Planning

Use esta skill para transformar uma feature em um plano de implementação claro, baseado no contexto e nos padrões reais do projeto. O resultado são três altitudes de documentação: Spec, Spec Técnica e Tasks. Não implemente o código da feature.

## Fluxo

1. Leia `AGENTS.md`, `CLAUDE.md` e outras instruções aplicáveis, além dos guias de arquitetura e convenções apontados por eles. Respeite precedência e escopo.
2. Localize a documentação de features existente sem presumir diretório ou nomes fixos. Analise de 2 a 5 exemplos recentes e completos para identificar idioma, localização, nomenclatura, estrutura, critérios de aceite e granularidade das tasks.
3. Se não houver padrão, adote uma estrutura mínima com Spec, Spec Técnica e Tasks e registre que é uma convenção nova.
4. Investigue somente o código necessário para compreender a feature. Baseie o plano em arquivos, símbolos, contratos e padrões encontrados; não invente componentes, APIs, tabelas, bibliotecas ou decisões.
5. Após a análise, reúna as dúvidas que possam alterar escopo, comportamento, contratos, persistência, segurança, arquitetura ou critérios de aceite verificáveis. Não pergunte fatos já disponíveis no pedido, nas instruções ou no projeto; resolva dúvidas pequenas com suposições explícitas.
6. Faça essas perguntas interativamente no chat do Codex usando o recurso de perguntas da aplicação (por exemplo, `request_user_input_async`) quando disponível. Agrupe perguntas relacionadas e ofereça opções concisas quando isso ajudar. Aguarde as respostas antes de fechar o planejamento e incorpore-as aos documentos. Se uma pergunta não puder ser respondida, a interação não estiver disponível ou restarem dúvidas, registre-as como questões em aberto e siga com o restante do plano. Não dependa de o usuário editar os documentos manualmente para responder.
7. Antes de escrever, consulte [Pattern Adaptation](references/pattern-adaptation.md) e adapte-se ao formato encontrado, preservando conteúdo manual e decisões ainda válidas. Se houver uma ambiguidade relevante que não tenha sido resolvida, consulte [Ambiguity Policy](references/ambiguity-policy.md).
8. Crie ou atualize os três documentos da feature, no local e formato reconhecidos pelo projeto.
9. Verifique consistência: critérios de aceite da Spec são tratados na Spec Técnica; as partes relevantes da Spec Técnica aparecem nas Tasks; Tasks não introduzem requisitos novos; termos, hipóteses, decisões e questões em aberto são coerentes entre os documentos.

## Conteúdo dos documentos

- **Spec:** o que será feito, por que, limites de escopo e comportamento esperado.
- **Spec Técnica:** como implementar no contexto real do projeto, com referências concretas a código, contratos, arquitetura e convenções quando disponíveis.
- **Tasks:** etapas pequenas, ordenadas e verificáveis, preferencialmente entregas verticais, incluindo verificações relevantes.

Adapte nomes, idioma, seções e organização ao padrão do projeto. Registre respostas confirmadas como decisões; diferencie fatos observados, hipóteses e pendências. Se não houver padrão, prefira uma pasta da feature com um arquivo para cada documento e critérios verificáveis.

## Limites

- Planejar é o escopo: não implementar a feature, alterar código de negócio, instalar dependências ou modificar documentação de outras features.
- Não bloqueie o plano inteiro por uma decisão pendente; avance nas partes independentes e marque dependências nas Tasks.
- Não adicione detalhes técnicos sem evidência no projeto ou confirmação do usuário.
- Preserve decisões válidas e contexto manual ao atualizar documentos existentes.

## Resposta final

Resuma o padrão encontrado (ou a convenção nova), a localização e os arquivos criados ou atualizados, as principais decisões e suposições, as questões em aberto e confirme que a implementação não foi feita.

