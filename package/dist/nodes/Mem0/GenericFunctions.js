"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mem0ApiRequest = mem0ApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
async function mem0ApiRequest(method, endpoint, body = {}, qs = {}) {
    // Resolve authentication type using the unified 'authType' parameter name
    let authenticationType;
    try {
        authenticationType = this.getNodeParameter('authType', 0);
    }
    catch (e) {
        authenticationType = 'cloud';
    }
    let credentials;
    let baseUrl;
    if (authenticationType === 'cloud') {
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