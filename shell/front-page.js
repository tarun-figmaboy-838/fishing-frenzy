// =====================================================================
// FRONT PAGE - the journey's title: the "Fishing Frenzy" banner, alive, as fishing 2 drew it (its game.js title,
// ported here): the painting runs through the fishing games' water pass (shell/title/water.js) so the lake rolls,
// bubbles drift and splashes rise where the fish leaps (shell/title/effects.js), the sun glows, the logo's snowy
// rim twinkles, and the Play button floats in the water on a warm glow with a shine across it. A tap on the water
// puffs bubbles; a tap on the sky sparkles.
//
// It is laid out exactly as fishing 1, which follows it, lays out its stage (its stage.js): the 1672 x 941 painting
// fitted to the window on the games' blue, inside a phone's notch and home bar - so fading from it into fishing 1 is
// the same frame, lake into lake. On a phone held upright it asks, as fishing 1 and the lesson do, to be turned.
//
//   FrontPage.init({ onPlay, sound })  onPlay(): Play was tapped; sound(kind): 'bloop' | 'splash' | 'cheer'
//   FrontPage.show(back)               show it (back: the journey's end, it fades in) and run its loop
//   FrontPage.leave()                  Play's burst, then it fades away (0.7 s) over the part beneath
//   FrontPage.waiting(on)              Play was tapped before the first part arrived: the button holds down
// =====================================================================
(function (PopoGame) {
  'use strict';
  const { STAGE_W, STAGE_H, WaterScene, Effects } = PopoGame;

  // fishing 2's title: the banner's water surface, sand line, the play button in its water, where the leaping fish
  // splashes, and twinkle points along the logo's snowy edges (stage px)
  const TITLE = {
    waterline: 610,
    seabed: 860,
    play: { x: 836, y: 748, r: 108 },
    splash: { left: 760, right: 1010, y: 572 },
    twinkles: [[906, 118], [1062, 66], [1242, 58], [1424, 90], [1598, 160], [1556, 336], [958, 318]],
  };
  const FADE_MS = 700; // as fishing 2's title fades into its game
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(img));
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });

  const FrontPage = {
    init(opts) {
      this.opts = opts;
      this.app = document.getElementById('cover');
      this.stage = document.getElementById('cover-stage');
      this.world = document.getElementById('cover-world');
      this.ctx = this.world.getContext('2d');
      this.water = WaterScene ? new WaterScene(document.getElementById('cover-water')) : { ok: false, show() {}, resize() {} };
      this.fx = new Effects();
      this.fx.setWaterline(TITLE.waterline);
      this.play = document.getElementById('play');
      this.anim = { hover: 0, hoverTarget: 0, press: 0, burst: 0, bubbleIn: 0.3 };
      this.splashIn = 0.8;
      this.scale = 1; this.dpr = 1;
      this.ready = Promise.all([loadImage('shell/images/banner.webp'), loadImage('shell/images/play.webp')])
        .then(([banner, play]) => { this.banner = banner; this.playImg = play; this.app.classList.remove('booting'); })
        .catch(() => { this.app.classList.remove('booting'); });
      // the button: tap, keyboard, hover and press, as on fishing 2's title
      this.play.addEventListener('click', (e) => { e.preventDefault(); if (this.opts.onPlay) this.opts.onPlay(); });
      this.play.addEventListener('pointerenter', () => { this.anim.hoverTarget = 1; this.sound('bloop'); });
      this.play.addEventListener('pointerleave', () => { this.anim.hoverTarget = 0; });
      this.play.addEventListener('pointerdown', () => { this.anim.press = 1; });
      // a tap anywhere else: bubbles in the water, sparkles in the sky
      this.stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        const p = this.toStage(e.clientX, e.clientY);
        if (p.y < TITLE.waterline) this.fx.sparkle(p.x, p.y, 8);
        else this.fx.puff(p.x, p.y, 0, 5, true);
      });
      addEventListener('resize', () => this.resize());
      addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
      this.resize();
    },
    sound(kind) { if (this.opts && this.opts.sound) this.opts.sound(kind); },

    // ---------- the fishing games' stage fit (their stage.js) ----------
    resize() {
      const app = this.app;
      let vw = window.innerWidth, vh = window.innerHeight;
      // (fishing 2 can turn its stage sideways on an upright phone; the front page, fishing 1 and the lesson don't, so
      // the journey stays one shape: upright, all three ask to be turned)
      this.rotated = false;
      app.classList.toggle('rotated', this.rotated);
      app.style.width = this.rotated ? vh + 'px' : '';
      app.style.height = this.rotated ? vw + 'px' : '';
      if (this.rotated) {
        [vw, vh] = [vh, vw];
      } else {
        const pad = getComputedStyle(app);
        vw -= parseFloat(pad.paddingLeft) + parseFloat(pad.paddingRight);
        vh -= parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom);
      }
      const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
      // fishing 1's hint: a phone held upright (its stage is much taller than wide) is asked to turn
      document.getElementById('cover-rotate').hidden = !(vh > vw * 1.15);
      const w = Math.round(STAGE_W * scale), h = Math.round(STAGE_H * scale);
      this.scale = scale;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.stage.style.width = w + 'px';
      this.stage.style.height = h + 'px';
      this.stage.style.setProperty('--em', (scale * 10) + 'px');
      this.world.width = Math.round(w * this.dpr); this.world.height = Math.round(h * this.dpr);
      this.world.style.width = w + 'px'; this.world.style.height = h + 'px';
      // the water pass draws at most the painting's own size
      const k = Math.min(1, STAGE_W / this.world.width);
      this.water.resize(Math.round(this.world.width * k), Math.round(this.world.height * k), w + 'px', h + 'px');
    },
    toStage(clientX, clientY) {
      if (this.rotated) {
        const x = clientY - this.stage.offsetLeft, y = window.innerWidth - clientX - this.stage.offsetTop;
        return { x: x / this.scale, y: y / this.scale };
      }
      const r = this.stage.getBoundingClientRect();
      return { x: (clientX - r.left) / this.scale, y: (clientY - r.top) / this.scale };
    },

    // ---------- showing and leaving ----------
    show(back) {
      const app = this.app;
      app.hidden = false;
      app.classList.remove('leaving');
      app.classList.toggle('back', !!back);
      Object.assign(this.anim, { hover: 0, hoverTarget: 0, press: 0, burst: 0 });
      this.play.disabled = false;
      this.play.classList.remove('waiting');
      this.resize();
      if (!this.running) { this.running = true; this.last = 0; requestAnimationFrame((t) => this.frame(t)); }
    },
    // Play: the button pops, bubbles and sparkles burst out of it, and the title fades over the game beneath
    leave() {
      const { x, y, r } = TITLE.play;
      this.play.disabled = true;
      this.play.classList.remove('waiting');
      this.anim.burst = 0.001;
      this.anim.press = 1;
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        this.fx.puff(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, Math.cos(a), 2, true);
      }
      this.fx.sparkle(x, y - r * 0.4, 14);
      this.sound('splash');
      this.sound('cheer');
      this.app.classList.add('leaving');
      clearTimeout(this.gone);
      this.gone = setTimeout(() => {
        if (!this.app.classList.contains('leaving')) return; // shown again meanwhile
        this.app.hidden = true;
        this.app.classList.remove('leaving');
        this.running = false;
      }, reduced ? 50 : FADE_MS + 60);
    },
    waiting(on) { this.play.classList.toggle('waiting', !!on); if (on) this.anim.press = 1; },
    get shown() { return !this.app.hidden; },

    // ---------- the loop (fishing 2's updateTitle and drawTitle) ----------
    frame(now) {
      if (!this.running) return;
      requestAnimationFrame((t) => this.frame(t));
      const dt = Math.min(1 / 15, (now - (this.last || now)) / 1000);
      this.last = now;
      if (document.hidden) return;
      this.update(dt);
      this.draw();
    },
    update(dt) {
      this.fx.update(dt);
      const pa = this.anim, { x: px, y: py } = TITLE.play;
      pa.hover += (pa.hoverTarget - pa.hover) * Math.min(1, dt * 10);
      if (!this.play.classList.contains('waiting')) pa.press = Math.max(0, pa.press - dt * 4);
      if (pa.burst > 0) pa.burst += dt;
      pa.bubbleIn -= dt;
      if (pa.bubbleIn <= 0) {
        pa.bubbleIn = 0.28 + Math.random() * 0.3;
        this.fx.puff(px + (Math.random() - 0.5) * 150, py + 70, 0, 1);
      }
      this.splashIn -= dt;
      if (this.splashIn <= 0) {
        this.splashIn = 0.9 + Math.random() * 1.1;
        const s = TITLE.splash;
        this.fx.splash(s.left + Math.random() * (s.right - s.left), s.y, false);
      }
    },
    draw() {
      const ctx = this.ctx, k = this.dpr * this.scale, t = this.fx.t;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);
      if (!this.banner) return;
      // the banner through the water pass, its surface band kept still (the raft and the leaping fish sit on it);
      // without WebGL (or opened from disk, where WebGL may not read the file) it is drawn plainly
      let drawn = false;
      try {
        drawn = this.water.ok && this.water.render({
          from: this.banner, to: null, mix: 0, time: t, waterline: TITLE.waterline,
          plants: [], amplitude: reduced ? 0.35 : 1, surface: 0, seabed: TITLE.seabed,
        });
      } catch (e) { drawn = false; }
      this.water.show(Boolean(drawn));
      if (!drawn) ctx.drawImage(this.banner, 0, 0, STAGE_W, STAGE_H);
      this.fx.drawWater(ctx, 0, []);
      this.drawPlay(ctx);
      this.fx.drawFront(ctx);
      // a warm, breathing sun glow in the corner and twinkles on the logo's snowy rim
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sun = ctx.createRadialGradient(1650, 18, 10, 1650, 18, 300);
      sun.addColorStop(0, 'rgba(255, 250, 220, ' + (0.32 + Math.sin(t * 0.9) * 0.08) + ')');
      sun.addColorStop(1, 'rgba(255, 250, 220, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(1350, 0, STAGE_W - 1350, 320);
      ctx.globalCompositeOperation = 'source-over';
      TITLE.twinkles.forEach(([x, y], i) => {
        const a = Math.max(0, Math.sin(t * 1.3 + i * 1.7)) ** 4;
        if (a < 0.02) return;
        const r = 4 + a * 9;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + a + ')';
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
        ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r);
        ctx.fill();
      });
      ctx.restore();
    },
    // the Play button: it bobs and sways in the water on a breathing glow, swells on hover, squashes when pressed and
    // pops on Play; a shine sweeps across it every few seconds. The real button is laid over it, the same size
    drawPlay(ctx) {
      const img = this.playImg;
      if (!img) return;
      const pa = this.anim, t = this.fx.t, { x, y, r } = TITLE.play, still = this.fx.reduced;
      const bob = still ? 0 : Math.sin(t * 1.6) * 7;
      const sway = still ? 0 : Math.sin(t * 1.1) * 0.035;
      const breathe = still ? 1 : 1 + Math.sin(t * 2.4) * 0.025;
      const squash = 1 - pa.press * 0.12;
      const pop = pa.burst > 0 ? 1 + Math.sin(Math.min(1, pa.burst / 0.35) * Math.PI) * 0.18 : 1;
      const s = breathe * (1 + pa.hover * 0.07) * pop;
      const cy = y + bob, k = this.scale, st = this.play.style;
      st.transform = 'translate(' + ((x - r * s) * k).toFixed(1) + 'px, ' + ((cy - r * s) * k).toFixed(1) + 'px)';
      st.width = st.height = (2 * r * s * k).toFixed(1) + 'px';
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(x, cy, r * 0.6, x, cy, r * 1.9);
      glow.addColorStop(0, 'rgba(255, 210, 110, ' + (0.42 + 0.16 * Math.sin(t * 2.4) + pa.hover * 0.15) + ')');
      glow.addColorStop(1, 'rgba(255, 210, 110, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r * 2, cy - r * 2, r * 4, r * 4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(x, cy);
      ctx.rotate(sway);
      ctx.scale(s * (1 + pa.press * 0.06), s * squash);
      const w = img.width * (r * 2 / img.height);
      ctx.drawImage(img, -w / 2, -r, w, r * 2);
      const sweep = (t % 3.4) / 1.1;
      if (sweep < 1 && !still) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
        ctx.clip();
        const sx = -r * 1.6 + sweep * r * 3.2;
        const band = ctx.createLinearGradient(sx - r * 0.35, -r, sx + r * 0.35, r);
        band.addColorStop(0, 'rgba(255, 255, 255, 0)');
        band.addColorStop(0.5, 'rgba(255, 255, 255, 0.38)');
        band.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = band;
        ctx.fillRect(-r, -r, r * 2, r * 2);
      }
      ctx.restore();
    },
  };
  window.FrontPage = FrontPage;
})(window.PopoGame);
