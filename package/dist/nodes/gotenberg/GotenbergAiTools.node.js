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
 * Binary data protocol:
 *   Tools that PRODUCE files store them in n8n's binary data system and return
 *   a JSON object with a "binaryPropertyName" field. Pass this field name to
 *   any other tool that needs the file.
 *   Tools that CONSUME files accept a "binary_property_name" parameter — the
 *   name of the binary property where the file was previously stored.
 *   Compatible with N8N_DEFAULT_BINARY_DATA_MODE=filesystem and database.
 *
 * Available tools:
 *  - gotenberg_url_to_pdf          : Convert a public URL to a PDF file
 *  - gotenberg_html_to_pdf         : Convert an HTML string to a PDF file
 *  - gotenberg_url_screenshot      : Take a screenshot of a public URL
 *  - gotenberg_libreoffice_convert : Convert an office document to PDF (input via binary property)
 *  - gotenberg_merge_pdfs          : Merge multiple PDFs into one (input via binary properties)
 *  - gotenberg_split_pdf           : Split a PDF into multiple files (input via binary property)
 *  - gotenberg_flatten_pdf         : Flatten annotations/form fields in a PDF (input via binary property)
 *  - gotenberg_read_pdf_metadata   : Read metadata from a PDF (input via binary property)
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
        ...(returnJson !== true && { encoding: 'arraybuffer' }),
    };

    return ctx.helpers.httpRequest(options);
}

/**
 * Store a binary buffer in n8n's binary data system (filesystem or database mode)
 * and attach it to the current execution item. Returns a short JSON summary
 * with the binary property name so the AI agent can reference it downstream.
 *
 * Compatible with N8N_DEFAULT_BINARY_DATA_MODE=filesystem and database.
 * Works correctly with n8n v2 task runners (no in-memory mutation).
 *
 * Files are stored in a process-global registry so they can be read by other
 * AI tool modules (e.g. TelegramBotAiTools) in the same n8n execution context.
 */
