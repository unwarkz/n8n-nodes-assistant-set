"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBotApi = void 0;

class TelegramBotApi {
    constructor() {
        this.name = 'telegramBotApi';
        this.displayName = 'Telegram Bot API';
        this.documentationUrl = 'https://core.telegram.org/bots/api';
        this.properties = [
            {
                displayName: 'Bot Token',
                name: 'botToken',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'The bot token obtained from @BotFather on Telegram',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.telegram.org',
                description: 'Base URL for the Telegram Bot API (change only if using a local Bot API server)',
            },
        ];
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl || "https://api.telegram.org"}}',
                url: '=/bot{{$credentials.botToken}}/getMe',
                method: 'GET',
            },
        };
    }
}
exports.TelegramBotApi = TelegramBotApi;
