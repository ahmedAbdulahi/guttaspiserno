import { useEffect, useState } from "react";

const STORAGE_KEY = "gutta-spiser-no-ratings";

function loadRatings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function StarPicker({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= value ? "active" : ""}
          onClick={() => onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function RatingCard({ rating, onDelete }) {
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
        <span className="rating-sted">{rating.sted}</span>
        <span className="rating-stars">
          {"★".repeat(rating.stjerner)}
          {"☆".repeat(5 - rating.stjerner)}
        </span>
      </div>
      <div className="rating-meta">
        {rating.navn} · {date}
      </div>
      {rating.kommentar && <div className="rating-kommentar">{rating.kommentar}</div>}
    </div>
  );
}

export default function App() {
  const [ratings, setRatings] = useState(loadRatings);
  const [sted, setSted] = useState("");
  const [navn, setNavn] = useState("");
  const [stjerner, setStjerner] = useState(0);
  const [kommentar, setKommentar] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
  }, [ratings]);

  function handleSubmit(e) {
    e.preventDefault();
    if (stjerner === 0) {
      alert("Velg antall stjerner!");
      return;
    }

    setRatings([
      ...ratings,
      {
        id: Date.now(),
        sted: sted.trim(),
        navn: navn.trim(),
        stjerner,
        kommentar: kommentar.trim(),
        date: new Date().toISOString(),
      },
    ]);

    setSted("");
    setNavn("");
    setStjerner(0);
    setKommentar("");
  }

  function handleDelete(id) {
    setRatings(ratings.filter((r) => r.id !== id));
  }

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>GUTTA SPISER NO</h1>
          <p className="hero-sub">bla ned for å rate</p>
          <div className="scroll-arrow">↓</div>
        </div>
      </section>

      <section className="content">
        <div className="container">
          <h2>Legg til rating</h2>
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
            <StarPicker value={stjerner} onChange={setStjerner} />
            <textarea
              placeholder="Kommentar (valgfritt)"
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
            />
            <button type="submit">Legg til</button>
          </form>

          <h2>Ratings</h2>
          <div className="rating-list">
            {ratings.length === 0 ? (
              <p className="empty-state">Ingen ratings enda. Bli den første!</p>
            ) : (
              ratings
                .slice()
                .reverse()
                .map((rating) => (
                  <RatingCard key={rating.id} rating={rating} onDelete={handleDelete} />
                ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
