# @unwarkz/n8n-nodes-outline-wiki

N8N community node for **[Outline Wiki](https://www.getoutline.com/)** — a beautiful, feature-rich knowledge base.
Exposes the full Outline REST API as an AI Agent tools node so your n8n AI agents can read, write, and manage your entire knowledge base.

[![npm](https://img.shields.io/npm/v/@unwarkz/n8n-nodes-outline-wiki.svg)](https://www.npmjs.com/package/@unwarkz/n8n-nodes-outline-wiki)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

### Outline Wiki AI Tools Node

Connect to an n8n **AI Agent** node to give it full read/write access to your Outline knowledge base.
Select which of the **31 tools** to expose:

#### Documents (13 tools)

| Tool | Description |
|------|-------------|
| `outline_search_documents` | Full-text search across all documents with optional collection/status/date filters |
| `outline_search_titles` | Fast title-only search (much faster than full-text) |
| `outline_create_document` | Create a new document (Markdown body, draft or published) |
| `outline_get_document` | Retrieve full document content by ID or URL slug |
| `outline_update_document` | Update title, body, or publish status |
| `outline_delete_document` | Move to trash (default) or permanently destroy |
| `outline_list_documents` | List documents with optional collection/parent/status filters |
| `outline_import_document` | Import a file (Markdown, DOCX, HTML, CSV…) as a new document — accepts `binary_property_name` from any prior tool |
| `outline_export_document` | Export a document as Markdown — stores in binary property for cross-tool use |
| `outline_archive_document` | Archive outdated content (restorable) |
| `outline_restore_document` | Restore an archived or deleted document |
| `outline_move_document` | Move to a different collection or parent |
| `outline_answer_question` | Natural-language AI query against your knowledge base *(Business/Enterprise/Cloud only)* |

#### Collections (7 tools)

| Tool | Description |
|------|-------------|
| `outline_list_collections` | List all accessible collections |
| `outline_create_collection` | Create a new collection with name, description, icon, color, and permissions |
| `outline_get_collection` | Retrieve collection details by UUID |
| `outline_update_collection` | Update name, description, or settings |
| `outline_delete_collection` | ⚠️ Delete a collection and ALL its documents (irreversible) |
| `outline_get_collection_documents` | Get the full document hierarchy/tree for a collection |
| `outline_export_collection` | Trigger a bulk Markdown/JSON/HTML export (returns FileOperation) |

#### Comments (4 tools)

| Tool | Description |
|------|-------------|
| `outline_list_comments` | List comments on a document or within a collection |
| `outline_create_comment` | Add a comment or threaded reply to a document |
| `outline_update_comment` | Edit an existing comment |
| `outline_delete_comment` | Delete a comment (and all its replies) |

#### Attachments (2 tools)

| Tool | Description |
|------|-------------|
| `outline_upload_attachment` | Upload a file (PNG, PDF, DOCX, ZIP…) to Outline cloud storage — accepts `binary_property_name`, returns attachment URL for embedding in documents |
| `outline_delete_attachment` | Permanently delete an attachment |

#### Users (2 tools)

| Tool | Description |
|------|-------------|
| `outline_list_users` | List workspace users (filterable by name/email) |
| `outline_get_user` | Get details for a specific user |

#### Shares (3 tools)

| Tool | Description |
|------|-------------|
| `outline_create_share` | Create a public share link for a document |
| `outline_list_shares` | List existing share links |
| `outline_revoke_share` | Revoke a share link |

---

## Binary File Interoperability

The AI Tools node uses **n8n native binary references** for file exchange — no base64 in the AI context.

- Tools that **produce** files store them in n8n's binary data system and return a `binaryPropertyName`.
- Tools that **consume** files accept a `binary_property_name` parameter and read data via `getBinaryDataBuffer`.
- Binary data is shared via `global._n8nBinaryRegistry` so files flow between all tool modules in the same agent run.
- Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`.

**Example AI agent chains:**

```
# Import a Telegram attachment into Outline
telegram_get_file({ file_id: "..." })
  → { binaryPropertyName: "telegram_file_0" }

outline_import_document({
  binary_property_name: "telegram_file_0",
  collection_id: "...",
  publish: true
})
  → { success: true, data: { id: "doc-...", title: "..." } }
```

```
# Export a document and send via Telegram
outline_export_document({ id: "doc-uuid", output_filename: "notes.md" })
  → { binaryPropertyName: "outline_file_0", sizeKb: 12 }

telegram_send_document({
  chat_id: "@mychat",
  binary_property_name: "outline_file_0"
})
```

```
# Upload a PDF from Gotenberg as an Outline attachment
gotenberg_url_to_pdf({ url: "https://example.com" })
  → { binaryPropertyName: "gotenberg_file_0" }

outline_upload_attachment({
  binary_property_name: "gotenberg_file_0",
  document_id: "doc-uuid"
})
  → { attachmentUrl: "https://cdn.outline.com/..." }
```

---

## Prerequisites

1. An **Outline** account — cloud ([app.getoutline.com](https://app.getoutline.com)) or self-hosted.
2. An **Outline API key** — generate one at **Settings → API & Apps**.  
   Keys always begin with `ol_api_`.
3. n8n version ≥ 1.0.0.

---

## Installation

### Via n8n Community Nodes (recommended)

1. Go to **Settings → Community Nodes**
2. Click **Install**
3. Enter: `@unwarkz/n8n-nodes-outline-wiki`
4. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install @unwarkz/n8n-nodes-outline-wiki
```

---

## Credential Setup

1. In n8n go to **Credentials → New Credential → Outline API**
2. Fill in:
   - **API Key** — your `ol_api_...` key from Outline Settings → API & Apps
   - **Base URL** — `https://app.getoutline.com` (or your self-hosted domain, e.g. `https://docs.example.com`)
3. Click **Test connection** — it will validate against `auth.info`
4. Save the credential

---

## Usage

1. Add an **Outline Wiki AI Tools** node to your workflow
2. Select the **Outline API** credential
3. Choose which tools to enable (all 31 are enabled by default)
4. Connect the **Tool** output to an **AI Agent** node's **Tools** input
5. The AI Agent can now read, write, search, and manage your Outline knowledge base

---

## API Coverage

This node covers the following Outline API endpoints:

| Category | Endpoints |
|----------|-----------|
| Documents | `documents.search`, `documents.search_titles`, `documents.create`, `documents.info`, `documents.update`, `documents.delete`, `documents.list`, `documents.import`, `documents.export`, `documents.archive`, `documents.restore`, `documents.move`, `documents.answerQuestion` |
| Collections | `collections.list`, `collections.create`, `collections.info`, `collections.update`, `collections.delete`, `collections.documents`, `collections.export` |
| Comments | `comments.list`, `comments.create`, `comments.update`, `comments.delete` |
| Attachments | `attachments.create` + signed S3/GCS upload, `attachments.delete` |
| Users | `users.list`, `users.info` |
| Shares | `shares.create`, `shares.list`, `shares.revoke` |

Reference: [Outline API Documentation](https://www.getoutline.com/developers) · [OpenAPI Spec](https://github.com/outline/openapi)

---

## Part of the Assistant Set

This package is also included in the full [@unwarkz/n8n-nodes-assistant-set](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) package, which bundles Mem0 memory, Gotenberg PDF, Telegram Bot, and Outline Wiki nodes together.

---

## License

MIT © unwarkz
