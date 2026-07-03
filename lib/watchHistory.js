// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  🍪  WATCH HISTORY & PROGRESS  🍪                   ║
// ║                                                                    ║
// ║  This file manages the user's "Continue Watching" history AND      ║
// ║  their playback progress (how far into a movie they watched).     ║
// ║                                                                    ║
// ║  STORAGE:                                                          ║
// ║    - Watch History: stored in cookies (small, 15 items max)       ║
// ║    - Watch Progress: stored in localStorage (more space for        ║
// ║      tracking exact timestamps like "watched 1hr 23min")          ║
// ║                                                                    ║
// ║  FUNCTIONS:                                                        ║
// ║    1. getWatchHistory()       → Read what you've watched before    ║
// ║    2. addToWatchHistory()     → Save a new movie/show you watched ║
// ║    3. clearWatchHistory()     → Erase all your watch history      ║
// ║    4. updateWatchProgress()   → Save how far you've watched       ║
// ║    5. getWatchProgress()      → Get how far you've watched        ║
// ║    6. getAllWatchProgress()    → Get progress for all items        ║
// ║    7. clearWatchProgress()    → Erase all progress data           ║
// ╚══════════════════════════════════════════════════════════════════════╝


// ──────────────────────────────────────────────────────────────────────
// 🏷️ COOKIE NAME & LOCALSTORAGE KEY
// ──────────────────────────────────────────────────────────────────────
const COOKIE_NAME = 'idk_watch_history';
const PROGRESS_KEY = 'idk_watch_progress';

// ──────────────────────────────────────────────────────────────────────
// 📏 MAX HISTORY — only keep the last 15 items
// ──────────────────────────────────────────────────────────────────────
const MAX_HISTORY = 15;


// ──────────────────────────────────────────────────────────────────────
// 📖 GET WATCH HISTORY — Read what the user has watched before
// ──────────────────────────────────────────────────────────────────────
export function getWatchHistory() {

  if (typeof document === 'undefined') return [];

  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return [];

  try {
    return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
  } catch {
    return [];
  }
}


