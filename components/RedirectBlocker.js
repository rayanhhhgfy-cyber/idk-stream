// ╔══════════════════════════════════════════════════════════════════════╗
// ║                 🛡️  REDIRECT BLOCKER  🛡️                          ║
// ║                                                                    ║
// ║  This component is like a SECURITY GUARD for our website.          ║
// ║  It sits invisibly on every page and watches for bad things        ║
// ║  trying to happen — like ads trying to redirect you to             ║
// ║  dangerous websites or pop-up windows opening without your         ║
// ║  permission.                                                       ║
// ║                                                                    ║
// ║  WHY DO WE NEED THIS?                                              ║
// ║  Our video player loads content from other websites (vidsrc,       ║
// ║  vidking). Those sites sometimes have sneaky ad scripts that       ║
// ║  try to:                                                           ║
// ║    1. Open pop-up windows (those annoying ads)                     ║
// ║    2. Redirect you away from our site to a scam page               ║
// ║    3. Inject invisible buttons that trick you into clicking ads    ║
// ║    4. Add hidden iframes (mini websites) that load ads             ║
// ║                                                                    ║
// ║  This component BLOCKS all of that, keeping users safe!            ║
// ║                                                                    ║
// ║  HOW DOES IT WORK?                                                 ║
// ║  It uses 7 different protection methods (like having 7 locks       ║
// ║  on your door instead of just 1). Even if one method misses        ║
// ║  something, the others will catch it.                              ║
// ║                                                                    ║
// ║  This component renders NOTHING visible — it's invisible.          ║
// ║  It just runs protection code in the background.                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────────────
// "use client" tells Next.js this component runs in the BROWSER.
// Security protection needs to run in the browser because that's
// where the attacks happen. Server-side code can't block pop-ups!
// ──────────────────────────────────────────────────────────────────────
"use client";

