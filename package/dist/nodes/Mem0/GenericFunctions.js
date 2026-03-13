"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mem0ApiRequest = mem0ApiRequest;
exports.translateEndpoint = translateEndpoint;
const n8n_workflow_1 = require("n8n-workflow");
/**
 * Translates API endpoints for self-hosted instances.
 * The self-hosted app.py uses /search instead of /v1/memories/search/
 * and does not support v2 search endpoints.
 */
function translateEndpoint(endpoint, authenticationType) {
    if (authenticationType !== 'selfHosted') return endpoint;
    // Self-hosted: /v1/memories/search/ -> /search
    if (endpoint === '/v1/memories/search/' || endpoint === '/v1/memories/search') {
        return '/search';
    }
    // Self-hosted: /v2/memories/search/ -> /search (no v2 endpoint in self-hosted)
    if (endpoint === '/v2/memories/search/' || endpoint === '/v2/memories/search') {
        return '/search';
    }
    return endpoint;
}
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
    const resolvedEndpoint = translateEndpoint(endpoint, authenticationType);
    const options = {
        method,
        body,
        qs,
        url: `${baseUrl}${resolvedEndpoint}`,
        json: true,
    };
    if (credentials.apiKey) {
        options.headers = {
            'Authorization': authenticationType === 'selfHosted'
                ? `Bearer ${credentials.apiKey}`
                : `Token ${credentials.apiKey}`,
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