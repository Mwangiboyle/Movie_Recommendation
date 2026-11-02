const { movies } = require("../data/_data.js");

const movieIndex = movies
  .map(({ id, title, year, poster, genre, rating, runtime }) => ({
    id,
    title,
    year,
    poster,
    genre,
    rating,
    runtime,
  }))
  .sort((first, second) => first.title.localeCompare(second.title));

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: "GET" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ movies: movieIndex }),
  };
};
