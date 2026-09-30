# CHAT CLASH v0.1

A stream-interactive tower defense for **Croww** ([kick.com/croww](https://kick.com/croww)).
Croww is the defender at his gaming desk (with his crow on his shoulder), and **chat spawns the enemies** that march at the desk.

**Play / capture:** https://mckindigo.github.io/chat-clash/

`index.html` is a single self-contained file: inline JS, Canvas 2D, procedural art, and embedded Oswald font plus 4 Croww emotes (base64). It renders at 1920x1080 and letterboxes to any 16:9 size.

## For the streamer (Croww)
- **Build:** click a glowing pad and pick a tower (or press **1-4**). Click a tower to **Upgrade (U)** or **Sell (X)**.
  - **Mod Hammer**: melee slam, splash. **Ban Laser**: single-target beam. **Slow Mode**: slows everything nearby. **Emote Cannon**: lobbed AoE.
- **Rounds:** a short build phase, then a wave. **Space** starts the wave early. Gold comes from kills plus a steady trickle.
- **You lose** when the **Chill Meter** hits 0. Score = waves survived. Waves are endless and escalate.
- **Crow Boss (unlockable ally):** the first time you clear **wave 5** you get a *CROW BOSS UNLOCKED* banner (saved in this browser for good). Then press **B** or click the **CROW BOSS** button under the chill meter: the old smoking crow (coffee mug in Clean mode) flies onto the map for 12s, gives +8 chill, and every 1.4s blows a smoke ring that damages and slows (50%) every enemy within range. 90s cooldown. Settings also has an *Unlock Crow Boss now* button.
- Keys: **S** settings (or the gear icon), **P / Esc** pause (or the pause button in the top bar), **M** mute (or the speaker icon).
- **Pause** freezes everything (waves, enemies, towers, votes, hazards, hype, chatter cooldowns, Crow Boss). Chat that arrives while paused (Kick or the fake-chat box) is **held** and plays in order when you resume.
- **Small chat mode** (Settings > Game, Auto by default): with fewer than 8 active chatters (people who chatted in the last 2 min) the gold trickle rises from 1.5/s up to 3.0/s at 0 chatters, and kill gold gets up to +10%. *Always on* = full boost, *Off* = flat 1.5/s.
- Settings (saved in this browser): channel, chatroom id, Clean mode, cooldown per chatter, max chat enemies, difficulty, test mode and bot rate, a fake-chat box, volume and mute.

## For chat
| Command | What it does |
|---|---|
| `!bug` | weak & fast |
| `!troll` | tanky |
| `!lag` | slow, but speeds up everything near it |
| `!spam` | swarm of 5 tiny ones |
| `!boss` | only when the **HYPE** meter is full (chatting fills it). The first to type it wins. |
| `!1` `!2` `!3` | every 60s there's a 20s vote on a hazard: Fog, Fast Forward, Blackout or Gold Drain |

Each chatter has a cooldown (default 20s), and there's a cap on chat enemies alive. Your name rides above your minion. Damage to the desk is credited to you on **TOP ATTACKERS**, and the top chatter of each wave gets a shout-out card. If chat is quiet, house "npc" waves keep the game going.

## Kick chat (read-only, no login)
The game reads chat the way Kick's web client does:
1. The chatroom id comes from `GET https://kick.com/api/v2/channels/<channel>` (`chatroom.id`). Croww's (`962037`) is built in. For another channel, the game tries this lookup. If Cloudflare blocks it, open that URL in a normal tab and paste `chatroom.id` into Settings.
2. It then opens `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false`, subscribes to `chatrooms.<id>.v2`, and parses `App\Events\ChatMessageEvent` (`sender.username`, `content`).

The status light in the top bar shows the connection: green = connected, yellow = connecting, red = error/retrying, grey = off.
**Test mode** (Auto by default) runs bot chatters whenever live chat isn't connected. Set it to **Always on** to test while connected. **Off** means no bot chatters ever (it also cancels bot attacks already queued) and it is remembered across reloads.
**House NPC waves** (Settings, on by default) are the grey "npc" enemies the game sends itself each wave; untick it to turn them off. They are not chat bots.
URL params: `?channel=name`, `?room=id`, `?clean=1`, `?test=on|off|auto` (one-shot; changing Test mode in Settings removes it from the URL), `?npc=0`, `?connect=0`.

## OBS setup
**Option A: Browser Source (recommended)**
1. Sources > + > **Browser**. URL `https://mckindigo.github.io/chat-clash/`, Width **1920**, Height **1080**.
2. Tick **Control audio via OBS** if you want the SFX on their own mixer channel.
3. To play, right-click the source > **Interact**. Mouse and keyboard go to the game in that window (build towers, S for settings, and so on). A browser source can't be clicked from the preview directly.
4. Settings are stored in the browser source's own storage. Change them through Interact.

**Option B: Window Capture of a normal browser**
1. Open the URL in Chrome/Edge/Firefox, ideally as its own window (F11 fullscreen or a 16:9 window).
2. Add a **Window Capture** (macOS: Screen/Window Capture) of that window, and crop the browser chrome if needed.
3. Play directly in the browser. Capture the audio with Application Audio Capture, or leave it on desktop audio.

Either way, keep the volume modest and remember **M** mutes instantly.

## Develop
- `index.html` is **generated**: edit `src/` and run `node tools/build.js` (`npm run build`). All tunable numbers live in the `DATA` object at the top of `src/1-core.js`.
- The mascot is drawn in layers (`MASCOT.body` / `.arm` / `.held` / `.smoke` in `src/3-draw.js`), so a layer can be swapped for a sprite later.
- Tests: `npm i && node tools/browser-test.js` runs headless Chrome. It checks building, a survived wave, the vote, hazards, the boss, a defeat and results, Play Again, clean mode and fake chat, with no console errors, and writes `shots/`. `node tools/verify-bots.js` checks in real time that Test mode Off stops all bots (30s+), survives reload, and that Kick/fake chat still work. `node tools/art-shots.js` writes 1920x1080 art/Crow Boss screenshots to `shots/verify/`. `node tools/kick-live-test.js <chatroomId>` is a read-only socket check. `node tools/live-browser-test.js <channel>` is a read-only in-browser check.

## Credits
Desk mascot and neon logo: approved Croww art from `brand/`, copied to `assets/` and embedded by the build. Oswald font (subset) by Vernon Adams et al., SIL Open Font License 1.1. Croww emotes and brand: (c) Croww, used with permission and not covered by any code license.
