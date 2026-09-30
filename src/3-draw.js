/* ===================================================================== background prerender */
const bg = document.createElement('canvas'); bg.width = 1920; bg.height = 1080;
function renderBG() {
  const c = bg.getContext('2d');
  let g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#221714'); g.addColorStop(1, '#110b09'); c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
  c.save(); c.beginPath(); c.roundRect(385, 105, 1110, 925, 30); c.fillStyle = '#1f1e16'; c.fill(); c.clip();
  c.strokeStyle = 'rgba(150,120,70,0.08)'; c.lineWidth = 2;
  for (let i = -1200; i < 1200; i += 60) { c.beginPath(); c.moveTo(385 + i, 105); c.lineTo(385 + i + 925, 1030); c.stroke(); c.beginPath(); c.moveTo(385 + i + 925, 105); c.lineTo(385 + i, 1030); c.stroke(); }
  g = c.createRadialGradient(940, 560, 100, 940, 560, 800); g.addColorStop(0, 'rgba(96,98,72,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = g; c.fillRect(385, 105, 1110, 925);
  c.restore();
  c.beginPath(); c.roundRect(385, 105, 1110, 925, 30); c.lineWidth = 4; c.strokeStyle = '#4a3a2a'; c.stroke();
  g = c.createLinearGradient(1500, 0, 1920, 0); g.addColorStop(0, '#1f1512'); g.addColorStop(1, '#2a1c17'); c.fillStyle = g; c.fillRect(1500, 90, 420, 950);
  for (let x = 1520; x < 1920; x += 44) { c.fillStyle = 'rgba(255,255,255,0.025)'; c.fillRect(x, 90, 18, 910); }
  c.fillStyle = '#140d0b'; c.fillRect(1500, 1000, 420, 40);
  c.fillStyle = '#7fb069'; c.globalAlpha = 0.5; c.fillRect(1500, 998, 420, 3); c.globalAlpha = 1;
  c.strokeStyle = '#2b0e0e'; c.lineWidth = 2; c.beginPath(); for (let x = 1510; x <= 1910; x += 5) { const y = 255 + Math.sin((x - 1510) / 400 * Math.PI) * 18; x === 1510 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  const P = DATA.path; c.lineJoin = 'round'; c.lineCap = 'round';
  const stroke = (w, col, blur, dash) => { c.save(); c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x - 20, y)); c.lineWidth = w; c.strokeStyle = col; if (blur) { c.shadowBlur = blur; c.shadowColor = col; } if (dash) c.setLineDash(dash); c.stroke(); c.restore(); };
  stroke(100, 'rgba(217,164,65,0.10)', 30); stroke(84, '#120a08'); stroke(72, '#3a2622'); stroke(60, '#44302a');
  stroke(4, 'rgba(230,200,140,0.35)', 0, [18, 24]);
  for (const [x, y] of DATA.pads) {
    const hex = (s) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + Math.PI / 6; c.lineTo(x + Math.cos(a) * 50 * s, y + Math.sin(a) * 44 * s); } c.closePath(); };
    hex(1); c.fillStyle = '#120a08'; c.fill(); hex(0.86);
    const pg = c.createLinearGradient(0, y - 44, 0, y + 44); pg.addColorStop(0, '#5a5c44'); pg.addColorStop(1, '#34352a'); c.fillStyle = pg; c.fill();
  }
}

