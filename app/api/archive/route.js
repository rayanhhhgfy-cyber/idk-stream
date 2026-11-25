// Internet Archive provider — mirrors Lumi's Archive server.
// Searches archive.org's public movie catalog for the title and returns
// direct playable file URLs (MP4 / Ogg / HLS) plus alternatives.
// Only returns a match when the archive title really contains the
// requested title as a phrase — never a wrong film.
export const dynamic = 'force-dynamic';

const ARCHIVE = 'https://archive.org';
const UA = { 'User-Agent': 'idk-stream/1.0' };

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Phrase-based scoring only: exact / starts-with / contains the title.
// Word-bag matches (e.g. "Club Fight" for "Fight Club") score 0 on purpose.
function titleScore(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 90;
  if (c.includes(q)) return 80;
  return 0;
}

function contentTypeFor(file) {
  if (/\.m3u8($|\?)/i.test(file)) return 'application/x-mpegurl';
  if (/\.ogv$/i.test(file)) return 'video/ogg';
  if (/\.webm$/i.test(file)) return 'video/webm';
  return 'video/mp4';
}

function isTrailerItem(meta) {
  const values = [];
  const subject = meta?.metadata?.subject;
  if (typeof subject === 'string') values.push(subject);
  else if (Array.isArray(subject)) values.push(...subject);
  const collection = meta?.metadata?.collection;
  if (typeof collection === 'string') values.push(collection);
  else if (Array.isArray(collection)) values.push(...collection);
  return values.some(
    (v) => typeof v === 'string' && /trailer/i.test(v),
  );
}

function pickFiles(files, identifier, minLengthSeconds = 1800) {
  const playable = (files || [])
    .filter((f) => f && f.name && /\.(mp4|m4v|ogv|webm|m3u8)$/i.test(f.name))
    .filter((f) => !/sample|trailer|preview|thumb/i.test(f.name))
    .filter((f) => {
      // A clip or trailer is not the film: drop files far too short to be
      // the title. Archive metadata carries `length` in seconds and `size`
      // in bytes; use length when known, else fall back to file size.
      const length = Number.parseFloat(f.length);
      if (Number.isFinite(length)) return length >= minLengthSeconds;
      const size = Number.parseInt(f.size, 10);
      return !Number.isFinite(size) || size >= 50_000_000;
    });
  // Prefer SD 512kb files (small, fast to start), then any mp4, then HLS
  playable.sort((a, b) => {
    const score = (f) =>
      (f.name.includes('512kb') ? 3 : 0) +
      (/\.mp4$/i.test(f.name) ? 2 : 0) +
      (/\.m3u8$/i.test(f.name) ? 1 : 0);
    return score(b) - score(a);
  });
  return playable.slice(0, 4).map((f) => ({
    streamUrl: `${ARCHIVE}/download/${identifier}/${encodeURIComponent(f.name)}`,
    contentType: contentTypeFor(f.name),
    file: f.name,
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || '').trim();
  const year = (searchParams.get('year') || '').trim();
  // Feature films run 30+ minutes, TV episodes 10+; anything shorter is a
  // clip or trailer and must never be served as the title itself.
  const minLengthSeconds =
    searchParams.get('type') === 'tv' ? 600 : 1800;
  if (!title) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  try {
    const q = `title:(${title}) AND mediatype:(movies)`;
    const searchUrl = `${ARCHIVE}/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=year&rows=20&sort[]=downloads+desc&output=json`;
    const res = await fetch(searchUrl, { cache: 'no-store', headers: UA });
    if (!res.ok) throw new Error(`archive search failed: ${res.status}`);
    const data = await res.json();
    const docs = (data?.response?.docs || []).slice(0, 8);

    const scored = docs
      .map((d) => ({ ...d, score: titleScore(title, d.title) }))
      .filter((d) => d.score >= 80)
      .sort((a, b) => b.score - a.score);

    // Prefer a same-year match when a year was given
    if (year) {
      scored.sort((a, b) => {
        const ay = String(a.year || '').startsWith(year) ? 1 : 0;
        const by = String(b.year || '').startsWith(year) ? 1 : 0;
        return by - ay || b.score - a.score;
      });
    }

    const metas = await Promise.all(
      scored.slice(0, 4).map(async (doc) => {
        try {
          const metaRes = await fetch(`${ARCHIVE}/metadata/${doc.identifier}`, {
            cache: 'no-store',
            headers: UA,
          });
          if (!metaRes.ok) return null;
          const meta = await metaRes.json();
          if (isTrailerItem(meta)) return null;
          const files = pickFiles(meta?.files, doc.identifier, minLengthSeconds);
          return files.length ? { doc, files } : null;
        } catch {
          return null;
        }
      }),
    );

    const hit = metas.find(Boolean);
    if (!hit) {
      return Response.json(
        { error: 'No free copy found on Internet Archive for this title.' },
        { status: 404 },
      );
    }

    const [first, ...rest] = hit.files;
    return Response.json({
      streamUrl: first.streamUrl,
      contentType: first.contentType,
      title: hit.doc.title || title,
      identifier: hit.doc.identifier,
      alternatives: rest.map((f) => ({ ...f, title: hit.doc.title || title })),
    });
  } catch (err) {
    return Response.json({ error: err?.message || 'Archive lookup failed' }, { status: 502 });
  }
}
