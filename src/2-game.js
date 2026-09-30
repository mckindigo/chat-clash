/* ===================================================================== game state */
let G = null;
const view = { titleT: 4.5, hoverPad: -1, sel: -1, hoverBtn: null, mx: 0, my: 0, settingsOpen: false };
const feed = [];
const cooldowns = {};
function newGame(keepSession) {
  const carry = keepSession && G ? G.session : null;
  G = {
    time: 0, gold: DATA.economy.startGold, chill: DATA.chill.max, wave: 1, score: 0, phase: 'build', phaseT: DATA.wave.firstBuild,
    waveT: 0, waveDur: 0, aiBudget: 0, aiTimer: 0, aiGap: 1, release: [], releaseT: 0, chatQueue: [],
    enemies: [], towers: DATA.pads.map(() => null), projs: [], parts: [], texts: [], rings: [], smoke: [], banners: [], pops: [],
    session: {}, waveStats: {}, hype: 0, bossReady: false, vote: null, voteClock: DATA.vote.firstDelay, hazard: null,
    shake: 0, defeatT: 0, card: null, kills: 0, paused: false, eid: 0, deskFlash: 0, redFlash: 0,
    crow: { hitT: 0, ringT: 0, cycle: 0, coughT: 0 }, crowBoss: { active: false, t: 0, cd: 0, puffT: 0, puffs: 0 }, resultsBtn: null, resultsAt: 0, bestAtStart: bestScore()
  };
  if (carry) G.session = trimSession(carry);   // AFK rounds: the TOP ATTACKERS board carries over
  G.dmgChat = 0; G.dmgNpc = 0;
  for (const k in cooldowns) delete cooldowns[k];
  heldChat.length = 0;
  view.sel = -1;
  banner('BUILD YOUR DEFENSES', 'Click a glowing pad to place a tower', '#7fb069', 3.2);
}
function diff() { return DATA.difficulty[settings.difficulty] || DATA.difficulty.normal; }
function banner(title, sub, color, dur, emote) { G.banners.push({ title, sub, color: color || '#fff', t: 0, dur: dur || 2.4, emote }); if (G.banners.length > 2) G.banners.shift(); }
function addFeed(user, text, kind) { feed.push({ user, text, kind: kind || 'msg', t: performance.now() }); if (feed.length > 40) feed.shift(); }
function stat(tab, u) { return tab[u] || (tab[u] = { dmg: 0, spawns: 0 }); }
function chatLoad() { return G.enemies.filter(e => !e.isBot && !e.dead).length + [...G.release, ...G.chatQueue].reduce((a, q) => a + (DATA.enemies[q.type].count || 1), 0); }

/* ===================================================================== waves */
function npcBudget(w) { const A = DATA.ai, l = Math.max(0, w - A.lateFrom); return A.budgetBase + A.budgetPerWave * (w - 1) + A.budgetLate * l * l; }
function lateHpMult(w) { return Math.pow(1 + DATA.ai.lateHp, Math.max(0, w - DATA.ai.lateFrom)); }
function waveDuration(w) { return Math.min(DATA.wave.maxDuration, DATA.wave.baseDuration + DATA.wave.perWave * (w - 1)); }
function startWave() {
  if (G.phase !== 'build') return;
  G.phase = 'wave'; G.waveT = 0; G.waveDur = waveDuration(G.wave); G.waveStats = {};
  G.aiBudget = npcBudget(G.wave) * diff().ai;
  G.aiGap = clamp(G.waveDur * 0.8 / Math.max(1, G.aiBudget / 1.8), DATA.ai.minGap, DATA.ai.maxGap);
  G.aiTimer = 0.8;
  for (const q of G.chatQueue) { G.release.push(q); G.aiBudget = Math.max(0, G.aiBudget - DATA.enemies[q.type].cost * DATA.ai.chatDiscount); }
  G.chatQueue = []; G.releaseT = 0.3;
  banner('WAVE ' + G.wave, G.release.length ? G.release.length + ' chat attacks incoming!' : 'Chat: type !bug !troll !lag !spam', '#e0b45c', 2.2);
  SFX.play('wave');
}
function waveCleared() {
  G.score = G.wave;
  const bonus = Math.round(waveBonus(G.wave) * diff().gold); G.gold += bonus;
  G.texts.push({ x: 1200, y: 60, s: '+' + bonus + 'g WAVE BONUS', c: '#ffd23f', t: 0, dur: 1.8, size: 30, vy: -10, pop: true });
  G.chill = Math.min(DATA.chill.max, G.chill + DATA.chill.regenOnClear);
  let top = null;
  for (const u in G.waveStats) { const s = G.waveStats[u]; if (!top || s.dmg > top.s.dmg || (s.dmg === top.s.dmg && s.spawns > top.s.spawns)) top = { u, s }; }
  G.card = { t: 0, dur: 5, wave: G.wave, top };
  G.crow.ringT = 2.6;
  banner('WAVE ' + G.wave + ' CLEARED', '+' + bonus + ' gold  \u2022  +' + DATA.chill.regenOnClear + ' chill  \u2022  Croww stays cozy', '#8fca6a', 2.6, 'crowwW');
  SFX.play('clear');
  saveBest(G.score);
  if (G.wave >= DATA.crowBoss.unlockWave) unlockCrowBoss('survived wave ' + G.wave);
  G.wave++; G.phase = 'build'; G.phaseT = DATA.wave.build;
}
function defeat() {
  G.phase = 'defeat'; G.defeatT = 0; G.chill = 0; G.shake = DATA.fx.maxShake; view.sel = -1; G.vote = null; G.hazard = null;
  banner('CHILL LOST', 'Croww is on the floor', '#ff5070', 2.8, 'crowwL');
  SFX.play('lose'); saveBest(G.score);
  if (AFK.on) afkRoundOver();
}

