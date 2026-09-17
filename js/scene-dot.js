/* scene 0 — a single charcoal dot draws itself, then breathes and watches the cursor */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s0');
  const cv = sec.querySelector('canvas');
  let ctx, w, h, R, cx, cy;
  const off = document.createElement('canvas'); let offCtx, offSize;
  let strokes = 0, total = 300, rng, t0 = null, ox = 0, oy = 0;
  const S = { sec, visible: true, cx: 0, cy: 0, R: 0, done: false };

  S.layout = function () {
    ({ ctx, w, h } = F.fit(cv, 5e6)); F.mark(sec);
    R = Math.min(w, h) * 0.105; cx = w / 2; cy = h * 0.5;
    S.cx = cx; S.cy = cy; S.R = R;
    offSize = Math.ceil(R * 2.4);
    off.width = off.height = Math.ceil(offSize * F.DPR);
    offCtx = off.getContext('2d'); offCtx.setTransform(F.DPR, 0, 0, F.DPR, 0, 0);
    offCtx.clearRect(0, 0, offSize, offSize);
    rng = F.rng(7);
    const keep = strokes; strokes = 0;
    while (strokes < keep) { F.charcoalStroke(offCtx, offSize / 2, offSize / 2, R, rng); strokes++; }
  };
  S.frame = function (t) {
    if (t0 === null) t0 = t;
    const el = t - t0;
    const target = F.reduced ? total : Math.min(total, Math.floor(F.ease(el / 2300) * total));
    while (strokes < target) { F.charcoalStroke(offCtx, offSize / 2, offSize / 2, R, rng); strokes++; }
    if (strokes >= total && !S.done) {
      offCtx.save(); offCtx.strokeStyle = F.INK; offCtx.globalAlpha = 0.5; offCtx.lineWidth = R * 0.03;
      F.wobbleCircle(offCtx, offSize / 2, offSize / 2, R * 0.985, rng, R * 0.03); offCtx.stroke(); offCtx.restore();
      S.done = true;
    }
    // curiosity: lean a little toward the cursor
    const m = F.mouseIn(sec); let tx = 0, ty = 0;
    if (m.has && !F.reduced) {
      const dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 420) * R * 0.32; tx = dx / d * k; ty = dy / d * k;
    }
    ox += (tx - ox) * 0.05; oy += (ty - oy) * 0.05;
    const breathe = F.reduced ? 1 : 1 + 0.018 * Math.sin(el / 1500);
    const bob = (!F.reduced && el > 4500) ? Math.sin((el - 4500) / 1100) * 3 : 0;
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.translate(cx + ox, cy + oy + bob); ctx.scale(breathe, breathe);
    ctx.drawImage(off, -offSize / 2, -offSize / 2, offSize, offSize);
    ctx.restore();
  };
  F.sceneDot = S;
})();
