"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantApi = void 0;

class QdrantApi {
    constructor() {
        this.name = 'qdrantApi';
        this.displayName = 'Qdrant API';
        this.documentationUrl = 'https://qdrant.tech/documentation/';
        this.properties = [
            {
                displayName: 'Qdrant URL',
                name: 'qdrantUrl',
                type: 'string',
                default: 'http://localhost:6333',
                required: true,
                description: 'The base URL of your Qdrant instance (e.g., http://localhost:6333 or https://xyz.cloud.qdrant.io)',
            },
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                description: 'Qdrant API key for authentication. Leave empty for local instances without authentication configured.',
            },
        ];
        this.test = {
            request: {
                baseURL: '={{$credentials.qdrantUrl}}',
                url: '/collections',
                method: 'GET',
                headers: {
                    'api-key': '={{$credentials.apiKey}}',
                },
            },
        };
    }
}
exports.QdrantApi = QdrantApi;
