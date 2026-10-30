// ╔══════════════════════════════════════════════════════════════════════╗
// ║                     🧭  NAVIGATION BAR  🧭                        ║
// ║                                                                    ║
// ║  The Navbar is the menu bar at the TOP of every page.              ║
// ║  It's "fixed" — it stays visible even when you scroll down.        ║
// ║                                                                    ║
// ║  WHAT'S IN THE NAVBAR:                                             ║
// ║    - Logo (idkstream) — click to go home                           ║
// ║    - Navigation links (Home, Movies, TV Shows, History)            ║
// ║    - Search bar — type to search for movies/shows                  ║
// ║    - Hamburger menu — for mobile devices (small screens)           ║
// ║                                                                    ║
// ║  RESPONSIVE DESIGN:                                                ║
// ║    - On DESKTOP (wide screens): Shows links in a horizontal row    ║
// ║    - On MOBILE (narrow screens): Hides links behind a hamburger    ║
// ║      menu icon. Click the icon to see the links as a dropdown.     ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── "use client": This component runs in the browser because it ──
// ── needs to track scrolling, handle search input, and toggle menus. ──
"use client";

// ──────────────────────────────────────────────────────────────────────
// IMPORTS
// ──────────────────────────────────────────────────────────────────────
// Link: Next.js component for navigating between pages (faster than <a> tags
//       because it pre-loads pages in the background).
import Link from 'next/link';

// Icons from the lucide-react library:
//   Menu: the "hamburger" icon (☰) for mobile menu
//   Tv: a TV icon for the logo
//   Search: a magnifying glass icon for the search bar
//   X: an X icon to close the mobile menu
//   Home, Film, Monitor, Clock: icons for the navigation links
import { Menu, Tv, Search, X, Home, Film, Monitor, Clock, Users } from 'lucide-react';

// React hooks for managing state and side effects:
//   useState: creates variables that update the screen when changed
//   useEffect: runs code when the component loads or something changes
import { useState, useEffect } from 'react';

// useRouter: gives us access to Next.js navigation functions.
// We use it to programmatically navigate when the user submits a search.
import { useRouter } from 'next/navigation';


