/* scene 1 — a thought branches downward from the thread; one branch carries on */
(function () {
  const F = window.F;
  const sec = document.querySelector('.s1');
  const cv = sec.querySelector('canvas');
  let ctx, w, h, rng, nodes = [], edges = [];
  const S = { sec, visible: false, chain: [] };
  const MAXD = 5;

  S.layout = function () {
    ({ ctx, w, h } = F.fit(cv, 6e6)); F.mark(sec);
    rng = F.rng(21); nodes = []; edges = [];
    const mobile = w < 720;
    const chainT = [[0.5, 0.10], [0.44, 0.27], [0.53, 0.43], [0.47, 0.59], [0.55, 0.74], [0.49, 0.90]];
    const chain = chainT.map(([fx, fy]) => ({ x: fx * w, y: fy * h }));
    S.chain = chain;
    const root = { x: chain[0].x, y: chain[0].y, r: 6.5, birth: 0, depth: 0, open: false, chain: true };
    nodes.push(root);
    const L0 = h * (mobile ? 0.15 : 0.17);
    function grow(parent, angle, depth, len, onChain) {
      const kids = depth === 0 ? 4 : (rng() < 0.4 ? 3 : 2);
      const spread = depth === 0 ? (mobile ? 0.8 : 1.15) : 0.72;
      const angles = [];
      for (let i = 0; i < kids; i++) angles.push(angle + (kids === 1 ? 0 : (i / (kids - 1) - 0.5) * 2 * spread * (0.75 + rng() * 0.4)));
      let chainIdx = -1;
      if (onChain && depth + 1 < chain.length) {
        const ca = Math.atan2(chain[depth + 1].y - parent.y, chain[depth + 1].x - parent.x);
        let best = 1e9; angles.forEach((a, i) => { const d = Math.abs(a - ca); if (d < best) { best = d; chainIdx = i; } });
      }
      for (let i = 0; i < kids; i++) {
        let a = angles[i], l = len * (0.72 + rng() * 0.45), nx, ny;
        const isChain = i === chainIdx;
        if (isChain) { nx = chain[depth + 1].x; ny = chain[depth + 1].y; a = Math.atan2(ny - parent.y, nx - parent.x); }
        else { nx = parent.x + Math.cos(a) * l; ny = parent.y + Math.sin(a) * l; }
        if (nx < 12 || nx > w - 12 || ny > h - 10) { if (!isChain) continue; }
        const leaf = depth + 1 >= MAXD || (!isChain && depth >= 2 && rng() < 0.2);
        const eb = (depth / MAXD) * 0.82 + rng() * 0.05;
        const node = { x: nx, y: ny, r: leaf ? 2 + rng() * 1.3 : 5.6 - depth * 0.75, birth: eb + 0.1, depth: depth + 1, open: leaf && rng() < 0.45, chain: isChain, ph: rng() * 7 };
        nodes.push(node);
        edges.push({ a: parent, b: node, birth: eb, m: (rng() - 0.5) * 7, chain: isChain });
        if (!leaf) grow(node, a, depth + 1, len * 0.78, isChain);
      }
    }
    grow(root, Math.PI / 2, 0, L0, true);
  };
  function pos(n, t) {
    if (n.chain || F.reduced) return [n.x, n.y];
    const s = Math.sin(t / 1900 + n.ph) * 1.4 * (n.depth / MAXD);
    return [n.x + s, n.y + Math.cos(t / 2300 + n.ph) * 0.8];
  }
  S.frame = function (t) {
    const p = F.prog(sec, 0.9, 0.55);
    const m = F.mouseIn(sec);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const e of edges) {
      if (e.chain) continue;
      const f = F.smooth((p - e.birth) / 0.1); if (f <= 0) continue;
      const [ax, ay] = pos(e.a, t), [bx, by] = pos(e.b, t);
      const ex = F.lerp(ax, bx, f), ey = F.lerp(ay, by, f);
      const mx = (ax + ex) / 2 + e.m * f, my = (ay + ey) / 2 + e.m * 0.6 * f;
      ctx.strokeStyle = F.INK; ctx.globalAlpha = 0.82; ctx.lineWidth = Math.max(0.7, 1.35 - e.b.depth * 0.12);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }
    for (const n of nodes) {
      const f = F.smooth((p - n.birth) / 0.06); if (f <= 0) continue;
      const [x, y] = pos(n, t);
      let k = 0;
      if (m.has) { const d = Math.hypot(m.x - x, m.y - y); if (d < 80) k = 1 - d / 80; }
      const r = n.r * (1 + k * 1.1) * f;
      if (k > 0) {
        ctx.globalAlpha = 0.22 * k; ctx.strokeStyle = F.INK; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = 0.12 * k; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.stroke();
      }
      if (n.open) { ctx.globalAlpha = 0.85 * f; ctx.strokeStyle = F.INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 0.6, 0, 7); ctx.stroke(); }
      else F.dot(ctx, x, y, r, 0.9 * f);
    }
    ctx.globalAlpha = 1;
  };
  F.sceneTree = S;
})();
