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
    <div className="bg-white/[0.02] rounded-[20px] border border-white/5 overflow-hidden">
      {/* ── Now Playing Header ── */}
      {currentEpData && (
        <div className="p-5 sm:p-6 border-b border-white/5 bg-red-600/[0.04]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Now Playing
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            {currentEpData.still_path && (
              <div className="relative w-full sm:w-40 aspect-video rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${currentEpData.still_path}`}
                  alt={currentEpData.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 160px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-lg font-bold mb-1 truncate">
                S{currentSeason} : E{currentEpisode} — {currentEpData.name}
              </h3>
              {currentEpData.vote_average > 0 && (
                <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-500" />
                    {currentEpData.vote_average.toFixed(1)}
                  </div>
                  {currentEpData.air_date && (
                    <span className="text-gray-500 font-medium border-l border-white/10 pl-2">
                      {new Date(currentEpData.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                {currentEpData.overview || 'No description available.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Season Controls Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 sm:py-4 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Season</span>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={currentSeason}
              onChange={(e) => onSeasonChange(parseInt(e.target.value))}
              className="w-full sm:w-auto bg-white/5 text-white border border-white/10 py-2.5 pl-4 pr-10 rounded-xl text-xs font-bold outline-none cursor-pointer hover:bg-white/10 transition-all appearance-none"
            >
              {seasons.map(s => (
                <option key={s.season_number} value={s.season_number} className="bg-[#141414]">
                  Season {s.season_number}{s.name !== `Season ${s.season_number}` ? ` — ${s.name}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest hidden sm:block">
          {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
        </span>
      </div>

      {/* ── Episode List ── */}
      <div ref={listRef} className="max-h-[520px] overflow-y-auto p-2 sm:p-3 space-y-2 scrollbar-hide">
        {episodes.map((episode) => {
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
              className={`
                group flex flex-col sm:flex-row gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 relative
                ${isActive ? 'bg-red-600/10 border-l-4 border-red-600 shadow-lg' : 'bg-transparent border-l-4 border-transparent hover:bg-white/5'}
              `}
              style={{ transform: isHovered && !isActive ? 'translateX(4px)' : 'none' }}
            >
              {/* ── Episode Thumbnail ── */}
              <div className="relative w-full sm:w-44 lg:w-48 aspect-video rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                {episode.still_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${episode.still_path}`}
                    alt={episode.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 192px"
                    className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10 text-white/20 text-2xl font-black">
                    E{episode.episode_number}
                  </div>
                )}

                {/* ── Hover Play Overlay ── */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* ── Progress Bar ── */}
                {progressPct !== null && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* ── Episode Number Badge ── */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-tighter">
                  E{episode.episode_number}
                </div>
              </div>

              {/* ── Episode Info ── */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h4 className={`text-sm font-bold truncate ${isActive ? 'text-red-500' : 'text-white'}`}>
                    {episode.name}
                  </h4>
                  {episode.vote_average > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-yellow-500" />
                      {episode.vote_average.toFixed(1)}
                    </div>
                  )}
                </div>
                <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2 mb-2">
                  {episode.overview || 'No description available for this episode.'}
                </p>
                {progressPct !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-[100px] h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600">{progressPct}% watched</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {episodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm font-medium">No episodes found for this season.</p>
          </div>
        )}
      </div>
    </div>
  );
}
