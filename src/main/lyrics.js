'use strict';
// Lirik tersinkron dari LRCLIB (gratis, tanpa API key): https://lrclib.net
const UA = 'PocketNotch/1.0 (https://github.com/pocket-notch)';
const cache = new Map();

function parseLrc(text) {
  if (!text) return [];
  const lines = [];
  let offset = 0;
  const off = /\[offset:\s*([+-]?\d+)\]/i.exec(text);
  if (off) offset = parseInt(off[1], 10) / 1000;
  for (const raw of text.split(/\r?\n/)) {
    const re = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
    const stamps = [];
    let m;
    let lastIndex = 0;
    while ((m = re.exec(raw))) {
      stamps.push(parseInt(m[1], 10) * 60 + parseFloat(m[2]));
      lastIndex = re.lastIndex;
    }
    if (!stamps.length) continue;
    const t = raw.slice(lastIndex).trim();
    for (const s of stamps) lines.push({ t: Math.max(0, s - offset), text: t });
  }
  lines.sort((a, b) => a.t - b.t);
  return lines;
}

const NOISE_WORDS = /\b(official|video|audio|lyrics?|lyric video|visuali[sz]er|hd|hq|4k|remaster(ed)?|mv|m\/v)\b/i;
// akhiran " - Remastered 2011", " - Radio Edit", " - From "Film"" dst. (versi studio sama, hanya label)
const SUFFIX_NOISE = /\s+[-–—]\s+(?:\d{4}\s+)?(?:remaster(?:ed)?|radio edit|single version|album version|mono|stereo|deluxe|bonus track|explicit|from\b|original mix|\d{4}\s+version)[^]*$/i;

function clean(s) {
  return String(s || '')
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, (m) => (NOISE_WORDS.test(m) || /\b(feat|ft)\b\.?/i.test(m) ? '' : m))
    .replace(SUFFIX_NOISE, '')
    .replace(/\s+-\s+Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalize({ title, artist, album }) {
  let t = clean(title);
  let a = clean(artist);
  // Judul YouTube biasanya "Artis - Lagu"
  const sep = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (sep && (!a || t.toLowerCase().includes(a.toLowerCase()) || !artist)) {
    a = clean(sep[1]);
    t = clean(sep[2]);
  }
  return { title: t, artist: a, album: clean(album) };
}

let doFetch = (...args) => fetch(...args);
function _setFetch(f) {
  doFetch = f || ((...args) => fetch(...args));
}

async function getJson(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await doFetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9À-￿]+/)
    .filter(Boolean);

// 0..1: seberapa mirip dua teks (kata yang sama / kata terbanyak)
function sim(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  const ys = new Set(y);
  const common = x.filter((w) => ys.has(w)).length;
  return common / Math.max(x.length, y.length);
}

const MAX_DUR_DIFF = 10; // detik; lebih jauh = versi lain, lirik pasti geser

function score(item, want, dur) {
  if (!item || !item.syncedLyrics || item.instrumental) return null;
  const ts = Math.max(sim(item.trackName, want.title), sim(item.name, want.title));
  if (ts < 0.5) return null; // lagu lain
  let dd = 0;
  if (dur && item.duration) {
    dd = Math.abs(item.duration - dur);
    if (dd > MAX_DUR_DIFF) return null;
  }
  const as = want.artists.length ? Math.max(...want.artists.map((x) => sim(item.artistName, x))) : 1;
  return dd + (1 - ts) * 10 + (as > 0 ? 0 : 5);
}

function variants(track) {
  const n = normalize(track);
  const titles = [];
  const add = (arr, v) => v && !arr.includes(v) && arr.push(v);
  add(titles, n.title);
  add(titles, String(track.title || '').trim());
  add(titles, n.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim()); // tanpa tanda kurung
  const artists = [];
  add(artists, n.artist);
  add(artists, n.artist.split(/\s*(?:,|&|;|\bfeat\.?\b|\bft\.?\b|\bx\b|\band\b)\s*/i)[0]);
  return { n, titles: titles.filter(Boolean), artists: artists.filter(Boolean) };
}

async function fetchLyrics(track) {
  const { n, titles, artists } = variants(track);
  if (!n.title) return null;
  const dur = Math.round(track.dur || 0);
  const key = `${n.artist}|${n.title}|${dur}`;
  if (cache.has(key)) return cache.get(key);

  const base = 'https://lrclib.net/api';
  const want = { title: n.title, artists };
  const cands = [];
  const take = (r) => (Array.isArray(r) ? r : r ? [r] : []).forEach((x) => cands.push(x));
  const best = () => {
    let b = null;
    for (const c of cands) {
      const sc = score(c, want, dur);
      if (sc != null && (!b || sc < b.sc)) b = { c, sc };
    }
    return b;
  };

  // 1) pencocokan tepat (cepat): dengan & tanpa album
  if (artists[0]) {
    const mk = (withAlbum) => {
      const q = new URLSearchParams({ track_name: titles[0], artist_name: artists[0] });
      if (withAlbum && n.album) q.set('album_name', n.album);
      if (dur) q.set('duration', String(dur));
      return `${base}/get?${q}`;
    };
    const tries = n.album ? [mk(true), mk(false)] : [mk(false)];
    for (const u of tries) {
      take(await getJson(u));
      const b = best();
      if (b && b.sc <= 3) break;
    }
  }

  // 2) pencarian luas bila belum ada yang cukup dekat
  let b = best();
  if (!b || b.sc > 3) {
    const urls = [];
    for (const t of titles.slice(0, 2)) {
      for (const a of artists.length ? artists : ['']) {
        const q = new URLSearchParams({ track_name: t });
        if (a) q.set('artist_name', a);
        urls.push(`${base}/search?${q}`);
      }
    }
    urls.push(`${base}/search?${new URLSearchParams({ q: `${artists[0] || ''} ${titles[0]}`.trim() })}`);
    (await Promise.all([...new Set(urls)].slice(0, 5).map((u) => getJson(u)))).forEach(take);
    b = best();
  }

  const hit = b && b.c;
  const result = hit
    ? { lines: parseLrc(hit.syncedLyrics), title: hit.trackName, artist: hit.artistName, id: hit.id, duration: hit.duration }
    : null;
  if (result) console.log(`[lyrics] "${n.artist} - ${n.title}" (${dur}s) -> id ${hit.id} "${hit.artistName} - ${hit.trackName}" (${hit.duration}s)`);
  else console.log(`[lyrics] tidak ada yang cocok: "${n.artist} - ${n.title}" (${dur}s)`);
  cache.set(key, result);
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return result;
}

module.exports = { fetchLyrics, parseLrc, normalize, _setFetch };
