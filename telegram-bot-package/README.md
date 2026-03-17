# @unwarkz/n8n-nodes-telegram-bot

N8N community node for **Telegram Bot API** — full coverage of all Bot API methods with AI Agent tools integration.

## Features

### Telegram Bot Node
Full CRUD node covering the complete [Telegram Bot API](https://core.telegram.org/bots/api):

- **Messages**: sendMessage, forwardMessage, copyMessage, sendPhoto, sendAudio, sendDocument, sendVideo, sendAnimation, sendVoice, sendVideoNote, sendMediaGroup, sendLocation, sendVenue, sendContact, sendPoll, sendDice, sendChatAction, editMessageText, editMessageCaption, editMessageMedia, editMessageReplyMarkup, editMessageLiveLocation, stopMessageLiveLocation, stopPoll, deleteMessage, deleteMessages
- **Chat Management**: getChat, getChatAdministrators, getChatMemberCount, getChatMember, banChatMember, unbanChatMember, restrictChatMember, promoteChatMember, setChatAdministratorCustomTitle, setChatPermissions, exportChatInviteLink, createChatInviteLink, editChatInviteLink, revokeChatInviteLink, approveChatJoinRequest, declineChatJoinRequest, setChatPhoto, deleteChatPhoto, setChatTitle, setChatDescription, pinChatMessage, unpinChatMessage, unpinAllChatMessages, leaveChat, setChatMenuButton, getChatMenuButton, setChatStickerSet, deleteChatStickerSet
- **Bot Info**: getMe, logOut, close, getMyCommands, setMyCommands, deleteMyCommands, getMyName, setMyName, getMyDescription, setMyDescription, getMyShortDescription, setMyShortDescription
- **Webhooks**: setWebhook, deleteWebhook, getWebhookInfo
- **Files**: getFile (download with binary data support)
- **Stickers**: sendSticker, getStickerSet, getCustomEmojiStickers, uploadStickerFile, createNewStickerSet, addStickerToSet, setStickerPositionInSet, deleteStickerFromSet, deleteStickerSet, setStickerSetThumbnail
- **Inline**: answerInlineQuery, answerWebAppQuery
- **Payments**: sendInvoice, createInvoiceLink, answerShippingQuery, answerPreCheckoutQuery
- **Forum Topics**: createForumTopic, editForumTopic, closeForumTopic, reopenForumTopic, deleteForumTopic, unpinAllForumTopicMessages, editGeneralForumTopic, closeGeneralForumTopic, reopenGeneralForumTopic, hideGeneralForumTopic, unhideGeneralForumTopic
- **Games**: sendGame, setGameScore, getGameHighScores
- **Updates**: getUpdates

### Telegram Bot AI Tools Node
24 AI-agent-ready tools for the n8n AI Agent node:

| Tool | Description |
|------|-------------|
| `telegram_send_message` | Send text messages with formatting |
| `telegram_send_photo` | Send photos (file_id, URL, or base64) |
| `telegram_send_document` | Send documents/files (base64 compatible with Gotenberg output) |
| `telegram_send_video` | Send videos |
| `telegram_send_audio` | Send audio files |
| `telegram_send_voice` | Send voice messages |
| `telegram_send_location` | Send GPS locations |
| `telegram_send_contact` | Send contact cards |
| `telegram_send_poll` | Create polls |
| `telegram_forward_message` | Forward messages between chats |
| `telegram_edit_message` | Edit sent messages |
| `telegram_delete_message` | Delete messages |
| `telegram_get_file` | Download files (returns base64 for cross-tool use) |
| `telegram_send_chat_action` | Show typing/uploading indicators |
| `telegram_get_chat` | Get chat information |
| `telegram_send_sticker` | Send stickers |
| `telegram_send_media_group` | Send photo/document albums |
| `telegram_answer_inline_query` | Answer inline queries |
| `telegram_pin_message` | Pin messages |
| `telegram_unpin_message` | Unpin messages |
| `telegram_send_invoice` | Send payment invoices |
| `telegram_get_me` | Get bot info |
| `telegram_set_webhook` | Configure webhook |
| `telegram_delete_webhook` | Remove webhook |

## Cross-Tool Data Interop

The AI Tools node uses a standardized data format compatible with other tool nodes (e.g., Gotenberg):

```json
{
  "success": true,
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "sizeKb": 142,
  "base64": "JVBERi0xLjQ..."
}
```

**Example workflows with AI Agent:**
- Download document from Telegram → Convert with Gotenberg → Send back to Telegram
- Generate PDF with Gotenberg → Send to Telegram chat
- Receive photo in Telegram → Process → Reply with result

## Installation

### Via n8n Community Nodes
1. Go to **Settings** → **Community Nodes**
2. Search for `@unwarkz/n8n-nodes-telegram-bot`
3. Click **Install**

### Manual Installation
```bash
cd ~/.n8n
npm install @unwarkz/n8n-nodes-telegram-bot
```

## Credential Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. In n8n, create a **Telegram Bot API** credential
4. Paste your bot token
5. (Optional) Change Base URL if using a [local Bot API server](https://core.telegram.org/bots/api#using-a-local-bot-api-server)

## Part of the Assistant Set

This package is also included in the full [@unwarkz/n8n-nodes-assistant-set](https://www.npmjs.com/package/@unwarkz/n8n-nodes-assistant-set) package

## License

MIT
