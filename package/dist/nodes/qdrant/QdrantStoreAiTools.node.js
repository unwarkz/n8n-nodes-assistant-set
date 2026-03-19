"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantStoreAiTools = void 0;

/**
 * Load zod for schema definitions (available in n8n's runtime environment).
 */
let z = null;
try { z = require('zod'); } catch (_) { /* no zod */ }

/**
 * Load DynamicStructuredTool from LangChain (available in n8n's runtime environment).
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
        async call(arg, _configArg) { return this.invoke(arg); }
        _type() { return 'structured'; }
    };
})();

/**
 * QdrantStoreAiTools - n8n AI sub-node
 *
 * Embeds and stores documents (text and binary files) into a Qdrant vector store.
 * Requires an Embedding model sub-node connected to the "Embedding" input.
 *
 * Binary files are passed directly to the embedding sub-node, supporting multimodal
 * embedders (e.g. CLIP, Vertex AI multimodal embeddings). If the embedder cannot
 * handle a raw Buffer, the node falls back to a base64 data-URI string, then to a
 * plain-text description prefixed with filename and MIME type — so any embedder can
 * produce a usable vector for any binary file.
 *
 * Connect the "Tool" output to an AI Agent node's "Tools" input.
 *
 * Available tools (configurable):
 *  - qdrant_store_text          : Embed a text string and store as a vector point
 *  - qdrant_store_binary_file   : Send a binary file directly to the embedder and store
 *  - qdrant_batch_store_texts   : Embed and store multiple texts in one batch
 *  - qdrant_create_collection   : Create a Qdrant collection with vector config
 *  - qdrant_delete_collection   : Permanently delete a Qdrant collection
 */

