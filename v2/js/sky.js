// The sky: gradient of the hour, a paper sun, paper clouds, and at night a slow wheel of stars.
(function () {
  'use strict';
  const V = window.V;
  const { lerp, ss, easeOut, css, ramp, rng, TAU } = V;
  const world = V.world;
  const sky = (V.sky = {});

  let W = 1, H = 1, clouds = [], starCanvas = null;

  sky.resize = function (S) {
    W = S.W; H = S.H;
    let r = rng(23);
    clouds = [];
    for (let i = 0; i < 6; i++) {
      const bars = [], nb = 2 + ((r() * 3) | 0);
      for (let b = 0; b < nb; b++) bars.push({ dx: (r() - 0.5) * 0.5, w: 0.5 + r() * 0.6 });
      clouds.push({ xn: (i / 6) * 1.4 + r() * 0.12, yn: 0.06 + r() * 0.27, s: 0.55 + r() * 0.8, sp: 0.0025 + r() * 0.004, bars });
    }

    r = rng(5);
    const sw = Math.ceil(W * 1.3), sh = Math.ceil(H * 1.5);
    starCanvas = document.createElement('canvas');
    starCanvas.width = sw; starCanvas.height = sh;
    const c = starCanvas.getContext('2d');
    // a soft river of light
    for (let i = 0; i < 9; i++) {
      const u = i / 8, x = sw * (0.02 + u * 0.96), y = sh * (0.66 - u * 0.42) + (r() - 0.5) * sh * 0.05, rad = Math.max(sw, sh) * (0.13 + r() * 0.09);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(150,170,230,0.085)');
      g.addColorStop(1, 'rgba(150,170,230,0)');
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const dust = Math.round((sw * sh) / 700);
    for (let i = 0; i < dust; i++) {
      const u = r(), spread = (r() + r() + r() - 1.5) * sh * 0.13;
      c.fillStyle = 'rgba(210,220,255,' + (0.08 + r() * 0.3) + ')';
      c.fillRect(sw * u, sh * (0.66 - (u - 0.02) * 0.44) + spread, 1, 1);
    }
    const n = Math.round((sw * sh) / 3600);
    const cols = ['255,255,255', '200,215,255', '255,232,205'];
    for (let i = 0; i < n; i++) {
      c.fillStyle = 'rgba(' + cols[(r() * 3) | 0] + ',' + (0.25 + r() * 0.65) + ')';
      c.beginPath();
      c.arc(r() * sw, r() * sh, 0.3 + r() * r() * 1.1, 0, TAU);
      c.fill();
    }
  };

  function pill(ctx, x, y, w, h) {
    const r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
  }

  sky.draw = function (ctx, S) {
    const p = S.p, t = S.t;
    const c = ramp(world.SKY, p);
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(S.horizonY, H * 0.3));
    g.addColorStop(0, css(c[0]));
    g.addColorStop(0.55, css(c[1]));
    g.addColorStop(1, css(c[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (S.night > 0.01 && starCanvas) {
      ctx.save();
      ctx.globalAlpha = S.night;
      ctx.translate(S.pivotX, S.pivotY);
      ctx.rotate(S.skyRot);
      ctx.translate(-S.pivotX, -S.pivotY);
      ctx.drawImage(starCanvas, -W * 0.15, -H * 0.4 + H * 0.25 * S.tilt, W * 1.3, H * 1.5);
      ctx.restore();
    }

    // the next morning, waiting under the horizon
    const hint = ss(0.95, 1, p);
    if (hint > 0) {
      const rad = Math.max(W, H) * 0.6;
      ctx.save();
      ctx.translate(W * 0.56, S.horizonY);
      ctx.scale(1, 0.42);
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      hg.addColorStop(0, 'rgba(255,178,130,' + 0.55 * hint + ')');
      hg.addColorStop(0.4, 'rgba(230,130,150,' + 0.2 * hint + ')');
      hg.addColorStop(1, 'rgba(230,130,150,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }

    // sun: rises from the sea it came out of, sets back into it
    if (p > 0.34 && p < 0.84) {
      const u = ss(0.385, 0.8, p), sc = ramp(world.SUN, p);
      const sx = W * lerp(0.5, 0.7, u), sy = S.horizonY - Math.sin(Math.PI * u) * H * 0.44 + u * u * H * 0.12;
      const sr = Math.min(W, H) * 0.06, gr = sr * 7;
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
      S.sunX = sx; S.sunY = sy; S.sunUp = sy < S.horizonY + sr ? 1 : 0;
    } else S.sunUp = 0;

    // clouds: stacked paper pills, each with the shadow it casts on the sky behind
    const cw = ss(0.4, 0.5, p) * (1 - ss(0.84, 0.92, p));
    if (cw > 0.01) {
      const cc = ramp(world.CLOUD, p)[0];
      const unit = Math.min(W, H * 1.4) * 0.2;
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? css(cc, 0.9 * cw) : 'rgba(30,30,80,' + 0.07 * cw + ')';
        for (const cl of clouds) {
          const x = (((cl.xn + t * cl.sp) % 1.4) - 0.2) * W + (pass ? 0 : unit * 0.035), y = cl.yn * H + S.ground * 1.2 + (pass ? 0 : unit * 0.05);
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

    if (S.night > 0.6) {
      // now and then, one lets go
      const slot = Math.floor(t / 9), r = rng(slot * 7919 + 13), t0 = slot * 9 + r() * 5, a = (t - t0) / 0.9;
      if (a > 0 && a < 1 && r() < 0.75) {
        const dir = r() < 0.5 ? -1 : 1, ang = 0.3 + r() * 0.5, L = Math.min(W, H) * 0.4;
        const x0 = W * (0.15 + r() * 0.7), y0 = H * (0.04 + r() * 0.3), e = easeOut(a);
        const hx = x0 + Math.cos(ang) * dir * L * e, hy = y0 + Math.sin(ang) * L * e;
        const tl = L * 0.22 * (1 - a * 0.6), tx = hx - Math.cos(ang) * dir * tl, ty = hy - Math.sin(ang) * tl;
        const lg = ctx.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, 'rgba(255,250,230,0)');
        lg.addColorStop(1, 'rgba(255,250,230,' + 0.85 * Math.sin(Math.PI * a) * S.night + ')');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      }
      // and small marks begin to fall again: what was made tonight becomes the floor someone else wakes on
      const again = ss(0.955, 1, p);
      if (again > 0.01) V.deep.snow(ctx, S, 0.42 * again, false);
    }
  };
})();
