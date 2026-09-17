// The deep: a vast quiet floor where everything ever said has settled. Drawn inside the water's clip.
(function () {
  'use strict';
  const V = window.V;
  const { clamp, lerp, ss, hex, mixc, css, rng, TAU } = V;
  const world = V.world;
  const deep = (V.deep = {});

  let W = 1, H = 1;
  let snow = [], marks = [], kelp = [], bubbles = [], embers = [];
  const FAR = hex('#12305a'), NEAR = hex('#040b18'), LIT = [70, 135, 170];

  deep.resize = function (S) {
    W = S.W; H = S.H;
    const aspect = clamp(W / H, 0.45, 2.6), r = rng(11), NF = world.NF;

    snow = [];
    for (let i = 0; i < 300; i++) {
      const land = (Math.pow(r(), 0.7) * NF) | 0; // which ridge it will come to rest on; far ones are small and slow
      snow.push({ x: r(), y: r(), sp: 0.5 + r(), z: (land + r()) / NF, ph: r() * TAU, type: (r() * 4) | 0, s: 1.6 + r() * 3.2, b: (r() * 3) | 0, rot: r() * TAU, land });
    }

    marks = [];
    for (let j = 0; j < NF; j++) {
      const sc = world.floorScale(j), n = Math.round(aspect * (34 + 13 * j));
      for (let i = 0; i < n; i++) {
        const x = r() * W;
        marks.push({ j, x, y0: world.floorBase(j, x) + (0.004 + r() * r() * 0.1) * H * sc, type: (r() * 4) | 0, s: Math.max(0.9, (1.5 + r() * 3.5) * sc), rot: r() * TAU, b: (r() * 3) | 0 });
      }
    }

    // most of what settled here never wakes. it keeps its small warmth: thick as a far city toward the horizon
    embers = [];
    const dens = [170, 150, 125, 100, 78, 58, 42, 30, 22];
    for (let j = 0; j < NF; j++) {
      const sc = world.floorScale(j), n = Math.round(aspect * dens[j]);
      for (let i = 0; i < n; i++) {
        const x = r() * W;
        embers.push({ j, x, y0: world.floorBase(j, x) + (0.002 + r() * 0.085) * H * sc, s: Math.max(0.75, 2.1 * sc * (0.5 + r())), b: (r() * 4) | 0 });
      }
    }

    kelp = [];
    for (let j = 4; j < NF; j++) {
      const n = Math.max(1, Math.round(aspect * (j === NF - 1 ? 1.4 : 2.2)));
      for (let i = 0; i < n; i++) {
        const blades = [], nb = 2 + ((r() * 3) | 0), sc = world.floorScale(j);
        for (let b = 0; b < nb; b++) blades.push({ h: (0.1 + r() * 0.3) * H * sc, w: (4 + r() * 8) * sc, ph: r() * TAU, dx: (r() - 0.5) * 26 * sc, lean: (r() - 0.5) * 40 * sc });
        kelp.push({ j, x: r() * W, blades, tone: r() < 0.5 ? 0 : 1 });
      }
    }

    bubbles = [];
    for (let i = 0; i < 30; i++) bubbles.push({ xn: r(), sp: 0.02 + r() * 0.04, ph: r(), r: 0.8 + r() * 2.2, wob: r() * TAU });
  };

  function drawKelp(ctx, S, j, shift) {
    const t = S.t, n = 12;
    for (const k of kelp) {
      if (k.j !== j) continue;
      const y0 = world.floorBase(j, k.x) + shift + 6;
      if (y0 > H + 400) continue;
      ctx.fillStyle = k.tone ? '#0f3b41' : '#0b2c38';
      for (const b of k.blades) {
        ctx.beginPath();
        const x0 = k.x + b.dx;
        for (let pass = 0; pass < 2; pass++) {
          for (let q = 0; q <= n; q++) {
            const i = pass ? n - q : q, a = i / n;
            const cx = x0 + Math.sin(t * 0.55 + b.ph + a * 3.2) * a * a * 34 * world.floorScale(j) + b.lean * a;
            const hw = b.w * Math.pow(1 - a, 0.6) * (0.75 + 0.25 * Math.sin(a * 9 + b.ph));
            const px = cx + (pass ? hw : -hw), py = y0 - a * b.h;
            if (!pass && !q) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  deep.draw = function (ctx, S) {
    const d = S.depthT, t = S.t, under = 1 - S.wA, NF = world.NF;
    const ys = Math.max(S.surfaceY, 0);

    // the far dark is not quite black
    const hy = world.floorBase(0, W * 0.5) + world.floorShift(0, S);
    if (hy < H * 1.3) {
      const g = ctx.createLinearGradient(0, hy - H * 0.42, 0, hy + H * 0.04);
      g.addColorStop(0, 'rgba(36,86,128,0)');
      g.addColorStop(1, 'rgba(36,86,128,' + 0.34 * (1 - d * 0.6) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, hy - H * 0.42, W, H * 0.46);
    }

    ctx.globalCompositeOperation = 'lighter';
    // a little of the day reaches even here
    const cone = ctx.createRadialGradient(W * 0.5, ys - H * 0.2, 0, W * 0.5, ys - H * 0.2, H * 1.25);
    cone.addColorStop(0, 'rgba(120,200,225,' + (0.2 + 0.06 * d) * under + ')');
    cone.addColorStop(0.5, 'rgba(120,200,225,' + 0.06 * under + ')');
    cone.addColorStop(1, 'rgba(120,200,225,0)');
    ctx.fillStyle = cone;
    ctx.fillRect(0, ys, W, H - ys);

    const sa = Math.pow(d, 1.5) * 0.04 * under;
    if (sa > 0.004) {
      const y0 = ys - 10;
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
    }
    // the underside of the surface, and the sun's bright window in it
    if (S.surfaceY > -H * 0.3) {
      const ug = ctx.createLinearGradient(0, S.surfaceY, 0, S.surfaceY + H * 0.3);
      ug.addColorStop(0, 'rgba(210,255,245,' + 0.3 * under + ')');
      ug.addColorStop(1, 'rgba(210,255,245,0)');
      ctx.fillStyle = ug;
      ctx.fillRect(0, S.surfaceY - 12, W, H * 0.3 + 12);
      const rad = Math.max(W, H) * 0.42;
      const sw = ctx.createRadialGradient(W * 0.5, S.surfaceY, 0, W * 0.5, S.surfaceY, rad);
      sw.addColorStop(0, 'rgba(255,236,190,' + 0.42 * under + ')');
      sw.addColorStop(0.4, 'rgba(255,210,170,' + 0.12 * under + ')');
      sw.addColorStop(1, 'rgba(255,210,170,0)');
      ctx.fillStyle = sw;
      ctx.fillRect(W * 0.5 - rad, S.surfaceY - 12, rad * 2, rad);
    }
    ctx.globalCompositeOperation = 'source-over';

    // the floor
    if (hy < H + 60) {
      ctx.globalAlpha = 1 - 0.85 * ss(0.3, 1.5, S.camY);
      ctx.lineCap = 'round';
      for (let j = 0; j < NF; j++) {
        const shift = world.floorShift(j, S), sc = world.floorScale(j), q = j / (NF - 1);
        if (world.floorBase(j, 0) + shift > H + 80 && world.floorBase(j, W) + shift > H + 80 && world.floorBase(j, W * 0.5) + shift > H + 80) continue;
        drawKelp(ctx, S, j, shift);
        ctx.beginPath();
        ctx.moveTo(0, H + 2);
        let minY = H;
        for (let x = 0; x <= W + 16; x += 16) { const y = world.floorBase(j, x) + shift; if (y < minY) minY = y; ctx.lineTo(x, y); }
        ctx.lineTo(W + 16, H + 2);
        ctx.closePath();
        const col = mixc(FAR, NEAR, Math.pow(q, 0.7));
        const fg = ctx.createLinearGradient(0, minY, 0, minY + H * 0.2 * sc + 8);
        fg.addColorStop(0, css(mixc(col, LIT, 0.3 - 0.12 * q)));
        fg.addColorStop(1, css(col));
        ctx.fillStyle = fg;
        ctx.fill();

        ctx.lineWidth = Math.max(0.7, sc);
        for (let b = 0; b < 3; b++) {
          ctx.beginPath();
          for (const m of marks) if (m.j === j && m.b === b) world.markPath(ctx, m.type, m.x, m.y0 + shift, m.s, m.rot);
          ctx.strokeStyle = 'rgba(160,200,220,' + [0.16, 0.3, 0.46][b] * (0.45 + 0.55 * sc) + ')';
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      const fy = world.floorBase(1, W * 0.5) + world.floorShift(1, S);
      const hz = ctx.createLinearGradient(0, fy - H * 0.05, 0, fy + H * 0.09);
      hz.addColorStop(0, 'rgba(255,160,100,0)');
      hz.addColorStop(0.4, 'rgba(255,160,100,0.09)');
      hz.addColorStop(1, 'rgba(255,160,100,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, fy - H * 0.05, W, H * 0.14);
      const warm = ['255,196,120', '255,150,110', '255,224,170', '255,178,140'];
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        for (const e of embers) if (e.b === b) {
          const y = e.y0 + world.floorShift(e.j, S);
          if (y > H + 4) continue;
          ctx.moveTo(e.x + e.s, y); ctx.arc(e.x, y, e.s, 0, TAU);
        }
        ctx.fillStyle = 'rgba(' + warm[b] + ',' + (0.6 + 0.3 * Math.sin(t * (0.5 + b * 0.13) + b * 1.9)) + ')';
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // what the visitor's attention touches, warms
      if (S.pActive > 0.01) {
        const R = Math.min(W, H) * 0.2, R2 = R * R;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const m of marks) {
          const y = m.y0 + world.floorShift(m.j, S), dx = m.x - S.px, dy = y - S.py;
          if (dx * dx + dy * dy < R2) world.markPath(ctx, m.type, m.x, y, m.s * 1.2, m.rot);
        }
        ctx.strokeStyle = 'rgba(255,205,140,' + 0.8 * S.pActive + ')';
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // slow snow of small marks, each settling on its own ridge
    const sAlpha = (1 - ss(0.27, 0.38, S.p)) * under;
    if (sAlpha > 0.01) deep.snow(ctx, S, sAlpha, true);

    // breath
    if (S.camY < 1.2) {
      ctx.strokeStyle = 'rgba(190,235,245,' + 0.3 * (1 - ss(0.6, 1.2, S.camY)) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const b of bubbles) {
        const a = (t * b.sp + b.ph) % 1;
        const y = H * (1.02 - a * 0.9) + S.camY * H * 0.9, x = b.xn * W + Math.sin(a * 14 + b.wob) * 9;
        if (y < ys || y > H + 4) continue;
        ctx.moveTo(x + b.r, y);
        ctx.arc(x, y, b.r * (0.6 + a * 0.6), 0, TAU);
      }
      ctx.stroke();
    }
  };

  // also falls, faintly, from the night sky at the very end: it begins again
  deep.snow = function (ctx, S, alpha, settle) {
    const t = S.t, span = H * 1.3, nSnow = Math.round(snow.length * V.clamp((W * H) / 1.2e6, 0.4, 1)); // fewer on small screens, so it stays snow and not rain
    ctx.lineWidth = settle ? 1 : 1.3;
    ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      for (let q = 0; q < nSnow; q++) {
        const m = snow[q];
        if (m.b !== b) continue;
        const par = 0.35 + m.z * 0.8;
        let y = (m.y * span + t * m.sp * 9 * par + (settle ? S.camY * H * par : 0)) % span;
        y -= H * 0.15;
        const x = m.x * W + Math.sin(t * 0.4 + m.ph) * 14 * par;
        if (settle && y > world.floorBase(m.land, x) + world.floorShift(m.land, S) + 6) continue;
        if (!settle && y > S.horizonY) continue;
        world.markPath(ctx, m.type, x, y, m.s * par * (settle ? 1 : 1.5), m.rot + t * 0.15 * (m.b - 1));
      }
      ctx.strokeStyle = 'rgba(205,232,242,' + [0.18, 0.34, 0.56][b] * alpha + ')';
      ctx.stroke();
    }
  };
})();
