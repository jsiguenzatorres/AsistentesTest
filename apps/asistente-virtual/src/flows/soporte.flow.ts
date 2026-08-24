import { addKeyword } from '@builderbot/bot'

import { askAssistant, type ChatMessage } from '../ai/llmClient'
import { loadKnowledge, retrieveRelevant } from '../ai/knowledgeBase'
import { PERSONAS } from '../personas'

const faq = loadKnowledge('faq-atencion-cliente.md')

/**
 * Rol: Atención al cliente / soporte técnico.
 */
export const flowSoporte = addKeyword<any, any>([
    'ayuda',
    'soporte',
    'problema',
    'falla',
    'no funciona',
    'error',
    'cancelar',
    'cancelacion',
    'cancelación',
    'factura',
    'facturacion',
    'facturación',
]).addAction(async (ctx, { flowDynamic, state }) => {
    const history = (state.get('history') as ChatMessage[]) ?? []
    const context = retrieveRelevant(faq, ctx.body)

    const reply = await askAssistant({
        persona: PERSONAS.soporte,
        knowledge: context,
        history,
        userMessage: ctx.body,
    })

    const nextHistory: ChatMessage[] = [
        ...history,
        { role: 'user', content: ctx.body } satisfies ChatMessage,
        { role: 'assistant', content: reply } satisfies ChatMessage,
    ].slice(-12)

    await state.update({ role: 'soporte', history: nextHistory })
    await flowDynamic(reply)
})