/* ===================================================================== enemies */
function spawnEnemy(type, user, isBot, src, boost) {
  boost = boost || 0;   // small-chat boost for chat commands: tougher enemies, more !spam minions
  const D = DATA.enemies[type], n = type === 'spam' ? spamCount(boost) : (D.count || 1);
  const late = lateHpMult(G.wave) * (type === 'boss' && !isBot ? 1 + DATA.chat.bossHpPerChatter * Math.max(0, activeChatters() - DATA.chat.hypeFreeChatters) : 1);   // compounding late-wave toughness; a big chat's boss is beefier
  const hpM = (1 + DATA.wave.hpScale * (G.wave - 1)) * late * diff().hp * (1 + (DATA.smallChat.hpBoost[type] || 0) * boost), spM = 1 + DATA.wave.speedScale * (G.wave - 1);
  for (let i = 0; i < n; i++) {
    G.enemies.push({ id: ++G.eid, type, user, isBot, boosted: boost > 0.05, src: src || (isBot ? 'npc' : 'chat'), lead: i === 0, n, hp: D.hp * hpM, maxHp: D.hp * hpM, speed: D.speed * spM * rand(0.95, 1.05), d: -i * 26 - 10, x: -99, y: -99, ang: 0, r: D.r,
      slowT: 0, slowAmt: 0, flash: 0, dead: false, cur: D.speed, wob: Math.random() * 10, dmgAcc: 0 });
  }
  if (!isBot) { stat(G.waveStats, user).spawns++; stat(G.session, user).spawns++; }
  if (type === 'boss') { banner('BOSS INCOMING', 'summoned by ' + user, '#ff4060', 3); SFX.play('boss'); G.shake = Math.max(G.shake, 12); }
}
function dmgEnemy(e, amt, src) {
  if (e.dead) return;
  e.hp -= amt; e.flash = 0.12; e.dmgAcc += amt;
  if (e.dmgAcc >= 8 || src !== 'laser') { if (e.dmgAcc >= 1) G.texts.push({ x: e.x + rand(-10, 10), y: e.y - e.r - 6, s: Math.round(e.dmgAcc) + '', c: '#fff6c8', t: 0, dur: 0.6, size: 22, vy: -70 }); e.dmgAcc = 0; }
  if (src !== 'laser') SFX.play('hit');
  if (e.hp <= 0) {
    e.dead = true; G.kills++;
    const g = Math.round(DATA.enemies[e.type].gold * (e.type === 'boss' ? DATA.economy.bossKillMult : waveKillMult(G.wave) * (e.isBot ? DATA.economy.npcKillMult : chatKillMult())) * diff().gold * killGoldMult()); G.gold += g;
    G.texts.push({ x: e.x, y: e.y - 20, s: '+' + g, c: '#ffd23f', t: 0, dur: 0.9, size: 26, vy: -60 });
    const col = { bug: '#9be34a', troll: '#72b35e', lag: '#3fc8ff', spam: '#ff7ac8', boss: '#ff4060' }[e.type];
    const cnt = e.type === 'boss' ? 60 : e.type === 'troll' ? 22 : 12;
    for (let i = 0; i < cnt; i++) { const a = Math.random() * 6.28, v = rand(80, 320) * (e.type === 'boss' ? 1.6 : 1); G.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: rand(0.4, 0.9), size: rand(4, 9), c: Math.random() < 0.3 ? '#fff' : col, g: 300 }); }
    G.rings.push({ x: e.x, y: e.y, r: e.r, r2: e.r * 2.6, t: 0, dur: 0.35, c: col, w: 6 });
    const word = { laser: 'BANNED!', hammer: 'BONK!', cannon: 'POG!', slow: 'ZZZ' }[src];
    if (word && (e.type === 'troll' || e.type === 'boss' || Math.random() < 0.3)) G.texts.push({ x: e.x, y: e.y - 40, s: word, c: DATA.towers[src].color, t: 0, dur: 1, size: e.type === 'boss' ? 64 : 34, vy: -40, pop: true });
    if (e.type === 'boss') { G.shake = DATA.fx.maxShake; SFX.play('boom'); banner('BOSS DOWN!', 'Croww didn\'t even look up', '#ffd23f', 2.4); } else SFX.play('pop');
  }
}
function deskHit(e) {
  e.dead = true;
  if (G.phase !== 'wave' && G.phase !== 'build') return;
  const D = DATA.enemies[e.type];
  G.chill -= D.dmg;
  if (!e.isBot) { stat(G.waveStats, e.user).dmg += D.dmg; stat(G.session, e.user).dmg += D.dmg; G.dmgChat += D.dmg; } else G.dmgNpc += D.dmg;
  G.crow.hitT = 0.6; G.crow.coughT = 1.2; G.deskFlash = 0.3; G.redFlash = Math.min(1, 0.25 + D.dmg / 40);
  G.shake = Math.min(DATA.fx.maxShake, G.shake + D.dmg * DATA.fx.shakePerDmg + 3);
  G.texts.push({ x: 1600, y: 690, s: '-' + D.dmg + ' CHILL', c: '#ff5070', t: 0, dur: 1.2, size: 40, vy: -60, pop: true });
  if (!e.isBot && e.lead) G.texts.push({ x: 1600, y: 735, s: e.user, c: userColor(e.user), t: 0, dur: 1.2, size: 26, vy: -60 });
  for (let i = 0; i < 14; i++) { const a = rand(-2.7, -1.75); G.parts.push({ x: 1545, y: 850, vx: Math.cos(a) * rand(100, 380), vy: Math.sin(a) * rand(100, 380), t: 0, dur: rand(0.4, 0.8), size: rand(4, 8), c: pick(['#ff5070', '#ffd23f', '#fff']), g: 600 }); }
  if (D.dmg >= DATA.emoteBigHit) G.pops.push({ name: 'crowwLUL', x: rand(1560, 1640), y: 600, t: 0, dur: 1.6, rot: rand(-0.3, 0.3) });
  SFX.play('cough');
  if (G.chill <= 0) defeat();
}
function tryCommand(user, type, src) {
  if (!G || G.phase === 'defeat' || G.phase === 'results') return false;
  if (src === 'bot' && !testModeActive()) return false;
  const key = user.toLowerCase(), now = G.time;   // game clock: cooldowns freeze while paused
  const cd = cooldowns[key] || 0;
  if (now < cd) { addFeed(user, '!' + type + '  (cooldown ' + Math.ceil(cd - now) + 's)', 'cd'); return false; }
  if (type === 'boss' && !G.bossReady) { addFeed(user, '!boss  (' + bossLockReason() + ')', 'lock'); return false; }
  const n = DATA.enemies[type].count || 1;
  if (chatLoad() + n > settings.globalCap) { addFeed(user, '!' + type + '  (room is full!)', 'cap'); return false; }
  cooldowns[key] = now + effCooldown();
  if (type === 'boss') { G.bossReady = false; G.hype = 0; }
  else addHype(DATA.chat.hypePerCmd);
  const live = G.phase === 'wave' && G.waveT < G.waveDur;
  const boost = type === 'boss' ? 0 : smallChatK();
  if (live) { spawnEnemy(type, user, false, src, boost); G.aiBudget = Math.max(0, G.aiBudget - DATA.enemies[type].cost * DATA.ai.chatDiscount); }
  else G.chatQueue.push({ type, user, src, boost });
  addFeed(user, '!' + type + (live ? '  \u2714 sent' : '  \u2714 queued'), 'ok');
  SFX.play('chat');
  return true;
}
function addHype(v) {
  if (!G || G.bossReady || G.phase === 'results' || G.phase === 'defeat') return;
  G.hype = Math.min(DATA.chat.hypeMax, G.hype + v * hypeGainMult() / hypeNeedMult());
  checkBossUnlock();
}
/* a chat boss is only allowed during a wave (chat spawns still open), from DATA.chat.bossMinWave on, one at a time */
function chatBossAlive() { return G.enemies.some(e => e.type === 'boss' && !e.isBot && !e.dead) || G.release.some(q => q.type === 'boss') || G.chatQueue.some(q => q.type === 'boss'); }
function bossAllowed() { return G.phase === 'wave' && G.waveT < G.waveDur && G.wave >= DATA.chat.bossMinWave && !chatBossAlive(); }
function bossLockReason() {
  if (G.hype < DATA.chat.hypeMax) return 'locked - hype ' + Math.floor(G.hype) + '%';
  if (G.wave < DATA.chat.bossMinWave) return 'hype full - bosses start on wave ' + DATA.chat.bossMinWave;
  if (chatBossAlive()) return 'hype full - one boss at a time';
  return 'hype full - waits for the next wave';
}
function checkBossUnlock() {
  if (G.bossReady && !bossAllowed()) { G.bossReady = false; return; }   // wave ended / a boss is out: hype stays full, re-unlocks later
  if (!G.bossReady && G.hype >= DATA.chat.hypeMax && bossAllowed()) { G.bossReady = true; banner('BOSS UNLOCKED', 'first chatter to type !boss summons it', '#ff4060', 3, 'crowwHype'); SFX.play('unlock'); }
}
/* bigger chats need more hype for a boss: 1 + hypePerChatter per active chatter beyond hypeFreeChatters */
function hypeNeedMult(n) { const C = DATA.chat; return 1 + C.hypePerChatter * Math.max(0, (n == null ? activeChatters() : n) - C.hypeFreeChatters); }

