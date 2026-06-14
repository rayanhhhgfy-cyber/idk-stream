"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, SkipForward, X, PictureInPicture2, PictureInPicture } from 'lucide-react';

export default function PlayerContainer({ type, id, season, episode, autoPlayNext, onNextEpisode, nextEpisodeTitle, episodeRuntime }) {
  const [currentServer, setCurrentServer] = useState(2);
  const [server1Available, setServer1Available] = useState(true);
  const [showIframe, setShowIframe] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const iframeRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const pipWindowRef = useRef(null);

  const isTv = type === 'tv';

  // Detect if user is on iOS
  const getIsIos = () => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  // Check PiP support on mount
  useEffect(() => {
    const hasDocPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const hasLegacyPip = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    // PiP is supported if browser has either method. keep conservative check.
    setPipSupported(!!(hasDocPip || hasLegacyPip));
  }, []);

  const buildUrl = (server) => {
    let url = '';
    if (server === 1) {
      url = isTv ? `https://vidsrc.to/embed/tv/${id}?season=${season}&episode=${episode}` : `https://vidsrc.to/embed/movie/${id}`;
    } else {
      url = isTv ? `https://www.vidking.net/embed/tv/${id}?season=${season}&episode=${episode}` : `https://www.vidking.net/embed/movie/${id}`;
    }
    if (autoPlayNext) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}autoplay=1&autoPlay=1`;
    }
    return url;
  };

  // ── Document Picture-in-Picture ──
  const togglePiP = useCallback(async () => {
    const isIos = getIsIos();

    // If already in PiP, close it
    if (pipActive && pipWindowRef.current) {
      try { 
        if (isIos && pipWindowRef.current.requestFullscreen) {
          // Exit fullscreen on iOS
          if (document.fullscreenElement) document.exitFullscreen();
        } else {
          pipWindowRef.current.close();
        }
      } catch {}
      pipWindowRef.current = null;
      setPipActive(false);
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    // iOS: Use fullscreen as Picture-in-Picture alternative
    if (isIos) {
      try {
        if (iframe.requestFullscreen) {
          await iframe.requestFullscreen();
          setPipActive(true);
          pipWindowRef.current = iframe;

          // Listen for fullscreen exit
          const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
              setPipActive(false);
              pipWindowRef.current = null;
            }
          };
          document.addEventListener('fullscreenchange', handleFullscreenChange);
          return;
        }
      } catch (err) {
        console.warn('iOS fullscreen failed:', err);
      }
    }

    // Method 1: Document Picture-in-Picture API (Chrome 116+, Edge 116+)
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: Math.min(640, window.screen.width - 100),
          height: Math.min(360, window.screen.height - 100),
        });

        pipWindowRef.current = pipWindow;

        // Style the PiP window
        const style = pipWindow.document.createElement('style');
        style.textContent = `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            overflow: hidden; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            width: 100vw;
            height: 100vh;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        `;
        pipWindow.document.head.appendChild(style);

        // Clone the iframe into the PiP window
        const pipIframe = pipWindow.document.createElement('iframe');
        pipIframe.src = iframe.src;
        pipIframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        pipIframe.allowFullscreen = true;
        pipIframe.style.width = '100%';
        pipIframe.style.height = '100%';
        pipIframe.style.border = 'none';
        pipWindow.document.body.appendChild(pipIframe);

        setPipActive(true);

        // Listen for PiP window close
        pipWindow.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setPipActive(false);
        });

        return;
      } catch (err) {
        console.warn('Document PiP failed:', err);
      }
    }

    // Method 2: Legacy PiP — try to find a video element inside the iframe
    // This only works if the iframe is same-origin (unlikely but worth trying)
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const video = iframeDoc.querySelector('video');
        if (video && video.requestPictureInPicture) {
          await video.requestPictureInPicture();
          setPipActive(true);
          video.addEventListener('leavepictureinpicture', () => setPipActive(false), { once: true });
          return;
        }
      }
    } catch {}

    // Method 3: Popup window fallback — works everywhere (except iOS)
    if (!isIos) {
      try {
        const width = Math.min(640, window.screen.width - 100);
        const height = Math.min(360, window.screen.height - 100);
        const left = window.screen.width - width - 20;
        const top = window.screen.height - height - 100;
        const popup = window.open(
          iframe.src,
          'idkstream_pip',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
        );
        if (popup) {
          pipWindowRef.current = popup;
          setPipActive(true);
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              pipWindowRef.current = null;
              setPipActive(false);
            }
          }, 1000);
          return;
        }
      } catch (err) {
        console.warn('PiP popup fallback failed:', err);
      }
    }

    // Final fallback: show message if nothing worked
    alert('Picture-in-Picture is not supported on your device. Try rotating your device or using a different browser.');
  }, [pipActive]);

  // Cleanup PiP on unmount or source change
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try { pipWindowRef.current.close(); } catch {}
        pipWindowRef.current = null;
        setPipActive(false);
      }
    };
  }, [currentServer, season, episode, type, id]);

  // Reset player when parameters change
  useEffect(() => {
    setShowIframe(false);
    setShowCountdown(false);
    setEmbedBlocked(false);
    setCountdown(15);
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    const timer = setTimeout(() => setShowIframe(true), 1500);
    return () => clearTimeout(timer);
  }, [currentServer, season, episode, type, id]);

  const handleIframeLoad = () => {
    setEmbedBlocked(false);
    setLoadErrorMessage('');
  };

  const handleIframeError = () => {
    if (currentServer === 1) {
      setServer1Available(false);
      setCurrentServer(2);
      setEmbedBlocked(false);
      setShowIframe(false);
      setTimeout(() => setShowIframe(true), 600);
      return;
    }

    setEmbedBlocked(true);
    setLoadErrorMessage('Failed to load player. The provider may be down.');
  };

  // Auto-play timer & iframe message listener
  useEffect(() => {
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    setShowCountdown(false);
    setCountdown(15);

    if (autoPlayNext && showIframe && isTv && onNextEpisode) {
      const runtimeMs = episodeRuntime ? (episodeRuntime - 2) * 60 * 1000 : 25 * 60 * 1000;
      let waitTime = Math.max(runtimeMs, 60000);
      if (process.env.NODE_ENV === 'development') waitTime = 10000;

      autoPlayTimerRef.current = setTimeout(() => {
        setShowCountdown(true);
        setCountdown(15);
      }, waitTime);
    }

    const handleMessage = (e) => {
      if (!autoPlayNext || !isTv || !onNextEpisode) return;
      try {
        let data = e.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }
        const isEnded = data === 'ended' || data === 'video_ended' || data?.event === 'ended' || data?.event === 'video_ended' || data?.type === 'ended' || data?.status === 'complete';
        if (isEnded) {
          clearTimeout(autoPlayTimerRef.current);
          setShowCountdown(true);
          setCountdown(15);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearTimeout(autoPlayTimerRef.current);
      clearInterval(countdownRef.current);
      window.removeEventListener('message', handleMessage);
    };
  }, [autoPlayNext, showIframe, isTv, season, episode, onNextEpisode, episodeRuntime]);

  // Countdown ticker
  useEffect(() => {
    if (!showCountdown) { clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setShowCountdown(false);
          if (onNextEpisode) onNextEpisode();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [showCountdown, onNextEpisode]);

  const dismissCountdown = () => { setShowCountdown(false); setCountdown(15); clearTimeout(autoPlayTimerRef.current); clearInterval(countdownRef.current); };
  const skipToNext = () => { clearInterval(countdownRef.current); setShowCountdown(false); setCountdown(15); if (onNextEpisode) onNextEpisode(); };

  const serverBtnStyle = (active, disabled) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '10px',
    border: active ? '1px solid rgba(229,9,20,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))' : 'rgba(255,255,255,0.04)',
    color: active ? '#ff4444' : '#888', fontWeight: 600, fontSize: '0.85rem', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.25s ease',
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <div>
      <div data-player="true" style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#111', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>

        {!showIframe && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: '#555', fontSize: '0.8rem' }}>Loading player...</p>
            </div>
          </div>
        )}

        {showIframe && (
          <iframe
            key={`${currentServer}-${id}-${season}-${episode}`}
            ref={iframeRef}
            src={buildUrl(currentServer)}
            title="Video Player"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            data-player="true"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* Embed blocked / error fallback UI */}
        {embedBlocked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b' }}>
            <div style={{ maxWidth: '720px', padding: '26px', borderRadius: '12px', background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>Player Unavailable</h3>
              <p style={{ color: '#aaa', margin: '0 0 16px' }}>{loadErrorMessage || 'The embed provider blocked playback or the content failed to load.'}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => window.open(buildUrl(currentServer), '_blank')} style={{ background: '#e50914', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Open Player in New Tab</button>
                <button onClick={() => { setEmbedBlocked(false); setShowIframe(false); setTimeout(() => setShowIframe(true), 600); }} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
                <button onClick={() => setCurrentServer(currentServer === 1 ? 2 : 1)} style={{ background: 'rgba(255,255,255,0.04)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Try Other Server</button>
              </div>
            </div>
          </div>
        )}

        {/* PiP Button — top right of player */}
        {showIframe && (
          <button
            onClick={togglePiP}
            title={getIsIos() ? (pipActive ? 'Exit Fullscreen' : 'Enter Fullscreen') : (pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture')}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 25,
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: pipActive ? '1px solid rgba(229,9,20,0.6)' : '1px solid rgba(255,255,255,0.15)',
              background: pipActive ? 'rgba(229,9,20,0.25)' : 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              color: pipActive ? '#ff6b6b' : 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = pipActive ? 'rgba(229,9,20,0.4)' : 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = pipActive ? 'rgba(229,9,20,0.25)' : 'rgba(0,0,0,0.6)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {pipActive
              ? <PictureInPicture style={{ width: 18, height: 18 }} />
              : <PictureInPicture2 style={{ width: 18, height: 18 }} />
            }
          </button>
        )}

        {/* PiP Active Indicator */}
        {pipActive && showIframe && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(229,9,20,0.2)',
            border: '1px solid rgba(229,9,20,0.4)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            padding: '5px 12px',
            animation: 'pipPulse 2s ease-in-out infinite',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e50914', boxShadow: '0 0 6px rgba(229,9,20,0.8)' }} />
            <span style={{ color: '#ff6b6b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>PiP Active</span>
          </div>
        )}

        {/* Auto-play countdown overlay */}
        {showCountdown && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', zIndex: 20, animation: 'fadeInUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(229,9,20,0.15)', border: '3px solid #e50914', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{countdown}</div>
              <div>
                <p style={{ color: '#aaa', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Up Next</p>
                <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>{nextEpisodeTitle || 'Next Episode'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={skipToNext} style={{ background: '#e50914', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SkipForward style={{ width: 14, height: 14 }} /> Play Now
              </button>
              <button onClick={dismissCountdown} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Server buttons + PiP button row */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => server1Available && setCurrentServer(1)} disabled={!server1Available} style={serverBtnStyle(currentServer === 1, !server1Available)}>
          <Server style={{ width: 14, height: 14 }} /> {server1Available ? 'Server 1' : 'Server 1 (blocked)'}
        </button>
        <button onClick={() => setCurrentServer(2)} style={serverBtnStyle(currentServer === 2, false)}><Server style={{ width: 14, height: 14 }} /> Server 2</button>
        <button
          onClick={togglePiP}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '10px',
            border: pipActive ? '1px solid rgba(229,9,20,0.5)' : '1px solid rgba(255,255,255,0.08)',
            background: pipActive ? 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))' : 'rgba(255,255,255,0.04)',
            color: pipActive ? '#ff4444' : '#888', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.25s ease',
          }}
        >
          <PictureInPicture2 style={{ width: 14, height: 14 }} />
          {pipActive ? 'Exit PiP' : 'Pop Out'}
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pipPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
