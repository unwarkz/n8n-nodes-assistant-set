"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantAiTools = void 0;

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
 * QdrantAiTools - n8n AI sub-node
 *
 * Exposes all Qdrant vector store operations as DynamicStructuredTool instances
 * consumable by the n8n AI Agent node.
 *
 * Optional sub-node inputs:
 *   - Embedding (ai_embedding): Required for semantic search (qdrant_search,
 *     qdrant_recommend). Without it, only filter/ID-based operations are available.
 *   - Reranker (ai_reranker): When connected, search results are passed through the
 *     reranker (LangChain BaseDocumentCompressor interface) before being returned,
 *     improving retrieval quality for RAG pipelines.
 *
 * Connect the "Tool" output to an AI Agent node's "Tools" input.
 *
 * Available tools (configurable):
 *  - qdrant_search              : Semantic vector search (requires Embedding sub-node)
 *  - qdrant_scroll              : Scroll through all points with optional filter
 *  - qdrant_get_points          : Retrieve specific points by ID
 *  - qdrant_upsert_points       : Insert or update points with raw vectors
 *  - qdrant_delete_points       : Delete points by IDs or filter
 *  - qdrant_count_points        : Count points matching a filter
 *  - qdrant_recommend           : Find similar points using positive/negative examples
 *  - qdrant_list_collections    : List all collections in the Qdrant instance
 *  - qdrant_get_collection_info : Get detailed info about a collection
 *  - qdrant_create_collection   : Create a new collection with vector config
 *  - qdrant_delete_collection   : Permanently delete a collection
 *  - qdrant_update_collection   : Update optimizers, HNSW, and quantization config
 *  - qdrant_create_snapshot     : Create a collection snapshot for backup/export
 *  - qdrant_list_snapshots      : List all snapshots for a collection
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
 * Rerank search results using the connected reranker sub-node.
 *
 * Tries the following interfaces in order (all are valid LangChain / n8n patterns):
 *   1. compressDocuments(docs, query)  — LangChain BaseDocumentCompressor
 *   2. rerank(query, documents)        — direct rerank method
 *   3. invoke({ query, documents })    — generic LangChain invoke pattern
 *
 * Returns the reranked array of { id, payload, score } objects that match the
 * original search result structure so callers can use results uniformly.
 */
async function rerankResults(reranker, query, searchResults) {
    if (!reranker || !searchResults.length) return searchResults;

    // Build LangChain Document objects from search results
    const docs = searchResults.map((r, i) => ({
        pageContent: (r.payload && r.payload.text) || JSON.stringify(r.payload || {}),
        metadata: Object.assign({ _qdrant_index: i }, r.payload || {}),
        id: String(r.id),
    }));

    try {
        // Interface 1: LangChain BaseDocumentCompressor
        if (typeof reranker.compressDocuments === 'function') {
            const reranked = await reranker.compressDocuments(docs, query);
            return reranked.map(d => {
                const origIdx = d.metadata && d.metadata._qdrant_index != null
                    ? d.metadata._qdrant_index
                    : searchResults.findIndex(r => String(r.id) === d.id);
                const orig = searchResults[origIdx >= 0 ? origIdx : 0] || {};
                return Object.assign({}, orig, {
                    rerank_score: d.metadata && d.metadata.relevanceScore != null
                        ? d.metadata.relevanceScore
                        : undefined,
                });
            });
        }

        // Interface 2: direct rerank(query, documents)
        if (typeof reranker.rerank === 'function') {
            const rankings = await reranker.rerank(query, docs.map(d => d.pageContent));
            const sorted = (Array.isArray(rankings) ? rankings : [])
                .sort((a, b) => (b.relevanceScore || b.score || 0) - (a.relevanceScore || a.score || 0));
            return sorted.map(r => {
                const idx = r.index != null ? r.index : 0;
                return Object.assign({}, searchResults[idx] || {}, { rerank_score: r.relevanceScore || r.score });
            });
        }

        // Interface 3: LangChain invoke pattern
        if (typeof reranker.invoke === 'function') {
            const result = await reranker.invoke({ query, documents: docs.map(d => d.pageContent) });
            if (Array.isArray(result)) {
                return result.map((r, i) => Object.assign({}, searchResults[i] || {}, { rerank_score: r.score || r.relevanceScore }));
            }
        }
    } catch (_) { /* reranker call failed; return original results */ }

    return searchResults;
}

