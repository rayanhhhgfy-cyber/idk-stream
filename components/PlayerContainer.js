"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, SkipForward, X, PictureInPicture2, PictureInPicture, Monitor, ChevronDown } from 'lucide-react';
import Hls from 'hls.js';

const serverConfigs = {
  // Only the servers that actually play are listed.
  // Everything else was tested and removed (2026-11-23): the vidsrc family
  // and 16 other providers all block this site's domain, Vidking is dead,
  // and the HLS player is dev-only (localhost). Do not re-add a provider
  // without a live browser test proving it plays from this domain.
  // The site's own native player was deleted 2026-11-23 at Rayyan's
  // order: its CDN blocks datacenter IPs and no other provider's stream
  // works from a datacenter IP either.
  // SmashyStream (12) and Nontongo (13) were added 2026-11-23 and removed
  // the same day: both played when opened directly but are blocked when
  // embedded on this site ("This content is blocked" — domain allowlist).
  // Bingr (14) is NOT an embed: a server-side resolver + HLS proxy (ported
  // from Lumi 2026-11-23) that plays in the site's own native <video> player,
  // so no provider ever sees this domain as an embedding origin.
  // CineSrc (15), VidSrc.buzz (16), VidFast (17) and VidSrc.wtf (18) were
  // added 2026-11-23 at Rayyan's direct order, ported from Lumi's provider
  // list. Live browser test on Fight Club (TMDB 550) 2026-11-23: ALL FOUR
  // BLOCKED — blank player, "This content is blocked" (domain allowlist).
  // Removed 2026-11-25 at Rayyan's order ("remove the dead servers").
  // Do not re-add without a live browser test proving they play here.
  4: { name: 'autoembed.me', episodeOffset: 0, baseUrl: 'https://player.autoembed.me', badge: 'Backup' },
  5: { name: 'vidsrc.me', episodeOffset: 0, baseUrl: 'https://vidsrc.me', badge: 'Multi-Lang' },
  6: { name: 'VAPlayer', episodeOffset: 0, baseUrl: 'https://vaplayer.ru', badge: 'VidAPI' },
  11: { name: 'Archive', isArchive: true, badge: 'Free' },
  14: { name: 'Bingr', isBingr: true, badge: 'Direct' },
};

