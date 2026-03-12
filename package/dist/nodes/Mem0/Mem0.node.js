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
        const key = (_a = entry === null || entry === void 0 ? void 0 : entry.chave) === null || _a === void 0 ? void 0 : _a.trim();
        if (!key)
            continue;
        metadata[key] = (_b = entry === null || entry === void 0 ? void 0 : entry.valor) !== null && _b !== void 0 ? _b : '';
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
            description: 'Interagir com a API Mem0 - camada inteligente de memoria para IA',
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
                            tipoAutenticacao: ['nuvem'],
                        },
                    },
                },
                {
                    name: 'mem0SelfHostedApi',
                    required: true,
                    displayOptions: {
                        show: {
                            tipoAutenticacao: ['selfHosted'],
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
            // Tentar diferentes abordagens para reconhecimento como node de memoria
            __loadOptionsMethods: ['node'],
            properties: [
                {
                    displayName: 'Tipo de Autenticao',
                    name: 'tipoAutenticacao',
                    type: 'options',
                    options: [
                        {
                            name: 'Nuvem (Mem0.ai)',
                            value: 'nuvem',
                            description: 'Usar o servico Mem0 na nuvem em api.mem0.ai'
                        },
                        {
                            name: 'Self-Hosted',
                            value: 'selfHosted',
                            description: 'Usar sua propria instancia Mem0'
                        },
                    ],
                    default: 'nuvem',
                    description: 'Escolha entre Mem0 na nuvem ou instancia propria',
                },
                {
                    displayName: 'Recurso',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'Memoria', value: 'memory' },
                        { name: 'Entidade', value: 'entity' },
                        { name: 'Organizacao', value: 'organization' },
                        { name: 'Projeto', value: 'project' },
                    ],
                    default: 'memory',
                    description: 'Escolha o tipo de recurso que deseja manipular',
                },
                {
                    displayName: 'Operacao',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                        },
                    },
                    options: [
                        { name: 'Adicionar', value: 'add', description: 'Adicionar novas memorias', action: 'Adicionar uma memoria' },
                        { name: 'Deletar', value: 'delete', description: 'Deletar uma memoria por ID', action: 'Deletar uma memoria' },
                        { name: 'Deletar Todas', value: 'deleteAll', description: 'Deletar todas com filtros', action: 'Deletar todas as memorias' },
                        { name: 'Buscar', value: 'get', description: 'Buscar uma memoria por ID', action: 'Buscar uma memoria' },
                        { name: 'Listar Multiplas', value: 'getAll', description: 'Listar memorias', action: 'Listar multiplas memorias' },
                        { name: 'Historico', value: 'history', description: 'Obter historico da memoria', action: 'Obter historico da memoria' },
                        { name: 'Buscar Semantica', value: 'search', description: 'Busca semantica v1', action: 'Buscar memorias (basica)' },
                        { name: 'Buscar Avancada', value: 'searchV2', description: 'Busca semantica avancada v2', action: 'Buscar memorias (avancada)' },
                        { name: 'Atualizar', value: 'update', description: 'Atualizar memoria por ID', action: 'Atualizar uma memoria' },
                    ],
                    default: 'add',
                },
                {
                    displayName: 'ID do Usuario',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search', 'searchV2'],
                        },
                    },
                    description: 'Identificador unico do Usuario para associar  memoria. Usado para filtrar e organizar memorias por Usuario.',
                    placeholder: 'Usuario_123',
                },
                {
                    displayName: 'ID do Agente',
                    name: 'agentId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Identificador do agente/assistente de IA que est interagindo. til para separar memorias por diferentes agentes.',
                    placeholder: 'agente_vendas',
                },
                {
                    displayName: 'ID da aplicacao',
                    name: 'appId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Identificador da aplicacao ou contexto do sistema. Use para segmentar memorias por diferentes apps.',
                    placeholder: 'app_crm',
                },
                {
                    displayName: 'ID da sessao',
                    name: 'runId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['memory'],
                            operation: ['add', 'getAll', 'deleteAll', 'search'],
                        },
                    },
                    description: 'Identificador da sessao/execuo atual. Agrupa memorias de uma mesma conversa ou interao.',
                    placeholder: 'sessao_2024_001',
                },
                {
                    displayName: 'Campos Adicionais',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Adicionar Campo',
                    default: {},
                    displayOptions: { show: { resource: ['memory'], operation: ['add'] } },
                    options: [
                        {
                            displayName: 'Categorias Personalizadas',
                            name: 'customCategories',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Categorias customizadas para organizar a memoria',
                            options: [
                                {
                                    name: 'categorias',
                                    displayName: 'Categorias',
                                    values: [
                                        {
                                            displayName: 'Nome da Categoria',
                                            name: 'nome',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'tipo'
                                        },
                                        {
                                            displayName: 'Valor da Categoria',
                                            name: 'valor',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'preferencia'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            displayName: 'Excluir Campos',
                            name: 'excludes',
                            type: 'string',
                            default: '',
                            description: 'Lista de campos que NO devem ser memorizados. til para filtrar informaes sensveis.',
                            placeholder: 'senha,cpf,email'
                        },
                        {
                            displayName: 'Incluir Apenas',
                            name: 'includes',
                            type: 'string',
                            default: '',
                            description: 'Lista de campos especficos que DEVEM ser memorizados. Quando definido, apenas estes campos sero processados.',
                            placeholder: 'nome,preferencias,configuracoes'
                        },
                        {
                            displayName: 'Inferncia Automtica',
                            name: 'infer',
                            type: 'boolean',
                            default: true,
                            description: 'Ativar inferncia automtica de contexto e relacionamentos pelo Mem0. Recomendado: ativado.'
                        },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Informaes adicionais sobre a memoria',
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        {
                                            displayName: 'Chave',
                                            name: 'chave',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'fonte'
                                        },
                                        {
                                            displayName: 'Valor',
                                            name: 'valor',
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
                    displayName: 'ID da memoria',
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
                    description: 'Identificador unico da memoria especfica que voc deseja buscar, atualizar ou deletar.',
                    placeholder: 'mem_abc123xyz',
                },
                {
                    displayName: 'Campos para Atualizar',
                    name: 'updateFields',
                    type: 'collection',
                    placeholder: 'Adicionar Campo',
                    default: {},
                    displayOptions: { show: { resource: ['memory'], operation: ['update'] } },
                    options: [
                        {
                            displayName: 'Novo Texto',
                            name: 'text',
                            type: 'string',
                            default: '',
                            description: 'Novo contedo/texto da memoria',
                            placeholder: 'Texto atualizado da memoria'
                        },
                        {
                            displayName: 'Metadados Atualizados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Novos metadados para substituir os existentes',
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        {
                                            displayName: 'Chave',
                                            name: 'chave',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'timestamp'
                                        },
                                        {
                                            displayName: 'Valor',
                                            name: 'valor',
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
                    displayName: 'Consulta de Busca',
                    name: 'query',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['memory'], operation: ['search', 'searchV2'] },
                    },
                    required: true,
                    description: 'Texto para busca semntica nas memorias. O Mem0 encontrar memorias com significado similar, no apenas correspondncia exata.',
                    placeholder: 'Quais so as preferncias de interface do Usuario?',
                },
                {
                    displayName: 'Opes de Busca',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Adicionar Opo',
                    default: {},
                    displayOptions: {
                        show: { resource: ['memory'], operation: ['search', 'searchV2'] },
                    },
                    options: [
                        {
                            displayName: 'Quantidade de Resultados',
                            name: 'topK',
                            type: 'number',
                            default: 10,
                            description: 'Nmero mximo de memorias a retornar nos resultados da busca (padro: 10)'
                        },
                        {
                            displayName: 'Reordenar Resultados',
                            name: 'rerank',
                            type: 'boolean',
                            default: false,
                            description: 'Ativar reordenao inteligente dos resultados para melhorar relevncia'
                        },
                        {
                            displayName: 'Campos a Retornar',
                            name: 'fields',
                            type: 'string',
                            default: '',
                            description: 'Lista de campos especficos para incluir na resposta, separados por vrgula.',
                            placeholder: 'id,memory,metadata,created_at'
                        },
                        {
                            displayName: 'Filtrar por Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            description: 'Filtro para buscar apenas memorias com metadados especficos',
                            options: [
                                {
                                    name: 'filtros',
                                    displayName: 'Filtros',
                                    values: [
                                        {
                                            displayName: 'Chave do Metadado',
                                            name: 'chave',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'categoria',
                                        },
                                        {
                                            displayName: 'Valor Esperado',
                                            name: 'valor',
                                            type: 'string',
                                            default: '',
                                            placeholder: 'preferencias',
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            displayName: 'Filtros Avanados',
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
                            description: 'Adicione regras de filtro sem precisar escrever cdigo. Cada regra  combinada com AND na busca V2.',
                            options: [
                                {
                                    name: 'rules',
                                    displayName: 'Regras',
                                    values: [
                                        {
                                            displayName: 'Campo',
                                            name: 'field',
                                            type: 'string',
                                            default: '',
                                            required: true,
                                            description: 'Nome do campo a ser filtrado. Ex.: memory, user_id, metadata.preferencias',
                                            placeholder: 'metadata.categoria',
                                        },
                                        {
                                            displayName: 'Operao',
                                            name: 'operation',
                                            type: 'options',
                                            options: [
                                                { name: 'Igual', value: 'equals', description: 'Campo deve ser igual ao valor informado' },
                                                { name: 'Diferente', value: 'notEquals', description: 'Campo deve ser diferente do valor informado' },
                                                { name: 'Contm', value: 'contains', description: 'Campo contm (case-insensitive) o valor informado' },
                                                { name: 'Maior que', value: 'greaterThan', description: 'Campo numrico/data maior que o valor' },
                                                { name: 'Menor que', value: 'lessThan', description: 'Campo numrico/data menor que o valor' },
                                            ],
                                            default: 'equals',
                                            required: true,
                                        },
                                        {
                                            displayName: 'Valor',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            required: true,
                                            description: 'Valor que ser comparado com o campo selecionado',
                                            placeholder: 'preferencias',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                // Operacoes para entidades
                {
                    displayName: 'Operacao',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['entity'] },
                    },
                    options: [
                        { name: 'Criar', value: 'create', description: 'Criar nova entidade', action: 'Criar uma entidade' },
                        { name: 'Deletar', value: 'delete', description: 'Deletar uma entidade', action: 'Deletar uma entidade' },
                        { name: 'Detalhar', value: 'get', description: 'Buscar entidade por ID', action: 'Buscar uma entidade' },
                        { name: 'Listar Multiplas', value: 'getAll', description: 'Listar entidades', action: 'Listar multiplas entidades' },
                        { name: 'Atualizar', value: 'update', description: 'Atualizar uma entidade', action: 'Atualizar uma entidade' },
                    ],
                    default: 'getAll',
                },
                {
                    displayName: 'Tipo de Entidade',
                    name: 'entityType',
                    type: 'options',
                    options: [
                        { name: 'Usuario', value: 'user' },
                        { name: 'Agente', value: 'agent' },
                        { name: 'Aplicacao', value: 'app' },
                        { name: 'Sessao', value: 'run' },
                    ],
                    default: 'user',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create', 'delete', 'get', 'update'] },
                    },
                    required: true,
                    description: 'Tipo de entidade para a operacao selecionada',
                },
                {
                    displayName: 'ID da Entidade',
                    name: 'entityId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['delete', 'get', 'update'] },
                    },
                    required: true,
                    description: 'Identificador uunico da entidade',
                    placeholder: 'entidade_xyz123',
                },
                {
                    displayName: 'Nome da Entidade',
                    name: 'entityName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Nome amigavel da nova entidade',
                },
                {
                    displayName: 'Campos Adicionais',
                    name: 'entityAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['create'] },
                    },
                    description: 'Defina organizacao, projeto ou metadados da entidade',
                    options: [
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Campos para Atualizacao',
                    name: 'entityUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['update'] },
                    },
                    description: 'Selecione os campos que deseja atualizar',
                    options: [
                        { displayName: 'Novo Nome', name: 'name', type: 'string', default: '' },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Filtros de Entidade',
                    name: 'entityFilters',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['entity'], operation: ['getAll'] },
                    },
                    description: 'Filtros opcionais para listar entidades',
                    options: [
                        {
                            displayName: 'Tipo',
                            name: 'type',
                            type: 'options',
                            options: [
                                { name: 'Usuario', value: 'user' },
                                { name: 'Agente', value: 'agent' },
                                { name: 'Aplicacao', value: 'app' },
                                { name: 'Sessao', value: 'run' },
                            ],
                            default: 'user',
                        },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        { displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
                    ],
                },
                // Operacoes para organizacoes
                {
                    displayName: 'Operacao',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['organization'] },
                    },
                    options: [
                        { name: 'Criar', value: 'create', description: 'Criar organizacao', action: 'Criar organizacao' },
                        { name: 'Deletar', value: 'delete', description: 'Deletar organizacao', action: 'Deletar organizacao' },
                        { name: 'Detalhar', value: 'get', description: 'Buscar organizacao por ID', action: 'Buscar organizacao' },
                        { name: 'Listar Multiplas', value: 'getAll', description: 'Listar organizacoes', action: 'Listar organizacoes' },
                        { name: 'Atualizar', value: 'update', description: 'Atualizar organizacao', action: 'Atualizar organizacao' },
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
                    description: 'Identificador uunico da organizacao',
                },
                {
                    displayName: 'Nome da Organizacao',
                    name: 'organizationName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Nome exibido da organizacao',
                },
                {
                    displayName: 'Campos Adicionais (Organizacao)',
                    name: 'organizationAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['create'] },
                    },
                    options: [
                        { displayName: 'Slug', name: 'slug', type: 'string', default: '' },
                        { displayName: 'Descricao', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Campos para Atualizacao (Organizacao)',
                    name: 'organizationUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['organization'], operation: ['update'] },
                    },
                    options: [
                        { displayName: 'Novo Nome', name: 'name', type: 'string', default: '' },
                        { displayName: 'Slug', name: 'slug', type: 'string', default: '' },
                        { displayName: 'Descricao', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                // Operacoes para projetos
                {
                    displayName: 'Operacao',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['project'] },
                    },
                    options: [
                        { name: 'Criar', value: 'create', description: 'Criar projeto', action: 'Criar projeto' },
                        { name: 'Deletar', value: 'delete', description: 'Deletar projeto', action: 'Deletar projeto' },
                        { name: 'Detalhar', value: 'get', description: 'Buscar projeto por ID', action: 'Buscar projeto' },
                        { name: 'Listar Multiplos', value: 'getAll', description: 'Listar projetos', action: 'Listar projetos' },
                        { name: 'Atualizar', value: 'update', description: 'Atualizar projeto', action: 'Atualizar projeto' },
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
                    description: 'Identificador uunico do projeto',
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
                    description: 'Organizacao proprietaria do projeto',
                },
                {
                    displayName: 'Nome do Projeto',
                    name: 'projectName',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { resource: ['project'], operation: ['create'] },
                    },
                    required: true,
                    description: 'Nome exibido do projeto',
                },
                {
                    displayName: 'Campos Adicionais (Projeto)',
                    name: 'projectAdditionalFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['create'] },
                    },
                    options: [
                        { displayName: 'Descricao', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Campos para Atualizacao (Projeto)',
                    name: 'projectUpdateFields',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['update'] },
                    },
                    options: [
                        { displayName: 'Novo Nome', name: 'name', type: 'string', default: '' },
                        { displayName: 'Descricao', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
                        { displayName: 'Organization ID', name: 'organizationId', type: 'string', default: '' },
                        {
                            displayName: 'Metadados',
                            name: 'metadata',
                            type: 'fixedCollection',
                            default: {},
                            options: [
                                {
                                    name: 'metadados',
                                    displayName: 'Metadados',
                                    values: [
                                        { displayName: 'Chave', name: 'chave', type: 'string', default: '' },
                                        { displayName: 'Valor', name: 'valor', type: 'string', default: '' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    displayName: 'Filtros de Projeto',
                    name: 'projectFilters',
                    type: 'collection',
                    default: {},
                    displayOptions: {
                        show: { resource: ['project'], operation: ['getAll'] },
                    },
                    description: 'Filtros opcionais para listar projetos',
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
                        // Simplificar o campo de mensagens
                        const conteudoMensagem = this.getNodeParameter('conteudoMensagem', i);
                        const tipoMensagem = this.getNodeParameter('tipoMensagem', i);
                        const messages = [{ role: tipoMensagem, content: conteudoMensagem }];
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
                        // Processar metadados simplificados
                        if (additionalFields.metadata && typeof additionalFields.metadata === 'object' && 'metadados' in additionalFields.metadata) {
                            const metadataObj = {};
                            additionalFields.metadata.metadados.forEach((item) => {
                                metadataObj[item.chave] = item.valor;
                            });
                            body.metadata = metadataObj;
                        }
                        if (additionalFields.includes)
                            body.includes = additionalFields.includes;
                        if (additionalFields.excludes)
                            body.excludes = additionalFields.excludes;
                        if (typeof additionalFields.infer === 'boolean')
                            body.infer = additionalFields.infer;
                        // Processar categorias personalizadas simplificadas
                        if (additionalFields.customCategories && typeof additionalFields.customCategories === 'object' && 'categorias' in additionalFields.customCategories) {
                            const categoriesObj = {};
                            additionalFields.customCategories.categorias.forEach((item) => {
                                categoriesObj[item.nome] = item.valor;
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
                        // Processar metadados de atualizao simplificados
                        if (updateFields.metadata && typeof updateFields.metadata === 'object' && 'metadados' in updateFields.metadata) {
                            const metadataObj = {};
                            updateFields.metadata.metadados.forEach((item) => {
                                metadataObj[item.chave] = item.valor;
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
                        // Processar metadados de filtro simplificados
                        if (options.metadata && typeof options.metadata === 'object' && 'filtros' in options.metadata) {
                            const metadataObj = {};
                            options.metadata.filtros.forEach((item) => {
                                metadataObj[item.chave] = item.valor;
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
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Operacao nao suportada para organizacao: ${operation}`);
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
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Operacao nao suportada para projeto: ${operation}`);
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