class QdrantAiTools {
    constructor() {
        this.description = {
            displayName: 'Qdrant AI Tools',
            name: 'qdrantAiTools',
            icon: 'file:qdrant.svg',
            group: ['transform'],
            version: 1,
            description:
                'Provides all Qdrant vector store operations (search, scroll, upsert, delete, collection management, snapshots) ' +
                'to an AI Agent. Optionally connect an Embedding model for semantic search and a Reranker to improve retrieval quality.',
            defaults: { name: 'Qdrant AI Tools' },
            inputs: [
                { type: 'ai_embedding', required: false },
                { type: 'ai_reranker', required: false },
            ],
            inputNames: ['Embedding', 'Reranker'],
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
                    description: 'Default collection name used when no collection is specified in a tool call.',
                    placeholder: 'documents',
                },
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        {
                            name: 'Semantic Search',
                            value: 'search',
                            description: 'Embed a query and find the most similar vectors in a collection (requires Embedding sub-node). Reranker is applied automatically if connected.',
                        },
                        {
                            name: 'Scroll Points',
                            value: 'scroll',
                            description: 'Page through all points in a collection with optional filter and field selection',
                        },
                        {
                            name: 'Get Points by ID',
                            value: 'getPoints',
                            description: 'Retrieve specific points by their IDs',
                        },
                        {
                            name: 'Upsert Points',
                            value: 'upsertPoints',
                            description: 'Insert or update points with pre-computed vectors (use qdrant_store_text for automatic embedding)',
                        },
                        {
                            name: 'Delete Points',
                            value: 'deletePoints',
                            description: 'Delete points by IDs or by a filter expression',
                        },
                        {
                            name: 'Count Points',
                            value: 'countPoints',
                            description: 'Count how many points match a given filter in a collection',
                        },
                        {
                            name: 'Recommend Points',
                            value: 'recommend',
                            description: 'Find points similar to positive examples and dissimilar from negative examples using stored point IDs',
                        },
                        {
                            name: 'List Collections',
                            value: 'listCollections',
                            description: 'List all collections in the Qdrant instance',
                        },
                        {
                            name: 'Get Collection Info',
                            value: 'getCollectionInfo',
                            description: 'Get detailed configuration and statistics for a collection',
                        },
                        {
                            name: 'Create Collection',
                            value: 'createCollection',
                            description: 'Create a new Qdrant collection with vector configuration',
                        },
                        {
                            name: 'Delete Collection',
                            value: 'deleteCollection',
                            description: 'Permanently delete a collection and all its data',
                        },
                        {
                            name: 'Update Collection',
                            value: 'updateCollection',
                            description: 'Update optimizer, HNSW, and quantization settings for an existing collection',
                        },
                        {
                            name: 'Create Snapshot',
                            value: 'createSnapshot',
                            description: 'Create a snapshot of a collection for backup or export',
                        },
                        {
                            name: 'List Snapshots',
                            value: 'listSnapshots',
                            description: 'List all available snapshots for a collection',
                        },
                    ],
                    default: [
                        'search', 'scroll', 'getPoints', 'deletePoints',
                        'listCollections', 'getCollectionInfo', 'createCollection',
                    ],
                    description: 'Which Qdrant tools to expose to the AI Agent',
                },
                {
                    displayName: 'Default Search Limit',
                    name: 'defaultSearchLimit',
                    type: 'number',
                    default: 10,
                    typeOptions: { minValue: 1 },
                    description: 'Default number of results returned by qdrant_search when no limit is specified',
                },
                {
                    displayName: 'Include Payload in Results',
                    name: 'withPayload',
                    type: 'boolean',
                    default: true,
                    description: 'Whether to include the stored payload (metadata + text) in search and scroll results by default',
                },
                {
                    displayName: 'Include Vectors in Results',
                    name: 'withVectors',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to include the raw vector data in search and retrieval results. Disable to reduce response size.',
                },
            ],
        };
    }

    async supplyData(itemIndex) {
        const self = this;
        const defaultCollection = this.getNodeParameter('defaultCollection', itemIndex, 'documents');
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, [
            'search', 'scroll', 'getPoints', 'deletePoints', 'listCollections', 'getCollectionInfo', 'createCollection',
        ]);
        const defaultSearchLimit = this.getNodeParameter('defaultSearchLimit', itemIndex, 10);
        const withPayload = this.getNodeParameter('withPayload', itemIndex, true);
        const withVectors = this.getNodeParameter('withVectors', itemIndex, false);

        // Optional embedding model sub-node (for semantic search)
        let embedder = null;
        try {
            embedder = await this.getInputConnectionData('ai_embedding', 0);
        } catch (_) { /* not connected */ }

        // Optional reranker sub-node (for improving search result quality)
        let reranker = null;
        try {
            reranker = await this.getInputConnectionData('ai_reranker', 0);
        } catch (_) { /* not connected */ }

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

        // ── Zod schema helpers ────────────────────────────────────────────────
        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function numOpt(desc) { return z ? z.number().optional().describe(desc) : undefined; }
        function boolOpt(desc) { return z ? z.boolean().optional().describe(desc) : undefined; }
        function recOpt(desc) { return z ? z.record(z.any()).optional().describe(desc) : undefined; }
        function anyOpt(desc) { return z ? z.any().optional().describe(desc) : undefined; }

        const tools = [];

        // ── Tool: qdrant_search ───────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('search')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_search',
                description:
                    'Perform a semantic vector search in a Qdrant collection. ' +
                    'Embeds the query text using the connected Embedding sub-node, then finds the most similar ' +
                    'stored vectors. If a Reranker sub-node is connected, search results are automatically ' +
                    'reranked for improved relevance before being returned. ' +
                    'Use this to retrieve knowledge, find similar documents, or answer questions from the vector store.',
                schema: z ? z.object({
                    query: z.string().describe('Natural language search query to embed and search for'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    limit: numOpt(`Maximum number of results to return (default: ${defaultSearchLimit})`),
                    score_threshold: numOpt('Minimum similarity score (0-1 for Cosine/Dot, any for Euclid). Results below this threshold are excluded.'),
                    filter: recOpt('Qdrant filter object to restrict results to matching payloads (e.g., { "must": [{ "key": "source", "match": { "value": "wiki" } }] })'),
                    with_payload: boolOpt(`Include payload (metadata + text) in results (default: ${withPayload})`),
                    with_vectors: boolOpt(`Include raw vectors in results (default: ${withVectors})`),
                }) : null,
                func: async ({ query, collection, limit, score_threshold, filter, with_payload, with_vectors } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_search', collection: collectionName, query });
                    log('debug', '[Qdrant] qdrant_search called', { collection: collectionName, query });
                    try {
                        if (!query) return JSON.stringify({ error: 'query is required' });
                        if (!embedder) {
                            return JSON.stringify({
                                error: 'No embedding model connected. Connect an Embedding sub-node to the "Embedding" input to use semantic search.',
                            });
                        }
                        const queryVectors = await embedder.embedQuery(query);
                        const searchBody = {
                            vector: queryVectors,
                            limit: limit || defaultSearchLimit,
                            with_payload: with_payload !== undefined ? with_payload : withPayload,
                            with_vector: with_vectors !== undefined ? with_vectors : withVectors,
                        };
                        if (score_threshold != null) searchBody.score_threshold = score_threshold;
                        if (filter) searchBody.filter = filter;

                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/points/search`, searchBody);
                        let results = (response && response.result) ? response.result : [];

                        // Apply reranker if connected
                        if (reranker && results.length > 0) {
                            log('debug', '[Qdrant] qdrant_search applying reranker', { count: results.length });
                            results = await rerankResults(reranker, query, results);
                        }

                        const res = {
                            results,
                            count: results.length,
                            collection: collectionName,
                            reranked: reranker != null && results.length > 0,
                        };
                        log('info', '[Qdrant] qdrant_search succeeded', { collection: collectionName, count: results.length, reranked: res.reranked });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_search failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_scroll ───────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('scroll')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_scroll',
                description:
                    'Scroll through points in a Qdrant collection page by page. ' +
                    'Supports optional filtering to retrieve only matching points. ' +
                    'Use next_page_offset from a previous result to paginate. ' +
                    'Useful for bulk retrieval, data export, or inspecting stored documents.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    limit: numOpt('Number of points to return per page (default: 10)'),
                    offset: anyOpt('Pagination offset — pass the next_page_offset from a previous scroll result to get the next page'),
                    filter: recOpt('Qdrant filter object to return only matching points'),
                    with_payload: boolOpt(`Include payload in results (default: ${withPayload})`),
                    with_vectors: boolOpt(`Include raw vectors in results (default: ${withVectors})`),
                }) : null,
                func: async ({ collection, limit, offset, filter, with_payload, with_vectors } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_scroll', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_scroll called', { collection: collectionName });
                    try {
                        const body = {
                            limit: limit || 10,
                            with_payload: with_payload !== undefined ? with_payload : withPayload,
                            with_vector: with_vectors !== undefined ? with_vectors : withVectors,
                        };
                        if (offset != null) body.offset = offset;
                        if (filter) body.filter = filter;
                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/points/scroll`, body);
                        const points = (response && response.result && response.result.points) || [];
                        const nextOffset = (response && response.result && response.result.next_page_offset) || null;
                        const res = { points, count: points.length, next_page_offset: nextOffset, collection: collectionName };
                        log('info', '[Qdrant] qdrant_scroll succeeded', { collection: collectionName, count: points.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_scroll failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_get_points ───────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('getPoints')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_get_points',
                description:
                    'Retrieve one or more specific points from a Qdrant collection by their IDs. ' +
                    'Returns full point data including payload and optionally vectors.',
                schema: z ? z.object({
                    ids: z.array(z.union([z.string(), z.number()])).describe('Array of point IDs to retrieve'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    with_payload: boolOpt(`Include payload in results (default: ${withPayload})`),
                    with_vectors: boolOpt(`Include raw vectors in results (default: ${withVectors})`),
                }) : null,
                func: async ({ ids, collection, with_payload, with_vectors } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_get_points', collection: collectionName, count: (ids || []).length });
                    log('debug', '[Qdrant] qdrant_get_points called', { collection: collectionName, count: (ids || []).length });
                    try {
                        if (!ids || !ids.length) return JSON.stringify({ error: 'ids array is required and must not be empty' });
                        const body = {
                            ids,
                            with_payload: with_payload !== undefined ? with_payload : withPayload,
                            with_vector: with_vectors !== undefined ? with_vectors : withVectors,
                        };
                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/points`, body);
                        const points = (response && response.result) || [];
                        const res = { points, count: points.length, collection: collectionName };
                        log('info', '[Qdrant] qdrant_get_points succeeded', { collection: collectionName, count: points.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_get_points failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_upsert_points ────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('upsertPoints')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_upsert_points',
                description:
                    'Insert or update points in a Qdrant collection using pre-computed vectors. ' +
                    'Use this when you already have vector embeddings. ' +
                    'For automatic embedding from text, use qdrant_store_text instead. ' +
                    'For automatic embedding from binary files, use qdrant_store_binary_file instead.',
                schema: z ? z.object({
                    points: z.array(z.object({
                        id: z.union([z.string(), z.number()]).describe('Point ID (UUID string or positive integer)'),
                        vector: z.array(z.number()).describe('Pre-computed embedding vector (must match collection vector_size)'),
                        payload: recOpt('Metadata to store with the point'),
                    })).describe('Array of point objects to upsert'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                }) : null,
                func: async ({ points, collection } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_upsert_points', collection: collectionName, count: (points || []).length });
                    log('debug', '[Qdrant] qdrant_upsert_points called', { collection: collectionName, count: (points || []).length });
                    try {
                        if (!points || !points.length) return JSON.stringify({ error: 'points array is required and must not be empty' });
                        await qdrantRequest(self, 'PUT', `/collections/${collectionName}/points`, { points });
                        const res = { success: true, upserted_count: points.length, collection: collectionName };
                        log('info', '[Qdrant] qdrant_upsert_points succeeded', { collection: collectionName, count: points.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_upsert_points failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_delete_points ────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('deletePoints')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_delete_points',
                description:
                    'Delete points from a Qdrant collection either by providing specific IDs or by a filter expression. ' +
                    'Provide either ids or filter — if both are given, ids takes precedence.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    ids: z ? z.array(z.union([z.string(), z.number()])).optional()
                        .describe('Array of point IDs to delete') : undefined,
                    filter: recOpt('Qdrant filter — delete all points matching this filter (e.g., { "must": [{ "key": "source", "match": { "value": "old" } }] })'),
                }) : null,
                func: async ({ collection, ids, filter } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_delete_points', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_delete_points called', { collection: collectionName });
                    try {
                        if (!ids && !filter) return JSON.stringify({ error: 'Either ids or filter is required' });
                        let body;
                        if (ids && ids.length) {
                            body = { points: ids };
                        } else {
                            body = { filter };
                        }
                        await qdrantRequest(self, 'POST', `/collections/${collectionName}/points/delete`, body);
                        const res = {
                            success: true,
                            collection: collectionName,
                            deleted_by: ids ? 'ids' : 'filter',
                            ids_count: ids ? ids.length : undefined,
                        };
                        log('info', '[Qdrant] qdrant_delete_points succeeded', { collection: collectionName });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_delete_points failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_count_points ─────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('countPoints')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_count_points',
                description:
                    'Count how many points exist in a Qdrant collection, optionally filtered. ' +
                    'Useful for checking collection size, verifying store operations, or conditional logic.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    filter: recOpt('Optional Qdrant filter — count only matching points'),
                    exact: boolOpt('Use exact count (slower) vs approximate count (default: true)'),
                }) : null,
                func: async ({ collection, filter, exact } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_count_points', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_count_points called', { collection: collectionName });
                    try {
                        const body = { exact: exact !== undefined ? exact : true };
                        if (filter) body.filter = filter;
                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/points/count`, body);
                        const count = (response && response.result && response.result.count) != null
                            ? response.result.count : response;
                        const res = { count, collection: collectionName };
                        log('info', '[Qdrant] qdrant_count_points succeeded', { collection: collectionName, count });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_count_points failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_recommend ────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('recommend')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_recommend',
                description:
                    'Find points similar to a set of positive example points and dissimilar from negative examples, ' +
                    'using the IDs of stored points. ' +
                    'Useful for "more like this" recommendations, content-based filtering, and exploration.',
                schema: z ? z.object({
                    positive: z.array(z.union([z.string(), z.number()])).describe('IDs of points to use as positive examples (find similar to these)'),
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    negative: z ? z.array(z.union([z.string(), z.number()])).optional()
                        .describe('IDs of points to use as negative examples (avoid similar to these)') : undefined,
                    limit: numOpt(`Max results to return (default: ${defaultSearchLimit})`),
                    score_threshold: numOpt('Minimum similarity score threshold'),
                    filter: recOpt('Additional filter to restrict recommendation space'),
                    with_payload: boolOpt(`Include payload in results (default: ${withPayload})`),
                }) : null,
                func: async ({ positive, collection, negative, limit, score_threshold, filter, with_payload } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_recommend', collection: collectionName, positive_count: (positive || []).length });
                    log('debug', '[Qdrant] qdrant_recommend called', { collection: collectionName });
                    try {
                        if (!positive || !positive.length) return JSON.stringify({ error: 'positive IDs array is required and must not be empty' });
                        const body = {
                            positive,
                            limit: limit || defaultSearchLimit,
                            with_payload: with_payload !== undefined ? with_payload : withPayload,
                        };
                        if (negative && negative.length) body.negative = negative;
                        if (score_threshold != null) body.score_threshold = score_threshold;
                        if (filter) body.filter = filter;
                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/points/recommend`, body);
                        const results = (response && response.result) || [];
                        const res = { results, count: results.length, collection: collectionName };
                        log('info', '[Qdrant] qdrant_recommend succeeded', { collection: collectionName, count: results.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_recommend failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_list_collections ─────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('listCollections')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_list_collections',
                description:
                    'List all collections in the Qdrant instance. ' +
                    'Returns collection names and basic metadata.',
                schema: z ? z.object({}) : null,
                func: async () => {
                    const runIndex = startToolRun({ tool: 'qdrant_list_collections' });
                    log('debug', '[Qdrant] qdrant_list_collections called');
                    try {
                        const response = await qdrantRequest(self, 'GET', '/collections');
                        const collections = (response && response.result && response.result.collections) || [];
                        const res = { collections, count: collections.length };
                        log('info', '[Qdrant] qdrant_list_collections succeeded', { count: collections.length });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_list_collections failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_get_collection_info ──────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('getCollectionInfo')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_get_collection_info',
                description:
                    'Get detailed configuration and statistics for a Qdrant collection, ' +
                    'including vector size, distance metric, point count, index status, and optimizer config.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                }) : null,
                func: async ({ collection } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_get_collection_info', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_get_collection_info called', { collection: collectionName });
                    try {
                        const response = await qdrantRequest(self, 'GET', `/collections/${collectionName}`);
                        const info = (response && response.result) || response;
                        log('info', '[Qdrant] qdrant_get_collection_info succeeded', { collection: collectionName });
                        endToolRun(runIndex, info);
                        return JSON.stringify(info);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_get_collection_info failed', errObj);
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
                    'Must be called before storing vectors if the collection does not exist. ' +
                    'vector_size must match the output dimensions of your embedding model.',
                schema: z ? z.object({
                    collection: z.string().describe('Name for the new collection'),
                    vector_size: z.number().describe(
                        'Embedding dimension — must match the embedding model output ' +
                        '(e.g., 1536 for OpenAI text-embedding-3-small, 3072 for text-embedding-3-large, ' +
                        '768 for most sentence-transformers, 512 for CLIP, 1024 for Cohere embed-v3)'
                    ),
                    distance: strOpt('"Cosine" | "Euclid" | "Dot" | "Manhattan" (default: "Cosine")'),
                    on_disk_payload: boolOpt('Store payload on disk instead of RAM (default: false)'),
                    hnsw_ef_construct: numOpt('HNSW ef_construct — higher = better recall, slower indexing (optional)'),
                    hnsw_m: numOpt('HNSW m — edges per node (optional)'),
                }) : null,
                func: async ({ collection, vector_size, distance, on_disk_payload, hnsw_ef_construct, hnsw_m } = {}) => {
                    const runIndex = startToolRun({ tool: 'qdrant_create_collection', collection });
                    log('debug', '[Qdrant] qdrant_create_collection called', { collection });
                    try {
                        if (!collection) return JSON.stringify({ error: 'collection name is required' });
                        if (!vector_size) return JSON.stringify({ error: 'vector_size is required' });
                        const body = { vectors: { size: Number(vector_size), distance: distance || 'Cosine' } };
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
                    'Permanently delete a Qdrant collection and all its vectors, payloads, and indexes. ' +
                    'This action cannot be undone.',
                schema: z ? z.object({
                    collection: z.string().describe('Name of the collection to delete'),
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

        // ── Tool: qdrant_update_collection ────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('updateCollection')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_update_collection',
                description:
                    'Update optimizer, HNSW, and quantization configuration for an existing Qdrant collection. ' +
                    'All parameters are optional — only provided fields are updated.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                    optimizers_config: recOpt('Optimizer settings (e.g., { "indexing_threshold": 20000, "memmap_threshold": 50000 })'),
                    hnsw_config: recOpt('HNSW index settings (e.g., { "ef_construct": 200, "m": 16 })'),
                    quantization_config: recOpt('Quantization settings (e.g., { "scalar": { "type": "int8", "quantile": 0.99 } })'),
                }) : null,
                func: async ({ collection, optimizers_config, hnsw_config, quantization_config } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_update_collection', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_update_collection called', { collection: collectionName });
                    try {
                        const body = {};
                        if (optimizers_config) body.optimizers_config = optimizers_config;
                        if (hnsw_config) body.hnsw_config = hnsw_config;
                        if (quantization_config) body.quantization_config = quantization_config;
                        if (!Object.keys(body).length) {
                            return JSON.stringify({ error: 'At least one of optimizers_config, hnsw_config, or quantization_config is required' });
                        }
                        await qdrantRequest(self, 'PATCH', `/collections/${collectionName}`, body);
                        const res = { success: true, collection: collectionName, updated: Object.keys(body) };
                        log('info', '[Qdrant] qdrant_update_collection succeeded', { collection: collectionName });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_update_collection failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_create_snapshot ──────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('createSnapshot')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_create_snapshot',
                description:
                    'Create a snapshot of a Qdrant collection for backup, migration, or export. ' +
                    'Returns the snapshot name and creation time.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                }) : null,
                func: async ({ collection } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_create_snapshot', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_create_snapshot called', { collection: collectionName });
                    try {
                        const response = await qdrantRequest(self, 'POST', `/collections/${collectionName}/snapshots`);
                        const snapshot = (response && response.result) || response;
                        const res = { success: true, collection: collectionName, snapshot };
                        log('info', '[Qdrant] qdrant_create_snapshot succeeded', { collection: collectionName });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_create_snapshot failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: qdrant_list_snapshots ───────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('listSnapshots')) {
            tools.push(new DynamicStructuredTool({
                name: 'qdrant_list_snapshots',
                description:
                    'List all available snapshots for a Qdrant collection. ' +
                    'Returns snapshot names, creation times, and sizes.',
                schema: z ? z.object({
                    collection: strOpt(`Qdrant collection name (default: "${defaultCollection}")`),
                }) : null,
                func: async ({ collection } = {}) => {
                    const collectionName = collection || defaultCollection;
                    const runIndex = startToolRun({ tool: 'qdrant_list_snapshots', collection: collectionName });
                    log('debug', '[Qdrant] qdrant_list_snapshots called', { collection: collectionName });
                    try {
                        const response = await qdrantRequest(self, 'GET', `/collections/${collectionName}/snapshots`);
                        const snapshots = (response && response.result) || [];
                        const res = { snapshots, count: Array.isArray(snapshots) ? snapshots.length : 0, collection: collectionName };
                        log('info', '[Qdrant] qdrant_list_snapshots succeeded', { collection: collectionName });
                        endToolRun(runIndex, res);
                        return JSON.stringify(res);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Qdrant] qdrant_list_snapshots failed', errObj);
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
                        'Qdrant AI Tools is designed to be used with an AI Agent. ' +
                        'Connect the "Tool" output to an AI Agent node\'s "Tools" input. ' +
                        'Optionally connect an Embedding model to the "Embedding" input for semantic search, ' +
                        'and a Reranker to the "Reranker" input to improve retrieval quality.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                    documentation: 'https://qdrant.tech/documentation/',
                },
            });
        }
        return [returnData];
    }
}
exports.QdrantAiTools = QdrantAiTools;
