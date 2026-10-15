// =====================================================================
// CONFETTI — a short burst from the top of the stage on each correct action (the engine's cheer()).
// Confetti.burst() drops pieces across the full width; they flutter down and are gone by FADE_TO, so the
// bubble, Swiftee and the shape are only covered briefly. Drawn on the .confetti canvas (it ignores the
// pointer); the loop runs only while pieces are falling. Off for prefers-reduced-motion.
// =====================================================================
(function () {
  var W = 1280, H = 720;
  var N = 70;                       // pieces per burst
  var FADE_FROM = 230, FADE_TO = 470; // pieces are fully visible above FADE_FROM and gone by FADE_TO (stage px)
  var COLORS = ['#e8282f', '#2e9e4f', '#f2b51c', '#ffffff', '#c3121e', '#3fd27a', '#ffd34d']; // Christmas red, green, gold and snow white
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var parts = [], running = false, last = 0, cv = null, ctx = null, dpr = 1;

  // find the canvas again if the stage re-rendered it
  function canvas() {
    if (cv && cv.isConnected) return cv;
    cv = document.querySelector('.stage canvas.confetti');
    ctx = null;
    return cv;
  }
  // canvas pixels per stage px: the stage's size on screen (fitted to the window) times the device pixel ratio, so
  // pieces stay sharp without drawing more pixels than the screen shows
  function density(c) { return Math.min(2, Math.max(0.5, c.getBoundingClientRect().width / W * (window.devicePixelRatio || 1))); }
  function burst() {
    if (reduced || !canvas()) return;
    if (ctx && Math.abs(density(cv) - dpr) > 0.05) ctx = null; // the window changed since the last burst
    parts = []; // a new burst replaces any pieces still falling
    for (var i = 0; i < N; i++) {
      parts.push({
        x: (i + Math.random()) * (W / N), y: rnd(-60, -10), d: rnd(0, 0.35), // spread evenly across the top; d = start delay (s)
        vx: rnd(-30, 30), vy: rnd(150, 230), w: rnd(7, 11), h: rnd(10, 15),
        rot: rnd(0, Math.PI * 2), vr: rnd(-6, 6), sw: rnd(10, 26), sf: rnd(2, 4), ph: rnd(0, Math.PI * 2),
        c: COLORS[i % COLORS.length]
      });
    }
    if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  }
  function frame(now) {
    var c = canvas();
    if (!c) { running = false; return; }
    if (!ctx) {
      dpr = density(c);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx = c.getContext('2d');
    }
    var dt = Math.min(0.05, (now - (last || now)) / 1000); // seconds, capped so pieces do not jump after a hidden tab
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var live = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.d > 0) { p.d -= dt; live++; continue; }
      p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt;
      p.vy = Math.max(110, p.vy - 40 * dt); // slows to a gentle flutter
      if (p.y > FADE_TO) continue;
      live++;
      var a = p.y < FADE_FROM ? 1 : 1 - (p.y - FADE_FROM) / (FADE_TO - FADE_FROM);
      var x = p.x + Math.sin(now / 1000 * p.sf + p.ph) * p.sw;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.rot * 0.7)) * 0.7 + 0.3); // tumbling: the piece turns edge-on and back
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (live) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); parts = []; running = false; }
  }
  window.Confetti = { burst: burst };
})();
