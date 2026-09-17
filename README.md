# ○

A wordless personal site: a single ink thread, drawn by scrolling, runs through
six generative scenes on cream paper. No text appears anywhere in the page.

## Run

Static files, no build step. Open `index.html` directly, or serve the folder:

    python3 -m http.server 8000
    # then http://localhost:8000

## Structure

- `index.html` – the page skeleton (sections only, no copy)
- `css/style.css` – layout, hanging-scroll sway, light beams, cursor
- `js/util.js` – seeded RNG, charcoal and ink helpers, lunar texture
- `js/paper.js` – fixed paper background
- `js/scene-*.js` – one file per scene (dot, tree, scrolls, stars, moon, frontier)
- `js/thread.js` – the page-long ink line revealed by scroll position
- `js/main.js` – layout, pointer, grain, custom cursor, frame loop

`_inspiration/` holds the reference frames the visual language was drawn from.

Honours `prefers-reduced-motion` (everything renders fully drawn, no sway or grain).

A second, separate wordless site lives in [`v2/`](v2/) — open `v2/index.html`.
