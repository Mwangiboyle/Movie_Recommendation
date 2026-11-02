const { movies, recommendations } = require("../data/_data.js");

const moviesById = new Map(movies.map((movie) => [String(movie.id), movie]));

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300",
};

function respond(statusCode, payload) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      ...respond(405, { error: "Method not allowed" }),
      headers: { ...headers, Allow: "GET" },
    };
  }

  const rawId = event.queryStringParameters?.id;

  if (!rawId || !/^\d+$/.test(rawId)) {
    return respond(400, { error: "A numeric movie id is required" });
  }

  const movie = moviesById.get(String(Number(rawId)));

  if (!movie) {
    return respond(404, { error: "Movie not found" });
  }

  const recommendationIds = recommendations[String(movie.id)] || [];
  const recommendedMovies = recommendationIds
    .map((id) => moviesById.get(String(id)))
    .filter(Boolean);

  return respond(200, {
    movie,
    recommendations: recommendedMovies,
  });
};
