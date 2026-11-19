'use strict';
// Mengubah event mentah perangkat menjadi popup (notify) atau indikator HUD, dengan debounce & ambang baterai.
// Dipisah dari Electron agar bisa diuji.

function createRouter({ getCfg, notify, hud, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const st = {
    net: null, // { state, name }
    netTimer: null,
    bt: new Set(),
    power: { ac: null, pct: null },
    lowShown: 0, // 0 = belum, 1 = low, 2 = critical
    fullShown: false,
  };

  const sys = (n) => notify({ app: 'SISTEM', ...n });

  function handle(ev) {
    const cfg = getCfg();
    if (!cfg || !ev || !ev.ev) return;
    switch (ev.ev) {
      case 'volume':
        if (cfg.volume && !ev.init) hud({ kind: 'volume', value: ev.v, muted: !!ev.muted });
        break;
      case 'mic':
        if (cfg.mic && !ev.init) hud({ kind: 'mic', on: !ev.muted });
        break;
      case 'caps':
        if (cfg.capslock && !ev.init) hud({ kind: 'caps', on: !!ev.on });
        break;
      case 'brightness':
        if (cfg.brightness && !ev.init) hud({ kind: 'brightness', value: ev.v });
        break;
      case 'audioout':
        if (cfg.audioOut && !ev.init) sys({ glyph: 'headphone', type: 'info', title: 'Output audio berganti', message: ev.name || '' });
        break;
      case 'net':
        if (cfg.wifi) net(ev);
        break;
      case 'bt':
        if (cfg.bluetooth) bt(ev);
        break;
      case 'power':
        if (cfg.battery) power(ev, cfg);
        break;
      case 'drive':
        if (cfg.usb && !ev.init) {
          const name = `${ev.label ? ev.label + ' ' : ''}(${String(ev.letter).replace(/\\$/, '')})`;
          if (ev.state === 'connected') sys({ glyph: 'usb', type: 'success', title: 'USB terpasang', message: name, speak: 'usb_on' });
          else sys({ glyph: 'usb', type: 'info', title: 'USB dilepas', message: name });
        }
        break;
      default:
        break;
    }
  }

  function net(ev) {
    if (ev.state === 'disconnected') {
      if (ev.init) {
        st.net = { state: 'disconnected' };
        return;
      }
      if (st.netTimer || (st.net && st.net.state === 'disconnected')) return;
      // tunggu 4 dtk: pindah AP / roaming sering putus sesaat
      st.netTimer = setTimer(() => {
        st.netTimer = null;
        st.net = { state: 'disconnected' };
        sys({ glyph: 'wifioff', type: 'warn', title: 'Jaringan terputus', message: 'Tidak ada koneksi', speak: 'wifi_off' });
      }, 4000);
      return;
    }
    if (st.netTimer) {
      clearTimer(st.netTimer);
      st.netTimer = null;
    }
    const was = st.net;
    st.net = { state: 'connected', name: ev.name };
    const changed = !was || was.state !== 'connected' || was.name !== ev.name;
    if (!changed || ev.init) return;
    const wifi = ev.kind === 'wifi';
    sys({
      glyph: wifi ? 'wifi' : 'plug',
      type: ev.limited ? 'warn' : 'success',
      title: wifi ? 'Wi-Fi tersambung' : ev.kind === 'ethernet' ? 'LAN tersambung' : 'Jaringan tersambung',
      message: (ev.name || '') + (ev.limited ? ' (tanpa internet)' : ''),
      speak: 'wifi_on',
    });
  }

  function bt(ev) {
    if (ev.state === 'connected') {
      const had = st.bt.has(ev.name);
      st.bt.add(ev.name);
      if (!ev.init && !had) sys({ glyph: 'bt', type: 'info', title: 'Bluetooth tersambung', message: ev.name, speak: 'bt_on' });
    } else {
      st.bt.delete(ev.name);
      if (!ev.init) sys({ glyph: 'bt', type: 'warn', title: 'Bluetooth terputus', message: ev.name, speak: 'bt_off' });
    }
  }

  function power(ev, cfg) {
    const prev = st.power;
    st.power = { ac: ev.ac, pct: ev.pct };
    const low = Math.max(5, Math.min(50, Number(cfg.lowBattery) || 20));

    if (!ev.init && prev.ac !== null && prev.ac !== ev.ac) {
      if (ev.ac) sys({ glyph: 'plug', type: 'success', title: 'Charger terhubung', message: `Baterai ${ev.pct}%`, speak: 'charge_on' });
      else sys({ glyph: 'battery', type: 'info', title: 'Charger dilepas', message: `Baterai ${ev.pct}%` });
    }
    if (ev.ac || ev.pct > low + 5) st.lowShown = 0;
    if (!ev.ac) st.fullShown = false;

    if (!ev.ac && !ev.init) {
      if (ev.pct <= 10 && st.lowShown < 2) {
        st.lowShown = 2;
        sys({ glyph: 'batterylow', type: 'error', title: 'Baterai kritis', message: `${ev.pct}% — segera colok charger`, speak: 'battery_low', duration: 10 });
      } else if (ev.pct <= low && st.lowShown < 1) {
        st.lowShown = 1;
        sys({ glyph: 'batterylow', type: 'warn', title: 'Baterai rendah', message: `${ev.pct}% tersisa`, speak: 'battery_low', duration: 8 });
      }
    }
    if (ev.ac && ev.pct >= 100 && !st.fullShown && !ev.init) {
      st.fullShown = true;
      sys({ glyph: 'battery', type: 'success', title: 'Baterai penuh', message: '100% — boleh cabut charger' });
    }
  }

  return { handle, state: st };
}

// Event contoh untuk tombol tes (mode developer)
const SAMPLES = {
  wifi: [{ ev: 'net', state: 'connected', kind: 'wifi', name: 'Rumah-5G', limited: false }],
  wifioff: [{ ev: 'net', state: 'disconnected' }],
  bt: [{ ev: 'bt', state: 'connected', name: 'WH-1000XM5' }],
  battery: [{ ev: 'power', ac: false, pct: 15 }],
  charger: [{ ev: 'power', ac: true, pct: 54 }],
  usb: [{ ev: 'drive', state: 'connected', letter: 'E:\\', label: 'FLASHDISK' }],
  volume: [{ ev: 'volume', v: 0.42, muted: false }, { ev: 'volume', v: 0.95, muted: false }],
  mic: [{ ev: 'mic', muted: true }],
  caps: [{ ev: 'caps', on: true }],
  brightness: [{ ev: 'brightness', v: 70 }],
  audioout: [{ ev: 'audioout', name: 'Headphones (Realtek Audio)' }],
};

module.exports = { createRouter, SAMPLES };
