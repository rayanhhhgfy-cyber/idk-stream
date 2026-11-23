// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🎭  CAST SECTION  🎭                            ║
// ║                                                                    ║
// ║  This component displays the cast (actors) and director for a     ║
// ║  movie or TV show. It shows circular profile photos in a          ║
// ║  horizontal scrolling row, with the director highlighted at the   ║
// ║  top.                                                              ║
// ║                                                                    ║
// ║  Clicking on an actor navigates to a search for that actor's      ║
// ║  name, showing all their other movies and TV shows.               ║
// ╚══════════════════════════════════════════════════════════════════════╝

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { User, Clapperboard } from 'lucide-react';

export default function CastSection({ credits }) {
  // If no credits data, don't render anything
  if (!credits) return null;

  // Extract the director(s) from the crew
  const directors = (credits.crew || []).filter(
    c => c.job === 'Director' || c.department === 'Directing'
  ).slice(0, 3);

  // Get top 15 cast members (actors)
  const cast = (credits.cast || []).slice(0, 15);

  // If we have no cast and no director, don't show this section
  if (cast.length === 0 && directors.length === 0) return null;

  return (
    <div style={{ marginTop: '32px' }}>

      {/* ── Director(s) ── */}
      {directors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <Clapperboard style={{ width: 18, height: 18, color: '#e50914' }} />
            <h4 style={{
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
            }}>
              {directors.length > 1 ? 'Directors' : 'Director'}
            </h4>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {directors.map(d => (
              <Link
                key={d.id}
                href={`/search?q=${encodeURIComponent(d.name)}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px 16px 8px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(229,9,20,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {/* Director Photo */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#222',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  {d.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${d.profile_path}`}
                      alt={d.name}
                      fill
                      sizes="36px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User style={{ width: 16, height: 16, color: '#555' }} />
                    </div>
                  )}
                </div>
                <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
                  {d.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Cast (Actors) ── */}
      {cast.length > 0 && (
        <div>
          <h4 style={{
            color: 'white',
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <User style={{ width: 18, height: 18, color: '#e50914' }} />
            Cast
          </h4>

          {/* Horizontal scrolling row of cast cards */}
          <div style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '12px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {cast.map(actor => (
              <Link
                key={actor.id}
                href={`/search?q=${encodeURIComponent(actor.name)}`}
                style={{
                  textDecoration: 'none',
                  flexShrink: 0,
                  width: '100px',
                  textAlign: 'center',
                  transition: 'transform 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Actor Photo (circular) */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  margin: '0 auto 8px',
                  background: '#1a1a1a',
                  border: '2px solid rgba(255,255,255,0.08)',
                  position: 'relative',
                  transition: 'border-color 0.25s ease',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(229,9,20,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  {actor.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                      alt={actor.name}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                    }}>
                      <User style={{ width: 28, height: 28, color: '#444' }} />
                    </div>
                  )}
                </div>

                {/* Actor Name */}
                <p style={{
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '2px',
                }}>
                  {actor.name}
                </p>

                {/* Character Name */}
                <p style={{
                  color: '#666',
                  fontSize: '0.65rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {actor.character || 'Unknown'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hide scrollbar for webkit */}
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
