"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gotenberg = void 0;
const n8n_workflow_1 = require("n8n-workflow");

/**
 * Build auth headers for Gotenberg (HTTP Basic Auth, optional).
 */
async function buildAuthHeaders(ctx) {
    const credentials = await ctx.getCredentials('gotenbergApi');
    const headers = {};
    if (credentials.username && credentials.password) {
        const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
    }
    return { credentials, headers };
}

/**
 * Send a multipart/form-data POST request to Gotenberg and return the raw response buffer.
 */
async function gotenbergRequest(endpoint, formData, returnJson) {
    const { credentials, headers } = await buildAuthHeaders(this);
    const baseUrl = (credentials.baseUrl || 'http://localhost:3000').replace(/\/$/, '');

    const options = {
        method: 'POST',
        url: `${baseUrl}${endpoint}`,
        formData,
        headers,
        encoding: null,
        json: returnJson === true,
    };

    try {
        return await this.helpers.request(options);
    } catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}

/**
 * Apply common Chromium form fields from options collection.
 */
function applyChromiumOptions(formData, opts) {
    if (opts.landscape !== undefined) formData.landscape = String(opts.landscape);
    if (opts.paperWidth !== undefined) formData.paperWidth = String(opts.paperWidth);
    if (opts.paperHeight !== undefined) formData.paperHeight = String(opts.paperHeight);
    if (opts.marginTop !== undefined) formData.marginTop = String(opts.marginTop);
    if (opts.marginBottom !== undefined) formData.marginBottom = String(opts.marginBottom);
    if (opts.marginLeft !== undefined) formData.marginLeft = String(opts.marginLeft);
    if (opts.marginRight !== undefined) formData.marginRight = String(opts.marginRight);
    if (opts.scale !== undefined) formData.scale = String(opts.scale);
    if (opts.printBackground !== undefined) formData.printBackground = String(opts.printBackground);
    if (opts.waitDelay) formData.waitDelay = opts.waitDelay;
    if (opts.waitForExpression) formData.waitForExpression = opts.waitForExpression;
    if (opts.pdfa) formData.pdfa = opts.pdfa;
    if (opts.pdfua) formData.pdfua = 'true';
    if (opts.extraHttpHeaders) {
        try {
            JSON.parse(opts.extraHttpHeaders);
            formData.extraHttpHeaders = opts.extraHttpHeaders;
        } catch (_) { /* ignore invalid JSON */ }
    }
}

class Gotenberg {
    constructor() {
        this.description = {
            displayName: 'Gotenberg',
            name: 'gotenberg',
            icon: 'file:gotenberg.svg',
            group: ['transform'],
            version: 1,
            description: 'Convert documents and manipulate PDFs using Gotenberg (Chromium, LibreOffice, PDF Engines)',
            defaults: { name: 'Gotenberg' },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [{ name: 'gotenbergApi', required: true }],
            codex: {
                categories: ['Productivity', 'Utility'],
                subcategories: {
                    Productivity: ['PDF'],
                },
                resources: {
                    primaryDocumentation: [{ url: 'https://gotenberg.dev/docs/' }],
                },
            },
            properties: [
                // ── Resource ──────────────────────────────────────────────────────
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Chromium',
                            value: 'chromium',
                            description: 'Convert HTML/URL to PDF or screenshot using headless Chromium',
                        },
                        {
                            name: 'LibreOffice',
                            value: 'libreoffice',
                            description: 'Convert office documents (docx, xlsx, pptx, odt…) to PDF using LibreOffice',
                        },
                        {
                            name: 'PDF Engines',
                            value: 'pdfEngines',
                            description: 'Merge, split, convert, flatten PDFs and manage metadata',
                        },
                    ],
                    default: 'chromium',
                },

