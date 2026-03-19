# n8n-nodes-assistant-set

Monorepo for **n8n community node packages** — AI-powered assistant tools for [n8n](https://n8n.io/) workflows and AI agents.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| **[@unwarkz/n8n-nodes-assistant-set](./package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-assistant-set.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) | Full set: Mem0 + Gotenberg + Telegram Bot + Outline Wiki + Qdrant |
| **[@unwarkz/n8n-nodes-mem0](./mem0-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-mem0.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-mem0) | Mem0 intelligent memory layer |
| **[@unwarkz/n8n-nodes-gotenberg-pdf](./gotenberg-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-gotenberg-pdf.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-gotenberg-pdf) | Gotenberg PDF conversion |
| **[@unwarkz/n8n-nodes-telegram-bot](./telegram-bot-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-telegram-bot.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-telegram-bot) | Telegram Bot API (full coverage) |
| **[@unwarkz/n8n-nodes-outline-wiki](./outline-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-outline-wiki.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-outline-wiki) | Outline Wiki knowledge base (full API coverage) |
| **[@unwarkz/n8n-nodes-qdrant](./qdrant-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-qdrant.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-qdrant) | Qdrant vector store (store, search, manage collections) |

## Repository Structure

```
├── package/                    # Main source — @unwarkz/n8n-nodes-assistant-set
│   └── dist/
│       ├── credentials/        # All credential definitions
│       └── nodes/
│           ├── Mem0/           # Mem0 memory nodes
│           ├── gotenberg/      # Gotenberg PDF nodes
│           ├── telegram/       # Telegram Bot nodes
│           ├── outline/        # Outline Wiki nodes
│           └── qdrant/         # Qdrant vector store nodes
├── mem0-package/               # Standalone — @unwarkz/n8n-nodes-mem0
├── gotenberg-package/          # Standalone — @unwarkz/n8n-nodes-gotenberg-pdf
├── telegram-bot-package/       # Standalone — @unwarkz/n8n-nodes-telegram-bot
├── outline-package/            # Standalone — @unwarkz/n8n-nodes-outline-wiki
├── qdrant-package/             # Standalone — @unwarkz/n8n-nodes-qdrant
└── .github/workflows/
    ├── publish.yml               # Publish assistant-set
    ├── publish-mem0.yml          # Publish mem0
    ├── publish-gotenberg-pdf.yml # Publish gotenberg-pdf
    ├── publish-telegram-bot.yml  # Publish telegram-bot
    ├── publish-outline-wiki.yml  # Publish outline-wiki
    └── publish-qdrant.yml        # Publish qdrant
```

All node source code lives in `package/dist/`. The standalone packages have their dist files synced from `package/dist/` at publish time by GitHub Actions workflows.


## Included Nodes

### Mem0 — Intelligent Memory Layer
- **Mem0** — full CRUD node for memories, entities, organizations, projects
- **Mem0 Memory** — AI Agent memory source
- **Mem0 AI Tools** — AI Agent tools (search, add, get, delete)

### Gotenberg — PDF Conversion
- **Gotenberg** — convert HTML/URL to PDF, office-to-PDF, merge/split/flatten PDFs, screenshots
- **Gotenberg AI Tools** — AI Agent tools for PDF operations

### Telegram Bot — Full Bot API
- **Telegram Bot** — 100+ operations covering the complete Telegram Bot API
- **Telegram Bot AI Tools** — 24 AI Agent tools for messaging, files, chat management

### Outline Wiki — Knowledge Base
- **Outline Wiki** — full CRUD workflow node for all Outline API resources:
  - **Documents**: search, search titles, create, get, update, delete, list, import (binary in), export (binary out), archive, restore, move, AI question answering
  - **Collections**: list, create, get, update, delete, document tree, export
  - **Comments**: list, create, update, delete
  - **Attachments**: upload (binary → S3 signed URL → attachment URL), delete
  - **Users**: list, get
  - **Shares**: create, list, revoke
- **Outline Wiki AI Tools** — same 31 operations exposed as AI Agent tools
### Qdrant — Vector Store Knowledgebase
- **Qdrant Store AI Tools** — embed text and binary files into Qdrant using a connected Embedding model sub-node; supports multimodal embedders with automatic base64 fallback
- **Qdrant AI Tools** — full Qdrant operations: semantic search (with optional Reranker sub-node), scroll, get/upsert/delete points, count, recommend, collection management, snapshots

## Cross-Tool Interoperability

AI tool nodes use **n8n native binary references** for file exchange — no base64 in the AI context.
Tools that produce files store them via `prepareBinaryData` and return a short JSON:

```json
{
  "success": true,
  "binaryPropertyName": "gotenberg_file_0",
  "filename": "output.pdf",
  "mimeType": "application/pdf",
  "sizeKb": 142,
  "message": "File \"output.pdf\" (142 KB) stored in binary property \"gotenberg_file_0\". Pass this binaryPropertyName to other tools that need this file."
}
```

Tools that consume files accept a `binary_property_name` parameter and read the data
via `getBinaryDataBuffer`. Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`.

This enables seamless chaining between tools in an AI Agent workflow:
- Download file from Telegram → Convert with Gotenberg → Send back to Telegram
- Generate PDF from URL → Store reference in Mem0 → Send via Telegram
- Import Telegram attachment into Outline Wiki → Embed screenshots as Outline attachments
- Export Outline document → Convert with Gotenberg → Send PDF via Telegram
- Download image from Telegram → Embed with Qdrant Store AI Tools → Search similar images

## Installation

Install individual packages or the full set:

```bash
# Full set (all nodes)
npm install @unwarkz/n8n-nodes-assistant-set

# Individual packages
npm install @unwarkz/n8n-nodes-mem0
npm install @unwarkz/n8n-nodes-gotenberg-pdf
npm install @unwarkz/n8n-nodes-telegram-bot
npm install @unwarkz/n8n-nodes-outline-wiki
npm install @unwarkz/n8n-nodes-qdrant
```

Or install via n8n **Settings > Community Nodes**.

## Publishing

Each package is published independently via manual GitHub Actions workflow dispatch:

- **publish.yml** — publishes `@unwarkz/n8n-nodes-assistant-set` from `package/`
- **publish-mem0.yml** — publishes `@unwarkz/n8n-nodes-mem0` from `mem0-package/`
- **publish-gotenberg-pdf.yml** — publishes `@unwarkz/n8n-nodes-gotenberg-pdf` from `gotenberg-package/`
- **publish-telegram-bot.yml** — publishes `@unwarkz/n8n-nodes-telegram-bot` from `telegram-bot-package/`
- **publish-outline-wiki.yml** — publishes `@unwarkz/n8n-nodes-outline-wiki` from `outline-package/`
- **publish-qdrant.yml** — publishes `@unwarkz/n8n-nodes-qdrant` from `qdrant-package/`

## License

MIT
