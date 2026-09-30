// Realtime checks: pause button / P / Esc freeze everything (with Kick chat "live" via a fake Pusher socket), chat is
// held and delivered on resume, no time jump on resume; desk mascot emits no smoke. Screenshots -> shots/verify/pause/
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify/pause'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8770);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const FAKE_WS = () => {  // stands in for wss://ws-us2.pusher.com so the real Kick.connect() code path runs
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
  await page.setViewport({ width: 1280, height: 720 }); const sc = 1280 / 1920;
  await page.evaluateOnNewDocument(FAKE_WS);
  await page.goto('http://localhost:8770/?test=off'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(600);
  await page.keyboard.press('Enter'); await sleep(200);
  ok(await page.evaluate(() => CC.Kick.status === 'live'), 'Kick chat "live" through the real connect code (fake socket)');
  // set up a busy moment: wave running, enemies walking, vote running, hazard, crow boss out, a cooldown ticking
  await page.evaluate(() => { CC.G.gold = 900; CC.build(1, 'laser'); CC.build(4, 'slow'); CC.startWave(); CC.forceVote(); CC.unlockCrowBoss(); CC.deployCrowBoss(); });
  await page.evaluate(() => { for (let i = 0; i < 5; i++) kickSay('kick_user' + i, ['!bug', '!troll', '!spam', '!lag', '!bug'][i]); kickSay('hypeguy', 'LETS GO'); });
  await sleep(2500);
  const snap = () => page.evaluate(() => { const G = CC.G; return { waveT: +G.waveT.toFixed(3), voteT: G.vote ? +G.vote.t.toFixed(3) : null, voteClock: +G.voteClock.toFixed(3), hype: +G.hype.toFixed(3), gold: +G.gold.toFixed(2), crowT: +G.crowBoss.t.toFixed(3), crowCd: +G.crowBoss.cd.toFixed(3), time: +G.time.toFixed(3), enemies: G.enemies.length, ed: G.enemies.map(e => e.d.toFixed(1)).join(','), towerCd: G.towers.filter(Boolean).map(t => t.cd.toFixed(2)).join(','), cooldown0: CC.G && 0 }; });
  // pause with a REAL click on the top-bar pause button
  await page.mouse.click(1762 * sc, 46 * sc); await sleep(100);
  ok(await page.evaluate(() => CC.G.paused), 'top-bar pause button pauses');
  const a = await snap();
  await page.evaluate(() => { kickSay('late_viewer', '!troll'); kickSay('kick_user0', '!1'); kickSay('chatty', 'is he afk?'); });
  await sleep(1500); await page.screenshot({ path: out + '/paused-1280x720.png' });
  await page.setViewport({ width: 1920, height: 1080 }); await sleep(300); await page.screenshot({ path: out + '/paused-1920x1080.png' }); await page.setViewport({ width: 1280, height: 720 });
  await sleep(3500);
  const b = await snap();
  const same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, 'after 5s paused, nothing moved (wave/vote/hype/gold/crow boss/towers/enemies): ' + (same ? JSON.stringify(a).slice(0, 160) + '...' : JSON.stringify({ a, b })));
  const held = await page.evaluate(() => ({ held: CC.heldChat.length, late: CC.G.enemies.filter(e => e.user === 'late_viewer').length }));
  ok(held.held === 3 && held.late === 0, 'Kick chat during pause is held, not spawned: ' + JSON.stringify(held));
  await page.keyboard.press('b'); ok(await page.evaluate(() => CC.crowBossState() === 'paused'), 'Crow Boss cannot be used while paused');
  // resume with P and check for time jump
  const t0 = await page.evaluate(() => ({ time: CC.G.time, now: performance.now() }));
  await page.keyboard.press('p'); await sleep(250);
  const r = await page.evaluate(t0 => ({ adv: CC.G.time - t0.time, wall: (performance.now() - t0.now) / 1000, paused: CC.G.paused, late: CC.G.enemies.filter(e => e.user === 'late_viewer').length + CC.G.chatQueue.filter(q => q.user === 'late_viewer').length, held: CC.heldChat.length }), t0);
  ok(!r.paused && r.adv <= r.wall + 0.06 && r.adv < 0.5, `resume with P: game advanced ${r.adv.toFixed(3)}s over ${r.wall.toFixed(3)}s wall time (no jump after 5s pause)`);
  ok(r.held === 0 && r.late === 1, 'held chat delivered on resume (late_viewer !troll spawned/queued)');
  // Esc also pauses/resumes; cooldowns frozen on game clock
  await page.evaluate(() => kickSay('cd_test', '!bug')); await sleep(100);
  await page.keyboard.press('Escape'); await sleep(3000);
  await page.keyboard.press('Escape'); await sleep(100);
  await page.evaluate(() => kickSay('cd_test', '!bug')); await sleep(50);
  const cd = await page.evaluate(() => { const f = CC.feed.filter(x => x.user === 'cd_test').map(x => x.text); return f[f.length - 1]; });
  ok(/cooldown (19|20)s/.test(cd), 'Esc pauses/resumes; chatter cooldown did not tick during the 3s pause: "' + cd + '"');
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  // desk close-up: several seconds of hits, low chill, crow boss flying out/back -> zero smoke near the mascot
  await page.setViewport({ width: 1920, height: 1080 }); await page.evaluate(() => { CC.newGame(); CC.G.phase = 'wave'; CC.G.waveDur = 999; CC.G.chill = 60; CC.G.crowBoss.cd = 0; CC.deployCrowBoss(); });
  let maxDeskSmoke = 0, frames = 0;
  for (let i = 0; i < 16; i++) {
    await page.evaluate(i => { if (i % 3 === 0) { CC.spawn(['bug', 'troll', 'lag'][i % 3], 'hitter' + i); const e = CC.G.enemies[CC.G.enemies.length - 1]; e.d = PATH.len - 5; } CC.G.chill = Math.max(CC.G.chill, 20); if (i === 8) CC.G.chill = 25; }, i);
    await sleep(400);
    const s = await page.evaluate(() => CC.G.smoke.filter(p => p.x > 1480).length); maxDeskSmoke = Math.max(maxDeskSmoke, s); frames++;
    if (i % 4 === 1) await page.screenshot({ path: `${out}/desk-closeup-${String(i).padStart(2, '0')}.png`, clip: { x: 1480, y: 420, width: 440, height: 620 } });
  }
  ok(maxDeskSmoke === 0, `desk close-up over ${frames * 0.4}s with desk hits + low chill + Crow Boss: smoke puffs near the mascot = ${maxDeskSmoke}`);
  await browser.close(); srv.close(); console.log(fails ? fails + ' FAILURES' : 'ALL PAUSE/SMOKE CHECKS PASSED'); process.exitCode = fails ? 1 : 0;
})();
