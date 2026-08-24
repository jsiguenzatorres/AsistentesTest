import { readFileSync } from 'fs'
import { join } from 'path'

const KNOWLEDGE_DIR = join(__dirname, '..', '..', 'knowledge')

const cache = new Map<string, string>()

/**
 * Carga un archivo markdown de la carpeta knowledge/ (con cache en memoria).
 */
export function loadKnowledge(filename: string): string {
    const cached = cache.get(filename)
    if (cached) return cached
    const content = readFileSync(join(KNOWLEDGE_DIR, filename), 'utf-8')
    cache.set(filename, content)
    return content
}

const WORD_REGEX = /[a-záéíóúñü0-9]+/g

const tokenize = (text: string): string[] => text.toLowerCase().match(WORD_REGEX) ?? []

/**
 * RAG "ingenuo": parte el documento por encabezados `##` y devuelve las
 * secciones con mayor solapamiento de palabras con la consulta del usuario.
 * Suficiente para un prototipo con pocos documentos; en producción esto se
 * reemplaza por embeddings + vector DB (o directamente Dify/Flowise, ver README).
 */
export function retrieveRelevant(fullText: string, query: string, maxSections = 3): string {
    const sections = fullText.split(/\n(?=##\s)/g).filter((s) => s.trim().length > 0)
    const queryWords = new Set(tokenize(query))

    if (queryWords.size === 0) {
        return sections.slice(0, maxSections).join('\n\n')
    }

    const scored = sections.map((section) => {
        const words = tokenize(section)
        const score = words.reduce((acc, w) => acc + (queryWords.has(w) ? 1 : 0), 0)
        return { section, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const picked = scored.filter((s) => s.score > 0).slice(0, maxSections)

    if (picked.length === 0) {
        return sections.slice(0, maxSections).join('\n\n')
    }

    return picked.map((p) => p.section.trim()).join('\n\n')
}
