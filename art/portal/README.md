# CHAT portal sprite

A gold-trimmed dark stone oval gateway with a green-to-gold 3-arm vortex and a soft green halo. Matches the board (#1f1e16), gold #e0b45c and path green #7fb069. It has no text, so keep the existing `CHAT` label.

## Files (1x 128x160, @2x 256x320, transparent)
- `portal_0..3.png`: baked loop frames (glow + base).
- `portal_base.png`: static frame/arch. Draw it on top.
- `portal_glow.png`: vortex layer. Draw it underneath and rotate/pulse it in code.
- `preview.png` (4 frames at 1x + frame 0 at 2x on board color), `preview.gif` (12-frame smooth loop).
- `build_portal.py`: regenerates everything (`python3 build_portal.py`, needs Pillow + numpy).

## Suggested animation
- Baked frames: **6–8 fps**, looping 0→3.
- Layered (preferred, smoother): the vortex center is at (64, 90) in 1x sprite space (56% of height). Rotate the glow around that point at **~0.6 rad/s** (one turn ≈ 10 s). Pulse its alpha with `0.85 + 0.15*sin(t*2.5)`, plus an optional scale of `1 + 0.03*sin(t*2.5)`. Then draw the base on top with no transform.
- Placement: center the sprite horizontally on `path[0].x + 18`, with the vortex center near `path[0].y`. At 1x, that means drawing at (x+18-64, y-90). Use @2x when the canvas is scaled up.