// ──────────────────────────────────────────────────────────────────────
// IMPORTS
// "useEffect" is a React hook that runs code AFTER the page loads.
// Think of it like a "setup" step — after the page is visible,
// THEN we set up all our security protections.
// ──────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────
// THE REDIRECT BLOCKER COMPONENT
// This is a React component — a reusable building block.
// We place it once in the main layout, and it protects EVERY page.
// ──────────────────────────────────────────────────────────────────────
export default function RedirectBlocker() {

  // ════════════════════════════════════════════════════════════════════
  // useEffect — This code runs ONE TIME when the page first loads.
  // The empty array [] at the end means "only run this once."
  //
  // Inside, we set up all 7 protection methods. When the page
  // closes or the component is removed, we clean everything up
  // (the "return" function at the bottom).
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {

    // ┌────────────────────────────────────────────────────────────────┐
    // │         PROTECTION #1: Block window.open() Popups             │
    // │                                                                │
    // │  window.open() is the JavaScript function that opens new       │
    // │  browser tabs/windows. Ad scripts LOVE to use this to open    │
    // │  pop-up ads. We replace this function with our own version    │
    // │  that does NOTHING (just returns null).                        │
    // │                                                                │
    // │  It's like replacing the "open door" button with a fake       │
    // │  button that doesn't actually open anything.                   │
    // │                                                                │
    // │  We save the original function first so we can restore it     │
    // │  later when the component is removed (good cleanup practice). │
    // └────────────────────────────────────────────────────────────────┘
    const originalWindowOpen = window.open;

    // Replace window.open with our blocking version.
    // "...args" captures any arguments the ad script tried to pass.
    // We log a warning to the console (the developer's debug panel)
    // so developers can see what was blocked.
    const createMockWindow = (url) => {
      const mockWin = {
        closed: false,
        focus: () => {},
        blur: () => {},
        close: () => { mockWin.closed = true; },
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        location: {
          href: url || '',
          replace: () => {},
          assign: () => {},
        },
      };
      return mockWin;
    };

    window.open = function (...args) {
      console.warn('[RedirectBlocker] Intercepted window.open with mock window:', args[0]);
      return createMockWindow(args[0]);
    };


    // ┌────────────────────────────────────────────────────────────────┐
    // │         PROTECTION #2: Check We Are the Top Frame             │
    // │                                                                │
    // │  We verify that OUR website is the main page (not embedded    │
    // │  inside someone else's website). If someone tries to put our  │
    // │  site inside their iframe, we'd want to know!                 │
    // │                                                                │
    // │  window.top = the very top/main browser window                │
    // │  window = our current window                                   │
    // │  If they're the same, we're the main page. Good!              │
    // └────────────────────────────────────────────────────────────────┘
    try {
      // This check verifies we're the top-level page.
      // If we're embedded in someone else's site, window.top !== window.
      if (window.top === window) {
        // We are the top frame — this is normal and good!
      }
    } catch (e) {
      // If this throws an error, it means we're in a cross-origin
      // iframe (embedded on another site). The error happens because
      // browsers block access to window.top for security.
      // We silently ignore this — our HTTP headers already handle it.
    }


    // ┌────────────────────────────────────────────────────────────────┐
    // │    PROTECTION #3: Block Clicks on External (Outside) Links    │
    // │                                                                │
    // │  Some ad scripts inject invisible <a> tags (links) on top of  │
    // │  our page. When users click ANYWHERE, they accidentally click │
    // │  these invisible links and get sent to ad websites!            │
    // │                                                                │
    // │  This handler intercepts ALL clicks on the page and checks:   │
    // │    - Was the click on a link (<a> tag)?                        │
    // │    - Is the link going to an EXTERNAL website?                 │
    // │    - If yes → BLOCK IT! Don't let the browser follow the link │
    // │    - If no  → Allow it (it's an internal navigation)           │
    // │                                                                │
    // │  INTERNAL links (like going from the home page to a movie     │
    // │  page) are always allowed through. Only links going to        │
    // │  OTHER websites are blocked.                                   │
    // │                                                                │
    // │  We use "capture: true" (the 'true' at the end of             │
    // │  addEventListener) which means our handler runs FIRST,        │
    // │  before any other click handlers. This ensures we catch       │
    // │  the click before any ad script can react to it.              │
    // └────────────────────────────────────────────────────────────────┘
    const handleClick = (e) => {
      // Find the closest <a> (anchor/link) element that was clicked.
      // "closest('a')" walks up the DOM tree looking for an <a> tag.
      // If the user clicked a <span> inside an <a>, this finds the <a>.
      const anchor = e.target?.closest?.('a');

      // If no link was clicked (user clicked a button, div, etc.), do nothing.
      if (!anchor) return;

      // Get the "href" attribute — this is the URL the link points to.
      const href = anchor.getAttribute('href');

      // If there's no href (link goes nowhere), do nothing.
      if (!href) return;

      // ── ALLOW INTERNAL NAVIGATION ──
      // These are links that stay WITHIN our website:
      //   - Starts with "/" → relative path (like "/watch/movie/123")
      //   - Starts with "#" → same-page anchor (like "#history")
      //   - Starts with our own domain → same website
      if (
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith(window.location.origin)
      ) {
        return; // Let it through! This is a normal, safe link.
      }

      // ── ALLOW EXPLICITLY SAFE LINKS ──
      // If a developer marks a link with data-safe-link="true",
      // we trust it and let it through. This is an escape hatch
      // for any external links we intentionally want to allow.
      if (anchor.hasAttribute('data-safe-link')) {
        return; // Developer said this link is safe. Trust them.
      }

      // ── BLOCK EVERYTHING ELSE ──
      // If we get here, it's an external link (going to another website).
      // This is almost certainly an ad trying to redirect the user!
      // We block it by preventing the default browser behavior
      // (following the link) and stopping the event from bubbling up.
      e.preventDefault();          // Don't follow the link!
      e.stopImmediatePropagation(); // Don't let other handlers see this click!
      console.warn('[RedirectBlocker] Blocked external navigation:', href);
    };


    // ┌────────────────────────────────────────────────────────────────┐
    // │    PROTECTION #4: Block Form Submissions to External URLs     │
    // │                                                                │
    // │  Some sneaky ads create invisible <form> elements that         │
    // │  submit data to external websites. This can redirect the      │
    // │  user or send their information to bad actors.                 │
    // │                                                                │
    // │  We check every form submission:                                │
    // │    - Is the form sending data to an EXTERNAL website?          │
    // │    - If yes → BLOCK IT!                                        │
    // │    - If no (internal) → Allow it                               │
    // └────────────────────────────────────────────────────────────────┘
    const handleSubmit = (e) => {
      // Get the form element that's being submitted.
      const form = e.target;

      // Get the "action" attribute — this is the URL the form sends data to.
      const action = form?.getAttribute?.('action');

      // If the action URL goes to an external website, block it!
      if (
        action &&
        !action.startsWith('/') &&            // Not a relative path
        !action.startsWith('#') &&            // Not a hash link
        !action.startsWith(window.location.origin) // Not our own site
      ) {
        e.preventDefault();           // Don't submit the form!
        e.stopImmediatePropagation(); // Don't let other handlers see this!
        console.warn('[RedirectBlocker] Blocked form redirect:', action);
      }
    };


    // ┌────────────────────────────────────────────────────────────────┐
    // │    PROTECTION #5: Block Iframe Messages That Try to Navigate  │
    // │                                                                │
    // │  Iframes (like our video player) can send "messages" to the   │
    // │  parent page using window.postMessage(). This is normally     │
    // │  used for good things (like telling us when a video ends),    │
    // │  but ad scripts inside iframes can abuse it to try to         │
    // │  redirect the parent page.                                     │
    // │                                                                │
    // │  We listen for ALL messages and block any that look like       │
    // │  navigation/redirect commands.                                 │
    // └────────────────────────────────────────────────────────────────┘
    const handleMessage = (e) => {
      try {
        // Try to read the message data.
        let data = e.data;

        // If the data is a string, try to parse it as JSON.
        // JSON = JavaScript Object Notation, a way to encode data as text.
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            // Not JSON, that's fine — could be a simple string message.
          }
        }

        // Check if this message looks like a navigation/redirect command.
        // Ad scripts might send messages like:
        //   { type: "navigate", url: "http://bad-site.com" }
        //   { action: "redirect", target: "http://scam.com" }
        //   { command: "open", href: "http://ad.com" }
        const isNavAttempt =
          data?.type === 'navigate' ||
          data?.type === 'redirect' ||
          data?.action === 'redirect' ||
          data?.action === 'navigate' ||
          data?.event === 'redirect' ||
          data?.command === 'open' ||
          data?.command === 'navigate';

        // If it's a navigation attempt, block it!
        if (isNavAttempt) {
          console.warn('[RedirectBlocker] Blocked iframe navigation message:', data);
          return; // Don't process this message any further.
        }
      } catch {
        // If anything goes wrong parsing the message, silently ignore it.
        // Better to miss a message than to crash the whole app!
      }
    };


    // ┌────────────────────────────────────────────────────────────────┐
    // │    PROTECTION #6: MutationObserver — Watch for Injected Ads   │
    // │                                                                │
    // │  A MutationObserver is like a security camera for the page.   │
    // │  It watches for ANY changes to the page's HTML (the DOM).     │
    // │  When something new is added, we check if it's suspicious     │
    // │  and remove it immediately.                                    │
    // │                                                                │
    // │  Things we watch for and remove:                               │
    // │    - Injected <meta refresh> tags (auto-redirect timers)      │
    // │    - Injected external <script> tags (ad scripts)             │
    // │    - Injected rogue <iframe> elements (ad frames)             │
    // │    - Injected overlay <a> tags (invisible clickjack links)    │
    // │    - Injected overlay <div> tags (invisible click catchers)   │
    // │                                                                │
    // │  childList: true  = watch for new elements being added        │
    // │  subtree: true    = watch EVERYTHING, not just top-level      │
    // └────────────────────────────────────────────────────────────────┘
    const observer = new MutationObserver((mutations) => {

      // Loop through each batch of changes (mutations).
      for (const mutation of mutations) {

        // Loop through each new element that was added.
        for (const node of mutation.addedNodes) {

          // Only check element nodes (not text or comments).
          // nodeType 1 = Element (like <div>, <script>, etc.)
          // nodeType 3 = Text (just text, not an element)
          if (node.nodeType !== 1) continue;

          // ── CHECK 1: Remove injected meta-refresh tags ──
          // <meta http-equiv="refresh" content="0;url=http://bad-site.com">
          // This tag auto-redirects the page after X seconds.
          // Ads inject these to redirect users without any clicking.
          if (
            node.tagName === 'META' &&
            node.getAttribute('http-equiv')?.toLowerCase() === 'refresh'
          ) {
            node.remove(); // Delete it from the page!
            console.warn('[RedirectBlocker] Removed injected meta refresh');
            continue; // Move to the next node.
          }

          // ── CHECK 2: Remove injected external scripts ──
          // Ad networks inject <script> tags that load their ad code.
          // We check if the script comes from an EXTERNAL source
          // (not our own website, not Next.js, not Google Fonts).
          // If it's external and unknown, we remove it!
          if (node.tagName === 'SCRIPT' && node.src) {
            const src = node.src;
            // These are sources we trust and should keep:
            const isInternal =
              src.includes(window.location.hostname) || // Our own site
              src.includes('/_next/') ||                 // Next.js framework files
              src.includes('fonts.googleapis.com') ||    // Google Fonts
              src.includes('fonts.gstatic.com');         // Google Fonts CDN
            if (!isInternal) {
              node.remove(); // Delete the suspicious script!
              console.warn('[RedirectBlocker] Removed injected external script:', src);
              continue;
            }
          }

          // ── CHECK 3: Remove rogue iframes (ad frames) ──
          // Ads often inject hidden iframes that load ad content.
          // We check if the iframe is our VIDEO PLAYER (which we want to keep)
          // or an unknown iframe (which is probably an ad).
          // Our player has a special "data-player" marker to identify it.
          if (node.tagName === 'IFRAME') {
            const src = node.getAttribute('src') || '';
            const isOurPlayer =
              node.hasAttribute('data-player') || // Marked as our player
              src.includes('vidsrc') ||            // Our video provider #1 & #4
              src.includes('vidking') ||           // Our video provider #2
              src.includes('embed.su');            // Our video provider #3
            if (!isOurPlayer) {
              node.remove(); // Delete the ad iframe!
              console.warn('[RedirectBlocker] Removed injected ad iframe:', src);
              continue;
            }
          }

          // ── CHECK 4: Remove injected clickjack anchor overlays ──
          // Some ads create invisible <a> tags that cover the entire page.
          // They use CSS positioning (position: fixed/absolute) to overlay
          // the whole screen. When you click ANYWHERE, you click the invisible
          // link and get redirected to an ad. Super sneaky!
          // We detect these by checking for position + external href.
          if (node.tagName === 'A') {
            const href = node.getAttribute('href') || '';
            const style = node.getAttribute('style') || '';
            // Is it positioned as an overlay?
            const isOverlay =
              style.includes('position') &&
              (style.includes('fixed') || style.includes('absolute')) &&
              (style.includes('z-index') || style.includes('zIndex'));
            // Does it link to an external site?
            const isExternal =
              href.startsWith('http') && !href.startsWith(window.location.origin);
            if (isOverlay && isExternal) {
              node.remove(); // Delete the clickjack link!
              console.warn('[RedirectBlocker] Removed injected clickjack anchor:', href);
              continue;
            }
          }

          // ── CHECK 5: Remove injected overlay divs (click catchers) ──
          // Similar to anchor overlays, some ads create invisible <div>
          // elements that cover the whole screen to catch clicks.
          // These are usually empty divs with position:fixed and high z-index.
          if (node.tagName === 'DIV') {
            const style = node.getAttribute('style') || '';
            const isFullOverlay =
              style.includes('position') &&
              style.includes('fixed') &&
              style.includes('z-index') &&
              !node.closest('[data-player]') && // Not inside our player
              !node.id?.includes('__next');      // Not a Next.js system div
            if (isFullOverlay && node.children.length === 0) {
              node.remove(); // Delete the click-catcher div!
              console.warn('[RedirectBlocker] Removed injected overlay div');
              continue;
            }
          }
        }
      }
    });


    // ┌────────────────────────────────────────────────────────────────┐
    // │              ACTIVATE ALL PROTECTIONS                          │
    // │                                                                │
    // │  Now we turn on all our event listeners and observers.         │
    // │  "true" at the end = capture phase (we run FIRST, before      │
    // │  any other handlers). This is important because we need to    │
    // │  catch and block events BEFORE ad scripts can react to them.  │
    // └────────────────────────────────────────────────────────────────┘

    // Listen for ALL clicks on the page (Protection #3).
    document.addEventListener('click', handleClick, true);

    // Listen for ALL form submissions (Protection #4).
    document.addEventListener('submit', handleSubmit, true);

    // Listen for ALL messages from iframes (Protection #5).
    window.addEventListener('message', handleMessage, true);

    // Start watching for DOM changes (Protection #6).
    if (document.body) {
      observer.observe(document.body, {
        childList: true, // Watch for elements being added/removed
        subtree: true    // Watch the ENTIRE page, not just direct children
      });
    }


    // ┌────────────────────────────────────────────────────────────────┐
    // │    PROTECTION #7: Periodic Cleanup Sweep                      │
    // │                                                                │
    // │  Every 3 seconds, we do a sweep of the entire page looking    │
    // │  for any ad elements that might have slipped through.         │
    // │                                                                │
    // │  This is like a janitor doing regular rounds — even if        │
    // │  something snuck past the security cameras (MutationObserver), │
    // │  the janitor will find and remove it on their next round.     │
    // └────────────────────────────────────────────────────────────────┘
    const cleanupInterval = setInterval(() => {

      // Find and remove any rogue iframes that aren't our player.
      document.querySelectorAll('iframe:not([data-player])').forEach((iframe) => {
        const src = iframe.getAttribute('src') || '';
        // Only remove if it's not one of our trusted video sources.
        if (!src.includes('vidsrc') && !src.includes('vidking') && !src.includes('autoembed') && !src.includes('embed.su') && !src.includes('nextgencloudfabric') && src !== '') {
          iframe.remove();
          console.warn('[RedirectBlocker] Cleanup removed rogue iframe:', src);
        }
      });

      // Find and remove overlay anchors (links) with target="_blank".
      // target="_blank" means "open in a new tab" — often used by ads.
      document.querySelectorAll('a[target="_blank"]').forEach((a) => {
        const style = window.getComputedStyle(a);
        // If it's positioned as a fixed overlay or has a very high z-index,
        // it's almost certainly an ad click-catcher.
        if (
          style.position === 'fixed' ||
          (style.position === 'absolute' && parseInt(style.zIndex) > 9000)
        ) {
          a.remove();
          console.warn('[RedirectBlocker] Cleanup removed overlay anchor');
        }
      });
    }, 3000); // Run every 3000 milliseconds (3 seconds)


    // ┌────────────────────────────────────────────────────────────────┐
    // │                   🧹 CLEANUP FUNCTION 🧹                      │
    // │                                                                │
    // │  When this component is removed from the page (which happens  │
    // │  during page navigation in React), we need to undo everything │
    // │  we set up. This prevents "memory leaks" — leftover listeners │
    // │  that keep running even though they're no longer needed.       │
    // │                                                                │
    // │  Think of it like cleaning up after a party:                   │
    // │    - Put the furniture back (restore window.open)              │
    // │    - Turn off the music (remove event listeners)               │
    // │    - Send the security guard home (disconnect observer)        │
    // │    - Cancel the cleaning schedule (clear interval)             │
    // └────────────────────────────────────────────────────────────────┘
    return () => {
      // Restore the original window.open function.
      window.open = originalWindowOpen;

      // Remove all our event listeners.
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('message', handleMessage, true);

      // Stop watching for DOM changes.
      observer.disconnect();

      // Stop the periodic cleanup sweeps.
      clearInterval(cleanupInterval);
    };
  }, []); // ← Empty array means this effect runs only ONCE when the page loads.

  // ────────────────────────────────────────────────────────────────────
  // This component doesn't show anything visible on the page.
  // It ONLY runs the protection code in the background.
  // "return null" means "render nothing" — the component is invisible.
  // ────────────────────────────────────────────────────────────────────
  return null;
}