export default function PlayerContainer({ type, id, season, episode, autoPlayNext, onNextEpisode, nextEpisodeTitle, episodeRuntime, onSyncTime, title, year }) {
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
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const serverDropdownRef = useRef(null);
  const qualityOptions = ['auto', '1080p', '720p', '480p', '360p'];
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSlowTip, setShowSlowTip] = useState(false);
  const [miniPip, setMiniPip] = useState(false);

  // ── Click shield (anti-redirect) ──
  // The provider players (autoembed/vidsrc/VAPlayer) run in cross-origin
  // iframes, so their ad scripts cannot be patched from here — and the
  // player iframe must NOT get a sandbox attribute (providers detect it
  // and break). Instead, an invisible overlay covers the player and
  // swallows the FIRST click (the ad-triggering click), then steps aside
  // so real playback clicks reach the player. The shield re-arms every
  // time the player reloads (server / title / episode / quality change).
  // It is only rendered over iframe players — Archive/Bingr play in our
  // own native <video> element and have no ad redirects to eat.
  // User-visible behaviour: the first tap on the video does nothing;
  // the second tap plays. That is the trade-off for no redirects.
  const [clickShieldArmed, setClickShieldArmed] = useState(true);
  useEffect(() => {
    // setTimeout avoids the set-state-in-effect lint error, matching the
    // other reset effects in this file.
    setTimeout(() => setClickShieldArmed(true), 0);
  }, [currentServer, id, season, episode, quality]);

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
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const getIsStandalonePwa = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  };

  // Check PiP support on mount
  useEffect(() => {
    const hasDocPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const hasLegacyPip = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    if (hasDocPip || hasLegacyPip) {
      setTimeout(() => setPipSupported(true), 0);
    }
  }, []);

  // Close quality menu / server dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target)) {
        setShowQualityMenu(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target)) {
        setShowServerDropdown(false);
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

  // Internet Archive direct player (Lumi's Archive provider): native <video>
  // fed by /api/archive, which searches archive.org's public movie catalog.
  const [archiveUrl, setArchiveUrl] = useState('');
  const [archiveType, setArchiveType] = useState('video/mp4');
  const [archiveTitle, setArchiveTitle] = useState('');
  const archiveAlternativesRef = useRef([]);

  // Bingr direct player (ported from Lumi): /api/player/bingr resolves a
  // stream server-side and /api/player/media proxies the HLS playlist.
  const [bingrUrl, setBingrUrl] = useState('');
  const [bingrType, setBingrType] = useState('application/vnd.apple.mpegurl');
  const [bingrTitle, setBingrTitle] = useState('');

  // Direct (non-iframe) servers — Archive and Bingr — share one native
  // <video> player fed by their resolver endpoints.
  const isDirectServer = currentServer === 11 || currentServer === 14;
  const directUrl = currentServer === 11 ? archiveUrl : currentServer === 14 ? bingrUrl : '';
  const directType = currentServer === 11 ? archiveType : currentServer === 14 ? bingrType : 'video/mp4';
  const directTitle = currentServer === 11 ? archiveTitle : currentServer === 14 ? bingrTitle : title;

  const buildUrl = (server) => {
    const cfg = serverConfigs[server];
    if (!cfg || cfg.isHls || cfg.isArchive || cfg.isBingr) return '';
    const ep = isTv ? Number(episode) + cfg.episodeOffset : null;
    // The three working embed providers share one URL shape:
    // /embed/movie/{id} and /embed/tv/{id}/{season}/{episode}.
    let url = isTv
      ? `${cfg.baseUrl}/embed/tv/${id}/${season}/${ep}`
      : `${cfg.baseUrl}/embed/movie/${id}`;
    // Template-based providers (12+): build the URL from the config.
    // {id} = TMDB id, {s} = season, {e} = episode (offset applied).
    if (cfg.movie) {
      const tpl = isTv ? (cfg.tv || cfg.movie) : cfg.movie;
      url = cfg.baseUrl + tpl.replace('{id}', id).replace('{s}', season).replace('{e}', ep);
    }
    const params = [];
    if (quality !== 'auto') params.push(`quality=${quality}`);
    if (autoPlayNext) params.push('autoplay=1', 'autoPlay=true');
    if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');
    return url;
  };

  // Archive: resolve a free copy from /api/archive when the server is picked
  useEffect(() => {
    if (currentServer !== 11) return;
    if (!title) {
      setEmbedBlocked(true);
      setLoadErrorMessage('Archive needs a title to search.');
      setIframeLoading(false);
      return;
    }
    let cancelled = false;
    setIframeLoading(true);
    setEmbedBlocked(false);
    setLoadErrorMessage('');
    const params = new URLSearchParams({ title, type: type || 'movie' });
    if (year) params.set('year', String(year));
    fetch(`/api/archive?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Archive search failed');
        if (cancelled) return;
        archiveAlternativesRef.current = data.alternatives || [];
        setArchiveTitle(data.title || title);
        setArchiveType(data.contentType || 'video/mp4');
        setArchiveUrl(data.streamUrl || '');
        if (!data.streamUrl) {
          setEmbedBlocked(true);
          setLoadErrorMessage('No free copy found on Internet Archive for this title.');
          setIframeLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEmbedBlocked(true);
        setIframeLoading(false);
        setLoadErrorMessage('Archive search failed. Try another server.');
      });
    return () => { cancelled = true; };
  }, [currentServer, title, year, type]);

  // Bingr: resolve a direct HLS stream from /api/player/bingr when picked
  useEffect(() => {
    if (currentServer !== 14) return;
    let cancelled = false;
    setIframeLoading(true);
    setEmbedBlocked(false);
    setLoadErrorMessage('');
    const params = new URLSearchParams({ tmdbId: String(id), type: type || 'movie' });
    if (isTv) {
      params.set('season', String(season));
      params.set('episode', String(episode));
    }
    fetch(`/api/player/bingr?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Bingr resolve failed');
        if (cancelled) return;
        setBingrTitle(data.title || title);
        setBingrType('application/vnd.apple.mpegurl');
        setBingrUrl(data.streamUrl || '');
        if (!data.streamUrl) {
          setEmbedBlocked(true);
          setLoadErrorMessage('Bingr could not find a stream for this title.');
          setIframeLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEmbedBlocked(true);
        setIframeLoading(false);
        setLoadErrorMessage('Bingr is unavailable. Try another server.');
      });
    return () => { cancelled = true; };
  }, [currentServer, id, type, season, episode, isTv, title]);

  // Direct playback (Archive + Bingr): native <video>, hls.js for HLS streams.
  // Bingr's proxied stream URL has no .m3u8 extension, but it is always an
  // HLS playlist served by /api/player/media, so it always counts as HLS.
  useEffect(() => {
    let isMounted = true;
    if (!playerReady || !isDirectServer || !directUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      if (!isMounted) return;
      setIframeLoading(false);
      setIsBuffering(false);
    };
    const handleWaiting = () => {
      if (!isMounted) return;
      setIsBuffering(true);
    };
    const handleError = () => {
      if (!isMounted) return;
      // Archive: fall through to the next alternative file, like Lumi's direct player
      if (currentServer === 11) {
        const next = archiveAlternativesRef.current.shift();
        if (next?.streamUrl) {
          setArchiveType(next.contentType || 'video/mp4');
          setArchiveUrl(next.streamUrl);
          return;
        }
      }
      setIframeLoading(false);
      setEmbedBlocked(true);
      setLoadErrorMessage(currentServer === 14 ? 'Bingr stream failed. Try another server.' : 'Archive stream failed. Try another server.');
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    let hls = null;
    const isHlsUrl = currentServer === 14 || /\.m3u8($|\?)/i.test(directUrl);
    if (isHlsUrl && !video.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(directUrl);
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
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          handleError();
          hls.destroy();
        }
      });
    } else {
      video.src = directUrl;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      isMounted = false;
      if (hls) hls.destroy();
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
    };
  }, [currentServer, directUrl, playerReady, isDirectServer]);

  // ── Document Picture-in-Picture ──
  const togglePiP = useCallback(async () => {
    const isIos = getIsIos();
    const isStandalonePwa = getIsStandalonePwa();
    const pipEnabled = typeof document !== 'undefined' ? document.pictureInPictureEnabled : false;
    const presentationSupported = typeof document !== 'undefined' && typeof document.webkitSupportsPresentationMode === 'function'
      ? document.webkitSupportsPresentationMode('picture-in-picture')
      : false;

    const iframe = iframeRef.current;
    const iframeSrc = iframe?.src || '';
    const video = document.querySelector('video');
    const videoPipDisabled = !!video?.disablePictureInPicture;
    console.info('[PlayerContainer] PiP probe', {
      isIos,
      isStandalonePwa,
      pipEnabled,
      presentationSupported,
      videoPipDisabled,
      iframePresent: !!iframe,
      iframeSrc,
      iframeRequestFullscreen: !!(iframe && (iframe.requestFullscreen || iframe.webkitRequestFullscreen)),
      videoRequestPictureInPicture: !!(video && video.requestPictureInPicture),
      videoSupportsPresentation: !!(video && video.webkitSetPresentationMode),
    });

    // Native <video> servers (Archive direct player): PiP straight from the video element
    const directVideo = videoRef.current;
    if (directVideo && !iframe) {
      if (isIos) {
        if (typeof directVideo.webkitSetPresentationMode === 'function') {
          try {
            directVideo.webkitSetPresentationMode('picture-in-picture');
            setPipActive(true);
          } catch {}
        }
        return;
      }
      try {
        if (document.pictureInPictureElement === directVideo) {
          await document.exitPictureInPicture();
          setPipActive(false);
        } else if (directVideo.requestPictureInPicture) {
          await directVideo.requestPictureInPicture();
          setPipActive(true);
        }
      } catch {}
      return;
    }

    if (isIos) {

      if (iframe) {
        if (pipActive && pipWindowRef.current === iframe) {
          try {
            const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
            if ((document.fullscreenElement || document.webkitFullscreenElement) && exitFullscreen) {
              await exitFullscreen.call(document);
            }
          } catch (err) {
            console.warn('iOS fullscreen exit failed:', err);
          }
          pipWindowRef.current = null;
          setMiniPip(false);
          setPipActive(false);
          return;
        }

        // iPad: the element Fullscreen API exists, put the provider player fullscreen
        const enterFullscreen = iframe.requestFullscreen || iframe.webkitRequestFullscreen;
        if (enterFullscreen) {
          try {
            await enterFullscreen.call(iframe);
            pipWindowRef.current = iframe;
            setPipActive(true);
            return;
          } catch (err) {
            console.warn('iOS fullscreen failed:', err);
          }
        }

        // iPhone: no element Fullscreen API on iPhone — float the player inside
        // the app instead. The iframe node is only repositioned (never remounted),
        // so playback continues seamlessly in the floating corner window.
        pipWindowRef.current = iframe;
        setMiniPip(true);
        setPipActive(true);
        return;
      }

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

    // Final fallback: show message if nothing worked
    alert('Picture-in-Picture is not supported on your device. Try rotating your device or using a different browser.');
  }, [pipActive]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (pipWindowRef.current === iframeRef.current && !fullscreenElement) {
        pipWindowRef.current = null;
        setPipActive(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

    // Video element events for better loading & buffering state updates
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
    if (currentServer === 4) {
      console.warn('AutoEmbed failed; falling back to VAPlayer.');
      setCurrentServer(6);
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

  // Manual server change (dropdown, "Try Server" button).
  const switchServer = (server) => {
    setIframeLoading(true);
    setEmbedBlocked(false);
    setCurrentServer(server);
  };

  // Next server in the dropdown order (cycles through the listed servers).
  const nextServer = () => {
    const keys = Object.keys(serverConfigs).map(Number).sort((a, b) => a - b);
    return keys[(keys.indexOf(currentServer) + 1) % keys.length];
  };

  // Retry: clear the error and reload the current server.
  const retryPlayer = () => {
    setEmbedBlocked(false);
    setIframeLoading(true);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        data-player="true"
        style={miniPip ? {
          position: 'fixed',
          width: '45vw',
          maxWidth: '300px',
          paddingTop: '25.3125vw',
          right: '10px',
          bottom: '10px',
          zIndex: 9999,
          background: 'linear-gradient(180deg, #0d0d0f 0%, #050507 100%)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(229, 9, 20, 0.25)',
        } : {
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

        {playerReady && !serverConfigs[currentServer].isHls && !serverConfigs[currentServer].isArchive && !serverConfigs[currentServer].isBingr && (
          <iframe
            key={`${currentServer}-${id}-${season}-${episode}-${quality}`}
            ref={iframeRef}
            src={buildUrl(currentServer)}
            title="Video Player"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox={serverConfigs[currentServer]?.sandbox}
            referrerPolicy={serverConfigs[currentServer]?.originReferrer ? "origin" : "no-referrer-when-downgrade"}
            loading="eager"
            data-player="true"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* Click shield — swallows the first click on an iframe player
            (the ad-triggering click) and then steps aside. Rendered above
            the iframe (zIndex 15) but below the PiP button (25) and the
            auto-play countdown (20), so those stay clickable. Only for
            iframe players; never over the native Archive/Bingr <video>. */}
        {playerReady && !isDirectServer && !serverConfigs[currentServer].isHls && clickShieldArmed && !embedBlocked && (
          <div
            aria-hidden="true"
            data-click-shield="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.info('[PlayerContainer] Click shield absorbed first player click (ad trigger)');
              setClickShieldArmed(false);
            }}
            style={{ position: 'absolute', inset: 0, zIndex: 15, background: 'transparent', cursor: 'pointer' }}
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

        {playerReady && isDirectServer && directUrl && !embedBlocked && (
          <video
            ref={videoRef}
            controls
            playsInline
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: '#000' }}
            data-player="true"
            autoPlay
            title={directTitle || title}
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
                <button onClick={() => { try { window.__allowNextPopup = true; } catch {} window.open(buildUrl(currentServer), '_blank'); }} style={{ background: '#e50914', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Open Player in New Tab</button>
                <button onClick={retryPlayer} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
                <button onClick={() => switchServer(nextServer())} style={{ background: 'rgba(255,255,255,0.04)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Try Server {nextServer()}</button>
              </div>
            </div>
          </div>
        )}

        {/* PiP Button — top right of player */}
        {playerReady && (
          <button
            onClick={togglePiP}
            title={getIsIos() ? (pipActive ? 'Exit PiP' : 'Picture-in-Picture') : (pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture')}
            aria-label={getIsIos() ? (pipActive ? 'Exit PiP' : 'Picture-in-Picture') : (pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture')}
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
              color: pipActive ? '#ff3d3d' : 'rgba(255,255,255,0.85)',
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
            <span style={{ color: '#ff3d3d', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>PiP Active</span>
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
            Active: <strong style={{ color: '#e50914' }}>{serverConfigs[currentServer]?.name}</strong>
          </span>
        </div>

        <div className="server-btn-grid">
          <div className="server-dropdown" ref={serverDropdownRef}>
            <button
              onClick={() => setShowServerDropdown(!showServerDropdown)}
              className="server-dropdown-btn"
              aria-haspopup="listbox"
              aria-expanded={showServerDropdown}
            >
              <Server style={{ width: 14, height: 14, color: '#e50914' }} />
              <span className="srv-name">{serverConfigs[currentServer]?.name}</span>
              {serverConfigs[currentServer]?.badge && (
                <span className="srv-badge">{serverConfigs[currentServer].badge}</span>
              )}
              <ChevronDown style={{ width: 14, height: 14, color: '#888', transform: showServerDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
            {showServerDropdown && (
              <div className="server-dropdown-menu" role="listbox">
                {Object.keys(serverConfigs)
                  .map(Number)
                  .filter(srvNum => isDev || srvNum !== 1)
                  .map(srvNum => {
                    const cfg = serverConfigs[srvNum];
                    const active = currentServer === srvNum;
                    return (
                      <button
                        key={srvNum}
                        role="option"
                        aria-selected={active}
                        onClick={() => { switchServer(srvNum); setShowServerDropdown(false); }}
                        className={`server-dropdown-opt ${active ? 'selected' : ''}`}
                      >
                        <Server style={{ width: 14, height: 14, color: active ? '#e50914' : '#888' }} />
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
            )}
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

            {(true) && (
              <button
                onClick={togglePiP}
                className={`action-btn ${pipActive ? 'pip-active' : ''}`}
              >
                <PictureInPicture2 style={{ width: 14, height: 14 }} />
                <span>{getIsIos() ? (pipActive ? 'Exit PiP' : 'PiP') : (pipActive ? 'Exit PiP' : 'Pop Out')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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

        .server-dropdown {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .server-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgb(139 155 180 / 0.34);
          background: rgb(12 19 34 / 0.52);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 8px 18px rgb(3 4 14 / 0.34);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .server-dropdown-btn:hover {
          border-color: rgb(229 9 20 / 0.76);
          background: rgb(24 34 54 / 0.82);
        }

        .server-dropdown-btn .srv-name {
          flex: 1;
          text-align: left;
        }

        .server-dropdown-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          min-width: 260px;
          max-height: 320px;
          overflow-y: auto;
          background: rgb(9 15 28 / 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgb(165 178 199 / 0.52);
          border-radius: 18px;
          padding: 6px;
          z-index: 50;
          box-shadow: 0 12px 30px rgb(3 4 14 / 0.58);
        }

        .server-dropdown-opt {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #a0a0a0;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .server-dropdown-opt:hover {
          background: rgb(229 9 20 / 0.1);
          color: #ffffff;
        }

        .server-dropdown-opt.selected {
          background: rgb(229 9 20 / 0.15);
          color: #ffffff;
          font-weight: 700;
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

        .server-dropdown-opt.selected .srv-badge {
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
          color: #e50914;
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
          color: #e50914;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .server-selector-card {
            padding: 14px;
            border-radius: 14px;
          }

          .server-dropdown {
            width: 100%;
          }

          .server-dropdown-menu {
            min-width: 100%;
            max-height: 280px;
          }

          .server-dropdown-btn {
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
