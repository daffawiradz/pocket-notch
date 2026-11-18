'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  app, BrowserWindow, Tray, Menu, screen, ipcMain, globalShortcut, shell, nativeImage, dialog, powerMonitor,
} = require('electron');

const { Store } = require('./store');
const { Media } = require('./media');
const { fetchLyrics } = require('./lyrics');
const { findArt } = require('./art');
const { Shelf } = require('./shelf');
const { createServer } = require('./notify-server');
const ai = require('./ai');
const personas = require('../shared/personas');
const { createUpdater } = require('./updater');
const { Devices } = require('./devices');
const { createRouter, SAMPLES } = require('./device-router');
const { isInside, validRect } = require('./hit');

const MOCK = process.argv.includes('--mock');
const WIN_W = 640;
const WIN_H = 470;

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let store;
let overlay = null;
let artTimer = null;
let shelf = null;
const shelfIcons = new Map(); // id -> nativeImage (ikon file untuk drag)
let settingsWin = null;
let tray = null;
let media;
let updater;
let devices;
let router;
let notifyServer;
let lastLyrics = null; // { key, lines }
let lastThumb = null; // { key, thumb }
let lastMedia = { active: false };
let lastKey = '';
let lyricsReq = 0;
let topmostTimer = null;
const timers = new Set();

// ───────────────────────── helpers ─────────────────────────
const send = (win, channel, ...args) => {
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(channel, ...args);
};

// Opsi developer: otomatis aktif saat dijalankan dari source (npm start), atau lewat toggle tersembunyi di Settings.
const isDev = () => !app.isPackaged || !!(store && store.get().devMode);

function findUninstaller() {
  if (!app.isPackaged) return null;
  try {
    const dir = path.dirname(process.execPath);
    const f = fs.readdirSync(dir).find((n) => /^Uninstall .*\.exe$/i.test(n));
    return f ? path.join(dir, f) : null;
  } catch (_) {
    return null;
  }
}

async function runUninstall() {
  const exe = findUninstaller();
  if (!exe) return false;
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Uninstall', 'Batal'],
    defaultId: 1,
    cancelId: 1,
    title: 'Uninstall Pocket Notch',
    message: 'Hapus Pocket Notch dari komputer ini?',
    detail: 'Aplikasi akan ditutup dan uninstaller dijalankan.',
  });
  if (response !== 0) return false;
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  app.quit();
  return true;
}

function notify(n) {
  send(overlay, 'notify', n);
}

// grup polling PowerShell yang perlu aktif berdasarkan setting Perangkat
function syncDeviceGroups() {
  const d = store.get().devices;
  devices.setGroups({
    audio: !!(d.volume || d.mic || d.audioOut),
    brightness: !!d.brightness,
    net: !!d.wifi,
    bt: !!d.bluetooth,
    power: !!d.battery,
    drive: !!d.usb,
    caps: !!d.capslock,
    fs: !!store.get().hideOnFullscreen,
  });
}

function pickDisplay() {
  const s = store.get();
  const all = screen.getAllDisplays();
  return all.find((d) => d.id === s.display) || screen.getPrimaryDisplay();
}

function placeOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  const s = store.get();
  const b = pickDisplay().bounds;
  let x = b.x + Math.round((b.width - WIN_W) / 2) + s.offsetX;
  x = Math.max(b.x, Math.min(x, b.x + b.width - WIN_W));
  const y = b.y + s.offsetY;
  const rect = { x, y, width: WIN_W, height: WIN_H };
  // dipanggil 2x: workaround bug Electron saat pindah antar monitor dengan DPI berbeda
  overlay.setBounds(rect);
  overlay.setBounds(rect);
}

// ───────────────────────── windows ─────────────────────────
// ───────────────────────── shelf (file sementara) ─────────────────────────
function shelfChanged() {
  send(overlay, 'shelf:items', shelf.list());
  for (const i of shelf.list()) {
    if (shelfIcons.has(i.id)) continue;
    shelfIcons.set(i.id, null);
    app.getFileIcon(shelf.pathOf(i.id), { size: 'normal' }).then((img) => shelfIcons.set(i.id, img)).catch(() => {});
  }
}

function fallbackDragIcon() {
  const p = path.join(__dirname, '..', '..', 'assets', 'tray.png');
  const img = nativeImage.createFromPath(p);
  return img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 32, height: 32 });
}

