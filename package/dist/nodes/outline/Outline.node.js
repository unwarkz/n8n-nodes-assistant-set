"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outline = void 0;
const n8n_workflow_1 = require("n8n-workflow");

// ── Shared HTTP helpers ──────────────────────────────────────────────────────

async function outlineApiRequest(ctx, endpoint, body) {
    const credentials = await ctx.getCredentials('outlineApi');
    const baseUrl = (credentials.baseUrl || 'https://app.getoutline.com').replace(/\/$/, '');
    const apiKey = credentials.apiKey;
    const options = {
        method: 'POST',
        url: `${baseUrl}/api${endpoint}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(body || {}),
        json: true,
    };
    try {
        return await ctx.helpers.request(options);
    } catch (error) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), error);
    }
}

async function outlineApiRequestMultipart(ctx, endpoint, formData) {
    const credentials = await ctx.getCredentials('outlineApi');
    const baseUrl = (credentials.baseUrl || 'https://app.getoutline.com').replace(/\/$/, '');
    const apiKey = credentials.apiKey;
    const options = {
        method: 'POST',
        url: `${baseUrl}/api${endpoint}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
        },
        formData,
        json: true,
    };
    try {
        return await ctx.helpers.request(options);
    } catch (error) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), error);
    }
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

// ── Node class ───────────────────────────────────────────────────────────────

class Outline {
    constructor() {
        this.description = {
            displayName: 'Outline Wiki',
            name: 'outline',
            icon: 'file:outline.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
            description: 'Interact with the Outline Wiki API — documents, collections, comments, attachments, users, shares',
            defaults: { name: 'Outline Wiki' },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [{ name: 'outlineApi', required: true }],
            codex: {
                categories: ['Productivity', 'Utility'],
                subcategories: {
                    Productivity: ['Documentation', 'Wiki'],
                },
                resources: {
                    primaryDocumentation: [{ url: 'https://www.getoutline.com/developers' }],
                },
            },
            properties: [
                // ── Resource ──────────────────────────────────────────────────────
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'Attachment', value: 'attachment', description: 'Manage file attachments' },
                        { name: 'Collection', value: 'collection', description: 'Manage document collections' },
                        { name: 'Comment', value: 'comment', description: 'Manage document comments' },
                        { name: 'Document', value: 'document', description: 'Create, read, update and delete documents' },
                        { name: 'Share', value: 'share', description: 'Manage public share links' },
                        { name: 'User', value: 'user', description: 'Manage workspace users' },
                    ],
                    default: 'document',
                },

