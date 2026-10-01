// Theme check: deterministic 1920x1080 screenshots (title / gameplay / results) in every theme -> shots/verify/theme/,
// a scan of every string drawn on the canvas in the neutral theme (no "Croww" except the credit line),
// a pixel diff of the croww theme against a baseline build (node tools/verify-theme.js [baselineDir]),
// and the selection plumbing (?theme= overrides + saves, Settings toggle, localStorage, works with ?afk=1).
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots/verify/theme'); fs.mkdirSync(out, { recursive: true });
const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const serve = (dir, port) => http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(dir, u === '/' ? 'index.html' : u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': u.endsWith('.png') ? 'image/png' : 'text/html' }); r.end(d); } }); }).listen(port);
const servers = [serve(root, 8781)]; if (baseDir) servers.push(serve(baseDir, 8782));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const CREDIT = 'made by Croww \u00b7 kick.com/croww';
async function open(browser, url, clear, still) {
  const page = await browser.newPage(); if (still) await page.evaluateOnNewDocument(() => { window.requestAnimationFrame = () => 0; });   // still: no live loop, frames come only from the script
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.errs = errs;
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url); if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  await page.evaluate(() => document.fonts.ready); await sleep(700);
  return page;
}
// the same scripted session in any build: seeded randomness, fixed clock, manual stepping
async function shots(page, tag) {
  const res = {};
  const grab = async name => { const d = await page.evaluate(() => document.getElementById('c').toDataURL('image/png')); const f = path.join(out, `${tag}-${name}.png`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); res[name] = f; };
  await page.evaluate(() => {
    let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    performance.now = () => 100000; window.__texts = [];
    const P = CanvasRenderingContext2D.prototype; for (const k of ['fillText', 'strokeText']) { const f = P[k]; P[k] = function (s, ...r) { if (this.canvas.id === 'c') window.__texts.push(String(s)); return f.call(this, s, ...r); }; }
    CC.manual(true); CC.newGame(); CC.view.titleT = 4.5; CC.render(1);
  });
  await grab('title');
  await page.evaluate(() => {
    CC.view.titleT = 0; const G = CC.G; G.gold = 1000; CC.build(1, 'laser'); CC.build(3, 'cannon'); CC.build(4, 'slow'); CC.build(7, 'hammer'); CC.upgrade(1);
    CC.startWave(); ['bug', 'troll', 'spam', 'lag'].forEach((t, i) => CC.onChat('viewer' + i, '!' + t, 'kick')); CC.step(6); CC.render(2);
  });
  await grab('gameplay');
  await page.evaluate(() => { const G = CC.G; G.chill = 3; CC.spawn('troll', 'finisher'); const e = G.enemies[G.enemies.length - 1]; e.d = PATH.len - 1; CC.step(12); CC.render(3); });
  await grab('results');
  return res;
}
async function diff(page, a, b) {   // in-browser pixel diff of two PNG files (served from root)
  return page.evaluate(async (a, b) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([load(a), load(b)]); const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const da = px(A), db = px(B); let n = 0, minY = 1e9, maxY = -1;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) { n++; const y = Math.floor(i / 4 / A.width); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { n, pct: +(100 * n / (A.width * A.height)).toFixed(4), minY, maxY };
  }, a, b);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const q = 'connect=0&test=off&npc=0';
  // 1) shots in every theme (+ text scan)
  const all = {};
  for (const th of ['croww', 'neutral']) {
    const page = await open(browser, `http://localhost:8781/index.html?${q}&theme=${th}`, true, true);
    ok(await page.evaluate(() => CC.theme) === th, `?theme=${th} applied`);
    all[th] = await shots(page, th);
    if (th === 'neutral') ok(await page.evaluate(() => themeImg('mascot') === ART['neutral.mascot'] && ['neutralHype', 'neutralW', 'neutralL', 'neutralLUL'].every(artReady)), 'neutral: Art mascot (Pip) + 4 emotes embedded and used');
    if (th === 'neutral') {
      // extra neutral states that carry Croww wording in the croww theme
      await page.evaluate(() => {
        CC.newGame(); const G = CC.G; G.gold = 900; CC.build(1, 'laser'); CC.unlockCrowBoss('test'); CC.startWave(); CC.step(1); CC.deployCrowBoss();
        CC.setAfk(true); CC.setAfk(false, 'welcome back, Croww'); G.card = { wave: 3, top: null, t: 0.5, dur: 6 }; CC.render(4);
        CC.setPaused(true); CC.render(5); CC.setPaused(false); CC.setAfk(true); CC.render(6);
        CC.Kick.status = 'live'; CC.render(7); CC.Kick.status = 'off';
        CC.forceVote(); CC.step(1.2); CC.render(8);
        G.hazard = { id: 'drain', t: 10 }; G.vote = null; CC.render(9); CC.setAfk(false);
      });
      await page.screenshot({ path: path.join(out, 'neutral-extra-states.png') });
      const texts = await page.evaluate(() => window.__texts);
      const bad = [...new Set(texts.filter(s => /croww/i.test(s) && s !== CREDIT))];
      ok(texts.includes(CREDIT), 'neutral: title credit line drawn');
      ok(bad.length === 0, 'neutral: no "Croww" in ' + texts.length + ' canvas strings except the credit ' + JSON.stringify(bad));
      const dom = await page.evaluate(() => { CC.toggleSettings(true); const t = document.getElementById('settings').innerText + ' ' + document.title; CC.toggleSettings(false); return t; });
      ok(!/croww/i.test(dom), 'neutral: settings panel text + page title have no "Croww" ' + ((dom.match(/.{0,40}croww.{0,40}/i) || [''])[0]));
    } else {
      const texts = await page.evaluate(() => window.__texts);
      ok(texts.includes(CREDIT), 'croww: title credit line drawn');
    }
    ok(!page.errs.length, th + ': no page errors ' + page.errs.join(' | '));
    await page.close();
  }
  // 2) croww vs the baseline build
  if (baseDir) {
    const page = await open(browser, `http://localhost:8782/index.html?${q}`, true, true);
    const base = await shots(page, 'baseline'); await page.close();
    const dp = await open(browser, 'http://localhost:8781/index.html?connect=0&test=off', false);
    for (const k of ['title', 'gameplay', 'results']) {
      const d = await diff(dp, '/shots/verify/theme/' + path.basename(base[k]), '/shots/verify/theme/' + path.basename(all.croww[k]));
      if (k === 'title') ok(d.n === 0 || d.minY >= 1040, `croww ${k} vs baseline: only the credit line differs ${JSON.stringify(d)}`);
      else ok(d.n === 0, `croww ${k} vs baseline: pixel-identical ${JSON.stringify(d)}`);
    }
    const nd = await diff(dp, '/shots/verify/theme/croww-gameplay.png', '/shots/verify/theme/neutral-gameplay.png');
    ok(nd.pct > 20, 'neutral gameplay really looks different ' + JSON.stringify(nd));
    await dp.close();
  }
  // 3) selection plumbing
  let page = await open(browser, `http://localhost:8781/index.html?${q}&theme=neutral&afk=1`, true);
  ok(await page.evaluate(() => CC.theme === 'neutral' && CC.AFK.on && localStorage.getItem('chatclash.theme') === 'neutral'), '?theme=neutral&afk=1: neutral + AFK on + saved');
  await page.goto(`http://localhost:8781/index.html?${q}`); await sleep(500);
  ok(await page.evaluate(() => CC.theme) === 'neutral', 'saved theme survives a reload without the param');
  await page.evaluate(() => { CC.toggleSettings(true); const s = document.getElementById('sTheme'); s.value = 'croww'; s.dispatchEvent(new Event('change')); });
  ok(await page.evaluate(() => CC.theme === 'croww' && localStorage.getItem('chatclash.theme') === 'croww' && [...document.getElementById('sTheme').options].map(o => o.value).join() === 'croww,neutral'), 'Settings toggle switches live + saves');
  await page.screenshot({ path: path.join(out, 'settings-theme-toggle.png') });
  await page.goto(`http://localhost:8781/index.html?${q}&theme=neutral`); await sleep(400);
  await page.evaluate(() => { const s = document.getElementById('sTheme'); s.value = 'croww'; s.dispatchEvent(new Event('change')); });
  ok(await page.evaluate(() => !new URLSearchParams(location.search).has('theme') && new URLSearchParams(location.search).get('npc') === '0'), 'toggle drops a stale ?theme= and keeps the other params');
  await page.reload(); await sleep(400); ok(await page.evaluate(() => CC.theme) === 'croww', 'toggle choice survives reload');
  await page.goto(`http://localhost:8781/index.html?${q}&theme=bogus`); await sleep(400); ok(await page.evaluate(() => CC.theme) === 'croww', 'unknown ?theme= ignored');
  await page.evaluate(() => localStorage.clear()); await page.goto(`http://localhost:8781/index.html?${q}`); await sleep(400);
  ok(await page.evaluate(() => CC.theme) === 'croww', 'fresh browser defaults to croww');
  ok(!page.errs.length, 'no page errors ' + page.errs.join(' | '));
  await browser.close(); servers.forEach(s => s.close());
  console.log('shots in ' + out);
})();