/* ===================================================================== chat input */
/* PAUSE: while paused, incoming chat (Kick, fake-chat box) is HELD and replayed in order on resume, so nobody's
   command is lost and nothing spawns/votes while the game is frozen. Bots can't chat while paused (botTick is frozen). */
const heldChat = [];
function setPaused(v) {
  if (!G || G.phase === 'results') v = false;
  if (!G) return;
  const was = G.paused; G.paused = !!v;
  if (G.paused && !was) { view.sel = -1; SFX.play('click'); }
  if (!G.paused && was) {
    const q = heldChat.splice(0);
    for (const [u, m, s] of q) onChat(u, m, s);
    if (q.length) addFeed('CHAT CLASH', q.length + ' held chat message' + (q.length === 1 ? '' : 's') + ' delivered', 'ok');
  }
}
/* ---- small-chat economy. "Active chatters" = distinct people (Kick, fake-chat box, or test bots) who chatted in the
   last DATA.economy.activeWindow seconds of game time. Small chat mode: auto = scale by that count, on = always the
   full boost, off = flat trickle (the original economy). */
let gameClock = 0; const lastSeen = {};
function activeChatters() { const w = DATA.economy.activeWindow; let n = 0; for (const u in lastSeen) { if (gameClock - lastSeen[u] <= w) n++; else delete lastSeen[u]; } return n; }
function smallChatK(n) {
  if (settings.smallChat === 'off') return 0;
  if (settings.smallChat === 'on') return 1;
  return clamp(1 - (n == null ? activeChatters() : n) / DATA.economy.smallChatFull, 0, 1);
}
function effCooldown(k) { k = k == null ? smallChatK() : k; const base = settings.userCooldown; return Math.round(Math.min(base, lerp(base, DATA.smallChat.cooldown, clamp(k * DATA.smallChat.cooldownCurve, 0, 1)))); }  // 7s at 0-3 chatters, back to the setting by 8
function hypeGainMult(k) { return 1 + DATA.smallChat.hypeGain * (k == null ? smallChatK() : k); }
function spamCount(k) { return DATA.enemies.spam.count + Math.round(DATA.smallChat.spamExtra * k); }
function goldPerSec(n) { return DATA.economy.trickle + DATA.economy.smallTrickleBonus * smallChatK(n); }
function waveKillMult(w) { const E = DATA.economy, over = w - E.earlyKillWaves; return over <= 0 ? E.earlyKillMult : Math.max(E.killMult, E.earlyKillMult - (E.earlyKillMult - E.killMult) * over / 3); }
/* chat-spawned kills pay less in a big chat (a big chat sends far more enemies = far more gold, which would cancel its pressure):
   chatKillMult up to chatKillFrom active chatters, easing to chatKillMin by chatKillFull */
