# Infraestructura — Evolution API + Chatwoot

Stack de canales para producción: **Evolution API** (gateway de WhatsApp) y **Chatwoot** (bandeja
omnicanal + escalamiento a un humano), basado en los `docker-compose` oficiales de ambos proyectos.

> ⚠️ **No se puede levantar en este entorno de desarrollo.** Este sandbox no tiene un daemon de Docker
> disponible (`docker ps` falla con "no such file or directory" al intentar conectar al socket). Los
> archivos de este directorio están listos para desplegarse en cualquier VPS/servidor con Docker y
> Docker Compose instalados — no han sido probados end-to-end aquí, solo construidos a partir de la
> configuración oficial de cada proyecto (ver enlaces abajo).

## Qué incluye

- `docker-compose.yml` — Evolution API + su Postgres/Redis, y Chatwoot (rails + sidekiq) + su
  Postgres/Redis, en una red compartida `asistentes-net`.
- `.env.evolution.example` — variables para Evolution API (referencia completa: [evolution-api/.env.example](https://github.com/evolution-foundation/evolution-api/blob/main/.env.example)).
- `.env.chatwoot.example` — variables para Chatwoot (referencia completa: [chatwoot/.env.example](https://github.com/chatwoot/chatwoot/blob/develop/.env.example)).

## Cómo desplegarlo (en un servidor con Docker)

```bash
cp .env.evolution.example .env.evolution   # completar API key, password de postgres, etc.
cp .env.chatwoot.example .env.chatwoot     # completar SECRET_KEY_BASE, passwords, dominio

docker compose up -d
```

1. Evolution API queda en `http://localhost:8080` (usar `AUTHENTICATION_API_KEY` para crear una
   instancia de WhatsApp y escanear el QR).
2. Chatwoot queda en `http://localhost:3000`. La primera vez hay que correr las migraciones:
   ```bash
   docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare
   ```
3. Conectar Chatwoot a Evolution API creando un canal de API en Chatwoot y apuntando
   `WEBHOOK_GLOBAL_URL` de `.env.evolution` a la URL de ese canal (esto centraliza WhatsApp,
   Instagram, Facebook, X y web chat en una sola bandeja con traspaso a un agente humano).
4. Apuntar `apps/asistente-virtual` al mismo número de WhatsApp (vía Evolution API) para que la IA
   responda primero y el equipo humano vea/retome la conversación desde Chatwoot cuando haga falta.

## Por qué está separado del prototipo runnable

`apps/asistente-virtual` (la lógica de los "empleados virtuales") es Node.js puro y corre sin Docker,
por eso es lo que se puede probar directamente en este sandbox (`npm run chat`). Evolution API y
Chatwoot son plataformas completas (con su propia base de datos, colas y frontend) pensadas para
desplegarse como servicios independientes vía Docker — no tiene sentido ni es viable vendorizar su
código fuente dentro de este repo; se consumen como infraestructura.