function setupShelf() {
  shelf = new Shelf({ dir: path.join(app.getPath('userData'), 'shelf'), getCfg: () => store.get().shelf });
  const sweep = () => shelf.cleanup().then((ch) => ch && shelfChanged()).catch(() => {});
  sweep();
  setInterval(sweep, 10 * 60 * 1000);
  const fromOverlay = (e) => overlay && e.sender === overlay.webContents;

  ipcMain.handle('shelf:list', (e) => (fromOverlay(e) ? shelf.list() : []));
  ipcMain.handle('shelf:add', async (e, paths) => {
    if (!fromOverlay(e) || !store.get().shelf.enabled || !Array.isArray(paths)) return [];
    const added = await shelf.add(paths.slice(0, 50).map(String));
    shelfChanged();
    return added.length;
  });
  ipcMain.on('shelf:remove', async (e, id) => {
    if (!fromOverlay(e)) return;
    await shelf.remove(String(id));
    shelfIcons.delete(id);
    shelfChanged();
  });
  ipcMain.on('shelf:clear', async (e) => {
    if (!fromOverlay(e)) return;
    await shelf.clear();
    shelfIcons.clear();
    shelfChanged();
  });
  ipcMain.on('shelf:open', (e, id) => {
    const p = fromOverlay(e) && shelf.pathOf(String(id));
    if (p) shell.openPath(p);
  });
  ipcMain.on('shelf:drag', async (e, id) => {
    if (!fromOverlay(e)) return;
    const p = shelf.pathOf(String(id));
    if (!p) return;
    let icon = shelfIcons.get(id);
    if (!icon || icon.isEmpty()) icon = await app.getFileIcon(p, { size: 'normal' }).catch(() => null);
    if (!icon || icon.isEmpty()) icon = fallbackDragIcon();
    e.sender.startDrag({ file: p, icon });
  });
}

function createOverlay() {
  overlay = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    focusable: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true, { forward: true });
  hoverNow = false;
  overlay.setMenuBarVisibility(false);
  overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  overlay.webContents.on('will-navigate', (e) => e.preventDefault());
  placeOverlay();
  overlay.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  overlay.once('ready-to-show', () => {
    if (!fsHidden) overlay.showInactive();
  });
  if (process.argv.includes('--dev')) overlay.webContents.openDevTools({ mode: 'detach' });

  clearInterval(topmostTimer);
  topmostTimer = setInterval(() => {
    if (overlay && !overlay.isDestroyed() && overlay.isVisible()) overlay.setAlwaysOnTop(true, 'screen-saver');
    reassertMouse();
  }, 10000);

  // Hit-test dari proses utama: tidak bergantung pada mousemove yang "diteruskan" Electron,
  // yang di Windows bisa berhenti setelah berjam-jam / sleep / lock layar (tombol jadi mati).
  clearInterval(hoverTimer);
  hoverTimer = setInterval(pollCursor, 50);
}

function recreateOverlay() {
  const old = overlay;
  islandRect = null;
  hoverNow = false;
  createOverlay();
  if (old && !old.isDestroyed()) old.destroy();
}

let fsHidden = false; // overlay disembunyikan karena ada aplikasi fullscreen di monitor yang sama
let fsInfo = null; // { l, t, r, b } kotak monitor (piksel fisik) bila ada aplikasi fullscreen

// apakah aplikasi fullscreen berada di monitor tempat notch?
function fullscreenOnNotchDisplay() {
  if (!fsInfo || !store.get().hideOnFullscreen) return false;
  try {
    const c = screen.screenToDipPoint({ x: Math.round((fsInfo.l + fsInfo.r) / 2), y: Math.round((fsInfo.t + fsInfo.b) / 2) });
    return screen.getDisplayNearestPoint(c).id === pickDisplay().id;
  } catch (_) {
    return false;
  }
}

function applyFullscreenState() {
  if (!overlay || overlay.isDestroyed()) return;
  const hide = fullscreenOnNotchDisplay();
  if (hide === fsHidden) return;
  fsHidden = hide;
  if (hide) {
    hoverNow = false;
    overlay.hide();
  } else {
    placeOverlay();
    overlay.showInactive();
    overlay.setAlwaysOnTop(true, 'screen-saver');
  }
}

let hoverTimer = null;
let islandRect = null;
let hoverNow = false;

function pollCursor() {
  if (!overlay || overlay.isDestroyed() || fsHidden || !overlay.isVisible() || !islandRect) return;
  const inside = isInside(screen.getCursorScreenPoint(), overlay.getBounds(), islandRect, 4);
  if (inside === hoverNow) return;
  hoverNow = inside;
  overlay.setIgnoreMouseEvents(!inside, { forward: true });
  send(overlay, 'overlay:hover', inside);
}

