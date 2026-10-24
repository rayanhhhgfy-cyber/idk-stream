"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { PictureInPicture, PictureInPicture2, Server, SkipForward, X } from 'lucide-react';

export default function PlayerContainer({
  type,
  id,
  season,
  episode,
  autoPlayNext,
  onNextEpisode,
  nextEpisodeTitle,
  episodeRuntime,
  onSyncTime,
}) {
  const videoRef = useRef(null);
  const countdownRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const [sources, setSources] = useState([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [loadingSources, setLoadingSources] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSlowTip, setShowSlowTip] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [pipActive, setPipActive] = useState(false);

  const playerReady = type === 'tv' ? Boolean(id && season && episode) : Boolean(id);
  const activeSource = sources[currentSource];

  const resetPlayer = useCallback(() => {
    setPlayerLoading(true);
    setPlayerError('');
    setIsBuffering(false);
    setShowSlowTip(false);
    setShowCountdown(false);
    setCountdown(15);
  }, []);

  useEffect(() => {
    if (!playerReady) return undefined;
    const controller = new AbortController();
    const resetTimer = setTimeout(() => {
      setLoadingSources(true);
      setSources([]);
      setCurrentSource(0);
      resetPlayer();
    }, 0);

    const query = new URLSearchParams({ type, id: String(id) });
    if (type === 'tv') {
      query.set('season', String(season));
      query.set('episode', String(episode));
    }

    fetch(`/api/sources?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Source server request failed');
        return payload;
      })
      .then((payload) => {
        if (!payload.sources?.length) throw new Error('Source server returned no playable sources');
        setSources(payload.sources);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setPlayerError(error.message || 'Unable to load direct sources');
          setLoadingSources(false);
          setPlayerLoading(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSources(false);
      });

    return () => {
      clearTimeout(resetTimer);
      controller.abort();
    };
  }, [type, id, season, episode, playerReady, resetPlayer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return undefined;

    let hls;
    let mounted = true;
    resetPlayer();

    const onPlaying = () => {
      if (!mounted) return;
      setPlayerLoading(false);
      setIsBuffering(false);
    };
    const onWaiting = () => mounted && setIsBuffering(true);
    const onCanPlay = () => mounted && setPlayerLoading(false);
    const onTimeUpdate = () => {
      if (mounted && onSyncTime) onSyncTime(video.currentTime, isBuffering);
    };
    const onEnded = () => {
      if (autoPlayNext && type === 'tv' && onNextEpisode) {
        clearTimeout(autoPlayTimerRef.current);
        setShowCountdown(true);
        setCountdown(15);
      }
    };
    const onError = () => {
      if (mounted) {
        setPlayerLoading(false);
        setPlayerError('The selected direct source could not be played. Try another source.');
      }
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    const isHls = activeSource.type === 'hls' || /\.m3u8(?:\?|$)/i.test(activeSource.url);
    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(activeSource.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (mounted) {
          setPlayerLoading(false);
          video.play().catch(() => {});
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (mounted && data.fatal) {
          setPlayerLoading(false);
          setPlayerError('The HLS source failed to load. Try another source.');
        }
      });
    } else {
      video.src = activeSource.url;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      mounted = false;
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [activeSource, autoPlayNext, type, onNextEpisode, onSyncTime, resetPlayer, isBuffering]);

  useEffect(() => {
    if (!playerLoading || !activeSource) return undefined;
    loadingTimeoutRef.current = setTimeout(() => setShowSlowTip(true), 12000);
    return () => clearTimeout(loadingTimeoutRef.current);
  }, [playerLoading, activeSource]);

  useEffect(() => {
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    if (!autoPlayNext || type !== 'tv' || !onNextEpisode || !episodeRuntime) return undefined;
    autoPlayTimerRef.current = setTimeout(() => {
      setShowCountdown(true);
      setCountdown(15);
    }, Math.max((episodeRuntime - 2) * 60 * 1000, 60000));
    return () => clearTimeout(autoPlayTimerRef.current);
  }, [autoPlayNext, type, onNextEpisode, episodeRuntime, activeSource]);

  useEffect(() => {
    if (!showCountdown) return undefined;
    countdownRef.current = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          clearInterval(countdownRef.current);
          setShowCountdown(false);
          onNextEpisode?.();
          return 15;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [showCountdown, onNextEpisode]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        setPipActive(true);
      } else {
        await video.requestFullscreen();
      }
    } catch {
      // Browser policy may require a user gesture or may not support PiP.
    }
  };

  const selectSource = (index) => {
    if (index === currentSource) return;
    setCurrentSource(index);
    resetPlayer();
  };

  const retryPlayer = () => {
    if (activeSource) {
      resetPlayer();
      setSources((current) => [...current]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        data-player="true"
        style={{
          position: 'relative', width: '100%', paddingTop: '56.25%', background: '#050507',
          borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)',
        }}
      >
        {playerReady && (
          <video
            ref={videoRef}
            controls
            playsInline
            autoPlay
            data-player="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
            onEnterPictureInPicture={() => setPipActive(true)}
            onLeavePictureInPicture={() => setPipActive(false)}
          />
        )}

        {(loadingSources || (playerLoading && activeSource)) && !playerError && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,17,17,0.9)', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'playerSpin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: '#aaa', fontSize: '0.8rem' }}>{loadingSources ? 'Loading direct sources…' : 'Loading stream…'}</p>
            </div>
          </div>
        )}

        {showSlowTip && !playerError && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.85)', padding: '10px 20px', borderRadius: 10, color: '#ffb703', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
            Taking longer than usual. Try another direct source below.
          </div>
        )}

        {playerError && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b' }}>
            <div style={{ maxWidth: 640, padding: 26, textAlign: 'center' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>Direct playback unavailable</h3>
              <p style={{ color: '#aaa', margin: '0 0 16px' }}>{playerError}</p>
              <button onClick={retryPlayer} style={{ background: '#e50914', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
            </div>
          </div>
        )}

        {playerReady && activeSource && (
          <button onClick={togglePiP} title={pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.65)', color: 'white', cursor: 'pointer' }}>
            {pipActive ? <PictureInPicture style={{ width: 18 }} /> : <PictureInPicture2 style={{ width: 18 }} />}
          </button>
        )}

        {showCountdown && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6))' }}>
            <div><p style={{ color: '#aaa', fontSize: '0.7rem', textTransform: 'uppercase', margin: 0 }}>Up Next · {countdown}</p><p style={{ color: 'white', margin: '4px 0 0', fontWeight: 600 }}>{nextEpisodeTitle || 'Next Episode'}</p></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowCountdown(false); onNextEpisode?.(); }} style={{ background: '#e50914', color: 'white', border: 0, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}><SkipForward style={{ width: 14 }} /> Play Now</button>
              <button onClick={() => setShowCountdown(false)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 0, padding: 10, borderRadius: 8, cursor: 'pointer' }}><X style={{ width: 16 }} /></button>
            </div>
          </div>
        )}
      </div>

      {isBuffering && !playerLoading && <div style={{ marginTop: 10, padding: 6, textAlign: 'center', color: '#ffb703', fontSize: '0.8rem' }}>Buffering…</div>}

      <div className="server-selector-card" style={{ marginTop: 14 }}>
        <div className="server-selector-header">
          <div className="server-title-group"><div className="server-icon-pulse"><Server style={{ width: 15, color: '#e50914' }} /></div><span className="server-title"><span className="status-dot" /> Direct Sources</span></div>
          <span className="server-active-label">Active: <strong style={{ color: '#ff4444' }}>{activeSource?.name || 'None'}</strong></span>
        </div>
        <div className="server-buttons-grid">
          {sources.map((source, index) => (
            <button key={source.id} onClick={() => selectSource(index)} className={`server-btn ${index === currentSource ? 'active' : ''}`}>
              <span className="server-btn-name">{source.name}</span>
              {source.quality && <span className="server-btn-badge">{source.quality}</span>}
            </button>
          ))}
          {!sources.length && !loadingSources && <p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>No direct sources available.</p>}
        </div>
      </div>
      <style jsx>{`@keyframes playerSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
