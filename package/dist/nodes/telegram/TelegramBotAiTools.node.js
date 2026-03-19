"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBotAiTools = void 0;

/**
 * Load zod for schema definitions (available in n8n's runtime environment).
 */
let z = null;
try { z = require('zod'); } catch (_) { /* no zod */ }

/**
 * Load DynamicStructuredTool from LangChain (available in n8n's runtime environment).
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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function telegramApiPost(ctx, method, body) {
    const credentials = await ctx.getCredentials('telegramBotApi');
    const baseUrl = (credentials.baseUrl || 'https://api.telegram.org').replace(/\/$/, '');
    const token = credentials.botToken;
    const options = {
        method: 'POST',
        url: `${baseUrl}/bot${token}/${method}`,
        body,
    };
    return ctx.helpers.httpRequest(options);
}

async function telegramApiMultipart(ctx, method, formData) {
    const credentials = await ctx.getCredentials('telegramBotApi');
    const baseUrl = (credentials.baseUrl || 'https://api.telegram.org').replace(/\/$/, '');
    const token = credentials.botToken;
    const options = {
        method: 'POST',
        url: `${baseUrl}/bot${token}/${method}`,
        formData,
    };
    return ctx.helpers.httpRequest(options);
}

async function downloadTelegramFile(ctx, filePath) {
    const credentials = await ctx.getCredentials('telegramBotApi');
    const baseUrl = (credentials.baseUrl || 'https://api.telegram.org').replace(/\/$/, '');
    const token = credentials.botToken;
    const options = {
        method: 'GET',
        url: `${baseUrl}/file/bot${token}/${filePath}`,
        encoding: 'arraybuffer',
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
 * AI tool modules (e.g. GotenbergAiTools) in the same n8n execution context.
 */
// Process-global registry shared across all AI tool modules.
if (!global._n8nBinaryRegistry) {
    global._n8nBinaryRegistry = new Map();
}
let _binaryCounter = 0;
async function storeBinaryOutput(ctx, buf, filename, mimeType) {
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const sizeKb = Math.round(buffer.length / 1024);
    const binaryPropertyName = `telegram_file_${_binaryCounter++}`;
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

function guessMimeType(filePath) {
    const ext = (filePath || '').split('.').pop().toLowerCase();
    const map = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
        pdf: 'application/pdf', doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip', mp3: 'audio/mpeg', mp4: 'video/mp4',
        ogg: 'audio/ogg', wav: 'audio/wav', webm: 'video/webm',
        txt: 'text/plain', csv: 'text/csv', json: 'application/json',
    };
    return map[ext] || 'application/octet-stream';
}


// ── Node Class ──────────────────────────────────────────────────────────────

