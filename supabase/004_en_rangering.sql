-- Går fra én rangering per person til én felles, objektiv rangering.
-- Navnet forsvinner: et sted eies ikke av noen, det har bare en plass på lista.
-- Kjøres etter 003_passord_og_rls.sql.

-- Eksisterende rader får en global rekkefølge etter når de ble lagt inn
with nummerert as (
    select id, row_number() over (order by created_at) - 1 as rn
    from public.reviews
)
update public.reviews r
set rank = n.rn
from nummerert n
where r.id = n.id;

alter table public.reviews drop column if exists navn;

-- Én plass per sted. Må være deferrable: insert_review dytter flere rader
-- samtidig, og da er rekkefølgen midlertidig i uorden fram til commit.
alter table public.reviews drop constraint if exists reviews_rank_unik;
alter table public.reviews add constraint reviews_rank_unik unique (rank)
    deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Funksjonene, uten navn
-- ---------------------------------------------------------------------------

drop function if exists public.insert_review(text, text, text, integer, text);
drop function if exists public.delete_review(bigint, text);

create or replace function public.insert_review(
    p_sted text,
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
    v_count integer;
    v_row   public.reviews;
begin
    if not public.sjekk_passord(p_passord) then
        raise exception 'Feil passord' using errcode = '28P01';
    end if;

    -- Én felles stige, så alle innsettinger står i kø mot samme lås
    perform pg_advisory_xact_lock(hashtext('reviews'));

    select count(*) into v_count from public.reviews;
    p_rank := least(greatest(p_rank, 0), v_count);

    update public.reviews set rank = rank + 1 where rank >= p_rank;

    insert into public.reviews (sted, kommentar, rank)
    values (trim(p_sted), nullif(trim(p_kommentar), ''), p_rank)
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
    v_rank integer;
begin
    if not public.sjekk_passord(p_passord) then
        raise exception 'Feil passord' using errcode = '28P01';
    end if;

    perform pg_advisory_xact_lock(hashtext('reviews'));

    delete from public.reviews where id = p_id returning rank into v_rank;

    if not found then
        return false;
    end if;

    update public.reviews set rank = rank - 1 where rank > v_rank;

    return true;
end;
$$;

grant execute on function public.insert_review(text, text, integer, text) to anon;
grant execute on function public.delete_review(bigint, text) to anon;
