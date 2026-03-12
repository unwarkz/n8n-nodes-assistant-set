# @surreal7/n8n-nodes-mem0

[![npm version](https://img.shields.io/npm/v/@surreal7/n8n-nodes-mem0.svg)](https://www.npmjs.com/package/@surreal7/n8n-nodes-mem0)
[![npm downloads](https://img.shields.io/npm/dm/@surreal7/n8n-nodes-mem0.svg)](https://www.npmjs.com/package/@surreal7/n8n-nodes-mem0)

## Introduo
Mem0  uma camada inteligente de memria para agentes e aplicaes de IA. Este pacote entrega nodes customizados para o n8n que permitem criar, buscar, atualizar e conectar memrias persistentes (incluindo modos semnticos e hbridos) diretamente aos fluxos e agentes do n8n, tanto na nuvem Mem0 quanto em instncias self-hosted.

## Instalao
### Pelo painel de Community Nodes (recomendado)
1. Em **Settings > Community Nodes**, clique em **Install**.
2. Informe @surreal7/n8n-nodes-mem0.
3. Confirme para instalar e reinicie o n8n.

### Instalao manual
`ash
cd ~/.n8n/nodes
npm install @surreal7/n8n-nodes-mem0
`
Reinicie o n8n para carregar os nodes.

### Configurao de credenciais
- **Mem0 Cloud (api.mem0.ai)**: gere a chave em *Dashboard > API Keys* e cadastre em **Credentials > Mem0 API**.
- **Mem0 Self-hosted**: informe a URL da instncia e a API key em **Mem0 Self Hosted API**.

## Nodes includos
- **Mem0**  Node operacional completo (CRUD de memrias, buscas semnticas, gerenciamento de entidades, histrico).
- **Mem0 Memory**  Fonte de memria pronta para conectar ao AI Agent do n8n (modos Bsico, Resumo, Semntico v1, Semntico v2 e Hbrido).

## Referncia detalhada
### Node Mem0
#### Parmetros comuns
- **Tipo de Autenticao**: escolhe entre Nuvem (api.mem0.ai) e Self-hosted.
- **Recurso**: Memria ou Entidade.
- **Operao**: muda conforme o recurso (Adicionar, Buscar, Buscar Avanada, Atualizar, Deletar, Histrico etc.).
- **IDs / Escopo** (User ID, Agent ID, App ID, Run ID): permitem ancorar a memria a usurios/agentes/aplicaes especficas.
- **Campos auxiliares** (dditionalFields, updateFields): oferecem metadata customizada, categorias e opes de incluso/excluso.

#### Recurso: Memria
##### Adicionar
- **Contedo da Mensagem**: texto principal da lembrana.
- **Tipo de Mensagem**: user, ssistant ou system (define o papel no array messages).
- **User ID / Agent ID / App ID / Run ID**: identificadores opcionais para vincular a memria.
- **Metadados** (coleo chave/valor).
- **Categorias Personalizadas** (customCategories).
- **Includes / Excludes / Infer**: controlam seleo de memrias relacionadas e inferncia automtica do Mem0.

##### Buscar (bsica  /v1/memories/search/)
- **Consulta de Busca**: texto natural.
- **Quantidade de Resultados (topK)**, **Reordenar Resultados (rerank)**, **Campos a Retornar (fields)**.
- **Filtrar por Metadados**: coleo de Chave do Metadado + Valor Esperado que gera metadata no corpo da requisio.

##### Buscar memrias (avanada  /v2/memories/search/)
- **Consulta de Busca**.
- **Opes**: 	opK, erank, ields semelhantes ao modo bsico.
- **Filtros Avanados** *(novo no-code)*: coleo de regras sem cdigo.
  - **Campo**: exemplo memory, user_id, metadata.categoria.
  - **Operao**: Igual, Diferente, Contm, Maior que, Menor que.
  - **Valor**: string avaliada; nmeros/boolean/JSON so interpretados automaticamente.
  - Cada regra vira parte de um AND enviado ao /v2/memories/search/ (usa os operadores 
e, icontains, gt, lt).

##### Listar mltiplas (getAll)
- Retorna memrias filtradas por user_id, gent_id, pp_id, un_id.

##### Buscar por ID (get), Atualizar (update), Deletar (delete), Deletar todas (deleteAll)
- Parametrizadas por **ID da Memria** ou pelos filtros de escopo (user_id, etc.).
- Atualizao permite editar 	ext e metadata via coleo chave/valor.

##### Histrico (history)
- Requer **ID da Memria** e retorna o histrico de alteraes /v1/memories/{id}/history/.

#### Recurso: Entidade
- **Operao**: Listar Mltiplas (GET /v1/entities/) ou Deletar (DELETE /v1/entities/{tipo}/{id}/).
- **Tipo de Entidade**: user, gent, pp, un.
- **ID da Entidade**: identificador textual.

### Node Mem0 Memory (AI Agent)
#### Parmetros
- **Autenticao**: Nuvem ou Self-hosted.
- **ID da Thread**: identificador nico. Se vazio, usa $json.threadId ou $executionId.
- **Modo de Recuperao de Contexto**:
  - **Bsico**: retorna memrias brutas (todas ou ltimas *N*).
  - **Resumo**: monta um texto resumido das memrias recuperadas.
  - **Semntico (v1)**: /v1/memories/search/ com query, 	opK, erank, ields.
  - **Semntico (v2)**: /v2/memories/search/ com filtros, 	opK, erank, ields.
  - **Hbrido** *(novo)*: combina memrias recentes (GET /v1/memories/) com uma busca semntica v2. Aplica time-decay, peso lpha, MMR e devolve o ranking mais relevante ao agente.
- **Consulta**: sugerido ={{ .query || .lastUserMessage }}.
- **Chave de Memria**: chave JSON enviada ao AI Agent (padro chat_history).

#### Avanado (coleo)
- **User ID / Agent ID / App ID / Run ID**: usados para GET/POST.
- **Top K**: quantidade de memrias em modos semnticos ou hbrido (default 25).
- **Rerank / Fields**: aplicveis aos modos semnticos.
- **Filters (JSON)**: filtros enviados ao /v2/memories/search/ (Semntico v2 e Hbrido) no padro Mem0.
- **Last N (recentes)**: limita quantas memrias recentes entram no Bsico, Resumo ou componente recente do Hbrido.
- **Alpha (peso semntico)**: peso da relevncia semntica vs. recency score no Hbrido (default 0.65).
- **Half-life (horas)**: meia-vida usada no decaimento temporal (default 48h).
- **Mximo a retornar**: limite final de memrias entregues ao AI Agent.
- **MMR (diversidade)** e **MMR Lambda**: controlam Maximal Marginal Relevance.

O node implementa supplyData e expe o resultado diretamente ao conector Memory do AI Agent. No modo hbrido, a pipeline : recentes  semntico v2  merge/dedup  score hbrido  MMR  trim maxReturn.

## Exemplos de uso
### 1. Buscar memrias avanadas sem cdigo
1. Arraste **Mem0** e selecione *Recurso = Memria*, *Operao = Buscar Avanada*.
2. Informe a consulta (ex.: Preferncias do cliente ACME).
3. Use **Filtros Avanados** para criar regras como: Campo = metadata.segmento, Operao = Igual, Valor = enterprise.
4. Opcional: ajuste Top K, campos retornados e erank.
5. Conecte o resultado ao seu fluxo (Set, Merge, etc.) para personalizar respostas.

### 2. Conectar o Mem0 ao AI Agent com modo hbrido
1. Adicione **Mem0 Memory** e configure as credenciais.
2. Em **Modo de Recuperao**, escolha *Hbrido*.
3. Mantenha Consulta = {{.lastUserMessage}} e Chave de Memria = chat_history.
4. (Opcional) Ajuste Last N, Top K, Alpha e Half-life para o equilbrio desejado.
5. Relacione a sada i_memory ao conector **Memory** do node *AI Agent*.
6. As respostas do agente passam a considerar tanto o contexto recente quanto lembranas semnticas relevantes, com rerank e diversidade.

## Licena
MIT. No publique informaes confidenciais em seus fluxos ou no registro do npm.
