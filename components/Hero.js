// ╔══════════════════════════════════════════════════════════════════════╗
// ║                      🦸  HERO SECTION  🦸                          ║
// ║                                                                    ║
// ║  The Hero is the BIG, eye-catching banner at the top of the home   ║
// ║  page. It shows a featured movie or TV show with a large backdrop  ║
// ║  image that fills most of the screen.                              ║
// ║                                                                    ║
// ║  FEATURES:                                                         ║
// ║    - Auto-rotating carousel (shows 5 featured items)               ║
// ║    - Each item shows: backdrop image, title, rating, year, genre   ║
// ║    - "Watch Now" and "More Info" buttons                           ║
// ║    - "Trending Now" badge with a glowing dot animation             ║
// ║    - Navigation dots and arrows for manual browsing                ║
// ║    - Gradient overlays so text is readable over the image          ║
// ║                                                                    ║
// ║  AUTO-ROTATION:                                                    ║
// ║    Every 6 seconds, the hero automatically slides to the next      ║
// ║    featured item. Users can also click the dots/arrows to          ║
// ║    manually navigate between items.                                ║
// ╚══════════════════════════════════════════════════════════════════════╝

// "use client" — runs in browser (needs state for carousel + effects)
"use client";

// ── IMPORTS ──
// useState: tracks which featured item is currently shown
// useEffect: sets up the auto-rotation timer
import { useState, useEffect } from 'react';

// Next.js Image: optimized image component (lazy loading, proper sizing)
import Image from 'next/image';

// Icons for the hero section:
// Play: the play triangle for "Watch Now" button
// Info: the (i) icon for "More Info" button
// Star: the star icon for the rating
// ChevronLeft/Right: arrow icons for carousel navigation
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';

// Link: Next.js navigation component for internal page links
import Link from 'next/link';


