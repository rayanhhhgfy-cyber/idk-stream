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
import { Star, ArrowLeft, Layers, PlayCircle, Film, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { getAllWatchProgress } from '@/lib/watchHistory';
import { fetchTVSeasonEpisodes } from '@/lib/tmdb';

export default function Watch({ params }) {
  const { type, id } = React.use(params);

  const [details, setDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [credits, setCredits] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [allProgress, setAllProgress] = useState({});

  // Ref for the player container (used by KeyboardShortcuts for fullscreen)
  const playerRef = useRef(null);
  // Track when the user started watching (for progress tracking)
  const watchStartRef = useRef(null);
  const accumulatedTimeRef = useRef(0);
  const isVisibleRef = useRef(true);
  const lastSaveTimeRef = useRef(0);

  // Fetch movie/show details + credits + trailers
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
          
          // Check watch history to resume where they left off
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

  // Save to watch history
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

  // Load all watch progress for episode progress bars
  useEffect(() => {
    setAllProgress(getAllWatchProgress());
  }, [currentSeason, currentEpisode]);

  // Track watch time — start timer when iframe loads, pause when tab hidden
  useEffect(() => {
    if (!details) return;
    
    // Reset timers when details/season/episode change
    watchStartRef.current = Date.now();
    accumulatedTimeRef.current = 0;
    
    const prevProgress = getWatchProgress(parseInt(id), type, type === 'tv' ? currentSeason : undefined, type === 'tv' ? currentEpisode : undefined);
    const existingWatched = prevProgress?.watchedSeconds || 0;
    const totalSeconds = (details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 120) * 60;

    const saveProgress = () => {
      if (!watchStartRef.current) return;
      
      // Calculate active viewing time since last start/resume
      let currentSessionTime = 0;
      if (isVisibleRef.current) {
        currentSessionTime = Math.floor((Date.now() - watchStartRef.current) / 1000);
      }
      
      const totalSessionTime = accumulatedTimeRef.current + currentSessionTime;
      
      // Only save if we actually watched something meaningful (>10s) 
      // and haven't saved in the last 5 seconds (debounce)
      if (totalSessionTime > 10 && (Date.now() - lastSaveTimeRef.current > 5000)) {
        const totalWatched = existingWatched + totalSessionTime;
        updateWatchProgress(parseInt(id), type, totalWatched, totalSeconds, type === 'tv' ? currentSeason : undefined, type === 'tv' ? currentEpisode : undefined);
        lastSaveTimeRef.current = Date.now();
      }
    };

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden: pause timer and accumulate the time spent
        if (isVisibleRef.current && watchStartRef.current) {
          accumulatedTimeRef.current += Math.floor((Date.now() - watchStartRef.current) / 1000);
          isVisibleRef.current = false;
        }
        saveProgress();
      } else {
        // Tab is visible again: restart the timer
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
      const seasonData = await fetchTVSeasonEpisodes(id, seasonNum);
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

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Preparing your stream...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e50914', marginBottom: '12px' }}>Oops!</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>{error || 'Details not found'}</p>
        <Link href="/" style={{ padding: '12px 24px', background: '#e50914', color: 'white', borderRadius: '12px', textDecoration: 'none' }}>Go Home</Link>
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
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingBottom: '100px' }}>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts playerContainerRef={playerRef} onNextEpisode={handleNextEpisode} isTv={type === 'tv'} />

      {/* Trailer Modal */}
      {showTrailer && trailers.length > 0 && (
        <TrailerModal youtubeKey={trailers[0].key} title={displayTitle} onClose={() => setShowTrailer(false)} />
      )}

      {/* Cinematic Backdrop */}
      {displayBackdrop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', zIndex: 0 }}>
          <Image src={`https://image.tmdb.org/t/p/original${displayBackdrop}`} alt="" fill style={{ objectFit: 'cover', opacity: 0.25, filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, #0a0a0a 100%)' }} />
        </div>
      )}

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '100px 24px 0' }}>

        {/* Navigation & Title */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '32px' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#e50914', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600, marginBottom: '12px' }}>
              <ArrowLeft style={{ width: 16, height: 16 }} /> Back
            </Link>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: '8px' }}>{displayTitle}</h1>

            {/* Meta info + Trailer button */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', color: '#888', fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                <Star style={{ width: 16, height: 16, fill: '#fbbf24' }} /> {displayRating.toFixed(1)}
              </span>
              <span>{new Date(displayReleaseDate).getFullYear()}</span>
              {displayRuntime && <span>{displayRuntime} min</span>}
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'white' }}>
                {type === 'tv' ? 'Series' : 'Movie'}
              </span>
              {/* Watch Trailer Button */}
              {trailers.length > 0 && (
                <button onClick={() => setShowTrailer(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white', padding: '6px 16px', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229,9,20,0.2)'; e.currentTarget.style.borderColor = 'rgba(229,9,20,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                  <Film style={{ width: 14, height: 14 }} /> Watch Trailer
                </button>
              )}
            </div>
          </div>

          {/* TV Show Controls (Compact) */}
          {type === 'tv' && seasons.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <select value={currentSeason} onChange={(e) => handleSeasonChange(parseInt(e.target.value))} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 30px 6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}>
                  {seasons.map(s => <option key={s.season_number} value={s.season_number} style={{background: '#141414', color: 'white'}}>Season {s.season_number}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#888', pointerEvents: 'none' }} />
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>E{currentEpisode} of {episodes.length}</span>
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
              {nextEpisodeTitle && (
                <button onClick={handleNextEpisode} style={{ background: '#e50914', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}>
                  Next <PlayCircle style={{ width: 14, height: 14 }} />
                </button>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoPlayNext} onChange={(e) => setAutoPlayNext(e.target.checked)} style={{ accentColor: '#e50914', cursor: 'pointer', width: '14px', height: '14px' }} />
                Auto
              </label>
            </div>
          )}
        </div>

        {/* Video Player */}
        <div ref={playerRef} style={{ marginBottom: '48px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
          <PlayerContainer type={type} id={id} season={currentSeason} episode={currentEpisode} autoPlayNext={autoPlayNext} onNextEpisode={handleNextEpisode} nextEpisodeTitle={nextEpisodeTitle} episodeRuntime={displayRuntime} />
        </div>

        {/* Episode Selector */}
        {type === 'tv' && episodes.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
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

        {/* Details Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '48px' }}>
          <div>
            <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers style={{ width: 20, height: 20, color: '#e50914' }} />
              Storyline
            </h3>
            <p style={{ color: '#aaa', lineHeight: 1.8, fontSize: '1rem' }}>{displayOverview || "No overview available."}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '24px' }}>
              {genres.map(g => (
                <span key={g.id} style={{ background: 'rgba(255,255,255,0.05)', color: '#888', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.05)' }}>{g.name}</span>
              ))}
            </div>

            {/* Cast & Crew Section */}
            <CastSection credits={credits} />
          </div>

          {/* Stream Information */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>Stream Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Status</span>
                <span style={{ color: '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Quality</span>
                <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>Auto (Up to 4K)</span>
              </div>
              {type === 'tv' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Season/Episode</span>
                    <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>S{currentSeason} : E{currentEpisode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Auto-play</span>
                    <span style={{ color: autoPlayNext ? '#4ade80' : '#666', fontSize: '0.9rem', fontWeight: 600 }}>{autoPlayNext ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
