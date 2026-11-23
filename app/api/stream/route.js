// ╔══════════════════════════════════════════════════════════════════════╗
// ║          🎬  DIRECT STREAM — /api/stream  🎬                        ║
// ║                                                                    ║
// ║  Extracts a DIRECT video file URL from VidLink (vidlink.pro) and  ║
// ║  returns it so the site's own native <video> player can play it — ║
// ║  no provider embed, no domain allowlist, no iframe.               ║
// ║                                                                    ║
// ║  HOW IT WORKS                                                      ║
// ║  VidLink's API (api/b/movie/{token} and api/b/tv/{token}/{s}/{e}) ║
// ║  needs an encrypted token: the TMDB id + a 64-bit big-endian       ║
// ║  timestamp, sealed with XSalsa20-Poly1305 (NaCl secretbox) under  ║
// ║  VidLink's production key, with a 24-byte zero nonce. The token    ║
// ║  is base64url-encoded without padding. The key and the scheme     ║
// ║  come from the public reverse-engineering repo                     ║
// ║  walterwhite-69/Vidlink.pro-Decryptor (pure-Python PyNaCl port).  ║
// ║  Here it is ported to pure JS with tweetnacl — Vercel serverless  ║
// ║  cannot spawn Python, so the route must be pure JS.               ║
// ║                                                                    ║
// ║  WHAT requiresProxy MEANS (verified 2026-11-23)                   ║
// ║  Every quality comes back requiresProxy:true, plus a headers      ║
// ║  object, e.g. { referer: "https://filmboom.top/", origin:        ║
// ║  "https://filmboom.top" }. The CDN (bcdnxw.hakunaymatata.com)     ║
// ║  only serves the file with THOSE exact headers — and a browser    ║
// ║  cannot set Referer/Origin on a <video> load (forbidden headers), ║
// ║  so the raw CDN URL is unplayable in a browser by construction.   ║
// ║  VidLink's own player (vidlink.pro/_next/static/chunks/3922-*.js, ║
// ║  module 5196, function j) rewrites such URLs through its default  ║
// ║  proxy base https://surge.flooderrr.store/ :                      ║
// ║    {proxy}/mp{pathname}?{sign,t,...}&headers={sorted JSON}         ║
// ║      &host={cdn origin}                                           ║
// ║  The proxy fetches the CDN file with the required headers and     ║
// ║  relays it to the browser. This route does the same rewrite and   ║
// ║  returns the PROXIED URL as `url` (plus the raw CDN URL as        ║
// ║  `directUrl` for reference). The browser fetches from the proxy,  ║
// ║  NOT from Vercel — no video bytes ever pass through this route.   ║
// ║                                                                    ║
// ║  HONEST STATUS (2026-11-23, sandbox + live browser test)          ║
// ║  The raw CDN URL 429s (no Referer) and 428s (filmboom.top         ║
// ║  Referer) from the sandbox, and the live browser test failed to   ║
// ║  load it ("Unable to play media"). The proxied URL 403s from the  ║
// ║  sandbox with a Cloudflare "Attention Required!" challenge page   ║
// ║  — Cloudflare gates the proxy for datacenter IPs (even the proxy  ║
// ║  root 403s). So Direct CANNOT be proven working from here; the    ║
// ║  verdict is a real phone (residential/mobile IP). If the proxy    ║
// ║  also challenges the phone, the player falls back to autoembed.me ║
// ║  instead of dead-ending.                                          ║
// ║                                                                    ║
// ║  The signed URLs carry ?sign=…&t=… and expire (TTL 3600s), so    ║
// ║  the route fetches a fresh token + fresh URLs on every call —    ║
// ║  never cache or hardcode a stream URL.                            ║
// ╚══════════════════════════════════════════════════════════════════════╝

import nacl from 'tweetnacl';

export const dynamic = 'force-dynamic';

// VidLink production key, reverse-engineered in
// walterwhite-69/Vidlink.pro-Decryptor (main.py: KEY_HEX). It is
// VidLink's own public-facing key, not a user credential.
const VIDLINK_KEY = Buffer.from(
  'c75136c5668bbfe65a7ecad431a745db68b5f381555b38d8f6c699449cf11fcd',
  'hex'
);
const VIDLINK_NONCE = Buffer.alloc(24); // all-zero 24-byte nonce

const VIDLINK_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  Origin: 'https://vidlink.pro',
  Referer: 'https://vidlink.pro/',
};

// VidLink's proxy base, hardcoded as the default in its own player
// (module 5196, function j). The browser fetches video from here, not
// from Vercel — this route only returns the URL.
const PROXY_BASE = 'https://surge.flooderrr.store';
// Original query params the proxy keeps (VidLink module 5196, set `o`).
// Everything else in the signed URL's query is dropped by the rewrite.
const KEPT_QUERY_PARAMS = new Set([
  'auth',
  'expires',
  'hash',
  'key',
  'sign',
  't',
  'token',
]);

