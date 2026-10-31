import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { path } = await params;
  const providerUrl = `https://vidsrc.pm/assets/${path.join('/')}`;

  try {
    const response = await fetch(providerUrl, {
      headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://vidsrc.pm/' },
      cache: 'no-store',
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/javascript',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[provider-assets] proxy failed', error);
    return NextResponse.json({ error: 'Provider asset unavailable.' }, { status: 502 });
  }
}
