-- Går fra stjerner til rangering per person (0 = best).
-- Kjøres etter supabase.sql.

alter table public.reviews add column if not exists rank integer;

-- Eksisterende rader får rangering etter når de ble lagt inn
update public.reviews r
set rank = sub.rn
from (
    select id, row_number() over (partition by lower(trim(navn)) order by created_at) - 1 as rn
    from public.reviews
) sub
where r.id = sub.id;

alter table public.reviews alter column rank set not null;
alter table public.reviews drop column if exists stjerner;

-- Setter inn en review på plass p_rank og flytter de andre for samme person ned ett hakk.
-- Alt skjer i én transaksjon, så rangeringen blir aldri halvveis oppdatert.
create or replace function public.insert_review(p_sted text, p_navn text, p_kommentar text, p_rank integer)
returns public.reviews
language plpgsql
as $$
declare
    v_key   text := lower(trim(p_navn));
    v_count integer;
    v_row   public.reviews;
begin
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

-- Sletter en review og tetter hullet i rangeringen til personen.
create or replace function public.delete_review(p_id bigint)
returns boolean
language plpgsql
as $$
declare
    v_key  text;
    v_rank integer;
begin
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

-- Bare backenden (secret key) får kalle funksjonene
revoke execute on function public.insert_review(text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.delete_review(bigint) from public, anon, authenticated;
grant execute on function public.insert_review(text, text, text, integer) to service_role;
grant execute on function public.delete_review(bigint) to service_role;
