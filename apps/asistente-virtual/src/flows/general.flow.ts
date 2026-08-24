import { addKeyword, EVENTS } from '@builderbot/bot'

import { askAssistant, type ChatMessage } from '../ai/llmClient'
import { loadKnowledge, retrieveRelevant } from '../ai/knowledgeBase'
import { PERSONAS, type RoleId } from '../personas'

const catalogo = loadKnowledge('catalogo-ventas.md')
const faq = loadKnowledge('faq-atencion-cliente.md')
const combined = `${catalogo}\n\n${faq}`

/**
 * Fallback: cualquier mensaje que no dispare una palabra clave de ventas o
 * soporte cae aquí. Si el usuario ya tenía un rol activo (guardado en su
 * estado por ventas.flow / soporte.flow) seguimos con ese mismo "empleado
 * virtual"; si es el primer contacto, arrancamos como atención al cliente.
 */
export const flowGeneral = addKeyword(EVENTS.WELCOME).addAction(async (ctx, { flowDynamic, state }) => {
    const role = (state.get('role') as RoleId) ?? 'soporte'
    const history = (state.get('history') as ChatMessage[]) ?? []
    const knowledgeSource = role === 'vendedor' ? catalogo : role === 'soporte' ? faq : combined
    const context = retrieveRelevant(knowledgeSource, ctx.body)

    const reply = await askAssistant({
        persona: PERSONAS[role],
        knowledge: context,
        history,
        userMessage: ctx.body,
    })

    const nextHistory: ChatMessage[] = [
        ...history,
        { role: 'user', content: ctx.body } satisfies ChatMessage,
        { role: 'assistant', content: reply } satisfies ChatMessage,
    ].slice(-12)

    await state.update({ role, history: nextHistory })
    await flowDynamic(reply)
})
