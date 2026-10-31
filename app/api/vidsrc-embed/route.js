import { NextResponse } from 'next/server';

const PROVIDER_ORIGIN = 'https://vidsrc.pm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';

  if (!/^\/embed\/(movie|tv)\/[a-zA-Z0-9/_-]+$/.test(path)) {
    return NextResponse.json({ error: 'Invalid embed path.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${PROVIDER_ORIGIN}${path}`, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        referer: `${PROVIDER_ORIGIN}/`,
      },
      cache: 'no-store',
    });
    const html = await response.text();

    if (!response.ok) {
      return new NextResponse(html, { status: response.status });
    }

    const rewritten = html
      .replaceAll('"/assets/', '"/api/provider-assets/')
      .replaceAll("'/assets/", "'/api/provider-assets/")
      .replaceAll('`/assets/', '`/api/provider-assets/');

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[vidsrc-embed] proxy failed', error);
    return NextResponse.json({ error: 'Provider unavailable.' }, { status: 502 });
  }
}
