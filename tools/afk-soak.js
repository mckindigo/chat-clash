// AFK soak: node tools/afk-soak.js [rounds] [dt]
// The real update loop is stepped fast (dt clamped like the frame loop). Fake chatters use the real chat path
// (onChat(..., 'kick')) and rotate chat size per round. Checks rounds loop forever, winners, and flat memory.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), ROUNDS = +(process.argv[2] || 48), DT = +(process.argv[3] || 0.05);
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8773);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8773/?connect=0&test=off&afk=1'); await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    CC.manual(true); let seed = 4242; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    window.SOAK = { t: 0, sizes: [15, 0, 3, 1, 8, 15, 5, 0], users: [], lastRound: 1, roundStart: 0, rounds: [], mem: [], nextUserId: 0 };
    window.soakChat = () => { const S = SOAK, n = S.sizes[(CC.AFK.rounds - 1) % S.sizes.length];
      if (S.users.length !== n) { S.users = Array.from({ length: n }, () => ({ u: 'viewer' + (S.nextUserId++), next: S.t + Math.random() * 8 })); } // fresh names every round -> tests the carried leaderboard/cooldowns
      for (const us of S.users) if (S.t >= us.next) { const G = CC.G; let m;
        if (G.vote && !G.vote.by[us.u.toLowerCase()] && Math.random() < 0.7) m = '!' + (1 + Math.floor(Math.random() * 3));
        else if (G.bossReady && Math.random() < 0.8) m = '!boss';
        else if (Math.random() < 0.65) m = ['!bug', '!troll', '!spam', '!lag'][Math.floor(Math.random() * 4)];
        else m = ['lol', 'W', 'gg bot', 'KEKW', 'croww where are you'][Math.floor(Math.random() * 5)];
        CC.onChat(us.u, m, 'kick'); us.next = S.t + 5 + Math.random() * 10; } };
    window.soakRun = (secs, dt) => { const S = SOAK; let stuck = null;
      for (let i = 0; i < secs / dt; i++) { soakChat(); CC.step(dt, dt); S.t += dt;
        if (CC.AFK.rounds !== S.lastRound) { const n = S.sizes[(S.lastRound - 1) % S.sizes.length]; S.rounds.push({ round: S.lastRound, chatters: n, secs: Math.round(S.t - S.roundStart), wave: S.lastWave, chat: CC.AFK.last && CC.AFK.last.chat }); S.lastRound = CC.AFK.rounds; S.roundStart = S.t; }
        S.lastWave = CC.G.wave;
        if (S.t - S.roundStart > 4 * 3600) stuck = 'round longer than 4h'; }
      return stuck; };
  });
  const sizes = () => page.evaluate(() => ({ enemies: CC.G.enemies.length, parts: CC.G.parts.length, smoke: CC.G.smoke.length, texts: CC.G.texts.length, rings: CC.G.rings.length, feed: CC.feed.length, cooldownKeys: Object.keys(cooldowns).length, sessionKeys: Object.keys(CC.G.session).length, lastSeen: Object.keys(lastSeen).length, held: CC.heldChat.length, banners: CC.G.banners.length, queue: CC.G.chatQueue.length + CC.G.release.length }));
  const heap = async () => { await page.evaluate(() => { gc(); gc(); }); return page.evaluate(() => performance.memory.usedJSHeapSize); };
  const t0 = Date.now(); const heaps = []; let stuck = null, lastPrinted = 0;
  heaps.push({ round: 1, gameH: 0, heapMB: +((await heap()) / 1048576).toFixed(2) });
  while (true) {
    stuck = await page.evaluate(dt => soakRun(600, dt), DT);   // 10 game-minutes per chunk
    const st = await page.evaluate(() => ({ rounds: SOAK.rounds.length, t: SOAK.t, afk: CC.AFK.on, phase: CC.G.phase, paused: CC.G.paused }));
    if (st.rounds - lastPrinted >= 8 || stuck) { lastPrinted = st.rounds; heaps.push({ round: st.rounds, gameH: +(st.t / 3600).toFixed(1), heapMB: +((await heap()) / 1048576).toFixed(2), ...(await sizes()) }); }
    if (stuck || !st.afk || st.rounds >= ROUNDS || Date.now() - t0 > 25 * 60 * 1000) { console.log('state', JSON.stringify(st), stuck || ''); break; }
  }
  heaps.push({ round: 'end', gameH: +((await page.evaluate(() => SOAK.t)) / 3600).toFixed(1), heapMB: +((await heap()) / 1048576).toFixed(2), ...(await sizes()) });
  const rounds = await page.evaluate(() => SOAK.rounds);
  const by = {}; for (const r of rounds) { const b = by[r.chatters] || (by[r.chatters] = { chatters: r.chatters, rounds: 0, chatWins: 0, avgMin: 0, avgWave: 0 }); b.rounds++; b.chatWins += r.chat ? 1 : 0; b.avgMin += r.secs / 60; b.avgWave += r.wave; }
  const table = Object.values(by).map(b => ({ chatters: b.chatters, rounds: b.rounds, 'chat wins': b.chatWins, 'avg round min': +(b.avgMin / b.rounds).toFixed(1), 'avg wave': +(b.avgWave / b.rounds).toFixed(1) })).sort((a, b) => a.chatters - b.chatters);
  console.log('rounds completed:', rounds.length, ' game time:', heaps[heaps.length - 1].gameH + 'h', ' wall:', Math.round((Date.now() - t0) / 1000) + 's');
  console.table(table); console.table(heaps);
  const hs = heaps.map(h => h.heapMB), growth = hs[hs.length - 1] - hs[1];
  console.log((errs.length ? 'FAIL page errors ' + errs.join('|') : 'ok   no page errors'));
  console.log((rounds.length >= ROUNDS && !stuck ? 'ok  ' : 'FAIL') + ' looped ' + rounds.length + ' rounds unattended');
  console.log((Math.abs(growth) < 3 ? 'ok  ' : 'FAIL') + ` heap after GC: ${hs[1]} MB -> ${hs[hs.length - 1]} MB (growth ${growth.toFixed(2)} MB)`);
  fs.writeFileSync(path.join(root, 'shots/verify/afk-soak.json'), JSON.stringify({ rounds, heaps, table }, null, 1));
  await browser.close(); srv.close();
})();