/* ===================================================================== drawing: enemies */
function drawEmote(x, y, r, kind, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  circ(0, 0, r); fs('#ffd23f', r * 0.18);
  ctx.strokeStyle = O; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.fillStyle = O;
  if (kind === 0) { circ(-r * 0.35, -r * 0.2, r * 0.13); ctx.fill(); circ(r * 0.35, -r * 0.2, r * 0.13); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (kind === 1) { ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.15, r * 0.18, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.15, r * 0.18, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.42, 0, Math.PI); ctx.closePath(); fs('#7a1030'); ctx.fillStyle = '#6fd3ff'; ell(-r * 0.7, r * 0.1, r * 0.12, r * 0.22); ctx.fill(); ell(r * 0.7, r * 0.1, r * 0.12, r * 0.22); ctx.fill(); }
  else if (kind === 2) { rr(-r * 0.75, -r * 0.4, r * 1.5, r * 0.4, r * 0.15); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.35, 0.3, Math.PI - 0.3); ctx.stroke(); }
  else { circ(-r * 0.33, -r * 0.25, r * 0.16); ctx.fill(); circ(r * 0.33, -r * 0.25, r * 0.16); ctx.fill(); ell(0, r * 0.35, r * 0.2, r * 0.26); ctx.fill(); }
  ctx.restore();
}
function drawEnemyShape(type, x, y, r, t, ang, flash, slowed) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = O;
  if (slowed) { ell(0, r * 0.8, r * 1.3, r * 0.5); fs('rgba(90,184,255,0.5)'); }
  if (type === 'bug') {
    ctx.rotate(ang); ctx.lineWidth = r * 0.2;
    for (let i = -1; i <= 1; i++) { const w = Math.sin(t * 24 + i * 2) * r * 0.3; line(i * r * 0.45, 0, i * r * 0.45 + w, -r * 1.15); line(i * r * 0.45, 0, i * r * 0.45 - w, r * 1.15); }
    ell(-r * 0.1, 0, r * 1.05, r * 0.82); fs('#9be34a', r * 0.2);
    ctx.lineWidth = r * 0.1; line(-r * 1.0, 0, r * 0.4, 0);
    ctx.fillStyle = '#4f8a1f'; circ(-r * 0.5, -r * 0.4, r * 0.16); ctx.fill(); circ(-r * 0.4, r * 0.38, r * 0.14); ctx.fill();
    ctx.lineWidth = r * 0.12; line(r * 1.1, -r * 0.2, r * 1.6, -r * 0.6); line(r * 1.1, r * 0.2, r * 1.6, r * 0.6);
    circ(r * 0.9, 0, r * 0.5); fs('#2e4f14', r * 0.18);
    circ(r * 1.05, -r * 0.22, r * 0.2); fs('#fff'); circ(r * 1.05, r * 0.22, r * 0.2); fs('#fff');
    circ(r * 1.12, -r * 0.22, r * 0.09); fs(O); circ(r * 1.12, r * 0.22, r * 0.09); fs(O);
  } else if (type === 'troll') {
    const bob = Math.sin(t * 7) * 2.5; ctx.rotate(Math.sin(t * 7) * 0.07); ctx.translate(0, bob);
    const lw = Math.max(2, r * 0.16);
    ctx.lineWidth = lw; line(r * 0.7, 0, r * 1.05, -r * 1.3); rr(r * 0.6, -r * 1.85, r * 0.95, r * 0.7, r * 0.15); fs('#fff', lw * 0.8); T('L', r * 1.07, -r * 1.5, r * 0.6, '#e0304a', 'center', { stroke: false, w: 900 });
    ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.quadraticCurveTo(-r * 1.1, -r * 1.05, 0, -r * 1.05); ctx.quadraticCurveTo(r * 1.1, -r * 1.05, r * 0.95, -r * 0.1); ctx.quadraticCurveTo(r * 1.05, r * 0.95, 0, r); ctx.quadraticCurveTo(-r * 1.05, r * 0.95, -r * 0.9, -r * 0.2); ctx.closePath(); fs('#72b35e', lw);
    ell(0, r * 0.45, r * 0.55, r * 0.4); fs('#9ad07e');
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.3 - r * 0.23, -r * 0.95); ctx.lineTo(i * r * 0.35, -r * 1.45 - (i === 0 ? r * 0.25 : 0)); ctx.lineTo(i * r * 0.3 + r * 0.23, -r * 0.95); ctx.closePath(); fs('#ff8a2a', lw * 0.6); }
    circ(-r * 0.32, -r * 0.35, r * 0.17); fs('#fff', lw * 0.6); circ(r * 0.32, -r * 0.35, r * 0.17); fs('#fff', lw * 0.6);
    circ(-r * 0.28, -r * 0.32, r * 0.08); fs(O); circ(r * 0.28, -r * 0.32, r * 0.08); fs(O);
    ctx.lineWidth = lw * 0.8; line(-r * 0.55, -r * 0.62, -r * 0.12, -r * 0.48); line(r * 0.55, -r * 0.62, r * 0.12, -r * 0.48);
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.05); ctx.quadraticCurveTo(0, r * 0.55, r * 0.6, -r * 0.05); ctx.closePath(); fs('#5a0d1f', lw * 0.8);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.42 + i * r * 0.22, -r * 0.03, r * 0.16, r * 0.13);
  } else if (type === 'lag') {
    ctx.translate(0, Math.sin(t * 3) * 4);
    for (let i = 0; i < 8; i++) { const a = t * 5 + i / 8 * 6.283; circ(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, r * 0.16); ctx.fillStyle = `rgba(160,235,255,${0.2 + i / 8 * 0.8})`; ctx.fill(); }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); g.addColorStop(0, '#bff1ff'); g.addColorStop(1, '#1d9ad0');
    circ(0, 0, r); fs(g, Math.max(2, r * 0.2));
    ctx.lineWidth = Math.max(2, r * 0.17); line(-r * 0.5, -r * 0.1, -r * 0.15, -r * 0.1); line(r * 0.15, -r * 0.1, r * 0.5, -r * 0.1); line(-r * 0.25, r * 0.35, r * 0.25, r * 0.35);
  } else if (type === 'spam') {
    ctx.rotate(Math.sin(t * 9) * 0.2); const f = Math.sin(t * 30) * 0.6;
    ell(-r * 0.9, -r * 0.6, r * 0.8, r * 0.4, -0.6 + f); fs('#fff', 3); ell(r * 0.9, -r * 0.6, r * 0.8, r * 0.4, 0.6 - f); fs('#fff', 3);
    rr(-r, -r * 0.7, r * 2, r * 1.4, 3); fs('#ff7ac8', 3.5);
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-r, -r * 0.7); ctx.lineTo(0, r * 0.15); ctx.lineTo(r, -r * 0.7); ctx.stroke();
  } else if (type === 'boss') {
    const pul = 1 + Math.sin(t * 4) * 0.03; ctx.scale(pul, 1 / pul); const lw = Math.max(2, r * 0.11);
    const g0 = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.7); g0.addColorStop(0, 'rgba(255,40,70,0.4)'); g0.addColorStop(1, 'rgba(255,40,70,0)'); circ(0, 0, r * 1.7); fs(g0);
    ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, rr2 = r * (i % 2 ? 0.92 : 1.08); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 5, 0, 0, r); g.addColorStop(0, '#ff6a7e'); g.addColorStop(1, '#a3122c'); fs(g, lw);
    ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.8); ctx.lineTo(-r * 0.6, -r * 1.35); ctx.lineTo(-r * 0.25, -r * 1.05); ctx.lineTo(0, -r * 1.5); ctx.lineTo(r * 0.25, -r * 1.05); ctx.lineTo(r * 0.6, -r * 1.35); ctx.lineTo(r * 0.55, -r * 0.8); ctx.closePath(); fs('#ffd23f', lw * 0.8);
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#ffe95a';
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.35); ctx.lineTo(-r * 0.12, -r * 0.18); ctx.lineTo(-r * 0.5, -r * 0.05); ctx.closePath(); fs('#ffe95a');
    ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.35); ctx.lineTo(r * 0.12, -r * 0.18); ctx.lineTo(r * 0.5, -r * 0.05); ctx.closePath(); fs('#ffe95a'); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.25); for (let i = 0; i <= 8; i++) ctx.lineTo(-r * 0.55 + i * r * 0.1375, r * 0.25 + (i % 2 ? r * 0.2 : 0)); ctx.lineTo(r * 0.45, r * 0.55); ctx.lineTo(-r * 0.45, r * 0.55); ctx.closePath(); fs('#3a0510', lw * 0.7);
  }
  if (flash > 0) { ctx.globalAlpha = Math.min(1, flash * 6) * 0.7; circ(0, 0, r * 1.05); fs('#fff'); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawEnemies(t) {
  for (const e of G.enemies) if (e.type === 'lag' && e.d > -30) {
    const a = DATA.enemies.lag.aura; ctx.save(); circ(e.x, e.y, a * (0.96 + Math.sin(t * 4) * 0.04)); ctx.fillStyle = 'rgba(63,200,255,0.08)'; ctx.fill(); ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 30; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(120,220,255,0.5)'; ctx.stroke(); ctx.restore();
  }
  const list = G.enemies.filter(e => e.d > -40).sort((a, b) => a.y - b.y);
  for (const e of list) { ell(e.x, e.y + e.r * 0.85, e.r * 0.9, e.r * 0.3); fs('rgba(0,0,0,0.35)'); drawEnemyShape(e.type, e.x, e.y, e.r, t + e.wob, e.ang, e.flash, e.slowT > 0); }
  for (const e of list) {
    if (e.hp < e.maxHp) { const w = Math.max(34, e.r * 2), y = e.y - e.r - (e.type === 'troll' ? 44 : e.type === 'boss' ? 70 : 14); rr(e.x - w / 2 - 2, y - 2, w + 4, 10, 4); fs(O); rr(e.x - w / 2, y, Math.max(1, w * clamp(e.hp / e.maxHp, 0, 1)), 6, 3); fs(e.hp / e.maxHp > 0.5 ? '#8fca6a' : e.hp / e.maxHp > 0.25 ? '#ffd23f' : '#ff5070'); }
    if (e.lead) {
      const y = e.y - e.r - (e.type === 'troll' ? 62 : e.type === 'boss' ? 92 : 32);
      if (e.isBot) T('npc', e.x, y, 16, '#9c8a68', 'center', { sw: 4 });
      else { const sz = e.type === 'boss' ? 30 : 22, s = fit(e.user, sz, 220) + (e.n > 1 ? ' x' + e.n : ''); ctx.font = `700 ${sz}px ${F}`; const lx = Math.max(e.x, 382 + ctx.measureText(s).width / 2); T(s, lx, y, sz, userColor(e.user), 'center', { sw: 6, w: 700 }); }
    }
  }
}

/* ===================================================================== drawing: towers */
function drawTowerIcon(type, x, y, s, t, ang, anim, recoil, level) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = O;
  const col = DATA.towers[type].color;
  circ(0, 0, 36); fs('#2a1a16', 5); circ(0, 0, 30); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); ctx.strokeStyle = O;
  if (type === 'hammer') {
    ctx.rotate((ang || 0) + Math.PI / 2 + Math.sin(anim * Math.PI * 2) * 0.6 * anim); ctx.translate(0, -anim * 16);
    ctx.lineWidth = 14; line(0, 8, 0, -34); ctx.lineWidth = 8; ctx.strokeStyle = '#b87a3a'; line(0, 8, 0, -34);
    rr(-24, -58, 48, 28, 6); fs('#ffb03a', 5); rr(-30, -60, 12, 32, 4); fs('#d88a20', 4); rr(18, -60, 12, 32, 4); fs('#d88a20', 4);
    T('MOD', 0, -44, 12, O, 'center', { stroke: false, w: 900 });
  } else if (type === 'laser') {
    ctx.rotate(ang || 0); const k = -recoil * 4;
    rr(4 + k, -9, 38, 18, 5); fs('#3a1a40', 5); rr(36 + k, -12, 10, 24, 3); fs('#ff3b5c', 4);
    circ(0, 0, 20); fs('#2a1414', 5);
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = '#ff3b5c'; circ(0, 0, 10); fs('#ff5c78'); ctx.restore(); circ(-3, -3, 3.5); fs('#fff');
  } else if (type === 'slow') {
    ctx.rotate(Math.sin(t * 1.5) * 0.25);
    ctx.beginPath(); ctx.moveTo(-18, -26); ctx.lineTo(18, -26); ctx.lineTo(3, 0); ctx.lineTo(18, 26); ctx.lineTo(-18, 26); ctx.lineTo(-3, 0); ctx.closePath(); fs('rgba(170,220,255,0.9)', 5);
    const sand = (t * 0.3) % 1; ctx.fillStyle = '#5ab8ff';
    ctx.beginPath(); ctx.moveTo(-14 * (1 - sand), -24 + 22 * sand); ctx.lineTo(14 * (1 - sand), -24 + 22 * sand); ctx.lineTo(1, -2); ctx.lineTo(-1, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16 * sand, 24 - 20 * sand); ctx.lineTo(16 * sand, 24 - 20 * sand); ctx.lineTo(16, 24); ctx.lineTo(-16, 24); ctx.closePath(); ctx.fill();
    rr(-24, -32, 48, 9, 3); fs('#2a4a7a', 4); rr(-24, 23, 48, 9, 3); fs('#2a4a7a', 4);
  } else if (type === 'cannon') {
    ctx.rotate(ang || 0); const k = -recoil * 10;
    rr(0 + k, -14, 48, 28, 8); fs('#606248', 5); rr(40 + k, -17, 12, 34, 4); fs('#ffd23f', 4);
    ctx.rotate(-(ang || 0));
    drawEmote(0, 0, 21, 0, 0);
  }
  ctx.restore();
  if (level) for (let i = 0; i < level; i++) { const px = x - (level - 1) * 11 + i * 22; ctx.save(); ctx.translate(px, y + 44 * s); ctx.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * 6.283 - Math.PI / 2, rr2 = j % 2 ? 4 : 9; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); fs('#ffd23f', 3); ctx.restore(); }
}
function drawPadsTowers(t) {
  const minCost = Math.min(...Object.values(DATA.towers).map(v => v.cost));
  DATA.pads.forEach(([x, y], i) => {
    if (G.towers[i]) return;
    const hov = view.hoverPad === i || view.sel === i, canBuy = G.gold >= minCost, col = canBuy ? '#7fb069' : '#6e604a';
    ctx.save(); ctx.globalAlpha = hov ? 1 : 0.55 + Math.sin(t * 3 + i) * 0.2;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * 43, y + Math.sin(a) * 38); } ctx.closePath();
    ctx.lineWidth = hov ? 5 : 3; ctx.strokeStyle = col; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20; ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 6; line(x - 12, y, x + 12, y); line(x, y - 12, x, y + 12);
    ctx.restore();
  });
  for (let i = 0; i < G.towers.length; i++) {
    const tw = G.towers[i]; if (!tw) continue;
    if (tw.beam) {
      const e = tw.beam, sx = tw.x + Math.cos(tw.ang) * 44, sy = tw.y + Math.sin(tw.ang) * 44;
      ctx.save(); ctx.lineCap = 'round'; ctx.shadowBlur = 20; ctx.shadowColor = '#ff3b5c';
      ctx.strokeStyle = 'rgba(255,59,92,0.55)'; ctx.lineWidth = 12 + Math.sin(t * 60) * 3 + tw.level * 2; line(sx, sy, e.x, e.y);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; line(sx, sy, e.x, e.y); ctx.restore();
      circ(e.x, e.y, 10 + Math.random() * 6); fs('rgba(255,200,210,0.8)');
    }
    const s = 1 + tw.place * 0.25 + (tw.type === 'slow' ? tw.pulse * 0.08 : 0);
    ell(tw.x, tw.y + 30, 38, 12); fs('rgba(0,0,0,0.4)');
    drawTowerIcon(tw.type, tw.x, tw.y, s, t, tw.ang, tw.anim, tw.recoil, tw.level);
  }
}

