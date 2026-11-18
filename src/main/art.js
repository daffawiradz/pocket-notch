'use strict';
// Cover album cadangan (bila Windows/Spotify tidak memberi gambar): iTunes Search API, gratis tanpa key.
const UA = 'PocketNotch/1.0';
const cache = new Map();
let doFetch = (...a) => fetch(...a);
function _setFetch(f) {
  doFetch = f || ((...a) => fetch(...a));
}

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
    .split(/[^a-z0-9À-￿]+/)
    .filter(Boolean);

function sim(a, b) {
  const x = words(a);
  const y = new Set(words(b));
  if (!x.length || !y.size) return 0;
  return x.filter((w) => y.has(w)).length / Math.max(x.length, y.size);
}

async function getJson(url, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await doFetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// pilih hasil terbaik: judul + artis harus mirip; album yang sama diutamakan
function pick(results, { title, artist, album }) {
  let best = null;
  for (const r of results || []) {
    if (!r || !r.artworkUrl100) continue;
    const ts = sim(r.trackName, title);
    const as = artist ? sim(r.artistName, artist.split(/\s*(?:,|&|;|\bfeat\.?\b)\s*/i)[0]) : 0.5;
    if (ts < 0.5 || as < 0.3) continue;
    const al = album ? sim(r.collectionName, album) : 0;
    const sc = ts * 2 + as + al * 1.5;
    if (!best || sc > best.sc) best = { r, sc };
  }
  return best && best.r;
}

async function findArt(track) {
  const title = String(track.title || '').trim();
  if (!title) return null;
  const key = `${track.artist}|${title}|${track.album || ''}`;
  if (cache.has(key)) return cache.get(key);
  const q = new URLSearchParams({ term: `${track.artist || ''} ${title}`.trim(), media: 'music', entity: 'song', limit: '10' });
  const data = await getJson(`https://itunes.apple.com/search?${q}`);
  const hit = pick(data && data.results, track);
  let out = null;
  if (hit) {
    const url = hit.artworkUrl100.replace(/\/\d+x\d+(bb)?\./, '/512x512bb.');
    try {
      const res = await doFetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 500 && buf.length < 2_000_000) out = `data:image/jpeg;base64,${buf.toString('base64')}`;
      }
    } catch (_) {
      /* abaikan */
    }
  }
  cache.set(key, out);
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return out;
}

module.exports = { findArt, pick, _setFetch };
