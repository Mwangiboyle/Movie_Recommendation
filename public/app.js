const searchInput = document.querySelector("#movie-search");
const searchResults = document.querySelector("#search-results");
const resultCount = document.querySelector("#result-count");
const selectedSection = document.querySelector("#selected-section");
const selectedMovie = document.querySelector("#selected-movie");
const recommendationsSection = document.querySelector("#recommendations-section");
const recommendationsGrid = document.querySelector("#recommendations-grid");
const recommendationsStatus = document.querySelector("#recommendations-status");
const movieCardTemplate = document.querySelector("#movie-card-template");

const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const recommendationCache = new Map();
let allMovies = [];
let requestToken = 0;

function movieSearchText(movie) {
  return [movie.title, movie.year, movie.genre].filter(Boolean).join(" ").toLowerCase();
}

function formatVotes(votes) {
  if (!votes) {
    return "";
  }
  return compactFormatter.format(votes);
}

function setTextOrHide(element, text) {
  if (text) {
    element.textContent = text;
    element.hidden = false;
  } else {
    element.textContent = "";
    element.hidden = true;
  }
}

function createMovieCard(movie) {
  const fragment = movieCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".movie-card");
  const poster = card.querySelector(".movie-card__poster");

  if (movie.poster) {
    poster.src = movie.poster;
    poster.alt = `${movie.title} poster`;
    poster.addEventListener("error", () => {
      poster.hidden = true;
    });
  } else {
    poster.hidden = true;
  }

  setTextOrHide(card.querySelector(".movie-card__title"), movie.title);
  setTextOrHide(card.querySelector(".movie-card__year"), movie.year);
  setTextOrHide(card.querySelector(".movie-card__runtime"), movie.runtime);
  setTextOrHide(
    card.querySelector(".movie-card__rating"),
    movie.rating ? `★ ${movie.rating}` : "",
  );
  setTextOrHide(card.querySelector(".movie-card__certificate"), movie.certificate);
  setTextOrHide(card.querySelector(".movie-card__genre"), movie.genre);

  const overview = card.querySelector(".movie-card__overview");
  setTextOrHide(overview, movie.overview);

  setTextOrHide(card.querySelector(".movie-card__director"), movie.director);

  const stars = (movie.stars || []).filter(Boolean).join(", ");
  setTextOrHide(card.querySelector(".movie-card__stars"), stars);

  const votes = formatVotes(movie.votes);
  setTextOrHide(card.querySelector(".movie-card__votes"), votes);

  const grossLine = card.querySelector(".movie-card__gross-line");
  if (movie.gross) {
    setTextOrHide(card.querySelector(".movie-card__gross"), `$${movie.gross}`);
    grossLine.hidden = false;
  } else {
    grossLine.hidden = true;
  }

  if (!votes && !movie.gross) {
    card.querySelector(".movie-card__votes-line").hidden = true;
  }

  return card;
}

function renderSelectedMovie(movie) {
  selectedMovie.replaceChildren(createMovieCard(movie));
}

function renderRecommendations(movies) {
  recommendationsGrid.replaceChildren(
    ...movies.map((movie) => createMovieCard(movie)),
  );

  if (movies.length === 0) {
    recommendationsStatus.hidden = false;
    recommendationsStatus.textContent = "No recommendations found for this movie.";
  } else {
    recommendationsStatus.hidden = true;
    recommendationsStatus.textContent = "";
  }
}

