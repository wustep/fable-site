# v2 — a second, separate, wordless site

Built in isolation from everything else in this repo. No text appears in the browser: only drawing and motion.

**Open it:** double-click `index.html` (no build, no server, no dependencies), or serve the folder with anything static.

**The journey (one continuous canvas, driven by scroll):**

1. **Sediment** — a dark sea floor where small marks drift down and settle; embers sleep in it and warm when you come near.
2. **Shoal** — the embers wake and rise as one curious body, trying on shapes it loves: a spiral, a sprig, a swallow.
3. **Surface** — the swallow breaks through into dawn and scatters into a flock of birds.
4. **Tending** — paper hills rise; wherever the flock (or you) passes, a garden grows. Click or tap the hills to plant.
5. **Lamplight** — dusk; the birds become small lights again, one slips into each window and keeps someone company, the rest drift as fireflies.
6. **Sky** — the lights rise and become stars; the early shapes return as constellations over the sleeping town, and the next morning waits under the horizon.

**Interaction:** scroll (or leave it alone and it walks itself); one light always stays beside your pointer; everything else politely makes room; click/tap sends a ripple, and on land, plants something. The six dots at the edge jump between chapters.

**Files:** `index.html`, `style.css`, `js/util.js` (math/colour), `js/scene.js` (world), `js/motes.js` (the lights), `js/main.js` (loop, scroll, input). Vanilla canvas 2D. `index.html#0.62` opens at a given point of the journey (0–1) with autoplay off.
