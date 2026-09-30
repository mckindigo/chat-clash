// Economy sim: node tools/econ-sim.js [dir-with-index.html] [seeds]
// Chatters use the real chat path. A "casual" player checks the shop every 8s and buys ONE thing if affordable
// (next tower until 4, then the cheapest of upgrade / next tower). Reports banked (unspent) gold and what is owned
// at the end of wave 5, plus gold/s, through the end of wave 10.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..')), SEEDS = +(process.argv[3] || 5);
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8769);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://localhost:8769/?connect=0&test=off'); await new Promise(r => setTimeout(r, 400));
  const res = await page.evaluate(SEEDS => {
    CC.manual(true); const out = [];
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; Math.random = rnd;
    const cost = t => typeof towerCost === 'function' ? towerCost(t) : CC.DATA.towers[t].cost;
    const PADS = [1, 3, 4, 5, 0, 7, 2, 6], TYPES = ['hammer', 'laser', 'slow', 'cannon', 'laser', 'hammer', 'cannon', 'laser'];
    const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : null; };
    for (const n of [0, 1, 3, 15]) {
      const runs = [];
      for (let s = 1; s <= SEEDS; s++) {
        seed = s * 7919 + n; CC.settings.smallChat = 'auto'; CC.settings.testMode = 'off'; CC.newGame();
        if (typeof lastSeen !== 'undefined') for (const k in lastSeen) delete lastSeen[k];
        const users = Array.from({ length: n }, (_, i) => ({ u: 'viewer' + i, next: 1 + rnd() * 8 }));
        const r = { banks: [], w5: null, t4: null, gps: 0, lost: null, earned: 0, wb: {} };
        let built = 0, ups = 0, t = 0, shop = 8, lastGold = CC.G.gold; const dt = 1 / 20;
        while (CC.G.wave <= 10 && t < 1800) {
          const G = CC.G;
          for (const us of users) if (t >= us.next) { const m = G.vote && rnd() < 0.5 ? '!' + (1 + Math.floor(rnd() * 3)) : G.bossReady && rnd() < 0.8 ? '!boss' : rnd() < 0.6 ? ['!bug', '!troll', '!spam', '!lag'][Math.floor(rnd() * 4)] : 'lol'; CC.onChat(us.u, m, 'kick'); us.next = t + 6 + rnd() * 10; }
          const w0 = G.wave; CC.step(dt, dt); t += dt;
          if (G.gold > lastGold) r.earned += G.gold - lastGold;
          if (G.phase === 'defeat' || G.phase === 'results') { r.lost = G.wave; break; }
          if (Math.abs(t - 30) < dt / 2) r.gps = CC.goldPerSec ? CC.goldPerSec() : CC.DATA.economy.trickle;
          if (Math.floor(t) !== Math.floor(t - dt)) r.banks.push(G.gold);
          if (G.wave > w0) r.wb[w0] = Math.round(G.gold);
          if (w0 === 5 && G.wave === 6) r.w5 = { towers: built, ups, bank: Math.round(G.gold), t: Math.round(t) };
          if ((shop -= dt) <= 0) { shop = 8;
            const up = G.towers.map((tw, i) => tw && tw.level < 3 ? { i, c: upCost(tw) } : null).filter(Boolean).sort((a, b) => a.c - b.c)[0];
            const nc = built < 8 ? cost(TYPES[built]) : Infinity;
            if (built < 4 || !up || nc <= up.c) { if (built < 8 && G.gold >= nc && CC.build(PADS[built], TYPES[built])) { built++; if (built === 4) r.t4 = Math.round(t); } }
            else if (G.gold >= up.c) { CC.upgrade(up.i); ups++; }
          }
          lastGold = G.gold;
        }
        runs.push(r);
      }
      const all = runs.flatMap(r => r.banks.slice(0, 180)), all2 = runs.flatMap(r => r.banks);
      const avg = f => { const v = runs.map(f).filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'; };
      out.push({ chatters: n, 'trickle g/s': +(+runs[0].gps).toFixed(2), 'end of wave 5 @s': avg(r => r.w5 && r.w5.t), 'towers @w5': avg(r => r.w5 && r.w5.towers), 'upgrades @w5': avg(r => r.w5 && r.w5.ups), 'bank @w5': avg(r => r.w5 && r.w5.bank), '4th tower @s': avg(r => r.t4), 'bank median (first 3 min)': q(all, 0.5), 'bank p90 (first 3 min)': q(all, 0.9), 'bank median (to w10)': q(all2, 0.5), 'bank p90 (to w10)': q(all2, 0.9), 'bank max (to w10)': q(all2, 1), 'bank after wave 1..10': Array.from({ length: 10 }, (_, i) => { const v = runs.map(r => r.wb[i + 1]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-'; }).join(' '), 'lost before w10': runs.filter(r => r.lost).length + '/' + SEEDS + (runs.some(r => r.lost) ? ' (w' + runs.filter(r => r.lost).map(r => r.lost).join(',') + ')' : '') });
    }
    return out;
  }, SEEDS);
  console.table(res);
  await browser.close(); srv.close();
})();