async function selectMovie(movie) {
  searchResults.hidden = true;
  selectedSection.hidden = false;
  recommendationsSection.hidden = false;
  recommendationsGrid.replaceChildren();
  recommendationsStatus.hidden = false;
  recommendationsStatus.textContent = `Finding movies similar to ${movie.title}...`;
  renderSelectedMovie(movie);
  document.title = `${movie.title} · Movie Recommendation`;
  selectedSection.scrollIntoView({ behavior: "smooth", block: "start" });

  const token = ++requestToken;
  const cacheKey = String(movie.id);

  if (recommendationCache.has(cacheKey)) {
    const payload = recommendationCache.get(cacheKey);
    renderSelectedMovie(payload.movie);
    renderRecommendations(payload.recommendations);
    return;
  }

  try {
    const response = await fetch(
      `/api/recommend?id=${encodeURIComponent(movie.id)}`,
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (token !== requestToken) {
      return;
    }

    recommendationCache.set(cacheKey, payload);
    renderSelectedMovie(payload.movie);
    renderRecommendations(payload.recommendations);
  } catch (error) {
    if (token !== requestToken) {
      return;
    }
    recommendationsStatus.hidden = false;
    recommendationsStatus.textContent = `Could not load recommendations. ${error.message}`;
  }
}

function createSearchResult(movie) {
  const item = document.createElement("li");
  item.className = "search-result";
  item.tabIndex = 0;
  item.setAttribute("role", "option");
  item.dataset.movieId = String(movie.id);

  const main = document.createElement("div");
  main.className = "search-result__main";

  const poster = document.createElement("img");
  poster.className = "search-result__poster";
  poster.alt = "";
  poster.loading = "lazy";
  if (movie.poster) {
    poster.src = movie.poster;
    poster.addEventListener("error", () => {
      poster.hidden = true;
    });
  } else {
    poster.hidden = true;
  }

  const info = document.createElement("div");
  info.className = "search-result__info";

  const title = document.createElement("span");
  title.className = "search-result__title";
  title.textContent = movie.title;

  const meta = document.createElement("span");
  meta.className = "search-result__meta";
  meta.textContent = [movie.year, movie.genre].filter(Boolean).join(" · ");

  info.append(title, meta);
  main.append(poster, info);

  const rating = document.createElement("span");
  rating.className = "search-result__rating";
  rating.textContent = movie.rating ? `★ ${movie.rating}` : "";

  item.append(main, rating);

  item.addEventListener("click", () => selectMovie(movie));
  item.addEventListener("keydown", (event) => {
    const results = getResultItems();
    const index = results.indexOf(item);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusResult(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) {
        searchInput.focus();
      } else {
        focusResult(index - 1);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMovie(movie);
    } else if (event.key === "Escape") {
      searchResults.hidden = true;
      searchInput.focus();
    }
  });

  return item;
}

function getResultItems() {
  return Array.from(searchResults.querySelectorAll(".search-result"));
}

function focusResult(index) {
  const results = getResultItems();
  if (results.length === 0) {
    return;
  }
  const boundedIndex = Math.max(0, Math.min(results.length - 1, index));
  results[boundedIndex].focus();
}

function searchMovies(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return allMovies
    .map((movie) => {
      const title = movie.title.toLowerCase();
      if (title === normalizedQuery) {
        return { movie, score: 0 };
      }
      if (title.startsWith(normalizedQuery)) {
        return { movie, score: 1 };
      }
      if (title.includes(normalizedQuery)) {
        return { movie, score: 2 };
      }
      if (movieSearchText(movie).includes(normalizedQuery)) {
        return { movie, score: 3 };
      }
      return { movie, score: -1 };
    })
    .filter((entry) => entry.score >= 0)
    .sort((first, second) => {
      if (first.score !== second.score) {
        return first.score - second.score;
      }
      return first.movie.title.localeCompare(second.movie.title);
    })
    .slice(0, 12)
    .map((entry) => entry.movie);
}

function updateSearch() {
  const query = searchInput.value;

  if (!query.trim()) {
    searchResults.hidden = true;
    searchResults.replaceChildren();
    resultCount.textContent = allMovies.length
      ? `${numberFormatter.format(allMovies.length)} movies available`
      : "Loading movies...";
    return;
  }

  const matches = searchMovies(query);
  resultCount.textContent = `${numberFormatter.format(matches.length)} ${
    matches.length === 1 ? "match" : "matches"
  }`;

  searchResults.replaceChildren();

  if (matches.length === 0) {
    const empty = document.createElement("li");
    empty.className = "search-empty";
    empty.textContent = "No movies found. Try a different title.";
    searchResults.append(empty);
  } else {
    searchResults.append(...matches.map((movie) => createSearchResult(movie)));
  }

  searchResults.hidden = false;
}

function handleSearchKeydown(event) {
  if (event.key === "ArrowDown") {
    const firstResult = getResultItems()[0];
    if (firstResult) {
      event.preventDefault();
      firstResult.focus();
    }
  } else if (event.key === "Enter") {
    const firstResult = getResultItems()[0];
    if (firstResult) {
      event.preventDefault();
      firstResult.click();
    }
  } else if (event.key === "Escape") {
    searchResults.hidden = true;
  }
}

async function loadMovies() {
  resultCount.textContent = "Loading movies...";

  try {
    const response = await fetch("/api/movies");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const payload = await response.json();
    allMovies = Array.isArray(payload.movies) ? payload.movies : [];
    resultCount.textContent = `${numberFormatter.format(allMovies.length)} movies available`;
  } catch (error) {
    resultCount.textContent = "Could not load the movie list.";
    console.error(error);
  }
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-section")) {
    searchResults.hidden = true;
  }
});

searchInput.addEventListener("input", updateSearch);
searchInput.addEventListener("keydown", handleSearchKeydown);

loadMovies();
