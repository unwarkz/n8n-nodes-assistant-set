# n8n-nodes-assistant-set

[![CI](https://github.com/unwarkz/n8n-nodes-assistant-set/actions/workflows/verify.yml/badge.svg)](https://github.com/unwarkz/n8n-nodes-assistant-set/actions/workflows/verify.yml)

Monorepo for **n8n community node packages** — AI-powered assistant tools for [n8n](https://n8n.io/) workflows and AI agents.

_**Please star the repo if you like it - I will know that it is needed to someone except me.**_

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
├── tests/                      # Automated verification tests (n8n guidelines)
└── .github/workflows/
    ├── verify.yml                # Run verification tests on every push/PR
    ├── publish.yml               # Publish @unwarkz/n8n-nodes-assistant-set
    ├── publish-mem0.yml          # Publish @unwarkz/n8n-nodes-mem0
    ├── publish-gotenberg-pdf.yml # Publish @unwarkz/n8n-nodes-gotenberg-pdf
    ├── publish-telegram-bot.yml  # Publish @unwarkz/n8n-nodes-telegram-bot
    ├── publish-outline-wiki.yml  # Publish @unwarkz/n8n-nodes-outline-wiki
    └── publish-qdrant.yml        # Publish @unwarkz/n8n-nodes-qdrant
```

All node source code lives in `package/dist/`. The standalone packages have their dist files synced from `package/dist/` at publish time by GitHub Actions. All packages are published with npm provenance statements from GitHub Actions.

## Included Nodes

### Mem0 — Intelligent Memory Layer

- **Mem0** — full CRUD node for memories, entities, organizations, projects
- **Mem0 Memory** — AI Agent memory source (`ai_memory` output port)
- **Mem0 AI Tools** — AI Agent tools: search, add, get, delete (`ai_tool` output port)

### Gotenberg — PDF Conversion

- **Gotenberg** — convert HTML/URL to PDF, office-to-PDF, merge/split/flatten PDFs, screenshots
- **Gotenberg AI Tools** — AI Agent tools for PDF operations (`ai_tool` output port)

### Telegram Bot — Full Bot API

- **Telegram Bot** — 100+ operations covering the complete Telegram Bot API
- **Telegram Bot AI Tools** — 24 AI Agent tools for messaging, files, chat management (`ai_tool` output port)

### Outline Wiki — Knowledge Base

- **Outline Wiki** — full CRUD workflow node for all Outline API resources:
  - **Documents**: search, search titles, create, get, update, delete, list, import (binary in), export (binary out), archive, restore, move, AI question answering
  - **Collections**: list, create, get, update, delete, document tree, export
  - **Comments**: list, create, update, delete
  - **Attachments**: upload (binary → S3 signed URL → attachment URL), delete
  - **Users**: list, get
  - **Shares**: create, list, revoke
- **Outline Wiki AI Tools** — same 31 operations exposed as AI Agent tools (`ai_tool` output port)

### Qdrant — Vector Store Knowledgebase

- **Qdrant Store AI Tools** — embed text and binary files into Qdrant using a connected Embedding model sub-node; supports multimodal embedders with automatic base64 fallback
- **Qdrant AI Tools** — full Qdrant operations: semantic search (with optional Reranker sub-node), scroll, get/upsert/delete points, count, recommend, collection management, snapshots

## Cross-Tool Interoperability

AI Tools nodes exchange binary files via n8n native binary references (no base64 in AI context). Tools that produce files store them via `prepareBinaryData` and return a `binaryPropertyName`; tools that consume files accept a `binary_property_name` parameter.

Example chains in an AI Agent workflow:

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

## Credential Setup

| Credential | Where to get it |
|------------|----------------|
| **Mem0 API** | [Mem0 Dashboard](https://app.mem0.ai) > API Keys |
| **Mem0 Self-Hosted API** | Your instance URL + optional API key |
| **Gotenberg API** | Your Gotenberg instance URL (default: `http://localhost:3000`) |
| **Telegram Bot API** | [@BotFather](https://t.me/BotFather) on Telegram |
| **Outline API** | Your Outline instance URL + API token |
| **Qdrant API** | Your Qdrant instance URL + optional API key |

## Publishing

Each package is published independently via manual GitHub Actions workflow dispatch with npm provenance:

| Workflow | Publishes |
|----------|-----------|
| `publish.yml` | `@unwarkz/n8n-nodes-assistant-set` from `package/` |
| `publish-mem0.yml` | `@unwarkz/n8n-nodes-mem0` from `mem0-package/` |
| `publish-gotenberg-pdf.yml` | `@unwarkz/n8n-nodes-gotenberg-pdf` from `gotenberg-package/` |
| `publish-telegram-bot.yml` | `@unwarkz/n8n-nodes-telegram-bot` from `telegram-bot-package/` |
| `publish-outline-wiki.yml` | `@unwarkz/n8n-nodes-outline-wiki` from `outline-package/` |
| `publish-qdrant.yml` | `@unwarkz/n8n-nodes-qdrant` from `qdrant-package/` |

## Development

```bash
# Run all verification tests
npm test

# Run only verification tests
npm run test:verify
```

Tests in `tests/verification.test.js` validate every publishable package against the [n8n verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/).

## License

MIT
