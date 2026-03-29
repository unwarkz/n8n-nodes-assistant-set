# n8n-nodes-gotenberg-pdf

An n8n community node package for [Gotenberg](https://gotenberg.dev/) — a Docker-based stateless API for PDF file management.

_**Please star the repo if you use my nodes - I will know that it is needed to someone except me.**_

## Features

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

### AI Tools Node (Gotenberg AI Tools)

Connect to an n8n AI Agent node to give it PDF capabilities:

| Tool | Description |
|------|-------------|
| `gotenberg_url_to_pdf` | Convert a public URL to a PDF (stores in binary property) |
| `gotenberg_html_to_pdf` | Convert an HTML string to PDF (stores in binary property) |
| `gotenberg_url_screenshot` | Take a screenshot of a URL (stores in binary property) |
| `gotenberg_libreoffice_convert` | Convert an office document to PDF (accepts binary property reference) |
| `gotenberg_merge_pdfs` | Merge multiple PDFs into one (accepts binary property references) |
| `gotenberg_split_pdf` | Split a PDF into parts (accepts binary property reference) |
| `gotenberg_flatten_pdf` | Flatten a PDF (accepts binary property reference) |
| `gotenberg_read_pdf_metadata` | Read metadata from a PDF (accepts binary property reference) |

All tools use **n8n native binary references** instead of base64. Tools that produce files store them
in n8n's binary data system and return a `binaryPropertyName`. Tools that consume files accept
a `binary_property_name` parameter. Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`.

## Prerequisites

1. A running [Gotenberg](https://gotenberg.dev/docs/getting-started/installation) instance:
   ```bash
   docker run --rm -p 3000:3000 gotenberg/gotenberg:8
   ```

2. n8n version ≥ 1.0.0

## Installation

```bash
npm install n8n-nodes-gotenberg-pdf
```

Or install via the n8n UI: **Settings → Community Nodes → Install** → enter `n8n-nodes-gotenberg-pdf`.

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

## Part of the Assistant Set

This package is also included in the full [@unwarkz/n8n-nodes-assistant-set](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) package

## License

MIT © unwarkz
