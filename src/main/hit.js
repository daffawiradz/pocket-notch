'use strict';
// Apakah kursor (koordinat layar, DIP) berada di dalam island?
// bounds = posisi jendela overlay di layar, rect = kotak island relatif jendela (px CSS).
function isInside(cursor, bounds, rect, pad = 4) {
  if (!cursor || !bounds || !rect) return false;
  const x = cursor.x - bounds.x;
  const y = cursor.y - bounds.y;
  return x >= rect.l - pad && x <= rect.r + pad && y >= rect.t - pad && y <= rect.b + pad;
}

function validRect(r) {
  return !!r && ['l', 't', 'r', 'b'].every((k) => Number.isFinite(r[k])) && r.r >= r.l && r.b >= r.t;
}

module.exports = { isInside, validRect };
