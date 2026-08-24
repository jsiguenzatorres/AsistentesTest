import { config } from '../config'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

type AskAssistantArgs = {
    persona: string
    knowledge: string
    history: ChatMessage[]
    userMessage: string
}

/**
 * Llama a la API de Anthropic (Claude) con la persona del rol y el contexto
 * recuperado de la base de conocimiento como system prompt.
 */
async function callClaude({ persona, knowledge, history, userMessage }: AskAssistantArgs): Promise<string> {
    const systemPrompt = `${persona}\n\nContexto (úsalo como única fuente de verdad para precios/políticas):\n"""\n${knowledge}\n"""`

    const res = await fetch(`${config.anthropic.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': config.anthropic.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.anthropic.model,
            max_tokens: 400,
            system: systemPrompt,
            messages: [...history, { role: 'user', content: userMessage }],
        }),
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Anthropic API error ${res.status}: ${errText}`)
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const textBlock = data.content?.find((block) => block.type === 'text')
    return textBlock?.text?.trim() ?? 'Disculpa, no pude generar una respuesta en este momento.'
}

/**
 * Respondedor determinista sin LLM: solo para poder probar el prototipo
 * (flujos, ruteo, RAG) sin necesitar una API key. Deja claro en la salida
 * que está en modo demo para no confundirlo con una respuesta real de IA.
 */
function demoResponder({ knowledge, userMessage }: AskAssistantArgs): string {
    const firstSection = knowledge.split('\n\n')[0]?.replace(/^##\s*/, '').trim()
    return (
        `[DEMO sin LLM conectado] Sobre "${userMessage.slice(0, 60)}" — ` +
        `lo más relevante que encontré es: "${firstSection}". ` +
        `Configura ANTHROPIC_API_KEY en .env para obtener una respuesta real generada por el modelo.`
    )
}

export async function askAssistant(args: AskAssistantArgs): Promise<string> {
    if (!config.anthropic.apiKey) {
        return demoResponder(args)
    }
    return callClaude(args)
}
