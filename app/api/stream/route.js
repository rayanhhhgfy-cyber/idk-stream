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
// ║  WHY THE BROWSER CANNOT FETCH THE URL ITSELF                      ║
// ║  Every quality comes back requiresProxy:true. The CDN             ║
// ║  (bcdn.hakunaymatata.com) serves the file to a plain request      ║
// ║  (HTTP 206) but answers 429 to ANY request carrying a Referer or  ║
// ║  Origin header — and a browser always sends Referer for a         ║
// ║  cross-origin <video> load. So the player sets                    ║
// ║  referrerPolicy="no-referrer" on the <video> element, which      ║
// ║  makes the browser fetch exactly like the plain request that     ║
// ║  works. The route itself only returns the URL; no video bytes    ║
// ║  are proxied through Vercel (a full movie would blow the          ║
// ║  serverless time limit).                                          ║
// ║                                                                    ║
// ║  VERIFIED (2026-11-23, sandbox, Fight Club TMDB 550): the API    ║
// ║  returns 200 with real MP4 URLs (360/480/720, HEVC) on bcdn; a   ║
// ║  plain Range fetch gets 206, any Referer/Origin gets 429. TV     ║
// ║  (Breaking Bad 1396 S1E1) also returns 200 with 360–1080, but    ║
// ║  its CDN host (bcdnxw) answered 429 to every request from the    ║
// ║  sandbox — TV direct playback is NOT yet proven and may need     ║
// ║  VidLink's proxy. The live browser test is the verdict.          ║
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
    .map(([quality, q]) => ({
      quality,
      height: Number(quality) || 0,
      url: q?.url || '',
      type: q?.type || 'mp4',
      codec: q?.codecName || null,
      requiresProxy: q?.requiresProxy === true,
    }))
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
