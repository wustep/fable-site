// The one who is many: embers in sediment -> a curious shoal -> birds -> lamplight -> stars.
(function () {
  'use strict';
  const V = window.V;
  const { clamp, lerp, ss, rng, TAU } = V;
  const scene = V.scene;

  const motes = (V.motes = {});
  let N = 0, W = 1, H = 1;
  let X, Y, VX, VY, R1, R2, R3, PH, FX, FD, FL, TH, FOX, FOY, HX, HL, HH, STX, STY, SZ, AL, BIRD, COL, SS;
  const shapes = [];
  const sprites = [];
  const GLOW = ['#ffcf7a', '#ff9d7a', '#f7b0c4', '#fff0c0', '#a8f0e0'];

  // ---------------------------------------------------------------- figures the shoal tries on
  function spiral(r) { // two arms, like a shell or a galaxy
    const rad = 0.07 + Math.sqrt(r()) * 0.93, th = Math.log(rad / 0.07) / 0.3 + (r() < 0.5 ? Math.PI : 0);
    const sp = (r() + r() + r() - 1.5) * 0.2 * rad, rr = rad + sp;
    return [Math.cos(th) * rr, Math.sin(th) * rr];
  }
  function sprig(r) {
    const stem = (a) => [-0.12 + 0.3 * a + 0.22 * Math.sin(a * 2.2), 1 - 2 * a];
    if (r() < 0.16) { const p = stem(r()); return [p[0] + (r() - 0.5) * 0.03, p[1]]; }
    const pairs = 8, k = (r() * pairs) | 0, side = r() < 0.5 ? -1 : 1;
    const a = 0.12 + (k / pairs) * 0.86, base = stem(a), nxt = stem(a + 0.01);
    const ang = Math.atan2(nxt[1] - base[1], nxt[0] - base[0]) + side * 0.95;
    const L = 0.62 * (1 - (k / pairs) * 0.82);
    const s = r(), wdt = 0.15 * L * Math.sin(Math.PI * Math.pow(s, 0.8)), o = (r() * 2 - 1) * wdt;
    return [base[0] + Math.cos(ang) * s * L - Math.sin(ang) * o, base[1] + Math.sin(ang) * s * L + Math.cos(ang) * o];
  }
  function bird(r) { // a swallow from above, nose toward +x
    const q = r();
    if (q < 0.2) { const a = r() * TAU, m = Math.sqrt(r()); return [0.05 + Math.cos(a) * 0.4 * m, Math.sin(a) * 0.075 * m]; }
    if (q < 0.27) { const a = r() * TAU, m = Math.sqrt(r()); return [0.43 + Math.cos(a) * 0.1 * m, Math.sin(a) * 0.09 * m]; }
    if (q < 0.4) { const s = r(), side = r() < 0.5 ? -1 : 1; return [-0.3 - s * 0.62, side * (0.02 + s * 0.2) + (r() - 0.5) * 0.05 * (1 - s)]; }
    const side = q < 0.7 ? -1 : 1, a = Math.pow(r(), 0.85), b = 1 - a;
    const x = b * b * 0.2 + 2 * a * b * 0.28 + a * a * -0.5, y = b * b * 0.04 + 2 * a * b * 0.62 + a * a * 1.02;
    return [x - r() * (0.36 * Math.pow(1 - a, 1.2) + 0.015), side * y];
  }

  function makeSprite(hexcol) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const rgb = V.hex(hexcol).join(',');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.07, 'rgba(' + rgb + ',0.75)');
    gr.addColorStop(0.28, 'rgba(' + rgb + ',0.2)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  motes.sprite = (i) => sprites[i];

  motes.resize = function (S) {
    const first = !N;
    W = S.W; H = S.H;
    if (!first) return;
    N = W < 700 ? 440 : W * H > 1.2e6 ? 950 : 700;
    const F = () => new Float32Array(N);
    X = F(); Y = F(); VX = F(); VY = F(); R1 = F(); R2 = F(); R3 = F(); PH = F(); FX = F(); FD = F(); TH = F();
    FOX = F(); FOY = F(); HX = F(); HH = F(); STX = F(); STY = F(); SZ = F(); AL = F(); BIRD = F(); SS = F();
    FL = new Uint8Array(N); HL = new Uint8Array(N); COL = new Uint8Array(N);
    const r = rng(42);
    for (const f of [spiral, sprig, bird]) {
      const sx = F(), sy = F();
      for (let i = 0; i < N; i++) { const p = f(r); sx[i] = p[0]; sy[i] = p[1]; }
      shapes.push({ x: sx, y: sy });
    }
    for (let i = 0; i < N; i++) {
      R1[i] = r(); R2[i] = r(); R3[i] = r(); PH[i] = r() * TAU;
      FX[i] = r(); FD[i] = 0.008 + r() * 0.07; FL[i] = r() < 0.45 ? 1 : 2;
      TH[i] = 0.035 + Math.pow(r(), 0.8) * 0.105;
      FOX[i] = r() + r() + r() - 1.5; FOY[i] = r() + r() + r() - 1.5;
      HX[i] = r(); HL[i] = 1 + ((r() * 4) | 0); HH[i] = 0.01 + r() * r() * 0.16;
      STX[i] = r(); STY[i] = Math.pow(r(), 1.3);
      SS[i] = 0.16 + Math.pow(r(), 4) * 0.6;
      const q = r();
      COL[i] = q < 0.4 ? 0 : q < 0.6 ? 1 : q < 0.75 ? 2 : q < 0.92 ? 3 : 4;
      X[i] = FX[i] * W; Y[i] = H * (0.8 + FD[i]);
    }
    COL[0] = 3;
    for (const c of GLOW) sprites.push(makeSprite(c));
  };

  motes.impulse = function (x, y) {
    const R = Math.min(W, H) * 0.3;
    for (let i = 0; i < N; i++) {
      const dx = X[i] - x, dy = Y[i] - y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      if (d < R) { const f = Math.pow(1 - d / R, 1.5) * 9; VX[i] += (dx / d) * f; VY[i] += (dy / d) * f; }
    }
  };

  // which figure, 0..2, continuous
  function morphAt(p) {
    return ss(0.222, 0.248, p) + ss(0.292, 0.318, p);
  }

  motes.update = function (S) {
    const p = S.p, t = S.t, m0 = Math.min(W, H);
    const f = Math.min(S.dt * 60, 2.5), damp = Math.pow(0.88, f);
    const pa = S.pActive, px = S.px, py = S.py;
    const wins = scene.windows, nW = wins.length;
    const portrait = W < H * 0.8;
    const seaGate = p < 0.6;

    // the flock's heart (also read by the garden)
    const fcy = lerp(0.3, 0.43, ss(0.5, 0.6, p));
    const heart = (tt, out) => {
      let cx = W * (0.5 + 0.3 * Math.sin(tt * 0.21) + 0.08 * Math.sin(tt * 0.47 + 2));
      let cy = H * (fcy + 0.1 * Math.sin(tt * 0.33 + 1) + 0.04 * Math.sin(tt * 0.71));
      out[0] = lerp(cx, px, 0.5 * pa); out[1] = lerp(cy, py, 0.5 * pa);
    };
    const hc = [0, 0];
    heart(t, hc);
    const flocking = ss(0.4, 0.46, p) * (1 - ss(0.7, 0.76, p));
    S.flockX = flocking > 0.5 ? hc[0] : -1e5; S.flockY = hc[1];

    // figure placement
    const shC = [W * 0.5 + (px - W * 0.5) * 0.12 * pa, H * 0.47 + (py - H * 0.5) * 0.12 * pa];
    const shScale = m0 * 0.41 * (1 + 0.03 * Math.sin(t * 0.7));
    // the same figures, kept as constellations
    const cC = portrait ? [[0.3, 0.14], [0.7, 0.33], [0.34, 0.53]] : [[0.2, 0.31], [0.5, 0.24], [0.8, 0.32]];
    const cScale = m0 * (portrait ? 0.15 : 0.145);
    const repelR = m0 * 0.13;
    for (const w of wins) w.target = 0;

    for (let i = 0; i < N; i++) {
      const r1 = R1[i], r2 = R2[i], r3 = R3[i], ph = PH[i];
      const isWin = i > 0 && i <= nW;
      const wB = ss(TH[i], TH[i] + 0.04, p);
      const wC = ss(0.365 + r1 * 0.04, 0.405 + r1 * 0.04, p);
      const wD = ss(0.7 + r2 * 0.05, 0.76 + r2 * 0.05, p);
      const wE = isWin ? 0 : ss(0.85 + r3 * 0.05, 0.915 + r3 * 0.05, p);

      let tx = 0, ty = 0, al = 0.1, sz = 0.55, k = 0.012;

      if (wB < 1) {
        tx = FX[i] * W; ty = scene.duneY(FL[i], tx, S) + FD[i] * H;
        al = 0.1 + 0.08 * Math.sin(t * 0.8 + ph);
        if (pa > 0.01) { // the first stirring: leaning toward whoever is near
          const dx = tx - px, dy = ty - py, d = Math.sqrt(dx * dx + dy * dy), R = m0 * 0.22;
          if (d < R) { const q = (1 - d / R) * pa; ty -= q * 46; al += q * 0.8; sz += q * 0.4; }
        }
      }
      if (wB > 0 && wC < 1) {
        const m = morphAt(p + (r1 - 0.5) * 0.014);
        const ka = Math.min(1, m | 0), fr = ss(0, 1, m - ka), kb = Math.min(2, ka + 1);
        let sx = lerp(shapes[ka].x[i], shapes[kb].x[i], fr), sy = lerp(shapes[ka].y[i], shapes[kb].y[i], fr);
        const asBird = ss(1.2, 2, m);
        if (asBird > 0) sy *= 1 + (0.16 * Math.sin(t * 1.9) - 0.08) * asBird;
        const ang = (1 - ss(0, 1, m)) * (Math.sin(t * 0.13) * 1.1 + t * 0.02) - (0.95 + 0.08 * Math.sin(t * 0.5)) * asBird, ca = Math.cos(ang), sa = Math.sin(ang);
        const wob = 7 + 40 * (1 - wB);
        const qx = shC[0] + (sx * ca - sy * sa) * shScale + Math.sin(t * 0.9 + ph) * wob;
        const qy = shC[1] + (sx * sa + sy * ca) * shScale + Math.cos(t * 0.7 + ph * 1.3) * wob;
        tx = lerp(tx, qx, wB); ty = lerp(ty, qy, wB);
        al = lerp(al, 0.5 + r2 * 0.4, wB); sz = lerp(sz, 0.4 + r3 * r3 * 0.75, wB);
      }
      if (wC > 0 && wD < 1) {
        const tt = t - r2 * 1.7;
        heart(tt, hc);
        const ang = Math.sin(tt * 0.17) * 0.7, ca = Math.cos(ang), sa = Math.sin(ang);
        const spread = 1 + 0.28 * Math.sin(tt * 0.4);
        const ox = FOX[i] * Math.max(W * 0.2, H * 0.15) * spread;
        const oy = (FOY[i] * H * 0.085 + Math.sin(FOX[i] * 2.6 + tt * 1.1) * H * 0.06) * spread;
        const qx = hc[0] + ox * ca - oy * sa, qy = hc[1] + ox * sa + oy * ca;
        if (wC < 1) { tx = lerp(tx, qx, wC); ty = lerp(ty, qy, wC); } else { tx = qx; ty = qy; }
        al = lerp(al, 0.9, wC); sz = lerp(sz, 0.7 + r3 * 0.5, wC); k = lerp(k, 0.02, wC);
      }
      if (wD > 0 && wE < 1) {
        let qx, qy, qa, qs;
        let lit = 0;
        if (isWin) {
          const w = wins[i - 1];
          lit = p > 0.9 || ((t / w.period + w.phase) % 1) < w.duty ? 1 : 0;
          if (lit) { qx = w.x + Math.sin(t * 0.8 + ph) * w.w * 0.18; qy = w.y + Math.cos(t * 1.1 + ph) * w.h * 0.15; qa = 0.75; qs = 0.5; }
          const dx = X[i] - w.x, dy = Y[i] - w.y;
          w.target = lit && dx * dx + dy * dy < w.w * w.w * 4 ? wD : 0;
        }
        if (!lit) { // a small lantern over the garden
          const hx = ((HX[i] + Math.sin(t * 0.05 + ph) * 0.03) % 1) * W;
          qx = hx + Math.sin(t * 0.4 + ph) * 30 + Math.sin(t * 0.93 + ph * 2) * 12;
          qy = scene.ridgeY(HL[i], hx, S) - HH[i] * H + Math.cos(t * 0.5 + ph) * 16;
          const bl = Math.max(0, Math.sin(t * (0.35 + r1 * 0.5) + ph));
          qa = (r3 < 0.35 ? 0.1 : 0.03) + 0.9 * Math.pow(bl, 6); qs = 0.32 + r3 * 0.4;
        }
        tx = lerp(tx, qx, wD); ty = lerp(ty, qy, wD);
        al = lerp(al, qa, wD); sz = lerp(sz, qs, wD); k = lerp(k, 0.014, wD);
      }
      if (wE > 0) {
        let qx, qy, qa, qs;
        if (i % 4 === 0) {
          const kk = (i / 4) % 3, c = cC[kk];
          qx = c[0] * W + shapes[kk].x[i] * cScale; qy = c[1] * H + shapes[kk].y[i] * cScale;
          qa = 0.8 + 0.2 * Math.sin(t * (0.7 + r1) + ph); qs = 0.5 + r3 * 0.35;
        } else {
          qx = STX[i] * W; qy = STY[i] * H * 0.74 + H * 0.02;
          qa = 0.5 + 0.5 * Math.sin(t * (0.6 + r1 * 2.2) + ph); qs = SS[i];
        }
        tx = lerp(tx, qx, wE); ty = lerp(ty, qy, wE);
        al = lerp(al, qa, wE); sz = lerp(sz, qs, wE); k = lerp(k, 0.01, wE);
      }

      // courtesy: give the visitor room
      if (pa > 0.01 && wB > 0.5 && i > 0) {
        const dx = tx - px, dy = ty - py, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (d < repelR) { const q = Math.pow(1 - d / repelR, 2) * repelR * 0.7 * pa * (1 - wE * 0.7); tx += (dx / d) * q; ty += (dy / d) * q; }
      }
      // one stays close, always
      if (i === 0) {
        const near = pa * ss(0.01, 0.06, p + 0.05);
        tx = lerp(tx, px + Math.cos(t * 1.1) * 30, near); ty = lerp(ty, py + Math.sin(t * 1.1) * 30, near);
        al = Math.max(al, 0.95 * Math.max(near, wB)); sz = Math.max(sz, 1.5); k = lerp(k, 0.05, near);
      }

      VX[i] = (VX[i] + (tx - X[i]) * k * f) * damp;
      VY[i] = (VY[i] + (ty - Y[i]) * k * f) * damp;
      X[i] += VX[i] * f; Y[i] += VY[i] * f;
      AL[i] = al; SZ[i] = sz;
      const above = seaGate ? ss(S.surfaceY + 12, S.surfaceY - 30, Y[i]) : 1;
      BIRD[i] += (S.dayness * above * wC - BIRD[i]) * Math.min(1, 0.12 * f);
    }
    for (const w of wins) w.glow += (w.target - w.glow) * Math.min(1, 0.03 * f);
  };

  motes.draw = function (ctx, S) {
    const unit = Math.min(W, H) * 0.03 + 6, t = S.t;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const a = AL[i] * (1 - BIRD[i]);
      if (a < 0.015) continue;
      const d = unit * SZ[i];
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(sprites[COL[i]], X[i] - d / 2, Y[i] - d / 2, d, d);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (S.dayness < 0.02) return;

    // wings
    const ink = V.css(V.mixc([43, 47, 94], [52, 64, 107], ss(0.44, 0.57, S.p)));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const sc = H / 900;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#c9603f' : ink;
      ctx.lineWidth = 1.5 * Math.max(0.8, sc);
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const b = BIRD[i];
        if (b < 0.06 || (i % 9 === 0) !== !!pass) continue;
        const s = (3 + SZ[i] * 3.6) * Math.max(0.75, sc) * (i ? 1 : 1.5) * (0.4 + 0.6 * b);
        const fl = t * (7 + R3[i] * 4) + PH[i], span = 0.72 + 0.28 * Math.cos(fl), lift = Math.sin(fl) * 0.6;
        const bank = clamp(Math.atan2(VY[i], Math.abs(VX[i]) + 2) * 0.5, -0.4, 0.4) * (VX[i] < 0 ? -1 : 1);
        const cb = Math.cos(bank), sb = Math.sin(bank), x = X[i], y = Y[i];
        const lx = s * span, ly = -s * lift, mx = lx * 0.5, my = ly * 0.5 - s * 0.42;
        ctx.moveTo(x - lx * cb - ly * sb, y - lx * sb + ly * cb);
        ctx.quadraticCurveTo(x - mx * cb - my * sb, y - mx * sb + my * cb, x, y);
        ctx.quadraticCurveTo(x + mx * cb - my * sb, y + mx * sb + my * cb, x + lx * cb - ly * sb, y + lx * sb + ly * cb);
      }
      ctx.stroke();
    }
  };
})();
