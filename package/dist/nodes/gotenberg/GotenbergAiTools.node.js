"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GotenbergAiTools = void 0;

/**
 * Load zod for schema definitions (available in n8n's runtime environment).
 */
let z = null;
try { z = require('zod'); } catch (_) { /* no zod */ }

/**
 * Load DynamicStructuredTool from LangChain (available in n8n's runtime environment).
 * DynamicStructuredTool accepts a structured zod-validated object as input, which
 * avoids "Expected string, received object" errors when an LLM passes structured arguments.
 * Falls back to a minimal StructuredTool-compatible shim when not resolvable.
 */
let DynamicStructuredTool;
(function () {
    const candidates = ['@langchain/core/tools', 'langchain/tools'];
    for (const mod of candidates) {
        try {
            const exported = require(mod);
            if (exported && exported.DynamicStructuredTool) {
                DynamicStructuredTool = exported.DynamicStructuredTool;
                return;
            }
        } catch (_) { /* continue */ }
    }
    // Minimal shim that satisfies the structured-tool contract used by n8n AI Agent
    DynamicStructuredTool = class DynamicStructuredToolShim {
        constructor({ name, description, schema, func }) {
            this.name = name;
            this.description = description;
            this.schema = schema || (z ? z.object({}).passthrough() : null);
            this.func = func;
            this.returnDirect = false;
            this.verbose = false;
            this.lc_namespace = ['langchain_core', 'tools'];
            this.lc_serializable = true;
        }
        async invoke(input) {
            const inputObj = typeof input === 'string'
                ? (() => { try { return JSON.parse(input); } catch (_) { return { input }; } })()
                : (input || {});
            return this.func(inputObj);
        }
        async call(arg, _configArg) {
            return this.invoke(arg);
        }
        _type() { return 'structured'; }
    };
})();

/**
 * GotenbergAiTools – n8n AI sub-node
 *
 * Exposes Gotenberg PDF conversion & manipulation operations as
 * DynamicStructuredTool instances consumable by the n8n AI Agent node.
 *
 * Connect the "ai_tool" output to an AI Agent node's "Tools" input.
 *
 * Available tools:
 *  - gotenberg_url_to_pdf        : Convert a public URL to a PDF file
 *  - gotenberg_html_to_pdf       : Convert an HTML string to a PDF file
 *  - gotenberg_url_screenshot    : Take a screenshot of a public URL
 *  - gotenberg_libreoffice_convert : Convert an office document (base64) to PDF
 *  - gotenberg_merge_pdfs        : Merge multiple PDFs (base64) into one
 *  - gotenberg_split_pdf         : Split a PDF (base64) into multiple files
 *  - gotenberg_flatten_pdf       : Flatten annotations/form fields in a PDF (base64)
 *  - gotenberg_read_pdf_metadata : Read metadata from a PDF (base64)
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buildAuthHeaders(ctx) {
    const credentials = await ctx.getCredentials('gotenbergApi');
    const headers = {};
    if (credentials.username && credentials.password) {
        const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
    }
    return { credentials, headers };
}

async function gotenbergPost(ctx, endpoint, formData, returnJson) {
    const { credentials, headers } = await buildAuthHeaders(ctx);
    const baseUrl = (credentials.baseUrl || 'http://localhost:3000').replace(/\/$/, '');

    const options = {
        method: 'POST',
        url: `${baseUrl}${endpoint}`,
        formData,
        headers,
        encoding: null,
        json: returnJson === true,
    };

    return ctx.helpers.request(options);
}

/**
 * Convert a binary Buffer result to a base64 string (for returning to the AI agent).
 * Returns a concise summary including base64 data so the agent can pass it downstream.
 */
function bufferToBase64Result(buf, filename, mimeType) {
    const b64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
    const sizeKb = Math.round((b64.length * 3 / 4) / 1024);
    return JSON.stringify({
        success: true,
        filename,
        mimeType,
        sizeKb,
        base64: b64,
    });
}

