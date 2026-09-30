// Read-only test: connect to Kick's public Pusher socket and print parsed chat messages.
const WebSocket = require('ws');
const id = process.argv[2], key = process.argv[3] || '32cbd69e4b950bf97679', secs = +(process.argv[4]||25);
const url = `wss://ws-us2.pusher.com/app/${key}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
const ws = new WebSocket(url); let n = 0;
ws.on('open', () => console.log('open', url));
ws.on('close', (c, r) => { console.log('close', c, String(r)); process.exit(0); });
ws.on('error', e => console.log('error', e.message));
ws.on('message', raw => {
  const m = JSON.parse(raw);
  if (m.event === 'pusher:connection_established') { console.log('established'); ws.send(JSON.stringify({event:'pusher:subscribe',data:{auth:'',channel:`chatrooms.${id}.v2`}})); return; }
  if (m.event === 'App\\Events\\ChatMessageEvent') { const d = typeof m.data==='string'?JSON.parse(m.data):m.data; n++; if (n<=8) console.log('CHAT', d.sender && d.sender.username, ':', String(d.content).slice(0,60)); return; }
  console.log('evt', m.event, String(m.data||'').slice(0,120));
});
setTimeout(() => { console.log('TOTAL_CHAT_MESSAGES', n); process.exit(0); }, secs*1000);
