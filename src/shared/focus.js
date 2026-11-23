/* Focus session state machine. Pure and deterministic for rendering & testing. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NOTCH_FOCUS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const OPTIONS = [15, 25, 45];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const create = (minutes = 25) => ({ minutes: OPTIONS.includes(minutes) ? minutes : 25, status: 'ready', remainingMs: (OPTIONS.includes(minutes) ? minutes : 25) * 60000, endsAt: 0 });
  const duration = (s) => s.minutes * 60000;
  const remaining = (s, now = Date.now()) => s.status === 'running'
    ? clamp(s.endsAt - now, 0, duration(s))
    : clamp(s.remainingMs, 0, duration(s));
  function normalize(raw, now = Date.now()) {
    if (!raw || !OPTIONS.includes(raw.minutes) || !['ready', 'running', 'paused'].includes(raw.status)) return create();
    const s = { minutes: raw.minutes, status: raw.status, remainingMs: Number(raw.remainingMs) || 0, endsAt: Number(raw.endsAt) || 0 };
    if (s.status === 'running' && (!Number.isFinite(s.endsAt) || s.endsAt <= 0)) return create(s.minutes);
    if (s.status !== 'running') s.remainingMs = remaining(s, now);
    return s;
  }
  function start(s, now = Date.now()) {
    if (s.status === 'running') return { ...s };
    const ms = s.status === 'paused' ? remaining(s, now) : duration(s);
    return { ...s, status: 'running', remainingMs: ms, endsAt: now + ms };
  }
  function pause(s, now = Date.now()) {
    if (s.status !== 'running') return { ...s };
    return { ...s, status: 'paused', remainingMs: remaining(s, now), endsAt: 0 };
  }
  function reset(s, minutes = s.minutes) { return create(minutes); }
  const isComplete = (s, now = Date.now()) => s.status === 'running' && s.endsAt <= now;
  const progress = (s, now = Date.now()) => 1 - remaining(s, now) / duration(s);
  const format = (s, now = Date.now()) => {
    const seconds = Math.ceil(remaining(s, now) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  return { OPTIONS, create, normalize, start, pause, reset, remaining, progress, isComplete, format };
});
