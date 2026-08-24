import { createBot, createFlow, createProvider } from '@builderbot/bot'
import { JsonFileDB } from '@builderbot/database-json'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { TelegramProvider } from '@builderbot/provider-telegram'

import { config } from './config'
import { flowGeneral } from './flows/general.flow'
import { flowSoporte } from './flows/soporte.flow'
import { flowVentas } from './flows/ventas.flow'

/**
 * Entrypoint para correr el asistente contra un canal real (WhatsApp o
 * Telegram). Requiere credenciales/QR reales, por lo que no se ejecuta en
 * este sandbox — usar `npm run chat` para probar la lógica sin canal real.
 */
const main = async () => {
    const adapterFlow = createFlow([flowVentas, flowSoporte, flowGeneral])
    const adapterDB = new JsonFileDB({ filename: 'db.json' })

    const adapterProvider =
        config.channel === 'telegram'
            ? createProvider(TelegramProvider, { token: config.telegramToken })
            : createProvider(BaileysProvider)

    const bot = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    bot.httpServer(config.port)
    console.log(`🤖 Asistente virtual activo — canal: ${config.channel} — puerto: ${config.port}`)
    if (config.channel === 'whatsapp') {
        console.log('Escanea el QR que aparecerá en consola/en el panel para vincular el número.')
    }
}

main().catch((err) => {
    console.error('Error al iniciar el asistente:', err)
    process.exit(1)
})
