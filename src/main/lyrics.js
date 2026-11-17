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

function clean(s) {
  return String(s || '')
    .replace(/\s*[\(\[][^\)\]]*(official|video|audio|lyrics?|lyric video|visuali[sz]er|hd|hq|4k|remaster(ed)?|mv|m\/v)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(feat|ft)\.?[^\)\]]*[\)\]]/gi, '')
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

async function getJson(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickBest(list, dur) {
  const withSync = (list || []).filter((x) => x && x.syncedLyrics);
  if (!withSync.length) return null;
  if (!dur) return withSync[0];
  return withSync.sort((a, b) => Math.abs((a.duration || 0) - dur) - Math.abs((b.duration || 0) - dur))[0];
}

async function fetchLyrics(track) {
  const n = normalize(track);
  if (!n.title) return null;
  const dur = Math.round(track.dur || 0);
  const key = `${n.artist}|${n.title}|${dur}`;
  if (cache.has(key)) return cache.get(key);

  const base = 'https://lrclib.net/api';
  let hit = null;

  if (n.artist) {
    const q = new URLSearchParams({ track_name: n.title, artist_name: n.artist });
    if (n.album) q.set('album_name', n.album);
    if (dur) q.set('duration', String(dur));
    const r = await getJson(`${base}/get?${q}`);
    if (r && r.syncedLyrics) hit = r;
  }
  if (!hit) {
    const q = new URLSearchParams({ track_name: n.title });
    if (n.artist) q.set('artist_name', n.artist);
    hit = pickBest(await getJson(`${base}/search?${q}`), dur);
  }
  if (!hit) {
    const q = new URLSearchParams({ q: `${n.artist} ${n.title}`.trim() });
    hit = pickBest(await getJson(`${base}/search?${q}`), dur);
  }

  const result = hit
    ? { lines: parseLrc(hit.syncedLyrics), title: hit.trackName, artist: hit.artistName }
    : null;
  cache.set(key, result);
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return result;
}

module.exports = { fetchLyrics, parseLrc, normalize };
