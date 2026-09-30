// Boss / hype / fast-chat UI checks through the REAL Kick path (fake Pusher socket -> Kick.connect -> onChat):
// rejected commands add no hype, big chats need more hype, no chat boss before wave 3 or in a build phase, one chat
// boss at a time, !boss respects the minion cap, sidebar gold/s never truncated, name tags limited, results wording,
// Crow Boss clear of pads + banners. node tools/verify-boss.js   (screenshots -> shots/verify/boss/)
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify/boss'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8771);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const FAKE_WS = () => {
  class FakeWS { constructor(url) { this.url = url; this.readyState = 0; window.__ws = this; setTimeout(() => { this.readyState = 1; this.emit({ event: 'pusher:connection_established', data: '{}' }); }, 50); }
    emit(m) { this.onmessage && this.onmessage({ data: JSON.stringify(m) }); }
    send(s) { const m = JSON.parse(s); if (m.event === 'pusher:subscribe') setTimeout(() => this.emit({ event: 'pusher_internal:subscription_succeeded', channel: m.data.channel, data: '{}' }), 50); }
    close() { this.readyState = 3; } }
  window.WebSocket = FakeWS;
  window.kickSay = (u, c) => window.__ws.emit({ event: 'App\\Events\\ChatMessageEvent', data: JSON.stringify({ sender: { username: u }, content: c }) });
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(FAKE_WS);
  await page.goto('http://localhost:8771/?test=off'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(700);
  await page.keyboard.press('Enter'); await sleep(200);
  await page.evaluate(() => CC.manual(true));
  ok(await page.evaluate(() => CC.Kick.status === 'live'), 'Kick chat live through the real connect code (fake socket)');
  // 1. rejected commands add no hype
  const r1 = await page.evaluate(() => { const G = CC.G; CC.startWave(); G.hype = 0; kickSay('spammy', '!bug'); const h1 = G.hype; for (let i = 0; i < 10; i++) kickSay('spammy', '!bug'); const h2 = G.hype;
    kickSay('lurker', '!boss'); const h3 = G.hype; return { accepted: +h1.toFixed(2), after10cooldownRejects: +h2.toFixed(2), afterLockedBoss: +h3.toFixed(2) }; });
  ok(r1.accepted > 0 && r1.after10cooldownRejects === r1.accepted && r1.afterLockedBoss === r1.accepted, '10 cooldown-rejected !bug + a locked !boss add no hype ' + JSON.stringify(r1));
  const r1b = await page.evaluate(() => { const G = CC.G; for (let i = 0; i < 40; i++) spawnEnemy('troll', 'filler' + i, false, 'kick'); const h0 = G.hype; kickSay('fresh_guy', '!troll'); const f = CC.feed[CC.feed.length - 1];
    const r = { load: chatLoad(), hypeDelta: +(G.hype - h0).toFixed(3), msg: f.text }; G.enemies = []; return r; });
  ok(r1b.hypeDelta === 0 && /room is full/.test(r1b.msg), 'room-full rejection adds no hype ' + JSON.stringify(r1b));
  // 2. hype need scales with active chatters
  const r2 = await page.evaluate(() => { const G = CC.G; const gain = n => { for (const k in lastSeen) delete lastSeen[k]; for (let i = 0; i < n; i++) lastSeen['u' + i] = gameClock; G.hype = 0; addHype(10); return G.hype; };
    return { at1: +gain(1).toFixed(2), at3: +gain(3).toFixed(2), at20: +gain(20).toFixed(2), need20: +hypeNeedMult(20).toFixed(2) }; });
  ok(r2.at20 < r2.at3 && r2.need20 > 2, 'a 20-chatter chat needs ' + r2.need20 + 'x the hype (same message: ' + JSON.stringify(r2) + ')');
  // 3. no boss before wave 3 / in a build phase
  const r3 = await page.evaluate(() => { const G = CC.G; for (const k in lastSeen) delete lastSeen[k]; G.wave = 1; if (G.phase !== 'wave') CC.startWave(); G.waveT = 2; G.hype = 100; CC.step(0.1); const w1 = G.bossReady;
    kickSay('eager1', '!boss'); const f1 = CC.feed[CC.feed.length - 1].text; const b1 = G.enemies.some(e => e.type === 'boss') || G.chatQueue.some(q => q.type === 'boss');
    G.enemies = []; G.release = []; G.waveT = G.waveDur + 1; CC.step(0.1); const ph = G.phase; G.wave = 4; G.hype = 100; CC.step(0.1); const buildReady = G.bossReady; kickSay('eager2', '!boss');
    const b2 = G.chatQueue.some(q => q.type === 'boss'); const f2 = CC.feed[CC.feed.length - 1].text;
    return { w1Ready: w1, w1Boss: b1, f1, phase: ph, buildReady, buildQueued: b2, f2 }; });
  ok(!r3.w1Ready && !r3.w1Boss && /wave 3/.test(r3.f1), 'wave 1 with full hype: no unlock, !boss refused (' + r3.f1 + ')');
  ok(r3.phase === 'build' && !r3.buildReady && !r3.buildQueued, 'build phase with full hype: no unlock, nothing queued (' + r3.f2 + ')');
  // 4. wave 3+: unlock, one boss at a time
  const r4 = await page.evaluate(() => { const G = CC.G; CC.startWave(); G.waveT = 1; G.hype = 100; CC.step(0.1); const ready = G.bossReady; kickSay('boss_one', '!boss'); CC.step(0.5);
    const n1 = G.enemies.filter(e => e.type === 'boss').length; G.hype = 100; CC.step(0.2); const ready2 = G.bossReady; kickSay('boss_two', '!boss'); CC.step(0.5);
    const n2 = G.enemies.filter(e => e.type === 'boss').length; const f = CC.feed.slice(-3).map(x => x.user + ': ' + x.text);
    G.enemies.filter(e => e.type === 'boss').forEach(e => dmgEnemy(e, 1e9, 'laser')); CC.step(0.2); const ready3 = G.bossReady;
    return { wave: G.wave, ready, n1, ready2, n2, afterKillReady: ready3, feed: f }; });
  ok(r4.ready && r4.n1 === 1, 'wave ' + r4.wave + ' during a wave: full hype unlocks, !boss spawns one boss');
  ok(!r4.ready2 && r4.n2 === 1, 'a 2nd boss is refused while the first is alive ' + JSON.stringify(r4.feed));
  ok(r4.afterKillReady, 'after the boss dies, the still-full hype unlocks the next one');
  // 5. !boss respects the cap
  const r5 = await page.evaluate(() => { const G = CC.G; G.enemies = []; G.bossReady = false; G.hype = 100; CC.step(0.1); for (let i = 0; i < 30; i++) spawnEnemy('bug', 'cap' + i, false, 'kick');
    kickSay('late_boss', '!boss'); const f = CC.feed[CC.feed.length - 1].text; const r = { load: chatLoad(), cap: CC.settings.globalCap, boss: G.enemies.some(e => e.type === 'boss'), f }; G.enemies = []; return r; });
  ok(!r5.boss && r5.load <= r5.cap && /room is full/.test(r5.f), '!boss with the room full is refused: ' + r5.load + '/' + r5.cap + ' (' + r5.f + ')');
  // 5b. QA repro: 1 chatter types !spam in build (small chat = 8 minions), then 30 type !bug, then the wave starts
  const r5b = await page.evaluate(() => { CC.newGame(); const G = CC.G; for (const k in lastSeen) delete lastSeen[k]; kickSay('solo', '!spam'); const q0 = chatLoad();
    for (let i = 0; i < 30; i++) kickSay('bugger' + i, '!bug'); CC.startWave(); let mx = chatLoad(); for (let i = 0; i < 200; i++) { CC.step(0.05, 0.05); mx = Math.max(mx, G.enemies.filter(e => !e.isBot && !e.dead).length + G.release.length); }
    return { spamQueued: q0, maxLoad: mx, cap: CC.settings.globalCap }; });
  ok(r5b.spamQueued >= 8 && r5b.maxLoad <= r5b.cap, 'queued small-chat !spam counts its real size (' + r5b.spamQueued + '); peak ' + r5b.maxLoad + '/' + r5b.cap);
  // 5c. boss kill gives chill back; Crow Boss hits bosses harder
  const r5c = await page.evaluate(() => { const G = CC.G; G.wave = 4; G.enemies = []; if (G.phase !== 'wave') CC.startWave(); spawnEnemy('boss', 'bossman', false, 'kick'); const b = G.enemies[G.enemies.length - 1]; b.d = 400;
    G.chill = 50; dmgEnemy(b, 1e9, 'laser'); const chill = G.chill; spawnEnemy('boss', 'bossman2', false, 'kick'); spawnEnemy('troll', 'tr', false, 'kick'); const b2 = G.enemies[G.enemies.length - 2], t2 = G.enemies[G.enemies.length - 1];
    b2.hp = b2.maxHp = t2.hp = t2.maxHp = 1e6; const P = CC.DATA.crowBoss.perch; b2.d = t2.d = 1; b2.x = t2.x = P[0]; b2.y = t2.y = P[1]; const o = window.pathAt; window.pathAt = d => ({ x: P[0], y: P[1], ang: 0 });
    localStorage.setItem('chatclash.crowBoss', '1'); G.crowBoss.cd = 0; CC.deployCrowBoss(); for (let i = 0; i < 60; i++) CC.step(0.05, 0.05); window.pathAt = o;
    const r = { chillAfterKill: chill, bossDmg: Math.round(1e6 - b2.hp), trollDmg: Math.round(1e6 - t2.hp) }; G.enemies = []; return r; });
  ok(r5c.chillAfterKill === 50 + 10, 'killing a chat boss gives +10 chill (50 -> ' + r5c.chillAfterKill + ')');
  ok(r5c.bossDmg >= r5c.trollDmg * 2.4 && r5c.trollDmg > 0, 'Crow Boss smoke hits a boss ' + (r5c.bossDmg / Math.max(1, r5c.trollDmg)).toFixed(1) + 'x harder than a troll ' + JSON.stringify(r5c));
  // 6. fast chat through Kick: 20 chatters spamming for 90s; minion count never above the cap; UI checks
  const r6 = await page.evaluate(() => { const G = CC.G; CC.newGame(); G.gold = 5000; [[1, 'laser'], [3, 'hammer'], [4, 'slow'], [5, 'cannon']].forEach(([i, t]) => build(i, t)); G.wave = 4;
    const users = Array.from({ length: 20 }, (_, i) => ({ u: ['viewer', 'raider', 'chatgoblin', 'krow_fan', 'kickmod'][i % 5] + i, next: Math.random() * 3 })); let t = 0, maxLoad = 0, maxShown = 0;
    CC.startWave(); while (t < 90) { for (const us of users) if (t >= us.next) { kickSay(us.u, G.bossReady && Math.random() < 0.5 ? '!boss' : ['!bug', '!troll', '!spam', '!lag'][Math.floor(Math.random() * 4)]); us.next = t + 2 + Math.random() * 3; }
      CC.step(0.05, 0.05); t += 0.05; maxLoad = Math.max(maxLoad, chatLoad()); if (G.phase === 'build') CC.startWave(); }
    return { maxLoad, cap: CC.settings.globalCap, active: activeChatters() }; });
  ok(r6.maxLoad <= r6.cap, '90s of 20-chatter spam: minions peaked at ' + r6.maxLoad + '/' + r6.cap);
  const r7 = await page.evaluate(() => { const seen = [], inE = []; let cap = false; const oT = window.T; window.T = function (s) { seen.push(String(s)); if (cap) inE.push(String(s)); return oT.apply(this, arguments); };
    const oE = window.drawEnemies; window.drawEnemies = function () { cap = true; try { return oE.apply(this, arguments); } finally { cap = false; } };
    const G = CC.G; G.enemies = []; for (let i = 0; i < 20; i++) { spawnEnemy('bug', 'raider' + i, false, 'kick'); G.enemies[G.enemies.length - 1].d = 10 + i * 3; }
    G.chatQueue = Array.from({ length: 12 }, (_, i) => ({ type: 'bug', user: 'q' + i, src: 'kick' })); CC.render(5); window.T = oT; window.drawEnemies = oE;
    const gps = seen.find(s => /g\/s/.test(s)) || ''; const tags = inE.filter(s => /^raider\d+/.test(s)).length; G.chatQueue = [];
    return { gps, tags }; });
  ok(/\+\d+\.\dg\/s$/.test(r7.gps) && !/\u2026/.test(r7.gps), 'sidebar at 20 chatters + 12 queued shows gold/s in full: "' + r7.gps + '"');
  ok(r7.tags <= 8, '20 chat bugs bunched at the spawn: ' + r7.tags + ' name tags drawn (max 8, faded in)');
  await page.evaluate(() => CC.render(6)); await page.screenshot({ path: out + '/fast-chat-20-1920x1080.png' });
  // 7. Crow Boss clear of every pad and the banner zone
  const r8 = await page.evaluate(() => { const P = CC.DATA.crowBoss.perch, kk = CC.DATA.crowBoss.scale / 0.62, box = { x0: P[0] - 85 * kk, x1: P[0] + 85 * kk, y0: P[1] - 105 * kk, y1: P[1] + 175 * kk };
    const hitPads = CC.DATA.pads.map((p, i) => [i, p]).filter(([, [x, y]]) => x + 45 > box.x0 && x - 45 < box.x1 && y + 50 > box.y0 && y - 45 < box.y1).map(([i]) => i);
    const bannerZone = { x0: 540, x1: 1340, y0: 330, y1: 600 }, inBanner = box.x1 > bannerZone.x0 && box.x0 < bannerZone.x1 && box.y1 > bannerZone.y0 && box.y0 < bannerZone.y1;
    const k = CC.DATA.crowBoss.scale / 0.62, bx = { x0: P[0] - 85 * k, x1: P[0] + 85 * k, y0: P[1] - 105 * k, y1: P[1] + 175 * k }; let pathGap = 1e9;
    for (let d = 0; d < PATH.len; d += 5) { const q = pathAt(d); const dx = Math.max(bx.x0 - q.x, 0, q.x - bx.x1), dy = Math.max(bx.y0 - q.y, 0, q.y - bx.y1); pathGap = Math.min(pathGap, Math.hypot(dx, dy)); }
    return { perch: P, hitPads, inBanner, pathGap: Math.round(pathGap) }; });
  ok(r8.pathGap >= 40, 'Crow Boss sprite stays ' + r8.pathGap + 'px off the path centre line (enemies never walk behind him)');
  ok(!r8.hitPads.length && !r8.inBanner, 'Crow Boss perch ' + JSON.stringify(r8.perch) + ' overlaps no pad and no banner ' + JSON.stringify(r8));
  await page.evaluate(() => { localStorage.setItem('chatclash.crowBoss', '1'); const G = CC.G; G.enemies = []; G.gold = 5000; for (let i = 0; i < 8; i++) if (!G.towers[i]) build(i, ['hammer', 'laser', 'slow', 'hammer', 'cannon', 'laser', 'slow', 'cannon'][i]);
    G.crowBoss.cd = 0; if (G.phase !== 'wave') CC.startWave(); CC.deployCrowBoss(); CC.step(1.2, 1.2); startVote(); G.vote.opts[0] = 'fog'; G.vote.counts = [3, 0, 0]; endVote(); CC.step(0.4, 0.4); CC.render(8); });
  await page.screenshot({ path: out + '/crowboss-fog-banner-1920x1080.png' });
  // 8. results wording
  const r9 = await page.evaluate(() => { localStorage.removeItem('chatclash.best'); CC.newGame(); const G = CC.G; G.session = { one_spawn_guy: { dmg: 5, spawns: 1 }, many: { dmg: 40, spawns: 7 } }; G.bestAtStart = 0; G.score = 0; G.chill = 1;
    spawnEnemy('bug', 'x', true); G.enemies[0].d = 1e5; CC.startWave(); CC.step(0.1); CC.step(3.2); CC.step(0.6);
    const seen = []; const oT = window.T; window.T = function (s) { seen.push(String(s)); return oT.apply(this, arguments); }; CC.render(9); window.T = oT; return { phase: G.phase, lines: seen.filter(s => /SPAWN|BEST|CLEARED/.test(s)) }; });
  ok(r9.lines.some(s => /\b1 SPAWN$/.test(s)) && r9.lines.some(s => /7 SPAWNS$/.test(s)), 'results: "1 SPAWN" / "7 SPAWNS" ' + JSON.stringify(r9.lines));
  ok(!r9.lines.some(s => /0 WAVES/.test(s)) && r9.lines.some(s => /no waves cleared yet/.test(s)), 'results: best shows "no waves cleared yet" instead of "0 WAVES SURVIVED"');
  await page.screenshot({ path: out + '/results-1920x1080.png' });
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILURES' : 'ALL BOSS/HYPE/UI CHECKS PASSED');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