/* ===================================================================== drawing: crow & desk
   The mascot is drawn in separate LAYERS via the MASCOT object below (body behind the desk,
   arm+held item in front of it, smoke puffs on top). To swap in image sprites later, replace a
   layer function with one that drawImage()s a sprite at the same anchors (DATA.mascot). */
function heldPose() {
  const c = G ? G.crow.cycle % 7 : 0;
  let k = 0; if (c > 4.5 && c < 5.2) k = ease((c - 4.5) / 0.7); else if (c >= 5.2 && c < 6.0) k = 1; else if (c >= 6.0 && c < 6.6) k = 1 - ease((c - 6.0) / 0.6);
  if (G && G.crow.hitT > 0) k *= 0.3;
  return { k, hx: lerp(1742, 1716, k), hy: lerp(700, 560, k), ea: k };
}
function heldTip() {
  const p = heldPose();
  if (settings.clean) return { x: p.hx - 20, y: p.hy - 38 };
  const a = Math.PI + lerp(0.3, -0.15, p.k); return { x: p.hx - 6 + Math.cos(a) * 51, y: p.hy - 4 + Math.sin(a) * 51 };
}
function drawHeld(p, t, ground) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (settings.clean) {
    ctx.translate(p.hx - 20, p.hy - 14); ctx.rotate(ground ? 1.4 : -0.35 * p.k);
    ctx.beginPath(); ctx.arc(18, 0, 10, -1.3, 1.3); ctx.lineWidth = 11; ctx.strokeStyle = O; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#e8f4f2'; ctx.stroke();
    rr(-18, -20, 36, 40, 6); fs('#e8f4f2', 5); ctx.fillStyle = '#7fb069'; ctx.fillRect(-15, -4, 30, 8);
    ell(0, -20, 15, 4); fs('#5a3418', 3);
  } else {
    ctx.translate(p.hx - 6, p.hy - 4); ctx.rotate(ground ? 0.2 : Math.PI + lerp(0.3, -0.15, p.k));
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(48, -7); ctx.lineTo(48, 7); ctx.lineTo(0, 5); ctx.closePath(); fs('#f3eee0', 4);
    ctx.fillStyle = '#c9a36a'; ctx.fillRect(1, -4, 9, 8);
    ctx.fillStyle = '#8a8078'; ctx.fillRect(44, -6, 5, 12);
    const glow = 0.7 + (p.ea || 0) * 0.5 + Math.sin(t * 8) * 0.1;
    ctx.save(); ctx.shadowBlur = 18 * glow; ctx.shadowColor = '#ff6a1a'; circ(51, 0, 6 * glow); fs('#ff7a2a'); circ(51, 0, 3); fs('#fff1a0'); ctx.restore();
  }
  ctx.restore();
}
function drawCrow(t, o) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const bob = o.bob || 0;
  if (o.legs) {
    for (const [a, b] of [[1785, 1780], [1825, 1830]]) { ctx.strokeStyle = O; ctx.lineWidth = 11; line(a, 780, b, 840); ctx.strokeStyle = '#f5b82e'; ctx.lineWidth = 6; line(a, 780, b, 840); }
    for (const fx of [1780, 1830]) { ctx.strokeStyle = O; ctx.lineWidth = 9; line(fx, 840, fx - 14, 856); line(fx, 840, fx, 860); line(fx, 840, fx + 14, 856); ctx.strokeStyle = '#f5b82e'; ctx.lineWidth = 4; line(fx, 840, fx - 14, 856); line(fx, 840, fx, 860); line(fx, 840, fx + 14, 856); }
  }
  ctx.beginPath(); ctx.moveTo(1860, 700); ctx.lineTo(1900, 770); ctx.lineTo(1870, 765); ctx.lineTo(1885, 790); ctx.lineTo(1840, 770); ctx.closePath(); fs('#1f1a1a', 5);
  ell(1818, 585 + bob * 0.5, 72, 42, 0.2); fs('#45472f', 5);
  ell(1808, 692 + bob * 0.3, 84, 112); const hg = ctx.createLinearGradient(1720, 600, 1890, 780); hg.addColorStop(0, '#7a7c5a'); hg.addColorStop(1, '#4f5139'); fs(hg, 6);
  ctx.strokeStyle = 'rgba(127,176,105,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1808, 692, 76, Math.PI * 0.8, Math.PI * 1.25); ctx.stroke();
  ctx.strokeStyle = '#fef9e5'; ctx.lineWidth = 4; line(1772, 605 + bob, 1766, 660); line(1790, 608 + bob, 1792, 664); circ(1766, 664, 5); fs('#7fb069', 3); circ(1792, 668, 5); fs('#7fb069', 3);
  ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1750, 735); ctx.quadraticCurveTo(1800, 720, 1850, 738); ctx.stroke();
  const hy = 505 + bob;
  if (o.ruffle) for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.45; ctx.beginPath(); ctx.moveTo(1790 + Math.cos(a) * 50, hy + Math.sin(a) * 50); ctx.lineTo(1790 + Math.cos(a + 0.2) * 80, hy + Math.sin(a + 0.2) * 80); ctx.lineTo(1790 + Math.cos(a + 0.4) * 50, hy + Math.sin(a + 0.4) * 50); ctx.closePath(); fs('#1f1a1a', 4); }
  ctx.beginPath(); ctx.moveTo(1815, hy - 50); ctx.lineTo(1840, hy - 88); ctx.lineTo(1835, hy - 55); ctx.lineTo(1862, hy - 78); ctx.lineTo(1845, hy - 40); ctx.closePath(); fs('#1f1a1a', 5);
  circ(1790, hy, 62); const g = ctx.createRadialGradient(1770, hy - 25, 5, 1790, hy, 62); g.addColorStop(0, '#3d3434'); g.addColorStop(1, '#161212'); fs(g, 6);
  ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#7fb069'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1790, hy, 55, Math.PI * 0.85, Math.PI * 1.25); ctx.stroke(); ctx.restore();
  const bo = (o.beak || 0) * 12;
  ctx.beginPath(); ctx.moveTo(1748, hy + 22); ctx.lineTo(1694, hy + 30 + bo * 0.6); ctx.lineTo(1752, hy + 44 + bo); ctx.closePath(); fs('#d98a14', 5);
  ctx.beginPath(); ctx.moveTo(1742, hy - 8); ctx.quadraticCurveTo(1700, hy + 2, 1678, hy + 22); ctx.quadraticCurveTo(1712, hy + 28, 1752, hy + 26); ctx.closePath(); fs('#f5b82e', 5);
  circ(1726, hy + 6, 2.5); fs(O);
  const ex = 1768, ey = hy - 8;
  if (o.eyes === 'x') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; line(ex - 12, ey - 12, ex + 12, ey + 12); line(ex + 12, ey - 12, ex - 12, ey + 12); }
  else if (o.eyes === 'squeeze') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex + 12, ey - 10); ctx.lineTo(ex - 10, ey); ctx.lineTo(ex + 12, ey + 10); ctx.stroke(); }
  else {
    const panic = o.eyes === 'panic';
    ell(ex, ey, panic ? 20 : 17, panic ? 22 : 18); fs('#fff', 4);
    const jit = panic ? Math.sin(t * 40) * 1.5 : 0;
    circ(ex - (panic ? 3 : 6) + jit, ey + (panic ? 0 : 3), panic ? 4.5 : 8); fs(O); if (!panic) { circ(ex - 8, ey + 1, 2.5); fs('#fff'); }
    if (!panic) { ctx.beginPath(); ctx.ellipse(ex, ey, 19, 20, 0, Math.PI, Math.PI * 2); ctx.lineTo(ex - 19, ey + 1); ctx.closePath(); ctx.fillStyle = '#2e2626'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = O; line(ex - 19, ey + 1, ex + 19, ey + 1); }
    ctx.strokeStyle = O; ctx.lineWidth = 6; if (panic) line(ex - 16, ey - 34, ex + 14, ey - 26); else line(ex - 18, ey - 22, ex + 16, ey - 22);
  }
  ctx.lineWidth = 16; ctx.strokeStyle = O; ctx.beginPath(); ctx.arc(1800, hy + 4, 66, -2.75, -0.2); ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = '#2e2a28'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#7fb069'; ctx.stroke();
  ell(1822, hy + 10, 21, 27, 0.15); fs('#262220', 5); ell(1822, hy + 10, 11, 16, 0.15); ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = '#7fb069'; fs('#7fb069'); ctx.restore();
  ctx.restore();
}
function drawArm(p, t) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sx = 1790, sy = 622, el = { x: lerp(1795, 1790, p.k), y: lerp(718, 690, p.k) };
  ctx.strokeStyle = O; ctx.lineWidth = 44; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(el.x, el.y); ctx.lineTo(p.hx + 10, p.hy + 6); ctx.stroke();
  ctx.strokeStyle = '#6a6c4e'; ctx.lineWidth = 32; ctx.stroke();
  drawHeld(p, t);
  for (let i = 0; i < 3; i++) { ell(p.hx - 2 - i * 2, p.hy - 8 + i * 9, 12, 7, -0.4 + i * 0.3); fs('#1f1a1a', 4); }
  ctx.restore();
}
const MASCOT = {
  kind: 'procedural-crow',
  pose: () => heldPose(),                      // hand position / puff-cycle state
  tip: () => heldTip(),                        // where ambient smoke/steam is emitted
  body: (t, o) => drawCrow(t, o),              // layer 1: body + head + headset (behind desk)
  arm: (pose, t) => drawArm(pose, t),          // layer 2: arm + joint/mug (in front of desk)
  held: (pose, t, ground) => drawHeld(pose, t, ground), // held item alone (used when it drops on defeat)
  smoke: (s, r, a) => { circ(s.x, s.y, r); ctx.fillStyle = s.steam ? `rgba(245,248,240,${a * 0.8})` : `rgba(215,205,190,${a})`; ctx.fill(); } // layer 3: one puff
};
function drawNeon(t) {
  const P = DATA.pal, x = 1545, y = 108, w = 330, h = 122;
  const flick = (Math.sin(t * 13) > 0.97 || (t % 9 > 8.6 && t % 9 < 8.75)) ? 0.3 : 1;
  ctx.save(); rr(x, y, w, h, 18); ctx.fillStyle = 'rgba(58,18,18,0.92)'; ctx.fill();
  ctx.shadowBlur = 18; ctx.shadowColor = '#9fd07a'; ctx.lineWidth = 5; ctx.strokeStyle = '#b8e09a'; ctx.stroke();
  ctx.font = `700 96px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const letters = 'CROWW'.split(''), widths = letters.map(L => ctx.measureText(L).width), tot = widths.reduce((a, b) => a + b, 0) + 8 * 4;
  let lx = x + w / 2 - tot / 2;
  letters.forEach((L, i) => {
    ctx.globalAlpha = i === 3 ? flick : 1;
    const cx = lx + widths[i] / 2, cy = y + h / 2 + 4;
    ctx.shadowBlur = 34; ctx.shadowColor = '#f0b050'; ctx.lineWidth = 5; ctx.strokeStyle = '#f3c878'; ctx.strokeText(L, cx, cy);
    ctx.shadowBlur = 10; ctx.fillStyle = P.cream; ctx.fillText(L, cx, cy);
    lx += widths[i] + 8;
  });
  ctx.restore();
  for (let i = 0; i < 9; i++) { const bx = 1530 + i * 46, by = 255 + Math.sin((bx - 1510) / 400 * Math.PI) * 18 + 6; const on = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); ctx.save(); ctx.shadowBlur = 12 * on; ctx.shadowColor = ['#f0b050', '#9fd07a', '#fef9e5'][i % 3]; circ(bx, by, 5); fs(['#f3d9a0', '#cfe6b8', '#fef9e5'][i % 3]); ctx.restore(); }
}
function drawChillMeter(t) {
  const x = 1535, y = 300, w = 350, h = 34, f = clamp(G.chill / DATA.chill.max, 0, 1);
  T('CHILL METER', x, y - 14, 26, '#fef9e5', 'left', { w: 900, sw: 6 });
  T(Math.ceil(Math.max(0, G.chill)) + ' / ' + DATA.chill.max, x + w, y - 14, 24, f > 0.3 ? '#fff' : '#ff5070', 'right', { w: 900, sw: 6 });
  rr(x - 4, y, w + 8, h + 8, 12); fs(O); rr(x, y + 4, w, h, 9); fs('#2e1a16');
  const col = f > 0.6 ? '#8fca6a' : f > 0.3 ? '#ffd23f' : '#ff5070';
  if (f > 0) { ctx.save(); rr(x, y + 4, Math.max(18, w * f), h, 9); ctx.shadowBlur = 16; ctx.shadowColor = col; fs(col); ctx.restore(); rr(x + 6, y + 8, Math.max(6, w * f - 12), 8, 4); fs('rgba(255,255,255,0.35)'); }
  if (f <= 0.3 && f > 0 && Math.sin(t * 10) > 0) { rr(x - 4, y, w + 8, h + 8, 12); ctx.lineWidth = 4; ctx.strokeStyle = '#ff5070'; ctx.stroke(); }
}
function drawDesk(t) {
  const C = G.crow, f = clamp(G.chill / DATA.chill.max, 0, 1), def = G.phase === 'defeat' || G.phase === 'results', dT = def ? (G.phase === 'results' ? 9 : G.defeatT) : 0;
  const g = ctx.createRadialGradient(1640, 660, 20, 1640, 660, 380); g.addColorStop(0, G.deskFlash > 0 ? 'rgba(255,80,110,0.35)' : 'rgba(127,176,105,0.22)'); g.addColorStop(1, 'rgba(127,176,105,0)'); ctx.fillStyle = g; ctx.fillRect(1500, 300, 420, 740);
  // chair
  ctx.save();
  if (def) { const k = ease(dT / 0.6); ctx.translate(k * 40, 0); ctx.translate(1815, 990); ctx.rotate(k * 0.42); ctx.translate(-1815, -990); }
  ctx.lineCap = 'round'; ctx.strokeStyle = O; ctx.lineWidth = 12; line(1812, 900, 1812, 975); ctx.lineWidth = 10; line(1760, 985, 1864, 985); ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 5; line(1760, 985, 1864, 985);
  circ(1760, 995, 9); fs('#222', 4); circ(1864, 995, 9); fs('#222', 4); circ(1812, 997, 9); fs('#222', 4);
  rr(1734, 420, 156, 400, 34); const cg = ctx.createLinearGradient(1734, 0, 1890, 0); cg.addColorStop(0, '#4a1a1a'); cg.addColorStop(1, '#5e2424'); fs(cg, 6);
  ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#7fb069'; rr(1748, 450, 12, 340, 6); fs('#7fb069'); rr(1864, 450, 12, 340, 6); fs('#7fb069'); ctx.restore();
  rr(1768, 432, 96, 46, 18); fs('#6b2c2c', 5);
  ctx.restore();
  const hpose = MASCOT.pose();
  const flinch = C.hitT > 0 ? Math.sin(C.hitT * 55) * 9 * C.hitT : 0;
  const eyes = C.hitT > 0.25 ? 'squeeze' : f <= 0.3 ? 'panic' : 'chill';
  const falling = def && dT > 0.3;
  if (!falling) {
    ctx.save(); const rise = def ? -ease(dT / 0.3) * 30 : 0; ctx.translate(flinch, rise + (C.hitT > 0 ? -C.hitT * 10 : 0));
    MASCOT.body(t, { eyes: def ? 'panic' : eyes, beak: C.coughT > 0 ? Math.abs(Math.sin(C.coughT * 14)) : (C.ringT > 1.6 ? 0.6 : 0), bob: Math.sin(t * 1.6) * 3, ruffle: f <= 0.3 || def });
    ctx.restore();
  }
  // desk
  ctx.save(); ctx.lineJoin = 'round';
  rr(1540, 920, 26, 88, 6); fs('#1c140f', 5); rr(1872, 920, 26, 88, 6); fs('#1c140f', 5);
  rr(1522, 786, 380, 142, 10); const dg = ctx.createLinearGradient(0, 786, 0, 928); dg.addColorStop(0, '#3a2a20'); dg.addColorStop(1, '#241a14'); fs(dg, 6);
  ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = '#e0b45c'; ctx.fillStyle = G.deskFlash > 0 ? '#ff5070' : '#e0b45c'; ctx.fillRect(1530, 794, 364, 5); ctx.restore();
  rr(1508, 762, 404, 30, 8); fs('#5a4430', 6); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(1516, 766, 388, 5);
  T("CROWW'S DESK", 1712, 862, 26, 'rgba(255,255,255,0.14)', 'center', { stroke: false, w: 900 });
  rr(1690, 748, 110, 16, 4); fs('#1e1210', 4);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = `hsl(${(t * 80 + i * 40) % 360},90%,60%)`; ctx.fillRect(1697 + i * 12.5, 752, 9, 7); }
  if (!def) { ell(1872, 760, 24, 7); fs(settings.clean ? '#7fb069' : '#606070', 4); }
  ctx.restore();
  // monitor
  ctx.save(); ctx.lineJoin = 'round';
  rr(1602, 755, 70, 10, 4); fs('#1e1210', 4); rr(1628, 726, 18, 32, 3); fs('#1e1612', 4);
  rr(1544, 612, 178, 124, 10); fs('#140e0c', 6);
  const sx = 1554, sy = 622, sw = 158, sh = 104;
  const red = G.deskFlash > 0 || (f <= 0.3 && Math.sin(t * 8) > 0);
  const sg = ctx.createLinearGradient(0, sy, 0, sy + sh); sg.addColorStop(0, red ? '#6a1028' : '#1f3a22'); sg.addColorStop(1, red ? '#3a0816' : '#10200f'); ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh);
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  if (red) T(def ? 'GG' : 'LOW CHILL', sx + sw / 2, sy + sh / 2, 22, '#ffb0c0', 'center', { stroke: false, w: 900 });
  else for (let i = 0; i < 8; i++) { const yy = sy + 4 + ((i * 14 - t * 20) % 112 + 112) % 112; ctx.fillStyle = `hsla(${(i * 67) % 360},80%,65%,0.9)`; ctx.fillRect(sx + 8, yy, 22, 6); ctx.fillStyle = 'rgba(220,255,250,0.55)'; ctx.fillRect(sx + 34, yy, 30 + ((i * 37) % 80), 6); }
  ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 60, sy); ctx.lineTo(sx, sy + 60); ctx.fill();
  ctx.restore();
  // mic arm
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const mx = 1662, my = 488 + Math.sin(t * 1.6) * 1.5;
  ctx.strokeStyle = O; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(1530, 762); ctx.lineTo(1540, 560); ctx.lineTo(mx - 20, my + 8); ctx.stroke();
  ctx.strokeStyle = '#3e3834'; ctx.lineWidth = 6; ctx.stroke();
  circ(1540, 560, 8); fs('#262220', 4); rr(1518, 752, 26, 16, 3); fs('#262220', 4);
  ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.25); rr(-24, -13, 48, 26, 12); fs('#221e1c', 5); ctx.strokeStyle = '#7fb069'; ctx.lineWidth = 3; line(-6, -11, -6, 11); line(4, -11, 4, 11); ctx.restore();
  ctx.restore();
  if (!def) MASCOT.arm(hpose, t);
  if (falling) {
    const lin = clamp((dT - 0.3) / 0.9, 0, 1), k = ease(lin);
    const px = lerp(1800, 1680, lin), py = lerp(640, 820, k) - Math.sin(lin * Math.PI) * 220;
    ctx.save(); ctx.translate(px, py); ctx.rotate(lerp(0, Math.PI * 1.05, k)); ctx.scale(0.85, 0.85); ctx.translate(-1800, -640);
    MASCOT.body(t, { eyes: lin > 0.7 ? 'x' : 'panic', beak: 0.8, legs: true, ruffle: true });
    ctx.restore();
    MASCOT.held({ hx: lerp(1742, 1600, lin), hy: lerp(700, 992, k) - Math.sin(lin * Math.PI) * 120, k: 0, ea: 0 }, t, lin >= 1);
    if (lin >= 1) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; T('\u2605', px + Math.cos(a) * 70, py + 120 + Math.sin(a) * 18, 30, '#ffd23f', 'center', { sw: 5 }); }
  }
  for (const s of G.smoke) {
    const k = s.t / s.dur, r = lerp(s.r, s.gr, ease(k)), a = s.a * (1 - k) * (0.8 + (1 - f) * 0.6);
    MASCOT.smoke(s, r, a);
  }
  if (C.ringT > 0) {
    const k = 1 - C.ringT / 2.6, rx = 1675 - k * 170, ry = 525 - k * 190;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.95; ctx.lineWidth = lerp(14, 5, k); ctx.strokeStyle = settings.clean ? '#f4fbff' : '#e0d8f4'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ell(rx, ry, lerp(12, 70, ease(k)), lerp(8, 42, ease(k)), -0.3); ctx.stroke(); ctx.restore();
  }
  if (C.coughT > 0.5) T(settings.clean ? '*sputter*' : '*cough*', 1640 - (1.2 - C.coughT) * 30, 430 - (1.2 - C.coughT) * 60, 30, '#fff', 'center', { sw: 6, w: 900 });
  if (f <= 0.3 && !def) { const k = (t * 1.3) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); const dx = 1838, dy = 452 + k * 40; ctx.moveTo(dx, dy - 12); ctx.quadraticCurveTo(dx + 9, dy + 2, dx, dy + 6); ctx.quadraticCurveTo(dx - 9, dy + 2, dx, dy - 12); fs('#8fe8ff', 3); ctx.restore(); }
}
