'use strict';
let fs, path;
if (typeof module !== 'undefined' && typeof require !== 'undefined') {
  fs = require('fs');
  path = require('path');
}
/**
 * @typedef {Object} AppConfig
 * @property {'180' | '270' | '360'} fanMode - The angular span of the chart in degrees.
 * @property {number} maxGenerations - Maximum depth of descendant rings to render.
 * @property {number} baseRingWidth - Radial width of the generation-0 ring (pixels).
 * @property {number} ringWidthDecay - Fraction by which each subsequent ring's width decreases.
 * @property {number} minRingWidth - Minimum radial width to prevent distant rings from becoming unreadable.
 * @property {number} centerRadius - Radius of the central disc representing the root person.
 * @property {number} minArcAngleDeg - Minimum angular span for a cell; smaller spans are still rendered but may trigger radial text mode.
 * @property {boolean} showSpouses - Whether to render a spouse strip for each individual.
 * @property {number} spouseStripRatio - Fraction of a cell's radial height occupied by the spouse strip.
 * @property {number} maxFontSize - Maximum font size for single-line text (px).
 * @property {number} maxBrokenLineFontSize - Maximum font size for multi-line text (px).
 * @property {number} maxYearFontSize - Maximum font size for the year string in a label (px).
 * @property {number} minFontSize - Threshold below which text is truncated.
 * @property {number} minCurvedArcPx - Reserved for future use: minimum arc length for curved text.
 * @property {boolean} showBirthDeath - Whether to include birth/death years in the labels.
 * @property {string} borderColor - Stroke color for cell boundaries.
 * @property {number} borderWidth - Stroke width for cell boundaries.
 * @property {number} exportDPI - Target DPI for static image exports.
 * @property {string} textColor - Primary text color for name labels.
 * @property {string} textColorLight - Alternative lighter text color.
 * @property {Object} colorDeltas - HSL deltas for sex-based variations.
 * @property {Object} colorDeltas.male - Saturation, lightness, and hue deltas for males.
 * @property {Object} colorDeltas.female - Saturation, lightness, and hue deltas for females.
 * @property {Object} colorDeltas.spouse - Saturation, lightness, and hue deltas for the spouse strip.
 */

// Arc extents for each fan mode. Angles follow SVG convention: 0 = 3 o'clock,
// positive = clockwise. All angles in radians.
const FAN_MODES = {
  '180': { totalAngle: Math.PI, startAngle: -Math.PI }, // left→top→right (top half)
  '270': { totalAngle: Math.PI * 1.5, startAngle: -Math.PI * 1.25 }, // lower-left→top→lower-right (flat bottom)
  '360': { totalAngle: Math.PI * 2, startAngle: -Math.PI }, // full circle, starting at 9 o'clock
};

// ── COLOR PALETTES ────────────────────────────────────────────────────────────
const PALETTES = [
  { name: "Autumn Maple", background: "#ffffff", generations: [
    { gen: 1, bg: "#6B1522", text: "#FFFFFF", line: "#7A2C38" },
    { gen: 2, bg: "#9B2830", text: "#FFFFFF", line: "#A53E45" },
    { gen: 3, bg: "#C84828", text: "#FFFFFF", line: "#CE5A3E" },
    { gen: 4, bg: "#D87030", text: "#1A1A1A", line: "#DC7E45" },
    { gen: 5, bg: "#E09838", text: "#1A1A1A", line: "#E3A24C" },
    { gen: 6, bg: "#C8B040", text: "#1A1A1A", line: "#CEB853" },
    { gen: 7, bg: "#98A840", text: "#1A1A1A", line: "#A2B153" },
    { gen: 8, bg: "#689038", text: "#FFFFFF", line: "#779B4C" },
    { gen: 9, bg: "#487830", text: "#FFFFFF", line: "#5A8645" },
    { gen: 10, bg: "#305828", text: "#FFFFFF", line: "#45693E" }
  ]},
  { name: "Heritage Gradient (Monochromatic Blues)", background: "#ffffff", generations: [
    { gen: 1, bg: "#00203F", text: "#FFFFFF", line: "#1A3652" },
    { gen: 2, bg: "#00325A", text: "#FFFFFF", line: "#1A476B" },
    { gen: 3, bg: "#004B76", text: "#FFFFFF", line: "#1A5D84" },
    { gen: 4, bg: "#006494", text: "#FFFFFF", line: "#1A749F" },
    { gen: 5, bg: "#137EAC", text: "#FFFFFF", line: "#2B8BB4" },
    { gen: 6, bg: "#2499C5", text: "#1A1A1A", line: "#3AA3CB" },
    { gen: 7, bg: "#4DB3D2", text: "#1A1A1A", line: "#5FBBD7" },
    { gen: 8, bg: "#7DCBDE", text: "#1A1A1A", line: "#8AD0E1" },
    { gen: 9, bg: "#ADE2EB", text: "#1A1A1A", line: "#B5E5ED" },
    { gen: 10, bg: "#E0F4F7", text: "#1A1A1A", line: "#E3F5F8" }
  ]},
  { name: "Golden Era (Earth & Amber)", background: "#ffffff", generations: [
    { gen: 1, bg: "#4B3621", text: "#FFFFFF", line: "#5D4A37" },
    { gen: 2, bg: "#6F4E37", text: "#FFFFFF", line: "#7D604B" },
    { gen: 3, bg: "#8B5E3C", text: "#FFFFFF", line: "#976E50" },
    { gen: 4, bg: "#A67C52", text: "#FFFFFF", line: "#AF8963" },
    { gen: 5, bg: "#C29B6D", text: "#1A1A1A", line: "#C8A57C" },
    { gen: 6, bg: "#DDBB88", text: "#1A1A1A", line: "#E0C294" },
    { gen: 7, bg: "#E9C99A", text: "#1A1A1A", line: "#EBCEA4" },
    { gen: 8, bg: "#F2D8AC", text: "#1A1A1A", line: "#F3DCB4" },
    { gen: 9, bg: "#F9E7C2", text: "#1A1A1A", line: "#FAE9C8" },
    { gen: 10, bg: "#FFF8E7", text: "#1A1A1A", line: "#FFF9E9" }
  ]},
  { name: "Vitality Spectrum (Teal to Forest)", background: "#ffffff", generations: [
    { gen: 1, bg: "#0A2F35", text: "#FFFFFF", line: "#234449" },
    { gen: 2, bg: "#114B5F", text: "#FFFFFF", line: "#295D6F" },
    { gen: 3, bg: "#1A6579", text: "#FFFFFF", line: "#317486" },
    { gen: 4, bg: "#2D8291", text: "#FFFFFF", line: "#428F9C" },
    { gen: 5, bg: "#45A0A9", text: "#1A1A1A", line: "#58AAB2" },
    { gen: 6, bg: "#62BCC1", text: "#1A1A1A", line: "#72C3C7" },
    { gen: 7, bg: "#83D4D1", text: "#1A1A1A", line: "#8FD8D6" },
    { gen: 8, bg: "#A6E9E0", text: "#1A1A1A", line: "#AFEBE3" },
    { gen: 9, bg: "#C9F2ED", text: "#1A1A1A", line: "#CEF3EF" },
    { gen: 10, bg: "#EBFBF9", text: "#1A1A1A", line: "#EDFBFA" }
  ]},
  { name: "Rainbow Spectrum", background: "#ffffff", generations: [
    { gen: 1, bg: "#4B0082", text: "#FFFFFF", line: "#5D1A8F" },
    { gen: 2, bg: "#8A2BE2", text: "#FFFFFF", line: "#9640E5" },
    { gen: 3, bg: "#C71585", text: "#FFFFFF", line: "#CD2C91" },
    { gen: 4, bg: "#FF0000", text: "#FFFFFF", line: "#FF1A1A" },
    { gen: 5, bg: "#FF4500", text: "#FFFFFF", line: "#FF581A" },
    { gen: 6, bg: "#FF8C00", text: "#1A1A1A", line: "#FF981A" },
    { gen: 7, bg: "#FFD700", text: "#1A1A1A", line: "#FFDB1A" },
    { gen: 8, bg: "#ADFF2F", text: "#1A1A1A", line: "#B5FF44" },
    { gen: 9, bg: "#00FF7F", text: "#1A1A1A", line: "#1AFF8C" },
    { gen: 10, bg: "#00BFFF", text: "#1A1A1A", line: "#1AC5FF" }
  ]},
  { name: "Sunset Bloom (Purple to Yellow)", background: "#ffffff", generations: [
    { gen: 1, bg: "#300066", text: "#FFFFFF", line: "#451A75" },
    { gen: 2, bg: "#660099", text: "#FFFFFF", line: "#751AA3" },
    { gen: 3, bg: "#9900CC", text: "#FFFFFF", line: "#A31AD1" },
    { gen: 4, bg: "#CC3399", text: "#FFFFFF", line: "#D147A3" },
    { gen: 5, bg: "#FF3399", text: "#FFFFFF", line: "#FF47A3" },
    { gen: 6, bg: "#FF6666", text: "#1A1A1A", line: "#FF7575" },
    { gen: 7, bg: "#FF9966", text: "#1A1A1A", line: "#FFA375" },
    { gen: 8, bg: "#FFCC66", text: "#1A1A1A", line: "#FFD175" },
    { gen: 9, bg: "#FFFF66", text: "#1A1A1A", line: "#FFFF75" },
    { gen: 10, bg: "#FFFFCC", text: "#1A1A1A", line: "#FFFFD1" }
  ]},
  { name: "Aurora Flash (Green to Violet)", background: "#ffffff", generations: [
    { gen: 1, bg: "#003300", text: "#FFFFFF", line: "#1A471A" },
    { gen: 2, bg: "#006633", text: "#FFFFFF", line: "#1A7547" },
    { gen: 3, bg: "#33CC33", text: "#1A1A1A", line: "#47D147" },
    { gen: 4, bg: "#66FF33", text: "#1A1A1A", line: "#75FF47" },
    { gen: 5, bg: "#33FF99", text: "#1A1A1A", line: "#47FFA3" },
    { gen: 6, bg: "#00FFFF", text: "#1A1A1A", line: "#1AFFFF" },
    { gen: 7, bg: "#00CCFF", text: "#1A1A1A", line: "#1AD1FF" },
    { gen: 8, bg: "#3366FF", text: "#FFFFFF", line: "#4775FF" },
    { gen: 9, bg: "#6600FF", text: "#FFFFFF", line: "#751AFF" },
    { gen: 10, bg: "#CC33FF", text: "#FFFFFF", line: "#D147FF" }
  ]},
  { name: "Sunset Parchment", background: "#ffffff", generations: [
    { gen: 1, bg: "#8C1C13", text: "#FFFFFF", line: "#98332B" },
    { gen: 2, bg: "#BF4342", text: "#FFFFFF", line: "#C55655" },
    { gen: 3, bg: "#D4804A", text: "#1A1A1A", line: "#D88D5C" },
    { gen: 4, bg: "#DDA15E", text: "#1A1A1A", line: "#E0AA6E" },
    { gen: 5, bg: "#DEC07A", text: "#1A1A1A", line: "#E1C687" },
    { gen: 6, bg: "#C5C78A", text: "#1A1A1A", line: "#CBCD96" },
    { gen: 7, bg: "#8AAD6F", text: "#1A1A1A", line: "#96B57D" },
    { gen: 8, bg: "#5E956A", text: "#FFFFFF", line: "#6EA079" },
    { gen: 9, bg: "#3D7A6A", text: "#FFFFFF", line: "#508779" },
    { gen: 10, bg: "#2C5F5A", text: "#FFFFFF", line: "#416F6B" }
  ]},
  { name: "Indigo to Amber", background: "#ffffff", generations: [
    { gen: 1, bg: "#2E1760", text: "#FFFFFF", line: "#432E70" },
    { gen: 2, bg: "#3A3088", text: "#FFFFFF", line: "#4E4594" },
    { gen: 3, bg: "#3654A0", text: "#FFFFFF", line: "#4A65AA" },
    { gen: 4, bg: "#3878A8", text: "#FFFFFF", line: "#4C86B1" },
    { gen: 5, bg: "#489CA8", text: "#1A1A1A", line: "#5AA6B1" },
    { gen: 6, bg: "#68B898", text: "#1A1A1A", line: "#77BFA2" },
    { gen: 7, bg: "#90C878", text: "#1A1A1A", line: "#9BCE86" },
    { gen: 8, bg: "#B8D458", text: "#1A1A1A", line: "#BFD869" },
    { gen: 9, bg: "#D8D040", text: "#1A1A1A", line: "#DCD553" },
    { gen: 10, bg: "#E8B828", text: "#1A1A1A", line: "#EABF3E" }
  ]},
  { name: "Earth & Forest", background: "#ffffff", generations: [
    { gen: 1, bg: "#5C3D1E", text: "#FFFFFF", line: "#6C5035" },
    { gen: 2, bg: "#7A552A", text: "#FFFFFF", line: "#87663F" },
    { gen: 3, bg: "#A07038", text: "#FFFFFF", line: "#AA7E4C" },
    { gen: 4, bg: "#C0924A", text: "#1A1A1A", line: "#C69D5C" },
    { gen: 5, bg: "#D4B060", text: "#1A1A1A", line: "#D8B870" },
    { gen: 6, bg: "#A8B858", text: "#1A1A1A", line: "#B1BF69" },
    { gen: 7, bg: "#70A850", text: "#1A1A1A", line: "#7EB162" },
    { gen: 8, bg: "#4A9050", text: "#FFFFFF", line: "#5C9B62" },
    { gen: 9, bg: "#307848", text: "#FFFFFF", line: "#45865A" },
    { gen: 10, bg: "#1A5838", text: "#FFFFFF", line: "#31694C" }
  ]},
  { name: "Ocean Depths", background: "#ffffff", generations: [
    { gen: 1, bg: "#E0F0E8", text: "#1A1A1A", line: "#E3F2EA" },
    { gen: 2, bg: "#A8D8C8", text: "#1A1A1A", line: "#B1DCCE" },
    { gen: 3, bg: "#68C0B0", text: "#1A1A1A", line: "#77C6B8" },
    { gen: 4, bg: "#38A8A0", text: "#1A1A1A", line: "#4CB1AA" },
    { gen: 5, bg: "#1890A0", text: "#FFFFFF", line: "#2F9BAA" },
    { gen: 6, bg: "#1070A0", text: "#FFFFFF", line: "#287EAA" },
    { gen: 7, bg: "#1858A0", text: "#FFFFFF", line: "#2F69AA" },
    { gen: 8, bg: "#204098", text: "#FFFFFF", line: "#3653A2" },
    { gen: 9, bg: "#282880", text: "#FFFFFF", line: "#3E3E8D" },
    { gen: 10, bg: "#201860", text: "#FFFFFF", line: "#362F70" }
  ]},
  { name: "Ceramic Blue", background: "#ffffff", generations: [
    { gen: 1, bg: "#1A2A50", text: "#FFFFFF", line: "#313F62" },
    { gen: 2, bg: "#1E3A68", text: "#FFFFFF", line: "#354E77" },
    { gen: 3, bg: "#2A4E80", text: "#FFFFFF", line: "#3F608D" },
    { gen: 4, bg: "#386898", text: "#FFFFFF", line: "#4C77A2" },
    { gen: 5, bg: "#4880A8", text: "#FFFFFF", line: "#5A8DB1" },
    { gen: 6, bg: "#68A0B8", text: "#1A1A1A", line: "#77AABF" },
    { gen: 7, bg: "#88B8C8", text: "#1A1A1A", line: "#94BFCE" },
    { gen: 8, bg: "#A8D0D8", text: "#1A1A1A", line: "#B1D5DC" },
    { gen: 9, bg: "#C8E0E0", text: "#1A1A1A", line: "#CEE3E3" },
    { gen: 10, bg: "#E0EDE8", text: "#1A1A1A", line: "#E3EFEA" }
  ]},
  { name: "Royal Purple to Gold", background: "#ffffff", generations: [
    { gen: 1, bg: "#3C1053", text: "#FFFFFF", line: "#502864" },
    { gen: 2, bg: "#5C2078", text: "#FFFFFF", line: "#6C3686" },
    { gen: 3, bg: "#803890", text: "#FFFFFF", line: "#8D4C9B" },
    { gen: 4, bg: "#A84898", text: "#FFFFFF", line: "#B15AA2" },
    { gen: 5, bg: "#C86088", text: "#1A1A1A", line: "#CE7094" },
    { gen: 6, bg: "#D88068", text: "#1A1A1A", line: "#DC8D77" },
    { gen: 7, bg: "#E0A050", text: "#1A1A1A", line: "#E3AA62" },
    { gen: 8, bg: "#E0B838", text: "#1A1A1A", line: "#E3BF4C" },
    { gen: 9, bg: "#E0C828", text: "#1A1A1A", line: "#E3CE3E" },
    { gen: 10, bg: "#E0D830", text: "#1A1A1A", line: "#E3DC45" }
  ]},
  { name: "Charting Companion", background: "#ffffff", generations: [
    { gen: 1, bg: "#8B2E1C", text: "#FFFFFF", line: "#974333" },
    { gen: 2, bg: "#A34420", text: "#FFFFFF", line: "#AC5736" },
    { gen: 3, bg: "#B86830", text: "#FFFFFF", line: "#BF7745" },
    { gen: 4, bg: "#C89040", text: "#1A1A1A", line: "#CE9B53" },
    { gen: 5, bg: "#B8A048", text: "#1A1A1A", line: "#BFAA5A" },
    { gen: 6, bg: "#8EA050", text: "#1A1A1A", line: "#99AA62" },
    { gen: 7, bg: "#609848", text: "#FFFFFF", line: "#70A25A" },
    { gen: 8, bg: "#3D8858", text: "#FFFFFF", line: "#509469" },
    { gen: 9, bg: "#2A7868", text: "#FFFFFF", line: "#3F8677" },
    { gen: 10, bg: "#1E6858", text: "#FFFFFF", line: "#357769" }
  ]},
  { name: "Bright Future", background: "#ffffff", generations: [
    { gen: 1, bg: "#c0302a", text: "#FFFFFF", line: "#C6453F" },
    { gen: 2, bg: "#4a6ab0", text: "#FFFFFF", line: "#5C79B8" },
    { gen: 3, bg: "#2a8a50", text: "#FFFFFF", line: "#3F9662" },
    { gen: 4, bg: "#c07820", text: "#1A1A1A", line: "#C68636" },
    { gen: 5, bg: "#1890b0", text: "#FFFFFF", line: "#2F9BB8" },
    { gen: 6, bg: "#70a020", text: "#1A1A1A", line: "#7EAA36" },
    { gen: 7, bg: "#c09030", text: "#1A1A1A", line: "#C69B45" },
    { gen: 8, bg: "#b04050", text: "#FFFFFF", line: "#B85362" },
    { gen: 9, bg: "#30a080", text: "#FFFFFF", line: "#45AA8D" },
    { gen: 10, bg: "#909020", text: "#1A1A1A", line: "#9B9B36" },
    { gen: 11, bg: "#2090a0", text: "#FFFFFF", line: "#369BAA" }
  ]}
];

