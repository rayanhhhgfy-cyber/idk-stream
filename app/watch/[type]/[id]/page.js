"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchMovieDetails, fetchTVDetails, fetchMovieCredits, fetchTVCredits, fetchMovieVideos, fetchTVVideos } from '@/lib/tmdb';
import { addToWatchHistory, updateWatchProgress, getWatchProgress, getWatchHistory } from '@/lib/watchHistory';
import PlayerContainer from '@/components/PlayerContainer';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import CastSection from '@/components/CastSection';
import TrailerModal from '@/components/TrailerModal';
import EpisodeSelector from '@/components/EpisodeSelector';
import Image from 'next/image';
import { Star, ArrowLeft, Layers, PlayCircle, Film, ChevronDown, Monitor, Clock, Info } from 'lucide-react';
import Link from 'next/link';
import { getAllWatchProgress } from '@/lib/watchHistory';

export default function Watch({ params }) {
  const { type, id } = React.use(params);

  const [details, setDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [credits, setCredits] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [allProgress, setAllProgress] = useState({});

  const playerRef = useRef(null);
  const watchStartRef = useRef(null);
  const accumulatedTimeRef = useRef(0);
  const isVisibleRef = useRef(true);
  const lastSaveTimeRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        let data, creds, vids;

        if (type === 'movie') {
          [data, creds, vids] = await Promise.all([
            fetchMovieDetails(id),
            fetchMovieCredits(id),
            fetchMovieVideos(id),
          ]);
        } else if (type === 'tv') {
          [data, creds, vids] = await Promise.all([
            fetchTVDetails(id),
            fetchTVCredits(id),
            fetchTVVideos(id),
          ]);
          const tvSeasons = (data.seasons || []).filter(s => s.season_number > 0);
          setSeasons(tvSeasons);
          
          let targetSeason = tvSeasons.length > 0 ? tvSeasons[0].season_number : 1;
          let targetEpisode = 1;
          
          const history = getWatchHistory();
          const savedShow = history.find(h => h.id === parseInt(id) && h.type === 'tv');
          if (savedShow && savedShow.season && savedShow.episode) {
            targetSeason = savedShow.season;
            targetEpisode = savedShow.episode;
          }

          if (tvSeasons.length > 0) {
            await fetchSeasonData(targetSeason);
            setCurrentSeason(targetSeason);
            setCurrentEpisode(targetEpisode);
          }
        }

        setDetails(data);
        setCredits(creds || null);
        setTrailers(vids || []);
      } catch (err) {
        console.error('Error fetching watch details:', err);
        setError('Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  useEffect(() => {
    if (!details) return;
    addToWatchHistory({
      id: parseInt(id), type,
      title: details.title || details.name,
      poster: details.poster_path,
      rating: details.vote_average || 0,
      season: type === 'tv' ? currentSeason : null,
      episode: type === 'tv' ? currentEpisode : null,
    });
  }, [details, currentSeason, currentEpisode, id, type]);

  useEffect(() => {
    setAllProgress(getAllWatchProgress());
  }, [currentSeason, currentEpisode]);

  useEffect(() => {
    if (!details) return;
    
    watchStartRef.current = Date.now();
    accumulatedTimeRef.current = 0;
    
    const prevProgress = getWatchProgress(parseInt(id), type, type === 'tv' ? currentSeason : undefined, type === 'tv' ? currentEpisode : undefined);
    const existingWatched = prevProgress?.watchedSeconds || 0;
    const totalSeconds = (details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 120) * 60;

    const saveProgress = () => {
      if (!watchStartRef.current) return;
      let currentSessionTime = 0;
      if (isVisibleRef.current) {
        currentSessionTime = Math.floor((Date.now() - watchStartRef.current) / 1000);
      }
      const totalSessionTime = accumulatedTimeRef.current + currentSessionTime;
      if (totalSessionTime > 10 && (Date.now() - lastSaveTimeRef.current > 5000)) {
        const totalWatched = existingWatched + totalSessionTime;
        updateWatchProgress(parseInt(id), type, totalWatched, totalSeconds, type === 'tv' ? currentSeason : undefined, type === 'tv' ? currentEpisode : undefined);
        lastSaveTimeRef.current = Date.now();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isVisibleRef.current && watchStartRef.current) {
          accumulatedTimeRef.current += Math.floor((Date.now() - watchStartRef.current) / 1000);
          isVisibleRef.current = false;
        }
        saveProgress();
      } else {
        if (!isVisibleRef.current) {
          watchStartRef.current = Date.now();
          isVisibleRef.current = true;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(saveProgress, 30000);
    window.addEventListener('beforeunload', saveProgress);

    return () => {
      saveProgress();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', saveProgress);
      watchStartRef.current = null;
    };
  }, [details, id, type, currentSeason, currentEpisode]);

  const fetchSeasonData = async (seasonNum) => {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNum}?api_key=5ad947200f7bbf9bafa9fed1cf3991af`);
      const seasonData = await response.json();
      setEpisodes(seasonData.episodes || []);
    } catch (err) { console.error('Error fetching season episodes:', err); }
  };

  const handleSeasonChange = async (newSeason) => {
    setCurrentSeason(newSeason);
    setCurrentEpisode(1);
    await fetchSeasonData(newSeason);
  };

  const handleNextEpisode = useCallback(async () => {
    const currentIndex = episodes.findIndex(e => e.episode_number === currentEpisode);
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      setCurrentEpisode(episodes[currentIndex + 1].episode_number);
    } else {
      const currentSeasonIndex = seasons.findIndex(s => s.season_number === currentSeason);
      if (currentSeasonIndex !== -1 && currentSeasonIndex < seasons.length - 1) {
        const nextSeason = seasons[currentSeasonIndex + 1].season_number;
        setCurrentSeason(nextSeason);
        setCurrentEpisode(1);
        await fetchSeasonData(nextSeason);
      }
    }
  }, [episodes, currentEpisode, seasons, currentSeason, id]);

  const getNextEpisodeTitle = () => {
    if (type !== 'tv') return null;
    const currentIndex = episodes.findIndex(e => e.episode_number === currentEpisode);
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const next = episodes[currentIndex + 1];
      return `S${currentSeason}E${next.episode_number}: ${next.name}`;
    }
    const currentSeasonIndex = seasons.findIndex(s => s.season_number === currentSeason);
    if (currentSeasonIndex !== -1 && currentSeasonIndex < seasons.length - 1) {
      return `Season ${seasons[currentSeasonIndex + 1].season_number}, Episode 1`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="w-10 h-10 border-3 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Preparing your stream...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[#0a0a0a] p-6 text-center">
        <h1 className="text-3xl font-black text-red-600 mb-2">Oops!</h1>
        <p className="text-gray-400 mb-8 max-w-md">{error || 'Details not found'}</p>
        <Link href="/" className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Go Home</Link>
      </div>
    );
  }

  const selectedEpisodeData = type === 'tv' ? episodes.find(e => e.episode_number === currentEpisode) : null;
  const displayTitle = details.title || details.name;
  const displayOverview = details.overview;
  const displayReleaseDate = details.release_date || details.first_air_date;
  const displayRating = details.vote_average;
  const displayBackdrop = details.backdrop_path;
  const displayRuntime = details.runtime || (details.episode_run_time && details.episode_run_time[0]);
  const genres = details.genres || [];
  const nextEpisodeTitle = getNextEpisodeTitle();

  return (
    <div className="bg-[#0a0a0a] min-h-screen relative overflow-x-hidden">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts playerContainerRef={playerRef} onNextEpisode={handleNextEpisode} isTv={type === 'tv'} />

      {/* Trailer Modal */}
      {showTrailer && trailers.length > 0 && (
        <TrailerModal youtubeKey={trailers[0].key} title={displayTitle} onClose={() => setShowTrailer(false)} />
      )}

      {/* Ambient Backdrop */}
      {displayBackdrop && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Image
            src={`https://image.tmdb.org/t/p/w780${displayBackdrop}`}
            alt=""
            fill
            className="object-cover opacity-10 blur-[100px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        </div>
      )}

      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-20">

        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="flex-1">
            <Link href="/" className="inline-flex items-center gap-2 text-red-600 text-sm font-bold mb-4 hover:gap-3 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-4 leading-tight break-words">
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm font-medium text-gray-400">
              <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                <Star className="w-4 h-4 fill-yellow-500" />
                <span className="font-bold">{displayRating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {displayRuntime} min
              </div>
              <div>{new Date(displayReleaseDate).getFullYear()}</div>
              <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white tracking-widest">
                {type === 'tv' ? 'TV Series' : 'Movie'}
              </div>

              {trailers.length > 0 && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 bg-red-600/10 border border-red-600/30 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all"
                >
                  <Film className="w-4 h-4" /> Trailer
                </button>
              )}
            </div>
          </div>

          {/* TV Controls */}
          {type === 'tv' && seasons.length > 0 && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 sm:p-3 rounded-2xl backdrop-blur-xl">
              <div className="relative">
                <select
                  value={currentSeason}
                  onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                  className="bg-white/10 text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl border-none outline-none appearance-none cursor-pointer hover:bg-white/20 transition-colors"
                >
                  {seasons.map(s => <option key={s.season_number} value={s.season_number} className="bg-[#141414]">Season {s.season_number}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="h-6 w-px bg-white/10" />

              <span className="text-xs font-bold text-gray-400 whitespace-nowrap px-1">
                E{currentEpisode} <span className="text-[10px] opacity-50 font-medium">/ {episodes.length}</span>
              </span>

              {nextEpisodeTitle && (
                <button
                  onClick={handleNextEpisode}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-all shadow-lg shadow-red-600/20"
                  title="Next Episode"
                >
                  <PlayCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Responsive Grid Layout for Player and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Main Column: Player + Selectors */}
          <div className="lg:col-span-2 space-y-10">
            <div ref={playerRef} className="rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
              <PlayerContainer
                type={type}
                id={id}
                season={currentSeason}
                episode={currentEpisode}
                autoPlayNext={autoPlayNext}
                onNextEpisode={handleNextEpisode}
                nextEpisodeTitle={nextEpisodeTitle}
                episodeRuntime={displayRuntime}
                onSyncTime={() => {}}
              />
            </div>

            {/* Episode Selector */}
            {type === 'tv' && episodes.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-red-600 rounded-full" />
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Select Episode</h2>
                </div>
                <EpisodeSelector
                  episodes={episodes}
                  seasons={seasons}
                  currentEpisode={currentEpisode}
                  currentSeason={currentSeason}
                  showId={parseInt(id)}
                  progressData={allProgress}
                  onEpisodeSelect={(epNum) => {
                    setCurrentEpisode(epNum);
                    setTimeout(() => {
                      if (playerRef.current) {
                        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 50);
                  }}
                  onSeasonChange={handleSeasonChange}
                />
              </div>
            )}
          </div>

          {/* Sidebar Column: Storyline + Metadata */}
          <div className="space-y-8 lg:pt-2">

            {/* Storyline Card */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                <Layers className="w-5 h-5 text-red-600" /> Storyline
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base mb-6">
                {displayOverview || "No overview available for this title."}
              </p>

              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <span key={g.id} className="text-[10px] font-bold text-gray-500 border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Stream Info Card */}
            <div className="bg-red-600/5 border border-red-600/10 rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                <Info className="w-5 h-5 text-red-600" /> Stream Details
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-black text-green-500 uppercase">Live</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Auto-Play</span>
                  <button
                    onClick={() => setAutoPlayNext(!autoPlayNext)}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all ${autoPlayNext ? 'bg-green-600/20 text-green-500' : 'bg-white/10 text-gray-500'}`}
                  >
                    {autoPlayNext ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Location</span>
                  <span className="text-xs font-black text-white uppercase tracking-tighter">Global Edge</span>
                </div>
              </div>
            </div>

            {/* Cast & Crew Section */}
            <div className="px-2">
              <CastSection credits={credits} />
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        body { overflow-x: hidden; }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out both; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
