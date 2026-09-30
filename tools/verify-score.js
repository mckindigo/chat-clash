// TOP ATTACKERS scoring + selling checks through the REAL Kick path (fake Pusher socket -> Kick.connect -> onChat):
// attack points for tower damage soaked + distance marched + a big desk-hit bonus, scores rise for chatters whose
// minions die before the desk, desk hits score more, board sorted by points and updated live, names merge across
// letter case, the board carries across AFK rounds; red SELL +Xg button, right-click sell and X all refund 60%.
// node tools/verify-score.js   (screenshots -> shots/verify/score/)
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify/score'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8779);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const FAKE_WS = () => {
  class FakeWS { constructor(url) { this.url = url; this.readyState = 0; window.__ws = this; setTimeout(() => { this.readyState = 1; this.emit({ event: 'pusher:connection_established', data: '{}' }); }, 50); }
    emit(m) { this.onmessage && this.onmessage({ data: JSON.stringify(m) }); }
    send(s) { const m = JSON.parse(s); if (m.event === 'pusher:subscribe') setTimeout(() => this.emit({ event: 'pusher_internal:subscription_succeeded', channel: m.data.channel, data: '{}' }), 50); }
    close() { this.readyState = 3; } }
  window.WebSocket = FakeWS;
  window.kickSay = (u, c) => window.__ws.emit({ event: 'App\\Events\\ChatMessageEvent', data: JSON.stringify({ sender: { username: u }, content: c }) });
  // board as drawn: capture the sidebar's name / score columns during one render
  window.drawnBoard = () => { const rows = {}, extra = []; const oT = window.T; window.T = function (s, x, y) { if (y >= 670 && y <= 815) { const i = Math.round((y - 682) / 31); rows[i] = rows[i] || {}; if (x === 60) rows[i].name = String(s); if (x === 342) rows[i].pts = String(s); } if (y === 828) extra.push(String(s)); return oT.apply(this, arguments); };
    try { CC.render(); } finally { window.T = oT; } return { rows: Object.keys(rows).sort().map(k => rows[k]).filter(r => r.name && r.pts), label: extra }; };
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(FAKE_WS);
  await page.goto('http://localhost:8779/?test=off&npc=0'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(700);
  await page.keyboard.press('Enter'); await sleep(200);
  await page.evaluate(() => { CC.manual(true); CC.settings.npcWaves = false; });
  ok(await page.evaluate(() => CC.Kick.status === 'live'), 'Kick chat live through the real connect code (fake socket)');

  // 1. strong towers: every chat minion dies before the desk, yet their scores rise (live, mid-wave)
  const r1 = await page.evaluate(() => { CC.newGame(); const G = CC.G; G.gold = 99999; ['laser', 'cannon', 'laser', 'hammer', 'laser', 'cannon', 'laser', 'cannon'].forEach((t, i) => { build(i, t); upgrade(i); upgrade(i); });
    CC.startWave(); kickSay('Alpha_Chatter', '!troll'); kickSay('bravo', '!bug'); kickSay('Charlie', '!spam');
    const live = []; for (let i = 0; i < 40; i++) { CC.step(0.25, 1 / 30); live.push(Math.floor(Object.values(G.session).reduce((a, s) => a + (s.pts || 0), 0))); if (!G.enemies.some(e => !e.isBot)) break; }
    const s = {}; for (const u in G.session) s[u] = { pts: +G.session[u].pts.toFixed(1), dmg: G.session[u].dmg, spawns: G.session[u].spawns };
    return { s, chill: G.chill, dmgChat: G.dmgChat, chatLeft: G.enemies.filter(e => !e.isBot).length, live, board: drawnBoard() }; });
  const names1 = ['Alpha_Chatter', 'bravo', 'Charlie'];
  ok(r1.chatLeft === 0 && r1.dmgChat === 0 && r1.chill === 100, 'strong towers: all chat minions died before the desk (0 chill damage) ' + JSON.stringify({ chill: r1.chill, dmgChat: r1.dmgChat }));
  ok(names1.every(u => r1.s[u] && r1.s[u].pts > 0 && r1.s[u].dmg === 0), 'yet every chatter scored points: ' + JSON.stringify(r1.s));
  ok(r1.live.filter((v, i) => i && v > r1.live[i - 1]).length >= 3, 'points rise live while the minions walk/soak: ' + r1.live.slice(0, 12).join(','));
  ok(r1.board.rows.length === 3 && r1.board.rows.every(r => +r.pts > 0), 'sidebar board shows non-zero points: ' + JSON.stringify(r1.board.rows));
  ok(r1.board.label.includes('attack points') && !r1.board.label.some(s => /chill damage/.test(s)), 'label under the board reads "attack points" ' + JSON.stringify(r1.board.label));
  ok(r1.s.Alpha_Chatter.pts > r1.s.bravo.pts, 'a tanky troll (soaks more tower damage) outscores a bug that dies fast (' + r1.s.Alpha_Chatter.pts + ' > ' + r1.s.bravo.pts + ')');

  // 2. desk hit: towers gone, a bug walks in and hits the desk -> big bonus, tops the board
  const r2 = await page.evaluate(() => { const G = CC.G; G.towers = G.towers.map(() => null); G.enemies = []; G.release = []; G.phase = 'build'; CC.startWave(); kickSay('DeskHitter', '!bug');
    let t = 0; while (G.enemies.some(e => !e.isBot) && t < 60) { CC.step(0.5); t += 0.5; }
    const d = G.session.DeskHitter; return { pts: +d.pts.toFixed(1), dmg: d.dmg, chill: 100 - G.dmgChat, bravo: +G.session.bravo.pts.toFixed(1), troll: +G.session.Alpha_Chatter.pts.toFixed(1), board: drawnBoard() }; });
  ok(r2.dmg === 5 && r2.chill < 100, 'desk hit through the real chat path: DeskHitter took ' + r2.dmg + ' chill');
  ok(r2.pts >= 50 + 5 * 5 && r2.pts > r2.bravo * 3 && r2.pts > r2.troll, 'desk hits give much more: DeskHitter ' + r2.pts + ' vs killed bug ' + r2.bravo + ' / killed troll ' + r2.troll);
  const pts2 = r2.board.rows.map(r => +r.pts);
  ok(r2.board.rows[0].name === 'DeskHitter' && pts2.every((v, i) => !i || v <= pts2[i - 1]), 'board sorted by points, desk hitter first: ' + JSON.stringify(r2.board.rows));

  // 3. same chatter in different letter case = one entry (like cooldowns); points keep adding
  const r3 = await page.evaluate(() => { const G = CC.G; const before = G.session.bravo.pts; CC.step(25); if (G.phase !== 'wave') CC.startWave(); kickSay('BRAVO', '!bug'); CC.step(3);
    return { keys: Object.keys(G.session).filter(k => k.toLowerCase() === 'bravo'), before: +before.toFixed(1), after: +G.session.bravo.pts.toFixed(1), spawns: G.session.bravo.spawns }; });
  ok(r3.keys.length === 1 && r3.after > r3.before && r3.spawns === 2, '"bravo" and "BRAVO" share one board entry and keep scoring ' + JSON.stringify(r3));

  // 4. wave card uses points; waveStats reset each wave
  const r4 = await page.evaluate(() => { const G = CC.G; let t = 0; while (G.phase === 'wave' && t < 120) { CC.step(0.5); t += 0.5; } const c = G.card; const seen = []; const oT = window.T; window.T = function (s) { seen.push(String(s)); return oT.apply(this, arguments); }; CC.render(); window.T = oT;
    const w0 = Object.keys(G.waveStats).length; CC.startWave(); return { top: c && c.top && c.top.u, topPts: c && c.top && c.top.s.pts, line: seen.find(s => /ATTACK PTS/.test(s)), waveStatsBefore: w0, waveStatsAfter: Object.keys(G.waveStats).length }; });
  ok(r4.top === 'bravo' && r4.line && r4.line.startsWith(String(Math.floor(r4.topPts))) && /^\d+ ATTACK PTS/.test(r4.line || '') && r4.waveStatsAfter === 0, 'wave card: top chatter by points "' + r4.line + '", wave stats reset on the next wave ' + JSON.stringify(r4));
  await page.evaluate(() => { const G = CC.G; CC.step(1.5); CC.render(); });
  await page.screenshot({ path: out + '/leaderboard-points-1920x1080.png' });

  // 5. AFK: the board (with points) carries across rounds and keeps counting
  const r5 = await page.evaluate(() => { const G0 = CC.G; CC.setAfk(true); const snap = {}; for (const u in G0.session) snap[u] = +G0.session[u].pts.toFixed(1); defeat(); CC.step(3.3); const ph = CC.G.phase; CC.step(13);
    const G = CC.G; const carried = {}; for (const u in G.session) carried[u] = +G.session[u].pts.toFixed(1);
    CC.startWave(); kickSay('Alpha_Chatter', '!bug'); kickSay('newbie', '!bug'); CC.step(4);
    return { ph, newRound: G !== G0, rounds: CC.AFK.rounds, snap, carried, alphaNow: +G.session.Alpha_Chatter.pts.toFixed(1), newbie: +(G.session.newbie || {}).pts || 0, board: drawnBoard() }; });
  ok(r5.ph === 'results' && r5.newRound && r5.rounds >= 1, 'AFK: loss -> results -> next round started (round ' + r5.rounds + ')');
  ok(JSON.stringify(r5.snap) === JSON.stringify(r5.carried), 'AFK: TOP ATTACKERS points carried over unchanged ' + JSON.stringify(r5.carried));
  ok(r5.alphaNow > r5.carried.Alpha_Chatter && r5.newbie > 0, 'AFK: carried chatters keep scoring in the new round, new chatters join (' + r5.carried.Alpha_Chatter + ' -> ' + r5.alphaNow + ', newbie ' + r5.newbie + ')');
  await page.screenshot({ path: out + '/leaderboard-afk-round2-1920x1080.png' });
  await page.evaluate(() => CC.setAfk(false));

  // 6. results screen lists points, still says N SPAWN(S)
  const r6 = await page.evaluate(() => { const G = CC.G; defeat(); CC.step(3.3); const seen = []; const oT = window.T; window.T = function (s) { seen.push(String(s)); return oT.apply(this, arguments); }; CC.render(); window.T = oT; return seen.filter(s => / PTS /.test(s)); });
  ok(r6.length >= 3 && r6.every(s => /^\d+ PTS  \u2022  \d+ SPAWNS?$/.test(s)), 'results list points: ' + JSON.stringify(r6));
  await page.screenshot({ path: out + '/results-points-1920x1080.png' });

  // 7. selling: red SELL +Xg button, right-click sell, X hotkey - all refund 60%
  await page.evaluate(() => { CC.newGame(); const G = CC.G; G.gold = 1000; G.phaseT = 9999; build(0, 'hammer'); build(1, 'laser'); upgrade(1); build(3, 'cannon'); build(4, 'slow'); });
  const lay = await page.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const css = (x, y) => [lay.l + x * lay.w / 1920, lay.t + y * lay.h / 1080];
  const pads = await page.evaluate(() => CC.DATA.pads);
  const g = () => page.evaluate(() => ({ gold: Math.round(CC.G.gold * 1000) / 1000, towers: CC.G.towers.map(t => t && { type: t.type, spent: t.spent }) }));
  // 7a. right-click hammer (paid 100)
  let b = await g(); await page.mouse.click(...css(...pads[0]), { button: 'right' }); await sleep(50); let a = await g();
  let txt = await page.evaluate(() => CC.G.texts.map(t => t.s).filter(s => /SOLD/.test(s)));
  ok(!a.towers[0] && Math.abs(a.gold - b.gold - 60) < 0.01 && txt.includes('SOLD +60g'), 'right-click a 100g Mod Hammer: sold, +' + (a.gold - b.gold).toFixed(0) + 'g (60%), refund shown ' + JSON.stringify(txt));
  // 7b. right-click an upgraded laser (paid 135 + 162)
  b = await g(); const spent = b.towers[1].spent; await page.mouse.click(...css(...pads[1]), { button: 'right' }); await sleep(50); a = await g();
  ok(!a.towers[1] && Math.abs(a.gold - b.gold - Math.round(spent * 0.6)) < 0.01, 'right-click an upgraded Ban Laser (spent ' + spent + '): +' + (a.gold - b.gold).toFixed(0) + 'g = 60%');
  // 7c. right-click on an empty pad sells nothing
  b = await g(); await page.mouse.click(...css(...pads[0]), { button: 'right' }); await sleep(50); a = await g();
  ok(a.gold === b.gold && JSON.stringify(a.towers) === JSON.stringify(b.towers), 'right-click an empty pad does nothing');
  // 7d. select a tower: red SELL +Xg button
  await page.mouse.click(...css(...pads[3])); await sleep(60);
  const m = await page.evaluate(() => { const seen = []; const oT = window.T; window.T = function (s) { seen.push(String(s)); return oT.apply(this, arguments); }; const oF = window.fs; const fills = []; window.fs = function (c) { fills.push(c); return oF.apply(this, arguments); };
    CC.render(); window.T = oT; window.fs = oF; const btn = menuButtons().find(x => x.kind === 'sell'); return { sel: CC.view.sel, btn: btn && { x: btn.x, y: btn.y }, seen: seen.filter(s => /SELL|^\+\d+g$/.test(s)), red: fills.includes('#d0203a') }; });
  ok(m.sel === 3 && m.btn && m.seen.includes('SELL') && m.seen.includes('+111g') && m.red, 'selected Emote Cannon shows a red "SELL +111g" button ' + JSON.stringify(m.seen));
  await page.mouse.move(...css(m.btn.x, m.btn.y)); await sleep(60); await page.evaluate(() => CC.render());
  await page.screenshot({ path: out + '/sell-button-1920x1080.png' });
  b = await g(); await page.mouse.click(...css(m.btn.x, m.btn.y)); await sleep(50); a = await g();
  ok(!a.towers[3] && Math.abs(a.gold - b.gold - 111) < 0.01, 'clicking SELL refunds +111g (60% of 185)');
  // 7e. X hotkey still sells
  await page.mouse.click(...css(...pads[4])); await sleep(50); b = await g(); await page.keyboard.press('x'); await sleep(50); a = await g();
  ok(!a.towers[4] && Math.abs(a.gold - b.gold - 72) < 0.01, 'X hotkey still sells (Slow Mode 120 -> +72g)');

  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILURES' : 'ALL SCORE/SELL CHECKS PASSED');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
