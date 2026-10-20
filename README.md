# Fish Joy

A browser-based fish shooting game built with the Quark.js canvas/DOM game engine. Players fire bullets at animated fish swimming across the screen, earning coins for successful captures.

## Gameplay

- Click or tap anywhere on the screen to fire a bullet toward that position.
- Each bullet costs coins equal to the current cannon power level.
- Successfully hitting a fish captures it and awards coins based on the fish type.
- Use the **−** and **+** buttons on the bottom bar to cycle through 7 cannon power levels. Higher power fires a larger bullet and costs more per shot, but yields better capture rates against larger fish.
- Your coin balance is displayed on the bottom-left of the screen and caps at 999,999.

## Fish Types

There are 12 distinct creature types, ranging from tiny fish worth 1 coin up to two shark varieties worth 100 and 200 coins. Larger creatures are rarer, move more slowly, and have a lower capture rate — making them high-risk, high-reward targets.

| Tier | Types | Coin Value | Capture Rate |
|------|-------|-----------|--------------|
| Small | fish1 – fish4 | 1 – 8 | 40% – 55% |
| Medium | fish5 – fish8 | 10 – 40 | 20% – 35% |
| Large | fish9, fish10 | 50 – 60 | 10% – 15% |
| Boss | shark1, shark2 | 100 – 200 | 2% – 5% |

## Project Structure

```
fish/
├── index.html              # Entry point
├── fishjoy.game.js         # Bundled build (single-file distribution)
├── js/
│   └── quark.base-*.min.js # Quark.js engine (minified)
├── src/
│   ├── R.js                # Resource manager — loads and defines all assets
│   ├── fishjoy.js          # Main game object: init, load, startup, game loop
│   ├── fishjoy2.js         # Alternate entry variant of the main game file
│   ├── Utils.js            # Math helpers (direction/angle calculation)
│   ├── FishManager.js      # Fish spawning, pooling, and lifecycle
│   ├── FishGroup.js        # Spawn pattern layouts (e.g. horizontal line)
│   └── views/
│       ├── Fish.js         # Fish sprite: animation, movement, capture logic
│       ├── Cannon.js       # Cannon sprite: power levels, fire animation
│       ├── Bullet.js       # Bullet movement and collision detection
│       ├── Player.js       # Player state: coins, cannon control, firing
│       └── Num.js          # Sprite-based numeric display
└── images/                 # All game assets (sprites, spritesheets, backgrounds)
```

## Running the Game

No build step is required. Serve the `fish/` directory from any static HTTP server and open `index.html` in a browser.

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .

# Then open: http://localhost:8080
```

> Opening `index.html` directly as a `file://` URL will not work due to browser security restrictions on local image loading.

## URL Parameters

The game reads optional query string parameters on load:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `mode` | `2` | Render mode: `1` = Canvas, `2` = DOM |
| `fps` | `60` | Target frames per second |
| `width` | auto | Override canvas width (px) |
| `height` | auto | Override canvas height (px) |
| `coin` | `10000` | Starting coin balance |
| `num` | `100` | Fish pool size (max fish on screen) |

Example: `index.html?coin=50000&num=50&mode=1`

## Architecture Notes

**Namespace.** All game modules register themselves under the `fish` namespace via `Q.use("fish")`. This avoids global pollution and allows modules loaded in any order to share state through `ns.game`, `ns.R`, etc.

**Object pooling.** `FishManager` pre-allocates a fixed pool of `Fish` objects at startup. When a fish goes off-screen or is captured it is returned to the pool rather than garbage collected, keeping frame times consistent.

**Sprite animation.** Fish and cannon sprites use a frame-based system defined in `R.js`. Each type specifies frame rectangles within its spritesheet, labeled jump points (`swim`, `capture`) for animation state transitions, and a polygon hit area for collision detection.

**Rendering modes.** Mode 1 draws everything to a `<canvas>` element via `Q.CanvasContext`. Mode 2 (default) positions DOM elements with CSS via `Q.DOMContext`, which performs better on older mobile browsers that lacked GPU-accelerated canvas.

## Dependencies

- **Quark.js** (`quark.base-1.0.0.alpha.min.js`) — lightweight game engine providing the stage/display-object tree, event system, tweening, image loading, timer, and both Canvas and DOM rendering contexts.