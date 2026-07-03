// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                                                              ║
// ║                     🛠️  NEXT.JS CONFIGURATION FILE  🛠️                      ║
// ║                                                                              ║
// ║  Think of this file like the "settings" page on your phone.                  ║
// ║  It tells Next.js (the engine that powers our website) how to behave.        ║
// ║                                                                              ║
// ║  For example:                                                                ║
// ║    - Which websites are allowed to show images on our site                   ║
// ║    - What security rules to follow (like locking the doors of a house)       ║
// ║    - What information to share (or NOT share) with other websites            ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// This is a special comment that tells code editors (like VS Code) what
// type of settings this file contains. It helps with auto-complete suggestions.
// Think of it like labeling a box so you know what's inside.
/** @type {import('next').NextConfig} */

// ──────────────────────────────────────────────────────────────────────────────
// Here we create our settings object. An "object" in JavaScript is like a
// container that holds multiple settings together, kind of like a backpack
// that holds all your school supplies.
// ──────────────────────────────────────────────────────────────────────────────
const nextConfig = {

  // ┌──────────────────────────────────────────────────────────────────────────┐
  // │                        🖼️  IMAGE SETTINGS  🖼️                          │
  // │                                                                          │
  // │  Our website shows movie posters and photos. These images come from      │
  // │  a website called "TMDB" (The Movie Database). By default, Next.js       │
  // │  blocks images from other websites for safety (like how your parents     │
  // │  might not let you accept candy from strangers).                         │
  // │                                                                          │
  // │  Here we tell Next.js: "Hey, it's okay to load images from TMDB,        │
  // │  we trust them!"                                                         │
  // └──────────────────────────────────────────────────────────────────────────┘
  images: {

    // "remotePatterns" is a list of websites we trust to load images from.
    // It's like a guest list for a party — only websites on this list
    // are allowed to send us their pictures.
    remotePatterns: [
      {
        // "protocol" means how we connect to the website.
        // "https" is the secure way (like sending a letter in a locked envelope
        // instead of a postcard that anyone can read).
        protocol: 'https',

        // "hostname" is the website's address, like a home address.
        // "image.tmdb.org" is where all the movie poster pictures live.
        hostname: 'image.tmdb.org',
      },
    ],
  },

  // ┌──────────────────────────────────────────────────────────────────────────┐
  // │                     🔒  SECURITY HEADERS  🔒                            │
  // │                                                                          │
  // │  "Headers" are invisible notes that our website sends to your browser    │
  // │  before the actual page loads. They're like instructions a teacher       │
  // │  gives before class starts.                                              │
  // │                                                                          │
  // │  These security headers protect our users from:                          │
  // │    - Bad websites trying to steal our content                            │
  // │    - Ads that try to redirect you to dangerous pages                     │
  // │    - Sneaky scripts that try to open unwanted pop-ups                    │
  // │                                                                          │
  // │  Think of these headers as the locks, alarms, and security cameras       │
  // │  of our website.                                                         │
  // └──────────────────────────────────────────────────────────────────────────┘

  // "async" means this function might take a little time to finish,
  // so the computer should wait for it patiently (like waiting for
  // your toast to pop out of the toaster).
  async headers() {

    // We return an array (a list) of header rules.
    // Each rule says: "For pages matching this pattern, add these headers."
    return [
      {
        // "source" tells Next.js which pages these rules apply to.
        // The pattern "/(.*)" means "ALL pages" — every single page
        // on our website gets these security rules.
        // It's like saying "every room in the house gets a lock."
        source: '/(.*)',

        // "headers" is the list of security rules we want to add.
        // Each rule has a "key" (the rule's name) and a "value" (what the rule says).
        headers: [

          // ── RULE 1: X-Frame-Options ─────────────────────────────────────
          // 
          // Imagine someone puts our entire website inside THEIR website,
          // like putting a TV inside a TV. They could trick people into
          // thinking they're on our site when they're actually on a fake one!
          //
          // "SAMEORIGIN" means: "Only WE are allowed to put our website
          // inside a frame. Nobody else can do it."
          //
          // This stops "clickjacking" attacks — where bad guys overlay
          // invisible buttons on top of our site to trick you into
          // clicking something you didn't mean to click.
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },

          // ── RULE 2: Content-Security-Policy (CSP) ───────────────────────
          //
          // This is the MOST IMPORTANT security rule. Think of it like
          // a bouncer at a club who checks everyone's ID.
          //
          // It tells the browser exactly what's allowed and what's not:
          //
          //   "frame-ancestors 'self'" = Only our own website can embed us.
          //     (Same idea as X-Frame-Options above, but newer and better.)
          //
          //   "frame-src 'self' https://vidsrc.cc ..." = These are the ONLY
          //     websites we allow to show up inside our video player iframe.
          //     If a sneaky ad tries to load a different website in an iframe,
          //     the browser will say "NOPE!" and block it.
          //
          //   "child-src" = Same as frame-src but also covers web workers
          //     (background helper scripts). Same whitelist applies.
          //
          // The ".join('; ')" at the end combines all the rules into one
          // long string separated by semicolons, because that's the format
          // browsers expect (like writing a sentence with proper punctuation).
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },

          // ── RULE 3: Referrer-Policy ─────────────────────────────────────
          //
          // When you click a link to go from one website to another,
          // your browser usually tells the new website: "Hey, this person
          // came from [previous website]." That's called a "referrer."
          //
          // "strict-origin-when-cross-origin" means:
          //   - If you're staying on OUR website → share the full page URL
          //   - If you're going to ANOTHER website → only share our domain name
          //     (like saying "I came from idkstream.com" but NOT saying which
          //     specific movie page you were on)
          //   - If going from secure (https) to insecure (http) → share NOTHING
          //
          // This protects your privacy! Ad networks can't see exactly
          // what you were watching.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },


        ],
      },
    ];
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Finally, we "export" our settings so Next.js can use them.
// "export default" means "this is the main thing this file provides."
// Think of it like putting your finished homework in your backpack
// so you can turn it in at school.
// ──────────────────────────────────────────────────────────────────────────────
export default nextConfig;
