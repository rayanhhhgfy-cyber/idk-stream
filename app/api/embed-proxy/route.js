// ╔══════════════════════════════════════════════════════════════════════╗
// ║              🔌  EMBED PROXY — /api/embed-proxy  🔌                ║
// ║                                                                    ║
// ║  Some video providers (the vidsrc family: vidsrc.pm, vidsrc.buzz,  ║
// ║  vidsrc.wtf, vidfast, cinesrc) refuse to play when they are        ║
// ║  embedded from this site's domain — they serve a neutered page    ║
// ║  ("This content is blocked") instead of the player. The same      ║
// ║  embed plays fine on Lumi because Lumi's domain is allowed and    ║
// ║  this site's is not. No iframe attribute fixes that.              ║
// ║                                                                    ║
// ║  This route fetches the embed page SERVER-SIDE (no Referer, no     ║
// ║  Sec-Fetch-Site, so the provider serves the full player) and      ║
// ║  serves it back from this site's own origin, so the iframe is     ║
// ║  same-origin. A <base> tag is injected so the page's relative     ║
// ║  URLs (scripts, styles, API calls) still resolve to the           ║
// ║  provider's origin. Video streams are NOT proxied — they load     ║
// ║  straight from the provider's CDN in the browser.                 ║
// ║                                                                    ║
// ║  Only the providers that are blocked when embedded directly use   ║
// ║  this route. Providers that play fine directly are left alone.    ║
// ╚══════════════════════════════════════════════════════════════════════╝

const ALLOWED_HOSTS = new Set([
  'vidsrc.buzz',
  'vidsrc.wtf',
  'vidfast.vc',
  'cinesrc.st',
  'vidsrc.pm',
  'www.vidking.net',
  'vidking.net',
  'player.autoembed.me',
  'autoembed.me',
  'vaplayer.ru',
]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('u');
  if (!target) {
    return new Response('Missing ?u= embed URL', { status: 400 });
  }

  let url;
  try {
    url = new URL(target);
  } catch {
    return new Response('Bad embed URL', { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return new Response('Embed host not allowed', { status: 403 });
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: {
        // A normal desktop browser UA; deliberately NO Referer and NO
        // Sec-Fetch-* headers, so the provider treats this as a direct
        // visit and serves the full player page.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Don't follow the provider's redirects to ad pages.
      redirect: 'manual',
    });
  } catch (err) {
    return new Response('Provider unreachable: ' + (err?.message || 'fetch failed'), {
      status: 502,
    });
  }

  if (!res.ok) {
    return new Response('Provider returned ' + res.status, { status: 502 });
  }

  const html = await res.text();
  // Inject <base> so relative URLs in the embed page resolve to the
  // provider's origin instead of to /api/embed-proxy.
  const baseTag = `<base href="${url.origin}/">`;
  const patched = html.includes('<head')
    ? html.replace(/<head([^>]*)>/i, (m) => m + baseTag)
    : baseTag + html;

  return new Response(patched, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Never cache a proxied player page.
      'Cache-Control': 'no-store',
      // The proxied page is same-origin; let it run its own scripts.
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
