# gutta spiser no

Vite + React-app som rater spisesteder. Ingen egen backend: frontenden snakker
direkte med Supabase, og tilgangen styres av RLS-policyer i databasen.

Det finnes én felles rangering – `rank` 0 er det beste stedet. Når noen legger
inn et nytt sted, sammenligner appen det mot de eksisterende med binærsøk og
kaller `insert_review`, som flytter stedene under ned ett hakk i én transaksjon.
Stedene eies ikke av noen; `navn`-kolonnen ble fjernet i `004_en_rangering.sql`.

## Tilgang

Lesing er åpent for alle. For å legge inn eller slette må man skrive inn det
delte passordet i appen. Det lagres i nettleseren til man trykker «Lås».

Passordet sjekkes mot en bcrypt-hash i databasen, ikke i JavaScript – en sjekk
i frontend-koden ville vært verdiløs, siden anon-nøkkelen er synlig for alle.
`anon` har ingen skriverettigheter på `reviews` i det hele tatt; all skriving
går gjennom `insert_review`/`delete_review`, som tar passordet som argument.

Dette er en lav terskel, ikke ekte sikkerhet: passordet er delt, det ligger i
klartekst i nettleseren, og alle som har det kan slette hva som helst. Det
holder unna tilfeldige forbipasserende, og det er hensikten.

## Oppsett

1. Kjør SQL-filene i `supabase/` i rekkefølge i Supabase SQL Editor:
   `001_reviews.sql` → `002_ranking.sql` → `003_passord_og_rls.sql` →
   `004_en_rangering.sql`.
2. Sett passordet i SQL Editor:

   ```sql
   select public.sett_passord('det-delte-passordet');
   ```

   Samme kommando brukes senere for å bytte det.
3. Kopier `frontend/.env.example` til `frontend/.env` og fyll inn prosjekt-URL
   og **anon**-nøkkelen fra Project Settings → API Keys.

## Kjøre lokalt

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Appen kjører på http://localhost:8731.

## Deploy (Vercel)

`vercel.json` bygger frontenden og serverer `frontend/dist` statisk. Sett
`VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` som Environment Variables i
Vercel-prosjektet – de bakes inn i bundlen ved bygg, så et nytt deploy må til
hvis de endres.
