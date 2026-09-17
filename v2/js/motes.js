// The one who is many: embers asleep in sediment -> a curious shoal -> birds -> lamplight -> stars.
// Every light always knows where it wants to be (a pure function of the journey and the clock) and springs toward it,
// so the whole thing survives any scroll jump, resize or interruption.
(function () {
  'use strict';
  const V = window.V;
  const { clamp, lerp, ss, rng, TAU } = V;
  const world = V.world, land = V.land;

  const motes = (V.motes = {});
  let N = 0, W = 1, H = 1;
  let X, Y, VX, VY, R1, R2, R3, PH, FXN, FYB, FSC, FD, TH, S0X, S0Y, SA, SLX, SLY, S2X, S2Y, FOX, FOY, HX, HH, STX, STY, SS, CX, CY, TT, TPX, TPY, SZ, AL, BIRD;
  let FJ, HL, COL, CK, PLACED;
  const sprites = [];
  const GLOW = ['#ffcf7a', '#ff9d7a', '#f7b0c4', '#fff0c0', '#a8f0e0'];
  let nextStar = 1, compAngle = 0, prevHX = 0, prevHY = 0, heading = 0;

  // ---------------------------------------------------------------- figures the shoal tries on
  function spiral(r) { // two arms: a shell, a storm, a galaxy
    const rad = 0.07 + Math.sqrt(r()) * 0.93, th = Math.log(rad / 0.07) / 0.3 + (r() < 0.5 ? Math.PI : 0);
    const rr = rad + (r() + r() + r() - 1.5) * 0.2 * rad;
    return [Math.cos(th) * rr, Math.sin(th) * rr];
  }
  const stem = (a) => [-0.12 + 0.3 * a + 0.22 * Math.sin(a * 2.2), 1 - 2 * a];
  function sprig(r) { // kept as (place on the stem, reach of the leaflet) so that it can grow
    if (r() < 0.16) return [r(), (r() - 0.5) * 0.03, 0];
    const pairs = 8, k = (r() * pairs) | 0, side = r() < 0.5 ? -1 : 1;
    const a = 0.12 + (k / pairs) * 0.86, base = stem(a), nxt = stem(a + 0.01);
    const ang = Math.atan2(nxt[1] - base[1], nxt[0] - base[0]) + side * 0.95;
    const L = 0.62 * (1 - (k / pairs) * 0.82);
    const s = r(), wdt = 0.15 * L * Math.sin(Math.PI * Math.pow(s, 0.8)), o = (r() * 2 - 1) * wdt;
    return [a, Math.cos(ang) * s * L - Math.sin(ang) * o, Math.sin(ang) * s * L + Math.cos(ang) * o];
  }
  function swallow(r) { // from above, nose toward +x
    const q = r();
    if (q < 0.2) { const a = r() * TAU, m = Math.sqrt(r()); return [0.05 + Math.cos(a) * 0.4 * m, Math.sin(a) * 0.075 * m]; }
    if (q < 0.27) { const a = r() * TAU, m = Math.sqrt(r()); return [0.43 + Math.cos(a) * 0.1 * m, Math.sin(a) * 0.09 * m]; }
    if (q < 0.4) { const s = r(), side = r() < 0.5 ? -1 : 1; return [-0.3 - s * 0.62, side * (0.02 + s * 0.2) + (r() - 0.5) * 0.05 * (1 - s)]; }
    const side = q < 0.7 ? -1 : 1, a = Math.pow(r(), 0.85), b = 1 - a;
    const x = b * b * 0.2 + 2 * a * b * 0.28 + a * a * -0.5, y = b * b * 0.04 + 2 * a * b * 0.62 + a * a * 1.02;
    return [x - r() * (0.36 * Math.pow(1 - a, 1.2) + 0.015), side * y];
  }
  // the same three, drawn sparely, for keeping in the sky
  const constel = [
    (u) => { const arm = u < 0.5 ? 0 : 1, v = (u * 2) % 1, rad = 0.12 + 0.88 * v, th = Math.log(rad / 0.07) / 0.3 + arm * Math.PI; return [Math.cos(th) * rad, Math.sin(th) * rad]; },
    (u) => {
      if (u < 0.24) return stem(u / 0.24);
      const v = (u - 0.24) / 0.76, leaf = Math.min(15, (v * 16) | 0), s = [0.4, 0.72, 1][Math.min(2, (((v * 16) % 1) * 3) | 0)];
      const k = leaf >> 1, side = leaf & 1 ? 1 : -1, a = 0.12 + (k / 8) * 0.86, base = stem(a), nxt = stem(a + 0.01);
      const ang = Math.atan2(nxt[1] - base[1], nxt[0] - base[0]) + side * 0.95, L = 0.62 * (1 - (k / 8) * 0.82);
      return [base[0] + Math.cos(ang) * s * L, base[1] + Math.sin(ang) * s * L];
    },
    (u) => { // the swallow, in outline: two crescent wings, a head, a forked tail
      const q = (p0, p1, p2, a) => { const b = 1 - a; return [b * b * p0[0] + 2 * a * b * p1[0] + a * a * p2[0], b * b * p0[1] + 2 * a * b * p1[1] + a * a * p2[1]]; };
      const pieces = [
        [14, (a) => q([0.22, 0.05], [0.3, 0.6], [-0.5, 1], a), 1],
        [10, (a) => q([-0.5, 1], [-0.02, 0.5], [-0.16, 0.06], a), 1],
        [6, (a) => q([-0.3, 0.045], [-0.6, 0.08], [-0.95, 0.24], a), 1],
        [4, (a) => q([-0.95, 0.24], [-0.62, 0.06], [-0.52, 0], a), 1],
        [7, (a) => { const g = (a - 0.5) * Math.PI * 1.1; return [0.4 + Math.cos(g) * 0.13, Math.sin(g) * 0.075]; }, 0],
      ];
      let v = u * 75, x = 0, y = 0;
      outer: for (const [w, fn, mirrored] of pieces) for (const side of mirrored ? [1, -1] : [1]) {
        if (v < w) { const pt = fn(v / w); x = pt[0]; y = pt[1] * side; break outer; }
        v -= w;
      }
      const c = Math.cos(-0.95), s2 = Math.sin(-0.95);
      return [x * c - y * s2, x * s2 + y * c];
    },
  ];

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
    if (first) {
      N = W < 700 ? 460 : W * H > 1.2e6 ? 950 : 720;
      const F = () => new Float32Array(N);
      [X, Y, VX, VY, R1, R2, R3, PH, FXN, FYB, FSC, FD, TH, S0X, S0Y, SA, SLX, SLY, S2X, S2Y, FOX, FOY, HX, HH, STX, STY, SS, CX, CY, TT, TPX, TPY, SZ, AL, BIRD] = Array.from({ length: 35 }, F);
      FJ = new Uint8Array(N); HL = new Uint8Array(N); COL = new Uint8Array(N); CK = new Int8Array(N); PLACED = new Uint8Array(N);
      const r = rng(42);
      for (let i = 0; i < N; i++) { const a = spiral(r), b = sprig(r), c = swallow(r); S0X[i] = a[0]; S0Y[i] = a[1]; SA[i] = b[0]; SLX[i] = b[1]; SLY[i] = b[2]; S2X[i] = c[0]; S2Y[i] = c[1]; }
      const every = N < 600 ? 3 : 4, count = [0, 0, 0], seen = [0, 0, 0];
      for (let i = 0; i < N; i++) { CK[i] = i % every === 0 && i ? ((i / every) | 0) % 3 : -1; if (CK[i] >= 0) count[CK[i]]++; }
      for (let i = 0; i < N; i++) {
        R1[i] = r(); R2[i] = r(); R3[i] = r(); PH[i] = r() * TAU;
        FJ[i] = (r() * world.NF) | 0; FXN[i] = r(); FD[i] = 0.004 + r() * 0.07;
        FSC[i] = world.floorScale(FJ[i]);
        TH[i] = 0.008 + 0.09 * (0.65 * (1 - FSC[i]) + 0.35 * r()); // the near ones wake first (at the visitor's first touch of the scroll); the far ones stream in after
        FOX[i] = r() + r() + r() - 1.5; FOY[i] = r() + r() + r() - 1.5;
        HX[i] = r(); HL[i] = 2 + ((r() * 3) | 0); HH[i] = 0.01 + r() * r() * 0.16;
        STX[i] = r(); STY[i] = 0.02 + Math.pow(r(), 1.3) * 0.72;
        SS[i] = 0.16 + Math.pow(r(), 4) * 0.6;
        if (CK[i] >= 0) { const c = constel[CK[i]]((seen[CK[i]]++ + 0.5) / count[CK[i]]); CX[i] = c[0]; CY[i] = c[1]; }
        const q = r();
        COL[i] = q < 0.4 ? 0 : q < 0.6 ? 1 : q < 0.75 ? 2 : q < 0.92 ? 3 : 4;
      }
      COL[0] = 3;
      for (const c of GLOW) sprites.push(makeSprite(c));
    }
    for (let i = 0; i < N; i++) {
      FYB[i] = world.floorBase(FJ[i], FXN[i] * W) + FD[i] * H * FSC[i];
      if (first) { X[i] = FXN[i] * W; Y[i] = FYB[i]; }
    }
  };

  // a touch in open water or open sky: everyone nearby startles, then comes back
  motes.impulse = function (x, y) {
    const R = Math.min(W, H) * 0.3;
    for (let i = 1; i < N; i++) {
      const dx = X[i] - x, dy = Y[i] - y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      if (d < R) { const f = Math.pow(1 - d / R, 1.5) * 9; VX[i] += (dx / d) * f; VY[i] += (dy / d) * f; }
    }
  };

  // the visitor planted something: a few come down to tend it while it grows
  motes.tend = function (x, y, S) {
    let sent = 0;
    for (let tries = 0; tries < 200 && sent < 14; tries++) {
      const i = 1 + ((Math.random() * (N - 1)) | 0);
      if (i <= land.windows.length || TT[i] > S.t) continue;
      TT[i] = S.t + 4 + Math.random() * 1.5; TPX[i] = x; TPY[i] = y;
      sent++;
    }
  };

  // the visitor touched the night sky: one light goes there, and stays
  motes.placeStar = function (x, y, S) {
    for (let tries = 0; tries < N; tries++) {
      const i = nextStar; nextStar = 1 + (nextStar % (N - 1));
      if (CK[i] >= 0 || i <= land.windows.length || PLACED[i]) continue;
      const dx = x - S.pivotX, dy = y - S.pivotY, c = Math.cos(-S.skyRot), s = Math.sin(-S.skyRot);
      STX[i] = (S.pivotX + dx * c - dy * s) / W; STY[i] = (S.pivotY + dx * s + dy * c) / H;
      PLACED[i] = 1;
      return;
    }
  };

  motes.update = function (S) {
    const p = S.p, t = S.t, m0 = Math.min(W, H);
    const f = Math.min(S.dt * 60, 2.5), damp = Math.pow(0.88, f);
    const pa = S.pActive, px = S.px, py = S.py, still = S.still;
    const wins = land.windows, nW = wins.length;
    const portrait = W < H * 0.8;
    const seaGate = p < 0.46; // while surfacing, a light becomes a bird only once it is out of the water

    // ---- the flock's heart: roams the dawn sea, sweeps the land (the scroll carries it), then circles the town
    const wSweep = ss(0.49, 0.53, p) * (1 - ss(0.665, 0.69, p)), wCircle = ss(0.665, 0.69, p), wSea = 1 - wSweep - wCircle;
    const sweepU = clamp((p - 0.518) / 0.15);
    const heart = (tt, out) => {
      const x = wSea * W * (0.5 + 0.3 * Math.sin(tt * 0.21) + 0.08 * Math.sin(tt * 0.47 + 2))
        + wSweep * W * (-0.04 + 1.08 * sweepU + 0.05 * Math.sin(tt * 0.5))
        + wCircle * W * (0.5 + 0.22 * Math.sin(tt * 0.33));
      const y = wSea * H * (0.3 + 0.1 * Math.sin(tt * 0.33 + 1) + 0.04 * Math.sin(tt * 0.71))
        + wSweep * H * (0.57 + 0.085 * Math.sin(sweepU * 9 + tt * 0.35))
        + wCircle * H * (0.36 + 0.09 * Math.cos(tt * 0.41));
      out[0] = lerp(x, px, 0.22 * pa); out[1] = lerp(y, py, 0.22 * pa);
    };
    const hc = [0, 0];
    heart(t, hc);
    const hvx = (hc[0] - prevHX) / Math.max(f, 0.2), hvy = (hc[1] - prevHY) / Math.max(f, 0.2);
    prevHX = hc[0]; prevHY = hc[1];
    const hsp = Math.sqrt(hvx * hvx + hvy * hvy);
    if (hsp > 0.05) heading += (Math.atan2(hvy, Math.abs(hvx)) * (hvx < 0 ? -1 : 1) * 0.6 - heading) * Math.min(1, 0.03 * f);
    const stretch = 1 + Math.min(0.6, hsp * 0.12);
    const hca = Math.cos(heading), hsa = Math.sin(heading);

    // ---- the shoal's figures
    const shCx = W * 0.5 + (px - W * 0.5) * 0.12 * pa, shCy = H * 0.47 + (py - H * 0.5) * 0.12 * pa;
    const shScale = m0 * 0.41 * (1 + 0.03 * Math.sin(t * 0.7));
    const grow = ss(0.232, 0.282, p);
    const spin = t * 0.06 + Math.sin(t * 0.13) * 0.5, sc0 = Math.cos(spin), ss0 = Math.sin(spin);
    const flapA = -0.95 + 0.07 * Math.sin(t * 0.5), bc = Math.cos(flapA), bs = Math.sin(flapA), flap = 1 + 0.16 * Math.sin(t * 1.9) - 0.08;
    const fly = ss(0.345, 0.405, p), flyX = Math.cos(-0.95) * fly * H * 0.36, flyY = Math.sin(-0.95) * fly * H * 0.36;
    // while it is still only a shoal, it swims: a long loose ribbon, exploring
    const scx = lerp(W * 0.5, px, 0.4 * pa), scy = lerp(H * 0.44, py, 0.4 * pa), sAx = Math.min(W * 0.3, H * 0.55), sAy = H * 0.17;

    // ---- the night sky turns, slowly
    const rc = Math.cos(S.skyRot), rs = Math.sin(S.skyRot);
    const cC = portrait ? [[0.3, 0.13], [0.7, 0.31], [0.34, 0.5]] : [[0.2, 0.3], [0.5, 0.23], [0.8, 0.31]];
    const cScale = m0 * 0.15;
    const repelR = m0 * (0.13 + 0.13 * S.rush);
    for (const w of wins) w.target = 0;
    const spinBoost = 5 * Math.exp(-(t - (S.clickT || -99)) * 2.2);
    compAngle += (1.1 + spinBoost) * S.dt;

    for (let i = 0; i < N; i++) {
      const r1 = R1[i], r2 = R2[i], r3 = R3[i], ph = PH[i];
      const isWin = i > 0 && i <= nW, isAtt = !isWin && i % 11 === 3;
      const pj = p + (r1 - 0.5) * 0.014;
      const wB = ss(TH[i], TH[i] + 0.045, p);
      const wC = ss(0.365 + r1 * 0.04, 0.405 + r1 * 0.04, p);
      const wD = ss(0.705 + r2 * 0.05, 0.765 + r2 * 0.05, p);
      // (a light that is visiting stays until its window sleeps, then follows the others up; the night owls keep theirs)
      const wE = isWin ? (wins[i - 1].owl ? 0 : ss(wins[i - 1].sleep, wins[i - 1].sleep + 0.05, p)) : ss(0.855 + r3 * 0.05, 0.92 + r3 * 0.05, p);

      let tx = 0, ty = 0, al = 0.1, sz = 0.5, k = 0.012;

      if (wB < 1) { // asleep in the sediment, breathing
        const sc = FSC[i];
        tx = FXN[i] * W; ty = FYB[i] + world.floorShift(FJ[i], S);
        al = (0.3 + 0.25 * sc) * (0.62 + 0.38 * Math.sin(t * 0.45 - tx * 0.0035 - FJ[i] * 0.8)) * (0.75 + 0.25 * Math.sin(t * (0.6 + r1) + ph));
        sz = 0.2 + 0.42 * sc;
        if (pa > 0.01) { // the first stirring: leaning toward whoever is near
          const dx = tx - px, dy = ty - py, d = Math.sqrt(dx * dx + dy * dy), R = m0 * 0.22;
          if (d < R) { const q = (1 - d / R) * pa; ty -= q * 46 * sc; al += q * 0.8; sz += q * 0.4; }
        }
      }
      if (wB > 0 && wC < 1) {
        const school = 1 - ss(0.15, 0.185, pj);
        let qx = 0, qy = 0, glint = 0, taper = 1;
        if (school < 1) {
          const m1 = ss(0.212, 0.238, pj), m2 = ss(0.29, 0.315, pj);
          // spiral, turning
          let sx = S0X[i] * sc0 - S0Y[i] * ss0, sy = S0X[i] * ss0 + S0Y[i] * sc0;
          if (m1 > 0) { // loosens into drifting dust; then a sprig grows up through the dust, gathering it
            const a = SA[i], front = a * 0.8, join = ss(front - 0.06, front + 0.12, grow), leaf = ss(front, front + 0.28, grow), st = stem(a);
            const da = ph + t * 0.12 * (i & 1 ? 1 : -1), dr = 0.25 + 0.5 * r3;
            const cx = Math.cos(da) * dr * 0.9 + FOX[i] * 0.12, cy = Math.sin(da) * dr * 0.75 + FOY[i] * 0.12 + 0.05;
            sx = lerp(sx, lerp(cx, st[0] + SLX[i] * leaf, join), m1); sy = lerp(sy, lerp(cy, st[1] + SLY[i] * leaf, join), m1);
            glint = Math.sin(Math.PI * join) * m1 * (1 - m2);
          }
          if (m2 > 0) { // and the leaves lift off as a bird
            const bx = S2X[i], by = S2Y[i] * flap;
            sx = lerp(sx, bx * bc - by * bs, m2); sy = lerp(sy, bx * bs + by * bc, m2);
          }
          const swirl = (Math.sin(Math.PI * m1) + Math.sin(Math.PI * m2)) * (i & 1 ? 0.8 : -0.8);
          if (swirl) { const c = Math.cos(swirl), s = Math.sin(swirl), ox = sx; sx = ox * c - sy * s; sy = ox * s + sy * c; } // nobody travels in a straight line
          qx = shCx + sx * shScale + flyX + Math.sin(t * 0.9 + ph) * 7;
          qy = shCy + sy * shScale + flyY + Math.cos(t * 0.7 + ph * 1.3) * 7;
        }
        if (school > 0) {
          const lag = r2 * 2.4, u = t * 0.5 - lag * 1.45;
          const a2 = 1.7 * u + 1, bob = 1 + 0.25 * Math.sin(t * 0.11);
          const cx = scx + sAx * (Math.cos(u) + 0.22 * Math.cos(a2)), cy = scy + sAy * bob * (Math.sin(u) + 0.22 * Math.sin(a2));
          let dx = -sAx * (Math.sin(u) + 0.374 * Math.sin(a2)), dy = sAy * bob * (Math.cos(u) + 0.374 * Math.cos(a2));
          const dl = Math.sqrt(dx * dx + dy * dy) + 0.001; dx /= dl; dy /= dl;
          // full in the shoulders, tapering to a tail
          const body = 0.25 + Math.pow(Math.sin(Math.PI * Math.pow(1 - lag / 2.4, 1.6)), 0.8);
          taper = lerp(1, 0.3 + 0.56 * body, school); // where the ribbon narrows it also thins out, instead of burning white
          // a dense core with strays, and a slow wave running down its length, like a ribbon in a current
          const wide = m0 * (i % 5 ? 0.036 : 0.1) * body * FOY[i] + Math.sin(lag * 2.6 - t * 1.8) * m0 * 0.028 * (0.4 + lag / 2.4) + Math.sin(t * 1.3 + ph) * 5;
          const zx = cx - dy * wide + Math.cos(ph) * 8 + dx * FOX[i] * m0 * 0.02, zy = cy + dx * wide + Math.sin(ph * 1.7) * 8 + dy * FOX[i] * m0 * 0.02;
          qx = lerp(qx, zx, school); qy = lerp(qy, zy, school);
        }
        tx = lerp(tx, qx, wB); ty = lerp(ty, qy, wB);
        const held = 1 - 0.45 * school; // quieter while only swimming; brightest at the moment of joining a figure
        al = lerp(al, Math.min(1, (0.5 + r2 * 0.4) * held * taper + glint * 0.3), wB); sz = lerp(sz, (0.4 + r3 * r3 * 0.75) * (1 - 0.25 * school + glint * 0.35), wB);
        k = lerp(k, 0.016, school * wB);
      }
      if (wC > 0 && wD < 1) {
        const tt = t - r2 * 1.7;
        heart(tt, hc);
        const spread = (1 + 0.28 * Math.sin(tt * 0.4)) * lerp(1, 0.8, wSweep);
        // a flock is a sheet that keeps twisting: where we see it edge-on it darkens to a band, face-on it thins to lace.
        // that, and the waves of closeness running down its length, are most of what makes it look alive
        const a = FOX[i] + 0.27 * Math.sin(2.6 * FOX[i] - 1.9 * tt + 1.3 * FOY[i]);
        const twist = 1.35 * Math.sin(1.3 * FOX[i] - 0.9 * tt) + 0.75 * Math.sin(0.7 * FOX[i] + 0.53 * tt + 1);
        const Sx = Math.max(W * 0.2, H * 0.15) * spread;
        const ox = a * Sx * stretch + FOY[i] * Math.sin(twist) * Sx * 0.2;
        const oy = (FOY[i] * Math.cos(twist) * H * 0.1 + Math.sin(FOX[i] * 2.6 + tt * 1.1) * H * 0.055) * spread;
        const qx = hc[0] + ox * hca - oy * hsa, qy = hc[1] + ox * hsa + oy * hca;
        if (wC < 1) { tx = lerp(tx, qx, wC); ty = lerp(ty, qy, wC); } else { tx = qx; ty = qy; }
        al = lerp(al, lerp(0.9, 0.5, ss(0.69, 0.74, p)), wC); sz = lerp(sz, lerp(0.7 + r3 * 0.5, 0.45, ss(0.69, 0.74, p)), wC); k = lerp(k, 0.02, wC);
      }
      if (wD > 0 && wE < 1) {
        let qx, qy, qa, qs, visiting = 0;
        if (isWin) {
          const w = wins[i - 1];
          // each window has its own moment in the evening; visits end, and begin again; late at night the town sleeps, except where someone can't
          visiting = p > w.thr && (w.owl ? p > 0.9 || (t / w.period + w.phase) % 1 < w.duty : p < w.sleep && (t / w.period + w.phase) % 1 < w.duty) ? 1 : 0;
          if (visiting) {
            const talk = land.talk(w, t)[1];
            qx = w.x + Math.sin(t * 0.8 + ph) * w.w * 0.18; qy = w.y + Math.cos(t * 1.1 + ph) * w.h * 0.15;
            qa = 0.45 + 0.5 * talk; qs = 0.42 + 0.2 * talk;
            const dx = X[i] - w.x, dy = Y[i] - w.y;
            if (dx * dx + dy * dy < w.w * w.w * 4) w.target = wD;
          }
        }
        if (!visiting) { // a small lantern over the garden
          const hx = ((HX[i] + Math.sin(t * 0.05 + ph) * 0.03 + 1) % 1) * W;
          qx = hx + Math.sin(t * 0.4 + ph) * 30 + Math.sin(t * 0.93 + ph * 2) * 12;
          qy = world.ridgeY(HL[i], hx, S) - HH[i] * H + Math.cos(t * 0.5 + ph) * 16;
          const bl = Math.max(0, Math.sin(t * (0.35 + r1 * 0.5) + ph));
          qa = (r3 < 0.45 ? 0.2 : 0.07) + 0.8 * Math.pow(bl, 3); qs = 0.36 + r3 * 0.45;
        }
        tx = lerp(tx, qx, wD); ty = lerp(ty, qy, wD);
        al = lerp(al, qa, wD); sz = lerp(sz, qs, wD); k = lerp(k, 0.014, wD);
      }
      if (wE > 0) {
        let qx, qy, qa, qs;
        if (CK[i] >= 0) {
          const c = cC[CK[i]];
          qx = c[0] * W + CX[i] * cScale; qy = c[1] * H + CY[i] * cScale;
          qa = 0.8 + 0.2 * Math.sin(t * (0.7 + r1) + ph); qs = 0.5 + r3 * 0.3;
        } else {
          qx = STX[i] * W; qy = STY[i] * H;
          if (PLACED[i]) { qa = 0.9 + 0.1 * Math.sin(t * 1.3 + ph); qs = 0.95; }
          else { qa = 0.5 + 0.5 * Math.sin(t * (0.6 + r1 * 2.2) + ph); qs = SS[i]; }
        }
        const dx = qx - S.pivotX, dy = qy - S.pivotY;
        qx = S.pivotX + dx * rc - dy * rs; qy = S.pivotY + dx * rs + dy * rc;
        tx = lerp(tx, qx, wE); ty = lerp(ty, qy, wE);
        al = lerp(al, qa, wE); sz = lerp(sz, qs, wE); k = lerp(k, PLACED[i] ? 0.03 : 0.01, wE);
      }

      let free = 1;
      if (TT[i] > t && wB > 0.5) { // tending what the visitor planted
        const q = ss(0, 0.6, TT[i] - t), ang = ph + t * (2 + r1 * 1.4) * (i & 1 ? 1 : -1), rad = m0 * (0.02 + 0.04 * r3);
        tx = lerp(tx, TPX[i] + Math.cos(ang) * rad, q); ty = lerp(ty, TPY[i] + Math.sin(ang) * rad * 0.55 - m0 * 0.012, q);
        k = lerp(k, 0.05, q); free = 0;
      } else if (isAtt && still > 0.01 && wB > 0.5 && CK[i] < 0 && !PLACED[i]) { // when the visitor is still, some gather round to listen - even from the sky
        const q = still, ang = ph + t * (0.5 + 0.3 * r1) * (i & 1 ? 1 : -1), rad = m0 * (0.075 + 0.055 * r3);
        tx = lerp(tx, px + Math.cos(ang) * rad, q); ty = lerp(ty, py + Math.sin(ang) * rad * 0.8, q);
        al = Math.max(al, 0.7 * q); k = lerp(k, 0.03, q); free = 0;
      }
      // courtesy: everyone else gives the visitor room
      if (free && pa > 0.01 && wB > 0.5 && i > 0) {
        const dx = tx - px, dy = ty - py, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (d < repelR) { const q = Math.pow(1 - d / repelR, 2) * repelR * 0.7 * pa * (1 - wE * 0.7); tx += (dx / d) * q; ty += (dy / d) * q; }
      }
      // and one stays close, always
      if (i === 0) {
        const rad = 30 - 12 * Math.min(1, spinBoost);
        tx = lerp(tx, px + Math.cos(compAngle) * rad, pa); ty = lerp(ty, py + Math.sin(compAngle) * rad, pa);
        al = Math.max(al, 0.95 * Math.max(pa, wB)); sz = Math.max(sz, 1.5); k = lerp(k, 0.06, pa);
      }

      VX[i] = (VX[i] + (tx - X[i]) * k * f) * damp;
      VY[i] = (VY[i] + (ty - Y[i]) * k * f) * damp;
      X[i] += VX[i] * f; Y[i] += VY[i] * f;
      AL[i] = al; SZ[i] = sz;
      const above = seaGate ? ss(S.surfaceY + 12, S.surfaceY - 30, Y[i]) : 1;
      BIRD[i] += (S.dayness * above * wC - BIRD[i]) * Math.min(1, 0.12 * f);
    }
    for (const w of wins) {
      if (w.target > 0.5 && !w.met) w.hello = t;
      w.met = w.target > 0.5;
      w.glow += (w.target - w.glow) * Math.min(1, 0.03 * f);
    }
  };

  function wings(ctx, S, mirrorY, squash) {
    const t = S.t, sc = Math.max(0.75, H / 900);
    for (let i = 0; i < N; i++) {
      const b = BIRD[i];
      if (b < 0.06) continue;
      if (mirrorY && Y[i] > mirrorY) continue;
      const s = (3 + SZ[i] * 3.6) * sc * (i ? 1 : 1.5) * (0.4 + 0.6 * b);
      const fl = t * (7 + R3[i] * 4) + PH[i], span = 0.72 + 0.28 * Math.cos(fl), lift = Math.sin(fl) * 0.6;
      const bank = clamp(Math.atan2(VY[i], Math.abs(VX[i]) + 2) * 0.5, -0.4, 0.4) * (VX[i] < 0 ? -1 : 1);
      const cb = Math.cos(bank), sb = Math.sin(bank), x = X[i];
      if (mirrorY) { // on the water: just a dark dash, shivering
        const y = mirrorY + (mirrorY - Y[i]) * squash;
        ctx.moveTo(x - s * span + Math.sin(t * 3 + i) * 1.5, y); ctx.lineTo(x + s * span + Math.sin(t * 3 + i) * 1.5, y);
        continue;
      }
      const y = Y[i], lx = s * span, ly = -s * lift, mx = lx * 0.5, my = ly * 0.5 - s * 0.42;
      if ((i % 9 === 0) !== wings.warm) continue;
      ctx.moveTo(x - lx * cb - ly * sb, y - lx * sb + ly * cb);
      ctx.quadraticCurveTo(x - mx * cb - my * sb, y - mx * sb + my * cb, x, y);
      ctx.quadraticCurveTo(x + mx * cb - my * sb, y + mx * sb + my * cb, x + lx * cb - ly * sb, y + lx * sb + ly * cb);
    }
  }

  // the flock, seen in the sea it came out of (drawn by the land, under the near hills)
  motes.reflect = function (ctx, S, band) {
    if (S.dayness < 0.05) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, S.horizonY + 2, W, band); ctx.clip();
    ctx.beginPath();
    wings(ctx, S, S.horizonY, 0.45);
    ctx.strokeStyle = 'rgba(40,44,92,' + 0.2 * S.dayness * S.wA + ')';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  };

  motes.draw = function (ctx, S) {
    const unit = Math.min(W, H) * 0.03 + 6;
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

    const ink = V.css(V.mixc([43, 47, 94], [52, 64, 107], ss(0.44, 0.57, S.p)));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5 * Math.max(0.8, H / 900);
    for (let pass = 0; pass < 2; pass++) {
      wings.warm = !!pass;
      ctx.strokeStyle = pass ? '#c9603f' : ink;
      ctx.beginPath();
      wings(ctx, S, 0, 0);
      ctx.stroke();
    }
  };
})();
