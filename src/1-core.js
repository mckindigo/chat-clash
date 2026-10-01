'use strict';
/* =====================================================================
   CHAT CLASH v0.1 - all tunable numbers live here
   ===================================================================== */
const DATA = {
  version: '0.1',
  // Croww brand palette (cream / maroon / olive / tan / forest green)
  pal: { cream: '#fef9e5', maroon: '#4a1a1a', olive: '#606248', tan: '#967846', forest: '#3f6b35', forestGlow: '#7fb069' },
  // mascot layer anchors (procedural crow; each layer is a separate draw fn in MASCOT so it can be swapped for sprites)
  mascot: { seat: [1800, 640], beak: [1686, 526], handRest: [1742, 700], handRaised: [1716, 560], puffCycle: 7 },
  emoteBigHit: 10,
  W: 1920, H: 1080,
  path: [[405,250],[560,250],[560,820],[820,820],[820,300],[1080,300],[1080,640],[1300,640],[1300,850],[1545,850]],
  pads: [[460,450],[690,560],[690,945],[950,470],[950,690],[1190,510],[1190,945],[1420,740]],
  // income is mostly EARNED: kills + a wave-clear bonus (clearBase + clearPerWave * wave); the passive trickle is small.
  // killMult scales every enemy's gold; npcKillMult further scales the house NPCs (they are numerous).
  // earlyKillMult: waves 1..earlyKillWaves pay more per kill, easing down to killMult by earlyKillWaves+3; bossKillMult replaces killMult for bosses.
  economy: { startGold: 280, trickle: 0.4, sellRefund: 0.6, killMult: 0.55, earlyKillMult: 0.9, earlyKillWaves: 3, bossKillMult: 0.75, npcKillMult: 1, chatKillMult: 1, chatKillMin: 0.3, chatKillFrom: 3, chatKillFull: 15, clearBase: 15, clearPerWave: 12, copyStep: 0.25,
    // small-chat boost: fewer chatters = fewer chat enemies to farm, so the trickle (and a little kill gold) scales up.
    // boost k = 1 at 0 active chatters, fading linearly to 0 at smallChatFull chatters.
    smallChatFull: 8, smallTrickleBonus: 0.1, smallKillBonus: 0.35, activeWindow: 120 },
  // small-chat scaling of chat power (k = small-chat boost 0..1, same k as the gold boost)
  smallChat: { cooldown: 7, cooldownCurve: 1.6, hpBoost: { bug: 0.4, troll: 0.6, lag: 0.4, spam: 0.3 }, spamExtra: 3, hypeGain: 4, hypeDecayCut: 0.7 },
  chill: { max: 100, regenOnClear: 10 },
  wave: { firstBuild: 15, build: 12, baseDuration: 20, perWave: 2, maxDuration: 45, hpScale: 0.13, speedScale: 0.012 },
  difficulty: {
    easy:   { hp: 0.75, ai: 0.7,  gold: 1.25 },
    normal: { hp: 1.0,  ai: 1.0,  gold: 1.0 },
    hard:   { hp: 1.3,  ai: 1.35, gold: 0.9 }
  },
  // house NPC budget = budgetBase + budgetPerWave*(w-1) + budgetLate*(w-lateFrom)^2 once w > lateFrom (late waves ramp harder);
  // every enemy's HP also compounds by (1+lateHp) per wave past lateFrom. chatDiscount: how much of a chat spawn's cost comes out of the NPC budget.
  ai: { name: 'NPC', budgetBase: 10, budgetPerWave: 7, budgetLate: 2, lateFrom: 4, lateHp: 0.22, lateHpCap: 20, chatDiscount: 0.5, minGap: 0.45, maxGap: 2.2, unlock: { troll: 2, spam: 2, lag: 3 } },
  // hype: only ACCEPTED commands add hype (a rejected one - cooldown / room full / locked - adds nothing). A bigger chat needs
  // more hype: gain is divided by 1 + hypePerChatter * (active chatters beyond hypeFreeChatters). A chat !boss only unlocks
  // during a wave from bossMinWave on, one chat boss alive at a time, and it takes a minion slot like everything else.
  chat: { userCooldown: 20, globalCap: 30, queueStagger: 0.45, hypePerMsg: 1.2, hypePerCmd: 2.5, hypeMax: 100, hypeDecay: 0.35, feedLines: 7, hypeFreeChatters: 3, hypePerChatter: 0.1, bossMinWave: 3, bossHpPerChatter: 0.015, bossKillChill: 10,
    earlyChatHp: [0.75, 0.85] },   // chat enemies on waves 1 and 2 are softer (a big chat can't flatten 3 fresh towers)
  enemies: {
    bug:   { label: 'BUG',   desc: 'weak & fast',          hp: 30,   speed: 125, gold: 6,   dmg: 5,  r: 17, cost: 1 },
    troll: { label: 'TROLL', desc: 'tanky',                hp: 240,  speed: 52,  gold: 18,  dmg: 12, r: 30, cost: 4 },
    lag:   { label: 'LAG',   desc: 'speeds up nearby',     hp: 95,   speed: 68,  gold: 12,  dmg: 8,  r: 22, cost: 3, aura: 150, auraBuff: 1.35 },
    spam:  { label: 'SPAM',  desc: 'swarm of 5 tiny',      hp: 13,   speed: 112, gold: 2,   dmg: 2,  r: 11, cost: 2, count: 5 },
    boss:  { label: 'BOSS',  desc: 'unlocks at full HYPE', hp: 1300, speed: 36,  gold: 150, dmg: 25, r: 56, cost: 0 }
  },
  towers: {
    hammer: { name: 'Mod Hammer',   key: '1', desc: 'Melee slam, splash damage',    cost: 100, range: 150, dmg: 34, rate: 1.1, splash: 95, color: '#ffb03a' },
    laser:  { name: 'Ban Laser',    key: '2', desc: 'Single-target beam, high DPS', cost: 135, range: 270, dps: 70, color: '#ff3b5c' },
    slow:   { name: 'Slow Mode',    key: '3', desc: 'Pulse slows everyone nearby',  cost: 120, range: 210, slow: 0.5, dur: 1.6, rate: 1.0, dmg: 8, color: '#5ab8ff' },
    cannon: { name: 'Emote Cannon', key: '4', desc: 'Lobbed emotes, big AoE',       cost: 185, range: 290, dmg: 70, rate: 1.7, splash: 120, projSpeed: 1.1, color: '#ffd23f' }
  },
  // levels 1-5. Tiers 4-5 are steep late-game gold sinks. A 2nd copy (+25%) is better value than the first upgrade.
  upgrade: { maxLevel: 5, costMult: [0, 1.2, 1.8, 3.0, 4.5], dmgMult: 1.4, rangeMult: 1.1, rateMult: 0.88, slowAdd: 0.08 },
  vote: { firstDelay: 40, interval: 60, duration: 20, hazardDuration: 25 },
  hazards: {
    fog:      { name: 'FOG',          desc: 'Towers lose 30% range',    range: 0.7, color: '#b9c3d6' },
    ff:       { name: 'FAST FORWARD', desc: 'Enemies +40% speed',       speed: 1.4, color: '#ff9a3c' },
    blackout: { name: 'BLACKOUT',     desc: 'Dark except tower zones',  dark: 0.92, color: '#b59a6a' },
    drain:    { name: 'GOLD DRAIN',   desc: 'Croww loses 3 gold / sec', perSec: 3,  color: '#ffd23f' }
  },
  test: { botRate: 24, botCount: 24 },
  // AFK / autoplay: the bot defends while Croww is away. think = seconds between decisions (a slower bot is easier
  // for chat to beat), maxLevel caps upgrades, restartAfter = seconds on the results screen before the next round.
  afk: { think: 2.0, maxLevel: 2, reserve: 0, restartAfter: 12, earlyStart: 5, crowNear: 5, sessionCap: 200, watchdog: 240 },
  // desk mascot image (approved art) placement on the right panel
  deskArt: { x: 1485, y: 596, size: 450, face: [0.64, 0.33], screen: [0.1, 0.3, 0.26, 0.23] },
  // CROW BOSS: the old code-drawn smoking crow, an ally the streamer deploys (key B / the button under the chill meter)
  crowBoss: { unlockWave: 5, cooldown: 90, duration: 12, puffEvery: 1.4, radius: 270, dmg: 45, dmgPerWave: 0.12, slow: 0.5, slowDur: 2.5, chillOnDeploy: 8, perch: [1070, 770], scale: 0.5, bossMult: 2.5 },
  kick: { pusherKey: '32cbd69e4b950bf97679', cluster: 'us2', version: '8.4.0-rc2', knownRooms: { croww: '962037' }, pingEvery: 60 },
  // TOP ATTACKERS points (chat minions only): perHp per point of tower damage the minion soaks (HP it loses, capped at what it had),
  // perPx per pixel it walks along the path (~2800px desk to door), plus a desk-hit bonus of desk + deskPerChill * the chill it takes.
  score: { perHp: 0.2, perPx: 0.01, desk: 50, deskPerChill: 5 },
  fx: { shakePerDmg: 0.9, maxShake: 26 },
  ticker: 'HOW TO PLAY:  type  !bug  !troll  !lag  !spam  in chat to send attackers at Croww\'s desk   \u2022   fill the HYPE meter with chat to unlock  !boss   \u2022   every minute chat votes a hazard with  !1  !2  !3   \u2022   your name rides above your minion - soak tower hits, march far and hit the desk to top the TOP ATTACKERS board   \u2022   cooldown per chatter: {CD}s   \u2022   '
};