function chatKillMult(n) { const E = DATA.economy; n = n == null ? activeChatters() : n; return E.chatKillMult * lerp(1, E.chatKillMin, clamp((n - E.chatKillFrom) / (E.chatKillFull - E.chatKillFrom), 0, 1)); }
function killGoldMult(n) { return 1 + DATA.economy.smallKillBonus * smallChatK(n); }
function onChat(user, text, src) {
  if (!user || text == null || !G) return;
  if (G.paused) { if (heldChat.length < 300) heldChat.push([user, text, src]); return; }
  lastSeen[String(user).toLowerCase()] = gameClock;
  text = String(text).replace(/\[emote:\d+:([^\]]*)\]/g, '$1').trim();
  if (!text) return;
  const cmd = text.split(/\s+/)[0].toLowerCase();
  const m = /^!([123])$/.exec(cmd);
  if (m) { addHype(DATA.chat.hypePerMsg); castVote(user, +m[1] - 1); return; }
  const c = /^!(bug|troll|lag|spam|boss)$/.exec(cmd);
  if (c) { if (tryCommand(user, c[1], src) && c[1] !== 'boss') addHype(DATA.chat.hypePerMsg); return; }   // rejected commands add no hype
  addHype(DATA.chat.hypePerMsg);
  addFeed(user, text, 'msg');
}
function castVote(user, i) {
  if (!G.vote) return;
  const k = user.toLowerCase(), prev = G.vote.by[k];
  if (prev === i) return;
  if (prev != null) G.vote.counts[prev]--;
  G.vote.by[k] = i; G.vote.counts[i]++;
  addFeed(user, 'voted !' + (i + 1) + ' ' + DATA.hazards[G.vote.opts[i]].name, 'vote');
}
function startVote() {
  const ids = Object.keys(DATA.hazards).sort(() => Math.random() - 0.5).slice(0, 3);
  G.vote = { opts: ids, counts: [0, 0, 0], by: {}, t: 0 };
  SFX.play('vote');
}
function endVote() {
  const v = G.vote, mx = Math.max(...v.counts), best = [0, 1, 2].filter(i => v.counts[i] === mx), w = pick(best);
  const id = v.opts[w]; G.hazard = { id, t: DATA.vote.hazardDuration };
  const H = DATA.hazards[id];
  banner(H.name + '!', (mx === 0 ? 'no votes - random pick: ' : 'chat voted (' + v.counts.reduce((a, b) => a + b, 0) + ' vote' + (v.counts.reduce((a, b) => a + b, 0) === 1 ? '' : 's') + '): ') + H.desc, H.color, 3);
  SFX.play('vote'); G.vote = null;
}

/* ===================================================================== CROW BOSS (streamer ally)
   The old code-drawn smoking crow (coffee mug in Clean mode). Unlocks forever (localStorage) the first time the
   streamer clears wave DATA.crowBoss.unlockWave. Deploy with B or the CROW BOSS button under the chill meter. */
function unlockCrowBoss(why) {
  if (crowBossUnlocked()) return false;
  try { localStorage.setItem('chatclash.crowBoss', '1'); } catch (e) {}
  if (G) {
    banner('CROW BOSS UNLOCKED', 'press B (or the button under the chill meter) to deploy him', '#9fd07a', 4.5, 'crowwHype');
    G.crowBoss.flash = 4.5; SFX.play('unlock');
  }
  addFeed('CHAT CLASH', 'Crow Boss unlocked' + (why ? ' - ' + why : '') + '!', 'ok');
  return true;
}
function crowBossState() {
  const cb = G.crowBoss;
  if (!crowBossUnlocked()) return 'locked';
  if (G.paused) return 'paused';
  if (cb.active) return 'active';
  if (G.phase !== 'build' && G.phase !== 'wave') return 'unavailable';
  return cb.cd > 0 ? 'cooldown' : 'ready';
}
function deployCrowBoss() {
  if (!G) return false;
  const st = crowBossState(), cb = G.crowBoss, D = DATA.crowBoss;
  if (st !== 'ready') { SFX.play('click'); if (st === 'locked') addFeed('CHAT CLASH', 'Crow Boss locked - survive wave ' + D.unlockWave, 'lock'); else if (st === 'cooldown') addFeed('CHAT CLASH', 'Crow Boss cooling down (' + Math.ceil(cb.cd) + 's)', 'cd'); return false; }
  cb.active = true; cb.t = D.duration; cb.puffT = 0.9; cb.cd = D.cooldown; cb.puffs = 0;
  G.chill = Math.min(DATA.chill.max, G.chill + D.chillOnDeploy);
  banner('CROW BOSS!', settings.clean ? 'coffee break: steam rings burn + slow the room' : 'smoke break: smoke rings burn + slow the room', '#9fd07a', 2.4, 'crowwW');
  addFeed('Croww', 'deployed the CROW BOSS', 'ok'); SFX.play('unlock'); G.shake = Math.max(G.shake, 8);
  return true;
}
function crowBossPos() {
  const cb = G.crowBoss, D = DATA.crowBoss, el = D.duration - cb.t, home = [1790, 700];
  const kIn = ease(clamp(el / 0.7, 0, 1)), kOut = ease(clamp((0.7 - cb.t) / 0.7, 0, 1)), k = kIn * (1 - kOut);
  const hop = Math.sin(k * Math.PI) * 0;
  return { x: lerp(home[0], D.perch[0], k), y: lerp(home[1], D.perch[1], k) - Math.sin(clamp(el / 0.7, 0, 1) * Math.PI) * 160 - Math.sin(clamp((0.7 - cb.t) / 0.7, 0, 1) * Math.PI) * 160 + hop, s: D.scale * (0.6 + 0.4 * k) };
}
function crowBossPose() {
  const cb = G.crowBoss, q = 1 - clamp(cb.puffT / DATA.crowBoss.puffEvery, 0, 1);
  const k = q < 0.25 ? 1 - q / 0.25 : q > 0.6 ? ease((q - 0.6) / 0.4) : 0;
  return { k, hx: lerp(1742, 1716, k), hy: lerp(700, 560, k), ea: k };
}
function updateCrowBoss(dt) {
  const cb = G.crowBoss, D = DATA.crowBoss;
  if (cb.flash) cb.flash = Math.max(0, cb.flash - dt);
  if (G.phase === 'defeat' || G.phase === 'results') { cb.active = false; return; }
  if (!cb.active) { if (cb.cd > 0) cb.cd = Math.max(0, cb.cd - dt); return; }
  cb.t -= dt; cb.puffT -= dt;
  if (cb.t <= 0) { cb.active = false; return; }
  if (cb.puffT <= 0 && cb.t > 0.7) {
    cb.puffT = D.puffEvery; cb.puffs++;
    const p = crowBossPos(), dmg = D.dmg * (1 + D.dmgPerWave * (G.wave - 1));
    for (const e of G.enemies) if (!e.dead && e.d >= 0 && dist(e.x, e.y, p.x, p.y) <= D.radius) { e.slowT = Math.max(e.slowT, D.slowDur); e.slowAmt = Math.max(e.slowAmt, D.slow); dmgEnemy(e, dmg, 'crow'); }
    const col = settings.clean ? '#f4fbff' : '#d8cfe8';
    G.rings.push({ x: p.x, y: p.y, r: 30, r2: D.radius, t: 0, dur: 0.7, c: col, w: 14 });
    G.rings.push({ x: p.x, y: p.y, r: 10, r2: D.radius * 0.6, t: 0, dur: 0.5, c: '#9fd07a', w: 6 });
    SFX.play('slow');
  }
  if (Math.random() < dt * 6) { const tp = crowBossTip(); if (tp.x < 1470) crowPuff(tp.x, tp.y, false); }
}
function crowBossTip() {
  const p = crowBossPos(), h = crowBossPose();
  let x, y;
  if (settings.clean) { x = h.hx - 20; y = h.hy - 38; } else { const a = Math.PI + lerp(0.3, -0.15, h.k); x = h.hx - 6 + Math.cos(a) * 51; y = h.hy - 4 + Math.sin(a) * 51; }
  return { x: p.x + (x - 1800) * p.s, y: p.y + (y - 640) * p.s };
}

