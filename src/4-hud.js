/* ===================================================================== drawing: HUD */
function drawCoin(x, y, r) { circ(x, y, r); fs('#ffd23f', 4); circ(x, y, r * 0.6); ctx.lineWidth = 3; ctx.strokeStyle = '#c08a10'; ctx.stroke(); }
function drawGear(x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(view.settingsOpen ? t : 0); ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr2 = i % 2 ? r : r * 0.78; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); fs(DATA.pal.maroon, 4); circ(0, 0, r * 0.35); fs(DATA.pal.cream, 3); ctx.restore();
}
function drawSpeaker(x, y, muted) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - 16, y - 7); ctx.lineTo(x - 7, y - 7); ctx.lineTo(x + 4, y - 16); ctx.lineTo(x + 4, y + 16); ctx.lineTo(x - 7, y + 7); ctx.lineTo(x - 16, y + 7); ctx.closePath(); fs(DATA.pal.maroon, 4);
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  if (muted) { ctx.strokeStyle = '#ff5070'; line(x + 10, y - 9, x + 24, y + 9); line(x + 24, y - 9, x + 10, y + 9); }
  else { ctx.strokeStyle = DATA.pal.maroon; ctx.beginPath(); ctx.arc(x + 6, y, 10, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 6, y, 18, -0.9, 0.9); ctx.stroke(); }
  ctx.restore();
}
function drawPauseBtn(x, y, paused, t) {
  const hov = dist(view.mx, view.my, x, y) < 26;
  ctx.save(); circ(x, y, 24); fs(paused ? '#7fb069' : hov ? 'rgba(74,26,26,0.15)' : 'rgba(0,0,0,0)', 4, DATA.pal.maroon);
  if (paused) { ctx.beginPath(); ctx.moveTo(x - 7, y - 12); ctx.lineTo(x + 12, y); ctx.lineTo(x - 7, y + 12); ctx.closePath(); fs(DATA.pal.maroon); }
  else { rr(x - 10, y - 12, 7, 24, 2); fs(DATA.pal.maroon); rr(x + 3, y - 12, 7, 24, 2); fs(DATA.pal.maroon); }
  ctx.restore();
}
function drawPaused(rt) {
  ctx.fillStyle = 'rgba(10,5,4,0.72)'; ctx.fillRect(0, 90, 1920, 950);
  const w = 820, h = 420, x = 960 - w / 2, y = 290, pulse = 0.5 + 0.5 * Math.sin(rt * 2.4);
  ctx.save(); ctx.shadowBlur = 30 + pulse * 20; ctx.shadowColor = '#9fd07a'; rr(x, y, w, h, 28); ctx.fillStyle = 'rgba(20,8,8,0.96)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#b8e09a'; ctx.stroke(); ctx.restore();
  if (artReady('logo')) { const im = ART.logo, lw = 360, lh = lw * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.globalAlpha = 0.85 + pulse * 0.15; ctx.drawImage(im, 960 - lw / 2, y + 22, lw, lh); ctx.restore(); }
  // big pause glyph + word
  ctx.save(); ctx.shadowBlur = 24; ctx.shadowColor = '#f0b050'; rr(700, y + 170, 34, 110, 8); fs('#fef9e5', 5, '#f3c878'); rr(752, y + 170, 34, 110, 8); fs('#fef9e5', 5, '#f3c878'); ctx.restore();
  ctx.save(); ctx.shadowBlur = 30; ctx.shadowColor = '#f0b050'; T('PAUSED', 1060, y + 226, 120, '#fef9e5', 'center', { w: 700, sw: 10, sc: '#4a1a1a' }); ctx.restore();
  const n = heldChat.length;
  T(n ? n + ' chat message' + (n === 1 ? '' : 's') + ' held - they play when the game resumes' : 'Chat is held while paused - commands play when the game resumes', 960, y + 330, 26, '#e0b45c', 'center', { w: 700, sw: 5 });
  T('Croww will be right back  \u2022  P / Esc or the pause button to resume', 960, y + 372, 22, '#bfae86', 'center', { w: 600, stroke: false });
}
function drawTopBar(t) {
  const P = DATA.pal;
  ctx.fillStyle = P.cream; ctx.fillRect(0, 0, 1920, 90);
  ctx.fillStyle = P.olive; ctx.fillRect(0, 84, 1920, 6);
  T('CHAT CLASH', 22, 46, 58, P.maroon, 'left', { w: 700, stroke: false });
  ctx.fillStyle = P.olive; ctx.fillRect(330, 20, 3, 52);
  T('WAVE ' + G.wave, 352, 46, 50, P.maroon, 'left', { w: 700, stroke: false });
  let ph = '', pc = P.olive;
  if (G.phase === 'build') ph = 'BUILD  ' + Math.ceil(G.phaseT) + 's  \u2022  SPACE = START NOW';
  else if (G.phase === 'wave') { const left = Math.ceil(G.waveDur - G.waveT); ph = left > 0 ? 'ATTACK!  CHAT SPAWNS OPEN ' + left + 's' : 'CLEAR THE ROOM!  ' + G.enemies.length + ' LEFT'; pc = P.forest; }
  else { ph = 'CHILL LOST'; pc = '#a3261e'; }
  T(ph, 560, 47, 32, pc, 'left', { w: 600, stroke: false });
  drawCoin(1180, 46, 20); T(Math.floor(G.gold) + '', 1210, 46, 46, P.tan, 'left', { w: 700, stroke: false });
  T('SCORE ' + G.score, 1350, 34, 24, P.maroon, 'left', { w: 700, stroke: false });
  T('BEST ' + Math.max(bestScore(), G.score), 1350, 62, 20, P.olive, 'left', { w: 500, stroke: false });
  const st = Kick.status, tm = testModeActive();
  const lc = st === 'live' ? '#3fae3a' : st === 'connecting' ? '#e0a020' : st === 'error' ? '#c0302a' : '#9c8a68';
  ctx.save(); ctx.shadowBlur = st === 'live' ? 14 : 0; ctx.shadowColor = lc; circ(1530, 46, 12 + (st === 'live' ? Math.sin(t * 4) * 1.5 : 0)); fs(lc, 3, P.maroon); ctx.restore();
  T(fit(st === 'live' ? 'LIVE  #' + settings.channel : st === 'connecting' ? 'CONNECTING\u2026' : 'CHAT OFFLINE', 22, 178, 700), 1552, 32, 22, P.maroon, 'left', { w: 700, stroke: false });
  T(fit(tm ? 'TEST MODE (BOTS)' : st === 'live' ? Kick.msgs + ' msgs read' : 'press S to connect', 19, 170, 500), 1552, 62, 19, tm ? P.tan : P.olive, 'left', { w: 500, stroke: false });
  drawPauseBtn(1762, 46, G.paused, t);
  drawSpeaker(1822, 46, settings.muted);
  drawGear(1884, 46, 22, t);
}
function drawSidebar(t) {
  ctx.fillStyle = 'rgba(30,14,12,0.97)'; ctx.fillRect(0, 90, 370, 950);
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(368, 90, 3, 950);
  panel(12, 102, 346, 408, '#7fb069');
  T('CHAT COMMANDS', 185, 130, 28, '#a8d08d', 'center', { w: 900 });
  ['bug', 'troll', 'lag', 'spam', 'boss'].forEach((ty, i) => {
    const y = 180 + i * 58, D = DATA.enemies[ty], lock = ty === 'boss' && !G.bossReady;
    ctx.save(); if (lock) ctx.globalAlpha = 0.5; drawEnemyShape(ty, 48, y + 2, ty === 'boss' ? 17 : ty === 'troll' ? 16 : ty === 'spam' ? 11 : 14, t, 0, 0, false); ctx.restore();
    T('!' + ty, 84, y - 7, 32, lock ? '#9c8a68' : ty === 'boss' ? '#ff5070' : '#fff', 'left', { w: 900, sw: 6 });
    T(ty === 'boss' ? (G.bossReady ? 'UNLOCKED! first one wins' : 'locked \u2022 fill the HYPE bar') : ty === 'spam' ? 'swarm of ' + spamCount(smallChatK()) + ' tiny' : D.desc, 84, y + 19, 17, ty === 'boss' && G.bossReady ? '#ffd23f' : '#d4c49c', 'left', { w: 700, stroke: false });
    const tag = { spam: ['x' + spamCount(smallChatK()), '#ff7ac8'], troll: ['TANK', '#9ad07e'], bug: ['FAST', '#9be34a'], lag: ['AURA', '#3fc8ff'], boss: [G.bossReady ? 'READY' : 'LOCK', G.bossReady ? '#ffd23f' : '#6e604a'] }[ty];
    T(tag[0], 340, y - 7, 18, tag[1], 'right', { w: 900 });
  });
  const sk = smallChatK();
  if (sk > 0.05) {
    T('Cooldown: ' + effCooldown(sk) + 's', 24, 468, 20, '#fef9e5', 'left', { w: 800, stroke: false });
    ctx.save(); ctx.shadowBlur = 10 + Math.sin(t * 3) * 4; ctx.shadowColor = '#e0b45c'; rr(166, 455, 180, 26, 13); fs('#4a2f12', 2, '#e0b45c'); ctx.restore();
    T('SMALL CHAT BOOST ' + Math.round(sk * 100) + '%', 256, 468, 15, '#ffd23f', 'center', { w: 900, stroke: false });
  } else T('Cooldown: ' + settings.userCooldown + 's per chatter', 185, 468, 20, '#fef9e5', 'center', { w: 800, stroke: false });
  const nAct = activeChatters(), gps = goldPerSec(nAct);
  T(fit('Minions ' + chatLoad() + '/' + settings.globalCap + (G.chatQueue.length ? ' (' + G.chatQueue.length + ' queued)' : '') + '  \u2022  ' + nAct + ' chatting  \u2022  +' + gps.toFixed(1) + 'g/s', 17, 336, 700), 185, 493, 17, gps > DATA.economy.trickle + 0.05 ? '#e0c878' : '#bfae86', 'center', { w: 700, stroke: false });
  panel(12, 520, 346, 86, G.bossReady ? '#ff4060' : '#6b4a32');
  const hpul = G.bossReady ? 1 + Math.sin(t * 8) * 0.08 : 1 + (G.hype / DATA.chat.hypeMax) * 0.06 * Math.sin(t * 4);
  drawEmoteImg('crowwHype', 20 - (hpul - 1) * 30, 524 - (hpul - 1) * 30, 60 * hpul, G.bossReady ? Math.sin(t * 10) * 0.12 : 0);
  T('HYPE', 88, 546, 28, '#e0b45c', 'left', { w: 700 });
  T(G.bossReady ? '!boss READY' : Math.floor(G.hype) + '%', 342, 546, 22, G.bossReady ? '#ffd23f' : '#fff', 'right', { w: 900 });
  rr(88, 568, 256, 24, 10); fs('#2e1a16', 3);
  const hf = G.hype / DATA.chat.hypeMax;
  if (hf > 0.01) { ctx.save(); rr(88, 568, Math.max(20, 256 * hf), 24, 10); const hg = ctx.createLinearGradient(88, 0, 344, 0); hg.addColorStop(0, '#e0b45c'); hg.addColorStop(1, '#ffd23f'); ctx.shadowBlur = G.bossReady ? 20 + Math.sin(t * 8) * 10 : 8; ctx.shadowColor = '#e0b45c'; fs(hg); ctx.restore(); }
  panel(12, 616, 346, 226, '#ffd23f');
  T('TOP ATTACKERS', 185, 644, 28, '#ffd23f', 'center', { w: 900 });
  const top = Object.entries(G.session).sort((a, b) => b[1].dmg - a[1].dmg || b[1].spawns - a[1].spawns).slice(0, 5);
  if (!top.length) T('nobody yet - type !bug', 185, 740, 20, '#9c8a68', 'center', { w: 700, stroke: false });
  top.forEach(([u, s], i) => {
    const y = 682 + i * 31;
    T((i + 1) + '.', 28, y, 22, i === 0 ? '#ffd23f' : '#e9dfc4', 'left', { w: 900 });
    T(fit(u, 22, 210), 60, y, 22, userColor(u), 'left', { w: 900, sw: 5 });
    T(s.dmg + '', 342, y, 22, '#ff8a9a', 'right', { w: 900 });
  });
  T('chill damage dealt', 342, 828, 14, '#9c8a68', 'right', { stroke: false, w: 600 });
  panel(12, 852, 346, 178, '#6b4a32');
  const lines = feed.slice(-DATA.chat.feedLines);
  if (!lines.length) T('chat feed', 185, 940, 18, '#6e604a', 'center', { stroke: false });
  lines.forEach((fd, i) => {
    const y = 873 + i * 23, age = (performance.now() - fd.t) / 1000;
    ctx.globalAlpha = clamp(1.4 - age / 20, 0.35, 1);
    const u = fit(fd.user, 17, 130, 800) + ':';
    ctx.font = `800 17px ${F}`; const uw = ctx.measureText(u).width;
    T(u, 26, y, 17, userColor(fd.user), 'left', { stroke: false });
    const col = { ok: '#8fca6a', cd: '#ffb070', cap: '#ff7070', lock: '#bfae86', vote: '#a8d08d', msg: '#efe6cc' }[fd.kind] || '#fff';
    T(fit(fd.text, 17, 312 - uw, 600), 32 + uw, y, 17, col, 'left', { stroke: false, w: 600 });
    ctx.globalAlpha = 1;
  });
}
function drawTicker(t) {
  ctx.fillStyle = '#4a1a1a'; ctx.fillRect(0, 1040, 1920, 40);
  ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#7fb069'; ctx.fillStyle = '#7fb069'; ctx.fillRect(0, 1040, 1920, 2); ctx.restore();
  const s = DATA.ticker.replace('{CD}', effCooldown());
  ctx.font = `900 25px ${F}`; const w = ctx.measureText(s).width;
  const off = -((t * 110) % w), parts = s.split(/(![a-z0-9]+)/);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 1042, 1920, 38); ctx.clip();
  for (let x = off; x < 1920; x += w) {
    let cx = x;
    for (const p of parts) { if (!p) continue; ctx.font = `900 25px ${F}`; const pw = ctx.measureText(p).width; if (cx + pw > 0 && cx < 1920) T(p, cx, 1061, 25, p[0] === '!' ? '#ffd23f' : '#fef9e5', 'left', { w: 900, sw: 4 }); cx += pw; }
  }
  ctx.restore();
}
function drawHazardIcon(id, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (id === 'fog') { for (let i = 0; i < 3; i++) { ell(-14 + i * 14, -4 + (i % 2) * 8, 18, 12); fs('#b9c3d6', 3); } }
  else if (id === 'ff') { for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 20, -16); ctx.lineTo(i * 20, 0); ctx.lineTo(-20 + i * 20, 16); ctx.closePath(); fs('#ff9a3c', 4); } }
  else if (id === 'blackout') { circ(0, 0, 20); fs('#b59a6a', 4); circ(9, -7, 16); fs('#0d0820'); }
  else if (id === 'drain') { drawCoin(0, -6, 15); ctx.strokeStyle = '#ff5070'; ctx.lineWidth = 5; line(0, 12, 0, 26); line(-7, 19, 0, 26); line(7, 19, 0, 26); }
  ctx.restore();
}
function drawVote(t) {
  const v = G.vote;
  if (!v) {
    if (G.hazard) {
      const H = DATA.hazards[G.hazard.id];
      panel(740, 100, 420, 60, H.color, 0.9); drawHazardIcon(G.hazard.id, 782, 130, 0.9);
      T(H.name + '  ' + Math.ceil(G.hazard.t) + 's', 816, 120, 26, H.color, 'left', { w: 900 }); T(H.desc, 816, 145, 17, '#fef9e5', 'left', { w: 700, stroke: false });
    }
    return;
  }
  const x = 640, y = 98, w = 640, h = 168, left = DATA.vote.duration - v.t;
  ctx.save(); ctx.shadowBlur = 24; ctx.shadowColor = '#e0b45c'; panel(x, y, w, h, '#e0b45c', 0.94); ctx.restore();
  T('CHAT VOTE!  type  !1  !2  !3', x + 22, y + 28, 30, '#fff', 'left', { w: 900, sw: 6 });
  T(Math.ceil(left) + 's', x + w - 22, y + 28, 30, left < 5 ? '#ff5070' : '#ffd23f', 'right', { w: 900, sw: 6 });
  rr(x + 20, y + 50, w - 40, 6, 3); fs('#5a3a2a'); rr(x + 20, y + 50, Math.max(4, (w - 40) * clamp(left / DATA.vote.duration, 0, 1)), 6, 3); fs('#e0b45c');
  const tot = v.counts.reduce((a, b) => a + b, 0), mx = Math.max(...v.counts);
  v.opts.forEach((id, i) => {
    const cx = x + 20 + i * 204, cy = y + 66, H = DATA.hazards[id], lead = mx > 0 && v.counts[i] === mx;
    rr(cx, cy, 192, 90, 12); fs(lead ? 'rgba(224,180,92,0.2)' : 'rgba(255,255,255,0.04)', 3, lead ? '#e0b45c' : '#6b4a32');
    T('!' + (i + 1), cx + 12, cy + 22, 28, '#ffd23f', 'left', { w: 900 });
    drawHazardIcon(id, cx + 160, cy + 24, 0.75);
    T(fit(H.name, 20, 176), cx + 12, cy + 52, 20, H.color, 'left', { w: 900 });
    const pct = tot ? v.counts[i] / tot : 0;
    rr(cx + 12, cy + 70, 124, 10, 4); fs('#2e1a16'); if (pct) { rr(cx + 12, cy + 70, Math.max(6, 124 * pct), 10, 4); fs(H.color); }
    T(v.counts[i] + '', cx + 180, cy + 74, 22, '#fff', 'right', { w: 900 });
  });
}
function drawBanners() {
  G.banners.forEach((b, i) => {
    const k = b.t / b.dur, a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1, sc = k < 0.12 ? 0.6 + 0.4 * ease(k / 0.12) : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(940, 400 + i * 130); ctx.scale(sc, sc);
    if (b.emote) { ctx.font = `700 76px ${F}`; const tw = ctx.measureText(b.title).width; drawEmoteImg(b.emote, -tw / 2 - 130, -62, 116, Math.sin(b.t * 6) * 0.08); }
    ctx.shadowBlur = 30; ctx.shadowColor = b.color; T(b.title, 0, 0, 76, b.color, 'center', { w: 700, sw: 12 }); ctx.shadowBlur = 0;
    if (b.sub) T(b.sub, 0, 54, 28, '#fff', 'center', { w: 800, sw: 6 });
    ctx.restore();
  });
}
function drawCard() {
  const c = G.card; if (!c) return; const P = DATA.pal;
  const k = c.t / c.dur, slide = k < 0.1 ? 1 - ease(k / 0.1) : 0, out = k > 0.88 ? ease((k - 0.88) / 0.12) : 0;
  const w = 700, h = 210, x = 940 - w / 2, y = 650 + slide * 500;
  ctx.save(); ctx.globalAlpha = 1 - out;
  creamPanel(x, y, w, h, 'rgba(224,180,92,0.8)');
  drawEmoteImg('crowwW', x + 30, y + 42, 128, Math.sin(G.time * 5) * 0.06);
  const cx = x + 180 + (w - 200) / 2;
  T('TOP CHATTER  \u2022  WAVE ' + c.wave, cx, y + 42, 30, P.olive, 'center', { w: 700, stroke: false });
  ctx.fillStyle = P.olive; ctx.fillRect(cx - 200, y + 66, 400, 3);
  if (c.top) {
    const u = c.top.u, s = c.top.s;
    T(fit(u, 58, w - 230, 700), cx, y + 112, 58, P.maroon, 'center', { w: 700, stroke: false });
    T(s.dmg + ' CHILL DAMAGE  \u2022  ' + s.spawns + ' SPAWN' + (s.spawns === 1 ? '' : 'S') + '  \u2022  GG, RESPECT', cx, y + 170, 24, P.tan, 'center', { w: 600, stroke: false });
  } else { T('CHAT WAS QUIET...', cx, y + 110, 46, P.maroon, 'center', { w: 700, stroke: false }); T('type !bug to attack Croww next wave', cx, y + 166, 26, P.tan, 'center', { w: 500, stroke: false }); }
  ctx.restore();
}
/* Build / upgrade ring. Options fan out on an arc around the socket; the arc is rotated (and flipped below the
   socket if needed) so every option stays fully inside the play area, and the tooltip is then placed where it
   covers neither the options nor the socket. All in 1920x1080 game coords, so it is identical at any window size. */