// ──────────────────────────────────────────────────────────────────────
// THE HERO COMPONENT
// ──────────────────────────────────────────────────────────────────────
// Props:
//   featured: an array of movie/show objects from TMDB (trending items)
export default function Hero({ featured }) {

  // ── STATE: Which item in the carousel is currently shown ──
  // Index 0 = first item, 1 = second, etc.
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── PREPARE THE ITEMS ──
  // Take the first 5 items from the featured array.
  // If "featured" isn't an array (edge case), wrap it in one.
  const items = Array.isArray(featured) ? featured.slice(0, 5) : [featured];

  // The currently displayed item.
  const current = items[currentIndex];

  // ── EFFECT: Auto-rotate the carousel every 6 seconds ──
  // This creates a timer that advances to the next item every 6 seconds.
  // When it reaches the last item, it loops back to the first.
  useEffect(() => {
    // Don't rotate if there's only 1 item (nothing to rotate to).
    if (items.length <= 1) return;

    // setInterval creates a repeating timer.
    const timer = setInterval(() => {
      // Move to the next item. The "% items.length" makes it wrap around.
      // Example with 5 items: 0 → 1 → 2 → 3 → 4 → 0 → 1 → ...
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000); // 6000ms = 6 seconds

    // Cleanup: stop the timer when the component unmounts.
    return () => clearInterval(timer);
  }, [items.length]);

  // If there's no current item (empty data), don't render anything.
  if (!current) return null;

  // ── EXTRACT DISPLAY DATA ──
  // Movies use "title" and "release_date", TV shows use "name" and "first_air_date".
  // We check both and use whichever one exists.
  const title = current.title || current.name;
  const overview = current.overview;
  const rating = current.vote_average;
  const releaseDate = current.release_date || current.first_air_date;
  const mediaType = current.media_type || 'movie';


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    // ── Main container: takes up 85% of the viewport height ──
    <div style={{ position: 'relative', height: '85vh', minHeight: '550px', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════════
          🖼️ BACKGROUND IMAGES
          We render ALL 5 backdrop images stacked on top of each other.
          Only the current one has opacity: 1 (visible).
          The others have opacity: 0 (invisible).
          This creates a smooth crossfade transition between images
          (1 second ease-in-out).
          ══════════════════════════════════════════════════════════ */}
      {items.map((item, idx) => (
        <div
          key={item.id || idx}
          style={{
            position: 'absolute',
            inset: 0, // Fills the entire container
            opacity: idx === currentIndex ? 1 : 0, // Only current image is visible
            transition: 'opacity 1s ease-in-out', // Smooth fade transition
          }}
        >
          {/* Only render the image if the item has a backdrop_path */}
          {item.backdrop_path && (
            <Image
              src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
              alt={item.title || item.name || ''}
              fill           // Makes the image fill its container
              priority={idx === 0} // First image loads with high priority
              sizes="100vw"  // Image takes up the full viewport width
              style={{ objectFit: 'cover' }} // Cover the area without stretching
            />
          )}
        </div>
      ))}

      {/* ══════════════════════════════════════════════════════════════
          🎨 GRADIENT OVERLAYS
          These are transparent-to-dark gradient layers placed over
          the background image. They make the text readable by
          darkening the areas where text appears.

          Overlay 1: Left side gradient (dark on left, clear on right)
                     Makes the title and description readable.
          Overlay 2: Bottom gradient (dark at bottom, clear at top)
                     Creates a smooth transition to the content below.
          ══════════════════════════════════════════════════════════ */}
      {/* Left-to-right gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 50%, transparent 100%)',
        }}
      />
      {/* Bottom-to-top gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #0a0a0a 0%, transparent 40%)',
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          📝 CONTENT — Title, badge, meta info, overview, and buttons
          Positioned at the bottom-left of the hero area.
          Uses the "animate-fade-in-up" CSS class for a nice entrance.
          ══════════════════════════════════════════════════════════ */}
      <div
        className="animate-fade-in-up"
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '48px',
          maxWidth: '600px',
          zIndex: 10,
        }}
      >
        {/* ── "Trending Now" Badge ──
            A small pill-shaped badge with a glowing red dot.
            Shows users that these are currently trending items. */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(229, 9, 20, 0.15)',
            border: '1px solid rgba(229, 9, 20, 0.3)',
            borderRadius: '999px',
            padding: '6px 14px',
            marginBottom: '16px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#e50914',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {/* Glowing red dot animation */}
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#e50914',
            animation: 'pulse-glow 2s infinite',
          }} />
          Trending Now
        </div>

        {/* ── Title ──
            The movie/show title, displayed in large bold text.
            "clamp" makes the font size responsive:
            minimum 2rem, preferred 5vw, maximum 3.5rem */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '16px',
            color: 'white',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </h1>

        {/* ── Meta Info: Rating, Year, Type ──
            A row of small details about the item */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            color: '#a1a1a1',
          }}
        >
          {/* Star rating (only shown if rating > 0) */}
          {rating > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              <Star style={{ width: 14, height: 14, fill: '#fbbf24', color: '#fbbf24' }} />
              {rating.toFixed(1)}
            </span>
          )}
          {/* Release year */}
          {releaseDate && (
            <span>{new Date(releaseDate).getFullYear()}</span>
          )}
          {/* Content type badge (Movie or TV Series) */}
          <span style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 10px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            {mediaType === 'tv' ? 'TV Series' : 'Movie'}
          </span>
        </div>

        {/* ── Overview/Description ──
            A short summary of the movie/show.
            Limited to 3 lines with "..." if the text is too long. */}
        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#ccc',
            marginBottom: '28px',
            display: '-webkit-box',
            WebkitLineClamp: 3,         // Maximum 3 lines
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',          // Hide overflow text
          }}
        >
          {overview}
        </p>

        {/* ── Action Buttons: Watch Now + More Info ── */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* "Watch Now" — Primary red button with play icon */}
          <Link
            href={`/watch/${mediaType}/${current.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #e50914, #b20710)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(229, 9, 20, 0.3)',
            }}
          >
            <Play style={{ width: 18, height: 18, fill: 'white' }} />
            Watch Now
          </Link>
          {/* "More Info" — Secondary ghost button with info icon */}
          <Link
            href={`/watch/${mediaType}/${current.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Info style={{ width: 18, height: 18 }} />
            More Info
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          🔘 CAROUSEL NAVIGATION (Dots + Arrows)
          Positioned at the bottom-right of the hero.
          Only shown when there are multiple items to navigate.

          - Left arrow: goes to previous item
          - Dots: shows which item is current (active dot is wider)
          - Right arrow: goes to next item
          ══════════════════════════════════════════════════════════ */}
      {items.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
          }}
        >
          {/* Left Arrow Button */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>

          {/* Navigation Dots — one for each featured item */}
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '24px' : '8px', // Active dot is wider
                height: '8px',
                borderRadius: '999px',
                background: idx === currentIndex ? '#e50914' : 'rgba(255,255,255,0.3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}

          {/* Right Arrow Button */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}
    </div>
  );
}
