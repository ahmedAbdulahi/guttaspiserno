-- Lesing er åpent for alle. Skriving krever et delt passord, som sjekkes mot
-- en bcrypt-hash i databasen – ikke i nettleseren. Frontenden sender passordet
-- med hvert skriv; anon kan ikke røre tabellen direkte, bare via funksjonene.
-- Kjøres etter 002_ranking.sql.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Passordet
-- ---------------------------------------------------------------------------

create table if not exists public.app_passord (
    id        smallint primary key default 1 check (id = 1),
    hash      text not null,
    oppdatert timestamptz not null default now()
);

-- Ingen får lese hashen direkte – kun funksjonene under, som kjører som eier
alter table public.app_passord enable row level security;
revoke all on public.app_passord from public, anon, authenticated;

-- Settes ved å kjøre `select public.sett_passord('...');` i SQL Editor
create or replace function public.sett_passord(p_passord text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
    insert into public.app_passord (id, hash, oppdatert)
    values (1, crypt(p_passord, gen_salt('bf')), now())
    on conflict (id) do update set hash = excluded.hash, oppdatert = now();
$$;

revoke execute on function public.sett_passord(text) from public, anon, authenticated;

create or replace function public.sjekk_passord(p_passord text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
    select exists (
        select 1 from public.app_passord
        where id = 1 and hash = crypt(p_passord, hash)
    );
$$;

grant execute on function public.sjekk_passord(text) to anon;

-- ---------------------------------------------------------------------------
-- Tilgang til reviews
-- ---------------------------------------------------------------------------

grant select on public.reviews to anon;
revoke insert, update, delete on public.reviews from anon, authenticated;

drop policy if exists "les for alle" on public.reviews;
create policy "les for alle"
    on public.reviews for select
    to anon
    using (true);

-- ---------------------------------------------------------------------------
-- Funksjonene fra 002, nå med passordsjekk
--
-- `security definer` gjør at de kjører som eier og dermed omgår RLS. Derfor er
-- passordsjekken det eneste som slipper skriving gjennom.
-- ---------------------------------------------------------------------------

drop function if exists public.insert_review(text, text, text, integer);
drop function if exists public.delete_review(bigint);

create or replace function public.insert_review(
    p_sted text,
    p_navn text,
    p_kommentar text,
    p_rank integer,
    p_passord text
)
returns public.reviews
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_key   text := lower(trim(p_navn));
    v_count integer;
    v_row   public.reviews;
begin
    if not public.sjekk_passord(p_passord) then
        raise exception 'Feil passord' using errcode = '28P01';
    end if;

    perform pg_advisory_xact_lock(hashtext(v_key));

    select count(*) into v_count from public.reviews where lower(trim(navn)) = v_key;
    p_rank := least(greatest(p_rank, 0), v_count);

    update public.reviews set rank = rank + 1
    where lower(trim(navn)) = v_key and rank >= p_rank;

    insert into public.reviews (sted, navn, kommentar, rank)
    values (trim(p_sted), trim(p_navn), nullif(trim(p_kommentar), ''), p_rank)
    returning * into v_row;

    return v_row;
end;
$$;

create or replace function public.delete_review(p_id bigint, p_passord text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_key  text;
    v_rank integer;
begin
    if not public.sjekk_passord(p_passord) then
        raise exception 'Feil passord' using errcode = '28P01';
    end if;

    delete from public.reviews where id = p_id
    returning lower(trim(navn)), rank into v_key, v_rank;

    if not found then
        return false;
    end if;

    update public.reviews set rank = rank - 1
    where lower(trim(navn)) = v_key and rank > v_rank;

    return true;
end;
$$;

grant execute on function public.insert_review(text, text, text, integer, text) to anon;
grant execute on function public.delete_review(bigint, text) to anon;
