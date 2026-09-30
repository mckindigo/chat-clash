// Realtime AFK checks (real frame loop, fake live Kick socket). Screenshots -> shots/verify/afk/
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify/afk'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8774);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const FAKE_WS = () => {
  class FakeWS { constructor() { this.readyState = 0; window.__ws = this; setTimeout(() => { this.readyState = 1; this.emit({ event: 'pusher:connection_established', data: '{}' }); }, 50); }
    emit(m) { this.onmessage && this.onmessage({ data: JSON.stringify(m) }); }
    send(s) { const m = JSON.parse(s); if (m.event === 'pusher:subscribe') setTimeout(() => this.emit({ event: 'pusher_internal:subscription_succeeded', data: '{}' }), 50); }
    close() { this.readyState = 3; } }
  window.WebSocket = FakeWS;
  window.kickSay = (u, c) => window.__ws.emit({ event: 'App\\Events\\ChatMessageEvent', data: JSON.stringify({ sender: { username: u }, content: c }) });
  window.LOG = { bot: 0 }; addEventListener('load', () => { const oc = window.onChat; window.onChat = function (u, m, src) { if (src === 'bot') LOG.bot++; return oc.apply(this, arguments); }; });
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1920, height: 1080 }); await page.evaluateOnNewDocument(FAKE_WS);
  await page.goto('http://localhost:8774/?test=off'); await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8774/?afk=1&test=off'); await sleep(600);
  const s0 = await page.evaluate(() => ({ afk: CC.AFK.on, title: CC.view.titleT, live: CC.Kick.status, test: CC.settings.testMode }));
  ok(s0.afk && s0.title <= 0 && s0.live === 'live', '?afk=1 starts AFK, skips the title card, Kick live ' + JSON.stringify(s0));
  await sleep(9000);
  const b = await page.evaluate(() => ({ towers: CC.G.towers.filter(Boolean).map(t => t.type), phase: CC.G.phase }));
  ok(b.towers.length >= 1, 'bot builds towers on its own (200g start buys 1 at new prices): ' + b.towers.join(','));
  await page.evaluate(() => { kickSay('Moonpie_77', '!troll'); kickSay('crowwfan', '!spam'); kickSay('lurker', '!1'); });
  await sleep(6000);
  const k = await page.evaluate(() => ({ phase: CC.G.phase, troll: CC.G.enemies.filter(e => e.user === 'Moonpie_77').length + CC.G.chatQueue.filter(q => q.user === 'Moonpie_77').length, session: Object.keys(CC.G.session) }));
  ok(k.troll >= 1 || k.session.includes('Moonpie_77'), 'real Kick chat still spawns vs the bot ' + JSON.stringify(k));
  await page.screenshot({ path: out + '/afk-1920x1080.png' });
  ok(await page.evaluate(() => LOG.bot === 0), 'Test mode Off respected in AFK: 0 bot chatters in 15s');
  // loss -> results -> auto restart (real time)
  await page.evaluate(() => { CC.G.session['Moonpie_77'] = CC.G.session['Moonpie_77'] || { dmg: 40, spawns: 1 }; CC.G.dmgChat = 50; defeat(); });
  await sleep(4200); const r1 = await page.evaluate(() => ({ phase: CC.G.phase, rounds: CC.AFK.rounds, chatWins: CC.AFK.chatWins }));
  ok(r1.phase === 'results' && r1.chatWins === 1, 'loss -> results screen, chat credited with the win ' + JSON.stringify(r1));
  await sleep(2000); await page.screenshot({ path: out + '/afk-results-countdown-1920x1080.png' });
  await sleep(11000);
  const r2 = await page.evaluate(() => ({ phase: CC.G.phase, rounds: CC.AFK.rounds, board: Object.keys(CC.G.session) }));
  ok(r2.rounds === 2 && r2.phase === 'build' && r2.board.includes('Moonpie_77'), 'auto-restarts ~12s after results, leaderboard carried: ' + JSON.stringify(r2));
  // control back: any key
  await page.keyboard.press('x'); ok(await page.evaluate(() => !CC.AFK.on && !CC.G.paused), 'any key returns control (and does not pause)');
  await page.keyboard.press('a'); ok(await page.evaluate(() => CC.AFK.on), 'A hotkey turns AFK on');
  await page.mouse.click(900, 600); ok(await page.evaluate(() => !CC.AFK.on && CC.view.sel === -1), 'any click returns control (click is not used as a game action)');
  await page.mouse.click(1500, 46); ok(await page.evaluate(() => CC.AFK.on), 'top-bar AFK button turns it on');
  await page.mouse.click(1500, 46); ok(await page.evaluate(() => !CC.AFK.on), 'top-bar AFK button turns it off');
  await page.keyboard.press('s'); await sleep(150); await page.click('#sAfk'); ok(await page.evaluate(() => CC.AFK.on), 'Settings checkbox turns it on');
  await page.click('#sAfk'); ok(await page.evaluate(() => !CC.AFK.on), 'Settings checkbox turns it off'); await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('s');
  // pause interplay
  await page.keyboard.press('p'); const p1 = await page.evaluate(() => CC.G.paused);
  await page.evaluate(() => CC.setAfk(true)); const p2 = await page.evaluate(() => ({ paused: CC.G.paused, afk: CC.AFK.on }));
  ok(p1 && !p2.paused && p2.afk, 'turning AFK on while paused unpauses (bot needs the game running)');
  await page.keyboard.press('p'); const p3 = await page.evaluate(() => ({ paused: CC.G.paused, afk: CC.AFK.on }));
  await page.keyboard.press('p'); const p4 = await page.evaluate(() => CC.G.paused);
  ok(!p3.paused && !p3.afk && p4, 'P while AFK just hands back control; the next P pauses normally');
  await page.keyboard.press('p');
  // throttled / frozen tab: no time jump
  await page.evaluate(() => CC.setAfk(true));
  const c = await page.target().createCDPSession();
  const f0 = await page.evaluate(() => ({ t: CC.G.time, now: performance.now() }));
  await c.send('Page.setWebLifecycleState', { state: 'frozen' }); await sleep(6000); await c.send('Page.setWebLifecycleState', { state: 'active' }); await sleep(300);
  const f1 = await page.evaluate(f0 => ({ adv: CC.G.time - f0.t, wall: (performance.now() - f0.now) / 1000 }), f0);
  ok(f1.adv < 1.0, `frozen tab for 6s: game advanced only ${f1.adv.toFixed(2)}s (dt clamped, no catch-up jump)`);
  await c.send('Emulation.setCPUThrottlingRate', { rate: 20 }); const g0 = await page.evaluate(() => ({ t: CC.G.time, now: performance.now(), rounds: CC.AFK.rounds })); await sleep(5000);
  const g1 = await page.evaluate(g0 => ({ adv: CC.G.time - g0.t, wall: (performance.now() - g0.now) / 1000, afk: CC.AFK.on }), g0); await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok(g1.adv <= g1.wall + 0.1 && g1.afk, `20x CPU throttle: game ${g1.adv.toFixed(2)}s over ${g1.wall.toFixed(2)}s wall, still AFK`);
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  await browser.close(); srv.close(); console.log(fails ? fails + ' FAILURES' : 'ALL AFK CHECKS PASSED'); process.exitCode = fails ? 1 : 0;
})();
