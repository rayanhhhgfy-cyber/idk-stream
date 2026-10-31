import { NextResponse } from 'next/server';

const ALLOWED_TYPES = new Set(['movie', 'tv']);
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d{0,5}$/;

export const dynamic = 'force-dynamic';

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeSources(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : [payload?.sources, payload?.data?.sources, payload?.streams, payload?.data?.streams].find(Array.isArray) || [];

  return candidates.flatMap((source, index) => {
    const url = typeof source === 'string'
      ? source
      : source?.url || source?.file || source?.src || source?.stream_url;
    if (!isHttpUrl(url)) return [];

    const declaredType = typeof source === 'object'
      ? String(source?.type || source?.mimeType || '').toLowerCase()
      : '';
    const type = declaredType === 'hls'
      || declaredType.includes('mpegurl')
      || /\.m3u8(?:\?|$)/i.test(url)
      ? 'hls'
      : 'mp4';
    const base = {
      id: String(source?.id || `source-${index + 1}`),
      name: String(source?.name || source?.label || `Source ${index + 1}`),
      url,
      type,
      quality: source?.quality ? String(source.quality) : null,
    };
    const qualities = Array.isArray(source?.qualities) ? source.qualities : [];
    const qualitySources = qualities
      .filter((quality) => isHttpUrl(quality?.url))
      .map((quality, qualityIndex) => ({
        ...base,
        id: `${base.id}-quality-${qualityIndex + 1}`,
        name: `${base.name} ${quality.height ? `${quality.height}p` : ''}`.trim(),
        url: quality.url,
        quality: quality.height ? `${quality.height}p` : base.quality,
        type: /\.m3u8(?:\?|$)/i.test(quality.url) ? 'hls' : base.type,
      }));

    return [base, ...qualitySources];
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!ALLOWED_TYPES.has(type) || !id || !IDENTIFIER_PATTERN.test(id)) {
    return NextResponse.json({ error: 'A valid type and id are required.' }, { status: 400 });
  }
  if (type === 'tv' && (!POSITIVE_INTEGER_PATTERN.test(season || '') || !POSITIVE_INTEGER_PATTERN.test(episode || ''))) {
    return NextResponse.json({ error: 'Valid season and episode numbers are required for TV sources.' }, { status: 400 });
  }

  const sourceApiUrl = process.env.SOURCE_API_URL;
  if (!sourceApiUrl) {
    return NextResponse.json(
      { error: 'Direct source playback is not configured. Set SOURCE_API_URL in project Vars.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const upstreamUrl = new URL(sourceApiUrl);
    if (!['https:', 'http:'].includes(upstreamUrl.protocol)) {
      return NextResponse.json({ error: 'SOURCE_API_URL must use HTTP or HTTPS.' }, { status: 500 });
    }
    upstreamUrl.searchParams.set('type', type);
    upstreamUrl.searchParams.set('id', id);
    if (season) upstreamUrl.searchParams.set('season', season);
    if (episode) upstreamUrl.searchParams.set('episode', episode);

    const headers = { Accept: 'application/json' };
    if (process.env.SOURCE_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.SOURCE_API_TOKEN}`;
    }

    const response = await fetch(upstreamUrl, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `The configured source server returned HTTP ${response.status}.` },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const payload = await response.json();
    const sources = normalizeSources(payload);
    if (!sources.length) {
      return NextResponse.json(
        { error: 'The source server returned no playable MP4 or HLS streams.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json({ sources }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return NextResponse.json(
      { error: timedOut ? 'The source server took too long to respond.' : 'Unable to reach the configured source server.' },
      { status: timedOut ? 504 : 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