// Process-global binary registry (PR#14 cross-module binary sharing)
if (!global._n8nBinaryRegistry) {
    global._n8nBinaryRegistry = new Map();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

async function qdrantRequest(ctx, method, path, body) {
    const credentials = await ctx.getCredentials('qdrantApi');
    const baseUrl = (credentials.qdrantUrl || 'http://localhost:6333').replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (credentials.apiKey) headers['api-key'] = String(credentials.apiKey);
    const options = { method, url: `${baseUrl}${path}`, headers };
    if (body !== undefined) options.body = body;
    return ctx.helpers.httpRequest(options);
}

/**
 * Embed binary data using the connected embedder sub-node.
 *
 * Strategy (tried in order):
 *   1. Pass the raw Buffer directly — multimodal embedders (CLIP, Vertex AI multimodal,
 *      etc.) accept Buffer or ArrayBuffer natively.
 *   2. Pass a base64 data-URI string ("data:<mimeType>;base64,<data>") — covers
 *      embedders that accept image data-URIs as strings.
 *   3. Fallback plain-text string:
 *        "filename: <name>\nfiletype: <mime>\ncontent_base64: <b64>"
 *      — ensures any text embedder produces a usable (if approximate) vector.
 *
 * Returns { vector: number[], method: string } where method identifies which
 * strategy succeeded, for logging/debugging.
 */
async function embedBinaryData(embedder, buffer, mimeType, filename) {
    if (!embedder) {
        throw new Error(
            'No embedding model connected. Connect an Embedding model sub-node to the "Embedding" input.'
        );
    }

    // Strategy 1 — direct Buffer (multimodal embedders)
    try {
        const vectors = await embedder.embedDocuments([buffer]);
        if (vectors && vectors[0] && vectors[0].length > 0) {
            return { vector: vectors[0], method: 'multimodal_direct' };
        }
    } catch (_) { /* embedder does not accept Buffer; try next */ }

    // Strategy 2 — base64 data-URI string
    try {
        const b64 = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${b64}`;
        const vectors = await embedder.embedDocuments([dataUri]);
        if (vectors && vectors[0] && vectors[0].length > 0) {
            return { vector: vectors[0], method: 'base64_data_uri' };
        }
    } catch (_) { /* embedder does not accept data-URI; try next */ }

    // Strategy 3 — descriptive text with base64 content and file metadata
    const b64Fallback = buffer.toString('base64');
    const description =
        `filename: ${filename}\nfiletype: ${mimeType}\nsize_bytes: ${buffer.length}\ncontent_base64: ${b64Fallback}`;
    const vectors = await embedder.embedDocuments([description]);
    return { vector: vectors[0], method: 'base64_text_fallback' };
}

class QdrantStoreAiTools {
    constructor() {
        this.description = {
            displayName: 'Qdrant Store AI Tools',
            name: 'qdrantStoreAiTools',
            icon: 'file:qdrant.svg',
            group: ['transform'],
            version: 1,
            description:
                'Embed text and binary files into a Qdrant vector store using a connected embedding model. ' +
                'Binary files are sent directly to the embedder (multimodal support with automatic fallback). ' +
                'Connect an Embedding model to the "Embedding" input and the "Tool" output to an AI Agent.',
            defaults: { name: 'Qdrant Store AI Tools' },
            inputs: ['ai_embedding'],
            inputNames: ['Embedding'],
            outputs: ['ai_tool'],
            outputNames: ['Tool'],
            credentials: [{ name: 'qdrantApi', required: true }],
            codex: {
                categories: ['AI'],
                subcategories: { AI: ['Tools', 'Agents & LLMs', 'Vector Stores'] },
                resources: { primaryDocumentation: [{ url: 'https://qdrant.tech/documentation/' }] },
            },
            properties: [
                {
                    displayName: 'Default Collection',
                    name: 'defaultCollection',
                    type: 'string',
                    default: 'documents',
                    required: true,
                    description: 'Default Qdrant collection name to store vectors in. Must exist or be created via the "Create Collection" tool.',
                    placeholder: 'documents',
                },
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        {
                            name: 'Store Text',
                            value: 'storeText',
                            description: 'Embed a text string and store it as a vector point in Qdrant',
                        },
                        {
                            name: 'Store Binary File',
                            value: 'storeBinary',
                            description: 'Send a binary file directly to the multimodal embedder and store the vector. Accepts any binary property reference.',
                        },
                        {
                            name: 'Batch Store Texts',
                            value: 'batchStore',
                            description: 'Embed and store multiple text strings in a single batch operation',
                        },
                        {
                            name: 'Create Collection',
                            value: 'createCollection',
                            description: 'Create a new Qdrant collection with the specified vector configuration',
                        },
                        {
                            name: 'Delete Collection',
                            value: 'deleteCollection',
                            description: 'Permanently delete a Qdrant collection and all its data',
                        },
                    ],
                    default: ['storeText', 'storeBinary', 'createCollection'],
                    description: 'Which tools to expose to the AI Agent',
                },
            ],
        };
    }

    async supplyData(itemIndex) {
        const self = this;
        const defaultCollection = this.getNodeParameter('defaultCollection', itemIndex, 'documents');
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, ['storeText', 'storeBinary', 'createCollection']);

        // Retrieve the connected embedding model (LangChain Embeddings instance)
        let embedder = null;
        try {
            embedder = await this.getInputConnectionData('ai_embedding', 0);
        } catch (_) { /* embedder not yet connected */ }

        // ── Logging helpers ───────────────────────────────────────────────────
        function log(level, message, meta) {
            try {
                if (self.logger && typeof self.logger[level] === 'function') {
                    self.logger[level](message, meta);
                }
            } catch (_) {}
        }

        // ── Execution logging (n8n AI tool run tracking) ──────────────────────
        function startToolRun(payload) {
            try {
                const { index } = self.addInputData('ai_tool', [[{ json: payload }]]);
                return index;
            } catch (_) { return 0; }
        }

        function endToolRun(runIndex, data) {
            try {
                const json = (data !== null && typeof data === 'object' && !Array.isArray(data))
                    ? data : { result: data };
                self.addOutputData('ai_tool', runIndex, [[{ json }]]);
            } catch (_) {}
        }

        // ── Binary registry helpers (PR#14 cross-module pattern) ──────────────
        async function getBinaryInputBuffer(binaryPropertyName) {
            const reg = global._n8nBinaryRegistry;
            if (reg && reg.has(binaryPropertyName)) {
                return reg.get(binaryPropertyName).buffer;
            }
            return self.helpers.getBinaryDataBuffer(0, binaryPropertyName);
        }

        function getBinaryMeta(binaryPropertyName) {
            const reg = global._n8nBinaryRegistry;
            if (reg && reg.has(binaryPropertyName)) {
                return reg.get(binaryPropertyName).binaryData;
            }
            const items = self.getInputData ? self.getInputData() : [];
            const item = items && items[0];
            if (item && item.binary && item.binary[binaryPropertyName]) {
                return item.binary[binaryPropertyName];
            }
            return null;
        }

        // ── Embed text helper ─────────────────────────────────────────────────
        async function embedText(text) {
            if (!embedder) {
                throw new Error(
                    'No embedding model connected. Connect an Embedding model sub-node to the "Embedding" input.'
                );
            }
            const vectors = await embedder.embedDocuments([text]);
            return vectors[0];
        }

        // ── Zod schema helpers ────────────────────────────────────────────────
        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function numOpt(desc) { return z ? z.number().optional().describe(desc) : undefined; }
        function recOpt(desc) { return z ? z.record(z.any()).optional().describe(desc) : undefined; }

        const tools = [];

        // ── Tool: qdrant_store_text ───────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('storeText')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_store_text',
                description:
                    'Embed a text string using the connected embedding model and store it as a vector point in Qdrant. ' +
                    'Use this to add knowledge, documents, or any text to the vector store for later semantic retrieval. ' +
                    `Stores in collection "${defaultCollection}" by default. Returns the point ID of the stored vector.`,
                schema: z ? z.object({
                    text: z.string().describe('The text content to embed and store as a vector point'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    point_id: strOpt('Optional custom ID for the point (UUID string or positive integer as string). Auto-generated UUID if omitted.'),
                    metadata: recOpt('Key-value metadata to store alongside the vector (e.g., source, title, author, url, date)'),
                }) : null,
                func: async ({ text, collection, point_id, metadata } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_store_text', collection: collectionName, textLength: (text || '').length });
                    log('debug', '[Qdrant] qdrant_store_text called', { collection: collectionName });
                    try {
                        if (!text) return JSON.stringify({ error: 'text is required' });
                        const vector = await embedText(text);
                        const resolvedId = point_id
                            ? (isNaN(Number(point_id)) ? point_id : Number(point_id))
                            : generateId();
                        const point = {
                            id: resolvedId,
                            vector,
                            payload: Object.assign({ text, stored_at: new Date().toISOString() }, metadata || {}),
                        };
                        await qdrantRequest(self, 'PUT', `/collections/${collectionName}/points`, { points: [point] });
                        const res = { success: true, point_id: resolvedId, collection: collectionName, vector_size: vector.length };
                        log('info', '[Qdrant] qdrant_store_text succeeded', { collection: collectionName, point_id: resolvedId });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_store_text failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_store_binary_file ────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('storeBinary')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_store_binary_file',
                description:
                    'Retrieve a binary file from the shared binary registry (or n8n binary data system) and ' +
                    'send it directly to the multimodal embedding sub-node. ' +
                    'Supports images, audio, video, PDFs, office documents, and any other binary format. ' +
                    'The binary is tried as a raw Buffer first (native multimodal embedders). ' +
                    'If the embedder rejects it, falls back to a base64 data-URI ' +
                    '("data:<filetype>;base64,<data>"), then to a text string with filename, filetype, ' +
                    'and base64 content for text-only embedders. ' +
                    'For large plain-text files, use chunk_size to split into multiple points. ' +
                    'Pass the binary_property_name returned by tools like telegram_get_file or gotenberg tools.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Binary property name containing the file to embed (e.g., "telegram_file_0")'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    point_id: strOpt('Optional base ID for stored point(s). Auto-generated if omitted. Chunked points get suffix "_chunk_N".'),
                    chunk_size: numOpt('For plain-text files only: split into chunks of this many characters before embedding. Each chunk becomes a separate point.'),
                    metadata: recOpt('Additional metadata stored with each point (e.g., source, category, tags)'),
                }) : null,
                func: async ({ binary_property_name, collection, point_id, chunk_size, metadata } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_store_binary_file', binary_property_name, collection: collectionName });
                    log('debug', '[Qdrant] qdrant_store_binary_file called', { binary_property_name, collection: collectionName });
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBinaryInputBuffer(binary_property_name);
                        const metaInfo = getBinaryMeta(binary_property_name);
                        const filename = (metaInfo && metaInfo.fileName) || binary_property_name;
                        const mimeType = (metaInfo && metaInfo.mimeType) || 'application/octet-stream';

                        const basePayload = Object.assign(
                            { filename, mimeType, binary_property_name, stored_at: new Date().toISOString() },
                            metadata || {}
                        );

                        // For plain-text files with chunking requested, split and embed each chunk as text
                        const isTextFile =
                            mimeType.startsWith('text/') ||
                            mimeType === 'application/json' ||
                            mimeType === 'application/xml' ||
                            mimeType === 'application/javascript' ||
                            mimeType === 'application/x-yaml';

                        const storedIds = [];

                        if (isTextFile && chunk_size && chunk_size > 0) {
                            const fullText = buffer.toString('utf-8');
                            const chunks = [];
                            for (let i = 0; i < fullText.length; i += chunk_size) {
                                chunks.push(fullText.slice(i, i + chunk_size));
                            }
                            if (!embedder) {
                                return JSON.stringify({
                                    error: 'No embedding model connected. Connect an Embedding model sub-node to the "Embedding" input.',
                                });
                            }
                            const vectors = await embedder.embedDocuments(chunks);
                            const points = chunks.map((chunk, ci) => {
                                const chunkId = point_id
                                    ? `${point_id}_chunk_${ci}`
                                    : `${binary_property_name.replace(/[^a-z0-9_-]/gi, '_')}_chunk_${ci}`;
                                storedIds.push(chunkId);
                                return {
                                    id: chunkId,
                                    vector: vectors[ci],
                                    payload: Object.assign(
                                        { text: chunk, chunk_index: ci, total_chunks: chunks.length },
                                        basePayload
                                    ),
                                };
                            });
                            await qdrantRequest(self, 'PUT', `/collections/${collectionName}/points`, { points });
                        } else {
                            // Send binary directly to embedder (multimodal with fallback)
                            const { vector, method } = await embedBinaryData(embedder, buffer, mimeType, filename);
                            const resolvedId = point_id
                                ? (isNaN(Number(point_id)) ? point_id : Number(point_id))
                                : `${binary_property_name.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}`;
                            const point = {
                                id: resolvedId,
                                vector,
                                payload: Object.assign({ embed_method: method }, basePayload),
                            };
                            await qdrantRequest(self, 'PUT', `/collections/${collectionName}/points`, { points: [point] });
                            storedIds.push(resolvedId);
                            log('debug', '[Qdrant] qdrant_store_binary_file embedding method', { method });
                        }

                        const res = {
                            success: true,
                            stored_point_ids: storedIds,
                            stored_count: storedIds.length,
                            collection: collectionName,
                            filename,
                            mimeType,
                        };
                        log('info', '[Qdrant] qdrant_store_binary_file succeeded', { collection: collectionName, count: storedIds.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_store_binary_file failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_batch_store_texts ────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('batchStore')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_batch_store_texts',
                description:
                    'Embed and store multiple text strings into Qdrant in a single batch operation. ' +
                    'More efficient than calling qdrant_store_text repeatedly for many documents. ' +
                    'Embeds all texts in one call to the embedding model, then upserts all points at once. ' +
                    `Stores in collection "${defaultCollection}" by default.`,
                schema: z ? z.object({
                    texts: z.array(z.string()).describe('Array of text strings to embed and store as individual vector points'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    metadatas: z ? z.array(z.record(z.any())).optional()
                        .describe('Array of metadata objects, one per text (must match texts array length if provided)') : undefined,
                    id_prefix: strOpt('Optional prefix for auto-generated point IDs (default: "batch")'),
                }) : null,
                func: async ({ texts, collection, metadatas, id_prefix } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_batch_store_texts', collection: collectionName, count: (texts || []).length });
                    log('debug', '[Qdrant] qdrant_batch_store_texts called', { collection: collectionName, count: (texts || []).length });
                    try {
                        if (!texts || !texts.length) return JSON.stringify({ error: 'texts array is required and must not be empty' });
                        if (!embedder) {
                            return JSON.stringify({
                                error: 'No embedding model connected. Connect an Embedding model sub-node to the "Embedding" input.',
                            });
                        }
                        const vectors = await embedder.embedDocuments(texts);
                        const prefix = id_prefix || 'batch';
                        const timestamp = Date.now();
                        const points = texts.map((text, i) => ({
                            id: `${prefix}_${timestamp}_${i}`,
                            vector: vectors[i],
                            payload: Object.assign(
                                { text, stored_at: new Date().toISOString() },
                                (metadatas && metadatas[i]) || {}
                            ),
                        }));
                        await qdrantRequest(self, 'PUT', `/collections/${collectionName}/points`, { points });
                        const res = {
                            success: true,
                            stored_count: points.length,
                            collection: collectionName,
                            point_ids: points.map(p => p.id),
                        };
                        log('info', '[Qdrant] qdrant_batch_store_texts succeeded', { collection: collectionName, count: points.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_batch_store_texts failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_create_collection ────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('createCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_create_collection',
                description:
                    'Create a new Qdrant collection with the specified vector configuration. ' +
                    'Must be called before storing vectors if the collection does not exist yet. ' +
                    'The vector_size must match the output dimensions of your embedding model ' +
                    '(e.g., 1536 for OpenAI text-embedding-3-small, 3072 for text-embedding-3-large, ' +
                    '768 for most sentence-transformers, 512 for CLIP).',
                schema: z ? z.object({
                    collection: z.string().describe('Name for the new Qdrant collection'),
                    vector_size: z.number().describe(
                        'Embedding dimension — must match your embedding model output ' +
                        '(e.g., 1536 for OpenAI text-embedding-3-small, 3072 for text-embedding-3-large, ' +
                        '768 for most sentence-transformers, 512 for CLIP, 1024 for Cohere embed-v3)'
                    ),
                    distance: strOpt('"Cosine" | "Euclid" | "Dot" | "Manhattan" — similarity metric (default: "Cosine")'),
                    on_disk_payload: z ? z.boolean().optional()
                        .describe('Store payload on disk instead of RAM to reduce memory usage (default: false)') : undefined,
                    hnsw_ef_construct: numOpt('HNSW ef_construct — higher = better recall but slower indexing (optional, uses Qdrant default if omitted)'),
                    hnsw_m: numOpt('HNSW m — edges per node, controls graph connectivity (optional, uses Qdrant default if omitted)'),
                }) : null,
                func: async ({ collection, vector_size, distance, on_disk_payload, hnsw_ef_construct, hnsw_m } = {}) => {
                    const runIndex = startToolRun({ tool: 'qdrant_create_collection', collection });
                    log('debug', '[Qdrant] qdrant_create_collection called', { collection });
                    try {
                        if (!collection) return JSON.stringify({ error: 'collection name is required' });
                        if (!vector_size) return JSON.stringify({ error: 'vector_size is required — set it to the dimension count of your embedding model output' });
                        const body = {
                            vectors: {
                                size: Number(vector_size),
                                distance: distance || 'Cosine',
                            },
                        };
                        if (on_disk_payload !== undefined) body.on_disk_payload = Boolean(on_disk_payload);
                        if (hnsw_ef_construct || hnsw_m) {
                            body.hnsw_config = {};
                            if (hnsw_ef_construct) body.hnsw_config.ef_construct = Number(hnsw_ef_construct);
                            if (hnsw_m) body.hnsw_config.m = Number(hnsw_m);
                        }
                        await qdrantRequest(self, 'PUT', `/collections/${collection}`, body);
                        const res = { success: true, collection, vector_size: Number(vector_size), distance: distance || 'Cosine' };
                        log('info', '[Qdrant] qdrant_create_collection succeeded', { collection });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_create_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_delete_collection ────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('deleteCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_delete_collection',
                description:
                    'Permanently delete a Qdrant collection along with all its vectors, payloads, and indexes. ' +
                    'This action cannot be undone. Use with caution.',
                schema: z ? z.object({
                    collection: z.string().describe('Name of the Qdrant collection to permanently delete'),
                }) : null,
                func: async ({ collection } = {}) => {
                    const runIndex = startToolRun({ tool: 'qdrant_delete_collection', collection });
                    log('debug', '[Qdrant] qdrant_delete_collection called', { collection });
                    try {
                        if (!collection) return JSON.stringify({ error: 'collection name is required' });
                        await qdrantRequest(self, 'DELETE', `/collections/${collection}`);
                        const res = { success: true, collection, message: `Collection "${collection}" deleted successfully` };
                        log('info', '[Qdrant] qdrant_delete_collection succeeded', { collection });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_delete_collection failed', errObj);
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
     */
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            returnData.push({
                json: {
                    message:
                        'Qdrant Store AI Tools is designed to be used with an AI Agent. ' +
                        'Connect an Embedding model sub-node to the "Embedding" input, ' +
                        'and the "Tool" output to an AI Agent node\'s "Tools" input.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                    documentation: 'https://qdrant.tech/documentation/',
                },
            });
        }
        return [returnData];
    }
}
exports.QdrantStoreAiTools = QdrantStoreAiTools;
