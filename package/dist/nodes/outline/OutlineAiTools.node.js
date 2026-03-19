"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutlineAiTools = void 0;

/**
 * Load zod for schema definitions (available in n8n's runtime environment).
 */
let z = null;
try { z = require('zod'); } catch (_) { /* no zod */ }

/**
 * Load DynamicStructuredTool from LangChain (available in n8n's runtime environment).
 * DynamicStructuredTool accepts a structured zod-validated object as input, which
 * avoids "Expected string, received object" errors when an LLM passes structured arguments.
 * Falls back to a minimal StructuredTool-compatible shim when not resolvable.
 */
let DynamicStructuredTool;
(function () {
    const candidates = ['@langchain/core/tools', 'langchain/tools'];
    for (const mod of candidates) {
        try {
            const exported = require(mod);
            if (exported && exported.DynamicStructuredTool) {
                DynamicStructuredTool = exported.DynamicStructuredTool;
                return;
            }
        } catch (_) { /* continue */ }
    }
    // Minimal shim that satisfies the structured-tool contract used by n8n AI Agent
    DynamicStructuredTool = class DynamicStructuredToolShim {
        constructor({ name, description, schema, func }) {
            this.name = name;
            this.description = description;
            this.schema = schema || (z ? z.object({}).passthrough() : null);
            this.func = func;
            this.returnDirect = false;
            this.verbose = false;
            this.lc_namespace = ['langchain_core', 'tools'];
            this.lc_serializable = true;
        }
        async invoke(input) {
            const inputObj = typeof input === 'string'
                ? (() => { try { return JSON.parse(input); } catch (_) { return { input }; } })()
                : (input || {});
            return this.func(inputObj);
        }
        async call(arg, _configArg) {
            return this.invoke(arg);
        }
        _type() { return 'structured'; }
    };
})();

