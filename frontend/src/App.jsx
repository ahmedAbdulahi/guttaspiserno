import { useEffect, useRef, useState } from "react";
import MouseTrail from "./MouseTrail.jsx";
import { createReview, deleteReview, fetchReviews } from "./api.js";

function sameNavn(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function RatingCard({ rating, position, onDelete }) {
  const date = new Date(rating.date).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rating-card">
      <button className="delete-btn" aria-label="Slett" onClick={() => onDelete(rating.id)}>
        ✕
      </button>
      <div className="rating-card-top">
        <span className="rating-rank">#{position}</span>
        <span className="rating-sted">{rating.sted}</span>
      </div>
      <div className="rating-meta">{date}</div>
      {rating.kommentar && <div className="rating-kommentar">{rating.kommentar}</div>}
    </div>
  );
}

export default function App() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sted, setSted] = useState("");
  const [navn, setNavn] = useState("");
  const [kommentar, setKommentar] = useState("");
  const [heroVisible, setHeroVisible] = useState(true);
  const [comparison, setComparison] = useState(null);
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

  // Lagrer på serveren (som flytter de andre stedene til personen ned) og henter lista på nytt
  async function save(entry, rank) {
    setSaving(true);
    try {
      await createReview({ ...entry, rank });
      setComparison(null);
      resetForm();
      await reload();
    } catch (err) {
      setError(err.message);
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
    setNavn("");
    setKommentar("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const entry = { sted: sted.trim(), navn: navn.trim(), kommentar: kommentar.trim() };
    const personRatings = ratings
      .filter((r) => sameNavn(r.navn, entry.navn))
      .sort((a, b) => a.rank - b.rank);

    if (personRatings.length === 0) {
      await save(entry, 0);
      return;
    }

    setComparison({ entry, list: personRatings, lo: 0, hi: personRatings.length });
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

  async function handleDelete(id) {
    try {
      await deleteReview(id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const grouped = {};
  for (const r of ratings) {
    if (!grouped[r.navn]) grouped[r.navn] = [];
    grouped[r.navn].push(r);
  }

  const compareMid = comparison
    ? Math.floor((comparison.lo + comparison.hi) / 2)
    : null;
  const compareCandidate = comparison ? comparison.list[compareMid] : null;

  return (
    <>
      <MouseTrail active={heroVisible} />

      <section className="hero" ref={heroRef}>
        <div className="hero-content">
          <h1>GUTTA SPISER NO</h1>
        </div>
      </section>

      <section className="content">
        <div className="container">
          <h2>Legg til rating</h2>

          {comparison ? (
            <div className="compare-box">
              <p className="compare-question">
                Hva var best, ifølge {comparison.entry.navn}?
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
              <input
                type="text"
                placeholder="Hvem rater?"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                required
              />
              <textarea
                placeholder="Kommentar (valgfritt)"
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
              />
              <button type="submit" disabled={saving}>
                {saving ? "Lagrer..." : "Legg til"}
              </button>
            </form>
          )}

          {error && <p className="error-message">{error}</p>}

          <h2>Ratings</h2>
          <div className="rating-list">
            {loading ? (
              <p className="empty-state">Henter ratings...</p>
            ) : Object.keys(grouped).length === 0 ? (
              <p className="empty-state">Ingen ratings enda. Bli den første!</p>
            ) : (
              Object.entries(grouped).map(([personNavn, personRatings]) => (
                <div key={personNavn} className="person-group">
                  <h3 className="person-name">{personNavn}</h3>
                  {personRatings
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((rating) => (
                      <RatingCard
                        key={rating.id}
                        rating={rating}
                        position={rating.rank + 1}
                        onDelete={handleDelete}
                      />
                    ))}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
