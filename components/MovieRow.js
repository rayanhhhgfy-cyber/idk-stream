// ╔══════════════════════════════════════════════════════════════════════╗
// ║                   🎞️  MOVIE ROW  🎞️                               ║
// ║                                                                    ║
// ║  A MovieRow is a horizontal scrolling row of MovieCards.           ║
// ║  Think of it like a shelf in a video store — you can slide         ║
// ║  left and right to see more movies.                                ║
// ║                                                                    ║
// ║  Used on the home page to display categories like:                 ║
// ║    🔥 Trending This Week                                           ║
// ║    🎬 Popular Movies                                               ║
// ║    ⭐ Top Rated                                                    ║
// ║                                                                    ║
// ║  FEATURES:                                                         ║
// ║    - Horizontal scroll with hidden scrollbar                       ║
// ║    - Left/right arrow buttons (desktop only)                       ║
// ║    - Fade effect on the right edge                                 ║
// ║    - Compact cards on mobile, full-size on desktop                  ║
// ║    - Touch-friendly scrolling on mobile (swipe to scroll)          ║
// ╚══════════════════════════════════════════════════════════════════════╝

// "use client" — runs in browser (needs scroll detection & window size)
"use client";

// ── IMPORTS ──
// useRef: to get a reference to the scrollable container (so we can scroll it)
// useState: to track if we're on mobile or desktop
// useEffect: to check the screen width when the page loads
import { useRef, useState, useEffect } from 'react';

// Arrow icons for the scroll buttons
import { ChevronLeft, ChevronRight } from 'lucide-react';

// The individual movie card component
import MovieCard from '@/components/MovieCard';


// ──────────────────────────────────────────────────────────────────────
// THE MOVIE ROW COMPONENT
// ──────────────────────────────────────────────────────────────────────
// Props:
//   title: the section heading (e.g., "🔥 Trending This Week")
//   items: array of movie/show objects to display (defaults to empty [])
//   type: "movie" or "tv" — tells MovieCard what type of content it is
export default function MovieRow({ title, items = [], type }) {

  // ── REF: Reference to the scrollable container ──
  // We need this to programmatically scroll left/right when
  // the user clicks the arrow buttons.
  // "useRef" gives us a pointer to the actual HTML element.
  const rowRef = useRef(null);

  // ── STATE: Is the user on a mobile device? ──
  // true = screen width < 768px (phone/small tablet)
  // false = screen width >= 768px (tablet/desktop)
  // This affects: card size (compact vs full) and arrow visibility.
  const [isMobile, setIsMobile] = useState(false);

  // ── EFFECT: Check screen width on load and resize ──
  // Runs once when the component loads, then again whenever
  // the browser window is resized.
  useEffect(() => {
    // Function to check if the screen is mobile-sized.
    const check = () => setIsMobile(window.innerWidth < 768);

    // Check immediately on load.
    check();

    // Also check whenever the window is resized.
    window.addEventListener('resize', check);

    // Cleanup: remove the resize listener when component unmounts.
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── SCROLL FUNCTION ──
  // Called when the user clicks the left or right arrow button.
  // It smoothly scrolls the row by a set amount.
  const scroll = (direction) => {
    // Safety check: make sure the ref points to an actual element.
    if (!rowRef.current) return;

    // How many pixels to scroll: less on mobile (300), more on desktop (600).
    const scrollAmount = isMobile ? 300 : 600;

    // Use the browser's built-in scrollBy method for smooth scrolling.
    // Negative = scroll left, Positive = scroll right.
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth', // Smooth animation instead of instant jump.
    });
  };

  // If there are no items to show, don't render anything.
  if (!items.length) return null;


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    // ── Section wrapper ──
    <section style={{ marginBottom: '48px', position: 'relative' }}>

      {/* ── Section Title ──
          The heading text like "🔥 Trending This Week".
          Font size adjusts based on mobile/desktop. */}
      <h2
        style={{
          fontSize: isMobile ? '1.1rem' : '1.4rem',
          fontWeight: 700,
          marginBottom: '16px',
          color: 'white',
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </h2>

      {/* ── Scroll Container (holds arrows + movie cards) ── */}
      <div style={{ position: 'relative' }}>

        {/* ── LEFT ARROW BUTTON ──
            Only shown on desktop (not mobile — mobile uses swipe).
            Positioned at the left edge of the row.
            Clicking scrolls the row to the left. */}
        {!isMobile && (
          <button
            onClick={() => scroll('left')}
            style={{
              position: 'absolute',
              left: '-16px',
              top: '45%',
              transform: 'translateY(-50%)', // Vertically center the button
              zIndex: 20,
              width: '40px', height: '40px',
              borderRadius: '50%',                    // Circular button
              background: 'rgba(20, 20, 20, 0.9)',    // Nearly opaque dark
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)', // Frosted glass effect
            }}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        )}

        {/* ── THE SCROLLABLE ROW OF MOVIE CARDS ──
            A horizontal flex container that scrolls.
            Key CSS properties:
              - display: flex → items in a row
              - flexWrap: nowrap → don't wrap to next line
              - overflowX: auto → show horizontal scrollbar (hidden via CSS below)
              - scrollbarWidth: none → hide scrollbar (Firefox)
              - msOverflowStyle: none → hide scrollbar (IE/Edge)
              - WebkitOverflowScrolling: touch → smooth scroll on iOS */}
        <div
          ref={rowRef}
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: isMobile ? '12px' : '16px',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '8px 4px 16px',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Loop through each item and render a MovieCard.
              "flexShrink: 0" prevents cards from shrinking.
              The animation delay creates a staggered entrance effect. */}
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                flexShrink: 0,
                animationDelay: `${index * 0.05}s`, // Stagger: each card appears slightly later
              }}
            >
              <MovieCard
                movie={item}
                type={type || item.media_type || 'movie'}
                compact={isMobile} // Smaller cards on mobile
              />
            </div>
          ))}
        </div>

        {/* ── RIGHT ARROW BUTTON ──
            Same as left arrow, but on the right side.
            Scrolls the row to the right. */}
        {!isMobile && (
          <button
            onClick={() => scroll('right')}
            style={{
              position: 'absolute',
              right: '-16px',
              top: '45%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              width: '40px', height: '40px',
              borderRadius: '50%',
              background: 'rgba(20, 20, 20, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
            }}
          >
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        )}

        {/* ── RIGHT EDGE FADE ──
            A gradient overlay on the right edge that creates a
            "fade out" effect, hinting that there are more cards
            to see if you scroll right.
            "pointerEvents: none" means clicks pass through it. */}
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: '40px',
            background: 'linear-gradient(to left, #0a0a0a, transparent)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      </div>

      {/* ── HIDE SCROLLBAR ──
          CSS to hide the scrollbar in Chrome/Safari.
          (Firefox and IE are handled by inline styles above.) */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