// tegaskan ulang status klik-tembus & topmost (mis. setelah sleep, lock layar, ganti monitor)
function reassertMouse() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setIgnoreMouseEvents(!hoverNow, { forward: true });
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 640,
    minHeight: 520,
    title: 'Pocket Notch — Settings',
    backgroundColor: '#07050f',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#07050f', symbolColor: '#ff2bd6', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWin.setMenu(null);
  settingsWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWin.webContents.on('will-navigate', (e) => e.preventDefault());
  settingsWin.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  settingsWin.on('closed', () => (settingsWin = null));
}

// ───────────────────────── tray ─────────────────────────
function buildTray() {
  const s = store.get();
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  const current = pickDisplay().id;

  const menu = Menu.buildFromTemplate([
    { label: 'Pocket Notch  v' + app.getVersion(), enabled: false },
    { type: 'separator' },
    {
      label: overlay && overlay.isVisible() ? 'Sembunyikan notch' : 'Tampilkan notch',
      click: () => {
        if (!overlay) return;
        overlay.isVisible() ? overlay.hide() : overlay.showInactive();
        buildTray();
      },
    },
    { label: 'Buka AI Agent  (' + s.shortcut + ')', click: () => send(overlay, 'shortcut:toggle-ai') },
    ...(isDev() ? [{ label: 'Tes notifikasi (dev)', click: () => testNotify('sent') }] : []),
    {
      label: 'Pindah ke monitor',
      submenu: displays.map((d, i) => ({
        label: `Monitor ${i + 1}${d.id === primaryId ? ' (utama)' : ''} — ${d.size.width}x${d.size.height}`,
        type: 'radio',
        checked: d.id === current,
        click: () => applySettings({ display: d.id }),
      })),
    },
    { type: 'separator' },
    { label: 'Settings…', click: openSettings },
    { label: 'Cek update', click: () => updater.check() },
    {
      label: 'Jalankan saat Windows start',
      type: 'checkbox',
      checked: !!s.autoLaunch,
      click: (mi) => applySettings({ autoLaunch: mi.checked }),
    },
    { type: 'separator' },
    ...(findUninstaller() ? [{ label: 'Uninstall P-Notch…', click: runUninstall }, { type: 'separator' }] : []),
    { label: 'Keluar', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', '..', 'assets', 'tray.png'));
  tray = new Tray(img.resize({ width: 16, height: 16 }));
  tray.setToolTip('Pocket Notch (P-Notch)');
  tray.on('click', openSettings);
  buildTray();
}

// ───────────────────────── settings apply ─────────────────────────
let prevPort = null;
let prevShortcut = null;

function registerShortcut() {
  const s = store.get();
  if (prevShortcut) globalShortcut.unregister(prevShortcut);
  prevShortcut = null;
  if (!s.shortcut) return;
  try {
    const ok = globalShortcut.register(s.shortcut, () => send(overlay, 'shortcut:toggle-ai'));
    if (ok) prevShortcut = s.shortcut;
  } catch (e) {
    console.error('[shortcut] invalid', s.shortcut);
  }
}

async function startServer() {
  const s = store.get();
  const ok = await notifyServer.start(s.port);
  prevPort = s.port;
  if (!ok) {
    setTimeout(() => notify({ id: 'e' + Date.now(), title: 'Integrasi notifikasi nonaktif', message: 'Port ' + s.port + ' dipakai aplikasi lain.', type: 'warn', app: 'Pocket Notch', icon: '', duration: 8, time: Date.now() }), 2500);
  }
}

function applySettings(patch) {
  const before = { ...store.get() };
  store.update(patch);
  const s = store.get();
  placeOverlay();
  send(overlay, 'settings', store.publicView());
  if (s.port !== before.port) startServer();
  if (s.shortcut !== before.shortcut) registerShortcut();
  if (s.autoLaunch !== before.autoLaunch && app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: !!s.autoLaunch, name: 'PocketNotch' });
  }
  buildTray();
  if (devices) syncDeviceGroups();
  applyFullscreenState();
}

function testNotify(type = 'sent') {
  const samples = {
    sent: { title: 'Pesan terkirim', message: 'Halo! Pesanmu sudah dikirim ke pelanggan.', app: 'Freshchat', type: 'sent' },
    received: { title: 'Pesan baru', message: 'Kak, pesanan saya sudah sampai, terima kasih!', app: 'WhatsApp', type: 'received' },
    error: { title: 'Gagal mengirim', message: 'Koneksi terputus, coba lagi.', app: 'Bot', type: 'error' },
    info: { title: 'Halo dari Pocket Notch', message: 'Webhook berjalan normal.', app: 'Pocket Notch', type: 'info' },
  };
  const n = samples[type] || samples.info;
  notify({ id: 't' + Date.now(), icon: '', duration: 0, time: Date.now(), ...n });
}

// ───────────────────────── media + lyrics ─────────────────────────
function onMediaState(s) {
  const key = s.active ? `${s.title}|${s.artist}|${s.album}` : '';
  const out = { ...s, key };
  if (s.thumb) lastThumb = { key, thumb: s.thumb };
  lastMedia = { ...out, thumb: undefined };
  send(overlay, 'media:state', out);

  if (key !== lastKey) {
    lastKey = key;
    clearTimeout(artTimer);
    if (key && s.title) {
      // bila Windows tidak memberi cover dalam beberapa detik, cari cover album online
      artTimer = setTimeout(async () => {
        if (lastKey !== key || (lastThumb && lastThumb.key === key)) return;
        const art = await findArt({ title: s.title, artist: s.artist, album: s.album });
        if (art && lastKey === key && !(lastThumb && lastThumb.key === key)) {
          lastThumb = { key, thumb: art };
          send(overlay, 'media:thumb', { key, thumb: art });
        }
      }, 3500);
    }
    lastLyrics = { key, lines: null, loading: !!key };
    send(overlay, 'media:lyrics', lastLyrics);
    if (key && s.title) {
      const req = ++lyricsReq;
      fetchLyrics({ title: s.title, artist: s.artist, album: s.album, dur: s.dur }).then((res) => {
        if (req !== lyricsReq) return;
        lastLyrics = { key, lines: res && res.lines && res.lines.length ? res.lines : null, loading: false };
        send(overlay, 'media:lyrics', lastLyrics);
      });
    }
  }
}

// ───────────────────────── IPC ─────────────────────────
function setupIpc() {
  ipcMain.on('overlay:ready', () => {
    send(overlay, 'settings', store.publicView());
    if (lastMedia.active) send(overlay, 'media:state', { ...lastMedia, thumb: lastThumb && lastThumb.key === lastMedia.key ? lastThumb.thumb : null });
    if (lastLyrics) send(overlay, 'media:lyrics', lastLyrics);
    send(overlay, 'update', updater.state());
    if (shelf) send(overlay, 'shelf:items', shelf.list());
  });

  ipcMain.on('overlay:rect', (e, r) => {
    if (overlay && e.sender === overlay.webContents && validRect(r)) islandRect = r;
  });

  ipcMain.on('overlay:focusable', (e, v) => {
    if (!overlay || e.sender !== overlay.webContents) return;
    overlay.setFocusable(!!v);
    if (v) overlay.focus();
    else overlay.blur();
  });

  ipcMain.on('media:cmd', (_e, cmd, arg) => media.send(cmd, arg));

  ipcMain.handle('ai:chat', async (_e, messages) => {
    try {
      const s = store.get();
      const ctx = {
        getMedia: () => lastMedia,
        mediaCmd: (c) => media.send(c),
        notify: (n) => notify({ id: 'a' + Date.now(), icon: '', duration: 0, time: Date.now(), message: '', app: '', type: 'info', ...n }),
        setTimer: (sec, label) => {
          const t = setTimeout(() => {
            timers.delete(t);
            notify({ id: 'tm' + Date.now(), title: label, message: 'Timer selesai', app: 'Timer', type: 'success', icon: '', duration: 10, time: Date.now() });
          }, sec * 1000);
          timers.add(t);
        },
        openUrl: (u) => shell.openExternal(u),
      };
      const cfg = { ...s.ai };
      if (s.pet && s.pet.enabled) cfg.system = personas.buildPrompt(s.pet) + '\n\n' + s.ai.system;
      return await ai.chat(cfg, Array.isArray(messages) ? messages : [], ctx);
    } catch (e) {
      return { error: String((e && e.message) || e).slice(0, 300) };
    }
  });

  const fromSettings = (e) => settingsWin && !settingsWin.isDestroyed() && e.sender === settingsWin.webContents;
  ipcMain.handle('settings:get', (e) => (fromSettings(e) ? store.get() : store.publicView()));
  ipcMain.handle('settings:save', (e, patch) => {
    if (!fromSettings(e) || !patch || typeof patch !== 'object') return false;
    applySettings(patch);
    return true;
  });
  ipcMain.handle('displays:list', () => {
    const primary = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `Monitor ${i + 1}${d.id === primary ? ' (utama)' : ''} — ${d.size.width}x${d.size.height} @${Math.round(d.scaleFactor * 100)}%`,
      primary: d.id === primary,
    }));
  });
  ipcMain.on('settings:open', openSettings);
  ipcMain.on('device:test', (e, kind) => {
    if (!(isDev() && fromSettings(e)) || !SAMPLES[kind]) return;
    SAMPLES[kind].forEach((ev, i) => setTimeout(() => router.handle({ ...ev, init: false }), i * 700));
  });
  ipcMain.on('notify:test', (e, type) => {
    if (isDev() && fromSettings(e)) testNotify(type);
  });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged, dev: isDev(), canUninstall: !!findUninstaller() }));
  ipcMain.handle('app:uninstall', (e) => (fromSettings(e) ? runUninstall() : false));
  ipcMain.on('update:check', () => updater.check());
  ipcMain.on('update:install', () => updater.install());
  ipcMain.handle('update:state', () => updater.state());
}

