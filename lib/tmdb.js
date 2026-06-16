// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🎬  TMDB API HELPERS  🎬                        ║
// ║                                                                    ║
// ║  TMDB = "The Movie Database" — a giant online library of movies.   ║
// ║  This file has functions that ask TMDB questions and get answers.   ║
// ║  Think of each function as a different question we can ask.        ║
// ╚══════════════════════════════════════════════════════════════════════╝

// 🔑 API KEY — like a library card. We need this to get data from TMDB.
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

// 🌐 BASE URL — the "address" of the TMDB server. We add to this to ask questions.
const BASE_URL = 'https://api.themoviedb.org/3';

// 🖼️ IMAGE BASE URL — where TMDB stores all movie poster images.
// TMDB gives us partial paths like "/abc.jpg". We put this in front to get the full link.
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original/';


// ──────────────────────────────────────────────────────────────────────
// 🔥 FETCH TRENDING
// Asks: "What movies & shows are trending this week?"
// "Trending" = what lots of people are watching RIGHT NOW.
// "async" = this needs to wait for TMDB to respond (like waiting for mail).
// ──────────────────────────────────────────────────────────────────────
export const fetchTrending = async () => {
  // "fetch" sends a message to TMDB over the internet.
  // "await" means wait patiently for the reply.
  const response = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
  // If something went wrong (TMDB is down, etc.), throw an error.
  if (!response.ok) throw new Error('Failed to fetch trending');
  // Convert the raw response into data we can use (like translating a letter).
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🌟 FETCH POPULAR MOVIES
// Asks: "What movies are consistently popular?"
// Different from trending — these are always-popular, not just this week.
// ──────────────────────────────────────────────────────────────────────
export const fetchPopular = async () => {
  const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch popular');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// ⭐ FETCH TOP RATED
// Asks: "What are the highest-rated movies ever?"
// These have the best reviews from thousands of voters.
// ──────────────────────────────────────────────────────────────────────
export const fetchTopRated = async () => {
  const response = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch top rated');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🔍 FETCH SEARCH RESULTS
// Asks: "Find movies/shows matching what the user typed!"
// "query" = whatever the user typed in the search bar (e.g., "Batman").
// "multi" = search movies AND TV shows at the same time.
// "encodeURIComponent" = makes special characters safe for URLs
//   (spaces become %20, etc.)
// ──────────────────────────────────────────────────────────────────────
export const fetchSearch = async (query) => {
  // If the search box is empty, don't bother asking TMDB. Return nothing.
  if (!query) return { results: [] };
  const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to fetch search');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🎥 FETCH MOVIE DETAILS
// Asks: "Tell me EVERYTHING about movie #[id]!"
// Returns: title, description, rating, poster, runtime, genres, etc.
// Every movie has a unique ID number, like a student ID.
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieDetails = async (id) => {
  const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch movie details');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV SHOW DETAILS
// Asks: "Tell me everything about TV show #[id]!"
// TV shows have extra info movies don't: seasons, episode counts, etc.
// ──────────────────────────────────────────────────────────────────────
export const fetchTVDetails = async (id) => {
  const response = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch TV details');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 📋 FETCH TV SEASON EPISODES
// Asks: "Show me all episodes in season X of show #[id]!"
// Returns: episode titles, descriptions, air dates, thumbnails.
// ──────────────────────────────────────────────────────────────────────
export const fetchTVSeasonEpisodes = async (id, seasonNumber) => {
  const response = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch season episodes');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🎬 FETCH DISCOVER MOVIES — Browse ALL movies with filters & pagination
// Asks: "Show me movies matching these filters, page by page!"
// Supports filtering by genre, year, and sort order.
// ──────────────────────────────────────────────────────────────────────
export const fetchDiscoverMovies = async (page = 1, filters = {}) => {
  // Start building the URL with required params
  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${page}`;

  // Add sort order (default: popularity descending)
  url += `&sort_by=${filters.sortBy || 'popularity.desc'}`;

  // Add genre filter if specified
  if (filters.genre) {
    url += `&with_genres=${filters.genre}`;
  }

  // Add year filter if specified
  if (filters.year) {
    url += `&primary_release_year=${filters.year}`;
  }

  // Add minimum vote count for rating sort to get meaningful results
  if (filters.sortBy && filters.sortBy.includes('vote_average')) {
    url += `&vote_count.gte=200`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch discover movies');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH DISCOVER TV — Browse ALL TV shows with filters & pagination
// Same as above but for TV shows instead of movies.
// ──────────────────────────────────────────────────────────────────────
export const fetchDiscoverTV = async (page = 1, filters = {}) => {
  let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&page=${page}`;

  url += `&sort_by=${filters.sortBy || 'popularity.desc'}`;

  if (filters.genre) {
    url += `&with_genres=${filters.genre}`;
  }

  if (filters.year) {
    url += `&first_air_date_year=${filters.year}`;
  }

  if (filters.sortBy && filters.sortBy.includes('vote_average')) {
    url += `&vote_count.gte=200`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch discover TV');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🎭 FETCH MOVIE GENRES
// Asks: "What are all the possible movie genre categories?"
// Returns a list like: [{id: 28, name: "Action"}, {id: 35, name: "Comedy"}, ...]
// Used to populate the genre filter dropdown on the Movies browse page.
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieGenres = async () => {
  const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch movie genres');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV GENRES
// Asks: "What are all the possible TV show genre categories?"
// Same concept as movie genres but for TV shows.
// ──────────────────────────────────────────────────────────────────────
export const fetchTVGenres = async () => {
  const response = await fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch TV genres');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🎭 FETCH MOVIE CREDITS (Cast & Crew)
// Asks: "Who acted in and directed movie #[id]?"
// Returns: cast (actors) and crew (directors, writers, etc.)
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieCredits = async (id) => {
  const response = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch movie credits');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV CREDITS (Cast & Crew)
// Asks: "Who acted in and directed TV show #[id]?"
// ──────────────────────────────────────────────────────────────────────
export const fetchTVCredits = async (id) => {
  const response = await fetch(`${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch TV credits');
  return response.json();
};


// ──────────────────────────────────────────────────────────────────────
// 🎬 FETCH MOVIE VIDEOS (Trailers & Teasers)
// Asks: "Show me trailers and teasers for movie #[id]!"
// Returns: a list of videos with YouTube keys, types (Trailer, Teaser, etc.)
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieVideos = async (id) => {
  const response = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch movie videos');
  const data = await response.json();
  // Filter for YouTube trailers only (most reliable)
  const trailers = (data.results || []).filter(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );
  return trailers;
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV VIDEOS (Trailers & Teasers)
// Same as movie videos but for TV shows.
// ──────────────────────────────────────────────────────────────────────
export const fetchTVVideos = async (id) => {
  const response = await fetch(`${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}`);
  if (!response.ok) throw new Error('Failed to fetch TV videos');
  const data = await response.json();
  const trailers = (data.results || []).filter(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );
  return trailers;
};


// ──────────────────────────────────────────────────────────────────────
// 🖼️ GET IMAGE URL
// Turns a partial path like "/abc.jpg" into a full URL the browser can load.
// Returns null if no path given (movie has no poster).
// ──────────────────────────────────────────────────────────────────────
export const getImageUrl = (path) => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${path}`;
};


// ──────────────────────────────────────────────────────────────────────
// 📦 DEFAULT EXPORT — bundles ALL functions into one package.
// Other files can import individual functions OR the whole bundle.
// ──────────────────────────────────────────────────────────────────────
export default {
  fetchTrending,
  fetchPopular,
  fetchTopRated,
  fetchSearch,
  fetchMovieDetails,
  fetchTVDetails,
  fetchTVSeasonEpisodes,
  fetchDiscoverMovies,
  fetchDiscoverTV,
  fetchMovieGenres,
  fetchTVGenres,
  fetchMovieCredits,
  fetchTVCredits,
  fetchMovieVideos,
  fetchTVVideos,
  getImageUrl
};
