'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const on = (channel, cb) => {
  const fn = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('notch', {
  // overlay
  ready: () => ipcRenderer.send('overlay:ready'),
  setFocusable: (v) => ipcRenderer.send('overlay:focusable', !!v),
  onMedia: (cb) => on('media:state', cb),
  onLyrics: (cb) => on('media:lyrics', cb),
  onNotify: (cb) => on('notify', cb),
  onSettings: (cb) => on('settings', cb),
  onToggleAI: (cb) => on('shortcut:toggle-ai', cb),
  onUpdate: (cb) => on('update', cb),
  // shelf (file sementara)
<<<<<<< HEAD
  // FileList tidak bisa melewati contextBridge (jadi objek kosong), jadi path diambil per File
  pathOf: (file) => { try { return webUtils.getPathForFile(file); } catch (_) { return ''; } },
=======
  pathsOf: (files) => Array.from(files || []).map((f) => { try { return webUtils.getPathForFile(f); } catch (_) { return ''; } }).filter(Boolean),
>>>>>>> eeb6272f1070f44086df09d881362052358964d0
  shelfAdd: (paths) => ipcRenderer.invoke('shelf:add', paths),
  shelfList: () => ipcRenderer.invoke('shelf:list'),
  shelfRemove: (id) => ipcRenderer.send('shelf:remove', id),
  shelfClear: () => ipcRenderer.send('shelf:clear'),
  shelfOpen: (id) => ipcRenderer.send('shelf:open', id),
  shelfDrag: (id) => ipcRenderer.send('shelf:drag', id),
  onShelf: (cb) => on('shelf:items', cb),
  onThumb: (cb) => on('media:thumb', cb),
  reportRect: (r) => ipcRenderer.send('overlay:rect', r),
  onHover: (cb) => on('overlay:hover', cb),
  onHud: (cb) => on('device:hud', cb),
  testDevice: (kind) => ipcRenderer.send('device:test', kind),
  mediaCmd: (cmd, arg) => ipcRenderer.send('media:cmd', cmd, arg),
  aiChat: (messages) => ipcRenderer.invoke('ai:chat', messages),
  openSettings: () => ipcRenderer.send('settings:open'),
  installUpdate: () => ipcRenderer.send('update:install'),

  // settings window
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  testNotify: (type) => ipcRenderer.send('notify:test', type),
  checkUpdate: () => ipcRenderer.send('update:check'),
  getUpdateState: () => ipcRenderer.invoke('update:state'),
  info: () => ipcRenderer.invoke('app:info'),
  uninstall: () => ipcRenderer.invoke('app:uninstall'),
});
