# n8n-nodes-assistant-set

Monorepo for **n8n community node packages** — AI-powered assistant tools for [n8n](https://n8n.io/) workflows and AI agents.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| **[@unwarkz/n8n-nodes-assistant-set](./package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-assistant-set.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) | Full set: Mem0 + Gotenberg + Telegram Bot |
| **[@unwarkz/n8n-nodes-mem0](./mem0-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-mem0.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-mem0) | Mem0 intelligent memory layer |
| **[@unwarkz/n8n-nodes-gotenberg-pdf](./gotenberg-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-gotenberg-pdf.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-gotenberg-pdf) | Gotenberg PDF conversion |
| **[@unwarkz/n8n-nodes-telegram-bot](./telegram-bot-package/)** | [![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-telegram-bot.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-telegram-bot) | Telegram Bot API (full coverage) |

## Repository Structure

```
├── package/                    # Main source — @unwarkz/n8n-nodes-assistant-set
│   └── dist/
│       ├── credentials/        # All credential definitions
│       └── nodes/
│           ├── Mem0/           # Mem0 memory nodes
│           ├── gotenberg/      # Gotenberg PDF nodes
│           └── telegram/       # Telegram Bot nodes
├── mem0-package/               # Standalone — @unwarkz/n8n-nodes-mem0
├── gotenberg-package/          # Standalone — @unwarkz/n8n-nodes-gotenberg-pdf
├── telegram-bot-package/       # Standalone — @unwarkz/n8n-nodes-telegram-bot
└── .github/workflows/
    ├── publish.yml             # Publish assistant-set
    ├── publish-mem0.yml        # Publish mem0
    ├── publish-gotenberg-pdf.yml # Publish gotenberg-pdf
    └── publish-telegram-bot.yml  # Publish telegram-bot
```

All node source code lives in `package/dist/`. The standalone packages (`mem0-package/`, `gotenberg-package/`, `telegram-bot-package/`) have their dist files synced from `package/dist/` at publish time by GitHub Actions workflows.

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

## Cross-Tool Interoperability

AI tool nodes use a standardized data format for binary data exchange:

```json
{
  "success": true,
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeKb": 142,
  "base64": "JVBERi0xLjQ..."
}
```

This enables seamless chaining between tools in an AI Agent workflow:
- Download file from Telegram → Convert with Gotenberg → Send back to Telegram
- Generate PDF from URL → Store reference in Mem0 → Send via Telegram

## Installation

Install individual packages or the full set:

```bash
# Full set (all nodes)
npm install @unwarkz/n8n-nodes-assistant-set

# Individual packages
npm install @unwarkz/n8n-nodes-mem0
npm install @unwarkz/n8n-nodes-gotenberg-pdf
npm install @unwarkz/n8n-nodes-telegram-bot
```

Or install via n8n **Settings > Community Nodes**.

## Publishing

Each package is published independently via manual GitHub Actions workflow dispatch:

- **publish.yml** — publishes `@unwarkz/n8n-nodes-assistant-set` from `package/`
- **publish-mem0.yml** — publishes `@unwarkz/n8n-nodes-mem0` from `mem0-package/`
- **publish-gotenberg-pdf.yml** — publishes `@unwarkz/n8n-nodes-gotenberg-pdf` from `gotenberg-package/`
- **publish-telegram-bot.yml** — publishes `@unwarkz/n8n-nodes-telegram-bot` from `telegram-bot-package/`

## License

MIT
