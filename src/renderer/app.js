(() => {
  'use strict';
  const api = window.notch;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  // ───────────────────────── icons ─────────────────────────
  const svg = (inner, fill) =>
    `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICON = {
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
    warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    play: svg('<path d="M7 4.5v15l12-7.5z"/>', true),
    pause: svg('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', true),
    next: svg('<path d="M5 5l10 7-10 7z"/><rect x="17" y="5" width="2.6" height="14" rx="1"/>', true),
    prev: svg('<path d="M19 5L9 12l10 7z"/><rect x="4.4" y="5" width="2.6" height="14" rx="1"/>', true),
    gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
    file: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>'),
    folder: svg('<path d="M3 6h7l2 2h9v11H3z"/>'),
    pin: svg('<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>'),
    wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.7 16a5 5 0 0 1 6.6 0"/><path d="M12 19.5v.01"/>'),
    wifioff: svg('<path d="M5.5 12.5a9.5 9.5 0 0 1 4-2.4"/><path d="M8.7 16a5 5 0 0 1 6.6 0"/><path d="M12 19.5v.01"/><path d="M3 3l18 18"/>'),
    bt: svg('<path d="M7 7l10 10-5 4V3l5 4L7 17"/>'),
    plug: svg('<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>'),
    battery: svg('<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3"/><path d="M6 10v4M9 10v4M12 10v4"/>'),
    batterylow: svg('<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3"/><path d="M6 10v4"/>'),
    usb: svg('<circle cx="12" cy="19" r="2"/><path d="M12 17V4M12 4l-2 2.5M12 4l2 2.5"/><path d="M12 13l4-2.5V9M12 15l-4-2.5V10"/><rect x="14.5" y="6.5" width="3" height="2.5"/><circle cx="8" cy="9" r="1.2"/>'),
    monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    headphone: svg('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    volume: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>'),
    vollow: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/>'),
    volmute: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'),
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    micoff: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path d="M3 3l18 18"/>'),
    caps: svg('<path d="M12 4l8 9h-5v4H9v-4H4z"/><path d="M9 20h6"/>'),
  };
  const TYPE_ICON = { sent: 'check', success: 'check', received: 'mail', info: 'info', warn: 'warn', error: 'x' };

  // ───────────────────────── state ─────────────────────────
  const island = $('#island');
  const aiInput = $('#aiInput');
  const aiLog = $('#aiLog');

  const state = {
    s: null, // settings
    media: { active: false, status: 'Closed', pos: 0, dur: 0 },
    mediaAt: 0,
    thumbKey: '',
    lyrics: { key: '', lines: null, loading: false },
    lyIdx: -99,
    expanded: false,
    tab: 'home',
    pinned: false,
    over: false,
    notif: null,
    hud: null,
    queue: [],
    inbox: [],
    unread: 0,
    ai: { messages: [], busy: false },
    update: null,
    updNotified: '',
  };

  try {
    state.inbox = JSON.parse(localStorage.getItem('notch.inbox') || '[]').slice(0, 50);
  } catch (_) {
    state.inbox = [];
  }
  const saveInbox = () => {
    try {
      localStorage.setItem('notch.inbox', JSON.stringify(state.inbox.slice(0, 50)));
    } catch (_) {
      /* abaikan */
    }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (sec) => {
    sec = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
  };
  const retrigger = (el, cls) => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  // ───────────────────────── view routing ─────────────────────────
  const playing = () => state.media.active && state.media.status === 'Playing';

  function computeView() {
    if (state.expanded) return 'panel';
    if (state.hud) return 'hud';
    if (state.notif) return 'notif';
    if (state.s && state.s.miniMusic && playing()) return 'mini';
    return 'idle';
  }

  function render() {
    island.dataset.view = computeView();
    island.dataset.tab = state.tab;
    island.dataset.playing = playing() ? '1' : '0';
    if (typeof pet !== 'undefined') pet.syncMotion();
  }


  // ───────────────────────── karakter (pet): motion director & interaksi ─────────────────────────
  const PX = window.PERSONAS;
  const MOTION = window.PET_MOTION;
  const petOn = () => !!(state.s && state.s.pet && state.s.pet.enabled);
  const personaNow = () => PX.resolve(state.s && state.s.pet);
  const spriteSVG = (persona, mood, blink, mouthOpen, gaze = 0) =>
    window.PET_ART.svg(persona, mood, { blink, mouthOpen, gaze });
  const motionReduced = () => root.dataset.fx === 'lite' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const remember = (list, choice, max = 4) => { list.push(choice); if (list.length > max) list.shift(); };

  const pet = {
    temp: null, tempT: null, hold: null, blink: false, mouth: false, sleeping: false, sig: '',
    gaze: 0, lastActive: Date.now(), idleMood: null, action: '', actionT: null,
    motionT: null, motionAnim: null, position: 0, facing: 1, recentIdle: [],
    recentReactions: [], recentLines: [], lastHover: 0, lastInteraction: 0,
    cur() {
      return this.hold || this.temp || (this.sleeping ? 'sleep' : playing() ? 'dance' :
        state.focus && state.focus.status === 'running' ? 'think' : this.idleMood || 'idle');
    },
    canWander() {
      return petOn() && !state.quiet && !state.over && !document.hidden &&
        computeView() === 'idle' && !this.sleeping && !this.temp && !this.hold &&
        !playing() && !(state.focus && state.focus.status === 'running') && !motionReduced();
    },
    render() {
      if (!petOn()) { this.stopMotion(); return; }
      const st = this.cur();
      const p = personaNow();
      const sig = `${p.id}|${st}|${this.blink}|${this.mouth}|${this.gaze}|${this.action}`;
      if (sig !== this.sig) {
        this.sig = sig;
        const html = spriteSVG(p, st, this.blink, this.mouth, this.gaze);
        $$('.pet-slot').forEach((el) => {
          el.dataset.state = st;
          el.dataset.action = this.action;
          el.innerHTML = html;
        });
      }
      this.syncMotion();
    },
    syncMotion() {
      if (!this.canWander()) {
        if (this.idleMood || this.motionT || this.motionAnim) this.stopMotion();
        return;
      }
      if (this.action || this.idleMood) return;
      if (!this.motionT && !this.motionAnim) {
        this.motionT = setTimeout(() => {
          this.motionT = null;
          this.wander();
        }, MOTION.pauseDelay());
      }
    },
    stopMotion(preservePosition = false) {
      clearTimeout(this.motionT);
      this.motionT = null;
      const actor = $('#petRoam');
      // An interaction must not teleport the mascot to the left end mid-walk.
      if (preservePosition && actor && this.motionAnim) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(actor).transform);
        const bounds = MOTION.walkBounds($('#petLane').clientWidth, actor.offsetWidth);
        this.position = Math.min(bounds.max, Math.max(bounds.min, matrix.m41));
        this.facing = matrix.m11 < 0 ? -1 : 1;
      }
      if (this.motionAnim) { this.motionAnim.cancel(); this.motionAnim = null; }
      if (!preservePosition) { this.position = 0; this.facing = 1; }
      if (actor) actor.style.transform = preservePosition
        ? `translate3d(${this.position.toFixed(2)}px,0,0) scaleX(${this.facing})` : '';
      if (this.idleMood || this.action) {
        this.idleMood = null;
        this.action = '';
        this.sig = '';
      }
    },
    wander() {
      if (!this.canWander()) { this.stopMotion(); return; }
      const actor = $('#petRoam');
      const lane = $('#petLane');
      if (!actor || !lane || !actor.animate) return;
      const lastTwo = this.recentIdle.slice(-2);
      const recentTravels = lastTwo.some((id) => MOTION.activities.some((a) => a.id === id && a.travel));
      const activity = MOTION.nextActivity(this.recentIdle, Math.random,
        !recentTravels || Math.random() < .62);
      remember(this.recentIdle, activity.id);
      this.idleMood = activity.mood;
      this.action = activity.id;
      this.gaze = Math.random() > .5 ? 1 : -1;
      const bounds = MOTION.walkBounds(lane.clientWidth, actor.offsetWidth);
      const from = Math.min(bounds.max, Math.max(bounds.min, this.position));
      this.position = from;
      const to = activity.travel ? MOTION.nextPatrolTarget(from, bounds) : from;
      const dir = activity.travel ? (to >= from ? 1 : -1) : this.facing;
      const at = (part, dy = 0, rot = 0, face = dir) => ({
        transform: `translate3d(${(from + (to - from) * part).toFixed(2)}px, ${dy}px, 0) rotate(${rot}deg) scaleX(${face})`,
      });
      let poses;
      if (activity.travel) {
        const wiggle = activity.id === 'tiptoe' ? -2 : activity.id === 'skip' ? -5 : -3;
        poses = [at(0, 0), at(.17, wiggle, -4), at(.34, 0, 4), at(.52, wiggle, -3), at(.7, 0, 3), at(.86, wiggle, -2), at(1)];
        if (activity.id === 'moonwalk') poses = poses.map((v, i) => ({ ...v, transform: v.transform.replace(/scaleX\([^)]+\)/, `scaleX(${-dir})`) }));
      } else if (activity.id === 'twirl') {
        poses = [at(0), at(0, -5, 90), at(0, -3, 205), at(0, -7, 320), at(0)];
      } else if (activity.id === 'peek' || activity.id === 'look') {
        poses = [at(0), at(0, -2, -10, -1), at(0, -2, 9, 1), at(0, 0, 0, this.facing)];
      } else if (activity.id === 'stretch') {
        poses = [at(0), at(0, -5, -5), at(0, -7, 6), at(0)];
      } else if (activity.id === 'settle') {
        poses = [at(0), at(0, 2), at(0, 3), at(0)];
      } else {
        poses = [at(0), at(0, -2, -5), at(0, -3, 5), at(0)];
      }
      this.render();
      const duration = activity.travel ? MOTION.walkDuration(activity.id, Math.abs(to - from)) : activity.duration;
      const anim = actor.animate(poses, { duration, easing: activity.travel ? 'linear' : 'ease-in-out', fill: 'forwards' });
      this.motionAnim = anim;
      anim.onfinish = () => {
        if (this.motionAnim !== anim) return;
        this.position = to;
        this.facing = activity.id === 'moonwalk' ? -dir : dir;
        actor.style.transform = at(1, 0, 0, this.facing).transform;
        this.motionAnim = null;
        anim.cancel();
        this.idleMood = null;
        this.action = '';
        this.render();
      };
    },
    react(st, ms, action = '') {
      clearTimeout(this.tempT);
      this.stopMotion(true);
      this.temp = st;
      this.action = action;
      this.gaze = st === 'curious' || st === 'peek' ? (Math.random() > .5 ? 1 : -1) : 0;
      this.render();
      this.tempT = setTimeout(() => {
        this.temp = null;
        this.action = '';
        this.gaze = 0;
        this.render();
      }, ms);
    },
    setHold(st) {
      if (st) this.stopMotion(true);
      this.hold = st;
      this.render();
    },
    touch() {
      this.lastActive = Date.now();
      if (this.sleeping) {
        this.sleeping = false;
        this.render();
        sayKey('wake', {}, { state: 'happy' });
      }
    },
    interact(kind, quiet = false) {
      if (!petOn()) return;
      this.touch();
      const plan = MOTION.nextReaction(kind, personaNow().id, this.recentReactions, this.recentLines);
      remember(this.recentReactions, plan.action);
      remember(this.recentLines, plan.lineId);
      this.lastInteraction = Date.now();
      this.react(plan.mood, kind === 'double' ? 1900 : kind === 'hold' ? 2400 : 1400, plan.action);
      if (!quiet) say(plan.line, { force: true, ms: kind === 'hold' ? 4200 : 3400, state: plan.mood, keepReaction: true });
      else if (state.expanded) showHome(plan.line);
      if (state.expanded) retrigger($('#petStage'), 'pet-tapped');
    },
  };

  // Kedipan asimetris: jeda acak, sesekali berkedip dua kali.
  function blinkCycle() {
    setTimeout(() => {
      if (petOn() && !pet.sleeping && !document.hidden) {
        pet.blink = true;
        pet.render();
        setTimeout(() => { pet.blink = false; pet.render(); }, 110 + Math.random() * 90);
        if (Math.random() > .80) setTimeout(() => {
          if (!petOn() || pet.sleeping) return;
          pet.blink = true; pet.render();
          setTimeout(() => { pet.blink = false; pet.render(); }, 100);
        }, 350);
      }
      blinkCycle();
    }, MOTION.blinkDelay());
  }
  blinkCycle();
  setInterval(() => {
    if (pet.cur() !== 'talk') return;
    pet.mouth = !pet.mouth;
    pet.render();
  }, 190);


  // Variasi gerak kontekstual yang tidak memotong reaksi sentuhan, chat,
  // atau notifikasi. Tidak memunculkan dialog secara acak saat pengguna fokus.
  const contextActions = {
    music: ['sway', 'hop', 'twirl', 'wave', 'nod'],
    focus: ['look', 'nod', 'stretch', 'settle', 'peek'],
    home: ['wave', 'peek', 'sway', 'nod', 'shy'],
  };
  let lastContext = '';
  let contextRecent = [];
  setInterval(() => {
    if (!petOn() || pet.sleeping || pet.temp || pet.hold || state.quiet || document.hidden || motionReduced()) return;
    const mode = playing() ? 'music' :
      state.focus && state.focus.status === 'running' ? 'focus' :
      state.expanded && state.tab === 'home' ? 'home' : '';
    if (mode !== lastContext) { lastContext = mode; contextRecent = []; pet.action = ''; }
    if (!mode) { pet.render(); return; }
    const choices = contextActions[mode].map((id) => ({ id }));
    const next = MOTION.pick(choices, contextRecent);
    remember(contextRecent, next.id);
    pet.action = next.id;
    pet.gaze = ['peek', 'look'].includes(next.id) ? (Math.random() > .5 ? 1 : -1) : 0;
    pet.sig = '';
    pet.render();
  }, 7400);

  // dialog
  let bubbleT = null;
  let lastSayAt = 0;
  const lastLine = {};
  const QUIET_OK = ['wifi_off', 'battery_low', 'greet_morning', 'greet_day', 'greet_evening', 'greet_night', 'water', 'stretch', 'eyes', 'poke', 'update', 'wake'];

  function showHome(text) {
    const el = $('#homeSay');
    if (el.textContent !== text) {
      el.textContent = text;
      retrigger(el, 'pop');
    }
  }

  function say(text, opts = {}) {
    if (!petOn() || !text) return;
    const now = Date.now();
    if (!opts.force && now - lastSayAt < 4000) return;
    lastSayAt = now;
    const ms = opts.ms || 5500;
    showHome(text);
    if (!opts.keepReaction) pet.react(opts.state || 'talk', Math.min(ms, 2400));
    if (state.expanded) return;
    $('#bubbleName').textContent = personaNow().name.toUpperCase();
    $('#bubbleText').textContent = text;
    $('#bubble').classList.add('on');
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => $('#bubble').classList.remove('on'), ms);
  }

  function sayKey(key, vars, opts = {}) {
    if (!petOn()) return;
    const mode = state.s.pet.chatter;
    if (!opts.force && (mode === 'off' || (mode === 'quiet' && !QUIET_OK.includes(key)))) return;
    const t = PX.line(state.s.pet, key, vars, lastLine[key]);
    lastLine[key] = t;
    say(t, opts);
  }

  function greetKey() {
    const h = new Date().getHours();
    return h < 11 ? 'greet_morning' : h < 15 ? 'greet_day' : h < 18 ? 'greet_evening' : 'greet_night';
  }

  // pengingat + tips + tidur
  const REMIND = [
    ['water', 'Waktunya minum'],
    ['stretch', 'Peregangan'],
    ['eyes', 'Istirahat mata'],
  ];
  let remIdx = 0;
  let nextRemind = 0;
  let nextTip = Date.now() + 25 * 60000;
  let lastNotifSay = 0;
  let lastMusicSay = 0;

  function scheduleReminder() {
    const m = state.s && state.s.pet ? state.s.pet.reminderMin : 0;
    nextRemind = m > 0 ? Date.now() + m * 60000 : 0;
  }

  setInterval(() => {
    if (!petOn()) return;
    const now = Date.now();
    const m = state.s.pet.reminderMin;
    if (m > 0 && nextRemind && now >= nextRemind) {
      nextRemind = now + m * 60000;
      const [key, title] = REMIND[remIdx++ % REMIND.length];
      const text = PX.line(state.s.pet, key, {}, lastLine[key]);
      lastLine[key] = text;
      pet.react('happy', 2500);
      pushNotif({ id: 'r' + now, type: 'info', title, message: text, app: personaNow().name, icon: '', duration: 8, time: now, noReact: true });
    }
    if (state.s.pet.chatter === 'normal' && now >= nextTip && !state.expanded && !state.notif) {
      nextTip = now + (25 + Math.random() * 20) * 60000;
      sayKey('tip', {}, { ms: 7000 });
    }
    if (!pet.sleeping && !playing() && state.focus.status !== 'running' && now - pet.lastActive > 10 * 60000) {
      pet.sleeping = true;
      pet.render();
    }
  }, 30000);

  function onPetSettings() {
    pet.sig = '';
    pet.render();
    $('#petTag').textContent = personaNow().name.toUpperCase() + ' · ONLINE';
    $('#homePet').setAttribute('aria-label', `Colek ${personaNow().name}`);
    scheduleReminder();
    if (!onPetSettings.greeted && petOn()) {
      onPetSettings.greeted = true;
      setTimeout(() => sayKey(greetKey(), {}, { force: true, ms: 7000, state: 'happy' }), 1800);
    }
  }

  document.addEventListener('mouseover', () => pet.touch(), { passive: true });

  // ───────────────────────── settings ─────────────────────────
  function applySettings(s) {
    state.s = s;
    root.dataset.theme = s.theme;
    root.dataset.fx = s.effects;
    root.dataset.scan = s.scanlines ? '1' : '0';
    root.dataset.float = s.floating ? '1' : '0';
    root.style.setProperty('--speed', s.animSpeed);
    root.style.setProperty('--glow', s.glow);
    root.dataset.pet = s.pet && s.pet.enabled ? '1' : '0';
    root.style.setProperty('--nh', s.notchHeight + 'px');
    root.style.setProperty('--idle-w', 116 + (petOn() ? 56 : 0) + (s.showSeconds ? 62 : 0) + (s.clock24 ? 0 : 36) + 'px');
    updateMiniWidth($('#miniText').textContent);
    onPetSettings();
    updateFocus();
    tick();
    state.lyIdx = -99;
    render();
  }

  // ───────────────────────── clock ─────────────────────────
  function timeParts(d) {
    const s = state.s || {};
    let h = d.getHours();
    let ap = '';
    if (s.clock24 === false) {
      ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    }
    return { hh: s.clock24 === false ? String(h) : pad(h), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), ap };
  }

  function tick() {
    const d = new Date();
    const t = timeParts(d);
    const sec = state.s && state.s.showSeconds;
    $('#idleTime').innerHTML =
      `${t.hh}<span class="colon">:</span>${t.mm}` + (sec ? `<span class="sec">:${t.ss}</span>` : '') + (t.ap ? ` <span class="ap">${t.ap}</span>` : '');
    $('#miniTime').textContent = `${t.hh}:${t.mm}`;
    $('#homeTime').textContent = `${t.hh}:${t.mm}` + (sec ? `:${t.ss}` : '') + (t.ap ? ` ${t.ap}` : '');
    $('#homeDate').textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    $('#homeGreeting').textContent = d.getHours() < 11 ? 'GOOD MORNING / SELAMAT PAGI'
      : d.getHours() < 16 ? 'GOOD AFTERNOON / SELAMAT SIANG'
      : d.getHours() < 19 ? 'GOOD EVENING / SELAMAT SORE' : 'GOOD NIGHT / SELAMAT MALAM';
  }
  (function loop() {
    tick();
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  })();

  // ───────────────────────── Focus Mode (timer lokal, tetap hidup saat tab berubah) ─────────────────────────
  const FOCUS = window.NOTCH_FOCUS;
  try { state.focus = FOCUS.normalize(JSON.parse(localStorage.getItem('notch.focus.v1') || 'null')); }
  catch (_) { state.focus = FOCUS.create(); }

  function saveFocus() {
    try { localStorage.setItem('notch.focus.v1', JSON.stringify(state.focus)); } catch (_) { /* storage optional */ }
  }

  function updateFocus(now = Date.now()) {
    const f = state.focus;
    if (FOCUS.isComplete(f, now)) {
      const recent = now - f.endsAt < 60000;
      state.focus = FOCUS.reset(f);
      saveFocus();
      updateHome();
      if (recent && state.s) {
        pet.react('happy', 2400);
        pushNotif({ id: 'focus' + now, type: 'success', title: 'Sesi fokus selesai ✦',
          message: `${f.minutes} menit selesai. Waktunya istirahat sebentar!`, app: 'FOCUS MODE', duration: 7, time: now, noReact: true });
        sayKey('focus_end', {}, { force: true, state: 'happy' });
      }
    }
    const s = state.focus;
    const active = s.status === 'running';
    $('#focusClock').textContent = FOCUS.format(s, now);
    $('#focusState').textContent = active ? '● IN PROGRESS' : s.status === 'paused' ? 'Ⅱ PAUSED' : '● READY';
    $('#focusToggle').textContent = active ? 'PAUSE' : s.status === 'paused' ? 'RESUME' : 'START FOCUS';
    $('#focusConsole').dataset.status = s.status;
    $('#focusFill').style.width = (FOCUS.progress(s, now) * 100).toFixed(2) + '%';
    $$('#focusModes button').forEach((b) => {
      b.classList.toggle('selected', Number(b.dataset.minutes) === s.minutes);
      b.disabled = s.status !== 'ready';
    });
    $('#idleFocus').hidden = !active;
    $('#miniFocus').hidden = !active;
    $('#idleFocusTime').textContent = FOCUS.format(s, now);
    if (active !== updateFocus.lastActive) {
      updateFocus.lastActive = active;
      requestAnimationFrame(() => updateMiniWidth($('#miniText').textContent));
      pet.action = '';
      pet.sig = '';
      pet.render();
    }
    // Padding idle hit-test ikut bertambah ketika timer ditampilkan.
    const cfg = state.s;
    if (cfg) root.style.setProperty('--idle-w', 116 + (petOn() ? 56 : 0) +
      (cfg.showSeconds ? 62 : 0) + (cfg.clock24 ? 0 : 36) + (active ? 112 : 0) + 'px');
  }

  $('#focusToggle').addEventListener('click', () => {
    const wasRunning = state.focus.status === 'running';
    state.focus = wasRunning ? FOCUS.pause(state.focus) : FOCUS.start(state.focus);
    saveFocus();
    pet.touch();
    if (wasRunning) pet.react('wink', 1500);
    else sayKey('focus_start', {}, { force: true, state: 'think', ms: 2800 });
    pet.render();
    updateHome();
    updateFocus();
  });
  $('#focusReset').addEventListener('click', () => {
    state.focus = FOCUS.reset(state.focus);
    saveFocus(); pet.render(); updateHome(); updateFocus();
  });
  $$('#focusModes button').forEach((btn) => btn.addEventListener('click', () => {
    if (state.focus.status !== 'ready') return;
    state.focus = FOCUS.reset(state.focus, Number(btn.dataset.minutes));
    saveFocus(); updateFocus();
  }));
  updateFocus();
  setInterval(() => { if (state.focus.status === 'running') updateFocus(); }, 250);

  // ───────────────────────── sound ─────────────────────────
  let actx = null;
  const SOUNDS = {
    sent: [[880, 0.07], [1318, 0.1]],
    received: [[1046, 0.08], [784, 0.12]],
    success: [[784, 0.06], [988, 0.06], [1318, 0.1]],
    info: [[988, 0.1]],
    warn: [[440, 0.1], [440, 0.1]],
    error: [[196, 0.15], [147, 0.22]],
  };
  function beep(type) {
    if (!state.s || !state.s.sound) return;
    try {
      actx = actx || new AudioContext();
      const t0 = actx.currentTime;
      (SOUNDS[type] || SOUNDS.info).forEach(([f, d], i) => {
        const t = t0 + i * 0.09;
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + d + 0.03);
      });
    } catch (_) {
      /* audio tidak tersedia */
    }
  }

  // ───────────────────────── notifications ─────────────────────────
  let notifTimer = null;

  function addInbox(n) {
    state.inbox.unshift({ id: n.id, title: n.title, message: n.message, app: n.app, type: n.type, icon: n.icon, glyph: n.glyph, time: n.time });
    state.inbox = state.inbox.slice(0, 50);
    saveInbox();
    if (state.tab === 'inbox' && state.expanded) renderInbox();
  }

  function updateBadge() {
    const b = $('#badge');
    b.hidden = state.unread <= 0;
    b.textContent = state.unread > 9 ? '9+' : state.unread;
  }

  function reactToNotif(n) {
    if (!petOn() || n.noReact) return;
    pet.touch();
    if (n.speak) {
      const t = Date.now();
      const mood = n.type === 'warn' || n.type === 'error' ? 'sad' : 'happy';
      if (t - lastNotifSay > 12000) {
        lastNotifSay = t;
        sayKey(n.speak, {}, { state: mood, ms: 4000 });
      } else pet.react(mood, 1800);
      return;
    }
    const map = { sent: ['sent', 'happy'], received: ['received', 'happy'], error: ['error', 'sad'], success: [null, 'happy'] };
    const m = map[n.type];
    if (!m) return;
    const now = Date.now();
    if (m[0] && now - lastNotifSay > 20000) {
      lastNotifSay = now;
      sayKey(m[0], {}, { state: m[1], ms: 3800 });
    } else pet.react(m[1], 1800);
  }

  function pushNotif(n) {
    if (!n.noInbox) addInbox(n);
    if (state.quiet) {
      // mode senyap (layar terkunci / aplikasi fullscreen): masuk inbox saja, tanpa popup & suara
      if (state.tab !== 'inbox' || !state.expanded) state.unread++;
      updateBadge();
      return;
    }
    reactToNotif(n);
    if (state.expanded) {
      if (state.tab !== 'inbox') state.unread++;
      updateBadge();
      beep(n.type);
      return;
    }
    state.queue.push(n);
    if (state.queue.length > 20) state.queue.shift();
    if (!state.notif) nextNotif();
  }

  function nextNotif() {
    clearTimeout(notifTimer);
    const n = state.queue.shift();
    if (!n) {
      state.notif = null;
      render();
      return;
    }
    state.notif = n;
    const el = $('#notif');
    el.dataset.type = n.type;
    el.style.cursor = n.action ? 'pointer' : '';
    $('#nIcon').innerHTML = n.glyph && ICON[n.glyph] ? ICON[n.glyph] : n.icon ? `<span style="font-size:22px">${escapeHtml(n.icon)}</span>` : ICON[TYPE_ICON[n.type] || 'info'];
    $('#nTitle').textContent = n.title;
    $('#nMsg').textContent = n.message || '';
    $('#nApp').textContent = n.app || '';
    const secs = n.duration || (state.s ? state.s.notifDuration : 5);
    const bar = $('#nBar');
    bar.classList.remove('run');
    void bar.offsetWidth;
    bar.style.animationDuration = secs + 's';
    bar.classList.add('run');
    beep(n.type);
    render();
    notifTimer = setTimeout(endNotif, secs * 1000);
  }

  function endNotif() {
    clearTimeout(notifTimer);
    state.notif = null;
    render();
    if (state.queue.length) setTimeout(() => !state.notif && nextNotif(), 380);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('#notif').addEventListener('click', () => {
    if (state.notif && state.notif.action === 'install-update') api.installUpdate();
    endNotif();
  });

  // inbox
  function ago(t) {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 45) return 'baru saja';
    if (s < 3600) return `${Math.round(s / 60)}m lalu`;
    if (s < 86400) return `${Math.round(s / 3600)}j lalu`;
    return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function renderInbox() {
    const list = $('#inboxList');
    list.textContent = '';
    for (const n of state.inbox) {
      const it = document.createElement('div');
      it.className = 'in-item';
      it.dataset.type = n.type;
      const ic = document.createElement('div');
      ic.className = 'n-icon';
      ic.innerHTML = n.glyph && ICON[n.glyph] ? ICON[n.glyph] : n.icon ? `<span>${escapeHtml(n.icon)}</span>` : ICON[TYPE_ICON[n.type] || 'info'];
      const body = document.createElement('div');
      body.className = 'n-body';
      const t = document.createElement('div');
      t.className = 'n-title';
      t.textContent = (n.app ? n.app + ' · ' : '') + n.title;
      const m = document.createElement('div');
      m.className = 'n-msg';
      m.textContent = n.message || '';
      body.append(t, m);
      const tm = document.createElement('div');
      tm.className = 'in-time';
      tm.textContent = ago(n.time);
      it.append(ic, body, tm);
      list.append(it);
    }
    $('#inboxCount').textContent = `${state.inbox.length} notifikasi`;
  }

  $('#inboxClear').addEventListener('click', () => {
    state.inbox = [];
    saveInbox();
    renderInbox();
  });

  // ───────────────────────── panel open / close ─────────────────────────
  let expandT = null;
  let collapseT = null;
  const holdOpen = () => state.pinned || state.dragging || (state.tab === 'ai' && (document.activeElement === aiInput || state.ai.busy));

  function setTab(t) {
    state.tab = t;
    $$('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === t ? 'page' : 'false'));
    api.setFocusable(t === 'ai' && state.expanded);
    if (t === 'ai') setTimeout(() => state.expanded && state.tab === 'ai' && aiInput.focus(), 200);
    else aiInput.blur();
    if (t === 'inbox') {
      state.unread = 0;
      updateBadge();
      renderInbox();
    }
    if (t === 'music') {
      state.lyIdx = -99;
      requestAnimationFrame(fitTitle);
    }
    if (t === 'home') updateHome();
    if (t === 'shelf') renderShelf();
    render();
    if (petOn() && !state.ai.busy && !pet.hold) {
      const mood = { home: 'happy', ai: 'curious', music: 'excited', inbox: 'peek', shelf: 'proud' }[t];
      pet.react(mood, 1150, t === 'music' ? 'sway' : t === 'shelf' ? 'nod' : 'peek');
    }
  }

  function openPanel(tab) {
    clearTimeout(collapseT);
    clearTimeout(expandT);
    if (!state.expanded) {
      state.expanded = true;
      setTab(tab || (playing() ? 'music' : 'home'));
    } else if (tab) setTab(tab);
    render();
  }

  function closePanel() {
    clearTimeout(collapseT);
    clearTimeout(expandT);
    if (!state.expanded) return;
    state.expanded = false;
    state.pinned = false;
    $('#btnPin').classList.remove('on');
    api.setFocusable(false);
    aiInput.blur();
    pet.action = '';
    pet.sig = '';
    render();
    pet.render();
    if (!state.notif && state.queue.length) nextNotif();
  }

  function scheduleExpand() {
    clearTimeout(collapseT);
    if (!state.s || !state.s.hoverExpand || state.expanded) return;
    clearTimeout(expandT);
    expandT = setTimeout(() => state.over && openPanel(), 140);
  }

  function scheduleCollapse() {
    clearTimeout(expandT);
    clearTimeout(collapseT);
    collapseT = setTimeout(() => {
      if (!state.over && !holdOpen()) closePanel();
    }, 450);
  }

  // ───────────────────────── mouse (click-through di luar island) ─────────────────────────
  function setOver(over) {
    if (over === state.over) return;
    state.over = over;
    if (over) scheduleExpand();
    else if (state.expanded) scheduleCollapse();
    else clearTimeout(expandT);
  }

  // main process melakukan hit-test kursor (andal berjam-jam) dan memberi tahu kita
  api.onHover((inside) => setOver(!!inside));
  // bukti ke main bahwa input mouse benar-benar sampai ke halaman (dipakai pengawas anti-macet)
  let inputT = 0;
  const seen = () => {
    const t = performance.now();
    if (t - inputT > 150) {
      inputT = t;
      api.inputSeen();
    }
  };
  // diagnosis: klik tab yang tidak mengganti tab = renderer macet -> catat bukti ke app.log dan bangun ulang overlay
  const desc = (el) => (el && el.tagName ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') : 'null');
  let downBtn = null;
  document.addEventListener('pointerdown', (e) => {
    downBtn = e.target && e.target.closest ? e.target.closest('#tabs button') : null;
    if (downBtn) downBtn._at = [e.clientX, e.clientY, e.target];
  }, true);
  document.addEventListener('pointerup', () => {
    const b = downBtn;
    downBtn = null;
    if (!b) return;
    const [x, y, tg] = b._at || [0, 0, null];
    setTimeout(() => {
      if (state.tab === b.dataset.tab) return;
      api.diag('tab klik diabaikan', {
        want: b.dataset.tab,
        tab: state.tab,
        view: island.dataset.view,
        expanded: state.expanded,
        dragging: state.dragging,
        pinned: state.pinned,
        target: desc(tg),
        top: desc(document.elementFromPoint(x, y)),
        active: desc(document.activeElement),
        heal: true,
      });
    }, 350);
  }, true);
  window.addEventListener('error', (e) => api.diag('renderer error', { m: e.message, f: e.filename, l: e.lineno }));
  window.addEventListener('unhandledrejection', (e) => api.diag('renderer rejection', { m: String(e.reason && e.reason.message || e.reason) }));
  island.addEventListener('mousemove', seen);
  island.addEventListener('pointerdown', seen, true);
  function sendRect() {
    const r = island.getBoundingClientRect();
    api.reportRect({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  }
  if (window.ResizeObserver) new ResizeObserver(sendRect).observe(island);
  island.addEventListener('transitionend', sendRect);
  window.addEventListener('resize', sendRect);
  setInterval(sendRect, 2000);
  sendRect();

  window.addEventListener('blur', () => {
    if (state.expanded && !state.pinned && !state.over) closePanel();
  });

  island.addEventListener('click', () => {
    if (!state.expanded && !state.notif) openPanel();
  });
  island.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    api.openSettings();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // header buttons
  $('#btnPin').innerHTML = ICON.pin;
  $('#btnSettings').innerHTML = ICON.gear;
  $('#btnClose').innerHTML = ICON.x;
  $('#cPrev').innerHTML = ICON.prev;
  $('#cNext').innerHTML = ICON.next;
  $('#btnPin').addEventListener('click', () => {
    state.pinned = !state.pinned;
    $('#btnPin').classList.toggle('on', state.pinned);
  });
  $('#btnSettings').addEventListener('click', () => api.openSettings());
  $('#btnClose').addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.go)));

  // ───────────────────────── media ─────────────────────────
  const curPos = () => {
    const m = state.media;
    let p = m.pos + (m.status === 'Playing' ? (performance.now() - state.mediaAt) / 1000 : 0);
    if (m.dur > 0) p = Math.min(p, m.dur);
    return Math.max(0, p);
  };

  const fitTitle = () => {
    const span = $('#mTitle');
    const box = span.parentElement;
    span.classList.remove('scroll');
    const overflow = span.scrollWidth - box.clientWidth;
    if (overflow > 4) {
      span.style.setProperty('--shift', `-${overflow + 40}px`);
      span.classList.add('scroll');
    }
  };

  let lastSig = '';
  function updateMediaStatic() {
    const m = state.media;
    const sig = `${m.active}|${m.key}|${m.status}|${m.dur}|${state.thumb ? state.thumb.length : 0}`;
    if (sig === lastSig) return;
    lastSig = sig;
    const has = m.active && m.title;
    island.dataset.mediaActive = has ? '1' : '0';
    $('#mTitle').textContent = has ? m.title : 'Tidak ada musik';
    $('#mArtist').textContent = has ? m.artist || 'Unknown artist' : 'Putar lagu di Spotify / YouTube / dll';
    $('#mApp').textContent = has ? String(m.app || '').replace(/\.exe$/i, '').toUpperCase() : '';
    $('#mDur').textContent = fmt(m.dur);
    $('#cPlay').innerHTML = m.status === 'Playing' ? ICON.pause : ICON.play;
    const img = $('#coverImg');
    if (state.thumb && has) {
      img.src = state.thumb;
      img.hidden = false;
      $('#coverPh').hidden = true;
    } else {
      img.hidden = true;
      $('#coverPh').hidden = false;
    }
    if (state.tab === 'music' && state.expanded) requestAnimationFrame(fitTitle);
    updateHome();
  }

  function updateHome() {
    const m = state.media;
    $('#homeNow').textContent = playing() && m.title ? `♪ ${m.title}${m.artist ? ' — ' + m.artist : ''}` : '♫  Belum ada musik yang diputar';
    $('#homeStatus').textContent = playing() ? 'NOW PLAYING · ' + String(m.app || 'MUSIC').replace(/\.exe$/i, '').toUpperCase()
      : state.focus && state.focus.status === 'running' ? 'FOCUS SESSION IN PROGRESS' : 'SYSTEM ONLINE · READY';
    const u = state.update;
    let t = '';
    if (u) {
      if (u.status === 'downloading') t = `UPDATE v${u.newVersion || ''} ${u.percent || 0}%`;
      else if (u.status === 'ready') t = `UPDATE v${u.newVersion} SIAP — KLIK UNTUK RESTART`;
      else if (u.status === 'available') t = `UPDATE v${u.newVersion} TERSEDIA`;
    }
    const el = $('#homeUpd');
    el.textContent = t;
    el.style.cursor = u && u.status === 'ready' ? 'pointer' : '';
  }
  // Semua ukuran P-Notch bisa disentuh. Double click dan long press berbeda
  // dari satu klik; interaksi di mini/idle tidak membuka panel secara tak sengaja.
  $$('.pet-interactive, #homePet').forEach((el) => {
    let holdTimer = null;
    let tapTimer = null;
    let held = false;
    let pointerStart = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      held = false;
      pointerStart = [e.clientX, e.clientY];
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        held = true;
        clearTimeout(tapTimer);
        pet.interact('hold');
      }, 620);
    });
    el.addEventListener('pointermove', (e) => {
      if (pointerStart && Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 10) {
        clearTimeout(holdTimer);
        pointerStart = null;
      }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => el.addEventListener(type, () => {
      clearTimeout(holdTimer);
      pointerStart = null;
    }));
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (held) { held = false; return; }
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => pet.interact('tap'), 235);
    });
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      clearTimeout(tapTimer);
      if (!held) pet.interact('double');
    });
    el.addEventListener('pointerenter', () => {
      const now = Date.now();
      if (now - pet.lastHover > 16000 && now - pet.lastInteraction > 4500) {
        pet.lastHover = now;
        pet.interact('hover', true);
      }
    });
  });
  $('#homeUpd').addEventListener('click', () => {
    if (state.update && state.update.status === 'ready') api.installUpdate();
  });

  let thumbClearT = null;
  api.onThumb((t) => {
    if (!t || t.key !== state.media.key) return;
    state.thumb = t.thumb;
    state.thumbKey = t.key;
    updateMediaStatic();
  });

  api.onMedia((m) => {
    const keyChanged = (m.key || '') !== (state.media.key || '');
    if (m.thumb) {
      state.thumb = m.thumb;
      state.thumbKey = m.key;
    }
    if (keyChanged && m.key !== state.thumbKey) {
      // cover lama dipertahankan sebentar (album sama / cover baru menyusul); dibuang bila tak kunjung datang
      const k = m.key;
      clearTimeout(thumbClearT);
      thumbClearT = setTimeout(() => {
        if (state.media.key === k && state.thumbKey !== k) {
          state.thumb = null;
          updateMediaStatic();
        }
      }, 12000);
    }
    const wasPlaying = playing();
    state.media = m;
    state.mediaAt = performance.now();
    updateMediaStatic();
    if (keyChanged) state.lyIdx = -99;
    if (playing() !== wasPlaying) {
      pet.action = '';
      pet.sig = '';
      pet.render();
      if (playing()) pet.react('excited', 1450, 'twirl');
    }
    if (playing()) pet.lastActive = Date.now();
    if (keyChanged && playing() && m.title && Date.now() - lastMusicSay > 25000 && Math.random() < 0.4) {
      lastMusicSay = Date.now();
      sayKey('music', { title: m.title }, { state: 'dance', ms: 4000 });
    }
    render();
  });

  api.onLyrics((l) => {
    state.lyrics = l;
    state.lyIdx = -99;
  });

  // kontrol
  $('#cPlay').addEventListener('click', () => api.mediaCmd('playpause'));
  $('#cPrev').addEventListener('click', () => api.mediaCmd('prev'));
  $('#cNext').addEventListener('click', () => api.mediaCmd('next'));
  $('#mBar').addEventListener('click', (e) => {
    const m = state.media;
    if (!m.active || !m.dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sec = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * m.dur;
    api.mediaCmd('seek', sec);
    m.pos = sec;
    state.mediaAt = performance.now();
    state.lyIdx = -99;
  });

  // lirik
  function findLine(lines, t) {
    let lo = 0;
    let hi = lines.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].t <= t) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }

  function setLy(el, text) {
    if (el.textContent !== text) {
      el.textContent = text;
      retrigger(el, 'swap');
    }
  }

  function updateLyrics(pos) {
    const m = state.media;
    const L = state.lyrics;
    const s = state.s;
    const lines = m.active && L.key === m.key ? L.lines : null;
    let idx = -1;
    if (lines) idx = findLine(lines, pos + (s ? s.lyricOffset : 0) / 1000);
    if (idx === state.lyIdx) return;
    state.lyIdx = idx;

    if (!m.active) {
      setLy($('#lyPrev'), '');
      setLy($('#lyCur'), '');
      setLy($('#lyNext'), '');
      setMini('');
      return;
    }
    if (lines) {
      const txt = (i) => (lines[i] ? lines[i].text || '♪' : '');
      setLy($('#lyPrev'), idx > 0 ? txt(idx - 1) : '');
      setLy($('#lyCur'), idx >= 0 ? txt(idx) : '♪');
      setLy($('#lyNext'), txt(idx + 1));
      setMini(s && s.showLyricsMini && idx >= 0 ? txt(idx) : `${m.title}${m.artist ? ' — ' + m.artist : ''}`);
    } else {
      setLy($('#lyPrev'), '');
      setLy($('#lyCur'), L.loading ? 'Mencari lirik…' : '♪ lirik tidak ditemukan');
      setLy($('#lyNext'), '');
      setMini(`${m.title}${m.artist ? ' — ' + m.artist : ''}`);
    }
  }

  function updateMiniWidth(text) {
    const s = state.s;
    if (!s) return;
    let w = s.miniMaxWidth;
    if (s.miniAuto) {
      const m = $('#miniMeasure');
      m.textContent = text || '';
      const overhead = 32 + 20 + 50 + 20 + 24 + (state.focus && state.focus.status === 'running' ? 18 : 0);
      w = Math.min(s.miniMaxWidth, Math.max(280, Math.ceil((m.offsetWidth + overhead) / 20) * 20));
    }
    root.style.setProperty('--mini-w', w + 'px');
  }

  function setMini(text) {
    const span = $('#miniText');
    if (span.textContent !== text) {
      span.textContent = text;
      updateMiniWidth(text);
      span.style.animation = 'none';
      void span.offsetWidth;
      span.style.animation = '';
    }
  }

  setInterval(() => {
    const m = state.media;
    if (!m.active) {
      updateLyrics(0);
      return;
    }
    const pos = curPos();
    if (state.expanded && state.tab === 'music') {
      $('#mCur').textContent = fmt(pos);
      $('#mFill').style.width = m.dur > 0 ? Math.min(100, (pos / m.dur) * 100) + '%' : '0%';
    }
    updateLyrics(pos);
  }, 100);

  // ───────────────────────── AI agent ─────────────────────────
  function addMsg(cls, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.textContent = text || '';
    const empty = $('#aiEmpty');
    if (empty) empty.hidden = true;
    aiLog.append(d);
    aiLog.scrollTop = aiLog.scrollHeight;
    return d;
  }

  function typeInto(el, text) {
    return new Promise((resolve) => {
      let i = 0;
      const step = Math.max(1, Math.ceil(text.length / 120));
      const id = setInterval(() => {
        i = Math.min(text.length, i + step);
        el.textContent = text.slice(0, i);
        aiLog.scrollTop = aiLog.scrollHeight;
        if (i >= text.length) {
          clearInterval(id);
          resolve();
        }
      }, 16);
    });
  }

  async function sendAI(text) {
    text = String(text || '').trim();
    if (!text || state.ai.busy) return;
    state.ai.busy = true;
    state.ai.messages.push({ role: 'user', content: text });
    state.ai.messages = state.ai.messages.slice(-30);
    addMsg('user', text);
    const typing = addMsg('bot typing', '');
    pet.touch();
    pet.setHold('think');
    aiInput.value = '';
    aiInput.style.height = 'auto';
    $('#aiSend').disabled = true;
    try {
      const res = await api.aiChat(state.ai.messages);
      typing.remove();
      if (!res || res.error) throw new Error((res && res.error) || 'Gagal menghubungi AI.');
      for (const a of res.actions || []) {
        let args = '';
        try { args = JSON.stringify(a.args || {}); } catch (_) { /* abaikan */ }
        addMsg('tool', `⚙ ${a.tool}${args && args !== '{}' ? ' ' + args.slice(0, 60) : ''}`);
      }
      const el = addMsg('bot', '');
      if (petOn()) el.dataset.name = personaNow().name.toUpperCase();
      pet.react('happy', 1800);
      const reply = String(res.reply || 'Selesai.');
      state.ai.messages.push({ role: 'assistant', content: reply });
      await typeInto(el, reply);
    } catch (e) {
      typing.remove();
      pet.react('sad', 2600);
      addMsg('err', e && e.message ? e.message : 'Gagal menghubungi AI.');
      state.ai.messages.pop();
    } finally {
      pet.setHold(null);
      state.ai.busy = false;
      $('#aiSend').disabled = false;
      if (state.expanded && state.tab === 'ai') aiInput.focus();
      if (!state.over && !holdOpen()) scheduleCollapse();
    }
  }

  $('#aiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    sendAI(aiInput.value);
  });
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendAI(aiInput.value);
    }
  });
  aiInput.addEventListener('input', () => {
    aiInput.style.height = 'auto';
    aiInput.style.height = Math.min(64, aiInput.scrollHeight) + 'px';
  });
  $$('#aiChips [data-q]').forEach((b) => b.addEventListener('click', () => sendAI(b.dataset.q)));
  $('#aiClear').addEventListener('click', () => {
    state.ai.messages = [];
    aiLog.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'ai-empty'; empty.id = 'aiEmpty';
    empty.innerHTML = '<div class="ai-empty-glyph">✳</div><strong>HELLO, HUMAN.</strong><span>Ada yang bisa kubantu hari ini?</span>';
    aiLog.append(empty);
  });


  // ───────────────────────── Shelf: file sementara ─────────────────────────
  state.shelf = [];
  const fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`);

  function renderShelf() {
    const list = $('#shelfList');
    list.textContent = '';
    for (const it of state.shelf) {
      const row = document.createElement('div');
      row.className = 'sh-item';
      row.draggable = true;
      row.title = 'Seret keluar untuk memakai · klik 2x untuk membuka';
      const ic = document.createElement('div');
      ic.className = 'n-icon';
      ic.innerHTML = it.isDir ? ICON.folder : ICON.file;
      const body = document.createElement('div');
      body.className = 'n-body';
      const nm = document.createElement('div');
      nm.className = 'n-title';
      nm.textContent = it.name;
      const meta = document.createElement('div');
      meta.className = 'n-msg';
      meta.textContent = `${fmtBytes(it.size)} · ${ago(it.added)}`;
      body.append(nm, meta);
      const x = document.createElement('button');
      x.className = 'ico sh-x';
      x.innerHTML = ICON.x;
      x.title = 'Hapus dari shelf';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        api.shelfRemove(it.id);
      });
      row.append(ic, body, x);
      row.addEventListener('dragstart', (e) => {
        e.preventDefault();
        api.shelfDrag(it.id);
      });
      row.addEventListener('dblclick', () => api.shelfOpen(it.id));
      list.append(row);
    }
    $('#shelfCount').textContent = `${state.shelf.length} file`;
    const b = $('#shelfBadge');
    b.textContent = state.shelf.length;
    b.hidden = !state.shelf.length;
  }

  api.onShelf((items) => {
    state.shelf = items || [];
    renderShelf();
  });
  $('#shelfClear').addEventListener('click', () => api.shelfClear());

  const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  let dragDepth = 0;
  const endDrag = () => {
    dragDepth = 0;
    state.dragging = false;
    island.classList.remove('dropping');
  };
  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e) || !(state.s && state.s.shelf && state.s.shelf.enabled)) return;
    e.preventDefault();
    dragDepth++;
    state.dragging = true;
    island.classList.add('dropping');
    openPanel('shelf');
  });
  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) endDrag();
  });
  document.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const paths = files.map((f) => api.pathOf(f)).filter(Boolean);
    endDrag();
    if (!state.s || !state.s.shelf || !state.s.shelf.enabled) return;
    if (!paths.length) {
      if (files.length) pet.react('sad', 2000); // mis. file virtual dari browser/arsip: tidak punya path
      return;
    }
    const n = await api.shelfAdd(paths);
    if (n) pet.react('happy', 1800);
  });

  // ───────────────────────── HUD perangkat ─────────────────────────
  let hudT = null;
  let lastVolSay = 0;
  function showHud(h) {
    if (state.expanded || state.quiet || !h) return;
    const el = $('#hud');
    let glyph = 'volume';
    let label = 'VOL';
    let val = '';
    let pct = null;
    let muted = false;
    if (h.kind === 'volume') {
      pct = Math.round((h.value || 0) * 100);
      muted = !!h.muted || pct === 0;
      glyph = muted ? 'volmute' : pct < 35 ? 'vollow' : 'volume';
      val = muted ? 'MUTE' : String(pct);
      if (!muted && pct >= 90 && Date.now() - lastVolSay > 60000) {
        lastVolSay = Date.now();
        sayKey('vol_high', {}, { state: 'sad', ms: 3500 });
      }
    } else if (h.kind === 'brightness') {
      pct = Math.round(h.value || 0);
      glyph = 'sun';
      label = 'BRIGHT';
      val = String(pct);
    } else if (h.kind === 'mic') {
      glyph = h.on ? 'mic' : 'micoff';
      label = 'MIC';
      val = h.on ? 'ON' : 'MUTED';
      muted = !h.on;
    } else if (h.kind === 'caps') {
      glyph = 'caps';
      label = 'CAPS';
      val = h.on ? 'ON' : 'OFF';
    } else return;
    el.dataset.kind = h.kind;
    el.dataset.muted = muted ? '1' : '0';
    $('#hIcon').innerHTML = ICON[glyph];
    $('#hLabel').textContent = label;
    $('#hVal').textContent = val;
    $('#hFill').style.width = (pct == null ? 0 : Math.max(0, Math.min(100, pct))) + '%';
    state.hud = h.kind;
    pet.touch();
    render();
    clearTimeout(hudT);
    hudT = setTimeout(() => {
      state.hud = null;
      render();
    }, 1800);
  }
  api.onHud(showHud);

  // ───────────────────────── events dari main ─────────────────────────
  api.onSettings(applySettings);

  // ── muncul / hilang / tidur ──
  const clearFx = () => island.classList.remove('pre-intro', 'intro', 'vanish', 'wake');
  if (new URLSearchParams(location.search).get('intro') === '1') {
    island.classList.add('pre-intro');
    setTimeout(() => island.classList.remove('pre-intro'), 4000); // pengaman bila event intro tidak datang
  }
  island.addEventListener('animationend', (e) => {
    if (e.target !== island) return;
    if (e.animationName === 'introIn') island.classList.remove('intro');
    if (e.animationName === 'wakePop') island.classList.remove('wake');
    if (e.animationName === 'vanishOut') api.vanishDone();
  });
  api.onIntro(() => {
    clearFx();
    void island.offsetWidth;
    island.classList.add('intro');
    pet.react('curious', 900, 'peek');
  });
  api.onVanish(() => {
    clearFx();
    island.classList.add('vanish');
    pet.stopMotion();
  });
  api.onQuiet((q) => {
    state.quiet = !!q;
    if (state.quiet) {
      state.queue = [];
      state.hud = null;
      pet.stopMotion();
      if (state.notif) {
        clearTimeout(notifTimer);
        state.notif = null;
      }
      render();
    }
  });
  api.onIdle((idle) => {
    root.dataset.sleep = idle ? '1' : '0';
    if (idle) {
      if (!playing()) {
        pet.sleeping = true;
        pet.render();
      }
    } else {
      clearFx();
      void island.offsetWidth;
      island.classList.add('wake');
      pet.touch();
      pet.react('happy', 1600);
    }
  });
  api.onNotify(pushNotif);
  api.onToggleAI(() => {
    if (state.expanded && state.tab === 'ai') closePanel();
    else openPanel('ai');
  });
  api.onUpdate((u) => {
    state.update = u;
    updateHome();
    if (u.status === 'ready' && state.updNotified !== u.newVersion) {
      state.updNotified = u.newVersion;
      sayKey('update', {}, { state: 'happy' });
      pushNotif({
        id: 'upd' + Date.now(), type: 'success', title: 'Update siap dipasang',
        message: `Pocket Notch v${u.newVersion} — klik untuk restart`, app: 'UPDATER', icon: '', duration: 15, time: Date.now(), action: 'install-update',
      });
    }
  });

  updateBadge();
  updateMediaStatic();
  render();
  api.ready();
})();
