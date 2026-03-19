"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutlineApi = void 0;

class OutlineApi {
    constructor() {
        this.name = 'outlineApi';
        this.displayName = 'Outline API';
        this.documentationUrl = 'https://www.getoutline.com/developers';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your Outline API key (Settings → API & Apps). Always begins with "ol_api_".',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://app.getoutline.com',
                required: true,
                description: 'The base URL of your Outline instance (e.g., https://app.getoutline.com or your self-hosted domain)',
            },
        ];
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/auth.info',
                method: 'POST',
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                    'Content-Type': 'application/json',
                },
                body: '{}',
            },
        };
    }
}
exports.OutlineApi = OutlineApi;
