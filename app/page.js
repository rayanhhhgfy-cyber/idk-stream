// ╔══════════════════════════════════════════════════════════════════════╗
// ║                      🏠  HOME PAGE  🏠                             ║
// ║                                                                    ║
// ║  This is the main page that users see when they visit the site.    ║
// ║  It shows a Hero banner at the top, followed by rows of movies    ║
// ║  and TV shows organized by category.                               ║
// ║                                                                    ║
// ║  PAGE STRUCTURE:                                                   ║
// ║    1. Hero Section — large banner with trending items              ║
// ║    2. Continue Watching — recently watched items (from cookies)    ║
// ║    3. Trending This Week — what's popular right now                ║
// ║    4. Popular Movies — consistently popular movies                 ║
// ║    5. Top Rated — highest-rated movies of all time                 ║
// ║                                                                    ║
// ║  DATA FETCHING:                                                    ║
// ║  This is a SERVER component (no "use client").                     ║
// ║  The data is fetched on the SERVER before the page is sent to      ║
// ║  the user's browser. This makes the initial page load faster       ║
// ║  because the browser receives a fully-rendered page with data.     ║
// ║                                                                    ║
// ║  Think of it like a restaurant that prepares your food in the      ║
// ║  kitchen (server) and brings it ready to eat (rendered HTML),      ║
// ║  instead of giving you raw ingredients (data) to cook yourself     ║
// ║  (client-side rendering).                                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── IMPORTS ──
// These are our TMDB helper functions that fetch data from the movie database.
import { fetchTrending, fetchPopular, fetchTopRated } from '@/lib/tmdb';

// Components used on this page:
import Hero from '@/components/Hero';             // Big banner at the top
import MovieRow from '@/components/MovieRow';       // Horizontal row of movie cards
import WatchHistory from '@/components/WatchHistory'; // "Continue Watching" section


// ──────────────────────────────────────────────────────────────────────
// THE HOME PAGE COMPONENT (Server Component)
// ──────────────────────────────────────────────────────────────────────
// "async" because we need to "await" the data from TMDB.
// This function runs on the SERVER, not in the browser.
export default async function Home() {

  // ── Initialize empty arrays for our data ──
  // These will be filled with movie/show data from TMDB.
  // We start with empty arrays so if something goes wrong,
  // the page still renders (just without movies).
  let trendingData = [];
  let popularData = [];
  let topRatedData = [];
  let heroItems = [];

  // ── Fetch all data in parallel ──
  // We use try/catch to handle any errors gracefully.
  try {
    // Promise.all fetches ALL three data sources at the SAME TIME
    // (in parallel), rather than waiting for each one to finish
    // before starting the next. This makes the page load much faster!
    //
    // Think of it like ordering three pizzas at once instead of
    // waiting for the first pizza to arrive before ordering the second.
    const [trending, popular, topRated] = await Promise.all([
      fetchTrending(),    // What's trending this week?
      fetchPopular(),     // What's popular?
      fetchTopRated(),    // What's highest rated?
    ]);

    // Take the first 15 results from each category.
    // ".slice(0, 15)" means "give me items 0 through 14" (15 items).
    // "|| []" means "if results is undefined, use an empty array."
    trendingData = trending.results?.slice(0, 15) || [];
    popularData = popular.results?.slice(0, 15) || [];
    topRatedData = topRated.results?.slice(0, 15) || [];

    // The hero section uses the first 5 trending items for its carousel.
    heroItems = trending.results?.slice(0, 5) || [];
  } catch (error) {
    // If anything goes wrong (TMDB is down, network error, etc.),
    // log the error and continue with empty arrays.
    // The page will still render, just without movie data.
    console.error('Error fetching data:', error);
  }


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Hero Section ──
          The big banner at the top with the featured trending items.
          Only shown if we have hero items to display. */}
      {heroItems.length > 0 && <Hero featured={heroItems} />}

      {/* ── Content Rows ──
          Horizontal scrolling rows of movie cards, organized by category.
          The negative marginTop (-60px) makes the content rows overlap
          with the bottom of the hero section slightly, creating a
          smooth visual transition. */}
      <div
        style={{
          paddingLeft: 'clamp(16px, 4vw, 48px)',   // Responsive left padding
          paddingRight: 'clamp(16px, 4vw, 48px)',   // Responsive right padding
          marginTop: '-60px',                        // Overlap with hero
          position: 'relative',
          zIndex: 10,                                // Above the hero backdrop
        }}
      >
        {/* "Continue Watching" section — shows recently watched items.
            The id="history" allows the navbar's "History" link to
            scroll directly to this section (using /#history). */}
        <div id="history">
          <WatchHistory />
        </div>

        {/* Movie rows — each row is a horizontal scrolling carousel */}
        <MovieRow title="🔥 Trending This Week" items={trendingData} />
        <MovieRow title="🎬 Popular Movies" items={popularData} type="movie" />
        <MovieRow title="⭐ Top Rated" items={topRatedData} type="movie" />
      </div>
    </div>
  );
}
