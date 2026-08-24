import 'dotenv/config'

export const config = {
    port: Number(process.env.PORT ?? 3008),
    channel: (process.env.CHANNEL ?? 'whatsapp') as 'whatsapp' | 'telegram',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
        baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
    },
}
