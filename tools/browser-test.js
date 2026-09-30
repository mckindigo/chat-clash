// Headless test: node tools/browser-test.js  (serves the folder on :8765)
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); } }); }).listen(8765);
const shots = path.join(root, 'shots'); fs.mkdirSync(shots, { recursive: true });
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  async function open(w, h, qs) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(w + ': ' + m.text()); });
    page.on('pageerror', e => errors.push(w + ' pageerror: ' + e.message));
    await page.setViewport({ width: w, height: h });
    await page.goto('http://localhost:8765/index.html?' + (qs || 'connect=0'), { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 400));
    return page;
  }
  for (const [W, H] of [[1920, 1080], [1280, 720]]) {
    const tag = W + 'x' + H, sc = W / 1920;
    const page = await open(W, H);
    const assets = await page.evaluate(() => ({ font: document.fonts.check('700 40px Oswald'), emotes: Object.values(EMOTES).filter(i => i.naturalWidth === 112).length }));
    ok(assets.font && assets.emotes === 4, tag + ' Oswald + 4 emotes embedded: ' + JSON.stringify(assets));
    await page.evaluate(() => { CC.manual(true); CC.G.gold = 1000; });
    // build with real mouse clicks: pad 0 -> hammer button (first), pad 3 -> laser, etc
    const pads = await page.evaluate(() => CC.DATA.pads);
    const R = 112, angs = [-150, -110, -70, -30];
    const plan = [[0, 0], [1, 1], [3, 3], [4, 2], [5, 1], [7, 0]];
    for (const [pi, ti] of plan) {
      const [px, py] = pads[pi];
      await page.mouse.click(px * sc, py * sc); await page.evaluate(() => CC.render());
      const a = angs[ti] * Math.PI / 180;
      await page.mouse.move((px + Math.cos(a) * R) * sc, (py + Math.sin(a) * R) * sc);
      await page.mouse.click((px + Math.cos(a) * R) * sc, (py + Math.sin(a) * R) * sc);
    }
    const built = await page.evaluate(() => CC.G.towers.filter(Boolean).map(t => t.type));
    ok(built.length === plan.length, tag + ' built towers via mouse: ' + built.join(','));
    // upgrade tower on pad 3 via click + button
    await page.mouse.click(pads[3][0] * sc, pads[3][1] * sc);
    const ua = -2.2; await page.mouse.click((pads[3][0] + Math.cos(ua) * R) * sc, (pads[3][1] + Math.sin(ua) * R) * sc);
    ok(await page.evaluate(() => CC.G.towers[3].level === 2), tag + ' upgrade via click');
    await page.mouse.click(10 * sc, 1000 * sc);
    await page.evaluate(() => { CC.G.gold = 240; CC.settings.botRate = 40; CC.startWave(); CC.onChat('CrowwFan99', '!troll'); CC.onChat('xX_Sniper_Xx', '!spam'); CC.onChat('LagLord', '!lag'); CC.step(9); });
    const mid = await page.evaluate(() => ({ n: CC.G.enemies.length, chat: CC.G.enemies.filter(e => !e.isBot).length, users: [...new Set(CC.G.enemies.map(e => e.user))].length }));
    ok(mid.n > 0 && mid.chat > 0, tag + ' test mode spawns: ' + JSON.stringify(mid));
    await page.evaluate(() => CC.render(12.3));
    await page.screenshot({ path: path.join(shots, `gameplay-${tag}.png`) });
    // hover a pad for the build menu shot (1080 only)
    if (W === 1920) {
      await page.evaluate(() => { CC.G.gold = 200; });
      await page.mouse.click(pads[2][0], pads[2][1]); await page.mouse.move(pads[2][0] + Math.cos(-70 * Math.PI / 180) * R, pads[2][1] + Math.sin(-70 * Math.PI / 180) * R);
      await page.evaluate(() => CC.render(12.5)); await page.screenshot({ path: path.join(shots, `build-menu-${tag}.png`) });
      await page.mouse.click(10, 1000);
    }
    // survive the wave
    await page.evaluate(() => { for (let i = 0; i < 120 && CC.G.wave === 1; i++) CC.step(1); });
    const s1 = await page.evaluate(() => ({ wave: CC.G.wave, score: CC.G.score, chill: CC.G.chill, phase: CC.G.phase, card: !!CC.G.card }));
    ok(s1.wave === 2 && s1.score === 1 && s1.chill > 0, tag + ' wave 1 survived: ' + JSON.stringify(s1));
    await page.evaluate(() => { CC.G.crow.cycle = 0.5; CC.step(0.6); CC.render(20); });
    await page.screenshot({ path: path.join(shots, `wave-clear-card-${tag}.png`) });
    // vote panel
    await page.evaluate(() => { CC.G.card = null; CC.G.banners = []; CC.startWave(); CC.forceVote(); CC.step(0.1); ['a1','a2','a3','a4','a5'].forEach((u, i) => CC.onChat(u, '!' + (1 + (i % 3 === 0 ? 0 : i % 3)))); CC.onChat('VoteGoblin', '!2'); CC.step(6); CC.G.banners = []; CC.render(30); });
    const v = await page.evaluate(() => CC.G.vote && { opts: CC.G.vote.opts, counts: CC.G.vote.counts });
    ok(v && v.counts.reduce((a, b) => a + b, 0) >= 6, tag + ' vote running: ' + JSON.stringify(v));
    await page.screenshot({ path: path.join(shots, `vote-panel-${tag}.png`) });
    await page.evaluate(() => CC.step(15));
    const hz = await page.evaluate(() => CC.G.hazard && CC.G.hazard.id);
    ok(!!hz, tag + ' hazard applied: ' + hz);
    // blackout shot
    await page.evaluate(() => { CC.G.hazard = { id: 'blackout', t: 20 }; CC.step(1); CC.G.banners = []; CC.render(33); });
    if (W === 1920) await page.screenshot({ path: path.join(shots, `hazard-blackout-${tag}.png`) });
    // boss via hype
    await page.evaluate(() => { for (let i = 0; i < 90; i++) CC.onChat('hyper' + i, 'HYPE'); CC.onChat('BossSummoner', '!boss'); CC.step(4); CC.G.banners = []; });
    ok(await page.evaluate(() => CC.G.enemies.some(e => e.type === 'boss') || CC.G.chatQueue.some(q => q.type === 'boss') || CC.G.release.some(q => q.type === 'boss')), tag + ' boss unlocked by hype and spawned/queued');
    // low hp panic shot
    await page.evaluate(() => { CC.G.hazard = null; CC.G.chill = 36; CC.spawn('troll', 'BigHitter'); const e = CC.G.enemies[CC.G.enemies.length - 1]; e.d = 3000; e.hp = 1e9; CC.step(0.2); CC.step(0.35); CC.render(40); });
    ok(await page.evaluate(() => CC.G.pops.length > 0), tag + ' crowwLUL pops on big hit');
    if (W === 1920) await page.screenshot({ path: path.join(shots, `low-chill-${tag}.png`) });
    // lose
    await page.evaluate(() => { for (let i = 0; i < 8; i++) CC.G.towers[i] = null; CC.G.chill = 12; for (let i = 0; i < 6; i++) CC.spawn('troll', 'TrollKing'); for (let i = 0; i < 200 && CC.G.phase !== 'defeat'; i++) CC.step(0.5); });
    ok(await page.evaluate(() => CC.G.phase === 'defeat'), tag + ' defeat reached');
    await page.evaluate(() => { CC.step(1.2); CC.render(50); });
    if (W === 1920) await page.screenshot({ path: path.join(shots, `defeat-fall-${tag}.png`) });
    await page.evaluate(() => { CC.step(3); CC.step(1); CC.render(55); });
    const res = await page.evaluate(() => ({ phase: CC.G.phase, top: Object.keys(CC.G.session).length }));
    ok(res.phase === 'results', tag + ' results screen: ' + JSON.stringify(res));
    await page.screenshot({ path: path.join(shots, `results-${tag}.png`) });
    // play again click
    const b = await page.evaluate(() => CC.G.resultsBtn);
    await page.mouse.click((b.x + b.w / 2) * sc, (b.y + b.h / 2) * sc);
    ok(await page.evaluate(() => CC.G.phase === 'build' && CC.G.wave === 1), tag + ' play again works');
    // clean mode
    await page.evaluate(() => { CC.settings.clean = true; CC.G.crow.cycle = 5.5; CC.startWave(); CC.step(6); CC.G.crow.cycle = 5.5; CC.G.banners = []; CC.render(60); });
    await page.screenshot({ path: path.join(shots, `clean-mode-${tag}.png`) });
    // settings panel
    if (W === 1920) { await page.keyboard.press('s'); await new Promise(r => setTimeout(r, 200)); await page.screenshot({ path: path.join(shots, `settings-${tag}.png`) });
      await page.type('#fUser', 'EliTest'); await page.type('#fMsg', '!bug'); await page.click('#bSend');
      ok(await page.evaluate(() => CC.feed.some(f => f.user === 'EliTest')), tag + ' fake chat box works');
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    }
    // real-time loop sanity (unpaused)
    await page.evaluate(() => { CC.settings.clean = false; CC.newGame(); CC.manual(false); });
    await new Promise(r => setTimeout(r, 1500));
    await page.keyboard.press('p');
    ok(await page.evaluate(() => CC.G.paused && CC.G.time > 0.5), tag + ' realtime loop + pause');
    await page.close();
  }
  ok(errors.length === 0, 'no console errors ' + (errors.length ? JSON.stringify(errors.slice(0, 5)) : ''));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
