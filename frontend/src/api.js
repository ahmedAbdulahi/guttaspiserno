import { supabase } from "./supabase.js";

const PASSORD_NØKKEL = "guttaspiser-passord";

function orThrow({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

function fromApi(r) {
  return {
    id: r.id,
    sted: r.sted,
    kommentar: r.kommentar ?? "",
    rank: r.rank,
    date: r.created_at,
  };
}

/**
 * Passordet ligger i localStorage så man slipper å skrive det hver gang.
 * Det er delt og lavterskel – databasen er uansett det som sjekker det.
 */
function hentPassord() {
  return localStorage.getItem(PASSORD_NØKKEL);
}

export function erLåstOpp() {
  return Boolean(hentPassord());
}

/** Sjekker passordet mot hashen i databasen før vi viser skjemaet. */
export async function låsOpp(passord) {
  const riktig = orThrow(await supabase.rpc("sjekk_passord", { p_passord: passord }));
  if (!riktig) throw new Error("Feil passord");
  localStorage.setItem(PASSORD_NØKKEL, passord);
}

export function lås() {
  localStorage.removeItem(PASSORD_NØKKEL);
}

/**
 * Som orThrow, men låser appen igjen hvis databasen avviser passordet – da er
 * det lagrede passordet utdatert, og man må skrive det nye.
 */
function skrivOrThrow({ data, error }) {
  if (error?.message.includes("Feil passord")) {
    lås();
    throw new Error("Feil passord – lås opp på nytt");
  }
  return orThrow({ data, error });
}

export async function fetchReviews() {
  const rows = orThrow(
    await supabase
      .from("reviews")
      .select("*")
      .order("rank", { ascending: true })
  );
  return rows.map(fromApi);
}

/**
 * Setter inn på plass `rank`. Funksjonen i databasen flytter stedene under
 * ned ett hakk, i én transaksjon.
 */
export async function createReview({ sted, kommentar, rank }) {
  const row = skrivOrThrow(
    await supabase.rpc("insert_review", {
      p_sted: sted,
      p_kommentar: kommentar || null,
      p_rank: rank,
      p_passord: hentPassord(),
    })
  );
  return fromApi(row);
}

export async function deleteReview(id) {
  const fantes = skrivOrThrow(
    await supabase.rpc("delete_review", { p_id: id, p_passord: hentPassord() })
  );
  if (!fantes) throw new Error(`Fant ikke review ${id}`);
}
