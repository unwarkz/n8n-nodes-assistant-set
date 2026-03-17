"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBot = void 0;
const n8n_workflow_1 = require("n8n-workflow");

async function telegramApiRequest(ctx, method, body = {}) {
    const credentials = await ctx.getCredentials('telegramBotApi');
    const baseUrl = (credentials.baseUrl || 'https://api.telegram.org').replace(/\/$/, '');
    const token = credentials.botToken;
    const requestOptions = {
        method: 'POST',
        url: `${baseUrl}/bot${token}/${method}`,
        body,
        json: true,
    };
    try {
        const response = await ctx.helpers.request(requestOptions);
        if (response && response.ok === false) {
            throw new Error(response.description || 'Telegram API error');
        }
        return response;
    } catch (error) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), error);
    }
}

async function telegramApiRequestMultipart(ctx, method, formData) {
    const credentials = await ctx.getCredentials('telegramBotApi');
    const baseUrl = (credentials.baseUrl || 'https://api.telegram.org').replace(/\/$/, '');
    const token = credentials.botToken;
    const requestOptions = {
        method: 'POST',
        url: `${baseUrl}/bot${token}/${method}`,
        formData,
        json: true,
    };
    try {
        const response = await ctx.helpers.request(requestOptions);
        if (response && response.ok === false) {
            throw new Error(response.description || 'Telegram API error');
        }
        return response;
    } catch (error) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), error);
    }
}

