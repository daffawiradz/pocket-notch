'use strict';
// Shelf: penyimpanan file sementara. File yang dijatuhkan ke notch DISALIN ke folder khusus
// (aman bila file asal dipindah/dihapus), lalu bisa diseret keluar lagi. Kedaluwarsa otomatis.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // batas per item

async function sizeOf(p) {
  const st = await fsp.stat(p);
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const e of await fsp.readdir(p)) total += await sizeOf(path.join(p, e));
  return total;
}

class Shelf {
  constructor({ dir, getCfg }) {
    this.dir = dir;
    this.getCfg = getCfg;
    this.items = [];
    this.file = path.join(dir, 'index.json');
    fs.mkdirSync(dir, { recursive: true });
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(raw)) this.items = raw.filter((i) => i && i.id && fs.existsSync(this._path(i)));
    } catch (_) {
      /* index belum ada */
    }
  }

  _path(i) {
    return path.join(this.dir, i.id, i.name);
  }

  _save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.items));
    } catch (_) {
      /* abaikan */
    }
  }

  list() {
    return this.items.map((i) => ({ id: i.id, name: i.name, size: i.size, isDir: i.isDir, added: i.added }));
  }

  pathOf(id) {
    const i = this.items.find((x) => x.id === id);
    return i ? this._path(i) : null;
  }

  async add(paths) {
    const cfg = this.getCfg();
    const added = [];
    for (const src of paths || []) {
      try {
        if (!src || typeof src !== 'string') continue;
        // jangan menyalin isi folder shelf ke dirinya sendiri
        if (path.resolve(src).startsWith(path.resolve(this.dir) + path.sep)) continue;
        const st = await fsp.stat(src);
        const size = await sizeOf(src);
        if (size > MAX_BYTES) continue;
        const id = crypto.randomBytes(6).toString('hex');
        const name = path.basename(src) || 'file';
        await fsp.mkdir(path.join(this.dir, id), { recursive: true });
        await fsp.cp(src, path.join(this.dir, id, name), { recursive: true });
        const item = { id, name, size, isDir: st.isDirectory(), added: Date.now() };
        this.items.unshift(item);
        added.push(item);
      } catch (_) {
        /* file tak terbaca: lewati */
      }
    }
    while (this.items.length > cfg.maxItems) await this._drop(this.items[this.items.length - 1].id);
    this._save();
    return added;
  }

  async _drop(id) {
    const i = this.items.findIndex((x) => x.id === id);
    if (i < 0) return;
    this.items.splice(i, 1);
    await fsp.rm(path.join(this.dir, id), { recursive: true, force: true }).catch(() => {});
  }

  async remove(id) {
    await this._drop(id);
    this._save();
  }

  async clear() {
    for (const i of [...this.items]) await this._drop(i.id);
    this._save();
  }

  // hapus yang kedaluwarsa + folder yatim; true bila ada yang berubah
  async cleanup(now = Date.now()) {
    const maxAge = this.getCfg().keepHours * 3600 * 1000;
    let changed = false;
    for (const i of [...this.items]) {
      if (now - i.added > maxAge) {
        await this._drop(i.id);
        changed = true;
      }
    }
    const known = new Set(this.items.map((i) => i.id));
    for (const e of await fsp.readdir(this.dir).catch(() => [])) {
      if (e !== 'index.json' && !known.has(e)) await fsp.rm(path.join(this.dir, e), { recursive: true, force: true }).catch(() => {});
    }
    if (changed) this._save();
    return changed;
  }
}

module.exports = { Shelf };
