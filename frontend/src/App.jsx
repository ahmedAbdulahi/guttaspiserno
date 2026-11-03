import { useEffect, useRef, useState } from "react";
import MouseTrail from "./MouseTrail.jsx";
import {
  createReview,
  deleteReview,
  erLåstOpp,
  fetchReviews,
  lås,
  låsOpp,
} from "./api.js";

function RatingCard({ rating, position, onDelete, kanSlette }) {
  const date = new Date(rating.date).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rating-card">
      {kanSlette && (
        <button
          className="delete-btn"
          aria-label={`Slett ${rating.sted}`}
          onClick={() => onDelete(rating)}
        >
          ✕
        </button>
      )}
      <div className="rating-card-top">
        <span className="rating-rank">#{position}</span>
        <span className="rating-sted">{rating.sted}</span>
      </div>
      <div className="rating-meta">{date}</div>
      {rating.kommentar && <div className="rating-kommentar">{rating.kommentar}</div>}
    </div>
  );
}


function SlettDialog({ rating, onBekreft, onAvbryt, sletter }) {
  const avbrytRef = useRef(null);

  useEffect(() => {
    avbrytRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onAvbryt();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAvbryt]);

  return (
    <div className="dialog-bakgrunn" onClick={onAvbryt}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slett-tittel"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="slett-tittel" className="dialog-tittel">
          Slette «{rating.sted}»?
        </p>
        <p className="dialog-tekst">
          Stedet forsvinner fra rangeringen, og de under rykker opp. Dette kan
          ikke angres.
        </p>
        <div className="dialog-knapper">
          <button type="button" ref={avbrytRef} className="dialog-avbryt" onClick={onAvbryt}>
            Avbryt
          </button>
          <button type="button" className="dialog-slett" onClick={onBekreft} disabled={sletter}>
            {sletter ? "Sletter..." : "Slett"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Passordport({ onLåstOpp }) {
  const [passord, setPassord] = useState("");
  const [sjekker, setSjekker] = useState(false);
  const [feil, setFeil] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSjekker(true);
    setFeil(null);
    try {
      await låsOpp(passord);
      setPassord("");
      onLåstOpp();
    } catch (err) {
      setFeil(err.message);
    } finally {
      setSjekker(false);
    }
  }

  return (
    <form className="passordport" onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Passord"
        value={passord}
        onChange={(e) => setPassord(e.target.value)}
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={sjekker || !passord}>
        {sjekker ? "Sjekker..." : "Lås opp"}
      </button>
      {feil && <p className="error-message">{feil}</p>}
    </form>
  );
}

export default function App() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sted, setSted] = useState("");
  const [kommentar, setKommentar] = useState("");
  const [heroVisible, setHeroVisible] = useState(true);
  const [comparison, setComparison] = useState(null);
  const [låstOpp, setLåstOpp] = useState(erLåstOpp);
  const [slettKandidat, setSlettKandidat] = useState(null);
  const [sletter, setSletter] = useState(false);
  const heroRef = useRef(null);

  async function reload() {
    try {
      setRatings(await fetchReviews());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // Lagrer på serveren (som flytter stedene under ned) og henter lista på nytt
  async function save(entry, rank) {
    setSaving(true);
    try {
      await createReview({ ...entry, rank });
      setComparison(null);
      resetForm();
      await reload();
    } catch (err) {
      setError(err.message);
      // Tilbake til skjemaet med teksten i behold – ellers blir man stående
      // og får samme sammenligningsspørsmål om igjen
      setComparison(null);
      // Databasen kan ha avvist et utdatert passord, og da er appen låst igjen
      setLåstOpp(erLåstOpp());
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function resetForm() {
    setSted("");
    setKommentar("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const entry = { sted: sted.trim(), kommentar: kommentar.trim() };
    const sortert = [...ratings].sort((a, b) => a.rank - b.rank);

    if (sortert.length === 0) {
      await save(entry, 0);
      return;
    }

    setComparison({ entry, list: sortert, lo: 0, hi: sortert.length });
  }

  async function handleCompare(newIsBetter) {
    const { entry, list, lo, hi } = comparison;
    const mid = Math.floor((lo + hi) / 2);
    const nextLo = newIsBetter ? lo : mid + 1;
    const nextHi = newIsBetter ? mid : hi;

    if (nextLo >= nextHi) {
      await save(entry, nextLo);
      return;
    }

    setComparison({ entry, list, lo: nextLo, hi: nextHi });
  }

  function handleLås() {
    setComparison(null);
    setError(null);
    lås();
    setLåstOpp(false);
  }

  async function bekreftSletting() {
    setSletter(true);
    try {
      await deleteReview(slettKandidat.id);
      setSlettKandidat(null);
      await reload();
    } catch (err) {
      setError(err.message);
      setSlettKandidat(null);
      setLåstOpp(erLåstOpp());
    } finally {
      setSletter(false);
    }
  }

  const compareMid = comparison
    ? Math.floor((comparison.lo + comparison.hi) / 2)
    : null;
  const compareCandidate = comparison ? comparison.list[compareMid] : null;

  return (
    <>
      <MouseTrail active={heroVisible} />

      {slettKandidat && (
        <SlettDialog
          rating={slettKandidat}
          sletter={sletter}
          onBekreft={bekreftSletting}
          onAvbryt={() => setSlettKandidat(null)}
        />
      )}

      <section className="hero" ref={heroRef}>
        <div className="hero-content">
          <h1>GUTTA SPISER NO</h1>
        </div>
      </section>

      <section className="content">
        <div className="container">
          <h2>Ratings</h2>
          <div className="rating-list">
            {loading ? (
              <p className="empty-state">Henter ratings...</p>
            ) : ratings.length === 0 ? (
              <p className="empty-state">Ingen ratings enda. Bli den første!</p>
            ) : (
              [...ratings]
                .sort((a, b) => a.rank - b.rank)
                .map((rating) => (
                  <RatingCard
                    key={rating.id}
                    rating={rating}
                    position={rating.rank + 1}
                    onDelete={setSlettKandidat}
                    kanSlette={låstOpp}
                  />
                ))
            )}
          </div>

          <div className="section-header">
            <h2>Legg til rating</h2>
            {låstOpp && (
              <button type="button" className="lock-btn" onClick={handleLås}>
                Lås
              </button>
            )}
          </div>

          {!låstOpp ? (
            <Passordport onLåstOpp={() => setLåstOpp(true)} />
          ) : comparison ? (
            <div className="compare-box">
              <p className="compare-question">
                Hva var best?
              </p>
              <div className="compare-options">
                <button type="button" disabled={saving} onClick={() => handleCompare(true)}>
                  {comparison.entry.sted}
                </button>
                <button type="button" disabled={saving} onClick={() => handleCompare(false)}>
                  {compareCandidate.sted}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Hvor spiste dere?"
                value={sted}
                onChange={(e) => setSted(e.target.value)}
                required
              />
              <textarea
                placeholder="Kommentar (valgfritt)"
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
              />
              <button type="submit" disabled={saving || !sted.trim()}>
                {saving ? "Lagrer..." : "Legg til"}
              </button>
            </form>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>
      </section>
    </>
  );
}
