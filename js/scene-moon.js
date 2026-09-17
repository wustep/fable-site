/* scene 4 — a moon fills with scroll; small circles are marked off one by one */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s4');
  const cv = sec.querySelector('canvas');
  let ctx, w, h, mx, my, R, tex, grid = [], gridOff, gctx, filled = 0, gridRng, mobile;
  const shadow = document.createElement('canvas');
  const S = { sec, visible: false, moon: null };

  S.layout = function () {
    ({ ctx, w, h } = F.fit(cv, 6e6)); F.mark(sec);
    mobile = w < 720;
    R = Math.min(w, h) * (mobile ? 0.3 : 0.23);
    mx = mobile ? w * 0.5 : w * 0.36; my = mobile ? h * 0.3 : h * 0.38;
    S.moon = { x: mx, y: my, R };
    tex = F.moonTexture(Math.min(1800, Math.ceil(R * 2 * F.DPR)), 17, { inner: '#dcd6c6', outer: '#a49f92' });
    shadow.width = shadow.height = Math.ceil(R * 2.1 * F.DPR);
    // grid of small circles
    const cols = mobile ? 8 : 12, rows = mobile ? 6 : 7;
    const gx0 = mobile ? w * 0.24 : w * 0.6, gx1 = mobile ? w * 0.92 : w * 0.92;
    const gy0 = mobile ? h * 0.62 : h * 0.5, gy1 = mobile ? h * 0.88 : h * 0.8;
    grid = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid.push({ x: F.lerp(gx0, gx1, cols > 1 ? c / (cols - 1) : 0), y: F.lerp(gy0, gy1, rows > 1 ? r / (rows - 1) : 0) });
    const cr = Math.min((gx1 - gx0) / (cols - 1), (gy1 - gy0) / (rows - 1)) * 0.3;
    grid.forEach(g => g.r = cr);
    gridOff = document.createElement('canvas'); gridOff.width = cv.width; gridOff.height = cv.height;
    gctx = gridOff.getContext('2d'); gctx.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
    gridRng = F.rng(53); filled = 0;
    // outlines drawn once
    const orng = F.rng(54);
    gctx.strokeStyle = F.INK; gctx.lineWidth = 0.9; gctx.globalAlpha = 0.6;
    grid.forEach(g => { F.wobbleCircle(gctx, g.x, g.y, g.r, orng, g.r * 0.18); gctx.stroke(); });
  };
  S.frame = function (t) {
    const p = F.prog(sec, 0.85, 0.45);
    ctx.clearRect(0, 0, w, h);
    // halo
    const g = ctx.createRadialGradient(mx, my, R * 0.9, mx, my, R * 1.6);
    g.addColorStop(0, 'rgba(255,245,220,.28)'); g.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - R * 1.6, my - R * 1.6, R * 3.2, R * 3.2);
    ctx.drawImage(tex, mx - R, my - R, R * 2, R * 2);
    // phase: p 0 = new, 1 = full (waxing from the right)
    const k = F.smooth(p * 1.05);
    const sc = shadow.getContext('2d'); const S2 = shadow.width; const r = R * (S2 / (R * 2.1)); const c0 = S2 / 2;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, S2, S2);
    sc.fillStyle = 'rgba(28,24,20,.9)'; sc.beginPath(); sc.arc(c0, c0, r * 1.01, 0, 7); sc.fill();
    sc.globalCompositeOperation = 'destination-out';
    const rx = r * (2 * k - 1);
    sc.beginPath(); sc.arc(c0, c0, r * 1.02, -Math.PI / 2, Math.PI / 2, false);
    if (Math.abs(rx) < 0.5) sc.lineTo(c0, c0 - r * 1.02); else sc.ellipse(c0, c0, Math.abs(rx) * 1.02, r * 1.02, 0, Math.PI / 2, -Math.PI / 2, rx < 0);
    sc.closePath(); sc.fill();
    sc.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.clip(); ctx.filter = 'blur(' + Math.max(2, R * 0.03).toFixed(1) + 'px)';
    ctx.drawImage(shadow, mx - R * 1.05, my - R * 1.05, R * 2.1, R * 2.1); ctx.restore();
    ctx.strokeStyle = F.INK; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my, R * 1.005, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    // fill grid circles as the scene passes
    const target = Math.floor(F.clamp((p - 0.08) / 0.84, 0, 1) * grid.length);
    let budget = F.reduced ? 1e4 : 3;
    while (filled < target && budget-- > 0) { const gq = grid[filled]; F.charcoalDisc(gctx, gq.x, gq.y, gq.r * 0.92, gridRng, 14); filled++; }
    ctx.drawImage(gridOff, 0, 0, w, h);
    // the circle being worked on right now
    if (filled < grid.length && p > 0.05) {
      const gq = grid[filled]; const pulse = F.reduced ? 0 : 0.5 + 0.5 * Math.sin(t / 500);
      ctx.strokeStyle = F.INK; ctx.globalAlpha = 0.25 + 0.3 * pulse; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(gq.x, gq.y, gq.r * 1.8, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  };
  F.sceneMoon = S;
})();