class TelegramBot {
    constructor() {
        this.description = {
            displayName: 'Telegram Bot',
            name: 'telegramBot',
            icon: 'file:telegram.svg',
            group: ['output'],
            version: 1,
            subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
            description: 'Interact with the Telegram Bot API – send messages, manage chats, handle payments, and more',
            defaults: { name: 'Telegram Bot' },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [{ name: 'telegramBotApi', required: true }],
            codex: {
                categories: ['Communication'],
                subcategories: { Communication: ['Messaging'] },
                resources: { primaryDocumentation: [{ url: 'https://core.telegram.org/bots/api' }] },
            },
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'Bot', value: 'bot', description: 'Bot management operations' },
                        { name: 'Chat', value: 'chat', description: 'Chat management operations' },
                        { name: 'File', value: 'file', description: 'File operations' },
                        { name: 'Forum', value: 'forum', description: 'Forum topic operations' },
                        { name: 'Game', value: 'game', description: 'Game operations' },
                        { name: 'Inline', value: 'inline', description: 'Inline query operations' },
                        { name: 'Message', value: 'message', description: 'Send and manage messages' },
                        { name: 'Payment', value: 'payment', description: 'Payment and invoice operations' },
                        { name: 'Sticker', value: 'sticker', description: 'Sticker operations' },
                        { name: 'Update', value: 'update', description: 'Get bot updates' },
                        { name: 'Webhook', value: 'webhook', description: 'Webhook management' },
                    ],
                    default: 'message',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['message'] } },
                    options: [
                        { name: 'Send Message', value: 'sendMessage', description: 'Send a text message', action: 'send a text message' },
                        { name: 'Forward Message', value: 'forwardMessage', description: 'Forward a message', action: 'forward a message' },
                        { name: 'Copy Message', value: 'copyMessage', description: 'Copy a message', action: 'copy a message' },
                        { name: 'Send Photo', value: 'sendPhoto', description: 'Send a photo', action: 'send a photo' },
                        { name: 'Send Audio', value: 'sendAudio', description: 'Send an audio file', action: 'send an audio file' },
                        { name: 'Send Document', value: 'sendDocument', description: 'Send a document', action: 'send a document' },
                        { name: 'Send Video', value: 'sendVideo', description: 'Send a video', action: 'send a video' },
                        { name: 'Send Animation', value: 'sendAnimation', description: 'Send an animation', action: 'send an animation' },
                        { name: 'Send Voice', value: 'sendVoice', description: 'Send a voice message', action: 'send a voice message' },
                        { name: 'Send Video Note', value: 'sendVideoNote', description: 'Send a video note', action: 'send a video note' },
                        { name: 'Send Media Group', value: 'sendMediaGroup', description: 'Send a group of photos or videos', action: 'send a media group' },
                        { name: 'Send Location', value: 'sendLocation', description: 'Send a location', action: 'send a location' },
                        { name: 'Send Venue', value: 'sendVenue', description: 'Send a venue', action: 'send a venue' },
                        { name: 'Send Contact', value: 'sendContact', description: 'Send a contact', action: 'send a contact' },
                        { name: 'Send Poll', value: 'sendPoll', description: 'Send a poll', action: 'send a poll' },
                        { name: 'Send Dice', value: 'sendDice', description: 'Send a dice', action: 'send a dice' },
                        { name: 'Send Chat Action', value: 'sendChatAction', description: 'Send a chat action', action: 'send a chat action' },
                        { name: 'Edit Message Text', value: 'editMessageText', description: 'Edit message text', action: 'edit message text' },
                        { name: 'Edit Message Caption', value: 'editMessageCaption', description: 'Edit message caption', action: 'edit message caption' },
                        { name: 'Edit Message Media', value: 'editMessageMedia', description: 'Edit message media', action: 'edit message media' },
                        { name: 'Edit Message Reply Markup', value: 'editMessageReplyMarkup', description: 'Edit message reply markup', action: 'edit message reply markup' },
                        { name: 'Edit Message Live Location', value: 'editMessageLiveLocation', description: 'Edit live location', action: 'edit live location' },
                        { name: 'Stop Message Live Location', value: 'stopMessageLiveLocation', description: 'Stop live location', action: 'stop live location' },
                        { name: 'Stop Poll', value: 'stopPoll', description: 'Stop a poll', action: 'stop a poll' },
                        { name: 'Delete Message', value: 'deleteMessage', description: 'Delete a message', action: 'delete a message' },
                        { name: 'Delete Messages', value: 'deleteMessages', description: 'Delete multiple messages', action: 'delete multiple messages' },
                    ],
                    default: 'sendMessage',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['chat'] } },
                    options: [
                        { name: 'Get Chat', value: 'getChat', description: 'Get chat information', action: 'get chat information' },
                        { name: 'Get Chat Administrators', value: 'getChatAdministrators', description: 'Get chat administrators', action: 'get chat administrators' },
                        { name: 'Get Chat Member Count', value: 'getChatMemberCount', description: 'Get chat member count', action: 'get chat member count' },
                        { name: 'Get Chat Member', value: 'getChatMember', description: 'Get chat member information', action: 'get chat member information' },
                        { name: 'Ban Chat Member', value: 'banChatMember', description: 'Ban a chat member', action: 'ban a chat member' },
                        { name: 'Unban Chat Member', value: 'unbanChatMember', description: 'Unban a chat member', action: 'unban a chat member' },
                        { name: 'Restrict Chat Member', value: 'restrictChatMember', description: 'Restrict a chat member', action: 'restrict a chat member' },
                        { name: 'Promote Chat Member', value: 'promoteChatMember', description: 'Promote a chat member', action: 'promote a chat member' },
                        { name: 'Set Chat Administrator Custom Title', value: 'setChatAdministratorCustomTitle', description: 'Set admin custom title', action: 'set admin custom title' },
                        { name: 'Set Chat Permissions', value: 'setChatPermissions', description: 'Set chat permissions', action: 'set chat permissions' },
                        { name: 'Export Chat Invite Link', value: 'exportChatInviteLink', description: 'Export chat invite link', action: 'export chat invite link' },
                        { name: 'Create Chat Invite Link', value: 'createChatInviteLink', description: 'Create chat invite link', action: 'create chat invite link' },
                        { name: 'Edit Chat Invite Link', value: 'editChatInviteLink', description: 'Edit chat invite link', action: 'edit chat invite link' },
                        { name: 'Revoke Chat Invite Link', value: 'revokeChatInviteLink', description: 'Revoke chat invite link', action: 'revoke chat invite link' },
                        { name: 'Approve Chat Join Request', value: 'approveChatJoinRequest', description: 'Approve chat join request', action: 'approve chat join request' },
                        { name: 'Decline Chat Join Request', value: 'declineChatJoinRequest', description: 'Decline chat join request', action: 'decline chat join request' },
                        { name: 'Set Chat Photo', value: 'setChatPhoto', description: 'Set chat photo', action: 'set chat photo' },
                        { name: 'Delete Chat Photo', value: 'deleteChatPhoto', description: 'Delete chat photo', action: 'delete chat photo' },
                        { name: 'Set Chat Title', value: 'setChatTitle', description: 'Set chat title', action: 'set chat title' },
                        { name: 'Set Chat Description', value: 'setChatDescription', description: 'Set chat description', action: 'set chat description' },
                        { name: 'Pin Chat Message', value: 'pinChatMessage', description: 'Pin a chat message', action: 'pin a chat message' },
                        { name: 'Unpin Chat Message', value: 'unpinChatMessage', description: 'Unpin a chat message', action: 'unpin a chat message' },
                        { name: 'Unpin All Chat Messages', value: 'unpinAllChatMessages', description: 'Unpin all chat messages', action: 'unpin all chat messages' },
                        { name: 'Leave Chat', value: 'leaveChat', description: 'Leave a chat', action: 'leave a chat' },
                        { name: 'Set Chat Menu Button', value: 'setChatMenuButton', description: 'Set chat menu button', action: 'set chat menu button' },
                        { name: 'Get Chat Menu Button', value: 'getChatMenuButton', description: 'Get chat menu button', action: 'get chat menu button' },
                        { name: 'Set Chat Sticker Set', value: 'setChatStickerSet', description: 'Set chat sticker set', action: 'set chat sticker set' },
                        { name: 'Delete Chat Sticker Set', value: 'deleteChatStickerSet', description: 'Delete chat sticker set', action: 'delete chat sticker set' },
                    ],
                    default: 'getChat',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['bot'] } },
                    options: [
                        { name: 'Get Me', value: 'getMe', description: 'Get bot information', action: 'get bot information' },
                        { name: 'Log Out', value: 'logOut', description: 'Log out from cloud Bot API server', action: 'log out' },
                        { name: 'Close', value: 'close', description: 'Close bot instance', action: 'close bot instance' },
                        { name: 'Get My Commands', value: 'getMyCommands', description: 'Get bot commands', action: 'get bot commands' },
                        { name: 'Set My Commands', value: 'setMyCommands', description: 'Set bot commands', action: 'set bot commands' },
                        { name: 'Delete My Commands', value: 'deleteMyCommands', description: 'Delete bot commands', action: 'delete bot commands' },
                        { name: 'Get My Name', value: 'getMyName', description: 'Get bot name', action: 'get bot name' },
                        { name: 'Set My Name', value: 'setMyName', description: 'Set bot name', action: 'set bot name' },
                        { name: 'Get My Description', value: 'getMyDescription', description: 'Get bot description', action: 'get bot description' },
                        { name: 'Set My Description', value: 'setMyDescription', description: 'Set bot description', action: 'set bot description' },
                        { name: 'Get My Short Description', value: 'getMyShortDescription', description: 'Get bot short description', action: 'get bot short description' },
                        { name: 'Set My Short Description', value: 'setMyShortDescription', description: 'Set bot short description', action: 'set bot short description' },
                    ],
                    default: 'getMe',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['webhook'] } },
                    options: [
                        { name: 'Set Webhook', value: 'setWebhook', description: 'Set webhook URL', action: 'set webhook URL' },
                        { name: 'Delete Webhook', value: 'deleteWebhook', description: 'Delete webhook', action: 'delete webhook' },
                        { name: 'Get Webhook Info', value: 'getWebhookInfo', description: 'Get webhook info', action: 'get webhook info' },
                    ],
                    default: 'setWebhook',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['file'] } },
                    options: [
                        { name: 'Get File', value: 'getFile', description: 'Get file information and download', action: 'get file' },
                    ],
                    default: 'getFile',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['sticker'] } },
                    options: [
                        { name: 'Send Sticker', value: 'sendSticker', description: 'Send a sticker', action: 'send a sticker' },
                        { name: 'Get Sticker Set', value: 'getStickerSet', description: 'Get sticker set', action: 'get sticker set' },
                        { name: 'Get Custom Emoji Stickers', value: 'getCustomEmojiStickers', description: 'Get custom emoji stickers', action: 'get custom emoji stickers' },
                        { name: 'Upload Sticker File', value: 'uploadStickerFile', description: 'Upload sticker file', action: 'upload sticker file' },
                        { name: 'Create New Sticker Set', value: 'createNewStickerSet', description: 'Create new sticker set', action: 'create new sticker set' },
                        { name: 'Add Sticker To Set', value: 'addStickerToSet', description: 'Add sticker to set', action: 'add sticker to set' },
                        { name: 'Set Sticker Position In Set', value: 'setStickerPositionInSet', description: 'Set sticker position in set', action: 'set sticker position' },
                        { name: 'Delete Sticker From Set', value: 'deleteStickerFromSet', description: 'Delete sticker from set', action: 'delete sticker from set' },
                        { name: 'Delete Sticker Set', value: 'deleteStickerSet', description: 'Delete sticker set', action: 'delete sticker set' },
                        { name: 'Set Sticker Set Thumbnail', value: 'setStickerSetThumbnail', description: 'Set sticker set thumbnail', action: 'set sticker set thumbnail' },
                    ],
                    default: 'sendSticker',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['inline'] } },
                    options: [
                        { name: 'Answer Inline Query', value: 'answerInlineQuery', description: 'Answer inline query', action: 'answer inline query' },
                        { name: 'Answer Web App Query', value: 'answerWebAppQuery', description: 'Answer web app query', action: 'answer web app query' },
                    ],
                    default: 'answerInlineQuery',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['payment'] } },
                    options: [
                        { name: 'Send Invoice', value: 'sendInvoice', description: 'Send an invoice', action: 'send an invoice' },
                        { name: 'Create Invoice Link', value: 'createInvoiceLink', description: 'Create invoice link', action: 'create invoice link' },
                        { name: 'Answer Shipping Query', value: 'answerShippingQuery', description: 'Answer shipping query', action: 'answer shipping query' },
                        { name: 'Answer Pre Checkout Query', value: 'answerPreCheckoutQuery', description: 'Answer pre-checkout query', action: 'answer pre-checkout query' },
                    ],
                    default: 'sendInvoice',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['forum'] } },
                    options: [
                        { name: 'Create Forum Topic', value: 'createForumTopic', description: 'Create forum topic', action: 'create forum topic' },
                        { name: 'Edit Forum Topic', value: 'editForumTopic', description: 'Edit forum topic', action: 'edit forum topic' },
                        { name: 'Close Forum Topic', value: 'closeForumTopic', description: 'Close forum topic', action: 'close forum topic' },
                        { name: 'Reopen Forum Topic', value: 'reopenForumTopic', description: 'Reopen forum topic', action: 'reopen forum topic' },
                        { name: 'Delete Forum Topic', value: 'deleteForumTopic', description: 'Delete forum topic', action: 'delete forum topic' },
                        { name: 'Unpin All Forum Topic Messages', value: 'unpinAllForumTopicMessages', description: 'Unpin all forum messages', action: 'unpin all forum messages' },
                        { name: 'Edit General Forum Topic', value: 'editGeneralForumTopic', description: 'Edit general forum topic', action: 'edit general forum topic' },
                        { name: 'Close General Forum Topic', value: 'closeGeneralForumTopic', description: 'Close general forum topic', action: 'close general forum topic' },
                        { name: 'Reopen General Forum Topic', value: 'reopenGeneralForumTopic', description: 'Reopen general forum topic', action: 'reopen general forum topic' },
                        { name: 'Hide General Forum Topic', value: 'hideGeneralForumTopic', description: 'Hide general forum topic', action: 'hide general forum topic' },
                        { name: 'Unhide General Forum Topic', value: 'unhideGeneralForumTopic', description: 'Unhide general forum topic', action: 'unhide general forum topic' },
                    ],
                    default: 'createForumTopic',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['game'] } },
                    options: [
                        { name: 'Send Game', value: 'sendGame', description: 'Send a game', action: 'send a game' },
                        { name: 'Set Game Score', value: 'setGameScore', description: 'Set game score', action: 'set game score' },
                        { name: 'Get Game High Scores', value: 'getGameHighScores', description: 'Get game high scores', action: 'get game high scores' },
                    ],
                    default: 'sendGame',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['update'] } },
                    options: [
                        { name: 'Get Updates', value: 'getUpdates', description: 'Get bot updates', action: 'get bot updates' },
                    ],
                    default: 'getUpdates',
                },
                // ─── Parameter Properties ───
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat or username (@channelusername)',
                    default: '',
                    displayOptions: { show: {
                        resource: ['message'],
                        operation: ['sendMessage', 'forwardMessage', 'copyMessage', 'sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote', 'sendMediaGroup', 'sendLocation', 'sendVenue', 'sendContact', 'sendPoll', 'sendDice', 'sendChatAction', 'editMessageText', 'editMessageCaption', 'editMessageMedia', 'editMessageReplyMarkup', 'editMessageLiveLocation', 'stopMessageLiveLocation', 'stopPoll', 'deleteMessage', 'deleteMessages'],
                    } },
                },
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat or username (@channelusername)',
                    default: '',
                    displayOptions: { show: {
                        resource: ['chat'],
                        operation: ['getChat', 'getChatAdministrators', 'getChatMemberCount', 'getChatMember', 'banChatMember', 'unbanChatMember', 'restrictChatMember', 'promoteChatMember', 'setChatAdministratorCustomTitle', 'setChatPermissions', 'exportChatInviteLink', 'createChatInviteLink', 'editChatInviteLink', 'revokeChatInviteLink', 'approveChatJoinRequest', 'declineChatJoinRequest', 'setChatPhoto', 'deleteChatPhoto', 'setChatTitle', 'setChatDescription', 'pinChatMessage', 'unpinChatMessage', 'unpinAllChatMessages', 'leaveChat', 'setChatMenuButton', 'getChatMenuButton', 'setChatStickerSet', 'deleteChatStickerSet'],
                    } },
                },
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat',
                    default: '',
                    displayOptions: { show: {
                        resource: ['forum'],
                        operation: ['createForumTopic', 'editForumTopic', 'closeForumTopic', 'reopenForumTopic', 'deleteForumTopic', 'unpinAllForumTopicMessages', 'editGeneralForumTopic', 'closeGeneralForumTopic', 'reopenGeneralForumTopic', 'hideGeneralForumTopic', 'unhideGeneralForumTopic'],
                    } },
                },
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat',
                    default: '',
                    displayOptions: { show: {
                        resource: ['sticker'],
                        operation: ['sendSticker'],
                    } },
                },
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat',
                    default: '',
                    displayOptions: { show: {
                        resource: ['game'],
                        operation: ['sendGame'],
                    } },
                },
                {
                    displayName: 'Chat ID',
                    name: 'chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the target chat',
                    default: '',
                    displayOptions: { show: {
                        resource: ['payment'],
                        operation: ['sendInvoice'],
                    } },
                },
                {
                    displayName: 'From Chat ID',
                    name: 'from_chat_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the chat where the original message was sent',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['forwardMessage', 'copyMessage'] } },
                },
                {
                    displayName: 'Message ID',
                    name: 'message_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier of the target message',
                    default: 0,
                    displayOptions: { show: { resource: ['message'], operation: ['forwardMessage', 'copyMessage', 'editMessageText', 'editMessageCaption', 'editMessageMedia', 'editMessageReplyMarkup', 'editMessageLiveLocation', 'stopMessageLiveLocation', 'stopPoll', 'deleteMessage'] } },
                },
                {
                    displayName: 'Message ID',
                    name: 'message_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier of the target message',
                    default: 0,
                    displayOptions: { show: { resource: ['chat'], operation: ['pinChatMessage', 'unpinChatMessage'] } },
                },
                {
                    displayName: 'Text',
                    name: 'text',
                    type: 'string',
                    required: true,
                    description: 'Text of the message to be sent',
                    default: '',
                    typeOptions: { rows: 4 },
                    displayOptions: { show: { resource: ['message'], operation: ['sendMessage', 'editMessageText'] } },
                },
                {
                    displayName: 'Parse Mode',
                    name: 'parse_mode',
                    type: 'options',
                    description: 'How to parse the text',
                    default: 'none',
                    options: [
                        { name: 'None', value: 'none' },
                        { name: 'Markdown', value: 'Markdown' },
                        { name: 'MarkdownV2', value: 'MarkdownV2' },
                        { name: 'HTML', value: 'HTML' },
                    ],
                    displayOptions: { show: { resource: ['message'], operation: ['sendMessage', 'sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'copyMessage', 'editMessageText', 'editMessageCaption'] } },
                },
                {
                    displayName: 'File Source',
                    name: 'fileSource',
                    type: 'options',
                    description: 'How to provide the file',
                    default: 'fileId',
                    options: [
                        { name: 'File ID', value: 'fileId' },
                        { name: 'URL', value: 'url' },
                        { name: 'Binary Data', value: 'binary' },
                    ],
                    displayOptions: { show: { resource: ['message'], operation: ['sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote'] } },
                },
                {
                    displayName: 'File ID',
                    name: 'fileId',
                    type: 'string',
                    required: true,
                    description: 'File ID of the file to send',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote'], fileSource: ['fileId'] } },
                },
                {
                    displayName: 'File URL',
                    name: 'fileUrl',
                    type: 'string',
                    required: true,
                    description: 'URL of the file to send',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote'], fileSource: ['url'] } },
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    required: true,
                    description: 'Name of the binary property containing the file',
                    default: 'data',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote'], fileSource: ['binary'] } },
                },
                {
                    displayName: 'Caption',
                    name: 'caption',
                    type: 'string',
                    description: 'Caption for the file',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice'] } },
                },
                {
                    displayName: 'Caption',
                    name: 'caption',
                    type: 'string',
                    description: 'New caption for the message',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['editMessageCaption'] } },
                },
                {
                    displayName: 'Reply Markup (JSON)',
                    name: 'reply_markup',
                    type: 'json',
                    description: 'Inline keyboard, reply keyboard, or other reply markup as JSON',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendMessage', 'sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote', 'sendLocation', 'sendVenue', 'sendContact', 'sendPoll', 'sendDice', 'editMessageReplyMarkup'] } },
                },
                {
                    displayName: 'Latitude',
                    name: 'latitude',
                    type: 'number',
                    required: true,
                    description: 'Latitude of the location',
                    default: 0,
                    displayOptions: { show: { resource: ['message'], operation: ['sendLocation', 'sendVenue', 'editMessageLiveLocation'] } },
                },
                {
                    displayName: 'Longitude',
                    name: 'longitude',
                    type: 'number',
                    required: true,
                    description: 'Longitude of the location',
                    default: 0,
                    displayOptions: { show: { resource: ['message'], operation: ['sendLocation', 'sendVenue', 'editMessageLiveLocation'] } },
                },
                {
                    displayName: 'Phone Number',
                    name: 'phone_number',
                    type: 'string',
                    required: true,
                    description: "Contact's phone number",
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendContact'] } },
                },
                {
                    displayName: 'First Name',
                    name: 'first_name',
                    type: 'string',
                    required: true,
                    description: "Contact's first name",
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendContact'] } },
                },
                {
                    displayName: 'Venue Title',
                    name: 'venue_title',
                    type: 'string',
                    required: true,
                    description: 'Name of the venue',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendVenue'] } },
                },
                {
                    displayName: 'Venue Address',
                    name: 'venue_address',
                    type: 'string',
                    required: true,
                    description: 'Address of the venue',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendVenue'] } },
                },
                {
                    displayName: 'Question',
                    name: 'question',
                    type: 'string',
                    required: true,
                    description: 'Poll question',
                    default: '',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPoll'] } },
                },
                {
                    displayName: 'Poll Options (JSON)',
                    name: 'poll_options',
                    type: 'json',
                    required: true,
                    description: 'JSON array of poll option strings, e.g. ["Option A", "Option B"]',
                    default: '[]',
                    displayOptions: { show: { resource: ['message'], operation: ['sendPoll'] } },
                },
                {
                    displayName: 'Action',
                    name: 'action',
                    type: 'options',
                    required: true,
                    description: 'Type of action to broadcast',
                    default: 'typing',
                    options: [
                        { name: 'typing', value: 'typing' },
                        { name: 'upload_photo', value: 'upload_photo' },
                        { name: 'record_video', value: 'record_video' },
                        { name: 'upload_video', value: 'upload_video' },
                        { name: 'record_voice', value: 'record_voice' },
                        { name: 'upload_voice', value: 'upload_voice' },
                        { name: 'upload_document', value: 'upload_document' },
                        { name: 'choose_sticker', value: 'choose_sticker' },
                        { name: 'find_location', value: 'find_location' },
                        { name: 'record_video_note', value: 'record_video_note' },
                        { name: 'upload_video_note', value: 'upload_video_note' },
                    ],
                    displayOptions: { show: { resource: ['message'], operation: ['sendChatAction'] } },
                },
                {
                    displayName: 'Emoji',
                    name: 'emoji',
                    type: 'options',
                    description: 'Emoji on which the dice throw is based',
                    default: '🎲',
                    options: [
                        { name: '🎲', value: '🎲' },
                        { name: '🎯', value: '🎯' },
                        { name: '🏀', value: '🏀' },
                        { name: '⚽', value: '⚽' },
                        { name: '🎳', value: '🎳' },
                        { name: '🎰', value: '🎰' },
                    ],
                    displayOptions: { show: { resource: ['message'], operation: ['sendDice'] } },
                },
                {
                    displayName: 'User ID',
                    name: 'user_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier of the target user',
                    default: 0,
                    displayOptions: { show: { resource: ['chat'], operation: ['getChatMember', 'banChatMember', 'unbanChatMember', 'restrictChatMember', 'promoteChatMember', 'setChatAdministratorCustomTitle', 'approveChatJoinRequest', 'declineChatJoinRequest'] } },
                },
                {
                    displayName: 'User ID',
                    name: 'user_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier of the target user',
                    default: 0,
                    displayOptions: { show: { resource: ['sticker'], operation: ['uploadStickerFile', 'createNewStickerSet', 'addStickerToSet', 'setStickerSetThumbnail'] } },
                },
                {
                    displayName: 'User ID',
                    name: 'user_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier of the target user',
                    default: 0,
                    displayOptions: { show: { resource: ['game'], operation: ['setGameScore', 'getGameHighScores'] } },
                },
                {
                    displayName: 'Webhook URL',
                    name: 'webhook_url',
                    type: 'string',
                    required: true,
                    description: 'HTTPS URL to send updates to',
                    default: '',
                    displayOptions: { show: { resource: ['webhook'], operation: ['setWebhook'] } },
                },
                {
                    displayName: 'File ID',
                    name: 'file_id',
                    type: 'string',
                    required: true,
                    description: 'File identifier to get info about',
                    default: '',
                    displayOptions: { show: { resource: ['file'], operation: ['getFile'] } },
                },
                {
                    displayName: 'Message Thread ID',
                    name: 'message_thread_id',
                    type: 'number',
                    required: true,
                    description: 'Unique identifier for the target message thread of the forum topic',
                    default: 0,
                    displayOptions: { show: { resource: ['forum'], operation: ['editForumTopic', 'closeForumTopic', 'reopenForumTopic', 'deleteForumTopic', 'unpinAllForumTopicMessages'] } },
                },
                {
                    displayName: 'Topic Name',
                    name: 'forum_name',
                    type: 'string',
                    required: true,
                    description: 'Topic name for the forum',
                    default: '',
                    displayOptions: { show: { resource: ['forum'], operation: ['createForumTopic'] } },
                },
                {
                    displayName: 'Sticker Set Name',
                    name: 'sticker_set_name',
                    type: 'string',
                    required: true,
                    description: 'Name of the sticker set',
                    default: '',
                    displayOptions: { show: { resource: ['sticker'], operation: ['getStickerSet', 'createNewStickerSet', 'addStickerToSet', 'deleteStickerSet', 'setStickerSetThumbnail'] } },
                },
                {
                    displayName: 'Sticker Set Name',
                    name: 'sticker_set_name',
                    type: 'string',
                    required: true,
                    description: 'Name of the sticker set',
                    default: '',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatStickerSet'] } },
                },
                {
                    displayName: 'Inline Query ID',
                    name: 'inline_query_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the answered query',
                    default: '',
                    displayOptions: { show: { resource: ['inline'], operation: ['answerInlineQuery'] } },
                },
                {
                    displayName: 'Results (JSON)',
                    name: 'inline_results',
                    type: 'json',
                    required: true,
                    description: 'JSON array of InlineQueryResult objects',
                    default: '[]',
                    displayOptions: { show: { resource: ['inline'], operation: ['answerInlineQuery'] } },
                },
                {
                    displayName: 'Web App Query ID',
                    name: 'web_app_query_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the query to be answered',
                    default: '',
                    displayOptions: { show: { resource: ['inline'], operation: ['answerWebAppQuery'] } },
                },
                {
                    displayName: 'Result (JSON)',
                    name: 'web_app_result',
                    type: 'json',
                    required: true,
                    description: 'JSON object describing an InlineQueryResult',
                    default: '{}',
                    displayOptions: { show: { resource: ['inline'], operation: ['answerWebAppQuery'] } },
                },
                {
                    displayName: 'Title',
                    name: 'invoice_title',
                    type: 'string',
                    required: true,
                    description: 'Product name',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Description',
                    name: 'invoice_description',
                    type: 'string',
                    required: true,
                    description: 'Product description',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Payload',
                    name: 'invoice_payload',
                    type: 'string',
                    required: true,
                    description: 'Bot-defined invoice payload',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Provider Token',
                    name: 'invoice_provider_token',
                    type: 'string',
                    required: true,
                    description: 'Payment provider token',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Currency',
                    name: 'invoice_currency',
                    type: 'string',
                    required: true,
                    description: 'Three-letter ISO 4217 currency code',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Prices (JSON)',
                    name: 'invoice_prices',
                    type: 'json',
                    required: true,
                    description: 'JSON array of LabeledPrice objects',
                    default: '[]',
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                },
                {
                    displayName: 'Shipping Query ID',
                    name: 'shipping_query_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the query to be answered',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['answerShippingQuery'] } },
                },
                {
                    displayName: 'OK',
                    name: 'shipping_ok',
                    type: 'boolean',
                    required: true,
                    description: 'Whether delivery to the specified address is possible',
                    default: true,
                    displayOptions: { show: { resource: ['payment'], operation: ['answerShippingQuery'] } },
                },
                {
                    displayName: 'Pre-Checkout Query ID',
                    name: 'pre_checkout_query_id',
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for the query to be answered',
                    default: '',
                    displayOptions: { show: { resource: ['payment'], operation: ['answerPreCheckoutQuery'] } },
                },
                {
                    displayName: 'OK',
                    name: 'pre_checkout_ok',
                    type: 'boolean',
                    required: true,
                    description: 'Whether the bot is ready to proceed with the order',
                    default: true,
                    displayOptions: { show: { resource: ['payment'], operation: ['answerPreCheckoutQuery'] } },
                },
                {
                    displayName: 'Game Short Name',
                    name: 'game_short_name',
                    type: 'string',
                    required: true,
                    description: 'Short name of the game',
                    default: '',
                    displayOptions: { show: { resource: ['game'], operation: ['sendGame'] } },
                },
                {
                    displayName: 'Score',
                    name: 'game_score',
                    type: 'number',
                    required: true,
                    description: 'New score (non-negative)',
                    default: 0,
                    displayOptions: { show: { resource: ['game'], operation: ['setGameScore'] } },
                },
                {
                    displayName: 'Custom Emoji IDs (JSON)',
                    name: 'custom_emoji_ids',
                    type: 'json',
                    required: true,
                    description: 'JSON array of custom emoji identifiers',
                    default: '[]',
                    displayOptions: { show: { resource: ['sticker'], operation: ['getCustomEmojiStickers'] } },
                },
                {
                    displayName: 'Commands (JSON)',
                    name: 'bot_commands',
                    type: 'json',
                    required: true,
                    description: 'JSON array of BotCommand objects, e.g. [{"command":"start","description":"Start"}]',
                    default: '[]',
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyCommands'] } },
                },
                {
                    displayName: 'Bot Name',
                    name: 'bot_name',
                    type: 'string',
                    required: true,
                    description: 'New bot name',
                    default: '',
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyName'] } },
                },
                {
                    displayName: 'Description',
                    name: 'bot_description',
                    type: 'string',
                    required: true,
                    description: 'New bot description',
                    default: '',
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyDescription'] } },
                },
                {
                    displayName: 'Short Description',
                    name: 'bot_short_description',
                    type: 'string',
                    required: true,
                    description: 'New bot short description',
                    default: '',
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyShortDescription'] } },
                },
                {
                    displayName: 'Title',
                    name: 'chat_title',
                    type: 'string',
                    required: true,
                    description: 'New chat title',
                    default: '',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatTitle'] } },
                },
                {
                    displayName: 'Description',
                    name: 'chat_description',
                    type: 'string',
                    description: 'New chat description (0-255 characters)',
                    default: '',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatDescription'] } },
                },
                {
                    displayName: 'Custom Title',
                    name: 'custom_title',
                    type: 'string',
                    required: true,
                    description: 'New custom title for the administrator (0-16 characters)',
                    default: '',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatAdministratorCustomTitle'] } },
                },
                {
                    displayName: 'Invite Link',
                    name: 'invite_link',
                    type: 'string',
                    required: true,
                    description: 'The invite link to edit or revoke',
                    default: '',
                    displayOptions: { show: { resource: ['chat'], operation: ['editChatInviteLink', 'revokeChatInviteLink'] } },
                },
                {
                    displayName: 'Name',
                    name: 'general_forum_name',
                    type: 'string',
                    required: true,
                    description: 'New topic name for the general forum topic',
                    default: '',
                    displayOptions: { show: { resource: ['forum'], operation: ['editGeneralForumTopic'] } },
                },
                {
                    displayName: 'Message IDs (JSON)',
                    name: 'message_ids',
                    type: 'json',
                    required: true,
                    description: 'JSON array of message IDs to delete, e.g. [1, 2, 3]',
                    default: '[]',
                    displayOptions: { show: { resource: ['message'], operation: ['deleteMessages'] } },
                },
                {
                    displayName: 'Media Group (JSON)',
                    name: 'media_group',
                    type: 'json',
                    required: true,
                    description: 'JSON array of InputMediaPhoto/InputMediaVideo objects',
                    default: '[]',
                    displayOptions: { show: { resource: ['message'], operation: ['sendMediaGroup'] } },
                },
                {
                    displayName: 'Media (JSON)',
                    name: 'edit_media',
                    type: 'json',
                    required: true,
                    description: 'JSON InputMedia object for the new media',
                    default: '{}',
                    displayOptions: { show: { resource: ['message'], operation: ['editMessageMedia'] } },
                },
                {
                    displayName: 'File Source',
                    name: 'fileSource',
                    type: 'options',
                    description: 'How to provide the sticker',
                    default: 'fileId',
                    options: [
                        { name: 'File ID', value: 'fileId' },
                        { name: 'URL', value: 'url' },
                        { name: 'Binary Data', value: 'binary' },
                    ],
                    displayOptions: { show: { resource: ['sticker'], operation: ['sendSticker'] } },
                },
                {
                    displayName: 'Sticker File ID',
                    name: 'sticker_file_id',
                    type: 'string',
                    required: true,
                    description: 'File ID of the sticker',
                    default: '',
                    displayOptions: { show: { resource: ['sticker'], operation: ['sendSticker'], fileSource: ['fileId'] } },
                },
                {
                    displayName: 'Sticker URL',
                    name: 'fileUrl',
                    type: 'string',
                    required: true,
                    description: 'URL of the sticker',
                    default: '',
                    displayOptions: { show: { resource: ['sticker'], operation: ['sendSticker'], fileSource: ['url'] } },
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    required: true,
                    description: 'Name of the binary property containing the sticker',
                    default: 'data',
                    displayOptions: { show: { resource: ['sticker'], operation: ['sendSticker'], fileSource: ['binary'] } },
                },
                {
                    displayName: 'Position',
                    name: 'sticker_position',
                    type: 'number',
                    required: true,
                    description: 'New sticker position in the set (zero-based)',
                    default: 0,
                    displayOptions: { show: { resource: ['sticker'], operation: ['setStickerPositionInSet'] } },
                },
                {
                    displayName: 'Sticker File ID',
                    name: 'sticker_delete_id',
                    type: 'string',
                    required: true,
                    description: 'File identifier of the sticker',
                    default: '',
                    displayOptions: { show: { resource: ['sticker'], operation: ['deleteStickerFromSet', 'setStickerPositionInSet'] } },
                },
                {
                    displayName: 'Sticker Set Title',
                    name: 'sticker_set_title',
                    type: 'string',
                    required: true,
                    description: 'Title of the sticker set',
                    default: '',
                    displayOptions: { show: { resource: ['sticker'], operation: ['createNewStickerSet'] } },
                },
                {
                    displayName: 'Stickers (JSON)',
                    name: 'stickers_json',
                    type: 'json',
                    required: true,
                    description: 'JSON array of InputSticker objects',
                    default: '[]',
                    displayOptions: { show: { resource: ['sticker'], operation: ['createNewStickerSet', 'addStickerToSet'] } },
                },
                {
                    displayName: 'Sticker Format',
                    name: 'sticker_format',
                    type: 'options',
                    required: true,
                    description: 'Format of the sticker',
                    default: 'static',
                    options: [
                        { name: 'Static', value: 'static' },
                        { name: 'Animated', value: 'animated' },
                        { name: 'Video', value: 'video' },
                    ],
                    displayOptions: { show: { resource: ['sticker'], operation: ['uploadStickerFile', 'setStickerSetThumbnail'] } },
                },
                {
                    displayName: 'Binary Property',
                    name: 'sticker_binary',
                    type: 'string',
                    required: true,
                    description: 'Name of the binary property containing the sticker file',
                    default: 'data',
                    displayOptions: { show: { resource: ['sticker'], operation: ['uploadStickerFile', 'setStickerSetThumbnail'] } },
                },
                {
                    displayName: 'Permissions (JSON)',
                    name: 'permissions',
                    type: 'json',
                    required: true,
                    description: 'JSON object describing chat permissions (ChatPermissions)',
                    default: '{}',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatPermissions', 'restrictChatMember'] } },
                },
                {
                    displayName: 'Binary Property',
                    name: 'chat_photo_binary',
                    type: 'string',
                    required: true,
                    description: 'Name of the binary property containing the new chat photo',
                    default: 'data',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatPhoto'] } },
                },
                {
                    displayName: 'Menu Button (JSON)',
                    name: 'menu_button',
                    type: 'json',
                    description: 'JSON object for the menu button (MenuButton)',
                    default: '{}',
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatMenuButton'] } },
                },
                // ─── Additional Fields Collections ───
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['message'], operation: ['sendMessage', 'sendPhoto', 'sendAudio', 'sendDocument', 'sendVideo', 'sendAnimation', 'sendVoice', 'sendVideoNote', 'forwardMessage', 'copyMessage', 'editMessageText', 'editMessageCaption', 'sendMediaGroup', 'sendSticker'] } },
                    options: [
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send the message silently' },
                        { displayName: 'Protect Content', name: 'protect_content', type: 'boolean', default: false, description: 'Protect the message from forwarding and saving' },
                        { displayName: 'Reply To Message ID', name: 'reply_to_message_id', type: 'number', default: 0, description: 'If the message is a reply, ID of the original message' },
                        { displayName: 'Message Thread ID', name: 'message_thread_id', type: 'number', default: 0, description: 'Unique identifier for the target message thread (topic) of the forum' },
                        { displayName: 'Disable Web Page Preview', name: 'disable_web_page_preview', type: 'boolean', default: false, description: 'Disables link previews for links in this message' },
                        { displayName: 'Allow Sending Without Reply', name: 'allow_sending_without_reply', type: 'boolean', default: false, description: 'Allow sending if the replied-to message is not found' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'locationAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['message'], operation: ['sendLocation', 'editMessageLiveLocation'] } },
                    options: [
                        { displayName: 'Horizontal Accuracy', name: 'horizontal_accuracy', type: 'number', default: 0, description: 'Radius of uncertainty for the location (0-1500 meters)' },
                        { displayName: 'Live Period', name: 'live_period', type: 'number', default: 0, description: 'Period in seconds for live location updates (60-86400)' },
                        { displayName: 'Heading', name: 'heading', type: 'number', default: 0, description: 'Direction in degrees (1-360)' },
                        { displayName: 'Proximity Alert Radius', name: 'proximity_alert_radius', type: 'number', default: 0, description: 'Maximum distance for proximity alerts (1-100000 meters)' },
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send silently' },
                        { displayName: 'Reply To Message ID', name: 'reply_to_message_id', type: 'number', default: 0, description: 'If the message is a reply, ID of the original message' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'contactAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['message'], operation: ['sendContact'] } },
                    options: [
                        { displayName: 'Last Name', name: 'last_name', type: 'string', default: '', description: "Contact's last name" },
                        { displayName: 'VCard', name: 'vcard', type: 'string', default: '', description: 'Additional data about the contact in vCard format' },
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send silently' },
                        { displayName: 'Reply To Message ID', name: 'reply_to_message_id', type: 'number', default: 0, description: 'If the message is a reply, ID of the original message' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'venueAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['message'], operation: ['sendVenue'] } },
                    options: [
                        { displayName: 'Foursquare ID', name: 'foursquare_id', type: 'string', default: '', description: 'Foursquare identifier of the venue' },
                        { displayName: 'Foursquare Type', name: 'foursquare_type', type: 'string', default: '', description: 'Foursquare type of the venue' },
                        { displayName: 'Google Place ID', name: 'google_place_id', type: 'string', default: '', description: 'Google Places identifier of the venue' },
                        { displayName: 'Google Place Type', name: 'google_place_type', type: 'string', default: '', description: 'Google Places type of the venue' },
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send silently' },
                        { displayName: 'Reply To Message ID', name: 'reply_to_message_id', type: 'number', default: 0, description: 'If the message is a reply, ID of the original message' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'pollAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['message'], operation: ['sendPoll'] } },
                    options: [
                        { displayName: 'Is Anonymous', name: 'is_anonymous', type: 'boolean', default: true, description: 'Whether the poll is anonymous' },
                        { displayName: 'Type', name: 'type', type: 'options', default: 'regular', options: [{ name: 'Regular', value: 'regular' }, { name: 'Quiz', value: 'quiz' }], description: 'Poll type' },
                        { displayName: 'Allows Multiple Answers', name: 'allows_multiple_answers', type: 'boolean', default: false, description: 'Allow multiple answers' },
                        { displayName: 'Correct Option ID', name: 'correct_option_id', type: 'number', default: 0, description: '0-based ID of the correct answer option (quiz mode)' },
                        { displayName: 'Explanation', name: 'explanation', type: 'string', default: '', description: 'Text shown when user picks wrong answer' },
                        { displayName: 'Open Period', name: 'open_period', type: 'number', default: 0, description: 'Time in seconds the poll will be active (5-600)' },
                        { displayName: 'Close Date', name: 'close_date', type: 'number', default: 0, description: 'Unix timestamp when the poll will be closed' },
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send silently' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'banAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['banChatMember'] } },
                    options: [
                        { displayName: 'Until Date', name: 'until_date', type: 'number', default: 0, description: 'Unix timestamp when the user will be unbanned (0 = forever)' },
                        { displayName: 'Revoke Messages', name: 'revoke_messages', type: 'boolean', default: false, description: 'Delete all messages from the chat for the user' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'unbanAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['unbanChatMember'] } },
                    options: [
                        { displayName: 'Only If Banned', name: 'only_if_banned', type: 'boolean', default: false, description: 'Do nothing if the user is not banned' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'restrictAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['restrictChatMember'] } },
                    options: [
                        { displayName: 'Until Date', name: 'until_date', type: 'number', default: 0, description: 'Unix timestamp when restrictions will be lifted' },
                        { displayName: 'Use Independent Chat Permissions', name: 'use_independent_chat_permissions', type: 'boolean', default: false, description: 'Use independent chat permissions' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'promoteAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['promoteChatMember'] } },
                    options: [
                        { displayName: 'Is Anonymous', name: 'is_anonymous', type: 'boolean', default: false, description: 'Is Anonymous' },
                        { displayName: 'Can Manage Chat', name: 'can_manage_chat', type: 'boolean', default: false, description: 'Can Manage Chat' },
                        { displayName: 'Can Post Messages', name: 'can_post_messages', type: 'boolean', default: false, description: 'Can Post Messages' },
                        { displayName: 'Can Edit Messages', name: 'can_edit_messages', type: 'boolean', default: false, description: 'Can Edit Messages' },
                        { displayName: 'Can Delete Messages', name: 'can_delete_messages', type: 'boolean', default: false, description: 'Can Delete Messages' },
                        { displayName: 'Can Manage Video Chats', name: 'can_manage_video_chats', type: 'boolean', default: false, description: 'Can Manage Video Chats' },
                        { displayName: 'Can Restrict Members', name: 'can_restrict_members', type: 'boolean', default: false, description: 'Can Restrict Members' },
                        { displayName: 'Can Promote Members', name: 'can_promote_members', type: 'boolean', default: false, description: 'Can Promote Members' },
                        { displayName: 'Can Change Info', name: 'can_change_info', type: 'boolean', default: false, description: 'Can Change Info' },
                        { displayName: 'Can Invite Users', name: 'can_invite_users', type: 'boolean', default: false, description: 'Can Invite Users' },
                        { displayName: 'Can Pin Messages', name: 'can_pin_messages', type: 'boolean', default: false, description: 'Can Pin Messages' },
                        { displayName: 'Can Post Stories', name: 'can_post_stories', type: 'boolean', default: false, description: 'Can Post Stories' },
                        { displayName: 'Can Edit Stories', name: 'can_edit_stories', type: 'boolean', default: false, description: 'Can Edit Stories' },
                        { displayName: 'Can Delete Stories', name: 'can_delete_stories', type: 'boolean', default: false, description: 'Can Delete Stories' },
                        { displayName: 'Can Manage Topics', name: 'can_manage_topics', type: 'boolean', default: false, description: 'Can Manage Topics' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'inviteLinkAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['createChatInviteLink', 'editChatInviteLink'] } },
                    options: [
                        { displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Invite link name' },
                        { displayName: 'Expire Date', name: 'expire_date', type: 'number', default: 0, description: 'Unix timestamp when the link will expire' },
                        { displayName: 'Member Limit', name: 'member_limit', type: 'number', default: 0, description: 'Max number of users (1-99999)' },
                        { displayName: 'Creates Join Request', name: 'creates_join_request', type: 'boolean', default: false, description: 'Whether users need to be approved to join' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'webhookAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['webhook'], operation: ['setWebhook'] } },
                    options: [
                        { displayName: 'IP Address', name: 'ip_address', type: 'string', default: '', description: 'Fixed IP address for webhook requests' },
                        { displayName: 'Max Connections', name: 'max_connections', type: 'number', default: 40, description: 'Maximum allowed simultaneous HTTPS connections (1-100)' },
                        { displayName: 'Allowed Updates (JSON)', name: 'allowed_updates', type: 'json', default: '[]', description: 'JSON array of update types to receive' },
                        { displayName: 'Drop Pending Updates', name: 'drop_pending_updates', type: 'boolean', default: false, description: 'Drop all pending updates' },
                        { displayName: 'Secret Token', name: 'secret_token', type: 'string', default: '', description: 'Secret token for X-Telegram-Bot-Api-Secret-Token header (1-256 characters)' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'invoiceAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['payment'], operation: ['sendInvoice', 'createInvoiceLink'] } },
                    options: [
                        { displayName: 'Max Tip Amount', name: 'max_tip_amount', type: 'number', default: 0, description: 'Maximum accepted tip amount' },
                        { displayName: 'Suggested Tip Amounts (JSON)', name: 'suggested_tip_amounts', type: 'json', default: '[]', description: 'JSON array of suggested tip amounts' },
                        { displayName: 'Photo URL', name: 'photo_url', type: 'string', default: '', description: 'URL of the product photo' },
                        { displayName: 'Photo Size', name: 'photo_size', type: 'number', default: 0, description: 'Photo size in bytes' },
                        { displayName: 'Photo Width', name: 'photo_width', type: 'number', default: 0, description: 'Photo width' },
                        { displayName: 'Photo Height', name: 'photo_height', type: 'number', default: 0, description: 'Photo height' },
                        { displayName: 'Need Name', name: 'need_name', type: 'boolean', default: false, description: 'Request user full name' },
                        { displayName: 'Need Phone Number', name: 'need_phone_number', type: 'boolean', default: false, description: 'Request user phone number' },
                        { displayName: 'Need Email', name: 'need_email', type: 'boolean', default: false, description: 'Request user email' },
                        { displayName: 'Need Shipping Address', name: 'need_shipping_address', type: 'boolean', default: false, description: 'Request user shipping address' },
                        { displayName: 'Send Phone Number To Provider', name: 'send_phone_number_to_provider', type: 'boolean', default: false, description: 'Send phone number to provider' },
                        { displayName: 'Send Email To Provider', name: 'send_email_to_provider', type: 'boolean', default: false, description: 'Send email to provider' },
                        { displayName: 'Is Flexible', name: 'is_flexible', type: 'boolean', default: false, description: 'Whether the final price depends on the shipping method' },
                        { displayName: 'Disable Notification', name: 'disable_notification', type: 'boolean', default: false, description: 'Send silently' },
                        { displayName: 'Start Parameter', name: 'start_parameter', type: 'string', default: '', description: 'Deep-linking parameter' },
                        { displayName: 'Provider Data (JSON)', name: 'provider_data', type: 'json', default: '{}', description: 'JSON data about the invoice for the payment provider' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'forumAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['forum'], operation: ['createForumTopic'] } },
                    options: [
                        { displayName: 'Icon Color', name: 'icon_color', type: 'number', default: 0, description: 'Color of the topic icon in RGB format' },
                        { displayName: 'Icon Custom Emoji ID', name: 'icon_custom_emoji_id', type: 'string', default: '', description: 'Custom emoji identifier for the topic icon' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'editForumAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['forum'], operation: ['editForumTopic'] } },
                    options: [
                        { displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New topic name' },
                        { displayName: 'Icon Custom Emoji ID', name: 'icon_custom_emoji_id', type: 'string', default: '', description: 'New custom emoji identifier for the topic icon' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'updatesAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['update'], operation: ['getUpdates'] } },
                    options: [
                        { displayName: 'Offset', name: 'offset', type: 'number', default: 0, description: 'Identifier of the first update to be returned' },
                        { displayName: 'Limit', name: 'limit', type: 'number', default: 100, description: 'Max number of updates (1-100)' },
                        { displayName: 'Timeout', name: 'timeout', type: 'number', default: 0, description: 'Timeout in seconds for long polling' },
                        { displayName: 'Allowed Updates (JSON)', name: 'allowed_updates', type: 'json', default: '[]', description: 'JSON array of update types to receive' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'botCommandsAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyCommands', 'deleteMyCommands', 'getMyCommands'] } },
                    options: [
                        { displayName: 'Scope (JSON)', name: 'scope', type: 'json', default: '{}', description: 'JSON object describing the scope of bot commands (BotCommandScope)' },
                        { displayName: 'Language Code', name: 'language_code', type: 'string', default: '', description: 'Two-letter ISO 639-1 language code' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'botNameAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyName', 'getMyName'] } },
                    options: [
                        { displayName: 'Language Code', name: 'language_code', type: 'string', default: '', description: 'Two-letter ISO 639-1 language code' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'botDescriptionAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['bot'], operation: ['setMyDescription', 'getMyDescription', 'setMyShortDescription', 'getMyShortDescription'] } },
                    options: [
                        { displayName: 'Language Code', name: 'language_code', type: 'string', default: '', description: 'Two-letter ISO 639-1 language code' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'chatPermissionsAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatPermissions'] } },
                    options: [
                        { displayName: 'Use Independent Chat Permissions', name: 'use_independent_chat_permissions', type: 'boolean', default: false, description: 'Use independent chat permissions' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'menuButtonAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['chat'], operation: ['setChatMenuButton', 'getChatMenuButton'] } },
                    options: [
                        { displayName: 'Chat ID', name: 'chat_id', type: 'string', default: '', description: 'Unique identifier for the target private chat' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'shippingAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['payment'], operation: ['answerShippingQuery'] } },
                    options: [
                        { displayName: 'Shipping Options (JSON)', name: 'shipping_options', type: 'json', default: '[]', description: 'JSON array of ShippingOption objects' },
                        { displayName: 'Error Message', name: 'error_message', type: 'string', default: '', description: 'Error message if ok is false' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'preCheckoutAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['payment'], operation: ['answerPreCheckoutQuery'] } },
                    options: [
                        { displayName: 'Error Message', name: 'error_message', type: 'string', default: '', description: 'Error message if ok is false' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'gameScoreAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['game'], operation: ['setGameScore', 'getGameHighScores'] } },
                    options: [
                        { displayName: 'Chat ID', name: 'chat_id', type: 'string', default: '', description: 'Required if inline_message_id is not specified' },
                        { displayName: 'Message ID', name: 'message_id', type: 'number', default: 0, description: 'Required if inline_message_id is not specified' },
                        { displayName: 'Inline Message ID', name: 'inline_message_id', type: 'string', default: '', description: 'Required if chat_id and message_id are not specified' },
                        { displayName: 'Force', name: 'force', type: 'boolean', default: false, description: 'Set score even if new score is not greater (setGameScore only)' },
                        { displayName: 'Disable Edit Message', name: 'disable_edit_message', type: 'boolean', default: false, description: 'Do not edit the game message (setGameScore only)' },
                    ],
                },
                {
                    displayName: 'Additional Fields',
                    name: 'stickerSetAdditionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: { show: { resource: ['sticker'], operation: ['createNewStickerSet'] } },
                    options: [
                        { displayName: 'Sticker Type', name: 'sticker_type', type: 'options', default: 'regular', options: [{ name: 'Regular', value: 'regular' }, { name: 'Mask', value: 'mask' }, { name: 'Custom Emoji', value: 'custom_emoji' }], description: 'Type of stickers in the set' },
                        { displayName: 'Needs Repainting', name: 'needs_repainting', type: 'boolean', default: false, description: 'Whether the sticker set needs repainting' },
                    ],
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
                let responseData;

                // Helper: resolve file value for media send operations
                const getFileValue = (paramName) => {
                    const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                    if (fileSource === 'fileId') return this.getNodeParameter('fileId', i, '');
                    if (fileSource === 'url') return this.getNodeParameter('fileUrl', i, '');
                    return null; // binary handled separately
                };

                const getBinaryUpload = async (paramName, binaryPropParam) => {
                    const binaryPropertyName = this.getNodeParameter(binaryPropParam || 'binaryPropertyName', i, 'data');
                    const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                    const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                    return { value: buffer, options: { filename: binaryData.fileName || 'file', contentType: binaryData.mimeType } };
                };

                if (resource === 'message') {
                    const chat_id = ['sendChatAction','sendMessage','sendPhoto','sendAudio','sendDocument','sendVideo','sendAnimation','sendVoice','sendVideoNote','sendMediaGroup','sendLocation','sendVenue','sendContact','sendPoll','sendDice','forwardMessage','copyMessage','editMessageText','editMessageCaption','editMessageMedia','editMessageReplyMarkup','editMessageLiveLocation','stopMessageLiveLocation','stopPoll','deleteMessage','deleteMessages'].includes(operation) ? this.getNodeParameter('chat_id', i) : undefined;

                    if (operation === 'sendMessage') {
                        const body = { chat_id, text: this.getNodeParameter('text', i) };
                        const pm = this.getNodeParameter('parse_mode', i, 'none');
                        if (pm !== 'none') body.parse_mode = pm;
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        const af = this.getNodeParameter('additionalFields', i, {});
                        Object.assign(body, af);
                        if (af.disable_web_page_preview) { body.link_preview_options = { is_disabled: true }; delete body.disable_web_page_preview; }
                        responseData = await telegramApiRequest.call(this, this, 'sendMessage', body);
                    }

                    else if (operation === 'forwardMessage') {
                        const body = { chat_id, from_chat_id: this.getNodeParameter('from_chat_id', i), message_id: this.getNodeParameter('message_id', i) };
                        Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'forwardMessage', body);
                    }
                    else if (operation === 'copyMessage') {
                        const body = { chat_id, from_chat_id: this.getNodeParameter('from_chat_id', i), message_id: this.getNodeParameter('message_id', i) };
                        const pm = this.getNodeParameter('parse_mode', i, 'none');
                        if (pm !== 'none') body.parse_mode = pm;
                        Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'copyMessage', body);
                    }
                    else if (operation === 'sendPhoto') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('photo', 'binaryPropertyName');
                            const formData = { chat_id, photo: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendPhoto', formData);
                        } else {
                            const body = { chat_id, photo: getFileValue('photo') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendPhoto', body);
                        }
                    }
                    else if (operation === 'sendAudio') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('audio', 'binaryPropertyName');
                            const formData = { chat_id, audio: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendAudio', formData);
                        } else {
                            const body = { chat_id, audio: getFileValue('audio') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendAudio', body);
                        }
                    }
                    else if (operation === 'sendDocument') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('document', 'binaryPropertyName');
                            const formData = { chat_id, document: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendDocument', formData);
                        } else {
                            const body = { chat_id, document: getFileValue('document') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendDocument', body);
                        }
                    }
                    else if (operation === 'sendVideo') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('video', 'binaryPropertyName');
                            const formData = { chat_id, video: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendVideo', formData);
                        } else {
                            const body = { chat_id, video: getFileValue('video') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendVideo', body);
                        }
                    }
                    else if (operation === 'sendAnimation') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('animation', 'binaryPropertyName');
                            const formData = { chat_id, animation: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendAnimation', formData);
                        } else {
                            const body = { chat_id, animation: getFileValue('animation') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendAnimation', body);
                        }
                    }
                    else if (operation === 'sendVoice') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('voice', 'binaryPropertyName');
                            const formData = { chat_id, voice: fileData };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) formData.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendVoice', formData);
                        } else {
                            const body = { chat_id, voice: getFileValue('voice') };
                            const caption = this.getNodeParameter('caption', i, '');
                            if (caption) body.caption = caption;
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendVoice', body);
                        }
                    }
                    else if (operation === 'sendVideoNote') {
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const fileData = await getBinaryUpload('video_note', 'binaryPropertyName');
                            const formData = { chat_id, video_note: fileData };
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') formData.parse_mode = pm;
                            const af = this.getNodeParameter('additionalFields', i, {});
                            Object.assign(formData, af);
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendVideoNote', formData);
                        } else {
                            const body = { chat_id, video_note: getFileValue('video_note') };
                            const pm = this.getNodeParameter('parse_mode', i, 'none');
                            if (pm !== 'none') body.parse_mode = pm;
                            const rm = this.getNodeParameter('reply_markup', i, '');
                            if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                            Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                            responseData = await telegramApiRequest.call(this, this, 'sendVideoNote', body);
                        }
                    }
                    else if (operation === 'sendMediaGroup') {
                        const body = { chat_id, media: JSON.parse(this.getNodeParameter('media_group', i, '[]')) };
                        Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'sendMediaGroup', body);
                    }
                    else if (operation === 'sendLocation') {
                        const body = { chat_id, latitude: this.getNodeParameter('latitude', i), longitude: this.getNodeParameter('longitude', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        Object.assign(body, this.getNodeParameter('locationAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'sendLocation', body);
                    }
                    else if (operation === 'sendVenue') {
                        const body = { chat_id, latitude: this.getNodeParameter('latitude', i), longitude: this.getNodeParameter('longitude', i), title: this.getNodeParameter('venue_title', i), address: this.getNodeParameter('venue_address', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        Object.assign(body, this.getNodeParameter('venueAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'sendVenue', body);
                    }
                    else if (operation === 'sendContact') {
                        const body = { chat_id, phone_number: this.getNodeParameter('phone_number', i), first_name: this.getNodeParameter('first_name', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        Object.assign(body, this.getNodeParameter('contactAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'sendContact', body);
                    }
                    else if (operation === 'sendPoll') {
                        const body = { chat_id, question: this.getNodeParameter('question', i), options: JSON.parse(this.getNodeParameter('poll_options', i, '[]')) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        Object.assign(body, this.getNodeParameter('pollAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'sendPoll', body);
                    }
                    else if (operation === 'sendDice') {
                        const body = { chat_id, emoji: this.getNodeParameter('emoji', i, '🎲') };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        responseData = await telegramApiRequest.call(this, this, 'sendDice', body);
                    }
                    else if (operation === 'sendChatAction') {
                        responseData = await telegramApiRequest.call(this, this, 'sendChatAction', { chat_id, action: this.getNodeParameter('action', i) });
                    }
                    else if (operation === 'editMessageText') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i), text: this.getNodeParameter('text', i) };
                        const pm = this.getNodeParameter('parse_mode', i, 'none');
                        if (pm !== 'none') body.parse_mode = pm;
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'editMessageText', body);
                    }
                    else if (operation === 'editMessageCaption') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i), caption: this.getNodeParameter('caption', i, '') };
                        const pm = this.getNodeParameter('parse_mode', i, 'none');
                        if (pm !== 'none') body.parse_mode = pm;
                        Object.assign(body, this.getNodeParameter('additionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'editMessageCaption', body);
                    }
                    else if (operation === 'editMessageMedia') {
                        const mediaJson = this.getNodeParameter('edit_media', i, '{}');
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i), media: typeof mediaJson === 'string' ? JSON.parse(mediaJson) : mediaJson };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        responseData = await telegramApiRequest.call(this, this, 'editMessageMedia', body);
                    }
                    else if (operation === 'editMessageReplyMarkup') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        responseData = await telegramApiRequest.call(this, this, 'editMessageReplyMarkup', body);
                    }
                    else if (operation === 'editMessageLiveLocation') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i), latitude: this.getNodeParameter('latitude', i), longitude: this.getNodeParameter('longitude', i) };
                        Object.assign(body, this.getNodeParameter('locationAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'editMessageLiveLocation', body);
                    }
                    else if (operation === 'stopMessageLiveLocation') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        responseData = await telegramApiRequest.call(this, this, 'stopMessageLiveLocation', body);
                    }
                    else if (operation === 'stopPoll') {
                        const body = { chat_id, message_id: this.getNodeParameter('message_id', i) };
                        const rm = this.getNodeParameter('reply_markup', i, '');
                        if (rm) body.reply_markup = typeof rm === 'string' ? JSON.parse(rm) : rm;
                        responseData = await telegramApiRequest.call(this, this, 'stopPoll', body);
                    }
                    else if (operation === 'deleteMessage') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteMessage', { chat_id, message_id: this.getNodeParameter('message_id', i) });
                    }
                    else if (operation === 'deleteMessages') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteMessages', { chat_id, message_ids: JSON.parse(this.getNodeParameter('message_ids', i, '[]')) });
                    }
                }

                else if (resource === 'chat') {
                    const chat_id = this.getNodeParameter('chat_id', i);

                    if (operation === 'getChat') {
                        responseData = await telegramApiRequest.call(this, this, 'getChat', { chat_id });
                    }
                    if (operation === 'getChatAdministrators') {
                        responseData = await telegramApiRequest.call(this, this, 'getChatAdministrators', { chat_id });
                    }
                    if (operation === 'getChatMemberCount') {
                        responseData = await telegramApiRequest.call(this, this, 'getChatMemberCount', { chat_id });
                    }
                    if (operation === 'exportChatInviteLink') {
                        responseData = await telegramApiRequest.call(this, this, 'exportChatInviteLink', { chat_id });
                    }
                    if (operation === 'deleteChatPhoto') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteChatPhoto', { chat_id });
                    }
                    if (operation === 'unpinAllChatMessages') {
                        responseData = await telegramApiRequest.call(this, this, 'unpinAllChatMessages', { chat_id });
                    }
                    if (operation === 'leaveChat') {
                        responseData = await telegramApiRequest.call(this, this, 'leaveChat', { chat_id });
                    }
                    if (operation === 'deleteChatStickerSet') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteChatStickerSet', { chat_id });
                    }
                    else if (operation === 'getChatMember') {
                        responseData = await telegramApiRequest.call(this, this, 'getChatMember', { chat_id, user_id: this.getNodeParameter('user_id', i) });
                    }
                    else if (operation === 'banChatMember') {
                        const body = { chat_id, user_id: this.getNodeParameter('user_id', i) };
                        Object.assign(body, this.getNodeParameter('banAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'banChatMember', body);
                    }
                    else if (operation === 'unbanChatMember') {
                        const body = { chat_id, user_id: this.getNodeParameter('user_id', i) };
                        Object.assign(body, this.getNodeParameter('unbanAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'unbanChatMember', body);
                    }
                    else if (operation === 'restrictChatMember') {
                        const permissionsRaw = this.getNodeParameter('permissions', i, '{}');
                        const body = { chat_id, user_id: this.getNodeParameter('user_id', i), permissions: typeof permissionsRaw === 'string' ? JSON.parse(permissionsRaw) : permissionsRaw };
                        Object.assign(body, this.getNodeParameter('restrictAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'restrictChatMember', body);
                    }
                    else if (operation === 'promoteChatMember') {
                        const body = { chat_id, user_id: this.getNodeParameter('user_id', i) };
                        Object.assign(body, this.getNodeParameter('promoteAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'promoteChatMember', body);
                    }
                    else if (operation === 'setChatAdministratorCustomTitle') {
                        responseData = await telegramApiRequest.call(this, this, 'setChatAdministratorCustomTitle', { chat_id, user_id: this.getNodeParameter('user_id', i), custom_title: this.getNodeParameter('custom_title', i) });
                    }
                    else if (operation === 'setChatPermissions') {
                        const permissionsRaw = this.getNodeParameter('permissions', i, '{}');
                        const body = { chat_id, permissions: typeof permissionsRaw === 'string' ? JSON.parse(permissionsRaw) : permissionsRaw };
                        Object.assign(body, this.getNodeParameter('chatPermissionsAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'setChatPermissions', body);
                    }
                    else if (operation === 'createChatInviteLink') {
                        const body = { chat_id };
                        Object.assign(body, this.getNodeParameter('inviteLinkAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'createChatInviteLink', body);
                    }
                    else if (operation === 'editChatInviteLink') {
                        const body = { chat_id, invite_link: this.getNodeParameter('invite_link', i) };
                        Object.assign(body, this.getNodeParameter('inviteLinkAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'editChatInviteLink', body);
                    }
                    else if (operation === 'revokeChatInviteLink') {
                        responseData = await telegramApiRequest.call(this, this, 'revokeChatInviteLink', { chat_id, invite_link: this.getNodeParameter('invite_link', i) });
                    }
                    else if (operation === 'approveChatJoinRequest') {
                        responseData = await telegramApiRequest.call(this, this, 'approveChatJoinRequest', { chat_id, user_id: this.getNodeParameter('user_id', i) });
                    }
                    else if (operation === 'declineChatJoinRequest') {
                        responseData = await telegramApiRequest.call(this, this, 'declineChatJoinRequest', { chat_id, user_id: this.getNodeParameter('user_id', i) });
                    }
                    else if (operation === 'setChatPhoto') {
                        const binaryPropertyName = this.getNodeParameter('chat_photo_binary', i, 'data');
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        const formData = { chat_id, photo: { value: buffer, options: { filename: binaryData.fileName || 'photo.jpg', contentType: binaryData.mimeType } } };
                        responseData = await telegramApiRequestMultipart.call(this, this, 'setChatPhoto', formData);
                    }
                    else if (operation === 'setChatTitle') {
                        responseData = await telegramApiRequest.call(this, this, 'setChatTitle', { chat_id, title: this.getNodeParameter('chat_title', i) });
                    }
                    else if (operation === 'setChatDescription') {
                        responseData = await telegramApiRequest.call(this, this, 'setChatDescription', { chat_id, description: this.getNodeParameter('chat_description', i, '') });
                    }
                    else if (operation === 'pinChatMessage') {
                        responseData = await telegramApiRequest.call(this, this, 'pinChatMessage', { chat_id, message_id: this.getNodeParameter('message_id', i) });
                    }
                    else if (operation === 'unpinChatMessage') {
                        responseData = await telegramApiRequest.call(this, this, 'unpinChatMessage', { chat_id, message_id: this.getNodeParameter('message_id', i) });
                    }
                    else if (operation === 'setChatMenuButton') {
                        const body = {};
                        const menuBtn = this.getNodeParameter('menu_button', i, '{}');
                        body.menu_button = typeof menuBtn === 'string' ? JSON.parse(menuBtn) : menuBtn;
                        const af = this.getNodeParameter('menuButtonAdditionalFields', i, {});
                        if (af.chat_id) body.chat_id = af.chat_id;
                        responseData = await telegramApiRequest.call(this, this, 'setChatMenuButton', body);
                    }
                    else if (operation === 'getChatMenuButton') {
                        const body = {};
                        const af = this.getNodeParameter('menuButtonAdditionalFields', i, {});
                        if (af.chat_id) body.chat_id = af.chat_id;
                        responseData = await telegramApiRequest.call(this, this, 'getChatMenuButton', body);
                    }
                    else if (operation === 'setChatStickerSet') {
                        responseData = await telegramApiRequest.call(this, this, 'setChatStickerSet', { chat_id, sticker_set_name: this.getNodeParameter('sticker_set_name', i) });
                    }
                }

                else if (resource === 'bot') {
                    if (operation === 'getMe') {
                        responseData = await telegramApiRequest.call(this, this, 'getMe', {});
                    }
                    if (operation === 'logOut') {
                        responseData = await telegramApiRequest.call(this, this, 'logOut', {});
                    }
                    if (operation === 'close') {
                        responseData = await telegramApiRequest.call(this, this, 'close', {});
                    }
                    else if (operation === 'getMyCommands') {
                        const body = {};
                        const af = this.getNodeParameter('botCommandsAdditionalFields', i, {});
                        if (af.scope) body.scope = typeof af.scope === 'string' ? JSON.parse(af.scope) : af.scope;
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'getMyCommands', body);
                    }
                    else if (operation === 'setMyCommands') {
                        const cmds = this.getNodeParameter('bot_commands', i, '[]');
                        const body = { commands: typeof cmds === 'string' ? JSON.parse(cmds) : cmds };
                        const af = this.getNodeParameter('botCommandsAdditionalFields', i, {});
                        if (af.scope) body.scope = typeof af.scope === 'string' ? JSON.parse(af.scope) : af.scope;
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'setMyCommands', body);
                    }
                    else if (operation === 'deleteMyCommands') {
                        const body = {};
                        const af = this.getNodeParameter('botCommandsAdditionalFields', i, {});
                        if (af.scope) body.scope = typeof af.scope === 'string' ? JSON.parse(af.scope) : af.scope;
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'deleteMyCommands', body);
                    }
                    else if (operation === 'getMyName') {
                        const body = {};
                        const af = this.getNodeParameter('botNameAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'getMyName', body);
                    }
                    else if (operation === 'setMyName') {
                        const body = { name: this.getNodeParameter('bot_name', i) };
                        const af = this.getNodeParameter('botNameAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'setMyName', body);
                    }
                    else if (operation === 'getMyDescription') {
                        const body = {};
                        const af = this.getNodeParameter('botDescriptionAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'getMyDescription', body);
                    }
                    else if (operation === 'setMyDescription') {
                        const body = { description: this.getNodeParameter('bot_description', i) };
                        const af = this.getNodeParameter('botDescriptionAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'setMyDescription', body);
                    }
                    else if (operation === 'getMyShortDescription') {
                        const body = {};
                        const af = this.getNodeParameter('botDescriptionAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'getMyShortDescription', body);
                    }
                    else if (operation === 'setMyShortDescription') {
                        const body = { short_description: this.getNodeParameter('bot_short_description', i) };
                        const af = this.getNodeParameter('botDescriptionAdditionalFields', i, {});
                        if (af.language_code) body.language_code = af.language_code;
                        responseData = await telegramApiRequest.call(this, this, 'setMyShortDescription', body);
                    }
                }

                else if (resource === 'webhook') {
                    if (operation === 'setWebhook') {
                        const body = { url: this.getNodeParameter('webhook_url', i) };
                        Object.assign(body, this.getNodeParameter('webhookAdditionalFields', i, {}));
                        if (body.allowed_updates && typeof body.allowed_updates === 'string') body.allowed_updates = JSON.parse(body.allowed_updates);
                        responseData = await telegramApiRequest.call(this, this, 'setWebhook', body);
                    }
                    else if (operation === 'deleteWebhook') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteWebhook', {});
                    }
                    else if (operation === 'getWebhookInfo') {
                        responseData = await telegramApiRequest.call(this, this, 'getWebhookInfo', {});
                    }
                }

                else if (resource === 'file') {
                    if (operation === 'getFile') {
                        responseData = await telegramApiRequest.call(this, this, 'getFile', { file_id: this.getNodeParameter('file_id', i) });
                    }
                }

                else if (resource === 'sticker') {
                    if (operation === 'sendSticker') {
                        const chat_id = this.getNodeParameter('chat_id', i);
                        const fileSource = this.getNodeParameter('fileSource', i, 'fileId');
                        if (fileSource === 'binary') {
                            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
                            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                            const formData = { chat_id, sticker: { value: buffer, options: { filename: binaryData.fileName || 'sticker', contentType: binaryData.mimeType } } };
                            responseData = await telegramApiRequestMultipart.call(this, this, 'sendSticker', formData);
                        } else if (fileSource === 'url') {
                            responseData = await telegramApiRequest.call(this, this, 'sendSticker', { chat_id, sticker: this.getNodeParameter('fileUrl', i) });
                        } else {
                            responseData = await telegramApiRequest.call(this, this, 'sendSticker', { chat_id, sticker: this.getNodeParameter('sticker_file_id', i) });
                        }
                    }
                    else if (operation === 'getStickerSet') {
                        responseData = await telegramApiRequest.call(this, this, 'getStickerSet', { name: this.getNodeParameter('sticker_set_name', i) });
                    }
                    else if (operation === 'getCustomEmojiStickers') {
                        const ids = this.getNodeParameter('custom_emoji_ids', i, '[]');
                        responseData = await telegramApiRequest.call(this, this, 'getCustomEmojiStickers', { custom_emoji_ids: typeof ids === 'string' ? JSON.parse(ids) : ids });
                    }
                    else if (operation === 'uploadStickerFile') {
                        const binaryPropertyName = this.getNodeParameter('sticker_binary', i, 'data');
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        const formData = { user_id: this.getNodeParameter('user_id', i), sticker: { value: buffer, options: { filename: binaryData.fileName || 'sticker', contentType: binaryData.mimeType } }, sticker_format: this.getNodeParameter('sticker_format', i) };
                        responseData = await telegramApiRequestMultipart.call(this, this, 'uploadStickerFile', formData);
                    }
                    else if (operation === 'createNewStickerSet') {
                        const stickersRaw = this.getNodeParameter('stickers_json', i, '[]');
                        const body = { user_id: this.getNodeParameter('user_id', i), name: this.getNodeParameter('sticker_set_name', i), title: this.getNodeParameter('sticker_set_title', i), stickers: typeof stickersRaw === 'string' ? JSON.parse(stickersRaw) : stickersRaw };
                        Object.assign(body, this.getNodeParameter('stickerSetAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'createNewStickerSet', body);
                    }
                    else if (operation === 'addStickerToSet') {
                        const stickersRaw = this.getNodeParameter('stickers_json', i, '[]');
                        const stickersArr = typeof stickersRaw === 'string' ? JSON.parse(stickersRaw) : stickersRaw;
                        const body = { user_id: this.getNodeParameter('user_id', i), name: this.getNodeParameter('sticker_set_name', i), sticker: Array.isArray(stickersArr) ? stickersArr[0] : stickersArr };
                        responseData = await telegramApiRequest.call(this, this, 'addStickerToSet', body);
                    }
                    else if (operation === 'setStickerPositionInSet') {
                        responseData = await telegramApiRequest.call(this, this, 'setStickerPositionInSet', { sticker: this.getNodeParameter('sticker_delete_id', i), position: this.getNodeParameter('sticker_position', i) });
                    }
                    else if (operation === 'deleteStickerFromSet') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteStickerFromSet', { sticker: this.getNodeParameter('sticker_delete_id', i) });
                    }
                    else if (operation === 'deleteStickerSet') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteStickerSet', { name: this.getNodeParameter('sticker_set_name', i) });
                    }
                    else if (operation === 'setStickerSetThumbnail') {
                        const binaryPropertyName = this.getNodeParameter('sticker_binary', i, 'data');
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        const formData = { name: this.getNodeParameter('sticker_set_name', i), user_id: this.getNodeParameter('user_id', i), thumbnail: { value: buffer, options: { filename: binaryData.fileName || 'thumb', contentType: binaryData.mimeType } }, format: this.getNodeParameter('sticker_format', i) };
                        responseData = await telegramApiRequestMultipart.call(this, this, 'setStickerSetThumbnail', formData);
                    }
                }

                else if (resource === 'inline') {
                    if (operation === 'answerInlineQuery') {
                        const resultsRaw = this.getNodeParameter('inline_results', i, '[]');
                        responseData = await telegramApiRequest.call(this, this, 'answerInlineQuery', { inline_query_id: this.getNodeParameter('inline_query_id', i), results: typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : resultsRaw });
                    }
                    else if (operation === 'answerWebAppQuery') {
                        const resultRaw = this.getNodeParameter('web_app_result', i, '{}');
                        responseData = await telegramApiRequest.call(this, this, 'answerWebAppQuery', { web_app_query_id: this.getNodeParameter('web_app_query_id', i), result: typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw });
                    }
                }

                else if (resource === 'payment') {
                    if (operation === 'sendInvoice') {
                        const pricesRaw = this.getNodeParameter('invoice_prices', i, '[]');
                        const body = { chat_id: this.getNodeParameter('chat_id', i), title: this.getNodeParameter('invoice_title', i), description: this.getNodeParameter('invoice_description', i), payload: this.getNodeParameter('invoice_payload', i), provider_token: this.getNodeParameter('invoice_provider_token', i), currency: this.getNodeParameter('invoice_currency', i), prices: typeof pricesRaw === 'string' ? JSON.parse(pricesRaw) : pricesRaw };
                        const af = this.getNodeParameter('invoiceAdditionalFields', i, {});
                        if (af.suggested_tip_amounts && typeof af.suggested_tip_amounts === 'string') af.suggested_tip_amounts = JSON.parse(af.suggested_tip_amounts);
                        if (af.provider_data && typeof af.provider_data === 'string') af.provider_data = JSON.parse(af.provider_data);
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'sendInvoice', body);
                    }
                    else if (operation === 'createInvoiceLink') {
                        const pricesRaw = this.getNodeParameter('invoice_prices', i, '[]');
                        const body = { title: this.getNodeParameter('invoice_title', i), description: this.getNodeParameter('invoice_description', i), payload: this.getNodeParameter('invoice_payload', i), provider_token: this.getNodeParameter('invoice_provider_token', i), currency: this.getNodeParameter('invoice_currency', i), prices: typeof pricesRaw === 'string' ? JSON.parse(pricesRaw) : pricesRaw };
                        const af = this.getNodeParameter('invoiceAdditionalFields', i, {});
                        if (af.suggested_tip_amounts && typeof af.suggested_tip_amounts === 'string') af.suggested_tip_amounts = JSON.parse(af.suggested_tip_amounts);
                        if (af.provider_data && typeof af.provider_data === 'string') af.provider_data = JSON.parse(af.provider_data);
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'createInvoiceLink', body);
                    }
                    else if (operation === 'answerShippingQuery') {
                        const body = { shipping_query_id: this.getNodeParameter('shipping_query_id', i), ok: this.getNodeParameter('shipping_ok', i) };
                        const af = this.getNodeParameter('shippingAdditionalFields', i, {});
                        if (af.shipping_options && typeof af.shipping_options === 'string') af.shipping_options = JSON.parse(af.shipping_options);
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'answerShippingQuery', body);
                    }
                    else if (operation === 'answerPreCheckoutQuery') {
                        const body = { pre_checkout_query_id: this.getNodeParameter('pre_checkout_query_id', i), ok: this.getNodeParameter('pre_checkout_ok', i) };
                        Object.assign(body, this.getNodeParameter('preCheckoutAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'answerPreCheckoutQuery', body);
                    }
                }

                else if (resource === 'forum') {
                    const chat_id = this.getNodeParameter('chat_id', i);
                    if (operation === 'createForumTopic') {
                        const body = { chat_id, name: this.getNodeParameter('forum_name', i) };
                        Object.assign(body, this.getNodeParameter('forumAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'createForumTopic', body);
                    }
                    else if (operation === 'editForumTopic') {
                        const body = { chat_id, message_thread_id: this.getNodeParameter('message_thread_id', i) };
                        Object.assign(body, this.getNodeParameter('editForumAdditionalFields', i, {}));
                        responseData = await telegramApiRequest.call(this, this, 'editForumTopic', body);
                    }
                    else if (operation === 'closeForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'closeForumTopic', { chat_id, message_thread_id: this.getNodeParameter('message_thread_id', i) });
                    }
                    else if (operation === 'reopenForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'reopenForumTopic', { chat_id, message_thread_id: this.getNodeParameter('message_thread_id', i) });
                    }
                    else if (operation === 'deleteForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'deleteForumTopic', { chat_id, message_thread_id: this.getNodeParameter('message_thread_id', i) });
                    }
                    else if (operation === 'unpinAllForumTopicMessages') {
                        responseData = await telegramApiRequest.call(this, this, 'unpinAllForumTopicMessages', { chat_id, message_thread_id: this.getNodeParameter('message_thread_id', i) });
                    }
                    else if (operation === 'editGeneralForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'editGeneralForumTopic', { chat_id, name: this.getNodeParameter('general_forum_name', i) });
                    }
                    else if (operation === 'closeGeneralForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'closeGeneralForumTopic', { chat_id });
                    }
                    else if (operation === 'reopenGeneralForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'reopenGeneralForumTopic', { chat_id });
                    }
                    else if (operation === 'hideGeneralForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'hideGeneralForumTopic', { chat_id });
                    }
                    else if (operation === 'unhideGeneralForumTopic') {
                        responseData = await telegramApiRequest.call(this, this, 'unhideGeneralForumTopic', { chat_id });
                    }
                }

                else if (resource === 'game') {
                    if (operation === 'sendGame') {
                        responseData = await telegramApiRequest.call(this, this, 'sendGame', { chat_id: this.getNodeParameter('chat_id', i), game_short_name: this.getNodeParameter('game_short_name', i) });
                    }
                    else if (operation === 'setGameScore') {
                        const body = { user_id: this.getNodeParameter('user_id', i), score: this.getNodeParameter('game_score', i) };
                        const af = this.getNodeParameter('gameScoreAdditionalFields', i, {});
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'setGameScore', body);
                    }
                    else if (operation === 'getGameHighScores') {
                        const body = { user_id: this.getNodeParameter('user_id', i) };
                        const af = this.getNodeParameter('gameScoreAdditionalFields', i, {});
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'getGameHighScores', body);
                    }
                }

                else if (resource === 'update') {
                    if (operation === 'getUpdates') {
                        const body = {};
                        const af = this.getNodeParameter('updatesAdditionalFields', i, {});
                        if (af.allowed_updates && typeof af.allowed_updates === 'string') af.allowed_updates = JSON.parse(af.allowed_updates);
                        Object.assign(body, af);
                        responseData = await telegramApiRequest.call(this, this, 'getUpdates', body);
                    }
                }

                if (responseData) {
                    const result = responseData.result !== undefined ? responseData.result : responseData;
                    if (Array.isArray(result)) {
                        returnData.push(...result.map(item => ({ json: item })));
                    } else {
                        returnData.push({ json: typeof result === 'object' ? result : { result } });
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.TelegramBot = TelegramBot;
