"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GotenbergApi = void 0;

class GotenbergApi {
    constructor() {
        this.name = 'gotenbergApi';
        this.displayName = 'Gotenberg API';
        this.documentationUrl = 'https://gotenberg.dev/docs/configuration';
        this.properties = [
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'http://localhost:3000',
                required: true,
                description: 'The base URL of your Gotenberg instance (e.g., http://localhost:3000)',
            },
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                default: '',
                description: 'Username for HTTP Basic Auth (leave empty if authentication is disabled)',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                description: 'Password for HTTP Basic Auth (leave empty if authentication is disabled)',
            },
        ];
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/health',
                method: 'GET',
            },
        };
    }
}
exports.GotenbergApi = GotenbergApi;
