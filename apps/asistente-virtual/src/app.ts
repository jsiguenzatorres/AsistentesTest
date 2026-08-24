import { createBot, createFlow, createProvider } from '@builderbot/bot'
import { JsonFileDB } from '@builderbot/database-json'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { EvolutionProvider } from '@builderbot/provider-evolution-api'
import { TelegramProvider } from '@builderbot/provider-telegram'

import { config } from './config'
import { flowGeneral } from './flows/general.flow'
import { flowSoporte } from './flows/soporte.flow'
import { flowVentas } from './flows/ventas.flow'

/**
 * Entrypoint para correr el asistente contra un canal real: WhatsApp
 * directo (Baileys), Telegram, o WhatsApp vía Evolution API (para cuando
 * haya que escalar a multi-instancia — ver infra/). Los tres necesitan
 * credenciales/infraestructura reales, por lo que no se ejecutan en este
 * sandbox — usar `npm run chat` para probar la lógica sin canal real.
 *
 * CHANNEL=evolution está cableado pero NO probado end-to-end: requiere
 * Evolution API corriendo (ver infra/docker-compose.yml), que este
 * sandbox no puede levantar por falta de daemon de Docker.
 */
const main = async () => {
    const adapterFlow = createFlow([flowVentas, flowSoporte, flowGeneral])
    const adapterDB = new JsonFileDB({ filename: 'db.json' })

    const adapterProvider =
        config.channel === 'telegram'
            ? createProvider(TelegramProvider, { token: config.telegramToken })
            : config.channel === 'evolution'
              ? createProvider(EvolutionProvider, {
                    baseURL: config.evolution.baseURL,
                    apiKey: config.evolution.apiKey,
                    instanceName: config.evolution.instanceName,
                })
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
    if (config.channel === 'evolution') {
        console.log(`Conectando a Evolution API en ${config.evolution.baseURL} (instancia: ${config.evolution.instanceName})`)
    }
}

main().catch((err) => {
    console.error('Error al iniciar el asistente:', err)
    process.exit(1)
})
