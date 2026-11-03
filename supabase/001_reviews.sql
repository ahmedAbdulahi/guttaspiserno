-- Kjør denne i Supabase SQL Editor for å lage tabellen
create table if not exists public.reviews (
    id          bigint generated always as identity primary key,
    sted        text        not null,
    navn        text        not null,
    stjerner    smallint    not null check (stjerner between 1 and 5),
    kommentar   text,
    created_at  timestamptz not null default now()
);

-- RLS på, ingen policies: kun backend (secret key) kan skrive/lese
alter table public.reviews enable row level security;
