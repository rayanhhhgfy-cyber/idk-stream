"use client";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Star, Play, ChevronDown } from 'lucide-react';

export default function EpisodeSelector({
  episodes,
  seasons,
  currentEpisode,
  currentSeason,
  showId,
  progressData = {},
  onEpisodeSelect,
  onSeasonChange,
}) {
  const listRef = useRef(null);
  const [hoveredEpisode, setHoveredEpisode] = useState(null);

  const getEpisodeProgress = (episodeNum) => {
    const key = `tv_${showId}_${currentSeason}_${episodeNum}`;
    const entry = progressData[key];
    if (!entry || !entry.watchedSeconds || entry.watchedSeconds < 30) return null;
    const percentage = entry.totalSeconds > 0
      ? Math.min((entry.watchedSeconds / entry.totalSeconds) * 100, 100)
      : 0;
    return percentage > 5 ? Math.round(percentage) : null;
  };

  const currentEpData = episodes.find(e => e.episode_number === currentEpisode);

  useEffect(() => {
    if (listRef.current) {
      const activeCard = listRef.current.querySelector('[data-active="true"]');
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentEpisode, episodes]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* ── Now Playing Header ── */}
      {currentEpData && (
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(229,9,20,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              style={{
                background: '#e50914',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Now Playing
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {currentEpData.still_path && (
              <div
                style={{
                  position: 'relative',
                  width: '160px',
                  aspectRatio: '16/9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Image
                  src={`https://image.tmdb.org/t/p/w500${currentEpData.still_path}`}
                  alt={currentEpData.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: 'white',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                S{currentSeason} : E{currentEpisode} — {currentEpData.name}
              </div>
              {currentEpData.vote_average > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}
                >
                  <Star style={{ width: 13, height: 13, fill: '#fbbf24' }} />
                  {currentEpData.vote_average.toFixed(1)}
                  {currentEpData.air_date && (
                    <span style={{ color: '#666', fontWeight: 400, marginLeft: '8px' }}>
                      {new Date(currentEpData.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
              <p
                style={{
                  color: '#999',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: 0,
                }}
              >
                {currentEpData.overview || 'No description available.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Season Controls Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: 600 }}>Season</span>
          <div style={{ position: 'relative' }}>
            <select
              value={currentSeason}
              onChange={(e) => onSeasonChange(parseInt(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 36px 8px 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              {seasons.map(s => (
                <option key={s.season_number} value={s.season_number} style={{ background: '#1a1a1a', color: 'white' }}>
                  Season {s.season_number}{s.name !== `Season ${s.season_number}` ? ` — ${s.name}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                color: '#888',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>
          {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
        </span>
      </div>

      {/* ── Episode List ── */}
      <div
        ref={listRef}
        style={{
          maxHeight: '520px',
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {episodes.map((episode, index) => {
          const isActive = episode.episode_number === currentEpisode;
          const progressPct = getEpisodeProgress(episode.episode_number);
          const isHovered = hoveredEpisode === episode.episode_number;

          return (
            <div
              key={episode.id}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onEpisodeSelect(episode.episode_number)}
              onMouseEnter={() => setHoveredEpisode(episode.episode_number)}
              onMouseLeave={() => setHoveredEpisode(null)}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '14px',
                cursor: 'pointer',
                background: isActive
                  ? 'rgba(229,9,20,0.08)'
                  : isHovered
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                borderLeft: isActive ? '3px solid #e50914' : '3px solid transparent',
                transition: 'all 0.2s ease',
                marginBottom: '4px',
                position: 'relative',
                transform: isHovered ? 'scale(1.01)' : 'scale(1)',
                boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {/* ── Episode Thumbnail ── */}
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  minWidth: '180px',
                  aspectRatio: '16/9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                  flexShrink: 0,
                }}
              >
                {episode.still_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                    alt={episode.name}
                    fill
                    sizes="180px"
                    style={{ objectFit: 'cover', transition: 'transform 0.3s ease', transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, #1a1a1a, #2a2a2a)`,
                      color: '#444',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                    }}
                  >
                    E{episode.episode_number}
                  </div>
                )}

                {/* ── Hover Play Overlay ── */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(229,9,20,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(229,9,20,0.4)',
                    }}
                  >
                    <Play style={{ width: 18, height: 18, color: 'white', marginLeft: '2px' }} />
                  </div>
                </div>

                {/* ── Progress Bar ── */}
                {progressPct !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'rgba(255,255,255,0.12)',
                      zIndex: 5,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(progressPct, 100)}%`,
                        background: 'linear-gradient(90deg, #e50914, #ff3d3d)',
                        borderRadius: '0 2px 2px 0',
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 6px rgba(229,9,20,0.5)',
                      }}
                    />
                  </div>
                )}

                {/* ── Episode Number Badge ── */}
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  E{episode.episode_number}
                </div>
              </div>

              {/* ── Episode Info ── */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700 }}>
                    {episode.name}
                  </span>
                  {episode.vote_average > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Star style={{ width: 11, height: 11, fill: '#fbbf24' }} />
                      {episode.vote_average.toFixed(1)}
                    </span>
                  )}
                  {episode.air_date && (
                    <span style={{ color: '#555', fontSize: '0.75rem' }}>
                      {new Date(episode.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    color: '#888',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: 0,
                  }}
                >
                  {episode.overview || 'No description available.'}
                </p>
                {progressPct !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <div
                      style={{
                        flex: 1,
                        maxWidth: '120px',
                        height: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(progressPct, 100)}%`,
                          background: '#e50914',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ color: '#666', fontSize: '0.7rem', fontWeight: 500 }}>{progressPct}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {episodes.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#555',
              fontSize: '0.9rem',
            }}
          >
            No episodes found for this season.
          </div>
        )}
      </div>
    </div>
  );
}
