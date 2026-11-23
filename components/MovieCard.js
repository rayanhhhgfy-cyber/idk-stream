// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🎴  MOVIE CARD  🎴                              ║
// ║                                                                    ║
// ║  A MovieCard is one small card that shows a single movie or TV     ║
// ║  show. It displays the poster image, title, year, and rating.     ║
// ║                                                                    ║
// ║  These cards are used everywhere on the site:                      ║
// ║    - In the movie rows on the home page                            ║
// ║    - In search results                                             ║
// ║    - In the watch history section                                  ║
// ║    - In the Movies and TV Shows browse pages                       ║
// ║                                                                    ║
// ║  STYLE: Lumi's portrait poster card (lumi-movies.vercel.app) —    ║
// ║  thin outline around the poster, rating pill at the bottom-right  ║
// ║  inside the poster, title (max 2 lines) + grey year below, and   ║
// ║  NO lift, scale or glow on hover — in the site's red palette.     ║
// ║    - Star rating badge in the bottom-right corner of the poster    ║
// ║    - Clicking the card navigates to the watch page                 ║
// ║    - "compact" mode for smaller cards on mobile devices            ║
// ║    - RED PROGRESS BAR at the bottom for "Continue Watching" items ║
// ╚══════════════════════════════════════════════════════════════════════╝

// "use client" — runs in browser (hover effects need browser events)
"use client";

// ── IMPORTS ──
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, Star } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/tmdb';
import { getWatchProgress } from '@/lib/watchHistory';


// ──────────────────────────────────────────────────────────────────────
// THE MOVIE CARD COMPONENT
// ──────────────────────────────────────────────────────────────────────
export default function MovieCard({ movie, type = 'movie', compact = false }) {

  // ── EXTRACT DISPLAY DATA ──
  const title = movie.title || movie.name;
  const releaseDate = movie.release_date || movie.first_air_date;
  const rating = movie.vote_average;
  const posterPath = movie.poster_path;

  // ── CARD DIMENSIONS ──
  const cardWidth = compact ? 130 : 180;
  const cardHeight = compact ? 195 : 270;

  // ── DETERMINE MEDIA TYPE ──
  const mediaType = type === 'tv' || movie.media_type === 'tv' ? 'tv' : 'movie';

  // ── WATCH PROGRESS STATE ──
  // Check if this movie/show has any saved watch progress
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    // Check for saved progress for this item
    const p = getWatchProgress(movie.id, mediaType);
    if (p && p.percentage > 0) {
      setProgress(p);
    }
  }, [movie.id, mediaType]);


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    <Link
      href={`/watch/${mediaType}/${movie.id}`}
      style={{
        textDecoration: 'none',
        display: 'block',
        width: `${cardWidth}px`,
        flexShrink: 0,
      }}
    >
      {/* ── Card Container ──
          Lumi style: the card does NOT lift, scale or glow on hover.
          Hover only reveals the play overlay. */}
      <div
        style={{
          width: `${cardWidth}px`,
          cursor: 'pointer',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'visible',
        }}
        onMouseEnter={(e) => {
          const overlay = e.currentTarget.querySelector('.play-overlay');
          if (overlay) overlay.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector('.play-overlay');
          if (overlay) overlay.style.opacity = '0';
        }}
      >
        {/* ── Poster Image Area ──
            Lumi style: thin muted outline around the poster only. */}
        <div
          style={{
            position: 'relative',
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {posterPath ? (
            <Image
              src={getImageUrl(posterPath)}
              alt={title || 'Movie poster'}
              fill
              sizes={`${cardWidth}px`}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                color: '#444',
                fontSize: '0.75rem',
              }}
            >
              No Image
            </div>
          )}

          {/* ── Play Button Overlay ── */}
          <div
            className="play-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: compact ? '38px' : '48px',
                height: compact ? '38px' : '48px',
                borderRadius: '50%',
                background: 'rgba(229, 9, 20, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play style={{ width: compact ? 16 : 22, height: compact ? 16 : 22, color: 'white', marginLeft: '2px' }} />
            </div>
          </div>

          {/* ── Rating Badge ──
              Lumi style: small black pill at the BOTTOM-right of the
              poster, gold star + white rating. */}
          {rating > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '7px',
                padding: compact ? '2px 6px' : '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: compact ? '0.65rem' : '0.75rem',
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              <Star style={{ width: compact ? 10 : 12, height: compact ? 10 : 12, fill: '#fbbf24', color: '#fbbf24' }} />
              {rating.toFixed(1)}
            </div>
          )}

          {/* ── PROGRESS BAR ──
              A thin red bar at the very bottom of the poster.
              Only appears if this movie/show has saved watch progress.
              The width represents how far the user has watched (0-100%). */}
          {progress && progress.percentage > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'rgba(255,255,255,0.15)',
              zIndex: 5,
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progress.percentage, 100)}%`,
                background: 'linear-gradient(90deg, #e50914, #ff3d3d)',
                borderRadius: '0 2px 2px 0',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>

        {/* ── Title and Year ──
            Lumi style: title wraps to at most 2 lines, year in muted
            grey below it. */}
        <div style={{ padding: '8px 2px 4px' }}>
          <h3
            style={{
              color: 'white',
              fontSize: compact ? '0.75rem' : '0.9375rem',
              fontWeight: 600,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.25',
              marginBottom: '4px',
            }}
          >
            {title}
          </h3>
          <p style={{ color: '#a1a1a1', fontSize: compact ? '0.65rem' : '0.8125rem' }}>
            {releaseDate ? new Date(releaseDate).getFullYear() : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
