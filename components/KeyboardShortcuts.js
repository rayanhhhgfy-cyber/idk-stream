// ╔══════════════════════════════════════════════════════════════════════╗
// ║                  ⌨️  KEYBOARD SHORTCUTS  ⌨️                        ║
// ║                                                                    ║
// ║  This component adds keyboard controls to the video player.       ║
// ║  Since the video is inside an iframe from external providers,     ║
// ║  we can't directly control play/pause/seek. Instead we:           ║
// ║    - Show visual indicator overlays when shortcuts are pressed    ║
// ║    - Control fullscreen (we own the container div)                ║
// ║    - Trigger next episode navigation                              ║
// ║                                                                    ║
// ║  SHORTCUTS:                                                        ║
// ║    Space  → Play/Pause indicator                                  ║
// ║    F      → Toggle fullscreen                                     ║
// ║    M      → Mute indicator                                        ║
// ║    →      → Skip forward indicator                                ║
// ║    ←      → Skip backward indicator                               ║
// ║    N      → Next episode (TV shows)                               ║
// ╚══════════════════════════════════════════════════════════════════════╝

"use client";

import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Maximize, Minimize } from 'lucide-react';

export default function KeyboardShortcuts({ playerContainerRef, onNextEpisode, isTv }) {

  // The toast message and icon to show briefly on screen
  const [toast, setToast] = useState(null);

  // Track fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track a toggle for play/pause visual (alternates each press)
  const [isPlaying, setIsPlaying] = useState(true);

  // Track mute toggle visual
  const [isMuted, setIsMuted] = useState(false);

  // ── Show a toast overlay for 1.2 seconds ──
  const showToast = useCallback((icon, text) => {
    setToast({ icon, text });
    // Auto-hide after 1.2 seconds
    setTimeout(() => setToast(null), 1200);
  }, []);

  // ── Toggle Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef?.current;
    if (!container) return;

    const iframe = container.querySelector('iframe');
    const target = iframe || container;

    if (!document.fullscreenElement) {
      target.requestFullscreen().then(() => {
        setIsFullscreen(true);
        showToast('maximize', 'Fullscreen');
      }).catch(err => console.warn('Fullscreen request failed:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        showToast('minimize', 'Exit Fullscreen');
      }).catch(err => console.warn('Exit fullscreen failed:', err));
    }
  }, [playerContainerRef, showToast]);

  // ── Keyboard event handler ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs/selects
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          setIsPlaying(prev => {
            const next = !prev;
            showToast(next ? 'play' : 'pause', next ? 'Play' : 'Pause');
            return next;
          });
          // Try sending postMessage to iframe
          try {
            const iframe = playerContainerRef?.current?.querySelector('iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ event: 'toggle_play' }, '*');
            }
          } catch (err) { console.warn('postMessage to iframe failed:', err); }
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted(prev => {
            const next = !prev;
            showToast(next ? 'muted' : 'unmuted', next ? 'Muted' : 'Unmuted');
            return next;
          });
          try {
            const iframe = playerContainerRef?.current?.querySelector('iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ event: 'toggle_mute' }, '*');
            }
          } catch (err) { console.warn('postMessage to iframe failed:', err); }
          break;

        case 'ArrowRight':
          e.preventDefault();
          showToast('forward', 'Skip Forward +10s');
          try {
            const iframe = playerContainerRef?.current?.querySelector('iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ event: 'seek_forward', seconds: 10 }, '*');
            }
          } catch (err) { console.warn('postMessage to iframe failed:', err); }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          showToast('backward', 'Skip Backward -10s');
          try {
            const iframe = playerContainerRef?.current?.querySelector('iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ event: 'seek_backward', seconds: 10 }, '*');
            }
          } catch (err) { console.warn('postMessage to iframe failed:', err); }
          break;

        case 'n':
        case 'N':
          if (isTv && onNextEpisode) {
            e.preventDefault();
            showToast('forward', 'Next Episode');
            onNextEpisode();
          }
          break;

        default:
          break;
      }
    };

    // Listen for fullscreen changes (user might press Escape)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [playerContainerRef, onNextEpisode, isTv, toggleFullscreen, showToast]);


  // ── Render the icon for the toast ──
  const renderIcon = (iconType) => {
    const size = { width: 32, height: 32, color: 'white' };
    switch (iconType) {
      case 'play': return <Play {...size} />;
      case 'pause': return <Pause {...size} />;
      case 'muted': return <VolumeX {...size} />;
      case 'unmuted': return <Volume2 {...size} />;
      case 'forward': return <SkipForward {...size} />;
      case 'backward': return <SkipBack {...size} />;
      case 'maximize': return <Maximize {...size} />;
      case 'minimize': return <Minimize {...size} />;
      default: return null;
    }
  };


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Toast Overlay ──
          Shows briefly in the center of the screen when a shortcut is used */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '20px 32px',
          borderRadius: '16px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'shortcutToastIn 0.2s ease-out',
          pointerEvents: 'none',
        }}>
          {renderIcon(toast.icon)}
          <span style={{
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            {toast.text}
          </span>
        </div>
      )}

      {/* ── Keyboard Shortcuts Help (bottom-right, subtle) ── */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 50,
      }}>
        <div
          style={{
            background: 'rgba(20, 20, 20, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: '10px',
            padding: '6px 12px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {[
            { key: 'Space', label: '⏯' },
            { key: 'F', label: '⛶' },
            { key: 'M', label: '🔇' },
            { key: '←→', label: '⏪⏩' },
            ...(isTv ? [{ key: 'N', label: '⏭' }] : []),
          ].map((s) => (
            <span key={s.key} style={{
              color: '#555',
              fontSize: '0.65rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              <span style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontSize: '0.6rem',
                color: '#888',
                fontFamily: 'monospace',
              }}>{s.key}</span>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shortcutToastIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