/* ===================================================================== test-mode bots */
const BOT = { names: [], acc: 0 };
(() => {
  const a = ['Salty', 'Noob', 'Chonky', 'Pixel', 'Toxic', 'Sneaky', 'Lil', 'Big', 'Mega', 'Sus', 'Cozy', 'Tilted', 'Spicy', 'Sleepy', 'Turbo', 'Feral', 'Crispy', 'Moist'];
  const b = ['Goose', 'Gamer', 'Potato', 'Ninja', 'Frog', 'Lurker', 'Wizard', 'Raccoon', 'Taco', 'Slayer', 'Pigeon', 'Nugget', 'Gremlin', 'Waffle', 'Possum', 'Beans'];
  const s = ['', '_', '420', '69', '_TTV', '99', '2k', '', ''];
  while (BOT.names.length < DATA.test.botCount) { let n = pick(a) + pick(b) + pick(s); if (Math.random() < 0.1) n = 'xX' + n + 'Xx'; if (!BOT.names.includes(n)) BOT.names.push(n); }
})();
const BOT_LINES = ['LUL', 'croww is cooked', 'W', 'L', 'gg', 'KEKW', 'send the troll', 'bro is so chill', 'first', 'hes not even looking', 'pass it lol', 'clip that', 'this game is fire', 'chat we can do this', 'HYPE', 'lmaooo', 'nice tower', 'Pog'];
function testModeActive() { return settings.testMode === 'on' || (settings.testMode === 'auto' && Kick.status !== 'live'); }
/* Stop every piece of pending bot work: the rate accumulator plus any bot commands already queued for the next wave
   or waiting in the staggered release line. Real Kick / manual fake-chat entries are left untouched. */
function stopBots() {
  BOT.acc = 0;
  if (!G) return 0;
  const n0 = G.chatQueue.length + G.release.length;
  G.chatQueue = G.chatQueue.filter(q => q.src !== 'bot');
  G.release = G.release.filter(q => q.src !== 'bot');
  return n0 - G.chatQueue.length - G.release.length;
}
function botTick(dt) {
  if (!testModeActive()) { if (BOT.acc || G.chatQueue.some(q => q.src === 'bot') || G.release.some(q => q.src === 'bot')) stopBots(); return; }
  if (settings.botRate <= 0 || G.phase === 'results' || G.phase === 'defeat') { BOT.acc = 0; return; }
  BOT.acc += dt * settings.botRate / 60;
  while (BOT.acc >= 1) {
    BOT.acc -= 1;
    const u = pick(BOT.names); let msg;
    const r = Math.random();
    if (G.vote && r < 0.35) msg = '!' + (1 + Math.floor(Math.random() * 3));
    else if (G.bossReady && r < 0.55) msg = '!boss';
    else if (r < 0.72) { const q = Math.random(); msg = q < 0.4 ? '!bug' : q < 0.62 ? '!spam' : q < 0.84 ? '!troll' : '!lag'; }
    else msg = pick(BOT_LINES);
    onChat(u, msg, 'bot');
  }
}

/* ===================================================================== Kick live chat (read-only Pusher socket, no login) */
const Kick = {
  ws: null, status: 'off', detail: 'not connected', retry: 0, timer: null, pingT: null, gen: 0, msgs: 0,
  room() { return settings.rooms[settings.channel] || ''; },
  set(s, d) { this.status = s; this.detail = d; updateStatusUI(); },
  async lookup() {
    const ch = settings.channel;
    this.set('connecting', 'looking up chatroom id for ' + ch + '...');
    try {
      const r = await fetch('https://kick.com/api/v2/channels/' + encodeURIComponent(ch), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const id = j && j.chatroom && j.chatroom.id;
      if (!id) throw new Error('no chatroom id');
      settings.rooms[ch] = String(id); saveSettings(); syncSettingsUI();
      return String(id);
    } catch (e) {
      this.set('error', 'lookup blocked (' + e.message + ') - paste the chatroom id in settings');
      return '';
    }
  },
  async connect() {
    this.disconnect(true);
    const gen = ++this.gen;
    let id = this.room();
    if (!id) id = await this.lookup();
    if (!id || gen !== this.gen) return;
    this.set('connecting', 'connecting to #' + settings.channel + ' (room ' + id + ')...');
    const url = `wss://ws-${DATA.kick.cluster}.pusher.com/app/${DATA.kick.pusherKey}?protocol=7&client=js&version=${DATA.kick.version}&flash=false`;
    let ws;
    try { ws = new WebSocket(url); } catch (e) { this.set('error', 'websocket failed: ' + e.message); return; }
    this.ws = ws;
    ws.onmessage = ev => {
      if (gen !== this.gen) return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'pusher:connection_established') ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: 'chatrooms.' + id + '.v2' } }));
      else if (m.event === 'pusher_internal:subscription_succeeded') { this.retry = 0; this.set('live', 'LIVE: reading #' + settings.channel + ' chat (room ' + id + ')'); }
      else if (m.event === 'pusher:ping') ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      else if (m.event === 'pusher:error') this.set('error', 'pusher error: ' + JSON.stringify(m.data).slice(0, 80));
      else if (m.event === 'App\\Events\\ChatMessageEvent') {
        let d = m.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
        if (d && d.sender && d.content != null) { this.msgs++; onChat(d.sender.username, d.content, 'kick'); }
      }
    };
    ws.onclose = () => {
      if (gen !== this.gen) return;
      this.ws = null; this.retry++;
      const wait = Math.min(30, 2 * this.retry);
      this.set('error', 'disconnected - retrying in ' + wait + 's');
      this.timer = setTimeout(() => { if (gen === this.gen) this.connect(); }, wait * 1000);
    };
    ws.onerror = () => {};
    this.pingT = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'pusher:ping', data: {} })); }, DATA.kick.pingEvery * 1000);
  },
  disconnect(silent) {
    this.gen++; clearTimeout(this.timer); clearInterval(this.pingT);
    if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; }
    if (!silent) this.set('off', 'disconnected');
  }
};

