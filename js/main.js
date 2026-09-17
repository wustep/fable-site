/* orchestration: layout, scroll, pointer, grain, cursor, frame loop */
(function () {
  const F = window.F;
  const scenes = [F.sceneDot, F.sceneTree, F.sceneScrolls, F.sceneStars, F.sceneMoon, F.sceneFrontier];
  const glow = document.querySelector('.glow'), cur = document.querySelector('.cur');
  const trail = document.getElementById('trail'), grain = document.getElementById('grain');
  let tctx, gctx, tile, lastGrain = 0, cx = -100, cy = -100, px = -100, py = -100, lastW = 0, lastH = 0, started = false;

  function layout() {
    lastW = innerWidth; lastH = innerHeight;
    F.paper.layout();
    scenes.forEach(s => s.layout());
    const d = F.sceneDot, t = F.sceneTree, sc = F.sceneScrolls, st = F.sceneStars, mo = F.sceneMoon, fr = F.sceneFrontier;
    const w = innerWidth;
    const y0 = d.sec._top + d.cy;
    const lineEnd = { x: d.cx + d.R * 1.7, y: y0 };
    const wps = [
      { x: -40, y: y0, t: 0 }, { x: d.cx - d.R * 1.6, y: y0, t: 0 }, { x: lineEnd.x, y: y0, t: 0 },
      { x: d.cx + d.R * 2.5, y: y0 + d.R * 0.7, t: 1 },
      { x: w * 0.56, y: d.sec._top + d.sec._h + t.sec._h * 0.02, t: 1 },
    ];
    t.chain.forEach((c, i) => wps.push({ x: c.x, y: c.y + t.sec._top, t: i === 0 ? 1 : 0 }));
    wps.push({ x: w * 0.45, y: sc.sec._top + sc.sec._h * 0.22, t: 1 }, { x: w * 0.6, y: sc.sec._top + sc.sec._h * 0.6, t: 1 }, { x: w * 0.5, y: sc.sec._top + sc.sec._h, t: 1 });
    const dk = st.dark;
    wps.push({ x: w * 0.5, y: st.sec._top + st.sec._h * 0.08, t: 1 }, { x: dk.cx, y: dk.cy - dk.R, t: 1 }, { x: dk.cx - dk.R * 0.3, y: dk.cy - dk.R * 0.2, t: 1 }, { x: dk.cx + dk.R * 0.25, y: dk.cy + dk.R * 0.5, t: 1 }, { x: dk.cx, y: dk.cy + dk.R, t: 1 }, { x: w * 0.5, y: st.sec._top + st.sec._h, t: 1 });
    const m = mo.moon, mt = mo.sec._top;
    if (w < 720) wps.push({ x: m.x - m.R * 1.2, y: mt + m.y - m.R * 0.8, t: 1 }, { x: m.x - m.R * 1.3, y: mt + m.y + m.R * 0.6, t: 1 }, { x: w * 0.09, y: mt + mo.sec._h * 0.62, t: 1 }, { x: w * 0.1, y: mt + mo.sec._h * 0.9, t: 1 }, { x: w * 0.2, y: mt + mo.sec._h, t: 1 });
    else wps.push({ x: m.x + m.R * 1.3, y: mt + m.y - m.R * 0.9, t: 1 }, { x: m.x + m.R * 1.45, y: mt + m.y + m.R * 0.3, t: 1 }, { x: m.x + m.R * 0.9, y: mt + m.y + m.R * 1.35, t: 1 }, { x: w * 0.56, y: mt + mo.sec._h * 0.82, t: 1 }, { x: w * 0.4, y: mt + mo.sec._h, t: 1 });
    fr.route.forEach(p => wps.push({ x: p.x, y: p.y, t: 1 }));
    wps.push({ x: w * 0.47, y: fr.end.y - (fr.end.y - fr.route[fr.route.length - 1].y) * 0.55, t: 1 }, { x: fr.end.x, y: fr.end.y - fr.end.r, t: 1 });
    F.thread.build(wps, lineEnd, dk);
    trail.width = innerWidth; trail.height = innerHeight; tctx = trail.getContext('2d');
    grain.width = Math.ceil(innerWidth / 2); grain.height = Math.ceil(innerHeight / 2); gctx = grain.getContext('2d');
  }

  // visibility
  const io = new IntersectionObserver(es => es.forEach(e => { const s = scenes.find(s => s.sec === e.target); if (s) s.visible = e.isIntersecting; }), { rootMargin: '25% 0px' });
  scenes.forEach(s => io.observe(s.sec));

  // pointer
  addEventListener('pointermove', e => { F.mouse.x = e.clientX; F.mouse.y = e.clientY; F.mouse.has = true; }, { passive: true });
  addEventListener('pointerdown', e => { F.mouse.x = e.clientX; F.mouse.y = e.clientY; F.mouse.has = true; F.sceneStars.tap(e.clientX, e.clientY, performance.now()); }, { passive: true });
  document.addEventListener('pointerleave', () => { if (F.fine) F.mouse.has = false; });
  const endEl = document.querySelector('.s5 .end');
  endEl.addEventListener('pointerenter', () => { F.sceneFrontier.hover(true); cur.classList.add('big'); });
  endEl.addEventListener('pointerleave', () => { F.sceneFrontier.hover(false); cur.classList.remove('big'); });
  endEl.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: F.reduced ? 'auto' : 'smooth' }); });

  function grainFrame(t) {
    if (F.reduced) return;
    if (t - lastGrain < 90) return; lastGrain = t;
    if (!tile) { tile = document.createElement('canvas'); tile.width = tile.height = 128; }
    const tc = tile.getContext('2d'); const img = tc.createImageData(128, 128); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 90 + Math.random() * 165; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    tc.putImageData(img, 0, 0);
    gctx.fillStyle = gctx.createPattern(tile, 'repeat'); gctx.fillRect(0, 0, grain.width, grain.height);
  }
  function cursorFrame() {
    if (!F.fine) return;
    const m = F.mouse; if (!m.has) { cur.style.opacity = 0; return; } cur.style.opacity = '';
    if (cx < -50) { cx = m.x; cy = m.y; }
    px = cx; py = cy; cx += (m.x - cx) * 0.35; cy += (m.y - cy) * 0.35;
    cur.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
    glow.style.setProperty('--mx', cx.toFixed(0) + 'px'); glow.style.setProperty('--my', cy.toFixed(0) + 'px');
    if (F.reduced) return;
    tctx.save(); tctx.globalCompositeOperation = 'destination-out'; tctx.fillStyle = 'rgba(0,0,0,.09)'; tctx.fillRect(0, 0, trail.width, trail.height); tctx.restore();
    const d = Math.hypot(cx - px, cy - py); const n = Math.max(1, Math.ceil(d / 3));
    tctx.fillStyle = F.INK;
    for (let i = 0; i < n; i++) { const t = i / n; tctx.globalAlpha = 0.28; tctx.beginPath(); tctx.arc(F.lerp(px, cx, t), F.lerp(py, cy, t), 1.4, 0, 7); tctx.fill(); }
    tctx.globalAlpha = 1;
  }

  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 140) layout(); }, 160); });

  function loop(t) {
    if (!started) { started = true; F.thread.start(t + (F.reduced ? 0 : 2400)); }
    for (const s of scenes) if (s.visible) s.frame(t);
    F.thread.frame(t);
    cursorFrame(); grainFrame(t);
    requestAnimationFrame(loop);
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  layout();
  requestAnimationFrame(loop);
})();