// Process-global registry shared across all AI tool modules.
if (!global._n8nBinaryRegistry) {
    global._n8nBinaryRegistry = new Map();
}
let _binaryCounter = 0;
async function storeBinaryOutput(ctx, buf, filename, mimeType) {
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const sizeKb = Math.round(buffer.length / 1024);
    const binaryPropertyName = `gotenberg_file_${_binaryCounter++}`;
    const binaryData = await ctx.helpers.prepareBinaryData(buffer, filename, mimeType);
    // Keep registry bounded to avoid unbounded memory growth across many runs.
    if (global._n8nBinaryRegistry.size >= 100) {
        const firstKey = global._n8nBinaryRegistry.keys().next().value;
        global._n8nBinaryRegistry.delete(firstKey);
    }
    global._n8nBinaryRegistry.set(binaryPropertyName, { buffer, binaryData, filename, mimeType });
    // Also mutate the input item so in-module getBinaryDataBuffer still works.
    const inputItems = ctx.getInputData();
    const item = inputItems[0] || { json: {}, binary: {} };
    if (!item.binary) item.binary = {};
    item.binary[binaryPropertyName] = binaryData;
    return JSON.stringify({
        success: true,
        binaryPropertyName,
        filename,
        mimeType,
        sizeKb,
        message: `File "${filename}" (${sizeKb} KB) stored in binary property "${binaryPropertyName}". Pass this binaryPropertyName to other tools that need this file.`,
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
                            description: 'Convert an office document to PDF using LibreOffice (accepts binary property reference)',
                        },
                        {
                            name: 'Merge PDFs',
                            value: 'mergePdfs',
                            description: 'Merge multiple PDFs into a single PDF (accepts binary property references)',
                        },
                        {
                            name: 'Split PDF',
                            value: 'splitPdf',
                            description: 'Split a PDF into multiple parts (accepts binary property reference)',
                        },
                        {
                            name: 'Flatten PDF',
                            value: 'flattenPdf',
                            description: 'Flatten annotations and form fields in a PDF (accepts binary property reference)',
                        },
                        {
                            name: 'Read PDF Metadata',
                            value: 'readMetadata',
                            description: 'Read metadata from a PDF and return it as JSON (accepts binary property reference)',
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
                const json = (data !== null && typeof data === 'object' && !Array.isArray(data))
                    ? data
                    : { result: data };
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

        /**
         * Retrieve a binary buffer from n8n's binary data system by property name.
         * This is the counterpart to storeBinaryOutput — it reads the file that
         * was previously stored under a given binary property name.
         * Falls back to the process-global registry for cross-module lookups
         * (e.g. a file stored by telegram_get_file in TelegramBotAiTools).
         */
        async function getBinaryInputBuffer(binaryPropertyName) {
            const reg = global._n8nBinaryRegistry;
            if (reg && reg.has(binaryPropertyName)) {
                return reg.get(binaryPropertyName).buffer;
            }
            return self.helpers.getBinaryDataBuffer(0, binaryPropertyName);
        }

        /**
         * Get the binary metadata (fileName, mimeType) for a binary property.
         * Falls back to the process-global registry for cross-module lookups.
         */
        function getBinaryMeta(binaryPropertyName) {
            const reg = global._n8nBinaryRegistry;
            if (reg && reg.has(binaryPropertyName)) {
                return reg.get(binaryPropertyName).binaryData;
            }
            const items = self.getInputData();
            const item = items && items[0];
            if (item && item.binary && item.binary[binaryPropertyName]) {
                return item.binary[binaryPropertyName];
            }
            return null;
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
                    'Stores the resulting PDF in a binary property and returns its name. Pass the returned binaryPropertyName to other tools that need this file. ' +
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
                        const resultStr = await storeBinaryOutput(self, responseBuffer, filename, 'application/pdf');
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
                    'Stores the resulting PDF in a binary property and returns its name. Pass the returned binaryPropertyName to other tools that need this file. ' +
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
                        const resultStr = await storeBinaryOutput(self, responseBuffer, filename, 'application/pdf');
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
                    'Stores the resulting image in a binary property and returns its name. Pass the returned binaryPropertyName to other tools that need this file. ' +
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
                        const resultStr = await storeBinaryOutput(self, responseBuffer, filename, `image/${imgFormat}`);
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
                    'The document must be provided via binary_property_name — the name of the binary property where the file was stored by a previous tool (e.g., telegram_get_file). ' +
                    'Stores the resulting PDF in a new binary property and returns its name. ' +
                    'Use this when the user needs to convert office files to PDF format.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the office document (e.g., the binaryPropertyName returned by telegram_get_file or another tool that stored a file)'),
                    filename: strOpt('Original filename including extension (e.g., "report.docx", "data.xlsx"). If omitted, uses the filename from the binary property.'),
                    landscape: boolOpt('Use landscape orientation'),
                    page_ranges: strOpt('Page ranges to export, e.g., "1-3,5"'),
                    pdfa: strOpt('Convert to PDF/A: "PDF/A-1a" | "PDF/A-2b" | "PDF/A-3b"'),
                    output_filename: strOpt('Desired filename for the output PDF (default: output.pdf)'),
                }) : null,
                func: async ({ binary_property_name, filename, landscape, page_ranges, pdfa, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_libreoffice_convert', filename });
                    log('debug', '[Gotenberg] gotenberg_libreoffice_convert called', { filename });
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBinaryInputBuffer(binary_property_name);
                        const meta = getBinaryMeta(binary_property_name);
                        const resolvedFilename = filename || (meta && meta.fileName) || 'document.docx';
                        const formData = {
                            files: {
                                value: buffer,
                                options: { filename: resolvedFilename, contentType: 'application/octet-stream' },
                            },
                        };
                        if (landscape !== undefined) formData.landscape = String(landscape);
                        if (page_ranges) formData.nativePageRanges = page_ranges;
                        if (pdfa) formData.pdfa = pdfa;

                        const responseBuffer = await gotenbergPost(self, '/forms/libreoffice/convert', formData);
                        const outFilename = output_filename || 'output.pdf';
                        const resultStr = await storeBinaryOutput(self, responseBuffer, outFilename, 'application/pdf');
                        const result = JSON.parse(resultStr);
                        log('info', '[Gotenberg] gotenberg_libreoffice_convert succeeded', { filename: resolvedFilename, sizeKb: result.sizeKb });
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
                    'Each PDF must be referenced by its binary property name (binaryPropertyName) returned by a previous tool. ' +
                    'Files are merged in the order provided. ' +
                    'Stores the merged PDF in a new binary property and returns its name.',
                schema: z ? z.object({
                    pdfs: z.array(
                        z.object({
                            binary_property_name: z.string().describe('Name of the binary property containing the PDF file (binaryPropertyName from a previous tool)'),
                            filename: strOpt('Filename for ordering (e.g., "001.pdf"). Files are sorted alphabetically by filename.'),
                        })
                    ).describe('Array of PDF references to merge in order'),
                    output_filename: strOpt('Desired filename for the merged output (default: merged.pdf)'),
                }) : null,
                func: async ({ pdfs, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_merge_pdfs', count: pdfs ? pdfs.length : 0 });
                    log('debug', '[Gotenberg] gotenberg_merge_pdfs called', { count: pdfs ? pdfs.length : 0 });
                    try {
                        if (!pdfs || pdfs.length === 0) return JSON.stringify({ error: 'pdfs array is required and must not be empty' });

                        const fileList = [];
                        for (let idx = 0; idx < pdfs.length; idx++) {
                            const p = pdfs[idx];
                            const buf = await getBinaryInputBuffer(p.binary_property_name);
                            fileList.push({
                                value: buf,
                                options: {
                                    filename: p.filename || `${String(idx + 1).padStart(4, '0')}.pdf`,
                                    contentType: 'application/pdf',
                                },
                            });
                        }

                        const formData = { files: fileList };
                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/merge', formData);
                        const outFilename = output_filename || 'merged.pdf';
                        const resultStr = await storeBinaryOutput(self, responseBuffer, outFilename, 'application/pdf');
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
                    'The PDF must be referenced by its binary property name (binaryPropertyName from a previous tool). ' +
                    'Stores the resulting ZIP archive in a new binary property and returns its name.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the PDF to split (binaryPropertyName from a previous tool)'),
                    split_mode: strOpt('"intervals" (split every N pages) | "pages" (split at specific ranges). Default: intervals'),
                    split_span: strOpt('For intervals: number of pages per chunk (e.g., "1"). For pages: comma-separated ranges (e.g., "1-3,5"). Default: "1"'),
                    output_filename: strOpt('Desired filename for the output (default: split.zip)'),
                }) : null,
                func: async ({ binary_property_name, split_mode, split_span, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_split_pdf', split_mode, split_span });
                    log('debug', '[Gotenberg] gotenberg_split_pdf called', { split_mode, split_span });
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBinaryInputBuffer(binary_property_name);
                        const formData = {
                            files: { value: buffer, options: { filename: 'document.pdf', contentType: 'application/pdf' } },
                            splitMode: split_mode || 'intervals',
                            splitSpan: String(split_span || '1'),
                        };

                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/split', formData);
                        const outFilename = output_filename || 'split.zip';
                        const resultStr = await storeBinaryOutput(self, responseBuffer, outFilename, 'application/zip');
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
                    'The PDF must be referenced by its binary property name (binaryPropertyName from a previous tool). ' +
                    'Stores the flattened PDF in a new binary property and returns its name.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the PDF to flatten (binaryPropertyName from a previous tool)'),
                    output_filename: strOpt('Desired filename for the output (default: flattened.pdf)'),
                }) : null,
                func: async ({ binary_property_name, output_filename } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_flatten_pdf' });
                    log('debug', '[Gotenberg] gotenberg_flatten_pdf called');
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBinaryInputBuffer(binary_property_name);
                        const formData = {
                            files: { value: buffer, options: { filename: 'document.pdf', contentType: 'application/pdf' } },
                        };

                        const responseBuffer = await gotenbergPost(self, '/forms/pdfengines/flatten', formData);
                        const outFilename = output_filename || 'flattened.pdf';
                        const resultStr = await storeBinaryOutput(self, responseBuffer, outFilename, 'application/pdf');
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
                    'The PDF must be referenced by its binary property name (binaryPropertyName from a previous tool). ' +
                    'Returns a JSON object with metadata properties such as Author, Title, Subject, Keywords, Creator, Producer, CreationDate, ModDate, and more.',
                schema: z ? z.object({
                    binary_property_name: z.string().describe('Name of the binary property containing the PDF to read metadata from (binaryPropertyName from a previous tool)'),
                }) : null,
                func: async ({ binary_property_name } = {}) => {
                    const runIndex = startToolRun({ tool: 'gotenberg_read_pdf_metadata' });
                    log('debug', '[Gotenberg] gotenberg_read_pdf_metadata called');
                    try {
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });

                        const buffer = await getBinaryInputBuffer(binary_property_name);
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