/* ===================================================================== towers */
function tStats(tw) {
  const b = DATA.towers[tw.type], u = DATA.upgrade, l = tw.level - 1;
  const fog = G && G.hazard && G.hazard.id === 'fog' ? DATA.hazards.fog.range : 1;
  return { range: b.range * Math.pow(u.rangeMult, l) * fog, baseRange: b.range * Math.pow(u.rangeMult, l), dmg: (b.dmg || 0) * Math.pow(u.dmgMult, l), dps: (b.dps || 0) * Math.pow(u.dmgMult, l),
    rate: (b.rate || 0) * Math.pow(u.rateMult, l), splash: b.splash ? b.splash * (1 + 0.1 * l) : 0, slow: b.slow ? Math.min(0.75, b.slow + u.slowAdd * l) : 0, dur: b.dur || 0 };
}
/* tower price: base cost +copyStep (25%) for every tower of that type already owned; rounded to 5g */
function towerCost(type) { const owned = G ? G.towers.filter(t => t && t.type === type).length : 0; return Math.round(DATA.towers[type].cost * (1 + DATA.economy.copyStep * owned) / 5) * 5; }
function cheapestTowerCost() { return Math.min(...Object.keys(DATA.towers).map(towerCost)); }
function waveBonus(w) { return Math.round(DATA.economy.clearBase + DATA.economy.clearPerWave * w); }
function upCost(tw) { return tw.level >= DATA.upgrade.maxLevel ? 0 : Math.round(DATA.towers[tw.type].cost * DATA.upgrade.costMult[tw.level]); }
function build(pi, type) {
  if (G.towers[pi] || G.phase === 'defeat' || G.phase === 'results') return false;
  const c = towerCost(type); if (G.gold < c) { SFX.play('click'); return false; }
  G.gold -= c; const [x, y] = DATA.pads[pi];
  G.towers[pi] = { type, level: 1, cd: 0.3, ang: -Math.PI / 2, anim: 0, recoil: 0, beam: null, spent: c, x, y, pulse: 0, place: 1 };
  G.rings.push({ x, y, r: 20, r2: 90, t: 0, dur: 0.4, c: DATA.towers[type].color, w: 6 });
  SFX.play('place'); return true;
}
function upgrade(pi) {
  const tw = G.towers[pi]; if (!tw) return; const c = upCost(tw); if (!c || G.gold < c) { SFX.play('click'); return; }
  G.gold -= c; tw.spent += c; tw.level++; tw.place = 1;
  G.rings.push({ x: tw.x, y: tw.y, r: 20, r2: 110, t: 0, dur: 0.5, c: '#fff', w: 5 });
  G.texts.push({ x: tw.x, y: tw.y - 60, s: 'LEVEL ' + tw.level, c: DATA.towers[tw.type].color, t: 0, dur: 1, size: 30, vy: -40, pop: true });
  SFX.play('upgrade');
}
function sell(pi) {
  const tw = G.towers[pi]; if (!tw) return; const v = Math.round(tw.spent * DATA.economy.sellRefund);
  G.gold += v; G.towers[pi] = null; view.sel = -1;
  G.texts.push({ x: tw.x, y: tw.y - 40, s: '+' + v, c: '#ffd23f', t: 0, dur: 0.9, size: 28, vy: -50 });
  SFX.play('sell');
}
function targetFor(tw, range) {
  let best = null;
  for (const e of G.enemies) if (!e.dead && e.d >= 0 && dist(e.x, e.y, tw.x, tw.y) <= range + e.r * 0.5 && (!best || e.d > best.d)) best = e;
  return best;
}
/* cannon: aim at the enemy with the most HP packed around it (within the splash), ties -> furthest along the path */
function clusterTarget(tw, range, splash) {
  const inR = G.enemies.filter(e => !e.dead && e.d >= 0 && dist(e.x, e.y, tw.x, tw.y) <= range + e.r * 0.5);
  let best = null, bv = -1;
  for (const e of inR) { let v = 0; for (const o of inR) if (dist(e.x, e.y, o.x, o.y) <= splash * 0.7) v += Math.min(o.hp, 200); v += e.d * 0.01; if (v > bv) { bv = v; best = e; } }
  return best;
}
function updateTowers(dt) {
  for (const tw of G.towers) {
    if (!tw) continue;
    const S = tStats(tw); tw.cd -= dt; tw.anim = Math.max(0, tw.anim - dt * 3); tw.recoil = Math.max(0, tw.recoil - dt * 4); tw.pulse = Math.max(0, tw.pulse - dt * 2); tw.place = Math.max(0, tw.place - dt * 3);
    tw.beam = null;
    let tg = targetFor(tw, S.range);
    if (tg) { const a = Math.atan2(tg.y - tw.y, tg.x - tw.x); let da = a - tw.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; tw.ang += da * Math.min(1, dt * 12); }
    if (tw.type === 'laser') {
      if (tg) { tw.beam = tg; dmgEnemy(tg, S.dps * dt, 'laser'); SFX.play('laser'); if (Math.random() < 0.5) G.parts.push({ x: tg.x + rand(-8, 8), y: tg.y + rand(-8, 8), vx: rand(-60, 60), vy: rand(-120, -20), t: 0, dur: 0.3, size: rand(3, 6), c: '#ff9aa8', g: 0 }); }
    } else if (tw.cd <= 0 && tg) {
      if (tw.type === 'hammer') {
        tw.cd = S.rate; tw.anim = 1;
        for (const e of G.enemies) if (!e.dead && e.d >= 0 && dist(e.x, e.y, tg.x, tg.y) <= S.splash) dmgEnemy(e, S.dmg, 'hammer');
        G.rings.push({ x: tg.x, y: tg.y, r: 10, r2: S.splash, t: 0, dur: 0.3, c: '#ffb03a', w: 8 });
        for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; G.parts.push({ x: tg.x, y: tg.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, t: 0, dur: 0.35, size: 6, c: '#ffe0a0', g: 0 }); }
        G.shake = Math.max(G.shake, 3); SFX.play('hammer');
      } else if (tw.type === 'slow') {
        tw.cd = S.rate; tw.pulse = 1;
        for (const e of G.enemies) if (!e.dead && e.d >= 0 && dist(e.x, e.y, tw.x, tw.y) <= S.range) { e.slowT = S.dur; e.slowAmt = Math.max(e.slowAmt, S.slow); dmgEnemy(e, DATA.towers.slow.dmg * (1 + 0.5 * (tw.level - 1)), 'slow'); }
        G.rings.push({ x: tw.x, y: tw.y, r: 30, r2: S.range, t: 0, dur: 0.6, c: '#5ab8ff', w: 5 });
        SFX.play('slow');
      } else if (tw.type === 'cannon') {
        tw.cd = S.rate; tw.recoil = 1;
        const cg = clusterTarget(tw, S.range, S.splash) || tg; tg = cg;
        const dd = dist(tw.x, tw.y, tg.x, tg.y), dur = clamp(dd / 650, 0.35, 0.75) / DATA.towers.cannon.projSpeed;
        const p = pathAt(tg.d + tg.cur * dur);
        G.projs.push({ x0: tw.x + Math.cos(tw.ang) * 40, y0: tw.y + Math.sin(tw.ang) * 40, x1: p.x, y1: p.y, t: 0, dur, dmg: S.dmg, splash: S.splash, face: Math.floor(Math.random() * 4), h: 90 + dd * 0.25 });
        SFX.play('cannon');
      }
    }
  }
}

