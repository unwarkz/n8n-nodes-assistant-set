"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0SelfHostedApi = void 0;
class Mem0SelfHostedApi {
    constructor() {
        this.name = 'mem0SelfHostedApi';
        this.displayName = 'Mem0 Self-Hosted API';
        this.documentationUrl = 'https://docs.mem0.ai/open-source';
        this.properties = [
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'http://localhost:8000',
                required: true,
                description: 'The base URL of your self-hosted Mem0 instance',
            },
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                description: 'API key if authentication enabled',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'Authorization': '={{$credentials.apiKey ? "Bearer " + $credentials.apiKey : ""}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/config',
                method: 'GET',
            },
        };
    }
}
exports.Mem0SelfHostedApi = Mem0SelfHostedApi;
//# sourceMappingURL=Mem0SelfHostedApi.credentials.js.map
