"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Hls from 'hls.js';
import { PictureInPicture, PictureInPicture2, Server, SkipForward, X } from 'lucide-react';

async function fetchSources(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to load direct sources.');
  return payload;
}

export default function DirectSourcePlayer({
  type,
  id,
  season,
  episode,
  autoPlayNext,
  onNextEpisode,
  nextEpisodeTitle,
  episodeRuntime,
  onSyncTime,
  onUseEmbedded,
}) {
  const videoRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const bufferingRef = useRef(false);
  const callbacksRef = useRef({ onSyncTime, onNextEpisode });
  const [currentSource, setCurrentSource] = useState(0);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipMessage, setPipMessage] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [retryKey, setRetryKey] = useState(0);

  const playerReady = type === 'tv'
    ? Boolean(id && season && episode)
    : Boolean(id);
  const sourceKey = useMemo(() => {
    if (!playerReady) return null;
    const query = new URLSearchParams({ type, id: String(id) });
    if (type === 'tv') {
      query.set('season', String(season));
      query.set('episode', String(episode));
    }
    return `/api/sources?${query.toString()}`;
  }, [type, id, season, episode, playerReady]);
  const { data, error: sourceError, isLoading: sourcesLoading, mutate } = useSWR(
    sourceKey,
    fetchSources,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const activeSource = sources[currentSource];

  useEffect(() => {
    callbacksRef.current = { onSyncTime, onNextEpisode };
  }, [onSyncTime, onNextEpisode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hasWebKitProbe = typeof video.webkitSupportsPresentationMode === 'function';
    const supported = hasWebKitProbe
      ? video.webkitSupportsPresentationMode('picture-in-picture')
      : typeof video.requestPictureInPicture === 'function' && document.pictureInPictureEnabled;
    setPipSupported(Boolean(supported));
  }, [activeSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return undefined;

    let hls;
    let mounted = true;
    setPlayerLoading(true);
    setPlayerError('');
    setIsBuffering(false);
    bufferingRef.current = false;

    const onPlaying = () => {
      if (!mounted) return;
      setPlayerLoading(false);
      setIsBuffering(false);
      bufferingRef.current = false;
      setIsPlaying(true);
    };
    const onPause = () => mounted && setIsPlaying(false);
    const onWaiting = () => {
      if (!mounted) return;
      setIsBuffering(true);
      bufferingRef.current = true;
    };
    const onCanPlay = () => mounted && setPlayerLoading(false);
    const onTimeUpdate = () => {
      if (mounted) callbacksRef.current.onSyncTime?.(video.currentTime, bufferingRef.current);
    };
    const onEnded = () => {
      if (!autoPlayNext || type !== 'tv' || !callbacksRef.current.onNextEpisode) return;
      clearTimeout(autoPlayTimerRef.current);
      setShowCountdown(true);
      setCountdown(15);
    };
    const onError = () => {
      if (!mounted) return;
      setPlayerLoading(false);
      setPlayerError('This direct source could not be played. Try another source.');
    };
    const onEnterPictureInPicture = () => setPipActive(true);
    const onLeavePictureInPicture = () => setPipActive(false);
    const onPresentationModeChange = () => {
      setPipActive(video.webkitPresentationMode === 'picture-in-picture');
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('enterpictureinpicture', onEnterPictureInPicture);
    video.addEventListener('leavepictureinpicture', onLeavePictureInPicture);
    video.addEventListener('webkitpresentationmodechanged', onPresentationModeChange);

    const isHls = activeSource.type === 'hls' || /\.m3u8(?:\?|$)/i.test(activeSource.url);
    const hasNativeHls = Boolean(video.canPlayType('application/vnd.apple.mpegurl'));

    if (isHls && !hasNativeHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(activeSource.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!mounted) return;
        setPlayerLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, details) => {
        if (mounted && details.fatal) {
          setPlayerLoading(false);
          setPlayerError('The HLS source failed to load. Try another source.');
        }
      });
    } else if (isHls && !hasNativeHls) {
      setPlayerLoading(false);
      setPlayerError('This browser cannot play the selected HLS source.');
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
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('enterpictureinpicture', onEnterPictureInPicture);
      video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture);
      video.removeEventListener('webkitpresentationmodechanged', onPresentationModeChange);
    };
  }, [activeSource, autoPlayNext, type, retryKey]);

  useEffect(() => {
    clearTimeout(autoPlayTimerRef.current);
    if (!autoPlayNext || type !== 'tv' || !episodeRuntime || !activeSource) return undefined;
    autoPlayTimerRef.current = setTimeout(() => {
      setShowCountdown(true);
      setCountdown(15);
    }, Math.max((episodeRuntime - 2) * 60 * 1000, 60 * 1000));
    return () => clearTimeout(autoPlayTimerRef.current);
  }, [autoPlayNext, type, episodeRuntime, activeSource]);

  useEffect(() => {
    if (!showCountdown) return undefined;
    let remaining = 15;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(15);
        setShowCountdown(false);
        callbacksRef.current.onNextEpisode?.();
        return;
      }
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [showCountdown]);

  useEffect(() => () => {
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (typeof video.webkitSupportsPresentationMode === 'function') {
        if (!video.webkitSupportsPresentationMode('picture-in-picture')) {
          setPipMessage('Native PiP is not available in this installed iOS app. Open the title in Safari for system PiP.');
          return;
        }
        const mode = video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
        video.webkitSetPresentationMode(mode);
        setPipActive(mode === 'picture-in-picture');
        setPipMessage('');
        return;
      }

      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        setPipActive(true);
      } else {
        setPipMessage('Native Picture-in-Picture is not supported by this browser.');
      }
    } catch {
      setPipMessage('iOS blocked native PiP in this installed app. Open the title in Safari for system PiP.');
    }
  }, []);

  const selectSource = useCallback(async (index) => {
    if (index === currentSource) return;
    const video = videoRef.current;
    try {
      if (video && document.pictureInPictureElement === video) await document.exitPictureInPicture();
      if (video?.webkitPresentationMode === 'picture-in-picture') video.webkitSetPresentationMode('inline');
    } catch {}
    setPipActive(false);
    setCurrentSource(index);
    setPlayerError('');
    setPlayerLoading(true);
  }, [currentSource]);

  const retryPlayer = useCallback(() => {
    if (sourceError) {
      mutate();
      return;
    }
    setPlayerError('');
    setPlayerLoading(true);
    setRetryKey((value) => value + 1);
  }, [sourceError, mutate]);

  const dismissCountdown = () => {
    clearInterval(countdownRef.current);
    setShowCountdown(false);
    setCountdown(15);
  };
  const playNext = () => {
    clearInterval(countdownRef.current);
    setShowCountdown(false);
    callbacksRef.current.onNextEpisode?.();
  };
  const visibleError = playerError || sourceError?.message;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#050507',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)',
        }}
      >
        <video
          ref={videoRef}
          aria-label="Video playback"
          controls
          playsInline
          autoPlay
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
        />

        {(sourcesLoading || (playerLoading && activeSource)) && !visibleError && (
          <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,17,17,0.9)', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
              <span aria-hidden="true" style={{ display: 'block', width: 36, height: 36, border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'playerSpin 0.8s linear infinite', margin: '0 auto 10px' }} />
              {sourcesLoading ? 'Loading direct sources…' : 'Loading stream…'}
            </div>
          </div>
        )}

        {visibleError && (
          <div role="alert" style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', padding: 20 }}>
            <div style={{ maxWidth: 640, textAlign: 'center' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>Direct playback unavailable</h3>
              <p style={{ color: '#aaa', margin: '0 0 16px', overflowWrap: 'anywhere' }}>{visibleError}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                <button type="button" onClick={retryPlayer} style={{ minHeight: 44, background: '#e50914', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
                {onUseEmbedded && <button type="button" onClick={onUseEmbedded} style={{ minHeight: 44, background: 'rgba(255,255,255,0.12)', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>Use embedded player</button>}
              </div>
            </div>
          </div>
        )}

        {activeSource && !visibleError && (
          <button
            type="button"
            onClick={togglePiP}
            disabled={!pipSupported || !isPlaying}
            title={pipSupported ? (pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture') : 'Native PiP is not available in this installed iOS app'}
            aria-label={pipActive ? 'Exit Picture-in-Picture' : 'Start native Picture-in-Picture'}
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, minWidth: 44, minHeight: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.75)', color: 'white', opacity: pipSupported && isPlaying ? 1 : 0.55, cursor: pipSupported && isPlaying ? 'pointer' : 'not-allowed' }}
          >
            {pipActive ? <PictureInPicture style={{ width: 18 }} /> : <PictureInPicture2 style={{ width: 18 }} />}
          </button>
        )}

        {showCountdown && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6))' }}>
            <div>
              <p style={{ color: '#aaa', fontSize: '0.7rem', textTransform: 'uppercase', margin: 0 }}>Up Next · {countdown}</p>
              <p style={{ color: 'white', margin: '4px 0 0', fontWeight: 600 }}>{nextEpisodeTitle || 'Next Episode'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={playNext} style={{ minHeight: 44, background: '#e50914', color: 'white', border: 0, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}><SkipForward style={{ width: 14 }} /> Play Now</button>
              <button type="button" onClick={dismissCountdown} aria-label="Dismiss next episode countdown" style={{ minWidth: 44, minHeight: 44, background: 'rgba(255,255,255,0.1)', color: 'white', border: 0, padding: 10, borderRadius: 8, cursor: 'pointer' }}><X style={{ width: 16 }} /></button>
            </div>
          </div>
        )}
      </div>

      {isBuffering && !playerLoading && <p role="status" style={{ marginTop: 10, padding: 6, textAlign: 'center', color: '#ffb703', fontSize: '0.85rem' }}>Buffering…</p>}
      {activeSource && !pipSupported && !visibleError && (
        <p role="status" style={{ marginTop: 10, color: '#aaa', fontSize: '0.85rem' }}>
          Native PiP is unavailable in this installed iOS app. Open the title in Safari for system PiP.
        </p>
      )}
      {pipMessage && <p role="status" style={{ marginTop: 10, color: '#ffb703', fontSize: '0.85rem' }}>{pipMessage}</p>}

      <section className="server-selector-card" aria-label="Direct video sources" style={{ marginTop: 14 }}>
        <div className="server-selector-header">
          <div className="server-title-group"><div className="server-icon-pulse"><Server style={{ width: 15, color: '#e50914' }} /></div><span className="server-title"><span className="status-dot" /> Direct Sources</span></div>
          <span className="server-active-label">Active: <strong style={{ color: '#ff4444' }}>{activeSource?.name || 'None'}</strong></span>
        </div>
        <div className="server-buttons-grid">
          {sources.map((source, index) => (
            <button
              type="button"
              key={source.id}
              onClick={() => selectSource(index)}
              className={`server-btn ${index === currentSource ? 'active' : ''}`}
              aria-pressed={index === currentSource}
              style={{ minHeight: 44 }}
            >
              <span className="server-btn-name">{source.name}</span>
              {source.quality && <span className="server-btn-badge">{source.quality}</span>}
            </button>
          ))}
          {!sources.length && !sourcesLoading && !sourceError && <p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>No direct sources available.</p>}
        </div>
      </section>
      <style jsx>{`@keyframes playerSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
