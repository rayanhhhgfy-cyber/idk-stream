"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, SkipForward, X, PictureInPicture2, PictureInPicture, Monitor } from 'lucide-react';
import Hls from 'hls.js';

const serverConfigs = {
  1: { name: 'HLS Player', isHls: true, badge: 'Dev' },
  2: { name: 'Vidking', episodeOffset: 0, baseUrl: 'https://www.vidking.net', fallbackUrl: 'https://vidsrc.cc', badge: '4K Ultra' },
  3: { name: 'vidsrc.pm', episodeOffset: 0, baseUrl: 'https://vidsrc.pm', badge: 'HD Speed' },
  4: { name: 'autoembed.co', episodeOffset: 0, baseUrl: 'https://autoembed.co', badge: 'Backup' },
  5: { name: 'vidsrc.me', episodeOffset: 0, baseUrl: 'https://vidsrc.me', badge: 'Multi-Lang' },
  6: { name: 'VAPlayer', episodeOffset: 0, baseUrl: 'https://vaplayer.ru', badge: 'VidAPI' },
};

export default function PlayerContainer({ type, id, season, episode, autoPlayNext, onNextEpisode, nextEpisodeTitle, episodeRuntime, onSyncTime }) {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (dev) {
        setTimeout(() => setIsDev(true), 0);
      }
    }
  }, []);

  const [currentServer, setCurrentServer] = useState(4);

  const [quality, setQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualityMenuRef = useRef(null);
  const qualityOptions = ['auto', '1080p', '720p', '480p', '360p'];
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [showIosPipModal, setShowIosPipModal] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSlowTip, setShowSlowTip] = useState(false);

  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const pipWindowRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  const isTv = type === 'tv';
  const playerReady = isTv ? Boolean(season && episode) : Boolean(id);

  // Detect if user is on iOS or in iOS PWA Standalone Mode
  const getIsIos = () => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const getIsStandalonePwa = () => {
    return (
      typeof window !== 'undefined' &&
      (window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches)
    );
  };

  // Check PiP support on mount
  useEffect(() => {
    const hasDocPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const hasLegacyPip = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    if (hasDocPip || hasLegacyPip) {
      setTimeout(() => setPipSupported(true), 0);
    }
  }, []);

  // Close quality menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Loading timeout effect to handle slow/unstable connections with non-blocking suggestions
  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setTimeout(() => {
      setShowSlowTip(false);
    }, 0);

    if (iframeLoading && playerReady && !embedBlocked) {
      loadingTimeoutRef.current = setTimeout(() => {
        setShowSlowTip(true);
        console.warn('Playback load timeout reached (12s). Displaying gentle suggestion tip.');
      }, 12000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [iframeLoading, playerReady, embedBlocked]);

  const [server2Failed, setServer2Failed] = useState(false);

  const buildUrl = (server) => {
    const cfg = serverConfigs[server];
    if (!cfg || cfg.isHls) return '';
    const ep = isTv ? Number(episode) + cfg.episodeOffset : null;
    let url = '';
    if (server === 2) {
      const activeBase = server2Failed && cfg.fallbackUrl ? cfg.fallbackUrl : cfg.baseUrl;
      url = isTv
        ? `${activeBase}/embed/tv/${id}/${season}/${ep}`
        : `${activeBase}/embed/movie/${id}`;
    } else if (server === 3) {
      url = isTv
        ? `${cfg.baseUrl}/embed/tv/${id}/${season}/${ep}`
        : `${cfg.baseUrl}/embed/movie/${id}`;
    } else if (server === 4) {
      url = isTv
        ? `${cfg.baseUrl}/tv/tmdb/${id}-${season}-${ep}`
        : `${cfg.baseUrl}/movie/tmdb/${id}`;
    } else if (server === 5) {
      url = isTv
        ? `${cfg.baseUrl}/embed/tv/${id}/${season}/${ep}`
        : `${cfg.baseUrl}/embed/movie/${id}`;
    } else if (server === 6) {
      url = isTv
        ? `${cfg.baseUrl}/embed/tv/${id}/${season}/${ep}`
        : `${cfg.baseUrl}/embed/movie/${id}`;
    }
    const params = [];
    if (server === 2) {
      params.push('color=e50914');
      if (isTv) {
        params.push('nextEpisode=true', 'episodeSelector=true');
      }
    }
    if (quality !== 'auto') params.push(`quality=${quality}`);
    if (autoPlayNext) params.push('autoplay=1', 'autoPlay=true');
    if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');
    return url;
  };

  // ── Document Picture-in-Picture ──
  const togglePiP = useCallback(async () => {
    const isIos = getIsIos();

    if (isIos) {
      setShowIosPipModal(true);
      return;
    }

    // If already in PiP, close it
    if (pipActive && pipWindowRef.current) {
      try { 
        pipWindowRef.current.close();
      } catch {}
      pipWindowRef.current = null;
      setPipActive(false);
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

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
    setTimeout(() => {
      setIframeLoading(true);
      setShowCountdown(false);
      setEmbedBlocked(false);
      setIsBuffering(false);
      setLoadErrorMessage('');
      setCountdown(15);
      setQuality('auto');
      setShowIosPipModal(false);
    }, 0);
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, [season, episode, type, id]);

  // Reset loading overlay when switching servers or quality
  useEffect(() => {
    setTimeout(() => {
      setIframeLoading(true);
      setEmbedBlocked(false);
      setLoadErrorMessage('');
    }, 0);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, [currentServer, quality]);

  // HLS.js Player lifecycle effect (used ONLY in development fallback mode)
  useEffect(() => {
    let isMounted = true;
    if (!playerReady || currentServer !== 1 || !isDev) return;
    const video = videoRef.current;
    if (!video) return;

    // Direct video element events for better loading & buffering state updates
    const handlePlaying = () => {
      if (!isMounted) return;
      setIframeLoading(false);
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      if (!isMounted) return;
      setIsBuffering(true);
    };

    const handleLoadStart = () => {
      if (!isMounted) return;
      setIframeLoading(true);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('loadstart', handleLoadStart);

    // Fallback HLS stream link (ultra-reliable Sintel/Mux test stream - used ONLY in development/manual testing)
    const fallbackM3u8 = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

    let hls = null;

    const initHls = (src) => {
      if (hls) {
        hls.destroy();
        hls = null;
      }

      // Support native HLS (iOS, Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          if (!isMounted) return;
          setIframeLoading(false);
          setEmbedBlocked(false);
        });
        video.addEventListener('error', () => {
          if (!isMounted) return;
          setIframeLoading(false);
          setEmbedBlocked(true);
          setLoadErrorMessage('Development stream loading failed.');
        });
      } else if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isMounted) return;
          setIframeLoading(false);
          setEmbedBlocked(false);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (!isMounted) return;
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error encountered, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                setIframeLoading(false);
                setEmbedBlocked(true);
                setLoadErrorMessage('Development HLS error.');
                hls.destroy();
                break;
            }
          }
        });
      }
    };

    initHls(fallbackM3u8);

    return () => {
      isMounted = false;
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [currentServer, season, episode, type, id, playerReady, isDev]);

  const handleIframeLoad = () => {
    setEmbedBlocked(false);
    setLoadErrorMessage('');
    setIsBuffering(false);
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    if (currentServer === 2 && !server2Failed) {
      console.warn('Primary Vidking URL unreachable. Activating high-availability mirror fallback...');
      setServer2Failed(true);
      setIframeLoading(true);
      return;
    }
    setEmbedBlocked(true);
    setIframeLoading(false);
    setLoadErrorMessage('Failed to load player. The provider may be down.');
  };

  // Auto-play timer & iframe message listener
  useEffect(() => {
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    setTimeout(() => {
      setShowCountdown(false);
      setCountdown(15);
    }, 0);

    if (autoPlayNext && isTv && onNextEpisode) {
      const runtimeMs = episodeRuntime ? (episodeRuntime - 2) * 60 * 1000 : 25 * 60 * 1000;
      let waitTime = Math.max(runtimeMs, 60000);
      if (process.env.NODE_ENV === 'development') waitTime = 10000;

      autoPlayTimerRef.current = setTimeout(() => {
        setShowCountdown(true);
        setCountdown(15);
      }, waitTime);
    }

    const handleMessage = (e) => {
      try {
        let data = e.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }

        // Vidking player events — hide loading overlay when playback starts
        if (data?.type === 'PLAYER_EVENT' && data?.data?.event) {
          const playerEvent = data.data.event;
          if (playerEvent === 'play' || playerEvent === 'timeupdate') {
            setIframeLoading(false);
            setIsBuffering(false);
          }
          if (playerEvent === 'ended' && autoPlayNext && isTv && onNextEpisode) {
            clearTimeout(autoPlayTimerRef.current);
            setShowCountdown(true);
            setCountdown(15);
          }
          if (playerEvent === 'timeupdate' && typeof data.data.currentTime === 'number') {
            if (onSyncTime) onSyncTime(data.data.currentTime, isBuffering);
          }
        }

        // Detect ended
        if (autoPlayNext && isTv && onNextEpisode) {
          const isEnded = data === 'ended' || data === 'video_ended' || data?.event === 'ended' || data?.event === 'video_ended' || data?.type === 'ended' || data?.status === 'complete';
          if (isEnded) {
            clearTimeout(autoPlayTimerRef.current);
            setShowCountdown(true);
            setCountdown(15);
          }
        }

        // Detect buffering state
        if (data?.event === 'buffering' || data?.type === 'buffering' || data?.status === 'buffering') {
          setIsBuffering(true);
        }
        if (data?.event === 'playing' || data?.type === 'playing' || data?.status === 'playing') {
          setIsBuffering(false);
        }

        // Sync time updates from iframe
        if (data?.event === 'timeupdate' && typeof data?.currentTime === 'number') {
          if (onSyncTime) onSyncTime(data.currentTime, isBuffering);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearTimeout(autoPlayTimerRef.current);
      clearInterval(countdownRef.current);
      window.removeEventListener('message', handleMessage);
    };
  }, [autoPlayNext, isTv, season, episode, onNextEpisode, episodeRuntime, onSyncTime, isBuffering]);

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

  const switchServer = (server) => {
    setIframeLoading(true);
    setEmbedBlocked(false);
    setCurrentServer(server);
  };

  const retryPlayer = () => {
    setEmbedBlocked(false);
    setIframeLoading(true);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        data-player="true"
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          background: 'linear-gradient(180deg, #0d0d0f 0%, #050507 100%)',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(229, 9, 20, 0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >

        {playerReady && !serverConfigs[currentServer].isHls && (
          <iframe
            key={`${currentServer}-${id}-${season}-${episode}-${quality}`}
            ref={iframeRef}
            src={buildUrl(currentServer)}
            title="Video Player"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
            data-player="true"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {playerReady && serverConfigs[currentServer].isHls && isDev && (
          <video
            ref={videoRef}
            controls
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: '#000' }}
            data-player="true"
            autoPlay
          />
        )}

        {iframeLoading && playerReady && !embedBlocked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', zIndex: 5, pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(229,9,20,0.2)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'playerSpin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: '#555', fontSize: '0.8rem' }}>Loading player...</p>
            </div>
          </div>
        )}

        {/* Non-blocking suggestion tip for slow connections */}
        {showSlowTip && !embedBlocked && iframeLoading && (
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 0, 0, 0.85)', padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255, 183, 3, 0.3)', color: '#ffb703', fontSize: '0.8rem', fontWeight: 600, zIndex: 10, textAlign: 'center', maxWidth: '85%' }}>
            Taking longer than usual to load. Try selecting another server below or refreshing.
          </div>
        )}

        {/* Embed blocked / error fallback UI */}
        {embedBlocked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b' }}>
            <div style={{ maxWidth: '720px', padding: '26px', borderRadius: '12px', background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>Player Unavailable</h3>
              <p style={{ color: '#aaa', margin: '0 0 16px' }}>{loadErrorMessage || 'The embed provider blocked playback or the content failed to load.'}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => window.open(buildUrl(currentServer), '_blank')} style={{ background: '#e50914', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Open Player in New Tab</button>
                <button onClick={retryPlayer} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
                <button onClick={() => { const maxSrv = Object.keys(serverConfigs).length; const next = currentServer >= maxSrv ? (isDev ? 1 : 2) : currentServer + 1; switchServer(next); }} style={{ background: 'rgba(255,255,255,0.04)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Try Server {currentServer >= Object.keys(serverConfigs).length ? (isDev ? 1 : 2) : currentServer + 1}</button>
              </div>
            </div>
          </div>
        )}

        {/* PiP Button — top right of player */}
        {playerReady && (
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
        {pipActive && playerReady && (
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

      {/* Buffering indicator */}
      {isBuffering && !iframeLoading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          marginTop: '10px', padding: '6px 14px',
          background: 'rgba(255, 183, 3, 0.1)', border: '1px solid rgba(255, 183, 3, 0.3)',
          borderRadius: '8px', color: '#ffb703', fontSize: '0.8rem', fontWeight: 600,
        }}>
          <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,183,3,0.3)', borderTopColor: '#ffb703', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          Buffering...
        </div>
      )}

      {/* Modern Ultra-Responsive Server Selection Bar */}
      <div className="server-selector-card">
        <div className="server-selector-header">
          <div className="server-title-group">
            <div className="server-icon-pulse">
              <Server style={{ width: 15, height: 15, color: '#e50914' }} />
            </div>
            <span className="server-title">
              <span className="status-dot" /> Streaming Mirrors
            </span>
          </div>
          <span className="server-active-label">
            Active: <strong style={{ color: '#ff4444' }}>{serverConfigs[currentServer]?.name}</strong>
          </span>
        </div>

        <div className="server-btn-grid">
          <div className="server-btn-scroll-container">
            {Object.keys(serverConfigs)
              .map(Number)
              .filter(srvNum => isDev || srvNum !== 1)
              .map(srvNum => {
                const cfg = serverConfigs[srvNum];
                const active = currentServer === srvNum;
                return (
                  <button
                    key={srvNum}
                    onClick={() => switchServer(srvNum)}
                    className={`server-btn ${active ? 'active' : ''}`}
                  >
                    <Server className="srv-icon" style={{ width: 14, height: 14, color: active ? '#ff4444' : '#888' }} />
                    <span className="srv-name">{cfg.name}</span>
                    {cfg.badge && (
                      <span className="srv-badge">
                        {cfg.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="utility-actions-group">
            {/* Quality Chooser */}
            <div ref={qualityMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="action-btn"
              >
                <Monitor style={{ width: 14, height: 14 }} />
                <span>{quality === 'auto' ? 'Auto Quality' : quality}</span>
              </button>
              {showQualityMenu && (
                <div className="quality-dropdown-menu">
                  {qualityOptions.map(q => (
                    <button
                      key={q}
                      onClick={() => { setQuality(q); setShowQualityMenu(false); }}
                      className={`quality-opt-btn ${q === quality ? 'selected' : ''}`}
                    >
                      {q === 'auto' ? 'Auto (Up to 4K)' : q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={togglePiP}
              className={`action-btn ${pipActive ? 'pip-active' : ''}`}
            >
              <PictureInPicture2 style={{ width: 14, height: 14 }} />
              <span>{pipActive ? 'Exit PiP' : 'Pop Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {showIosPipModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{
            background: '#141414',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowIosPipModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                background: 'rgba(229, 9, 20, 0.15)',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e50914'
              }}>
                <PictureInPicture2 style={{ width: 22, height: 22 }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Picture-in-Picture on iOS</h3>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: '2px 0 0' }}>Easy steps for iPhone & iPad</p>
              </div>
            </div>

            {/* Content */}
            <div style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px', textAlign: 'left' }}>
              <p style={{ marginBottom: '16px', color: '#aaa' }}>
                {getIsStandalonePwa()
                  ? 'iOS Web App (PWA) requires launching the video stream in Mobile Safari to activate Picture-in-Picture.'
                  : 'Due to iOS Safari security policies, Picture-in-Picture for nested player frames requires opening the stream directly.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#e50914' }}>1.</span>
                  <span>Tap <strong>&quot;Open Direct Stream&quot;</strong> below to open the video in Safari.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#e50914' }}>2.</span>
                  <span>Tap play in the native video player.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#e50914' }}>3.</span>
                  <span>Tap the native <strong>Picture-in-Picture icon</strong> or swipe up to return home with background playback.</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={buildUrl(currentServer)}
                target="_blank"
                rel="noopener noreferrer"
                data-safe-link="true"
                onClick={() => setShowIosPipModal(false)}
                style={{
                  background: '#e50914',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '0.9rem',
                  display: 'block',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#ff1e27'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e50914'}
              >
                Open Direct Stream in Safari
              </a>
              <button
                onClick={() => setShowIosPipModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#aaa',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#aaa'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pipPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes playerSpin { to { transform: rotate(360deg); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .server-selector-card {
          margin-top: 18px;
          padding: 16px 20px;
          background: rgba(18, 18, 22, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .server-selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .server-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .server-icon-pulse {
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(229, 9, 20, 0.15);
          border: 1px solid rgba(229, 9, 20, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px rgba(229, 9, 20, 0.25);
        }

        .server-title {
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          display: inline-block;
          animation: statusGlow 2s infinite alternate;
        }

        @keyframes statusGlow {
          0% { opacity: 0.6; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 12px #10b981; }
        }

        .server-active-label {
          color: #a0a0a0;
          font-size: 0.78rem;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .server-btn-grid {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .server-btn-scroll-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          flex: 1;
        }

        .utility-actions-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .server-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #a0a0a0;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }

        .server-btn:hover:not(.active) {
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transform: translateY(-2px);
        }

        .server-btn.active {
          border-color: rgba(229, 9, 20, 0.8);
          background: linear-gradient(135deg, rgba(229, 9, 20, 0.35) 0%, rgba(180, 0, 10, 0.18) 100%);
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(229, 9, 20, 0.35);
        }

        .srv-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          color: #888;
          letter-spacing: 0.5px;
        }

        .server-btn.active .srv-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #ccc;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
        }

        .action-btn:hover {
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transform: translateY(-2px);
        }

        .action-btn.pip-active {
          border-color: rgba(229, 9, 20, 0.6);
          background: linear-gradient(135deg, rgba(229, 9, 20, 0.3), rgba(229, 9, 20, 0.1));
          color: #ff4444;
        }

        .quality-dropdown-menu {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 8px;
          background: #16161a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 6px;
          z-index: 50;
          min-width: 140px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
        }

        .quality-opt-btn {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #ccc;
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .quality-opt-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .quality-opt-btn.selected {
          background: rgba(229, 9, 20, 0.25);
          color: #ff4444;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .server-selector-card {
            padding: 14px;
            border-radius: 14px;
          }

          .server-btn-scroll-container {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 4px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }

          .server-btn {
            scroll-snap-align: start;
            flex-shrink: 0;
            padding: 8px 14px;
            font-size: 0.8rem;
          }

          .utility-actions-group {
            width: 100%;
            justify-content: space-between;
            margin-top: 4px;
          }

          .action-btn {
            flex: 1;
            justify-content: center;
            padding: 8px 12px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}