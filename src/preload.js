'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, cb) => {
  const fn = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('notch', {
  // overlay
  ready: () => ipcRenderer.send('overlay:ready'),
  setIgnoreMouse: (v) => ipcRenderer.send('overlay:ignore', !!v),
  setFocusable: (v) => ipcRenderer.send('overlay:focusable', !!v),
  onMedia: (cb) => on('media:state', cb),
  onLyrics: (cb) => on('media:lyrics', cb),
  onNotify: (cb) => on('notify', cb),
  onSettings: (cb) => on('settings', cb),
  onToggleAI: (cb) => on('shortcut:toggle-ai', cb),
  onUpdate: (cb) => on('update', cb),
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
