// ╔══════════════════════════════════════════════════════════════════════╗
// ║          🔀  RANGE PROXY — /api/proxy  🔀                           ║
// ║                                                                    ║
// ║  Server-side Range-aware video proxy for the Direct native player. ║
// ║  The browser can NEVER fetch the VidLink CDN URL directly: the    ║
// ║  CDN (bcdnxw.hakunaymatata.com) only serves the file with the     ║
// ║  source's exact Referer/Origin headers (https://filmboom.top/),   ║
// ║  and Referer/Origin are FORBIDDEN headers — a browser cannot set  ║
// ║  them on a <video> load, on fetch(), or anywhere else. VidLink's  ║
// ║  own proxy (surge.flooderrr.store) is Cloudflare-gated (403)      ║
// ║  from datacenter IPs and failed on Rayyan's real phone too.       ║
// ║                                                                    ║
// ║  So this route fetches the video server-side, where the headers    ║
// ║  CAN be set, and streams it back to the browser chunk by chunk:   ║
// ║                                                                    ║
// ║  GET /api/proxy?u=<url-encoded upstream video URL>                ║
// ║    - The upstream must be on the allowlist below — this is NEVER  ║
// ║      an open proxy. Anything else is rejected with 400.           ║
// ║    - The client's Range header is forwarded as-is (the <video>    ║
// ║      element seeks with Range requests; each one is a small,      ║
// ║      separate serverless call, so no single call downloads a      ║
// ║      whole movie). With no Range, a small initial 1 MiB range is  ║
// ║      requested instead of the whole file.                         ║
// ║    - The upstream body is STREAMED back, never buffered: the      ║
// ║      response is the upstream ReadableStream itself, with the      ║
// ║      upstream status (200/206/429/428/403…) passed through, plus  ║
// ║      X-Upstream-Status so failures are diagnosable.               ║
// ║    - The client's disconnect aborts the upstream fetch, so a      ║
// ║      cancelled playback stops the download instead of running     ║
// ║      the whole file through the server.                           ║
// ║                                                                    ║
// ║  HONEST LIMITS                                                     ║
// ║  Every byte of video flows through Vercel (bandwidth + function   ║
// ║  invocations). If the CDN also blocks Vercel's IP (429/428/403),  ║
// ║  this route returns that status and Direct still cannot play —    ║
// ║  the live check after deploy settles that question.               ║
// ╚══════════════════════════════════════════════════════════════════════╝

export const dynamic = 'force-dynamic';

// Upstream hosts this proxy will fetch from — and NOTHING else. This
// route must never become an open proxy.
function isAllowedUpstream(u) {
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password || u.hash) return false;
  const host = u.hostname.toLowerCase();
  // bcdn*.hakunaymatata.com — the VidLink CDN (bcdn, bcdnxw, …).
  if (/^bcdn[a-z0-9-]*\.hakunaymatata\.com$/.test(host)) return true;
  // surge.flooderrr.store — VidLink's own proxy, in case a proxied URL
  // is ever passed as the upstream.
  if (host === 'surge.flooderrr.store') return true;
  return false;
}

// Headers the CDN wants, exactly as VidLink's API response carries them
// for these streams (see /api/stream). A browser cannot set Referer or
// Origin on a <video> load — that is the whole reason this route exists.
const UPSTREAM_HEADERS = {
  Referer: 'https://filmboom.top/',
  Origin: 'https://filmboom.top',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  Accept: '*/*',
};

// First chunk when the client sends no Range — never ask for the whole
// file by default.
const INITIAL_RANGE = 'bytes=0-1048575';
// Upstream fetch budget per Range request. The client disconnecting
// aborts the fetch sooner via request.signal.
const UPSTREAM_TIMEOUT_MS = 30000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('u');
  if (!raw) {
    return Response.json({ error: 'Missing ?u= (upstream video URL)' }, { status: 400 });
  }

  let upstream;
  try {
    upstream = new URL(raw);
  } catch {
    return Response.json({ error: 'Invalid ?u= URL' }, { status: 400 });
  }
  if (!isAllowedUpstream(upstream)) {
    return Response.json(
      { error: 'Upstream host not allowed', host: upstream.hostname },
      { status: 400 }
    );
  }

  // Forward the client's Range as-is; the <video> element seeks with it.
  // Also forward If-Range so conditional range requests stay correct.
  const range = request.headers.get('range') || INITIAL_RANGE;
  const headers = { ...UPSTREAM_HEADERS, Range: range };
  const ifRange = request.headers.get('if-range');
  if (ifRange) headers['If-Range'] = ifRange;

  // Client disconnect aborts the upstream fetch; a 30s budget caps a
  // hung upstream. (AbortSignal.any is available in the Node runtime.)
  const signals = [request.signal];
  if (typeof AbortSignal.timeout === 'function') {
    signals.push(AbortSignal.timeout(UPSTREAM_TIMEOUT_MS));
  }
  const signal =
    typeof AbortSignal.any === 'function' ? AbortSignal.any(signals) : request.signal;

  let res;
  try {
    res = await fetch(upstream.toString(), { headers, signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      // Client went away (or the upstream timed out): nothing to send.
      return new Response(null, { status: 499 });
    }
    return Response.json(
      { error: 'Upstream unreachable', detail: String(e?.message || e) },
      { status: 502 }
    );
  }

  // Pass the upstream status through unmasked (200/206 on success,
  // 429/428/403/… on failure) so the player — and the logs — see the
  // real outcome. Stream the body, never buffer it.
  const outHeaders = new Headers();
  const contentType = res.headers.get('content-type');
  outHeaders.set('Content-Type', contentType || 'video/mp4');
  const contentRange = res.headers.get('content-range');
  if (contentRange) outHeaders.set('Content-Range', contentRange);
  const contentLength = res.headers.get('content-length');
  if (contentLength) outHeaders.set('Content-Length', contentLength);
  outHeaders.set('Accept-Ranges', res.headers.get('accept-ranges') || 'bytes');
  outHeaders.set('X-Upstream-Status', String(res.status));
  // Signed URLs expire — never let an edge cache hold a stale one.
  outHeaders.set('Cache-Control', 'private, no-store');

  return new Response(res.body, { status: res.status, headers: outHeaders });
}