                // ── Document Operations ──────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['document'] } },
                    options: [
                        { name: 'Answer Question', value: 'answerQuestion', description: 'Answer a natural-language question using AI (requires AI answers feature)', action: 'Answer a question using AI' },
                        { name: 'Archive', value: 'archive', description: 'Archive a document (restorable)', action: 'Archive a document' },
                        { name: 'Create', value: 'create', description: 'Create a new document', action: 'Create a document' },
                        { name: 'Delete', value: 'delete', description: 'Move a document to trash or permanently destroy it', action: 'Delete a document' },
                        { name: 'Export', value: 'export', description: 'Export a document as Markdown (returned as binary data)', action: 'Export a document' },
                        { name: 'Get', value: 'get', description: 'Retrieve a document by ID or URL slug', action: 'Get a document' },
                        { name: 'Import', value: 'import', description: 'Import a file (Markdown, HTML, DOCX, CSV…) as a new document', action: 'Import a document from file' },
                        { name: 'List', value: 'list', description: 'List documents with optional filters', action: 'List documents' },
                        { name: 'Move', value: 'move', description: 'Move a document to a different collection or parent', action: 'Move a document' },
                        { name: 'Restore', value: 'restore', description: 'Restore an archived or deleted document', action: 'Restore a document' },
                        { name: 'Search', value: 'search', description: 'Full-text search across all documents', action: 'Search documents' },
                        { name: 'Search Titles', value: 'searchTitles', description: 'Fast title-only search', action: 'Search document titles' },
                        { name: 'Update', value: 'update', description: 'Update a document title, body, or publish status', action: 'Update a document' },
                    ],
                    default: 'get',
                },

                // ── Collection Operations ────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['collection'] } },
                    options: [
                        { name: 'Create', value: 'create', description: 'Create a new collection', action: 'Create a collection' },
                        { name: 'Delete', value: 'delete', description: 'Delete a collection and ALL its documents (irreversible)', action: 'Delete a collection' },
                        { name: 'Export', value: 'export', description: 'Trigger a bulk export of a collection', action: 'Export a collection' },
                        { name: 'Get', value: 'get', description: 'Retrieve collection details by UUID', action: 'Get a collection' },
                        { name: 'Get Document Tree', value: 'getDocuments', description: 'Get the document hierarchy/tree for a collection', action: 'Get collection document tree' },
                        { name: 'List', value: 'list', description: 'List all accessible collections', action: 'List collections' },
                        { name: 'Update', value: 'update', description: 'Update a collection name, description, or settings', action: 'Update a collection' },
                    ],
                    default: 'list',
                },

                // ── Comment Operations ───────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['comment'] } },
                    options: [
                        { name: 'Create', value: 'create', description: 'Add a comment to a document', action: 'Create a comment' },
                        { name: 'Delete', value: 'delete', description: 'Delete a comment and all its replies', action: 'Delete a comment' },
                        { name: 'List', value: 'list', description: 'List comments on a document or within a collection', action: 'List comments' },
                        { name: 'Update', value: 'update', description: 'Edit an existing comment', action: 'Update a comment' },
                    ],
                    default: 'list',
                },

                // ── Attachment Operations ────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['attachment'] } },
                    options: [
                        { name: 'Delete', value: 'delete', description: 'Permanently delete an attachment', action: 'Delete an attachment' },
                        { name: 'Upload', value: 'upload', description: 'Upload a file as an Outline attachment (returns attachment URL)', action: 'Upload an attachment' },
                    ],
                    default: 'upload',
                },

                // ── User Operations ──────────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['user'] } },
                    options: [
                        { name: 'Get', value: 'get', description: 'Get details for a specific user', action: 'Get a user' },
                        { name: 'List', value: 'list', description: 'List workspace users', action: 'List users' },
                    ],
                    default: 'list',
                },

                // ── Share Operations ─────────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['share'] } },
                    options: [
                        { name: 'Create', value: 'create', description: 'Create a public share link for a document', action: 'Create a share link' },
                        { name: 'List', value: 'list', description: 'List existing share links', action: 'List share links' },
                        { name: 'Revoke', value: 'revoke', description: 'Revoke a share link', action: 'Revoke a share link' },
                    ],
                    default: 'list',
                },

                // ════════════════════════════════════════════════════════════════
                // DOCUMENT PARAMETERS
                // ════════════════════════════════════════════════════════════════

                // Document ID — used by get/update/delete/archive/restore/move/export/answerQuestion
                {
                    displayName: 'Document ID',
                    name: 'documentId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'Document UUID or URL slug (urlId)',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['get', 'update', 'delete', 'archive', 'restore', 'move', 'export'],
                        },
                    },
                },
                {
                    displayName: 'Document ID',
                    name: 'documentId',
                    type: 'string',
                    default: '',
                    required: false,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'UUID of a specific document to search within (optional)',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['answerQuestion'],
                        },
                    },
                },

                // Title — create, update
                {
                    displayName: 'Title',
                    name: 'title',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'My Document',
                    description: 'The document title',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['create'],
                        },
                    },
                },

                // Body — create (optional), update (optional)
                {
                    displayName: 'Body (Markdown)',
                    name: 'text',
                    type: 'string',
                    typeOptions: { rows: 8 },
                    default: '',
                    description: 'Document body in Markdown format',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['create'],
                        },
                    },
                },

                // Collection ID — required for create (unless parent given), list filter, import, move, search filter
                {
                    displayName: 'Collection ID',
                    name: 'collectionId',
                    type: 'string',
                    default: '',
                    required: false,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'UUID of the collection. Required for Create unless Parent Document ID is set.',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['create', 'list', 'move'],
                        },
                    },
                },
                {
                    displayName: 'Collection ID',
                    name: 'collectionId',
                    type: 'string',
                    default: '',
                    required: false,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'UUID of the collection to import the document into. Required unless Parent Document ID is set.',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['import'],
                        },
                    },
                },

                // Publish — create, import, update
                {
                    displayName: 'Publish',
                    name: 'publish',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to immediately publish (true) or save as draft (false)',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['create', 'import'],
                        },
                    },
                },

                // Search query
                {
                    displayName: 'Query',
                    name: 'query',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'meeting notes',
                    description: 'The search query',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['search', 'searchTitles'],
                        },
                    },
                },
                {
                    displayName: 'Question',
                    name: 'query',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'What is our vacation policy?',
                    description: 'A natural-language question to ask the AI against your knowledge base',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['answerQuestion'],
                        },
                    },
                },

                // Binary Property for import
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    required: true,
                    description: 'Name of the binary property containing the file to import (Markdown, HTML, DOCX, CSV…)',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['import'],
                        },
                    },
                },

                // Output binary property for export
                {
                    displayName: 'Output Binary Property',
                    name: 'outputBinaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property to store the exported Markdown file',
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['export'],
                        },
                    },
                },

                // Additional Fields for document: create
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['create'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Parent Document ID',
                            name: 'parentDocumentId',
                            type: 'string',
                            default: '',
                            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                            description: 'UUID of a parent document to create this as a child document under',
                        },
                        {
                            displayName: 'Template ID',
                            name: 'templateId',
                            type: 'string',
                            default: '',
                            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                            description: 'UUID of a template to use as the basis for this document',
                        },
                    ],
                },

                // Additional Fields for document: update
                {
                    displayName: 'Update Fields',
                    name: 'updateFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['update'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Title',
                            name: 'title',
                            type: 'string',
                            default: '',
                            description: 'New document title',
                        },
                        {
                            displayName: 'Body (Markdown)',
                            name: 'text',
                            type: 'string',
                            typeOptions: { rows: 8 },
                            default: '',
                            description: 'New document body in Markdown (replaces existing content)',
                        },
                        {
                            displayName: 'Publish',
                            name: 'publish',
                            type: 'boolean',
                            default: true,
                            description: 'Whether to publish (true) or unpublish (false) the document',
                        },
                        {
                            displayName: 'Full Width',
                            name: 'fullWidth',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to display the document in full-width layout',
                        },
                    ],
                },

                // Additional Fields for document: delete
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['delete'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Permanent',
                            name: 'permanent',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to permanently destroy the document (no recovery). Default: false (moves to trash).',
                        },
                    ],
                },

                // Additional Fields for document: list
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['list'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Parent Document ID',
                            name: 'parentDocumentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the parent document to list children of',
                        },
                        {
                            displayName: 'Status Filter',
                            name: 'statusFilter',
                            type: 'options',
                            options: [
                                { name: 'All', value: '' },
                                { name: 'Draft', value: 'draft' },
                                { name: 'Published', value: 'published' },
                                { name: 'Archived', value: 'archived' },
                            ],
                            default: '',
                            description: 'Filter by document status',
                        },
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                        {
                            displayName: 'Offset',
                            name: 'offset',
                            type: 'number',
                            default: 0,
                            description: 'Offset for pagination',
                        },
                    ],
                },

                // Additional Fields for document: search / searchTitles
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['search', 'searchTitles'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Collection ID',
                            name: 'collectionId',
                            type: 'string',
                            default: '',
                            description: 'Limit search to a specific collection UUID',
                        },
                        {
                            displayName: 'Status Filter',
                            name: 'statusFilter',
                            type: 'options',
                            options: [
                                { name: 'Published (default)', value: '' },
                                { name: 'Draft', value: 'draft' },
                                { name: 'Archived', value: 'archived' },
                            ],
                            default: '',
                            description: 'Filter results by document status',
                        },
                        {
                            displayName: 'Date Filter',
                            name: 'dateFilter',
                            type: 'options',
                            options: [
                                { name: 'All Time', value: '' },
                                { name: 'Past Day', value: 'day' },
                                { name: 'Past Week', value: 'week' },
                                { name: 'Past Month', value: 'month' },
                                { name: 'Past Year', value: 'year' },
                            ],
                            default: '',
                            description: 'Only return documents updated within this period',
                        },
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                    ],
                },

                // Additional Fields for document: import
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['import'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Parent Document ID',
                            name: 'parentDocumentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of a parent document to import as a child of (required unless Collection ID is set)',
                        },
                        {
                            displayName: 'Filename Override',
                            name: 'filenameOverride',
                            type: 'string',
                            default: '',
                            placeholder: 'notes.md',
                            description: 'Override filename (with extension). Uses binary metadata filename if not set.',
                        },
                    ],
                },

                // Additional Fields for document: move
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['move'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Parent Document ID',
                            name: 'parentDocumentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the new parent document (omit to move to collection root)',
                        },
                    ],
                },

                // Additional Fields for document: restore
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['restore'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Target Collection ID',
                            name: 'collectionId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the collection to restore the document into',
                        },
                        {
                            displayName: 'Revision ID',
                            name: 'revisionId',
                            type: 'string',
                            default: '',
                            description: 'UUID of a specific revision to restore to (optional)',
                        },
                    ],
                },

                // Additional Fields for document: export
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['export'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Output Filename',
                            name: 'outputFilename',
                            type: 'string',
                            default: 'document.md',
                            description: 'Filename for the exported Markdown file',
                        },
                    ],
                },

                // Additional Fields for document: answerQuestion
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['document'],
                            operation: ['answerQuestion'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Collection ID',
                            name: 'collectionId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the collection to search within (optional)',
                        },
                    ],
                },

                // ════════════════════════════════════════════════════════════════
                // COLLECTION PARAMETERS
                // ════════════════════════════════════════════════════════════════

                {
                    displayName: 'Collection ID',
                    name: 'collectionId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'Collection UUID',
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['get', 'update', 'delete', 'getDocuments', 'export'],
                        },
                    },
                },
                {
                    displayName: 'Name',
                    name: 'name',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'My Collection',
                    description: 'Collection name',
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['create'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Description',
                            name: 'description',
                            type: 'string',
                            typeOptions: { rows: 3 },
                            default: '',
                            description: 'A brief description (Markdown supported)',
                        },
                        {
                            displayName: 'Permission',
                            name: 'permission',
                            type: 'options',
                            options: [
                                { name: 'Read Only', value: 'read' },
                                { name: 'Read & Write', value: 'read_write' },
                            ],
                            default: 'read_write',
                            description: 'Default permission for members',
                        },
                        {
                            displayName: 'Allow Public Sharing',
                            name: 'sharing',
                            type: 'boolean',
                            default: false,
                            description: 'Whether public sharing of documents is allowed',
                        },
                        {
                            displayName: 'Color',
                            name: 'color',
                            type: 'color',
                            default: '',
                            description: 'Hex color code for the collection icon (e.g., #FF5733)',
                        },
                        {
                            displayName: 'Icon',
                            name: 'icon',
                            type: 'string',
                            default: '',
                            description: 'Icon name from outline-icons or an emoji character',
                        },
                    ],
                },
                {
                    displayName: 'Update Fields',
                    name: 'updateFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['update'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Name',
                            name: 'name',
                            type: 'string',
                            default: '',
                            description: 'New collection name',
                        },
                        {
                            displayName: 'Description',
                            name: 'description',
                            type: 'string',
                            typeOptions: { rows: 3 },
                            default: '',
                            description: 'New description (Markdown supported)',
                        },
                        {
                            displayName: 'Permission',
                            name: 'permission',
                            type: 'options',
                            options: [
                                { name: 'Read Only', value: 'read' },
                                { name: 'Read & Write', value: 'read_write' },
                            ],
                            default: 'read_write',
                            description: 'Default permission for members',
                        },
                        {
                            displayName: 'Allow Public Sharing',
                            name: 'sharing',
                            type: 'boolean',
                            default: false,
                            description: 'Whether public sharing of documents is allowed',
                        },
                        {
                            displayName: 'Color',
                            name: 'color',
                            type: 'color',
                            default: '',
                            description: 'Hex color code for the collection icon',
                        },
                        {
                            displayName: 'Icon',
                            name: 'icon',
                            type: 'string',
                            default: '',
                            description: 'Icon name or emoji',
                        },
                    ],
                },
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['list'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                        {
                            displayName: 'Offset',
                            name: 'offset',
                            type: 'number',
                            default: 0,
                            description: 'Offset for pagination',
                        },
                    ],
                },
                {
                    displayName: 'Export Format',
                    name: 'exportFormat',
                    type: 'options',
                    options: [
                        { name: 'Outline Markdown', value: 'outline-markdown' },
                        { name: 'JSON', value: 'json' },
                        { name: 'HTML', value: 'html' },
                    ],
                    default: 'outline-markdown',
                    description: 'Format for the collection export',
                    displayOptions: {
                        show: {
                            resource: ['collection'],
                            operation: ['export'],
                        },
                    },
                },

                // ════════════════════════════════════════════════════════════════
                // COMMENT PARAMETERS
                // ════════════════════════════════════════════════════════════════

                {
                    displayName: 'Document ID',
                    name: 'documentId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'UUID of the document to comment on',
                    displayOptions: {
                        show: {
                            resource: ['comment'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Comment ID',
                    name: 'commentId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'Comment UUID',
                    displayOptions: {
                        show: {
                            resource: ['comment'],
                            operation: ['update', 'delete'],
                        },
                    },
                },
                {
                    displayName: 'Text',
                    name: 'text',
                    type: 'string',
                    typeOptions: { rows: 4 },
                    default: '',
                    required: true,
                    description: 'Comment body in Markdown format',
                    displayOptions: {
                        show: {
                            resource: ['comment'],
                            operation: ['create', 'update'],
                        },
                    },
                },
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['comment'],
                            operation: ['list'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Document ID',
                            name: 'documentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the document to list comments for',
                        },
                        {
                            displayName: 'Collection ID',
                            name: 'collectionId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the collection to list all comments within',
                        },
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                        {
                            displayName: 'Offset',
                            name: 'offset',
                            type: 'number',
                            default: 0,
                            description: 'Offset for pagination',
                        },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['comment'],
                            operation: ['create'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Parent Comment ID',
                            name: 'parentCommentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the parent comment to reply to (for threaded replies)',
                        },
                    ],
                },

                // ════════════════════════════════════════════════════════════════
                // ATTACHMENT PARAMETERS
                // ════════════════════════════════════════════════════════════════

                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    required: true,
                    description: 'Name of the binary property containing the file to upload',
                    displayOptions: {
                        show: {
                            resource: ['attachment'],
                            operation: ['upload'],
                        },
                    },
                },
                {
                    displayName: 'Attachment ID',
                    name: 'attachmentId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'Attachment UUID to delete',
                    displayOptions: {
                        show: {
                            resource: ['attachment'],
                            operation: ['delete'],
                        },
                    },
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['attachment'],
                            operation: ['upload'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Document ID',
                            name: 'documentId',
                            type: 'string',
                            default: '',
                            description: 'UUID of the document to associate this attachment with (optional)',
                        },
                        {
                            displayName: 'Filename Override',
                            name: 'filenameOverride',
                            type: 'string',
                            default: '',
                            placeholder: 'photo.png',
                            description: 'Override filename (with extension). Uses binary metadata filename if not set.',
                        },
                    ],
                },

                // ════════════════════════════════════════════════════════════════
                // USER PARAMETERS
                // ════════════════════════════════════════════════════════════════

                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'User UUID',
                    displayOptions: {
                        show: {
                            resource: ['user'],
                            operation: ['get'],
                        },
                    },
                },
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['user'],
                            operation: ['list'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Query',
                            name: 'query',
                            type: 'string',
                            default: '',
                            description: 'Filter users by name or email',
                        },
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                        {
                            displayName: 'Offset',
                            name: 'offset',
                            type: 'number',
                            default: 0,
                            description: 'Offset for pagination',
                        },
                    ],
                },

                // ════════════════════════════════════════════════════════════════
                // SHARE PARAMETERS
                // ════════════════════════════════════════════════════════════════

                {
                    displayName: 'Document ID',
                    name: 'documentId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'UUID of the document to share',
                    displayOptions: {
                        show: {
                            resource: ['share'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Share ID',
                    name: 'shareId',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    description: 'Share UUID to revoke',
                    displayOptions: {
                        show: {
                            resource: ['share'],
                            operation: ['revoke'],
                        },
                    },
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['share'],
                            operation: ['create'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Include Child Documents',
                            name: 'includeChildDocuments',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to include child documents in the share',
                        },
                    ],
                },
                {
                    displayName: 'Filters',
                    name: 'filters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['share'],
                            operation: ['list'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 25,
                            description: 'Maximum number of results to return',
                        },
                        {
                            displayName: 'Offset',
                            name: 'offset',
                            type: 'number',
                            default: 0,
                            description: 'Offset for pagination',
                        },
                    ],
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                let responseData;

                // ════════════════════════════════════════════════════════════════
                // DOCUMENT
                // ════════════════════════════════════════════════════════════════
                if (resource === 'document') {

                    if (operation === 'get') {
                        const id = this.getNodeParameter('documentId', i);
                        responseData = await outlineApiRequest(this, '/documents.info', { id });

                    } else if (operation === 'create') {
                        const title = this.getNodeParameter('title', i);
                        const text = this.getNodeParameter('text', i, '');
                        const collectionId = this.getNodeParameter('collectionId', i, '');
                        const publish = this.getNodeParameter('publish', i, false);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { title };
                        if (text) body.text = text;
                        if (collectionId) body.collectionId = collectionId;
                        if (af.parentDocumentId) body.parentDocumentId = af.parentDocumentId;
                        if (af.templateId) body.templateId = af.templateId;
                        body.publish = publish;
                        if (!collectionId && !af.parentDocumentId) {
                            throw new Error('Either Collection ID or Parent Document ID is required');
                        }
                        responseData = await outlineApiRequest(this, '/documents.create', body);

                    } else if (operation === 'update') {
                        const id = this.getNodeParameter('documentId', i);
                        const uf = this.getNodeParameter('updateFields', i, {});
                        const body = { id };
                        if (uf.title !== undefined && uf.title !== '') body.title = uf.title;
                        if (uf.text !== undefined && uf.text !== '') body.text = uf.text;
                        if (uf.publish !== undefined) body.publish = uf.publish;
                        if (uf.fullWidth !== undefined) body.fullWidth = uf.fullWidth;
                        responseData = await outlineApiRequest(this, '/documents.update', body);

                    } else if (operation === 'delete') {
                        const id = this.getNodeParameter('documentId', i);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { id };
                        if (af.permanent !== undefined) body.permanent = af.permanent;
                        responseData = await outlineApiRequest(this, '/documents.delete', body);

                    } else if (operation === 'list') {
                        const collectionId = this.getNodeParameter('collectionId', i, '');
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = {};
                        if (collectionId) body.collectionId = collectionId;
                        if (filters.parentDocumentId) body.parentDocumentId = filters.parentDocumentId;
                        if (filters.statusFilter) body.statusFilter = [filters.statusFilter];
                        if (filters.limit) body.limit = filters.limit;
                        if (filters.offset) body.offset = filters.offset;
                        responseData = await outlineApiRequest(this, '/documents.list', body);

                    } else if (operation === 'search') {
                        const query = this.getNodeParameter('query', i);
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = { query };
                        if (filters.collectionId) body.collectionId = filters.collectionId;
                        if (filters.statusFilter) body.statusFilter = [filters.statusFilter];
                        if (filters.dateFilter) body.dateFilter = filters.dateFilter;
                        if (filters.limit) body.limit = filters.limit;
                        responseData = await outlineApiRequest(this, '/documents.search', body);

                    } else if (operation === 'searchTitles') {
                        const query = this.getNodeParameter('query', i);
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = { query };
                        if (filters.collectionId) body.collectionId = filters.collectionId;
                        if (filters.limit) body.limit = filters.limit;
                        responseData = await outlineApiRequest(this, '/documents.search_titles', body);

                    } else if (operation === 'archive') {
                        const id = this.getNodeParameter('documentId', i);
                        responseData = await outlineApiRequest(this, '/documents.archive', { id });

                    } else if (operation === 'restore') {
                        const id = this.getNodeParameter('documentId', i);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { id };
                        if (af.collectionId) body.collectionId = af.collectionId;
                        if (af.revisionId) body.revisionId = af.revisionId;
                        responseData = await outlineApiRequest(this, '/documents.restore', body);

                    } else if (operation === 'move') {
                        const id = this.getNodeParameter('documentId', i);
                        const collectionId = this.getNodeParameter('collectionId', i, '');
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { id };
                        if (collectionId) body.collectionId = collectionId;
                        if (af.parentDocumentId) body.parentDocumentId = af.parentDocumentId;
                        responseData = await outlineApiRequest(this, '/documents.move', body);

                    } else if (operation === 'answerQuestion') {
                        const query = this.getNodeParameter('query', i);
                        const documentId = this.getNodeParameter('documentId', i, '');
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = { query };
                        if (documentId) body.documentId = documentId;
                        if (filters.collectionId) body.collectionId = filters.collectionId;
                        responseData = await outlineApiRequest(this, '/documents.answerQuestion', body);

                    } else if (operation === 'export') {
                        const id = this.getNodeParameter('documentId', i);
                        const outputBinaryProp = this.getNodeParameter('outputBinaryPropertyName', i, 'data');
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const outputFilename = (af.outputFilename) || 'document.md';
                        const res = await outlineApiRequest(this, '/documents.export', { id });
                        const markdown = (res && res.data) ? res.data : JSON.stringify(res);
                        const buffer = Buffer.from(typeof markdown === 'string' ? markdown : JSON.stringify(markdown), 'utf-8');
                        const binaryOutput = await this.helpers.prepareBinaryData(buffer, outputFilename, 'text/markdown');
                        returnData.push({
                            json: { id, filename: outputFilename, mimeType: 'text/markdown', sizeBytes: buffer.length },
                            binary: { [outputBinaryProp]: binaryOutput },
                            pairedItem: { item: i },
                        });
                        continue;

                    } else if (operation === 'import') {
                        const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                        const collectionId = this.getNodeParameter('collectionId', i, '');
                        const publish = this.getNodeParameter('publish', i, false);
                        const af = this.getNodeParameter('additionalFields', i, {});

                        if (!collectionId && !af.parentDocumentId) {
                            throw new Error('Either Collection ID or Parent Document ID is required for import');
                        }
                        const binaryData = items[i].binary;
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const resolvedFilename = af.filenameOverride || binaryData[binaryProp].fileName || 'document.md';
                        const contentType = binaryData[binaryProp].mimeType || guessMimeType(resolvedFilename);

                        const formData = {
                            file: {
                                value: buffer,
                                options: { filename: resolvedFilename, contentType },
                            },
                        };
                        if (collectionId) formData.collectionId = collectionId;
                        if (af.parentDocumentId) formData.parentDocumentId = af.parentDocumentId;
                        formData.publish = String(publish);
                        responseData = await outlineApiRequestMultipart(this, '/documents.import', formData);
                    }

                // ════════════════════════════════════════════════════════════════
                // COLLECTION
                // ════════════════════════════════════════════════════════════════
                } else if (resource === 'collection') {

                    if (operation === 'list') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = {};
                        if (filters.limit) body.limit = filters.limit;
                        if (filters.offset) body.offset = filters.offset;
                        responseData = await outlineApiRequest(this, '/collections.list', body);

                    } else if (operation === 'get') {
                        const id = this.getNodeParameter('collectionId', i);
                        responseData = await outlineApiRequest(this, '/collections.info', { id });

                    } else if (operation === 'create') {
                        const name = this.getNodeParameter('name', i);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { name };
                        if (af.description) body.description = af.description;
                        if (af.permission) body.permission = af.permission;
                        if (af.sharing !== undefined) body.sharing = af.sharing;
                        if (af.color) body.color = af.color;
                        if (af.icon) body.icon = af.icon;
                        responseData = await outlineApiRequest(this, '/collections.create', body);

                    } else if (operation === 'update') {
                        const id = this.getNodeParameter('collectionId', i);
                        const uf = this.getNodeParameter('updateFields', i, {});
                        const body = { id };
                        if (uf.name) body.name = uf.name;
                        if (uf.description !== undefined) body.description = uf.description;
                        if (uf.permission) body.permission = uf.permission;
                        if (uf.sharing !== undefined) body.sharing = uf.sharing;
                        if (uf.color) body.color = uf.color;
                        if (uf.icon) body.icon = uf.icon;
                        responseData = await outlineApiRequest(this, '/collections.update', body);

                    } else if (operation === 'delete') {
                        const id = this.getNodeParameter('collectionId', i);
                        responseData = await outlineApiRequest(this, '/collections.delete', { id });

                    } else if (operation === 'getDocuments') {
                        const id = this.getNodeParameter('collectionId', i);
                        responseData = await outlineApiRequest(this, '/collections.documents', { id });

                    } else if (operation === 'export') {
                        const id = this.getNodeParameter('collectionId', i);
                        const format = this.getNodeParameter('exportFormat', i, 'outline-markdown');
                        responseData = await outlineApiRequest(this, '/collections.export', { id, format });
                    }

                // ════════════════════════════════════════════════════════════════
                // COMMENT
                // ════════════════════════════════════════════════════════════════
                } else if (resource === 'comment') {

                    if (operation === 'list') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = {};
                        if (filters.documentId) body.documentId = filters.documentId;
                        if (filters.collectionId) body.collectionId = filters.collectionId;
                        if (filters.limit) body.limit = filters.limit;
                        if (filters.offset) body.offset = filters.offset;
                        responseData = await outlineApiRequest(this, '/comments.list', body);

                    } else if (operation === 'create') {
                        const documentId = this.getNodeParameter('documentId', i);
                        const text = this.getNodeParameter('text', i);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { documentId, text };
                        if (af.parentCommentId) body.parentCommentId = af.parentCommentId;
                        responseData = await outlineApiRequest(this, '/comments.create', body);

                    } else if (operation === 'update') {
                        const id = this.getNodeParameter('commentId', i);
                        const text = this.getNodeParameter('text', i);
                        // Outline API uses a nested data object for comment updates
                        responseData = await outlineApiRequest(this, '/comments.update', { id, data: { text } });

                    } else if (operation === 'delete') {
                        const id = this.getNodeParameter('commentId', i);
                        responseData = await outlineApiRequest(this, '/comments.delete', { id });
                    }

                // ════════════════════════════════════════════════════════════════
                // ATTACHMENT
                // ════════════════════════════════════════════════════════════════
                } else if (resource === 'attachment') {

                    if (operation === 'upload') {
                        const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                        const af = this.getNodeParameter('additionalFields', i, {});

                        const binaryData = items[i].binary;
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const resolvedFilename = af.filenameOverride || binaryData[binaryProp].fileName || 'file';
                        const contentType = binaryData[binaryProp].mimeType || guessMimeType(resolvedFilename);
                        const sizeBytes = buffer.length;

                        // Step 1: Create attachment record and get signed upload URL
                        const createBody = {
                            name: resolvedFilename,
                            contentType,
                            size: sizeBytes,
                        };
                        if (af.documentId) createBody.documentId = af.documentId;

                        const createRes = await outlineApiRequest(this, '/attachments.create', createBody);
                        if (!createRes || !createRes.data) {
                            throw new Error('Failed to create attachment record: ' + JSON.stringify(createRes));
                        }
                        const { uploadUrl, form, attachment } = createRes.data;

                        // Step 2: Upload the file to the signed URL (S3/GCS signed POST)
                        const uploadFormData = {};
                        if (form && typeof form === 'object') {
                            Object.assign(uploadFormData, form);
                        }
                        uploadFormData.file = {
                            value: buffer,
                            options: { filename: resolvedFilename, contentType },
                        };
                        await this.helpers.request({
                            method: 'POST',
                            url: uploadUrl,
                            formData: uploadFormData,
                            json: false,
                        });

                        responseData = {
                            ok: true,
                            data: {
                                id: attachment && attachment.id,
                                url: attachment && attachment.url,
                                name: resolvedFilename,
                                contentType,
                                size: sizeBytes,
                            },
                        };

                    } else if (operation === 'delete') {
                        const id = this.getNodeParameter('attachmentId', i);
                        responseData = await outlineApiRequest(this, '/attachments.delete', { id });
                    }

                // ════════════════════════════════════════════════════════════════
                // USER
                // ════════════════════════════════════════════════════════════════
                } else if (resource === 'user') {

                    if (operation === 'list') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = {};
                        if (filters.query) body.query = filters.query;
                        if (filters.limit) body.limit = filters.limit;
                        if (filters.offset) body.offset = filters.offset;
                        responseData = await outlineApiRequest(this, '/users.list', body);

                    } else if (operation === 'get') {
                        const id = this.getNodeParameter('userId', i);
                        responseData = await outlineApiRequest(this, '/users.info', { id });
                    }

                // ════════════════════════════════════════════════════════════════
                // SHARE
                // ════════════════════════════════════════════════════════════════
                } else if (resource === 'share') {

                    if (operation === 'list') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const body = {};
                        if (filters.limit) body.limit = filters.limit;
                        if (filters.offset) body.offset = filters.offset;
                        responseData = await outlineApiRequest(this, '/shares.list', body);

                    } else if (operation === 'create') {
                        const documentId = this.getNodeParameter('documentId', i);
                        const af = this.getNodeParameter('additionalFields', i, {});
                        const body = { documentId };
                        if (af.includeChildDocuments !== undefined) body.includeChildDocuments = af.includeChildDocuments;
                        responseData = await outlineApiRequest(this, '/shares.create', body);

                    } else if (operation === 'revoke') {
                        const id = this.getNodeParameter('shareId', i);
                        responseData = await outlineApiRequest(this, '/shares.revoke', { id });
                    }
                }

                // Push JSON result
                if (responseData !== undefined) {
                    const json = (responseData && typeof responseData === 'object')
                        ? responseData
                        : { result: responseData };
                    returnData.push({
                        json,
                        pairedItem: { item: i },
                    });
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
exports.Outline = Outline;