/* ===================================================================== utils */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const F = '"Oswald","Trebuchet MS","Segoe UI","DejaVu Sans",Verdana,sans-serif';
const O = '#2b0e0e';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function userColor(u, dark) { if (u === DATA.ai.name) return dark ? '#6e604a' : '#a89878'; const h = hashStr(u.toLowerCase()) % 360; return dark ? `hsl(${h},55%,32%)` : `hsl(${h},85%,72%)`; }
/* Croww emotes (112px, base64-embedded by tools/build.js) */
const EMOTES = {}; for (const k in (typeof EMOTE_SRC !== 'undefined' ? EMOTE_SRC : {})) { const im = new Image(); im.src = EMOTE_SRC[k]; EMOTES[k] = im; }
const ART = {}; for (const k in (typeof ART_SRC !== 'undefined' ? ART_SRC : {})) { const im = new Image(); im.src = ART_SRC[k]; ART[k] = im; }
function artReady(k) { const im = ART[k]; return !!(im && im.complete && im.naturalWidth); }
function crowBossUnlocked() { try { return localStorage.getItem('chatclash.crowBoss') === '1'; } catch (e) { return false; } }
function drawEmoteImg(name, x, y, size, rot, alpha) {
  const alt = THEME.emotes && THEME.emotes[name];   // non-croww themes: the theme's emote image (ART key), else a code-drawn face
  if (alt && !artReady(alt)) { const face = (THEME.emoteFaces || {})[name] || 0; ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha; drawEmote(x + size / 2, y + size / 2, size * 0.42, face, rot || 0); ctx.restore(); return; }
  const im = alt ? ART[alt] : EMOTES[name]; if (!im || !im.complete || !im.naturalWidth) return; ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha; ctx.translate(x + size / 2, y + size / 2); if (rot) ctx.rotate(rot); ctx.drawImage(im, -size / 2, -size / 2, size, size); ctx.restore(); }
