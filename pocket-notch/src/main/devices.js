<<<<<<< HEAD
'use strict';
// Memantau perangkat Windows (volume, mic, WiFi, Bluetooth, baterai, USB drive, CapsLock, brightness)
// lewat satu proses PowerShell persisten (ps/device.ps1). Event dikirim sebagai baris JSON.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const GROUPS = ['fs', 'audio', 'brightness', 'net', 'bt', 'power', 'drive', 'caps'];

class Devices extends EventEmitter {
  constructor({ enabled = true } = {}) {
    super();
    this.enabled = enabled && process.platform === 'win32';
    this.proc = null;
    this.buf = '';
    this.stopped = false;
    this.retry = 0;
    this.groups = {}; // grup -> boolean (diterapkan saat proses siap)
  }

  start() {
    this.stopped = false;
    // buang skrip sementara sisa sesi yang tertutup tak wajar
    try {
      for (const f of fs.readdirSync(os.tmpdir())) {
        if (/^pnotch-device-\d+\.ps1$/.test(f) && f !== `pnotch-device-${process.pid}.ps1`) fs.unlinkSync(path.join(os.tmpdir(), f));
      }
    } catch (_) {
      /* abaikan */
    }
    if (this.enabled) this._spawn();
  }

  stop() {
    this.stopped = true;
    if (this.file) {
      try {
        fs.unlinkSync(this.file);
      } catch (_) {
        /* abaikan */
      }
    }
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

  // aktif/nonaktifkan grup polling agar hemat CPU
  setGroups(map) {
    for (const g of GROUPS) {
      if (typeof map[g] === 'boolean' && this.groups[g] !== map[g]) {
        this.groups[g] = map[g];
        this._write(`${map[g] ? 'on' : 'off'} ${g}`);
      }
    }
  }

  _write(line) {
    if (this.proc && this.proc.stdin.writable) this.proc.stdin.write(line + '\n');
  }

  _spawn() {
    // -File (bukan -EncodedCommand): tidak kena batas panjang command line dan tidak masalah di dalam asar
    const src = fs.readFileSync(path.join(__dirname, 'ps', 'device.ps1'), 'utf8');
    const file = path.join(os.tmpdir(), `pnotch-device-${process.pid}.ps1`);
    fs.writeFileSync(file, '\ufeff' + src, 'utf8');
    this.file = file;
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', file],
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
          const ev = JSON.parse(line);
          this.retry = 0;
          if (ev.ev === 'diag') this.emit('diag', ev);
          else this.emit('event', ev);
        } catch (_) {
          /* bukan JSON */
        }
      }
    });
    proc.stderr.on('data', (d) => this.emit('diag', { ev: 'diag', group: 'stderr', msg: String(d).trim().slice(0, 500) }));
    proc.on('error', (e) => console.error('[devices] spawn error', e.message));
    proc.on('exit', () => {
      this.proc = null;
      if (this.stopped) return;
      this.retry++;
      setTimeout(() => {
        if (this.stopped) return;
        this._spawn();
        // terapkan ulang status grup
        const g = this.groups;
        this.groups = {};
        this.setGroups(g);
      }, Math.min(30000, 2000 * this.retry));
    });
    // terapkan grup yang sudah diset sebelum proses siap
    const g = this.groups;
    this.groups = {};
    this.setGroups(g);
  }
}

module.exports = { Devices, GROUPS };
=======
'use strict';
// Memantau perangkat Windows (volume, mic, WiFi, Bluetooth, baterai, USB drive, CapsLock, brightness)
// lewat satu proses PowerShell persisten (ps/device.ps1). Event dikirim sebagai baris JSON.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const GROUPS = ['fs', 'audio', 'brightness', 'net', 'bt', 'power', 'drive', 'caps'];

class Devices extends EventEmitter {
  constructor({ enabled = true } = {}) {
    super();
    this.enabled = enabled && process.platform === 'win32';
    this.proc = null;
    this.buf = '';
    this.stopped = false;
    this.retry = 0;
    this.groups = {}; // grup -> boolean (diterapkan saat proses siap)
  }

  start() {
    this.stopped = false;
    // buang skrip sementara sisa sesi yang tertutup tak wajar
    try {
      for (const f of fs.readdirSync(os.tmpdir())) {
        if (/^pnotch-device-\d+\.ps1$/.test(f) && f !== `pnotch-device-${process.pid}.ps1`) fs.unlinkSync(path.join(os.tmpdir(), f));
      }
    } catch (_) {
      /* abaikan */
    }
    if (this.enabled) this._spawn();
  }

  stop() {
    this.stopped = true;
    if (this.file) {
      try {
        fs.unlinkSync(this.file);
      } catch (_) {
        /* abaikan */
      }
    }
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

  // aktif/nonaktifkan grup polling agar hemat CPU
  setGroups(map) {
    for (const g of GROUPS) {
      if (typeof map[g] === 'boolean' && this.groups[g] !== map[g]) {
        this.groups[g] = map[g];
        this._write(`${map[g] ? 'on' : 'off'} ${g}`);
      }
    }
  }

  _write(line) {
    if (this.proc && this.proc.stdin.writable) this.proc.stdin.write(line + '\n');
  }

  _spawn() {
    // -File (bukan -EncodedCommand): tidak kena batas panjang command line dan tidak masalah di dalam asar
    const src = fs.readFileSync(path.join(__dirname, 'ps', 'device.ps1'), 'utf8');
    const file = path.join(os.tmpdir(), `pnotch-device-${process.pid}.ps1`);
    fs.writeFileSync(file, '\ufeff' + src, 'utf8');
    this.file = file;
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', file],
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
          const ev = JSON.parse(line);
          this.retry = 0;
          if (ev.ev === 'diag') this.emit('diag', ev);
          else this.emit('event', ev);
        } catch (_) {
          /* bukan JSON */
        }
      }
    });
    proc.stderr.on('data', (d) => this.emit('diag', { ev: 'diag', group: 'stderr', msg: String(d).trim().slice(0, 500) }));
    proc.on('error', (e) => console.error('[devices] spawn error', e.message));
    proc.on('exit', () => {
      this.proc = null;
      if (this.stopped) return;
      this.retry++;
      setTimeout(() => {
        if (this.stopped) return;
        this._spawn();
        // terapkan ulang status grup
        const g = this.groups;
        this.groups = {};
        this.setGroups(g);
      }, Math.min(30000, 2000 * this.retry));
    });
    // terapkan grup yang sudah diset sebelum proses siap
    const g = this.groups;
    this.groups = {};
    this.setGroups(g);
  }
}

module.exports = { Devices, GROUPS };
>>>>>>> 0008abd1ee87d6dc288e915a96073e355bd77ff8
