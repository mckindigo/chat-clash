// Screenshots of the new art + Crow Boss at 1920x1080 -> shots/verify/
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200); r.end(d); } }); }).listen(8767);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:8767/index.html?connect=0&test=off'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => document.fonts.ready); await sleep(900);
  ok(await page.evaluate(() => artReady('mascot') && artReady('logo') && CC.view.titleT > 0), 'art embedded + title card showing');
  await page.screenshot({ path: out + '/title-1920x1080.png' });
  await page.keyboard.press('Enter'); await sleep(1000);
  // gameplay: a few towers + chat enemies
  await page.evaluate(() => { CC.G.gold = 1000; CC.build(1, 'laser'); CC.build(3, 'cannon'); CC.build(4, 'slow'); CC.build(7, 'hammer'); CC.startWave(); ['bug', 'troll', 'spam', 'lag'].forEach((t, i) => CC.onChat('viewer' + i, '!' + t, 'kick')); });
  await sleep(5000);
  ok(await page.evaluate(() => CC.crowBossState() === 'locked'), 'Crow Boss starts locked');
  await page.screenshot({ path: out + '/gameplay-1920x1080.png' });
  // unlock the real way: clear wave 5
  await page.evaluate(() => { CC.G.wave = 5; CC.G.waveT = CC.G.waveDur; CC.G.enemies = []; CC.G.release = []; });
  await sleep(700);
  const un = await page.evaluate(() => ({ st: CC.crowBossState(), ls: localStorage.getItem('chatclash.crowBoss'), banner: CC.G.banners.map(b => b.title) }));
  ok(un.st === 'ready' && un.ls === '1' && un.banner.includes('CROW BOSS UNLOCKED'), 'clearing wave 5 unlocks + persists ' + JSON.stringify(un));
  await page.screenshot({ path: out + '/crowboss-unlocked-1920x1080.png' });
  await page.reload(); await sleep(400); await page.keyboard.press('Enter'); await sleep(900);
  ok(await page.evaluate(() => CC.crowBossState() === 'ready'), 'unlock survives reload');
  await page.evaluate(() => { CC.G.gold = 1000; CC.build(1, 'laser'); CC.build(4, 'slow'); CC.startWave(); for (let i = 0; i < 6; i++) CC.onChat('kicker' + i, '!' + ['bug', 'troll', 'spam'][i % 3], 'kick'); });
  await sleep(3500);
  await page.mouse.click(1535 + 175, 362 + 31); // the CROW BOSS button
  await sleep(2600);
  const cb = await page.evaluate(() => ({ st: CC.crowBossState(), puffs: CC.G.crowBoss.puffs }));
  ok(cb.st === 'active' && cb.puffs >= 1, 'button deploys Crow Boss, smoke rings fired ' + JSON.stringify(cb));
  await page.screenshot({ path: out + '/crowboss-deployed-1920x1080.png' });
  await sleep(11000);
  ok(await page.evaluate(() => CC.crowBossState() === 'cooldown'), 'leaves after 12s, then cooldown');
  await page.keyboard.press('b'); ok(await page.evaluate(() => CC.crowBossState() === 'cooldown'), 'B during cooldown does nothing');
  // clean mode: coffee mug version
  await page.evaluate(() => { CC.settings.clean = true; CC.G.crowBoss.cd = 0; }); await page.keyboard.press('b'); await sleep(2200);
  await page.screenshot({ path: out + '/crowboss-clean-mode-1920x1080.png' });
  await page.evaluate(() => { CC.settings.clean = false; });
  // loss
  await page.evaluate(() => { CC.G.chill = 3; CC.spawn('troll', 'finisher'); const e = CC.G.enemies[CC.G.enemies.length - 1]; e.d = PATH.len - 1; }); await sleep(1500);
  ok(await page.evaluate(() => CC.G.phase === 'defeat'), 'defeat reached');
  await page.screenshot({ path: out + '/loss-1920x1080.png' });
  await sleep(2500); await page.screenshot({ path: out + '/results-1920x1080.png' });
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); srv.close();
})();