                // ── Chromium Operations ───────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['chromium'] } },
                    options: [
                        {
                            name: 'HTML to PDF',
                            value: 'htmlToPdf',
                            description: 'Convert an HTML binary file to PDF',
                            action: 'Convert HTML to PDF',
                        },
                        {
                            name: 'URL to PDF',
                            value: 'urlToPdf',
                            description: 'Render a URL and save it as PDF',
                            action: 'Convert URL to PDF',
                        },
                        {
                            name: 'HTML to Screenshot',
                            value: 'htmlScreenshot',
                            description: 'Take a screenshot of an HTML binary file',
                            action: 'Screenshot HTML',
                        },
                        {
                            name: 'URL to Screenshot',
                            value: 'urlScreenshot',
                            description: 'Take a screenshot of a URL',
                            action: 'Screenshot URL',
                        },
                    ],
                    default: 'htmlToPdf',
                },

                // ── LibreOffice Operations ────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['libreoffice'] } },
                    options: [
                        {
                            name: 'Convert to PDF',
                            value: 'convert',
                            description: 'Convert an office document to PDF',
                            action: 'Convert document to PDF',
                        },
                    ],
                    default: 'convert',
                },

                // ── PDF Engines Operations ────────────────────────────────────────
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['pdfEngines'] } },
                    options: [
                        {
                            name: 'Merge PDFs',
                            value: 'merge',
                            description: 'Merge multiple PDFs into a single file',
                            action: 'Merge PDFs',
                        },
                        {
                            name: 'Split PDF',
                            value: 'split',
                            description: 'Split a PDF into multiple files',
                            action: 'Split PDF',
                        },
                        {
                            name: 'Convert PDF',
                            value: 'convert',
                            description: 'Convert a PDF to a different PDF format (e.g. PDF/A)',
                            action: 'Convert PDF format',
                        },
                        {
                            name: 'Flatten PDF',
                            value: 'flatten',
                            description: 'Flatten PDF annotations and interactive form fields',
                            action: 'Flatten PDF',
                        },
                        {
                            name: 'Read Metadata',
                            value: 'readMetadata',
                            description: 'Read metadata from a PDF file',
                            action: 'Read PDF metadata',
                        },
                        {
                            name: 'Write Metadata',
                            value: 'writeMetadata',
                            description: 'Write metadata into a PDF file',
                            action: 'Write PDF metadata',
                        },
                    ],
                    default: 'merge',
                },

                // ── URL input (Chromium URL operations) ───────────────────────────
                {
                    displayName: 'URL',
                    name: 'url',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'https://example.com',
                    description: 'The URL to convert or screenshot',
                    displayOptions: {
                        show: {
                            resource: ['chromium'],
                            operation: ['urlToPdf', 'urlScreenshot'],
                        },
                    },
                },

                // ── Binary input property name ────────────────────────────────────
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    required: true,
                    description: 'Name of the binary property containing the input HTML file',
                    displayOptions: {
                        show: {
                            resource: ['chromium'],
                            operation: ['htmlToPdf', 'htmlScreenshot'],
                        },
                    },
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    required: true,
                    description: 'Name of the binary property containing the office document to convert',
                    displayOptions: {
                        show: {
                            resource: ['libreoffice'],
                            operation: ['convert'],
                        },
                    },
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    required: true,
                    description: 'Name of the binary property (or comma-separated list of names for merge) containing the input PDF(s)',
                    displayOptions: {
                        show: {
                            resource: ['pdfEngines'],
                            operation: ['merge', 'split', 'convert', 'flatten', 'readMetadata', 'writeMetadata'],
                        },
                    },
                },

                // ── Output binary property ────────────────────────────────────────
                {
                    displayName: 'Output Binary Property',
                    name: 'outputBinaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property to store the output file',
                    displayOptions: {
                        hide: {
                            resource: ['pdfEngines'],
                            operation: ['readMetadata'],
                        },
                    },
                },

                // ── Output filename ───────────────────────────────────────────────
                {
                    displayName: 'Output Filename',
                    name: 'outputFilename',
                    type: 'string',
                    default: 'output.pdf',
                    description: 'Filename for the output file (including extension)',
                    displayOptions: {
                        hide: {
                            resource: ['pdfEngines'],
                            operation: ['readMetadata'],
                        },
                    },
                },

                // ── Chromium options ──────────────────────────────────────────────
                {
                    displayName: 'Chromium Options',
                    name: 'chromiumOptions',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    displayOptions: { show: { resource: ['chromium'] } },
                    options: [
                        {
                            displayName: 'Paper Width (inches)',
                            name: 'paperWidth',
                            type: 'number',
                            default: 8.5,
                            description: 'Paper width in inches (default: 8.5)',
                        },
                        {
                            displayName: 'Paper Height (inches)',
                            name: 'paperHeight',
                            type: 'number',
                            default: 11,
                            description: 'Paper height in inches (default: 11)',
                        },
                        {
                            displayName: 'Landscape',
                            name: 'landscape',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to use landscape orientation',
                        },
                        {
                            displayName: 'Margin Top (inches)',
                            name: 'marginTop',
                            type: 'number',
                            default: 0.39,
                        },
                        {
                            displayName: 'Margin Bottom (inches)',
                            name: 'marginBottom',
                            type: 'number',
                            default: 0.39,
                        },
                        {
                            displayName: 'Margin Left (inches)',
                            name: 'marginLeft',
                            type: 'number',
                            default: 0.39,
                        },
                        {
                            displayName: 'Margin Right (inches)',
                            name: 'marginRight',
                            type: 'number',
                            default: 0.39,
                        },
                        {
                            displayName: 'Scale',
                            name: 'scale',
                            type: 'number',
                            default: 1.0,
                            description: 'Scale of the page rendering (0.1 – 2.0)',
                        },
                        {
                            displayName: 'Print Background',
                            name: 'printBackground',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to print background graphics',
                        },
                        {
                            displayName: 'Wait Delay',
                            name: 'waitDelay',
                            type: 'string',
                            default: '',
                            placeholder: '5s',
                            description: 'Duration to wait before converting (e.g., "1s", "500ms")',
                        },
                        {
                            displayName: 'Wait For Expression',
                            name: 'waitForExpression',
                            type: 'string',
                            default: '',
                            description: 'JavaScript expression that must return true before conversion proceeds',
                        },
                        {
                            displayName: 'Extra HTTP Headers (JSON)',
                            name: 'extraHttpHeaders',
                            type: 'string',
                            default: '',
                            placeholder: '{"X-Custom-Header":"value"}',
                            description: 'Additional HTTP headers as a JSON object (used for URL conversions)',
                        },
                        {
                            displayName: 'PDF/A Format',
                            name: 'pdfa',
                            type: 'options',
                            options: [
                                { name: 'Default (no conversion)', value: '' },
                                { name: 'PDF/A-1a', value: 'PDF/A-1a' },
                                { name: 'PDF/A-2b', value: 'PDF/A-2b' },
                                { name: 'PDF/A-3b', value: 'PDF/A-3b' },
                            ],
                            default: '',
                            description: 'Convert the resulting PDF to a PDF/A format',
                        },
                        {
                            displayName: 'PDF/UA',
                            name: 'pdfua',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to enable PDF/UA (Universal Accessibility) format',
                        },
                        {
                            displayName: 'Screenshot Width (px)',
                            name: 'width',
                            type: 'number',
                            default: 800,
                            description: 'Viewport width for screenshot (pixels)',
                        },
                        {
                            displayName: 'Screenshot Height (px)',
                            name: 'height',
                            type: 'number',
                            default: 600,
                            description: 'Viewport height for screenshot in pixels (0 = full page height)',
                        },
                        {
                            displayName: 'Screenshot Format',
                            name: 'format',
                            type: 'options',
                            options: [
                                { name: 'PNG', value: 'png' },
                                { name: 'JPEG', value: 'jpeg' },
                                { name: 'WebP', value: 'webp' },
                            ],
                            default: 'png',
                            description: 'Image format for screenshots',
                        },
                        {
                            displayName: 'Screenshot Quality',
                            name: 'quality',
                            type: 'number',
                            default: 100,
                            description: 'Compression quality for JPEG/WebP screenshots (0–100)',
                        },
                        {
                            displayName: 'Clip Screenshot',
                            name: 'clip',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to clip the screenshot to the viewport size',
                        },
                    ],
                },

                // ── LibreOffice options ───────────────────────────────────────────
                {
                    displayName: 'LibreOffice Options',
                    name: 'libreofficeOptions',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    displayOptions: { show: { resource: ['libreoffice'] } },
                    options: [
                        {
                            displayName: 'Landscape',
                            name: 'landscape',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to use landscape orientation',
                        },
                        {
                            displayName: 'Page Ranges',
                            name: 'nativePageRanges',
                            type: 'string',
                            default: '',
                            placeholder: '1-3,5',
                            description: 'Page ranges to export (e.g., "1-5", "1-3,5")',
                        },
                        {
                            displayName: 'Export Form Fields',
                            name: 'exportFormFields',
                            type: 'boolean',
                            default: true,
                            description: 'Whether to export form fields as widgets',
                        },
                        {
                            displayName: 'PDF/A Format',
                            name: 'pdfa',
                            type: 'options',
                            options: [
                                { name: 'Default (no conversion)', value: '' },
                                { name: 'PDF/A-1a', value: 'PDF/A-1a' },
                                { name: 'PDF/A-2b', value: 'PDF/A-2b' },
                                { name: 'PDF/A-3b', value: 'PDF/A-3b' },
                            ],
                            default: '',
                        },
                        {
                            displayName: 'PDF/UA',
                            name: 'pdfua',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to enable PDF/UA (Universal Accessibility)',
                        },
                        {
                            displayName: 'Merge All Outputs',
                            name: 'merge',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to merge all converted PDFs into a single file',
                        },
                    ],
                },

                // ── PDF Engines – Split options ───────────────────────────────────
                {
                    displayName: 'Split Mode',
                    name: 'splitMode',
                    type: 'options',
                    options: [
                        {
                            name: 'By Intervals (equal chunks)',
                            value: 'intervals',
                            description: 'Split into chunks of N pages each',
                        },
                        {
                            name: 'By Pages (custom ranges)',
                            value: 'pages',
                            description: 'Split at specific page ranges',
                        },
                    ],
                    default: 'intervals',
                    displayOptions: {
                        show: { resource: ['pdfEngines'], operation: ['split'] },
                    },
                },
                {
                    displayName: 'Split Span',
                    name: 'splitSpan',
                    type: 'string',
                    default: '1',
                    description: 'For "intervals" mode: number of pages per chunk. For "pages" mode: comma-separated page ranges (e.g., "1-3,5")',
                    displayOptions: {
                        show: { resource: ['pdfEngines'], operation: ['split'] },
                    },
                },
                {
                    displayName: 'Unify Duplicate Streams',
                    name: 'splitUnify',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to unify duplicate streams after splitting',
                    displayOptions: {
                        show: { resource: ['pdfEngines'], operation: ['split'] },
                    },
                },

                // ── PDF Engines – Convert options ─────────────────────────────────
                {
                    displayName: 'Target PDF/A Format',
                    name: 'pdfa',
                    type: 'options',
                    options: [
                        { name: 'PDF/A-1a', value: 'PDF/A-1a' },
                        { name: 'PDF/A-2b', value: 'PDF/A-2b' },
                        { name: 'PDF/A-3b', value: 'PDF/A-3b' },
                    ],
                    default: 'PDF/A-1a',
                    description: 'Target PDF/A format for conversion',
                    displayOptions: {
                        show: { resource: ['pdfEngines'], operation: ['convert'] },
                    },
                },

                // ── PDF Engines – Write Metadata ──────────────────────────────────
                {
                    displayName: 'Metadata (JSON)',
                    name: 'metadata',
                    type: 'string',
                    default: '{}',
                    placeholder: '{"Author":"Jane Doe","Title":"Annual Report"}',
                    description: 'PDF metadata properties to write as a JSON object',
                    typeOptions: { rows: 4 },
                    displayOptions: {
                        show: { resource: ['pdfEngines'], operation: ['writeMetadata'] },
                    },
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                const outputBinaryProp = this.getNodeParameter('outputBinaryPropertyName', i, 'data');
                const outputFilename = this.getNodeParameter('outputFilename', i, 'output.pdf');

                let responseData;
                let outputMimeType = 'application/pdf';

                // ── Chromium ────────────────────────────────────────────────────
                if (resource === 'chromium') {
                    const opts = this.getNodeParameter('chromiumOptions', i, {});
                    const formData = {};
                    applyChromiumOptions(formData, opts);

                    if (operation === 'urlToPdf') {
                        const url = this.getNodeParameter('url', i);
                        formData.url = url;
                        responseData = await gotenbergRequest.call(this, '/forms/chromium/convert/url', formData);

                    } else if (operation === 'urlScreenshot') {
                        const url = this.getNodeParameter('url', i);
                        formData.url = url;
                        if (opts.width) formData.width = String(opts.width);
                        if (opts.height) formData.height = String(opts.height);
                        if (opts.format) formData.format = opts.format;
                        if (opts.quality !== undefined) formData.quality = String(opts.quality);
                        if (opts.clip !== undefined) formData.clip = String(opts.clip);
                        outputMimeType = `image/${opts.format || 'png'}`;
                        responseData = await gotenbergRequest.call(this, '/forms/chromium/screenshot/url', formData);

                    } else if (operation === 'htmlToPdf') {
                        const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                        const binaryData = items[i].binary;
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        formData.files = {
                            value: buffer,
                            options: {
                                filename: 'index.html',
                                contentType: binaryData[binaryProp].mimeType || 'text/html',
                            },
                        };
                        responseData = await gotenbergRequest.call(this, '/forms/chromium/convert/html', formData);

                    } else if (operation === 'htmlScreenshot') {
                        const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                        const binaryData = items[i].binary;
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        if (opts.width) formData.width = String(opts.width);
                        if (opts.height) formData.height = String(opts.height);
                        if (opts.format) formData.format = opts.format;
                        if (opts.quality !== undefined) formData.quality = String(opts.quality);
                        if (opts.clip !== undefined) formData.clip = String(opts.clip);
                        outputMimeType = `image/${opts.format || 'png'}`;
                        formData.files = {
                            value: buffer,
                            options: { filename: 'index.html', contentType: 'text/html' },
                        };
                        responseData = await gotenbergRequest.call(this, '/forms/chromium/screenshot/html', formData);
                    }

                // ── LibreOffice ─────────────────────────────────────────────────
                } else if (resource === 'libreoffice') {
                    const opts = this.getNodeParameter('libreofficeOptions', i, {});
                    const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                    const binaryData = items[i].binary;

                    if (!binaryData || !binaryData[binaryProp]) {
                        throw new Error(`No binary data found in property "${binaryProp}"`);
                    }
                    const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                    const filename = binaryData[binaryProp].fileName || 'document.docx';
                    const mimeType = binaryData[binaryProp].mimeType || 'application/octet-stream';

                    const formData = {
                        files: {
                            value: buffer,
                            options: { filename, contentType: mimeType },
                        },
                    };
                    if (opts.landscape !== undefined) formData.landscape = String(opts.landscape);
                    if (opts.nativePageRanges) formData.nativePageRanges = opts.nativePageRanges;
                    if (opts.exportFormFields !== undefined) formData.exportFormFields = String(opts.exportFormFields);
                    if (opts.pdfa) formData.pdfa = opts.pdfa;
                    if (opts.pdfua) formData.pdfua = 'true';
                    if (opts.merge !== undefined) formData.merge = String(opts.merge);

                    responseData = await gotenbergRequest.call(this, '/forms/libreoffice/convert', formData);

                // ── PDF Engines ─────────────────────────────────────────────────
                } else if (resource === 'pdfEngines') {
                    const binaryProp = this.getNodeParameter('binaryPropertyName', i, 'data');
                    const binaryData = items[i].binary;

                    if (operation === 'merge') {
                        const propNames = binaryProp.split(',').map(p => p.trim()).filter(Boolean);
                        const fileList = [];
                        for (let idx = 0; idx < propNames.length; idx++) {
                            const prop = propNames[idx];
                            if (binaryData && binaryData[prop]) {
                                const buffer = await this.helpers.getBinaryDataBuffer(i, prop);
                                const fn = binaryData[prop].fileName || `${String(idx + 1).padStart(4, '0')}.pdf`;
                                fileList.push({
                                    value: buffer,
                                    options: { filename: fn, contentType: 'application/pdf' },
                                });
                            }
                        }
                        if (fileList.length === 0) {
                            throw new Error(`No binary PDF data found in properties: ${binaryProp}`);
                        }
                        const formData = { files: fileList };
                        responseData = await gotenbergRequest.call(this, '/forms/pdfengines/merge', formData);

                    } else if (operation === 'split') {
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const filename = binaryData[binaryProp].fileName || 'document.pdf';
                        const splitMode = this.getNodeParameter('splitMode', i, 'intervals');
                        const splitSpan = this.getNodeParameter('splitSpan', i, '1');
                        const splitUnify = this.getNodeParameter('splitUnify', i, false);

                        const formData = {
                            files: { value: buffer, options: { filename, contentType: 'application/pdf' } },
                            splitMode,
                            splitSpan: String(splitSpan),
                            splitUnify: String(splitUnify),
                        };
                        responseData = await gotenbergRequest.call(this, '/forms/pdfengines/split', formData);

                    } else if (operation === 'convert') {
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const filename = binaryData[binaryProp].fileName || 'document.pdf';
                        const pdfa = this.getNodeParameter('pdfa', i, 'PDF/A-1a');

                        const formData = {
                            files: { value: buffer, options: { filename, contentType: 'application/pdf' } },
                        };
                        if (pdfa) formData.pdfa = pdfa;
                        responseData = await gotenbergRequest.call(this, '/forms/pdfengines/convert', formData);

                    } else if (operation === 'flatten') {
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const filename = binaryData[binaryProp].fileName || 'document.pdf';

                        const formData = {
                            files: { value: buffer, options: { filename, contentType: 'application/pdf' } },
                        };
                        responseData = await gotenbergRequest.call(this, '/forms/pdfengines/flatten', formData);

                    } else if (operation === 'readMetadata') {
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const filename = binaryData[binaryProp].fileName || 'document.pdf';

                        const formData = {
                            files: { value: buffer, options: { filename, contentType: 'application/pdf' } },
                        };
                        const jsonResult = await gotenbergRequest.call(this, '/forms/pdfengines/metadata/read', formData, true);
                        returnData.push({
                            json: jsonResult && typeof jsonResult === 'object' ? jsonResult : { result: jsonResult },
                            pairedItem: { item: i },
                        });
                        continue; // skip binary output handling

                    } else if (operation === 'writeMetadata') {
                        if (!binaryData || !binaryData[binaryProp]) {
                            throw new Error(`No binary data found in property "${binaryProp}"`);
                        }
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
                        const filename = binaryData[binaryProp].fileName || 'document.pdf';
                        const metadataStr = this.getNodeParameter('metadata', i, '{}');

                        let metadataObj;
                        try { metadataObj = JSON.parse(metadataStr); }
                        catch (_) { metadataObj = {}; }

                        const formData = {
                            files: { value: buffer, options: { filename, contentType: 'application/pdf' } },
                            metadata: JSON.stringify(metadataObj),
                        };
                        responseData = await gotenbergRequest.call(this, '/forms/pdfengines/metadata/write', formData);
                    }
                }

                // Store binary output
                if (responseData !== undefined && responseData !== null) {
                    const binaryOutput = await this.helpers.prepareBinaryData(
                        Buffer.isBuffer(responseData) ? responseData : Buffer.from(responseData),
                        outputFilename,
                        outputMimeType,
                    );
                    returnData.push({
                        json: { filename: outputFilename, mimeType: outputMimeType },
                        binary: { [outputBinaryProp]: binaryOutput },
                        pairedItem: { item: i },
                    });
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
exports.Gotenberg = Gotenberg;
