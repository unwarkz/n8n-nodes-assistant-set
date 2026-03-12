"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0 = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const GenericFunctions_1 = require("./GenericFunctions");
const buildKeyValueFromCollection = (collection) => {
    var _a, _b;
    if (!collection || typeof collection !== 'object')
        return undefined;
    const entries = collection.metadados;
    if (!Array.isArray(entries))
        return undefined;
    const metadata = {};
    for (const entry of entries) {
        const key = (_a = entry === null || entry === void 0 ? void 0 : entry.key) === null || _a === void 0 ? void 0 : _a.trim();
        if (!key)
            continue;
        metadata[key] = (_b = entry === null || entry === void 0 ? void 0 : entry.value) !== null && _b !== void 0 ? _b : '';
    }
    return Object.keys(metadata).length ? metadata : undefined;
};
class Mem0 {
    constructor() {
        this.description = {
            displayName: 'Mem0',
            name: 'mem0',
            icon: 'file:mem0.svg',
            group: ['transform'],
            documentationUrl: 'https://docs.mem0.ai/',
            version: 1,
            description: 'Interact with the Mem0 API - intelligent memory layer for AI',
            defaults: {
                name: 'Mem0',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'mem0Api',
                    required: true,
                    displayOptions: {
                        show: {
                            authType: ['cloud'],
                        },
                    },
                },
                {
                    name: 'mem0SelfHostedApi',
                    required: true,
                    displayOptions: {
                        show: {
                            authType: ['selfHosted'],
                        },
                    },
                },
            ],
            codex: {
                categories: ['AI', 'Memory'],
                subcategories: {
                    AI: ['Memory', 'Agents & LLMs'],
                    Memory: ['AI Memory', 'Persistent Storage'],
                },
                resources: {
                    primaryDocumentation: [
                        {
                            url: 'https://docs.mem0.ai/',
                        },
                    ],
                },
            },
            // Try different approaches for memory node recognition
            __loadOptionsMethods: ['node'],
            properties: [
                {
                    displayName: 'Authentication Type',
                    name: 'authType',
                    type: 'options',
                    options: [
                        {
                            name: 'Cloud (Mem0.ai)',
                            value: 'cloud',
                            description: 'Use the Mem0 cloud service at api.mem0.ai'
                        },
                        {
                            name: 'Self-Hosted',
                            value: 'selfHosted',
                            description: 'Use your own self-hosted Mem0 instance'
                        },
                    ],
                    default: 'cloud',
                    description: 'Choose between Mem0 cloud or your own instance',
                },
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'Memory', value: 'memory' },
                        { name: 'Entity', value: 'entity' },
                        { name: 'Organization', value: 'organization' },
                        { name: 'Project', value: 'project' },
                    ],
                    default: 'memory',
                    description: 'Choose the type of resource to manage',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                        },
                    },
                    options: [
                        { name: 'Add', value: 'add', description: 'Add new memories', action: 'Add a memory' },
                        { name: 'Delete', value: 'delete', description: 'Delete a memory by ID', action: 'Delete a memory' },
                        { name: 'Delete All', value: 'deleteAll', description: 'Delete all with filters', action: 'Delete all memories' },
                        { name: 'Get', value: 'get', description: 'Get a memory by ID', action: 'Get a memory' },
                        { name: 'List Multiple', value: 'getAll', description: 'List memories', action: 'List multiple memories' },
                        { name: 'History', value: 'history', description: 'Get memory history', action: 'Get memory history' },
                        { name: 'Semantic Search', value: 'search', description: 'Semantic search v1', action: 'Search memories (basic)' },
                        { name: 'Advanced Search', value: 'searchV2', description: 'Advanced semantic search v2', action: 'Search memories (advanced)' },
                        { name: 'Update', value: 'update', description: 'Update memory by ID', action: 'Update a memory' },
                    ],
                    default: 'add',
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search', 'searchV2'],
                        },
                    },
                    description: 'Unique user identifier to associate with the memory. Used to filter and organize memories by user.',
                    placeholder: 'user_123',
                },
                {
                    displayName: 'Agent ID',
                    name: 'agentId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Identifier of the AI agent/assistant that is interacting. Useful for separating memories by different agents.',
                    placeholder: 'sales_agent',
                },
                {
                    displayName: 'Application ID',
                    name: 'appId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Application or system context identifier. Use to segment memories by different apps.',
                    placeholder: 'app_crm',
                },
                {
                    displayName: 'Session ID',
                    name: 'runId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Identifier of the current session/run. Groups memories from the same conversation or interaction.',
                    placeholder: 'session_2024_001',
                },
                {
                    displayName: 'Message Content',
                    name: 'messageContent',
                    type: 'string',
                    typeOptions: { rows: 4 },
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add'],
                        },
                    },
                    description: 'The text or content of the message to be stored in memory',
                    placeholder: 'Hello, my name is John...',
                },
                {
                    displayName: 'Message Role',
                    name: 'messageType',
                    type: 'options',
                    options: [
                        { name: 'User', value: 'user', description: 'Message from the user' },
                        { name: 'Assistant', value: 'assistant', description: 'Message from the AI assistant' },
                        { name: 'System', value: 'system', description: 'System-level instruction' },
                    ],
                    default: 'user',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add'],
                        },
                    },
                    description: 'The role of the message sender in the conversation',
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['memory'], operation: ['add'] } },
                    options: [
                        {
                            displayName: 'Custom Categories',
                            name: 'customCategories',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Custom categories to organize the memory',
                            options: [
                                {
                                    name: 'items',
                                    displayName: 'Categories',
                                    values: [
                                        {
                                            displayName: 'Category Name',
                                            name: 'name',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'type'
                                        },
                                        {
                                            displayName: 'Category Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'preference'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            displayName: 'Exclude Fields',
                            name: 'excludes',
                            type: 'string',
                            default: '',
                            description: 'List of fields that should NOT be memorized. Useful for filtering sensitive information.',
                            placeholder: 'password,ssn,email'
                        },
                        {
                            displayName: 'Include Only',
                            name: 'includes',
                            type: 'string',
                            default: '',
                            description: 'List of specific fields that MUST be memorized. When set, only these fields will be processed.',
                            placeholder: 'name,preferences,settings'
                        },
                        {
                            displayName: 'Automatic Inference',
                            name: 'infer',
                            type: 'boolean',
                            default: true,
                            description: 'Enable automatic inference of context and relationships by Mem0. Recommended: enabled.'
                        },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Additional information about the memory',
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        {
                                            displayName: 'Key',
                                            name: 'key',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'source'
                                        },
                                        {
                                            displayName: 'Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'chat'
                                        }
                                    ]
                                }
                            ]
                        },
                    ],
                },
                {
                    displayName: 'Memory ID',
                    name: 'memoryId',
                    type: 'string',
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['get', 'delete', 'update', 'history'],
                        },
                    },
                    description: 'Unique identifier of the specific memory you want to retrieve, update or delete.',
                    placeholder: 'mem_abc123xyz',
                },
                {
                    displayName: 'Update Fields',
                    name: 'updateFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['memory'], operation: ['update'] } },
                    options: [
                        {
                            displayName: 'New Text',
                            name: 'text',
                            type: 'string',
                            default: '',
                            description: 'New content/text for the memory',
                            placeholder: 'Updated memory text'
                        },
                        {
                            displayName: 'Updated Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'New metadata to replace the existing ones',
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        {
                                            displayName: 'Key',
                                            name: 'key',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'timestamp'
                                        },
                                        {
                                            displayName: 'Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            placeholder: '2024-01-15'
                                        }
                                    ]
                                }
                            ]
                        },
                    ],
                },
                {
                    displayName: 'Search Query',
                    name: 'query',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['memory'], operation: ['search', 'searchV2'] },
                    },
                    required: true,
                    description: 'Text for semantic search in memories. Mem0 will find memories with similar meaning, not just exact matches.',
                    placeholder: 'What are the user interface preferences?',
                },
                {
                    displayName: 'Search Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    displayOptions: {
                        show: { resource: ['memory'], operation: ['search', 'searchV2'] },
                    },
                    options: [
                        {
                            displayName: 'Number of Results',
                            name: 'topK',
                            type: 'number',
                            default: 10,
                            description: 'Maximum number of memories to return in search results (default: 10)'
                        },
                        {
                            displayName: 'Rerank Results',
                            name: 'rerank',
                            type: 'boolean',
                            default: false,
                            description: 'Enable intelligent reranking of results to improve relevance'
                        },
                        {
                            displayName: 'Fields to Return',
                            name: 'fields',
                            type: 'string',
                            default: '',
                            description: 'List of specific fields to include in the response, separated by comma.',
                            placeholder: 'id,memory,metadata,created_at'
                        },
                        {
                            displayName: 'Filter by Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Filter to search only memories with specific metadata',
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Filters',
                                    values: [
                                        {
                                            displayName: 'Metadata Key',
                                            name: 'key',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'categoria',
                                        },
                                        {
                                            displayName: 'Expected Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'preferences',
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            displayName: 'Advanced Filters',
                            name: 'filters',
                            type: 'fixedCollection',
                            default: {},
                            required: false,
                            typeOptions: {
                                multipleValues: true,
                            },
                            displayOptions: {
                                show: { resource: ['memory'], operation: ['searchV2'] },
                            },
                            description: 'Add filter rules without writing code. Each rule is combined with AND in the V2 search.',
                            options: [
                                {
                                    name: 'rules',
                                    displayName: 'Rules',
                                    values: [
                                        {
                                            displayName: 'Field',
                                            name: 'field',
                                            type: 'string',
                                            default: '',
                                            required: true,
                                            description: 'Name of the field to filter. E.g.: memory, user_id, metadata.preferences',
                                            placeholder: 'metadata.category',
                                        },
                                        {
                                            displayName: 'Operation',
                                            name: 'operation',
                                            type: 'options',
                                            options: [
                                                { name: 'Equals', value: 'equals', description: 'Field must equal the provided value' },
                                                { name: 'Not Equals', value: 'notEquals', description: 'Field must differ from the provided value' },
                                                { name: 'Contains', value: 'contains', description: 'Field contains (case-insensitive) the provided value' },
                                                { name: 'Greater Than', value: 'greaterThan', description: 'Numeric/date field greater than the value' },
                                                { name: 'Less Than', value: 'lessThan', description: 'Numeric/date field less than the value' },
                                            ],
                                            default: 'equals',
                                            required: true,
                                        },
                                        {
                                            displayName: 'Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            required: true,
                                            description: 'Value to be compared with the selected field',
                                            placeholder: 'preferences',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                // Operacoes para entidades
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['entity'] },
                    },
                    options: [
                        { name: 'Create', value: 'create', description: 'Create a new entity', action: 'Create an entity' },
                        { name: 'Delete', value: 'delete', description: 'Delete an entity', action: 'Delete an entity' },
                        { name: 'Get', value: 'get', description: 'Get entity by ID', action: 'Get an entity' },
                        { name: 'List Multiple', value: 'getAll', description: 'List entities', action: 'List multiple entities' },
                        { name: 'Update', value: 'update', description: 'Update an entity', action: 'Update an entity' },
                    ],
                    default: 'getAll',
                },
                {
                    displayName: 'Entity Type',
                    name: 'entityType',
                    type: 'options',
                    options: [
                        { name: 'User', value: 'user' },
                        { name: 'Agent', value: 'agent' },
                        { name: 'Application', value: 'app' },
                        { name: 'Session', value: 'run' },
                    ],
                    default: 'user',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create', 'delete', 'get', 'update'] },
                    },
                    required: true,
                    description: 'Entity type for the selected operation',
                },
                {
                    displayName: 'Entity ID',
                    name: 'entityId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['delete', 'get', 'update'] },
                    },
                    required: true,
                    description: 'Unique identifier of the entity',
                    placeholder: 'entity_xyz123',
                },
                {
                    displayName: 'Entity Name',
                    name: 'entityName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Friendly name for the new entity',
                },
                {
                    displayName: 'Additional Fields',
                    name: 'entityAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create'] },
                    },
                    description: 'Define organization, project or metadata for the entity',
                    options: [
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Update Fields',
                    name: 'entityUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['update'] },
                    },
                    description: 'Select the fields you want to update',
                    options: [
                        { displayName: 'New Name', name: 'name', type: 'string', default: '' },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Entity Filters',
                    name: 'entityFilters',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['getAll'] },
                    },
                    description: 'Optional filters to list entities',
                    options: [
                        {
                            displayName: 'Type',
                            name: 'type',
                            type: 'options',
                            options: [
                                { name: 'User', value: 'user' },
                                { name: 'Agent', value: 'agent' },
                                { name: 'Application', value: 'app' },
                                { name: 'Session', value: 'run' },
                            ],
                            default: 'user',
                        },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                    ],
                },
                // Operacoes para organizacoes
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['organization'] },
                    },
                    options: [
                        { name: 'Create', value: 'create', description: 'Create organization', action: 'Create organization' },
                        { name: 'Delete', value: 'delete', description: 'Delete organization', action: 'Delete organization' },
                        { name: 'Get', value: 'get', description: 'Get organization by ID', action: 'Get organization' },
                        { name: 'List Multiple', value: 'getAll', description: 'List organizations', action: 'List organizations' },
                        { name: 'Update', value: 'update', description: 'Update organization', action: 'Update organization' },
                    ],
                    default: 'getAll',
                },
                {
                    displayName: 'Organization ID',
                    name: 'organizationId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['get', 'update', 'delete'] },
                    },
                    required: true,
                    description: 'Unique identifier of the organization',
                },
                {
                    displayName: 'Organization Name',
                    name: 'organizationName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Display name of the organization',
                },
                {
                    displayName: 'Additional Fields (Organization)',
                    name: 'organizationAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['create'] },
                    },
                    options: [
                        { displayName: 'Slug', name: 'slug', type: 'string', default: '' },
                        { displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Update Fields (Organization)',
                    name: 'organizationUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['update'] },
                    },
                    options: [
                        { displayName: 'New Name', name: 'name', type: 'string', default: '' },
                        { displayName: 'Slug', name: 'slug', type: 'string', default: '' },
                        { displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                // Operacoes para projetos
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['project'] },
                    },
                    options: [
                        { name: 'Create', value: 'create', description: 'Create project', action: 'Create project' },
                        { name: 'Delete', value: 'delete', description: 'Delete project', action: 'Delete project' },
                        { name: 'Get', value: 'get', description: 'Get project by ID', action: 'Get project' },
                        { name: 'List Multiple', value: 'getAll', description: 'List projects', action: 'List projects' },
                        { name: 'Update', value: 'update', description: 'Update project', action: 'Update project' },
                    ],
                    default: 'getAll',
                },
                {
                    displayName: 'Project ID',
                    name: 'projectId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['project'], operation: ['get', 'update', 'delete'] },
                    },
                    required: true,
                    description: 'Unique identifier of the project',
                },
                {
                    displayName: 'Organization ID',
                    name: 'projectOrganizationId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['project'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Organization that owns the project',
                },
                {
                    displayName: 'Project Name',
                    name: 'projectName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['project'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Display name of the project',
                },
                {
                    displayName: 'Additional Fields (Project)',
                    name: 'projectAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['create'] },
                    },
                    options: [
                        { displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Update Fields (Project)',
                    name: 'projectUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['update'] },
                    },
                    options: [
                        { displayName: 'New Name', name: 'name', type: 'string', default: '' },
                        { displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'entries',
                                    displayName: 'Entries',
                                    values: [
                                        { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                        { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Project Filters',
                    name: 'projectFilters',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['getAll'] },
                    },
                    description: 'Optional filters to list projects',
                    options: [
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                    ],
                },
            ],
        };
    }
    async execute() {
        var _a, _b, _c;
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'memory') {
                    if (operation === 'add') {
                        // Build messages array from fields
                        const messageContent = this.getNodeParameter('messageContent', i);
                        const messageType = this.getNodeParameter('messageType', i);
                        const messages = [{ role: messageType, content: messageContent }];
                        const userId = this.getNodeParameter('userId', i, '');
                        const agentId = this.getNodeParameter('agentId', i, '');
                        const appId = this.getNodeParameter('appId', i, '');
                        const runId = this.getNodeParameter('runId', i, '');
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        const body = { messages };
                        if (userId)
                            body.user_id = userId;
                        if (agentId)
                            body.agent_id = agentId;
                        if (appId)
                            body.app_id = appId;
                        if (runId)
                            body.run_id = runId;
                        // Process metadata
                        if (additionalFields.metadata && typeof additionalFields.metadata === 'object' && 'entries' in additionalFields.metadata) {
                            const metadataObj = {};
                            additionalFields.metadata.entries.forEach((item) => {
                                metadataObj[item.key] = item.value;
                            });
                            body.metadata = metadataObj;
                        }
                        if (additionalFields.includes)
                            body.includes = additionalFields.includes;
                        if (additionalFields.excludes)
                            body.excludes = additionalFields.excludes;
                        if (typeof additionalFields.infer === 'boolean')
                            body.infer = additionalFields.infer;
                        // Process custom categories
                        if (additionalFields.customCategories && typeof additionalFields.customCategories === 'object' && 'items' in additionalFields.customCategories) {
                            const categoriesObj = {};
                            additionalFields.customCategories.items.forEach((item) => {
                                categoriesObj[item.name] = item.value;
                            });
                            body.custom_categories = categoriesObj;
                        }
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/memories/', body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'get') {
                        const memoryId = this.getNodeParameter('memoryId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', `/v1/memories/${memoryId}/`);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'getAll') {
                        const userId = this.getNodeParameter('userId', i, '');
                        const agentId = this.getNodeParameter('agentId', i, '');
                        const appId = this.getNodeParameter('appId', i, '');
                        const runId = this.getNodeParameter('runId', i, '');
                        const qs = {};
                        if (userId)
                            qs.user_id = userId;
                        if (agentId)
                            qs.agent_id = agentId;
                        if (appId)
                            qs.app_id = appId;
                        if (runId)
                            qs.run_id = runId;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/memories/', {}, qs);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'delete') {
                        const memoryId = this.getNodeParameter('memoryId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'DELETE', `/v1/memories/${memoryId}/`);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'deleteAll') {
                        const userId = this.getNodeParameter('userId', i, '');
                        const agentId = this.getNodeParameter('agentId', i, '');
                        const appId = this.getNodeParameter('appId', i, '');
                        const runId = this.getNodeParameter('runId', i, '');
                        const qs = {};
                        if (userId)
                            qs.user_id = userId;
                        if (agentId)
                            qs.agent_id = agentId;
                        if (appId)
                            qs.app_id = appId;
                        if (runId)
                            qs.run_id = runId;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'DELETE', '/v1/memories/', {}, qs);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'update') {
                        const memoryId = this.getNodeParameter('memoryId', i);
                        const updateFields = this.getNodeParameter('updateFields', i, {});
                        const body = {};
                        if (updateFields.text)
                            body.text = updateFields.text;
                        // Process update metadata
                        if (updateFields.metadata && typeof updateFields.metadata === 'object' && 'entries' in updateFields.metadata) {
                            const metadataObj = {};
                            updateFields.metadata.entries.forEach((item) => {
                                metadataObj[item.key] = item.value;
                            });
                            body.metadata = metadataObj;
                        }
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'PUT', `/v1/memories/${memoryId}/`, body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'search') {
                        const query = this.getNodeParameter('query', i);
                        const userId = this.getNodeParameter('userId', i, '');
                        const agentId = this.getNodeParameter('agentId', i, '');
                        const appId = this.getNodeParameter('appId', i, '');
                        const runId = this.getNodeParameter('runId', i, '');
                        const options = this.getNodeParameter('options', i, {});
                        const body = { query };
                        if (userId)
                            body.user_id = userId;
                        if (agentId)
                            body.agent_id = agentId;
                        if (appId)
                            body.app_id = appId;
                        if (runId)
                            body.run_id = runId;
                        if (options.topK)
                            body.top_k = options.topK;
                        if (options.rerank !== undefined)
                            body.rerank = options.rerank;
                        if (typeof options.fields === 'string') {
                            body.fields = options.fields.split(',').map((f) => f.trim());
                        }
                        // Process filter metadata
                        if (options.metadata && typeof options.metadata === 'object' && 'entries' in options.metadata) {
                            const metadataObj = {};
                            options.metadata.entries.forEach((item) => {
                                metadataObj[item.key] = item.value;
                            });
                            body.metadata = metadataObj;
                        }
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/memories/search/', body);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'searchV2') {
                        const query = this.getNodeParameter('query', i);
                        const filtersCollection = this.getNodeParameter('filters', i, {});
                        const userId = this.getNodeParameter('userId', i, '');
                        const options = this.getNodeParameter('options', i, {});
                        const rules = (filtersCollection && typeof filtersCollection === 'object' && 'rules' in filtersCollection
                            ? filtersCollection.rules
                            : []);
                        const normalizeValue = (input) => {
                            const trimmed = (input !== null && input !== void 0 ? input : '').trim();
                            if (trimmed === '')
                                return trimmed;
                            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                                const num = Number(trimmed);
                                if (!Number.isNaN(num))
                                    return num;
                            }
                            if (/^(true|false)$/i.test(trimmed)) {
                                return trimmed.toLowerCase() === 'true';
                            }
                            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                                try {
                                    return JSON.parse(trimmed);
                                }
                                catch { }
                            }
                            return input;
                        };
                        const operatorMap = {
                            notEquals: 'ne',
                            contains: 'icontains',
                            greaterThan: 'gt',
                            lessThan: 'lt',
                        };
                        const andFilters = [];
                        for (const rule of Array.isArray(rules) ? rules : []) {
                            const field = ((_a = rule.field) !== null && _a !== void 0 ? _a : '').trim();
                            const operation = ((_b = rule.operation) !== null && _b !== void 0 ? _b : 'equals').toString();
                            const rawValue = (_c = rule.value) !== null && _c !== void 0 ? _c : '';
                            if (!field || rawValue === undefined)
                                continue;
                            const value = normalizeValue(String(rawValue));
                            if (operation === 'equals') {
                                andFilters.push({ [field]: value });
                            }
                            else if (operation in operatorMap) {
                                andFilters.push({ [operatorMap[operation]]: { [field]: value } });
                            }
                        }
                        const body = { query, filters: andFilters.length ? { AND: andFilters } : {} };
                        if (userId)
                            body.user_id = userId;
                        if (options.topK)
                            body.top_k = options.topK;
                        if (options.rerank !== undefined)
                            body.rerank = options.rerank;
                        if (typeof options.fields === 'string' && options.fields.trim()) {
                            body.fields = options.fields.split(',').map((f) => f.trim()).filter((f) => f.length);
                        }
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v2/memories/search/', body);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'history') {
                        const memoryId = this.getNodeParameter('memoryId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', `/v1/memories/${memoryId}/history/`);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                }
                else if (resource === 'entity') {
                    if (operation === 'create') {
                        const entityType = this.getNodeParameter('entityType', i);
                        const name = this.getNodeParameter('entityName', i);
                        const additional = this.getNodeParameter('entityAdditionalFields', i, {});
                        const body = { type: entityType, name };
                        if (additional.organizationId)
                            body.organization_id = additional.organizationId;
                        if (additional.projectId)
                            body.project_id = additional.projectId;
                        const metadata = buildKeyValueFromCollection(additional.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/entities/', body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'get') {
                        const entityType = this.getNodeParameter('entityType', i);
                        const entityId = this.getNodeParameter('entityId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', `/v1/entities/${entityType}/${entityId}/`);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'getAll') {
                        const filters = this.getNodeParameter('entityFilters', i, {});
                        const qs = {};
                        if (filters.type)
                            qs.type = filters.type;
                        if (filters.organizationId)
                            qs.organization_id = filters.organizationId;
                        if (filters.projectId)
                            qs.project_id = filters.projectId;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/entities/', {}, qs);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'update') {
                        const entityType = this.getNodeParameter('entityType', i);
                        const entityId = this.getNodeParameter('entityId', i);
                        const updateFields = this.getNodeParameter('entityUpdateFields', i, {});
                        const body = {};
                        if (updateFields.name)
                            body.name = updateFields.name;
                        if (updateFields.organizationId)
                            body.organization_id = updateFields.organizationId;
                        if (updateFields.projectId)
                            body.project_id = updateFields.projectId;
                        const metadata = buildKeyValueFromCollection(updateFields.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'PUT', `/v1/entities/${entityType}/${entityId}/`, body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'delete') {
                        const entityType = this.getNodeParameter('entityType', i);
                        const entityId = this.getNodeParameter('entityId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'DELETE', `/v1/entities/${entityType}/${entityId}/`);
                        returnData.push({ json: response });
                    }
                    else {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Operacao nao suportada para entidade: ${operation}`);
                    }
                }
                else if (resource === 'organization') {
                    if (operation === 'create') {
                        const name = this.getNodeParameter('organizationName', i);
                        const additional = this.getNodeParameter('organizationAdditionalFields', i, {});
                        const body = { name };
                        if (additional.slug)
                            body.slug = additional.slug;
                        if (additional.description)
                            body.description = additional.description;
                        const metadata = buildKeyValueFromCollection(additional.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/organizations/', body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'get') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', `/v1/organizations/${organizationId}/`);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'getAll') {
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/organizations/');
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'update') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        const updateFields = this.getNodeParameter('organizationUpdateFields', i, {});
                        const body = {};
                        if (updateFields.name)
                            body.name = updateFields.name;
                        if (updateFields.slug)
                            body.slug = updateFields.slug;
                        if (updateFields.description)
                            body.description = updateFields.description;
                        const metadata = buildKeyValueFromCollection(updateFields.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'PUT', `/v1/organizations/${organizationId}/`, body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'delete') {
                        const organizationId = this.getNodeParameter('organizationId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'DELETE', `/v1/organizations/${organizationId}/`);
                        returnData.push({ json: response });
                    }
                    else {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation for organization: ${operation}`);
                    }
                }
                else if (resource === 'project') {
                    if (operation === 'create') {
                        const name = this.getNodeParameter('projectName', i);
                        const organizationId = this.getNodeParameter('projectOrganizationId', i);
                        const additional = this.getNodeParameter('projectAdditionalFields', i, {});
                        const body = { name, organization_id: organizationId };
                        if (additional.description)
                            body.description = additional.description;
                        const metadata = buildKeyValueFromCollection(additional.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/projects/', body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'get') {
                        const projectId = this.getNodeParameter('projectId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', `/v1/projects/${projectId}/`);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'getAll') {
                        const filters = this.getNodeParameter('projectFilters', i, {});
                        const qs = {};
                        if (filters.organizationId)
                            qs.organization_id = filters.organizationId;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/projects/', {}, qs);
                        if (Array.isArray(response))
                            response.forEach(item => returnData.push({ json: item }));
                        else
                            returnData.push({ json: response });
                    }
                    else if (operation === 'update') {
                        const projectId = this.getNodeParameter('projectId', i);
                        const updateFields = this.getNodeParameter('projectUpdateFields', i, {});
                        const body = {};
                        if (updateFields.name)
                            body.name = updateFields.name;
                        if (updateFields.description)
                            body.description = updateFields.description;
                        if (updateFields.organizationId)
                            body.organization_id = updateFields.organizationId;
                        const metadata = buildKeyValueFromCollection(updateFields.metadata);
                        if (metadata)
                            body.metadata = metadata;
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'PUT', `/v1/projects/${projectId}/`, body);
                        returnData.push({ json: response });
                    }
                    else if (operation === 'delete') {
                        const projectId = this.getNodeParameter('projectId', i);
                        const response = await GenericFunctions_1.mem0ApiRequest.call(this, 'DELETE', `/v1/projects/${projectId}/`);
                        returnData.push({ json: response });
                    }
                    else {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation for project: ${operation}`);
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.Mem0 = Mem0;
//# sourceMappingURL=Mem0.node.js.map