# @unwarkz/n8n-nodes-mem0

[![npm version](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-mem0.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-mem0)

N8N community node for [Mem0](https://mem0.ai/) — intelligent memory layer for AI applications.

_**Please star the repo if you use my nodes - I will know that it is needed to someone except me.**_

## Features

### Mem0 (CRUD Node)
Full memory management node:
- **Add** — store new memories with metadata, categories, and scope IDs
- **Search** — semantic / hybrid search across stored memories
- **Advanced Search** — search with filters, metadata, and custom scoring
- **Update** — modify existing memories
- **Delete** — remove specific memories or bulk delete
- **History** — retrieve memory history for an entity
- **Get All** — list all memories with optional filters

### Mem0 Memory (AI Agent Memory Source)
Memory source for the n8n AI Agent node — exposes stored memories through the Agent's Memory port for conversational context.

### Mem0 AI Tools (AI Agent Tools)
Tools provider for the n8n AI Agent node — exposes search, add, get, and delete operations as callable tools that the agent can use autonomously.

## Installation

### Via Community Nodes (recommended)
1. Go to **Settings > Community Nodes** and click **Install**
2. Enter `@unwarkz/n8n-nodes-mem0`
3. Confirm and restart n8n

### Manual
```bash
cd ~/.n8n/nodes
npm install @unwarkz/n8n-nodes-mem0
```

## Credential Setup

- **Mem0 Cloud** (`api.mem0.ai`): generate a key at *Dashboard > API Keys* and register it under **Credentials > Mem0 API**
- **Mem0 Self-Hosted**: provide the instance URL and optional API key under **Mem0 Self-Hosted API**

Compatible with [arti2 mem0-service](https://github.com/unwarkz/arti2) self-hosted instances.

## Part of the Assistant Set

This package is also included in the full [@unwarkz/n8n-nodes-assistant-set](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) package alongside Gotenberg PDF and Telegram Bot nodes.

## License

MIT
