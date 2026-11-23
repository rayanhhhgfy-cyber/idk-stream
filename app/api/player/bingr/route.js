// Bingr direct player — ported from Lumi (superhexa/lumi).
// Server-side resolver: asks Bingr's public API for stream sources, probes
// the candidate HLS manifests server-side, and returns a proxied stream URL
// that plays in the site's own native <video>/hls.js player — the browser
// never loads a third-party embed, so no provider can block this domain.
// No API key. If Bingr's API is unreachable, falls back to scraping the
// bingr.one watch page for an .m3u8 URL.
import { bingrMediaProxyUrl, unwrapBingrMediaUrl } from '@/lib/bingr-player';

export const dynamic = 'force-dynamic';

const API = 'https://api.bingr.one/api';
const SERVER_IDS = ['s31', 's40', 's50', 's51', 's62', 's70', 's80', 's81'];
const HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Origin: 'https://bingr.one',
  Referer: 'https://bingr.one/',
};

function normalizeTmdbId(value) {
  const parsed =
    typeof value === 'number'
      ? value
      : /^\d+$/.test((value || '').toString().trim())
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeMediaType(value) {
  return value === 'tv' || value === 'show' ? 'tv' : 'movie';
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed =
    typeof value === 'number'
      ? value
      : /^\d+$/.test((value || '').toString().trim())
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function decodeBingrHtmlUrl(value) {
  return value
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\\\//g, '/');
}

async function resolveBingrWatchPage(
  tmdbId,
  mediaType,
  season,
  episode,
  signal,
) {
  const pageUrl = new URL(
    mediaType === 'tv'
      ? `https://bingr.one/watch/tv/${tmdbId}/${season}/${episode}`
      : `https://bingr.one/watch/movie/${tmdbId}`,
  );
  const response = await fetch(pageUrl, {
    signal,
    redirect: 'follow',
    headers: { ...HEADERS, Accept: 'text/html,application/xhtml+xml' },
  });
  if (!response.ok) return null;
  const html = await response.text();
  const matches = Array.from(
    new Set([
      ...(html.match(/https?:\/\/[^\s"'<]+\.m3u8[^\s"'<]*/gi) || []),
      ...(html.match(/https?:\\\/\\\/[^\s"'<]+\.m3u8[^\s"'<]*/gi) || []),
    ]),
  );
  for (const match of matches) {
    try {
      const raw = decodeBingrHtmlUrl(match).replace(/\\$/, '');
      const url = unwrapBingrMediaUrl(raw);
      return url;
    } catch {
      // Try the next manifest exposed by the watch page.
    }
  }
  return null;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const tmdbId = normalizeTmdbId(params.get('tmdbId'));
  if (!tmdbId)
    return Response.json({ error: 'Invalid TMDB ID' }, { status: 400 });
  const mediaType = normalizeMediaType(params.get('type'));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  const options = {
    signal: controller.signal,
    redirect: 'manual',
    headers: HEADERS,
  };
  let failureCode = 'metadata-request';
  try {
    const detailsUrl = new URL('https://api.bingr.one');
    detailsUrl.pathname = `/api/details/${mediaType}/${Number(tmdbId)}`;
    const detailsResponse = await fetch(detailsUrl, options);
    let details = {};
    if (detailsResponse.ok) {
      failureCode = 'metadata-response';
      details = await detailsResponse.json().catch(() => ({}));
    } else {
      failureCode = `metadata-http-${detailsResponse.status}`;
    }
    const query = {};
    if (typeof details.title === 'string')
      query.title = details.title.slice(0, 300);
    if (typeof details.year === 'string')
      query.year = details.year.slice(0, 10);
    if (typeof details.imdb_id === 'string')
      query.imdb_id = details.imdb_id.slice(0, 30);
    const season = normalizePositiveInteger(params.get('season'), 1);
    const episode = normalizePositiveInteger(params.get('episode'), 1);
    if (mediaType === 'tv') {
      query.season = season;
      query.episode = episode;
    }
    failureCode = 'stream-request';
    const responses = await Promise.allSettled(
      SERVER_IDS.map((srv) =>
        fetch(`${API}/stream`, {
          ...options,
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            srv,
            t: mediaType,
            id: String(tmdbId),
            query,
          }),
        }),
      ),
    );
    failureCode = 'stream-response';
    const candidates = [];
    for (const result of responses) {
      if (result.status !== 'fulfilled' || !result.value?.ok) continue;
      let payload;
      try {
        payload = await result.value.json();
      } catch {
        continue;
      }
      for (const source of (payload.sources || []).slice(0, 20)) {
        if (typeof source.url !== 'string') continue;
        try {
          candidates.push(unwrapBingrMediaUrl(source.url));
        } catch {
          // Try the next server/source returned by Bingr.
        }
      }
    }
    candidates.sort((a, b) => {
      const rank = (url) => {
        if (/\.hscow\.com$/.test(url.hostname)) return 5;
        if (/\.streamrip\.fun$/.test(url.hostname)) return 4;
        if (/\.workers\.dev$/.test(url.hostname)) return 3;
        if (/\.rousav\.tech$/.test(url.hostname)) return 1;
        return 2;
      };
      return rank(b) - rank(a);
    });
    for (const url of candidates.slice(0, 12)) {
      try {
        const candidateResponse = await fetch(url, {
          signal: AbortSignal.timeout(12_000),
          redirect: 'follow',
          headers: HEADERS,
        });
        if (!candidateResponse.ok) continue;
        const manifest = await candidateResponse.text();
        if (!manifest.includes('#EXTM3U')) continue;

        if (!manifest.includes('#EXT-X-STREAM-INF')) {
          const mediaLines = manifest.split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));
          const onlyImageSegments = mediaLines.length > 0 && mediaLines.every((line) => /\.(jpg|jpeg|png)(\?|$)/i.test(line));
          if (onlyImageSegments) continue;
          const hasPlayableSegment = mediaLines.some((line) => /\.(ts|m4s|mp4|aac)(\?|$)/i.test(line));
          const hasEncryption = manifest.includes('#EXT-X-KEY');
          if (hasPlayableSegment || hasEncryption || mediaLines.length === 0) {
            return Response.json(
              { streamUrl: bingrMediaProxyUrl(url.href), title: details.title },
              { headers: { 'Cache-Control': 'no-store' } },
            );
          }
          continue;
        }

        const lines = manifest.split(/\r?\n/);
        let variantUrl = null;
        for (let index = 0; index < lines.length; index++) {
          if (!lines[index].startsWith('#EXT-X-STREAM-INF:')) continue;
          const next = lines[index + 1]?.trim();
          if (!next || next.startsWith('#') || /(?:tile|thumb|subtitle)/i.test(next)) continue;
          const resolution = lines[index].match(/RESOLUTION=(\d+)x(\d+)/i);
          const pixels = resolution ? Number(resolution[1]) * Number(resolution[2]) : 0;
          const candidateVariant = new URL(next, url);
          if (!variantUrl || pixels >= 1280 * 720) variantUrl = candidateVariant;
          if (variantUrl && pixels >= 1280 * 720) break;
        }
        if (!variantUrl) continue;

        const variantResponse = await fetch(variantUrl, {
          signal: AbortSignal.timeout(12_000),
          redirect: 'follow',
          headers: HEADERS,
        });
        if (!variantResponse.ok) continue;
        const variantManifest = await variantResponse.text();
        const variantMediaLines = variantManifest.split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        const variantHasVideo = variantMediaLines.some((line) => /\.(ts|m4s|mp4|aac)(\?|$)/i.test(line));
        const variantHasImagesOnly = variantMediaLines.length > 0 && variantMediaLines.every((line) => /\.(jpg|jpeg|png)(\?|$)/i.test(line));
        if (!variantHasImagesOnly && (variantHasVideo || variantManifest.includes('#EXT-X-KEY'))) {
          return Response.json(
            { streamUrl: bingrMediaProxyUrl(url.href), title: details.title },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
      } catch {
        // Probe the next candidate when a CDN source is expired or unavailable.
      }
    }
    try {
      const watched = await resolveBingrWatchPage(String(tmdbId), mediaType, season, episode, controller.signal);
      if (watched) {
        return Response.json(
          { streamUrl: bingrMediaProxyUrl(watched.href), title: details.title },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } catch {
      // Continue to a consistent provider error response.
    }
    failureCode = 'no-supported-media';
    throw new Error('No supported stream');
  } catch {
    return Response.json(
      { error: 'Bingr is unavailable for this title', code: failureCode },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