class TelegramBotAiTools {
    constructor() {
        this.description = {
            displayName: 'Telegram Bot AI Tools',
            name: 'telegramBotAiTools',
            icon: 'file:telegram.svg',
            group: ['transform'],
            version: 1,
            description: 'Provides Telegram Bot API tools (send messages, photos, documents, get files…) to an AI Agent node',
            defaults: { name: 'Telegram Bot AI Tools' },
            inputs: [],
            outputs: ['ai_tool'],
            outputNames: ['Tool'],
            credentials: [{ name: 'telegramBotApi', required: true }],
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Tools', 'Agents & LLMs'],
                },
                resources: {
                    primaryDocumentation: [{ url: 'https://core.telegram.org/bots/api' }],
                },
            },
            properties: [
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        { name: 'Send Message', value: 'sendMessage', description: 'Send a text message to a chat' },
                        { name: 'Send Photo', value: 'sendPhoto', description: 'Send a photo to a chat' },
                        { name: 'Send Document', value: 'sendDocument', description: 'Send a document/file to a chat (accepts binary property reference from other tools)' },
                        { name: 'Send Video', value: 'sendVideo', description: 'Send a video to a chat' },
                        { name: 'Send Audio', value: 'sendAudio', description: 'Send an audio file to a chat' },
                        { name: 'Send Voice', value: 'sendVoice', description: 'Send a voice message to a chat' },
                        { name: 'Send Location', value: 'sendLocation', description: 'Send a location to a chat' },
                        { name: 'Send Contact', value: 'sendContact', description: 'Send a contact to a chat' },
                        { name: 'Send Poll', value: 'sendPoll', description: 'Send a poll to a chat' },
                        { name: 'Forward Message', value: 'forwardMessage', description: 'Forward a message from one chat to another' },
                        { name: 'Edit Message', value: 'editMessage', description: 'Edit an existing text message' },
                        { name: 'Delete Message', value: 'deleteMessage', description: 'Delete a message from a chat' },
                        { name: 'Get File', value: 'getFile', description: 'Download a file from Telegram by file_id (stores in binary property)' },
                        { name: 'Send Chat Action', value: 'sendChatAction', description: 'Show typing or upload status in a chat' },
                        { name: 'Get Chat', value: 'getChat', description: 'Get information about a chat' },
                        { name: 'Send Sticker', value: 'sendSticker', description: 'Send a sticker to a chat' },
                        { name: 'Send Media Group', value: 'sendMediaGroup', description: 'Send a group of photos/documents as an album' },
                        { name: 'Answer Inline Query', value: 'answerInlineQuery', description: 'Answer an inline query from a user' },
                        { name: 'Pin Message', value: 'pinMessage', description: 'Pin a message in a chat' },
                        { name: 'Unpin Message', value: 'unpinMessage', description: 'Unpin a message in a chat' },
                        { name: 'Send Invoice', value: 'sendInvoice', description: 'Send an invoice for payments' },
                        { name: 'Get Me', value: 'getMe', description: 'Get bot information' },
                        { name: 'Set Webhook', value: 'setWebhook', description: 'Set the webhook URL for the bot' },
                        { name: 'Delete Webhook', value: 'deleteWebhook', description: 'Delete the webhook for the bot' },
                    ],
                    default: ['sendMessage', 'sendPhoto', 'sendDocument', 'getFile', 'forwardMessage', 'sendChatAction', 'editMessage', 'deleteMessage'],
                    description: 'Which Telegram Bot tools to expose to the AI Agent',
                },
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

    async supplyData(itemIndex) {
        const self = this;
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, ['sendMessage', 'sendPhoto', 'sendDocument', 'getFile', 'forwardMessage', 'sendChatAction', 'editMessage', 'deleteMessage']);
        const toolDescriptionOverride = this.getNodeParameter('toolDescription', itemIndex, '');

        function log(level, message, meta) {
            try {
                if (self.logger && typeof self.logger[level] === 'function') {
                    self.logger[level](message, meta);
                }
            } catch (_) { /* ignore */ }
        }

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

        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function boolOpt(desc) { return z ? z.boolean().optional().describe(desc) : undefined; }
        function numOpt(desc) { return z ? z.number().optional().describe(desc) : undefined; }

        /**
         * Retrieve a binary buffer from n8n's binary data system by property name.
         * Falls back to the process-global registry so files stored by other tool
         * modules (e.g. GotenbergAiTools) are accessible here too.
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

        const tools = [];

        // ── Tool: telegram_send_message ────────────────────────────────────
        if (enabledTools.includes('sendMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_message',
                description: toolDescriptionOverride ||
                    'Send a text message to a Telegram chat. Supports HTML, MarkdownV2, and Markdown formatting. ' +
                    'Returns the sent message object from Telegram API. ' +
                    'Use this when the user asks to send a text message, notification, or alert to a Telegram chat or user.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the message to'),
                    text: z.string().describe('The message text to send'),
                    parse_mode: strOpt('Formatting mode: "HTML" | "MarkdownV2" | "Markdown"'),
                    disable_notification: boolOpt('Send silently without notification sound (default: false)'),
                    reply_to_message_id: numOpt('Message ID to reply to'),
                    reply_markup: strOpt('JSON string of inline keyboard or reply markup'),
                }) : null,
                func: async ({ chat_id, text, parse_mode, disable_notification, reply_to_message_id, reply_markup } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_message', chat_id });
                    log('debug', '[Telegram] telegram_send_message called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!text) return JSON.stringify({ error: 'text is required' });
                        const body = { chat_id, text };
                        if (parse_mode) body.parse_mode = parse_mode;
                        if (disable_notification !== undefined) body.disable_notification = disable_notification;
                        if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;
                        if (reply_markup) {
                            try { body.reply_markup = JSON.parse(reply_markup); } catch (_) { body.reply_markup = reply_markup; }
                        }
                        const result = await telegramApiPost(self, 'sendMessage', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true, message_id: result && result.result && result.result.message_id });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_photo ─────────────────────────────────────
        if (enabledTools.includes('sendPhoto')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_photo',
                description: toolDescriptionOverride ||
                    'Send a photo to a Telegram chat. Accepts a file_id, a public HTTP URL, or a binary_property_name referencing a file stored by a previous tool (e.g., gotenberg_url_screenshot). ' +
                    'When binary_property_name is provided, the image is uploaded from the binary data system. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the photo to'),
                    photo: z.string().describe('Photo to send: a Telegram file_id, a public HTTP URL, or a binary_property_name from a previous tool that stored an image'),
                    caption: strOpt('Photo caption (0-1024 characters)'),
                    parse_mode: strOpt('Caption formatting: "HTML" | "MarkdownV2" | "Markdown"'),
                }) : null,
                func: async ({ chat_id, photo, caption, parse_mode } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_photo', chat_id });
                    log('debug', '[Telegram] telegram_send_photo called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!photo) return JSON.stringify({ error: 'photo is required' });
                        let result;
                        // Check if it's a binary property name
                        const meta = getBinaryMeta(photo);
                        if (meta) {
                            const buf = await getBinaryInputBuffer(photo);
                            const fname = meta.fileName || 'photo.jpg';
                            const formData = {
                                chat_id,
                                photo: { value: buf, options: { filename: fname, contentType: meta.mimeType || 'image/jpeg' } },
                            };
                            if (caption) formData.caption = caption;
                            if (parse_mode) formData.parse_mode = parse_mode;
                            result = await telegramApiMultipart(self, 'sendPhoto', formData);
                        } else {
                            const body = { chat_id, photo };
                            if (caption) body.caption = caption;
                            if (parse_mode) body.parse_mode = parse_mode;
                            result = await telegramApiPost(self, 'sendPhoto', body);
                        }
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_photo failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_document ──────────────────────────────────
        if (enabledTools.includes('sendDocument')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_document',
                description: toolDescriptionOverride ||
                    'Send a document/file to a Telegram chat. Accepts a binary_property_name referencing a file stored by a previous tool. ' +
                    'Compatible with output from gotenberg_url_to_pdf, gotenberg_html_to_pdf, gotenberg_libreoffice_convert, ' +
                    'gotenberg_merge_pdfs, telegram_get_file, and any other tool that stores files in binary properties. ' +
                    'Pass the binaryPropertyName from those tools directly as binary_property_name. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the document to'),
                    binary_property_name: z.string().describe('Name of the binary property containing the file to send (binaryPropertyName from a previous tool)'),
                    caption: strOpt('Document caption (0-1024 characters)'),
                    parse_mode: strOpt('Caption formatting: "HTML" | "MarkdownV2" | "Markdown"'),
                }) : null,
                func: async ({ chat_id, binary_property_name, caption, parse_mode } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_document', chat_id, binary_property_name });
                    log('debug', '[Telegram] telegram_send_document called', { chat_id, binary_property_name });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!binary_property_name) return JSON.stringify({ error: 'binary_property_name is required' });
                        const buf = await getBinaryInputBuffer(binary_property_name);
                        const meta = getBinaryMeta(binary_property_name);
                        const filename = (meta && meta.fileName) || 'file';
                        const contentType = (meta && meta.mimeType) || 'application/octet-stream';
                        const formData = {
                            chat_id,
                            document: { value: buf, options: { filename, contentType } },
                        };
                        if (caption) formData.caption = caption;
                        if (parse_mode) formData.parse_mode = parse_mode;
                        const result = await telegramApiMultipart(self, 'sendDocument', formData);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true, filename });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_document failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_video ─────────────────────────────────────
        if (enabledTools.includes('sendVideo')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_video',
                description: toolDescriptionOverride ||
                    'Send a video to a Telegram chat. Accepts a file_id, a public HTTP URL, or a binary_property_name referencing a video stored by a previous tool. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the video to'),
                    video: z.string().describe('Video to send: a Telegram file_id, a public HTTP URL, or a binary_property_name from a previous tool that stored a video'),
                    caption: strOpt('Video caption (0-1024 characters)'),
                }) : null,
                func: async ({ chat_id, video, caption } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_video', chat_id });
                    log('debug', '[Telegram] telegram_send_video called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!video) return JSON.stringify({ error: 'video is required' });
                        let result;
                        const meta = getBinaryMeta(video);
                        if (meta) {
                            const buf = await getBinaryInputBuffer(video);
                            const fname = meta.fileName || 'video.mp4';
                            const formData = {
                                chat_id,
                                video: { value: buf, options: { filename: fname, contentType: meta.mimeType || 'video/mp4' } },
                            };
                            if (caption) formData.caption = caption;
                            result = await telegramApiMultipart(self, 'sendVideo', formData);
                        } else {
                            const body = { chat_id, video };
                            if (caption) body.caption = caption;
                            result = await telegramApiPost(self, 'sendVideo', body);
                        }
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_video failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_audio ─────────────────────────────────────
        if (enabledTools.includes('sendAudio')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_audio',
                description: toolDescriptionOverride ||
                    'Send an audio file to a Telegram chat. Accepts a file_id, a public HTTP URL, or a binary_property_name referencing an audio file stored by a previous tool. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the audio to'),
                    audio: z.string().describe('Audio to send: a Telegram file_id, a public HTTP URL, or a binary_property_name from a previous tool that stored an audio file'),
                    caption: strOpt('Audio caption (0-1024 characters)'),
                }) : null,
                func: async ({ chat_id, audio, caption } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_audio', chat_id });
                    log('debug', '[Telegram] telegram_send_audio called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!audio) return JSON.stringify({ error: 'audio is required' });
                        let result;
                        const meta = getBinaryMeta(audio);
                        if (meta) {
                            const buf = await getBinaryInputBuffer(audio);
                            const fname = meta.fileName || 'audio.mp3';
                            const formData = {
                                chat_id,
                                audio: { value: buf, options: { filename: fname, contentType: meta.mimeType || 'audio/mpeg' } },
                            };
                            if (caption) formData.caption = caption;
                            result = await telegramApiMultipart(self, 'sendAudio', formData);
                        } else {
                            const body = { chat_id, audio };
                            if (caption) body.caption = caption;
                            result = await telegramApiPost(self, 'sendAudio', body);
                        }
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_audio failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_voice ─────────────────────────────────────
        if (enabledTools.includes('sendVoice')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_voice',
                description: toolDescriptionOverride ||
                    'Send a voice message to a Telegram chat. Accepts a file_id, a public HTTP URL, or a binary_property_name referencing an OGG audio file stored by a previous tool. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the voice message to'),
                    voice: z.string().describe('Voice to send: a Telegram file_id, a public HTTP URL, or a binary_property_name from a previous tool that stored an OGG audio file'),
                    caption: strOpt('Voice message caption (0-1024 characters)'),
                }) : null,
                func: async ({ chat_id, voice, caption } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_voice', chat_id });
                    log('debug', '[Telegram] telegram_send_voice called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!voice) return JSON.stringify({ error: 'voice is required' });
                        let result;
                        const meta = getBinaryMeta(voice);
                        if (meta) {
                            const buf = await getBinaryInputBuffer(voice);
                            const formData = {
                                chat_id,
                                voice: { value: buf, options: { filename: meta.fileName || 'voice.ogg', contentType: meta.mimeType || 'audio/ogg' } },
                            };
                            if (caption) formData.caption = caption;
                            result = await telegramApiMultipart(self, 'sendVoice', formData);
                        } else {
                            const body = { chat_id, voice };
                            if (caption) body.caption = caption;
                            result = await telegramApiPost(self, 'sendVoice', body);
                        }
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_voice failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_location ──────────────────────────────────
        if (enabledTools.includes('sendLocation')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_location',
                description: toolDescriptionOverride ||
                    'Send a location (latitude/longitude) to a Telegram chat. Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the location to'),
                    latitude: z.number().describe('Latitude of the location'),
                    longitude: z.number().describe('Longitude of the location'),
                }) : null,
                func: async ({ chat_id, latitude, longitude } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_location', chat_id });
                    log('debug', '[Telegram] telegram_send_location called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (latitude === undefined) return JSON.stringify({ error: 'latitude is required' });
                        if (longitude === undefined) return JSON.stringify({ error: 'longitude is required' });
                        const body = { chat_id, latitude, longitude };
                        const result = await telegramApiPost(self, 'sendLocation', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_location failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_contact ───────────────────────────────────
        if (enabledTools.includes('sendContact')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_contact',
                description: toolDescriptionOverride ||
                    'Send a phone contact to a Telegram chat. Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the contact to'),
                    phone_number: z.string().describe('Contact phone number'),
                    first_name: z.string().describe('Contact first name'),
                    last_name: strOpt('Contact last name'),
                }) : null,
                func: async ({ chat_id, phone_number, first_name, last_name } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_contact', chat_id });
                    log('debug', '[Telegram] telegram_send_contact called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!phone_number) return JSON.stringify({ error: 'phone_number is required' });
                        if (!first_name) return JSON.stringify({ error: 'first_name is required' });
                        const body = { chat_id, phone_number, first_name };
                        if (last_name) body.last_name = last_name;
                        const result = await telegramApiPost(self, 'sendContact', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_contact failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_poll ──────────────────────────────────────
        if (enabledTools.includes('sendPoll')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_poll',
                description: toolDescriptionOverride ||
                    'Send a poll to a Telegram chat. The options parameter must be a JSON array of strings. Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the poll to'),
                    question: z.string().describe('Poll question (1-300 characters)'),
                    options: z.string().describe('JSON array of answer options, e.g. \'["Option A","Option B","Option C"]\' (2-10 options)'),
                    is_anonymous: boolOpt('Whether the poll is anonymous (default: true)'),
                    type: strOpt('Poll type: "regular" | "quiz" (default: "regular")'),
                }) : null,
                func: async ({ chat_id, question, options, is_anonymous, type } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_poll', chat_id });
                    log('debug', '[Telegram] telegram_send_poll called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!question) return JSON.stringify({ error: 'question is required' });
                        if (!options) return JSON.stringify({ error: 'options is required' });
                        let parsedOptions;
                        try { parsedOptions = JSON.parse(options); } catch (_) {
                            return JSON.stringify({ error: 'options must be a valid JSON array of strings' });
                        }
                        const body = { chat_id, question, options: parsedOptions };
                        if (is_anonymous !== undefined) body.is_anonymous = is_anonymous;
                        if (type) body.type = type;
                        const result = await telegramApiPost(self, 'sendPoll', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_poll failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_forward_message ────────────────────────────────
        if (enabledTools.includes('forwardMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_forward_message',
                description: toolDescriptionOverride ||
                    'Forward an existing message from one Telegram chat to another. Returns the forwarded message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('Target chat ID or @username to forward the message to'),
                    from_chat_id: z.string().describe('Source chat ID or @username where the original message is'),
                    message_id: z.number().describe('Message ID to forward'),
                }) : null,
                func: async ({ chat_id, from_chat_id, message_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_forward_message', chat_id });
                    log('debug', '[Telegram] telegram_forward_message called', { chat_id, from_chat_id, message_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!from_chat_id) return JSON.stringify({ error: 'from_chat_id is required' });
                        if (!message_id) return JSON.stringify({ error: 'message_id is required' });
                        const body = { chat_id, from_chat_id, message_id };
                        const result = await telegramApiPost(self, 'forwardMessage', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_forward_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_edit_message ───────────────────────────────────
        if (enabledTools.includes('editMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_edit_message',
                description: toolDescriptionOverride ||
                    'Edit the text of an existing message in a Telegram chat. Returns the edited message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username of the chat containing the message'),
                    message_id: z.number().describe('ID of the message to edit'),
                    text: z.string().describe('New text for the message'),
                    parse_mode: strOpt('Formatting mode: "HTML" | "MarkdownV2" | "Markdown"'),
                }) : null,
                func: async ({ chat_id, message_id, text, parse_mode } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_edit_message', chat_id, message_id });
                    log('debug', '[Telegram] telegram_edit_message called', { chat_id, message_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!message_id) return JSON.stringify({ error: 'message_id is required' });
                        if (!text) return JSON.stringify({ error: 'text is required' });
                        const body = { chat_id, message_id, text };
                        if (parse_mode) body.parse_mode = parse_mode;
                        const result = await telegramApiPost(self, 'editMessageText', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_edit_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_delete_message ─────────────────────────────────
        if (enabledTools.includes('deleteMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_delete_message',
                description: toolDescriptionOverride ||
                    'Delete a message from a Telegram chat. Returns success status.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username of the chat containing the message'),
                    message_id: z.number().describe('ID of the message to delete'),
                }) : null,
                func: async ({ chat_id, message_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_delete_message', chat_id, message_id });
                    log('debug', '[Telegram] telegram_delete_message called', { chat_id, message_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!message_id) return JSON.stringify({ error: 'message_id is required' });
                        const body = { chat_id, message_id };
                        const result = await telegramApiPost(self, 'deleteMessage', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_delete_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_get_file ───────────────────────────────────────
        if (enabledTools.includes('getFile')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_get_file',
                description: toolDescriptionOverride ||
                    'Download a file from Telegram servers by file_id. Stores the file in a binary property and returns its name. ' +
                    'The returned binaryPropertyName can be passed directly to gotenberg_libreoffice_convert, gotenberg_merge_pdfs, ' +
                    'telegram_send_document, or any other tool that accepts a binary_property_name for document conversion or forwarding.',
                schema: z ? z.object({
                    file_id: z.string().describe('The file_id obtained from a Telegram message (e.g., from a document, photo, audio, video message)'),
                }) : null,
                func: async ({ file_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_get_file', file_id });
                    log('debug', '[Telegram] telegram_get_file called', { file_id });
                    try {
                        if (!file_id) return JSON.stringify({ error: 'file_id is required' });
                        const fileInfo = await telegramApiPost(self, 'getFile', { file_id });
                        const filePath = fileInfo && fileInfo.result && fileInfo.result.file_path;
                        if (!filePath) return JSON.stringify({ error: 'Could not get file path from Telegram' });
                        const fileBuffer = await downloadTelegramFile(self, filePath);
                        const filename = filePath.split('/').pop() || 'file';
                        const mimeType = guessMimeType(filename);
                        const resultStr = await storeBinaryOutput(self, fileBuffer, filename, mimeType);
                        const result = JSON.parse(resultStr);
                        log('info', '[Telegram] telegram_get_file succeeded', { file_id, filename, sizeKb: result.sizeKb });
                        endToolRun(runIndex, { success: true, filename, binaryPropertyName: result.binaryPropertyName, sizeKb: result.sizeKb });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_get_file failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_chat_action ───────────────────────────────
        if (enabledTools.includes('sendChatAction')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_chat_action',
                description: toolDescriptionOverride ||
                    'Send a chat action (typing indicator, upload status, etc.) to a Telegram chat. ' +
                    'Use this before sending a message to show the bot is working. Returns success status.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the action to'),
                    action: z.string().describe('Action type: "typing" | "upload_photo" | "upload_document" | "upload_video" | "record_voice" | "record_video" | "find_location" | "upload_voice" | "upload_video_note"'),
                }) : null,
                func: async ({ chat_id, action } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_chat_action', chat_id, action });
                    log('debug', '[Telegram] telegram_send_chat_action called', { chat_id, action });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!action) return JSON.stringify({ error: 'action is required' });
                        const body = { chat_id, action };
                        const result = await telegramApiPost(self, 'sendChatAction', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_chat_action failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_get_chat ───────────────────────────────────────
        if (enabledTools.includes('getChat')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_get_chat',
                description: toolDescriptionOverride ||
                    'Get information about a Telegram chat (title, type, member count, description, etc.). Returns the chat object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to get info about'),
                }) : null,
                func: async ({ chat_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_get_chat', chat_id });
                    log('debug', '[Telegram] telegram_get_chat called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        const result = await telegramApiPost(self, 'getChat', { chat_id });
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_get_chat failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_sticker ───────────────────────────────────
        if (enabledTools.includes('sendSticker')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_sticker',
                description: toolDescriptionOverride ||
                    'Send a sticker to a Telegram chat. Accepts a file_id or a public HTTP URL to a .webp sticker. Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the sticker to'),
                    sticker: z.string().describe('Sticker to send: a file_id or a public HTTP URL to a .webp sticker file'),
                }) : null,
                func: async ({ chat_id, sticker } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_sticker', chat_id });
                    log('debug', '[Telegram] telegram_send_sticker called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!sticker) return JSON.stringify({ error: 'sticker is required' });
                        const body = { chat_id, sticker };
                        const result = await telegramApiPost(self, 'sendSticker', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_sticker failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_media_group ───────────────────────────────
        if (enabledTools.includes('sendMediaGroup')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_media_group',
                description: toolDescriptionOverride ||
                    'Send a group of photos or documents as an album to a Telegram chat. ' +
                    'The media parameter must be a JSON array of media objects. Each object should have: ' +
                    '"type" ("photo" or "document"), and one of "url", "file_id", or "binary_property_name" for the media content. ' +
                    'When using binary_property_name, the file is read from the n8n binary data system. ' +
                    'Compatible with binary output from other tools. Returns the sent messages array.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username to send the media group to'),
                    media: z.string().describe('JSON array of media objects, e.g. [{"type":"photo","url":"https://...","caption":"My photo"},{"type":"document","binary_property_name":"gotenberg_file_0"}]'),
                }) : null,
                func: async ({ chat_id, media } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_media_group', chat_id });
                    log('debug', '[Telegram] telegram_send_media_group called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!media) return JSON.stringify({ error: 'media is required' });
                        let parsedMedia;
                        try { parsedMedia = JSON.parse(media); } catch (_) {
                            return JSON.stringify({ error: 'media must be a valid JSON array' });
                        }
                        const formData = { chat_id };
                        const mediaArr = [];
                        for (let i = 0; i < parsedMedia.length; i++) {
                            const item = parsedMedia[i];
                            const mediaObj = { type: item.type || 'photo' };
                            if (item.caption) mediaObj.caption = item.caption;
                            if (item.binary_property_name) {
                                const attachName = `file_${i}`;
                                const buf = await getBinaryInputBuffer(item.binary_property_name);
                                const meta = getBinaryMeta(item.binary_property_name);
                                const fname = (meta && meta.fileName) || (item.type === 'document' ? `file_${i}.pdf` : `photo_${i}.jpg`);
                                const ct = (meta && meta.mimeType) || (item.type === 'document' ? 'application/octet-stream' : 'image/jpeg');
                                formData[attachName] = { value: buf, options: { filename: fname, contentType: ct } };
                                mediaObj.media = `attach://${attachName}`;
                            } else if (item.url) {
                                mediaObj.media = item.url;
                            } else if (item.file_id) {
                                mediaObj.media = item.file_id;
                            }
                            mediaArr.push(mediaObj);
                        }
                        formData.media = JSON.stringify(mediaArr);
                        const result = await telegramApiMultipart(self, 'sendMediaGroup', formData);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true, count: parsedMedia.length });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_media_group failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_answer_inline_query ────────────────────────────
        if (enabledTools.includes('answerInlineQuery')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_answer_inline_query',
                description: toolDescriptionOverride ||
                    'Answer an inline query from a Telegram user. The results parameter must be a JSON array of InlineQueryResult objects. ' +
                    'Returns success status.',
                schema: z ? z.object({
                    inline_query_id: z.string().describe('The unique identifier for the inline query to answer'),
                    results: z.string().describe('JSON array of InlineQueryResult objects (see Telegram Bot API docs)'),
                }) : null,
                func: async ({ inline_query_id, results } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_answer_inline_query' });
                    log('debug', '[Telegram] telegram_answer_inline_query called');
                    try {
                        if (!inline_query_id) return JSON.stringify({ error: 'inline_query_id is required' });
                        if (!results) return JSON.stringify({ error: 'results is required' });
                        let parsedResults;
                        try { parsedResults = JSON.parse(results); } catch (_) {
                            return JSON.stringify({ error: 'results must be a valid JSON array' });
                        }
                        const body = { inline_query_id, results: parsedResults };
                        const result = await telegramApiPost(self, 'answerInlineQuery', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_answer_inline_query failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_pin_message ────────────────────────────────────
        if (enabledTools.includes('pinMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_pin_message',
                description: toolDescriptionOverride ||
                    'Pin a message in a Telegram chat. The bot must have appropriate admin rights. Returns success status.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username of the chat'),
                    message_id: z.number().describe('ID of the message to pin'),
                }) : null,
                func: async ({ chat_id, message_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_pin_message', chat_id, message_id });
                    log('debug', '[Telegram] telegram_pin_message called', { chat_id, message_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!message_id) return JSON.stringify({ error: 'message_id is required' });
                        const body = { chat_id, message_id };
                        const result = await telegramApiPost(self, 'pinChatMessage', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_pin_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_unpin_message ──────────────────────────────────
        if (enabledTools.includes('unpinMessage')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_unpin_message',
                description: toolDescriptionOverride ||
                    'Unpin a message in a Telegram chat. If message_id is omitted, all pinned messages are unpinned. Returns success status.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID or @username of the chat'),
                    message_id: numOpt('ID of the message to unpin. If omitted, all pinned messages are unpinned'),
                }) : null,
                func: async ({ chat_id, message_id } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_unpin_message', chat_id });
                    log('debug', '[Telegram] telegram_unpin_message called', { chat_id, message_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (message_id) {
                            const body = { chat_id, message_id };
                            const result = await telegramApiPost(self, 'unpinChatMessage', body);
                            const resultStr = JSON.stringify({ success: true, result });
                            endToolRun(runIndex, { success: true });
                            return resultStr;
                        } else {
                            const result = await telegramApiPost(self, 'unpinAllChatMessages', { chat_id });
                            const resultStr = JSON.stringify({ success: true, result });
                            endToolRun(runIndex, { success: true });
                            return resultStr;
                        }
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_unpin_message failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_send_invoice ───────────────────────────────────
        if (enabledTools.includes('sendInvoice')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_send_invoice',
                description: toolDescriptionOverride ||
                    'Send an invoice for payments via Telegram. Requires a payment provider token. ' +
                    'The prices parameter must be a JSON array of {label, amount} objects where amount is in the smallest currency unit. ' +
                    'Returns the sent message object.',
                schema: z ? z.object({
                    chat_id: z.string().describe('The chat ID to send the invoice to'),
                    title: z.string().describe('Product name (1-32 characters)'),
                    description: z.string().describe('Product description (1-255 characters)'),
                    payload: z.string().describe('Bot-defined invoice payload (1-128 bytes, not shown to user)'),
                    provider_token: z.string().describe('Payment provider token (from @BotFather)'),
                    currency: z.string().describe('Three-letter ISO 4217 currency code (e.g., "USD", "EUR")'),
                    prices: z.string().describe('JSON array of price portions, e.g. [{"label":"Product","amount":1000}] (amount in smallest currency unit, e.g. cents)'),
                }) : null,
                func: async ({ chat_id, title, description, payload, provider_token, currency, prices } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_send_invoice', chat_id });
                    log('debug', '[Telegram] telegram_send_invoice called', { chat_id });
                    try {
                        if (!chat_id) return JSON.stringify({ error: 'chat_id is required' });
                        if (!title) return JSON.stringify({ error: 'title is required' });
                        if (!description) return JSON.stringify({ error: 'description is required' });
                        if (!payload) return JSON.stringify({ error: 'payload is required' });
                        if (!provider_token) return JSON.stringify({ error: 'provider_token is required' });
                        if (!currency) return JSON.stringify({ error: 'currency is required' });
                        if (!prices) return JSON.stringify({ error: 'prices is required' });
                        let parsedPrices;
                        try { parsedPrices = JSON.parse(prices); } catch (_) {
                            return JSON.stringify({ error: 'prices must be a valid JSON array' });
                        }
                        const body = { chat_id, title, description, payload, provider_token, currency, prices: parsedPrices };
                        const result = await telegramApiPost(self, 'sendInvoice', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_send_invoice failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_get_me ─────────────────────────────────────────
        if (enabledTools.includes('getMe')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_get_me',
                description: toolDescriptionOverride ||
                    'Get basic information about the Telegram bot (id, name, username, capabilities). No parameters required. Returns the bot User object.',
                schema: z ? z.object({}) : null,
                func: async () => {
                    const runIndex = startToolRun({ tool: 'telegram_get_me' });
                    log('debug', '[Telegram] telegram_get_me called');
                    try {
                        const result = await telegramApiPost(self, 'getMe', {});
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_get_me failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_set_webhook ────────────────────────────────────
        if (enabledTools.includes('setWebhook')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_set_webhook',
                description: toolDescriptionOverride ||
                    'Set the webhook URL for the Telegram bot. Telegram will send updates to this URL. Returns success status.',
                schema: z ? z.object({
                    url: z.string().describe('HTTPS URL to send updates to (use empty string to remove webhook)'),
                }) : null,
                func: async ({ url } = {}) => {
                    const runIndex = startToolRun({ tool: 'telegram_set_webhook' });
                    log('debug', '[Telegram] telegram_set_webhook called', { url });
                    try {
                        if (url === undefined) return JSON.stringify({ error: 'url is required' });
                        const body = { url };
                        const result = await telegramApiPost(self, 'setWebhook', body);
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_set_webhook failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        // ── Tool: telegram_delete_webhook ─────────────────────────────────
        if (enabledTools.includes('deleteWebhook')) {
            tools.push(new DynamicStructuredTool({
                name: 'telegram_delete_webhook',
                description: toolDescriptionOverride ||
                    'Delete the webhook for the Telegram bot, switching back to getUpdates mode. Returns success status.',
                schema: z ? z.object({}) : null,
                func: async () => {
                    const runIndex = startToolRun({ tool: 'telegram_delete_webhook' });
                    log('debug', '[Telegram] telegram_delete_webhook called');
                    try {
                        const result = await telegramApiPost(self, 'deleteWebhook', {});
                        const resultStr = JSON.stringify({ success: true, result });
                        endToolRun(runIndex, { success: true });
                        return resultStr;
                    } catch (err) {
                        const errObj = { error: err.message || String(err) };
                        log('error', '[Telegram] telegram_delete_webhook failed', errObj);
                        endToolRun(runIndex, errObj);
                        return JSON.stringify(errObj);
                    }
                },
            }));
        }

        return { response: tools };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            returnData.push({
                json: {
                    message: 'Telegram Bot AI Tools node is designed to be connected to an AI Agent node. Connect the "Tool" output to an AI Agent node\'s "Tools" input.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                    documentation: 'https://core.telegram.org/bots/api',
                },
            });
        }
        return [returnData];
    }
}
exports.TelegramBotAiTools = TelegramBotAiTools;
