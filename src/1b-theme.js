/* =====================================================================
   THEMES - the look (colors, art, wording). Gameplay never reads this.
   - 'croww' (default) is the original look and changes nothing: no color remap, the approved Croww art, the original text.
   - 'neutral' has no Croww name or art. Its look is ONE object, THEMES.neutral, below:
       pal      the colors (hex). Each key is a ROLE; THEME_ROLES says which original Croww color each role replaces.
       art      'mascot' / 'logo': an ART key embedded by tools/build.js (assets/neutral/mascot.png -> 'neutral.mascot',
                assets/neutral/logo.png -> 'neutral.logo'); when that file is missing, the code-drawn fallback is used.
       emotes   Croww emote -> ART key of the replacement image; emoteFaces = code-drawn fallback (0 smile, 1 laugh, 2 shades, 3 shocked).
       say      text rewrites applied to every canvas string (catch-all: nothing reading "Croww" ever reaches the screen).
   - To add a theme (e.g. 'custom'): copy THEMES.neutral, give it a new id + label. It appears in Settings > Theme and ?theme=<id>.
   Selection: ?theme=<id> (also saved), else localStorage 'chatclash.theme', else 'croww'. Settings > Theme switches live.
   ===================================================================== */
// role -> the original Croww colors it replaces (hex or "r,g,b" for rgba(...) colors). Only used by non-croww themes.
const THEME_ROLES = {
  barBg: ['#fef9e5'], barInk: ['#4a1a1a', '74,26,26'], barMuted: ['#606248'], barGold: ['#967846'], good: ['#3f6b35'],
  accent: ['#7fb069', '#9fd07a', '127,176,105', '#d9a441'], accentLight: ['#b8e09a', '#a8d08d', '#f3c878', '#e0c878'],
  warm: ['#e0b45c', '#f0b050', '#c8923a', '224,180,92', '240,176,80'], warmDark: ['#4a2f12'],
  bgTop: ['#221714'], bgBottom: ['#110b09'], field: ['#1f1e16'], fieldLine: ['150,120,70'], fieldTint: ['96,98,72'],
  rightTop: ['#1f1512'], rightBottom: ['#2a1c17'], floor: ['#140d0b'], outline: ['#2b0e0e', '#120a08'],
  road: ['#3a2622'], roadTop: ['#44302a'], roadGlow: ['217,164,65'], roadDash: ['230,200,140'], padTop: ['#5a5c44'], padBottom: ['#34352a'],
  panel: ['40,17,15'], sidebar: ['30,14,12'], panelDeep: ['20,8,8', '8,4,4', '12,6,5', '10,5,4'], border: ['#6b4a32', '#4a3a2a', '#5a3a2a', '#5a4a3a'],
  well: ['#2e1a16', '#2a1a16'], button: ['#3a1a17'], buttonOff: ['#1e1210', 'rgba(30,20,16,0.9)'],
  text2: ['#bfae86', '#d4c49c'], text3: ['#9c8a68', '#8a7a60', '#b59a6a'], text1: ['#e9dfc4', '#efe6cc'], textDim: ['#6e604a', '#a89878'],
  // Crow Boss hoodie (the crow itself stays: it is a generic crow, not Croww art)
  hood: ['#45472f', '#4f5139'], hoodLight: ['#7a7c5a'], sleeve: ['#6a6c4e']
};
const THEMES = {
  croww: { id: 'croww', label: 'Croww (default)', plainLabel: 'Original (default)' },   // plainLabel: shown in the theme picker while an unbranded theme is on   // original look: no pal/say/emotes -> nothing is changed
  neutral: {
    id: 'neutral', label: 'Neutral (no branding)', docTitle: 'CHAT CLASH v0.1 - Desk Defense',
    // Art's palette (brand/neutral/palette.md / palette.json, "THEMES.neutral.pal"). DATA.pal equivalents:
    // cream #F4F6F9, maroon #1E293B, olive #5B6B80, tan #B45309, forest #0D9488, forestGlow #2DD4BF.
    pal: {
      barBg: '#F4F6F9', barInk: '#1E293B', barMuted: '#5B6B80', barGold: '#B45309', good: '#0D9488', accent: '#2DD4BF',
      accentLight: '#99F6E4', warm: '#F59E0B', warmDark: '#78350F', bgTop: '#1E293B', bgBottom: '#0F172A', field: '#1E293B',
      fieldLine: '#94A3B8', fieldTint: '#475569', rightTop: '#172033', rightBottom: '#1E293B', floor: '#0F172A', outline: '#0B1220',
      road: '#334155', roadTop: '#3B4A60', roadGlow: '#2DD4BF', roadDash: '#CBD5E1', padTop: '#475569', padBottom: '#334155',
      panel: '#1E293B', sidebar: '#172033', panelDeep: '#0F172A', border: '#475569', well: '#0F172A', button: '#334155',
      buttonOff: '#1A2333', text1: '#F4F6F9', text2: '#CBD5E1', text3: '#94A3B8', textDim: '#64748B', hood: '#334155',
      hoodLight: '#64748B', sleeve: '#475569',
      // used only by the code-drawn mascot / logo fallbacks (not remaps)
      skin: '#EEF2F6', shirt: '#5B6B80', chair: '#0D9488', screen: '#1E293B', ink: '#1E293B'
    },
    art: { mascot: 'neutral.mascot', logo: 'neutral.logo' },
    titleLogo: false,   // the title card already says CHAT CLASH; only show the logo there if it is a real Art logo file
    emotes: { crowwHype: 'neutralHype', crowwW: 'neutralW', crowwL: 'neutralL', crowwLUL: 'neutralLUL' },   // Art's emotes (assets/neutral/*_112.png)
    emoteFaces: { crowwHype: 2, crowwW: 0, crowwL: 3, crowwLUL: 1 },   // code-drawn fallback if an emote file is missing
    say: [
      [/CROWW'S DESK/g, 'THE DESK'], [/Croww's Desk Defense/g, 'Desk Defense'], [/Croww fell out of his chair\./g, 'The streamer fell out of the chair.'],
      [/CROWW IS (AFK|BACK)/g, 'STREAMER IS $1'], [/Croww will be right back/g, 'Be right back'], [/Croww stays cozy/g, 'the desk stays cozy'],
      [/welcome back, Croww/g, 'welcome back'], [/attack Croww next wave/g, 'attack the desk next wave'], [/at Croww's desk/g, 'at the desk'],
      [/#croww\b/gi, 'KICK CHAT'], [/\bCROWW\b/g, 'STREAMER'], [/\bCroww's\b/g, "the streamer's"], [/\bCroww\b/g, 'the streamer'],
      [/croww/gi, m => m === 'CROWW' ? 'STREAMER' : 'streamer']
    ]
  }
};
const THEME_KEY = 'chatclash.theme';
let THEME = THEMES.croww, THEME_REMAP = null, themePatched = false, themeBooted = false;
const themeCache = {};
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function themeColor(v) {
  if (!THEME_REMAP || typeof v !== 'string') return v;
  const k = v.replace(/\s+/g, '').toLowerCase(), hit = THEME_REMAP.get(k); if (hit) return hit;
  const m = /^rgba?\((\d+),(\d+),(\d+)(,[\d.]+)?\)$/.exec(k); if (!m) return v;
  const r = THEME_REMAP.get(m[1] + ',' + m[2] + ',' + m[3]); return r ? 'rgba(' + hexRgb(r).join(',') + (m[4] || ',1') + ')' : v;
}
function sayText(s) { if (!THEME.say || typeof s !== 'string' || !/croww/i.test(s)) return s; for (const [re, rep] of THEME.say) s = s.replace(re, rep); return s; }
// the color remap rides on the canvas setters, so the drawing code keeps its original literals (and croww = untouched)
function themePatchCanvas() {
  if (themePatched) return; themePatched = true;
  const P = CanvasRenderingContext2D.prototype;
  for (const k of ['fillStyle', 'strokeStyle', 'shadowColor']) { const d = Object.getOwnPropertyDescriptor(P, k); Object.defineProperty(P, k, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, themeColor(v)); } }); }
  const add = CanvasGradient.prototype.addColorStop; CanvasGradient.prototype.addColorStop = function (o, c) { return add.call(this, o, themeColor(c)); };
}
function themeCss() {
  let el = document.getElementById('themeCss'); if (!el) { el = document.createElement('style'); el.id = 'themeCss'; document.head.appendChild(el); }
  const p = THEME.pal; if (!p) { el.textContent = ''; return; }
  const rgb = h => hexRgb(h).join(',');
  el.textContent = `#settings{background:rgba(${rgb(p.panel)},.97);border-color:${p.accent};box-shadow:0 0 40px rgba(${rgb(p.accent)},.35),0 0 0 6px ${p.barInk};color:${p.text1}}
#settings h2{color:${p.warm};text-shadow:0 0 12px ${p.accent}}#settings h3{color:${p.accent};border-bottom-color:${p.border}}
#settings input,#settings select,#settings button{background:${p.button};border-color:${p.border}}#settings button{background:${p.barInk};border-color:${p.accent}}
#settings button:hover{background:${p.accent};color:${p.ink}}.hint{color:${p.text2}}`;
}
function setTheme(id, save) {
  THEME = THEMES[id] || THEMES.croww;
  THEME_REMAP = null;
  if (THEME.pal) {
    THEME_REMAP = new Map();
    for (const role in THEME_ROLES) if (THEME.pal[role]) for (const c of THEME_ROLES[role]) THEME_REMAP.set(c.replace(/\s+/g, '').toLowerCase(), THEME.pal[role]);
    themePatchCanvas();
  }
  if (save) try { localStorage.setItem(THEME_KEY, THEME.id); } catch (e) {}
  document.title = THEME.docTitle || 'CHAT CLASH v0.1 - Croww\'s Desk Defense';
  document.body.classList.toggle('theme-' + THEME.id, true); for (const k in THEMES) if (k !== THEME.id) document.body.classList.remove('theme-' + k);
  themeCss();
  if (themeBooted) renderBG();   // live switch: re-render the prerendered background (the first pick runs before it exists)
}
/* theme art: returns something drawImage() can take, or null. croww = exactly the original ART images. */
function themeImg(k) {
  if (!THEME.art) return artReady(k) ? ART[k] : null;
  const key = THEME.art[k]; if (key && artReady(key)) return ART[key];
  const ck = THEME.id + '.' + k; if (themeCache[ck]) return themeCache[ck];
  const gen = k === 'mascot' ? drawFallbackMascot : k === 'logo' ? drawFallbackLogo : null; if (!gen) return null;
  const c = gen(THEME.pal); if (c && c.final) themeCache[ck] = c; return c;
}
function themeArtIsFile(k) { return !THEME.art || artReady(THEME.art[k]); }
function imgW(im) { return im.naturalWidth || im.width; }
function imgH(im) { return im.naturalHeight || im.height; }
/* code-drawn neutral desk mascot, 450x450, same layout as the Croww desk art (DATA.deskArt: monitor screen on the left
   at screen[], face at face[]) so the LOW CHILL / GG screen overlay and the *oof* text line up. */
