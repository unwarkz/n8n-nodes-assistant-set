"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mem0ApiRequest = mem0ApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
async function mem0ApiRequest(method, endpoint, body = {}, qs = {}) {
    // Support both Portuguese parameter name used in CRUD node and English used in Memory node
    let authenticationType;
    try {
        authenticationType = this.getNodeParameter('tipoAutenticacao', 0);
    }
    catch (e) {
        authenticationType = this.getNodeParameter('authType', 0) || 'nuvem';
        // Map to legacy values used below
        if (authenticationType === 'cloud')
            authenticationType = 'nuvem';
        if (authenticationType === 'selfHosted')
            authenticationType = 'selfHosted';
    }
    let credentials;
    let baseUrl;
    if (authenticationType === 'nuvem') {
        credentials = await this.getCredentials('mem0Api');
        baseUrl = 'https://api.mem0.ai';
    }
    else {
        credentials = await this.getCredentials('mem0SelfHostedApi');
        baseUrl = credentials.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    const options = {
        method,
        body,
        qs,
        url: `${baseUrl}${endpoint}`,
        json: true,
    };
    if (credentials.apiKey) {
        options.headers = {
            'Authorization': `Token ${credentials.apiKey}`,
        };
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map