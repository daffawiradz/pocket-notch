(() => {
  'use strict';
  const api = window.notch;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let settings = null;
  let saveTimer = null;
  let pending = {};

  const getPath = (o, p) => p.split('.').reduce((a, k) => (a ? a[k] : undefined), o);
  const setPath = (o, p, v) => {
    const ks = p.split('.');
    let cur = o;
    ks.slice(0, -1).forEach((k) => (cur = cur[k] = cur[k] || {}));
    cur[ks[ks.length - 1]] = v;
  };

  function flashSaved() {
    const el = $('#saved');
    el.textContent = '✓ TERSIMPAN';
    el.classList.add('show');
    clearTimeout(flashSaved.t);
    flashSaved.t = setTimeout(() => el.classList.remove('show'), 1200);
  }

  function queueSave(path, value) {
    setPath(settings, path, value);
    setPath(pending, path, value);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const patch = pending;
      pending = {};
      try {
        await api.saveSettings(patch);
        flashSaved();
        refreshDerived();
      } catch (err) {
        $('#saved').textContent = 'GAGAL MENYIMPAN';
        $('#saved').classList.add('show');
        console.error('[settings] save failed:', err);
      }
    }, 250);
  }

  function readEl(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number') return Number(el.value);
    if (el.dataset.k === 'display') return el.value === 'primary' ? 'primary' : Number(el.value);
    return el.value;
  }

  function writeEl(el, v) {
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v == null ? '' : v;
    const out = el.parentElement && el.parentElement.querySelector('output');
    if (out && el.type === 'range') out.textContent = v;
  }

  function refreshDerived() {
    const port = settings.port || 47321;
    const tok = settings.token ? ` -H "Authorization: Bearer ${settings.token}"` : '';
    $('#curl').textContent =
      `curl -X POST http://127.0.0.1:${port}/notify${tok} \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      `  -d "{\\"title\\":\\"Pesan terkirim\\",\\"message\\":\\"Halo\\",\\"type\\":\\"sent\\",\\"app\\":\\"Bot\\"}"\n\n` +
      `type: info | sent | received | success | warn | error`;
    $$('.grp').forEach((g) => g.classList.toggle('on', g.dataset.for === settings.ai.provider));
  }

  // Navigasi kategori dan pencarian tetap native DOM; tanpa library tambahan.
  function initNavigation() {
    const sections = $$('main > section');
    const nav = $('#settingsNav');
    const items = [];
    sections.forEach((section, i) => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      section.id = `settings-section-${i}`;
      const label = heading.textContent.replace(/^\/\/\s*/, '').trim();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.target = section.id;
      if (section.hasAttribute('data-dev')) btn.dataset.dev = '1';
      btn.addEventListener('click', () => {
        items.forEach((it) => it.button.classList.toggle('active', it.button === btn));
        section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      });
      nav.append(btn);
      items.push({ section, button: btn, searchText: section.textContent.toLowerCase() });
    });
    const search = $('#settingsSearch');
    const clear = $('#clearSearch');
    function filter() {
      const query = search.value.toLocaleLowerCase('id-ID').trim();
      const terms = query.split(/\s+/).filter(Boolean);
      let count = 0;
      items.forEach(({ section, button, searchText }) => {
        const matched = terms.every((term) => searchText.includes(term));
        section.hidden = !matched;
        button.hidden = !matched;
        if (matched) count++;
      });
      clear.hidden = !query;
      $('#settingsEmpty').hidden = count > 0;
    }
    search.addEventListener('input', filter);
    clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
    if (items.length) items[0].button.classList.add('active');
  }

  function updatePreview() {
    if (!settings) return;
    const persona = window.PERSONAS.resolve(settings.pet);
    const preview = $('#petPreviewArt');
    preview.innerHTML = window.PET_ART.svg(persona, 'happy');
    preview.classList.toggle('off', !settings.pet.enabled);
    $('#petPreviewName').textContent = persona.name.toUpperCase();
    $('#petPreviewTag').textContent = persona.tagline;
    document.documentElement.dataset.theme = settings.theme;
  }

  async function init() {
    settings = await api.getSettings();
    initNavigation();
    updatePreview();
    const displays = await api.listDisplays();
    const sel = $('#displaySel');
    sel.innerHTML = '';
    const opt = (v, t) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      sel.append(o);
    };
    opt('primary', 'Monitor utama (otomatis)');
    displays.forEach((d) => opt(String(d.id), d.label));
    if (settings.display !== 'primary' && !displays.some((d) => d.id === settings.display)) settings.display = 'primary';

    $$('[data-k]').forEach((el) => {
      writeEl(el, getPath(settings, el.dataset.k));
      const evt = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const v = readEl(el);
        writeEl(el, v);
        queueSave(el.dataset.k, v);
        if (el.dataset.k.startsWith('pet.') || el.dataset.k === 'theme') updatePreview();
        if (el.type === 'range') {
          const out = el.parentElement.querySelector('output');
          if (out) out.textContent = v;
        }
      });
    });

    $('#tSent').onclick = () => api.testNotify('sent');
    $('#tRecv').onclick = () => api.testNotify('received');
    $('#tErr').onclick = () => api.testNotify('error');
    const dev = { dWifi: 'wifi', dWifiOff: 'wifioff', dBt: 'bt', dBat: 'battery', dChg: 'charger', dUsb: 'usb', dVol: 'volume', dMic: 'mic', dCaps: 'caps', dBri: 'brightness', dOut: 'audioout' };
    Object.entries(dev).forEach(([id, kind]) => ($('#' + id).onclick = () => api.testDevice(kind)));
    $('#btnUpd').onclick = () => api.checkUpdate();
    $('#btnUninstall').onclick = () => api.uninstall();
    $('#btnDevOff').onclick = async () => {
      await api.saveSettings({ devMode: false });
      settings.devMode = false;
      applyInfo(await api.info());
    };

    // klik nomor versi 7x = toggle mode developer
    let taps = 0;
    let tapT = null;
    $('#ver').addEventListener('click', async () => {
      taps++;
      clearTimeout(tapT);
      tapT = setTimeout(() => (taps = 0), 1500);
      if (taps >= 7) {
        taps = 0;
        settings.devMode = !settings.devMode;
        await api.saveSettings({ devMode: settings.devMode });
        applyInfo(await api.info());
        flashSaved();
      }
    });

    function applyInfo(info) {
      $('#ver').textContent = 'v' + info.version;
      document.body.classList.toggle('dev', !!info.dev);
      $('#btnDevOff').hidden = !settings.devMode;
      $('#uninstallRow').hidden = !info.canUninstall;
      refreshDerived();
    }
    applyInfo(await api.info());

    const showUpd = (u) => {
      if (!u) return;
      const map = {
        checking: 'Mengecek…', latest: 'Sudah versi terbaru', dev: document.body.classList.contains('dev') ? (u.message || 'Mode dev') : '',
        downloading: `Mengunduh v${u.newVersion || ''} ${u.percent || 0}%`, ready: `v${u.newVersion} siap — klik ikon notch untuk restart`,
        available: `v${u.newVersion} tersedia`, error: 'Error: ' + (u.message || ''),
      };
      $('#updStatus').textContent = map[u.status] || '';
    };
    showUpd(await api.getUpdateState());
    api.onUpdate(showUpd);
    refreshDerived();
  }
  init();
})();