/** @type {AppConfig} */
const CONFIG = {
  palette: PALETTES[0],
  fanMode: '360',
  maxGenerations: 15,

  // Ring geometry
  baseRingWidth: 70,      // pixel width of generation-0 ring (root's children)
  ringWidthDecay: 0.94,   // each outer ring is this fraction of the previous one
  minRingWidth: 22,       // floor so distant rings stay readable
  centerRadius: 80,       // radius of the center disc (root person)
  minArcAngleDeg: 0.6,    // minimum arc angle in degrees; arcs narrower than this still render

  // Spouse display
  showSpouses: true,      // draw spouse strip inside each cell
  spouseStripRatio: 0.40, // fraction of the cell's radial height reserved for the spouse strip

  // Typography
  maxFontSize: 20,        // absolute cap on font size (px)
  maxBrokenLineFontSize: 14,        // absolute cap on font size (px)
  maxYearFontSize: 14,              // absolute cap on year string font size (px)
  minFontSize: 1,         // below this font size, text is truncated instead of shrunk further
  minCurvedArcPx: 50,     // (reserved) minimum arc length in px before curved text is suppressed

  // Content toggles
  showBirthDeath: true,   // append birth–death years to names

  // Visuals
  borderColor: '#c9a96e', borderWidth: 0.3,
  exportDPI: 300,
  textColor: '#1a1008', textColorLight: '#3a2a18',

  // Sex-based color variation deltas
  colorDeltas: {
    male:   { ds: 0,  dl: 0,  dh: 0 },  // Males now use base generation color
    female: { ds: -3, dl: 5,  dh: -10 },
    spouse: { ds: -5, dl: -6,  dh: 0 }  // Relative to the main person's color
  }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
/**
 * Clamps a value between an upper and lower bound.
 * @param {number} v - Input value.
 * @param {number} lo - Lower bound.
 * @param {number} hi - Upper bound.
 * @returns {number} Clamped value.
 */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Adjusts HSL color components with clamping.
 * @param {{h:number, s:number, l:number}} hsl - Base HSL color.
 * @param {number} ds - Delta saturation.
 * @param {number} dl - Delta lightness.
 * @param {number} dh - Delta hue.
 * @returns {{h:number, s:number, l:number}} Adjusted HSL color.
 */
function adjustHSL(hsl, ds, dl, dh) {
  return { h: hsl.h + (dh || 0), s: clamp(hsl.s + ds, 5, 95), l: clamp(hsl.l + dl, 5, 95) };
}

/**
 * Converts a hex color string to HSL object.
 * @param {string} hex
 * @returns {{h:number, s:number, l:number}}
 */
function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL components to a hex color string.
 * @param {{h:number, s:number, l:number}} hsl
 * @returns {string} Hex color string.
 */
function hslToHex(hsl) {
  let h = hsl.h / 360, s = hsl.s / 100, l = hsl.l / 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Formats an HSL object into a valid CSS color string (Hex for better tool compatibility).
 * @param {{h:number, s:number, l:number}} hsl
 * @returns {string} Hex color string.
 */
function hslCSS(hsl) {
  return hslToHex(hsl);
}

/**
 * Gets the generation object for a node based on ringIndex.
 * @param {Object} node - The tree node.
 * @returns {Object} Generation object with bg, text, line properties.
 */
function getGenerationColors(node) {
  const pGens = CONFIG.palette.generations;
  return pGens[node.ringIndex % pGens.length];
}

/**
 * Calculates a thematic background color for a node based on its generation and sex.
 * @param {Object} node - The tree node.
 * @returns {{h:number, s:number, l:number}} HSL color object.
 */
function getCellColor(node) {
  const genColor = getGenerationColors(node);
  const baseHex = genColor.bg;
  const base = hexToHsl(baseHex);
  const deltas = CONFIG.colorDeltas;
  if (node.individual.sex === 'M') return adjustHSL(base, deltas.male.ds, deltas.male.dl, deltas.male.dh);
  if (node.individual.sex === 'F') return adjustHSL(base, deltas.female.ds, deltas.female.dl, deltas.female.dh);
  return base;
}

/**
 * Calculates the spouse strip color relative to the main cell color.
 * @param {{h:number, s:number, l:number}} b - The background color of the main cell.
 * @returns {{h:number, s:number, l:number}} HSL color object.
 */
function getSpouseColor(b) {
  const d = CONFIG.colorDeltas.spouse;
  return adjustHSL(b, d.ds, d.dl, d.dh);
}

/**
 * Determines appropriate text color (white or dark) based on background brightness.
 * Uses standard luminance formula to ensure good contrast.
 * @param {{h:number, s:number, l:number}} bgHsl - Background color in HSL.
 * @returns {string} Text color hex: "#FFFFFF" for dark backgrounds, "#1A1A1A" for light.
 */
function getContrastTextColor(bgHsl) {
  // For HSL, lightness already indicates brightness: l > 50 is light, l < 50 is dark
  // Use a threshold around 55 to determine white vs dark text
  return bgHsl.l > 55 ? '#1A1A1A' : '#FFFFFF';
}

// ── GEDCOM PARSER ─────────────────────────────────────────────────────────────
/**
 * Parses a GEDCOM NAME value into components.
 * Example input: "Nguyễn Văn /An/"
 * @param {string} str - GEDCOM raw name string.
 * @returns {{givenName: string, surname: string, displayName: string}}
 */
function parseName(str) {
  const m = str.match(/^(.+?)\s*\/(.+?)\//);
  if (m) { const gn = m[1].trim(), sn = m[2].trim(); return { givenName: gn, surname: sn, displayName: gn + ' ' + sn }; }
  return { givenName: str.trim(), surname: '', displayName: str.trim() };
}

/**
 * Extracts the first four-digit year from a date string.
 * @param {string} s - Date string.
 * @returns {number|null}
 */
function parseYear(s) { if (!s) return null; const m = s.match(/(\d{4})/); return m ? parseInt(m[1]) : null; }

/**
 * Formats an individual's birth and death years into a display string.
 * @param {Object} ind - Individual record.
 * @returns {string} Formatted year string (e.g., "1920–1990", "1950–", "–1900").
 */
function formatYears(ind) {
  const b = ind.birthYear, d = ind.deathYear;
  if (b && d) return b + '–' + d; if (b) return b + '–'; if (d) return '–' + d; return '';
}

/**
 * Main GEDCOM parser. Iterates through lines to build Maps of people and families.
 * @param {string} text - Raw GEDCOM file content.
 * @returns {{individuals: Map, families: Map, notes: Map}}
 */
function parseGedcom(text) {
  const individuals = new Map(), families = new Map(), notes = new Map();
  const lines = text.split(/\r?\n/);
  let cur = null, curType = null, curTag1 = null; // current record and last level-1 tag
  for (const line of lines) {
    const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*(\S+)\s*(.*)?$/);
    if (!m) continue;
    const level = parseInt(m[1]), id = m[2] || null, tag = m[3], val = (m[4] || '').trim();
    if (level === 0) {
      curTag1 = null;
      if (tag === 'INDI' || id && val === 'INDI') {
        const iid = id || tag;
        cur = {
          id: iid, givenName: '', surname: '', displayName: '', nickname: null,
          sex: 'U', birthDate: null, birthYear: null, deathDate: null, deathYear: null,
          generation: null, familySpouse: [], familyChild: null, noteRefs: []
        };
        curType = 'INDI'; individuals.set(iid, cur);
      } else if (tag === 'FAM' || id && val === 'FAM') {
        const fid = id || tag;
        cur = { id: fid, husband: null, wife: null, children: [] };
        curType = 'FAM'; families.set(fid, cur);
      } else { cur = null; curType = null; }
      continue;
    }
    if (!cur) continue;
    if (level === 1) {
      curTag1 = tag;
      if (curType === 'INDI') {
        if (tag === 'NAME') { const nm = parseName(val); cur.givenName = nm.givenName; cur.surname = nm.surname; cur.displayName = nm.displayName; }
        else if (tag === 'SEX') cur.sex = val === 'M' ? 'M' : val === 'F' ? 'F' : 'U';
        else if (tag === 'FAMS') cur.familySpouse.push(val);
        else if (tag === 'FAMC') cur.familyChild = val;
        else if (tag === 'FACT') { cur._factVal = val; curTag1 = 'FACT'; }
      } else if (curType === 'FAM') {
        if (tag === 'HUSB') cur.husband = val;
        else if (tag === 'WIFE') cur.wife = val;
        else if (tag === 'CHIL') cur.children.push(val);
      }
    }
    if (level === 2 && curType === 'INDI') {
      if (curTag1 === 'BIRT' && tag === 'DATE') { cur.birthDate = val; cur.birthYear = parseYear(val); }
      else if (curTag1 === 'DEAT' && tag === 'DATE') { cur.deathDate = val; cur.deathYear = parseYear(val); }
      else if (curTag1 === 'FACT' && tag === 'TYPE' && val === 'Generation') cur.generation = parseInt(cur._factVal) || null;
      else if (curTag1 === 'NAME' && tag === 'NICK') cur.nickname = val;
      else if (curTag1 === 'NAME' && tag === 'GIVN') { cur.givenName = val; cur.displayName = val + (cur.surname ? ' ' + cur.surname : ''); }
      else if (curTag1 === 'NAME' && tag === 'SURN') { cur.surname = val; cur.displayName = (cur.givenName ? cur.givenName + ' ' : '') + val; }
    }
  }
  for (const ind of individuals.values()) {
    const inum = ind.id.replace(/@/g, '');
    ind.searchName = `${ind.displayName} (${inum})`;
  }
  return { individuals, families, notes };
}

// ── TREE MODEL ────────────────────────────────────────────────────────────────
/**
 * Recursively builds a descendant tree starting from a given root individual.
 * Traverses spouse/family links up to a maximum generation limit.
 * @param {Object} data - Parsed GEDCOM data.
 * @param {string} rootId - The IID of the starting person.
 * @param {number} maxGen - Maximum generations to traverse.
 * @returns {Object|null} Root node of the descendant tree.
 */
function buildDescendantTree(data, rootId, maxGen) {
  let absoluteRootGen = 1;
  let rootCurr = data.individuals.get(rootId);
  let fallback = 0;
  while (rootCurr && rootCurr.familyChild && fallback++ < 500) {
    const fam = data.families.get(rootCurr.familyChild);
    if (!fam) break;
    rootCurr = data.individuals.get(fam.husband || fam.wife);
    if (!rootCurr) break;
    absoluteRootGen++;
  }
  const visited = new Set();
  function recurse(indiId, gen) {
    if (!indiId || visited.has(indiId)) return null;
    visited.add(indiId);
    const ind = data.individuals.get(indiId);
    if (!ind) return null;
    // Node fields that will be filled in later by the layout engine:
    //   startAngle/endAngle – arc extent in radians
    //   rInner/rOuter       – inner and outer radii of the ring band
    //   textMode            – 'curved' | 'radial'
    //   fontSize            – computed font size in SVG px
    //   selectedText        – best-fitting display string chosen by computeFontSize
    const node = {
      individual: ind, spouses: [], families: [], children: [],
      generation: gen, absoluteGen: absoluteRootGen + gen, ringIndex: gen,
      isLeaf: true, isOnlyChild: false,
      leafCount: 1, startAngle: 0, endAngle: 0, rInner: 0, rOuter: 0,
      textMode: 'radial', fontSize: 10
    };
    if (gen >= maxGen) return node;
    for (const famId of ind.familySpouse) {
      const fam = data.families.get(famId);
      if (!fam) continue;
      const spouseId = fam.husband === indiId ? fam.wife : fam.husband;
      const spouseInd = spouseId ? data.individuals.get(spouseId) : null;
      if (spouseInd) node.spouses.push(spouseInd);

      const familyChildren = [];
      for (const childId of fam.children) {
        const ch = recurse(childId, gen + 1);
        if (ch) { familyChildren.push(ch); node.children.push(ch); }
      }
      node.families.push({ spouse: spouseInd, familyId: famId, children: familyChildren });
    }
    node.isLeaf = node.children.length === 0;
    return node;
  }
  return recurse(rootId, 0);
}

/**
 * Calculates the number of leaf nodes (descendants with no children) for each node.
 * This is used to distribute angular space fairly among branches.
 * @param {Object} node
 */
function computeLeafCount(node) {
  if (node.children.length === 0) { node.leafCount = 1; node.isLeaf = true; return; }
  node.isLeaf = false; node.leafCount = 0;
  for (const ch of node.children) { computeLeafCount(ch); node.leafCount += ch.leafCount; }
}

// BFS traversal that returns every node in level order.
function flattenNodes(root) {
  const all = [], queue = [root];
  while (queue.length) { const n = queue.shift(); all.push(n); for (const ch of n.children) queue.push(ch); }
  return all;
}

// ── LAYOUT ENGINE ─────────────────────────────────────────────────────────────
// Return candidate display strings in descending priority (most content first).
// The caller iterates until it finds one that fits at an acceptable font size.
// Priority: full name + year → full name → surname+given + year → surname+given → given only
function buildNameCandidates(ind, cfg) {
  const yr = cfg.showBirthDeath ? formatYears(ind) : '';
  const full = ind.displayName;
  const cands = [];
  if (yr) cands.push(full + ' ' + yr);
  cands.push(full);
  return cands.filter((c, i, a) => a.indexOf(c) === i);
}

// Split an individual's name into display lines for multi-line curved arcs.
// singleLine=true: everything on one line (used when the arc is wide/shallow or radial).
// singleLine=false: words are balanced into at most 2 lines; year goes on its own line.
function buildTextLines(ind, cfg, singleLine) {
  const yearStr = cfg.showBirthDeath ? formatYears(ind) : '';
  if (singleLine) {
    return [yearStr ? ind.displayName + ' ' + yearStr : ind.displayName];
  }
  const words = ind.displayName.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return yearStr ? [...words, yearStr] : [...words];
  }
  // 3+ words: balance into 2 lines, year kept separate
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return yearStr ? [line1, line2, yearStr] : [line1, line2];
}

/**
 * Automatically determines the best text orientation ('radial', 'rectangular', or 'curved')
 * based on the cell's current angular span and physical dimensions.
 * @param {Object} node
 */
function assignTextMode(node) {
  const arcSpan = node.endAngle - node.startAngle;
  if (arcSpan < (5 * Math.PI / 180)) { node.textMode = 'radial'; return; }
  const arcWidth = arcSpan * (node.rInner + node.rOuter) / 2; // arc length at mid-radius
  const radialH = node.rOuter - node.rInner;
  node.textMode = arcWidth < 4 * radialH ? 'rectangular' : 'curved';
}

// Compute the optimal font size for a node and store the best-fitting display
// string in node.selectedText (for radial and single-line curved modes).
//
// Strategy (font-size first, truncation last):
//   1. Generate candidate strings from most to least content (buildNameCandidates).
//   2. For each candidate compute the maximum font size that fits both axes:
//        radial  – arc gap width (character height) and personH (character run length)
//        curved  – ring height (character height) and arc length (character run width)
//   3. Use the first candidate that achieves fs > minFontSize. If none does,
//      use the shortest candidate at minFontSize (smartTruncate handles the rest).
function computeFontSize(node, cfg) {
  const arcSpan = node.endAngle - node.startAngle;
  const hasSpouse = cfg.showSpouses && node.spouses.length > 0;
  const radialH = node.rOuter - node.rInner;       // full ring band height
  const spouseH = hasSpouse ? radialH * cfg.spouseStripRatio : 0;
  const rSpouse = node.rOuter - spouseH;            // radius boundary between person area and spouse strip
  const personH = radialH - spouseH;               // radial height available for the main person's text
  // 'rectangular' arcs always allow multi-line; 'radial' and 'curved' are always single-line.
  // ('curved' arcs have arcWidth ≥ 4×radialH by definition, which always exceeds the old
  //  2×radialH threshold, so the old condition collapses to this simpler form.)
  const singleLine = node.textMode !== 'rectangular';
  const cands = buildNameCandidates(node.individual, cfg);

  if (node.textMode === 'radial') {
    const rPos = node.rInner + personH * 2 / 3; // representative radius for arc-width calculation
    let bestFs = cfg.minFontSize;
    let bestText = cands[cands.length - 1];

    const maxFsByArc1 = (arcSpan * rPos) / 1.15;
    for (let i = 0; i < cands.length; i++) {
      const maxFsByLen = (personH * 0.88) / Math.max(1, cands[i].length * 0.6);
      const fs = clamp(Math.min(maxFsByArc1, maxFsByLen), cfg.minFontSize, cfg.maxFontSize);
      if (fs > cfg.minFontSize || i === cands.length - 1) {
        bestFs = fs; bestText = cands[i];
        break;
      }
    }

    const mLines = buildTextLines(node.individual, cfg, false);
    if (mLines.length > 1) {
      const wMaxFsByArc = (arcSpan * rPos) / (mLines.length * 1.15);
      let mMaxChars = 1; for (const l of mLines) if (l.length > mMaxChars) mMaxChars = l.length;
      const mMaxFsByLen = (personH * 0.88) / Math.max(1, mMaxChars * 0.6);
      const brokenMax = cfg.maxBrokenLineFontSize || cfg.maxFontSize;
      const mFs = clamp(Math.min(wMaxFsByArc, mMaxFsByLen), cfg.minFontSize, brokenMax);
      if (mFs > bestFs * 1.1 || (mFs === bestFs && mFs === cfg.minFontSize)) {
        bestFs = mFs;
        bestText = mLines.join('\n');
      }
    }

    node.selectedText = bestText;
    return bestFs;
  }

  // Curved / Rectangular approach
  const midR = (node.rInner + rSpouse) / 2;
  let bestFs = cfg.minFontSize;
  let bestText = cands[cands.length - 1];
  let maxUnclampedBestFs = 0;

  const maxFsByH = personH / 1.2;
  for (let i = 0; i < cands.length; i++) {
    const maxFsByW = (arcSpan * midR) / Math.max(1, cands[i].length * 0.6);
    const unclampedFs = Math.min(maxFsByH, maxFsByW);
    const fs = clamp(unclampedFs, cfg.minFontSize, cfg.maxFontSize);
    if (fs > cfg.minFontSize || i === cands.length - 1) {
      bestFs = fs;
      bestText = cands[i];
      maxUnclampedBestFs = unclampedFs;
      break;
    }
  }

  const mLines = buildTextLines(node.individual, cfg, false);
  if (mLines.length > 1) {
    let totalH = 0;
    let maxWFs = 10000;
    for (const l of mLines) {
      const maxFsForLine = (arcSpan * midR) / Math.max(1, l.length * 0.6);
      if (maxFsForLine < maxWFs) maxWFs = maxFsForLine;
      totalH += 1.25;
    }
    const maxFsByMH = personH / totalH;
    const unclampedMFs = Math.min(maxWFs, maxFsByMH);
    const brokenMax = cfg.maxBrokenLineFontSize || cfg.maxFontSize;
    const mFs = clamp(unclampedMFs, cfg.minFontSize, brokenMax);

    if (Math.min(unclampedMFs, brokenMax) > Math.min(maxUnclampedBestFs, cfg.maxFontSize) || (mFs === bestFs && mFs === cfg.minFontSize)) {
      bestFs = mFs;
      bestText = mLines.join('\n');
    }
  }

  node.selectedText = bestText;
  return bestFs;
}

/**
 * Recursively allocates angular segments to the descendant tree.
 * The total angle is divided among children proportional to their leaf count.
 * @param {Object} node - Current node.
 * @param {number} startAngle - Current starting angle in radians.
 * @param {number} totalAngle - Total angle available for this subtree.
 * @param {number} minArc - Minimum angle enforcement.
 */
function allocateArcs(node, startAngle, totalAngle, minArc) {
  node.startAngle = startAngle; node.endAngle = startAngle + totalAngle;
  if (node.children.length === 0) return;
  const totalLeaves = node.leafCount;
  const totalMin = node.children.length * minArc;
  // If enforcing minArc for every child would exceed the available angle,
  // scale down to 50% of a fair share so all children still get some space.
  const effMin = totalMin > totalAngle ? totalAngle / node.children.length * 0.5 : minArc;
  let cursor = startAngle;
  for (const ch of node.children) {
    const ang = Math.max(totalAngle * (ch.leafCount / totalLeaves), effMin);
    allocateArcs(ch, cursor, ang, effMin); cursor += ang;
  }
}

// Return the SVG viewport dimensions and the origin offset (ox, oy) so that
// the chart centre maps to the SVG coordinate (ox, oy).
// P is the padding in pixels added on all sides.
function computeViewport(fanMode, outerR, centerR) {
  const P = 30;
  const legendSpace = 150; // allocated horizontal space for generation color legend
  // All dimensions are ceiled to integers — fractional SVG width/height can cause
  // browsers to silently refuse rendering the SVG when used as an <img> src.
  const ceil = Math.ceil;
  if (fanMode === '360') return { w: ceil(outerR * 2 + P * 2 + legendSpace), h: ceil(outerR * 2 + P * 2), ox: ceil(outerR + P), oy: ceil(outerR + P) };
  if (fanMode === '180') return { w: ceil(outerR * 2 + P * 2 + legendSpace), h: ceil(outerR + P * 2 + centerR), ox: ceil(outerR + P), oy: ceil(outerR + P) };
  // 270°: the fan extends up and to both sides but only sin(45°) downward.
  const s = Math.sin(Math.PI / 4); // y ∈ [−outerR, outerR·sin45°]
  return { w: ceil(outerR * 2 + P * 2 + legendSpace), h: ceil(outerR * (1 + s) + P * 2), ox: ceil(outerR + P), oy: ceil(outerR + P) };
}

/**
 * Main entry point for the layout engine. Computes all physical coordinates
 * for the tree nodes, including angles, radii, and text styling.
 * @param {Object} root - The root of the descendant tree.
 * @param {AppConfig} cfg - Application configuration.
 * @returns {Object} Layout data summary (nodes, rings, outer limit, max depth).
 */
function computeLayout(root, cfg) {
  computeLeafCount(root);
  // Mark nodes that are the only child of their parent — they share the ring
  // border with the parent and don't need their own radial dividing lines.
  const mark = n => { if (n.children.length === 1) n.children[0].isOnlyChild = true; for (const ch of n.children) mark(ch); };
  mark(root);
  const fan = FAN_MODES[cfg.fanMode];
  allocateArcs(root, fan.startAngle, fan.totalAngle, cfg.minArcAngleDeg * Math.PI / 180);
  const allNodes = flattenNodes(root);
  let maxGen = 0;
  for (const n of allNodes) if (n.ringIndex > maxGen) maxGen = n.ringIndex;
  // Build the ring radius table. Each generation gets a progressively narrower band.
  const ringRadii = []; let r = cfg.centerRadius;
  for (let g = 0; g <= maxGen; g++) {
    const w = Math.max(cfg.baseRingWidth * Math.pow(cfg.ringWidthDecay, g), cfg.minRingWidth);
    ringRadii.push({ inner: r, outer: r + w, width: w }); r += w;
  }
  const outerRim = ringRadii[maxGen] ? ringRadii[maxGen].outer : r;
  for (const n of allNodes) {
    const g = n.ringIndex;
    // Leaf nodes extend to the outerRim so they fill all remaining space.
    if (g < ringRadii.length) { n.rInner = ringRadii[g].inner; n.rOuter = n.isLeaf ? outerRim : ringRadii[g].outer; }
    assignTextMode(n); n.fontSize = computeFontSize(n, cfg);
  }
  return { allNodes, ringRadii, outerRim, maxGen };
}

// ── SVG BUILDER ───────────────────────────────────────────────────────────────
/**
 * Generates a complete SVG string representing the family fan chart.
 * Uses a multi-pass approach to ensure correct layering and "gap-cutting" logic
 * for shared borders.
 * @param {Object} root - Root node.
 * @param {Object} layoutData - Precomputed layout data.
 * @param {AppConfig} cfg - Application configuration.
 * @returns {string} Full SVG document content.
 */
function buildSVG(root, layoutData, cfg) {
  const vp = computeViewport(cfg.fanMode, layoutData.outerRim, cfg.centerRadius);
  const parts = []; // SVG fragments accumulated in order, joined at the end
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${vp.w}" height="${vp.h}" viewBox="0 0 ${vp.w} ${vp.h}">`);
  parts.push(`<style>text{font-family:'Noto Sans', Helvetica, Arial, sans-serif;}</style>`);
  parts.push(`<rect width="100%" height="100%" fill="${cfg.palette.background}"/>`);
  // All geometry is drawn relative to the chart centre (0,0); this <g> shifts it to (ox,oy).
  parts.push(`<g transform="translate(${vp.ox},${vp.oy})">`);

  const { allNodes, ringRadii } = layoutData;
  // XML-escape a string for safe embedding in SVG text content.
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  /**
   * Converts polar coordinates to an SVG "x y" string.
   * @param {number} r - Radius.
   * @param {number} a - Angle in radians.
   * @returns {string} Space-separated coordinates.
   */
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  let pathId = 0; // counter for unique <path> IDs used by <textPath>

  /**
   * Draws a filled annular sector (donut slice).
   * @param {number} rIn - Inner radius.
   * @param {number} rOut - Outer radius.
   * @param {number} sA - Start angle (radians).
   * @param {number} eA - End angle (radians).
   * @param {string} fill - Fill color.
   * @param {string} [stroke] - Stroke color.
   * @param {number} [sw] - Stroke width.
   */
  function svgArc(rIn, rOut, sA, eA, fill, stroke, sw) {
    if (Math.abs(eA - sA) < 0.0001) return; // skip zero-width arcs
    const la = (eA - sA) > Math.PI ? 1 : 0; // large-arc flag for SVG arc command
    const d = `M ${p(rOut, sA)} A ${rOut} ${rOut} 0 ${la} 1 ${p(rOut, eA)} L ${p(rIn, eA)} A ${rIn} ${rIn} 0 ${la} 0 ${p(rIn, sA)} Z`;
    parts.push(`<path d="${d}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="${sw || 0}"/>`);
  }
  /**
   * Draws a radial dividing line between two rings.
   * @param {number} rIn - Inner radius.
   * @param {number} rOut - Outer radius.
   * @param {number} angle - Angle in radians.
   * @param {string} stroke - Line color.
   * @param {number} sw - Line width.
   */
  function svgRadialLine(rIn, rOut, angle, stroke, sw) {
    parts.push(`<line x1="${(rIn * Math.cos(angle)).toFixed(2)}" y1="${(rIn * Math.sin(angle)).toFixed(2)}" x2="${(rOut * Math.cos(angle)).toFixed(2)}" y2="${(rOut * Math.sin(angle)).toFixed(2)}" stroke="${stroke}" stroke-width="${sw}"/>`);
  }
  /**
   * Renders text that follows a circular arc.
   * Flips text orientation in the bottom half for readability.
   * @param {string} text - The label to render.
   * @param {number} radius - Radius on which to center the text.
   * @param {number} sA - Arc start angle.
   * @param {number} eA - Arc end angle.
   * @param {number} fs - Font size.
   * @param {string} color - Text color.
   */
  function svgCurvedText(text, radius, sA, eA, fs, color) {
    const arcSpan = eA - sA;
    // Default text centre is the arc midpoint.
    let textCenter = (sA + eA) / 2;
    // For very wide arcs (>144°), prefer the top of the circle as the text anchor
    // so the name doesn't drift toward an edge.
    if (arcSpan > Math.PI * 0.8) {
      const top = -Math.PI / 2;
      for (const c of [top, top + 2 * Math.PI, top - 2 * Math.PI]) { if (c >= sA && c <= eA) { textCenter = c; break; } }
    }
    const normTC = ((textCenter % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // Bottom half (3 o'clock → 9 o'clock via 6 o'clock): flip arc direction so text is upright.
    const flip = normTC > 0.15 && normTC < Math.PI - 0.15;
    const id = 'tp' + (pathId++);
    const a1 = flip ? eA : sA, a2 = flip ? sA : eA, sw = flip ? 0 : 1;
    const la = arcSpan > Math.PI ? 1 : 0;
    parts.push(`<defs><path id="${id}" d="M ${p(radius, a1)} A ${radius} ${radius} 0 ${la} ${sw} ${p(radius, a2)}"/></defs>`);

    // Extract year for single-line curved text to cap its font size
    const match = text.match(/^(.*?)\s+([0-9\?\s\u2013]+)$/);
    let content = esc(text);
    const maxYearFs = cfg.maxYearFontSize || 14;
    if (match && fs > maxYearFs) {
      content = `${esc(match[1])} <tspan font-size="${maxYearFs}">${esc(match[2])}</tspan>`;
    }

    parts.push(`<text font-size="${fs.toFixed(1)}" fill="${color}" text-anchor="middle" dominant-baseline="central"><textPath xlink:href="#${id}" href="#${id}" startOffset="50%">${content}</textPath></text>`);
  }
  /**
   * Renders text that runs radially along a spoke.
   * @param {string} text - Label content.
   * @param {number} radius - Central radius for placement.
   * @param {number} midA - Angle of the spoke (radians).
   * @param {number} fs - Font size.
   * @param {string} color - Text color.
   * @param {'center' | 'inner' | 'outer'} [alignPattern] - Alignment of text along the radius.
   * @param {number[]} [fsLines] - Specific font sizes per line if multi-line.
   */
  function svgRadialText(text, radius, midA, fs, color, alignPattern = 'center', fsLines = null) {
    const x = radius * Math.cos(midA), y = radius * Math.sin(midA);
    const norm = ((midA % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // "Left half" = 9 o'clock through 12 to 3 o'clock (going via top) → need 180° flip.
    const inLeftHalf = norm > Math.PI * 0.5 && norm < Math.PI * 1.5;
    const deg = midA * 180 / Math.PI + (inLeftHalf ? 180 : 0);
    let tAnchor = 'middle';
    if (alignPattern === 'outer') tAnchor = inLeftHalf ? 'start' : 'end';
    else if (alignPattern === 'inner') tAnchor = inLeftHalf ? 'end' : 'start';

    const lines = text.split('\n');
    let content = '';
    if (lines.length > 1) {
      if (fsLines && fsLines.length === lines.length) {
        const totalWUsed = fsLines.reduce((acc, f) => acc + f * 1.15, 0);
        const startDyPx = -totalWUsed / 2 + (fsLines[0] * 1.15) / 2;
        for (let i = 0; i < lines.length; i++) {
          const lFs = fsLines[i];
          const match = lines[i].match(/^(.*?)\s+([0-9\?\s\u2013]+)$/);
          const maxYearFs = cfg.maxYearFontSize || 14;
          const dyPx = i === 0 ? startDyPx : (fsLines[i - 1] * 1.15 + fsLines[i] * 1.15) / 2;
          let lText = match && lFs > maxYearFs ? `${esc(match[1])} <tspan font-size="${maxYearFs}">${esc(match[2])}</tspan>` : esc(lines[i]);
          content += `<tspan x="${x.toFixed(2)}" font-size="${lFs.toFixed(1)}" dy="${dyPx.toFixed(2)}">${lText}</tspan>`;
        }
      } else {
        const startDy = -(lines.length - 1) / 2 * 1.15;
        for (let i = 0; i < lines.length; i++) {
          content += `<tspan x="${x.toFixed(2)}" dy="${i === 0 ? startDy.toFixed(3) : 1.15}em">${esc(lines[i])}</tspan>`;
        }
      }
    } else {
      const match = text.match(/^(.*?)\s+([0-9\?\s\u2013]+)$/);
      const maxYearFs = cfg.maxYearFontSize || 14;
      if (match && fs > maxYearFs) {
        content = `${esc(match[1])} <tspan font-size="${maxYearFs}">${esc(match[2])}</tspan>`;
      } else {
        content = esc(text);
      }
    }
    const containerFs = (fsLines && fsLines.length > 0) ? fsLines[0] : fs;
    parts.push(`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${containerFs.toFixed(1)}" fill="${color}" text-anchor="${tAnchor}" dominant-baseline="central" transform="rotate(${deg.toFixed(2)},${x.toFixed(2)},${y.toFixed(2)})">${content}</text>`);
  }

  // Separate non-leaf nodes (have children, standard ring) from leaf nodes
  // (no children, extend to the outerRim). Root is excluded from both — it gets the centre disc.
  const normalNodes = allNodes.filter(n => n !== root && !n.isLeaf);
  const extendedNodes = allNodes.filter(n => n !== root && n.isLeaf);

  // Assign generation colors to all nodes
  for (const node of allNodes) {
    node.genColor = getGenerationColors(node);
  }

  // PASS 1: normal cell backgrounds
  for (const node of normalNodes) {
    const fill = hslCSS(getCellColor(node));
    const spouseCount = cfg.showSpouses ? node.spouses.length : 0;
    const hasSpouse = spouseCount > 0;
    const spouseH = hasSpouse ? (node.rOuter - node.rInner) * cfg.spouseStripRatio : 0;
    const rSpouse = node.rOuter - spouseH;

    // Main person area
    svgArc(node.rInner, rSpouse, node.startAngle, node.endAngle, fill, node.genColor.line, cfg.borderWidth);

    // Spouse arcs with angular subdivision and dividers
    if (hasSpouse) {
      const anglePerSpouse = (node.endAngle - node.startAngle) / spouseCount;
      for (let si = 0; si < spouseCount; si++) {
        const aSubStart = node.startAngle + si * anglePerSpouse;
        const aSubEnd = node.startAngle + (si + 1) * anglePerSpouse;
        svgArc(rSpouse, node.rOuter, aSubStart, aSubEnd, hslCSS(getSpouseColor(getCellColor(node))), node.genColor.line, cfg.borderWidth);

        // Divider between spouses (radial lines in spouse area only)
        if (si > 0) {
          svgRadialLine(rSpouse, node.rOuter, aSubStart, node.genColor.line, cfg.borderWidth);
        }
      }
    }

    if (!node.isOnlyChild) { svgRadialLine(node.rInner, node.rOuter, node.startAngle, node.genColor.line, cfg.borderWidth); svgRadialLine(node.rInner, node.rOuter, node.endAngle, node.genColor.line, cfg.borderWidth); }
  }

  // PASS 2: ring borders with gaps
  // Draw each generation's outer circular border as one or more arc segments,
  // cutting gaps wherever a child is the only child of its parent (isOnlyChild)
  // or wherever an extended (leaf) cell spans across the ring boundary.
  const fan = FAN_MODES[cfg.fanMode];
  for (let g = 0; g <= layoutData.maxGen; g++) {
    if (!ringRadii[g]) continue;
    const r = ringRadii[g].outer;
    const gaps = [];
    // Gap for only-children: they share a ring with their parent, so no border between them.
    for (const n of allNodes) { if (n !== root && n.ringIndex === g + 1 && n.isOnlyChild) gaps.push({ s: n.startAngle, e: n.endAngle }); }
    // Gap for extended cells: leaf nodes stretch past this ring, so the border would cut across them.
    for (const n of extendedNodes) { if (n.rInner < r && n.rOuter > r) gaps.push({ s: n.startAngle, e: n.endAngle }); }
    const fanEnd = fan.startAngle + fan.totalAngle;
    const la = fan.totalAngle > Math.PI ? 1 : 0;

    // Get generation color for the ring boundary (use generation g+1 if available, otherwise g)
    let genColor = cfg.palette.generations && cfg.palette.generations[g+1] ? cfg.palette.generations[g+1] : cfg.palette.generations[g];
    const lineColor = genColor ? genColor.line : cfg.borderColor;

    if (gaps.length === 0) {
      // No gaps — draw a single continuous arc for this ring boundary.
      parts.push(`<path d="M ${p(r, fan.startAngle)} A ${r} ${r} 0 ${la} 1 ${p(r, fanEnd)}" fill="none" stroke="${lineColor}" stroke-width="${cfg.borderWidth}"/>`);
    } else {
      // Merge overlapping gaps, then draw arc segments between them.
      gaps.sort((a, b) => a.s - b.s);
      const merged = [gaps[0]];
      for (let i = 1; i < gaps.length; i++) { const last = merged[merged.length - 1]; if (gaps[i].s <= last.e + 0.001) last.e = Math.max(last.e, gaps[i].e); else merged.push({ ...gaps[i] }); }
      let cursor = fan.startAngle;
      for (const gap of merged) {
        if (gap.s > cursor + 0.001) { const segLa = (gap.s - cursor) > Math.PI ? 1 : 0; parts.push(`<path d="M ${p(r, cursor)} A ${r} ${r} 0 ${segLa} 1 ${p(r, gap.s)}" fill="none" stroke="${lineColor}" stroke-width="${cfg.borderWidth}"/>`); }
        cursor = gap.e;
      }
      if (cursor < fanEnd - 0.001) { const segLa = (fanEnd - cursor) > Math.PI ? 1 : 0; parts.push(`<path d="M ${p(r, cursor)} A ${r} ${r} 0 ${segLa} 1 ${p(r, fanEnd)}" fill="none" stroke="${lineColor}" stroke-width="${cfg.borderWidth}"/>`); }
    }
  }

  // PASS 3: extended cell backgrounds
  for (const node of extendedNodes) {
    const fill = hslCSS(getCellColor(node));
    const spouseCount = cfg.showSpouses ? node.spouses.length : 0;
    const hasSpouse = spouseCount > 0;
    const spouseH = hasSpouse ? (node.rOuter - node.rInner) * cfg.spouseStripRatio : 0;
    const rSpouse = node.rOuter - spouseH;

    // Main person area
    svgArc(node.rInner, rSpouse, node.startAngle, node.endAngle, fill, node.genColor.line, cfg.borderWidth);

    // Spouse arcs with angular subdivision and dividers
    if (hasSpouse) {
      const anglePerSpouse = (node.endAngle - node.startAngle) / spouseCount;
      for (let si = 0; si < spouseCount; si++) {
        const aSubStart = node.startAngle + si * anglePerSpouse;
        const aSubEnd = node.startAngle + (si + 1) * anglePerSpouse;
        svgArc(rSpouse, node.rOuter, aSubStart, aSubEnd, hslCSS(getSpouseColor(getCellColor(node))), node.genColor.line, cfg.borderWidth);

        // Divider between spouses (radial lines in spouse area only)
        if (si > 0) {
          svgRadialLine(rSpouse, node.rOuter, aSubStart, node.genColor.line, cfg.borderWidth);
        }
      }
    }

    if (!node.isOnlyChild) { svgRadialLine(node.rInner, node.rOuter, node.startAngle, node.genColor.line, cfg.borderWidth); svgRadialLine(node.rInner, node.rOuter, node.endAngle, node.genColor.line, cfg.borderWidth); }
  }

  // PASS 4: all text
  for (const node of [...normalNodes, ...extendedNodes]) {
    const spouseCount = cfg.showSpouses ? node.spouses.length : 0;
    const hasSpouse = spouseCount > 0;
    const spouseH = hasSpouse ? (node.rOuter - node.rInner) * cfg.spouseStripRatio : 0;
    const rSpouse = node.rOuter - spouseH; // radius separating person area from spouse strip
    const personH = rSpouse - node.rInner;
    const subH = hasSpouse ? spouseH / spouseCount : 0;
    const midA = (node.startAngle + node.endAngle) / 2; // angular midpoint of this cell
    const fs = node.fontSize;
    const ringMidR = (node.rInner + node.rOuter) / 2;
    const arcWidth = (node.endAngle - node.startAngle) * ringMidR; // arc length in px at mid-radius
    // 'rectangular' is the only mode that allows multi-line; radial and curved are always single-line.
    const singleLine = node.textMode !== 'rectangular';
    // Detect bottom-half arcs (3 o'clock → 9 o'clock via 6 o'clock).
    // In the bottom half the outermost radius is visually lower on screen, so
    // the natural line order (outer→inner) appears bottom-to-top and must be reversed.
    const normMidA = ((midA % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isBottomHalf = normMidA > 0.15 && normMidA < Math.PI - 0.15;
    if (node.textMode === 'curved' || node.textMode === 'rectangular') {
      const pLines = node.selectedText.split('\n');
      const singleLine = pLines.length === 1;

      let fsLines = [];
      let totalH = 0;
      const curMaxFs = singleLine ? cfg.maxFontSize : (cfg.maxBrokenLineFontSize || cfg.maxFontSize);
      for (let i = 0; i < pLines.length; i++) {
        let wFs = arcWidth / Math.max(1, pLines[i].length * 0.6);
        wFs = Math.min(wFs, curMaxFs);
        if (singleLine) wFs = Math.min(fs, wFs);
        if (pLines[i].match(/^[0-9\?\s\u2013]+$/)) {
          wFs = Math.min(wFs, cfg.maxYearFontSize || 14);
          if (i > 0) wFs = Math.min(wFs, fsLines[0]);
        }
        fsLines.push(wFs);
        totalH += wFs * 1.25;
      }
      let scale = totalH > personH ? personH / totalH : 1;

      let drawLines = [];
      let finalFsLines = [];
      for (let i = 0; i < pLines.length; i++) finalFsLines.push(fsLines[i] * scale);

      if (isBottomHalf) {
        drawLines = [...pLines].reverse();
        finalFsLines = finalFsLines.reverse();
      } else {
        drawLines = pLines;
      }

      const totalHUsed = finalFsLines.reduce((acc, f) => acc + f * 1.25, 0);
      let cursorR = node.rInner + personH / 2 + totalHUsed / 2;

      for (let i = 0; i < drawLines.length; i++) {
        const currentFs = finalFsLines[i];
        const lineH = currentFs * 1.25;
        const lineR = cursorR - lineH / 2;
        if (lineR >= node.rInner && lineR <= rSpouse) {
          svgCurvedText(drawLines[i], lineR, node.startAngle, node.endAngle, currentFs, node.genColor.text);
        }
        cursorR -= lineH;
      }
      if (hasSpouse) {
        for (let si = 0; si < spouseCount; si++) {
          const rSubInner = rSpouse + si * subH;
          const rSubOuter = rSpouse + (si + 1) * subH;
          const sH = subH;
          let sFs = Math.max(fs * 0.8, cfg.minFontSize);

          const sCands = buildNameCandidates(node.spouses[si], cfg);
          const sTextFull = sCands.find(c => (sH / 1.2) >= sFs && (arcWidth / Math.max(1, c.length * 0.6)) >= sFs) || sCands[sCands.length - 1];
          const unclampedSSingle = Math.min(sH / 1.2, arcWidth / Math.max(1, sTextFull.length * 0.6));

          const sLinesRaw = buildTextLines(node.spouses[si], cfg, false);
          let sMH = 0, sMW = 10000;
          for (const l of sLinesRaw) { sMH += 1.25; const w = arcWidth / Math.max(1, l.length * 0.6); if (w < sMW) sMW = w; }
          const unclampedSMulti = Math.min(sH / sMH, sMW);

          const sBrokenMax = cfg.maxBrokenLineFontSize || cfg.maxFontSize;
          const effSMulti = Math.min(unclampedSMulti, sBrokenMax);
          const effSSingle = Math.min(unclampedSSingle, cfg.maxFontSize);

          // Check if multi-line includes a year (last line is year pattern)
          const hasYear = sLinesRaw.length > 1 && sLinesRaw[sLinesRaw.length - 1].match(/^[0-9\?\s\u2013]+$/);
          // Prefer multi-line more aggressively when years are available, or when it's reasonably close
          const sLines = (hasYear || effSMulti > effSSingle * 0.85 || (Math.min(sFs, effSMulti) === cfg.minFontSize && Math.min(sFs, effSSingle) === cfg.minFontSize)) ? sLinesRaw : [sTextFull];
          const isSpouseSingle = sLines.length === 1;

          let sFsLines = [];
          let sTotalH = 0;
          for (let i = 0; i < sLines.length; i++) {
            let wFs = arcWidth / Math.max(1, sLines[i].length * 0.6);
            wFs = Math.min(wFs, isSpouseSingle ? cfg.maxFontSize : sBrokenMax);
            if (isSpouseSingle) wFs = Math.min(sFs, wFs);
            if (sLines[i].match(/^[0-9\?\s\u2013]+$/)) {
              wFs = Math.min(wFs, cfg.maxYearFontSize || 14);
              if (i > 0) wFs = Math.min(wFs, sFsLines[0]);
            }
            sFsLines.push(wFs);
            sTotalH += wFs * 1.25;
          }
          let sScale = sTotalH > sH ? sH / sTotalH : 1;

          let sDrawLines = [];
          let sFinalFsLines = [];
          for (let i = 0; i < sLines.length; i++) sFinalFsLines.push(sFsLines[i] * sScale);

          if (isBottomHalf) {
            sDrawLines = [...sLines].reverse();
            sFinalFsLines = sFinalFsLines.reverse();
          } else {
            sDrawLines = sLines;
          }

          const sTotalHUsed = sFinalFsLines.reduce((acc, f) => acc + f * 1.25, 0);
          let sCursorR = rSubInner + sH / 2 + sTotalHUsed / 2;

          for (let i = 0; i < sDrawLines.length; i++) {
            const currentFs = sFinalFsLines[i];
            const lineH = currentFs * 1.25;
            const lineR = sCursorR - lineH / 2;
            if (lineR >= rSubInner && lineR <= rSubOuter) {
              svgCurvedText(sDrawLines[i], lineR, node.startAngle, node.endAngle, currentFs, node.genColor.text);
            }
            sCursorR -= lineH;
          }
        }
      }
    } else {
      // Radial text: aligned flush to the outer boundary
      const rLines = node.selectedText.split('\n');
      if (rLines.length > 1) {
        let fsLines = [];
        let totalW = 0;
        const rBrokenMax = cfg.maxBrokenLineFontSize || cfg.maxFontSize;
        const arcSpanAdjusted = node.endAngle - node.startAngle;
        for (let i = 0; i < rLines.length; i++) {
          let baseFs = personH * 0.88 / Math.max(1, rLines[i].length * 0.6);
          baseFs = Math.min(baseFs, rBrokenMax);
          if (rLines[i].match(/^[0-9\?\s\u2013]+$/)) {
            baseFs = Math.min(baseFs, cfg.maxYearFontSize || 14);
            if (i > 0) baseFs = Math.min(baseFs, fsLines[0]);
          }
          fsLines.push(baseFs);
          totalW += baseFs * 1.15;
        }
        const rPos = node.rInner + personH * 2 / 3;
        const availableW = arcSpanAdjusted * rPos;
        const scale = totalW > availableW ? availableW / totalW : 1;
        for (let i = 0; i < fsLines.length; i++) fsLines[i] = fsLines[i] * scale;
        const anchorR = node.rInner + personH / 2;
        svgRadialText(node.selectedText, anchorR, midA, fs, node.genColor.text, 'center', fsLines);
      } else {
        const rawFsByLen = personH * 0.88 / Math.max(1, node.selectedText.length * 0.6);
        const shrinkFs = Math.min(fs, rawFsByLen);
        const anchorR = rSpouse - shrinkFs * 0.4;
        svgRadialText(node.selectedText, anchorR, midA, shrinkFs, node.genColor.text, 'outer');
      }
      if (hasSpouse) {
        const spouseCount = cfg.showSpouses ? node.spouses.length : 0;
        const anglePerSpouse = (node.endAngle - node.startAngle) / spouseCount;
        const spouseRadialMid = rSpouse + (node.rOuter - rSpouse) / 2;
        const spouseH = node.rOuter - rSpouse;

        for (let si = 0; si < spouseCount; si++) {
          const aSubStart = node.startAngle + si * anglePerSpouse;
          const aSubEnd = node.startAngle + (si + 1) * anglePerSpouse;
          const aMid = (aSubStart + aSubEnd) / 2;

          const spouse = node.spouses[si];
          let sFs = Math.max(fs * 0.8, cfg.minFontSize);

          const sCands = buildNameCandidates(spouse, cfg);
          const sTextFull = sCands.find(c => (spouseH * 0.88 / Math.max(1, c.length * 0.6)) >= sFs) || sCands[sCands.length - 1];
          const unclampedSSingle = spouseH * 0.88 / Math.max(1, sTextFull.length * 0.6);

          const sLinesRaw = buildTextLines(spouse, cfg, false);
          const wMaxFsByArc = (anglePerSpouse * spouseRadialMid) / (sLinesRaw.length * 1.15);
          let sMaxChars = 1; for (const l of sLinesRaw) if (l.length > sMaxChars) sMaxChars = l.length;
          const unclampedSMulti = Math.min(wMaxFsByArc, spouseH * 0.88 / Math.max(1, sMaxChars * 0.6));

          const sBrokenMax = cfg.maxBrokenLineFontSize || cfg.maxFontSize;
          const effSMulti = Math.min(unclampedSMulti, sBrokenMax);
          const effSSingle = Math.min(unclampedSSingle, cfg.maxFontSize);

          // Check if multi-line includes a year (last line is year pattern)
          const hasYear = sLinesRaw.length > 1 && sLinesRaw[sLinesRaw.length - 1].match(/^[0-9\?\s\u2013]+$/);
          // Prefer multi-line more aggressively when years are available, or when it's reasonably close
          const sLines = (hasYear || effSMulti > effSSingle * 0.85 || (Math.min(sFs, effSMulti) === cfg.minFontSize && Math.min(sFs, effSSingle) === cfg.minFontSize)) ? sLinesRaw : [sTextFull];

          if (sLines.length > 1) {
             let fsLines = [];
             let totalW = 0;
             for (let i = 0; i < sLines.length; i++) {
                 let baseFs = spouseH * 0.88 / Math.max(1, sLines[i].length * 0.6);
                 baseFs = Math.min(baseFs, sBrokenMax);
                 if (sLines[i].match(/^[0-9\?\s\u2013]+$/)) {
                     baseFs = Math.min(baseFs, cfg.maxYearFontSize || 14);
                     if (i > 0) baseFs = Math.min(baseFs, fsLines[0]);
                 }
                 fsLines.push(baseFs);
                 totalW += baseFs * 1.15;
             }
             const availableW = anglePerSpouse * spouseRadialMid;
             const scale = totalW > availableW ? availableW / totalW : 1;
             for (let i = 0; i < fsLines.length; i++) fsLines[i] = fsLines[i] * scale;
             svgRadialText(sLines.join('\n'), spouseRadialMid, aMid, fs, node.genColor.text, 'center', fsLines);
          } else {
             const shrinkFs = Math.min(sFs, unclampedSSingle);
             const sAnchorR = node.rOuter - shrinkFs * 0.4;
             svgRadialText(sTextFull, sAnchorR, aMid, shrinkFs, node.genColor.text, 'outer');
          }
        }
      }
    }
  }

  // PASS 5: centre disc with root person's name
  // Draw 4 concentric gradient-like circles (or pie sectors for non-360 modes)
  // to create a subtle depth effect on the centre disc.
  const cr = cfg.centerRadius;
  const rootHsl = hexToHsl(root.genColor.bg);
  const baseC = hslCSS(adjustHSL(rootHsl, 0, -8, 0));
  for (let i = 3; i >= 0; i--) {
    const rr = cr - i * 3; // each ring is 3px smaller than the previous
    const fc = hslCSS(adjustHSL(adjustHSL(rootHsl, 0, -8, 0), -i * 2, -i * 3, i * 2));
    parts.push(`<circle cx="0" cy="0" r="${rr}" fill="${fc}" stroke="${root.genColor.line}" stroke-width="0.5"/>`);
  }
  // Calculate text color based on the actual background brightness for good contrast
  const centerTextColor = getContrastTextColor(adjustHSL(adjustHSL(rootHsl, 0, -8, 0), -2, -3, 2));

  // Scale centre font proportionally to the disc radius, clamped between 8–18 px.
  const cfs = clamp(cr * 0.22, 8, 18);
  const ind = root.individual;
  // Build centre label lines: surname, given name (deduplicated from displayName), then years.
  const centerLines = [];
  const nameWords = ind.displayName.split(/\s+/).filter(Boolean);
  if (nameWords.length <= 1) { centerLines.push(...nameWords); }
  else { centerLines.push(nameWords[0]); centerLines.push(nameWords.slice(1).join(' ')); }
  const cy = formatYears(ind); if (cy) centerLines.push(cy);
  const hasSpouseCenter = cfg.showSpouses && root.spouses.length > 0;
  const lineH = cfs * 1.2;
  // If there are spouses, shift the person block upward to leave room for the spouses below.
  const personY = hasSpouseCenter ? -cr * 0.1 : 0;
  const totalPersonH = centerLines.length * lineH;
  const personTop = personY - totalPersonH / 2 + lineH / 2;
  for (let i = 0; i < centerLines.length; i++) {
    const isYears = i === centerLines.length - 1 && cy && centerLines[i] === cy;
    const lfs = isYears ? cfs * 0.7 : cfs;
    const fw = isYears ? 'normal' : 'bold';
    parts.push(`<text y="${(personTop + i * lineH).toFixed(1)}" font-size="${lfs.toFixed(1)}" font-weight="${fw}" fill="${centerTextColor}" text-anchor="middle" dominant-baseline="central">${esc(centerLines[i])}</text>`);
  }
  if (hasSpouseCenter) {
    const sFs = cfs * 0.82, sLH = sFs * 1.15;
    let currentSpouseY = personY + totalPersonH / 2 + lineH * 0.3;

    for (let si = 0; si < root.spouses.length; si++) {
      const spouse = root.spouses[si];
      const spouseLines = [];
      const sNameWords = spouse.displayName.split(/\s+/).filter(Boolean);
      if (sNameWords.length <= 1) { spouseLines.push(...sNameWords); }
      else { spouseLines.push(sNameWords[0]); spouseLines.push(sNameWords.slice(1).join(' ')); }
      const sy = formatYears(spouse); if (sy) spouseLines.push(sy);

      // Draw divider before spouse (except before first spouse, draw before it)
      if (si === 0) {
        parts.push(`<line x1="${(-cr * 0.55).toFixed(1)}" y1="${currentSpouseY.toFixed(1)}" x2="${(cr * 0.55).toFixed(1)}" y2="${currentSpouseY.toFixed(1)}" stroke="${root.genColor.line}" stroke-width="0.8"/>`);
        currentSpouseY += lineH * 0.3;
      }

      const spouseTop = currentSpouseY + sLH / 2;
      for (let i = 0; i < spouseLines.length; i++) {
        const isYrs = i === spouseLines.length - 1 && sy && spouseLines[i] === sy;
        parts.push(`<text y="${(spouseTop + i * sLH).toFixed(1)}" font-size="${(isYrs ? sFs * 0.8 : sFs).toFixed(1)}" fill="${centerTextColor}" text-anchor="middle" dominant-baseline="central">${esc(spouseLines[i])}</text>`);
      }
      currentSpouseY += spouseLines.length * sLH;

      // Draw divider after spouse (except after last spouse)
      if (si < root.spouses.length - 1) {
        currentSpouseY += lineH * 0.2;
        parts.push(`<line x1="${(-cr * 0.55).toFixed(1)}" y1="${currentSpouseY.toFixed(1)}" x2="${(cr * 0.55).toFixed(1)}" y2="${currentSpouseY.toFixed(1)}" stroke="${root.genColor.line}" stroke-width="0.8"/>`);
        currentSpouseY += lineH * 0.2;
      }
    }
  }

  // --- GENERATION LEGEND ---
  // legendX: 30px further right than before.
  // Coordinate system: topY = -rOuter (no centerRadius offset), so the ring boxes
  // span y=-(centerRadius) to y=-outerRim. A centre-disc box covers y=-centerRadius to y=0,
  // making total legend height = outerRim with bottom anchored at y=0 (chart centre).
  const legendX = layoutData.outerRim + 50;

  // Equal-height boxes: one per generation present in the chart (disc/root + g=1..maxGen).
  // Total height = outerRim, bottom anchored at y=0 (chart centre).
  const discAbsGen = root.absoluteGen || 1;
  const numBoxes = layoutData.maxGen + 1; // disc(g=0) + rings g=1..maxGen
  const boxH = layoutData.outerRim / numBoxes;

  // Scale font size responsively based on box height (70% of box height, minimum 8px, maximum 12px)
  const legendFontSize = Math.max(8, Math.min(12, boxH * 0.7));

  // Compute legend label color against the SVG background (not the colored box)
  const legendLabelColor = getContrastTextColor(hexToHsl(cfg.palette.background));

  // Disc box (g=0 = root generation)
  const rootColor = hslCSS(hexToHsl(root.genColor.bg));
  parts.push(`<rect x="${legendX}" y="${(-boxH).toFixed(1)}" width="20" height="${boxH.toFixed(1)}" fill="${rootColor}" stroke="${root.genColor.line}" stroke-width="0.5"/>`);
  parts.push(`<text x="${legendX + 25}" y="${(-boxH / 2).toFixed(1)}" font-size="${legendFontSize.toFixed(1)}" font-weight="bold" fill="${legendLabelColor}" dominant-baseline="central">Đời ${discAbsGen}</text>`);

  for (let g = 1; g <= layoutData.maxGen; g++) {
     const topY = -(g + 1) * boxH;
     const midY = topY + boxH / 2;
     const absGen = discAbsGen + g;
     const genObj = cfg.palette.generations[g % cfg.palette.generations.length];
     const color = hslCSS(hexToHsl(genObj.bg));
     parts.push(`<rect x="${legendX}" y="${topY.toFixed(1)}" width="20" height="${boxH.toFixed(1)}" fill="${color}" stroke="${genObj.line}" stroke-width="0.5"/>`);
     parts.push(`<text x="${legendX + 25}" y="${midY.toFixed(1)}" font-size="${legendFontSize.toFixed(1)}" font-weight="bold" fill="${legendLabelColor}" dominant-baseline="central">Đời ${absGen}</text>`);
  }

  parts.push('</g></svg>');
  return {
    svg: parts.join('\n'),
    width: vp.w,
    height: vp.h
  };
}

// ── BROWSER INTEGRATION ───────────────────────────────────────────────────────
/**
 * Browser entry point. Initializes the interactive chart UI.
 * @param {string} gedcomText - Raw content of the GEDCOM file.
 */
if (typeof window !== 'undefined') {
  window.initChart = function (gedcomText) {
    const data = parseGedcom(gedcomText);
    const individuals = Array.from(data.individuals.values());

    // Enable UI
    const searchInput = document.getElementById('person-search');
    const dropdown = document.getElementById('person-dropdown');
    const genSlider = document.getElementById('gen-slider');
    const genValue = document.getElementById('gen-value');
    const fanRadios = document.querySelectorAll('input[name="fan"]');
    const exportBtn = document.getElementById('export-btn');
    const tooltip = document.getElementById('tooltip');
    const canvas = document.getElementById('chart-host');
    const container = document.getElementById('canvas-container');

    const paletteSelect = document.getElementById('palette-select');
    searchInput.disabled = false;
    searchInput.placeholder = "Search person by name...";
    genSlider.disabled = false;
    exportBtn.disabled = false;
    document.getElementById('status-left').textContent = `Loaded ${individuals.length} individuals`;

    if (paletteSelect) {
      paletteSelect.innerHTML = '';
      PALETTES.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = p.name;
        paletteSelect.appendChild(opt);
      });
      paletteSelect.onchange = (e) => {
        CONFIG.palette = PALETTES[e.target.value];
        renderChart();
      };
    }

    let hasInitializedTransform = false;
    let currentRootId = null;
    let currentSvgString = null;
    let isDragging = false;
    let dragStartX, dragStartY;
    let offsetX = 0, offsetY = 0;
    let scale = 1;

    function renderChart() {
      if (!currentRootId) return;
      const rootNode = buildDescendantTree(data, currentRootId, parseInt(genSlider.value, 10));
      if (!rootNode) return;
      const layoutData = computeLayout(rootNode, CONFIG);
      const output = buildSVG(rootNode, layoutData, CONFIG);
      currentSvgString = output.svg;

      // Directly inject SVG content instead of using a Blob URL.
      // This is more robust and bypasses many browser-specific img tag restrictions.
      canvas.innerHTML = output.svg;
      const svgElement = canvas.querySelector('svg');
      if (!svgElement) return;

      // Update dimensions
      svgElement.style.width  = output.width  + 'px';
      svgElement.style.height = output.height + 'px';
      svgElement.style.display = 'block';
      svgElement.style.position = 'absolute';
      svgElement.style.top = '0';
      svgElement.style.left = '0';
      svgElement.style.userSelect = 'none';

      // Initial centering and fit-to-view if it's the first render for this person
      const containerRect = container.getBoundingClientRect();
      if (!hasInitializedTransform && containerRect.width > 0 && containerRect.height > 0) {
        const pad = 40;
        const availableW = containerRect.width - pad;
        const availableH = containerRect.height - pad;
        
        scale = Math.min(availableW / output.width, availableH / output.height, 1);
        offsetX = (containerRect.width - output.width * scale) / 2;
        offsetY = (containerRect.height - output.height * scale) / 2;
        hasInitializedTransform = true;
      }
      
      applyTransform();
    }

    // Wiring up search
    let selectedIndex = -1;
    let lastMatches = [];

    function updateDropdown(query) {
      dropdown.innerHTML = '';
      selectedIndex = -1;
      if (!query) {
        dropdown.style.display = 'none';
        return;
      }
      const q = query.toLowerCase();
      lastMatches = individuals.filter(ind => ind.searchName.toLowerCase().includes(q)).slice(0, 50);

      lastMatches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<span>${m.displayName} ${formatYears(m)}</span><span class="id">${m.id}</span>`;
        div.onclick = () => {
          currentRootId = m.id;
          searchInput.value = m.displayName;
          dropdown.style.display = 'none';
          hasInitializedTransform = false; // Reset for new person
          renderChart();
        };
        dropdown.appendChild(div);
      });
      dropdown.style.display = lastMatches.length ? 'block' : 'none';
    }

    function selectDropdownItem(index) {
      if (index < 0 || index >= lastMatches.length) return;
      const m = lastMatches[index];
      currentRootId = m.id;
      searchInput.value = m.displayName;
      dropdown.style.display = 'none';
      hasInitializedTransform = false;
      renderChart();
    }

    function highlightDropdownItem(index) {
      const items = dropdown.querySelectorAll('.item');
      items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
      selectedIndex = index;
    }

    searchInput.addEventListener('input', (e) => updateDropdown(e.target.value));
    searchInput.addEventListener('click', () => updateDropdown(searchInput.value || currentRootId ? '' : ' '));
    searchInput.addEventListener('keydown', (e) => {
      if (dropdown.style.display === 'none') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, lastMatches.length - 1);
        highlightDropdownItem(selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        if (selectedIndex === -1) {
          dropdown.querySelectorAll('.item').forEach(item => item.classList.remove('active'));
        } else {
          highlightDropdownItem(selectedIndex);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectDropdownItem(selectedIndex);
        }
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.root-selector')) dropdown.style.display = 'none';
    });

    genSlider.addEventListener('change', () => renderChart());
    fanRadios.forEach(r => {
      if (r.checked) {
        CONFIG.fanMode = r.value;
      }
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          CONFIG.fanMode = e.target.value;
          renderChart();
        }
      });
    });

    // Zoom/pan state — must be declared before renderChart() is called below,
    // (Moved to top of scope)

    // Default: pick the first individual who has at least one spouse/family link
    // (i.e. appears as a parent), so the initial chart is non-empty.
    // Fall back to individuals[0] if nobody has descendants.
    const defaultInd = individuals.find(i => i.familySpouse.length > 0) || individuals[0];
    if (defaultInd) {
      currentRootId = defaultInd.id;
      searchInput.value = defaultInd.displayName;
      renderChart();
    }

    // Actually, drawing an image to canvas natively without overriding its styles 
    // requires a redraw loop. Instead of implementing a full canvas rewrite, we can 
    // simply scale and translate the canvas element itself using CSS transforms!
    function applyTransform() {
      const svgElement = canvas.querySelector('svg');
      if (!svgElement) return;
      svgElement.style.transformOrigin = 'top left';
      svgElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }
    // Expose for renderChart
    window._applyTransform = applyTransform;

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(0.1, Math.min(scale + delta, 5));
      // Zoom centered on mouse
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      offsetX = cursorX - (cursorX - offsetX) * (newScale / scale);
      offsetY = cursorY - (cursorY - offsetY) * (newScale / scale);
      scale = newScale;
      applyTransform();
    });

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStartX = e.clientX - offsetX;
      dragStartY = e.clientY - offsetY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      offsetX = e.clientX - dragStartX;
      offsetY = e.clientY - dragStartY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Wire up export
    document.querySelector('.export-wrap').addEventListener('click', (e) => {
      const menu = document.getElementById('export-menu');
      if (e.target.id === 'export-btn') {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      } else if (e.target.classList.contains('item') && currentSvgString) {
        const fmt = e.target.dataset.fmt;
        const baseName = `fanchart-${currentRootId}-${CONFIG.fanMode}`;
        menu.style.display = 'none';

        if (fmt === 'svg') {
          // SVG: download the raw SVG string directly
          const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
          const a = document.createElement('a');
          a.download = `${baseName}.svg`;
          a.href = URL.createObjectURL(blob);
          a.click();

        } else if (fmt === 'png') {
          // PNG: render SVG into a canvas scaled to 300 DPI, then export as PNG
          const parser = new DOMParser();
          const svgEl = parser.parseFromString(currentSvgString, 'image/svg+xml').documentElement;
          const w = parseFloat(svgEl.getAttribute('width') || 1000);
          const h = parseFloat(svgEl.getAttribute('height') || 1000);
          const scale = (CONFIG.exportDPI || 300) / 96; // 96 px/inch is the CSS reference
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(svgUrl);
            canvas.toBlob(pngBlob => {
              const a = document.createElement('a');
              a.download = `${baseName}.png`;
              a.href = URL.createObjectURL(pngBlob);
              a.click();
            }, 'image/png');
          };
          img.src = svgUrl;

        } else if (fmt === 'pdf') {
          // PDF: Switch to High-Resolution Raster approach (300 DPI)
          // This is much more robust than vector export for complex SVGs
          const parser = new DOMParser();
          const svgInput = currentSvgString.replace(/^<\?xml.*?\?>/i, '').trim();
          const svgDoc = parser.parseFromString(svgInput, 'image/svg+xml');
          const svgEl = svgDoc.documentElement;
          
          const w = parseFloat(svgEl.getAttribute('width') || 1000);
          const h = parseFloat(svgEl.getAttribute('height') || 1000);
          const dpi = CONFIG.exportDPI || 300;
          const scale = dpi / 96;

          document.body.style.cursor = 'wait';
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext('2d');
          
          const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();
          
          img.onload = () => {
            ctx.fillStyle = CONFIG.palette.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            
            const mmW = w * 0.264583;
            const mmH = h * 0.264583;
            
            const pdf = new jsPDF({
              orientation: mmW >= mmH ? 'landscape' : 'portrait',
              unit: 'mm',
              format: [mmW, mmH]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
            pdf.save(`${baseName.replace(/@/g, '')}.pdf`);
            
            document.body.style.cursor = 'default';
            console.log('High-Res PDF export successful');
          };
          
          img.onerror = (err) => {
            console.error('Image rendering failed:', err);
            alert('PDF Export failed: Could not render chart to image.');
            document.body.style.cursor = 'default';
          };
          
          img.src = url;
        }
      }
    });

  };
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = {
    CONFIG,
    FAN_MODES,
    PALETTES,
    clamp,
    hexToHsl,
    adjustHSL,
    hslCSS,
    getCellColor,
    getSpouseColor,
    parseName,
    parseYear,
    formatYears,
    parseGedcom,
    buildDescendantTree,
    computeLeafCount,
    flattenNodes,
    buildNameCandidates,
    buildTextLines,
    assignTextMode,
    computeFontSize,
    allocateArcs,
    computeViewport,
    computeLayout,
    buildSVG
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
// Generates charts based on GEDCOM data.
// Usage: node gen-svg.js [rootId fanMode outFile]
if (typeof module !== 'undefined' && require.main === module) {
  const dir = process.cwd();
  const gedFile = path.join(dir, 'HoPhan.ged');
  
  if (!fs.existsSync(gedFile)) {
    console.error(`Error: GEDCOM file not found at ${gedFile}`);
    process.exit(1);
  }

  const text = fs.readFileSync(gedFile, 'utf8');
  const data = parseGedcom(text);

  // Command line argument handling for individual charts
  if (process.argv.length >= 5) {
    const rootId = process.argv[2];
    const fanMode = process.argv[3];
    const outFile = process.argv[4];
    const maxGenerations = process.argv[5] ? parseInt(process.argv[5], 10) : CONFIG.maxGenerations;

    CONFIG.fanMode = fanMode;
    CONFIG.maxGenerations = maxGenerations;
    const root = buildDescendantTree(data, rootId, maxGenerations);
    if (!root) {
      console.error(`Failed to build tree for ${rootId}`);
      process.exit(1);
    }
    const layoutData = computeLayout(root, CONFIG);
    const output = buildSVG(root, layoutData, CONFIG);
    fs.writeFileSync(outFile, output.svg, 'utf8');
    console.log(`✓ ${path.basename(outFile)}  (${layoutData.allNodes.length} nodes, ${(output.svg.length / 1024).toFixed(0)} KB)`);
    process.exit(0);
  }

  // DEFAULT: generate the standard 6 charts
  const TARGETS = [
    { rootId: '@I0054@', name: 'PhanVoGiang' },
    { rootId: '@I0001@', name: 'PhanTatDien' },
  ];
  const FANS = ['360', '270', '180'];

  for (const { rootId, name } of TARGETS) {
    const ind = data.individuals.get(rootId);
    if (!ind) {
      console.error('Not found:', rootId);
      continue;
    }
    for (const fanMode of FANS) {
      CONFIG.fanMode = fanMode;
      const root = buildDescendantTree(data, rootId, CONFIG.maxGenerations);
      if (!root) {
        console.error(`Failed to build tree for ${rootId}`);
        continue;
      }
      const layoutData = computeLayout(root, CONFIG);
      const output = buildSVG(root, layoutData, CONFIG);
      const outFile = path.join(dir, `fanchart-${name}-${fanMode}.svg`);
      fs.writeFileSync(outFile, output.svg, 'utf8');
      console.log(`✓ ${path.basename(outFile)}  (${layoutData.allNodes.length} nodes, ${(output.svg.length / 1024).toFixed(0)} KB)`);
    }
  }
}
