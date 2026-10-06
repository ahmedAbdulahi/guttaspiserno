# guttaspiserno-backend

Kotlin/Ktor-backend som tar imot reviews og lagrer dem i Supabase.

## Oppsett

1. Kjør `supabase.sql` og deretter `supabase_002_ranking.sql` i Supabase (tabellen `reviews` og funksjonene for rangering).
2. Hent URL og secret key (`sb_secret_...`) fra Supabase → Project Settings → API Keys.
3. Lag `backend/.env` (se `.env.example`) – den leses automatisk ved oppstart. Alternativt kan du eksportere variablene:

```sh
export SUPABASE_URL=https://<prosjekt-id>.supabase.co
export SUPABASE_SECRET_KEY=sb_secret_...
```

4. Start: `./gradlew run` (port 8080). Tester: `./gradlew test`.

Secret key omgår RLS, så den skal kun ligge i backend – aldri i frontend eller git.

## API

Rangering er per person: `rank` 0 er personens beste sted.

- `GET /api/reviews` – alle reviews, sortert på navn og rank
- `POST /api/reviews` – legg inn en review på en gitt plass. De andre stedene til personen flyttes ned.

  ```json
  { "sted": "Peppes", "navn": "Ahmed", "kommentar": "Bra pizza", "rank": 0 }
  ```

  Svarer `201 Created` med den lagrede raden.
- `DELETE /api/reviews/{id}` – sletter og tetter hullet i rangeringen. `204`, eller `404` hvis den ikke finnes.
- `GET /api/health` → `{ "status": "ok" }`

## Deploy (Vercel)

Backenden kjører som en container-tjeneste på Vercel (`Dockerfile.vercel`), definert i `vercel.json` i rotmappen.
Vercel ruter `/api/*` hit og alt annet til frontenden. Sett `SUPABASE_URL` og `SUPABASE_SECRET_KEY`
som Environment Variables i Vercel-prosjektet.
