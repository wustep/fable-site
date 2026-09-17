/* the single ink thread that runs the length of the page, drawn by scrolling */
(function () {
  const F = window.F;
  const cv = document.getElementById('thread');
  let ctx, w, h, pts = [], total = 0, lineEndLen = 0, lineEndIdx = 0, shown = 0, autoStart = null, dark = null;
  const T = {};

  function bez(p0, p1, p2, p3) { // catmull-rom → cubic controls with per-point tension
    const t1 = p1.t == null ? 1 : p1.t, t2 = p2.t == null ? 1 : p2.t;
    return [{ x: p1.x + (p2.x - p0.x) / 6 * t1, y: p1.y + (p2.y - p0.y) / 6 * t1 }, { x: p2.x - (p3.x - p1.x) / 6 * t2, y: p2.y - (p3.y - p1.y) / 6 * t2 }];
  }
  T.build = function (wps, lineEnd, darkInfo) {
    w = innerWidth; h = innerHeight; cv.width = Math.round(w * F.DPR); cv.height = Math.round(h * F.DPR);
    ctx = cv.getContext('2d'); ctx.setTransform(F.DPR, 0, 0, F.DPR, 0, 0);
    dark = darkInfo; pts = []; total = 0;
    const raw = [];
    for (let i = 0; i < wps.length - 1; i++) {
      const p0 = wps[Math.max(0, i - 1)], p1 = wps[i], p2 = wps[i + 1], p3 = wps[Math.min(wps.length - 1, i + 2)];
      const [c1, c2] = bez(p0, p1, p2, p3);
      const n = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
      for (let k = (i === 0 ? 0 : 1); k <= n; k++) {
        const u = k / n, v = 1 - u;
        raw.push({ x: v * v * v * p1.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * p2.x, y: v * v * v * p1.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * p2.y });
      }
    }
    let bestD = 1e9;
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i], q = raw[Math.min(raw.length - 1, i + 1)], o = raw[Math.max(0, i - 1)];
      const dx = q.x - o.x, dy = q.y - o.y, L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
      if (i) total += Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y);
      const j1 = 1.1 * F.noise1(total * 0.045) + 0.5 * F.noise1(total * 0.23 + 9);
      const j2 = 1.3 * F.noise1(total * 0.06 + 4) + 0.6 * F.noise1(total * 0.3 + 2);
      let isDark = false;
      if (dark && p.y > dark.top && p.y < dark.bottom && Math.hypot(p.x - dark.cx, p.y - dark.cy) > dark.R * 0.995) isDark = true;
      pts.push({ x: p.x + nx * j1, y: p.y + ny * j1, x2: p.x + nx * j2, y2: p.y + ny * j2, len: total, dark: isDark });
      const d = Math.hypot(p.x - lineEnd.x, p.y - lineEnd.y); if (d < bestD) { bestD = d; lineEndLen = total; lineEndIdx = i; }
    }
  };
  function scrollLen() {
    const ty = window.scrollY + innerHeight * 0.6;
    let lo = lineEndIdx, hi = pts.length - 1;
    if (pts[hi].y <= ty) return total;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].y > ty) hi = mid; else lo = mid + 1; }
    return pts[Math.max(lineEndIdx, lo - 1)].len;
  }
  T.start = function (t) { autoStart = t; };
  T.reset = function () { shown = 0; autoStart = null; };
  T.frame = function (t) {
    if (!pts.length) return;
    let target = 0;
    if (autoStart !== null && t >= autoStart) {
      const a = F.reduced ? 1 : F.ease((t - autoStart) / 1500);
      target = a < 1 ? lineEndLen * a : Math.max(lineEndLen, scrollLen());
    }
    shown += (target - shown) * (F.reduced ? 1 : 0.12);
    if (Math.abs(target - shown) < 0.5) shown = target;
    ctx.clearRect(0, 0, w, h);
    const sy = window.scrollY, y0 = sy - 60, y1 = sy + h + 60;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      ctx.lineWidth = pass ? 0.8 : 1.7;
      let open = false, curDark = null, last = null;
      const flush = () => { if (open) { ctx.stroke(); open = false; } };
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; if (p.len > shown) break;
        const px = pass ? p.x2 : p.x, py = (pass ? p.y2 : p.y) - sy;
        if (p.y < y0 || p.y > y1) { flush(); last = null; continue; }
        if (!open || p.dark !== curDark) {
          flush(); curDark = p.dark;
          ctx.strokeStyle = curDark ? 'rgba(' + F.LIGHT_RGB + ',' + (pass ? 0.5 : 0.9) + ')' : 'rgba(' + F.INK_RGB + ',' + (pass ? 0.45 : 0.92) + ')';
          ctx.beginPath(); if (last) ctx.moveTo(last[0], last[1]); else ctx.moveTo(px, py); open = true;
        }
        ctx.lineTo(px, py); last = [px, py];
      }
      flush();
    }
    // the pen tip
    if (shown > 0 && shown < total) {
      let i = pts.length - 1; while (i > 0 && pts[i].len > shown) i--;
      const p = pts[i]; if (p.y > y0 && p.y < y1) { ctx.fillStyle = p.dark ? 'rgb(' + F.LIGHT_RGB + ')' : F.INK; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(p.x, p.y - sy, 2.1, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }
  };
  F.thread = T;
})();
