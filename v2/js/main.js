(function () {
  'use strict';
  const V = window.V;
  const { clamp, ss } = V;

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dots = document.getElementById('dots');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = { W: 1, H: 1, dpr: 1, t: 0, dt: 0.016, p: 0, px: -1e4, py: -1e4, pActive: 0, still: 0, rush: 0, clickT: -99, frame: 0, sunX: 0 };
  const ripples = [];
  const STOPS = [0.0, 0.2, 0.43, 0.62, 0.8, 1.0];

  // ---------------------------------------------------------------- grain
  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 220;
    const g = c.getContext('2d'), img = g.createImageData(220, 220), r = V.rng(3);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() + r() - 1) * 110;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    document.getElementById('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
  })();

  // ---------------------------------------------------------------- size + scroll
  function resize() {
    S.W = window.innerWidth; S.H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (S.W * S.H * dpr * dpr > 5.2e6) dpr = Math.sqrt(5.2e6 / (S.W * S.H));
    S.dpr = dpr;
    canvas.width = Math.round(S.W * dpr); canvas.height = Math.round(S.H * dpr);
    V.world.resize(S);
    V.phase(S);
    V.deep.resize(S);
    V.sky.resize(S);
    V.land.resize(S);
    V.motes.resize(S);
  }
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const targetP = () => clamp(window.scrollY / maxScroll());

  window.addEventListener('resize', resize);
  resize();

  // index.html#0.62 opens at that point of the journey and holds still (for looking closely)
  let held = false;
  const hashP = parseFloat(location.hash.slice(1));
  if (!isNaN(hashP)) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    S.p = clamp(hashP);
    held = true;
    requestAnimationFrame(() => window.scrollTo(0, S.p * maxScroll()));
  } else S.p = targetP();

  // ---------------------------------------------------------------- the visitor
  let mouseInside = false, lastTouch = -99, lastMove = -99, lastInput = 0, auto = 0, autoY = 0, mx = 0, my = 0, swipe = 0;
  const touched = (hold) => { lastInput = Math.max(lastInput, S.t + hold); auto = 0; };
  const point = (e, pause) => {
    const far = Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 3;
    if (S.px > -1e3) swipe += Math.hypot(e.clientX - S.px, e.clientY - S.py);
    S.px = e.clientX; S.py = e.clientY;
    if (e.pointerType === 'mouse') mouseInside = true; else lastTouch = S.t;
    if (far) { mx = e.clientX; my = e.clientY; lastMove = S.t; touched(pause); }
  };
  window.addEventListener('pointermove', (e) => point(e, 5), { passive: true });
  window.addEventListener('pointerdown', (e) => { point(e, 9); lastMove = S.t; touched(9); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouseInside = false; });
  window.addEventListener('blur', () => { mouseInside = false; });
  for (const ev of ['wheel', 'touchstart', 'touchmove', 'keydown']) window.addEventListener(ev, () => touched(9), { passive: true });

  canvas.addEventListener('click', (e) => {
    const x = e.clientX, y = e.clientY;
    let kind = 0; // 0 a ripple in water or air, 1 something planted, 2 a star set in the sky
    const planted = V.land.plant(x, y, S);
    if (planted) { V.motes.tend(planted.x, planted.y - planted.h * 0.55, S); kind = 1; }
    else if (S.p > 0.89 && y < S.horizonY - 30) { V.motes.placeStar(x, y, S); kind = 2; }
    else V.motes.impulse(x, y);
    ripples.push({ x, y, t0: S.t, kind });
    if (ripples.length > 8) ripples.shift();
    S.clickT = S.t;
  });

  STOPS.forEach((sp) => {
    const b = document.createElement('button');
    b.tabIndex = -1;
    b.addEventListener('click', () => window.scrollTo({ top: sp * maxScroll(), behavior: reduce ? 'auto' : 'smooth' }));
    dots.appendChild(b);
  });
  let activeDot = -1, uiDark = null;

  // ---------------------------------------------------------------- frame
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.dt = dt; S.t += dt; S.frame++;

    // left alone, the journey walks itself
    if (!reduce && !held && S.t > lastInput + (S.t < 10 ? 4.5 : 0) && targetP() < 0.999) {
      if (auto === 0) autoY = window.scrollY;
      auto = Math.min(1, auto + dt * 0.4);
      autoY += (maxScroll() / 210) * dt * auto;
      window.scrollTo(0, autoY);
    }

    S.p += (targetP() - S.p) * (1 - Math.exp(-dt * 4.5));
    // present: a mouse resting on the page is still someone there. still: present, and not moving
    const here = mouseInside || S.t - lastTouch < 3.5 ? 1 : 0;
    const quiet = here && S.t - lastMove > 0.9 ? 1 : 0;
    S.pActive += (here - S.pActive) * (1 - Math.exp(-dt * (here ? 6 : 1.2)));
    S.still += (quiet - S.still) * (1 - Math.exp(-dt * (quiet ? 1.6 : 3)));
    // how briskly the hand is moving: run it through the lights and they part like water
    S.rush += (Math.min(1, swipe / dt / 1800) - S.rush) * (1 - Math.exp(-dt * 5));
    swipe = 0;

    V.phase(S);
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    V.land.layout(S);
    V.motes.update(S);
    if (S.surfaceY > -60) V.sky.draw(ctx, S);
    V.land.drawFar(ctx, S);
    V.land.drawSea(ctx, S);
    if (S.p > 0.46) V.land.drawNear(ctx, S);
    V.motes.draw(ctx, S);

    // touches
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], a = (S.t - r.t0) / (r.kind === 2 ? 1.2 : 1.8);
      if (a >= 1) { ripples.splice(i, 1); continue; }
      const day = S.dayness > 0.5 && !r.kind;
      ctx.strokeStyle = (r.kind ? 'rgba(255,214,150,' : day ? 'rgba(60,70,120,' : 'rgba(220,245,255,') + 0.55 * (1 - a) * (1 - a) + ')';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) {
        const rr = Math.min(S.W, S.H) * (r.kind === 2 ? 0.05 : 0.16) * V.easeOut(clamp(a * (1 + k * 0.5) - k * 0.12));
        if (rr <= 0) continue;
        ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, V.TAU); ctx.stroke();
      }
    }

    // a wordless "this way": a light that keeps sinking
    const hint = (1 - ss(0.004, 0.03, S.p)) * ss(1.5, 4, S.t);
    if (hint > 0.01) {
      const u = (S.t * 0.45) % 1, y = S.H - 92 + u * 40, d = 26;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = hint * Math.sin(u * Math.PI) * 0.9;
      ctx.drawImage(V.motes.sprite(3), S.W / 2 - d / 2, y - d / 2, d, d);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // the quiet index at the edge
    let near = 0;
    for (let i = 1; i < STOPS.length; i++) if (Math.abs(STOPS[i] - S.p) < Math.abs(STOPS[near] - S.p)) near = i;
    if (near !== activeDot) {
      activeDot = near;
      [...dots.children].forEach((b, i) => b.classList.toggle('on', i === near));
    }
    const dark = S.p > 0.5 && S.p < 0.71;
    if (dark !== uiDark) { uiDark = dark; dots.style.setProperty('--ui', dark ? '40, 52, 90' : '255, 255, 255'); }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
