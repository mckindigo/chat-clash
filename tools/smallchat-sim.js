// Small-chat sim: node tools/smallchat-sim.js [minutes]
// N chatters talk through the real chat path (onChat(..., 'kick')): commands, chatter, votes, !boss when unlocked.
// A simple auto-builder plays Croww. Reports run length, !boss reachability, votes, gold, per chat size and mode.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), MIN = +(process.argv[2] || 20), SEEDS = +(process.argv[3] || 4);
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8771);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://localhost:8771/?connect=0&test=off'); await new Promise(r => setTimeout(r, 400));
  const res = await page.evaluate((MIN, SEEDS) => {
    CC.manual(true); const out = [];
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; Math.random = rnd;
    const V = { votes: 0, resolved: 0, byVote: 0, random: 0, bosses: 0 };
    const ev = window.endVote; window.endVote = function () { const v = CC.G.vote; const tot = v.counts.reduce((a, b) => a + b, 0); V.resolved++; if (tot) V.byVote++; else V.random++; return ev.apply(this, arguments); };
    const se = window.spawnEnemy; window.spawnEnemy = function (type) { if (type === 'boss') V.bosses++; return se.apply(this, arguments); };
    const PADS = [1, 3, 4, 5, 0, 7, 2, 6], TYPES = ['hammer', 'laser', 'slow', 'cannon', 'laser', 'hammer', 'cannon', 'laser'];
    for (const mode of ['off', 'auto']) for (const n of [0, 1, 3, 15]) {
      const runs = [];
      for (let s = 1; s <= SEEDS; s++) {
        seed = s * 104729 + n; CC.settings.smallChat = mode; CC.settings.testMode = 'off'; CC.settings.npcWaves = true; CC.settings.difficulty = 'normal'; CC.newGame();
        for (const k in lastSeen) delete lastSeen[k];
        Object.assign(V, { resolved: 0, byVote: 0, random: 0, bosses: 0 });
        const users = Array.from({ length: n }, (_, i) => ({ u: 'viewer' + i, next: 1 + rnd() * 10 }));
        const r = { len: null, wave: 0, unlocks: 0, firstUnlock: null, bosses: 0, votes: 0, byVote: 0, random: 0, gps: 0, cd: 0, spam: 0 };
        let built = 0, t = 0, wasReady = false; const dt = 1 / 20;
        while (t < MIN * 60) {
          const G = CC.G;
          for (const us of users) if (t >= us.next) {
            let m;
            if (G.vote && !G.vote.by[us.u.toLowerCase()] && rnd() < 0.7) m = '!' + (1 + Math.floor(rnd() * 3));
            else if (G.bossReady && rnd() < 0.8) m = '!boss';
            else if (rnd() < 0.6) m = ['!bug', '!troll', '!spam', '!lag'][Math.floor(rnd() * 4)];
            else m = ['lol', 'W', 'gg', 'croww pls', 'KEKW'][Math.floor(rnd() * 5)];
            CC.onChat(us.u, m, 'kick'); us.next = t + 6 + rnd() * 10;   // a message every 6-16s per chatter
          }
          CC.step(dt, dt); t += dt;
          if (G.bossReady && !wasReady) { r.unlocks++; if (r.firstUnlock == null) r.firstUnlock = Math.round(t); } wasReady = G.bossReady;
          if (Math.abs(t - 60) < dt / 2) { r.gps = CC.goldPerSec(); r.cd = CC.effCooldown(); r.spam = CC.spamCount(CC.smallChatK()); }
          if (G.phase === 'defeat' || G.phase === 'results') { r.len = Math.round(t); break; }
          if (built < 8) { if (G.gold >= CC.DATA.towers[TYPES[built]].cost + (built >= 4 ? 40 : 0) && CC.build(PADS[built], TYPES[built])) built++; }
          if (built >= 4) { const c = G.towers.map((tw, i) => tw && tw.level < 3 ? { i, c: upCost(tw) } : null).filter(Boolean).sort((a, b) => a.c - b.c)[0]; if (c && G.gold >= c.c + 60) CC.upgrade(c.i); }
        }
        Object.assign(r, { wave: CC.G.wave, bosses: V.bosses, votes: V.resolved, byVote: V.byVote, random: V.random }); if (r.len == null) r.len = MIN * 60;
        runs.push(r);
      }
      const avg = k => { const v = runs.map(r => r[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : '-'; };
      out.push({ mode, chatters: n, 'cooldown s': runs[0].cd, 'spam x': runs[0].spam, 'gold/s': Math.round(runs[0].gps * 100) / 100, 'run length s': avg('len'), 'survived cap': runs.filter(r => r.len >= MIN * 60).length + '/' + SEEDS, 'wave reached': avg('wave'), 'boss unlocks/run': avg('unlocks'), 'first unlock s': avg('firstUnlock'), 'bosses summoned': avg('bosses'), 'votes resolved': avg('votes'), 'decided by votes': avg('byVote'), 'random (0 votes)': avg('random') });
    }
    return out;
  }, MIN, SEEDS);
  console.table(res);
  await browser.close(); srv.close();
})();
