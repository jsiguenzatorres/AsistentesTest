# asistente-virtual — prototipo runnable

Primer prototipo de "empleados virtuales" del proyecto Fuerza Laboral Virtual: dos roles (**vendedor** y
**atención al cliente/soporte**) construidos sobre [BuilderBot](https://github.com/codigoencasa/builderbot)
(`@builderbot/bot`, MIT), con enrutamiento por intención, memoria de conversación por usuario y una base
de conocimiento propia (RAG ligero por palabras clave) para cada rol.

Corre 100% en Node.js — sin Docker, sin credenciales de WhatsApp/Telegram — para poder probar la lógica
del asistente aquí mismo. La conexión a un canal real (WhatsApp/Telegram) y la bandeja omnicanal
(Chatwoot) son el siguiente paso, documentado en `../infra/`.

## Probar la lógica del asistente (sin canal real)

```bash
npm install
npm run chat
```

Abre un chat por terminal usando el `TestProvider`/`MemoryDB` que trae BuilderBot para pruebas. Prueba
con mensajes como `hola`, `precios`, `quiero el plan multicanal`, `no funciona el bot`, `quiero cancelar`.

Sin una `ANTHROPIC_API_KEY` configurada, las respuestas salen en **modo demo** (deterministas, muestran
el fragmento de conocimiento recuperado) — esto es intencional, para poder validar el ruteo y el RAG sin
depender de credenciales. Copia `.env.example` a `.env` y define `ANTHROPIC_API_KEY` para que las
respuestas las genere el modelo de verdad.

## Cómo está organizado

```
src/
  personas.ts        Prompt de sistema de cada rol (vendedor, soporte)
  ai/
    llmClient.ts      Llama a la API de Anthropic; cae a un demoResponder si no hay API key
    knowledgeBase.ts  Carga los .md de knowledge/ y hace retrieval ingenuo por solapamiento de palabras
  flows/
    ventas.flow.ts    Se activa con intención de compra ("precio", "plan", "comprar"...)
    soporte.flow.ts   Se activa con intención de soporte ("ayuda", "no funciona", "cancelar"...)
    general.flow.ts   Fallback (EVENTS.WELCOME): sigue con el último rol activo del usuario
  cli/chat.ts         Simulador de conversación por terminal (sin canal real)
  app.ts              Entrypoint para un canal real (WhatsApp vía Baileys, o Telegram)
knowledge/
  catalogo-ventas.md        Contenido de ejemplo para el rol vendedor
  faq-atencion-cliente.md   Contenido de ejemplo para el rol soporte
```

Reemplaza el contenido de `knowledge/` por el catálogo/FAQ real del negocio — es lo único que hay que
tocar para adaptar el tono/información sin volver a escribir código.

## Conectar un canal real

```bash
cp .env.example .env      # completa ANTHROPIC_API_KEY y, si usas Telegram, TELEGRAM_BOT_TOKEN
npm run dev:whatsapp       # imprime un QR en consola para vincular el número (usa Baileys)
# o
npm run dev:telegram       # requiere TELEGRAM_BOT_TOKEN (@BotFather)
```

Para producción a escala, la recomendación (ver `README.md` raíz) es migrar el canal WhatsApp de
Baileys (protocolo no oficial) a la **WhatsApp Cloud API** oficial de Meta vía
[Evolution API](../infra/), y usar Chatwoot como bandeja para el traspaso a un agente humano.

## Limitaciones conocidas de este prototipo (a propósito, para no sobre-construir)

- **Ruteo por palabras clave, no por intención real**: `addKeyword` hace coincidencia de substring, no
  NLU. Por ejemplo "no *me* funciona" no dispara el flujo de soporte porque no contiene el substring
  exacto "no funciona" (sí lo captura el fallback, pero con el rol que tuviera activo el usuario). En
  producción esto se resuelve mejor con un router basado en el propio LLM, o con Dify/Flowise (ver
  propuesta en el README raíz).
- **RAG por solapamiento de palabras**, no por embeddings — suficiente para 1-2 documentos cortos, no
  escala a una base de conocimiento grande.
- **Roles Auditor y Contador no están implementados aquí**: la propuesta original los marca como
  autonomía baja/media con aprobación humana obligatoria; antes de construirlos hace falta definir esa
  capa de revisión, que es un problema de producto tanto como de código.
- **Sin voz ni avatar todavía** — este prototipo es texto puro; Piper/ElevenLabs y el avatar son la
  capa de salida que se agrega después de validar que las respuestas del LLM son correctas.
