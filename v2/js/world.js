// Shared ground truth: where we are in the journey, the shape of the terrain, the colour of the hour.
(function () {
  'use strict';
  const V = window.V;
  const { lerp, ss, easeOut, hex, mixc, css, ramp, TAU } = V;
  const world = (V.world = {});
  let W = 1, H = 1;

  const keyed = (rows) => rows.map(([p, cols]) => [p, cols.map(hex)]);

  // ---------------------------------------------------------------- the colour of the hour
  world.SKY = keyed([ // top, middle, horizon
    [0.34, ['#2a386e', '#b07088', '#ffc79a']],
    [0.44, ['#3b4a80', '#d98b8f', '#ffdca6']],
    [0.5, ['#6f9fcf', '#f0cbb4', '#ffe9bf']],
    [0.57, ['#86bcd6', '#cfe6e2', '#fcf1d8']],
    [0.66, ['#7fb2d2', '#d8e3d6', '#fdeac6']],
    [0.725, ['#5a6fa8', '#e7a98f', '#ffc98a']],
    [0.775, ['#2f2c60', '#a9597c', '#f6a76b']],
    [0.87, ['#090d24', '#151f48', '#2b3b68']],
    [0.965, ['#070a1c', '#101a3e', '#27406b']],
    [1.0, ['#0b0f28', '#1d2654', '#6a5f8a']],
  ]);
  world.SEA = keyed([ // at the horizon, middle, near shore
    [0.4, ['#fcd5a6', '#d48f8c', '#3d4c8a']],
    [0.5, ['#ffe6c0', '#dfa9a2', '#5468a0']],
    [0.57, ['#e6f2ea', '#9fd0d8', '#4f8fb0']],
    [0.66, ['#fdeac6', '#a8cfd2', '#4a86a8']],
    [0.725, ['#ffc98a', '#d99a8c', '#55619a']],
    [0.775, ['#f6a76b', '#a9597c', '#2f2c60']],
    [0.87, ['#2b3b68', '#151f48', '#0a0e26']],
    [0.965, ['#27406b', '#101a3e', '#070a1c']],
    [1.0, ['#5d5782', '#1a2450', '#0a0e26']],
  ]);
  world.HILL = keyed([ // far shore x2, near hills x3
    [0.46, ['#d9c0c0', '#cdb097', '#b3a172', '#8c8f60', '#647a52']],
    [0.57, ['#b9cfd6', '#9dc0b4', '#7bab80', '#5c9165', '#417552']],
    [0.66, ['#c4cfc6', '#a9c0a0', '#84a877', '#658d5d', '#4a724b']],
    [0.715, ['#c9a896', '#a8977c', '#7d8a5e', '#5d7350', '#435c44']],
    [0.75, ['#a88c9a', '#7c7490', '#3f5c62', '#2f4854', '#233646']], // shadows go teal against the orange sky before they go violet
    [0.785, ['#8a739a', '#6a5586', '#463665', '#32274f', '#221a3a']],
    [0.88, ['#1d284d', '#182142', '#111730', '#0c1125', '#080b1a']],
  ]);
  world.SUN = keyed([ // disc, halo
    [0.38, ['#fff0c4', '#ffad6e']],
    [0.57, ['#fffbe8', '#fff1c2']],
    [0.68, ['#ffe2a6', '#ffb672']],
    [0.78, ['#ff9d5c', '#ff6f59']],
  ]);
  world.CLOUD = keyed([
    [0.42, ['#ffe4d2']],
    [0.57, ['#ffffff']],
    [0.66, ['#fff6e6']],
    [0.725, ['#ffd2b0']],
    [0.775, ['#e39a98']],
    [0.88, ['#27305a']],
  ]);

  // paint for things that stand on the land
  world.PAINT = [
    '#3d6b47', '#5f8f57', '#2f5a45', '#86a860', // 0-3 greens
    '#ef7b5d', '#f0b443', '#e98aa6', '#fbf1dc', '#8e9fe0', // 4-8 petals
    '#6b4a3a', // 9 trunk
    '#f3e6d0', '#e6b89c', '#c9d6df', '#f7efe2', '#e9c98a', // 10-14 walls
    '#c5694d', '#6c7a89', '#a8503c', '#7d9270', // 15-18 roofs
    '#d9a441', '#e8a0a8', // 19 autumn, 20 blossom
    '#4a5568', // 21 glass / door
  ].map(hex);

  let tintCache = new Map(), tintFrame = -1;
  // paint sinks toward the colour of the hill it stands on as the light goes
  world.tint = function (idx, l, soft, S) {
    if (tintFrame !== S.frame) { tintCache.clear(); tintFrame = S.frame; }
    const k = idx * 16 + l * 2 + (soft ? 1 : 0);
    let v = tintCache.get(k);
    if (!v) {
      // (at night it should read as a silhouette, so it sinks toward the darker sheet in front of it)
      const p = S.p, cols = ramp(world.HILL, p), dn = ss(0.69, 0.775, p), hill = mixc(cols[l], cols[Math.min(4, l + 1)], 0.75 * dn);
      const amt = (1 - ss(0.47, 0.57, p)) * 0.35 + ss(0.69, 0.775, p) * (soft ? 0.58 : 0.8) + ss(0.78, 0.89, p) * (soft ? 0.17 : 0.2) + (l < 2 ? 0.25 : 0);
      const c = mixc(world.PAINT[idx], mixc(hill, [255, 236, 214], lerp(0.16, 0.05, dn)), Math.min(0.94, amt));
      v = css(c);
      tintCache.set(k, v);
    }
    return v;
  };

  // ---------------------------------------------------------------- the deep floor: ridges receding to a dark horizon
  const NF = 9, FY = [], FS = [], FPAR = [], FAMP = [], FFRQ = [], FPH = [];
  for (let j = 0; j < NF; j++) {
    const q = j / (NF - 1);
    FY.push(0.5 + 0.5 * Math.pow((j + 0.6) / NF, 1.9));
    FS.push(0.16 + 0.84 * Math.pow(q, 1.6));
    FPAR.push(0.3 + Math.pow(q, 1.4));
    FAMP.push(0.005 + 0.03 * FS[j]);
    FFRQ.push(0.75 + (NF - 1 - j) * 0.55);
    FPH.push(j * 2.399);
  }
  world.NF = NF;
  world.floorScale = (j) => FS[j];
  // a ridge's resting line, and how far the rising camera has pushed it down
  world.floorBase = (j, x) => {
    const u = x / H;
    return (FY[j] + FAMP[j] * (Math.sin(u * FFRQ[j] + FPH[j]) + 0.5 * Math.sin(u * FFRQ[j] * 2.3 + FPH[j] * 1.7) + 0.2 * Math.sin(u * FFRQ[j] * 5.1 + FPH[j] * 3.1))) * H;
  };
  world.floorShift = (j, S) => S.camY * FPAR[j] * H;

  // ---------------------------------------------------------------- the land: a far shore across the water, near hills on this side
  const LB = [0, 0, 0.695, 0.79, 0.89];
  const LA = [0, 0, 0.032, 0.045, 0.04];
  const LF = [[1.3, 3.1, 7.3], [1.7, 3.9, 8.1], [1.2, 4.3, 9.2], [1.9, 3.4, 7.7], [1.5, 4.9, 8.8]];
  const LP = [[0.3, 1.2, 4], [2.1, 0.4, 1], [4.0, 2.2, 3], [1.1, 5.2, 0.5], [3.3, 0.9, 2.2]];
  world.LS = [0.3, 0.42, 0.75, 1.0, 1.35];
  const wave = (l, u) => {
    const f = LF[l], ph = LP[l];
    return 0.6 * Math.sin(u * f[0] + ph[0]) + 0.3 * Math.sin(u * f[1] + ph[1]) + 0.1 * Math.sin(u * f[2] + ph[2]);
  };
  // the far shore is a headland: it tapers into open water so the sun can set in the sea
  world.farHeight = (l, x) => {
    const xn = x / W, u = x / H;
    const k = Math.min(1, Math.max(0.55, (W / H) * 0.9));
    return (l === 0 ? (0.08 + 0.036 * wave(0, u)) * ss(0.68, 0.4, xn) : (0.036 + 0.022 * wave(1, u)) * ss(0.52, 0.24, xn)) * k;
  };
  world.ridgeY = (l, x, S) => (l < 2 ? S.horizonY - S.farRise * world.farHeight(l, x) * H + 1 : (LB[l] + LA[l] * wave(l, x / H)) * H + S.off[l]);

  // ---------------------------------------------------------------- small marks, shared by the first scene and the last
  world.markPath = function (ctx, type, x, y, s, rot) {
    if (type === 0) { ctx.moveTo(x + 0.7, y); ctx.arc(x, y, 0.7, 0, TAU); }
    else if (type === 1) { const dx = Math.cos(rot) * s, dy = Math.sin(rot) * s; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
    else if (type === 2) { ctx.moveTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s); ctx.arc(x, y, s, rot, rot + 2.2); }
    else { // a small wave
      const dx = Math.cos(rot) * s, dy = Math.sin(rot) * s;
      ctx.moveTo(x - dx, y - dy);
      ctx.quadraticCurveTo(x - dx * 0.5 - dy * 0.8, y - dy * 0.5 + dx * 0.8, x, y);
      ctx.quadraticCurveTo(x + dx * 0.5 + dy * 0.8, y + dy * 0.5 - dx * 0.8, x + dx, y + dy);
    }
  };

  world.resize = function (S) { W = S.W; H = S.H; };

  // ---------------------------------------------------------------- where we are
  V.phase = function (S) {
    const p = S.p, h = S.H;
    S.camY = 2.5 * ss(0.06, 0.42, p); // the long rise through the water, in screen heights
    S.depthT = S.camY / 2.5;
    S.tilt = ss(0.855, 0.95, p); // looking up, at night
    S.ground = S.tilt * h * 0.16;
    S.surfaceY = h * (S.camY - 1.9) + S.ground;
    S.horizonY = h * 0.6 + S.ground;
    S.wA = ss(0.4, 0.47, p); // water seen from inside -> from above
    S.dayness = ss(0.37, 0.41, p) * (1 - ss(0.705, 0.755, p));
    S.night = ss(0.78, 0.9, p);
    S.home = ss(0.7, 0.765, p); // people are home; lamps are lit
    S.farRise = easeOut(ss(0.455, 0.55, p));
    S.skyRot = 0.09 * Math.sin(S.t * 0.013); // the night sky wheels, very slowly, about a point far below the horizon
    S.pivotX = S.W * 0.5; S.pivotY = S.horizonY + h * 0.45;
    S.off = S.off || [0, 0, 0, 0, 0];
    for (let l = 2; l < 5; l++) {
      const rise = easeOut(ss(0.475 + (l - 2) * 0.014, 0.575 + (l - 2) * 0.016, p));
      if (l === 2) S.nearRise = rise;
      S.off[l] = (1 - rise) * h * (0.42 + 0.05 * l) + S.ground * (1 + 0.12 * (l - 1));
    }
  };
})();
