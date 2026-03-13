"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0Memory = void 0;
const GenericFunctions_1 = require("./GenericFunctions");

/**
 * Load HumanMessage / AIMessage / SystemMessage from LangChain.
 * Falls back to minimal shims so the node works even if @langchain/core is
 * not directly resolvable from the community-node install path.
 */
let HumanMessage, AIMessage, SystemMessage;
(function () {
    const candidates = ['@langchain/core/messages', 'langchain/messages'];
    for (const mod of candidates) {
        try {
            const m = require(mod);
            if (m && m.HumanMessage) {
                HumanMessage = m.HumanMessage;
                AIMessage = m.AIMessage;
                SystemMessage = m.SystemMessage || m.HumanMessage;
                return;
            }
        } catch (_) { /* continue */ }
    }
    // Minimal shim — satisfies type checks n8n's AI Agent performs on messages
    class BaseMsg {
        constructor(content) {
            this.content = content;
            this.lc_namespace = ['langchain_core', 'messages'];
            this.lc_serializable = true;
            this.additional_kwargs = {};
        }
    }
    HumanMessage = class extends BaseMsg { _getType() { return 'human'; } get type() { return 'human'; } };
    AIMessage = class extends BaseMsg { _getType() { return 'ai'; } get type() { return 'ai'; } };
    SystemMessage = class extends BaseMsg { _getType() { return 'system'; } get type() { return 'system'; } };
})();

/**
 * Mem0 Chat Memory node
 *
 * Stores and retrieves chat conversation history using Mem0 as the backend.
 * Works like the Redis Chat Memory node — connect the "ai_memory" output to
 * an AI Agent node's "Memory" input.
 *
 * Each conversation is scoped by a Session Key (maps to user_id in Mem0).
 */