/* ===================================================================== crow smoke */
function crowPuff(x, y, big) {
  G.smoke.push({ x, y, vx: rand(-25, 10) - (big ? 40 : 0), vy: rand(-45, -25), r: big ? rand(10, 16) : rand(4, 7), gr: big ? rand(22, 34) : rand(12, 20), t: 0, dur: big ? rand(1.4, 2.2) : rand(2, 3.2), a: big ? 0.55 : 0.33, steam: settings.clean, w: Math.random() * 6 });
}

/* ===================================================================== AFK / autoplay
   The bot builds, upgrades, deploys the Crow Boss and restarts after a loss, so the game loops forever on a BRB scene.
   Real chat keeps playing against it. Any key/click (or the A button/hotkey) hands control back to Croww. */
const AFK = { on: false, think: 0, rounds: 1, chatWins: 0, npcWins: 0, last: null, since: 0 };
const AFK_PLAN = [['laser', 1], ['hammer', 3], ['slow', 4], ['cannon', 0], ['laser', 5], ['cannon', 7], ['hammer', 2], ['laser', 6]];
function trimSession(s) {
  const e = Object.entries(s); if (e.length <= DATA.afk.sessionCap) return s;
  const o = {}; for (const [u, v] of e.sort((a, b) => b[1].dmg - a[1].dmg || b[1].spawns - a[1].spawns).slice(0, DATA.afk.sessionCap)) o[u] = v; return o;
}
function setAfk(v, why) {
  v = !!v; if (AFK.on === v) { syncAfkUI(); return; }
  AFK.on = v; AFK.think = 0.5; AFK.since = gameClock;
  if (v) {
    if (G && G.paused) setPaused(false);
    view.titleT = 0; view.sel = -1;
    if (G) banner('CROWW IS AFK', 'the bot is defending \u2022 type !bug !troll !spam to attack', '#e0b45c', 3.2, 'crowwLUL');
  } else if (G) banner('CROWW IS BACK', why || 'you have control again', '#8fca6a', 2.2, 'crowwW');
  syncAfkUI();
}
function syncAfkUI() { const el = document.getElementById('sAfk'); if (el) el.checked = AFK.on; }
function afkRoundOver() {
  const chat = G.dmgChat >= G.dmgNpc && G.dmgChat > 0;
  if (chat) AFK.chatWins++; else AFK.npcWins++;
  AFK.last = { chat, wave: G.wave, chatDmg: G.dmgChat, npcDmg: G.dmgNpc };
  banner(chat ? 'CHAT WINS!' : 'THE NPCS WIN', chat ? 'chat broke the bot on wave ' + G.wave : 'the house waves got through on wave ' + G.wave, chat ? '#ffd23f' : '#ff5070', 3, chat ? 'crowwHype' : 'crowwL');
}
function afkTick(dt) {
  if (!AFK.on) return;
  if (G.phase === 'results') { if (G.time - G.resultsAt >= DATA.afk.restartAfter) { AFK.rounds++; newGame(true); banner('ROUND ' + AFK.rounds, 'the bot rebuilt the desk \u2022 chat: type !bug to attack', '#e0b45c', 2.6); } return; }
  if (G.phase === 'defeat') return;
  // watchdog: a wave that somehow never clears gets cleared (never stuck when unattended)
  if (G.phase === 'wave' && G.waveT > G.waveDur + DATA.afk.watchdog) { G.enemies = []; G.release = []; }
  AFK.think -= dt; if (AFK.think > 0) return; AFK.think = DATA.afk.think;
  // Crow Boss when it is useful: a crowd near the perch, or chill getting low with enemies on the field
  if (crowBossState() === 'ready' && G.phase === 'wave') {
    const P = DATA.crowBoss.perch, near = G.enemies.filter(e => !e.dead && e.d >= 0 && dist(e.x, e.y, P[0], P[1]) <= DATA.crowBoss.radius).length;
    if (near >= DATA.afk.crowNear || (G.chill < 55 && G.enemies.length >= 3)) deployCrowBoss();
  }
  // build the next planned tower, else the cheapest useful upgrade
  const next = AFK_PLAN.find(([, pi]) => !G.towers[pi]);
  const ups = G.towers.map((tw, i) => tw && tw.level < DATA.afk.maxLevel ? { i, c: upCost(tw) } : null).filter(x => x && x.c > 0).sort((a, b) => a.c - b.c);
  const nCost = next ? towerCost(next[0]) : Infinity, built = G.towers.filter(Boolean).length;
  const money = G.gold - DATA.afk.reserve;
  if (next && (built < 4 || !ups.length || nCost <= ups[0].c * 1.4)) { if (money >= nCost) build(next[1], next[0]); }
  else if (ups.length && money >= ups[0].c) upgrade(ups[0].i);
  // build phase: once the bot has spent what it can, start the wave a little early to keep the show moving
  if (G.phase === 'build' && G.phaseT > DATA.afk.earlyStart && built >= 2 && G.time > 3 && money < Math.min(nCost, ups.length ? ups[0].c : Infinity)) G.phaseT = Math.min(G.phaseT, DATA.afk.earlyStart);
}

