import { NextResponse } from 'next/server';

const ALLOWED_TYPES = new Set(['movie', 'tv']);

function isHttpUrl(value) {
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
    : payload?.sources || payload?.data?.sources || payload?.streams || payload?.data?.streams || [];

  return candidates
    .map((source, index) => {
      const url = typeof source === 'string'
        ? source
        : source?.url || source?.file || source?.src || source?.stream_url;

      if (!isHttpUrl(url)) return null;

      const kind = typeof source === 'object' && source?.type
        ? source.type
        : /\.m3u8(?:\?|$)/i.test(url) ? 'hls' : 'mp4';

      return {
        id: String(source?.id || `source-${index + 1}`),
        name: String(source?.name || source?.label || `Source ${index + 1}`),
        url,
        type: kind === 'hls' || kind === 'application/vnd.apple.mpegurl' ? 'hls' : 'mp4',
        quality: source?.quality ? String(source.quality) : null,
      };
    })
    .filter(Boolean);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const sourceApiUrl = process.env.SOURCE_API_URL;

  if (!ALLOWED_TYPES.has(type) || !id) {
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
  }

  if (!sourceApiUrl) {
    return NextResponse.json(
      { error: 'Direct source playback is not configured. Set SOURCE_API_URL on the server.' },
      { status: 503 },
    );
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(sourceApiUrl);
    upstreamUrl.searchParams.set('type', type);
    upstreamUrl.searchParams.set('id', id);
    if (season) upstreamUrl.searchParams.set('season', season);
    if (episode) upstreamUrl.searchParams.set('episode', episode);
  } catch {
    return NextResponse.json({ error: 'SOURCE_API_URL is invalid' }, { status: 500 });
  }

  try {
    const headers = { Accept: 'application/json' };
    if (process.env.SOURCE_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.SOURCE_API_TOKEN}`;
    }

    const response = await fetch(upstreamUrl, {
      headers,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Source server returned HTTP ${response.status}` },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const sources = normalizeSources(payload);
    if (!sources.length) {
      return NextResponse.json({ error: 'Source server returned no playable sources' }, { status: 404 });
    }

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Direct source API request failed:', error);
    return NextResponse.json({ error: 'Unable to reach the configured source server' }, { status: 502 });
  }
}