// ──────────────────────────────────────────────────────────────────────
// THE NAVBAR COMPONENT
// ──────────────────────────────────────────────────────────────────────
export default function Navbar() {

  // ════════════════════════════════════════════════════════════════════
  //                        STATE VARIABLES
  // ════════════════════════════════════════════════════════════════════

  // Has the user scrolled down? (true/false)
  // When scrolled, the navbar gets a solid dark background.
  // When at the top, it's transparent (you can see the hero image behind it).
  const [scrolled, setScrolled] = useState(false);

  // Is the search bar expanded? (true/false)
  // When collapsed, it's just a small circle with a magnifying glass.
  // When expanded, it shows a text input field.
  const [searchOpen, setSearchOpen] = useState(false);

  // What has the user typed in the search bar?
  // This updates in real-time as they type each letter.
  const [searchQuery, setSearchQuery] = useState('');

  // Is the mobile menu open? (true/false)
  // On small screens, the navigation links are hidden behind a
  // hamburger (☰) icon. Clicking it toggles this state.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The router lets us navigate programmatically (without clicking a link).
  // We use it when the user submits a search query.
  const router = useRouter();


  // ════════════════════════════════════════════════════════════════════
  // 📜 EFFECT: Track scroll position
  // ════════════════════════════════════════════════════════════════════
  // We listen for scroll events to know if the user has scrolled down.
  // If they've scrolled more than 20 pixels, we add a dark background
  // to the navbar (so you can still read the text over content below).
  useEffect(() => {
    // This function runs every time the user scrolls.
    const handleScroll = () => {
      // window.scrollY = how many pixels the user has scrolled down.
      // If it's more than 20px, consider the page "scrolled."
      setScrolled(window.scrollY > 20);
    };

    // Register the scroll listener.
    window.addEventListener('scroll', handleScroll);

    // Cleanup: remove the listener when the component is removed.
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty array = run once when the component first appears.


  // ════════════════════════════════════════════════════════════════════
  // 🔍 HANDLE SEARCH — When the user presses Enter in the search bar
  // ════════════════════════════════════════════════════════════════════
  // This function runs when the search form is submitted.
  // It navigates to the search page with the query as a URL parameter.
  const handleSearch = (e) => {
    // Prevent the default form submission (which would reload the page).
    e.preventDefault();

    // Only search if the user actually typed something.
    if (searchQuery.trim()) {
      // Navigate to /search?q=whatever_they_typed
      // encodeURIComponent makes the text URL-safe (spaces become %20, etc.)
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);

      // Close the search bar and clear the text.
      setSearchOpen(false);
      setSearchQuery('');
    }
  };


  // ════════════════════════════════════════════════════════════════════
  // 🔗 NAVIGATION LINKS
  // ════════════════════════════════════════════════════════════════════
  // An array of objects, each representing one link in the navbar.
  // Each link has:
  //   - name: The text shown to the user
  //   - href: Where the link goes when clicked
  //   - icon: The icon component to show next to the text
  //
  // "Movies" goes to /movies — a dedicated page showing ALL movies
  // "TV Shows" goes to /tv — a dedicated page showing ALL TV shows
  // "History" goes to /#history — scrolls to the history section on the home page
  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Movies', href: '/movies', icon: Film },
    { name: 'TV Shows', href: '/tv', icon: Monitor },
    { name: 'Watch Party', href: '/watch-party', icon: Users },
    { name: 'History', href: '/#history', icon: Clock },
  ];


  // ════════════════════════════════════════════════════════════════════
  //                      🖥️ RENDER (DISPLAY)
  // ════════════════════════════════════════════════════════════════════
  return (
    // Fragment (<>) lets us return multiple elements without a wrapper div.
    <>
      {/* ══════════════════════════════════════════════════════════════
          THE MAIN NAVBAR
          Position: fixed at the top of the page (stays while scrolling).
          Z-index: 1000 (appears above all other content).
          Background: transparent at top, solid dark when scrolled.
          Backdrop-filter: blur effect when scrolled (glassmorphism).
          ══════════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4%',
          transition: 'all 0.4s ease',
          background: scrolled || mobileMenuOpen
            ? 'rgba(10, 10, 10, 0.98)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          backdropFilter: scrolled || mobileMenuOpen ? 'blur(15px)' : 'none',
          borderBottom: scrolled || mobileMenuOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        }}
      >
        {/* ── LEFT SECTION: Logo + Desktop Nav Links ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

          {/* LOGO */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              background: '#e50914',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(229, 9, 20, 0.4)'
            }}>
              <Tv style={{ color: 'white', width: 22, height: 22 }} />
            </div>
            <span style={{
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-1px'
            }}>
              idk<span style={{ color: '#e50914' }}>stream</span>
            </span>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="desktop-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── RIGHT SECTION: Search Bar + Mobile Toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          {/* SEARCH BAR */}
          <form
            onSubmit={handleSearch}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: searchOpen ? '8px 16px 8px 36px' : '8px',
                width: searchOpen ? 'clamp(140px, 20vw, 240px)' : '36px',
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: searchOpen ? 'text' : 'pointer'
              }}
              onClick={() => setSearchOpen(true)}
              onBlur={() => !searchQuery && setSearchOpen(false)}
            />
            <Search
              style={{
                position: 'absolute',
                left: searchOpen ? '12px' : '9px',
                width: 18,
                height: 18,
                color: 'rgba(255,255,255,0.7)',
                pointerEvents: 'none'
              }}
            />
          </form>

          {/* HAMBURGER MENU BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle-btn"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            {mobileMenuOpen ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
          </button>
        </div>
      </nav>

      {/* 📱 MOBILE MENU DROPDOWN — Explicitly hidden when closed */}
      <div
        style={{
          position: 'fixed',
          top: mobileMenuOpen ? '64px' : '-100%',
          left: 0,
          right: 0,
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 900,
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: mobileMenuOpen ? 1 : 0,
          display: mobileMenuOpen ? 'block' : 'none',
          pointerEvents: mobileMenuOpen ? 'all' : 'none'
        }}
      >
        {/* Vertical list of navigation links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Loop through each nav link */}
          {navLinks.map((link) => {
            // Get the icon component for this link.
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                // Close the mobile menu when a link is clicked.
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'background 0.2s'
                }}
              >
                {/* Red icon + link name */}
                <Icon style={{ width: 20, height: 20, color: '#e50914' }} />
                {link.name}
              </Link>
            );
          })}

          {/* Version info at the bottom of the mobile menu */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center' }}>
              Premium Streaming v1.0
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          📱 CSS MEDIA QUERY — Desktop Nav Visibility
          On screens 768px and wider (tablets and desktops), show the
          desktop navigation links. On smaller screens, they're hidden
          and the hamburger menu is used instead.
          ══════════════════════════════════════════════════════════ */}
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
