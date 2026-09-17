/* scene 3 — a cream star-disc on black; constellations meet the cursor */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s3');
  const cv = sec.querySelector('canvas');
  let ctx, w, h, cx, cy, R, rng, stars = [], cons = [], enterT = null, added = [];
  const S = { sec, visible: false, dark: null };
  const bg = document.createElement('canvas');

  S.layout = function () {
    ({ ctx, w, h } = F.fit(cv, 6e6)); F.mark(sec);
    cx = w / 2; cy = h * 0.5; R = Math.min(w * 0.42, h * 0.34);
    rng = F.rng(41); stars = []; cons = [];
    for (let i = 0; i < 170; i++) {
      const a = rng() * 7, d = Math.sqrt(rng()) * R * 0.95;
      stars.push({ a, d, r: 0.7 + Math.pow(rng(), 2) * 2.4, ring: rng() < 0.08, ph: rng() * 7, tw: 0.5 + rng() * 1.2 });
    }
    for (let k = 0; k < 7; k++) {
      let cur = stars[Math.floor(rng() * stars.length)]; const chain = [cur]; const used = new Set([cur]);
      for (let s = 0; s < 3 + Math.floor(rng() * 4); s++) {
        let best = null, bd = 1e9;
        const cp = pt(cur, 0);
        for (const st of stars) { if (used.has(st)) continue; const q = pt(st, 0); const d = Math.hypot(q[0] - cp[0], q[1] - cp[1]); if (d < bd && d > R * 0.06) { bd = d; best = st; } }
        if (!best) break; used.add(best); chain.push(best); cur = best;
      }
      cons.push({ chain, t0: k * 0.12 });
    }
    // static backdrop: disc, ruling, halftone rim, black grain
    bg.width = cv.width; bg.height = cv.height;
    const b = bg.getContext('2d'); b.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
    b.clearRect(0, 0, w, h);
    for (let i = 0; i < w * h / 900; i++) { b.fillStyle = 'rgba(255,240,210,' + (0.03 + rng() * 0.1) + ')'; b.beginPath(); b.arc(rng() * w, rng() * h, 0.6, 0, 7); b.fill(); }
    b.fillStyle = '#e6dcc2'; b.beginPath(); b.arc(cx, cy, R, 0, 7); b.fill();
    const g = b.createRadialGradient(cx, cy, R * 0.5, cx, cy, R); g.addColorStop(0, 'rgba(120,90,50,0)'); g.addColorStop(1, 'rgba(120,90,50,.18)');
    b.fillStyle = g; b.beginPath(); b.arc(cx, cy, R, 0, 7); b.fill();
    b.strokeStyle = 'rgba(64,50,36,.16)'; b.lineWidth = 0.7;
    for (let y = cy - R; y <= cy + R; y += 13) { const hw = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy))); b.beginPath(); b.moveTo(cx - hw, y); b.lineTo(cx + hw, y); b.stroke(); }
    for (let i = 0; i < 3200; i++) {
      const a = rng() * 7, d = R * (1.005 + Math.pow(rng(), 1.6) * 0.1); const s = 0.35 + rng() * 1.0;
      b.fillStyle = 'rgba(240,230,205,' + (0.9 - (d - R) / (R * 0.1) * 0.8) + ')'; b.beginPath(); b.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, 7); b.fill();
    }
    b.strokeStyle = 'rgba(64,50,36,.35)'; b.lineWidth = 1; b.beginPath(); b.arc(cx, cy, R * 0.985, 0, 7); b.stroke();
    S.dark = { top: sec._top + F.vh() * 0.02, bottom: sec._top + sec._h - F.vh() * 0.02, cx, cy: sec._top + cy, R };
    enterT = null;
  };
  function pt(s, rot) { const a = s.a + rot; return [cx + Math.cos(a) * s.d, cy + Math.sin(a) * s.d]; }
  S.frame = function (t) {
    if (enterT === null) enterT = t;
    const rot = F.reduced ? 0 : t / 240000 * Math.PI * 2;
    const el = (t - enterT) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bg, 0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    ctx.lineCap = 'round';
    // constellation lines, drawn in one by one after arrival
    for (const c of cons) {
      const f = F.reduced ? 1 : F.clamp((el - 0.4 - c.t0 * 6) / 2.2, 0, 1); if (f <= 0) continue;
      const segs = c.chain.length - 1, prog = f * segs;
      ctx.strokeStyle = F.INK; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = 0; i < segs; i++) {
        const q = pt(c.chain[i], rot), r = pt(c.chain[i + 1], rot); const sf = F.clamp(prog - i, 0, 1); if (sf <= 0) break;
        ctx.moveTo(q[0], q[1]); ctx.lineTo(F.lerp(q[0], r[0], sf), F.lerp(q[1], r[1], sf));
      }
      ctx.stroke();
    }
    // cursor connections
    const m = F.mouseIn(sec); let near = [];
    if (m.has && Math.hypot(m.x - cx, m.y - cy) < R) {
      near = stars.map(s => { const q = pt(s, rot); return { s, q, d: Math.hypot(q[0] - m.x, q[1] - m.y) }; }).sort((a, b) => a.d - b.d).slice(0, 4);
      ctx.strokeStyle = F.INK; ctx.lineWidth = 0.7;
      for (const n of near) { ctx.globalAlpha = 0.35 * (1 - n.d / (R * 1.2)); ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(n.q[0], n.q[1]); ctx.stroke(); }
    }
    for (const s of stars) {
      const q = pt(s, rot);
      const tw = F.reduced ? 1 : 0.78 + 0.22 * Math.sin(t / 700 * s.tw + s.ph);
      let k = 0; for (const n of near) if (n.s === s) k = 1 - n.d / (R * 1.2);
      F.dot(ctx, q[0], q[1], s.r * (1 + k * 1.4), 0.9 * tw);
      if (s.ring || k > 0.3) { ctx.strokeStyle = F.INK; ctx.globalAlpha = 0.4 * tw; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(q[0], q[1], s.r + 3 + k * 4, 0, 7); ctx.stroke(); }
    }
    // stars the visitor left behind
    for (const a of added) {
      const q = pt(a, rot); const age = (t - a.born) / 1000;
      F.dot(ctx, q[0], q[1], Math.min(2.4, age * 6), 0.9);
      if (age < 1.6) { ctx.strokeStyle = F.INK; ctx.globalAlpha = (1 - age / 1.6) * 0.5; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(q[0], q[1], 4 + age * 30, 0, 7); ctx.stroke(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  S.tap = function (vx, vy, t) {
    const x = vx, y = vy + window.scrollY - sec._top;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy); if (d > R * 0.97) return false;
    const rot = F.reduced ? 0 : t / 240000 * Math.PI * 2;
    added.push({ a: Math.atan2(dy, dx) - rot, d, born: t }); if (added.length > 60) added.shift();
    return true;
  };
  F.sceneStars = S;
})();