function T(s, x, y, size, col, align, opt) {
  opt = opt || {}; if (!opt.raw) s = sayText(s);   // theme text rewrites (croww: none). raw = the credit line, never rewritten
  ctx.font = `${opt.w || 800} ${size}px ${F}`; ctx.textAlign = align || 'left'; ctx.textBaseline = opt.base || 'middle';
  if (opt.stroke !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = opt.sw || Math.max(3, size * 0.2); ctx.strokeStyle = opt.sc || O; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function fit(s, size, maxW, w) { s = sayText(s); ctx.font = `${w || 800} ${size}px ${F}`; if (ctx.measureText(s).width <= maxW) return s; while (s.length > 1 && ctx.measureText(s + '\u2026').width > maxW) s = s.slice(0, -1); return s + '\u2026'; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
function fs(fill, lw, stroke) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || O; ctx.stroke(); } }
function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
function panel(x, y, w, h, accent, alpha) {
  ctx.save(); rr(x, y, w, h, 18); ctx.fillStyle = `rgba(40,17,15,${alpha == null ? 0.9 : alpha})`; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = accent || '#6b4a32'; ctx.stroke(); ctx.restore();
}

/* ===================================================================== settings */
const SKEY = 'chatclash.settings.v1';
const settings = Object.assign({
  channel: 'croww', rooms: Object.assign({}, DATA.kick.knownRooms), clean: false,
  userCooldown: DATA.chat.userCooldown, globalCap: DATA.chat.globalCap, difficulty: 'normal',
  testMode: 'auto', botRate: DATA.test.botRate, npcWaves: true, smallChat: 'auto', volume: 60, muted: false, autoConnect: true
}, (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })());
settings.rooms = Object.assign({}, DATA.kick.knownRooms, settings.rooms || {});
function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {} }
const qs = new URLSearchParams(location.search);
if (qs.get('channel')) settings.channel = qs.get('channel').toLowerCase();
if (qs.get('room')) settings.rooms[settings.channel] = qs.get('room');
if (qs.get('clean') === '1') settings.clean = true;
/* test mode is only ever 'auto' | 'on' | 'off'. Unknown/stale values (old saves, typos like ?test=true) are normalised here. */
function normTestMode(v, fallback) {
  v = String(v == null ? '' : v).trim().toLowerCase();
  if (v === 'auto') return 'auto';
  if (['on', 'always', 'always on', 'true', '1', 'yes'].includes(v)) return 'on';
  if (['off', 'false', '0', 'no', 'none', 'disabled'].includes(v)) return 'off';
  return fallback;
}
settings.testMode = normTestMode(settings.testMode, 'auto');
settings.npcWaves = settings.npcWaves !== false;
if (!['auto', 'on', 'off'].includes(settings.smallChat)) settings.smallChat = 'auto';
/* ?test= is a one-shot override for that page load. It is NOT allowed to beat a choice the streamer later makes
   in Settings: changing Test mode in-game strips the param from the URL (see clearTestParam) so a reload keeps it. */
