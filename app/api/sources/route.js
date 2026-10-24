import { NextResponse } from 'next/server';

const ALLOWED_TYPES = new Set(['movie', 'tv']);
const DEFAULT_VIDSRCPM_SOURCES = ['k2mq', 'p9fx', 'b4tz', 'w7dn', 'r3yk'];

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
    .flatMap((source, index) => {
      const url = typeof source === 'string'
        ? source
        : source?.url || source?.file || source?.src || source?.stream_url;
      if (!isHttpUrl(url)) return [];

      const kind = typeof source === 'object' && source?.type
        ? source.type
        : /\.m3u8(?:\?|$)/i.test(url) ? 'hls' : 'mp4';
      const base = {
        id: String(source?.id || `source-${index + 1}`),
        name: String(source?.name || source?.label || `Source ${index + 1}`),
        url,
        type: kind === 'hls' || kind === 'application/vnd.apple.mpegurl' ? 'hls' : 'mp4',
        quality: source?.quality ? String(source.quality) : null,
        tracks: Array.isArray(source?.tracks) ? source.tracks : [],
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
        }));

      return [base, ...qualitySources];
    });
}

function buildProviderPath(type, id, season, episode) {
  return type === 'tv'
    ? `/v1/tv/${encodeURIComponent(id)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`
    : `/v1/movie/${encodeURIComponent(id)}`;
}

async function fetchVidSrcPm(type, id, season, episode) {
  const baseUrl = process.env.VIDSRCPM_API_URL || 'https://vidsrc.pm/api/vidora';
  const playerKey = process.env.VIDSRCPM_PLAYER_KEY;
  if (!playerKey) {
    throw new Error('VIDSRCPM_PLAYER_KEY is not configured');
  }

  const sourceKeys = (process.env.VIDSRCPM_SOURCE_KEYS || DEFAULT_VIDSRCPM_SOURCES.join(','))
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const path = buildProviderPath(type, id, season, episode);

  const responses = await Promise.all(sourceKeys.map(async (sourceKey) => {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
    url.searchParams.set('source', sourceKey);
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'x-player-key': playerKey },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return response.json();
  }));

  return responses
    .filter((payload) => payload?.result && Array.isArray(payload.sources))
    .flatMap((payload) => payload.sources.map((source) => ({
      ...source,
      name: source.source ? `vidsrc.pm · ${source.source}` : 'vidsrc.pm',
      tracks: source.tracks || [],
      qualities: source.qualities || [],
    })));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const sourceProvider = process.env.SOURCE_PROVIDER;
  const sourceApiUrl = process.env.SOURCE_API_URL;

  if (!ALLOWED_TYPES.has(type) || !id) {
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
  }
  if (type === 'tv' && (!season || !episode)) {
    return NextResponse.json({ error: 'season and episode are required for TV sources' }, { status: 400 });
  }

  try {
    const payload = sourceProvider === 'vidsrc.pm'
      ? await fetchVidSrcPm(type, id, season, episode)
      : await fetchConfiguredSource(sourceApiUrl, type, id, season, episode);
    const sources = normalizeSources(payload);
    if (!sources.length) {
      return NextResponse.json({ error: 'Source server returned no playable sources' }, { status: 404 });
    }
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Direct source API request failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to reach the configured source server' }, { status: 502 });
  }
}

async function fetchConfiguredSource(sourceApiUrl, type, id, season, episode) {
  if (!sourceApiUrl) {
    throw new Error('Direct source playback is not configured. Set SOURCE_API_URL or SOURCE_PROVIDER=vidsrc.pm.');
  }

  const upstreamUrl = new URL(sourceApiUrl);
  upstreamUrl.searchParams.set('type', type);
  upstreamUrl.searchParams.set('id', id);
  if (season) upstreamUrl.searchParams.set('season', season);
  if (episode) upstreamUrl.searchParams.set('episode', episode);

  const headers = { Accept: 'application/json' };
  if (process.env.SOURCE_API_TOKEN) headers.Authorization = `Bearer ${process.env.SOURCE_API_TOKEN}`;
  const response = await fetch(upstreamUrl, { headers, next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Source server returned HTTP ${response.status}`);
  return response.json();
}
