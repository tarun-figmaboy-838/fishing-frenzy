// =====================================================================
// SUMMARY — screen 37, "Let's recall what we learnt today" (a port of the Summary Kit).
// One card per idea, in the order the lesson taught them. Each card goes through these states, strictly in turn:
//   CARD_ENTER      the card comes into the middle
//   CONCEPT_REVEAL  its idea is drawn on the trapezium
//   SWIFTEE_ENTER   Swiftee rises from behind the card (she is under the card layer, so the card hides her body)
//   EXPLANATION     she says one line; key words light up the part of the card they name
//   READING_PAUSE   a short breath
//   SWIFTEE_EXIT    she sinks back behind the card
//   CARD_COLLECT    the card shrinks into a 2 x 2 album at the side
//   NEXT_CONCEPT    then the next card
// After the last card: FINAL_SUMMARY (albums gather in, she says the closing line), then READY (tapping a card replays
// it; after SUM.readyMs with nothing tapped the lesson moves on by itself). Each state waits for the one before, so lines never overlap and nothing can be tapped while she talks.
// Coordinates are the kit's 1000 x 562 board, scaled to the 1280 x 720 stage. Reduced motion: same states, no movement.
// Engine: Summary.enter(engine) when the screen opens, Summary.start(engine) once the opening line is said,
// Summary.stop() on every screen change.
// =====================================================================
(function () {
  const G = window.gsap, NS = 'http://www.w3.org/2000/svg', W = 1000, H = 562, PX = 1280 / W;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- layout in board units (1000 x 562), and timings ----------
  const SUM = {
    // each card's name plate sits centred on its bottom edge
    card: { cx: 500, cy: 322, w: 300 },
    mini: { w: 132, x: [[80, 224], [776, 920]], y: [200, 378], zoom: 1.12, plate: { w: 118, h: 27, size: 15.5, rim: 2 } },
    enterMs: 420, collectMs: 580, pauseMs: 200,
    readyMs: 4500 // READY: time to tap a card before the lesson moves on (the engine then waits its usual beat)
  };
  const FRAME = { src: 'assets/images/summary-card.webp', w: 1024, h: 984 };
  const WARM = 'rgba(255, 150, 40, 0.85)';
  // name-tag colours, for the ideas that have a tone
  const TONE = {
    convex: { deep: '#0f6f86', wash: '#e4f8fc', ink: '#0b5566' },
    concave: { deep: '#95590a', wash: '#fff3dd', ink: '#6d4100' },
    regular: { deep: '#a04e0a', wash: '#fff0e0', ink: '#7a3300' },
    irregular: { deep: '#1f6bff', wash: '#e8f0fd', ink: '#1a4799' }
  };
  // the lesson's colours: pink bases, purple legs, lilac fill, orange parallel arrows; one colour per angle
  const INK = { base: '#1f6bff', leg: '#00c4a7', fill: 'rgba(255,246,214,0.95)', chev: '#ff7a00', navy: '#123b63' };
  const ANG = { A: '#ff7a00', B: '#1fcf66', C: '#9b5de5', D: '#ffb800' };
  const TXT = { A: '#e0560a', B: '#128a44', C: '#6a35b8', D: '#a87200' }; // angle values, as on the lesson's board
  // Swiftee's two spots: 'peek' over the card's top edge, 'middle' standing on the snow between the albums. y = offset in stage px from her
  // CSS position, s = scale of her 259 px box, hide = how far she sinks to be out of sight
  const SPOT = { peek: { y: 0, s: 218 / 259, hide: 154 }, middle: { y: 186, s: 300 / 259, hide: 300 } };

  // ---------- the trapeziums on the cards (board units): AB at y = TOP, DC at y = BOT, so AB is parallel to DC ----------
  // the shape sits in the middle of the card's open area (the name plate covers its bottom edge), leaving room under it
  // for the angle-sum line, well clear of the plate
  const TOP = 262, BOT = 364, HT = BOT - TOP;
  const SHAPES = {
    gen: { A: 440, B: 548, C: 596, D: 404 },
    scal: { A: 434, B: 530, C: 598, D: 402 },    // all four sides different
    iso: { A: 446, B: 554, C: 598, D: 402 },     // legs equal
    right: { A: 404, B: 530, C: 596, D: 404 },   // AD upright: right angles at A and D
    // the same angles as the lesson: D 60, A 120, C 75, B 105
    ang: { A: 404 + HT / Math.tan(Math.PI / 3), B: 596 - HT / Math.tan(75 * Math.PI / 180), C: 596, D: 404 }
  };
  const SIDES = { AB: ['A', 'B'], BC: ['B', 'C'], DC: ['D', 'C'], DA: ['D', 'A'] };

  // ---------- the ideas, in teaching order. card() draws any of them from this data ----------
  //   visual: shape; draw (outline draws itself); chev (parallel arrows); lit (sides that glow); ticks ('all' = one tick
  //           count per length, 'legs' = the equal legs); right (right-angle marks); wedges (angles with their values)
  //   cue:    spoken word -> what it highlights (see cue() below)
  const IDEAS = [
    { id: 'trapezium', label: 'Trapezium', t: 'A trapezium is a quadrilateral with at least one pair of parallel sides.',
      visual: { shape: 'gen', draw: true, chev: true }, cue: { quadrilateral: 'outline', parallel: 'pair' } },
    { id: 'bases', label: 'Bases', t: 'The parallel sides are called the bases.',
      visual: { shape: 'gen', chev: true, lit: ['AB', 'DC'] }, cue: { parallel: 'chev', bases: 'lit' } },
    { id: 'legs', label: 'Legs', t: 'The other two sides are called the legs.',
      visual: { shape: 'gen', lit: ['DA', 'BC'] }, cue: { legs: 'lit' } },
    { id: 'scalene', label: 'Scalene', tone: 'irregular', t: 'A scalene trapezium has sides of different lengths.',
      visual: { shape: 'scal', ticks: 'all' }, cue: { scalene: 'tag', sides: 'outline', different: 'ticks' } },
    { id: 'isosceles', label: 'Isosceles', tone: 'convex', t: 'An isosceles trapezium has legs of the same length.',
      visual: { shape: 'iso', ticks: 'legs' }, cue: { isosceles: 'tag', legs: 'legs', same: 'ticks' } },
    // the third type straight after the other two (scalene, isosceles, right angled), then the angle ideas
    { id: 'right', label: 'Right angled', tone: 'regular', t: 'A right trapezium has two adjacent right angles.',
      visual: { shape: 'right', right: ['A', 'D'] }, cue: { right: 'tag', adjacent: 'side', angles: 'right' } },
    { id: 'angleSum', label: 'Angle sum', tone: 'concave', t: 'Angles on the same leg add up to 180°.',
      visual: { shape: 'ang', lit: ['DA'], wedges: ['A', 'D'] }, cue: { angles: 'wedges', leg: 'lit', add: 'add', 180: 'sum' },
      times: { add: 1.84, '180°': 2.36 } }, // measured in the recording (vo182): "add" 1.84 s, "one hundred eighty" 2.36 s
    { id: 'supplementary', label: 'Supplementary', tone: 'concave', t: 'Two angles that add up to 180° are supplementary.',
      visual: { shape: 'ang', lit: ['BC'], wedges: ['B', 'C'] }, cue: { angles: 'wedges', add: 'add', 180: 'sum', supplementary: 'tag' },
      times: { add: 1.16, '180°': 1.76, supplementary: 3.44 } } // (vo183): "add" 1.16 s, "one hundred eighty" 1.76 s, "supplementary" 3.44 s
  ];
  // the closing line (the opening line comes from lesson-data, 'recap')
  const DONE = { m: 'celebrating', t: 'Wonderful! You remember everything about trapeziums!', cue: { trapeziums: 'all' } };

  // ---------- small helpers ----------
  // make an SVG element: null attributes are skipped, attrs.text becomes its text
  function mk(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => { if (attrs[k] == null) return; if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }
  const pt = (X, k) => ({ x: X[k], y: k === 'A' || k === 'B' ? TOP : BOT });
  const f1 = (n) => +n.toFixed(1);

  const Summary = {
    run: 0, S: null,
    get state() { return this.S ? this.S.state : null; },

    // ---------- screen opens: build the card layer; Swiftee rises in the middle for the opening line ----------
    enter(engine) {
      this.stop();
      const root = document.querySelector('.stage .sum-root');
      if (!root) return;
      const run = ++this.run, eng = engine, tok = eng.stepTok;
      this.eng = eng;
      // live() turns false once the screen changes; every async step checks it, so nothing runs late
      const live = () => run === this.run && tok === eng.stepTok && root.isConnected;
      this.live = live;
      this.ctx = G ? G.context(() => {}) : null;
      this.timers = [];
      root.innerHTML = '';
      const svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: 1280, height: 720, 'aria-label': 'Summary', role: 'img' }, root);
      this.svg = svg;
      this.defs = mk('defs', {}, svg);
      this.layer = mk('g', {}, svg);
      this.fx = mk('g', { 'pointer-events': 'none' }, svg);
      this.root = root;
      this.S = { cards: {}, collected: [], active: null, state: 'SUMMARY_START' };
      this.busy = false;
      this.setState('SUMMARY_START');
      this.layer.addEventListener('pointerdown', (e) => {
        const g = e.target.closest && e.target.closest('.summary-card');
        if (g && this.S && this.S.state === 'READY') this.replay(g.getAttribute('data-concept'));
      });
      // from screen 36 she is already centre stage: she glides up into the middle spot instead of rising from below
      const sw = document.querySelector('.stage .swiftee');
      if (eng.fromHero && sw && G && !reduced()) { this.ctx.add(() => G.set(sw, { y: 207, scale: 1, opacity: 1 })); this.place('middle', false, 420); } // (207: the hero spot's top, 330, less this screen's 123)
      else { this.place('middle', true, 0); this.rise('middle'); }
    },
    // after the opening line: each card in turn, then the finale. A step that resolves false (screen changed) ends the chain
    start(engine) {
      if (!this.S || engine !== this.eng || !this.live()) { this.enter(engine); }
      const live = this.live;
      if (!live()) return;
      this.hush();
      let chain = this.sink().then(() => live());
      IDEAS.forEach((c) => {
        chain = chain.then((ok) => ok && this.show(c))
          .then((ok) => { if (!ok) return false; this.setState('SWIFTEE_ENTER', c.id); return this.rise('peek'); })
          .then((ok) => { if (!ok) return false; this.setState('EXPLANATION', c.id); return this.say(c); })
          .then((ok) => { if (!ok) return false; this.setState('READING_PAUSE', c.id); this.hush(); return this.hold(SUM.pauseMs); })
          .then((ok) => { if (!ok) return false; this.setState('SWIFTEE_EXIT', c.id); return this.sink(); })
          .then((ok) => ok && this.collect(c.id));
      });
      return chain.then((ok) => ok && this.hold(400))
        .then((ok) => ok && this.gather())
        .then((ok) => ok && this.rise('middle'))
        .then((ok) => ok && this.say(DONE))
        .then((ok) => { if (ok && live()) { this.hush(); this.ready(); } return ok; });
    },
    // screen change: cancel timers and tweens, put Swiftee and her bubble back, clear the layer
    stop() {
      this.run++;
      (this.timers || []).forEach(clearTimeout); this.timers = [];
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const sw = document.querySelector('.stage .swiftee'), bub = document.querySelector('.stage .bubble');
      if (sw && G) G.set(sw, { clearProps: 'transform,opacity' });
      if (bub) { bub.style.marginBottom = ''; bub.style.maxWidth = ''; }
      if (this.root) this.root.innerHTML = '';
      this.root = null; this.S = null; this.busy = false;
    },
    // also written to the root as data-state, for debugging
    setState(state, id) {
      if (!this.S) return;
      this.S.state = state;
      if (this.root) this.root.setAttribute('data-state', state + (id ? ':' + id : ''));
    },

    // ---------- timing: no timer fires after the screen has changed ----------
    // hold(ms) resolves true after ms, or false if the screen changed (later() then never fires, so a second timer settles it)
    later(ms, fn) { const live = this.live, t = setTimeout(() => { if (live()) fn(); }, ms); this.timers.push(t); return t; },
    hold(ms) { const live = this.live; return new Promise((r) => { if (reduced() || !ms) { r(live()); return; } this.later(ms, () => r(true)); this.timers.push(setTimeout(() => { if (!live()) r(false); }, ms + 20)); }); },
    sfx(k) { if (this.live && this.live()) this.eng.sfx(k); },

    // ---------- Swiftee: the game's own mascot element, moved between the two SPOTs ----------
    place(where, down, ms) {
      const sw = document.querySelector('.stage .swiftee'), bub = document.querySelector('.stage .bubble');
      this.spot = where || this.spot || 'middle';
      const P = SPOT[this.spot];
      // keep her speech bubble above her head; in the middle it stays narrow enough to fit between the albums
      if (bub) { bub.style.marginBottom = (-P.y) + 'px'; bub.style.maxWidth = this.spot === 'middle' ? '470px' : ''; }
      if (!sw || !G) return Promise.resolve(this.live());
      const to = { y: P.y + (down ? P.hide : 0), scale: P.s, opacity: down ? 0 : 1 };
      if (!ms || reduced()) { this.ctx.add(() => G.set(sw, to)); return Promise.resolve(this.live()); }
      return new Promise((res) => this.ctx.add(() => G.to(sw, Object.assign(to, { duration: ms / 1000, ease: down ? 'power2.in' : 'power3.out', onComplete: () => res(this.live()) }))));
    },
    // rise: start out of sight, come up (340 ms). sink: drop out of sight (300 ms)
    rise(where) { this.place(where, true, 0); this.eng.pose('happy'); return this.place(where, false, 340); },
    sink() { return this.place(null, true, 300); },
    // say one line in the game's voice; each cue word calls cue() as it is spoken. Resolves when the line ends
    say(c) {
      const live = this.live;
      return new Promise((res) => {
        if (!live()) { res(false); return; }
        const cueAt = {};
        Object.keys(c.cue || {}).forEach((w) => { cueAt[w] = () => this.cue(c.cue[w]); });
        this.eng.say({ m: c.m || 'happy', t: c.t, noEmph: 1, cueAt: cueAt, cueTimes: c.times }, () => res(live()));
      });
    },
    // hide the speech bubble
    hush() { if (this.live && this.live()) this.eng.setState({ bubOff: true }); },

    // ---------- build one card: the frame image, the trapezium (hidden until reveal) and its name tag ----------
    card(c) {
      const V = c.visual || {}, w = SUM.card.w, h = w * FRAME.h / FRAME.w, x = SUM.card.cx - w / 2, y = SUM.card.cy - h / 2;
      const g = mk('g', { 'class': 'summary-card', 'data-concept': c.id }, this.layer);
      g._rect = { x: x, y: y, w: w, h: h }; g._c = c;
      const pp = mk('g', {}, g); g._pop = pp;           // animations run on the inner group, the collect transform on the outer
      const img = mk('image', { x: x, y: y, width: w, height: h, preserveAspectRatio: 'none', href: FRAME.src }, pp);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', FRAME.src); // older browsers only read xlink:href
      const vis = mk('g', {}, pp); g._vis = vis;
      const X = SHAPES[V.shape || 'gen'], P = { A: pt(X, 'A'), B: pt(X, 'B'), C: pt(X, 'C'), D: pt(X, 'D') };
      g._P = P;
      g._fill = mk('polygon', { points: ['A', 'B', 'C', 'D'].map((k) => f1(P[k].x) + ',' + P[k].y).join(' '), fill: INK.fill, opacity: 0 }, vis);
      g._bands = mk('g', {}, vis);                       // highlight bands, under the side lines
      g._wedgeG = mk('g', {}, vis);
      g._sides = {};
      Object.keys(SIDES).forEach((s) => {
        const a = P[SIDES[s][0]], b = P[SIDES[s][1]];
        g._sides[s] = mk('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: s === 'AB' || s === 'DC' ? INK.base : INK.leg, 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0 }, vis);
      });
      g._marks = mk('g', {}, vis);
      g._dots = ['A', 'B', 'C', 'D'].map((k) => mk('circle', { cx: P[k].x, cy: P[k].y, r: 4.2, fill: '#fff', stroke: INK.base, 'stroke-width': 2.2, opacity: 0 }, vis));
      // the name plate centred on the card's bottom edge
      g._tag = this.nameTag(pp, SUM.card.cx, y + h + 4, c.label, c.tone);
      g._tag.setAttribute('opacity', 0);
      return g;
    },
    // a rounded name plate sized to its text; o sets height, font size, minimum width and rim (the album plates)
    nameTag(parent, x, y, text, tone, o) {
      const c = TONE[tone] || null, g = mk('g', { 'class': 'badge' }, parent);
      const H0 = (o && o.h) || 50, fs = (o && o.size) || 26, rim = (o && o.rim) || 4, deep = c ? c.deep : '#1f6bff';
      const t = mk('text', { x: x, y: y + fs * 0.36, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 800,
        'font-family': "'Baloo 2', Nunito, system-ui, sans-serif", fill: c ? c.ink : '#123b63', text: text }, g);
      let w = 0; try { w = t.getComputedTextLength(); } catch (e) {}
      if (!w) w = text.length * fs * 0.54; // could not measure the text: estimate
      const bw = (o && o.w) ? Math.max(o.w, w + 16) : (w + 60);
      // the plate (as in the lesson): a flat pill with a thick rim - a label, not a button
      g.insertBefore(mk('rect', { x: x - bw / 2, y: y - H0 / 2, width: bw, height: H0, rx: H0 / 2, fill: c ? c.wash : '#ffffff', stroke: deep, 'stroke-width': rim }), t);
      return g;
    },
    // bring an element in: a plain fade (marks are drawn, never popped); fill 'backwards' keeps it hidden during the delay
    pop(el, delay) {
      el.setAttribute('opacity', 1);
      if (reduced() || !el.animate) return;
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }); } catch (e) {}
    },
    // a named part swells once and settles, slightly staggered: one smooth beat, no blur
    warmPulse(els, peak) {
      const p = String(Math.min(1.1, parseFloat(peak) || 1.1)); // marks swell a little, never out of their card
      (els || []).filter(Boolean).forEach((e, i) => {
        if (reduced() || !e.animate) return;
        e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center';
        try { e.animate([{ scale: '1', filter: 'brightness(1)' }, { scale: p, filter: 'brightness(1.12)', offset: 0.45 }, { scale: '1', filter: 'brightness(1)' }],
          { duration: 700, delay: i * 120, easing: 'ease-in-out' }); } catch (x) {}
      });
    },
    // a frame-by-frame tween (SVG attributes): fn(t) with t 0..1 over ms, after delay; stops when the screen changes
    tween(ms, delay, fn) {
      if (reduced()) { this.later(delay || 0, () => fn(1)); return; }
      const run = this.run;
      this.later(delay || 0, () => {
        let t0 = null;
        const step = (now) => { if (run !== this.run) return; if (t0 == null) t0 = now; const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    },
    // a warm stroke runs along each line and fades. It is a copy in the fx layer, mapped through the card's transform,
    // so the line itself is never changed
    trace(lines, together) {
      (lines || []).filter(Boolean).forEach((src, i) => {
        if (reduced()) return;
        const a = { x: +src.getAttribute('x1'), y: +src.getAttribute('y1') }, b = { x: +src.getAttribute('x2'), y: +src.getAttribute('y2') };
        const m = src.getCTM && this.svg.getCTM ? this.svg.getCTM().inverse().multiply(src.getCTM()) : null;
        const P = (p) => (m ? { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f } : p);
        const A2 = P(a), B2 = P(b), len = Math.hypot(B2.x - A2.x, B2.y - A2.y) || 1;
        // a clean gold marker running along the side (no blur; orange is angle A's colour)
        const ln = mk('line', { x1: A2.x, y1: A2.y, x2: B2.x, y2: B2.y, stroke: 'rgba(255, 184, 0, 0.9)', 'stroke-width': 9, 'stroke-linecap': 'round' }, this.fx);
        ln.style.strokeDasharray = len + ' ' + len;
        try {
          const an = ln.animate([{ strokeDashoffset: len + 'px', opacity: 1 }, { strokeDashoffset: '0px', opacity: 1, offset: 0.35 }, { strokeDashoffset: '0px', opacity: 0.55, offset: 0.55 }, { strokeDashoffset: '0px', opacity: 1, offset: 0.75 }, { strokeDashoffset: '0px', opacity: 0 }],
            { duration: 1700, delay: together ? 0 : i * 220, easing: 'ease-out', fill: 'both' });
          an.onfinish = () => ln.remove();
        } catch (e) { ln.remove(); }
      });
    },
    // grow a line from a to b over ms, after delay
    growLine(line, a, b, ms, delay) {
      const set = (t) => { line.setAttribute('x2', f1(a.x + (b.x - a.x) * t)); line.setAttribute('y2', f1(a.y + (b.y - a.y) * t)); };
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      if (reduced()) { set(1); line.setAttribute('opacity', 1); return; }
      set(0);
      const run = this.run;
      this.later(delay || 0, () => {
        line.setAttribute('opacity', 1);
        let t0 = null;
        const step = (now) => { if (run !== this.run) return; if (t0 == null) t0 = now; const t = Math.min(1, (now - t0) / ms); set(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    },

    // ---------- reveal a card's idea one part at a time, in the order a teacher would draw it. Returns the time in ms ----------
    reveal(g) {
      const V = g._c.visual || {}, P = g._P;
      let t = 0;
      const sides = ['DA', 'AB', 'BC', 'DC'];
      if (V.draw && !reduced()) { // the outline draws itself round D -> A -> B -> C -> D, then the fill comes in
        sides.forEach((s, i) => { const L = g._sides[s], ab = SIDES[s], from = s === 'DC' ? P.C : P[ab[0]], to = s === 'DC' ? P.D : P[ab[1]]; this.growLine(L, from, to, 150, i * 140); L.setAttribute('x1', from.x); L.setAttribute('y1', from.y); });
        this.later(80, () => this.sfx('draw'));
        g._dots.forEach((d, i) => this.pop(d, i * 140));
        this.later(560, () => { g._fill.setAttribute('opacity', 1); if (g._fill.animate && !reduced()) try { g._fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); } catch (e) {} });
        t = 680;
      } else {
        [g._fill].concat(sides.map((s) => g._sides[s]), g._dots).forEach((el) => el.setAttribute('opacity', 1));
        if (!reduced() && g._vis.animate) try { g._vis.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' }); } catch (e) {}
        t = 160;
      }
      if (V.chev) {
        const chv = (y, x) => 'M' + f1(x - 7) + ',' + (y - 5.5) + ' L' + f1(x - 1.5) + ',' + y + ' L' + f1(x - 7) + ',' + (y + 5.5) + ' M' + f1(x + 0.5) + ',' + (y - 5.5) + ' L' + f1(x + 6) + ',' + y + ' L' + f1(x + 0.5) + ',' + (y + 5.5);
        g._chev = [chv(TOP, (P.A.x + P.B.x) / 2), chv(BOT, (P.D.x + P.C.x) / 2)].map((d) =>
          mk('path', { d: d, fill: 'none', stroke: INK.chev, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0, style: 'filter: drop-shadow(0 0 1.5px #fff)' }, g._marks));
        g._chev.forEach((el, i) => this.pop(el, t + i * 120, true));
        this.later(t, () => this.sfx('pop')); t += 360;
      }
      if (V.lit) { // glow bands grow along the lit sides, under the side lines so their colour still shows
        g._lit = V.lit.map((s) => {
          const ab = SIDES[s], a = P[ab[0]], b = P[ab[1]];
          const band = mk('line', { x1: a.x, y1: a.y, x2: a.x, y2: a.y, stroke: '#ffc629', 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0 }, g._bands); // (gold reads on the cream fill too)
          this.growLine(band, a, b, 300, t);
          return g._sides[s];
        });
        this.later(t, () => this.sfx('draw')); t += 340;
      }
      if (V.wedges) { // each angle sweeps open at its corner, as in the lesson, then its value fades in
        g._wedges = []; g._values = [];
        V.wedges.forEach((k, i) => {
          const nb = { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[k], p = P[k], q = P[nb[0]], r = P[nb[1]];
          let a1 = Math.atan2(q.y - p.y, q.x - p.x), a2 = Math.atan2(r.y - p.y, r.x - p.x);
          let sweep = ((a2 - a1) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          if (sweep > Math.PI) { const t0 = a1; a1 = a2; a2 = t0; sweep = 2 * Math.PI - sweep; } // use the angle inside the shape
          const R = 22 * CONFIG.angleR(sweep * 180 / Math.PI) / 38; // the same amount of colour for every angle, as in the lesson
          const large = 0;
          const s = { x: p.x + Math.cos(a1) * R, y: p.y + Math.sin(a1) * R }, e = { x: p.x + Math.cos(a2) * R, y: p.y + Math.sin(a2) * R };
          const wg = mk('g', { opacity: 0 }, g._wedgeG); wg._p = p;
          const wd = (u) => { const b = a1 + sweep * u; return 'M' + p.x + ' ' + p.y + ' L' + f1(s.x) + ' ' + f1(s.y) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + f1(p.x + Math.cos(b) * R) + ' ' + f1(p.y + Math.sin(b) * R) + ' Z'; };
          const path = mk('path', { d: wd(0.001), fill: ANG[k], 'fill-opacity': 0.92 }, wg);
          g._wedges.push(wg);
          const deg = Math.round(sweep * 180 / Math.PI), mid = a1 + sweep / 2, dl = deg < 70 ? 44 : 36;
          const v = mk('text', { x: f1(p.x + Math.cos(mid) * dl), y: f1(p.y + Math.sin(mid) * dl + 4.5), 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900,
            'font-family': 'Nunito, system-ui, sans-serif', fill: TXT[k], stroke: '#fff', 'stroke-width': 3.2, 'paint-order': 'stroke', 'stroke-linejoin': 'round', opacity: 0, text: deg + '°' }, g._marks);
          g._values.push(v); v._k = k;
          this.later(t + i * 260, () => wg.setAttribute('opacity', 1));
          this.tween(420, t + i * 260, (u) => path.setAttribute('d', wd(Math.max(0.001, 1 - Math.pow(1 - u, 3)))));
          this.pop(v, t + i * 260 + 380);
          this.later(t + i * 260, () => this.sfx('tick'));
        });
        t += V.wedges.length * 260 + 260;
      }
      if (V.right) { // the right-angle squares
        g._right = V.right.map((k, i) => {
          const nb = { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[k], p = P[k], q = P[nb[0]], r = P[nb[1]], s = 13;
          const u = { x: (q.x - p.x) / Math.hypot(q.x - p.x, q.y - p.y), y: (q.y - p.y) / Math.hypot(q.x - p.x, q.y - p.y) };
          const v = { x: (r.x - p.x) / Math.hypot(r.x - p.x, r.y - p.y), y: (r.y - p.y) / Math.hypot(r.x - p.x, r.y - p.y) };
          const d = 'M' + f1(p.x) + ',' + f1(p.y) + ' L' + f1(p.x + u.x * s) + ',' + f1(p.y + u.y * s) + ' L' + f1(p.x + u.x * s + v.x * s) + ',' + f1(p.y + u.y * s + v.y * s) + ' L' + f1(p.x + v.x * s) + ',' + f1(p.y + v.y * s) + ' Z';
          const el = mk('path', { d: d, fill: '#ffd24a', 'fill-opacity': 0.9, stroke: '#b07a00', 'stroke-width': 1.6, 'stroke-linejoin': 'round', opacity: 0 }, g._wedgeG);
          this.pop(el, t + i * 200, true);
          return el;
        });
        this.later(t, () => this.sfx('tick')); t += V.right.length * 200 + 240;
      }
      if (V.ticks) { this.later(t, () => { this.marks(g, V.ticks); this.sfx('shimmer'); }); t += 80 * 6 + 380; }
      // move the corner dots to the top so nothing covers them
      g._dots.forEach((d) => g._vis.appendChild(d));
      return t;
    },
    // tick marks as in the lesson: 'all' gives sides of one length (within 6 units) the same count; 'legs' marks the equal legs
    marks(g, which) {
      const P = g._P, list = which === 'legs' ? ['DA', 'BC'] : ['AB', 'BC', 'DC', 'DA'];
      const len = (s) => { const ab = SIDES[s]; return Math.hypot(P[ab[1]].x - P[ab[0]].x, P[ab[1]].y - P[ab[0]].y); };
      const reps = [], count = list.map((s) => { const L = len(s); for (let k = 0; k < reps.length; k++) if (Math.abs(reps[k] - L) <= 6) return k + 1; reps.push(L); return reps.length; });
      g._ticks = [];
      list.forEach((s, i) => {
        const ab = SIDES[s], a = P[ab[0]], b = P[ab[1]], L = len(s) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy, ny = ux;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cnt = which === 'legs' ? 2 : count[i];
        for (let k = 0; k < cnt; k++) {
          const off = (k - (cnt - 1) / 2) * 6;
          g._ticks.push(mk('line', { x1: f1(mx + ux * off - nx * 7), y1: f1(my + uy * off - ny * 7), x2: f1(mx + ux * off + nx * 7), y2: f1(my + uy * off + ny * 7),
            stroke: INK.navy, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0, style: 'filter: drop-shadow(0 0 1.5px #fff)' }, g._marks));
        }
      });
      g._ticks.forEach((k, j) => this.pop(k, j * 80));
    },

    // ---------- word cues: highlight the part of the active card a spoken word names ('all' pulses every album card) ----------
    cue(kind) {
      const S = this.S, c = S && S.active ? S.cards[S.active] : null;
      if (kind === 'all') { this.warmPulse(S.collected.map((k) => S.cards[k]._pop), '1.05'); return; }
      if (!c) return;
      const sd = c._sides;
      if (kind === 'outline') this.trace([sd.DA, sd.AB, sd.BC, sd.DC]);
      else if (kind === 'pair') { this.trace([sd.AB, sd.DC], true); this.warmPulse(c._chev, '1.7'); } // both parallel sides at once
      else if (kind === 'chev') this.warmPulse(c._chev, '1.7');
      else if (kind === 'lit') this.trace(c._lit, true);
      else if (kind === 'legs') { this.trace([sd.DA, sd.BC], true); this.warmPulse(c._ticks, '1.5'); }
      else if (kind === 'side') this.trace([sd.DA]); // the side the two right angles share (they are adjacent)
      else if (kind === 'ticks') { this.warmPulse(c._ticks, '1.6'); if (c._c.visual.ticks === 'all') this.trace([sd.AB, sd.BC, sd.DC, sd.DA]); }
      else if (kind === 'right') this.warmPulse(c._right, '1.6');
      else if (kind === 'wedges') this.anglePulse(c);
      else if (kind === 'add') this.add(c);
      else if (kind === 'values') this.warmPulse(c._values, '1.5');
      else if (kind === 'sum') this.total(c);
      else if (kind === 'tag') this.warmPulse([c._tag], '1.05');
    },
    // "angles": each angle swells once from its own corner, one after the other
    anglePulse(c) {
      (c._wedges || []).forEach((wg, i) => {
        const p = wg._p; if (!p) return;
        this.tween(560, i * 300, (u) => {
          const k = 1 + 0.16 * Math.sin(Math.PI * u);
          if (u >= 1) wg.removeAttribute('transform'); else wg.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') scale(' + k.toFixed(3) + ') translate(' + -p.x + ' ' + -p.y + ')');
        });
      });
    },
    // "add": the two angle values fly from their corners down into a sum under the shape, one after the other, each
    // growing to the sum's size on the way; "+" joins after the first lands. total() completes it on "180".
    add(c) {
      if (!c._values || c._values.length < 2 || c._eq) return;
      const y = BOT + 40, fs = 19, gap = 7, font = 'Nunito, system-ui, sans-serif';
      const grp = mk('g', {}, c._marks);
      const part = (text, fill) => mk('text', { x: 0, y: y, 'font-size': fs, 'font-weight': 900, 'font-family': font, fill: fill, stroke: '#fff', 'stroke-width': 4,
        'paint-order': 'stroke', 'stroke-linejoin': 'round', opacity: 0, text: text }, grp);
      const v = c._values, val = (j) => v[j].textContent;
      const P = [part(val(0), TXT[v[0]._k] || INK.navy), part('+', INK.navy), part(val(1), TXT[v[1]._k] || INK.navy), part('=', INK.navy), part(180 + '°', '#e06600')];
      // one centred line: 120° + 60° = 180°
      const w = P.map((e) => { let n = 0; try { n = e.getComputedTextLength(); } catch (x) {} return n || e.textContent.length * fs * 0.55; });
      let x = SUM.card.cx - (w.reduce((a, b) => a + b, 0) + gap * (P.length - 1)) / 2;
      P.forEach((e, i) => { e.setAttribute('x', f1(x)); x += w[i] + gap; });
      const eq = c._eq = { parts: P, landed: 0, want: false };
      [0, 1].forEach((j) => {
        const src = v[j], slot = P[j * 2], sx = +src.getAttribute('x'), sy = +src.getAttribute('y'), tx = +slot.getAttribute('x') + w[j * 2] / 2;
        // a straight path that would pass the other value bends away from it
        const o = v[1 - j], ox = +o.getAttribute('x'), oy = +o.getAttribute('y'), dx = tx - sx, dy = y - sy, L = Math.hypot(dx, dy) || 1;
        const along = Math.max(0, Math.min(1, ((ox - sx) * dx + (oy - sy) * dy) / (L * L))), cx = sx + dx * along, cy = sy + dy * along;
        const miss = Math.hypot(ox - cx, oy - cy), bx = miss < 34 ? (cx - ox) / (miss || 1) * (34 - miss + 20) : 0, by = miss < 34 ? (cy - oy) / (miss || 1) * (34 - miss + 20) : 0;
        const fly = mk('text', { x: sx, y: sy, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, 'font-family': font, fill: slot.getAttribute('fill'),
          stroke: '#fff', 'stroke-width': 3.2, 'paint-order': 'stroke', 'stroke-linejoin': 'round', opacity: 0, text: val(j) }, c._marks);
        this.later(j * 420, () => { fly.setAttribute('opacity', 1); src.setAttribute('opacity', 0); this.sfx('tick'); }); // the number itself sets off
        this.tween(620, j * 420, (u) => {
          const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // ease in and out, along a small arc
          const arc = Math.sin(Math.PI * u);
          fly.setAttribute('x', f1(sx + (tx - sx) * e + bx * arc)); fly.setAttribute('y', f1(sy + (y - sy) * e - 18 * arc + by * arc));
          fly.setAttribute('font-size', f1(13 + (fs - 13) * e));
          if (u < 1) return;
          fly.remove(); slot.setAttribute('opacity', 1); eq.landed++;
          this.tween(300, 120, (q) => src.setAttribute('opacity', q)); // and its corner shows it again
          if (j === 0) this.tween(250, 0, (q) => P[1].setAttribute('opacity', q));
          if (eq.landed === 2 && eq.want) this.total(c);
        });
      });
    },
    // "180": once both values are in, "= 180°" joins the sum and the total gives one gentle beat
    total(c) {
      if (!c._eq) this.add(c);
      const eq = c._eq;
      if (!eq) return;
      if (eq.landed < 2) { eq.want = true; return; }
      if (eq.done) return;
      eq.done = true; this.sfx('chime');
      const [, , , eqs, tot] = eq.parts, y = +tot.getAttribute('y');
      this.tween(320, 0, (u) => { eqs.setAttribute('opacity', u); tot.setAttribute('opacity', u); tot.setAttribute('y', f1(y + 6 * (1 - u))); });
      this.tween(420, 360, (u) => tot.setAttribute('font-size', f1(19 * (1 + 0.1 * Math.sin(Math.PI * u)))));
    },

    // ---------- a card coming in, and going to the albums ----------
    // CARD_ENTER, then CONCEPT_REVEAL, then its name tag
    show(c) {
      const S = this.S, g = S.cards[c.id] || (S.cards[c.id] = this.card(c));
      S.active = c.id; this.setState('CARD_ENTER', c.id); this.sfx('whoosh');
      if (!reduced() && g._pop.animate) {
        g._pop.style.transformBox = 'fill-box'; g._pop.style.transformOrigin = 'center';
        try { g._pop.animate([{ opacity: 0, scale: '.96', translate: '0 16px' }, { opacity: 1, scale: '1', translate: '0 0' }], { duration: SUM.enterMs, easing: 'cubic-bezier(.22,1,.36,1)' }); } catch (e) {}
      }
      return this.hold(SUM.enterMs).then((ok) => {
        if (!ok) return false;
        this.setState('CONCEPT_REVEAL', c.id);
        return this.hold(this.reveal(g) + 60).then((ok2) => { if (!ok2) return false; this.pop(g._tag, 0); return this.hold(260); });
      });
    },
    // a collected card's slot: the first half go on the left, 2 x 2, the rest on the right
    slot(id) {
      const order = IDEAS.map((k) => k.id), i = Math.max(0, order.indexOf(id)), half = Math.ceil(order.length / 2) || 4;
      const col = i < half ? 0 : 1, k = col ? i - half : i;
      return { x: SUM.mini.x[col][k % 2], y: SUM.mini.y[Math.floor(k / 2)], col: col };
    },
    // CARD_COLLECT: the card shrinks along a small arc into its slot (now = jump straight there). Its shape is
    // zoomed up to SUM.mini.zoom so it still reads at album size
    collect(id, now) {
      const S = this.S, c = S.cards[id];
      if (!c || c._done) return Promise.resolve(true);
      c._done = true; if (S.active === id) S.active = null;
      this.setState('CARD_COLLECT', id);
      const r = c._rect, cx0 = r.x + r.w / 2, cy0 = r.y + r.h / 2, sl = this.slot(id), k = SUM.mini.w / r.w;
      const zoom = (e) => { const z = 1 + (SUM.mini.zoom - 1) * e, sx = 500, sy = (TOP + BOT) / 2; c._vis.setAttribute('transform', 'translate(' + sx + ',' + sy + ') scale(' + z.toFixed(4) + ') translate(' + (-sx) + ',' + (-sy) + ')'); };
      const land = () => {
        c.setAttribute('transform', 'translate(' + sl.x + ',' + sl.y + ') scale(' + k.toFixed(4) + ') translate(' + (-cx0) + ',' + (-cy0) + ')');
        c._slot = sl; zoom(1);
        const P0 = SUM.mini.plate;
        // the album plate centred on its small card's bottom edge
        c._mini = this.nameTag(this.layer, sl.x, sl.y + r.h * k / 2 + 1, c._c.label, c._c.tone, { h: P0.h, size: P0.size, w: P0.w, rim: P0.rim });
        if (!now) this.pop(c._mini, 0);
        if (S.collected.indexOf(id) < 0) S.collected.push(id);
        this.setState('NEXT_CONCEPT', id);
      };
      c._tag.setAttribute('opacity', 0);
      if (now || reduced()) { land(); return Promise.resolve(true); }
      this.sfx('whoosh');
      const run = this.run;
      return new Promise((resolve) => {
        let t0 = null;
        const step = (ts) => {
          if (run !== this.run || !this.live()) { resolve(false); return; }
          if (t0 == null) t0 = ts;
          const t = Math.min(1, (ts - t0) / SUM.collectMs), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, s = 1 + (k - 1) * e;
          zoom(e);
          const x = cx0 + (sl.x - cx0) * e, y = cy0 + (sl.y - cy0) * e - 40 * Math.sin(Math.PI * e);
          c.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + s.toFixed(4) + ') translate(' + (-cx0) + ',' + (-cy0) + ')');
          if (t < 1) { requestAnimationFrame(step); return; }
          land(); this.sfx('pop'); resolve(true);
        };
        requestAnimationFrame(step);
      });
    },
    // FINAL_SUMMARY: the album cards hop 16 px toward the middle, one after another
    gather() {
      const S = this.S;
      this.setState('FINAL_SUMMARY'); this.sfx('shimmer');
      S.collected.forEach((id, i) => {
        const c = S.cards[id], dx = c._slot && c._slot.col ? -16 : 16;
        this.later(reduced() ? 0 : i * 70, () => {
          [c, c._mini].forEach((el) => {
            if (!el) return;
            if (reduced() || !el.animate) { el.style.translate = dx + 'px 0'; return; }
            try {
              const hop = el.animate([{ translate: '0 0' }, { translate: (dx / 2) + 'px -12px', offset: 0.45 }, { translate: dx + 'px 0' }], { duration: 440, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'forwards' });
              hop.onfinish = () => { el.style.translate = dx + 'px 0'; hop.cancel(); };
            } catch (e) { el.style.translate = dx + 'px 0'; }
          });
        });
      });
      return this.hold(S.collected.length * 70 + 460);
    },

    // ---------- READY: the cards become tappable; left alone, the lesson moves on ----------
    ready() {
      const S = this.S;
      this.setState('READY');
      S.collected.forEach((id) => S.cards[id].classList.add('tappable'));
      this.moveOnLater();
    },
    // the lesson moves on once a moment passes with no card being replayed (a replay restarts the wait)
    moveOnLater() {
      const eng = this.eng;
      this.later(SUM.readyMs, () => { if (!this.busy && this.S && this.S.state === 'READY') eng.maybeAdvance(false); });
    },
    // a tapped card: dim the others to 42 %, redraw its idea, say its line again, then back to READY.
    // busy blocks other taps until it is done
    replay(id) {
      const S = this.S;
      if (!S || this.busy || S.state !== 'READY' || !S.cards[id]) return Promise.resolve(false);
      this.busy = true;
      const c = S.cards[id], live = this.live;
      this.eng.sfx('tap');
      this.setState('CARD_SELECTED', id);
      S.collected.forEach((k) => { const o = k === id ? '' : '.42'; [S.cards[k], S.cards[k]._mini].forEach((el) => { el.style.transition = 'opacity 240ms ease'; el.style.opacity = o; }); });
      if (!reduced() && c._pop.animate) { try { c._pop.animate([{ scale: '1' }, { scale: '1.04', offset: 0.45 }, { scale: '1' }], { duration: 360, easing: 'ease-in-out' }); } catch (e) {} }
      this.setState('REPLAY_EXPLANATION', id);
      // reset the card to its starting state so reveal() can draw it again
      [c._bands, c._wedgeG, c._marks].forEach((el) => { while (el.firstChild) el.removeChild(el.firstChild); });
      c._chev = c._lit = c._wedges = c._values = c._right = c._ticks = c._eq = null;
      [c._fill].concat(Object.keys(c._sides).map((s) => c._sides[s]), c._dots).forEach((el) => el.setAttribute('opacity', 0));
      S.active = id;
      const ms = this.reveal(c);
      return this.hold(ms + 200).then((ok) => ok && this.say(c._c)).then((ok) => {
        if (!live()) return false;
        this.hush(); S.active = null; this.eng.pose('happy');
        S.collected.forEach((k) => { [S.cards[k], S.cards[k]._mini].forEach((el) => { el.style.opacity = ''; }); });
        this.busy = false; this.setState('READY'); this.moveOnLater(); return ok;
      });
    }
  };
  window.Summary = Summary;
})();
