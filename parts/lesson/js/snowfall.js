// =====================================================================
// SNOWFALL — gentle snow on the lesson background (.snowfall, behind the ice panel). Three depth layers: far
// flakes are small, faint and slow; near flakes are bigger, softer and faster. Each flake sways on its own
// sine. Off for prefers-reduced-motion.
// =====================================================================
(function () {
  var W = 1280, H = 720;                     // stage size; the canvas is scaled with the stage
  var LAYERS = [                             // lesson background: count, radius, fall speed (px/s), alpha, blur
    { n: 40, r: [1, 1.8], v: [9, 15], a: [0.5, 0.75], blur: 0 },
    { n: 26, r: [1.8, 2.8], v: [15, 24], a: [0.7, 0.9], blur: 0 },
    { n: 12, r: [3, 4.4], v: [24, 34], a: [0.6, 0.8], blur: 1.4 }
  ];
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  // canvas pixels per stage px: the stage's size on screen (fitted to the window) times the device pixel ratio, so
  // flakes stay sharp without drawing more pixels than the screen shows. Measured again when the window changes
  var resized = 0;
  addEventListener('resize', function () { resized++; });
  var density = function (c) { return Math.min(2, Math.max(0.5, c.getBoundingClientRect().width / W * (window.devicePixelRatio || 1))); };
  // one snow system per canvas, each with its own layers; once: stop for good when its canvas goes (the front page)
  function system(SEL, LAYERS, once) {
  var flakes = [];
  LAYERS.forEach(function (L, li) {
    for (var i = 0; i < L.n; i++) flakes.push(make(L, li, true));
  });

  // a new flake: anywhere on screen at the start, otherwise just above the top
  function make(L, li, anywhere) {
    return {
      L: li, x: Math.random() * W, y: anywhere ? Math.random() * H : rnd(-30, -6),
      r: rnd(L.r[0], L.r[1]), v: rnd(L.v[0], L.v[1]), a: rnd(L.a[0], L.a[1]),
      sw: rnd(8, 22), sf: rnd(0.15, 0.4), ph: Math.random() * Math.PI * 2, wind: rnd(2, 7)
    };
  }

  var cv = null, ctx = null, last = 0, dpr = 1, seen = 0, had = false;
  // find the canvas again if the stage re-rendered it
  function canvas() {
    if (cv && cv.isConnected) return cv;
    cv = document.querySelector(SEL);
    ctx = null;
    return cv;
  }
  function frame(now) {
    var c = canvas();
    if (!c) { if (once && had) return; last = now; requestAnimationFrame(frame); return; }
    had = true;
    requestAnimationFrame(frame);
    if (!ctx || seen !== resized) {
      seen = resized;
      dpr = density(c);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx = c.getContext('2d');
    }
    var dt = Math.min(0.05, (now - (last || now)) / 1000); // seconds; capped so flakes do not jump after a hidden tab
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var t = now / 1000;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i], L = LAYERS[f.L];
      f.y += f.v * dt;
      f.x += f.wind * dt;
      // gone off the bottom or right: back to the top, starting a little left of the stage since the wind blows right
      if (f.y > H + 8 || f.x > W + 30) { flakes[i] = f = make(L, f.L, false); f.x = Math.random() * (W + 60) - 60; }
      var x = f.x + Math.sin(t * f.sf + f.ph) * f.sw;
      ctx.globalAlpha = f.a;
      if (L.blur) {
        var g = ctx.createRadialGradient(x, f.y, 0, x, f.y, f.r + L.blur);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(x, f.y, f.r + L.blur, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(70,110,170,.35)'; ctx.shadowBlur = 2; // a faint edge keeps flakes visible over the white snow
        ctx.beginPath(); ctx.arc(x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  requestAnimationFrame(frame);
  }
  system('.stage canvas.snowfall', LAYERS);
  // (the front page's snow is the journey's: shell/journey.js)
})();