/**
 * OutlineAiTools – n8n AI sub-node
 *
 * Exposes Outline Wiki API operations as DynamicStructuredTool instances consumable
 * by the n8n AI Agent node. Supports the full Outline API surface including:
 *  - Documents (CRUD, search, import/export, archive, restore, move, AI answers)
 *  - Collections (CRUD, export, document tree)
 *  - Comments (CRUD)
 *  - Attachments (upload with binary data support, delete)
 *  - Users (list, get)
 *  - Shares (create, list, revoke)
 *
 * Binary data protocol (from PR#14 pattern):
 *   Tools that PRODUCE files store them in n8n's binary data system and return
 *   a JSON object with a "binaryPropertyName" field.
 *   Tools that CONSUME files accept a "binary_property_name" parameter.
 *   Binary data is shared across AI tool modules via global._n8nBinaryRegistry.
 *
 * Connect the "ai_tool" output to an AI Agent node's "Tools" input.
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buildAuthHeaders(ctx) {
    const credentials = await ctx.getCredentials('outlineApi');
    const baseUrl = (credentials.baseUrl || 'https://app.getoutline.com').replace(/\/$/, '');
    const apiKey = credentials.apiKey;
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    return { baseUrl, apiKey, headers };
}

async function outlinePost(ctx, endpoint, body) {
    const { baseUrl, headers } = await buildAuthHeaders(ctx);
    const options = {
        method: 'POST',
        url: `${baseUrl}/api${endpoint}`,
        headers,
        body: JSON.stringify(body || {}),
    };
    return ctx.helpers.httpRequest(options);
}

async function outlinePostMultipart(ctx, endpoint, formData) {
    const { baseUrl, apiKey } = await buildAuthHeaders(ctx);
    const options = {
        method: 'POST',
        url: `${baseUrl}/api${endpoint}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
        },
        formData,
    };
    return ctx.helpers.httpRequest(options);
}

// Process-global registry shared across all AI tool modules.
if (!global._n8nBinaryRegistry) {
    global._n8nBinaryRegistry = new Map();
}
let _binaryCounter = 0;

async function storeBinaryOutput(ctx, buf, filename, mimeType) {
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const sizeKb = Math.round(buffer.length / 1024);
    const binaryPropertyName = `outline_file_${_binaryCounter++}`;
    const binaryData = await ctx.helpers.prepareBinaryData(buffer, filename, mimeType);
    // Keep registry bounded to avoid unbounded memory growth across many runs.
    if (global._n8nBinaryRegistry.size >= 100) {
        const firstKey = global._n8nBinaryRegistry.keys().next().value;
        global._n8nBinaryRegistry.delete(firstKey);
    }
    global._n8nBinaryRegistry.set(binaryPropertyName, { buffer, binaryData, filename, mimeType });
    // Also mutate the input item so in-module getBinaryDataBuffer still works.
    const inputItems = ctx.getInputData();
    const item = inputItems[0] || { json: {}, binary: {} };
    if (!item.binary) item.binary = {};
    item.binary[binaryPropertyName] = binaryData;
    return JSON.stringify({
        success: true,
        binaryPropertyName,
        filename,
        mimeType,
        sizeKb,
        message: `File "${filename}" (${sizeKb} KB) stored in binary property "${binaryPropertyName}". Pass this binaryPropertyName to other tools that need this file.`,
    });
}

async function getBinaryInputBuffer(ctx, binaryPropertyName) {
    const reg = global._n8nBinaryRegistry;
    if (reg && reg.has(binaryPropertyName)) {
        return reg.get(binaryPropertyName).buffer;
    }
    return ctx.helpers.getBinaryDataBuffer(0, binaryPropertyName);
}

function getBinaryMeta(ctx, binaryPropertyName) {
    const reg = global._n8nBinaryRegistry;
    if (reg && reg.has(binaryPropertyName)) {
        return reg.get(binaryPropertyName).binaryData;
    }
    const items = ctx.getInputData();
    const item = items && items[0];
    if (item && item.binary && item.binary[binaryPropertyName]) {
        return item.binary[binaryPropertyName];
    }
    return null;
}

function guessMimeType(filePath) {
    const ext = (filePath || '').split('.').pop().toLowerCase();
    const map = {
        md: 'text/markdown', markdown: 'text/markdown',
        txt: 'text/plain', html: 'text/html', htm: 'text/html',
        csv: 'text/csv', tsv: 'text/tab-separated-values',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', svg: 'image/svg+xml',
        zip: 'application/zip', json: 'application/json',
    };
    return map[ext] || 'application/octet-stream';
}

// ── Node Class ──────────────────────────────────────────────────────────────

class OutlineAiTools {
    constructor() {
        this.description = {
            displayName: 'Outline Wiki AI Tools',
            name: 'outlineAiTools',
            icon: 'file:outline.svg',
            group: ['transform'],
            version: 1,
            description: 'Provides Outline Wiki tools (documents, collections, comments, attachments, users, shares) to an AI Agent node',
            defaults: { name: 'Outline Wiki AI Tools' },
            inputs: [],
            outputs: ['ai_tool'],
            outputNames: ['Tool'],
            credentials: [{ name: 'outlineApi', required: true }],
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Tools', 'Agents & LLMs'],
                },
                resources: {
                    primaryDocumentation: [{ url: 'https://www.getoutline.com/developers' }],
                },
            },
            properties: [
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        // Documents
                        { name: 'Search Documents', value: 'searchDocuments', description: 'Full-text search across all documents' },
                        { name: 'Search Document Titles', value: 'searchTitles', description: 'Fast title-only search' },
                        { name: 'Create Document', value: 'createDocument', description: 'Create a new document in a collection' },
                        { name: 'Get Document', value: 'getDocument', description: 'Retrieve a document by ID or URL slug' },
                        { name: 'Update Document', value: 'updateDocument', description: 'Update a document title or body' },
                        { name: 'Delete Document', value: 'deleteDocument', description: 'Move a document to trash (or permanently delete)' },
                        { name: 'List Documents', value: 'listDocuments', description: 'List documents (with optional collection/status filters)' },
                        { name: 'Import Document', value: 'importDocument', description: 'Import a file (markdown, docx, html, csv…) as a new document (accepts binary property reference)' },
                        { name: 'Export Document', value: 'exportDocument', description: 'Export a document as Markdown and store in a binary property' },
                        { name: 'Archive Document', value: 'archiveDocument', description: 'Archive a document (move out of sight, restorable)' },
                        { name: 'Restore Document', value: 'restoreDocument', description: 'Restore an archived or deleted document' },
                        { name: 'Move Document', value: 'moveDocument', description: 'Move a document to a different collection or parent' },
                        { name: 'Answer Question', value: 'answerQuestion', description: 'Query documents with natural language (requires AI answers enabled)' },
                        // Collections
                        { name: 'List Collections', value: 'listCollections', description: 'List all accessible collections' },
                        { name: 'Create Collection', value: 'createCollection', description: 'Create a new collection' },
                        { name: 'Get Collection', value: 'getCollection', description: 'Retrieve collection details by ID' },
                        { name: 'Update Collection', value: 'updateCollection', description: 'Update a collection name, description, or settings' },
                        { name: 'Delete Collection', value: 'deleteCollection', description: 'Delete a collection and all its documents' },
                        { name: 'Get Collection Documents', value: 'getCollectionDocuments', description: 'Get the document hierarchy/tree for a collection' },
                        { name: 'Export Collection', value: 'exportCollection', description: 'Trigger a bulk export of a collection (returns FileOperation)' },
                        // Comments
                        { name: 'List Comments', value: 'listComments', description: 'List comments on a document' },
                        { name: 'Create Comment', value: 'createComment', description: 'Add a comment to a document' },
                        { name: 'Update Comment', value: 'updateComment', description: 'Update an existing comment' },
                        { name: 'Delete Comment', value: 'deleteComment', description: 'Delete a comment' },
                        // Attachments
                        { name: 'Upload Attachment', value: 'uploadAttachment', description: 'Upload a file as an Outline attachment (accepts binary property reference), returns attachment URL for embedding in documents' },
                        { name: 'Delete Attachment', value: 'deleteAttachment', description: 'Permanently delete an attachment' },
                        // Users
                        { name: 'List Users', value: 'listUsers', description: 'List workspace users' },
                        { name: 'Get User', value: 'getUser', description: 'Get details for a specific user' },
                        // Shares
                        { name: 'Create Share', value: 'createShare', description: 'Create a public share link for a document' },
                        { name: 'List Shares', value: 'listShares', description: 'List existing share links' },
                        { name: 'Revoke Share', value: 'revokeShare', description: 'Revoke a share link' },
                    ],
                    default: ['searchDocuments', 'createDocument', 'getDocument', 'updateDocument', 'listDocuments', 'importDocument', 'uploadAttachment', 'listCollections', 'createCollection'],
                    description: 'Which Outline Wiki tools to expose to the AI Agent',
                },
                {
                    displayName: 'Tool Description Override',
                    name: 'toolDescription',
                    type: 'string',
                    default: '',
                    description: 'Optional: override the description shown to the AI Agent for all tools',
                    typeOptions: { rows: 2 },
                },
            ],
        };
    }

    async supplyData(itemIndex) {
        const self = this;
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, [
            'searchDocuments', 'createDocument', 'getDocument', 'updateDocument',
            'listDocuments', 'importDocument', 'uploadAttachment', 'listCollections', 'createCollection',
        ]);
        const toolDescriptionOverride = this.getNodeParameter('toolDescription', itemIndex, '');

        // ── Logging helpers ────────────────────────────────────────────────────
        function log(level, message, meta) {
            try {
                if (self.logger && typeof self.logger[level] === 'function') {
                    self.logger[level](message, meta);
                }
            } catch (_) { /* ignore */ }
        }

        // ── Execution logging helpers ──────────────────────────────────────────
        function startToolRun(payload) {
            try {
                const { index } = self.addInputData('ai_tool', [[{ json: payload }]]);
                return index;
            } catch (_) { return 0; }
        }

        function endToolRun(runIndex, data) {
            try {
                const json = (data !== null && typeof data === 'object' && !Array.isArray(data))
                    ? data
                    : { result: data };
                self.addOutputData('ai_tool', runIndex, [[{ json }]]);
            } catch (_) { /* addOutputData may not be available in all n8n versions */ }
        }

        // ── Zod schema helpers ─────────────────────────────────────────────────
        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function boolOpt(desc) { return z ? z.boolean().optional().describe(desc) : undefined; }
        function numOpt(desc) { return z ? z.number().optional().describe(desc) : undefined; }

        // ── Shared API helpers bound to this execution context ─────────────────
        async function apiPost(endpoint, body) {
            return outlinePost(self, endpoint, body);
        }
        async function apiPostMultipart(endpoint, formData) {
            return outlinePostMultipart(self, endpoint, formData);
        }
        async function getBuffer(binaryPropertyName) {
            return getBinaryInputBuffer(self, binaryPropertyName);
        }
        function getMeta(binaryPropertyName) {
            return getBinaryMeta(self, binaryPropertyName);
        }
        async function storeFile(buf, filename, mimeType) {
            return storeBinaryOutput(self, buf, filename, mimeType);
        }

        const tools = [];

        // ══════════════════════════════════════════════════════════════════════
        // DOCUMENTS
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_search_documents ─────────────────────────────────────
        if (enabledTools.includes('searchDocuments')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_search_documents',
                description: toolDescriptionOverride ||
                    'Full-text search across all documents in Outline Wiki. Returns matching documents with context snippets. ' +
                    'Use this to find knowledge base articles, documentation, or any content stored in Outline. ' +
                    'Can filter by collection, status (draft/published/archived), date range, and user.',
                schema: z ? z.object({
                    query: z.string().describe('The search query to find relevant documents'),
                    collection_id: strOpt('UUID of the collection to limit search within'),
                    status_filter: strOpt('Filter by status: "draft" | "published" | "archived" (default: published)'),
                    date_filter: strOpt('Only return documents updated within this period: "day" | "week" | "month" | "year"'),
                    limit: numOpt('Maximum results to return (default: 25)'),
                }) : null,
                func: async ({ query, collection_id, status_filter, date_filter, limit } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_search_documents', query });
                    log('debug', '[Outline] outline_search_documents called', { query });
                    try {
                        if (!query) return JSON.stringify({ error: 'query is required' });
                        const body = { query };
                        if (collection_id) body.collectionId = collection_id;
                        if (status_filter) body.statusFilter = [status_filter];
                        if (date_filter) body.dateFilter = date_filter;
                        if (limit) body.limit = limit;
                        const res = await apiPost('/documents.search', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_search_documents succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_search_documents failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_search_titles ────────────────────────────────────────
        if (enabledTools.includes('searchTitles')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_search_titles',
                description: toolDescriptionOverride ||
                    'Fast title-only search for documents in Outline Wiki. Much faster than full-text search. ' +
                    'Use this when you need to quickly find a document by its title or heading.',
                schema: z ? z.object({
                    query: z.string().describe('Title search query'),
                    collection_id: strOpt('UUID of the collection to limit search within'),
                    limit: numOpt('Maximum results to return (default: 25)'),
                }) : null,
                func: async ({ query, collection_id, limit } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_search_titles', query });
                    log('debug', '[Outline] outline_search_titles called', { query });
                    try {
                        if (!query) return JSON.stringify({ error: 'query is required' });
                        const body = { query };
                        if (collection_id) body.collectionId = collection_id;
                        if (limit) body.limit = limit;
                        const res = await apiPost('/documents.search_titles', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_search_titles succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_search_titles failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_create_document ──────────────────────────────────────
        if (enabledTools.includes('createDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_create_document',
                description: toolDescriptionOverride ||
                    'Create a new document in Outline Wiki. The document body is in Markdown format. ' +
                    'Documents can be created as drafts (publish=false) or immediately published (publish=true). ' +
                    'Requires either a collection_id (for a top-level document) or a parent_document_id (for a nested child document).',
                schema: z ? z.object({
                    title: z.string().describe('The document title'),
                    text: strOpt('The document body in Markdown format'),
                    collection_id: strOpt('UUID of the collection to place the document in (required unless parent_document_id is given)'),
                    parent_document_id: strOpt('UUID of the parent document to create a nested child document under'),
                    publish: boolOpt('Whether to immediately publish the document (default: false = draft)'),
                    template_id: strOpt('UUID of a template to use as the basis for this document'),
                }) : null,
                func: async ({ title, text, collection_id, parent_document_id, publish, template_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_create_document', title });
                    log('debug', '[Outline] outline_create_document called', { title });
                    try {
                        if (!title) return JSON.stringify({ error: 'title is required' });
                        if (!collection_id && !parent_document_id) return JSON.stringify({ error: 'Either collection_id or parent_document_id is required' });
                        const body = { title };
                        if (text) body.text = text;
                        if (collection_id) body.collectionId = collection_id;
                        if (parent_document_id) body.parentDocumentId = parent_document_id;
                        if (publish !== undefined) body.publish = publish;
                        if (template_id) body.templateId = template_id;
                        const res = await apiPost('/documents.create', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_create_document succeeded', { id: res.data && res.data.id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_create_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_get_document ─────────────────────────────────────────
        if (enabledTools.includes('getDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_get_document',
                description: toolDescriptionOverride ||
                    'Retrieve the full content of a document from Outline Wiki by its ID or URL slug. ' +
                    'Returns the document title, body (in Markdown), metadata (created/updated dates, author, collection), and policies. ' +
                    'Use this to read the full content of a specific document.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_get_document', id });
                    log('debug', '[Outline] outline_get_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/documents.info', { id });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_get_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_get_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_update_document ──────────────────────────────────────
        if (enabledTools.includes('updateDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_update_document',
                description: toolDescriptionOverride ||
                    'Update an existing document in Outline Wiki. Can update the title, body (Markdown), and publish status. ' +
                    'To update content, provide the full new body in Markdown format. ' +
                    'To publish a draft, set publish=true.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                    title: strOpt('New document title'),
                    text: strOpt('New document body in Markdown format (replaces existing content)'),
                    publish: boolOpt('Set to true to publish a draft, or false to unpublish'),
                    full_width: boolOpt('Whether the document should be displayed in full width'),
                }) : null,
                func: async ({ id, title, text, publish, full_width } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_update_document', id });
                    log('debug', '[Outline] outline_update_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id };
                        if (title !== undefined) body.title = title;
                        if (text !== undefined) body.text = text;
                        if (publish !== undefined) body.publish = publish;
                        if (full_width !== undefined) body.fullWidth = full_width;
                        const res = await apiPost('/documents.update', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_update_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_update_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_delete_document ──────────────────────────────────────
        if (enabledTools.includes('deleteDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_delete_document',
                description: toolDescriptionOverride ||
                    'Delete a document in Outline Wiki. By default moves it to trash (recoverable for 30 days). ' +
                    'Set permanent=true to permanently and immediately destroy the document with no recovery option. ' +
                    'Use with caution.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                    permanent: boolOpt('Set to true to permanently destroy (no recovery). Default: false (moves to trash)'),
                }) : null,
                func: async ({ id, permanent } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_delete_document', id });
                    log('debug', '[Outline] outline_delete_document called', { id, permanent });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id };
                        if (permanent !== undefined) body.permanent = permanent;
                        const res = await apiPost('/documents.delete', body);
                        const result = { success: true, ok: res.ok !== false };
                        log('info', '[Outline] outline_delete_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_delete_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_list_documents ───────────────────────────────────────
        if (enabledTools.includes('listDocuments')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_list_documents',
                description: toolDescriptionOverride ||
                    'List documents in Outline Wiki. Can filter by collection, parent document, status (draft/published/archived), and user. ' +
                    'Returns a paginated list of documents with their metadata.',
                schema: z ? z.object({
                    collection_id: strOpt('UUID of collection to list documents from'),
                    parent_document_id: strOpt('UUID of parent document to list children of'),
                    status_filter: strOpt('Filter by status: "draft" | "published" | "archived"'),
                    limit: numOpt('Maximum results to return (default: 25)'),
                    offset: numOpt('Offset for pagination (default: 0)'),
                }) : null,
                func: async ({ collection_id, parent_document_id, status_filter, limit, offset } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_list_documents' });
                    log('debug', '[Outline] outline_list_documents called');
                    try {
                        const body = {};
                        if (collection_id) body.collectionId = collection_id;
                        if (parent_document_id) body.parentDocumentId = parent_document_id;
                        if (status_filter) body.statusFilter = [status_filter];
                        if (limit) body.limit = limit;
                        if (offset) body.offset = offset;
                        const res = await apiPost('/documents.list', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_list_documents succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_list_documents failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_import_document ──────────────────────────────────────
        if (enabledTools.includes('importDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_import_document',
                description: toolDescriptionOverride ||
                    'Import a file as a new document in Outline Wiki. Supported formats: Markdown (.md), plain text (.txt), ' +
                    'HTML (.html), Word (.docx), CSV (.csv), TSV (.tsv). ' +
                    'The file must be provided via binary_property_name — the name of the binary property where the file was stored by a previous tool ' +
                    '(e.g., telegram_get_file, gotenberg_url_to_pdf, or any tool that stores binary files). ' +
                    'Requires either collection_id or parent_document_id.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the file to import (binaryPropertyName from a previous tool)'),
                    collection_id: strOpt('UUID of the collection to import into. Required unless parent_document_id is given.'),
                    parent_document_id: strOpt('UUID of the parent document to import under (creates nested document)'),
                    publish: boolOpt('Whether to immediately publish the imported document (default: false)'),
                    filename: strOpt('Override filename (including extension, e.g., "notes.md"). If omitted, uses filename from binary metadata.'),
                }) : null,
                func: async ({ binary_property_name, collection_id, parent_document_id, publish, filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_import_document', binary_property_name });
                    log('debug', '[Outline] outline_import_document called', { binary_property_name });
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });
                        if (!collection_id && !parent_document_id) return JSON.stringify({ error: 'Either collection_id or parent_document_id is required' });

                        const buffer = await getBuffer(binary_property_name);
                        const meta = getMeta(binary_property_name);
                        const resolvedFilename = filename || (meta && meta.fileName) || 'document.md';
                        const contentType = guessMimeType(resolvedFilename);

                        const formData = {
                            file: {
                                value: buffer,
                                options: { filename: resolvedFilename, contentType },
                            },
                        };
                        if (collection_id) formData.collectionId = collection_id;
                        if (parent_document_id) formData.parentDocumentId = parent_document_id;
                        if (publish !== undefined) formData.publish = String(publish);

                        const res = await apiPostMultipart('/documents.import', formData);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_import_document succeeded', { id: res.data && res.data.id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_import_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_export_document ──────────────────────────────────────
        if (enabledTools.includes('exportDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_export_document',
                description: toolDescriptionOverride ||
                    'Export a document from Outline Wiki as Markdown. ' +
                    'Stores the exported document in a binary property and returns its name. ' +
                    'The binary property can then be passed to other tools (e.g., telegram_send_document, gotenberg_libreoffice_convert).',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                    output_filename: strOpt('Desired filename for the exported document (default: document.md)'),
                }) : null,
                func: async ({ id, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_export_document', id });
                    log('debug', '[Outline] outline_export_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/documents.export', { id });
                        // The response contains the markdown text in data
                        const markdown = (res && res.data) ? res.data : JSON.stringify(res);
                        const buffer = Buffer.from(typeof markdown === 'string' ? markdown : JSON.stringify(markdown), 'utf-8');
                        const filename = output_filename || 'document.md';
                        const resultStr = await storeFile(buffer, filename, 'text/markdown');
                        const result = JSON.parse(resultStr);
                        log('info', '[Outline] outline_export_document succeeded', { id, sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_export_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_archive_document ─────────────────────────────────────
        if (enabledTools.includes('archiveDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_archive_document',
                description: toolDescriptionOverride ||
                    'Archive a document in Outline Wiki. Archiving moves the document out of sight while retaining the ability to search and restore it later. ' +
                    'Use this for outdated content that should not appear in normal views but must be preserved.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_archive_document', id });
                    log('debug', '[Outline] outline_archive_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/documents.archive', { id });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_archive_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_archive_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_restore_document ─────────────────────────────────────
        if (enabledTools.includes('restoreDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_restore_document',
                description: toolDescriptionOverride ||
                    'Restore an archived or deleted document in Outline Wiki. Can optionally restore to a specific revision.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                    collection_id: strOpt('UUID of the collection to restore the document into'),
                    revision_id: strOpt('UUID of a specific revision to restore the document to (optional)'),
                }) : null,
                func: async ({ id, collection_id, revision_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_restore_document', id });
                    log('debug', '[Outline] outline_restore_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id };
                        if (collection_id) body.collectionId = collection_id;
                        if (revision_id) body.revisionId = revision_id;
                        const res = await apiPost('/documents.restore', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_restore_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_restore_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_move_document ────────────────────────────────────────
        if (enabledTools.includes('moveDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_move_document',
                description: toolDescriptionOverride ||
                    'Move a document to a different collection or parent document in Outline Wiki. ' +
                    'If no parent_document_id is given the document moves to the collection root.',
                schema: z ? z.object({
                    id: z.string().describe('Document UUID or URL slug (urlId)'),
                    collection_id: strOpt('UUID of the target collection'),
                    parent_document_id: strOpt('UUID of the new parent document (omit to move to collection root)'),
                }) : null,
                func: async ({ id, collection_id, parent_document_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_move_document', id });
                    log('debug', '[Outline] outline_move_document called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id };
                        if (collection_id) body.collectionId = collection_id;
                        if (parent_document_id) body.parentDocumentId = parent_document_id;
                        const res = await apiPost('/documents.move', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_move_document succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_move_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_answer_question ──────────────────────────────────────
        if (enabledTools.includes('answerQuestion')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_answer_question',
                description: toolDescriptionOverride ||
                    'Query Outline Wiki documents with a natural language question. ' +
                    'Outline\'s AI will attempt to find and synthesize an answer from relevant documents. ' +
                    'Note: This requires the "AI answers" feature to be enabled for the workspace (Business/Enterprise/Cloud plans only).',
                schema: z ? z.object({
                    query: z.string().describe('A natural language question to ask against the knowledge base (e.g., "What is our vacation policy?")'),
                    collection_id: strOpt('UUID of the collection to search within'),
                    document_id: strOpt('UUID of a specific document to search within'),
                }) : null,
                func: async ({ query, collection_id, document_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_answer_question', query });
                    log('debug', '[Outline] outline_answer_question called', { query });
                    try {
                        if (!query) return JSON.stringify({ error: 'query is required' });
                        const body = { query };
                        if (collection_id) body.collectionId = collection_id;
                        if (document_id) body.documentId = document_id;
                        const res = await apiPost('/documents.answerQuestion', body);
                        const result = { success: true, search: res.search, documents: res.documents };
                        log('info', '[Outline] outline_answer_question succeeded');
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_answer_question failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ══════════════════════════════════════════════════════════════════════
        // COLLECTIONS
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_list_collections ─────────────────────────────────────
        if (enabledTools.includes('listCollections')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_list_collections',
                description: toolDescriptionOverride ||
                    'List all collections in Outline Wiki that the current API key has access to. ' +
                    'Collections are the top-level groupings of documents in Outline. ' +
                    'Returns collection IDs, names, descriptions, and document counts.',
                schema: z ? z.object({
                    limit: numOpt('Maximum results to return (default: 25)'),
                    offset: numOpt('Offset for pagination (default: 0)'),
                }) : null,
                func: async ({ limit, offset } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_list_collections' });
                    log('debug', '[Outline] outline_list_collections called');
                    try {
                        const body = {};
                        if (limit) body.limit = limit;
                        if (offset) body.offset = offset;
                        const res = await apiPost('/collections.list', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_list_collections succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_list_collections failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_create_collection ───────────────────────────────────
        if (enabledTools.includes('createCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_create_collection',
                description: toolDescriptionOverride ||
                    'Create a new collection in Outline Wiki. Collections are the top-level organizational units that group related documents. ' +
                    'You can set name, description, icon, color, sharing settings, and default permission.',
                schema: z ? z.object({
                    name: z.string().describe('Collection name'),
                    description: strOpt('A brief description of the collection (markdown supported)'),
                    permission: strOpt('Default permission: "read" | "read_write" (default: read_write)'),
                    sharing: boolOpt('Whether public sharing of documents is allowed (default: false)'),
                    color: strOpt('Hex color code for the collection icon (e.g., "#FF5733")'),
                    icon: strOpt('Icon name from outline-icons or an emoji character'),
                }) : null,
                func: async ({ name, description, permission, sharing, color, icon } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_create_collection', name });
                    log('debug', '[Outline] outline_create_collection called', { name });
                    try {
                        if (!name) return JSON.stringify({ error: 'name is required' });
                        const body = { name };
                        if (description) body.description = description;
                        if (permission) body.permission = permission;
                        if (sharing !== undefined) body.sharing = sharing;
                        if (color) body.color = color;
                        if (icon) body.icon = icon;
                        const res = await apiPost('/collections.create', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_create_collection succeeded', { id: res.data && res.data.id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_create_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_get_collection ───────────────────────────────────────
        if (enabledTools.includes('getCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_get_collection',
                description: toolDescriptionOverride ||
                    'Retrieve details of a specific collection in Outline Wiki by its UUID.',
                schema: z ? z.object({
                    id: z.string().describe('Collection UUID'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_get_collection', id });
                    log('debug', '[Outline] outline_get_collection called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/collections.info', { id });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_get_collection succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_get_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_update_collection ───────────────────────────────────
        if (enabledTools.includes('updateCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_update_collection',
                description: toolDescriptionOverride ||
                    'Update properties of an existing collection in Outline Wiki.',
                schema: z ? z.object({
                    id: z.string().describe('Collection UUID'),
                    name: strOpt('New collection name'),
                    description: strOpt('New description (markdown supported)'),
                    permission: strOpt('Default permission: "read" | "read_write"'),
                    sharing: boolOpt('Whether public sharing of documents is allowed'),
                    color: strOpt('Hex color code for the collection icon'),
                    icon: strOpt('Icon name or emoji'),
                }) : null,
                func: async ({ id, name, description, permission, sharing, color, icon } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_update_collection', id });
                    log('debug', '[Outline] outline_update_collection called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id };
                        if (name) body.name = name;
                        if (description) body.description = description;
                        if (permission) body.permission = permission;
                        if (sharing !== undefined) body.sharing = sharing;
                        if (color) body.color = color;
                        if (icon) body.icon = icon;
                        const res = await apiPost('/collections.update', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_update_collection succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_update_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_delete_collection ───────────────────────────────────
        if (enabledTools.includes('deleteCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_delete_collection',
                description: toolDescriptionOverride ||
                    'Delete a collection and ALL of its documents in Outline Wiki. THIS ACTION CANNOT BE UNDONE. ' +
                    'Use with extreme caution — this permanently removes the collection and all documents within it.',
                schema: z ? z.object({
                    id: z.string().describe('Collection UUID to delete'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_delete_collection', id });
                    log('debug', '[Outline] outline_delete_collection called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/collections.delete', { id });
                        const result = { success: true, ok: res.ok !== false };
                        log('info', '[Outline] outline_delete_collection succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_delete_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_get_collection_documents ─────────────────────────────
        if (enabledTools.includes('getCollectionDocuments')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_get_collection_documents',
                description: toolDescriptionOverride ||
                    'Get the full document hierarchy/tree for a collection in Outline Wiki. ' +
                    'Returns a nested tree of NavigationNode objects showing the collection structure. ' +
                    'Use this to understand how documents are organized within a collection.',
                schema: z ? z.object({
                    id: z.string().describe('Collection UUID'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_get_collection_documents', id });
                    log('debug', '[Outline] outline_get_collection_documents called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/collections.documents', { id });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_get_collection_documents succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_get_collection_documents failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_export_collection ───────────────────────────────────
        if (enabledTools.includes('exportCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_export_collection',
                description: toolDescriptionOverride ||
                    'Trigger a bulk export of an Outline Wiki collection in the specified format. ' +
                    'Returns a FileOperation object with a status and download URL once the background job completes. ' +
                    'You can poll the FileOperation status to check when the export is ready.',
                schema: z ? z.object({
                    id: z.string().describe('Collection UUID to export'),
                    format: strOpt('Export format: "outline-markdown" | "json" | "html" (default: outline-markdown)'),
                }) : null,
                func: async ({ id, format } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_export_collection', id });
                    log('debug', '[Outline] outline_export_collection called', { id, format });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const body = { id, format: format || 'outline-markdown' };
                        const res = await apiPost('/collections.export', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_export_collection succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_export_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ══════════════════════════════════════════════════════════════════════
        // COMMENTS
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_list_comments ────────────────────────────────────────
        if (enabledTools.includes('listComments')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_list_comments',
                description: toolDescriptionOverride ||
                    'List comments on a document or within a collection in Outline Wiki.',
                schema: z ? z.object({
                    document_id: strOpt('UUID of the document to list comments for'),
                    collection_id: strOpt('UUID of the collection to list all comments within'),
                    limit: numOpt('Maximum results to return (default: 25)'),
                    offset: numOpt('Offset for pagination (default: 0)'),
                }) : null,
                func: async ({ document_id, collection_id, limit, offset } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_list_comments', document_id });
                    log('debug', '[Outline] outline_list_comments called', { document_id });
                    try {
                        const body = {};
                        if (document_id) body.documentId = document_id;
                        if (collection_id) body.collectionId = collection_id;
                        if (limit) body.limit = limit;
                        if (offset) body.offset = offset;
                        const res = await apiPost('/comments.list', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_list_comments succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_list_comments failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_create_comment ───────────────────────────────────────
        if (enabledTools.includes('createComment')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_create_comment',
                description: toolDescriptionOverride ||
                    'Add a comment to a document in Outline Wiki. ' +
                    'Comments can be top-level or replies to existing comments (use parent_comment_id for replies).',
                schema: z ? z.object({
                    document_id: z.string().describe('UUID of the document to comment on'),
                    text: z.string().describe('Comment body in Markdown format'),
                    parent_comment_id: strOpt('UUID of the parent comment to reply to (for threaded replies)'),
                }) : null,
                func: async ({ document_id, text, parent_comment_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_create_comment', document_id });
                    log('debug', '[Outline] outline_create_comment called', { document_id });
                    try {
                        if (!document_id) return JSON.stringify({ error: 'document_id is required' });
                        if (!text) return JSON.stringify({ error: 'text is required' });
                        const body = { documentId: document_id, text };
                        if (parent_comment_id) body.parentCommentId = parent_comment_id;
                        const res = await apiPost('/comments.create', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_create_comment succeeded', { id: res.data && res.data.id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_create_comment failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_update_comment ───────────────────────────────────────
        if (enabledTools.includes('updateComment')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_update_comment',
                description: toolDescriptionOverride ||
                    'Update the text of an existing comment in Outline Wiki.',
                schema: z ? z.object({
                    id: z.string().describe('Comment UUID'),
                    text: z.string().describe('New comment body in Markdown format'),
                }) : null,
                func: async ({ id, text } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_update_comment', id });
                    log('debug', '[Outline] outline_update_comment called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        if (!text) return JSON.stringify({ error: 'text is required' });
                        // comments.update expects data object per API spec
                        const res = await apiPost('/comments.update', { id, data: { text } });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_update_comment succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_update_comment failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_delete_comment ───────────────────────────────────────
        if (enabledTools.includes('deleteComment')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_delete_comment',
                description: toolDescriptionOverride ||
                    'Delete a comment in Outline Wiki. If the comment has replies, all child comments are also deleted.',
                schema: z ? z.object({
                    id: z.string().describe('Comment UUID'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_delete_comment', id });
                    log('debug', '[Outline] outline_delete_comment called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/comments.delete', { id });
                        const result = { success: true, ok: res.ok !== false };
                        log('info', '[Outline] outline_delete_comment succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_delete_comment failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ══════════════════════════════════════════════════════════════════════
        // ATTACHMENTS
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_upload_attachment ────────────────────────────────────
        if (enabledTools.includes('uploadAttachment')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_upload_attachment',
                description: toolDescriptionOverride ||
                    'Upload a file as an attachment in Outline Wiki. ' +
                    'The file must be provided via binary_property_name — the binary property name returned by a previous tool ' +
                    '(e.g., telegram_get_file, gotenberg_url_screenshot, gotenberg_url_to_pdf, or any other tool that stores binary files). ' +
                    'Returns the attachment URL that can be embedded in document Markdown using ![alt](url) or [text](url) syntax. ' +
                    'Supports all common file types: images (PNG, JPEG, GIF, WebP), PDFs, documents (DOCX, XLSX), archives (ZIP), and more.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the file to upload (binaryPropertyName returned by a previous tool)'),
                    document_id: strOpt('UUID of the document to associate this attachment with (optional)'),
                    filename: strOpt('Override filename (including extension, e.g., "photo.png"). If omitted, uses filename from binary metadata.'),
                }) : null,
                func: async ({ binary_property_name, document_id, filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_upload_attachment', binary_property_name });
                    log('debug', '[Outline] outline_upload_attachment called', { binary_property_name });
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBuffer(binary_property_name);
                        const meta = getMeta(binary_property_name);
                        const resolvedFilename = filename || (meta && meta.fileName) || 'file';
                        const contentType = (meta && meta.mimeType) || guessMimeType(resolvedFilename);
                        const sizeBytes = buffer.length;

                        // Step 1: Create attachment record and get signed upload credentials
                        const createBody = {
                            name: resolvedFilename,
                            contentType,
                            size: sizeBytes,
                        };
                        if (document_id) createBody.documentId = document_id;

                        const createRes = await apiPost('/attachments.create', createBody);
                        if (!createRes || !createRes.data) {
                            return JSON.stringify({ error: 'Failed to create attachment record', details: createRes });
                        }
                        const { uploadUrl, form, attachment } = createRes.data;

                        // Step 2: Upload the file to the signed URL (S3/GCS signed POST)
                        // Build multipart form data with the signed form fields + the file
                        const uploadFormData = {};
                        if (form && typeof form === 'object') {
                            Object.assign(uploadFormData, form);
                        }
                        uploadFormData.file = {
                            value: buffer,
                            options: { filename: resolvedFilename, contentType },
                        };

                        await self.helpers.httpRequest({
                            method: 'POST',
                            url: uploadUrl,
                            formData: uploadFormData,
                        });

                        const result = {
                            success: true,
                            attachmentId: attachment && attachment.id,
                            attachmentUrl: attachment && attachment.url,
                            filename: resolvedFilename,
                            contentType,
                            sizeBytes,
                            message: `File "${resolvedFilename}" uploaded as Outline attachment. Embed in documents using: ![${resolvedFilename}](${attachment && attachment.url})`,
                        };
                        log('info', '[Outline] outline_upload_attachment succeeded', { filename: resolvedFilename, attachmentId: result.attachmentId });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_upload_attachment failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_delete_attachment ────────────────────────────────────
        if (enabledTools.includes('deleteAttachment')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_delete_attachment',
                description: toolDescriptionOverride ||
                    'Permanently delete an attachment from Outline Wiki. ' +
                    'Note: this does not remove references or links to the attachment in documents.',
                schema: z ? z.object({
                    id: z.string().describe('Attachment UUID to delete'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_delete_attachment', id });
                    log('debug', '[Outline] outline_delete_attachment called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/attachments.delete', { id });
                        const result = { success: true, ok: res.ok !== false };
                        log('info', '[Outline] outline_delete_attachment succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_delete_attachment failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ══════════════════════════════════════════════════════════════════════
        // USERS
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_list_users ───────────────────────────────────────────
        if (enabledTools.includes('listUsers')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_list_users',
                description: toolDescriptionOverride ||
                    'List users in the Outline Wiki workspace. Returns user names, emails, roles, and activity information.',
                schema: z ? z.object({
                    query: strOpt('Filter users by name or email'),
                    limit: numOpt('Maximum results to return (default: 25)'),
                    offset: numOpt('Offset for pagination (default: 0)'),
                }) : null,
                func: async ({ query, limit, offset } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_list_users' });
                    log('debug', '[Outline] outline_list_users called');
                    try {
                        const body = {};
                        if (query) body.query = query;
                        if (limit) body.limit = limit;
                        if (offset) body.offset = offset;
                        const res = await apiPost('/users.list', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_list_users succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_list_users failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_get_user ─────────────────────────────────────────────
        if (enabledTools.includes('getUser')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_get_user',
                description: toolDescriptionOverride ||
                    'Get details of a specific user in Outline Wiki by their UUID.',
                schema: z ? z.object({
                    id: z.string().describe('User UUID'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_get_user', id });
                    log('debug', '[Outline] outline_get_user called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/users.info', { id });
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_get_user succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_get_user failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ══════════════════════════════════════════════════════════════════════
        // SHARES
        // ══════════════════════════════════════════════════════════════════════

        // ── Tool: outline_create_share ─────────────────────────────────────────
        if (enabledTools.includes('createShare')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_create_share',
                description: toolDescriptionOverride ||
                    'Create a public share link for a document in Outline Wiki. ' +
                    'Returns the share URL that can be sent to anyone to view the document without requiring authentication. ' +
                    'The sharing setting on the collection must be enabled.',
                schema: z ? z.object({
                    document_id: z.string().describe('UUID of the document to share'),
                    include_child_documents: boolOpt('Whether to include child documents in the share (default: false)'),
                }) : null,
                func: async ({ document_id, include_child_documents } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_create_share', document_id });
                    log('debug', '[Outline] outline_create_share called', { document_id });
                    try {
                        if (!document_id) return JSON.stringify({ error: 'document_id is required' });
                        const body = { documentId: document_id };
                        if (include_child_documents !== undefined) body.includeChildDocuments = include_child_documents;
                        const res = await apiPost('/shares.create', body);
                        const result = { success: true, data: res.data };
                        log('info', '[Outline] outline_create_share succeeded', { shareId: res.data && res.data.id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_create_share failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_list_shares ──────────────────────────────────────────
        if (enabledTools.includes('listShares')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_list_shares',
                description: toolDescriptionOverride ||
                    'List existing share links in Outline Wiki.',
                schema: z ? z.object({
                    limit: numOpt('Maximum results to return (default: 25)'),
                    offset: numOpt('Offset for pagination (default: 0)'),
                }) : null,
                func: async ({ limit, offset } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_list_shares' });
                    log('debug', '[Outline] outline_list_shares called');
                    try {
                        const body = {};
                        if (limit) body.limit = limit;
                        if (offset) body.offset = offset;
                        const res = await apiPost('/shares.list', body);
                        const result = { success: true, data: res.data, pagination: res.pagination };
                        log('info', '[Outline] outline_list_shares succeeded', { count: res.data && res.data.length });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_list_shares failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: outline_revoke_share ─────────────────────────────────────────
        if (enabledTools.includes('revokeShare')) {
            tools.push(new DynamicStructuredTool({
                name: 'outline_revoke_share',
                description: toolDescriptionOverride ||
                    'Revoke a share link in Outline Wiki, making the document no longer publicly accessible via that link.',
                schema: z ? z.object({
                    id: z.string().describe('Share UUID to revoke'),
                }) : null,
                func: async ({ id } = {}) => {
                    const runIndex = startToolRun({ tool: 'outline_revoke_share', id });
                    log('debug', '[Outline] outline_revoke_share called', { id });
                    try {
                        if (!id) return JSON.stringify({ error: 'id is required' });
                        const res = await apiPost('/shares.revoke', { id });
                        const result = { success: true, ok: res.ok !== false };
                        log('info', '[Outline] outline_revoke_share succeeded', { id });
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Outline] outline_revoke_share failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        return { response: tools };
    }

    /**
     * execute is called when the node is triggered as a regular node (not via AI Agent).
     * Returns a helpful message explaining how to use this node.
     */
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            returnData.push({
                json: {
                    message: 'Outline Wiki AI Tools node is designed to be connected to an AI Agent node. Connect the "Tool" output to an AI Agent node\'s "Tools" input.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                    documentation: 'https://www.getoutline.com/developers',
                },
            });
        }
        return [returnData];
    }
}
exports.OutlineAiTools = OutlineAiTools;
