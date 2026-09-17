(function () {
  'use strict';
  const V = (window.V = {});

  V.TAU = Math.PI * 2;
  V.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  V.lerp = (a, b, t) => a + (b - a) * t;
  V.ss = (a, b, x) => {
    const t = V.clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  V.easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // mulberry32
  V.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  V.hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  V.mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  V.css = (c, a = 1) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

  const lerpAny = (a, b, t) => (typeof a === 'number' ? a + (b - a) * t : a.map((v, i) => lerpAny(v, b[i], t)));

  // keys: [[pos, value], ...] sorted by pos; value is a number or nested arrays of numbers
  V.ramp = function (keys, x) {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (x <= keys[i][0]) {
        const t = V.ss(keys[i - 1][0], keys[i][0], x);
        return lerpAny(keys[i - 1][1], keys[i][1], t);
      }
    }
    return keys[keys.length - 1][1];
  };
})();
