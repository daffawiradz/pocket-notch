/* P-Notch motion planner: deterministic, framework-free, shared with Node tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PET_MOTION = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Non-repeating micro-activities. Durations include the whole animation, not the pause.
  const ACTIVITIES = Object.freeze([
    { id: 'patrol', duration: 3000, travel: true, mood: 'walk' },
    { id: 'tiptoe', duration: 3600, travel: true, mood: 'curious' },
    { id: 'moonwalk', duration: 3000, travel: true, mood: 'proud' },
    { id: 'skip', duration: 2350, travel: true, mood: 'happy' },
    { id: 'peek', duration: 1600, mood: 'peek' },
    { id: 'stretch', duration: 2000, mood: 'stretch' },
    { id: 'look', duration: 1900, mood: 'curious' },
    { id: 'twirl', duration: 1800, mood: 'excited' },
    { id: 'sway', duration: 2300, mood: 'happy' },
    { id: 'nod', duration: 1250, mood: 'proud' },
    { id: 'settle', duration: 2500, mood: 'sleepy' },
  ]);
  const RESPONSES = Object.freeze({
    poki: {
      tap: ['Hup! Kena aku!', 'Eh, ada yang manggil?', 'Sini, tos virtual!', 'Aku lagi eksplorasi, nih.', 'Jangan sampai aku jatuh, ya!', 'Ada rahasia di balik pikselku.', 'Ketemu! Kamu cepat juga.', 'Lagi latihan salto. Mau lihat?', 'Tada! Aku masih di sini.', 'Hihi, aku jadi salah tingkah.', 'Aku punya banyak gaya!', 'Ayo, satu petualangan lagi.'],
      double: ['WOO! Kombo dua ketukan!', 'Waduh, dunia ikut berputar!', 'Kecepatan maksimal!', 'Aku bisa akrobat juga!', 'Ini tarian rahasiaku!', 'Dobel klik, dobel semangat!'],
      hold: ['Ooh, dielus ya? Makasih!', 'Nyaman juga berhenti sebentar.', 'Aku bisa diam... sebentar.', 'Hehe, mode tenang aktif.', 'Ada yang perhatian, nih.', 'Baterai semangatku penuh!'],
    },
    nova: {
      tap: ['Kontak diterima.', 'Halo. Ada misi baru?', 'Sistem ekspresi aktif.', 'Aku sedang patroli.', 'Pemindaian selesai. Aman.', 'Satu sapaan tercatat.', 'Interaksi yang menyenangkan.', 'Siap merespons.', 'Aku tetap siaga.', 'Gerakan baru berhasil.', 'Memeriksa koordinat.', 'Halo kembali.'],
      double: ['Input ganda. Manuver aktif.', 'Rotasi selesai. Stabil.', 'Perintah kejutan diterima.', 'Mode akrobatik diaktifkan.', 'Dua ketukan terdeteksi.', 'Sinkronisasi gerak berhasil.'],
      hold: ['Mode santai diaktifkan.', 'Terima kasih sudah mampir.', 'Mengisi ulang energi sosial.', 'Tenang. Aku masih siaga.', 'Jeda yang menyenangkan.', 'Sistem dalam kondisi nyaman.'],
    },
    glitch: {
      tap: ['Woi, ketahuan nongkrong!', 'Hei! Aku bukan tombol biasa.', 'Refleksku masih oke, kan?', 'Apa? Lagi mikir berat nih.', 'Aku hampir jadi ninja.', 'Jangan kaget kalau aku kabur.', 'Kena! Sekarang giliranku.', 'Piksel-pikselku geli.', 'Boleh juga refleksmu.', 'Ssst, aku sedang menyamar.', 'Satu colek, satu drama.', 'Aku punya jurus lain.'],
      double: ['Gawat, mode putar aktif!', 'Dobel? Serius amat!', 'Salah kode! Eh, bercanda.', 'Aku bukan mesin pinball!', 'Combo diterima. Pamer dulu.', 'Ini bukan bug, ini gaya.'],
      hold: ['Ya sudah, kita damai dulu.', 'Eits, ternyata nyaman.', 'Rahasia: aku suka jeda.', 'Aku sedang isi ulang kejahilan.', 'Baiklah, lima detik damai.', 'Jangan bilang siapa-siapa, ya.'],
    },
  });
  const REACTIONS = Object.freeze({
    tap: [
      { mood: 'happy', action: 'hop' }, { mood: 'curious', action: 'peek' },
      { mood: 'proud', action: 'nod' }, { mood: 'shy', action: 'shy' },
      { mood: 'excited', action: 'twirl' }, { mood: 'wink', action: 'wave' },
      { mood: 'surprised', action: 'spring' }, { mood: 'grin', action: 'sway' },
    ],
    double: [
      { mood: 'excited', action: 'twirl' }, { mood: 'dizzy', action: 'wobble' },
      { mood: 'surprised', action: 'spring' }, { mood: 'happy', action: 'hop' },
    ],
    hold: [
      { mood: 'shy', action: 'shy' }, { mood: 'sleepy', action: 'settle' },
      { mood: 'proud', action: 'nod' }, { mood: 'happy', action: 'wave' },
    ],
    hover: [
      { mood: 'curious', action: 'peek' }, { mood: 'wink', action: 'wave' },
      { mood: 'happy', action: 'nod' },
    ],
  });
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  // Recent choices excluded from pool, only fall back when exhausted.
  function pick(pool, recent = [], random = Math.random, key = (x) => x.id) {
    if (!Array.isArray(pool) || !pool.length) return null;
    const avoided = new Set(recent.slice(-Math.min(4, pool.length - 1)));
    const allowed = pool.filter((item) => !avoided.has(key(item)));
    const choices = allowed.length ? allowed : pool;
    return choices[Math.floor(clamp(Number(random()) || 0, 0, 0.999999) * choices.length)];
  }
  function nextActivity(recent = [], random = Math.random, preferTravel = false) {
    // Prefer walking occasionally, but never sacrifice the non-repetition rule.
    if (preferTravel) {
      const available = ACTIVITIES.filter((a) => a.travel && !recent.includes(a.id));
      if (available.length) return pick(available, recent, random);
    }
    return pick(ACTIVITIES, recent, random);
  }

  // Full-width patrol: the sprite stays inside both rounded ends of the notch.
  // The CSS actor starts at `inset` px; its translateX is relative to that point.
  function walkBounds(laneWidth, actorWidth = 21, inset = 6) {
    const width = Math.max(0, Number(laneWidth) || 0);
    const sprite = Math.max(0, Number(actorWidth) || 0);
    const edge = Math.max(0, Number(inset) || 0);
    return { min: 0, max: Math.max(0, width - sprite - edge * 2) };
  }
  function nextPatrolTarget(position, bounds, random = Math.random) {
    const max = Math.max(0, Number(bounds && bounds.max) || 0);
    const from = clamp(Number(position) || 0, 0, max);
    const variance = Math.min(6, max * 0.05);
    const wiggle = clamp(Number(random()) || 0, 0, 1) * variance;
    return from <= max / 2 ? max - wiggle : wiggle;
  }
  function walkDuration(activityId, distance) {
    const speed = { patrol: 45, tiptoe: 34, moonwalk: 43, skip: 61 }[activityId] || 45;
    // Keeps walk speed similar when notch width increases (seconds / AM-PM / focus).
    return Math.round(clamp(Math.max(0, Number(distance) || 0) / speed * 1000, 900, 7200));
  }
  function nextReaction(trigger, personaId, recentActions = [], recentLines = [], random = Math.random) {
    const kind = Object.prototype.hasOwnProperty.call(REACTIONS, trigger) ? trigger : 'tap';
    const acting = pick(REACTIONS[kind], recentActions, random, (x) => x.action);
    const persona = RESPONSES[personaId] || RESPONSES.poki;
    const lines = persona[kind === 'hover' ? 'tap' : kind];
    const entries = lines.map((line, i) => ({ id: kind + ':' + i, line }));
    const chosen = pick(entries, recentLines, random);
    return { ...acting, line: chosen.line, lineId: chosen.id };
  }
  function blinkDelay(random = Math.random) { return Math.round(2600 + clamp(Number(random()) || 0, 0, 1) * 5100); }
  function pauseDelay(random = Math.random) { return Math.round(650 + clamp(Number(random()) || 0, 0, 1) * 2400); }
  return { activities: ACTIVITIES, pick, nextActivity, nextReaction, blinkDelay, pauseDelay,
    walkBounds, nextPatrolTarget, walkDuration };
});
