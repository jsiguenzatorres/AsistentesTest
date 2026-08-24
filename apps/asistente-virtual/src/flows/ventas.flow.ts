import { addKeyword } from '@builderbot/bot'

import { askAssistant, type ChatMessage } from '../ai/llmClient'
import { loadKnowledge, retrieveRelevant } from '../ai/knowledgeBase'
import { PERSONAS } from '../personas'

const catalogo = loadKnowledge('catalogo-ventas.md')

/**
 * Rol: Vendedor. Se activa con intención de compra/precio y deja marcado
 * en el estado del usuario que su persona activa es "vendedor", para que
 * el flujo general (fallback) mantenga el mismo rol en mensajes siguientes.
 */
export const flowVentas = addKeyword<any, any>([
    'precio',
    'precios',
    'comprar',
    'producto',
    'productos',
    'catalogo',
    'catálogo',
    'plan',
    'planes',
    'cotizacion',
    'cotización',
]).addAction(async (ctx, { flowDynamic, state }) => {
    const history = (state.get('history') as ChatMessage[]) ?? []
    const context = retrieveRelevant(catalogo, ctx.body)

    const reply = await askAssistant({
        persona: PERSONAS.vendedor,
        knowledge: context,
        history,
        userMessage: ctx.body,
    })

    const nextHistory: ChatMessage[] = [
        ...history,
        { role: 'user', content: ctx.body } satisfies ChatMessage,
        { role: 'assistant', content: reply } satisfies ChatMessage,
    ].slice(-12)

    await state.update({ role: 'vendedor', history: nextHistory })
    await flowDynamic(reply)
})
