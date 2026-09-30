// Economy sim: node tools/econ-sim.js  -> gold/s and when the 4th tower / upgrades become affordable, per chat size.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8769);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.goto('http://localhost:8769/?connect=0&test=off'); await new Promise(r => setTimeout(r, 400));
  const res = await page.evaluate(() => {
    CC.manual(true); const out = [];
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; Math.random = rnd;
    const PADS = [1, 3, 4, 5, 0, 7, 2, 6], TYPES = ['hammer', 'laser', 'slow', 'cannon', 'laser', 'hammer', 'cannon', 'laser'];
    for (const mode of ['off', 'auto']) for (const n of [0, 1, 3, 15]) {
      const runs = [];
      for (let s = 1; s <= 5; s++) {
        seed = s * 7919; CC.settings.smallChat = mode; CC.settings.testMode = 'off'; CC.newGame();
        for (const k in lastSeen) delete lastSeen[k];
        const users = Array.from({ length: n }, (_, i) => ({ u: 'viewer' + i, next: 2 + rnd() * 20 }));
        const r = { gps0: 0, t4: null, up1: null, up3: null, gold300: 0, wave: 0, lost: null };
        let built = 0, ups = 0, earned = 0, lastGold = CC.G.gold, t = 0;
        const dt = 1 / 30;
        while (t < 300) {
          for (const us of users) if (t >= us.next) { const cmd = ['!bug', '!troll', '!spam', '!lag', 'lol', 'W'][Math.floor(rnd() * 6)]; CC.onChat(us.u, cmd, 'kick'); us.next = t + 21 + rnd() * 15; }
          CC.step(dt, dt); t += dt;
          const G = CC.G; if (G.gold > lastGold) earned += G.gold - lastGold;
          if (G.phase === 'defeat' || G.phase === 'results') { r.lost = r.lost || Math.round(t); break; }
          if (Math.abs(t - 20) < dt / 2) r.gps0 = CC.goldPerSec();
          // spend: towers 1-4 first, then upgrades (cheapest first), then more towers
          if (built < 4) { if (G.gold >= CC.DATA.towers[TYPES[built]].cost && CC.build(PADS[built], TYPES[built])) { built++; if (built === 4) r.t4 = Math.round(t); } }
          else {
            const cand = G.towers.map((tw, i) => tw && tw.level < 3 ? { i, c: upCost(tw) } : null).filter(Boolean).sort((a, b) => a.c - b.c)[0];
            if (cand && G.gold >= cand.c) { CC.upgrade(cand.i); ups++; if (ups === 1) r.up1 = Math.round(t); if (ups === 3) r.up3 = Math.round(t); }
          }
          lastGold = G.gold;
        }
        r.gold300 = Math.round(earned + 0); r.wave = CC.G.wave; runs.push(r);
      }
      const avg = k => { const v = runs.map(r => r[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
      out.push({ mode, chatters: n, 'gold/s trickle': Math.round(runs[0].gps0 * 100) / 100, '4th tower @s': avg('t4'), '1st upgrade @s': avg('up1'), '3rd upgrade @s': avg('up3'), 'gold earned in 300s': avg('gold300'), 'wave @300s': avg('wave'), losses: runs.filter(r => r.lost).length + '/5' });
    }
    return out;
  });
  console.table(res);
  await browser.close(); srv.close();
})();
