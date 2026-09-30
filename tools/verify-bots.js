// Realtime headless check that Test mode Off fully stops bot chatters (and a saved Off survives reload).
// node tools/verify-bots.js   (serves the folder on :8766)
const puppeteer = require('puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INSTR = () => {
  window.LOG = { spawns: [], chats: [] };
  const se = window.spawnEnemy; window.spawnEnemy = function (type, user, isBot, src) { LOG.spawns.push({ t: performance.now(), type, user, src: src || (isBot ? 'npc' : 'chat') }); return se.apply(this, arguments); };
  const oc = window.onChat; window.onChat = function (u, m, src) { LOG.chats.push({ t: performance.now(), u, m, src }); return oc.apply(this, arguments); };
  window.KEEP = setInterval(() => { if (CC.G) { CC.G.chill = 100; CC.G.gold = Math.max(CC.G.gold, 50); } }, 200); // never lose (defeat would hide bot spawns)
};
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:8766/index.html?connect=0'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(300);
  await page.evaluate(INSTR);
  // 1) Test mode ON via the real settings <select>
  await page.keyboard.press('s'); await sleep(200);
  await page.evaluate(() => { const r = document.getElementById('sBotRate'); r.value = 120; r.dispatchEvent(new Event('input')); });
  await page.select('#sTest', 'on');
  await page.keyboard.press('Escape'); await sleep(100); await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('s'); await sleep(100);
  await sleep(4000); // bots chat during build -> commands get QUEUED for the wave
  const q = await page.evaluate(() => ({ queuedBot: CC.G.chatQueue.filter(x => x.src === 'bot').length, phase: CC.G.phase }));
  await page.evaluate(() => CC.startWave()); await sleep(8000);
  const on = await page.evaluate(() => ({ botChats: LOG.chats.filter(c => c.src === 'bot').length, botSpawns: LOG.spawns.filter(s => s.src === 'bot').length, npc: LOG.spawns.filter(s => s.src === 'npc').length, active: CC.testModeActive() }));
  ok(on.active && on.botChats > 10 && on.botSpawns > 0, 'test mode ON: bots chat + spawn ' + JSON.stringify(on) + ' (queued during build: ' + q.queuedBot + ')');
  // make sure there is queued bot work at the moment we switch Off (build phase of next wave)
  // room for everyone (the chat-enemy cap would otherwise reject commands and make this test flaky)
  await page.evaluate(() => { CC.settings.globalCap = 300; CC.G.phase = 'build'; CC.G.phaseT = 8; });
  for (let i = 0; i < 40 && !(await page.evaluate(() => CC.G.chatQueue.some(x => x.src === 'bot'))); i++) await sleep(150);
  const before = await page.evaluate(() => ({ queuedBot: CC.G.chatQueue.filter(x => x.src === 'bot').length + CC.G.release.filter(x => x.src === 'bot').length }));
  // 2) Test mode OFF via the select
  await page.keyboard.press('s'); await sleep(150); await page.select('#sTest', 'off'); await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('s');
  const offAt = await page.evaluate(() => performance.now());
  const after0 = await page.evaluate(() => ({ queuedBot: CC.G.chatQueue.filter(x => x.src === 'bot').length + CC.G.release.filter(x => x.src === 'bot').length, saved: JSON.parse(localStorage.getItem('chatclash.settings.v1')).testMode }));
  ok(before.queuedBot > 0 && after0.queuedBot === 0, 'Off clears queued bot attacks immediately: ' + before.queuedBot + ' -> ' + after0.queuedBot + ', saved=' + after0.saved);
  // real Kick-path + manual fake chat still work while Off
  await sleep(7000); // let the next wave start
  await page.evaluate(() => { CC.G.phase === 'build' && CC.startWave(); onChat('RealViewer', '!troll', 'kick'); });
  await page.evaluate(() => { document.getElementById('fUser').value = 'Eli'; document.getElementById('fMsg').value = '!bug'; document.getElementById('bSend').click(); });
  const waitMs = 32000; console.log('     waiting ' + waitMs / 1000 + 's with Test mode Off (waves keep cycling)...');
  await sleep(waitMs - 7000);
  const off = await page.evaluate(t0 => ({ secs: Math.round((performance.now() - t0) / 1000), botChats: LOG.chats.filter(c => c.src === 'bot' && c.t > t0).length, botSpawns: LOG.spawns.filter(s => s.src === 'bot' && s.t > t0).length, kick: LOG.spawns.filter(s => s.src === 'kick' && s.t > t0).length, manual: LOG.spawns.filter(s => s.src === 'manual' && s.t > t0).length, npc: LOG.spawns.filter(s => s.src === 'npc' && s.t > t0).length, wave: CC.G.wave, botEnemiesAlive: CC.G.enemies.filter(e => e.src === 'bot').length }), offAt);
  ok(off.secs >= 30 && off.botChats === 0 && off.botSpawns === 0, 'after Off for ' + off.secs + 's: zero new bot chats/spawns ' + JSON.stringify(off));
  ok(off.kick >= 1 && off.manual >= 1, 'Kick-chat command and fake-chat box still spawn while Off');
  // 3) reload with Off saved
  await page.reload(); await sleep(300); await page.evaluate(INSTR);
  await sleep(10000);
  const rl = await page.evaluate(() => ({ mode: CC.settings.testMode, active: CC.testModeActive(), ui: document.getElementById('sTest').value, botChats: LOG.chats.filter(c => c.src === 'bot').length }));
  ok(rl.mode === 'off' && !rl.active && rl.ui === 'off' && rl.botChats === 0, 'reload with Off saved stays Off (10s, no bots) ' + JSON.stringify(rl));
  // 4) stale ?test=on in the URL (e.g. OBS URL) -> switching Off in settings must survive reload
  await page.goto('http://localhost:8766/index.html?connect=0&test=on'); await sleep(300);
  const u1 = await page.evaluate(() => CC.testModeActive());
  await page.keyboard.press('s'); await sleep(100); await page.select('#sTest', 'off');
  const url = await page.evaluate(() => location.search); await page.reload(); await sleep(300);
  const u2 = await page.evaluate(() => ({ mode: CC.settings.testMode, active: CC.testModeActive() }));
  ok(u1 && url.indexOf('test=') < 0 && u2.mode === 'off' && !u2.active, '?test=on URL: Off strips the param, reload stays Off (url now "' + url + '") ' + JSON.stringify(u2));
  // 5) stale / junk saved value can't re-enable bots
  await page.evaluate(() => { localStorage.setItem('chatclash.settings.v1', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('chatclash.settings.v1')), { testMode: 'OFF ' }))); }); await page.reload(); await sleep(200);
  ok(await page.evaluate(() => CC.settings.testMode === 'off' && !CC.testModeActive()), 'junk saved value "OFF " normalises to off');
  // 6) Auto: bots only when not live; explicit Off beats the auto fallback even when chat is disconnected
  const au = await page.evaluate(() => { CC.settings.testMode = 'auto'; const a = CC.testModeActive(); CC.Kick.status = 'live'; const b = CC.testModeActive(); CC.Kick.status = 'off'; CC.settings.testMode = 'off'; const c = CC.testModeActive(); return { autoOffline: a, autoLive: b, offOffline: c }; });
  ok(au.autoOffline && !au.autoLive && !au.offOffline, 'auto/off logic ' + JSON.stringify(au));
  // 7) House NPC waves toggle
  await page.evaluate(INSTR);
  await page.keyboard.press('s'); await sleep(100); await page.click('#sNpc'); await page.keyboard.press('s');
  await page.evaluate(() => CC.startWave()); await sleep(8000);
  const npc = await page.evaluate(() => ({ npcWaves: CC.settings.npcWaves, npc: LOG.spawns.filter(s => s.src === 'npc').length, saved: JSON.parse(localStorage.getItem('chatclash.settings.v1')).npcWaves }));
  ok(!npc.npcWaves && npc.npc === 0 && npc.saved === false, 'House NPC waves unchecked -> zero NPC spawns in 8s of wave ' + JSON.stringify(npc));
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); srv.close();
})();