const MENU = { R: 112, r: 44, step: 40, tipW: 460, tipH: 94, play: { x0: 385, y0: 105, x1: 1495, y1: 1030 }, pad: 7 };
function menuFits(b) { const P = MENU.play, R = b.r + 5 + MENU.pad; return b.x - R >= P.x0 && b.x + R <= P.x1 && b.y - R >= P.y0 && b.y + b.r + 12 + MENU.pad <= P.y1; }
function menuArc(px, py, items) {
  const n = items.length, span = (n - 1) * MENU.step, R = MENU.R;
  const place = c => items.map((it, i) => { const a = (c - span / 2 + i * MENU.step) * Math.PI / 180; return Object.assign({ x: px + Math.cos(a) * R, y: py + Math.sin(a) * R, r: MENU.r }, it); });
  // preferred: fanned upward (-90deg). Try the smallest rotation that fits, then the downward fan, then any angle.
  const cands = [-90]; for (let d = 10; d <= 180; d += 10) cands.push(-90 + d, -90 - d);
  for (const c of cands) { const b = place(c); if (b.every(menuFits)) return b; }
  // last resort: clamp each option inside the play area (never happens with the current map, kept for safety)
  const P = MENU.play, m = MENU.r + 5 + MENU.pad;
  return place(-90).map(b => Object.assign(b, { x: clamp(b.x, P.x0 + m, P.x1 - m), y: clamp(b.y, P.y0 + m, P.y1 - m - 12) }));
}
let menuCache = null;
function menuButtons() {
  if (view.sel < 0 || !G || G.phase === 'defeat' || G.phase === 'results') return [];
  const [px, py] = DATA.pads[view.sel], tw = G.towers[view.sel];
  const key = view.sel + ':' + (tw ? 'up' : 'build');
  if (menuCache && menuCache.key === key) return menuCache.btns;
  const items = tw ? [{ kind: 'up' }, { kind: 'sell' }] : Object.keys(DATA.towers).map(k => ({ kind: 'build', type: k }));
  const btns = menuArc(px, py, items);
  menuCache = { key, btns };
  return btns;
}
function menuTooltipRect(btns) {
  const [px, py] = DATA.pads[view.sel], P = MENU.play, w = MENU.tipW, h = MENU.tipH, g = 10;
  let x0 = px - 50, y0 = py - 50, x1 = px + 50, y1 = py + 50;          // socket + all options bounding box
  for (const b of btns) { x0 = Math.min(x0, b.x - b.r - 5); x1 = Math.max(x1, b.x + b.r + 5); y0 = Math.min(y0, b.y - b.r - 5); y1 = Math.max(y1, b.y + b.r + 14); }
  const cx = clamp(px - w / 2, P.x0 + 6, P.x1 - 6 - w), cy = clamp(py - h / 2, P.y0 + 6, P.y1 - 6 - h);
  const cands = [{ x: cx, y: y0 - g - h }, { x: cx, y: y1 + g }, { x: x1 + g, y: cy }, { x: x0 - g - w, y: cy }];
  const inside = r => r.x >= P.x0 + 4 && r.x + r.w <= P.x1 - 4 && r.y >= P.y0 + 4 && r.y + r.h <= P.y1 - 4;
  for (const c of cands) { const r = { x: c.x, y: c.y, w, h }; if (inside(r)) return r; }
  return { x: cx, y: clamp(y0 - g - h, P.y0 + 4, P.y1 - 4 - h), w, h };
}
function statLine(type, lvl) {
  const S = tStats({ type, level: lvl });
  if (type === 'hammer') return 'dmg ' + Math.round(S.dmg) + '  splash ' + Math.round(S.splash) + '  every ' + S.rate.toFixed(2) + 's';
  if (type === 'laser') return 'dps ' + Math.round(S.dps) + '  range ' + Math.round(S.baseRange);
  if (type === 'slow') return 'slow ' + Math.round(S.slow * 100) + '%  range ' + Math.round(S.baseRange);
  return 'dmg ' + Math.round(S.dmg) + '  AoE ' + Math.round(S.splash) + '  every ' + S.rate.toFixed(2) + 's';
}
function creamPanel(x, y, w, h, glow) {
  const P = DATA.pal;
  ctx.save(); if (glow) { ctx.shadowBlur = 40; ctx.shadowColor = glow; }
  rr(x, y, w, h, 20); fs(P.cream); ctx.restore();
  rr(x, y, w, h, 20); ctx.lineWidth = 6; ctx.strokeStyle = P.maroon; ctx.stroke();
  rr(x + 10, y + 10, w - 20, h - 20, 14); ctx.lineWidth = 2; ctx.strokeStyle = P.olive; ctx.stroke();
}
function drawMenu(t) {
  const btns = menuButtons(); if (!btns.length) return;
  const [px, py] = DATA.pads[view.sel], tw = G.towers[view.sel];
  let tip = null;
  for (const b of btns) {
    const hov = view.hoverBtn === b.kind + (b.type || '');
    let label = '', can = true, col = '#7fb069';
    if (b.kind === 'build') { const D = DATA.towers[b.type]; can = G.gold >= D.cost; col = D.color; label = D.cost + 'g'; }
    else if (b.kind === 'up') { const c = upCost(tw); can = c > 0 && G.gold >= c; label = c ? c + 'g' : 'MAX'; col = '#8fca6a'; }
    else { label = '+' + Math.round(tw.spent * DATA.economy.sellRefund); col = '#ffd23f'; }
    ctx.save();
    const R = b.r + (hov ? 5 : 0);
    circ(b.x, b.y, R); fs(can ? '#3a1a17' : '#1e1210', 5); ctx.lineWidth = 4; ctx.strokeStyle = can ? col : '#5a4a3a'; circ(b.x, b.y, R - 5); ctx.stroke();
    if (!can) ctx.globalAlpha = 0.45;
    if (b.kind === 'build') drawTowerIcon(b.type, b.x, b.y - 4, 0.72, t, -Math.PI / 4, 0, 0, 0);
    else if (b.kind === 'up') { ctx.beginPath(); ctx.moveTo(b.x, b.y - 26); ctx.lineTo(b.x + 20, b.y - 2); ctx.lineTo(b.x + 8, b.y - 2); ctx.lineTo(b.x + 8, b.y + 14); ctx.lineTo(b.x - 8, b.y + 14); ctx.lineTo(b.x - 8, b.y - 2); ctx.lineTo(b.x - 20, b.y - 2); ctx.closePath(); fs('#8fca6a', 4); }
    else drawCoin(b.x, b.y - 6, 18);
    ctx.globalAlpha = 1;
    T(label, b.x, b.y + b.r - 2, 22, can ? '#ffd23f' : '#a08080', 'center', { w: 900, sw: 5 });
    if (b.kind === 'build') { circ(b.x - b.r + 8, b.y - b.r + 8, 13); fs('#7fb069', 3); T(DATA.towers[b.type].key, b.x - b.r + 8, b.y - b.r + 9, 17, O, 'center', { w: 900, stroke: false }); }
    ctx.restore();
    if (hov) tip = b;
  }
  let title = '', l1 = '', l2 = '';
  if (tip && tip.kind === 'build') { const D = DATA.towers[tip.type]; title = D.name + '  -  ' + D.cost + 'g'; l1 = D.desc; l2 = statLine(tip.type, 1); }
  else if (tw) { const D = DATA.towers[tw.type]; title = D.name + '  LV ' + tw.level; l1 = statLine(tw.type, tw.level); l2 = tw.level < DATA.upgrade.maxLevel ? 'Upgrade (U) ' + upCost(tw) + 'g \u2192 ' + statLine(tw.type, tw.level + 1) : 'MAX LEVEL  \u2022  X to sell'; if (tip && tip.kind === 'sell') l2 = 'Sell (X) for ' + Math.round(tw.spent * DATA.economy.sellRefund) + 'g'; }
  else { title = 'BUILD A TOWER'; l1 = 'Hover for info  \u2022  keys 1-4 to build'; l2 = 'Gold: kills + a steady trickle'; }
  const TR = menuTooltipRect(btns), bw = TR.w, bx = TR.x, by = TR.y;
  panel(bx, by, bw, TR.h, '#7fb069', 0.95);
  T(title, bx + 16, by + 22, 24, '#fff', 'left', { w: 900 });
  T(fit(l1, 18, bw - 30, 700), bx + 16, by + 51, 18, '#e9dfc4', 'left', { w: 700, stroke: false });
  T(fit(l2, 18, bw - 30, 700), bx + 16, by + 75, 18, '#8fca6a', 'left', { w: 700, stroke: false });
}
function drawResults() {
  const P = DATA.pal, k = ease(Math.min(1, (G.time - G.resultsAt) / 0.5));
  ctx.fillStyle = `rgba(12,6,5,${0.72 * k})`; ctx.fillRect(0, 0, 1920, 1080);
  const w = 940, h = 780, x = 960 - w / 2, y = 140 + (1 - k) * 80;
  ctx.save(); ctx.globalAlpha = k; creamPanel(x, y, w, h, 'rgba(224,180,92,0.6)');
  drawEmoteImg('crowwL', x + 40, y + 30, 150, Math.sin(G.time * 3) * 0.05);
  T('CHILL METER DEPLETED', x + 210, y + 78, 64, P.maroon, 'left', { w: 700, stroke: false });
  T('Croww fell out of his chair.', x + 212, y + 136, 30, P.olive, 'left', { w: 500, stroke: false });
  ctx.fillStyle = P.olive; ctx.fillRect(x + 60, y + 196, w - 120, 3);
  T('WAVE REACHED  ' + G.wave, 740, y + 240, 42, P.maroon, 'center', { w: 700, stroke: false });
  T('SCORE  ' + G.score, 1200, y + 240, 42, P.tan, 'center', { w: 700, stroke: false });
  const nb = G.score > G.bestAtStart;
  T((nb ? 'NEW BEST!  ' : 'BEST: ') + Math.max(bestScore(), G.score) + ' WAVES SURVIVED', 960, y + 288, 24, nb ? P.forest : P.olive, 'center', { w: 600, stroke: false });
  T('TOP ATTACKERS', 960, y + 344, 36, P.maroon, 'center', { w: 700, stroke: false });
  const top = Object.entries(G.session).sort((a, b) => b[1].dmg - a[1].dmg || b[1].spawns - a[1].spawns).slice(0, 5);
  if (!top.length) T('no chatters this session', 960, y + 420, 26, P.olive, 'center', { stroke: false });
  top.forEach(([u, s], i) => {
    const yy = y + 396 + i * 48;
    if (i === 0) { ctx.save(); ctx.translate(x + 150, yy); ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(-20, -12); ctx.lineTo(-8, -2); ctx.lineTo(0, -16); ctx.lineTo(8, -2); ctx.lineTo(20, -12); ctx.lineTo(18, 10); ctx.closePath(); fs('#d9a441', 3, P.maroon); ctx.restore(); }
    T((i + 1) + '.', x + 190, yy, 32, P.olive, 'left', { w: 700, stroke: false });
    T(fit(u, 32, 380, 700), x + 240, yy, 32, userColor(u, true), 'left', { w: 700, stroke: false });
    T(s.dmg + ' DMG  \u2022  ' + s.spawns + ' SPAWNS', x + w - 60, yy, 24, P.tan, 'right', { w: 600, stroke: false });
  });
  const bw = 380, bh = 78, bx = 960 - bw / 2, by = y + h - 118, hov = view.mx > bx && view.mx < bx + bw && view.my > by && view.my < by + bh;
  G.resultsBtn = { x: bx, y: by, w: bw, h: bh };
  rr(bx, by, bw, bh, 18); fs(hov ? P.forest : P.maroon, 5, P.maroon);
  T('PLAY AGAIN', 960, by + bh / 2 + 2, 42, P.cream, 'center', { w: 700, stroke: false });
  T('or press Enter', 960, by + bh + 20, 18, P.olive, 'center', { stroke: false });
  ctx.restore();
}
function drawBlackout() {
  if (!G.hazard || G.hazard.id !== 'blackout') return;
  if (!drawBlackout.c) { drawBlackout.c = document.createElement('canvas'); drawBlackout.c.width = 1920; drawBlackout.c.height = 1080; }
  const c = drawBlackout.c.getContext('2d'); c.clearRect(0, 0, 1920, 1080);
  const fade = clamp(Math.min((DATA.vote.hazardDuration - G.hazard.t) / 0.6, G.hazard.t / 0.6), 0, 1);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(4,2,2,${DATA.hazards.blackout.dark * fade})`; c.fillRect(370, 90, 1550, 950);
  c.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = c.createRadialGradient(x, y, r * 0.7, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); };
  for (const tw of G.towers) if (tw) hole(tw.x, tw.y, tStats(tw).range);
  hole(1700, 620, 260); hole(1710, 230, 190);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(drawBlackout.c, 0, 0);
}
function drawFog(t) {
  if (!G.hazard || G.hazard.id !== 'fog') return;
  const fade = clamp(Math.min((DATA.vote.hazardDuration - G.hazard.t) / 0.8, G.hazard.t / 0.8), 0, 1);
  ctx.save(); ctx.globalAlpha = 0.16 * fade;
  for (let i = 0; i < 14; i++) { const x = 380 + ((i * 173 + t * 25 * (1 + i % 3)) % 1250), y = 150 + (i * 97) % 850; ell(x, y, 190, 90); fs('#c8d0e6'); }
  ctx.restore();
}
function drawFF(t) {
  if (!G.hazard || G.hazard.id !== 'ff') return;
  ctx.save(); ctx.globalAlpha = 0.14; ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 3;
  for (let i = 0; i < 20; i++) { const y = 120 + (i * 53) % 900, x = 380 + ((i * 211 + t * 900) % 1150); line(x, y, x + 90, y); }
  ctx.restore();
}
function drawDrain(t) {
  if (!G.hazard || G.hazard.id !== 'drain') return;
  for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - k; drawCoin(1222 + Math.sin(i * 7) * 10, 70 + k * 60, 10); ctx.restore(); }
}
function drawPortal(t) {
  const [x, y] = DATA.path[0];
  ctx.save(); ctx.translate(x + 18, y);
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(t * (1 + i * 0.5) * (i % 2 ? -1 : 1)); ctx.setLineDash([20, 14]); ctx.lineWidth = 5; ctx.strokeStyle = ['#e0b45c', '#7fb069', '#b59a6a'][i]; ell(0, 0, 30 + i * 10, 44 + i * 10); ctx.stroke(); ctx.restore(); }
  ctx.restore();
  T('CHAT', x + 18, y - 82, 22, '#e0b45c', 'center', { w: 900 });
}

/* ===================================================================== render */
function render(t) {
  if (!G) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(bg, 0, 0);
  const sh = G.shake; ctx.save(); if (sh > 0.3) ctx.translate(rand(-sh, sh), rand(-sh, sh));
  drawPortal(t);
  const ri = view.sel >= 0 ? view.sel : view.hoverPad;
  if (ri >= 0 && G.phase !== 'results') {
    const tw = G.towers[ri]; let r = 0, col = '#7fb069';
    if (tw) { r = tStats(tw).range; col = DATA.towers[tw.type].color; }
    else if (view.hoverBtn && view.hoverBtn.startsWith('build')) { const ty = view.hoverBtn.slice(5); r = DATA.towers[ty].range * (G.hazard && G.hazard.id === 'fog' ? DATA.hazards.fog.range : 1); col = DATA.towers[ty].color; }
    if (r) { const [x, y] = DATA.pads[ri]; ctx.save(); circ(x, y, r); ctx.globalAlpha = 0.12; fs(col); ctx.globalAlpha = 0.8; ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); ctx.restore(); }
  }
  drawPadsTowers(t);
  drawEnemies(t);
  drawCrowBoss(t);
  for (const p of G.projs) { const k = clamp(p.t, 0, 1), gx = lerp(p.x0, p.x1, k), gy = lerp(p.y0, p.y1, k); ell(gx, gy, 14, 5); fs('rgba(0,0,0,0.3)'); drawEmote(gx, gy - Math.sin(k * Math.PI) * p.h, 17, p.face, k * 8); }
  for (const r of G.rings) { const k = r.t / r.dur; ctx.save(); circ(r.x, r.y, lerp(r.r, r.r2, ease(k))); ctx.globalAlpha = 1 - k; ctx.lineWidth = r.w * (1 - k) + 1; ctx.strokeStyle = r.c; ctx.stroke(); ctx.restore(); }
  for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.dur; ctx.fillStyle = p.c; const s = p.size * (1 - p.t / p.dur * 0.5); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); } ctx.globalAlpha = 1;
  drawFog(t); drawFF(t);
  drawNeon(t);
  drawChillMeter(t);
  drawDesk(t);
  drawBlackout();
  for (const tx of G.texts) { const k = tx.t / tx.dur, sc = tx.pop ? (k < 0.15 ? 0.5 + ease(k / 0.15) * 0.7 : 1.2 - Math.min(0.2, k - 0.15)) : 1; ctx.save(); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; ctx.translate(tx.x, tx.y); ctx.scale(sc, sc); T(tx.s, 0, 0, tx.size, tx.c, 'center', { w: 900, sw: Math.max(4, tx.size * 0.18) }); ctx.restore(); }
  for (const p of G.pops) { const k = p.t / p.dur, s = k < 0.15 ? ease(k / 0.15) * 1.2 : 1.2 - (k - 0.15) * 0.3; drawEmoteImg(p.name, p.x - 60 * s, p.y - 60 * s - k * 90, 120 * s, p.rot + Math.sin(p.t * 12) * 0.1, k > 0.7 ? (1 - k) / 0.3 : 1); }
  ctx.restore();
  if (G.redFlash > 0) { const g = ctx.createRadialGradient(960, 540, 400, 960, 540, 1100); g.addColorStop(0, 'rgba(255,40,70,0)'); g.addColorStop(1, `rgba(255,40,70,${G.redFlash * 0.45})`); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); }
  drawVote(t);
  drawBanners();
  drawCard();
  drawSidebar(t);
  drawTopBar(t);
  drawDrain(t);
  drawTicker(t);
  drawMenu(t);   // last of the in-game layers: the build ring is never hidden under side panels / banners
  if (G.phase === 'results') drawResults();
  drawTitle(t);
  if (G.paused) { drawPaused(performance.now() / 1000); drawTopBar(t); }   // top bar stays visible so the pause button can be clicked
}

/* ===================================================================== input */
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1920 / r.width, y: (e.clientY - r.top) * 1080 / r.height }; }
function hitTest(x, y) {
  view.hoverBtn = null;
  for (const b of menuButtons()) if (dist(x, y, b.x, b.y) <= b.r + 4) { view.hoverBtn = b.kind + (b.type || ''); return { btn: b }; }
  for (let i = 0; i < DATA.pads.length; i++) { const [px, py] = DATA.pads[i]; if (dist(x, y, px, py) < 50) return { pad: i }; }
  return {};
}
function inRect(p, b) { return b && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h; }
cv.addEventListener('mousemove', e => {
  const p = toGame(e); view.mx = p.x; view.my = p.y; if (!G) return;
  const h = hitTest(p.x, p.y); view.hoverPad = h.pad != null ? h.pad : -1;
  const icon = dist(p.x, p.y, 1884, 46) < 30 || dist(p.x, p.y, 1826, 46) < 26 || dist(p.x, p.y, 1762, 46) < 26;
  cv.style.cursor = (h.btn || h.pad != null || icon || (G.phase === 'results' && inRect(p, G.resultsBtn))) ? 'pointer' : 'default';
});
cv.addEventListener('mousedown', e => {
  SFX.init(); const p = toGame(e); if (!G) return;
  if (view.titleT > 0) { view.titleT = Math.min(view.titleT, 0.8); return; }
  if (dist(p.x, p.y, 1884, 46) < 30) { toggleSettings(); return; }
  if (dist(p.x, p.y, 1762, 46) < 26) { setPaused(!G.paused); return; }
  if (dist(p.x, p.y, 1826, 46) < 26) { settings.muted = !settings.muted; SFX.apply(); saveSettings(); syncSettingsUI(); return; }
  if (G.phase === 'results') { if (inRect(p, G.resultsBtn)) { newGame(); SFX.play('click'); } return; }
  if (G.phase === 'defeat' || G.paused) return;
  if (inRect(p, G.crowBossBtn)) { deployCrowBoss(); return; }
  if (e.button === 2) { view.sel = -1; return; }
  const h = hitTest(p.x, p.y);
  if (h.btn) {
    const b = h.btn;
    if (b.kind === 'build') { if (build(view.sel, b.type)) view.sel = -1; }
    else if (b.kind === 'up') upgrade(view.sel);
    else if (b.kind === 'sell') sell(view.sel);
    hitTest(p.x, p.y); return;
  }
  if (h.pad != null) { view.sel = view.sel === h.pad ? -1 : h.pad; SFX.play('click'); return; }
  view.sel = -1;
});
cv.addEventListener('contextmenu', e => e.preventDefault());
function toggleSettings(force) {
  view.settingsOpen = force != null ? force : !view.settingsOpen;
  $('settings').classList.toggle('hidden', !view.settingsOpen);
  if (view.settingsOpen) syncSettingsUI();
}
window.addEventListener('keydown', e => {
  SFX.init();
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (e.key === 'Escape') document.activeElement.blur(); return; }
  const k = e.key.toLowerCase();
  if (view.titleT > 0.8) view.titleT = 0.8;
  if (k === 's') { toggleSettings(); return; }
  if (k === 'm') { settings.muted = !settings.muted; SFX.apply(); saveSettings(); syncSettingsUI(); return; }
  if (!G) return;
  if (G.phase === 'results') { if (k === 'enter' || k === ' ') { newGame(); e.preventDefault(); } return; }
  if (k === 'escape' && view.settingsOpen) { toggleSettings(false); return; }
  if (k === 'escape' && view.sel >= 0 && !G.paused) { view.sel = -1; return; }
  if (k === 'p' || k === 'escape') { setPaused(!G.paused); return; }
  if (G.paused) return;
  if (k === ' ') { e.preventDefault(); startWave(); return; }
  if (k === 'b') { deployCrowBoss(); return; }
  if (view.sel >= 0 && G.phase !== 'defeat') {
    const tw = G.towers[view.sel], idx = ['1', '2', '3', '4'].indexOf(k);
    if (!tw && idx >= 0) { if (build(view.sel, Object.keys(DATA.towers)[idx])) view.sel = -1; }
    if (tw && k === 'u') upgrade(view.sel);
    if (tw && k === 'x') sell(view.sel);
  }
});

/* ===================================================================== settings UI */
function $(id) { return document.getElementById(id); }
function updateStatusUI() {
  const el = $('sStatus'); if (!el) return;
  const col = { live: '#3dff7a', connecting: '#ffd23f', error: '#ff6070', off: '#bfae86' }[Kick.status];
  el.innerHTML = `<span style="color:${col}">\u25CF ${Kick.status.toUpperCase()}</span>&nbsp; <span class="hint">${String(Kick.detail).replace(/</g, '&lt;')}</span>`;
}
function syncSettingsUI() {
  $('sChannel').value = settings.channel; $('sRoom').value = settings.rooms[settings.channel] || '';
  $('sTest').value = settings.testMode; $('sSmall').value = settings.smallChat; $('sNpc').checked = settings.npcWaves; $('sBotRate').value = settings.botRate; $('vBotRate').textContent = settings.botRate + ' msgs/min';
  $('sClean').checked = settings.clean; $('sDiff').value = settings.difficulty; $('sCd').value = settings.userCooldown; $('sCap').value = settings.globalCap;
  $('bCrow').textContent = crowBossUnlocked() ? 'Crow Boss: unlocked (B to deploy)' : 'Unlock Crow Boss now'; $('sVol').value = settings.volume; $('vVol').textContent = settings.volume + '%'; $('sMute').checked = settings.muted; updateStatusUI();
}
function readChannel() { const ch = $('sChannel').value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?kick\.com\//, '').replace(/[^a-z0-9_\-]/g, ''); if (ch && ch !== settings.channel) { settings.channel = ch; $('sRoom').value = settings.rooms[ch] || ''; } }
$('sChannel').addEventListener('change', () => { readChannel(); saveSettings(); });
$('sRoom').addEventListener('change', () => { const v = $('sRoom').value.trim().replace(/\D/g, ''); if (v) settings.rooms[settings.channel] = v; else delete settings.rooms[settings.channel]; saveSettings(); });
$('bConnect').onclick = () => { readChannel(); const v = $('sRoom').value.trim().replace(/\D/g, ''); if (v) settings.rooms[settings.channel] = v; settings.autoConnect = true; saveSettings(); Kick.connect(); };
$('bDisconnect').onclick = () => { settings.autoConnect = false; saveSettings(); Kick.disconnect(); };
$('bLookup').onclick = async () => { readChannel(); delete settings.rooms[settings.channel]; $('sRoom').value = ''; const id = await Kick.lookup(); if (id) Kick.connect(); };
$('sTest').onchange = () => { settings.testMode = normTestMode($('sTest').value, 'off'); if (!testModeActive()) stopBots(); clearTestParam(); saveSettings(); syncSettingsUI(); };
$('sSmall').onchange = () => { settings.smallChat = $('sSmall').value; saveSettings(); };
$('sNpc').onchange = () => { settings.npcWaves = $('sNpc').checked; saveSettings(); };
$('sBotRate').oninput = () => { settings.botRate = +$('sBotRate').value; $('vBotRate').textContent = settings.botRate + ' msgs/min'; saveSettings(); };
$('sClean').onchange = () => { settings.clean = $('sClean').checked; saveSettings(); };
$('sDiff').onchange = () => { settings.difficulty = $('sDiff').value; saveSettings(); };
$('sCd').onchange = () => { settings.userCooldown = clamp(+$('sCd').value || 0, 0, 600); saveSettings(); syncSettingsUI(); };
$('sCap').onchange = () => { settings.globalCap = clamp(+$('sCap').value || 1, 1, 300); saveSettings(); syncSettingsUI(); };
$('sVol').oninput = () => { settings.volume = +$('sVol').value; $('vVol').textContent = settings.volume + '%'; SFX.init(); SFX.apply(); saveSettings(); };
$('sMute').onchange = () => { settings.muted = $('sMute').checked; SFX.apply(); saveSettings(); };
$('bCrow').onclick = () => { if (!unlockCrowBoss('unlocked in Settings')) addFeed('CHAT CLASH', 'Crow Boss is already unlocked - press B', 'ok'); syncSettingsUI(); };
$('bRestart').onclick = () => { newGame(); toggleSettings(false); };
$('bClose').onclick = () => toggleSettings(false);
function sendFake() { const u = $('fUser').value.trim() || 'Croww', m = $('fMsg').value.trim(); if (!m) return; onChat(u, m, 'manual'); $('fMsg').value = ''; }
$('bSend').onclick = sendFake; $('fMsg').addEventListener('keydown', e => { if (e.key === 'Enter') sendFake(); });

/* ===================================================================== scale + loop */
function resize() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); $('stage').style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`; }
window.addEventListener('resize', resize); resize();
renderBG(); newGame(); syncSettingsUI();
if (document.fonts) { document.fonts.load('700 40px Oswald'); document.fonts.load('400 20px Oswald'); }
if (settings.autoConnect) Kick.connect(); else Kick.set('off', 'auto-connect off - press Connect');
let last = performance.now(), manual = false, animT = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;   // clamped: resuming (or a hidden tab) never jumps
  if (view.titleT > 0) view.titleT -= dt;
  const paused = G && G.paused;
  if (!manual && G && !paused) update(dt);
  if (!paused) animT += dt;                    // gameplay animations freeze with the game
  render(animT);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
/* console / test hooks */
window.CC = {
  get G() { return G; }, DATA, settings, Kick, feed, onChat, testModeActive, stopBots, build, upgrade, startWave, newGame, toggleSettings,
  spawn(t, u) { spawnEnemy(t, u || 'tester', false); },
  step(sec, dt) { dt = dt || 1 / 30; const n = Math.round(sec / dt); for (let i = 0; i < n; i++) update(dt); },
  manual(v) { manual = v; if (v) view.titleT = 0; }, deployCrowBoss, unlockCrowBoss, crowBossState, view, render(t) { render(t != null ? t : animT); }, setPaused, heldChat, activeChatters, goldPerSec, smallChatK, effCooldown, hypeGainMult, spamCount, forceVote() { G.voteClock = 0; }
};