class GotenbergAiTools {
    constructor() {
        this.description = {
            displayName: 'Gotenberg AI Tools',
            name: 'gotenbergAiTools',
            icon: 'file:gotenberg.svg',
            group: ['transform'],
            version: 1,
            description: 'Provides Gotenberg PDF tools (convert, screenshot, merge, split…) to an AI Agent node',
            defaults: { name: 'Gotenberg AI Tools' },
            inputs: [],
            outputs: ['ai_tool'],
            outputNames: ['Tool'],
            credentials: [{ name: 'gotenbergApi', required: true }],
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Tools', 'Agents & LLMs'],
                },
                resources: {
                    primaryDocumentation: [{ url: 'https://gotenberg.dev/docs/' }],
                },
            },
            properties: [
                // ── Tools to expose ───────────────────────────────────────────────
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        {
                            name: 'URL to PDF',
                            value: 'urlToPdf',
                            description: 'Convert a public URL to a PDF file using Chromium',
                        },
                        {
                            name: 'HTML to PDF',
                            value: 'htmlToPdf',
                            description: 'Convert an HTML string to a PDF file using Chromium',
                        },
                        {
                            name: 'URL to Screenshot',
                            value: 'urlScreenshot',
                            description: 'Take a PNG/JPEG screenshot of a public URL using Chromium',
                        },
                        {
                            name: 'LibreOffice Convert',
                            value: 'libreofficeConvert',
                            description: 'Convert an office document (base64) to PDF using LibreOffice',
                        },
                        {
                            name: 'Merge PDFs',
                            value: 'mergePdfs',
                            description: 'Merge multiple base64-encoded PDFs into a single PDF',
                        },
                        {
                            name: 'Split PDF',
                            value: 'splitPdf',
                            description: 'Split a base64-encoded PDF into multiple parts',
                        },
                        {
                            name: 'Flatten PDF',
                            value: 'flattenPdf',
                            description: 'Flatten annotations and form fields in a base64-encoded PDF',
                        },
                        {
                            name: 'Read PDF Metadata',
                            value: 'readMetadata',
                            description: 'Read metadata from a base64-encoded PDF and return it as JSON',
                        },
                    ],
                    default: ['urlToPdf', 'htmlToPdf', 'urlScreenshot'],
                    description: 'Which Gotenberg tools to expose to the AI Agent',
                },

                // ── Chromium defaults ─────────────────────────────────────────────
                {
                    displayName: 'Default Chromium Options',
                    name: 'chromiumDefaults',
                    type: 'collection',
                    placeholder: 'Add Default',
                    default: {},
                    options: [
                        {
                            displayName: 'Paper Format',
                            name: 'paperWidth',
                            type: 'options',
                            options: [
                                { name: 'A4 (8.27 × 11.69 in)', value: 'a4' },
                                { name: 'Letter (8.5 × 11 in)', value: 'letter' },
                                { name: 'A3 (11.69 × 16.54 in)', value: 'a3' },
                            ],
                            default: 'letter',
                            description: 'Default paper size for PDF output',
                        },
                        {
                            displayName: 'Landscape',
                            name: 'landscape',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Print Background',
                            name: 'printBackground',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Wait Delay',
                            name: 'waitDelay',
                            type: 'string',
                            default: '',
                            placeholder: '2s',
                        },
                        {
                            displayName: 'Screenshot Format',
                            name: 'screenshotFormat',
                            type: 'options',
                            options: [
                                { name: 'PNG', value: 'png' },
                                { name: 'JPEG', value: 'jpeg' },
                                { name: 'WebP', value: 'webp' },
                            ],
                            default: 'png',
                        },
                    ],
                },

                // ── Tool description override ─────────────────────────────────────
                {
                    displayName: 'Tool Description Override',
                    name: 'toolDescription',
                    type: 'string',
                    default: '',
                    description: 'Optional: override the description shown to the AI Agent for all tools',
                    typeOptions: { rows: 2 },
                },
            ],
        };
    }

    /**
     * supplyData is called by the n8n AI Agent to obtain the tool objects.
     * Returns an array of DynamicStructuredTool instances.
     */
    async supplyData(itemIndex) {
        const self = this;
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, ['urlToPdf', 'htmlToPdf', 'urlScreenshot']);
        const chromiumDefaults = this.getNodeParameter('chromiumDefaults', itemIndex, {});
        const toolDescriptionOverride = this.getNodeParameter('toolDescription', itemIndex, '');

        // ── Logging helpers ───────────────────────────────────────────────────
        function log(level, message, meta) {
            try {
                if (self.logger && typeof self.logger[level] === 'function') {
                    self.logger[level](message, meta);
                }
            } catch (_) { /* ignore */ }
        }

        // ── Execution logging helpers ─────────────────────────────────────────
        function startToolRun(payload) {
            try {
                const { index } = self.addInputData('ai_tool', [[{ json: payload }]]);
                return index;
            } catch (_) { return 0; }
        }

        function endToolRun(runIndex, data) {
            try {
                // Avoid storing huge base64 blobs in the execution log – use summary only
                const logData = data && typeof data === 'object' && data.base64
                    ? { ...data, base64: `[base64, ${data.sizeKb}kb]` }
                    : data;
                const json = (logData !== null && typeof logData === 'object' && !Array.isArray(logData))
                    ? logData
                    : { result: logData };
                self.addOutputData('ai_tool', runIndex, [[{ json }]]);
            } catch (_) { /* addOutputData may not be available in all n8n versions */ }
        }

        // ── Paper size helper ─────────────────────────────────────────────────
        function getPaperSize(format) {
            const sizes = {
                a4: { paperWidth: '8.27', paperHeight: '11.69' },
                letter: { paperWidth: '8.5', paperHeight: '11' },
                a3: { paperWidth: '11.69', paperHeight: '16.54' },
            };
            return sizes[format] || sizes.letter;
        }

        function applyChromiumDefaults(formData) {
            if (chromiumDefaults.paperWidth) {
                const { paperWidth, paperHeight } = getPaperSize(chromiumDefaults.paperWidth);
                formData.paperWidth = paperWidth;
                formData.paperHeight = paperHeight;
            }
            if (chromiumDefaults.landscape !== undefined) formData.landscape = String(chromiumDefaults.landscape);
            if (chromiumDefaults.printBackground !== undefined) formData.printBackground = String(chromiumDefaults.printBackground);
            if (chromiumDefaults.waitDelay) formData.waitDelay = chromiumDefaults.waitDelay;
        }

        // ── Helper to parse base64 input from AI agent ────────────────────────
        function base64ToBuffer(b64) {
            // Accept "data:...;base64,..." format or raw base64
            const raw = b64.includes(',') ? b64.split(',')[1] : b64;
            return Buffer.from(raw, 'base64');
        }

        // ── Zod schema helpers ────────────────────────────────────────────────
        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function boolOpt(desc) { return z ? z.boolean().optional().describe(desc) : undefined; }

        const tools = [];

        // ── Tool: gotenberg_url_to_pdf ────────────────────────────────────────
        if (enabledTools.includes('urlToPdf')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_url_to_pdf',
                description: toolDescriptionOverride ||
                    'Convert a public web URL to a PDF file using headless Chromium via Gotenberg. ' +
                    'Returns a base64-encoded PDF and its size in KB. ' +
                    'Use this when the user asks to save a webpage as PDF, generate a PDF report from a URL, or export a web page.',
                schema: z ? z.object({
                    url: z.string().describe('The full public URL to convert to PDF (must be accessible by the Gotenberg server)'),
                    landscape: boolOpt('Use landscape orientation (default: false)'),
                    print_background: boolOpt('Print background graphics (default: false)'),
                    wait_delay: strOpt('Wait before converting (e.g., "2s", "500ms")'),
                    paper_format: strOpt('"a4" | "letter" | "a3" (default: letter)'),
                    pdfa: strOpt('Convert to PDF/A: "PDF/A-1a" | "PDF/A-2b" | "PDF/A-3b"'),
                    output_filename: strOpt('Desired filename for the output (default: output.pdf)'),
                }) : null,
                func: async ({ url, landscape, print_background, wait_delay, paper_format, pdfa, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_url_to_pdf', url });
                    log('debug', '[Gotenberg] gotenberg_url_to_pdf called', { url });
                    try {
                        if (!url) return JSON.stringify({ error: 'url is required' });

                        const formData = { url };
                        applyChromiumDefaults(formData);
                        if (paper_format) {
                            const { paperWidth, paperHeight } = getPaperSize(paper_format);
                            formData.paperWidth = paperWidth;
                            formData.paperHeight = paperHeight;
                        }
                        if (landscape !== undefined) formData.landscape = String(landscape);
                        if (print_background !== undefined) formData.printBackground = String(print_background);
                        if (wait_delay) formData.waitDelay = wait_delay;
                        if (pdfa) formData.pdfa = pdfa;

                        const responseBuffer = await gotenbergPost(self, '/forms/chromium/convert/url', formData);
                        const filename = output_filename || 'output.pdf';
                        const resultStr = bufferToBase64Result(responseBuffer, filename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_url_to_pdf succeeded', { url, sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_url_to_pdf failed', { url, error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_html_to_pdf ───────────────────────────────────────
        if (enabledTools.includes('htmlToPdf')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_html_to_pdf',
                description: toolDescriptionOverride ||
                    'Convert an HTML string to a PDF file using headless Chromium via Gotenberg. ' +
                    'Returns a base64-encoded PDF and its size in KB. ' +
                    'Use this when you need to render dynamic HTML content, custom-styled reports, invoices, or letters as PDF.',
                schema: z ? z.object({
                    html: z.string().describe('Full HTML document content to convert (must be a complete HTML page with <html>, <head>, <body> tags)'),
                    landscape: boolOpt('Use landscape orientation (default: false)'),
                    print_background: boolOpt('Print background graphics and colours (default: false)'),
                    wait_delay: strOpt('Wait before converting (e.g., "2s")'),
                    paper_format: strOpt('"a4" | "letter" | "a3" (default: letter)'),
                    pdfa: strOpt('Convert to PDF/A: "PDF/A-1a" | "PDF/A-2b" | "PDF/A-3b"'),
                    output_filename: strOpt('Desired filename for the output (default: output.pdf)'),
                }) : null,
                func: async ({ html, landscape, print_background, wait_delay, paper_format, pdfa, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_html_to_pdf' });
                    log('debug', '[Gotenberg] gotenberg_html_to_pdf called');
                    try {
                        if (!html) return JSON.stringify({ error: 'html is required' });

                        const htmlBuffer = Buffer.from(html, 'utf-8');
                        const formData = {
                            files: {
                                value: htmlBuffer,
                                options: { filename: 'index.html', contentType: 'text/html' },
                            },
                        };
                        applyChromiumDefaults(formData);
                        if (paper_format) {
                            const { paperWidth, paperHeight } = getPaperSize(paper_format);
                            formData.paperWidth = paperWidth;
                            formData.paperHeight = paperHeight;
                        }
                        if (landscape !== undefined) formData.landscape = String(landscape);
                        if (print_background !== undefined) formData.printBackground = String(print_background);
                        if (wait_delay) formData.waitDelay = wait_delay;
                        if (pdfa) formData.pdfa = pdfa;

                        const responseBuffer = await gotenbergPost(self, '/forms/chromium/convert/html', formData);
                        const filename = output_filename || 'output.pdf';
                        const resultStr = bufferToBase64Result(responseBuffer, filename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_html_to_pdf succeeded', { sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_html_to_pdf failed', { error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_url_screenshot ────────────────────────────────────
        if (enabledTools.includes('urlScreenshot')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_url_screenshot',
                description: toolDescriptionOverride ||
                    'Take a screenshot of a public web URL using headless Chromium via Gotenberg. ' +
                    'Returns a base64-encoded image (PNG by default). ' +
                    'Use this to visually capture a webpage, generate thumbnail previews, or verify a URL renders correctly.',
                schema: z ? z.object({
                    url: z.string().describe('The full public URL to screenshot'),
                    format: strOpt('"png" | "jpeg" | "webp" (default: png)'),
                    width: strOpt('Viewport width in pixels (default: 800)'),
                    height: strOpt('Viewport height in pixels, 0 for full-page height (default: 600)'),
                    output_filename: strOpt('Desired filename for the output (default: screenshot.png)'),
                }) : null,
                func: async ({ url, format, width, height, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_url_screenshot', url });
                    log('debug', '[Gotenberg] gotenberg_url_screenshot called', { url });
                    try {
                        if (!url) return JSON.stringify({ error: 'url is required' });

                        const imgFormat = format || chromiumDefaults.screenshotFormat || 'png';
                        const formData = { url, format: imgFormat };
                        if (width) formData.width = String(width);
                        if (height) formData.height = String(height);

                        const responseBuffer = await gotenbergPost(self, '/forms/chromium/screenshot/url', formData);
                        const filename = output_filename || `screenshot.${imgFormat}`;
                        const resultStr = bufferToBase64Result(responseBuffer, filename, `image/${imgFormat}`);
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_url_screenshot succeeded', { url, sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_url_screenshot failed', { url, error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_libreoffice_convert ───────────────────────────────
        if (enabledTools.includes('libreofficeConvert')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_libreoffice_convert',
                description: toolDescriptionOverride ||
                    'Convert an office document (Word, Excel, PowerPoint, ODT, ODS, ODP, CSV…) to PDF using LibreOffice via Gotenberg. ' +
                    'The document must be provided as a base64-encoded string. ' +
                    'Returns a base64-encoded PDF. ' +
                    'Use this when the user needs to convert office files to PDF format.',
                schema: z ? z.object({
                    file_base64: z.string().describe('Base64-encoded office document content'),
                    filename: z.string().describe('Original filename including extension (e.g., "report.docx", "data.xlsx")'),
                    landscape: boolOpt('Use landscape orientation'),
                    page_ranges: strOpt('Page ranges to export, e.g., "1-3,5"'),
                    pdfa: strOpt('Convert to PDF/A: "PDF/A-1a" | "PDF/A-2b" | "PDF/A-3b"'),
                    output_filename: strOpt('Desired filename for the output PDF (default: output.pdf)'),
                }) : null,
                func: async ({ file_base64, filename, landscape, page_ranges, pdfa, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_libreoffice_convert', filename });
                    log('debug', '[Gotenberg] gotenberg_libreoffice_convert called', { filename });
                    try {
                        if (!file_base64) return JSON.stringify({ error: 'file_base64 is required' });
                        if (!filename) return JSON.stringify({ error: 'filename is required' });

                        const buffer = base64ToBuffer(file_base64);
                        const formData = {
                            files: {
                                value: buffer,
                                options: { filename, contentType: 'application/octet-stream' },
                            },
                        };
                        if (landscape !== undefined) formData.landscape = String(landscape);
                        if (page_ranges) formData.nativePageRanges = page_ranges;
                        if (pdfa) formData.pdfa = pdfa;

                        const responseBuffer = await gotenbergPost(self, '/forms/libreoffice/convert', formData);
                        const outFilename = output_filename || 'output.pdf';
                        const resultStr = bufferToBase64Result(responseBuffer, outFilename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_libreoffice_convert succeeded', { filename, sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_libreoffice_convert failed', { filename, error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_merge_pdfs ────────────────────────────────────────
        if (enabledTools.includes('mergePdfs')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_merge_pdfs',
                description: toolDescriptionOverride ||
                    'Merge multiple PDF files into a single PDF using Gotenberg PDF Engines. ' +
                    'Each PDF must be provided as a base64-encoded string in the "pdfs" array. ' +
                    'Files are merged in the order provided. ' +
                    'Returns a base64-encoded merged PDF.',
                schema: z ? z.object({
                    pdfs: z.array(
                        z.object({
                            base64: z.string().describe('Base64-encoded PDF content'),
                            filename: strOpt('Filename for ordering (e.g., "001.pdf"). Files are sorted alphabetically by filename.'),
                        })
                    ).describe('Array of PDFs to merge in order'),
                    output_filename: strOpt('Desired filename for the merged output (default: merged.pdf)'),
                }) : null,
                func: async ({ pdfs, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_merge_pdfs', count: pdfs ? pdfs.length : 0 });
                    log('debug', '[Gotenberg] gotenberg_merge_pdfs called', { count: pdfs ? pdfs.length : 0 });
                    try {
                        if (!pdfs || pdfs.length === 0) return JSON.stringify({ error: 'pdfs array is required and must not be empty' });

                        const fileList = pdfs.map((p, idx) => ({
                            value: base64ToBuffer(p.base64),
                            options: {
                                filename: p.filename || `${String(idx + 1).padStart(4, '0')}.pdf`,
                                contentType: 'application/pdf',
                            },
                        }));

                        const formData = { files: fileList };
                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/merge', formData);
                        const outFilename = output_filename || 'merged.pdf';
                        const resultStr = bufferToBase64Result(responseBuffer, outFilename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_merge_pdfs succeeded', { count: pdfs.length, sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_merge_pdfs failed', { error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_split_pdf ─────────────────────────────────────────
        if (enabledTools.includes('splitPdf')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_split_pdf',
                description: toolDescriptionOverride ||
                    'Split a PDF into multiple files using Gotenberg PDF Engines. ' +
                    'The PDF must be provided as a base64-encoded string. ' +
                    'Returns a base64-encoded ZIP archive containing the split PDF files.',
                schema: z ? z.object({
                    pdf_base64: z.string().describe('Base64-encoded PDF to split'),
                    split_mode: strOpt('"intervals" (split every N pages) | "pages" (split at specific ranges). Default: intervals'),
                    split_span: strOpt('For intervals: number of pages per chunk (e.g., "1"). For pages: comma-separated ranges (e.g., "1-3,5"). Default: "1"'),
                    output_filename: strOpt('Desired filename for the output (default: split.zip)'),
                }) : null,
                func: async ({ pdf_base64, split_mode, split_span, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_split_pdf', split_mode, split_span });
                    log('debug', '[Gotenberg] gotenberg_split_pdf called', { split_mode, split_span });
                    try {
                        if (!pdf_base64) return JSON.stringify({ error: 'pdf_base64 is required' });

                        const buffer = base64ToBuffer(pdf_base64);
                        const formData = {
                            files: { value: buffer, options: { filename: 'document.pdf', contentType: 'application/pdf' } },
                            splitMode: split_mode || 'intervals',
                            splitSpan: String(split_span || '1'),
                        };

                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/split', formData);
                        const outFilename = output_filename || 'split.zip';
                        const resultStr = bufferToBase64Result(responseBuffer, outFilename, 'application/zip');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_split_pdf succeeded', { sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_split_pdf failed', { error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_flatten_pdf ───────────────────────────────────────
        if (enabledTools.includes('flattenPdf')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_flatten_pdf',
                description: toolDescriptionOverride ||
                    'Flatten a PDF by removing interactive annotations and making form field values permanent (non-editable) using Gotenberg. ' +
                    'The PDF must be provided as a base64-encoded string. ' +
                    'Returns a base64-encoded flattened PDF.',
                schema: z ? z.object({
                    pdf_base64: z.string().describe('Base64-encoded PDF to flatten'),
                    output_filename: strOpt('Desired filename for the output (default: flattened.pdf)'),
                }) : null,
                func: async ({ pdf_base64, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_flatten_pdf' });
                    log('debug', '[Gotenberg] gotenberg_flatten_pdf called');
                    try {
                        if (!pdf_base64) return JSON.stringify({ error: 'pdf_base64 is required' });

                        const buffer = base64ToBuffer(pdf_base64);
                        const formData = {
                            files: { value: buffer, options: { filename: 'document.pdf', contentType: 'application/pdf' } },
                        };

                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/flatten', formData);
                        const outFilename = output_filename || 'flattened.pdf';
                        const resultStr = bufferToBase64Result(responseBuffer, outFilename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_flatten_pdf succeeded', { sizeKb: result.sizeKb });
                        endToolRun(runIndex, result);
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_flatten_pdf failed', { error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: gotenberg_read_pdf_metadata ─────────────────────────────────
        if (enabledTools.includes('readMetadata')) {
            tools.push(new DynamicStructuredTool({
                name: 'gotenberg_read_pdf_metadata',
                description: toolDescriptionOverride ||
                    'Read metadata from a PDF file using Gotenberg PDF Engines. ' +
                    'The PDF must be provided as a base64-encoded string. ' +
                    'Returns a JSON object with metadata properties such as Author, Title, Subject, Keywords, Creator, Producer, CreationDate, ModDate, and more.',
                schema: z ? z.object({
                    pdf_base64: z.string().describe('Base64-encoded PDF to read metadata from'),
                }) : null,
                func: async ({ pdf_base64 } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_read_pdf_metadata' });
                    log('debug', '[Gotenberg] gotenberg_read_pdf_metadata called');
                    try {
                        if (!pdf_base64) return JSON.stringify({ error: 'pdf_base64 is required' });

                        const buffer = base64ToBuffer(pdf_base64);
                        const formData = {
                            files: { value: buffer, options: { filename: 'document.pdf', contentType: 'application/pdf' } },
                        };

                        const jsonResult = await gotenbergPost(self, '/forms/pdfengines/metadata/read', formData, true);
                        const result = jsonResult && typeof jsonResult === 'object' ? jsonResult : { result: jsonResult };
                        log('info', '[Gotenberg] gotenberg_read_pdf_metadata succeeded');
                        endToolRun(runIndex, result);
                        return JSON.stringify(result);
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Gotenberg] gotenberg_read_pdf_metadata failed', { error: errObj.error });
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        return { response: tools };
    }

    /**
     * execute is called when the node is triggered as a regular node (not via AI Agent).
     * Returns a helpful message explaining how to use this node.
     */
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            returnData.push({
                json: {
                    message: 'Gotenberg AI Tools node is designed to be connected to an AI Agent node. Connect the "Tool" output to an AI Agent node\'s "Tools" input.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                    documentation: 'https://gotenberg.dev/docs/',
                },
            });
        }
        return [returnData];
    }
}
exports.GotenbergAiTools = GotenbergAiTools;
