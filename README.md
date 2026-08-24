# Fuerza Laboral Virtual — Catálogo y Propuesta Técnica

Investigación de los repositorios open-source más robustos y demandados para construir un equipo de **"empleados virtuales"** (vendedor, capacitador, soporte técnico, atención al cliente, auditor, contador) desplegable en **WhatsApp, Telegram, redes sociales y llamadas de voz**, con **voz humanizada en español/latino** y **presencia visual profesional (avatar)**.

> Estado del repositorio: `apps/asistente-virtual` ya es un prototipo runnable (roles vendedor y
> atención al cliente, sobre BuilderBot) — ver [Prototipo](#prototipo) más abajo. `infra/` trae la
> infraestructura Docker de Evolution API + Chatwoot para el siguiente paso (canal real + bandeja
> omnicanal), aún no desplegada.

## Prototipo

Primer prototipo runnable del MVP descrito en la hoja de ruta: dos "empleados virtuales" (vendedor y
atención al cliente/soporte) construidos sobre **BuilderBot**, con enrutamiento por intención, memoria de
conversación y una base de conocimiento propia por rol.

- **[`apps/asistente-virtual`](apps/asistente-virtual/)** — código Node.js/TypeScript, corre sin Docker.
  `npm install && npm run chat` abre un chat de prueba por terminal (sin necesitar WhatsApp real ni
  credenciales de LLM: sin `ANTHROPIC_API_KEY` responde en modo demo, para poder validar la lógica).
- **[`infra/`](infra/)** — `docker-compose.yml` de Evolution API (WhatsApp) + Chatwoot (omnicanal),
  basado en la configuración oficial de ambos proyectos. No se pudo probar en este sandbox de
  desarrollo (no hay daemon de Docker disponible aquí); queda listo para desplegar en un VPS/servidor
  con Docker.

Se eligió **BuilderBot** como base del prototipo (en vez de clonar Chatwoot/Evolution API/Dify
completos) porque es una librería npm pura en Node.js — se puede instalar, ejecutar y probar
directamente en cualquier entorno de desarrollo sin infraestructura adicional (Postgres, Redis, Docker),
y ya trae soporte para WhatsApp, Telegram y varios canales más bajo la misma API. Los otros repos del
catálogo (Chatwoot, Evolution API) son plataformas completas pensadas para desplegarse como servicios
independientes, no para vendorizar su código fuente dentro de este repo.

## Due diligence — decisiones validadas (agosto 2026)

Después del catálogo inicial se investigó a fondo cada pieza candidata (documentación oficial, código
fuente e issues de cada repo) antes de comprometer trabajo de implementación. Resultado: se ratifican
las decisiones del MVP, con riesgos concretos que hay que vigilar.

**Orquestador — Dify se combina, no reemplaza.** Confirmado con el código fuente (`langgenius/dify`):
MCP bidireccional nativo desde v1.6.0, ~30 vector stores soportados, API REST completa que un bot
externo puede llamar. Pero su docker-compose trae ~16 contenedores activos por defecto (mínimo 4GB
RAM) — de más para lo que ya funciona hoy (BuilderBot llamando directo a la API de Anthropic). Se
mantiene la llamada directa para vendedor/soporte; Dify se reserva como capa de RAG documental para
Auditor y Contador, autohospedado. ⚠️ Licencia Apache-2.0 modificada: **prohíbe operar multi-tenant**
(revender como SaaS a varios clientes) sin licencia comercial — importa si "Fuerza Laboral Virtual" se
ofrece como servicio a terceros negocios, no solo para uso propio.

**Omnicanal — Chatwoot se queda, sin su IA propia.** El patrón "Agent Bot" (webhook → bot responde →
`bot_handoff!` a un humano) es justo lo que necesitamos, con integraciones reales n8n+Chatwoot ya
documentadas por la comunidad. Captain (la IA de Chatwoot) es de pago (desde US$19/agente/mes) y **no
soporta tools/APIs externas** — confirma que construir el agente aparte (como ya hicimos) es lo
correcto. ⚠️ **Mayor riesgo real del stack**: la integración Chatwoot↔Evolution API **no es un canal
oficialmente soportado por Chatwoot** (confirmado por un maintainer en un discussion de GitHub) — es
"glue" de terceros. Tratarla como el componente de mayor mantenimiento; WhatsApp Cloud API oficial como
plan B si se degrada. Recursos: 4GB RAM mínimo, 8GB recomendado en producción.

**WhatsApp — seguir con BuilderBot + Baileys, migrar cuando haga falta.** No hay diferencia real de
riesgo de baneo entre Evolution API y BuilderBot: ambos corren sobre el mismo Baileys, y el baneo es
permanente y sin apelación — exige warm-up gradual (~7 días) y rate-limiting desde el día uno, sin
importar cuál se use. BuilderBot es más simple para integrar el LLM (llamada in-process); Evolution API
es mejor para multi-tenant real (varios negocios/números aislados). No es redundante usar ambos: existe
`@builderbot/provider-evolution-api` para migrar solo la conexión cuando haya que escalar, sin
reescribir los flujos ya construidos. ⚠️ **Riesgo nuevo de gobernanza**: Evolution API v2.4.0 (agosto
2026) introdujo activación de licencia obligatoria contra su propio servidor, rompiendo despliegues
headless — vigilar antes de apostar fuerte por él.

**Voz y llamadas — fuera del MVP.** Vocode está prácticamente abandonado (descartado). Pipecat sigue
activo, con un quickstart de Twilio funcional en días, pero producción confiable (barge-in, jitter,
fallback) toma semanas de ajuste. Piper en español latino es débil fuera de Argentina; ElevenLabs sigue
ganando por mucho en naturalidad. Decisión: no meter voz al MVP — validar primero vendedor/soporte por
texto. Si se necesita una demo rápida de voz, usar un proveedor todo-en-uno comercial (Retell/Vapi,
~US$0.13–0.33/min) conectado al mismo prompt/LLM ya construido, en vez de armar el stack open-source
completo de una.

## Criterios de selección ("robustez")

Se priorizaron proyectos que cumplen la mayoría de estos criterios:

- **Actividad y comunidad**: commits recientes, miles de stars/forks, issues resueltos con frecuencia.
- **Multicanalidad real**: soporte nativo o por integración directa a WhatsApp, Telegram, redes sociales y/o voz/telefonía.
- **Listo para producción**: usado por empresas reales, no solo demos o proyectos de investigación.
- **Auto-hospedable**: se puede correr en infraestructura propia (soberanía de datos), con opción cloud si se prefiere.
- **Integrable con LLMs y RAG**: permite dar a cada "empleado" una personalidad, conocimiento propio y reglas de negocio.
- **Licencia viable para uso comercial**: se indica el modelo de licencia de cada proyecto; varios son "fair-code"/open-core, no MIT puro — revisar antes de escalar.

## Catálogo de repositorios por capa

### 1. Orquestación / "cerebro" del agente (personalidad, RAG, lógica de negocio)

| Repo | Qué aporta | Por qué se eligió | Licencia |
|---|---|---|---|
| **[n8n](https://github.com/n8n-io/n8n)** | Automatización de flujos + nodos nativos de IA (agentes, RAG, tool calling, MCP) y conectores a WhatsApp, Telegram, CRMs, hojas de cálculo, bases de datos. | La herramienta low-code más completa de 2026: une automatización de procesos de negocio con agentes de IA en un mismo lienzo. Ideal como "sistema nervioso" que conecta todo lo demás. | Sustainable Use License (fair-code; gratis en autohospedaje para uso interno) |
| **[Dify](https://github.com/langgenius/dify)** | Plataforma para construir, publicar y versionar agentes/chatbots con RAG, bases de conocimiento y API lista para producción. | Pensada específicamente para "agentes con personalidad" con panel de gestión de prompts y documentos — perfecta para dar identidad a cada rol (vendedor, auditor, etc.). | Apache 2.0 + cláusulas adicionales (open-core) |
| **[Flowise](https://github.com/FlowiseAI/Flowise)** | Constructor visual (drag-and-drop) de flujos LangChain/RAG, con chatbot embebible. | El más rápido para prototipar un asistente con conocimiento propio (documentos, PDFs) en minutos, sin código. | Apache 2.0 |
| **[LangFlow](https://github.com/langflow-ai/langflow)** | Similar a Flowise pero más orientado a orquestación de agentes complejos (LangGraph). | Útil cuando un rol necesita razonamiento multi-paso o coordinación entre sub-agentes (p. ej. auditor que consulta varias fuentes). | MIT |

### 2. Canal WhatsApp

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[Evolution API](https://github.com/evolution-foundation/evolution-api)** | API REST open-source para WhatsApp (Baileys/WhatsApp Web y WhatsApp Cloud API oficial), con integraciones nativas a n8n, Chatwoot, Typebot y Dify. | El proyecto con mayor tracción en Latinoamérica en 2026 (búsquedas multiplicadas x6 en el último año); es el conector estándar de facto entre WhatsApp y el resto del stack. | Código abierto (verificar términos de la versión desplegada) |
| **[BuilderBot](https://github.com/codigoencasa/builderbot)** | Framework en TypeScript, **documentado en español**, para crear bots de WhatsApp agnósticos de proveedor (Baileys, Meta Cloud API, Twilio), pensado para integrarse con IA. | Comunidad hispanohablante activa (+2.9k stars), curva de aprendizaje baja, ideal si el equipo de desarrollo es LatAm/España. | MIT |
| **[Baileys](https://github.com/WhiskeySockets/Baileys)** | Librería base (WhatsApp Web) que usan Evolution API y BuilderBot por debajo. | Entender esta capa ayuda a diagnosticar límites reales (riesgo de baneo de número si se abusa del canal no oficial). | MIT |

> **Nota de robustez:** para un *vendedor* o *soporte* que representa a la marca a gran escala, se recomienda migrar a la **WhatsApp Cloud API oficial de Meta** (soportada por Evolution API y BuilderBot) en vez de depender solo del protocolo no oficial, para evitar bloqueos de número.

### 3. Canal Telegram

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot)** | SDK maduro y completo para la Bot API de Telegram. | El más usado y mejor mantenido en Python; ideal si el orquestador principal (Dify/LangFlow) también es Python. | LGPLv3 |
| **[Telegraf](https://github.com/telegraf/telegraf)** | Equivalente en Node.js/TypeScript. | Mejor opción si el stack ya usa BuilderBot/n8n (Node.js), para mantener un único lenguaje. | MIT |

### 4. Omnicanal + bandeja de soporte humano (redes sociales + escalamiento a humano)

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[Chatwoot](https://github.com/chatwoot/chatwoot)** | Bandeja de entrada omnicanal (WhatsApp, Instagram, Messenger, X, live chat web, email, SMS) con agente de IA propio ("Captain") y traspaso a agentes humanos. | El más robusto y usado del mercado open-source (~33k stars, 15,000+ organizaciones). Es la pieza que unifica **redes sociales** y permite que un humano tome el control cuando el auditor/contador o soporte técnico lo requiera. | Open-core (núcleo MIT; funciones Enterprise con licencia comercial) |

### 5. Voz y llamadas telefónicas

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[Pipecat](https://github.com/pipecat-ai/pipecat)** | Framework en Python para agentes de voz en tiempo real: orquesta STT, LLM, TTS, telefonía (Twilio/Telnyx) y hasta multi-agente con hand-off entre especialistas. | Mantenido por Daily, el más completo para "llamadas" reales entrantes/salientes con baja latencia. | Permisiva (BSD-2-Clause) |
| **[Vocode](https://github.com/vocodedev/vocode-python)** | Framework enfocado en telefonía conversacional (llamadas salientes/entrantes). | Alternativa más simple cuando el caso de uso es solo "llamada telefónica con IA" sin necesidad de pipelines multimodales. | MIT |

> **Nota de infraestructura:** estos frameworks son open-source, pero para recibir/hacer llamadas a números reales se necesita un proveedor de telefonía (Twilio, Telnyx, Plivo). Eso es infraestructura de telecomunicaciones, no reemplazable por software libre.

### 6. Voz humanizada en español / latino (TTS)

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[Piper](https://github.com/rhasspy/piper)** | TTS local, rápido incluso en CPU/Raspberry Pi, con voces en español (España y variantes latinas según el modelo). | La opción **apta para uso comercial** sin restricciones (MIT), 100% offline — clave si se necesita privacidad/costo cero por llamada. | MIT |
| **[Coqui XTTS-v2](https://github.com/coqui-ai/TTS)** | Clonación de voz con solo 6 segundos de audio, 17 idiomas incluido español, calidad muy alta y natural. | La mejor calidad "humanizada" en código abierto para clonar/crear una voz latina consistente para cada rol. | **CPML — uso NO comercial** (Coqui Inc. cerró en 2024; no hay licencia comercial oficial vigente) |
| **ElevenLabs (comercial, no open-source)** | Voces en español latino de calidad muy alta, con SDK simple. | Se menciona como **alternativa de pago recomendada** para producción si XTTS no es viable comercialmente y Piper no alcanza el nivel de naturalidad deseado. | Comercial (por uso) |

**Recomendación práctica:** usar **Piper** para MVP y bajo costo operativo; evaluar **ElevenLabs** (pago por uso) para los roles cara al cliente (vendedor, atención al cliente) donde la naturalidad de la voz impacta directamente en conversión; reservar **XTTS-v2** solo para prototipos internos no comerciales por su licencia.

### 7. Aspecto visual profesional (avatar / video)

| Repo | Qué aporta | Por qué | Licencia |
|---|---|---|---|
| **[SadTalker](https://github.com/OpenTalker/SadTalker)** | Genera video de una persona hablando a partir de una sola foto + audio. | El más simple para dar "cara" a un asistente sin grabar video real. | Investigación/no comercial — **verificar términos antes de uso de marca** |
| **[LivePortrait](https://github.com/KwaiVGI/LivePortrait)** | Animación facial dirigida por audio/video casi en tiempo real, mayor realismo. | El más cercano a tiempo real en GPU moderna, útil para videollamadas o avatares interactivos. | Verificar licencia (uso de investigación en el modelo base) |
| **MuseTalk / LatentSync** | Modelos de lip-sync de alta fidelidad (casi fotorrealista). | Alternativas cuando se prioriza calidad de sincronización labial sobre velocidad. | Verificar licencia por proyecto |
| **HeyGen / D-ID (comercial, no open-source)** | Avatares "profesionales" listos para usar, con voces integradas. | Recomendado si el presupuesto lo permite y se necesita la imagen más pulida desde el día uno, sin gestionar modelos propios. | Comercial (por uso) |

**Nota importante:** a diferencia de los repos de mensajería/voz, la mayoría de los modelos open-source de avatar/lip-sync se publican con **licencias de investigación, no comerciales**. Para una imagen de marca "profesional" en producción, la ruta más segura a corto plazo es un proveedor comercial (HeyGen/D-ID) o video pre-grabado + Piper/ElevenLabs para el audio, dejando SadTalker/LivePortrait para prototipos internos.

## Arquitectura propuesta

```
 Canales de entrada/salida
 ┌───────────┬───────────┬───────────────┬───────────────┐
 │ WhatsApp  │ Telegram  │ Redes sociales│ Llamadas de voz│
 │ (Evolution│ (Telegraf/│ (Chatwoot:    │ (Pipecat /     │
 │  API /    │  python-  │  IG/FB/X)     │  Vocode +      │
 │  BuilderBot)│telegram-bot)│           │  Twilio/Telnyx)│
 └─────┬─────┴─────┬─────┴───────┬───────┴───────┬───────┘
       │           │             │               │
       └───────────┴──────┬──────┴───────────────┘
                           ▼
          Orquestador de agentes (n8n + Dify/LangFlow)
          - Enrutamiento por rol (vendedor, soporte, auditor…)
          - Memoria de conversación + CRM/ERP
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Conocimiento (RAG)   Reglas de negocio   Escalamiento humano
   por rol (docs,        y flujos            (Chatwoot inbox)
   políticas, catálogo)  determinísticos
                           │
                           ▼
              Salida humanizada por canal
        Texto → directo   |   Voz → Piper/ElevenLabs (TTS)
                           |   Video → avatar (HeyGen/D-ID o SadTalker)
```

## Propuesta por rol de "empleado virtual"

| Rol | Canal principal | Conocimiento (RAG) necesario | Nivel de autonomía recomendado |
|---|---|---|---|
| **Vendedor** | WhatsApp + redes sociales | Catálogo, precios, promociones, guion de objeciones | Alto (puede cerrar/derivar a pago), con voz cálida y avatar de marca |
| **Capacitador** | WhatsApp/Telegram + llamadas | Manuales internos, cursos, quizzes | Alto; puede usar avatar tipo "instructor" y voz clara y pausada |
| **Soporte técnico** | Telegram + WhatsApp + Chatwoot | Base de conocimiento técnica, tickets históricos | Medio; escalar a humano ante fallas críticas |
| **Atención al cliente** | Chatwoot (omnicanal) + llamadas | FAQs, políticas, estado de pedidos (integración a CRM) | Medio-alto; voz humanizada prioritaria (primer punto de contacto) |
| **Auditor** | Interfaz interna (Dify/LangFlow) + Telegram para alertas | Normativas, papeles de trabajo, checklists de control | **Bajo–medio**: siempre con revisión humana antes de firmar hallazgos; sin avatar/voz "cerrando" conclusiones por sí solo |
| **Contador** | Interfaz interna + WhatsApp para consultas rápidas | Plan de cuentas, normativa tributaria local, historial contable | **Bajo–medio**: cálculos y borradores automatizados, aprobación humana obligatoria antes de presentar/declarar |

> Para Auditor y Contador la prioridad no es la voz/avatar sino la **precisión y trazabilidad** (RAG con fuentes citables, logs de decisión, human-in-the-loop). Se recomienda limitar su voz/avatar a reportes internos, no a decisiones finales frente a terceros.

## Hoja de ruta sugerida

1. **MVP (4-6 semanas):** Chatwoot + Evolution API/BuilderBot (WhatsApp) + Dify (1-2 roles: atención al cliente y vendedor), voz con Piper.
2. **Expansión de canales:** sumar Telegram (Telegraf) y redes sociales vía Chatwoot; agregar n8n para automatizar procesos de negocio (CRM, pagos, agendamiento).
3. **Voz/telefonía:** integrar Pipecat + proveedor de telefonía para llamadas salientes/entrantes (soporte técnico, cobranza, capacitación).
4. **Roles especializados (Auditor/Contador):** LangFlow/LangGraph con RAG sobre normativa y datos financieros, siempre con aprobación humana antes de cualquier salida oficial.
5. **Imagen de marca:** evaluar HeyGen/D-ID para avatar "profesional" en los roles cara al público (vendedor, atención al cliente, capacitador); mantener texto/voz para auditor y contador.

## Consideraciones de licencias y costos

- **n8n, Dify**: gratis en autohospedaje para uso interno, pero son licencias "fair-code": no se puede revender el software como SaaS de terceros sin acuerdo comercial.
- **Chatwoot**: núcleo gratuito (MIT); funciones avanzadas (reportes enterprise, SSO, etc.) requieren licencia paga.
- **XTTS-v2 y la mayoría de modelos de avatar (SadTalker, LivePortrait)**: licencias de investigación/no comerciales — no usar en producción sin verificar/legales, o sustituir por Piper (voz) y HeyGen/D-ID (avatar, de pago) en producción.
- **Telefonía real (Twilio/Telnyx) y WhatsApp Cloud API oficial**: son servicios de pago por uso, necesarios para operar a escala de forma confiable (no son "costos ocultos", son infraestructura de telecomunicaciones estándar).

Este documento resume licencias a partir de fuentes públicas al 2026; **verificar la versión y términos vigentes de cada proyecto antes de un despliegue comercial**, en particular para los modelos de voz y avatar.

## Fuentes

- [Evolution API — GitHub](https://github.com/evolution-foundation/evolution-api)
- [BuilderBot — GitHub](https://github.com/codigoencasa/builderbot)
- [Chatwoot — GitHub](https://github.com/chatwoot/chatwoot)
- [Pipecat — GitHub](https://github.com/pipecat-ai/pipecat)
- [Coqui TTS (XTTS-v2) — GitHub](https://github.com/coqui-ai/TTS)
- [Piper TTS — GitHub](https://github.com/rhasspy/piper)
- [Best Open Source Voice Agent Frameworks 2026 — Techsy](https://techsy.io/en/blog/best-open-source-voice-agent-frameworks)
- [n8n vs Flowise vs LangFlow vs Dify — Javadex](https://www.javadex.es/blog/n8n-vs-flowise-vs-langflow-comparativa-ia-low-code-2026)
- [Best Open-Source AI Lip-Sync Tools 2026 — Pixazo](https://www.pixazo.ai/blog/best-open-source-ai-lip-sync-models)
- [What Is Chatwoot? — GetMacha](https://www.getmacha.com/blog/what-is-chatwoot)
