import { createBot, createFlow, TestTool } from '@builderbot/bot'
import * as readline from 'node:readline'

import { flowGeneral } from '../flows/general.flow'
import { flowSoporte } from '../flows/soporte.flow'
import { flowVentas } from '../flows/ventas.flow'

/**
 * Simulador de conversación por terminal: corre los mismos flujos que se
 * usarían en WhatsApp/Telegram, pero con el TestProvider + MemoryDB que
 * trae BuilderBot para pruebas, sin necesitar credenciales de ningún canal
 * ni Docker. Sirve para validar la lógica de ruteo/roles/RAG del prototipo.
 *
 * Uso: npm run chat   (luego escribe mensajes; Ctrl+D para salir)
 */
const USER_ID = 'demo-user'

const main = async () => {
    const adapterFlow = createFlow([flowVentas, flowSoporte, flowGeneral])
    const adapterDB = new TestTool.TestDB()
    const adapterProvider = new TestTool.TestProvider()

    const originalSendMessage = adapterProvider.sendMessage.bind(adapterProvider)
    adapterProvider.sendMessage = async (userId: string, message: string) => {
        console.log(`🤖  ${message}\n`)
        return originalSendMessage(userId, message)
    }

    await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    console.log('💬 Chat de prueba — Fuerza Laboral Virtual (modo demo, sin canal real)')
    console.log('Prueba con: "hola", "precios", "no me funciona el bot", "quiero cancelar"...')
    console.log('Ctrl+D para salir.\n')

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'Tú> ' })
    rl.prompt()

    // for-await procesa cada línea de forma secuencial y espera a que termine
    // el flujo (incluida la llamada al LLM) antes de leer la siguiente.
    for await (const line of rl) {
        const body = line.trim()
        if (body.length > 0) {
            await adapterProvider.delaySendMessage(0, 'message', { from: USER_ID, body })
        }
        rl.prompt()
    }

    console.log('\n👋 Fin del chat de prueba.')
}

main().catch((err) => {
    console.error('Error en el chat de prueba:', err)
    process.exit(1)
})
