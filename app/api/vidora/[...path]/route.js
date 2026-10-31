import { NextResponse } from 'next/server';

const PLAYER_KEY = 'f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { path } = await params;
  const incoming = new URL(request.url);
  const providerUrl = `https://vidsrc.pm/api/vidora/${path.join('/')}${incoming.search}`;

  try {
    const response = await fetch(providerUrl, {
      headers: {
        'x-player-key': PLAYER_KEY,
        'user-agent': 'Mozilla/5.0',
        referer: 'https://vidsrc.pm/',
      },
      cache: 'no-store',
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[vidora] proxy failed', error);
    return NextResponse.json({ error: 'Provider API unavailable.' }, { status: 502 });
  }
}
