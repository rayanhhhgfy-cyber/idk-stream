// ╔══════════════════════════════════════════════════════════════════════╗
// ║                   🎬  TRAILER MODAL  🎬                            ║
// ║                                                                    ║
// ║  A fullscreen modal that plays a YouTube trailer.                 ║
// ║  Features:                                                         ║
// ║    - Dark blurred backdrop                                         ║
// ║    - Click outside or X to close                                   ║
// ║    - Smooth scale + fade animation                                 ║
// ║    - Responsive YouTube embed (16:9 aspect ratio)                 ║
// ║    - Escape key to close                                           ║
// ╚══════════════════════════════════════════════════════════════════════╝

"use client";

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function TrailerModal({ youtubeKey, title, onClose }) {

  // If there's no YouTube key, don't render
  if (!youtubeKey) return null;

  // ── Close on Escape key ──
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    // Prevent scrolling while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    // ── Backdrop (click to close) ──
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'trailerFadeIn 0.3s ease-out',
      }}
    >
      {/* ── Modal Content (don't close when clicking inside) ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '900px',
          animation: 'trailerScaleIn 0.35s ease-out',
        }}
      >
        {/* ── Close Button ── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-48px',
            right: '0',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            transition: 'all 0.25s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(229,9,20,0.6)';
            e.currentTarget.style.borderColor = '#e50914';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* ── Title ── */}
        {title && (
          <p style={{
            color: '#aaa',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '12px',
            textAlign: 'center',
            letterSpacing: '0.5px',
          }}>
            🎬 {title} — Official Trailer
          </p>
        )}

        {/* ── YouTube Embed ── */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(229,9,20,0.1)',
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
            title={`${title || 'Movie'} Trailer`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes trailerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes trailerScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
