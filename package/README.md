# @unwarkz/n8n-nodes-assistant-set

[![npm version](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-assistant-set.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Full AI-assistant node set for [n8n](https://n8n.io/) — **Mem0** intelligent memory, **Gotenberg** PDF conversion, **Telegram Bot** messaging, **Outline Wiki** knowledge base, and **Qdrant** vector store. All nodes include both regular workflow variants and AI Agent tool variants.

_**Please star the repo if you use my nodes - I will know that it is needed to someone except me.**_

Each component is also available as a standalone package:
- [@unwarkz/n8n-nodes-mem0](https://www.npmjs.com/package/@unwarkz/n8n-nodes-mem0)
- [@unwarkz/n8n-nodes-gotenberg-pdf](https://www.npmjs.com/package/@unwarkz/n8n-nodes-gotenberg-pdf)
- [@unwarkz/n8n-nodes-telegram-bot](https://www.npmjs.com/package/@unwarkz/n8n-nodes-telegram-bot)
- [@unwarkz/n8n-nodes-outline-wiki](https://www.npmjs.com/package/@unwarkz/n8n-nodes-outline-wiki)
- [@unwarkz/n8n-nodes-qdrant](https://www.npmjs.com/package/@unwarkz/n8n-nodes-qdrant)

## Installation

### Via Community Nodes panel (recommended)

1. Go to **Settings > Community Nodes** and click **Install**.
2. Enter `@unwarkz/n8n-nodes-assistant-set`.
3. Confirm and restart n8n.

### Manual installation

```bash
cd ~/.n8n/nodes
npm install @unwarkz/n8n-nodes-assistant-set
```

Restart n8n to load the nodes.

## Credential Setup

| Credential | How to obtain |
|------------|--------------|
| **Mem0 API** | [Mem0 Dashboard](https://app.mem0.ai) > API Keys |
| **Mem0 Self-Hosted API** | Your instance URL + optional API key |
| **Gotenberg API** | Your Gotenberg instance URL (default: `http://localhost:3000`) |
| **Telegram Bot API** | [@BotFather](https://t.me/BotFather) — create a bot and copy the token |
| **Outline API** | Your Outline instance URL + API token from Settings > API |
| **Qdrant API** | Your Qdrant instance URL + optional API key |

## Included Nodes

### Mem0 — Intelligent Memory Layer

| Node | Output | Description |
|------|--------|-------------|
| **Mem0** | main | Full CRUD: add, search, update, delete memories; manage entities, organizations, projects |
| **Mem0 Memory** | ai_memory | Memory source for the AI Agent node — retrieves and saves conversation context |
| **Mem0 AI Tools** | ai_tool | Tools for the AI Agent: `mem0_search_memory`, `mem0_add_memory`, `mem0_get_all_memories`, `mem0_delete_memory`, `mem0_get_memory_history` |

#### Mem0 Memory — Context Retrieval Modes

| Mode | Description |
|------|-------------|
| **Basic** | Returns raw stored memories (all or last N) |
| **Summary** | Builds a summarized text block from retrieved memories |
| **Semantic (v1)** | Vector search with query, topK, rerank, fields |
| **Semantic (v2)** | Advanced search with structured filters, topK, rerank, fields |
| **Hybrid** | Combines recent memories + semantic search with time-decay scoring, alpha weighting, and MMR diversity |

The memory node implements `loadMemoryVariables` to inject context into the agent and `saveContext` to persist conversation turns back to Mem0 automatically.

### Gotenberg — PDF Conversion

Requires a running [Gotenberg](https://gotenberg.dev/docs/getting-started/installation) instance:

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

| Node | Output | Description |
|------|--------|-------------|
| **Gotenberg** | main | Convert HTML/URL to PDF, office documents to PDF, screenshots, merge/split/flatten/convert PDFs, read/write metadata |
| **Gotenberg AI Tools** | ai_tool | Same operations as AI Agent tools |

#### Gotenberg Operations

| Resource | Operation | Description |
|----------|-----------|-------------|
| Chromium | URL to PDF | Render any public URL as PDF |
| Chromium | HTML to PDF | Convert binary HTML to PDF |
| Chromium | URL to Screenshot | Take PNG/JPEG/WebP screenshot of a URL |
| Chromium | HTML to Screenshot | Screenshot a binary HTML file |
| LibreOffice | Convert to PDF | Convert Word, Excel, PowerPoint, ODT, ODS, ODP, CSV, etc. |
| PDF Engines | Merge PDFs | Combine multiple PDFs into one |
| PDF Engines | Split PDF | Split by page intervals or custom ranges |
| PDF Engines | Convert PDF | Convert to PDF/A (PDF/A-1a, PDF/A-2b, PDF/A-3b) |
| PDF Engines | Flatten PDF | Flatten annotations and form fields |
| PDF Engines | Read Metadata | Read PDF metadata as JSON |
| PDF Engines | Write Metadata | Write custom metadata into a PDF |

### Telegram Bot — Full Bot API

| Node | Output | Description |
|------|--------|-------------|
| **Telegram Bot** | main | 100+ operations covering the complete [Telegram Bot API](https://core.telegram.org/bots/api) |
| **Telegram Bot AI Tools** | ai_tool | 24 AI Agent tools for messaging, file transfer, and chat management |

#### Telegram Bot AI Tools

| Tool | Description |
|------|-------------|
| `telegram_send_message` | Send text messages with formatting |
| `telegram_send_photo` | Send photos (file_id, URL, or binary property reference) |
| `telegram_send_document` | Send documents/files |
| `telegram_send_video` | Send videos |
| `telegram_send_audio` | Send audio files |
| `telegram_send_voice` | Send voice messages |
| `telegram_send_location` | Send GPS locations |
| `telegram_send_contact` | Send contact cards |
| `telegram_send_poll` | Create polls |
| `telegram_forward_message` | Forward messages between chats |
| `telegram_edit_message` | Edit sent messages |
| `telegram_delete_message` | Delete messages |
| `telegram_get_file` | Download files (stores in binary property for cross-tool use) |
| `telegram_send_chat_action` | Show typing/uploading indicators |
| `telegram_get_chat` | Get chat information |
| `telegram_send_sticker` | Send stickers |
| `telegram_send_media_group` | Send photo/document albums |
| `telegram_answer_inline_query` | Answer inline queries |
| `telegram_pin_message` | Pin messages |
| `telegram_unpin_message` | Unpin messages |
| `telegram_send_invoice` | Send payment invoices |
| `telegram_get_me` | Get bot info |
| `telegram_set_webhook` | Configure webhook |
| `telegram_delete_webhook` | Remove webhook |

#### Telegram Bot Node — Full API Coverage

- **Messages**: sendMessage, forwardMessage, copyMessage, sendPhoto, sendAudio, sendDocument, sendVideo, sendAnimation, sendVoice, sendVideoNote, sendMediaGroup, sendLocation, sendVenue, sendContact, sendPoll, sendDice, sendChatAction, editMessageText, editMessageCaption, editMessageMedia, editMessageReplyMarkup, deleteMessage, deleteMessages
- **Chat Management**: getChat, getChatAdministrators, getChatMemberCount, getChatMember, banChatMember, unbanChatMember, restrictChatMember, promoteChatMember, setChatPermissions, exportChatInviteLink, createChatInviteLink, editChatInviteLink, revokeChatInviteLink, approveChatJoinRequest, declineChatJoinRequest, setChatPhoto, setChatTitle, pinChatMessage, unpinChatMessage, leaveChat
- **Bot Info**: getMe, logOut, getMyCommands, setMyCommands, deleteMyCommands, getMyName, setMyName, getMyDescription, setMyDescription
- **Webhooks**: setWebhook, deleteWebhook, getWebhookInfo
- **Files**: getFile (download with binary data)
- **Stickers**: sendSticker, getStickerSet, createNewStickerSet, addStickerToSet, deleteStickerFromSet
- **Inline**: answerInlineQuery, answerWebAppQuery
- **Payments**: sendInvoice, createInvoiceLink, answerShippingQuery, answerPreCheckoutQuery
- **Forum Topics**: createForumTopic, editForumTopic, closeForumTopic, reopenForumTopic, deleteForumTopic
- **Games**: sendGame, setGameScore, getGameHighScores
- **Updates**: getUpdates

### Outline Wiki — Knowledge Base

| Node | Output | Description |
|------|--------|-------------|
| **Outline Wiki** | main | Full CRUD for all Outline API resources |
| **Outline Wiki AI Tools** | ai_tool | 31 operations as AI Agent tools |

#### Outline Wiki — Supported Resources and Operations

| Resource | Operations |
|----------|-----------|
| **Documents** | search, searchTitles, create, get, update, delete, list, import (binary), export (binary), archive, restore, move, aiQuestion |
| **Collections** | list, create, get, update, delete, documentTree, export |
| **Comments** | list, create, update, delete |
| **Attachments** | upload (binary → S3 signed URL), delete |
| **Users** | list, get |
| **Shares** | create, list, revoke |

Attachments use a two-step upload: `POST /api/attachments.create` to obtain a signed S3 URL, then a multipart POST directly to S3.

### Qdrant — Vector Store Knowledgebase

| Node | Output | Description |
|------|--------|-------------|
| **Qdrant Store AI Tools** | ai_tool | Embed text and binary files into Qdrant using a connected Embedding model sub-node |
| **Qdrant AI Tools** | ai_tool | Full Qdrant operations as AI Agent tools |

#### Qdrant AI Tools — Operations

| Category | Operations |
|----------|-----------|
| **Search** | Semantic search (with optional Reranker sub-node), recommend |
| **Points** | scroll, get, upsert, delete, count |
| **Collections** | list, create, get, update, delete |
| **Snapshots** | create, list, delete |

The Qdrant Store node supports multimodal embedders with automatic base64 fallback for binary files.

## Cross-Tool Binary File Interoperability

AI Tools nodes exchange binary files via **n8n native binary references** — no base64 encoding in the AI context window. Tools that produce files store them via `prepareBinaryData` and return a `binaryPropertyName`. Tools that consume files accept a `binary_property_name` parameter and read data via `getBinaryDataBuffer`. Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`.

**Example AI Agent workflows:**

```
Download file from Telegram   →  Convert with Gotenberg         →  Send back via Telegram
Generate PDF from URL         →  Store reference in Mem0        →  Send via Telegram
Receive Telegram attachment   →  Import into Outline Wiki       →  Embed as Outline attachment
Export Outline document       →  Convert to PDF with Gotenberg  →  Send PDF via Telegram
Download image from Telegram  →  Embed with Qdrant Store        →  Search similar images
```

## Node Reference

### Mem0 CRUD Node — Parameters

#### Common Parameters

| Parameter | Description |
|-----------|-------------|
| Authentication Type | Cloud (`api.mem0.ai`) or Self-Hosted |
| Resource | Memory, Entity, Organization, or Project |
| Operation | Depends on resource (Add, Search, Advanced Search, Update, Delete, History, etc.) |
| User ID / Agent ID / App ID / Run ID | Scope identifiers for memory operations |

#### Memory — Advanced Search Filters

Build structured filter rules in the UI:
- **Field**: e.g., `memory`, `user_id`, `metadata.category`
- **Operation**: Equals, Not Equals, Contains, Greater Than, Less Than
- **Value**: string; numbers, booleans, and JSON are parsed automatically
- Rules are combined with AND and sent to the v2 search endpoint

### Mem0 Memory — Advanced Options

| Option | Description |
|--------|-------------|
| User ID / Agent ID / App ID / Run ID | Scope identifiers |
| Top K | Number of memories in semantic or hybrid mode (default: 25) |
| Rerank / Fields | Available in semantic modes |
| Filters (JSON) | Extra filters for Semantic v2 and Hybrid modes |
| Last N (recent) | Limit recent memories in Basic, Summary, or Hybrid |
| Alpha (semantic weight) | Semantic vs. recency balance in Hybrid (default: 0.65) |
| Half-life (hours) | Time-decay half-life in Hybrid (default: 48 h) |
| Maximum to Return | Final cap on memories delivered to the AI Agent |
| MMR / MMR Lambda | Maximal Marginal Relevance diversity controls |
| Save Context | When enabled, conversation turns are persisted to Mem0 automatically |

### Self-Hosted Mem0 API Compatibility

| Endpoint | Cloud (`api.mem0.ai`) | Self-Hosted |
|----------|----------------------|-------------|
| Semantic search | `POST /v1/memories/search/` | `POST /search` |
| Advanced search | `POST /v2/memories/search/` | `POST /search` |
| All other endpoints | Same path on both | Same path on both |

Additional self-hosted-only endpoints accessible via the Mem0 node:
- `GET /health` — service status
- `GET /config` — current LLM/embedder configuration
- `POST /config/switch` — switch LLM provider
- `POST /reset` — reset all memories

## Usage Examples

### 1. Search memories with advanced filters

1. Add a **Mem0** node. Set Resource = **Memory**, Operation = **Advanced Search**.
2. Enter a query (e.g., "ACME client preferences").
3. Add a filter rule: Field = `metadata.segment`, Operation = Equals, Value = `enterprise`.
4. Adjust Top K, Fields, and Rerank as needed.
5. Connect the output to your workflow.

### 2. Connect Mem0 Memory to an AI Agent (Hybrid mode)

1. Add a **Mem0 Memory** node and configure credentials.
2. Set Context Retrieval Mode to **Hybrid**.
3. Set Query to `={{ $json.lastUserMessage }}` and Memory Key to `chat_history`.
4. Adjust Last N, Top K, Alpha, and Half-life as needed.
5. Connect the `ai_memory` output to the **Memory** port of the AI Agent node.

### 3. Convert a URL to PDF with AI Agent

1. Add a **Gotenberg AI Tools** node. Select the `gotenberg_url_to_pdf` tool.
2. Connect the `ai_tool` output to the **Tools** port of the AI Agent node.
3. The agent can now generate PDFs from URLs on demand.

### 4. Give the AI Agent Telegram messaging tools

1. Add a **Telegram Bot AI Tools** node. Configure credentials.
2. Enable the tools you need (e.g., `telegram_send_message`, `telegram_get_file`).
3. Connect the `ai_tool` output to the **Tools** port of the AI Agent node.

### 5. Embed documents into Qdrant

1. Add a **Qdrant Store AI Tools** node. Configure credentials.
2. Connect an Embedding model sub-node to the **Embedding** input.
3. Connect the `ai_tool` output to the **Tools** port of the AI Agent node.
4. The agent can now embed and retrieve documents from Qdrant.

## Requirements

- n8n >= 1.0.0
- For Gotenberg nodes: a running [Gotenberg](https://gotenberg.dev) instance
- For Mem0 nodes: a [Mem0 Cloud account](https://app.mem0.ai) or self-hosted Mem0 API
- For Telegram nodes: a Telegram Bot token from [@BotFather](https://t.me/BotFather)
- For Outline nodes: a running [Outline](https://www.getoutline.com) instance + API token
- For Qdrant nodes: a running [Qdrant](https://qdrant.tech) instance

## License

MIT. Do not commit sensitive information (API keys, personal data) to your workflows or to the npm registry.
