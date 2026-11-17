'use strict';
// Test logika murni (tanpa Electron): node test/run.js
const assert = require('assert');
const http = require('http');
const { parseLrc, normalize } = require('../src/main/lyrics');
const { createServer, normalize: normN } = require('../src/main/notify-server');
const ai = require('../src/main/ai');
const PX = require('../src/shared/personas');
const { createRouter, SAMPLES } = require('../src/main/device-router');

let pass = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { console.error('  FAIL', name, '\n', e); process.exitCode = 1; }
};

(async () => {
  await t('parseLrc basic + multi stamp + offset', () => {
    const l = parseLrc('[offset:+500]\n[00:10.50]Hello\n[00:05.00][01:00.00]Chorus\n[00:20]\n');
    assert.deepStrictEqual(l.map((x) => x.text), ['Chorus', 'Hello', '', 'Chorus']);
    assert.strictEqual(l[0].t, 4.5);
    assert.strictEqual(l[1].t, 10);
  });

  await t('normalize youtube-style title', () => {
    const n = normalize({ title: 'Daft Punk - Get Lucky (Official Video)', artist: 'Daft Punk VEVO', album: '' });
    assert.strictEqual(n.title, 'Get Lucky');
    assert.strictEqual(n.artist, 'Daft Punk');
  });

  await t('normalize spotify keeps fields', () => {
    const n = normalize({ title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' });
    assert.deepStrictEqual(n, { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' });
  });

  await t('notify normalize clamps + defaults', () => {
    const n = normN({ type: 'bogus', title: 'x'.repeat(500), duration: 999 });
    assert.strictEqual(n.type, 'info');
    assert.strictEqual(n.title.length, 80);
    assert.strictEqual(n.duration, 30);
    assert.strictEqual(normN({ type: 'sent' }).title, 'Pesan terkirim');
  });

  await t('notify http server: POST, GET, token, origin guard', async () => {
    const got = [];
    let settings = { token: '' };
    const srv = createServer({ getSettings: () => settings, onNotify: (n) => got.push(n), log: { error() {} } });
    assert.ok(await srv.start(48999));
    const req = (method, path, body, headers = {}) => new Promise((res) => {
      const r = http.request({ host: '127.0.0.1', port: 48999, method, path, headers: { 'content-type': 'application/json', ...headers } }, (rs) => {
        let d = ''; rs.on('data', (c) => (d += c)); rs.on('end', () => res({ code: rs.statusCode, body: d }));
      });
      if (body) r.write(body); r.end();
    });
    assert.strictEqual((await req('POST', '/notify', JSON.stringify({ title: 'A', type: 'sent' }))).code, 200);
    assert.strictEqual((await req('GET', '/notify?title=B&message=hi')).code, 200);
    assert.strictEqual((await req('POST', '/notify', '{bad')).code, 400);
    assert.strictEqual((await req('GET', '/nope')).code, 404);
    assert.strictEqual((await req('POST', '/notify', '{}', { origin: 'https://evil.com' })).code, 401, 'origin tanpa token ditolak');
    settings = { token: 'secret' };
    assert.strictEqual((await req('POST', '/notify', '{}')).code, 401);
    assert.strictEqual((await req('POST', '/notify', JSON.stringify({ title: 'C' }), { authorization: 'Bearer secret' })).code, 200);
    assert.deepStrictEqual(got.map((n) => n.title), ['A', 'B', 'C']);
    srv.stop();
  });

  const ctxBase = () => {
    const log = [];
    return {
      log,
      getMedia: () => ({ active: true, status: 'Playing', title: 'T', artist: 'A', album: 'B', app: 'Spotify.exe' }),
      mediaCmd: (c) => log.push(['media', c]),
      notify: (n) => log.push(['notify', n.title]),
      setTimer: (s, l) => log.push(['timer', s, l]),
      openUrl: (u) => log.push(['url', u]),
    };
  };

  await t('ai tools: validation', async () => {
    const c = ctxBase();
    assert.strictEqual(await ai.runTool('media_control', { action: 'next' }, c), 'ok');
    assert.strictEqual(await ai.runTool('media_control', { action: 'rm -rf' }, c), 'action tidak valid');
    assert.strictEqual(await ai.runTool('set_timer', { seconds: 0 }, c), 'seconds harus 1..86400');
    assert.match(await ai.runTool('set_timer', { seconds: 300, label: 'teh' }, c), /300/);
    assert.strictEqual(await ai.runTool('open_url', { url: 'file:///etc/passwd' }, c), 'hanya http/https');
    assert.strictEqual(await ai.runTool('open_url', { url: 'javascript:alert(1)' }, c), 'hanya http/https');
    assert.strictEqual(await ai.runTool('open_url', { url: 'https://example.com' }, c), 'ok');
    assert.deepStrictEqual(c.log, [['media', 'next'], ['timer', 300, 'teh'], ['url', 'https://example.com/']]);
  });

  await t('ai anthropic: tool loop', async () => {
    const calls = [];
    global.fetch = async (url, opt) => {
      const body = JSON.parse(opt.body);
      calls.push({ url, headers: opt.headers, body });
      const first = calls.length === 1;
      const json = first
        ? { content: [{ type: 'text', text: 'ok' }, { type: 'tool_use', id: 'tu1', name: 'media_control', input: { action: 'next' } }] }
        : { content: [{ type: 'text', text: 'Sudah lanjut.' }] };
      return { ok: true, status: 200, text: async () => JSON.stringify(json) };
    };
    const c = ctxBase();
    const r = await ai.chat({ provider: 'anthropic', anthropicKey: 'k', anthropicModel: 'm', system: 's' }, [{ role: 'user', content: 'next' }], c);
    assert.strictEqual(r.reply, 'Sudah lanjut.');
    assert.strictEqual(r.actions[0].tool, 'media_control');
    assert.deepStrictEqual(c.log, [['media', 'next']]);
    assert.strictEqual(calls[0].headers['x-api-key'], 'k');
    const last = calls[1].body.messages.at(-1);
    assert.strictEqual(last.content[0].type, 'tool_result');
    assert.strictEqual(last.content[0].tool_use_id, 'tu1');
  });

  await t('ai openai: tool loop + error surfaces', async () => {
    let n = 0;
    global.fetch = async (url, opt) => {
      n++;
      const json = n === 1
        ? { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_datetime', arguments: '{}' } }] } }] }
        : { choices: [{ message: { role: 'assistant', content: 'Sekarang jam sekian.' } }] };
      return { ok: true, status: 200, text: async () => JSON.stringify(json) };
    };
    const r = await ai.chat({ provider: 'openai', openaiBaseUrl: 'https://x/v1/', openaiKey: 'k', openaiModel: 'm', system: 's' }, [{ role: 'user', content: 'jam?' }], ctxBase());
    assert.strictEqual(r.reply, 'Sekarang jam sekian.');
    global.fetch = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ error: { message: 'bad key' } }) });
    await assert.rejects(() => ai.chat({ provider: 'anthropic', anthropicKey: 'k', anthropicModel: 'm', system: '' }, [{ role: 'user', content: 'x' }], ctxBase()), /bad key/);
    await assert.rejects(() => ai.chat({ provider: 'anthropic', anthropicKey: '', anthropicModel: 'm', system: '' }, [{ role: 'user', content: 'x' }], ctxBase()), /belum diisi/);
  });

  await t('personas: semua kunci dialog ada & placeholder terisi', () => {
    const keys = Object.keys(PX.PERSONAS.poki.lines);
    for (const [id, p] of Object.entries(PX.PERSONAS)) {
      assert.deepStrictEqual(Object.keys(p.lines).sort(), keys.slice().sort(), id);
      for (const k of keys) {
        assert.ok(p.lines[k].length >= 1, `${id}.${k}`);
        const out = PX.line({ persona: id, userName: 'Rina' }, k, { title: 'Lagu X' });
        assert.ok(!/\{(user|title)\}/.test(out), `${id}.${k}: ${out}`);
      }
    }
    assert.match(PX.line({ persona: 'poki', userName: '' }, 'water'), /kamu/);
  });

  await t('personas: prompt AI memuat nama & panggilan', () => {
    const pr = PX.buildPrompt({ persona: 'nova', name: 'Zed', userName: 'Kak Rina' });
    assert.match(pr, /Kamu adalah Zed,/);
    assert.match(pr, /Kak Rina/);
    assert.strictEqual(PX.resolve({ persona: 'unknown' }).id, 'poki');
  });

  const mkRouter = (cfg = {}) => {
    const out = { notes: [], huds: [], timers: [] };
    const base = { volume: true, mic: true, brightness: true, capslock: true, wifi: true, bluetooth: true, battery: true, usb: true, audioOut: true, lowBattery: 20 };
    const r = createRouter({
      getCfg: () => ({ ...base, ...cfg }),
      notify: (n) => out.notes.push(n),
      hud: (h) => out.huds.push(h),
      setTimer: (fn) => out.timers.push(fn) && out.timers.length,
      clearTimer: (id) => (out.timers[id - 1] = null),
    });
    out.r = r;
    out.flush = () => { out.timers.splice(0).forEach((f) => f && f()); };
    return out;
  };

  await t('router: event init tidak memicu popup', () => {
    const o = mkRouter();
    [{ ev: 'volume', v: 0.5, muted: false, init: true }, { ev: 'net', state: 'connected', kind: 'wifi', name: 'A', init: true },
     { ev: 'bt', state: 'connected', name: 'X', init: true }, { ev: 'power', ac: false, pct: 10, init: true },
     { ev: 'caps', on: true, init: true }, { ev: 'audioout', name: 'Spk', init: true }].forEach((e) => o.r.handle(e));
    assert.strictEqual(o.notes.length + o.huds.length, 0);
  });

  await t('router: volume/mic/caps/brightness -> HUD', () => {
    const o = mkRouter();
    o.r.handle({ ev: 'volume', v: 0.3, muted: false });
    o.r.handle({ ev: 'mic', muted: true });
    o.r.handle({ ev: 'caps', on: true });
    o.r.handle({ ev: 'brightness', v: 60 });
    assert.deepStrictEqual(o.huds.map((h) => h.kind), ['volume', 'mic', 'caps', 'brightness']);
    assert.strictEqual(o.huds[1].on, false);
  });

  await t('router: wifi putus sesaat (roaming) diabaikan, putus lama muncul, tersambung muncul', () => {
    const o = mkRouter();
    o.r.handle({ ev: 'net', state: 'connected', kind: 'wifi', name: 'A', init: true });
    o.r.handle({ ev: 'net', state: 'disconnected' });
    o.r.handle({ ev: 'net', state: 'connected', kind: 'wifi', name: 'A' }); // balik cepat, nama sama
    o.flush();
    assert.strictEqual(o.notes.length, 0);
    o.r.handle({ ev: 'net', state: 'disconnected' });
    o.flush();
    assert.strictEqual(o.notes.at(-1).glyph, 'wifioff');
    o.r.handle({ ev: 'net', state: 'connected', kind: 'wifi', name: 'B', limited: true });
    assert.match(o.notes.at(-1).message, /B \(tanpa internet\)/);
    assert.strictEqual(o.notes.at(-1).speak, 'wifi_on');
  });

  await t('router: baterai rendah sekali, kritis, reset setelah charger', () => {
    const o = mkRouter();
    o.r.handle({ ev: 'power', ac: false, pct: 50, init: true });
    o.r.handle({ ev: 'power', ac: false, pct: 20 });
    o.r.handle({ ev: 'power', ac: false, pct: 19 });
    o.r.handle({ ev: 'power', ac: false, pct: 10 });
    o.r.handle({ ev: 'power', ac: false, pct: 9 });
    assert.deepStrictEqual(o.notes.map((n) => n.title), ['Baterai rendah', 'Baterai kritis']);
    o.r.handle({ ev: 'power', ac: true, pct: 9 });
    assert.strictEqual(o.notes.at(-1).title, 'Charger terhubung');
    o.r.handle({ ev: 'power', ac: false, pct: 15 });
    assert.strictEqual(o.notes.at(-1).title, 'Baterai rendah');
    o.r.handle({ ev: 'power', ac: true, pct: 100 });
    assert.strictEqual(o.notes.at(-1).title, 'Baterai penuh');
  });

  await t('router: bluetooth, usb, setting mati, sampel tes', () => {
    const o = mkRouter();
    o.r.handle({ ev: 'bt', state: 'connected', name: 'Buds' });
    o.r.handle({ ev: 'bt', state: 'connected', name: 'Buds' });
    o.r.handle({ ev: 'bt', state: 'disconnected', name: 'Buds' });
    o.r.handle({ ev: 'drive', state: 'connected', letter: 'E:\\', label: 'FD' });
    assert.deepStrictEqual(o.notes.map((n) => n.title), ['Bluetooth tersambung', 'Bluetooth terputus', 'USB terpasang']);
    assert.strictEqual(o.notes[2].message, 'FD (E:)');
    const off = mkRouter({ wifi: false, bluetooth: false, volume: false, battery: false, usb: false });
    Object.values(SAMPLES).flat().forEach((e) => off.r.handle(e));
    assert.ok(off.notes.every((n) => n.glyph === 'headphone'), 'hanya audioOut yang tersisa');
    assert.strictEqual(off.huds.filter((h) => h.kind === 'volume').length, 0);
  });

  console.log(`\n${pass} test lulus`);
})();
