/* fixed paper background — drawn once per resize */
(function () {
  const F = window.F;
  const cv = document.getElementById('paper');
  function layout() {
    const w = innerWidth, h = innerHeight;
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); const rng = F.rng(3);
    c.fillStyle = F.CREAM; c.fillRect(0, 0, w, h);
    // soft tonal blotches
    for (let i = 0; i < 14; i++) {
      const x = rng() * w, y = rng() * h, r = (0.2 + rng() * 0.5) * Math.max(w, h);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const dark = rng() < 0.5;
      g.addColorStop(0, dark ? 'rgba(120,95,60,.06)' : 'rgba(255,250,235,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fibres
    c.strokeStyle = 'rgba(110,90,60,.07)'; c.lineWidth = 0.7;
    for (let i = 0; i < w * h / 9000; i++) {
      const x = rng() * w, y = rng() * h, a = rng() * 7, l = 4 + rng() * 14;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    // speckles
    for (let i = 0; i < w * h / 1400; i++) {
      const x = rng() * w, y = rng() * h, r = 0.35 + rng() * 0.9;
      c.fillStyle = 'rgba(95,78,52,' + (0.10 + rng() * 0.3) + ')';
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    // vignette
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(90,70,40,0)'); v.addColorStop(1, 'rgba(90,70,40,.16)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
  F.paper = { layout };
})();
