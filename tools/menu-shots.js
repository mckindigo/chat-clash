// Build-menu check at many viewport sizes: opens every socket with real mouse clicks, checks each option is fully
// inside the play area, not covered by the side panels or the tooltip, and that clicking it really builds.
// node tools/menu-shots.js [dir-with-index.html] [outdir]
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..')), out = path.resolve(process.argv[3] || path.join(__dirname, '..', 'shots/verify/menu'));
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(root, u === '/' ? 'index.html' : u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(d); } }); }).listen(8768);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else if (process.env.V) console.log('ok   ' + m); };
const SIZES = [[1920, 1080], [1280, 720], [1366, 768], [1600, 900], [1024, 768], [1080, 1920], [900, 1200], [2560, 1080]];
const PLAY = { x0: 385, y0: 105, x1: 1495, y1: 1030 };
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  for (const [W, H] of SIZES) {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.setViewport({ width: W, height: H });
    await page.goto('http://localhost:8768/index.html?connect=0&test=off'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(400);
    await page.evaluate(() => { if (window.CC.view) CC.view.titleT = 0; CC.G.gold = 99999; CC.G.phaseT = 9999; });
    // layout: stage fully inside the window, 16:9, nothing cropped
    const lay = await page.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
    ok(lay.l >= -0.5 && lay.t >= -0.5 && lay.r <= lay.w + 0.5 && lay.b <= lay.h + 0.5 && (Math.abs(lay.r - lay.l - lay.w) < 1 || Math.abs(lay.b - lay.t - lay.h) < 1), `${W}x${H} stage fits window ${JSON.stringify(lay)}`);
    const toCss = (x, y) => ({ x: lay.l + x * (lay.r - lay.l) / 1920, y: lay.t + y * (lay.b - lay.t) / 1080 });
    await page.screenshot({ path: `${out}/layout-${W}x${H}.png` });
    const pads = await page.evaluate(() => CC.DATA.pads);
    for (let pi = 0; pi < pads.length; pi++) {
      for (const mode of ['build', 'upgrade']) {
        await page.evaluate(() => { CC.G.towers = CC.G.towers.map(() => null); });
        if (mode === 'upgrade') await page.evaluate(i => CC.build(i, 'hammer'), pi);
        await page.evaluate(() => { CC.view.sel = -1; });
        let c = toCss(...pads[pi]); await page.mouse.click(c.x, c.y); await sleep(60);
        const info = await page.evaluate(() => {
          const btns = menuButtons(), tip = typeof menuTooltipRect === 'function' ? menuTooltipRect(btns) : (() => { const [px, py] = CC.DATA.pads[CC.view.sel]; const bw = 460, bx = clamp(px - bw / 2, 380, 1490 - bw), by = clamp(py - 268, 100, 1000); return { x: bx, y: by, w: bw, h: 94 }; })();
          return { sel: CC.view.sel, btns: btns.map(b => ({ kind: b.kind, type: b.type, x: b.x, y: b.y, r: b.r })), tip };
        });
        ok(info.sel === pi, `${W}x${H} pad ${pi} ${mode}: click selects pad`);
        for (const b of info.btns) {
          const R = b.r + 5, inside = b.x - R >= PLAY.x0 && b.x + R <= PLAY.x1 && b.y - R >= PLAY.y0 && b.y + b.r + 12 <= PLAY.y1;
          const t = info.tip, cx = clamp(b.x, t.x, t.x + t.w), cy = clamp(b.y, t.y, t.y + t.h), underTip = Math.hypot(b.x - cx, b.y - cy) < R;
          ok(inside, `${W}x${H} pad ${pi} ${mode}: ${b.kind}${b.type || ''} at (${b.x | 0},${b.y | 0}) inside play area`);
          ok(!underTip, `${W}x${H} pad ${pi} ${mode}: ${b.kind}${b.type || ''} not under tooltip`);
        }
        if (pi === 0 || pi === 2 || pi === 7) await page.screenshot({ path: `${out}/menu-${W}x${H}-pad${pi}-${mode}.png` });
        // click the left-most option for real and check it acted
        const b = info.btns.slice().sort((a, b) => a.x - b.x)[0]; c = toCss(b.x, b.y);
        const before = await page.evaluate(i => JSON.stringify(CC.G.towers[i]), pi);
        await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.up(); await sleep(40);
        const after = await page.evaluate(i => JSON.stringify(CC.G.towers[i]), pi);
        ok(before !== after, `${W}x${H} pad ${pi} ${mode}: clicking left-most option (${b.kind}${b.type || ''}) works`);
      }
    }
    ok(!errs.length, `${W}x${H} no page errors ${errs.join('|')}`);
    await page.close();
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  console.log(fails ? fails + ' FAILURES' : 'ALL MENU CHECKS PASSED'); process.exitCode = fails ? 1 : 0;
  await browser.close(); srv.close();
})();
