// Tower bench: node tools/tower-bench.js [dir]
// Each tower type ALONE on each pad at level 1, 60s of a fixed enemy stream. Reports damage dealt (capped at the
// enemy's remaining HP, i.e. no overkill), per tower and per 100 gold. Stream "tank" = trolls (sustained DPS),
// "mix" = the normal bug/spam/troll/lag mix at wave 6 HP.
const puppeteer = require('puppeteer-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); }); }).listen(8795);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://localhost:8795/?connect=0&test=off'); await new Promise(r => setTimeout(r, 400));
  const res = await page.evaluate(() => {
    CC.manual(true); const out = []; let seed = 5; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const oD = dmgEnemy; let acc = 0; window.dmgEnemy = function (e, amt, src) { if (!e.dead) acc += Math.min(amt, Math.max(0, e.hp)); return oD.apply(this, arguments); };
    for (const stream of ['tank', 'mix']) for (const type of Object.keys(CC.DATA.towers)) {
      const row = { stream, type }; let tot = 0;
      for (let pi = 0; pi < CC.DATA.pads.length; pi++) {
        seed = 5 + pi; CC.settings.npcWaves = false; CC.newGame(); const G = CC.G; G.gold = 9999; G.wave = 6; build(pi, type);
        G.phase = 'wave'; G.waveDur = 999; G.waveT = 0; acc = 0; let t = 0, next = 0, i = 0;
        const seq = stream === 'tank' ? ['troll'] : ['bug', 'bug', 'spam', 'troll', 'bug', 'lag', 'bug', 'spam'];
        while (t < 60) { if (t >= next) { spawnEnemy(seq[i++ % seq.length], 'x', true, 'npc'); next = t + (stream === 'tank' ? 2.5 : 1.0); } G.chill = 100; CC.step(0.05, 0.05); t += 0.05; }
        row['p' + pi] = Math.round(acc); tot += acc;
      }
      row.avg = Math.round(tot / CC.DATA.pads.length); row.per100g = Math.round(row.avg / CC.DATA.towers[type].cost * 100); out.push(row);
    }
    return out;
  });
  console.table(res); await browser.close(); srv.close();
})();
