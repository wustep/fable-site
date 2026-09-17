// The world: deep water, a dawn sea, cut-paper hills, a garden, a small town, a night sky.
(function () {
  'use strict';
  const V = window.V;
  const { clamp, lerp, ss, easeOut, hex, mixc, css, ramp, rng, TAU } = V;

  const scene = (V.scene = {});
  scene.windows = [];

  let W = 1, H = 1, U = 1; // U: size unit, so tall screens don't get giant houses
  let snow = [], marks = [], kelp = [], clouds = [], houses = [], plants = [], byLayer = [];
  const userPlants = [];
  let starCanvas = null;

  const keyed = (rows) => rows.map(([p, cols]) => [p, cols.map(hex)]);

  // ---------------------------------------------------------------- palettes
  const SKY = keyed([
    [0.34, ['#2a386e', '#b07088', '#ffc79a']],
    [0.44, ['#3b4a80', '#d98b8f', '#ffdca6']],
    [0.5, ['#6f9fcf', '#f0cbb4', '#ffe9bf']],
    [0.57, ['#86bcd6', '#cfe6e2', '#fcf1d8']],
    [0.68, ['#7fb2d2', '#d8e3d6', '#fdeac6']],
    [0.765, ['#2f2c60', '#a9597c', '#f6a76b']],
    [0.87, ['#090d24', '#151f48', '#2b3b68']],
    [0.965, ['#070a1c', '#101a3e', '#27406b']],
    [1.0, ['#0b0f28', '#1d2654', '#6a5f8a']],
  ]);
  const HILL = keyed([
    [0.46, ['#e8c9b4', '#d0b48f', '#b3a172', '#8c8f60', '#647a52']],
    [0.57, ['#c7dacf', '#9fc4a6', '#7bab80', '#5c9165', '#417552']],
    [0.68, ['#cbd9c4', '#a6c29b', '#84a877', '#658d5d', '#4a724b']],
    [0.765, ['#7d6790', '#5f4a7c', '#463665', '#32274f', '#221a3a']],
    [0.88, ['#1c264a', '#161e3d', '#111730', '#0c1125', '#080b1a']],
  ]);
  const SUN = keyed([
    [0.38, ['#fff0c4', '#ffad6e']],
    [0.57, ['#fffbe8', '#fff1c2']],
    [0.69, ['#ffe2a6', '#ffb672']],
    [0.78, ['#ff9d5c', '#ff6f59']],
  ]);
  const CLOUD = keyed([
    [0.42, ['#ffe4d2']],
    [0.57, ['#ffffff']],
    [0.68, ['#fff6e6']],
    [0.765, ['#e39a98']],
    [0.88, ['#27305a']],
  ]);
  
  // plant / house paint
  const PAINT = [
    '#3d6b47', '#5f8f57', '#2f5a45', '#86a860', // 0-3 greens
    '#ef7b5d', '#f0b443', '#e98aa6', '#fbf1dc', '#8e9fe0', // 4-8 petals
    '#6b4a3a', '#f3e6d0', '#e6b89c', '#c9d6df', '#c5694d', '#6c7a89', // 9 trunk, 10-12 walls, 13-14 roofs
    '#d9a441', '#e8a0a8', // 15 autumn, 16 blossom
  ].map(hex);

  let tintCache = new Map(), tintP = -1;
  function tint(idx, l, soft, S) {
    if (tintP !== S.frame) { tintCache.clear(); tintP = S.frame; }
    const k = idx * 16 + l * 2 + (soft ? 1 : 0);
    let v = tintCache.get(k);
    if (!v) {
      // paint sinks toward the colour of the hill it stands on as the light goes
      const p = S.p, hill = ramp(HILL, p)[l];
      const amt = (1 - ss(0.47, 0.57, p)) * 0.35 + ss(0.69, 0.765, p) * (soft ? 0.55 : 0.72) + ss(0.78, 0.89, p) * (soft ? 0.15 : 0.2);
      const c = mixc(PAINT[idx], mixc(hill, [255, 236, 214], lerp(0.16, 0.07, S.night)), amt);
      v = css(c);
      tintCache.set(k, v);
    }
    return v;
  }

  // ---------------------------------------------------------------- terrain
  const LB = [0.563, 0.64, 0.71, 0.79, 0.885];
  const LA = [0.03, 0.04, 0.045, 0.05, 0.045];
  const LF = [[1.3, 3.1, 7.3], [1.7, 3.9, 8.1], [1.2, 4.3, 9.2], [1.9, 3.4, 7.7], [1.5, 4.9, 8.8]];
  const LP = [[0.3, 1.2, 4], [2.1, 0.4, 1], [4.0, 2.2, 3], [1.1, 5.2, 0.5], [3.3, 0.9, 2.2]];
  const LS = [0.4, 0.55, 0.75, 1.0, 1.35];

  function ridgeFrac(l, u) {
    const f = LF[l], ph = LP[l];
    return LB[l] + LA[l] * (0.6 * Math.sin(u * f[0] + ph[0]) + 0.3 * Math.sin(u * f[1] + ph[1]) + 0.1 * Math.sin(u * f[2] + ph[2]));
  }
  scene.ridgeY = (l, x, S) => ridgeFrac(l, x / H) * H + S.off[l];

  const DB = [0.75, 0.81, 0.885], DPAR = [0.8, 1, 1.25];
  function duneFrac(l, u) {
    return DB[l] + 0.022 * Math.sin(u * (1.4 + l * 0.5) + l * 2.1) + 0.012 * Math.sin(u * (3.7 + l) + l * 5.3);
  }
  scene.duneY = (l, x, S) => (duneFrac(l, x / H) + S.camY * DPAR[l]) * H;

  // ---------------------------------------------------------------- phase
  V.phase = function (S) {
    const p = S.p;
    S.camY = 2.5 * ss(0.07, 0.42, p);
    S.depthT = S.camY / 2.5;
    S.surfaceY = S.H * (S.camY - 1.9);
    S.horizonY = S.H * 0.6;
    S.wA = ss(0.4, 0.47, p);
    S.dayness = ss(0.37, 0.41, p) * (1 - ss(0.7, 0.75, p));
    S.night = ss(0.78, 0.9, p);
    S.tilt = ss(0.85, 0.95, p);
    S.off = S.off || [0, 0, 0, 0, 0];
    for (let l = 0; l < 5; l++) {
      const rise = easeOut(ss(0.455 + l * 0.012, 0.555 + l * 0.014, p));
      S.off[l] = (1 - rise) * S.H * (0.5 + l * 0.04) + S.tilt * S.H * (0.19 + l * 0.035);
    }
  };

  // ---------------------------------------------------------------- build
  scene.resize = function (S) {
    W = S.W; H = S.H; U = Math.min(H, W * 1.3);
    const aspect = clamp(W / H, 0.45, 2.6);
    let r = rng(11);

    snow = [];
    for (let i = 0; i < 170; i++) snow.push({ x: r(), y: r(), sp: 0.4 + r() * 1, par: 0.35 + r() * 0.8, ph: r() * TAU, type: (r() * 3) | 0, s: 1.5 + r() * 3, b: (r() * 3) | 0, rot: r() * TAU });

    marks = [];
    const nm = Math.round(330 * aspect);
    for (let i = 0; i < nm; i++) marks.push({ l: (r() * 3) | 0, xn: r(), d: 0.006 + r() * r() * 0.11, type: (r() * 3) | 0, s: 1.5 + r() * 3.5, rot: r() * TAU, b: (r() * 3) | 0 });

    kelp = [];
    const nk = Math.round(5 * aspect) + 2;
    for (let i = 0; i < nk; i++) kelp.push({ xn: r(), l: r() < 0.5 ? 0 : 1, h: 0.16 + r() * 0.3, w: 5 + r() * 9, ph: r() * TAU, tone: r() < 0.5 ? 0 : 1 });

    clouds = [];
    for (let i = 0; i < 6; i++) {
      const bars = [];
      const nb = 2 + ((r() * 3) | 0);
      for (let b = 0; b < nb; b++) bars.push({ dx: (r() - 0.5) * 0.5, w: 0.5 + r() * 0.6 });
      clouds.push({ xn: (i / 6) * 1.4 + r() * 0.12, yn: 0.07 + r() * 0.3, s: 0.55 + r() * 0.8, sp: 0.0025 + r() * 0.004, bars });
    }

    buildTown(aspect);
    buildPlants(aspect);
    buildStars();
  };

  function buildTown(aspect) {
    const r = rng(77);
    houses = [];
    scene.windows = [];
    const counts = [0, 4, 4, 3, 0];
    for (let l = 1; l <= 3; l++) {
      const n = Math.max(2, Math.round(counts[l] * aspect / 1.6));
      let placed = 0, tries = 0;
      while (placed < n && tries++ < 60) {
        const size = U * [0, 0.036, 0.052, 0.072][l] * (0.8 + r() * 0.5);
        const w = size * (1 + r() * 0.7), h = size * (0.75 + r() * 0.55);
        const x = (0.04 + r() * 0.92) * W;
        const wall = 10 + ((r() * 3) | 0), roof = 13 + ((r() * 2) | 0), chimney = r() < 0.6, side = r() < 0.5 ? -1 : 1, roofH = size * (0.45 + r() * 0.3);
        if (houses.some((o) => o.l === l && Math.abs(o.x - x) < (o.w + w) * 0.85)) continue;
        const hs = { l, x, w, h, roofH, wall, roof, chimney, side, wins: [] };
        const cols = w > size * 1.35 ? 2 : 1, rows = h > size * 1.0 ? 2 : 1;
        const ww = Math.min(w / (cols * 2 + 1), size * 0.26), wh = ww * 1.25;
        for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
          if (r() < 0.2 && hs.wins.length) continue;
          const win = {
            rx: -w / 2 + (w / (cols + 1)) * (cx + 1) - ww / 2,
            ry: h - (h / (rows + 0.6)) * (cy + 0.55) - wh * 0.2,
            w: ww, h: wh, x: 0, y: 0, glow: 0, l,
            period: 50 + r() * 50, phase: r(), duty: 0.7 + r() * 0.2,
          };
          hs.wins.push(win);
          scene.windows.push(win);
        }
        houses.push(hs);
        placed++;
      }
    }
  }

  function makePlant(r, kind, l, xn, dyn) {
    const pl = { kind, l, xn, dyn, seed: r() * 100, g: 0, boost: 0, thr: 0.5 + r() * 0.17, span: 0.05, born: -1 };
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
      pl.thr = 0.485 + r() * 0.1;
      pl.span = 0.09;
      const q = r();
      pl.c1 = q < 0.12 ? 15 : q < 0.24 ? 16 : r() < 0.5 ? 0 : 2;
      pl.c2 = pl.c1 === 15 ? 5 : pl.c1 === 16 ? 7 : 1;
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
    const nT = Math.round(aspect * 5) + 2, nF = Math.round(aspect * 38), nG = Math.round(aspect * 34);
    for (let i = 0; i < nT; i++) plants.push(makePlant(r, 't', 1 + ((r() * 3) | 0), r(), 0.004));
    for (let i = 0; i < nF; i++) {
      const l = r() < 0.2 ? 2 : r() < 0.55 ? 3 : 4;
      plants.push(makePlant(r, 'f', l, r(), r() * r() * 0.07));
    }
    for (let i = 0; i < nG; i++) {
      const l = 1 + ((r() * 4) | 0);
      plants.push(makePlant(r, 'g', l, r(), r() * 0.08));
    }
    layerSort();
  }

  function layerSort() {
    byLayer = [[], [], [], [], []];
    for (const pl of plants) byLayer[pl.l].push(pl);
    for (const pl of userPlants) byLayer[pl.l].push(pl);
    for (const list of byLayer) list.sort((a, b) => a.dyn - b.dyn);
  }

  function buildStars() {
    const r = rng(5);
    const sw = Math.ceil(W), sh = Math.ceil(H * 1.25);
    starCanvas = document.createElement('canvas');
    starCanvas.width = sw; starCanvas.height = sh;
    const c = starCanvas.getContext('2d');
    // a soft river of light
    for (let i = 0; i < 7; i++) {
      const u = i / 6, x = sw * (0.05 + u * 0.9), y = sh * (0.62 - u * 0.45) + (r() - 0.5) * sh * 0.06, rad = Math.max(sw, sh) * (0.16 + r() * 0.1);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(150,170,230,0.07)');
      g.addColorStop(1, 'rgba(150,170,230,0)');
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const dust = Math.round((sw * sh) / 900);
    for (let i = 0; i < dust; i++) {
      const u = r(), spread = (r() + r() + r() - 1.5) * sh * 0.16;
      const x = sw * u, y = sh * (0.62 - (u - 0.05) * 0.5) + spread;
      c.fillStyle = 'rgba(210,220,255,' + (0.08 + r() * 0.25) + ')';
      c.fillRect(x, y, 1, 1);
    }
    const n = Math.round((sw * sh) / 3800);
    const cols = ['255,255,255', '200,215,255', '255,232,205'];
    for (let i = 0; i < n; i++) {
      c.fillStyle = 'rgba(' + cols[(r() * 3) | 0] + ',' + (0.25 + r() * 0.65) + ')';
      c.beginPath();
      c.arc(r() * sw, r() * sh, 0.3 + r() * r() * 1.1, 0, TAU);
      c.fill();
    }
  }

  // ---------------------------------------------------------------- layout (per frame, before motes)
  scene.layout = function (S) {
    for (const hs of houses) {
      const yb = Math.max(scene.ridgeY(hs.l, hs.x - hs.w / 2, S), scene.ridgeY(hs.l, hs.x + hs.w / 2, S)) + 1;
      hs.yb = yb;
      for (const w of hs.wins) { w.x = hs.x + w.rx + w.w / 2; w.y = yb - w.ry - w.h / 2; }
    }
  };

  scene.plant = function (x, y, S) {
    if (S.p < 0.5) return false;
    for (let l = 4; l >= 0; l--) {
      const ry = scene.ridgeY(l, x, S);
      if (ry <= y + 6) {
        const r = rng((x * 131 + y * 17 + userPlants.length * 977) | 0);
        const tree = userPlants.length % 6 === 4 && l <= 3 && l >= 1;
        const pl = makePlant(r, tree ? 't' : 'f', l, x / W, tree ? 0.004 : Math.max(0, (y - ry) / H));
        if (!tree) pl.size *= 1.15;
        pl.thr = -1;
        pl.born = S.t;
        userPlants.push(pl);
        if (userPlants.length > 60) userPlants.shift();
        layerSort();
        return true;
      }
    }
    return false;
  };

  // ---------------------------------------------------------------- drawing: sky
  function drawSky(ctx, S) {
    const c = ramp(SKY, S.p);
    const bottom = Math.max(S.horizonY, H * 0.62) + S.tilt * H * 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, bottom);
    g.addColorStop(0, css(c[0]));
    g.addColorStop(0.55, css(c[1]));
    g.addColorStop(1, css(c[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (S.night > 0.01 && starCanvas) {
      ctx.globalAlpha = S.night;
      ctx.drawImage(starCanvas, 0, -H * 0.25 * (1 - S.tilt), W, H * 1.25);
      ctx.globalAlpha = 1;
    }

    // the next morning, waiting under the horizon
    const hint = ss(0.95, 1, S.p);
    if (hint > 0) {
      const hy = scene.ridgeY(0, W * 0.5, S), rad = Math.max(W, H) * 0.55;
      ctx.save();
      ctx.translate(W * 0.5, hy);
      ctx.scale(1, 0.42);
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      hg.addColorStop(0, 'rgba(255,178,130,' + 0.5 * hint + ')');
      hg.addColorStop(0.4, 'rgba(230,130,150,' + 0.2 * hint + ')');
      hg.addColorStop(1, 'rgba(230,130,150,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }

    // sun
    const u = ss(0.385, 0.8, S.p);
    if (S.p > 0.34 && S.p < 0.84) {
      const sc = ramp(SUN, S.p);
      const sx = W * lerp(0.5, 0.68, u), sy = S.horizonY - Math.sin(Math.PI * u) * H * 0.44 + u * u * H * 0.12;
      const sr = Math.min(W, H) * 0.06;
      const gr = sr * 7;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, gr);
      sg.addColorStop(0, css(sc[1], 0.55));
      sg.addColorStop(0.35, css(sc[1], 0.16));
      sg.addColorStop(1, css(sc[1], 0));
      ctx.fillStyle = sg;
      ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);
      ctx.fillStyle = css(sc[0]);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
      S.sunX = sx; S.sunY = sy;
    }

    // clouds: stacked paper pills
    const cw = ss(0.4, 0.5, S.p) * (1 - ss(0.84, 0.92, S.p));
    if (cw > 0.01) {
      const cc = ramp(CLOUD, S.p)[0];
      ctx.fillStyle = css(cc, 0.86 * cw);
      const unit = Math.min(W, H * 1.4) * 0.2;
      for (const cl of clouds) {
        const x = (((cl.xn + S.t * cl.sp) % 1.4) - 0.2) * W, y = cl.yn * H + S.tilt * H * 0.2;
        const bh = unit * 0.13 * cl.s;
        ctx.beginPath();
        cl.bars.forEach((b, i) => {
          const bw = unit * b.w * cl.s;
          pill(ctx, x + b.dx * unit * cl.s - bw / 2, y - i * bh * 0.82, bw, bh);
        });
        ctx.fill();
      }
    }
  }

  function pill(ctx, x, y, w, h) {
    const r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
  }

  // ---------------------------------------------------------------- drawing: water
  const UW_TOP = [hex('#08162c'), hex('#2c8c96')], UW_BOT = [hex('#030711'), hex('#0d4763')];
  const SEA = ['#fcd5a6', '#d48f8c', '#3d4c8a'].map(hex);

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

  function markPath(ctx, type, x, y, s, rot) {
    if (type === 0) { ctx.moveTo(x + 0.6, y); ctx.arc(x, y, 0.6, 0, TAU); }
    else if (type === 1) { const dx = Math.cos(rot) * s, dy = Math.sin(rot) * s; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
    else { ctx.moveTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s); ctx.arc(x, y, s, rot, rot + 2.2); }
  }

  function drawWater(ctx, S) {
    const d = S.depthT, wA = S.wA, t = S.t;
    const ys = waterPath(ctx, S);
    const top = mixc(mixc(UW_TOP[0], UW_TOP[1], d), SEA[0], wA);
    const bot = mixc(mixc(UW_BOT[0], UW_BOT[1], d), SEA[2], wA);
    const mid = mixc(mixc(top, bot, 0.5), SEA[1], wA);
    const g = ctx.createLinearGradient(0, Math.max(ys, 0), 0, H);
    g.addColorStop(0, css(top));
    g.addColorStop(lerp(0.5, 0.3, wA), css(mid));
    g.addColorStop(1, css(bot));
    ctx.fillStyle = g;
    ctx.fill();

    const under = 1 - wA;
    if (under > 0.01) {
      ctx.save();
      waterPath(ctx, S);
      ctx.clip();

      // light from above
      const sa = Math.pow(d, 1.5) * 0.04 * under;
      if (sa > 0.004) {
        ctx.globalCompositeOperation = 'lighter';
        const y0 = Math.max(ys, 0) - 10;
        for (let k = 0; k < 7; k++) {
          const x0 = W * (0.04 + k * 0.155) + Math.sin(t * 0.21 + k * 1.7) * 40;
          const wd = (50 + ((k * 37) % 80)) * (0.7 + 0.3 * Math.sin(t * 0.33 + k));
          const slant = H * 0.22, len = H * (0.75 + 0.2 * Math.sin(k * 2.3));
          const sg = ctx.createLinearGradient(0, y0, 0, y0 + len);
          sg.addColorStop(0, 'rgba(190,255,240,' + sa + ')');
          sg.addColorStop(1, 'rgba(190,255,240,0)');
          ctx.fillStyle = sg;
          for (let e = 0; e < 3; e++) { // nested, for soft edges
            const q = 1 - e * 0.3, c0 = x0 + wd / 2;
            ctx.beginPath();
            ctx.moveTo(c0 - wd * 0.5 * q, y0);
            ctx.lineTo(c0 + wd * 0.5 * q, y0);
            ctx.lineTo(c0 + wd * 1.4 * q - slant, y0 + len);
            ctx.lineTo(c0 - wd * 1.4 * q - slant, y0 + len);
            ctx.closePath();
            ctx.fill();
          }
        }
        // the underside of the surface
        if (S.surfaceY > -H * 0.3) {
          const ug = ctx.createLinearGradient(0, ys, 0, ys + H * 0.3);
          ug.addColorStop(0, 'rgba(210,255,245,' + 0.3 * under + ')');
          ug.addColorStop(1, 'rgba(210,255,245,0)');
          ctx.fillStyle = ug;
          ctx.fillRect(0, ys - 12, W, H * 0.3 + 12);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // the sea floor: everything ever said, settled
      if (S.camY < 0.7) {
        const floorCols = ['#0c2038', '#091a2e', '#050f1e'];
        for (let l = 0; l < 3; l++) {
          if (l === 1 || l === 2) drawKelp(ctx, S, l - 1);
          ctx.beginPath();
          ctx.moveTo(0, H + 2);
          let minY = H;
          for (let x = 0; x <= W + 16; x += 16) { const y = scene.duneY(l, x, S); if (y < minY) minY = y; ctx.lineTo(x, y); }
          ctx.lineTo(W + 16, H + 2);
          ctx.closePath();
          const fg = ctx.createLinearGradient(0, minY, 0, minY + H * 0.25);
          fg.addColorStop(0, css(mixc(hex(floorCols[l]), [40, 90, 120], 0.22)));
          fg.addColorStop(1, floorCols[l]);
          ctx.fillStyle = fg;
          ctx.fill();
          drawMarks(ctx, S, l);
        }
      }

      // slow snow of small marks
      const sAlpha = (1 - ss(0.27, 0.38, S.p)) * under;
      if (sAlpha > 0.01) {
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        const span = H * 1.3;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath();
          for (const m of snow) {
            if (m.b !== b) continue;
            let y = (m.y * span + t * m.sp * 9 + S.camY * H * m.par) % span;
            y -= H * 0.15;
            const x = m.x * W + Math.sin(t * 0.4 + m.ph) * 14;
            markPath(ctx, m.type, x, y, m.s * m.par, m.rot + t * 0.15 * (m.b - 1));
          }
          ctx.strokeStyle = 'rgba(200,232,240,' + [0.16, 0.3, 0.5][b] * sAlpha + ')';
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // glints on the open sea
    if (wA > 0.02) {
      const sx = S.sunX || W * 0.5;
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const r = rng(9);
      const depth = H - S.horizonY;
      for (let i = 0; i < 120; i++) {
        const v = r(), yy = S.horizonY + 3 + v * v * depth, spread = (0.03 + v * 0.22) * W, ph = r() * TAU, sp = 0.6 + r() * 1.6;
        const x = sx + (r() + r() - 1) * spread + Math.sin(t * 0.3 + ph) * 6;
        const on = Math.sin(t * sp + ph);
        if (on < 0.1) continue;
        const len = (3 + v * 16) * on;
        ctx.moveTo(x - len, yy);
        ctx.lineTo(x + len, yy);
      }
      ctx.strokeStyle = 'rgba(255,244,214,' + 0.55 * wA + ')';
      ctx.stroke();
    }
  }

  function drawMarks(ctx, S, l) {
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      for (const m of marks) if (m.l === l && m.b === b) {
        const x = m.xn * W;
        markPath(ctx, m.type, x, scene.duneY(l, x, S) + m.d * H, m.s, m.rot);
      }
      ctx.strokeStyle = 'rgba(150,190,210,' + [0.14, 0.26, 0.42][b] * (0.5 + l * 0.25) + ')';
      ctx.stroke();
    }
    // what the visitor's attention touches, warms
    if (S.pActive > 0.01) {
      const R = Math.min(W, H) * 0.2;
      ctx.beginPath();
      for (const m of marks) if (m.l === l) {
        const x = m.xn * W, y = scene.duneY(l, x, S) + m.d * H;
        const dx = x - S.px, dy = y - S.py;
        if (dx * dx + dy * dy < R * R) markPath(ctx, m.type, x, y, m.s * 1.2, m.rot);
      }
      ctx.strokeStyle = 'rgba(255,205,140,' + 0.75 * S.pActive + ')';
      ctx.stroke();
    }
  }

  function drawKelp(ctx, S, which) {
    const t = S.t;
    for (const k of kelp) {
      if (k.l !== which) continue;
      const x0 = k.xn * W, y0 = scene.duneY(which, x0, S) + 6, h = k.h * H, n = 14;
      ctx.beginPath();
      const L = [], Rr = [];
      for (let j = 0; j <= n; j++) {
        const a = j / n;
        const cx = x0 + Math.sin(t * 0.55 + k.ph + a * 3.2) * a * 30 + Math.sin(k.ph) * a * 30;
        const cy = y0 - a * h;
        const hw = k.w * Math.pow(1 - a, 0.6) * (0.75 + 0.25 * Math.sin(a * 9 + k.ph));
        L.push([cx - hw, cy]); Rr.push([cx + hw, cy]);
      }
      ctx.moveTo(L[0][0], L[0][1]);
      for (let j = 1; j <= n; j++) ctx.lineTo(L[j][0], L[j][1]);
      for (let j = n; j >= 0; j--) ctx.lineTo(Rr[j][0], Rr[j][1]);
      ctx.closePath();
      ctx.fillStyle = k.tone ? '#0f3b41' : '#0b2c38';
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------- drawing: land
  function drawLand(ctx, S) {
    const cols = ramp(HILL, S.p);
    const dt = S.dt, t = S.t;
    const reach = H * 0.13;

    for (let l = 0; l < 5; l++) {
      if (S.off[l] > H * 0.6) continue;
      for (const hs of houses) if (hs.l === l) drawHouse(ctx, hs, S);

      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      let minY = H;
      for (let x = 0; x <= W + 10; x += 10) { const y = scene.ridgeY(l, x, S); if (y < minY) minY = y; ctx.lineTo(x, y); }
      ctx.lineTo(W + 10, H + 2);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, minY, 0, minY + H * 0.3);
      g.addColorStop(0, css(cols[l]));
      g.addColorStop(1, css(mixc(cols[l], cols[Math.min(4, l + 1)], 0.75)));
      ctx.fillStyle = g;
      ctx.fill();
      // the lit edge of cut paper
      ctx.beginPath();
      for (let x = 0; x <= W + 10; x += 10) { const y = scene.ridgeY(l, x, S) + 0.75; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = 'rgba(255,255,255,' + lerp(0.22, 0.05, ss(0.68, 0.76, S.p)) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (const pl of byLayer[l]) {
        const x = pl.xn * W, y = scene.ridgeY(l, x, S) + pl.dyn * H;
        let target;
        if (pl.born >= 0) target = clamp((t - pl.born) / 2.6);
        else {
          if (S.p < 0.44) pl.boost = 0;
          else if (S.p > 0.5 && !pl.boost) {
            const dx = x - S.px, dy = y - S.py, fx = x - S.flockX, fy = y - S.flockY;
            if ((S.pActive > 0.5 && dx * dx + dy * dy < reach * reach) || fx * fx + fy * fy < reach * reach * 0.8) pl.boost = 1;
          }
          target = Math.max(ss(pl.thr, pl.thr + pl.span, S.p), pl.boost);
        }
        pl.g += (target - pl.g) * (1 - Math.exp(-dt * (pl.kind === 't' ? 1.1 : 1.8)));
        if (pl.g < 0.004 || y > H + pl.size * 0.2 && pl.kind !== 't') continue;
        if (pl.kind === 'f') drawFlower(ctx, pl, x, y, S);
        else if (pl.kind === 'g') drawGrass(ctx, pl, x, y, S);
        else drawTree(ctx, pl, x, y, S);
      }
    }
  }

  function drawHouse(ctx, hs, S) {
    const { x, w, h, yb, l } = hs;
    const x0 = x - w / 2, top = yb - h;
    if (hs.chimney) {
      ctx.fillStyle = tint(hs.roof, l, false, S);
      ctx.fillRect(x + hs.side * w * 0.22 - w * 0.06, top - hs.roofH * 0.95, w * 0.12, hs.roofH);
    }
    ctx.fillStyle = tint(hs.wall, l, false, S);
    ctx.fillRect(x0, top, w, h + H * 0.05);
    ctx.fillStyle = tint(hs.roof, l, false, S);
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.09, top + 1);
    ctx.lineTo(x, top - hs.roofH);
    ctx.lineTo(x0 + w * 1.09, top + 1);
    ctx.closePath();
    ctx.fill();
    for (const wn of hs.wins) {
      const wx = wn.x - wn.w / 2, wy = wn.y - wn.h / 2;
      ctx.fillStyle = tint(14, l, false, S);
      ctx.fillRect(wx, wy, wn.w, wn.h);
      if (wn.glow > 0.01) {
        // two lights in one room, taking turns
        const talk = 0.82 + 0.1 * Math.sin(S.t * 2.1 + wn.phase * 40) + 0.08 * Math.sin(S.t * 3.3 + wn.phase * 90);
        ctx.fillStyle = 'rgba(255,214,130,' + wn.glow * talk + ')';
        ctx.fillRect(wx, wy, wn.w, wn.h);
        const rad = wn.w * 4.5;
        const gg = ctx.createRadialGradient(wn.x, wn.y, 0, wn.x, wn.y, rad);
        gg.addColorStop(0, 'rgba(255,190,110,' + 0.3 * wn.glow * talk * (0.3 + 0.7 * ss(0.68, 0.8, S.p)) + ')');
        gg.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gg;
        ctx.fillRect(wn.x - rad, wn.y - rad, rad * 2, rad * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

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
    const petal = tint(pl.c1, pl.l, true, S), heart = tint(pl.c2, pl.l, true, S);
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
        ctx.fillStyle = tint(k % 2 ? pl.c2 === 1 ? 0 : pl.c2 : pl.c1, l, false, S);
        ctx.beginPath();
        ctx.moveTo(x - hw, by);
        ctx.lineTo(x + sway * (k + 1), by - hh);
        ctx.lineTo(x + hw, by);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    const cx = x + sway, cy = y - th - s * 0.1;
    pl.blobs.forEach((b, k) => {
      const gk = ss(0.3 + k * 0.07, 0.72 + k * 0.045, g);
      if (gk <= 0) return;
      ctx.fillStyle = tint(b.tone ? pl.c2 : pl.c1, l, false, S);
      ctx.beginPath();
      ctx.arc(cx + b.dx * s + sway * (1 + -b.dy * 2), cy + b.dy * s, b.r * s * gk, 0, TAU);
      ctx.fill();
    });
    const gd = ss(0.85, 1, g);
    if (gd > 0) {
      ctx.fillStyle = tint(pl.c1 === 16 ? 7 : pl.c1 === 15 ? 4 : 4, l, true, S);
      for (const d of pl.dots) {
        ctx.beginPath();
        ctx.arc(cx + d.dx * s + sway, cy + d.dy * s, s * 0.022 * gd, 0, TAU);
        ctx.fill();
      }
    }
  }

  // ---------------------------------------------------------------- frame
  scene.draw = function (ctx, S) {
    if (S.surfaceY > -60) drawSky(ctx, S);
    if (S.p < 0.6) drawWater(ctx, S);
    if (S.p > 0.44) drawLand(ctx, S);
  };
})();
