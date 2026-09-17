/* scene 5 — a hand-drawn map that runs out of drawn land, then opens into sky */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s5');
  const mapCv = sec.querySelector('.map'), skyCv = sec.querySelector('.sky'), endEl = sec.querySelector('.end');
  let mc, mw, mh, sc, sw, sh, els = [], lastP = -1, coast = [], route = [], clouds = [], moonTex, endPt, endStrokes = 0, endRng, endHover = false;
  const endOff = document.createElement('canvas');
  const S = { sec, visible: false, route: [], end: null };

  function coastY(x) { // nearest coast y for a given x (coast is monotone in x)
    let lo = 0, hi = coast.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (coast[mid].x < x) lo = mid + 1; else hi = mid; }
    return coast[lo].y;
  }
  function seg(c, pts, f, width, alpha) { // draw first fraction f of a polyline
    if (f <= 0) return;
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    let left = total * f; c.save(); c.strokeStyle = F.INK; c.globalAlpha = alpha; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (d <= left) { c.lineTo(pts[i].x, pts[i].y); left -= d; } else { const t = left / d; c.lineTo(F.lerp(pts[i - 1].x, pts[i].x, t), F.lerp(pts[i - 1].y, pts[i].y, t)); break; }
    }
    c.stroke(); c.restore();
  }

  S.layout = function () {
    ({ ctx: mc, w: mw, h: mh } = F.fit(mapCv, 6e6)); ({ ctx: sc, w: sw, h: sh } = F.fit(skyCv, 6e6));
    F.mark(sec); F.mark(mapCv); F.mark(skyCv);
    const rng = F.rng(71); els = []; lastP = -1;
    const mobile = mw < 720;
    // coastline
    coast = []; const N = 90;
    for (let i = 0; i <= N; i++) {
      const s = i / N; const x = -20 + (mw * 0.66 + 20) * s;
      const y = mh * 0.30 + (mh * 0.72 + 20) * (0.45 * s + 0.55 * s * s) + mh * 0.055 * F.noise1(s * 9 + 3) + mh * 0.02 * F.noise1(s * 31);
      coast.push({ x, y: y + (rng() - 0.5) * 2 });
    }
    // route: settlements on land, then out to sea
    route = [{ x: mw * 0.26, y: mh * 0.14 }, { x: mw * 0.17, y: mh * 0.36 }, { x: mw * 0.34, y: mh * 0.52 }];
    const cxr = mw * 0.47; route.push({ x: cxr, y: coastY(cxr) });
    route.push({ x: mw * 0.58, y: mh * 0.82 }, { x: mw * 0.5, y: mh * 1.02 });
    S.route = route.map(p => ({ x: p.x, y: p.y + mapCv._top }));
    const inLand = (x, y) => y < coastY(x) - 6;
    // graticule
    els.push({ t0: 0, t1: 0.12, draw: f => { mc.save(); mc.strokeStyle = F.INK; mc.globalAlpha = 0.08 * f; mc.lineWidth = 0.7;
      for (let x = mw * 0.08; x < mw; x += mw * 0.12) { mc.beginPath(); mc.moveTo(x, 0); mc.lineTo(x, mh * f); mc.stroke(); }
      for (let y = mh * 0.1; y < mh; y += mh * 0.12) { mc.beginPath(); mc.moveTo(0, y); mc.lineTo(mw * f, y); mc.stroke(); } mc.restore(); } });
    // coast line
    els.push({ t0: 0.04, t1: 0.42, draw: f => seg(mc, coast, f, 1.5, 0.9) });
    // form lines on the sea side
    for (let k = 1; k <= 3; k++) {
      const off = k * 7 + k * k * 2; const pts = [];
      for (let i = 0; i < coast.length - 1; i++) { const a = coast[i], b = coast[i + 1]; const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; pts.push({ x: a.x - dy / L * off, y: a.y + dx / L * off }); }
      els.push({ t0: 0.2 + k * 0.05, t1: 0.5 + k * 0.05, draw: f => { mc.save(); mc.setLineDash([9 + k * 3, 6 + k * 4]); seg(mc, pts, f, 0.8, 0.45 - k * 0.1); mc.restore(); } });
    }
    // hills
    const hills = [];
    for (let c = 0; c < (mobile ? 5 : 8); c++) {
      const hx = mw * (0.05 + rng() * 0.5), hy = mh * (0.08 + rng() * 0.6); if (!inLand(hx, hy)) continue;
      for (let i = 0; i < 6 + Math.floor(rng() * 8); i++) { const x = hx + (rng() - 0.5) * mw * 0.14, y = hy + (rng() - 0.5) * mh * 0.07; if (inLand(x, y)) hills.push({ x, y, r: 4 + rng() * 7, t: rng() }); }
    }
    hills.sort((a, b) => a.t - b.t);
    els.push({ t0: 0.3, t1: 0.62, draw: f => { mc.save(); mc.strokeStyle = F.INK; mc.globalAlpha = 0.7; mc.lineWidth = 0.9; const n = Math.floor(f * hills.length);
      for (let i = 0; i < n; i++) { const hq = hills[i]; mc.beginPath(); mc.arc(hq.x, hq.y, hq.r, Math.PI * 1.05, Math.PI * 1.95); mc.stroke(); mc.beginPath(); mc.moveTo(hq.x + hq.r * 0.2, hq.y - hq.r * 0.9); mc.lineTo(hq.x + hq.r * 0.5, hq.y - hq.r * 0.2); mc.stroke(); } mc.restore(); } });
    // rivers
    for (let rI = 0; rI < 2; rI++) {
      const pts = []; let x = mw * (0.08 + rng() * 0.3), y = mh * (0.05 + rng() * 0.25);
      const tx = mw * (0.3 + rI * 0.25), ty = coastY(tx);
      for (let i = 0; i < 60; i++) { pts.push({ x, y }); const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy); if (L < 6) break; x += dx / L * 9 + (rng() - 0.5) * 6; y += dy / L * 9 + (rng() - 0.5) * 6; }
      pts.push({ x: tx, y: ty });
      els.push({ t0: 0.36 + rI * 0.06, t1: 0.66 + rI * 0.06, draw: f => seg(mc, pts, f, 0.9, 0.7) });
    }
    // settlements (open circle with a dot)
    route.slice(0, 3).forEach((s, i) => els.push({ t0: 0.42 + i * 0.07, t1: 0.52 + i * 0.07, draw: f => { mc.save(); mc.strokeStyle = F.INK; mc.globalAlpha = 0.9 * f; mc.lineWidth = 1; mc.beginPath(); mc.arc(s.x, s.y, 6 * f, 0, 7); mc.stroke(); F.dot(mc, s.x, s.y, 2, 0.9 * f); mc.globalAlpha = 0.4 * f; mc.beginPath(); mc.arc(s.x, s.y, 11, 0, 7); mc.stroke(); mc.restore(); } }));
    // compass
    const kx = mw * 0.84, ky = mh * 0.22, kr = Math.min(mw, mh) * 0.045;
    els.push({ t0: 0.55, t1: 0.75, draw: f => { mc.save(); mc.strokeStyle = F.INK; mc.fillStyle = F.INK; mc.lineWidth = 0.9; mc.globalAlpha = 0.75;
      mc.beginPath(); mc.arc(kx, ky, kr, 0, Math.PI * 2 * f); mc.stroke(); mc.beginPath(); mc.arc(kx, ky, kr * 0.7, 0, Math.PI * 2 * f); mc.stroke();
      if (f > 0.5) { const g2 = (f - 0.5) * 2; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2; mc.beginPath(); mc.moveTo(kx, ky); mc.lineTo(kx + Math.cos(a - 0.18) * kr * 0.25, ky + Math.sin(a - 0.18) * kr * 0.25); mc.lineTo(kx + Math.cos(a) * kr * 0.95 * g2, ky + Math.sin(a) * kr * 0.95 * g2); mc.lineTo(kx + Math.cos(a + 0.18) * kr * 0.25, ky + Math.sin(a + 0.18) * kr * 0.25); mc.closePath(); mc.globalAlpha = i % 2 ? 0.35 : 0.8; mc.fill(); } }
      mc.restore(); } });
    // waves near the coast
    const waves = [];
    for (let i = 0; i < (mobile ? 90 : 220); i++) { const x = rng() * mw, y = rng() * mh; const cy = coastY(x); const d = y - cy; if (d > 30 && d < 190 && rng() < 1 - d / 200) waves.push({ x, y, s: 5 + rng() * 6, a: 0.65 * (1 - d / 200), t: rng() }); }
    waves.sort((a, b) => a.t - b.t);
    els.push({ t0: 0.5, t1: 0.85, draw: f => { mc.save(); mc.strokeStyle = F.INK; mc.lineWidth = 0.8; const n = Math.floor(f * waves.length);
      for (let i = 0; i < n; i++) { const q = waves[i]; mc.globalAlpha = q.a; mc.beginPath(); mc.arc(q.x - q.s * 0.5, q.y, q.s * 0.5, Math.PI * 1.1, Math.PI * 1.9); mc.arc(q.x + q.s * 0.5, q.y, q.s * 0.5, Math.PI * 1.1, Math.PI * 1.9); mc.stroke(); } mc.restore(); } });
    // dotted guesses into blank paper
    for (let gI = 0; gI < 4; gI++) {
      const sx = mw * (0.3 + gI * 0.14), sy = coastY(sx) + 10; const a = Math.PI * (0.25 + rng() * 0.35); const len = mh * (0.25 + rng() * 0.25);
      els.push({ t0: 0.66 + gI * 0.05, t1: 0.92 + gI * 0.03, draw: f => { mc.save(); mc.fillStyle = F.INK; const n = Math.floor(f * len / 9);
        for (let i = 0; i < n; i++) { const k = i / (len / 9); mc.globalAlpha = 0.7 * (1 - k) * (1 - k); mc.beginPath(); mc.arc(sx + Math.cos(a) * i * 9 + F.noise1(i * 0.4 + gI) * 3, sy + Math.sin(a) * i * 9, 1, 0, 7); mc.fill(); }
        if (f >= 1) { mc.strokeStyle = F.INK; mc.globalAlpha = 0.22; mc.lineWidth = 0.8; mc.setLineDash([2, 3]); mc.beginPath(); mc.arc(sx + Math.cos(a) * len, sy + Math.sin(a) * len, 7, 0, 7); mc.stroke(); }
        mc.restore(); } });
    }
    // sky
    clouds = []; const crng = F.rng(88);
    for (let i = 0; i < (mobile ? 6 : 10); i++) {
      const W = sw * (0.28 + crng() * 0.4), H = W * 0.6; const c = document.createElement('canvas');
      c.width = Math.ceil(W); c.height = Math.ceil(H); const cc = c.getContext('2d');
      const pink = crng() < 0.5;
      for (let b = 0; b < 14; b++) {
        const bx = W * (0.3 + crng() * 0.4), by = H * (0.36 + crng() * 0.28), br = W * (0.08 + crng() * 0.12);
        const g = cc.createRadialGradient(bx, by, 0, bx, by, br);
        const col = by > H * 0.5 ? (pink ? '246,196,186' : '236,214,200') : '255,246,238';
        g.addColorStop(0, 'rgba(' + col + ',' + (0.55 + crng() * 0.3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
        cc.fillStyle = g; cc.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      clouds.push({ c, x: crng() * sw, y: sh * (0.08 + crng() * 0.75), W, H, sp: (0.2 + crng() * 0.5) * (crng() < 0.5 ? 1 : -1), par: 0.03 + crng() * 0.1, al: 0.55 + crng() * 0.45 });
    }
    clouds.sort((a, b) => a.W - b.W);
    moonTex = F.moonTexture(Math.min(600, Math.ceil(sh * 0.2 * F.DPR)), 17, { inner: '#e7e2d6', outer: '#c2bfb5' });
    endPt = { x: sw * 0.5, y: sh * 0.64 };
    S.end = { x: endPt.x, y: endPt.y + skyCv._top, r: 15 };
    endEl.style.left = endPt.x + 'px'; endEl.style.top = (skyCv._top - sec._top + endPt.y) + 'px';
    endOff.width = endOff.height = Math.ceil(40 * F.DPR); endRng = F.rng(5); endStrokes = 0;
    const eo = endOff.getContext('2d'); eo.setTransform(F.DPR, 0, 0, F.DPR, 0, 0); eo.clearRect(0, 0, 40, 40);
    drawMap(0); S.frame(0);
  };
  function drawMap(p) {
    mc.clearRect(0, 0, mw, mh);
    for (const e of els) { const f = F.clamp((p - e.t0) / (e.t1 - e.t0), 0, 1); if (f > 0) e.draw(F.reduced ? 1 : f); }
  }
  S.frame = function (t) {
    const p = F.prog(mapCv, 0.9, 0.45);
    if (Math.abs(p - lastP) > 0.0015) { drawMap(p); lastP = p; }
    // sky
    sc.clearRect(0, 0, sw, sh);
    const g = sc.createLinearGradient(0, 0, 0, sh);
    g.addColorStop(0, 'rgba(227,217,190,0)'); g.addColorStop(0.16, 'rgba(210,207,192,.75)'); g.addColorStop(0.38, '#aab8cb'); g.addColorStop(0.6, '#9cabc9'); g.addColorStop(0.86, '#e4bfae'); g.addColorStop(1, '#efc4b3');
    sc.fillStyle = g; sc.fillRect(0, 0, sw, sh);
    const dy = window.scrollY - skyCv._top;
    const mr = sh * 0.1, mxx = sw * 0.64, myy = sh * 0.36 - dy * 0.04;
    const hg = sc.createRadialGradient(mxx, myy, mr * 0.8, mxx, myy, mr * 2.4); hg.addColorStop(0, 'rgba(255,240,220,.35)'); hg.addColorStop(1, 'rgba(255,240,220,0)');
    sc.fillStyle = hg; sc.fillRect(mxx - mr * 2.4, myy - mr * 2.4, mr * 4.8, mr * 4.8);
    sc.globalAlpha = 0.55; sc.drawImage(moonTex, mxx - mr, myy - mr, mr * 2, mr * 2); sc.globalAlpha = 1;
    for (const c of clouds) {
      const x = F.reduced ? c.x : ((c.x + t * 0.004 * c.sp) % (sw + c.W) + sw + c.W) % (sw + c.W) - c.W;
      const y = c.y - dy * c.par;
      sc.globalAlpha = c.al; sc.drawImage(c.c, x, y);
    }
    sc.globalAlpha = 1;
    // the unfinished circle at the end of the thread
    const eo = endOff.getContext('2d');
    if (endHover && endStrokes < 70) { for (let i = 0; i < 4 && endStrokes < 70; i++) { F.charcoalStroke(eo, 20, 20, 14, endRng); endStrokes++; } }
    else if (!endHover && endStrokes > 0) { eo.clearRect(0, 0, 40, 40); endStrokes = 0; endRng = F.rng(5); }
    sc.drawImage(endOff, endPt.x - 20, endPt.y - 20, 40, 40);
    sc.save(); sc.strokeStyle = F.INK; sc.globalAlpha = 0.9; sc.lineWidth = 1.6; F.wobbleCircle(sc, endPt.x, endPt.y, 15, F.rng(9), 1.6); sc.stroke(); sc.restore();
  };
  S.hover = v => { endHover = v; };
  F.sceneFrontier = S;
})();
