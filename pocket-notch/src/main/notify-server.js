'use strict';
// Server lokal (127.0.0.1) agar aplikasi / bot / script lain bisa memunculkan popup di notch.
//   POST http://127.0.0.1:47321/notify   {"title":"Pesan terkirim","message":"Halo","type":"sent","app":"Freshchat"}
//   GET  http://127.0.0.1:47321/notify?title=Hai&message=Tes&type=info
const http = require('http');

const TYPES = ['info', 'sent', 'received', 'success', 'warn', 'error'];

function normalize(p) {
  const s = (v, n) => String(v == null ? '' : v).slice(0, n);
  const type = TYPES.includes(p.type) ? p.type : 'info';
  const dur = Number(p.duration);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: s(p.title || (type === 'sent' ? 'Pesan terkirim' : 'Notifikasi'), 80),
    message: s(p.message || p.body || '', 240),
    app: s(p.app || '', 40),
    type,
    icon: s(p.icon || '', 4),
    duration: Number.isFinite(dur) && dur > 0 ? Math.min(30, Math.max(1, dur)) : 0,
    time: Date.now(),
  };
}

function createServer({ getSettings, onNotify, log = console }) {
  let server = null;

  const handler = (req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    try {
      const settings = getSettings();
      const url = new URL(req.url, 'http://127.0.0.1');
      const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('token') || '';
      const tokenOk = settings.token ? auth === settings.token : true;
      // Request dari browser (ada header Origin) wajib pakai token, mencegah web iseng spam notifikasi.
      if (!tokenOk || (req.headers.origin && !settings.token)) return send(401, { ok: false, error: 'unauthorized' });

      if (url.pathname === '/health') return send(200, { ok: true, app: 'pocket-notch' });
      if (url.pathname !== '/notify') return send(404, { ok: false, error: 'not found' });

      if (req.method === 'GET') {
        onNotify(normalize(Object.fromEntries(url.searchParams)));
        return send(200, { ok: true });
      }
      if (req.method !== 'POST') return send(405, { ok: false, error: 'method not allowed' });

      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > 65536) {
          send(413, { ok: false, error: 'too large' });
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const items = Array.isArray(body) ? body.slice(0, 10) : [body];
          items.forEach((b) => onNotify(normalize(b || {})));
          send(200, { ok: true });
        } catch (_) {
          send(400, { ok: false, error: 'invalid json' });
        }
      });
    } catch (e) {
      send(500, { ok: false, error: String(e.message || e) });
    }
  };

  return {
    start(port) {
      return new Promise((resolve) => {
        this.stop();
        server = http.createServer(handler);
        server.on('error', (e) => {
          log.error('[notify-server]', e.code || e.message);
          resolve(false);
        });
        server.listen(port, '127.0.0.1', () => resolve(true));
      });
    },
    stop() {
      if (server) {
        server.close();
        server = null;
      }
    },
  };
}

module.exports = { createServer, normalize };