if (qs.has('test')) settings.testMode = normTestMode(qs.get('test'), settings.testMode);
if (qs.get('npc') === '0' || qs.get('npc') === 'off') settings.npcWaves = false;
function clearTestParam() {
  try { if (!qs.has('test')) return; qs.delete('test'); const s = qs.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
}
if (qs.get('connect') === '0') settings.autoConnect = false;
function bestScore() { try { return +(localStorage.getItem('chatclash.best') || 0); } catch (e) { return 0; } }
function saveBest(v) { if (v > bestScore()) try { localStorage.setItem('chatclash.best', v); } catch (e) {} }

/* ===================================================================== audio (procedural WebAudio) */
const SFX = {
  ac: null, master: null, last: {},
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ac.createGain(); this.master.connect(this.ac.destination); this.apply(); } catch (e) { this.ac = null; }
  },
  apply() { if (this.master) this.master.gain.value = settings.muted ? 0 : (settings.volume / 100) * 0.5; },
  ok(name, gap) { if (!this.ac || settings.muted || this.ac.state !== 'running') return false; const n = this.ac.currentTime; if (this.last[name] && n - this.last[name] < (gap || 0.04)) return false; this.last[name] = n; return true; },
  tone(f, dur, type, vol, f2, delay) {
    const a = this.ac, t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, freq, type, delay, q) {
    const a = this.ac, t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = freq || 1200; fl.Q.value = q || 1;
    const g = a.createGain(); g.gain.value = vol || 0.3; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t);
  },
  play(name) {
    if (!this.ok(name, { laser: 0.18, hit: 0.05, pop: 0.05, slow: 0.25, cough: 0.25, chat: 0.12, boom: 0.08 }[name])) return;
    switch (name) {
      case 'place': this.tone(420, 0.08, 'square', 0.18, 840); this.tone(840, 0.1, 'square', 0.12, 1260, 0.07); break;
      case 'upgrade': [520, 660, 880].forEach((f, i) => this.tone(f, 0.1, 'square', 0.14, f * 1.02, i * 0.06)); break;
      case 'sell': this.tone(700, 0.12, 'triangle', 0.2, 300); break;
      case 'hammer': this.noise(0.18, 0.5, 400); this.tone(120, 0.18, 'sine', 0.4, 50); break;
      case 'laser': this.tone(1400, 0.12, 'sawtooth', 0.05, 700); break;
      case 'slow': this.tone(300, 0.35, 'sine', 0.12, 150); break;
      case 'cannon': this.noise(0.12, 0.35, 900); this.tone(220, 0.14, 'square', 0.12, 90); break;
      case 'boom': this.noise(0.35, 0.5, 700); this.tone(90, 0.3, 'sine', 0.35, 40); break;
      case 'hit': this.tone(260 + Math.random() * 80, 0.05, 'square', 0.06, 180); break;
      case 'pop': this.tone(600 + Math.random() * 300, 0.07, 'triangle', 0.16, 1200); break;
      case 'cough': this.noise(0.12, 0.45, 900, 'bandpass', 0, 2); this.noise(0.14, 0.4, 700, 'bandpass', 0.16, 2); this.tone(180, 0.1, 'sawtooth', 0.08, 120); break;
      case 'wave': this.tone(220, 0.25, 'sawtooth', 0.14, 440); this.tone(330, 0.3, 'sawtooth', 0.12, 660, 0.18); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.2, f, i * 0.09)); break;
      case 'vote': this.tone(880, 0.12, 'sine', 0.2); this.tone(1320, 0.2, 'sine', 0.18, 1320, 0.12); break;
      case 'boss': this.tone(70, 0.9, 'sawtooth', 0.3, 45); this.noise(0.8, 0.2, 300); break;
      case 'unlock': [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, f, i * 0.07)); break;
      case 'chat': this.tone(1500, 0.03, 'sine', 0.04); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.24, f * 0.95, i * 0.22)); this.noise(0.3, 0.4, 500, 'lowpass', 0.6); break;
      case 'click': this.tone(900, 0.03, 'square', 0.08); break;
    }
  }
};

/* ===================================================================== path */
const PATH = (() => {
  const p = DATA.path.map(([x, y]) => ({ x, y })), seg = []; let tot = 0;
  for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y); seg.push({ a, b, l, s: tot }); tot += l; }
  return { p, seg, len: tot };
})();
function pathAt(d) {
  if (d < 0) { const a = PATH.p[0]; return { x: a.x + d, y: a.y, ang: 0 }; }
  for (const s of PATH.seg) if (d <= s.s + s.l) { const k = (d - s.s) / s.l; return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, ang: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) }; }
  const s = PATH.seg[PATH.seg.length - 1]; return { x: s.b.x, y: s.b.y, ang: 0 };
}
