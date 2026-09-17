/* shared helpers — everything lives on window.F */
(function () {
  const F = window.F = {};
  F.INK = '#2b2622';
  F.INK_RGB = '43,38,34';
  F.CREAM = '#e3d9be';
  F.LIGHT_RGB = '228,218,192';
  F.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  F.fine = matchMedia('(pointer: fine)').matches;
  F.DPR = Math.min(window.devicePixelRatio || 1, 2);
  F.mouse = { x: -1e4, y: -1e4, has: false };
  F.vh = () => window.innerHeight;

  F.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  F.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  F.lerp = (a, b, t) => a + (b - a) * t;
  F.smooth = t => { t = F.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  F.ease = t => { t = F.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  F.noise1 = x => Math.sin(x * 1.3) * 0.5 + Math.sin(x * 2.9 + 1.7) * 0.3 + Math.sin(x * 6.1 + 0.4) * 0.2;

  // size a canvas to its CSS box, honouring DPR but capping total pixels
  F.fit = function (cv, maxPixels) {
    const w = cv.clientWidth, h = cv.clientHeight;
    let d = F.DPR;
    if (maxPixels) d = Math.min(d, Math.sqrt(maxPixels / Math.max(1, w * h)));
    d = Math.max(1, d);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    const ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { w, h, ctx, d };
  };
  F.docTop = el => el.getBoundingClientRect().top + window.scrollY;
  F.mark = el => { el._top = F.docTop(el); el._h = el.offsetHeight; };
  // scroll progress of an element: 0 when its top sits at a*vh, 1 when its bottom sits at b*vh
  F.prog = function (el, a, b) {
    const vh = F.vh();
    const s0 = el._top - vh * a, s1 = el._top + el._h - vh * b;
    return F.clamp((window.scrollY - s0) / Math.max(1, s1 - s0), 0, 1);
  };
  F.mouseIn = el => ({ x: F.mouse.x, y: F.mouse.y + window.scrollY - el._top, has: F.mouse.has });

  // one scribbled charcoal stroke clipped inside a circle
  F.charcoalStroke = function (ctx, cx, cy, r, rng, color) {
    const a = rng() * Math.PI * 2;
    const d = (rng() * 2 - 1) * r * 0.95;
    const len = r * (0.5 + rng() * 1.3);
    const px = cx + Math.cos(a + Math.PI / 2) * d, py = cy + Math.sin(a + Math.PI / 2) * d;
    const s = (rng() - 0.5) * r * 0.6;
    const x1 = px + Math.cos(a) * (s - len / 2), y1 = py + Math.sin(a) * (s - len / 2);
    const x2 = px + Math.cos(a) * (s + len / 2), y2 = py + Math.sin(a) * (s + len / 2);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r * (0.975 + rng() * 0.05), 0, 7); ctx.clip();
    ctx.strokeStyle = color || F.INK;
    ctx.globalAlpha = 0.22 + rng() * 0.45;
    ctx.lineWidth = r * (0.05 + rng() * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + (rng() - 0.5) * r * 0.3, (y1 + y2) / 2 + (rng() - 0.5) * r * 0.3, x2, y2);
    ctx.stroke();
    ctx.restore();
  };
  F.charcoalDisc = function (ctx, cx, cy, r, rng, n, color) {
    for (let i = 0; i < n; i++) F.charcoalStroke(ctx, cx, cy, r, rng, color);
    ctx.save(); ctx.strokeStyle = color || F.INK; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(0.8, r * 0.035);
    F.wobbleCircle(ctx, cx, cy, r * 0.985, rng, r * 0.03); ctx.stroke(); ctx.restore();
  };
  // hand-drawn circle path (does not stroke)
  F.wobbleCircle = function (ctx, cx, cy, r, rng, amt) {
    const n = 36; const off = rng() * Math.PI * 2;
    ctx.beginPath();
    let first = null;
    for (let i = 0; i <= n; i++) {
      const a = off + i / n * Math.PI * 2;
      const rr = r + (i === n ? 0 : (rng() - 0.5) * amt);
      let x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) { first = [x, y]; ctx.moveTo(x, y); }
      else if (i === n) ctx.lineTo(first[0], first[1]);
      else ctx.lineTo(x, y);
    }
  };
  // smooth polyline through points
  F.inkLine = function (ctx, pts, width, alpha, color) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color || F.INK; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke(); ctx.restore();
  };
  F.dot = function (ctx, x, y, r, alpha, color) {
    ctx.save(); ctx.fillStyle = color || F.INK; ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.globalAlpha *= 0.45; ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.2, r * 0.9, 0, 7); ctx.fill();
    ctx.restore();
  };

  // lunar texture rendered to an offscreen square canvas (device pixels)
  F.moonTexture = function (px, seed, opts) {
    opts = opts || {};
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const c = cv.getContext('2d'); const rng = F.rng(seed);
    const R = px / 2, cx = R, cy = R;
    const inner = opts.inner || '#d8d3c5', outer = opts.outer || '#a8a69b';
    c.save(); c.beginPath(); c.arc(cx, cy, R * 0.995, 0, 7); c.clip();
    const g = c.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    c.fillStyle = g; c.fillRect(0, 0, px, px);
    // maria: large soft dark patches
    for (let i = 0; i < 7; i++) {
      const a = rng() * 7, d = rng() * R * 0.7; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const r = R * (0.15 + rng() * 0.3);
      const gg = c.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, 'rgba(70,72,80,.22)'); gg.addColorStop(1, 'rgba(70,72,80,0)');
      c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fine mottling
    for (let i = 0; i < 900; i++) {
      const a = rng() * 7, d = Math.sqrt(rng()) * R; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const r = R * (0.01 + rng() * 0.05);
      c.fillStyle = rng() < 0.5 ? 'rgba(60,60,70,' + (0.02 + rng() * 0.07) + ')' : 'rgba(255,252,240,' + (0.03 + rng() * 0.08) + ')';
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    // craters
    for (let i = 0; i < 70; i++) {
      const a = rng() * 7, d = Math.sqrt(rng()) * R * 0.95; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const r = R * (0.01 + Math.pow(rng(), 3) * 0.09);
      c.fillStyle = 'rgba(50,50,58,' + (0.07 + rng() * 0.1) + ')';
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,250,235,' + (0.1 + rng() * 0.18) + ')'; c.lineWidth = Math.max(1, r * 0.14);
      c.beginPath(); c.arc(x, y, r * 0.98, Math.PI * 0.9, Math.PI * 1.9); c.stroke();
      c.strokeStyle = 'rgba(40,40,50,' + (0.1 + rng() * 0.14) + ')';
      c.beginPath(); c.arc(x, y, r * 0.98, Math.PI * -0.1, Math.PI * 0.9); c.stroke();
    }
    // limb shading
    const lg = c.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.55, cx, cy, R);
    lg.addColorStop(0, 'rgba(40,38,45,0)'); lg.addColorStop(1, 'rgba(40,38,45,.35)');
    c.fillStyle = lg; c.fillRect(0, 0, px, px);
    c.restore();
    return cv;
  };
})();
