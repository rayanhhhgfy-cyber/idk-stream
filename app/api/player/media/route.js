// Bingr media proxy — ported from Lumi (superhexa/lumi).
// Server-side HLS proxy: fetches the upstream playlist/segments with a
// bingr.one Referer/Origin, forwards client Range headers, and rewrites every
// playlist line so segments/keys point back through this proxy. The browser
// never touches the upstream CDN. Bounded to the allowlisted media hosts in
// lib/bingr-player.js — never an arbitrary URL proxy.
import {
  rewriteBingrPlaylist,
  validateBingrMediaUrl,
} from '@/lib/bingr-player';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let url;
  try {
    url = validateBingrMediaUrl(
      new URL(request.url).searchParams.get('url') || '',
    );
  } catch {
    return new Response('Unsupported media URL', { status: 400 });
  }
  // Rebuild the target from the validated allowlisted hostname. Path and query
  // remain provider-controlled, never user-controlled origin data.
  const target = new URL(`https://${url.hostname}`);

  target.pathname = url.pathname;
  target.search = url.search;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const isBingrRelay =
      url.hostname.endsWith('.workers.dev') ||
      url.hostname.endsWith('.rousav.tech') ||
      url.hostname.endsWith('.hakunaymatata.com') ||
      url.hostname.endsWith('.hscow.com') ||
      url.hostname.endsWith('.streamrip.fun');
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: '*/*',
      Referer: isBingrRelay
        ? 'https://bingr.one/'
        : 'https://nextgencloudfabric.com/',
      Origin: isBingrRelay
        ? 'https://bingr.one'
        : 'https://nextgencloudfabric.com',
    };
    const range = request.headers.get('range');
    if (range && /^bytes=\d*-\d*$/.test(range)) headers.Range = range;
    const response = await fetch(target, {
      headers,
      signal: controller.signal,
      redirect: 'manual',
    });
    if (!response.ok) return new Response('Media unavailable', { status: 502 });
    const outputHeaders = new Headers({
      'Cache-Control': 'private, max-age=30',
      'X-Content-Type-Options': 'nosniff',
    });
    const upstreamUrlParam = url.searchParams.get('url');
    const playlistBase = upstreamUrlParam ? new URL(upstreamUrlParam) : url;
    const upstreamContentType = response.headers.get('content-type') || '';
    const isPlaylist =
      url.pathname.endsWith('.m3u8') ||
      playlistBase.pathname.endsWith('.m3u8') ||
      /mpegurl|x-mpegurl/i.test(upstreamContentType);
    if (isPlaylist) {
      if (Number(response.headers.get('content-length')) > 5_000_000)
        throw new Error('Playlist too large');
      const body = await response.text();
      if (body.length > 5_000_000) throw new Error('Playlist too large');
      if (!body.trimStart().startsWith('#EXTM3U')) {
        return new Response('Invalid playlist response', { status: 502 });
      }
      outputHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewriteBingrPlaylist(body, playlistBase), {
        headers: outputHeaders,
      });
    }
    // Some upstreams deliberately give media an HTML MIME type. Never serve it
    // as executable HTML on our own origin.
    outputHeaders.set('Content-Type', 'application/octet-stream');
    for (const name of ['content-range', 'accept-ranges']) {
      const value = response.headers.get(name);
      if (value) outputHeaders.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      headers: outputHeaders,
    });
  } catch {
    return new Response('Media unavailable', { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
