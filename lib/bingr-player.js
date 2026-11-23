// Bingr direct player — ported from Lumi (superhexa/lumi).
// Media URLs discovered through Bingr's public API. Keep the relay bounded to
// known media hosts: it must never become an arbitrary URL proxy.
const MEDIA_HOSTS = new Set([
  'futurefocusedentrepreneurs.site',
  'remoteconsultinggroup.site',
  'digitalassetlaunchpad.site',
  'sacdn.hakunaymatata.com',
  'img.rousav.tech',
  'hakunamatata.rousav.tech',
  'lingering-sky-2e99.badrishhmehar.workers.dev',
  'dash-hls-bridge.johndoesdmc.workers.dev',
  'dash-hls-bridge.johndoesfmc.workers.dev',
  'img1.hscow.com',
  'img2.hscow.com',
  'proxy.streamrip.fun',
]);

export function validateBingrMediaUrl(value) {
  const url = new URL(value);
  const allowedByPattern =
    url.hostname.endsWith('.workers.dev') ||
    url.hostname.endsWith('.streamrip.fun') ||
    url.hostname.endsWith('.bingr.one') ||
    url.hostname.endsWith('.hscow.com') ||
    url.hostname.endsWith('.rousav.tech') ||
    url.hostname.endsWith('.hakunaymatata.com') ||
    url.hostname.endsWith('.cloudfront.net');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (!MEDIA_HOSTS.has(url.hostname) && !allowedByPattern)
  )
    throw new Error('Unsupported media host');
  url.hash = '';
  return url;
}

export function unwrapBingrMediaUrl(value) {
  let url = new URL(value);
  for (let depth = 0; depth < 4; depth++) {
    if (
      url.hostname !== 'wormhole.filmu.in' &&
      !url.hostname.endsWith('.bingr.one')
    )
      break;
    const upstream = url.searchParams.get('url');
    if (!upstream) throw new Error('Missing upstream media URL');
    url = new URL(upstream);
  }
  return validateBingrMediaUrl(url.href);
}

export function bingrMediaProxyUrl(value) {
  return `/api/player/media?url=${encodeURIComponent(validateBingrMediaUrl(value).href)}`;
}

export function rewriteBingrPlaylist(body, base) {
  if (!body.trimStart().startsWith('#EXTM3U'))
    throw new Error('Invalid playlist');
  const rewrite = (uri) => bingrMediaProxyUrl(new URL(uri, base).href);
  return body
    .split(/\r?\n/)
    .map((line) => {
      if (!line || !line.trim()) return line;
      if (line.startsWith('#')) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri) => `URI="${rewrite(uri)}"`,
        );
      }
      return rewrite(line.trim());
    })
    .join('\n');
}
