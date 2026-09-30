// Build: concatenates src/ into ONE self-contained index.html, inlining the Oswald font (subset woff2) and 112px Croww emotes as base64.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f));
const font = rd('build/oswald-subset.woff2').toString('base64');
const names = ['crowwHype', 'crowwW', 'crowwL', 'crowwLUL'];
const emotes = {}; for (const n of names) emotes[n] = 'data:image/png;base64,' + rd(`brand/emotes/${n}/${n}_112.png`).toString('base64');
const fontCss = `<style>@font-face{font-family:"Oswald";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:200 700;font-display:block}</style>\n`;
let html = rd('src/head.html').toString().replace('<!--FONT-->', fontCss);
html += `const EMOTE_SRC = ${JSON.stringify(emotes)};\n`;
// approved Croww art (copied from brand/ into assets/ so it is tracked + published)
const art = { mascot: 'assets/mascot-croww-desk_512.png', logo: 'assets/logo-croww-neon_720.png' };
for (const k in art) art[k] = 'data:image/png;base64,' + rd(art[k]).toString('base64');
html += `const ART_SRC = ${JSON.stringify(art)};\n`;
for (const f of ['1-core.js', '2-game.js', '3-draw.js', '4-hud.js']) html += rd('src/' + f).toString();
html += rd('src/tail.html').toString();
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('built index.html (' + html.length + ' bytes)');
