/* scene 2 — translucent scholarly scrolls hanging in front of a charcoal disc */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s2');
  const disc = sec.querySelector('.disc');
  const discCv = disc.querySelector('canvas');
  const panels = [...sec.querySelectorAll('.panel')];
  const rates = [0.06, -0.05, 0.09, -0.03, 0.07];
  const S = { sec, visible: false };

  const art = {};
  art.celestial = function (c, w, h, rng) {
    const ink = a => 'rgba(64,50,36,' + a + ')';
    let g = c.createRadialGradient(w * 0.9, h * 0.05, 0, w * 0.9, h * 0.05, w * 0.7);
    g.addColorStop(0, 'rgba(214,128,80,.30)'); g.addColorStop(1, 'rgba(214,128,80,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.40, R = w * 0.44;
    c.lineWidth = 0.8;
    [1, 0.78, 0.55, 0.3].forEach((k, i) => { c.strokeStyle = ink(i ? 0.35 : 0.6); c.beginPath(); c.arc(cx, cy, R * k, 0, 7); c.stroke(); });
    c.strokeStyle = ink(0.3);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); }
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; c.strokeStyle = ink(0.5); c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * (R + (i % 6 ? 3 : 6)), cy + Math.sin(a) * (R + (i % 6 ? 3 : 6))); c.stroke(); }
    c.strokeStyle = ink(0.4); c.beginPath(); c.ellipse(cx, cy, R * 0.96, R * 0.34, -0.4, 0, 7); c.stroke();
    const stars = [];
    for (let i = 0; i < 85; i++) {
      const a = rng() * 7, d = Math.sqrt(rng()) * R * 0.96; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const r = 0.6 + rng() * 1.3; stars.push({ x, y });
      c.fillStyle = ink(0.8); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (rng() < 0.15) { c.strokeStyle = ink(0.45); c.beginPath(); c.arc(x, y, r + 2.5, 0, 7); c.stroke(); }
    }
    for (let k = 0; k < 3; k++) {
      let cur = stars[Math.floor(rng() * stars.length)]; const used = new Set([cur]);
      c.strokeStyle = ink(0.5); c.lineWidth = 0.7; c.beginPath(); c.moveTo(cur.x, cur.y);
      for (let s = 0; s < 4 + Math.floor(rng() * 3); s++) {
        let best = null, bd = 1e9;
        for (const st of stars) { if (used.has(st)) continue; const d = Math.hypot(st.x - cur.x, st.y - cur.y); if (d < bd && d > 8) { bd = d; best = st; } }
        if (!best) break; used.add(best); c.lineTo(best.x, best.y); cur = best;
      }
      c.stroke();
    }
    // crescent
    const mx = w * 0.72, my = h * 0.82, mr = w * 0.085;
    c.fillStyle = ink(0.8); c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.9, 0, 7); c.fill(); c.restore();
    for (let i = 0; i < 40; i++) { c.fillStyle = ink(0.4); c.beginPath(); c.arc(rng() * w, h * 0.6 + rng() * h * 0.4, 0.7, 0, 7); c.fill(); }
  };
  art.botanical = function (c, w, h, rng) {
    let g = c.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, w * 1.0);
    g.addColorStop(0, 'rgba(214,118,66,.60)'); g.addColorStop(0.6, 'rgba(230,166,120,.30)'); g.addColorStop(1, 'rgba(230,166,120,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    g = c.createRadialGradient(w * 0.1, h * 0.12, 0, w * 0.1, h * 0.12, w * 0.6);
    g.addColorStop(0, 'rgba(120,132,156,.35)'); g.addColorStop(1, 'rgba(120,132,156,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const p0 = { x: w * 0.52, y: h * 0.98 }, p1 = { x: w * 0.66, y: h * 0.55 }, p2 = { x: w * 0.42, y: h * 0.12 };
    const bz = t => ({ x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x, y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y });
    c.strokeStyle = 'rgba(250,244,230,.9)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(p0.x, p0.y); c.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); c.stroke();
    c.strokeStyle = 'rgba(90,70,50,.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(p0.x, p0.y); c.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); c.stroke();
    const N = 13;
    for (let i = 1; i < N; i++) {
      const t = i / N, q = bz(t), q2 = bz(t + 0.01);
      const tang = Math.atan2(q2.y - q.y, q2.x - q.x);
      const side = i % 2 ? 1 : -1;
      const ang = tang + side * (1.05 + rng() * 0.25);
      const L = w * (0.26 - t * 0.12) * (0.85 + rng() * 0.3), W = L * 0.32;
      c.save(); c.translate(q.x, q.y); c.rotate(ang);
      c.fillStyle = 'rgba(250,244,230,.88)'; c.beginPath(); c.ellipse(L / 2, 0, L / 2, W / 2, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(90,70,50,.35)'; c.lineWidth = 0.6; c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0); c.stroke();
      for (let v = 1; v < 6; v++) { const vx = L * v / 6; c.beginPath(); c.moveTo(vx, 0); c.lineTo(vx + L * 0.09, -W * 0.42); c.moveTo(vx, 0); c.lineTo(vx + L * 0.09, W * 0.42); c.stroke(); }
      c.restore();
    }
    // flower head at the top
    c.save(); c.translate(p2.x, p2.y);
    for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.fillStyle = 'rgba(250,244,230,.85)'; c.beginPath(); c.ellipse(w * 0.06, 0, w * 0.06, w * 0.025, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(90,70,50,.3)'; c.lineWidth = 0.5; c.stroke(); }
    c.fillStyle = 'rgba(64,50,36,.7)'; c.beginPath(); c.arc(0, 0, w * 0.018, 0, 7); c.fill();
    c.restore();
  };
  art.lunar = function (c, w, h, rng) {
    const R = w * 0.75, cx = w * 1.02, cy = h * 0.42;
    const tex = F.moonTexture(Math.min(1400, Math.ceil(R * 2 * F.DPR)), 11, { inner: '#cfd0cc', outer: '#7f858c' });
    c.globalAlpha = 0.9; c.drawImage(tex, cx - R, cy - R, R * 2, R * 2); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(64,50,36,.25)'; c.lineWidth = 0.6;
    for (let y = h * 0.06; y < h; y += h * 0.07) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = 'rgba(64,50,36,.5)'; c.beginPath(); c.arc(cx, cy, R * 1.06, Math.PI * 0.6, Math.PI * 1.4); c.stroke();
    for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(64,50,36,.5)'; c.beginPath(); c.arc(rng() * w * 0.3, rng() * h, 0.8, 0, 7); c.fill(); }
    let g = c.createRadialGradient(w * 0.2, h * 0.9, 0, w * 0.2, h * 0.9, w * 0.7);
    g.addColorStop(0, 'rgba(214,128,80,.28)'); g.addColorStop(1, 'rgba(214,128,80,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
  art.diagram = function (c, w, h, rng) {
    const ink = a => 'rgba(64,50,36,' + a + ')';
    const sp = w * 0.085;
    for (let x = sp / 2; x < w; x += sp) for (let y = sp / 2; y < h; y += sp) { c.fillStyle = ink(0.35); c.beginPath(); c.arc(x, y, 0.55, 0, 7); c.fill(); }
    const circles = [[w * 0.5, h * 0.28, w * 0.3], [w * 0.38, h * 0.6, w * 0.19], [w * 0.7, h * 0.72, w * 0.11]];
    c.lineWidth = 0.8;
    circles.forEach(([x, y, r]) => { c.strokeStyle = ink(0.6); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.fillStyle = ink(0.8); c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); });
    c.strokeStyle = ink(0.45); c.beginPath(); c.moveTo(circles[0][0], circles[0][1]); c.lineTo(circles[1][0], circles[1][1]); c.lineTo(circles[2][0], circles[2][1]); c.lineTo(circles[0][0], circles[0][1]); c.stroke();
    const [x0, y0, r0] = circles[0];
    c.strokeStyle = ink(0.5); c.beginPath(); c.moveTo(x0 - r0, y0); c.lineTo(x0 + r0, y0); c.moveTo(x0, y0 - r0); c.lineTo(x0, y0 + r0); c.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.beginPath(); c.moveTo(x0 + Math.cos(a) * r0, y0 + Math.sin(a) * r0); c.lineTo(x0 + Math.cos(a) * (r0 - 5), y0 + Math.sin(a) * (r0 - 5)); c.stroke(); }
    c.setLineDash([2, 3]); c.beginPath(); c.arc(x0, y0, r0 * 1.25, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.setLineDash([]);
    let g = c.createRadialGradient(w * 0.7, h * 0.92, 0, w * 0.7, h * 0.92, w * 0.6);
    g.addColorStop(0, 'rgba(120,140,170,.35)'); g.addColorStop(1, 'rgba(120,140,170,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
  art.skywash = function (c, w, h, rng) {
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(178,190,206,.85)'); g.addColorStop(0.7, 'rgba(226,190,170,.75)'); g.addColorStop(1, 'rgba(236,200,178,.5)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const x = rng() * w, y = h * (0.15 + rng() * 0.55), r = w * (0.18 + rng() * 0.3);
      const cg = c.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, 'rgba(255,244,236,.7)'); cg.addColorStop(1, 'rgba(255,244,236,0)');
      c.fillStyle = cg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c.strokeStyle = 'rgba(64,50,36,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(w * 0.05, h * 0.74); c.lineTo(w * 0.95, h * 0.745); c.stroke();
    c.beginPath(); c.arc(w * 0.32, h * 0.22, w * 0.07, 0, 7); c.stroke();
  };
  const kinds = ['celestial', 'lunar', 'botanical', 'diagram', 'skywash'];

  S.layout = function () {
    F.mark(sec);
    panels.forEach((p, i) => {
      if (getComputedStyle(p).display === 'none') return;
      const cv = p.querySelector('canvas'); const { ctx, w, h } = F.fit(cv, 3e6);
      ctx.clearRect(0, 0, w, h); art[kinds[i]](ctx, w, h, F.rng(31 + i));
    });
    const { ctx, w, h } = F.fit(discCv, 3e6);
    ctx.clearRect(0, 0, w, h);
    F.charcoalDisc(ctx, w / 2, h / 2, w * 0.47, F.rng(5), 1100);
    ctx.save(); ctx.beginPath(); ctx.rect(w / 2, 0, w / 2, h); ctx.clip(); ctx.globalAlpha = 0.28;
    const tex = F.moonTexture(Math.min(1200, Math.ceil(w * 0.94 * F.DPR)), 12, { inner: '#c9c7bd', outer: '#6c7177' });
    ctx.drawImage(tex, w * 0.03, h * 0.03, w * 0.94, h * 0.94); ctx.restore();
  };
  S.frame = function () {
    const dy = window.scrollY - sec._top;
    panels.forEach((p, i) => { p.style.transform = 'translate3d(0,' + (dy * rates[i]).toFixed(1) + 'px,0)'; });
    disc.style.transform = 'translate(-50%,-50%) translate3d(0,' + (dy * 0.04).toFixed(1) + 'px,0)';
  };
  F.sceneScrolls = S;
})();
