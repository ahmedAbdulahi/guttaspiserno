async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Noe gikk galt (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function fromApi(r) {
  return {
    id: r.id,
    sted: r.sted,
    navn: r.navn,
    kommentar: r.kommentar ?? "",
    rank: r.rank,
    date: r.created_at,
  };
}

export async function fetchReviews() {
  const reviews = await request("/reviews");
  return reviews.map(fromApi);
}

export async function createReview({ sted, navn, kommentar, rank }) {
  const review = await request("/reviews", {
    method: "POST",
    body: JSON.stringify({ sted, navn, kommentar: kommentar || null, rank }),
  });
  return fromApi(review);
}

export async function deleteReview(id) {
  await request(`/reviews/${id}`, { method: "DELETE" });
}