// ───────────────────────── boot ─────────────────────────
app.on('second-instance', () => notify({ id: 'si' + Date.now(), title: 'Pocket Notch sudah berjalan', message: 'Klik ikon tray untuk membuka Settings.', type: 'info', app: '', icon: '', duration: 4, time: Date.now() }));

app.whenReady().then(async () => {
  app.setAppUserModelId('com.pocketnotch.app');
  store = new Store();
  media = new Media({ mock: MOCK });
  notifyServer = createServer({ getSettings: () => store.get(), onNotify: notify });
  updater = createUpdater({
    getSettings: () => store.get(),
    emit: (st) => {
      send(overlay, 'update', st);
      send(settingsWin, 'update', st);
    },
  });

  devices = new Devices();
  router = createRouter({
    getCfg: () => store.get().devices,
    notify: (n) => notify({ id: 'd' + Date.now() + Math.random().toString(36).slice(2, 5), icon: '', duration: 0, time: Date.now(), message: '', app: 'SISTEM', type: 'info', ...n }),
    hud: (h) => send(overlay, 'device:hud', h),
  });
  devices.on('event', (ev) => {
    if (ev.ev === 'fullscreen') {
      fsInfo = ev.on ? { l: ev.l, t: ev.t, r: ev.r, b: ev.b } : null;
      applyFullscreenState();
      return;
    }
    router.handle(ev);
  });
  devices.on('diag', (d) => {
    try {
      fs.appendFileSync(path.join(app.getPath('userData'), 'device.log'), `${new Date().toISOString()} [${d.group}] ${d.msg}\n`);
    } catch (_) {
      /* abaikan */
    }
  });

  setupIpc();
  createOverlay();
  createTray();
  registerShortcut();
  media.on('state', onMediaState);
  media.start();
  devices.start();
  setupShelf();
  syncDeviceGroups();
  for (const evt of ['resume', 'unlock-screen']) {
    powerMonitor.on(evt, () => {
      // bangun ulang jendela overlay: setelah sleep/lock, status klik-tembus jendela lama bisa macet
      setTimeout(recreateOverlay, 1500);
    });
  }
  await startServer();
  updater.init();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!store.get().autoLaunch, name: 'PocketNotch' });

  const rePlace = () => {
    placeOverlay();
    buildTray();
  };
  const displayNote = (title, message) => {
    if (!store.get().devices.display) return;
    notify({ id: 'dp' + Date.now(), glyph: 'monitor', type: 'info', title, message, app: 'SISTEM', icon: '', duration: 0, time: Date.now() });
  };
  screen.on('display-added', (_e, d) => {
    rePlace();
    displayNote('Monitor tersambung', `${d.size.width}x${d.size.height}`);
  });
  screen.on('display-removed', () => {
    rePlace();
    displayNote('Monitor dilepas', `${screen.getAllDisplays().length} monitor aktif`);
  });
  screen.on('display-metrics-changed', rePlace);

  if (!store.get().ai.anthropicKey && !store.get().ai.openaiKey) {
    setTimeout(() => notify({ id: 'w' + Date.now(), title: 'Pocket Notch aktif', message: 'Klik tray > Settings untuk memasang API key AI.', type: 'info', app: '', icon: '', duration: 6, time: Date.now() }), 2500);
  }
});

app.on('window-all-closed', (e) => e.preventDefault()); // tetap hidup di tray
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(topmostTimer);
  if (media) media.stop();
  if (devices) devices.stop();
  if (notifyServer) notifyServer.stop();
  if (updater) updater.stop();
  timers.forEach(clearTimeout);
});
