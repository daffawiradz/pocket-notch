'use strict';
// Membaca "Now Playing" dari Windows (SMTC / System Media Transport Controls) lewat PowerShell WinRT.
// Bekerja untuk Spotify, Apple Music, browser (YouTube dll), VLC, foobar, dst.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const MOCK_TRACK = {
  title: 'Neon Nights',
  artist: 'Synth Rider',
  album: 'Retrowave',
  dur: 215,
  app: 'Mock.exe',
};

class Media extends EventEmitter {
  constructor({ mock = false } = {}) {
    super();
    this.mock = mock || process.platform !== 'win32';
    this.proc = null;
    this.buf = '';
    this.stopped = false;
    this.retry = 0;
    this.last = { active: false };
    this._mockTimer = null;
    this._mock = { pos: 0, playing: true };
  }

  start() {
    this.stopped = false;
    if (this.mock) return this._startMock();
    this._spawn();
  }

  stop() {
    this.stopped = true;
    clearInterval(this._mockTimer);
    if (this.proc) {
      try {
        this.proc.stdin.end();
        this.proc.kill();
      } catch (_) {
        /* abaikan */
      }
      this.proc = null;
    }
  }

  send(cmd, arg) {
    const allowed = ['playpause', 'play', 'pause', 'next', 'prev', 'seek'];
    if (!allowed.includes(cmd)) return;
    if (this.mock) return this._mockCmd(cmd, arg);
    if (!this.proc || !this.proc.stdin.writable) return;
    const line = cmd === 'seek' ? `seek ${Math.max(0, Number(arg) || 0)}` : cmd;
    this.proc.stdin.write(line + '\n');
  }

  _spawn() {
    const script = fs.readFileSync(path.join(__dirname, 'ps', 'media.ps1'), 'utf8');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    this.proc = proc;
    this.buf = '';

    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      this.buf += chunk;
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        try {
          this._handle(JSON.parse(line));
          this.retry = 0;
        } catch (_) {
          /* baris bukan JSON -> abaikan */
        }
      }
    });
    proc.stderr.on('data', () => {});
    proc.on('error', (e) => console.error('[media] spawn error', e.message));
    proc.on('exit', () => {
      this.proc = null;
      if (this.stopped) return;
      this.retry++;
      const wait = Math.min(30000, 2000 * this.retry);
      setTimeout(() => !this.stopped && this._spawn(), wait);
    });
  }

  _handle(s) {
    if (s.error) return;
    this.last = s;
    this.emit('state', s);
  }

  // ---------- mock (untuk dev di non-Windows / --mock) ----------
  _startMock() {
    const t0 = Date.now();
    let lastTick = t0;
    this._mockTimer = setInterval(() => {
      const now = Date.now();
      if (this._mock.playing) this._mock.pos += (now - lastTick) / 1000;
      lastTick = now;
      if (this._mock.pos > MOCK_TRACK.dur) this._mock.pos = 0;
      this._handle({
        active: true,
        status: this._mock.playing ? 'Playing' : 'Paused',
        title: MOCK_TRACK.title,
        artist: MOCK_TRACK.artist,
        album: MOCK_TRACK.album,
        pos: +this._mock.pos.toFixed(2),
        dur: MOCK_TRACK.dur,
        app: MOCK_TRACK.app,
        thumb: null,
      });
    }, 500);
  }

  _mockCmd(cmd, arg) {
    if (cmd === 'playpause') this._mock.playing = !this._mock.playing;
    if (cmd === 'play') this._mock.playing = true;
    if (cmd === 'pause') this._mock.playing = false;
    if (cmd === 'next' || cmd === 'prev') this._mock.pos = 0;
    if (cmd === 'seek') this._mock.pos = Number(arg) || 0;
  }
}

module.exports = { Media, MOCK_TRACK };
