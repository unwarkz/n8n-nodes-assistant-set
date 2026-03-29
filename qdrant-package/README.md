# @unwarkz/n8n-nodes-qdrant

N8N community node for **[Qdrant](https://qdrant.tech/)** vector store — embed and store documents, perform semantic search, and manage collections from n8n AI Agent workflows.

_**Please star the repo if you use my nodes - I will know that it is needed to someone except me.**_

## Features

### Qdrant Store AI Tools Node

Embed text and binary files into a Qdrant vector collection using a **connected Embedding model sub-node**. Designed for building knowledge bases that AI Agents can write to.

| Tool | Description |
|------|-------------|
| `qdrant_store_text` | Embed a text string and store it as a vector point |
| `qdrant_store_binary_file` | Send a binary file directly to the multimodal embedder and store the result |
| `qdrant_batch_store_texts` | Embed and store multiple texts in a single batch operation |
| `qdrant_create_collection` | Create a new Qdrant collection with vector configuration |
| `qdrant_delete_collection` | Permanently delete a collection and all its data |

**Node inputs:**
- **Embedding** (`ai_embedding`, required) — any n8n-compatible embedding model sub-node (OpenAI, Cohere, HuggingFace, Ollama, etc.)

**Binary file embedding strategy** (tried in order):
1. Raw `Buffer` — native multimodal embedders (CLIP, Vertex AI multimodal)
2. `data:<mimeType>;base64,<data>` URI string — embedders that accept image data-URIs
3. `filename: …\nfiletype: …\ncontent_base64: …` text — any text embedder as fallback

### Qdrant AI Tools Node

Full Qdrant operations node for **reading, querying, and managing** a Qdrant vector store from an AI Agent.

| Tool | Description |
|------|-------------|
| `qdrant_search` | Semantic vector search (requires Embedding sub-node); auto-reranked if Reranker is connected |
| `qdrant_scroll` | Page through all points in a collection with optional filter |
| `qdrant_get_points` | Retrieve specific points by their IDs |
| `qdrant_upsert_points` | Insert or update points with pre-computed vectors |
| `qdrant_delete_points` | Delete points by ID list or filter expression |
| `qdrant_count_points` | Count points matching a filter |
| `qdrant_recommend` | Find similar points using positive/negative example IDs |
| `qdrant_list_collections` | List all collections in the Qdrant instance |
| `qdrant_get_collection_info` | Get detailed config and stats for a collection |
| `qdrant_create_collection` | Create a new collection |
| `qdrant_delete_collection` | Permanently delete a collection |
| `qdrant_update_collection` | Update optimizer, HNSW, and quantization settings |
| `qdrant_create_snapshot` | Create a collection snapshot for backup/export |
| `qdrant_list_snapshots` | List available snapshots for a collection |

**Node inputs (both optional):**
- **Embedding** (`ai_embedding`) — required for `qdrant_search`; embeds the query vector
- **Reranker** (`ai_reranker`) — when connected, search results are automatically reranked using the LangChain `BaseDocumentCompressor` interface before being returned

## Prerequisites

1. A running [Qdrant](https://qdrant.tech/documentation/quick-start/) instance:
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

2. n8n version ≥ 1.0.0

## Installation

```bash
npm install @unwarkz/n8n-nodes-qdrant
```

Or install via the n8n UI: **Settings → Community Nodes → Install** → enter `@unwarkz/n8n-nodes-qdrant`.

## Configuration

Create a **Qdrant API** credential with:
- **Qdrant URL**: URL of your Qdrant instance (default: `http://localhost:6333`; for Qdrant Cloud use `https://<cluster-id>.cloud.qdrant.io`)
- **API Key**: Qdrant API key (required for Qdrant Cloud; leave empty for unauthenticated local instances)

## Usage

### Store text from an AI Agent

1. Add a **Qdrant Store AI Tools** node
2. Connect an **Embedding** model sub-node (e.g., OpenAI Embeddings) to its **Embedding** input
3. Create a credential for your Qdrant instance
4. Set **Default Collection** to the target collection name
5. Connect the **Tool** output to an AI Agent node's **Tools** input

The agent can now call `qdrant_create_collection` to create the collection, then `qdrant_store_text` or `qdrant_batch_store_texts` to populate it.

### Semantic search with reranking

1. Add a **Qdrant AI Tools** node
2. Connect an **Embedding** sub-node to its **Embedding** input
3. Optionally connect a **Reranker** sub-node (e.g., Cohere Reranker) to its **Reranker** input
4. Connect the **Tool** output to an AI Agent node's **Tools** input

The agent can now call `qdrant_search`. If a reranker is connected, results are automatically reranked before being returned.

### Store a binary file (image, document, media)

The `qdrant_store_binary_file` tool reads a binary property from the **global binary registry** (compatible with files stored by Telegram Bot AI Tools, Gotenberg AI Tools, etc.) and passes the raw buffer directly to the embedding model:

```
AI Agent → qdrant_store_binary_file(binary_property_name="telegram_file_0")
         → QdrantStoreAiTools reads buffer from _n8nBinaryRegistry
         → sends Buffer to embedder.embedDocuments([buffer])
         → stores resulting vector in Qdrant
```

## Cross-Tool Binary Interoperability

This package uses the same **`global._n8nBinaryRegistry`** pattern as other `@unwarkz` AI tool nodes. Binary files produced by one AI tool (e.g., `telegram_get_file`) are automatically accessible to this node via their `binaryPropertyName`, with no manual file passing required.

## Part of the Assistant Set

This package is also included in the full [@unwarkz/n8n-nodes-assistant-set](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) package.

## License

MIT © unwarkz