/* ===================================================================== main update */
function update(dt) {
  if (!G) return;
  gameClock += dt;
  afkTick(dt);
  if (!G) return;
  botTick(dt);
  updateCrowBoss(dt);
  const C = G.crow;
  G.time += dt;
  for (const b of G.banners) b.t += dt; G.banners = G.banners.filter(b => b.t < b.dur);
  if (G.card) { G.card.t += dt; if (G.card.t > G.card.dur) G.card = null; }
  G.shake = Math.max(0, G.shake - dt * 40); G.deskFlash = Math.max(0, G.deskFlash - dt); G.redFlash = Math.max(0, G.redFlash - dt * 1.8);
  C.hitT = Math.max(0, C.hitT - dt); C.coughT = Math.max(0, C.coughT - dt); C.ringT = Math.max(0, C.ringT - dt); C.cycle += dt;

  if (G.phase === 'build') { G.phaseT -= dt; if (G.phaseT <= 0) startWave(); }
  else if (G.phase === 'wave') {
    G.waveT += dt;
    if (G.waveT < G.waveDur && G.aiBudget >= 1 && settings.npcWaves) {
      G.aiTimer -= dt;
      if (G.aiTimer <= 0) {
        const opts = [['bug', 5]]; const U = DATA.ai.unlock;
        if (G.wave >= U.spam) opts.push(['spam', 2]); if (G.wave >= U.troll) opts.push(['troll', 2 + G.wave * 0.2]); if (G.wave >= U.lag) opts.push(['lag', 1.5]);
        const ok = opts.filter(o => DATA.enemies[o[0]].cost <= G.aiBudget); const tot = ok.reduce((a, o) => a + o[1], 0); let r = Math.random() * tot, ty = 'bug';
        for (const o of ok) { if ((r -= o[1]) <= 0) { ty = o[0]; break; } }
        spawnEnemy(ty, DATA.ai.name, true, 'npc'); G.aiBudget -= DATA.enemies[ty].cost; G.aiTimer = G.aiGap * rand(0.7, 1.3);
      }
    }
    if (G.release.length) { G.releaseT -= dt; if (G.releaseT <= 0) { const q = G.release.shift(); if (q.src === 'bot' && !testModeActive()) { G.releaseT = 0; } else { spawnEnemy(q.type, q.user, false, q.src, q.boost || 0); G.releaseT = DATA.chat.queueStagger; } } }
    if (G.waveT >= G.waveDur && !G.release.length && !G.enemies.length) waveCleared();
  } else if (G.phase === 'defeat') {
    G.defeatT += dt;
    if (G.defeatT > 3.0) { G.phase = 'results'; G.enemies = []; G.projs = []; G.resultsAt = G.time; }
  }
  const playing = G.phase === 'build' || G.phase === 'wave';
  if (playing) {
    G.gold += goldPerSec() * dt;
    if (!G.bossReady && G.hype < DATA.chat.hypeMax) G.hype = Math.max(0, G.hype - DATA.chat.hypeDecay * (1 - DATA.smallChat.hypeDecayCut * smallChatK()) * dt);
    checkBossUnlock();
    G.voteClock -= dt;
    if (G.voteClock <= 0 && !G.vote) { startVote(); G.voteClock = DATA.vote.interval; }
    if (G.vote) { G.vote.t += dt; if (G.vote.t >= DATA.vote.duration) endVote(); }
    if (G.hazard) { G.hazard.t -= dt; if (G.hazard.id === 'drain') G.gold = Math.max(0, G.gold - DATA.hazards.drain.perSec * dt); if (G.hazard.t <= 0) G.hazard = null; }
  }
  if (G.phase !== 'defeat' && G.phase !== 'results') {
    const ff = G.hazard && G.hazard.id === 'ff' ? DATA.hazards.ff.speed : 1;
    for (const e of G.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt); e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0;
      let m = (1 - e.slowAmt) * ff;
      for (const o of G.enemies) if (o !== e && !o.dead && o.type === 'lag' && dist(o.x, o.y, e.x, e.y) < DATA.enemies.lag.aura) { m *= DATA.enemies.lag.auraBuff; break; }
      e.cur = e.speed * m; e.d += e.cur * dt;
      const p = pathAt(e.d); e.x = p.x; e.y = p.y; e.ang = p.ang;
      if (e.d >= PATH.len) deskHit(e);
    }
    G.enemies = G.enemies.filter(e => !e.dead);
    updateTowers(dt);
  }
  for (const p of G.projs) {
    p.t += dt / p.dur;
    if (p.t >= 1 && !p.done) {
      p.done = true;
      for (const e of G.enemies) if (!e.dead && e.d >= 0 && dist(e.x, e.y, p.x1, p.y1) <= p.splash) dmgEnemy(e, p.dmg, 'cannon');
      G.enemies = G.enemies.filter(e => !e.dead);
      G.rings.push({ x: p.x1, y: p.y1, r: 10, r2: p.splash, t: 0, dur: 0.4, c: '#ffd23f', w: 10 });
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, v = rand(100, 360); G.parts.push({ x: p.x1, y: p.y1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: rand(0.3, 0.7), size: rand(5, 10), c: pick(['#ffd23f', '#ff7ac8', '#fff', '#7fb069']), g: 200 }); }
      G.shake = Math.max(G.shake, 6); SFX.play('boom');
    }
  }
  G.projs = G.projs.filter(p => !p.done);
  for (const p of G.parts) { p.t += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; }
  G.parts = G.parts.filter(p => p.t < p.dur);
  for (const p of G.pops) p.t += dt; G.pops = G.pops.filter(p => p.t < p.dur);
  for (const r of G.rings) r.t += dt; G.rings = G.rings.filter(r => r.t < r.dur);
  for (const t of G.texts) { t.t += dt; t.y += t.vy * dt; } G.texts = G.texts.filter(t => t.t < t.dur);
  if (G.phase !== 'results') {
        // the hooded desk mascot never emits smoke/puffs (no ambient, idle or hit puffs); only the Crow Boss smokes
  }
  for (const s of G.smoke) { s.t += dt; s.x += (s.vx + Math.sin(s.t * 2 + s.w) * 14) * dt; s.y += s.vy * dt; s.vx *= 0.99; }
  G.smoke = G.smoke.filter(s => s.t < s.dur);
}