// Mirror of VidLink's player function m() (module 5196) for MP4
// qualities: {proxy}/mp{pathname}?{kept query}&headers={sorted JSON}
// &host={cdn origin}. Returns null when the quality cannot be proxied
// (no headers, bad URL, or the URL already carries a proxy param) —
// the caller then falls back to the raw CDN URL.
function proxiedMp4Url(q) {
  if (!q || q.requiresProxy !== true || typeof q.url !== 'string') return null;
  let u;
  try {
    u = new URL(q.url);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password || u.hash) return null;
  const headers = q.headers;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return null;
  const clean = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v !== 'string' || /[\0\r\n]/.test(k + v)) return null;
    clean[k] = v;
  }
  const existing = new URLSearchParams(u.search);
  for (const k of existing.keys()) {
    const lower = k.toLowerCase();
    if (lower === 'headers' || lower === 'host') return null; // already proxied
  }
  const headersJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(clean).sort(([a], [b]) => a.localeCompare(b))
    )
  );
  const parts = [];
  for (const [k, v] of existing.entries()) {
    if (KEPT_QUERY_PARAMS.has(k.toLowerCase())) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  parts.push(`headers=${encodeURIComponent(headersJson)}`);
  parts.push(`host=${encodeURIComponent(u.origin)}`);
  return `${PROXY_BASE}/mp${u.pathname}?${parts.join('&')}`;
}

// Port of the decryptor's encrypt_token(): message = mediaId bytes +
// 64-bit big-endian timestamp (now + 480s), sealed with NaCl secretbox
// (XSalsa20-Poly1305: 16-byte MAC + ciphertext), prefixed with the nonce,
// base64url-encoded without padding.
function encryptToken(mediaId) {
  const timestamp = Math.floor(Date.now() / 1000) + 480;
  const idBuf = Buffer.from(String(mediaId), 'utf-8');
  const tsBuf = Buffer.alloc(8);
  tsBuf.writeBigUInt64BE(BigInt(timestamp));
  const message = Buffer.concat([idBuf, tsBuf]);
  const sealed = nacl.secretbox(
    new Uint8Array(message),
    new Uint8Array(VIDLINK_NONCE),
    new Uint8Array(VIDLINK_KEY)
  );
  const full = Buffer.concat([VIDLINK_NONCE, Buffer.from(sealed)]);
  return full.toString('base64url');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: 'Missing or invalid ?id= (TMDB id)' }, { status: 400 });
  }
  if (type !== 'movie' && type !== 'tv') {
    return Response.json({ error: 'Invalid ?type= (movie or tv)' }, { status: 400 });
  }
  if (type === 'tv' && (!season || !episode)) {
    return Response.json({ error: 'TV needs ?season= and ?episode=' }, { status: 400 });
  }

  const token = encryptToken(id);
  const apiUrl =
    type === 'tv'
      ? `https://vidlink.pro/api/b/tv/${token}/${season}/${episode}?multiLang=1`
      : `https://vidlink.pro/api/b/movie/${token}?multiLang=1`;

  let res;
  try {
    res = await fetch(apiUrl, {
      headers: VIDLINK_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return Response.json(
      { error: 'VidLink API unreachable', detail: String(e?.message || e) },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return Response.json(
      { error: 'VidLink API error', detail: `HTTP ${res.status}` },
      { status: 502 }
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return Response.json({ error: 'VidLink returned non-JSON' }, { status: 502 });
  }

  const qualities = data?.stream?.qualities;
  if (!qualities || typeof qualities !== 'object' || Object.keys(qualities).length === 0) {
    return Response.json(
      { error: 'No direct stream found for this title', sourceId: data?.sourceId || null },
      { status: 404 }
    );
  }

  const out = Object.entries(qualities)
    .map(([quality, q]) => {
      const directUrl = q?.url || '';
      // requiresProxy MP4s are rewritten through VidLink's proxy (see
      // proxiedMp4Url); anything else keeps its raw URL. `url` is what
      // the player plays; `directUrl` is the raw CDN URL for reference.
      const proxied =
        q?.type === 'mp4' ? proxiedMp4Url(q) : null;
      return {
        quality,
        height: Number(quality) || 0,
        url: proxied || directUrl,
        directUrl,
        proxied: Boolean(proxied),
        type: q?.type || 'mp4',
        codec: q?.codecName || null,
        requiresProxy: q?.requiresProxy === true,
        headers: q?.headers || null,
      };
    })
    .filter((q) => q.url)
    .sort((a, b) => b.height - a.height);

  if (out.length === 0) {
    return Response.json({ error: 'No playable stream URL in VidLink response' }, { status: 404 });
  }

  return Response.json({
    sourceId: data?.sourceId || null,
    source: 'vidlink',
    type,
    id,
    ...(type === 'tv' ? { season: Number(season), episode: Number(episode) } : {}),
    qualities: out,
    ttl: data?.stream?.TTL || null,
  });
}
