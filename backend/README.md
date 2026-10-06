# guttaspiserno-backend

Kotlin/Ktor-backend som tar imot reviews og lagrer dem i Supabase.

## Oppsett

1. Kjør `supabase.sql` i Supabase → SQL Editor (lager tabellen `reviews`).
2. Hent URL og secret key (`sb_secret_...`) fra Supabase → Project Settings → API Keys.
3. Lag `backend/.env` (se `.env.example`) – den leses automatisk ved oppstart. Alternativt kan du eksportere variablene:

```sh
export SUPABASE_URL=https://<prosjekt-id>.supabase.co
export SUPABASE_SECRET_KEY=sb_secret_...
```

4. Start: `./gradlew run` (port 8080). Tester: `./gradlew test`.

Secret key omgår RLS, så den skal kun ligge i backend – aldri i frontend eller git.

## API

`POST /reviews`

```json
{ "sted": "Peppes", "navn": "Ahmed", "stjerner": 4, "kommentar": "Bra pizza" }
```

Svarer `201 Created` med den lagrede raden (inkl. `id` og `created_at`).
`400` hvis felter mangler eller `stjerner` ikke er 1–5.

`GET /health` → `{ "status": "ok" }`