function drawFallbackMascot(p) {
  const c = document.createElement('canvas'); c.width = c.height = 450; const x = c.getContext('2d'); c.final = true;
  const ink = p.ink, lw = 6; x.lineJoin = 'round'; x.lineCap = 'round';
  const shape = (f, fill, w) => { x.beginPath(); f(); if (fill) { x.fillStyle = fill; x.fill(); } if (w !== 0) { x.lineWidth = w || lw; x.strokeStyle = ink; x.stroke(); } };
  shape(() => x.roundRect(300, 120, 112, 230, 26), p.chair);                                     // chair back
  shape(() => x.roundRect(232, 196, 128, 120, [44, 44, 14, 14]), p.shirt);                       // torso
  shape(() => { x.moveTo(262, 200); x.lineTo(288, 226); x.lineTo(314, 200); }, null, 4);           // collar
  x.save(); x.strokeStyle = ink; x.lineWidth = 34; x.beginPath(); x.moveTo(250, 222); x.lineTo(214, 262); x.lineTo(188, 276); x.stroke();
  x.strokeStyle = p.shirt; x.lineWidth = 22; x.stroke(); x.restore();                             // arm to the keyboard
  shape(() => x.arc(186, 276, 13, 0, 7), p.skin, 4);                                             // hand
  shape(() => x.arc(288, 148, 50, 0, 7), p.skin);                                                // head
  x.fillStyle = ink; x.beginPath(); x.arc(266, 146, 5.5, 0, 7); x.fill(); x.beginPath(); x.arc(292, 146, 5.5, 0, 7); x.fill();   // eyes (looking at the screen)
  x.lineWidth = 4; x.strokeStyle = ink; x.beginPath(); x.arc(276, 162, 12, 0.35, 2.4); x.stroke();                                // small smile
  x.lineWidth = 12; x.strokeStyle = ink; x.beginPath(); x.arc(288, 146, 56, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
  x.lineWidth = 7; x.strokeStyle = p.accent; x.stroke();                                         // headphones band
  shape(() => x.roundRect(318, 124, 26, 46, 11), p.accent, 5);                                   // ear cup
  shape(() => x.roundRect(10, 280, 430, 22, 8), p.padTop);                                       // desk top
  shape(() => x.rect(26, 302, 398, 120), p.padBottom);                                           // desk front
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(32, 306, 386, 10);
  shape(() => x.roundRect(146, 268, 92, 14, 4), p.hood, 4);                                      // keyboard
  shape(() => x.rect(94, 246, 18, 34), p.hood, 5); shape(() => x.roundRect(66, 274, 74, 10, 4), p.hood, 5);   // monitor stand
  shape(() => x.roundRect(33, 123, 141, 128, 10), p.hood);                                       // monitor bezel
  x.fillStyle = p.screen; x.fillRect(45, 135, 117, 104);                                         // screen = DATA.deskArt.screen
  x.fillStyle = p.accent; x.globalAlpha = 0.8; for (let i = 0; i < 5; i++) x.fillRect(56, 150 + i * 17, 30 + ((i * 37) % 60), 6); x.globalAlpha = 1;
  return c;
}
function drawFallbackLogo(p) {
  const c = document.createElement('canvas'); c.width = 720; c.height = 220; const x = c.getContext('2d');
  c.final = !document.fonts || document.fonts.check('700 40px Oswald');   // redraw once the font is in
  x.font = '700 150px ' + F; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowBlur = 26; x.shadowColor = p.accent; x.lineWidth = 7; x.strokeStyle = p.accent; x.strokeText('CHAT CLASH', 360, 114);
  x.shadowBlur = 0; x.fillStyle = p.text1; x.fillText('CHAT CLASH', 360, 114);
  return c;
}
/* pick the theme: ?theme= wins (and is saved), then the saved choice, then croww */
(function () {
  let id = String(qs.get('theme') || '').trim().toLowerCase(), save = !!THEMES[id];
  if (!THEMES[id]) { try { id = localStorage.getItem(THEME_KEY); } catch (e) { id = null; } }
  setTheme(THEMES[id] ? id : 'croww', save); themeBooted = true;
})();
