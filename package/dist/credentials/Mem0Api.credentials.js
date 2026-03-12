"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0Api = void 0;
class Mem0Api {
    constructor() {
        this.name = 'mem0Api';
        this.displayName = 'Mem0 API';
        this.documentationUrl = 'https://docs.mem0.ai/api-reference';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your Mem0 API key. Get it from https://app.mem0.ai/dashboard/api-keys.',
            },
            {
                displayName: 'Organization ID',
                name: 'orgId',
                type: 'string',
                default: '',
                description: 'Optional: Your Mem0 Organization ID',
            },
            {
                displayName: 'Project ID',
                name: 'projectId',
                type: 'string',
                default: '',
                description: 'Optional: Your Mem0 Project ID',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'Authorization': '=Token {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://api.mem0.ai',
                url: '/v1/entities/',
                method: 'GET',
            },
        };
    }
}
exports.Mem0Api = Mem0Api;
//# sourceMappingURL=Mem0Api.credentials.js.map