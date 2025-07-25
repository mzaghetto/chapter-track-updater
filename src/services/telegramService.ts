import axios from 'axios';

export class TelegramService {
  private botToken: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('Telegram Bot Token not found in environment variables');
    }
    this.botToken = token;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw new Error('Could not send message to Telegram');
    }
  }
}
