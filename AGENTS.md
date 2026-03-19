# AI Agent Instructions — n8n-nodes-assistant-set

This file provides instructions for AI coding agents working in this repository.

## Repository Overview

**n8n-nodes-assistant-set** is a monorepo containing n8n community node packages for AI-powered assistant workflows. All publishable packages follow the [n8n community node verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/).

### Package Layout

```
package/dist/          ← All node source code (JS only, no TypeScript source)
  credentials/         ← Credential definitions
  nodes/
    Mem0/              ← Mem0 memory nodes
    gotenberg/         ← Gotenberg PDF nodes
    telegram/          ← Telegram Bot nodes
    outline/           ← Outline Wiki nodes
    qdrant/            ← Qdrant vector store nodes
mem0-package/          ← Standalone @unwarkz/n8n-nodes-mem0
gotenberg-package/     ← Standalone @unwarkz/n8n-nodes-gotenberg-pdf
telegram-bot-package/  ← Standalone @unwarkz/n8n-nodes-telegram-bot
outline-package/       ← Standalone @unwarkz/n8n-nodes-outline-wiki
qdrant-package/        ← Standalone @unwarkz/n8n-nodes-qdrant
tests/                 ← Automated verification tests
```

The standalone packages (`mem0-package/`, `gotenberg-package/`, etc.) do **not** contain their own `dist/` source — their dist files are synced from `package/dist/` at publish time by GitHub Actions workflows.

## Coding Rules

### 1. JavaScript Only (No TypeScript Source)

All node code is in pre-built JavaScript files under `package/dist/`. There are no TypeScript source files in this repository. **All code changes must be made directly to the JS files in `package/dist/`.**

### 2. n8n Verification Guidelines Compliance

Every package must comply with the [n8n verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/). The key requirements are:

- `package.json` must include `n8n-community-node-package` in `keywords`
- `package.json` must declare `n8nNodesApiVersion` in the `n8n` section
- All credential and node files listed in `package.json` must exist
- Credentials must export `displayName`, `name`, `icon`, `documentationUrl`, `properties`, `authenticate`
- Regular nodes must export `description` with `displayName`, `name`, `group`, `version`, `description`, `defaults`, `inputs`, `outputs`, `properties`
- AI tool nodes must have `group: ['transform']`, `inputs: ['main']`, `outputs: ['ai_tool']`, `outputNames: ['Tool']`
- AI memory nodes must have `outputs: ['ai_memory']`, `outputNames: ['Memory']`
- License must be MIT
- Package must have a README
- All packages are published from GitHub Actions with `--provenance` and `id-token: write` permission (required from May 2026)

### 3. No External Dependencies

Packages must not include runtime `dependencies` in `package.json`. Use only `peerDependencies` (n8n-workflow) and `devDependencies`. All required libraries must be available in the n8n runtime environment.

### 4. AI Tool Node Patterns

- Use `DynamicStructuredTool` (not `DynamicTool`) to avoid "Expected string, received object" errors when LLMs pass structured inputs
- Call `addInputData('ai_tool', ...)` before processing and `addOutputData('ai_tool', index, ...)` after, so the tool appears in the execution log tree
- n8n calls `supplyData`/`execute` with the execution context as `this` — use module-level functions that accept the context as a parameter rather than class methods

### 5. Binary File Handling

- Store binary output via `prepareBinaryData` and return a `binaryPropertyName` in the tool result
- Accept binary input via a `binary_property_name` parameter; read data with `getBinaryDataBuffer`
- Use the shared global registry `global._n8nBinaryRegistry` (Map, bounded to 100 entries) for cross-tool binary data exchange within the same execution
- Compatible with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and `database`

### 6. Repository URLs

All `package.json` files must use `https://github.com/unwarkz/n8n-nodes-assistant-set` as the repository URL (not the old `n8n-nodes-mem0-api-server` name).

### 7. English Only

All node UI strings, parameter names, descriptions, help text, error messages, and documentation must be in English.

## Testing

Run verification tests before committing:

```bash
npm test
```

Tests in `tests/verification.test.js` validate all packages against the n8n verification guidelines. The test suite has ~198 tests covering package structure, credential exports, node exports, keyword requirements, and more.

To run only verification tests:

```bash
npm run test:verify
```

## Publishing

Each package is published independently via GitHub Actions workflow dispatch:

| Workflow | Package |
|----------|---------|
| `.github/workflows/publish.yml` | `@unwarkz/n8n-nodes-assistant-set` |
| `.github/workflows/publish-mem0.yml` | `@unwarkz/n8n-nodes-mem0` |
| `.github/workflows/publish-gotenberg-pdf.yml` | `@unwarkz/n8n-nodes-gotenberg-pdf` |
| `.github/workflows/publish-telegram-bot.yml` | `@unwarkz/n8n-nodes-telegram-bot` |
| `.github/workflows/publish-outline-wiki.yml` | `@unwarkz/n8n-nodes-outline-wiki` |
| `.github/workflows/publish-qdrant.yml` | `@unwarkz/n8n-nodes-qdrant` |

All workflows use Node.js 20, `--provenance` flag, and `id-token: write` permission.

## Common Pitfalls

- **Do not add TypeScript files.** The build pipeline is not set up in this repo; only pre-built JS files are used.
- **Do not add runtime dependencies.** n8n verification requires zero external dependencies.
- **Do not access environment variables or the file system** from node code. Pass all data through node parameters.
- **Do not modify standalone package `dist/` directories directly.** These are synced from `package/dist/` at publish time.
- **Keep all strings in English.** This includes error messages and UI help text.
- **Always update `package-lock.json`** if you change root `package.json` dependencies (`npm install` from the repo root).
