'use strict';
// Agen AI dengan tool-use. Provider: Anthropic Messages API atau OpenAI-compatible (OpenAI, OpenRouter, Ollama, dst).
const TOOLS = [
  {
    name: 'get_datetime',
    description: 'Ambil tanggal dan waktu lokal sekarang.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_now_playing',
    description: 'Ambil info lagu yang sedang diputar di komputer pengguna.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'media_control',
    description: 'Kontrol pemutar musik: play_pause, next, atau previous.',
    parameters: {
      type: 'object',
      properties: { action: { type: 'string', enum: ['play_pause', 'next', 'previous'] } },
      required: ['action'],
    },
  },
  {
    name: 'show_notification',
    description: 'Tampilkan popup notifikasi di notch.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', enum: ['info', 'success', 'warn', 'error'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'set_timer',
    description: 'Setel timer/pengingat. Notch akan memunculkan popup saat waktu habis.',
    parameters: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'Durasi dalam detik (1 - 86400)' },
        label: { type: 'string' },
      },
      required: ['seconds'],
    },
  },
  {
    name: 'open_url',
    description: 'Buka URL http/https di browser default pengguna.',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
];

function fmtDate() {
  return new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });
}

async function runTool(name, args, ctx) {
  args = args || {};
  switch (name) {
    case 'get_datetime':
      return fmtDate();
    case 'get_now_playing': {
      const m = ctx.getMedia();
      if (!m || !m.active) return 'Tidak ada media yang diputar.';
      return JSON.stringify({ status: m.status, title: m.title, artist: m.artist, album: m.album, app: m.app });
    }
    case 'media_control': {
      const map = { play_pause: 'playpause', next: 'next', previous: 'prev' };
      if (!map[args.action]) return 'action tidak valid';
      ctx.mediaCmd(map[args.action]);
      return 'ok';
    }
    case 'show_notification':
      ctx.notify({ title: args.title, message: args.message, type: args.type || 'info', app: 'AI' });
      return 'ok';
    case 'set_timer': {
      const sec = Math.round(Number(args.seconds));
      if (!(sec >= 1 && sec <= 86400)) return 'seconds harus 1..86400';
      const label = String(args.label || 'Timer selesai').slice(0, 80);
      ctx.setTimer(sec, label);
      return `timer ${sec} detik diset`;
    }
    case 'open_url': {
      let u;
      try {
        u = new URL(String(args.url));
      } catch (_) {
        return 'URL tidak valid';
      }
      if (!['http:', 'https:'].includes(u.protocol)) return 'hanya http/https';
      ctx.openUrl(u.toString());
      return 'ok';
    }
    default:
      return 'tool tidak dikenal';
  }
}

async function post(url, headers, body, ms = 60000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      /* bukan json */
    }
    if (!res.ok) {
      const msg = (json && (json.error && (json.error.message || json.error))) || text.slice(0, 200);
      throw new Error(`HTTP ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function chatAnthropic(cfg, messages, ctx, actions) {
  if (!cfg.anthropicKey) throw new Error('API key Anthropic belum diisi (Settings > AI).');
  const tools = TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = 0; i < 6; i++) {
    const r = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': cfg.anthropicKey, 'anthropic-version': '2023-06-01' },
      { model: cfg.anthropicModel, max_tokens: 1024, system: cfg.system, messages: msgs, tools }
    );
    const blocks = r.content || [];
    const uses = blocks.filter((b) => b.type === 'tool_use');
    if (!uses.length) return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    msgs.push({ role: 'assistant', content: blocks });
    const results = [];
    for (const u of uses) {
      const out = await runTool(u.name, u.input, ctx);
      actions.push({ tool: u.name, args: u.input, result: String(out).slice(0, 120) });
      results.push({ type: 'tool_result', tool_use_id: u.id, content: String(out) });
    }
    msgs.push({ role: 'user', content: results });
  }
  return '(terlalu banyak langkah tool)';
}

async function chatOpenAI(cfg, messages, ctx, actions) {
  if (!cfg.openaiKey && !/localhost|127\.0\.0\.1/.test(cfg.openaiBaseUrl)) {
    throw new Error('API key belum diisi (Settings > AI).');
  }
  const base = cfg.openaiBaseUrl.replace(/\/+$/, '');
  const tools = TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
  const msgs = [{ role: 'system', content: cfg.system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const headers = cfg.openaiKey ? { authorization: `Bearer ${cfg.openaiKey}` } : {};
  for (let i = 0; i < 6; i++) {
    const r = await post(`${base}/chat/completions`, headers, { model: cfg.openaiModel, messages: msgs, tools });
    const msg = r.choices && r.choices[0] && r.choices[0].message;
    if (!msg) throw new Error('Respons kosong dari provider.');
    const calls = msg.tool_calls || [];
    if (!calls.length) return String(msg.content || '').trim();
    msgs.push(msg);
    for (const c of calls) {
      let args = {};
      try {
        args = JSON.parse(c.function.arguments || '{}');
      } catch (_) {
        /* args rusak */
      }
      const out = await runTool(c.function.name, args, ctx);
      actions.push({ tool: c.function.name, args, result: String(out).slice(0, 120) });
      msgs.push({ role: 'tool', tool_call_id: c.id, content: String(out) });
    }
  }
  return '(terlalu banyak langkah tool)';
}

async function chat(cfg, messages, ctx) {
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20);
  const actions = [];
  const reply =
    cfg.provider === 'openai' ? await chatOpenAI(cfg, clean, ctx, actions) : await chatAnthropic(cfg, clean, ctx, actions);
  return { reply: reply || '(tidak ada jawaban)', actions };
}

module.exports = { chat, runTool, TOOLS };
