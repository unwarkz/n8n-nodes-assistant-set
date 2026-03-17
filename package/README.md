# @unwarkz/n8n-nodes-assistant-set

[![npm version](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-assistant-set.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set)

## Introduction

Full assistant node set for [n8n](https://n8n.io/) — includes **Mem0** intelligent memory, **Gotenberg** PDF conversion, and **Telegram Bot** API nodes (both regular and AI Agent tool variants).

Each component is also available as a standalone package:
- [@unwarkz/n8n-nodes-mem0](https://www.npmjs.com/package/@unwarkz/n8n-nodes-mem0)
- [@unwarkz/n8n-nodes-gotenberg-pdf](https://www.npmjs.com/package/@unwarkz/n8n-nodes-gotenberg-pdf)
- [@unwarkz/n8n-nodes-telegram-bot](https://www.npmjs.com/package/@unwarkz/n8n-nodes-telegram-bot)

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

### Credential setup
- **Mem0 Cloud (api.mem0.ai)**: generate a key at *Dashboard > API Keys* and register it under **Credentials > Mem0 API**.
- **Mem0 Self-Hosted**: provide the instance URL and optional API key under **Mem0 Self-Hosted API**.
- **Gotenberg**: provide the base URL of your Gotenberg instance under **Credentials > Gotenberg API**.
- **Telegram Bot**: create a bot via [@BotFather](https://t.me/BotFather) and register the token under **Credentials > Telegram Bot API**.

## Included Nodes

| Node | Description |
|------|-------------|
| **Mem0** | Full CRUD node — add, search, update, delete memories and manage entities, organizations, and projects. |
| **Mem0 Memory** | Memory source for the AI Agent node — exposes stored memories through the AI Agent's Memory port. |
| **Mem0 AI Tools** | Tools provider for the AI Agent node — exposes search, add, get, and delete operations as callable tools. |

---

32 AI-agent-ready tools for the n8n AI Agent node:

| Tool | Description |
|------|-------------|
| `telegram_send_message` | Send text messages with formatting |
| `telegram_send_photo` | Send photos (file_id, URL, or binary property reference) |
| `telegram_send_document` | Send documents/files (accepts binary property reference from other tools) |
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
| `gotenberg_url_to_pdf` | Convert a public URL to a PDF |
| `gotenberg_html_to_pdf` | Convert an HTML string to PDF |
| `gotenberg_url_screenshot` | Take a screenshot of a URL |
| `gotenberg_libreoffice_convert` | Convert an office document to PDF (accepts binary property reference) |
| `gotenberg_merge_pdfs` | Merge multiple PDFs into one (accepts binary property references) |
| `gotenberg_split_pdf` | Split a PDF into parts (accepts binary property reference) |
| `gotenberg_flatten_pdf` | Flatten a PDF (accepts binary property reference) |
| `gotenberg_read_pdf_metadata` | Read metadata from a PDF (accepts binary property reference) |


## Node Reference

### Mem0 (CRUD Node)

#### Common Parameters
- **Authentication Type**: choose between Cloud (`api.mem0.ai`) and Self-Hosted.
- **Resource**: Memory, Entity, Organization, or Project.
- **Operation**: changes based on the selected resource (Add, Search, Advanced Search, Update, Delete, History, etc.).
- **Scope IDs** (User ID, Agent ID, App ID, Run ID): anchor the memory to specific users / agents / applications.
- **Additional Fields / Update Fields**: custom metadata, categories, include/exclude field lists.

#### Resource: Memory

##### Add
- **Message Content**: the main text to remember.
- **Message Role**: `user`, `assistant`, or `system`.
- **User ID / Agent ID / App ID / Run ID**: optional identifiers.
- **Metadata** (key-value collection).
- **Custom Categories** (key-value collection).
- **Include Only / Exclude Fields / Automatic Inference**: control what Mem0 processes.

##### Semantic Search (`/v1/memories/search/` on cloud, `/search` on self-hosted)
- **Search Query**: natural language text.
- **Number of Results (topK)**, **Rerank Results**, **Fields to Return**.
- **Filter by Metadata**: key-value collection that adds metadata filters to the request body.

##### Advanced Search (v2)
- **Search Query**.
- **Options**: topK, rerank, fields (same as basic search).
- **Advanced Filters** *(no-code)*: collection of rules, each with:
  - **Field**: e.g. `memory`, `user_id`, `metadata.category`
  - **Operation**: Equals, Not Equals, Contains, Greater Than, Less Than
  - **Value**: string; numbers / booleans / JSON are interpreted automatically
  - Rules are combined with AND and sent to the search endpoint.

##### List Multiple (getAll)
Returns memories filtered by `user_id`, `agent_id`, `app_id`, `run_id`.

##### Get, Update, Delete, Delete All, History
Parameterized by **Memory ID** or scope filters. Update allows editing `text` and metadata.

#### Resource: Entity
- **Operations**: Create, Get, List Multiple, Update, Delete.
- **Entity Type**: user, agent, app, run.
- **Entity ID**: text identifier.

---

### Mem0 Memory (AI Agent Memory Port)

Connect the `ai_memory` output to an **AI Agent** node's **Memory** input.

#### Parameters
- **Authentication**: Cloud or Self-Hosted.
- **Thread ID**: unique conversation identifier. Defaults to `$json.threadId || $executionId`.
- **Context Retrieval Mode**:
  - **Basic**: returns raw memories (all or last *N*).
  - **Summary**: builds a summarised text from retrieved memories.
  - **Semantic (v1)**: uses the search endpoint with query, topK, rerank, fields.
  - **Semantic (v2)**: uses the search endpoint with advanced filters, topK, rerank, fields.
  - **Hybrid** *(advanced)*: combines recent memories (GET `/v1/memories/`) with semantic search, applies time-decay, alpha weighting, MMR, and delivers the most relevant ranking to the agent.
- **Query**: suggested `={{ $json.query || $json.lastUserMessage }}`.
- **Memory Key**: JSON key sent to the AI Agent (default `chat_history`).

#### How it Works with the AI Agent
When connected to the AI Agent's Memory port, the node:
1. Implements `loadMemoryVariables(values)` — fetches relevant memories and returns them to the agent as context.
2. Implements `saveContext(inputValues, outputValues)` — automatically saves each conversation turn (user input + assistant response) back to Mem0 after the agent responds.

#### Advanced (collection)
| Option | Description |
|--------|-------------|
| User ID / Agent ID / App ID / Run ID | Identifiers for GET / POST operations |
| Top K | Number of memories in semantic or hybrid mode (default 25) |
| Rerank / Fields | Applicable in semantic modes |
| Filters (JSON) | Filters sent to search (Semantic v2 and Hybrid) |
| Last N (recent) | Limits recent memories in Basic, Summary, or Hybrid |
| Alpha (semantic weight) | Semantic relevance vs. recency score weight in Hybrid (default 0.65) |
| Half-life (hours) | Half-life for time decay (default 48 h) |
| Maximum to Return | Final cap on memories delivered to the AI Agent |
| MMR (diversity) / MMR Lambda | Maximal Marginal Relevance controls |
| Save Context | When enabled, conversation turns are saved to Mem0 automatically |

---

### Mem0 AI Tools (AI Agent Tools Port)

Connect the `ai_tool` output to an **AI Agent** node's **Tools** input.

#### Parameters
- **Authentication**: Cloud or Self-Hosted.
- **User ID / Agent ID / Run ID**: default scope applied to all tool calls.
- **Tools to Enable**: select which tools to expose.
- **Search Options**: topK, rerank (applies when Search Memory is enabled).

#### Available Tools

| Tool Name | Description |
|-----------|-------------|
| `mem0_search_memory` | Semantic search over stored memories. Input: `{"query": "...", "top_k": 5}` |
| `mem0_add_memory` | Save a new memory. Input: `{"content": "...", "role": "user"}` |
| `mem0_get_all_memories` | Get all memories for the configured scope. |
| `mem0_delete_memory` | Delete a memory by ID. Input: `{"memory_id": "..."}` |
| `mem0_get_memory_history` | Get change history of a memory. Input: `{"memory_id": "..."}` |

Each tool accepts a JSON string input and returns a JSON string output that the AI Agent can use to formulate its response.

---

## Self-Hosted API Compatibility

This package is designed to work with the self-hosted Mem0 REST API. Key differences handled automatically:

| Endpoint | Cloud (api.mem0.ai) | Self-Hosted  |
|----------|--------------------|--------------------|
| Semantic search | `POST /v1/memories/search/` | `POST /search` |
| V2 / advanced search | `POST /v2/memories/search/` | `POST /search` |
| All other endpoints | Same path on both |

The node automatically translates endpoints when **Self-Hosted** authentication is selected.

### Additional Self-Hosted Endpoints (accessible via Mem0 node)
- `GET /health` — service status
- `GET /config` — current LLM / embedder configuration
- `POST /config/switch` — switch LLM provider on the fly
- `POST /reset` — reset all memories

---

## Usage Examples

### 1. Search memories with advanced filters
1. Drag **Mem0** and select *Resource = Memory*, *Operation = Advanced Search*.
2. Enter a query (e.g. "ACME client preferences").
3. Use **Advanced Filters** to add a rule: Field = `metadata.segment`, Operation = Equals, Value = `enterprise`.
4. Optionally adjust Top K, Fields, and Rerank.
5. Connect the output to your workflow (Set, Merge, etc.).

### 2. Connect Mem0 Memory to an AI Agent (Hybrid mode)
1. Add **Mem0 Memory** and configure credentials.
2. Set **Context Retrieval Mode** to *Hybrid*.
3. Set **Query** to `={{ $json.lastUserMessage }}` and **Memory Key** to `chat_history`.
4. (Optional) Adjust Last N, Top K, Alpha, and Half-life.
5. Connect the `ai_memory` output to the **Memory** port of the *AI Agent* node.
6. The agent will now retrieve relevant memories as context and automatically save each turn.

### 3. Give the AI Agent Mem0 tools
1. Add **Mem0 AI Tools** and configure credentials.
2. Set a default **User ID** to scope all tool calls.
3. Enable the tools you need (Search Memory, Add Memory, etc.).
4. Connect the `ai_tool` output to the **Tools** port of the *AI Agent* node.
5. The agent can now call `mem0_search_memory`, `mem0_add_memory`, etc. autonomously.

---
### Telegram Bot Node
Full CRUD node covering the complete [Telegram Bot API](https://core.telegram.org/bots/api):

- **Messages**: sendMessage, forwardMessage, copyMessage, sendPhoto, sendAudio, sendDocument, sendVideo, sendAnimation, sendVoice, sendVideoNote, sendMediaGroup, sendLocation, sendVenue, sendContact, sendPoll, sendDice, sendChatAction, editMessageText, editMessageCaption, editMessageMedia, editMessageReplyMarkup, editMessageLiveLocation, stopMessageLiveLocation, stopPoll, deleteMessage, deleteMessages
- **Chat Management**: getChat, getChatAdministrators, getChatMemberCount, getChatMember, banChatMember, unbanChatMember, restrictChatMember, promoteChatMember, setChatAdministratorCustomTitle, setChatPermissions, exportChatInviteLink, createChatInviteLink, editChatInviteLink, revokeChatInviteLink, approveChatJoinRequest, declineChatJoinRequest, setChatPhoto, deleteChatPhoto, setChatTitle, setChatDescription, pinChatMessage, unpinChatMessage, unpinAllChatMessages, leaveChat, setChatMenuButton, getChatMenuButton, setChatStickerSet, deleteChatStickerSet
- **Bot Info**: getMe, logOut, close, getMyCommands, setMyCommands, deleteMyCommands, getMyName, setMyName, getMyDescription, setMyDescription, getMyShortDescription, setMyShortDescription
- **Webhooks**: setWebhook, deleteWebhook, getWebhookInfo
- **Files**: getFile (download with binary data support)
- **Stickers**: sendSticker, getStickerSet, getCustomEmojiStickers, uploadStickerFile, createNewStickerSet, addStickerToSet, setStickerPositionInSet, deleteStickerFromSet, deleteStickerSet, setStickerSetThumbnail
- **Inline**: answerInlineQuery, answerWebAppQuery
- **Payments**: sendInvoice, createInvoiceLink, answerShippingQuery, answerPreCheckoutQuery
- **Forum Topics**: createForumTopic, editForumTopic, closeForumTopic, reopenForumTopic, deleteForumTopic, unpinAllForumTopicMessages, editGeneralForumTopic, closeGeneralForumTopic, reopenGeneralForumTopic, hideGeneralForumTopic, unhideGeneralForumTopic
- **Games**: sendGame, setGameScore, getGameHighScores
- **Updates**: getUpdates

## Cross-Tool Data Interop

The AI Tools nodes use **n8n native binary references** for file exchange — no base64 in the AI context.
Tools that produce files store them via `prepareBinaryData` and return a `binaryPropertyName`.
Tools that consume files accept a `binary_property_name` parameter and read data via `getBinaryDataBuffer`.
Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`.

**Example workflows with AI Agent:**
- Download document from Telegram → Convert with Gotenberg → Send back to Telegram
- Generate PDF with Gotenberg → Send to Telegram chat
- Receive photo in Telegram → Process → Reply with result

### Regular Node (Gotenberg)

Convert and manipulate PDFs from n8n workflows:

**Chromium Engine**
- 🌐 **URL to PDF** — Render any public URL as a PDF using headless Chromium
- 📄 **HTML to PDF** — Convert binary HTML documents to PDF
- 📸 **URL to Screenshot** — Take PNG/JPEG/WebP screenshots of any URL
- 🖼 **HTML to Screenshot** — Take screenshots of HTML binary files

**LibreOffice Engine**
- 📝 **Convert to PDF** — Convert Word, Excel, PowerPoint, ODT, ODS, ODP, CSV and more to PDF

**PDF Engines**
- 🔀 **Merge PDFs** — Combine multiple PDFs into a single file (ordered by filename)
- ✂️ **Split PDF** — Split a PDF by equal intervals or custom page ranges
- 🔄 **Convert PDF** — Convert to PDF/A formats (PDF/A-1a, PDF/A-2b, PDF/A-3b)
- 📐 **Flatten PDF** — Flatten annotations and interactive form fields
- 🔍 **Read Metadata** — Read PDF metadata properties (Author, Title, etc.) as JSON
- ✏️ **Write Metadata** — Write custom metadata properties into a PDF

## Prerequisites

1. A running [Gotenberg](https://gotenberg.dev/docs/getting-started/installation) instance:
   ```bash
   docker run --rm -p 3000:3000 gotenberg/gotenberg:8
   ```

2. n8n version ≥ 1.0.0

## Configuration

Create a **Gotenberg API** credential with:
- **Base URL**: URL of your Gotenberg instance (default: `http://localhost:3000`)
- **Username** / **Password**: Optional HTTP Basic Auth credentials (if Gotenberg is configured with `--api-basic-auth-username` / `--api-basic-auth-password`)

## Usage Examples

### Convert a URL to PDF

1. Add a **Gotenberg** node
2. Set Resource: **Chromium**, Operation: **URL to PDF**
3. Enter the URL
4. Optionally configure paper size, margins, landscape, etc.
5. The output binary property (`data`) will contain the PDF

### Convert a Word document to PDF

1. Read the .docx file (e.g., using a **Read Binary File** node)
2. Add a **Gotenberg** node
3. Set Resource: **LibreOffice**, Operation: **Convert to PDF**
4. Set Binary Property to match the property name from the previous node
5. The output will be the converted PDF

### Use with AI Agent

1. Add a **Gotenberg AI Tools** node
2. Select which tools to enable
3. Connect the **Tool** output to an AI Agent node's **Tools** input
4. The AI can now generate PDFs, take screenshots, and process documents





## License
MIT. Do not commit sensitive information (API keys, personal data) to your workflows or to the npm registry.
