// =====================================================================
// FISHING FRENZY - the journey (index.html at the root).
// One front page (the Fishing Frenzy banner, alive, and Play: shell/front-page.js), then the parts, each a whole
// game in its own frame (parts/*/index.html; each loads shell/bridge.js):
//   1. fishing-1  Popo's shape fishing: triangles, pentagons, hexagons, quadrilaterals. Then a fish he has never
//                 seen leaps out ("What kind of fish was that?") and Swiftee flies in: "Let's find out!" - Next
//   2. fishing-2  Popo rows in, and the seashell on the sand rattles and opens: its pearl blows a bubble up, out
//                 springs a big card, and the trapezium lesson plays inside it (parts/lesson: what makes a trapezium,
//                 its bases and legs, its types, its angles, a recap and five checks). The lesson is a part of its
//                 own, in its own frame, which the shell lays over the card. Then the card closes, Swiftee swoops in
//                 ("Great job! You know all about trapeziums!") and Popo catches trapezium fish in five levels, to
//                 "The End" - Next
// and then the front page again, ready to play again.
//
// Sound: browsers allow it only after a tap. The Play tap unlocks one AudioContext, one <audio> element and the
// speech voice in this page, and every part plays through them (bridge.js), so no part needs a tap of its own.
// Loading: while a part plays, the others load behind it, unseen, and begin the moment they are called.
// Between two parts Swiftee carries the learner across, on camera: she flies off in the part that ends (out of the
// top left of the lake; out of the right of the lesson), the next part begins underneath and the two scenes
// dissolve into each other with a little snow blowing across, and she flies in on the other side (into the lesson
// from the top left; into the lake from the right). Only if the next part has not loaded yet does a frosted veil
// say "Getting ready…" until it has.
//
// URL options: ?start=fishing-2 begins the first journey there (Popo rows in, the lesson's card rises), ?start=lesson
// straight at the lesson's open card; ?dev=1 adds one panel that jumps
// to any screen of the journey (each part's own jumps, the lesson's 42 screens, the front page); ?debug passes on
// to the parts (window.popoDebug in the fishing games). Every step is announced as a window event
// ('fishing-frenzy:part', ':finished', ':complete') and posted to a page that hosts the journey in a frame.
// =====================================================================
(function () {
  'use strict';

  const PARTS = [
    { id: 'fishing-1', src: 'parts/fishing-1/index.html', title: "Popo's shape fishing" },
    { id: 'lesson', src: 'parts/lesson/index.html', title: "Swiftee's trapezium lesson", inset: true }, // inside fishing 2's card
    { id: 'fishing-2', src: 'parts/fishing-2/index.html', title: "Popo's trapezium fishing" },
  ];
  // times in ms
  const T = {
    coverLeave: 900,     // the cover zooms away (css .leaving), then is hidden
    takeOff: 150,        // a part ends: a breath on its empty lake before the cross-fade
    dissolve: 450,       // the two lakes cross-fade (the giant wave carries Popo between them: the games' waveAway / waveIn)
    veil: 350,           // the frosted "Getting ready…" veil fades in or out (css .veil)
    waitNote: 400,       // waiting longer than this for the next part shows "Getting ready…"
    preloadAfter: 2500,  // a part has begun: this long after, the next one starts loading behind it
    stall: 45000,        // no word from a loading part for this long: Try again
    backIn: 250,         // the journey's end: the front page comes back this long after fishing 2's iris shuts
  };
  const params = new URLSearchParams(location.search);
  const DEV = params.get('dev') === '1';
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (id) => document.getElementById(id);
  const idx = (id) => PARTS.findIndex((p) => p.id === id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- sound: unlocked once, by the Play tap, and shared by every part ----------
  // 60 ms of silence: playing it inside the tap unlocks the <audio> element for every clip after it
  const SILENT = 'data:audio/wav;base64,UklGRgQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YeABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=';
  const audio = {
    ctx: null,
    outs: new Map(),
    el: (() => { try { const a = new Audio(); a.preload = 'auto'; return a; } catch (e) { return null; } })(),
    // the fishing games' Sound button keeps its choice here; the journey's own few sounds follow it
    muted() { try { return localStorage.getItem('popo-muted') === '1'; } catch (e) { return false; } },
    // inside a tap (Play, or a dev jump)
    unlock() {
      const AC = window.AudioContext || window.webkitAudioContext;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older WebKit */ }
      if (AC && !this.ctx) { try { this.ctx = new AC(); } catch (e) { this.ctx = null; } }
      if (this.ctx) {
        try { this.ctx.resume(); } catch (e) { /* resumes later */ }
        try {
          const src = this.ctx.createBufferSource();
          src.buffer = this.ctx.createBuffer(1, 1, 22050);
          src.connect(this.ctx.destination);
          src.start(0);
        } catch (e) { /* nothing to play */ }
      }
      const el = this.el;
      if (el && !this.elUnlocked && el.paused) { // (never over a voice clip that is playing)
        this.elUnlocked = true;
        try {
          el.src = SILENT;
          const p = el.play();
          // refused: the next tap tries again (an abort means a voice clip took over, so it is unlocked)
          if (p && p.then) p.then(() => { if (el.src === SILENT) el.pause(); }, (err) => { if (err && err.name === 'NotAllowedError') this.elUnlocked = false; });
        } catch (e) { this.elUnlocked = false; }
      }
      const s = window.speechSynthesis;
      if (s && !this.speechUnlocked && typeof SpeechSynthesisUtterance !== 'undefined') {
        this.speechUnlocked = true;
        try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u); } catch (e) { /* no voice */ }
      }
    },
    resume() { if (this.ctx && this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) { /* later */ } } },
    // what the parts ask for (bridge.js)
    context() { return this.ctx; },
    output(part) {
      if (!this.ctx) return null;
      let g = this.outs.get(part);
      if (!g) { g = this.ctx.createGain(); g.connect(this.ctx.destination); this.outs.set(part, g); }
      return g;
    },
    voiceElement() { return this.el; },
    speech() {
      return window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined'
        ? { synth: window.speechSynthesis, Utterance: SpeechSynthesisUtterance } : null;
    },
    // a part's scene dissolves away: its sound fades with it
    fade(part, ms) {
      const g = this.outs.get(part);
      if (g) { try { g.gain.setTargetAtTime(0, this.ctx.currentTime, Math.max(0.05, ms / 3000)); } catch (e) { /* closed */ } }
    },
    // a part leaves: its sound fades out and is cut off; the lesson's voice stops
    release(part) {
      const g = this.outs.get(part);
      if (g) {
        this.outs.delete(part);
        try { g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08); } catch (e) { /* closed */ }
        setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 600);
      }
      if (part === 'lesson') {
        const el = this.el;
        if (el) { try { el.pause(); } catch (e) { /* idle */ } el.onended = el.onerror = el.onplaying = null; }
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* no voice */ }
      }
    },
    // the front page's sounds, as fishing 2's title plays them (its audio.js: bloop on hover; splashSmall and cheer on Play)
    tone(o) {
      const c = this.ctx, start = o.t != null ? o.t : c.currentTime, dur = o.dur || 0.2;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq, start);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(o.gain || 0.2, start + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(start); osc.stop(start + dur + 0.05);
    },
    noise(o) {
      const c = this.ctx, start = c.currentTime, dur = o.dur || 0.3;
      if (!this.noiseBuf) {
        this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf;
      f.type = o.type || 'lowpass';
      f.frequency.setValueAtTime(o.freq || 1000, start);
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(o.gain || 0.3, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(start); src.stop(start + dur + 0.05);
    },
    play(kind) {
      if (!this.ctx || this.muted()) return;
      try {
        const now = this.ctx.currentTime;
        if (kind === 'bloop') { this.tone({ freq: 420, to: 980, dur: 0.12, gain: 0.09 }); this.tone({ freq: 620, to: 1300, t: now + 0.08, dur: 0.09, gain: 0.05 }); }
        if (kind === 'splash') { this.noise({ dur: 0.26, type: 'lowpass', freq: 1800, to: 500, gain: 0.3 }); this.tone({ freq: 900, to: 320, dur: 0.14, gain: 0.1 }); }
        if (kind === 'cheer') [523.25, 659.25, 783.99].forEach((n, i) => this.tone({ freq: n, t: now + i * 0.07, type: 'triangle', dur: 0.16, gain: 0.08 }));
      } catch (e) { /* no sound */ }
    },
  };

  // ---------- the parts' frames ----------
  const frames = new Map(); // part id -> { id, index, el, status: loading | ready | failed, progress, waiters }
  function partUrl(p) {
    const u = new URL(p.src, location.href);
    u.searchParams.set('embed', '1');
    ['dev', 'debug'].forEach((k) => { if (params.has(k)) u.searchParams.set(k, params.get(k) || '1'); });
    return u.href;
  }
  // start loading part `index` behind everything (once)
  function load(index) {
    const p = PARTS[index];
    let f = frames.get(p.id);
    if (f) return f;
    const el = document.createElement('iframe');
    el.className = 'part';
    el.title = p.title;
    el.setAttribute('allow', 'autoplay; fullscreen');
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    f = { id: p.id, index, el, inset: !!p.inset, status: 'loading', progress: 0, waiters: [], heard: Date.now() };
    frames.set(p.id, f);
    el.src = partUrl(p);
    $('parts').appendChild(el);
    f.watch = setInterval(() => { if (f.status === 'loading' && Date.now() - f.heard > T.stall) fail(f, 'no answer'); }, 2000);
    return f;
  }
  // fn(frame) once the part is ready (a retried part passes its new frame)
  function when(f, fn) { if (f.status === 'ready') fn(f); else f.waiters.push(fn); }
  function ready(f) {
    if (f.status === 'ready') return;
    f.status = 'ready'; f.progress = 1;
    clearInterval(f.watch);
    f.waiters.splice(0).forEach((fn) => fn(f));
    status.update();
    dev.update();
  }
  function fail(f, why) {
    if (f.status !== 'loading') return;
    f.status = 'failed'; f.why = why;
    clearInterval(f.watch);
    status.update();
  }
  function retry(f) {
    const waiters = f.waiters.splice(0);
    drop(f);
    const g = load(f.index);
    g.waiters.push(...waiters);
    if (J.inset === f) { J.inset = g; g.el.classList.add('inset'); g.el.style.cssText = f.el.style.cssText; }
    status.swap(f, g);
  }
  function drop(f) {
    clearInterval(f.watch);
    if (frames.get(f.id) === f) frames.delete(f.id);
    f.el.remove();
    dev.forget(f);
  }
  // the shell -> a part: begin or dispose (direct where its page can be reached, else a message)
  function tell(f, type, opts) {
    try {
      const J = f.el.contentWindow && f.el.contentWindow.Journey;
      if (J && J['_' + type]) { J['_' + type](opts); return; }
    } catch (e) { /* file://: messages only */ }
    try { f.el.contentWindow.postMessage({ journey: true, type, opts }, '*'); } catch (e) { /* gone */ }
  }
  // a part -> the shell (bridge.js): ready, progress, failed, finish
  function fromPart(id, type, detail, win) {
    const f = frames.get(id);
    if (!f || (win && win !== f.el.contentWindow)) return;
    f.heard = Date.now();
    try {
      if (type === 'ready') ready(f);
      else if (type === 'progress') { f.progress = Math.max(f.progress, Math.min(1, +detail || 0)); status.update(); }
      else if (type === 'failed') fail(f, detail);
      else if (type === 'finish') finish(f, detail);
      else if (type === 'card') card(f, detail);
      else if (type === 'devScreens') dev.register(id, (detail || []).map((label, i) => ({ label, run: () => tell(f, 'command', { name: 'devJump', args: i }) })), win); // (from disk: by message)
    } catch (err) { console.error(err); }
  }
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m && m.journey === true && m.part) fromPart(m.part, m.type, m.detail, e.source);
  });

  // ---------- the journey ----------
  const J = {
    phase: 'cover', // cover | starting | playing | switching | ending
    current: null, // the part playing
    inset: null, // the lesson, while it plays inside fishing 2's card
    runs: 0,
    results: {},
  };
  function announce(kind, detail) {
    try { window.dispatchEvent(new CustomEvent('fishing-frenzy:' + kind, { detail })); } catch (e) { /* old browser */ }
    if (window.parent !== window) {
      try { window.parent.postMessage(Object.assign({ type: 'fishing-frenzy:' + kind }, detail), '*'); } catch (e) { /* gone */ }
    }
  }
  // Part f plays: f shows and begins, and the other parts load behind it. The one before it goes at once, unless the
  // two scenes are to dissolve into each other (opts.dissolve: switchTo removes it). opts.arrive: f follows the part
  // before it, so Swiftee flies in; opts.lesson: fishing 2 opens with the lesson's card; opts.lessonNow: straight to it.
  function begin(f, opts) {
    opts = opts || {};
    const prev = J.current;
    J.current = f;
    J.phase = 'playing';
    if (prev && prev !== f && !opts.dissolve) dispose(prev);
    audio.resume();
    f.el.classList.add('live');
    f.el.removeAttribute('aria-hidden');
    f.el.tabIndex = 0;
    tell(f, 'begin', { arrive: !!opts.arrive, lesson: !!opts.lesson, lessonNow: !!opts.lessonNow });
    try { f.el.focus({ preventScroll: true }); f.el.contentWindow.focus(); } catch (e) { /* file:// */ }
    announce('part', { part: f.id, number: f.index + 1, of: PARTS.length });
    dev.update();
    // the other parts load behind it, in order: fishing 2 and the lesson while fishing 1 plays, fishing 1 again while
    // fishing 2 plays (for Play again); the lesson not again once it has played, unless the dev panel needs it
    PARTS.forEach((p, i) => {
      if (i === f.index) return;
      setTimeout(() => { if (J.current === f && !frames.has(p.id) && !(p.inset && J.results[p.id] && !DEV)) load(i); }, T.preloadAfter + i * 1200);
    });
  }
  function dispose(f) {
    if (J.inset && !f.inset) hideLesson(); // the lesson in its card goes with the game it sits in
    tell(f, 'dispose');
    audio.release(f.id);
    f.el.classList.remove('live', 'in');
    setTimeout(() => {
      drop(f);
      if (DEV) setTimeout(() => load(f.index), 1500); // the dev panel keeps every part's screens
    }, 80);
  }
  function finish(f, detail) {
    if (f.inset) { lessonFinished(f, detail); return; }
    if (f !== J.current || J.phase !== 'playing') return;
    J.results[f.id] = detail || {};
    announce('finished', { part: f.id, detail: detail || {} });
    if (f.id === 'fishing-1') switchTo(load(idx('fishing-2')), { lesson: true });
    else end(f);
  }

  // ---------- the lesson, inside fishing 2's card ----------
  // fishing 2: the lesson's card is up at rect (CSS px; its frame fills the window, so the page's too), or gone
  function card(f, rect) {
    if (f !== J.current) return;
    if (rect) showLesson(rect); else hideLesson();
  }
  function placeInset(L, rect) {
    const s = L.el.style;
    s.left = rect.x + 'px'; s.top = rect.y + 'px'; s.width = rect.w + 'px'; s.height = rect.h + 'px'; s.borderRadius = rect.radius + 'px';
  }
  // The lesson's frame goes over the card and the lesson begins, once it has loaded (a frosted "Getting ready…"
  // waits for it otherwise). Called again when the window changes: the card has moved, and the frame follows it.
  function showLesson(rect) {
    const L = load(idx('lesson'));
    L.el.classList.add('inset');
    L.el.removeAttribute('aria-hidden');
    L.el.tabIndex = 0;
    placeInset(L, rect);
    if (J.inset === L) return;
    J.inset = L;
    if (L.status !== 'ready') { veil.open(); status.show(L, 'veil'); }
    when(L, (g) => {
      if (J.inset !== g) return;
      status.hide();
      veil.close();
      audio.resume();
      // (a ?dev=1 jump to a lesson screen skips Swiftee's flight in: its start() would land on screen 1 after the jump)
      tell(g, 'begin', { arrive: dev.lessonScreen == null, card: true });
      g.el.classList.add('in');
      try { g.el.focus({ preventScroll: true }); g.el.contentWindow.focus(); } catch (e) { /* file:// */ }
      announce('part', { part: g.id, number: g.index + 1, of: PARTS.length, inset: true });
      dev.update();
      dev.lessonShown(g);
    });
  }
  // the lesson fades out of the card; its frame goes once it has
  function hideLesson() {
    const L = J.inset;
    if (!L) return;
    J.inset = null;
    L.el.classList.remove('in');
    status.hide();
    veil.close();
    setTimeout(() => dispose(L), 450);
  }
  // the lesson is over (its last check done, Swiftee flown out): fishing 2 closes the card and carries on
  function lessonFinished(f, detail) {
    if (f !== J.inset) return;
    J.results[f.id] = detail || {};
    announce('finished', { part: f.id, detail: detail || {} });
    if (J.current && J.current.id === 'fishing-2') tell(J.current, 'command', { name: 'lessonDone' });
    hideLesson();
  }
  // One part to the next, on camera: Swiftee takes off in the part that ends (it starts that itself as it finishes),
  // the next part begins underneath (with Swiftee flying in), and the ending part's scene dissolves into it, with a
  // little snow blowing across. If the next part hasn't loaded yet, a frosted veil says so until it has.
  async function switchTo(next, opts) {
    const prev = J.current;
    J.phase = 'switching';
    audio.resume();
    await wait(reduced ? 0 : T.takeOff);
    if (next.status !== 'ready') {
      veil.open();
      const note = setTimeout(() => status.show(next, 'veil'), T.waitNote);
      next = await new Promise((r) => when(next, r));
      clearTimeout(note);
      status.hide();
    }
    if (J.phase !== 'switching') return; // (a dev jump took over)
    begin(next, Object.assign({ arrive: true, dissolve: true }, opts || {}));
    // the giant wave has just carried Popo out of fishing 1's lake and is about to bring him into fishing 2's (the
    // games' waveAway / waveIn), so the two empty lakes simply cross-fade
    next.el.classList.add('arriving');
    audio.fade(prev.id, T.dissolve);
    prev.el.classList.add('leaving'); // on top of the next part, fading away
    veil.close();
    await wait(reduced ? 350 : T.dissolve);
    next.el.classList.remove('arriving');
    if (J.current === next) dispose(prev);
  }
  // fishing 2 has shut its iris on "The End": the front page comes back over it, ready to play again
  function end(f) {
    J.phase = 'ending';
    announce('complete', { results: J.results });
    setTimeout(() => {
      if (J.phase !== 'ending') return;
      J.current = null;
      showCover(true);
      setTimeout(() => dispose(f), 800);
    }, T.backIn);
  }

  // ---------- the front page: the Fishing Frenzy title (shell/front-page.js) ----------
  function showCover(back) {
    J.phase = 'cover';
    FrontPage.show(back);
    dev.update();
  }
  function hideCover(animated) {
    if (!FrontPage.shown) return;
    if (animated) { FrontPage.leave(); return; }
    FrontPage.app.hidden = true;
    FrontPage.running = false;
  }
  // on a phone or tablet, Play also goes full screen in landscape where the browser allows it
  function fullScreen() {
    const el = document.documentElement, request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request || document.fullscreenElement || !(window.matchMedia && matchMedia('(pointer: coarse)').matches)) return;
    try {
      Promise.resolve(request.call(el, { navigationUI: 'hide' }))
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
        .catch(() => { /* not allowed here: every part still fits the screen */ });
    } catch (e) { /* not allowed here */ }
  }
  function play() {
    if (J.phase !== 'cover') return;
    audio.unlock(); // inside the tap
    fullScreen();
    J.phase = 'starting';
    J.runs += 1;
    if (J.runs > 1) J.results = {};
    // ?start: the first journey may begin at fishing 2 (Popo rows in and the lesson's card rises), or straight at the
    // lesson's open card
    const start = J.runs === 1 ? params.get('start') : null;
    const f = load(start === 'fishing-2' || start === 'lesson' ? idx('fishing-2') : 0);
    if (f.status !== 'ready') {
      FrontPage.waiting(true);
      status.show(f, 'cover');
    }
    when(f, (g) => {
      if (J.phase !== 'starting') return;
      status.hide();
      // the title fades away over fishing 1, which begins beneath it (as fishing 2's title fades into its game)
      begin(g, start === 'lesson' ? { lessonNow: true } : start === 'fishing-2' ? { lesson: true } : {});
      hideCover(true);
    });
  }
  FrontPage.init({ onPlay: play, sound: (kind) => audio.play(kind) });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // Safari: no pinch zoom
  // Brave and Safari can suspend audio when the tab loses focus; a tap on the page brings it back
  ['pointerdown', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, () => audio.resume(), true));

  // ---------- "Getting ready…": on the front page after an early Play, or on the veil ----------
  const status = {
    f: null, where: null,
    show(f, where) { this.f = f; this.where = where; this.update(); },
    hide() { this.f = null; this.update(); },
    swap(from, to) { if (this.f === from) { this.f = to; } this.update(); },
    update() {
      const f = this.f;
      [['cover', $('cover-status')], ['veil', $('veil-status')]].forEach(([where, el]) => {
        const on = !!f && this.where === where;
        el.hidden = !on;
        if (!on) return;
        const failed = f.status === 'failed';
        el.querySelector('.status-text').textContent = failed ? 'Could not load the game.' : 'Getting ready…';
        const bar = el.querySelector('.bar');
        bar.hidden = failed;
        bar.classList.toggle('unknown', !(f.progress > 0));
        bar.style.setProperty('--p', f.progress);
        el.querySelector('.retry').hidden = !failed;
      });
    },
  };
  document.querySelectorAll('.status .retry').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (status.f && status.f.status === 'failed') retry(status.f);
  }));

  // ---------- between two parts ----------
  // The frosted veil: only while the next part is still loading ("Getting ready…" on it).
  const veil = {
    el: $('veil'),
    open() { this.el.classList.add('on'); },
    close() { this.el.classList.remove('on'); },
    hide() { this.close(); },
  };


  // ---------- ?dev=1: one panel that jumps to any screen of the journey ----------
  const dev = {
    lists: new Map(), // part id -> { f, list: [{ label, run }] } (from each part's own jumps, bridge.js devScreens)
    el: null,
    register(id, list, win) {
      const f = frames.get(id);
      if (!DEV || !f || (win && win !== f.el.contentWindow)) return;
      this.lists.set(id, { f, list: list || [] });
      this.renderPart(id);
    },
    forget(f) { const e = this.lists.get(f.id); if (e && e.f === f) { this.lists.delete(f.id); this.renderPart(f.id); } this.update(); },
    // jump to screen `i` of part `index` (inside the tap, so sound is unlocked too)
    jump(index, i) {
      if (PARTS[index].inset) { this.jumpLesson(i); return; }
      audio.unlock();
      const f = load(index);
      J.phase = 'starting';
      status.hide();
      when(f, (g) => {
        veil.hide();
        hideCover(false);
        if (J.current !== g) begin(g);
        J.phase = 'playing';
        const e = this.lists.get(g.id);
        if (e && e.list[i]) setTimeout(() => { try { e.list[i].run(); } catch (err) { console.error(err); } }, 120);
      });
    },
    // a lesson screen: the lesson plays in fishing 2's card, so fishing 2 goes straight to its open card (lessonNow),
    // the lesson shows in it, and then the screen
    jumpLesson(i) {
      audio.unlock();
      this.lessonScreen = i;
      if (J.inset && J.inset.status === 'ready' && J.inset.el.classList.contains('in')) { this.lessonShown(J.inset); return; }
      const f = load(idx('fishing-2'));
      J.phase = 'starting';
      status.hide();
      when(f, (g) => {
        veil.hide();
        hideCover(false);
        if (J.current !== g) begin(g, { lessonNow: true }); else tell(g, 'command', { name: 'lessonNow' });
        J.phase = 'playing';
      });
    },
    lessonShown(g) {
      const i = this.lessonScreen, e = this.lists.get(g.id);
      this.lessonScreen = null;
      if (i == null || !e || !e.list[i]) return;
      setTimeout(() => { try { e.list[i].run(); } catch (err) { console.error(err); } }, 150);
    },
    frontPage() {
      const f = J.current;
      J.current = null;
      veil.hide();
      showCover(false);
      if (f) dispose(f);
    },
    build() {
      if (!DEV) return;
      const css = document.createElement('style');
      css.textContent = `
.dev{position:fixed;left:8px;bottom:8px;z-index:90;max-width:min(620px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;
  padding:6px;border-radius:10px;background:rgba(10,20,40,.88);font:600 12px/1.2 system-ui,sans-serif;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.dev.folded .dev-body{display:none}
.dev-tag{display:inline-block;padding:5px 8px;border-radius:6px;color:#ffd23f;cursor:pointer;background:none;border:0;font:inherit;font-weight:800}
.dev-part{margin-top:6px}
.dev-part h3{margin:4px 2px;font:800 12px/1.2 system-ui,sans-serif;color:#9fd1f5;display:flex;gap:8px;align-items:center}
.dev-part h3 small{font-weight:600;color:#aab}
.dev-part.now h3{color:#ffd23f}
.dev-btns{display:flex;flex-wrap:wrap;gap:4px}
.dev button.j{font:inherit;padding:5px 7px;border:0;border-radius:6px;background:#2f4f7f;color:#fff;cursor:pointer;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.dev button.j:hover{background:#3f6aa8}
.dev button.j.home{background:#7a4f10}`;
      document.head.appendChild(css);
      const el = this.el = document.createElement('div');
      el.className = 'dev folded';
      el.setAttribute('aria-label', 'Developer screen jumps');
      el.innerHTML = '<button class="dev-tag" type="button" title="Fold or unfold (`)">DEV · screens</button><div class="dev-body"></div>';
      el.querySelector('.dev-tag').addEventListener('click', () => el.classList.toggle('folded'));
      document.body.appendChild(el);
      document.addEventListener('keydown', (e) => { if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) el.classList.toggle('folded'); });
      // every part loads now, so every list is here from the start
      PARTS.forEach((p, i) => load(i));
      this.render();
    },
    // the panel's skeleton once (Front page, then a section per part); each part's buttons on their own, as its
    // screens come in (so a part reloading never rebuilds the others' buttons under a tap)
    render() {
      if (!this.el) return;
      const body = this.el.querySelector('.dev-body');
      const front = document.createElement('div');
      front.className = 'dev-part';
      front.innerHTML = '<div class="dev-btns"><button class="j home" type="button">Front page</button></div>';
      front.querySelector('button').addEventListener('click', () => this.frontPage());
      body.appendChild(front);
      PARTS.forEach((p, index) => {
        const sec = document.createElement('div');
        sec.className = 'dev-part';
        sec.dataset.part = p.id;
        const h = document.createElement('h3');
        h.innerHTML = (index + 1) + ' · ' + p.title + ' <small></small>';
        sec.appendChild(h);
        const btns = document.createElement('div');
        btns.className = 'dev-btns';
        sec.appendChild(btns);
        body.appendChild(sec);
        this.renderPart(p.id);
      });
      this.update();
    },
    renderPart(id) {
      const btns = this.el && this.el.querySelector('.dev-part[data-part="' + id + '"] .dev-btns');
      if (!btns) return;
      const index = idx(id), e = this.lists.get(id), list = e ? e.list : [];
      btns.innerHTML = '';
      if (!list.length) { btns.innerHTML = '<small style="color:#aab;padding:2px">loading…</small>'; return; }
      list.forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'j'; b.textContent = s.label; b.title = s.label;
        b.addEventListener('click', (ev) => { ev.stopPropagation(); this.jump(index, i); });
        btns.appendChild(b);
      });
    },
    update() {
      if (!this.el) return;
      this.el.querySelectorAll('.dev-part[data-part]').forEach((sec) => {
        const f = frames.get(sec.dataset.part);
        sec.classList.toggle('now', (!!J.current && J.current.id === sec.dataset.part) || (!!J.inset && J.inset.id === sec.dataset.part));
        sec.querySelector('small').textContent = !f ? '' : J.current === f ? 'playing' : J.inset === f ? 'in the card' : f.status;
      });
    },
  };

  // what the parts reach (bridge.js), and what tests and a hosting page may read
  window.FishingFrenzy = {
    parts: PARTS.map((p) => p.id),
    audio,
    fromPart,
    devScreens: (id, list, win) => dev.register(id, list, win),
    get phase() { return J.phase; },
    get current() { return J.current ? J.current.id : null; },
    get inset() { return J.inset ? J.inset.id : null; },
    get results() { return J.results; },
    frame: (id) => (frames.get(id) || {}).el || null,
    status: (id) => (frames.get(id) || {}).status || null,
  };

  // the front page shows at once; the first part loads behind it (with ?start, fishing 2, and the lesson for its card)
  showCover(false);
  dev.build();
  const startAt = params.get('start');
  load(startAt === 'fishing-2' || startAt === 'lesson' ? idx('fishing-2') : 0);
  if (startAt === 'fishing-2' || startAt === 'lesson') setTimeout(() => load(idx('lesson')), 800);
})();
