// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🎬  TMDB API HELPERS  🎬                        ║
// ║                                                                    ║
// ║  TMDB = "The Movie Database" — a giant online library of movies.   ║
// ║  This file has functions that ask TMDB questions and get answers.   ║
// ║  Think of each function as a different question we can ask.        ║
// ╚══════════════════════════════════════════════════════════════════════╝

// 🔑 API KEY — like a library card. We need this to get data from TMDB.
const API_KEY = '5ad947200f7bbf9bafa9fed1cf3991af';

// 🌐 BASE URL — the "address" of the TMDB server. We add to this to ask questions.
const BASE_URL = 'https://api.themoviedb.org/3';

// 🖼️ IMAGE BASE URL — where TMDB stores all movie poster images.
// TMDB gives us partial paths like "/abc.jpg". We put this in front to get the full link.
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original/';


// ──────────────────────────────────────────────────────────────────────
// 🛠️ FETCH WITH TIMEOUT, RETRY, & CACHE
// Serves as a robust wrapper around standard fetch to handle poor internet.
// ──────────────────────────────────────────────────────────────────────
const fetchWithRetryCache = async (url, options = {}, ttlHours = 24) => {
  const isClient = typeof window !== 'undefined';
  const cacheKey = `tmdb_cache_${url}`;

  // 1. If client-side, check cache first
  if (isClient) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = (Date.now() - timestamp) / 1000 / 60 / 60; // in hours

        // If we are online and cache is fresh, or if we are offline, use cache immediately
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (age < ttlHours || isOffline) {
          console.log(`[TMDB Cache Hit] ${url}`);
          return data;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage cache:', e);
    }
  }

  // Helper to fetch with timeout
  const fetchWithTimeout = async (url, options, timeoutMs = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  // 2. Try fetching with retries
  let lastError;
  const retries = 2; // Try up to 3 times total
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = attempt * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const response = await fetchWithTimeout(url, options, 8000);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Cache successful response on client side
      if (isClient) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('LocalStorage full, clearing older caches...', e);
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('tmdb_cache_')) {
                localStorage.removeItem(key);
              }
            }
            localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
          } catch (innerErr) {
            console.error('Failed to write to localStorage even after cleanup:', innerErr);
          }
        }
      }
      return data;
    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed for ${url}:`, error);
      lastError = error;
    }
  }

  // 3. Fallback to cache on final failure if on client-side
  if (isClient) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data } = JSON.parse(cached);
        console.warn(`[TMDB Cache Fallback] Network failed, using stale cache for ${url}`);
        return data;
      }
    } catch (e) {
      console.warn('Error reading from fallback cache:', e);
    }
  }

  throw lastError || new Error(`Failed to fetch: ${url}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🔥 FETCH TRENDING
// Asks: "What movies & shows are trending this week?"
// "Trending" = what lots of people are watching RIGHT NOW.
// ──────────────────────────────────────────────────────────────────────
export const fetchTrending = async () => {
  return fetchWithRetryCache(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🌟 FETCH POPULAR MOVIES
// Asks: "What movies are consistently popular?"
// ──────────────────────────────────────────────────────────────────────
export const fetchPopular = async () => {
  return fetchWithRetryCache(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// ⭐ FETCH TOP RATED
// Asks: "What are the highest-rated movies ever?"
// ──────────────────────────────────────────────────────────────────────
export const fetchTopRated = async () => {
  return fetchWithRetryCache(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🔍 FETCH SEARCH RESULTS
// Asks: "Find movies/shows matching what the user typed!"
// ──────────────────────────────────────────────────────────────────────
export const fetchSearch = async (query) => {
  if (!query) return { results: [] };
  return fetchWithRetryCache(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🎥 FETCH MOVIE DETAILS
// Asks: "Tell me EVERYTHING about movie #[id]!"
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieDetails = async (id) => {
  return fetchWithRetryCache(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV SHOW DETAILS
// Asks: "Tell me everything about TV show #[id]!"
// TV shows have extra info movies don't: seasons, episode counts, etc.
// ──────────────────────────────────────────────────────────────────────
export const fetchTVDetails = async (id) => {
  return fetchWithRetryCache(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 📋 FETCH TV SEASON EPISODES
// Asks: "Show me all episodes in season X of show #[id]!"
// ──────────────────────────────────────────────────────────────────────
export const fetchTVSeasonEpisodes = async (id, seasonNumber) => {
  return fetchWithRetryCache(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🎬 FETCH DISCOVER MOVIES — Browse ALL movies with filters & pagination
// Asks: "Show me movies matching these filters, page by page!"
// ──────────────────────────────────────────────────────────────────────
export const fetchDiscoverMovies = async (page = 1, filters = {}) => {
  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${page}`;
  url += `&sort_by=${filters.sortBy || 'popularity.desc'}`;

  if (filters.genre) {
    url += `&with_genres=${filters.genre}`;
  }

  if (filters.year) {
    url += `&primary_release_year=${filters.year}`;
  }

  if (filters.sortBy && filters.sortBy.includes('vote_average')) {
    url += `&vote_count.gte=200`;
  }

  return fetchWithRetryCache(url);
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH DISCOVER TV — Browse ALL TV shows with filters & pagination
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

  return fetchWithRetryCache(url);
};


// ──────────────────────────────────────────────────────────────────────
// 🎭 FETCH MOVIE GENRES
// Asks: "What are all the possible movie genre categories?"
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieGenres = async () => {
  return fetchWithRetryCache(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV GENRES
// Asks: "What are all the possible TV show genre categories?"
// ──────────────────────────────────────────────────────────────────────
export const fetchTVGenres = async () => {
  return fetchWithRetryCache(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🎭 FETCH MOVIE CREDITS (Cast & Crew)
// Asks: "Who acted in and directed movie #[id]?"
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieCredits = async (id) => {
  return fetchWithRetryCache(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV CREDITS (Cast & Crew)
// Asks: "Who acted in and directed TV show #[id]?"
// ──────────────────────────────────────────────────────────────────────
export const fetchTVCredits = async (id) => {
  return fetchWithRetryCache(`${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}`);
};


// ──────────────────────────────────────────────────────────────────────
// 🎬 FETCH MOVIE VIDEOS (Trailers & Teasers)
// Asks: "Show me trailers and teasers for movie #[id]!"
// ──────────────────────────────────────────────────────────────────────
export const fetchMovieVideos = async (id) => {
  const data = await fetchWithRetryCache(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`);
  const trailers = (data.results || []).filter(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );
  return trailers;
};


// ──────────────────────────────────────────────────────────────────────
// 📺 FETCH TV VIDEOS (Trailers & Teasers)
// ──────────────────────────────────────────────────────────────────────
export const fetchTVVideos = async (id) => {
  const data = await fetchWithRetryCache(`${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}`);
  const trailers = (data.results || []).filter(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );
  return trailers;
};


// ──────────────────────────────────────────────────────────────────────
// 🖼️ GET IMAGE URL
// ──────────────────────────────────────────────────────────────────────
export const getImageUrl = (path) => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${path}`;
};


// ──────────────────────────────────────────────────────────────────────
// 📦 DEFAULT EXPORT
// ──────────────────────────────────────────────────────────────────────
const tmdbApi = {
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

export default tmdbApi;
