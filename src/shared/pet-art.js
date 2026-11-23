/* P-Notch pixel mascot artwork. Pure SVG renderer shared by overlay and Settings. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PET_ART = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const moods = new Set(['idle', 'happy', 'talk', 'dance', 'think', 'sad', 'sleep', 'wink', 'surprised', 'walk', 'curious', 'grin', 'proud', 'shy', 'excited', 'dizzy', 'peek', 'stretch', 'sleepy']);
  const features = {
    normal: { eyes: [[7, 11, 3, 3], [15, 11, 3, 3]], shine: [[7, 11], [15, 11]], mouth: [[11, 16, 2, 1], [10, 15, 1, 1], [13, 15, 1, 1]] },
    happy: { eyes: [[7, 12], [8, 11], [9, 12], [15, 12], [16, 11], [17, 12]], mouth: [[10, 15], [11, 16, 2, 1], [13, 15]] },
    blink: { eyes: [[7, 12, 3, 1], [15, 12, 3, 1]], mouth: [[11, 16, 2, 1], [10, 15], [13, 15]] },
    talk: { eyes: [[7, 11, 3, 3], [15, 11, 3, 3]], shine: [[7, 11], [15, 11]], mouth: [[11, 15, 2, 3]] },
    think: { eyes: [[7, 10, 3, 3], [15, 11, 3, 3]], shine: [[7, 10], [15, 11]], mouth: [[12, 16, 2, 1]] },
    sad: { eyes: [[7, 11, 3, 2], [15, 11, 3, 2]], mouth: [[10, 17], [11, 16, 2, 1], [13, 17]] },
    sleep: { eyes: [[7, 12, 3, 1], [15, 12, 3, 1]], mouth: [[11, 16, 2, 1]] },
    wink: { eyes: [[7, 11, 3, 3], [15, 12, 3, 1]], shine: [[7, 11]], mouth: [[10, 15], [11, 16, 2, 1], [13, 15]] },
    surprised: { eyes: [[7, 11, 3, 3], [15, 11, 3, 3]], shine: [[7, 11], [15, 11]], mouth: [[11, 15, 2, 3]] },
    curious: { eyes: [[8, 10, 3, 3], [16, 11, 3, 3]], shine: [[8, 10], [16, 11]], mouth: [[12, 16, 2, 1]] },
    grin: { eyes: [[7, 12], [8, 11], [9, 12], [15, 12], [16, 11], [17, 12]], mouth: [[9, 15], [10, 16, 4, 1], [14, 15]] },
    proud: { eyes: [[7, 11, 3, 2], [15, 11, 3, 2]], mouth: [[10, 15], [11, 16, 2, 1], [13, 15]] },
    shy: { eyes: [[8, 12, 2, 2], [16, 12, 2, 2]], mouth: [[11, 16, 2, 1]] },
    dizzy: { eyes: [[7, 11], [9, 13], [9, 11], [7, 13], [15, 11], [17, 13], [17, 11], [15, 13]], mouth: [[11, 16, 2, 1]] },
    peek: { eyes: [[8, 11, 3, 3], [16, 11, 3, 3]], shine: [[8, 11], [16, 11]], mouth: [[11, 16, 2, 1]] },
    sleepy: { eyes: [[7, 12, 3, 1], [15, 12, 3, 1]], mouth: [[11, 16, 2, 1]] },
  };

  const safeColor = (value, fallback) => /^#[0-9a-fA-F]{3,8}$/.test(value || '') ? value : fallback;
  function svg(persona, mood = 'idle', options = {}) {
    if (!persona || !persona.colors) return '';
    const c = persona.colors;
    const body = safeColor(c.body, '#ff8fd2');
    const accent = safeColor(c.accent, '#7cf2ff');
    const cheek = safeColor(c.cheek, '#ffd6ef');
    const dark = '#20142f';
    const shadow = '#392241';
    const moodKey = moods.has(mood) ? mood : 'idle';
    const key = options.blink && ['idle', 'walk', 'think', 'talk', 'wink', 'curious', 'peek', 'proud'].includes(moodKey) ? 'blink'
      : ['dance', 'excited', 'stretch'].includes(moodKey) ? 'happy'
      : ['idle', 'walk'].includes(moodKey) ? 'normal'
      : moodKey === 'talk' && !options.mouthOpen ? 'normal' : moodKey;
    const face = features[key];
    const rect = (x, y, w = 1, h = 1, fill = dark) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    const blocks = (pts, fill) => pts.map(([x, y, w, h]) => rect(x, y, w || 1, h || 1, fill)).join('');
    const rows = [
      [5, 8, 8], [6, 6, 12], [7, 5, 14], [8, 4, 16], [9, 4, 16],
      [10, 3, 18], [11, 3, 18], [12, 3, 18], [13, 3, 18],
      [14, 3, 18], [15, 4, 16], [16, 4, 16], [17, 5, 14], [18, 6, 12],
    ];
    // Body drawn pixel-by-pixel, with a one-pixel dark outline that remains crisp at 20 px.
    const shell = rows.map(([y, x, width]) => rect(x, y, width, 1, dark)).join('');
    const fill = rows.slice(1, -1).map(([y, x, width]) => rect(x + 1, y, width - 2, 1, y > 14 ? cheek : body)).join('');
    const highlights = blocks([[7, 8, 4, 1], [6, 9, 2, 2], [9, 7, 4, 1], [7, 10, 1, 1]], cheek);
    const shade = blocks([[17, 9, 1, 5], [18, 10, 1, 4], [16, 16, 2, 1], [14, 17, 2, 1]], shadow);
    // Separate limbs so motion CSS can animate walking and waving independently.
    const leftArm = `<g class="pet-arm-left">${blocks([[2, 12, 2, 3]], dark)}${blocks([[3, 12, 1, 2]], body)}</g>`;
    const rightArm = `<g class="pet-arm-right">${blocks([[20, 12, 2, 3]], dark)}${blocks([[20, 12, 1, 2]], body)}</g>`;
    const leftFoot = `<g class="pet-foot-left">${blocks([[7, 18, 3, 2]], dark)}${blocks([[8, 18, 2, 1]], body)}</g>`;
    const rightFoot = `<g class="pet-foot-right">${blocks([[14, 18, 3, 2]], dark)}${blocks([[15, 18, 2, 1]], body)}</g>`;
    let accessory = '';
    if (persona.accessory === 'headphones') {
      accessory = blocks([[6, 3, 12, 1], [5, 4, 2, 5], [17, 4, 2, 5], [3, 9, 3, 5], [18, 9, 3, 5]], dark)
        + blocks([[7, 4, 10, 1], [4, 10, 2, 3], [18, 10, 2, 3]], accent);
    } else if (persona.accessory === 'horns') {
      accessory = blocks([[5, 2, 2, 5], [17, 2, 2, 5], [4, 1, 2, 2], [18, 1, 2, 2]], dark)
        + blocks([[5, 2, 1, 4], [18, 2, 1, 4], [4, 1], [19, 1]], accent);
    } else {
      accessory = blocks([[11, 1, 2, 4], [10, 0, 4, 2]], dark)
        + blocks([[11, 0, 2, 2], [11, 2, 2, 2]], accent);
    }
    const cheeks = blocks([[5, 14, moodKey === 'shy' ? 3 : 2, 1], [17, 14, moodKey === 'shy' ? 3 : 2, 1]], accent);
    const gaze = Number(options.gaze) === -1 ? -1 : Number(options.gaze) === 1 ? 1 : 0;
    const eyes = `<g class="pet-eyes" transform="translate(${gaze} 0)">${blocks(face.eyes, dark)}${blocks(face.shine || [], '#fffafc')}</g>`;
    const mouth = blocks(face.mouth, dark);
    const spark = ['happy', 'wink', 'surprised', 'excited', 'proud'].includes(moodKey)
      ? `<g fill="${accent}" class="pet-spark">${blocks([[1, 5], [0, 6], [2, 6], [1, 7], [22, 5], [21, 6], [23, 6], [22, 7]], accent)}</g>` : '';
    const tears = moodKey === 'sad' ? blocks([[8, 14, 1, 2], [17, 14, 1, 2]], accent) : '';
    const svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22" shape-rendering="crispEdges" focusable="false" aria-hidden="true">`
      + `<g class="pet-art">${leftArm}${rightArm}${leftFoot}${rightFoot}${accessory}${shell}${fill}${highlights}${shade}${cheeks}${eyes}${mouth}${tears}</g>${spark}</svg>`;
    return svgOut;
  }
  return { svg, moods: [...moods] };
});
