// ╔══════════════════════════════════════════════════════════════════════╗
// ║                     🔍  SEARCH PAGE  🔍                            ║
// ║                                                                    ║
// ║  This page lets users search for movies and TV shows by typing    ║
// ║  keywords into a search box. Results appear as a grid of cards.   ║
// ║                                                                    ║
// ║  HOW IT WORKS:                                                     ║
// ║    1. User types something (e.g., "Batman")                       ║
// ║    2. After 400ms of not typing (debounce), we search TMDB        ║
// ║    3. Results are filtered to only movies and TV shows             ║
// ║    4. Results appear as MovieCard components in a grid             ║
// ║                                                                    ║
// ║  DEBOUNCING:                                                       ║
// ║    We don't search on EVERY keystroke (that would be too many     ║
// ║    requests). Instead, we wait 400ms after the user STOPS typing. ║
// ║    It's like waiting for someone to finish their sentence before   ║
// ║    responding, instead of interrupting after every word.           ║
// ║                                                                    ║
// ║  SUSPENSE:                                                         ║
// ║    The page uses React Suspense because useSearchParams() needs   ║
// ║    a Suspense boundary (Next.js requirement for streaming).       ║
// ║    We split the page into two components:                          ║
// ║      - SearchPage: the wrapper with Suspense                      ║
// ║      - SearchContent: the actual content with useSearchParams     ║
// ╚══════════════════════════════════════════════════════════════════════╝

// "use client" — runs in browser (search input, state, URL params)
"use client";

// ── IMPORTS ──
import { useState, useEffect, Suspense, useRef } from 'react';

// useSearchParams: reads URL query parameters (the "?q=batman" part)
import { useSearchParams } from 'next/navigation';

// Our TMDB search function
import { fetchSearch } from '@/lib/tmdb';

// The card component for displaying individual results
import MovieCard from '@/components/MovieCard';

// Icons for the search page
import { Search as SearchIcon, X, Film } from 'lucide-react';


// ──────────────────────────────────────────────────────────────────────
// SEARCH CONTENT — The actual search UI (separated for Suspense)
// ──────────────────────────────────────────────────────────────────────
function SearchContent() {

  // ── Read the URL query parameter ──
  // If the URL is "/search?q=batman", this gives us "batman".
  // This lets users share search result links with friends.
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // ── STATE ──
  // What the user has typed in the search box.
  const [query, setQuery] = useState(initialQuery);

  // The search results from TMDB (array of movie/show objects).
  const [results, setResults] = useState([]);

  // Are we currently waiting for search results?
  const [loading, setLoading] = useState(false);

  // Reference to hold the debounce timer
  const debounceTimeoutRef = useRef(null);

  // The search function — fetches results from TMDB immediately.
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      // Ask TMDB for results matching the query.
      const data = await fetchSearch(searchQuery);

      // Filter results to only include movies and TV shows.
      const filtered = (data.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 24);

      setResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── EFFECT: Search TMDB when the query changes ──
  // Uses debouncing: waits 400ms after the user stops typing
  // before sending the request. This prevents hammering TMDB
  // with a request for every single keystroke.
  useEffect(() => {
    // If the search box is empty, clear results and stop.
    if (!query.trim()) {
      setTimeout(() => {
        setResults([]);
      }, 0);
      return;
    }

    // Cancel any existing debounce timer
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set up the debounce timer: wait 400ms before searching.
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);

    // Cleanup: cancel the timer if the query changes again
    // before the 400ms is up. This is the debounce mechanism!
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]); // Re-run whenever the query changes.

  // ── Handle Form Submit ──
  // Triggers the search immediately, cancels any pending timers, and blurs the input
  // to dismiss on-screen virtual keyboards on Android TV/Projectors.
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    // Cancel any pending debounce timer
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Perform the search immediately
    performSearch(query);

    // Dismiss virtual keyboard
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'INPUT') {
        activeEl.blur();
      }
    }
  };


  // ── EFFECT: Sync with URL query parameter ──
  // If the user navigates to /search?q=something, update the
  // search box to show that query.
  useEffect(() => {
    if (initialQuery) {
      setTimeout(() => {
        setQuery(initialQuery);
      }, 0);
    }
  }, [initialQuery]);


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

      {/* ── Page Title ── */}
      <h1 style={{
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        fontWeight: 900,
        color: 'white',
        letterSpacing: '-1px',
        marginBottom: '32px',
      }}>
        Search
      </h1>

      {/* ── Search Input Box ──
          Wrapped in a form to support Enter key submission natively on mobile/projectors.
          Includes an explicit red "Search" button that remote controls can easily select/click. */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '48px', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Magnifying glass icon (left side of input) */}
          <SearchIcon style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 22, height: 22,
            color: '#555',
            pointerEvents: 'none', // Clicks pass through to the input
          }} />

          {/* The actual text input field */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            autoFocus  // Automatically focus the input when page loads
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '18px 50px 18px 56px', // Extra padding for icons
              color: 'white',
              fontSize: '1.1rem',
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
            // Focus effect: red border + subtle red glow
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(229,9,20,0.5)';
              e.target.style.boxShadow = '0 0 20px rgba(229,9,20,0.1)';
            }}
            // Blur effect: back to default border
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />

          {/* Clear (X) button — only shown when there's text in the input */}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: '#888',
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #e50914, #b20710)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '0 28px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(229,9,20,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(229,9,20,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(229,9,20,0.2)';
          }}
        >
          Search
        </button>
      </form>

      {/* ── Loading State ──
          Shows a spinning circle while waiting for results. */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid rgba(229,9,20,0.2)',
            borderTopColor: '#e50914',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
        </div>
      )}

      {/* ── Search Results Grid ──
          Shows the results in a responsive grid of MovieCards.
          "auto-fill" creates as many columns as will fit. */}
      {!loading && results.length > 0 && (
        <div>
          {/* Results count text */}
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '24px' }}>
            Found <span style={{ color: 'white', fontWeight: 600 }}>{results.length}</span> results for &quot;<span style={{ color: '#e50914' }}>{query}</span>&quot;
          </p>

          {/* Grid of movie/show cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '20px',
          }}>
            {results.map((item) => (
              <MovieCard
                key={item.id}
                movie={item}
                type={item.media_type || 'movie'}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State: No query entered yet ──
          Shows a friendly icon and message when the search box is empty. */}
      {!loading && !query && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(229,9,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <Film style={{ width: 36, height: 36, color: '#e50914' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Discover something new</h2>
          <p style={{ color: '#555', fontSize: '0.95rem', maxWidth: '400px' }}>Search for your favorite movies and TV shows across our entire catalog.</p>
        </div>
      )}

      {/* ── Empty State: No results found ──
          Shows when the user searched but nothing matched. */}
      {!loading && query && results.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <SearchIcon style={{ width: 36, height: 36, color: '#333' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No results found</h2>
          <p style={{ color: '#555', fontSize: '0.95rem' }}>Try searching with different keywords.</p>
        </div>
      )}
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// SEARCH PAGE — The main export wrapped in Suspense
// ──────────────────────────────────────────────────────────────────────
// Next.js requires a Suspense boundary around components that use
// useSearchParams(). Without it, the page would fail to build.
//
// The "fallback" is what's shown while SearchContent is loading
// (a spinning circle in this case).
export default function SearchPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}
