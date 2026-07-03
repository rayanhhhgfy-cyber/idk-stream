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
// ║  FEATURES:                                                         ║
// ║    - Hover effect: card scales up and shows a play button overlay  ║
// ║    - Star rating badge in the top-right corner                     ║
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
      {/* ── Card Container ── */}
      <div
        style={{
          width: `${cardWidth}px`,
          cursor: 'pointer',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'visible',
          transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.35s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06) translateY(-6px)';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.5), 0 0 20px rgba(229,9,20,0.1)';
          const overlay = e.currentTarget.querySelector('.play-overlay');
          if (overlay) overlay.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          const overlay = e.currentTarget.querySelector('.play-overlay');
          if (overlay) overlay.style.opacity = '0';
        }}
      >
        {/* ── Poster Image Area ── */}
        <div
          style={{
            position: 'relative',
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#1a1a1a',
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
                boxShadow: '0 4px 20px rgba(229, 9, 20, 0.4)',
              }}
            >
              <Play style={{ width: compact ? 16 : 22, height: compact ? 16 : 22, color: 'white', marginLeft: '2px' }} />
            </div>
          </div>

          {/* ── Rating Badge ── */}
          {rating > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: compact ? '2px 6px' : '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: compact ? '0.65rem' : '0.75rem',
                fontWeight: 600,
                color: '#fbbf24',
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
                boxShadow: '0 0 8px rgba(229,9,20,0.5)',
              }} />
            </div>
          )}
        </div>

        {/* ── Title and Year ── */}
        <div style={{ padding: '8px 2px 4px' }}>
          <h3
            style={{
              color: 'white',
              fontSize: compact ? '0.75rem' : '0.875rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '2px',
            }}
          >
            {title}
          </h3>
          <p style={{ color: '#555', fontSize: compact ? '0.65rem' : '0.75rem' }}>
            {releaseDate ? new Date(releaseDate).getFullYear() : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
