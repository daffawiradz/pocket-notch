'use strict';
// Auto update via electron-updater (GitHub Releases). Hanya aktif pada build terpasang (app.isPackaged).
const { app } = require('electron');

function createUpdater({ getSettings, emit }) {
  let autoUpdater = null;
  let timer = null;
  let state = { status: 'idle', version: app.getVersion() };

  const push = (patch) => {
    state = { ...state, ...patch };
    emit(state);
  };

  function init() {
    if (!app.isPackaged) {
      push({ status: 'dev', message: 'Mode dev: auto-update nonaktif' });
      return;
    }
    try {
      ({ autoUpdater } = require('electron-updater'));
    } catch (e) {
      push({ status: 'error', message: 'electron-updater tidak ada' });
      return;
    }
    autoUpdater.autoDownload = !!getSettings().autoUpdate;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => push({ status: 'checking', message: 'Mengecek update...' }));
    autoUpdater.on('update-available', (i) =>
      push({ status: getSettings().autoUpdate ? 'downloading' : 'available', newVersion: i.version, percent: 0, message: `Update v${i.version} tersedia` })
    );
    autoUpdater.on('update-not-available', () => push({ status: 'latest', message: 'Sudah versi terbaru' }));
    autoUpdater.on('download-progress', (p) => push({ status: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => push({ status: 'ready', newVersion: i.version, message: `v${i.version} siap dipasang` }));
    autoUpdater.on('error', (e) => push({ status: 'error', message: String((e && e.message) || e).slice(0, 160) }));

    setTimeout(check, 15000);
    timer = setInterval(check, 4 * 60 * 60 * 1000);
  }

  function check() {
    if (!autoUpdater) return push({ status: 'dev', message: 'Auto-update hanya di build terpasang' });
    autoUpdater.autoDownload = !!getSettings().autoUpdate;
    autoUpdater.checkForUpdates().catch(() => {});
  }

  function download() {
    if (autoUpdater) autoUpdater.downloadUpdate().catch(() => {});
  }

  function install() {
    if (autoUpdater && state.status === 'ready') autoUpdater.quitAndInstall(false, true);
  }

  return { init, check, download, install, state: () => state, stop: () => clearInterval(timer) };
}

module.exports = { createUpdater };
