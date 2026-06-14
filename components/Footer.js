// ╔══════════════════════════════════════════════════════════════════════╗
// ║                      📝  FOOTER  📝                                ║
// ║                                                                    ║
// ║  The Footer is the section at the very BOTTOM of every page.       ║
// ║  It shows the site logo, a tagline, the creator's name,           ║
// ║  and a copyright notice.                                           ║
// ║                                                                    ║
// ║  The footer also has some visual flair:                             ║
// ║    - A red accent line at the top (decorative)                     ║
// ║    - A floating animation on the logo (gently bobs up and down)   ║
// ║    - A gradient divider line                                       ║
// ║    - The creator's name in a gradient red color                    ║
// ╚══════════════════════════════════════════════════════════════════════╝

// "use client" — runs in browser
"use client";

import { useState, useEffect } from 'react';
import { Heart, Github, Tv, Download } from 'lucide-react';


// ──────────────────────────────────────────────────────────────────────
// THE FOOTER COMPONENT
// ──────────────────────────────────────────────────────────────────────
export default function Footer() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(true); // Default true to avoid flash
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      setIsInstalled(isStandalone);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt natively (Android/Chrome)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      // Fallback for iOS/Safari where automatic prompts are blocked by Apple
      setShowInstructions(true);
      setTimeout(() => setShowInstructions(false), 8000);
    }
  };

  return (
    // ── Footer container ──
    // Uses a dark gradient background and a subtle top border.
    // "marginTop: 80px" creates space between the content and the footer.
    <footer
      style={{
        position: 'relative',
        background: 'linear-gradient(to top, #0a0a0a, #141414)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '48px 24px 32px',
        marginTop: '80px',
      }}
    >
      {/* ── Decorative Red Accent Line ──
          A thin red gradient line at the top of the footer.
          Purely decorative — adds a nice visual touch.
          Centered with "left: 50%" and "translateX(-50%)". */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #e50914, transparent)',
        }}
      />

      {/* ── Content Container ──
          Centers everything and stacks items vertically. */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* ── Logo ──
            Same logo as the navbar but with a floating animation.
            "animate-float" makes it gently bob up and down. */}
        <div
          className="animate-float"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Red icon box */}
          <div
            style={{
              background: 'linear-gradient(135deg, #e50914, #b20710)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
            }}
          >
            <Tv style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          {/* Logo text */}
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            idk<span style={{ color: '#e50914' }}>stream</span>
          </span>
        </div>

        {/* ── Tagline ──
            A short description of the site. */}
        <p
          style={{
            color: '#666',
            fontSize: '0.875rem',
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}
        >
          Your premium destination for movies and TV shows.
          Stream anytime, anywhere.
        </p>

        {/* ── Gradient Divider Line ──
            A thin line that fades from transparent to white to transparent.
            Creates a visual separation between sections. */}
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          }}
        />

        {/* ── Creator Credit ──
            Shows who made the website.
            The name uses a gradient text effect (white to red). */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#888',
            fontSize: '0.875rem',
          }}
        >
          <span>Made by</span>
          <span
            style={{
              fontWeight: 700,
              // Gradient text effect:
              // Creates a gradient background, then clips it to the text shape.
              background: 'linear-gradient(135deg, #e50914, #ff6b6b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Rayyan Aljamal
          </span>
        </div>

        {/* ── PWA Install Button ── */}
        {!isInstalled && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={handleInstallClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #e50914, #b20710)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 15px rgba(229,9,20,0.3)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Download style={{ width: 16, height: 16 }} />
              Install idkstream App
            </button>
            
            {showInstructions && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#ddd',
                maxWidth: '280px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                animation: 'fadeInUp 0.3s ease-out'
              }}>
                <strong>iOS / iPhone:</strong> Tap the <strong>Share</strong> button at the bottom of Safari and select <strong>"Add to Home Screen"</strong>.
              </div>
            )}
          </div>
        )}

        {/* ── Copyright Notice ──
            Automatically shows the current year using JavaScript.
            new Date().getFullYear() returns the current year (e.g., 2026). */}
        <p style={{ color: '#444', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} idkstream. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
