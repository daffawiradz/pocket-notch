'use strict';
// Penyimpanan setting (JSON di userData). API key dienkripsi dengan safeStorage (DPAPI di Windows).
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const DEFAULTS = {
  display: 'primary', // 'primary' atau id display
  offsetX: 0,
  offsetY: 0,
  notchHeight: 30, // tinggi pill idle/mini (px)
  miniMaxWidth: 560, // lebar maksimum mini player (px)
  miniAuto: true, // lebar mini mengikuti panjang lirik
  devMode: false, // tampilkan opsi developer (webhook, test) di Settings
  pet: {
    enabled: true,
    persona: 'poki', // poki | nova | glitch
    name: '',
    userName: '',
    chatter: 'normal', // normal | quiet | off
    reminderMin: 45, // 0 = mati
  },
  devices: {
    volume: true,
    mic: true,
    brightness: true,
    capslock: true,
    wifi: true,
    bluetooth: true,
    battery: true,
    usb: true,
    audioOut: true,
    display: true,
    lowBattery: 20,
  },
  floating: false, // false = menempel di tepi atas (notch), true = melayang (dynamic island)
  theme: 'synthwave', // synthwave | cyber | matrix | amber
  effects: 'full', // full | lite
  animSpeed: 1,
  scanlines: true,
  glow: 1,
  hoverExpand: true,
  miniMusic: true,
  showLyricsMini: true,
  lyricOffset: 0, // ms
  clock24: true,
  showSeconds: false,
  notifDuration: 5,
  sound: true,
  port: 47321,
  token: '',
  shortcut: 'Control+Alt+Space',
  autoLaunch: false,
  autoUpdate: true,
  ai: {
    provider: 'anthropic', // anthropic | openai
    anthropicKey: '',
    anthropicModel: 'claude-sonnet-5-5',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    system:
      'Kamu adalah agen AI kecil yang hidup di notch layar Windows. Jawab singkat, jelas, dan ramah. ' +
      'Gunakan tool jika pengguna meminta kontrol musik, timer, notifikasi, jam, atau membuka URL.',
  },
};

const SECRET_PATHS = [
  ['ai', 'anthropicKey'],
  ['ai', 'openaiKey'],
];

function deepMerge(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function enc(text) {
  if (!text) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return 'enc:' + safeStorage.encryptString(text).toString('base64');
    }
  } catch (_) {
    /* fallthrough */
  }
  return 'raw:' + Buffer.from(text, 'utf8').toString('base64');
}

function dec(text) {
  if (!text) return '';
  try {
    if (text.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(text.slice(4), 'base64'));
    if (text.startsWith('raw:')) return Buffer.from(text.slice(4), 'base64').toString('utf8');
  } catch (_) {
    return '';
  }
  return text;
}

function getPath(obj, p) {
  return p.reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setPath(obj, p, val) {
  let o = obj;
  for (let i = 0; i < p.length - 1; i++) o = o[p[i]] = o[p[i]] || {};
  o[p[p.length - 1]] = val;
}

class Store {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.migrateOld();
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    this._timer = null;
    this.load();
  }

  // Pindahkan pengaturan dari versi lama (nama "Neon Notch") bila ada
  migrateOld() {
    try {
      if (fs.existsSync(this.file)) return;
      const old = path.join(app.getPath('appData'), 'Neon Notch', 'settings.json');
      if (fs.existsSync(old)) {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.copyFileSync(old, this.file);
      }
    } catch (_) {
      /* abaikan */
    }
  }

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = deepMerge(DEFAULTS, raw);
      for (const p of SECRET_PATHS) setPath(this.data, p, dec(getPath(this.data, p)));
    } catch (_) {
      /* file belum ada / rusak -> default */
    }
  }

  save() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      try {
        const copy = JSON.parse(JSON.stringify(this.data));
        for (const p of SECRET_PATHS) setPath(copy, p, enc(getPath(copy, p)));
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(copy, null, 2));
      } catch (e) {
        console.error('[store] gagal simpan', e);
      }
    }, 200);
  }

  get() {
    return this.data;
  }

  // versi untuk overlay: tanpa secret
  publicView() {
    const copy = JSON.parse(JSON.stringify(this.data));
    for (const p of SECRET_PATHS) setPath(copy, p, '');
    copy.token = '';
    return copy;
  }

  update(patch) {
    this.data = deepMerge(this.data, patch);
    this.sanitize();
    this.save();
    return this.data;
  }

  sanitize() {
    const d = this.data;
    const num = (v, lo, hi, def) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : def);
    d.offsetX = num(d.offsetX, -4000, 4000, 0);
    d.offsetY = num(d.offsetY, -200, 400, 0);
    d.animSpeed = num(d.animSpeed, 0.4, 2.5, 1);
    d.glow = num(d.glow, 0, 2, 1);
    d.lyricOffset = num(d.lyricOffset, -5000, 5000, 0);
    d.notifDuration = num(d.notifDuration, 2, 30, 5);
    d.port = Math.round(num(d.port, 1024, 65535, 47321));
    if (!['synthwave', 'cyber', 'matrix', 'amber'].includes(d.theme)) d.theme = 'synthwave';
    if (!['full', 'lite'].includes(d.effects)) d.effects = 'full';
    if (!['anthropic', 'openai'].includes(d.ai.provider)) d.ai.provider = 'anthropic';
    d.devices.lowBattery = Math.round(num(d.devices.lowBattery, 5, 50, 20));
    d.notchHeight = num(d.notchHeight, 24, 42, 30);
    d.miniMaxWidth = num(d.miniMaxWidth, 380, 600, 560);
    if (!['poki', 'nova', 'glitch'].includes(d.pet.persona)) d.pet.persona = 'poki';
    if (!['normal', 'quiet', 'off'].includes(d.pet.chatter)) d.pet.chatter = 'normal';
    d.pet.reminderMin = Math.round(num(d.pet.reminderMin, 0, 240, 45));
    d.pet.name = String(d.pet.name || '').slice(0, 16);
    d.pet.userName = String(d.pet.userName || '').slice(0, 24);
  }
}

module.exports = { Store, DEFAULTS, deepMerge };
