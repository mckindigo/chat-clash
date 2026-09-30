// Read-only: loads the game in headless Chrome, lets it look up + connect to a live Kick channel, counts parsed chat messages.
const puppeteer = require('puppeteer-core'), http = require('http'), fs = require('fs'), path = require('path');
const ch = process.argv[2] || 'croww';
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(fs.readFileSync(path.join(__dirname, '..', 'index.html'))); }).listen(8766);
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setViewport({ width: 1920, height: 1080 });
  await p.goto('http://localhost:8766/?channel=' + ch + '&test=off', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 25000));
  const res = await p.evaluate(() => ({ status: CC.Kick.status, detail: CC.Kick.detail, msgs: CC.Kick.msgs, room: CC.settings.rooms[CC.settings.channel], feed: CC.feed.slice(-5).map(f => f.user + ': ' + f.text.slice(0, 40)), chatEnemies: CC.G.enemies.filter(e => !e.isBot).length + CC.G.chatQueue.length }));
  console.log(JSON.stringify(res, null, 1)); console.log('errors', errs);
  await p.screenshot({ path: path.join(__dirname, '..', 'shots', 'live-kick-chat-1920x1080.png') });
  await b.close(); srv.close();
})();
