// ╔══════════════════════════════════════════════════════════════════════╗
// ║                   🔍  SEARCH API ROUTE  🔍                         ║
// ║                                                                    ║
// ║  Server-side proxy for TMDB multi-search.                          ║
// ║                                                                    ║
// ║  WHY THIS EXISTS:                                                  ║
// ║    The search page used to call api.themoviedb.org straight from   ║
// ║    the browser. That failed in the wild (browser-verified twice    ║
// ║    on 2026-11-28: "Fight Club" → "No results found", even though   ║
// ║    TMDB itself returns the film fine), while the home page —       ║
// ║    which fetches TMDB from the server — always worked.             ║
// ║    Search now runs on the server, on the same path as the home     ║
// ║    page, so a flaky browser→TMDB hop can never empty the           ║
// ║    results again.                                                  ║
// ║                                                                    ║
// ║  The response shape is TMDB's own { results, page, ... } so the    ║
// ║  search page and watch-party search need no changes.               ║
// ╚══════════════════════════════════════════════════════════════════════╝

export const dynamic = 'force-dynamic';

// TMDB key — the same client key lib/tmdb.js uses (already public in the
// browser bundle). Kept here so the search hop stays server-side.
const API_KEY = '5ad947200f7bbf9bafa9fed1cf3991af';
const BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q') || '';
  if (!q.trim()) {
    return Response.json({ results: [] });
  }

  const response = await fetch(
    `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
  );

  if (!response.ok) {
    return Response.json(
      { error: 'Search failed', results: [] },
      { status: 502 }
    );
  }

  return Response.json(await response.json());
}
