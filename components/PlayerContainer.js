"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, SkipForward, X, PictureInPicture2, PictureInPicture, Monitor, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

export default function PlayerContainer({ type, id, season, episode, autoPlayNext, onNextEpisode, nextEpisodeTitle, episodeRuntime, onSyncTime }) {
  const [currentServer, setCurrentServer] = useState(2);
  const [serverAvailability, setServerAvailability] = useState({});
  const [quality, setQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualityMenuRef = useRef(null);

  const serverConfigs = {
    1: { name: 'Vidsrc.to', episodeOffset: -1, baseUrl: 'https://vidsrc.to', description: 'Fast, high quality' },
    2: { name: 'Vidking', episodeOffset: 0, baseUrl: 'https://www.vidking.net', description: 'Most stable, red theme' },
    3: { name: 'Embed.su', episodeOffset: -1, baseUrl: 'https://embed.su', description: 'Good for slow internet' },
    4: { name: 'Vidsrc.pro', episodeOffset: -1, baseUrl: 'https://vidsrc.pro', description: 'Alternative link' },
    5: { name: 'Ezvidapi', episodeOffset: 0, baseUrl: 'https://ezvidapi.com', description: 'Legacy support' },
    6: { name: 'Vidsrc.xyz', episodeOffset: -1, baseUrl: 'https://vidsrc.xyz', description: 'Fast mirror' },
    7: { name: 'Vidsrc.me', episodeOffset: -1, baseUrl: 'https://vidsrc.me', description: 'Reliable mirror' },
  };

  const qualityOptions = ['auto', '1080p', '720p', '480p', '360p'];
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);

  const iframeRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const pipWindowRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const iframeLoadingRef = useRef(true);

  const isTv = type === 'tv';

  // Sync ref with state to ensure timeout closure sees the latest value
  useEffect(() => {
    iframeLoadingRef.current = iframeLoading;
  }, [iframeLoading]);

  const getIsIos = () => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  useEffect(() => {
    const hasDocPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const hasLegacyPip = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    setPipSupported(!!(hasDocPip || hasLegacyPip));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const buildUrl = (server) => {
    const cfg = serverConfigs[server];
    if (!cfg) return '';
    const ep = isTv ? Number(episode) + cfg.episodeOffset : null;
    let url = '';

    // Most use the same pattern
    if ([1, 2, 3, 4, 5, 6, 7].includes(server)) {
      url = isTv
        ? `${cfg.baseUrl}/embed/tv/${id}/${season}/${ep}`
        : `${cfg.baseUrl}/embed/movie/${id}`;
    }

    const params = [];
    if (server === 2) {
      params.push('color=e50914');
      if (isTv) params.push('nextEpisode=true', 'episodeSelector=true');
    }
    if (quality !== 'auto') params.push(`quality=${quality}`);
    if (autoPlayNext) params.push('autoplay=1', 'autoPlay=true');
    if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');
    return url;
  };

  const togglePiP = useCallback(async () => {
    const isIos = getIsIos();
    if (pipActive && pipWindowRef.current) {
      try { 
        if (isIos && pipWindowRef.current.requestFullscreen) {
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

    if (isIos) {
      try {
        if (iframe.requestFullscreen) {
          await iframe.requestFullscreen();
          setPipActive(true);
          pipWindowRef.current = iframe;
          const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
              setPipActive(false);
              pipWindowRef.current = null;
            }
          };
          document.addEventListener('fullscreenchange', handleFullscreenChange);
          return;
        }
      } catch (err) { console.warn('iOS fullscreen failed:', err); }
    }

    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: Math.min(640, window.screen.width - 100),
          height: Math.min(360, window.screen.height - 100),
        });
        pipWindowRef.current = pipWindow;
        const style = pipWindow.document.createElement('style');
        style.textContent = `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
          iframe { width: 100%; height: 100%; border: none; }
        `;
        pipWindow.document.head.appendChild(style);
        const pipIframe = pipWindow.document.createElement('iframe');
        pipIframe.src = iframe.src;
        pipIframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        pipIframe.allowFullscreen = true;
        pipIframe.style.width = '100%';
        pipIframe.style.height = '100%';
        pipIframe.style.border = 'none';
        pipWindow.document.body.appendChild(pipIframe);
        setPipActive(true);
        pipWindow.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setPipActive(false);
        });
        return;
      } catch (err) { console.warn('Document PiP failed:', err); }
    }

    if (!isIos) {
      try {
        const width = Math.min(640, window.screen.width - 100);
        const height = Math.min(360, window.screen.height - 100);
        const left = window.screen.width - width - 20;
        const top = window.screen.height - height - 100;
        const popup = window.open(iframe.src, 'idkstream_pip', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`);
        if (popup) {
          pipWindowRef.current = popup;
          setPipActive(true);
          const checkClosed = setInterval(() => {
            if (popup.closed) { clearInterval(checkClosed); pipWindowRef.current = null; setPipActive(false); }
          }, 1000);
          return;
        }
      } catch (err) { console.warn('PiP popup fallback failed:', err); }
    }
    alert('Picture-in-Picture is not supported on your device.');
  }, [pipActive]);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try { pipWindowRef.current.close(); } catch {}
        pipWindowRef.current = null;
        setPipActive(false);
      }
    };
  }, [currentServer, season, episode, type, id]);

  // Reset player and handle load timeouts
  useEffect(() => {
    setIframeLoading(true);
    setShowCountdown(false);
    setEmbedBlocked(false);
    setIsBuffering(false);
    setSlowConnection(false);
    setLoadErrorMessage('');
    setCountdown(15);
    clearTimeout(autoPlayTimerRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(loadTimeoutRef.current);

    // Set a timeout for loading. If it takes > 15s, show "Slow Connection" warning.
    loadTimeoutRef.current = setTimeout(() => {
      if (iframeLoadingRef.current) {
        setSlowConnection(true);
      }
    }, 15000);

    return () => clearTimeout(loadTimeoutRef.current);
  }, [season, episode, type, id, currentServer, quality]);

  const handleIframeLoad = () => {
    setEmbedBlocked(false);
    setLoadErrorMessage('');
    setIsBuffering(false);
    setIframeLoading(false);
    setSlowConnection(false);
    clearTimeout(loadTimeoutRef.current);
  };

  const handleIframeError = () => {
    const nextServer = currentServer + 1;
    const maxServers = Object.keys(serverConfigs).length;

    // Mark current server as potentially down
    setServerAvailability(prev => ({ ...prev, [currentServer]: false }));

    if (nextServer <= maxServers) {
      setCurrentServer(nextServer);
      setEmbedBlocked(false);
      setIframeLoading(true);
      return;
    }

    setEmbedBlocked(true);
    setIframeLoading(false);
    setLoadErrorMessage('Failed to load player. All providers seem to be unreachable.');
  };

  useEffect(() => {
    const handleMessage = (e) => {
      try {
        let data = e.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }

        if (data?.type === 'PLAYER_EVENT' && data?.data?.event) {
          const playerEvent = data.data.event;
          if (playerEvent === 'play' || playerEvent === 'timeupdate') {
            setIframeLoading(false);
            setIsBuffering(false);
            setSlowConnection(false);
          }
          if (playerEvent === 'ended' && autoPlayNext && isTv && onNextEpisode) {
            setShowCountdown(true);
            setCountdown(15);
          }
        }

        if (autoPlayNext && isTv && onNextEpisode) {
          const isEnded = data === 'ended' || data === 'video_ended' || data?.event === 'ended' || data?.type === 'ended';
          if (isEnded) {
            setShowCountdown(true);
            setCountdown(15);
          }
        }

        if (data?.event === 'buffering' || data?.type === 'buffering') setIsBuffering(true);
        if (data?.event === 'playing' || data?.type === 'playing') setIsBuffering(false);
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoPlayNext, isTv, onNextEpisode]);

  useEffect(() => {
    if (!showCountdown) return;
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

  const switchServer = (server) => {
    setIframeLoading(true);
    setEmbedBlocked(false);
    setSlowConnection(false);
    setCurrentServer(server);
  };

  const playerReady = isTv ? Boolean(season && episode) : Boolean(id);

  return (
    <div className="w-full">
      {/* Player Frame */}
      <div
        data-player="true"
        className="relative w-full aspect-video bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      >
        {playerReady && (
          <iframe
            key={`${currentServer}-${id}-${season}-${episode}-${quality}`}
            ref={iframeRef}
            src={buildUrl(currentServer)}
            title="Video Player"
            className="absolute inset-0 w-full h-full border-none"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* Loading Overlay */}
        {iframeLoading && playerReady && !embedBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-10">
            <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 text-sm font-medium animate-pulse">
              {slowConnection ? "Connection is slow, please wait..." : "Initializing Stream..."}
            </p>
            {slowConnection && (
              <div className="mt-6 flex flex-col items-center animate-fade-in">
                <p className="text-xs text-gray-500 mb-3 text-center px-6">
                  Still loading? Try a different server known for better low-bandwidth performance.
                </p>
                <button
                  onClick={() => switchServer(3)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  <Zap className="w-3 h-3 text-yellow-500" /> Switch to Embed.su (Optimized)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && !iframeLoading && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-yellow-500/30 px-3 py-1.5 rounded-full text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
            <div className="w-2.5 h-2.5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
            Buffering...
          </div>
        )}

        {/* Error Fallback */}
        {embedBlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0b] z-20 p-6">
            <div className="max-w-md w-full text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Playback Failed</h3>
              <p className="text-gray-400 text-sm mb-6">{loadErrorMessage}</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => switchServer(currentServer === 7 ? 1 : currentServer + 1)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all">
                  Try Next Server
                </button>
                <button onClick={() => window.location.reload()} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PiP Active Indicator */}
        {pipActive && playerReady && (
          <div className="absolute top-4 right-16 z-20 flex items-center gap-2 bg-red-600/20 border border-red-600/40 backdrop-blur-md px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-widest">PiP Active</span>
          </div>
        )}
      </div>

      {/* Control Bar & Server List */}
      <div className="mt-6 space-y-6">
        {/* Horizontal Server Scroll for Mobile */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-red-600" /> Choose Server
            </h3>
            {slowConnection && <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">Slow connection detected</span>}
          </div>

          <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar scroll-smooth">
            {Object.entries(serverConfigs).map(([id, cfg]) => {
              const active = currentServer === parseInt(id);
              return (
                <button
                  key={id}
                  onClick={() => switchServer(parseInt(id))}
                  className={`
                    flex-shrink-0 flex flex-col items-start gap-1 p-3 min-w-[140px] rounded-xl border transition-all duration-300
                    ${active
                      ? 'bg-red-600/10 border-red-600/50 ring-1 ring-red-600/20'
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${active ? 'text-red-500' : 'text-gray-300'}`}>{cfg.name}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(229,9,20,0.8)]" />}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">{cfg.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* Quality Menu */}
          <div ref={qualityMenuRef} className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
            >
              <Monitor className="w-4 h-4" />
              Quality: {quality === 'auto' ? 'Auto' : quality}
            </button>
            {showQualityMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a1a] border border-white/10 rounded-xl p-1.5 z-50 min-w-[140px] shadow-2xl animate-fade-in">
                {qualityOptions.map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuality(q); setShowQualityMenu(false); }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-xs transition-colors
                      ${q === quality ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}
                    `}
                  >
                    {q === 'auto' ? 'Auto (Recommended)' : q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={togglePiP}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border
              ${pipActive
                ? 'bg-red-600/20 border-red-600/50 text-red-500'
                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-gray-300'}
            `}
          >
            <PictureInPicture2 className="w-4 h-4" />
            {pipActive ? 'Exit Pop-out' : 'Pop-out Player'}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Fix Lags / Reload
          </button>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
      `}</style>
    </div>
  );
}