// ──────────────────────────────────────────────────────────────────────
// ➕ ADD TO WATCH HISTORY — Save that the user just watched something
// ──────────────────────────────────────────────────────────────────────
export function addToWatchHistory(item) {

  if (typeof document === 'undefined') return;

  const history = getWatchHistory();

  const filtered = history.filter(h => !(h.id === item.id && h.type === item.type));

  filtered.unshift({
    id: item.id,
    type: item.type,
    title: item.title,
    poster: item.poster,
    rating: item.rating,
    season: item.season || null,
    episode: item.episode || null,
    timestamp: Date.now(),
  });

  const trimmed = filtered.slice(0, MAX_HISTORY);

  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(trimmed))}; path=/; expires=${expires}; SameSite=Lax`;
}


// ──────────────────────────────────────────────────────────────────────
// 🗑️ CLEAR WATCH HISTORY — Erase everything
// ──────────────────────────────────────────────────────────────────────
export function clearWatchHistory() {

  if (typeof document === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}


// ══════════════════════════════════════════════════════════════════════
//                    ⏱️  WATCH PROGRESS (localStorage)
// ══════════════════════════════════════════════════════════════════════
// Since the video player is inside an iframe from external providers,
// we can't directly access the video's currentTime. Instead, we track
// elapsed time: when the user starts watching, we record the start
// timestamp. When they leave the page (beforeunload), we calculate
// how long they watched and save it.
//
// Each progress entry looks like:
//   {
//     "movie_550": { watchedSeconds: 3600, totalSeconds: 8400, updatedAt: 123... }
//     "tv_1396_2_3": { watchedSeconds: 1200, totalSeconds: 2700, updatedAt: 123... }
//   }
// ══════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// 🔑 BUILD PROGRESS KEY
// Creates a unique key for each movie or TV episode.
// Movies: "movie_550"
// TV episodes: "tv_1396_2_3" (show 1396, season 2, episode 3)
// ──────────────────────────────────────────────────────────────────────
function buildProgressKey(id, type, season, episode) {
  if (type === 'tv' && season && episode) {
    return `${type}_${id}_${season}_${episode}`;
  }
  return `${type}_${id}`;
}


// ──────────────────────────────────────────────────────────────────────
// 📦 GET ALL PROGRESS DATA from localStorage
// Returns the entire progress object, or an empty object if none exists.
// ──────────────────────────────────────────────────────────────────────
function getAllProgressData() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}


// ──────────────────────────────────────────────────────────────────────
// 💾 SAVE ALL PROGRESS DATA to localStorage
// ──────────────────────────────────────────────────────────────────────
function saveAllProgressData(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full — silently fail
  }
}


// ──────────────────────────────────────────────────────────────────────
// ⏱️ UPDATE WATCH PROGRESS
// Called when the user leaves the watch page (beforeunload) or
// periodically while watching. Saves how many seconds they've watched.
//
// Parameters:
//   id: TMDB ID
//   type: "movie" or "tv"
//   watchedSeconds: total seconds watched so far
//   totalSeconds: total runtime of the movie/episode in seconds
//   season/episode: for TV shows
// ──────────────────────────────────────────────────────────────────────
export function updateWatchProgress(id, type, watchedSeconds, totalSeconds, season, episode) {
  if (typeof window === 'undefined') return;
  if (!watchedSeconds || isNaN(watchedSeconds) || watchedSeconds < 0) return;

  const key = buildProgressKey(id, type, season, episode);
  const allProgress = getAllProgressData();

  // Get existing progress — only update if new time is greater
  // (prevents overwriting a longer session with a shorter one)
  const existing = allProgress[key];
  const existingWatched = existing ? existing.watchedSeconds : 0;

  allProgress[key] = {
    watchedSeconds: Math.max(watchedSeconds, existingWatched),
    totalSeconds: totalSeconds || (existing ? existing.totalSeconds : 0),
    updatedAt: Date.now(),
  };

  saveAllProgressData(allProgress);
}


// ──────────────────────────────────────────────────────────────────────
// 📊 GET WATCH PROGRESS
// Returns the progress for a specific movie or TV episode.
// Returns: { watchedSeconds, totalSeconds, percentage } or null
// ──────────────────────────────────────────────────────────────────────
export function getWatchProgress(id, type, season, episode) {
  if (typeof window === 'undefined') return null;

  const key = buildProgressKey(id, type, season, episode);
  const allProgress = getAllProgressData();
  const entry = allProgress[key];

  if (!entry || !entry.watchedSeconds || isNaN(entry.watchedSeconds)) return null;

  const percentage = entry.totalSeconds > 0
    ? Math.min((entry.watchedSeconds / entry.totalSeconds) * 100, 100)
    : 0;

  return {
    watchedSeconds: entry.watchedSeconds,
    totalSeconds: entry.totalSeconds || 0,
    percentage: isNaN(percentage) ? 0 : Math.round(percentage),
  };
}


// ──────────────────────────────────────────────────────────────────────
// 📊 GET ALL WATCH PROGRESS
// Returns progress for ALL items. Used by MovieCard to check if
// a specific movie/show has any progress to show a bar.
// ──────────────────────────────────────────────────────────────────────
export function getAllWatchProgress() {
  return getAllProgressData();
}


// ──────────────────────────────────────────────────────────────────────
// 🗑️ CLEAR WATCH PROGRESS — Erase all progress data
// ──────────────────────────────────────────────────────────────────────
export function clearWatchProgress() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROGRESS_KEY);
}


// ──────────────────────────────────────────────────────────────────────
// 🗑️ REMOVE SINGLE WATCH PROGRESS
// ──────────────────────────────────────────────────────────────────────
export function removeWatchProgress(id, type, season, episode) {
    if (typeof window === 'undefined') return;
    const key = buildProgressKey(id, type, season, episode);
    const allProgress = getAllProgressData();
    delete allProgress[key];
    saveAllProgressData(allProgress);
}


// ──────────────────────────────────────────────────────────────────────
// ⏰ FORMAT SECONDS to human-readable string
// Converts seconds into "1h 23m" or "45m" or "2m" format.
// Used to display "Resume from 1h 23m" on the watch page.
// ──────────────────────────────────────────────────────────────────────
export function formatWatchTime(seconds) {
  if (!seconds || seconds < 60 || isNaN(seconds)) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