class Mem0Memory {
    constructor() {
        this.description = {
            displayName: 'Mem0 Chat Memory',
            name: 'mem0Memory',
            icon: 'file:mem0.svg',
            group: ['transform'],
            version: 1,
            description: 'Store and retrieve chat conversation history using Mem0 as the backend. Connect the "ai_memory" output to an AI Agent memory input.',
            defaults: {
                name: 'Mem0 Chat Memory',
            },
            inputs: [],
            outputs: ['ai_memory'],
            credentials: [
                {
                    name: 'mem0Api',
                    required: true,
                    displayOptions: {
                        show: { authType: ['cloud'] },
                    },
                },
                {
                    name: 'mem0SelfHostedApi',
                    required: true,
                    displayOptions: {
                        show: { authType: ['selfHosted'] },
                    },
                },
            ],
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Memory'],
                },
                resources: {
                    primaryDocumentation: [
                        { url: 'https://docs.mem0.ai/' },
                    ],
                },
            },
            properties: [
                {
                    displayName: 'Authentication',
                    name: 'authType',
                    type: 'options',
                    options: [
                        { name: 'Cloud (mem0.ai)', value: 'cloud' },
                        { name: 'Self-Hosted', value: 'selfHosted' },
                    ],
                    default: 'cloud',
                },
                {
                    displayName: 'Session ID Type',
                    name: 'sessionIdType',
                    type: 'options',
                    options: [
                        {
                            name: 'Take from Previous Node Automatically',
                            value: 'fromInput',
                            description: 'Reads sessionId / chatId / userId from the incoming node data',
                        },
                        {
                            name: 'Define Below',
                            value: 'customKey',
                            description: 'Provide your own session key (supports expressions)',
                        },
                    ],
                    default: 'fromInput',
                    description: 'How to determine the session identifier used to scope chat history in Mem0',
                },
                {
                    displayName: 'Session Key',
                    name: 'sessionKey',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { sessionIdType: ['customKey'] },
                    },
                    description: 'Unique identifier for this conversation session. Maps to user_id in Mem0. Supports expressions, e.g. ={{ $json.message.chat.id }}',
                    placeholder: '={{ $json.message.chat.id }}',
                },
                {
                    displayName: 'Context Window Length',
                    name: 'contextWindowLength',
                    type: 'number',
                    default: 10,
                    typeOptions: { minValue: 0 },
                    description: 'Number of recent messages to load into context (0 = all messages). Each exchange counts as 2 messages (human + AI).',
                },
            ],
        };
    }

    /**
     * Resolve the session key (maps to user_id in Mem0) from node parameters.
     * For "fromInput" mode we try to read sessionId / chatId / userId from the
     * current item's JSON; fall back to the node ID as a stable default.
     */
    _resolveSessionKey(itemIndex) {
        const sessionIdType = this.getNodeParameter('sessionIdType', itemIndex, 'fromInput');
        if (sessionIdType === 'customKey') {
            return String(this.getNodeParameter('sessionKey', itemIndex, '') || `session_${this.getNode().id}`);
        }
        // fromInput: look for common session fields in the current item
        try {
            const items = this.getInputData();
            const item = (items && (items[itemIndex] || items[0]));
            const json = item && item.json;
            if (json) {
                const key = json.sessionId || json.chatId || json.userId || json.session_id || json.user_id;
                if (key) return String(key);
            }
        } catch (_) { /* ignore */ }
        return `session_${this.getNode().id}`;
    }

    /**
     * Fetch stored messages from Mem0 and return them as LangChain BaseMessage instances.
     * Messages are stored with metadata.role so we can reconstruct human/AI types.
     */
    async _loadMessages(sessionKey, contextWindowLength) {
        const qs = { user_id: sessionKey };
        const res = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/memories/', {}, qs);
        let memories = Array.isArray(res) ? res : (res ? [res] : []);
        // Apply context window (0 = unlimited)
        if (contextWindowLength > 0) {
            memories = memories.slice(-contextWindowLength * 2);
        }
        return memories.map((m) => {
            const content = m.memory || m.text || m.content || JSON.stringify(m);
            const role = (m.metadata && m.metadata.role) || m.role || 'system';
            if (role === 'user' || role === 'human') return new HumanMessage(content);
            if (role === 'assistant' || role === 'ai') return new AIMessage(content);
            return new SystemMessage(content);
        });
    }

    /**
     * supplyData is called by the n8n AI Agent to get the memory object.
     * Returns a BaseChatMemory-compatible interface that the AI Agent chain
     * uses to load context (loadMemoryVariables) and save exchanges (saveContext).
     */
    async supplyData(itemIndex) {
        const self = this;
        const sessionKey = this._resolveSessionKey(itemIndex);
        const contextWindowLength = Number(this.getNodeParameter('contextWindowLength', itemIndex, 10));

        const memoryObj = {
            memoryKeys: ['chat_history'],
            chatHistory: {
                async getMessages() {
                    try {
                        return await self._loadMessages(sessionKey, contextWindowLength);
                    } catch (_) {
                        return [];
                    }
                },
                async addUserMessage(message) {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/', {
                            messages: [{ role: 'user', content: String(message) }],
                            user_id: sessionKey,
                            infer: false,
                        });
                    } catch (_) { /* ignore */ }
                },
                async addAIChatMessage(message) {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/', {
                            messages: [{ role: 'assistant', content: String(message) }],
                            user_id: sessionKey,
                            infer: false,
                        });
                    } catch (_) { /* ignore */ }
                },
                async clear() {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', '/v1/memories/', {}, { user_id: sessionKey });
                    } catch (_) { /* ignore */ }
                },
            },

            async loadMemoryVariables(_values) {
                try {
                    const messages = await self._loadMessages(sessionKey, contextWindowLength);
                    return { chat_history: messages };
                } catch (_) {
                    return { chat_history: [] };
                }
            },

            async saveContext(inputValues, outputValues) {
                try {
                    const messages = [];
                    const userInput = inputValues && (inputValues.input || inputValues.human_input || inputValues.query || inputValues.chatInput);
                    const aiOutput = outputValues && (outputValues.output || outputValues.response || outputValues.text);
                    if (userInput) messages.push({ role: 'user', content: String(userInput) });
                    if (aiOutput) messages.push({ role: 'assistant', content: String(aiOutput) });
                    if (messages.length === 0) return;
                    // infer: false preserves raw messages without LLM extraction
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/', {
                        messages,
                        user_id: sessionKey,
                        infer: false,
                    });
                } catch (_) { /* silently ignore to not disrupt the agent */ }
            },

            async clear() {
                try {
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', '/v1/memories/', {}, { user_id: sessionKey });
                } catch (_) { /* ignore */ }
            },
        };

        return { response: memoryObj };
    }

    // execute fallback when node is not connected to an AI Agent memory port
    async execute() {
        const items = this.getInputData();
        return [items.map((_item, i) => ({
            json: {
                message: 'Mem0 Chat Memory is ready. Connect the "ai_memory" output to an AI Agent node.',
                sessionKey: this._resolveSessionKey(i),
            },
        }))];
    }
}
exports.Mem0Memory = Mem0Memory;
