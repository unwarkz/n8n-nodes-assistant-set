"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mem0ApiRequest = mem0ApiRequest;
exports.translateEndpoint = translateEndpoint;
const n8n_workflow_1 = require("n8n-workflow");
/**
 * Translates API endpoints for self-hosted instances.
 * Self-hosted instances expose routes without the /v1 version prefix,
 * so /v1/memories -> /memories, etc.
 * Trailing slashes are always removed to avoid 301 redirects.
 */
function translateEndpoint(endpoint, authenticationType) {
    // Always remove trailing slash to avoid redirect issues
    let ep = endpoint.replace(/\/$/, '');
    if (authenticationType !== 'selfHosted') return ep;
    // Self-hosted: strip /v1 version prefix (self-hosted runs without versioned prefix)
    ep = ep.replace(/^\/v[0-9]+\//, '/');
    return ep;
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