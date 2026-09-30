// Economy sim: node tools/econ-sim.js [dir-with-index.html] [seeds] [lastWave=12]
// Chatters use the real chat path (onChat). Scenarios: 0 / 1 / 3 / 15 casual chatters (type every 6-16s) and
// "20 spam": 20 chatters who type a command the moment their cooldown is up, !boss whenever it is unlocked, and all
// vote on every hazard. A "casual" streamer checks the shop every 8s and buys ONE thing if affordable (next tower
// until 4, then the cheapest of upgrade / next tower, all 5 levels), and deploys the Crow Boss when it is up.
// Reports banked (unspent) gold, what is owned at the end of wave 5, chill, bosses and losses through lastWave.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..')), SEEDS = +(process.argv[3] || 5), LASTW = +(process.argv[4] || 12);
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8769);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://localhost:8769/?connect=0&test=off'); await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await new Promise(r => setTimeout(r, 400));
  // OVR='{"ai":{"budgetLate":3}}' deep-merges into DATA before the run (for tuning without rebuilding)
  const res = await page.evaluate((SEEDS, LASTW, OVR) => {
    const merge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) merge(a[k], b[k]); else a[k] = b[k]; } }; if (OVR) merge(CC.DATA, JSON.parse(OVR));
    CC.manual(true); const out = [];
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; Math.random = rnd;
    const cost = t => typeof towerCost === 'function' ? towerCost(t) : CC.DATA.towers[t].cost;
    const maxL = CC.DATA.upgrade.maxLevel;
    const PADS = [1, 3, 4, 5, 0, 7, 2, 6], TYPES = ['hammer', 'laser', 'slow', 'cannon', 'laser', 'hammer', 'cannon', 'laser'];
    const CMDS = ['!bug', '!troll', '!spam', '!lag'];
    const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : null; };
    let curR = null; const oS = spawnEnemy; window.spawnEnemy = function (type, user, isBot) { if (type === 'boss' && !isBot && curR) { curR.bosses++; if (curR.firstBoss == null) curR.firstBoss = CC.G.wave; } return oS.apply(this, arguments); };
    for (const sc of [0, 1, 3, 15, '20 spam']) {
      const spam = sc === '20 spam', n = spam ? 20 : sc, runs = [];
      for (let s = 1; s <= SEEDS; s++) {
        seed = s * 7919 + n + (spam ? 5 : 0); CC.settings.smallChat = 'auto'; CC.settings.testMode = 'off'; CC.newGame();
        if (typeof lastSeen !== 'undefined') for (const k in lastSeen) delete lastSeen[k];
        const users = Array.from({ length: n }, (_, i) => ({ u: 'viewer' + i, next: spam ? rnd() * 2 : 1 + rnd() * 8, voted: null }));
        const r = curR = { banks: [], w5: null, t4: null, gps: 0, lost: null, wb: {}, minChill: 100, chillW: {}, bosses: 0, firstBoss: null };
        let built = 0, ups = 0, t = 0, shop = 8; const dt = 1 / 20;
        while (CC.G.wave <= LASTW && t < 3600) {
          const G = CC.G;
          for (const us of users) {
            if (spam && G.vote && us.voted !== G.vote && rnd() < dt / 4) { us.voted = G.vote; CC.onChat(us.u, '!' + (1 + Math.floor(rnd() * 3)), 'kick'); }
            if (t >= us.next) {
              let m;
              if (spam) { m = G.bossReady && rnd() < 0.5 ? '!boss' : CMDS[Math.floor(rnd() * 4)]; }
              else m = G.vote && rnd() < 0.5 ? '!' + (1 + Math.floor(rnd() * 3)) : G.bossReady && rnd() < 0.8 ? '!boss' : rnd() < 0.6 ? CMDS[Math.floor(rnd() * 4)] : 'lol';
              CC.onChat(us.u, m, 'kick');
              const cdEnd = (typeof cooldowns !== 'undefined' && cooldowns[us.u]) || 0;
              us.next = spam ? Math.max(t + 0.5, t + (cdEnd - G.time)) + rnd() * 1.0 : t + 6 + rnd() * 10;
            }
          }
          const w0 = G.wave; CC.step(dt, dt); t += dt;
          if (G.phase === 'defeat' || G.phase === 'results') { r.lost = G.wave; break; }
          r.minChill = Math.min(r.minChill, G.chill); r.chillW[G.wave] = Math.min(r.chillW[G.wave] ?? 100, G.chill);
          if (Math.abs(t - 30) < dt / 2) r.gps = CC.goldPerSec ? CC.goldPerSec() : CC.DATA.economy.trickle;
          if (Math.floor(t) !== Math.floor(t - dt)) r.banks.push(G.gold);
          if (G.wave > w0) r.wb[w0] = Math.round(G.gold);
          if (w0 === 5 && G.wave === 6) r.w5 = { towers: built, ups, bank: Math.round(G.gold), t: Math.round(t) };
          if (G.phase === 'wave' && CC.crowBossState && CC.crowBossState() === 'ready' && (G.enemies.length >= 8 || G.chill < 60)) CC.deployCrowBoss();
          if ((shop -= dt) <= 0) { shop = 8;
            const up = G.towers.map((tw, i) => tw && tw.level < maxL ? { i, c: upCost(tw) } : null).filter(x => x && x.c > 0).sort((a, b) => a.c - b.c)[0];
            const nc = built < 8 ? cost(TYPES[built]) : Infinity;
            if (built < 4 || !up || nc <= up.c) { if (built < 8 && G.gold >= nc && CC.build(PADS[built], TYPES[built])) { built++; if (built === 4) r.t4 = Math.round(t); } }
            else if (G.gold >= up.c) { CC.upgrade(up.i); ups++; }
          }
        }
        runs.push(r);
      }
      const all = runs.flatMap(r => r.banks);
      const avg = f => { const v = runs.map(f).filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'; };
      const perW = f => Array.from({ length: LASTW }, (_, i) => { const v = runs.map(r => f(r, i + 1)).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-'; }).join(' ');
      out.push({ chatters: sc, 'g/s': +(+runs[0].gps).toFixed(2), 'w5 end @s': avg(r => r.w5 && r.w5.t), 'towers @w5': avg(r => r.w5 && r.w5.towers), 'ups @w5': avg(r => r.w5 && r.w5.ups),
        'bank median': q(all, 0.5), 'bank p90': q(all, 0.9), 'bank max': q(all, 1), 'bank after wave 1..': perW((r, w) => r.wb[w]), 'min chill per wave 1..': perW((r, w) => r.chillW[w]),
        'bosses/run': avg(r => r.bosses), 'first boss wave': avg(r => r.firstBoss), ['lost before w' + (LASTW + 1)]: runs.filter(r => r.lost).length + '/' + SEEDS + (runs.some(r => r.lost) ? ' (w' + runs.filter(r => r.lost).map(r => r.lost).join(',') + ')' : '') });
    }
    return out;
  }, SEEDS, LASTW, process.env.OVR || '');
  if (process.env.JSON) console.log(JSON.stringify(res)); else for (const r of res) { console.log('--- chatters: ' + r.chatters); for (const k in r) if (k !== 'chatters') console.log('   ' + k.padEnd(24) + r[k]); }
  await browser.close(); srv.close();
})();
