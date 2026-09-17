# v2 — a second, separate, wordless site

Built in isolation from everything else in this repo. Nothing in the browser is text: only drawing and motion.

**Open it:** double-click `index.html`. No build, no server, no dependencies.

## The journey (one continuous canvas; the scroll is the clock)

1. **Sediment** — a vast, dark sea floor, ridge behind ridge, strewn with small marks and faint embers. Marks keep drifting down and settling. Most of what lies here never wakes; it just keeps its warmth. Where you come near, it warms.
2. **Shoal** — some of the embers wake, the near ones first, the far ones streaming in after, and swim as one long ribbon. Then the shoal tries on the shapes it loves: a turning spiral; dust that a sprig grows up through, leaf by leaf; a swallow — which beats its wings and flies up out of the water.
3. **Surface** — the lights that cross the waterline become birds. Dawn over open sea; the flock's reflection shivers in it.
4. **Tending** — a headland rises across the bay, near hills come up underfoot. As you scroll, the flock sweeps the land from one side to the other and the garden grows in its wake. Click or tap a hill to plant something yourself: a few birds leave the flock to circle it while it grows.
5. **Lamplight** — the sun sets into the sea. People's windows light by themselves — they have their own lamps. One at a time a small light arrives at a window (a ring of welcome), and the room is livelier for a while: two glows taking turns. Visits end, and begin again elsewhere. The rest drift over the garden as lanterns.
6. **Sky** — the lights rise and become stars; the three early shapes are kept as constellations; the sky wheels very slowly. The town goes to sleep window by window — except a few, where someone is up late and not alone. Morning waits under the horizon, and small marks begin to fall again.

## The visitor

- One light always stays beside your pointer. Everyone else politely makes room — more room if your hand is quick.
- Hold still, and some of them gather round you to listen — even from the night sky.
- Click/tap: in water or air, a ripple and a startle; on a hill, you plant (what you planted keeps a little glow after dark); in the night sky, a light goes where you touched and stays.
- Leave it alone and the journey walks itself. The six dots at the edge jump between chapters. `prefers-reduced-motion` turns the self-walking off.

## Files

`index.html`, `style.css`, and under `js/`:

| file | what it holds |
| --- | --- |
| `util.js` | small math / colour helpers |
| `world.js` | where we are in the journey, terrain shapes, the colour of the hour |
| `deep.js` | the sea floor, falling marks, kelp, light from above |
| `sky.js` | sky, sun, clouds, the star wheel |
| `land.js` | the water's surface, headland and hills, town, garden |
| `motes.js` | the lights: every behaviour is a pure target each light springs toward, so nothing breaks on a scroll jump |
| `main.js` | loop, scroll, the visitor |

Vanilla canvas 2D. `index.html#0.62` opens at that point of the journey (0–1) and holds still there.
