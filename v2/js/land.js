// The land and the water's surface: a far headland, a band of sea that never leaves the picture,
// near hills of cut paper, a small town, a garden.
(function () {
  'use strict';
  const V = window.V;
  const { clamp, lerp, ss, hex, mixc, css, ramp, rng, TAU } = V;
  const world = V.world, tint = world.tint, LS = world.LS;
  const land = (V.land = {});
  land.windows = [];

  let W = 1, H = 1, U = 1; // U: size unit, so tall screens don't get giant houses
  let houses = [], plants = [], byLayer = [], farTrees = [], ticks = [];
  const userPlants = [];

  // ---------------------------------------------------------------- build
  land.resize = function (S) {
    W = S.W; H = S.H; U = Math.min(H, W * 1.3);
    const aspect = clamp(W / H, 0.45, 2.6);
    buildTown(aspect);
    buildPlants(aspect);
  };

  function buildTown(aspect) {
    const r = rng(77);
    houses = [];
    land.windows = [];
    const counts = [0, 4, 6, 4, 0], sizes = [0, 0.03, 0.054, 0.076];
    for (let l = 1; l <= 3; l++) {
      const n = Math.max(2, Math.round((counts[l] * aspect) / 1.6));
      let placed = 0, tries = 0;
      while (placed < n && tries++ < 80) {
        const size = U * sizes[l] * (0.8 + r() * 0.5);
        const type = (r() * 4) | 0; // 0 gable, 1 tall, 2 hip, 3 gable + lean-to
        const w = size * (type === 1 ? 0.78 : 1 + r() * 0.7), h = size * (type === 1 ? 1.35 + r() * 0.3 : 0.75 + r() * 0.5);
        const x = (l === 1 ? 0.04 + r() * 0.3 : 0.04 + r() * 0.92) * W;
        const wall = 10 + ((r() * 5) | 0), roof = 15 + ((r() * 4) | 0), chimney = r() < 0.65, side = r() < 0.5 ? -1 : 1;
        const roofH = size * (type === 1 ? 0.8 : type === 2 ? 0.42 : 0.45 + r() * 0.3);
        if (houses.some((o) => o.l === l && Math.abs(o.x - x) < (o.w + w) * 0.95)) continue;
        const hs = { l, x, w, h, size, type, roofH, wall, roof, chimney, side, wins: [], door: null, ph: r() * TAU };
        const cols = w > size * 1.3 ? 2 : 1, rows = h > size * 1.0 ? 2 : 1;
        const ww = Math.min(w / (cols * 2 + 1), size * 0.26), wh = ww * 1.3;
        const doorCol = l > 1 && cols * rows > 1 ? (r() * cols) | 0 : -1;
        for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
          const rx = -w / 2 + (w / (cols + 1)) * (cx + 1);
          if (cy === 0 && cx === doorCol) { hs.door = { rx, w: ww * 1.05, h: Math.min(h * 0.46, wh * 1.5) }; continue; }
          const win = {
            rx, ry: (h / (rows + 0.35)) * (cy + 0.62), w: ww, h: wh, x: 0, y: 0, glow: 0, target: 0, l,
            period: 50 + r() * 50, phase: r(), duty: 0.68 + r() * 0.2, thr: 0.8,
          };
          hs.wins.push(win);
          land.windows.push(win);
        }
        houses.push(hs);
        placed++;
      }
    }
    // the lamps are not all lit at once: each window has its own moment in the evening
    const order = land.windows.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((wi, rank) => { land.windows[wi].thr = 0.748 + 0.095 * (rank / Math.max(1, order.length - 1)); });

    farTrees = [];
    for (let l = 0; l < 2; l++) {
      const n = Math.round(aspect * (l ? 9 : 12));
      for (let i = 0; i < n; i++) farTrees.push({ l, x: r() * W * (l ? 0.45 : 0.62), r: U * (l ? 0.011 : 0.007) * (0.7 + r() * 0.8), tone: r() < 0.5 ? 0 : 2 });
    }
  }

  function makePlant(r, kind, l, xn, dyn) {
    const pl = { kind, l, xn, dyn, seed: r() * 100, g: 0, thr: 0.518 + 0.15 * xn + (r() - 0.5) * 0.024, span: 0.04, born: -1 };
    if (kind === 'f') {
      pl.size = U * 0.062 * LS[l] * (0.7 + r() * 0.7);
      pl.type = (r() * 4) | 0;
      pl.c1 = 4 + ((r() * 5) | 0);
      pl.c2 = pl.c1 === 5 ? 9 : 5;
      pl.lean = (r() - 0.5) * 0.5;
      pl.n = 7 + ((r() * 3) | 0);
    } else if (kind === 'g') {
      pl.size = U * 0.03 * LS[l] * (0.7 + r() * 0.8);
      pl.blades = [];
      const nb = 4 + ((r() * 4) | 0);
      for (let i = 0; i < nb; i++) pl.blades.push({ a: (r() - 0.5) * 1.3, len: 0.5 + r() * 0.5 });
      pl.c1 = r() < 0.5 ? 1 : 3;
    } else {
      pl.size = U * 0.15 * LS[l] * (0.7 + r() * 0.6);
      pl.type = r() < 0.3 ? 1 : 0;
      pl.thr -= 0.012;
      pl.span = 0.075;
      const q = r();
      pl.c1 = q < 0.12 ? 19 : q < 0.24 ? 20 : r() < 0.5 ? 0 : 2;
      pl.c2 = pl.c1 === 19 ? 5 : pl.c1 === 20 ? 7 : 1;
      pl.blobs = [];
      const nb = 4 + ((r() * 3) | 0);
      for (let i = 0; i < nb; i++) pl.blobs.push({ dx: (r() - 0.5) * 0.5, dy: -r() * 0.45, r: 0.2 + r() * 0.14, tone: r() < 0.4 ? 1 : 0 });
      pl.blobs.sort((a, b) => a.tone - b.tone);
      pl.dots = [];
      for (let i = 0; i < 7; i++) pl.dots.push({ dx: (r() - 0.5) * 0.6, dy: -r() * 0.55 + 0.05 });
    }
    return pl;
  }

  function buildPlants(aspect) {
    const r = rng(2024);
    plants = [];
    const nT = Math.round(aspect * 5) + 2, nF = Math.round(aspect * 40), nG = Math.round(aspect * 34);
    for (let i = 0; i < nT; i++) plants.push(makePlant(r, 't', 2 + ((r() * 2) | 0), r(), 0.004));
    for (let i = 0; i < nF; i++) {
      const l = r() < 0.2 ? 2 : r() < 0.55 ? 3 : 4;
      plants.push(makePlant(r, 'f', l, r(), r() * r() * 0.07));
    }
    for (let i = 0; i < nG; i++) plants.push(makePlant(r, 'g', 2 + ((r() * 3) | 0), r(), r() * 0.08));
    // the nearest sheet is closest to the visitor: big blooms, some half out of frame
    for (let i = 0; i < Math.round(aspect * 9); i++) { const pl = makePlant(r, r() < 0.7 ? 'f' : 'g', 4, r(), 0.03 + r() * 0.07); pl.size *= 1.25; plants.push(pl); }
    ticks = [[], [], [], [], []];
    for (let l = 2; l < 5; l++) {
      const n = Math.round(aspect * (60 + 40 * (l - 2)));
      for (let i = 0; i < n; i++) ticks[l].push({ xn: r(), d: 0.006 + r() * r() * (l === 4 ? 0.1 : 0.085), s: U * 0.006 * LS[l] * (0.6 + r() * 0.9), a: (r() - 0.5) * 0.9, lite: r() < 0.5 });
    }
    layerSort();
  }

  function layerSort() {
    byLayer = [[], [], [], [], []];
    for (const pl of plants) byLayer[pl.l].push(pl);
    for (const pl of userPlants) byLayer[pl.l].push(pl);
    for (const list of byLayer) list.sort((a, b) => a.dyn - b.dyn);
  }

  // ---------------------------------------------------------------- per frame, before the lights move
  land.layout = function (S) {
    for (const hs of houses) {
      const yb = Math.max(world.ridgeY(hs.l, hs.x - hs.w / 2, S), world.ridgeY(hs.l, hs.x + hs.w / 2, S)) + 1;
      hs.yb = yb;
      for (const w of hs.wins) { w.x = hs.x + w.rx; w.y = yb - w.ry; }
    }
  };

  // two lights in one room, taking turns: [the person's, the visitor's]
  const bump = (f, a, b) => (f < a || f > b ? 0 : Math.pow(Math.sin((Math.PI * (f - a)) / (b - a)), 2));
  land.talk = function (w, t) {
    const f = (t / 3.6 + w.phase * 7) % 1;
    return [bump(f, 0.04, 0.42), bump(f, 0.52, 0.9)];
  };

  // the visitor plants; returns where, so the birds can come and tend it
  land.plant = function (x, y, S) {
    if (S.p < 0.5) return null;
    for (let l = 4; l >= 2; l--) {
      const ry = world.ridgeY(l, x, S);
      if (ry <= y + 6) {
        const r = rng((x * 131 + y * 17 + userPlants.length * 977) | 0);
        const tree = userPlants.length % 6 === 4 && l <= 3;
        const pl = makePlant(r, tree ? 't' : 'f', l, x / W, tree ? 0.004 : Math.max(0, (y - ry) / H));
        if (!tree) pl.size *= 1.15;
        pl.born = S.t;
        userPlants.push(pl);
        if (userPlants.length > 60) userPlants.shift();
        layerSort();
        return { x, y: world.ridgeY(l, x, S) + pl.dyn * H, h: pl.size * (tree ? 0.75 : 1) };
      }
    }
    return null;
  };

  // ---------------------------------------------------------------- the water's surface
  const UW_TOP = [hex('#07142a'), hex('#2c8c96')], UW_BOT = [hex('#030711'), hex('#0d4763')];

  function waterPath(ctx, S) {
    const ys = Math.max(S.surfaceY, -40);
    const A = lerp(9, 0.8, S.wA), t = S.t;
    ctx.beginPath();
    ctx.moveTo(0, H + 2);
    for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, ys + A * (Math.sin(x * 0.011 + t * 1.1) + 0.5 * Math.sin(x * 0.029 - t * 1.7)));
    ctx.lineTo(W + 12, H + 2);
    ctx.closePath();
    return ys;
  }

  land.drawSea = function (ctx, S) {
    const d = S.depthT, wA = S.wA, t = S.t, p = S.p;
    const ys = waterPath(ctx, S);
    const sea = ramp(world.SEA, p);
    const top = mixc(mixc(UW_TOP[0], UW_TOP[1], d), sea[0], wA);
    const bot = mixc(mixc(UW_BOT[0], UW_BOT[1], d), sea[2], wA);
    const mid = mixc(mixc(top, bot, 0.5), sea[1], wA);
    // once the near hills are up, all the sea's colour has to live in the band that still shows
    const band = lerp(H - S.horizonY, H * 0.15, S.nearRise * wA);
    const g = ctx.createLinearGradient(0, Math.max(ys, 0), 0, Math.max(ys, 0) + Math.max(band, 10));
    g.addColorStop(0, css(top));
    g.addColorStop(lerp(0.5, 0.35, wA), css(mid));
    g.addColorStop(1, css(bot));
    ctx.fillStyle = g;
    ctx.fill();

    if (wA < 0.99) {
      ctx.save();
      waterPath(ctx, S);
      ctx.clip();
      V.deep.draw(ctx, S);
      ctx.restore();
    }
    if (wA < 0.02) return;

    // light on open water: the sun's road by day, a scatter of starlight by night
    const sunny = S.sunUp ? 1 : 0, night = S.night;
    const warm = ss(0.69, 0.77, p);
    const gc = mixc(mixc([255, 244, 214], [255, 186, 120], warm), [190, 205, 255], night);
    const sx = S.sunX || W * 0.5;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const r = rng(9);
    for (let i = 0; i < 130; i++) {
      const v = r(), yy = S.horizonY + 3 + v * v * band, spread = (0.03 + v * 0.22) * W, ph = r() * TAU, sp = 0.6 + r() * 1.6, u = r() + r() - 1, wide = r();
      const x = lerp(sx + u * spread, wide * W, Math.max(night, 1 - sunny)) + Math.sin(t * 0.3 + ph) * 6;
      const on = Math.sin(t * sp + ph);
      if (on < 0.1) continue;
      const len = (3 + v * 16) * on * lerp(1, 0.55, night);
      ctx.moveTo(x - len, yy);
      ctx.lineTo(x + len, yy);
    }
    ctx.strokeStyle = css(gc, (0.55 - 0.3 * night) * wA);
    ctx.stroke();

    // lamps on the far shore lay their light on the water
    if (S.home > 0.02) {
      ctx.lineWidth = 1.4;
      for (const wn of land.windows) {
        if (wn.l !== 1) continue;
        const a = S.home * 0.4 + wn.glow * 0.45;
        for (let k = 0; k < 6; k++) {
          const hw = wn.w * (0.9 + k * 0.35) * (0.65 + 0.35 * Math.sin(t * 2.2 + k * 1.3 + wn.phase * 9));
          const yy = S.horizonY + 3 + k * 4.5;
          ctx.strokeStyle = 'rgba(255,205,130,' + a * (1 - k / 6.5) + ')';
          ctx.beginPath(); ctx.moveTo(wn.x - hw, yy); ctx.lineTo(wn.x + hw, yy); ctx.stroke();
        }
      }
    }
    V.motes.reflect(ctx, S, band);
  };

  // ---------------------------------------------------------------- hills
  function ridgePath(ctx, l, S, dy) {
    ctx.beginPath();
    ctx.moveTo(0, H + 2);
    let minY = H;
    for (let x = 0; x <= W + 10; x += 10) { const y = world.ridgeY(l, x, S) + dy; if (y < minY) minY = y; ctx.lineTo(x, y); }
    ctx.lineTo(W + 10, H + 2);
    ctx.closePath();
    return minY;
  }

  function drawLayer(ctx, l, S, cols) {
    // the soft shadow a nearer sheet of paper leaves on whatever is behind it
    if (l >= 2) {
      const sh = lerp(0.1, 0.16, S.night);
      ridgePath(ctx, l, S, -9); ctx.fillStyle = 'rgba(12,14,50,' + sh * 0.45 + ')'; ctx.fill();
      ridgePath(ctx, l, S, -4); ctx.fillStyle = 'rgba(12,14,50,' + sh + ')'; ctx.fill();
    }
    for (const hs of houses) if (hs.l === l) drawHouse(ctx, hs, S);
    if (l < 2) {
      for (const ft of farTrees) if (ft.l === l) {
        const y = world.ridgeY(l, ft.x, S);
        if (y > S.horizonY - 2) continue;
        ctx.fillStyle = tint(ft.tone, l, false, S);
        ctx.beginPath(); ctx.arc(ft.x, y - ft.r * 0.4, ft.r, 0, TAU); ctx.fill();
      }
    }
    const minY = ridgePath(ctx, l, S, 0);
    const g = ctx.createLinearGradient(0, minY, 0, minY + H * (l < 2 ? 0.1 : 0.3));
    g.addColorStop(0, css(cols[l]));
    g.addColorStop(1, css(mixc(cols[l], cols[Math.min(4, l + 1)], 0.75)));
    ctx.fillStyle = g;
    ctx.fill();
    if (l >= 2) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (const k of ticks[l]) if (k.lite === !!pass) {
          const x = k.xn * W, y = world.ridgeY(l, x, S) + k.d * H;
          ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(k.a) * k.s, y - Math.cos(k.a) * k.s);
          ctx.moveTo(x + k.s * 0.5, y); ctx.lineTo(x + k.s * 0.5 + Math.sin(k.a + 0.5) * k.s * 0.7, y - Math.cos(k.a + 0.5) * k.s * 0.7);
        }
        ctx.strokeStyle = pass ? 'rgba(255,255,230,' + lerp(0.2, 0.04, ss(0.69, 0.78, S.p)) + ')' : 'rgba(10,40,30,0.16)';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    // the lit edge of cut paper
    ctx.beginPath();
    for (let x = 0; x <= W + 10; x += 10) { const y = world.ridgeY(l, x, S) + 0.75; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = 'rgba(255,255,255,' + lerp(0.24, 0.05, ss(0.69, 0.77, S.p)) * (l < 2 ? 0.6 : 1) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  land.drawFar = function (ctx, S) {
    if (S.farRise < 0.002) return;
    const cols = ramp(world.HILL, S.p);
    drawLayer(ctx, 0, S, cols);
    drawLayer(ctx, 1, S, cols);
  };

  land.drawNear = function (ctx, S) {
    const cols = ramp(world.HILL, S.p), dt = S.dt, t = S.t, reach = H * 0.12;
    for (let l = 2; l < 5; l++) {
      if (S.off[l] > H * 0.6) continue;
      drawLayer(ctx, l, S, cols);
      for (const pl of byLayer[l]) {
        const x = pl.xn * W, y = world.ridgeY(l, x, S) + pl.dyn * H;
        let target;
        if (pl.born >= 0) target = clamp((t - pl.born) / 2.8);
        else {
          target = ss(pl.thr, pl.thr + pl.span, S.p); // the flock's passage over this spot, which the scroll drives
          if (target < 1 && S.p > 0.5 && S.pActive > 0.5) { // or the visitor's
            const dx = x - S.px, dy = y - S.py;
            if (dx * dx + dy * dy < reach * reach) pl.touched = 1;
          }
          if (S.p < 0.46) pl.touched = 0;
          if (pl.touched) target = 1;
        }
        pl.g += (target - pl.g) * (1 - Math.exp(-dt * (pl.kind === 't' ? 1.0 : 1.7)));
        if (pl.g < 0.004 || (y > H + pl.size * 0.2 && pl.kind !== 't')) continue;
        if (pl.kind === 'f') drawFlower(ctx, pl, x, y, S);
        else if (pl.kind === 'g') drawGrass(ctx, pl, x, y, S);
        else drawTree(ctx, pl, x, y, S);
      }
    }
  };

  // ---------------------------------------------------------------- houses
  function houseShape(ctx, hs, ox, oy) {
    const { x, w, h, yb, roofH, type, side } = hs;
    const x0 = x - w / 2 + ox, top = yb - h + oy, ov = w * 0.09;
    ctx.beginPath();
    ctx.rect(x0, top, w, h + H * 0.05);
    if (type === 2) { ctx.moveTo(x0 - ov, top + 1); ctx.lineTo(x0 + w * 0.22, top - roofH); ctx.lineTo(x0 + w * 0.78, top - roofH); ctx.lineTo(x0 + w + ov, top + 1); ctx.closePath(); }
    else { ctx.moveTo(x0 - ov, top + 1); ctx.lineTo(x + ox, top - roofH); ctx.lineTo(x0 + w + ov, top + 1); ctx.closePath(); }
    if (type === 3) { const ax = side > 0 ? x0 + w : x0 - w * 0.5; ctx.rect(ax, top + h * 0.42, w * 0.5, h * 0.58 + H * 0.05); }
    if (hs.chimney) ctx.rect(x + ox + side * w * 0.22 - w * 0.06, top - roofH * 0.95, w * 0.12, roofH);
  }

  function drawHouse(ctx, hs, S) {
    const { x, w, h, yb, l, roofH, type, side, size } = hs;
    const x0 = x - w / 2, top = yb - h, ov = w * 0.09;
    // its shadow on the sheet behind
    houseShape(ctx, hs, size * 0.08, size * 0.05);
    ctx.fillStyle = 'rgba(12,14,50,' + lerp(0.13, 0.2, S.night) + ')';
    ctx.fill();

    if (hs.chimney) {
      const cx = x + side * w * 0.22;
      // someone is home
      if (S.home > 0.05 && l > 1) {
        ctx.fillStyle = 'rgba(235,225,235,1)';
        for (let k = 0; k < 5; k++) {
          const a = (S.t * 0.11 + k / 5 + hs.ph) % 1;
          ctx.globalAlpha = 0.2 * S.home * Math.sin(Math.PI * a) * (1 - S.night * 0.4);
          ctx.beginPath();
          ctx.arc(cx + Math.sin(a * 5 + hs.ph + k) * size * 0.1 + a * size * 0.35, top - roofH - a * size * 1.5, size * (0.05 + a * 0.12), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = tint(hs.roof, l, false, S);
      ctx.fillRect(cx - w * 0.06, top - roofH * 0.95, w * 0.12, roofH);
    }
    if (type === 3) {
      const ax = side > 0 ? x0 + w : x0 - w * 0.5, ay = top + h * 0.42;
      ctx.fillStyle = tint(hs.wall, l, false, S);
      ctx.fillRect(ax, ay, w * 0.5, h * 0.58 + H * 0.05);
      ctx.fillStyle = tint(hs.roof, l, false, S);
      ctx.beginPath();
      if (side > 0) { ctx.moveTo(ax, ay - h * 0.2); ctx.lineTo(ax + w * 0.56, ay + 1); ctx.lineTo(ax, ay + 1); }
      else { ctx.moveTo(ax + w * 0.5, ay - h * 0.2); ctx.lineTo(ax - w * 0.06, ay + 1); ctx.lineTo(ax + w * 0.5, ay + 1); }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = tint(hs.wall, l, false, S);
    ctx.fillRect(x0, top, w, h + H * 0.05);
    ctx.fillStyle = tint(hs.roof, l, false, S);
    ctx.beginPath();
    if (type === 2) { ctx.moveTo(x0 - ov, top + 1); ctx.lineTo(x0 + w * 0.22, top - roofH); ctx.lineTo(x0 + w * 0.78, top - roofH); ctx.lineTo(x0 + w + ov, top + 1); }
    else { ctx.moveTo(x0 - ov, top + 1); ctx.lineTo(x, top - roofH); ctx.lineTo(x0 + w + ov, top + 1); }
    ctx.closePath();
    ctx.fill();
    // the eave's thin shadow on the wall
    ctx.fillStyle = 'rgba(12,14,50,0.12)';
    ctx.fillRect(x0, top + 1, w, Math.max(1.5, size * 0.04));

    if (hs.door) {
      const dw = hs.door.w, dh = hs.door.h, dx = x + hs.door.rx - dw / 2;
      ctx.fillStyle = tint(hs.roof, l, false, S);
      ctx.beginPath();
      ctx.moveTo(dx, yb + 2); ctx.lineTo(dx, yb - dh + dw / 2); ctx.arc(dx + dw / 2, yb - dh + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(dx + dw, yb + 2);
      ctx.closePath();
      ctx.fill();
    }

    for (const wn of hs.wins) {
      const wx = wn.x - wn.w / 2, wy = wn.y - wn.h / 2;
      ctx.fillStyle = tint(21, l, false, S);
      ctx.fillRect(wx, wy, wn.w, wn.h);
      // their own lamp: people have their own light. a visit only makes the room livelier
      const home = S.home * (0.46 + 0.05 * Math.sin(S.t * 0.7 + wn.phase * 30));
      const talk = wn.glow > 0.01 ? land.talk(wn, S.t)[0] : 0;
      const lit = Math.min(1, home + wn.glow * (0.34 + 0.3 * talk));
      if (lit > 0.01) {
        ctx.fillStyle = css(mixc([255, 190, 105], [255, 232, 170], wn.glow), lit);
        ctx.fillRect(wx, wy, wn.w, wn.h);
        const rad = wn.w * (3 + 2.2 * wn.glow);
        const gg = ctx.createRadialGradient(wn.x, wn.y, 0, wn.x, wn.y, rad);
        gg.addColorStop(0, 'rgba(255,190,110,' + 0.34 * lit * (0.25 + 0.75 * S.home) + ')');
        gg.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gg;
        ctx.fillRect(wn.x - rad, wn.y - rad, rad * 2, rad * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      // a visitor has just arrived
      const hello = (S.t - (wn.hello || -99)) / 1.6;
      if (hello > 0 && hello < 1) {
        ctx.strokeStyle = 'rgba(255,225,170,' + 0.5 * (1 - hello) * (1 - hello) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(wn.x, wn.y, wn.w * (0.8 + 4.2 * V.easeOut(hello)), 0, TAU); ctx.stroke();
      }
      if (l === 3) { // a glazing bar, on windows big enough to have one
        ctx.fillStyle = tint(hs.wall, l, false, S);
        ctx.fillRect(wn.x - 0.6, wy, 1.2, wn.h);
      }
    }
  }

  // ---------------------------------------------------------------- the garden
  function drawFlower(ctx, pl, x, y, S) {
    const g = pl.g, len = pl.size, gs = ss(0, 0.65, g);
    const sway = Math.sin(S.t * 0.9 + pl.seed) * 0.05 + Math.sin(S.t * 0.37 + x * 0.004) * 0.05;
    const tx = x + (pl.lean + sway) * len * gs, ty = y - len * gs;
    const cx = x + pl.lean * 0.15 * len, cy = y - len * gs * 0.55;
    ctx.strokeStyle = tint(0, pl.l, false, S);
    ctx.lineWidth = Math.max(1, len * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();

    ctx.fillStyle = tint(1, pl.l, false, S);
    for (let k = 0; k < 2; k++) {
      const a = 0.3 + k * 0.25, lg = ss(a, a + 0.3, g);
      if (lg <= 0) continue;
      const b = 1 - a;
      const lx = b * b * x + 2 * a * b * cx + a * a * tx, ly = b * b * y + 2 * a * b * cy + a * a * ty;
      const side = k ? 1 : -1, ll = len * 0.17 * lg;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(side * 0.95 - Math.PI / 2 + sway);
      ctx.beginPath();
      ctx.ellipse(ll, 0, ll, ll * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const gh = ss(0.55, 1, g);
    if (gh <= 0) return;
    const R = len * 0.2 * gh;
    // what the visitor planted keeps a little light after dark
    if (pl.born >= 0 && S.night > 0.02) {
      const rad = R * 4.5, hg = ctx.createRadialGradient(tx, ty, 0, tx, ty, rad);
      hg.addColorStop(0, 'rgba(255,225,170,' + 0.32 * S.night + ')');
      hg.addColorStop(1, 'rgba(255,225,170,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hg;
      ctx.fillRect(tx - rad, ty - rad, rad * 2, rad * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    const own = pl.born >= 0 && S.night > 0.5;
    const petal = own ? css(mixc(world.PAINT[pl.c1], [255, 240, 210], 0.25)) : tint(pl.c1, pl.l, true, S), heart = tint(pl.c2, pl.l, true, S);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate((pl.lean + sway) * 0.8);
    if (pl.type === 0) {
      ctx.fillStyle = petal;
      for (let i = 0; i < pl.n; i++) {
        ctx.save();
        ctx.rotate((i / pl.n) * TAU + pl.seed);
        ctx.beginPath();
        ctx.ellipse(R * 0.8, 0, R * 0.75, R * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = heart;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.42, 0, TAU); ctx.fill();
    } else if (pl.type === 1) {
      ctx.fillStyle = petal;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.fill();
      ctx.fillStyle = tint(7, pl.l, true, S);
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.58, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = heart;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.24, 0, TAU); ctx.fill();
    } else if (pl.type === 2) {
      ctx.strokeStyle = tint(0, pl.l, false, S);
      ctx.lineWidth = Math.max(0.8, len * 0.018);
      ctx.fillStyle = petal;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.1, rr = R * (1.5 + 0.3 * Math.sin(i * 2.3 + pl.seed));
        const ex = Math.cos(a) * rr, ey = Math.sin(a) * rr;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, R * 0.32, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = petal;
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.rotate(i * 0.38);
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.55, R * 0.42, R * 0.95, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawGrass(ctx, pl, x, y, S) {
    const sway = Math.sin(S.t * 1.1 + pl.seed) * 0.12 + Math.sin(S.t * 0.37 + x * 0.004) * 0.1;
    ctx.strokeStyle = tint(pl.c1, pl.l, false, S);
    ctx.lineWidth = Math.max(1, pl.size * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const b of pl.blades) {
      const len = pl.size * b.len * pl.g, a = b.a + sway;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.sin(b.a) * len * 0.4, y - len * 0.6, x + Math.sin(a) * len, y - Math.cos(a) * len);
    }
    ctx.stroke();
  }

  function drawTree(ctx, pl, x, y, S) {
    const g = pl.g, s = pl.size, l = pl.l;
    const th = s * (pl.type ? 0.35 : 0.55) * ss(0, 0.5, g), tw = s * 0.055;
    const sway = Math.sin(S.t * 0.6 + pl.seed) * s * 0.012;
    const shade = 'rgba(12,14,50,' + lerp(0.1, 0.16, S.night) + ')', sx = s * 0.045, sy = s * 0.035;
    ctx.fillStyle = tint(9, l, false, S);
    ctx.beginPath();
    ctx.moveTo(x - tw, y + 3);
    ctx.lineTo(x - tw * 0.55 + sway * 0.5, y - th);
    ctx.lineTo(x + tw * 0.55 + sway * 0.5, y - th);
    ctx.lineTo(x + tw, y + 3);
    ctx.closePath();
    ctx.fill();
    if (pl.type) {
      // three paper triangles
      for (let k = 0; k < 3; k++) {
        const gk = ss(0.3 + k * 0.15, 0.7 + k * 0.1, g);
        if (gk <= 0) continue;
        const by = y - th * 0.6 - k * s * 0.24, hw = s * (0.26 - k * 0.055) * gk, hh = s * 0.4 * gk;
        for (let pass = 0; pass < 2; pass++) {
          const o = pass ? 0 : 1;
          ctx.fillStyle = pass ? tint(k % 2 ? (pl.c2 === 1 ? 0 : pl.c2) : pl.c1, l, false, S) : shade;
          ctx.beginPath();
          ctx.moveTo(x - hw + o * sx, by + o * sy);
          ctx.lineTo(x + sway * (k + 1) + o * sx, by - hh + o * sy);
          ctx.lineTo(x + hw + o * sx, by + o * sy);
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }
    const cx = x + sway, cy = y - th - s * 0.1;
    ctx.fillStyle = shade;
    ctx.beginPath();
    pl.blobs.forEach((b, k) => {
      const gk = ss(0.3 + k * 0.07, 0.72 + k * 0.045, g);
      if (gk <= 0) return;
      const bx = cx + b.dx * s + sway * (1 - b.dy * 2) + sx, by = cy + b.dy * s + sy;
      ctx.moveTo(bx + b.r * s * gk, by);
      ctx.arc(bx, by, b.r * s * gk, 0, TAU);
    });
    ctx.fill();
    pl.blobs.forEach((b, k) => {
      const gk = ss(0.3 + k * 0.07, 0.72 + k * 0.045, g);
      if (gk <= 0) return;
      ctx.fillStyle = tint(b.tone ? pl.c2 : pl.c1, l, false, S);
      ctx.beginPath();
      ctx.arc(cx + b.dx * s + sway * (1 - b.dy * 2), cy + b.dy * s, b.r * s * gk, 0, TAU);
      ctx.fill();
    });
    const gd = ss(0.85, 1, g);
    if (gd > 0) {
      ctx.fillStyle = tint(pl.c1 === 20 ? 7 : 4, l, true, S);
      for (const d of pl.dots) {
        ctx.beginPath();
        ctx.arc(cx + d.dx * s + sway, cy + d.dy * s, s * 0.022 * gd, 0, TAU);
        ctx.fill();
      }
    }
  }
})();
