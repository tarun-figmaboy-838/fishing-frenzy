// =====================================================================
// GAME ENGINE: state, narration, geometry, interactions and render values.
// Loads after js/vendor/dc-runtime.js (which provides DCLogic) and the data files.
// index.html binds to the values returned by renderVals().
// =====================================================================
// the lesson's vocabulary: shown in orange in Swiftee's bubble (a word, cleaned of punctuation, in lower case)
// Inside the journey (shell/bridge.js, index.html at the root) the lesson plays on the card that rises from the
// seashell at the start of fishing 2, in its own frame laid over the card: the journey's front page comes before
// it, so it has none of its own; it stops after the last check (its goodbye and "The End" would cut into the
// fishing that follows), and that check done, it hands over and the card closes.
// (Without a page - the headless test - there is no journey.)
const JOURNEY = typeof window !== 'undefined' && window.Journey && window.Journey.embedded ? window.Journey : null;
const KEY_WORDS = /^(polygon|quadrilaterals?|trapeziums?|parallel|bases?|legs?|sides?|scalene|isosceles|right|angled|adjacent|angles?|supplementary|vertex|vertices|equal|same|different|meet|180°|90°)$/;
window.TrapeziumGame = class TrapeziumGame extends DCLogic {
  constructor(props) {
    super(props);
    this.T = new Set();
    this.stepTok = 0;
    this.narrTok = 0;
    this.snaps = {};
    this.drag = null;
    this.ld = null;
    // (in the journey the lesson waits unseen with its scene only: no line yet, and Swiftee flies in when it begins)
    this.state = Object.assign(this.fresh(false), { arriving: !!JOURNEY });
  }

  // ---------- data ----------
  get S() { return CONFIG.pxPerCm; }
  initP() {
    const S = this.S, c = CONFIG.start, H = c.height, yb = c.baseY, yt = yb - H;
    const ax = c.D + Math.sqrt((c.legAD * S) * (c.legAD * S) - H * H);
    const bx = c.C - Math.sqrt((c.legBC * S) * (c.legBC * S) - H * H);
    return { A: { x: ax, y: yt }, B: { x: bx, y: yt }, C: { x: c.C, y: yb }, D: { x: c.D, y: yb } };
  }
  fresh(started) {
    return {
      started: started, step: 0, P: this.initP(),
      line: JOURNEY ? '' : "Hi! Ready to explore a new shape with me?", reveal: 99, talking: false, bub: 'bubA',
      muted: this.state ? this.state.muted : false, done: true,
      ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, chips: [],
      moved: false, dragging: null, picks: {}, cfuFirst: true, results: {},
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false },
      hand: null, bubOff: false, centered: false, glow: null, callout: null, emph: {}
    };
  }
  steps() { return this.stepList || (this.stepList = JOURNEY ? LESSON.steps.filter((st) => !st.end) : LESSON.steps); }
  cur() { return this.steps()[this.state.step]; }
  labsDef() { return LESSON.cfu4.labels; }
  slotsDef() { return LESSON.cfu4.slots; }


  // ---------- timers ----------
  tm(fn, ms) {
    const id = setTimeout(() => { this.T.delete(id); fn(); }, ms);
    this.T.add(id);
    return id;
  }
  clearT() { this.T.forEach((id) => clearTimeout(id)); this.T.clear(); }
  componentDidMount() {
    window.__trapP = () => this.state.P;
    window.__popRoom = () => this.popRoom();
    window.__extBounds = () => this.extBounds();
    window.__boardS = () => this.boardMap().s; // the board's zoom (figures drawn on it keep a constant size on screen)
    const C = CONFIG.swiftee;
    if (window.SwifteeMascot) {
      this.sw = new window.SwifteeMascot({ base: C.base, idle: C.idle, minHoldMs: C.minHoldMs, find: () => document.querySelector('.swiftee') });
      // preload every expression the lesson uses, so reactions never wait on the network
      const want = ['measuring', 'excited', 'waving', C.talk, C.waiting, C.praise, C.correct, C.wrong, C.nudge, C.done];
      LESSON.steps.forEach((st) => (st.lines || []).concat(st.after || []).forEach((L) => { if (L.m) want.push(L.m); }));
      this.sw.warm(want.filter((x, i) => want.indexOf(x) === i));
    }
    // browsers only let sound start on a real user activation - on touch screens that is the finger lifting (pointerup /
    // touchend / click), not touching down. Resume the audio on each of those until it runs, so the first tap on a
    // tablet is never silent
    this.wakeAudio = () => { if (!this.actx || this.actx.state !== 'running') this.unlockAudio(); };
    ['pointerup', 'touchend', 'click', 'keydown'].forEach((n) => document.addEventListener(n, this.wakeAudio, true));
    if (JOURNEY) {
      if (JOURNEY.params.has('debug')) window.lessonDebug = this; // for tests (as the fishing games' popoDebug)
      if (JOURNEY.params.get('dev') === '1') JOURNEY.devScreens(this.steps().map((x, i) => ({ label: (i + 1) + ' ' + this.screenName(x), run: () => this.jumpTo(i) })));
      // the journey's Play has been tapped by the time the shell begins the lesson
      // from fishing 1 (opts.arrive) Swiftee flies in first; a jump (?dev=1) starts at once
      JOURNEY.onBegin((opts) => {
        if (opts && opts.card) document.documentElement.classList.add('in-card'); // on fishing 2's card (css/game.css)
        // (if a ?dev=1 jump has started the lesson during the flight, it stays on its screen)
        if (opts && opts.arrive) this.arrive(() => { if (!this.state.started) this.start(); }); else { this.setState({ arriving: false }); this.start(); }
      });
      JOURNEY.onDispose(() => this.leave());
      // ready once the page's pictures are in (the background, the ice panel, Swiftee)
      const ready = () => JOURNEY.ready();
      if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready, { once: true });
    } else if (!CONFIG.flow.cover) this.start(); // otherwise the front page waits for Play (coverGo)
  }
  // the journey moves on: every voice, sound, timer and loop of the lesson stops for good
  leave() {
    this.stepTok++; this.narrTok++;
    this.clearT();
    this.cancelSpeech();
    if (window.Summary) Summary.stop();
    if (window.Finale) Finale.stop();
    if (this.aw) this.aw.cancel();
    if (this.wk) this.wk.hide();
    if (this.sw) this.sw.destroy();
    if (window.Motion) Motion.clear();
  }
  // a screen's name for the dev panel: checks are "Check N", the rest their opening line
  screenName(x) {
    return x.cfu ? 'Check ' + (this.steps().filter((y) => y.cfu).indexOf(x) + 1) : x.finale ? 'The End' : x.end ? 'Lesson complete' : (x.lines && x.lines[0] && x.lines[0].t ? x.lines[0].t.replace(/\n/g, ' ') : x.id);
  }
  // after the lesson's last screen (the summary): on to the fishing
  handOff() {
    if (!JOURNEY || this.handedOff) return;
    this.handedOff = true;
    // Swiftee takes off from the card first; the journey hears the lesson is over once she is off it (the card then
    // closes behind her, and she swoops into fishing 2 with her welcome)
    const plate = this.isPlate(this.cur()); // (no Swiftee on a plate screen: nothing to fly off, so no wait)
    if (!plate) this.depart();
    const results = Object.assign({}, this.state.results), flight = Motion.reduced || plate ? 0 : 1150;
    setTimeout(() => JOURNEY.finish({ results }), flight);
  }
  // In the journey, Swiftee carries the learner between the parts. Arriving from fishing 1 (where she flew off over
  // Popo, out of the top left) she flies in from the top left and lands on her spot, and the lesson begins.
  arrive(then) {
    const sw = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), G = window.gsap;
    this.unlockAudio();
    if (!sw || !G || Motion.reduced) { this.setState({ arriving: false }); then(); return; }
    this.pose('happy');
    if (document.documentElement.classList.contains('in-card')) { this.setState({ arriving: false }, () => this.dive(then)); return; } // in the water she dives in
    G.set(sw, { x: -520, y: -470, rotation: -14, scale: 0.72 });
    this.setState({ arriving: false }, () => {
      const tl = G.timeline({ delay: 0.5, onComplete: () => { G.set(sw, { clearProps: 'transform' }); then(); } });
      tl.call(() => this.sfx('whoosh'), null, 0)
        .to(sw, { x: 0, duration: 1.15, ease: 'power2.out' }, 0)
        .to(sw, { y: 0, duration: 1.15, ease: 'back.out(1.15)' }, 0) // a soft landing on the snow
        .to(sw, { rotation: 0, scale: 1, duration: 1.15, ease: 'power2.out' }, 0)
        .call(() => this.sfx('pop'), null, 1.0);
    });
  }
  // Swiftee dives in (the journey's underwater card): from above the card, tipped forward like a diver, she plunges
  // down - fast at first, slowing as the water takes her - rights herself and lands softly where the screen puts her,
  // a trail of bubbles rising behind her and a little puff as she lands. then() once she has landed
  dive(then) {
    const sw = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), G = window.gsap;
    const done = () => { if (then) then(); };
    if (!sw || !G || Motion.reduced) { done(); return; }
    const stage = document.querySelector('.stage'), tok = this.stepTok;
    const bubble = (x, y, r) => {
      if (!stage || tok !== this.stepTok) return;
      const b = document.createElement('div');
      b.className = 'dive-bub';
      Object.assign(b.style, { left: x + 'px', top: y + 'px', width: 2 * r + 'px', height: 2 * r + 'px' });
      stage.appendChild(b);
      setTimeout(() => b.remove(), 1300);
    };
    const at = () => { const b = this.elBox(sw.querySelector('.swiftee-still') || sw); return b ? { x: b.x + b.w / 2, y: b.y + b.h * 0.45 } : null; };
    sw.classList.add('flying'); // (no CSS transition smooths the dive)
    G.set(sw, { x: 150, y: -640, rotation: 38, scale: 0.9, transformOrigin: '50% 50%' });
    this.sfx('whoosh');
    let last = 0;
    G.timeline({ onComplete: () => {
      G.set(sw, { clearProps: 'transform' }); sw.classList.remove('flying');
      const p = at(); if (p) for (let i = 0; i < 6; i += 1) bubble(p.x + (Math.random() - 0.5) * 120, p.y + 70 + Math.random() * 30, 4 + Math.random() * 6); // the landing puff
      this.sfx('pop'); done();
    } })
      .to(sw, { y: 0, duration: 1.6, ease: 'power2.out', onUpdate: () => { // the trail
        const now = Date.now(); if (now - last < 70) return; last = now;
        const p = at(); if (p) bubble(p.x + (Math.random() - 0.5) * 50, p.y - 20, 3 + Math.random() * 6);
      } }, 0)
      .to(sw, { x: 0, duration: 1.6, ease: 'sine.out' }, 0)
      .to(sw, { rotation: -7, duration: 1.1, ease: 'power1.out' }, 0)
      .to(sw, { rotation: 0, duration: 0.5, ease: 'sine.inOut' }, 1.1)
      .to(sw, { scale: 1, duration: 1.3, ease: 'power2.out' }, 0);
  }
  // mid-lesson, where Swiftee comes back after screens without her (the journey's plate screens): she dives in
  swifteeIn(then) { this.dive(then); }
  // ...and after the last check she takes off and flies out to the right, to the lake (fishing 2), where she swoops
  // back in from the right
  depart() {
    const sw = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), G = window.gsap;
    this.setState({ bubOff: true });
    if (!sw || !G || Motion.reduced) return;
    this.pose('excited');
    this.sfx('whoosh');
    G.timeline()
      .to(sw, { y: 14, scaleY: 0.92, duration: 0.14, ease: 'sine.out', transformOrigin: '50% 90%' }, 0) // she crouches...
      .to(sw, { x: 1320, duration: 1.05, ease: 'power2.in' }, 0.14) // ...and takes off
      .to(sw, { y: -360, scaleY: 1, duration: 1.05, ease: 'sine.out' }, 0.14)
      .to(sw, { rotation: 16, duration: 1.05, ease: 'power1.in' }, 0.14);
  }
  // Front page Play. The tap is the user gesture browsers need before they allow voice and sound.
  coverGo() {
    if (this.state.started || this.coverBusy) return;
    this.coverBusy = true;
    this.unlockAudio();
    this.unlockSpeech();
    this.sfx('chime');
    this.setState({ coverLeaving: true });
    // start screen 1 underneath just after the button pops, so the cover fades into it
    setTimeout(() => this.start(), 220);
    setTimeout(() => { this.coverBusy = false; this.setState({ coverLeaving: false }); }, 900);
  }
  componentWillUnmount() { ['pointerup', 'touchend', 'click', 'keydown'].forEach((n) => document.removeEventListener(n, this.wakeAudio, true)); this.clearT(); this.cancelSpeech(); if (this.sw) this.sw.destroy(); }
  componentDidUpdate() {
    this.fitBubble();
  }

  // ---------- screen list (top-left) ----------
  // Jumping to a screen rebuilds the shape it expects, as if every screen before it was completed.
  // A step with `shape` starts from a preset (CONFIG.angleShape, or rightShape); only x changes.
  applyShape(st, P) {
    if (!st.shape) return P;
    P = this.clone(P);
    const S = st.shape === 'right' ? CONFIG.rightShape : CONFIG.angleShape;
    ['A', 'B', 'C', 'D'].forEach((k) => { P[k].x = S[k]; });
    return P;
  }
  // the shape a screen leaves behind once its task is done
  taskResult(st, P) {
    P = this.clone(P);
    if (st.task === 'dragA') P.A.x = P.D.x + (P.C.x - P.B.x);
    if (st.morph) { const f = st.morph[st.morph.length - 1]; P.A.x = f.A; P.B.x = f.B; }
    if (st.task === 'dragFree') P.B.x -= 40;
    if (st.task === 'drag90') this.snap90(P);
    return P;
  }
  // screen 33 left unfinished: A moves straight above D for the right angle, unless that would cross the top side
  // (D dragged far right, B far left); then the standard right trapezium
  snap90(P) {
    if (P.D.x <= P.B.x - 60) { P.A.x = P.D.x; return; }
    const S = CONFIG.rightShape; ['A', 'B', 'C', 'D'].forEach((k) => { P[k].x = S[k]; });
  }
  jumpTo(i) {
    if (!this.state.started) this.start(); // a jump skips the front page
    if (i === this.state.step) return;
    let P = this.initP();
    this.snaps = {};
    for (let j = 0; j < i; j++) { P = this.applyShape(this.steps()[j], P); this.snaps[j] = this.clone(P); P = this.taskResult(this.steps()[j], P); }
    this.setState({ P: P });
    this.sfx('tap');
    this.navAt = 0;
    this.goTo(i, true);
  }

  // Shrink the speech bubble to its widest line (wrapped text otherwise keeps the box at full width).
  // Measures in layout px, which ignore the stage scale. Hidden words still take up space, so the size
  // is right from the first word.
  fitBubble() {
    if (typeof document === 'undefined') return;
    const box = document.querySelector('.bubble'), txt = box && box.querySelector('.bubble-text');
    if (!txt) return;
    const key = (this.state.line || '') + '|' + txt.style.fontSize;
    if (key === this.fitKey) return;
    this.fitKey = key;
    box.style.width = '';
    if (!box.offsetWidth) { this.fitKey = null; return; } // hidden right now: fit when it shows
    const rows = {};
    txt.querySelectorAll('.w:not(.brk)').forEach((w) => {
      const r = rows[w.offsetTop] || (rows[w.offsetTop] = { l: Infinity, r: -Infinity });
      r.l = Math.min(r.l, w.offsetLeft); r.r = Math.max(r.r, w.offsetLeft + w.offsetWidth);
    });
    const widest = Math.max(0, ...Object.keys(rows).map((k) => rows[k].r - rows[k].l));
    if (!widest) return;
    const cs = getComputedStyle(box);
    const chrome = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    box.style.width = Math.ceil(widest + chrome + 3) + 'px';
    // refit when a web font finishes loading (it changes the widths)
    if (!this.fontHook && document.fonts && document.fonts.addEventListener) {
      this.fontHook = true;
      document.fonts.addEventListener('loadingdone', () => { this.fitKey = null; this.fitBubble(); });
      if (document.fonts.ready) document.fonts.ready.then(() => { this.fitKey = null; this.fitBubble(); });
    }
  }

  // ---------- Swiftee ----------
  pose(state) { if (this.sw) this.sw.play(state); }
  // what Swiftee does when nobody is talking
  restPose() {
    const C = CONFIG.swiftee, st = this.cur();
    if (this.antic) return this.antic; // an idle antic holds until the learner touches the screen
    if (this.state.measuring) return 'measuring'; // tape-measure walk while a side is measured
    if (st.end) return C.done;
    if (st.cfu && !this.state.done) return C.waiting;
    return C.idle;
  }
  // a short reaction that settles back on its own unless a line takes over
  react(state, ms) {
    this.pose(state);
    const tok = this.narrTok;
    this.tm(() => { if (tok === this.narrTok && !this.state.talking) this.pose(this.restPose()); }, ms || 1800);
  }

  // ---------- audio ----------
  // the speech voice (the fallback when a recording can't play), outside the journey only: in Fishing Frenzy only
  // Popo's and Swiftee's own recorded voices are heard, so a line without a playable clip shows its words silently
  // (the paced reveal) rather than in the browser's voice
  synth() {
    if (JOURNEY) return null;
    try {
      return (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
    } catch (e) { return null; }
  }
  utterance(text) {
    const sp = JOURNEY && JOURNEY.speech(), U = (sp && sp.Utterance) || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    return U ? new U(text) : null;
  }
  // where sounds go: in the journey, the lesson's own output in the shell's context
  out() { return (this.actx && this.actxShared && (this.outNode || (this.outNode = JOURNEY.audioOut()))) || this.actx.destination; }
  cancelSpeech() { if (window.Voice) Voice.stop(); const s = this.synth(); if (s) { try { s.cancel(); } catch (e) {} } }
  pickVoice() {
    const s = this.synth(); if (!s) return;
    let vs = [];
    try { vs = s.getVoices() || []; } catch (e) { vs = []; }
    const en = vs.filter((v) => /^en/i.test(v.lang));
    // Voices that report each word as they say it come first, so the words, highlights and animations land exactly
    // on the voice: Edge's Neerja / Heera and the device's own (local) voices. Chrome's online Google voices report
    // no words (the reveal then has to be paced by estimate), so they are the last resort.
    // Within that: Indian English first, then clear female English voices.
    const pref = [/Neerja/i, /Heera/i, /Veena/i, /en-IN/i, /Samantha/i, /Karen|Moira|Tessa|Zira|Aria|Jenny/i, /Female/i, /en-GB/i, /en-US/i];
    const words = en.filter((v) => v.localService || /Neerja|Heera|Natural/i.test(v.name)), rest = en.filter((v) => words.indexOf(v) < 0);
    let pick = null;
    for (const list of [words, rest]) {
      for (const re of pref) { pick = list.find((v) => re.test(v.name) || re.test(v.lang)); if (pick) break; }
      if (pick) break;
    }
    this.voice = pick || en[0] || null;
  }
  // bubble text as the voice should read it (symbols and side names spelled out)
  speechOf(t) {
    return t
      .replace(/\s*\n\s*/g, ' ') // bubble line breaks are layout only
      .replace(/∠\s?([A-D])/g, 'angle $1')
      .replace(/∥/g, ' is parallel to ')
      .replace(/\b(AB|BC|CD|AD|DC)\b/g, (m) => m.split('').join(' '))
      .replace(/(\d+)\s?cm\b/g, '$1 centimetres')
      .replace(/°/g, ' degrees')
      .replace(/−/g, ' minus ')
      .replace(/\+/g, ' plus ')
      .replace(/=/g, ' equals ')
      .replace(/…/g, ', ');
  }
  // Recorded effects (CONFIG.sounds) are decoded once so they play instantly, in step with the confetti.
  // An <audio> element is the fallback for pages opened from disk, where fetch is blocked.
  loadSounds() {
    if (this.sndBuf) return;
    this.sndBuf = {}; this.sndEl = {};
    Object.keys(CONFIG.sounds || {}).forEach((k) => {
      const src = CONFIG.sounds[k];
      try { const a = new Audio(src); a.preload = 'auto'; this.sndEl[k] = a; } catch (e) {}
      if (!this.actx || typeof fetch === 'undefined') return;
      fetch(src).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => this.actx.decodeAudioData(b, ok, no)))
        .then((buf) => { this.sndBuf[k] = buf; }).catch(() => {});
    });
  }
  playSound(kind) {
    try {
      const buf = this.sndBuf && this.sndBuf[kind];
      if (buf && this.actx) {
        const src = this.actx.createBufferSource(), g = this.actx.createGain();
        g.gain.value = CONFIG.soundVolume;
        src.buffer = buf; src.connect(g); g.connect(this.out()); src.start();
        return true;
      }
      const el = this.sndEl && this.sndEl[kind];
      if (el) { const a = el.cloneNode(); a.volume = CONFIG.soundVolume; const p = a.play(); if (p && p.catch) p.catch(() => {}); return true; }
    } catch (e) {}
    return false;
  }
  // Which parts of the shape a line names, and at which word: [{ i, parts }]. Parts are 'aA'..'aD' (angles),
  // 'AB' 'BC' 'CD' 'DA' (sides) and 'vA'..'vD' (vertices). A lone letter is a vertex only after "vertex",
  // "point" or "corner", so the article "A" never counts.
  partCues(words) {
    const clean = (w) => (w || '').replace(/[^A-Za-z∠]/g, '');
    const side = (p, q) => ({ AB: 'AB', BA: 'AB', BC: 'BC', CB: 'BC', CD: 'CD', DC: 'CD', DA: 'DA', AD: 'DA' })[p + q];
    const one = (w) => /^[A-D]$/.test(w);
    const cues = [];
    words.forEach((raw, i) => {
      const w = clean(raw), prev = clean(words[i - 1]).toLowerCase(), next = clean(words[i + 1]);
      let parts = null, m;
      if ((m = /^∠([A-D])$/.exec(w))) parts = ['a' + m[1]];
      else if (/^[A-D]{2}$/.test(w) && side(w[0], w[1])) parts = [side(w[0], w[1])];
      else if (one(w) && /^(vertex|point|corner)$/.test(prev)) parts = ['v' + w];
      else if (one(w) && one(next) && !one(clean(words[i - 1])) && side(w, next)) parts = [side(w, next)]; // spoken "A B"
      else if (/^legs$/i.test(w)) parts = ['DA', 'BC']; // plural only: "a leg" names one, not both
      else if (/^bases$/i.test(w)) parts = ['AB', 'CD'];
      if (parts) cues.push({ i: i, parts: parts, done: false });
    });
    return cues;
  }
  // A corner letter flies in from its corner; the corner itself stays still (no pulse). Letters land at least
  // CONFIG.letters.minGapMs apart, so A, B, C, D keep their rhythm even when several cues fire at once.
  revealLetter(k) {
    const now = Date.now(), at = Math.max(now, (this.letterAt || 0) + CONFIG.letters.minGapMs);
    this.letterAt = at;
    const go = () => {
      Motion.letterIn(k);
      // the bubble's ABCD gains the same letter at the same moment (A, AB, ABC, ABCD)
      if (this.state.bubLetters != null) this.setState({ bubLetters: Math.max(this.state.bubLetters, 'ABCD'.indexOf(k) + 1) });
    };
    if (at > now) Motion.wait((at - now) / 1000, go); else go();
  }
  // named parts grow, hold briefly, then shrink back (CSS transitions do the easing)
  // An orange key word with no animation of its own: show the part it names on the shape, as it is said. Skipped
  // just after another animation (so they never pile up) and on screens without the lesson shape.
  keyCue(w, L, words, i) {
    const st = this.cur(), f = st.f || {}, P = this.state.P;
    if (st.cfu || st.noBoard || st.hero || st.summary || st.room === 'measure' || !P) return;
    if (st.sumSteps || st.morph || st.sideNums || st.letterIn) return; // screens running their own animated sequence keep it uncluttered
    if (st.build && !(this.state.build && this.state.build.done)) return; // screen 1: no side lights up before the pen has drawn it
    if (Date.now() - (this.cueT || 0) < 1800) return; // the last animation finishes before a new one starts
    const has = (re) => words.some((x) => re.test(x.toLowerCase().replace(/[^a-z]/g, '')));
    const ALL = ['AB', 'BC', 'CD', 'DA'], BASES = ['AB', 'CD'], LEGS = ['DA', 'BC'];
    const shown = (f.arcs || '').split('').filter((k) => /[A-D]/.test(k));
    const angles = (ks) => ks.filter((k) => shown.indexOf(k) >= 0).map((k) => 'a' + k);
    const right = ['A', 'B', 'C', 'D'].filter((k) => Math.abs(this.angle(P, k) - 90) < 0.5);
    let parts = null;
    if (/^(quadrilaterals?|polygon|trapeziums?|scalene|isosceles|different)$/.test(w)) parts = ALL;
    else if (/^sides?$/.test(w)) parts = L.glow || (has(/^meet$/) && !has(/^not$/) ? LEGS : has(/^(parallel|pair|not)$/) ? BASES : ALL);
    else if (w === 'parallel') { parts = BASES; this.whenFree(() => Motion.parallelShow(), 1500, true); }
    else if (/^bases?$/.test(w)) parts = BASES;
    else if (w === 'legs') parts = LEGS;
    else if (w === 'leg') parts = shown.length ? angles(['A', 'D']).concat(['DA']) : ['DA'];
    else if (/^(equal|same)$/.test(w)) parts = has(/^legs?$/) && !shown.length ? LEGS : shown.length ? angles(['A', 'D']) : LEGS;
    else if (/^angles?$|^180°$|^supplementary$/.test(w)) parts = angles(['A', 'B', 'C', 'D']);
    else if (/^(right|90°|angled|adjacent)$/.test(w)) {
      if (right.length) { right.forEach((k) => Motion.markPing(document.querySelector('.stage .rm' + k))); this.cueT = Date.now(); return; }
      parts = ['vA', 'vB', 'vC', 'vD'];
    }
    else if (/^(vertex|vertices)$/.test(w)) {
      if (/^[A-D]$/.test((words[i + 1] || '').replace(/[^A-D]/g, ''))) return; // "vertex A": that corner is named next
      this.cueT = Date.now(); this.whenFree(() => this.vertexPulse(), 1500, true); return; // "any vertex": corner by corner
    }
    else if (w === 'meet') { parts = has(/^not$/) ? BASES : LEGS; const ap = document.querySelector('.stage .apex-dot'); if (ap && getComputedStyle(ap).display !== 'none') Motion.markPing(ap); }
    if (!parts || !parts.length) return;
    this.cueT = Date.now();
    this.whenFree(() => this.emphasize(parts), 1500, true);
  }
  // Run fn once nothing else on the board is animating, so effects come one after another rather than all at once.
  // Waits at most maxMs; then a cue that only decorates (dropIfBusy) is dropped, a cue that names a part runs anyway.
  whenFree(fn, maxMs, dropIfBusy) {
    const tok = this.stepTok, t0 = Date.now();
    const go = () => {
      if (tok !== this.stepTok) return;
      if (!Motion.busy()) { fn(); return; }
      if (Date.now() - t0 >= maxMs) { if (!dropIfBusy) fn(); return; }
      this.tm(go, 120);
    };
    go();
  }
  // One focus at a time, in the order things are named: a newly named part takes over from the last one (it never
  // piles up on top of it), and is let go after holdMs unless something newer has already taken over.
  emphasize(parts, onDone, quiet) { // quiet: light the parts without a spark running along them
    const tok = this.stepTok, id = (this.emphId = (this.emphId || 0) + 1);
    this.cueT = Date.now();
    this.setState({ emph: parts.reduce((o, k) => { o[k] = 1; return o; }, {}) },
      () => { const sides = parts.filter((k) => /^(AB|BC|CD|DA)$/.test(k)); if (!quiet && sides.length === 1) Motion.spark(sides[0]); // (at the marker's own speed, so the dot leads its line)
        parts.filter((k) => /^a[A-D]$/.test(k)).forEach((k) => Motion.angleJump(k[1])); }); // a dot only for one named side; a pair lights up together
    this.tm(() => {
      if (tok !== this.stepTok) return;
      if (id === this.emphId) this.setState({ emph: {} }, () => { if (onDone) onDone(); });
      else if (onDone) onDone();
    }, CONFIG.emph.holdMs);
  }
  sfx(kind) {
    if (this.state.muted) return;
    if (CONFIG.sounds && CONFIG.sounds[kind] && this.playSound(kind)) return;
    if (!this.actx) return;
    const ctx = this.actx;
    try {
      const now = ctx.currentTime;
      // synthesized fallback; each note is [freq, start, length, optional glide-to freq]
      const N = {
        tap: [[700, 0, 0.07]], pop: [[520, 0, 0.07], [780, 0.06, 0.09]],
        good: [[660, 0, 0.12], [880, 0.1, 0.12], [1175, 0.2, 0.24]],
        snap: [[990, 0, 0.08], [1320, 0.07, 0.14]],
        bad: [[240, 0, 0.16], [190, 0.13, 0.22]],
        // softer effects, played quieter
        draw: [[520, 0, 0.18, 760]], shimmer: [[1320, 0, 0.08], [1760, 0.05, 0.08], [2093, 0.1, 0.14]],
        whoosh: [[300, 0, 0.24, 900]], morph: [[440, 0, 0.3, 640]], chime: [[784, 0, 0.12], [1047, 0.08, 0.22]],
        tick: [[1600, 0, 0.035]], warm: [[523, 0, 0.14], [659, 0.08, 0.14], [784, 0.16, 0.28]],
        flourish: [[659, 0, 0.1], [784, 0.07, 0.1], [988, 0.14, 0.1], [1319, 0.21, 0.3]]
      }[kind] || [];
      const soft = ['draw', 'shimmer', 'whoosh', 'morph', 'chime', 'tick', 'warm', 'flourish'].indexOf(kind) >= 0;
      N.forEach((n) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = kind === 'bad' ? 'square' : 'triangle';
        o.frequency.setValueAtTime(n[0], now + n[1]);
        if (n[3]) o.frequency.exponentialRampToValueAtTime(n[3], now + n[1] + n[2]);
        const peak = kind === 'bad' ? 0.06 : soft ? 0.06 : 0.16;
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(peak, now + n[1] + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        o.connect(g); g.connect(this.out());
        o.start(now + n[1]); o.stop(now + n[1] + n[2] + 0.03);
      });
    } catch (e) {}
  }

  // ---------- narration ----------
  // Speak one line. The voice is the clock: each word shows as the voice reaches it, and Swiftee's beak moves
  // only while it speaks. Voices without word-boundary events get a paced reveal instead; with no voice at
  // all, the paced reveal and the beak run on their own.
  say(L, done) {
    if (this.antic) this.endAntic(true); // she stops dozing / daydreaming to speak
    const keep = !!(L && L.keep); // voice-only: the bubble keeps showing the previous line
    if (!L || (!L.t && !keep) || (keep && !L.s)) { if (done) done(); return; }
    const text = keep ? this.state.line : L.t;
    const words = this.toWords(keep ? L.s : text);
    // letters (screen 3): the name in the bubble (ABCD) is written out letter by letter, each with its corner letter
    this.setState({ bubLetters: L.letters ? 0 : null });
    // spoken text, and where each displayed word starts in it
    let sp, offs = null;
    if (L.s) {
      sp = L.s;
      const toks = []; sp.replace(/\S+/g, (m, at) => { toks.push(at); return m; });
      if (toks.length === words.length) offs = toks;
    } else {
      const parts = words.map((w) => this.speechOf(w).trim());
      offs = []; let at = 0;
      parts.forEach((p) => { offs.push(at); at += p.length + 1; });
      sp = parts.join(' ');
    }
    const wordAt = (ci) => {
      if (offs) { let k = 0; while (k < offs.length && offs[k] <= ci) k++; return Math.max(1, k); }
      return Math.min(words.length, Math.floor((ci / Math.max(1, sp.length)) * words.length) + 1);
    };
    const setReveal = (n) => Motion.paced(() => { // what a word starts plays at the teaching pace
      if (!keep) this.setState({ reveal: n });
      if (atIdx >= 0 && n >= atIdx + 1) highlight();
      if (pAt >= 0 && n >= pAt + 1) firePulse();
      if (chipsAt >= 0 && n >= chipsAt + 1) scheduleChipsAt();
      if (fAt >= 0 && n >= fAt + 1) fireFocus();
      if (lgAt >= 0 && n >= lgAt + 1) fireLegs();
      // (a word with a measured time in the recording waits for that time instead: cueTimes)
      emphCues.forEach((c) => { if (timed[c.i] == null && n >= c.i + 1) fireEmph(c); }); // a named part reacts as it is said
      wordCues.forEach((c) => { if (timed[c.i] == null && n >= c.i + 1) fireCue(c); });
      keyCues.forEach((c) => { if (timed[c.i] == null && n >= c.i + 1) fireKey(c); });
    });
    const fireEmph = (c) => {
      if (c.done) return; c.done = true;
      if (tok !== this.narrTok) return;
      const ang = L.angleCues ? c.parts.filter((k) => /^a[A-D]$/.test(k)) : [];
      if (ang.length) { this.sfx('pop'); ang.forEach((k) => Motion.angleFocus(k[1])); } else this.emphasize(c.parts, () => c.parts.forEach(showDelayedChips));
    };
    // cueTimes: { word: s } - when the recording says a word (measured from the clip). Its cues fire at that moment
    // rather than by the word's estimated share of the line, which runs ahead on words like "∠A" ("angle A").
    // Filled only when the recorded clip plays; otherwise every cue keeps the word timing.
    const timed = {};
    // cueAt: { word: fnName | { fn, sfx } }, each animation runs as the voice reaches its word
    const wordCues = Object.keys(L.cueAt || {}).map((w) => {
      const v = L.cueAt[w], exact = /[^a-z0-9-]/i.test(w); // a key with a symbol ("∠A") names that exact word; a plain one any word containing it
      const i = exact ? words.findIndex((x) => x.replace(/[.,!?;:]+$/, '').replace(/\s+/g, ' ') === w)
        : words.findIndex((x) => x.toLowerCase().replace(/[^a-z0-9-]/g, '').indexOf(w) >= 0); // an equation like "∠A = 120°" counts as one word
      return { i: i, call: typeof v === 'function' ? v : null, fn: typeof v === 'string' ? v : v.fn, sfx: v.sfx, done: false };
    }).filter((c) => c.i >= 0);
    const fireCue = (c) => { if (c.done || tok !== this.narrTok) return; c.done = true; this.cueT = Date.now(); if (c.call) { c.call(); return; } if (c.sfx) this.sfx(c.sfx); if (typeof this[c.fn] === 'function') this[c.fn](); else if (Motion[c.fn]) Motion[c.fn](); };
    // a part of the shape named in the line (∠A, AB, vertex A, legs, bases) grows briefly as the voice says it
    const emphCues = L.noEmph ? [] : this.partCues(words); // noEmph: the line animates its parts its own way
    // letters: each corner letter spoken on its own ("A, B, C, D") flies in as the voice says it
    const letterCues = [];
    if (L.letters) sp.replace(/\b([A-D])\b/g, (m, k, at) => { letterCues.push({ k: k, at: at, done: false }); return m; });
    const fireLetter = (c) => { if (!c.done && tok === this.narrTok) { c.done = true; this.revealLetter(c.k); } };
    // pulse: the shape zooms once on the pulseAt word (or as the line ends); chipsAt: the chips come in on that word.
    // Both use the word's last mention, since the name usually comes at the end of the line.
    const pAt = L.pulse && L.pulseAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.pulseAt) === 0).lastIndexOf(true) : -1;
    const chipsAt = L.chipsAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.chipsAt) === 0).lastIndexOf(true) : -1;
    let chipsAtScheduled = false, chipsAtQueued = false;
    const showChipsAt = () => {
      if (!L.chips || chipsAtScheduled || tok !== this.narrTok) return;
      chipsAtScheduled = true;
      this.addChips(L.chips);
      this.sfx('snap');
    };
    const scheduleChipsAt = () => {
      if (chipsAtScheduled || chipsAtQueued) return;
      chipsAtQueued = true;
      const delay = L.chipsAfterPulse ? 620 : 0;
      this.tm(showChipsAt, delay);
    };
    // focusAt: the line's glow pair comes into focus (the others dim) as that word is said
    const fAt = L.focusAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.focusAt) === 0).indexOf(true) : -1;
    let focused = false;
    const fireFocus = () => { if (!L.focusAt || focused || tok !== this.narrTok) return; focused = true; Motion.focusPair(L.glow || []); };
    // legsAt: both legs are shown equal as that word is said (or as the line ends)
    const lgAt = L.legsAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.legsAt) === 0).indexOf(true) : -1;
    let legged = false;
    const fireLegs = () => { if (!L.legsAt || legged || tok !== this.narrTok) return; legged = true; Motion.equalLegs(); };
    let pulsed = false;
    const firePulse = () => {
      if (!L.pulse || pulsed || tok !== this.narrTok) return;
      pulsed = true;
      const P = this.state.P;
      Motion.pop((P.A.x + P.B.x + P.C.x + P.D.x) / 4, (P.A.y + P.B.y + P.C.y + P.D.y) / 4);
    };
    let cardShown = !(keep && L.chips); // a voice-only line adds its chips when the voice starts (showCard)
    // chipsAfterParts: the chips wait until each listed part has been named and has grown
    const chipsAfterParts = L.chipsAfterParts || [];
    const pulsedChipParts = {};
    const showDelayedChips = (part) => {
      if (!chipsAfterParts.length || chipsAfterParts.indexOf(part) < 0 || pulsedChipParts[part]) return;
      pulsedChipParts[part] = true;
      if (chipsAfterParts.every((k) => pulsedChipParts[k]) && tok === this.narrTok) {
        cardShown = true;
        this.addChips(L.chips);
        this.sfx('snap');
        this.setState({}, () => Motion.chipPop());
      }
    };
    let glowOn = false;
    // glowAt: the highlight waits for that word
    const atIdx = L.glowAt ? words.findIndex((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.glowAt) === 0) : -1;
    // every orange key word shows what it names as it is said: a key word with no animation of its own gets one
    const taken = new Set(wordCues.map((c) => c.i).concat(emphCues.map((c) => c.i), [pAt, chipsAt, fAt, lgAt, atIdx]));
    const keyCues = keep ? [] : words.map((w, i) => ({ i: i, w: w.toLowerCase().replace(/[^a-z0-9°]/g, ''), done: false }))
      .filter((c) => KEY_WORDS.test(c.w) && !taken.has(c.i));
    const fireKey = (c) => { if (c.done || tok !== this.narrTok) return; c.done = true; this.keyCue(c.w, L, words, c.i); };
    const highlight = () => {
      if (tok !== this.narrTok) return;
      if (L.glow && !glowOn) { glowOn = true; this.setState({ glow: L.glow }); }
      if (L.callout && this.state.callout !== L.callout) this.setState({ callout: L.callout }, () => Motion.calloutIn(L.glow)); // the "Base" / "Leg" pills
    };
    const showCard = () => {
      if (tok !== this.narrTok) return;
      if (!cardShown && !chipsAfterParts.length) { cardShown = true; this.addChips(L.chips); }
      if (atIdx < 0) highlight();
    };
    const tok = ++this.narrTok;
    this.curLine = L;
    this.cancelSpeech();
    if (keep) this.setState({ talking: true });
    else this.setState({ line: text, reveal: 0, talking: true, bub: this.state.bub === 'bubA' ? 'bubB' : 'bubA', bubOff: false, centered: false, bubFresh: !this.state.line || this.state.bubOff }); // bubFresh: the bubble was hidden
    if (L.m) this.preloadPose(L.m);
    let i = 0, rDone = false, sDone = false, fin = false, bMode = false, spoke = false, started = false, mouthOn = false, tStart = 0;
    const live = () => tok === this.narrTok;
    const mouth = (on) => {
      if (!live() || on === mouthOn) return;
      mouthOn = on;
      if (this.sw) this.sw.talk(on, on ? null : (L.m || this.restPose()));
    };
    const finish = () => {
      if (!live() || fin || !rDone || !sDone) return;
      fin = true;
      mouth(false);
      // anything still waiting for a word that was never reached (voice cut short) happens now
      highlight();
      letterCues.forEach(fireLetter);
      this.setState(Object.assign(keep ? { talking: false } : { talking: false, reveal: words.length }, L.glow && atIdx < 0 ? { glow: null } : {}));
      if (L.glow && atIdx >= 0) this.tm(() => { if (live()) this.setState({ glow: null }); }, 1500); // a glow that waited for its word lingers a moment
      firePulse();
      if (chipsAt < 0) scheduleChipsAt();
      else if (!chipsAtScheduled) scheduleChipsAt();
      fireFocus();
      fireLegs();
      wordCues.forEach(fireCue);
      if (L.pairEnd) this.tm(() => { if (live()) Motion.anglesTogether(L.pairEnd); }, 250); // both named angles glow together
      // optsAfter: the answers slide in once the question has been asked
      if (this.cur().optsAfter && !this.state.qc && !this.state.done) {
        this.tm(() => { if (live()) { this.sfx('pop'); this.setState({ qc: true }); } }, L.pairEnd ? 700 : 300);
      }
      // Swiftee holds the line's expression for a beat, then settles
      if (L.m) this.tm(() => { if (live()) this.pose(this.restPose()); }, CONFIG.swiftee.reactMs);
      this.tm(() => { if (live() && done) done(); }, CONFIG.timing.lineGapMs); // a beat to take the line in before the next
      // qFocus (check 2): after a pause the question shape glides to the centre and the answers come in (qc)
      if (this.cur().qFocus && !this.state.done) {
        const Q = CONFIG.qFocus;
        this.tm(() => {
          if (!live()) return;
          if (!this.qText(this.cur())) this.setState({ bubOff: true }); // a static question keeps the bubble
          if (!this.state.qc) this.tm(() => { if (live()) { this.setState({ qc: true }); this.armHand(); } }, Q.fadeMs);
        }, Q.holdMs);
      }
      // layout 'focus' (screen 7): while the task runs, the bubble fades and the shape moves to centre stage
      if (this.cur().layout === 'focus' && !this.state.done) {
        const F = CONFIG.focus;
        this.tm(() => {
          if (!live()) return;
          this.setState({ bubOff: true });
          this.tm(() => { if (live()) { this.setState({ centered: true }); this.focusAt = Date.now(); this.armHand(); } }, F.fadeMs);
        }, F.holdMs);
      }
    };
    const revealAll = () => { if (!live()) return; i = words.length; setReveal(i); rDone = true; };
    // estimated time per word; paceK corrects it from how fast the real voice spoke earlier lines
    const nominal = (w) => (170 + 48 * w.length + (/[.!?,…]$/.test(w) ? 160 : 0)) / CONFIG.timing.speechRate;
    const pace = (w) => nominal(w) * (this.paceK || 1.18);
    // paced reveal, used when the voice gives no word positions
    const tick = () => {
      if (!live() || rDone || bMode) return;
      // until the voice speed is learned, the last word waits for the voice to end
      if (i < words.length - 1 || sDone || this.paceK) { i = Math.min(words.length, i + 1); setReveal(i); }
      if (i >= words.length) { rDone = true; finish(); return; }
      this.tm(tick, pace(words[i - 1] || ''));
    };
    const begin = () => { // the voice (or the silent fallback) has started
      if (!live() || started) return;
      started = true; tStart = performance.now();
      showCard(); mouth(true);
      if (L.onStart && Motion[L.onStart]) Motion[L.onStart](); // an animation that starts with the line
      if (/^(surprised|excited|celebrating)$/.test(L.m || '')) Motion.hop(); // a discovery or a cheer: she hops
      if (letterCues.length) { // estimated letter times, in case the voice sends no word boundaries
        const est = words.reduce((t, w) => t + nominal(w), 0) * (this.paceK || 1.18);
        letterCues.forEach((c) => this.tm(() => { if (!bMode) fireLetter(c); }, est * c.at / Math.max(1, sp.length)));
      }
      tick();
    };
    // a line the voice can't say (a clip that fails, a device voice that errors or is ignored): the words pace
    // themselves as with no voice, instead of the whole line appearing at once. Cues go by their words again
    const silentEnd = () => { if (!live()) return; if (rDone) { mouth(false); finish(); } else this.tm(silentEnd, 120); };
    const paced = () => {
      if (!live() || sDone) return;
      sDone = true;
      Object.keys(timed).forEach((k) => { delete timed[k]; });
      if (!started) begin(); // (once begun, the word-by-word reveal is already running and now runs to the end)
      this.tm(silentEnd, 300);
    };
    // the device's voice, also when a recorded clip can't play
    const speakIt = () => {
      const s = this.synth();
      const canSpeak = !this.state.muted && s && !!this.utterance('');
      if (!canSpeak) {
        sDone = true; // no voice: the words pace themselves and the beak moves while they appear
        this.tm(() => { begin(); }, 140);
        this.tm(silentEnd, 300);
        return;
      }
      const est = words.reduce((t, w) => t + nominal(w), 0) * 1.4;
      try {
        const u = this.utterance(sp);
        if (this.voice) u.voice = this.voice;
        u.lang = (this.voice && this.voice.lang) || 'en-GB';
        u.rate = CONFIG.timing.speechRate; u.pitch = 1.25;
        const end = () => {
          if (!live() || sDone) return;
          if (!spoke && !bMode) { paced(); return; } // never heard (an error, or a speak() the browser ignored)
          if (started && !bMode && tStart) { // learn this voice's speed, erring slow so words never run ahead of it
            const ratio = (performance.now() - tStart) / Math.max(1, words.reduce((t, w) => t + nominal(w), 0));
            if (ratio > 0.4 && ratio < 3) this.paceK = Math.max(0.6, 0.5 * (this.paceK || 1.18) + 0.5 * ratio * 1.06);
          }
          sDone = true; begin(); mouth(false); letterCues.forEach(fireLetter); revealAll(); finish();
        };
        u.onstart = () => { spoke = true; begin(); };
        u.onend = end; u.onerror = end;
        u.onboundary = (ev) => {
          if (!live() || (ev.name && ev.name !== 'word')) return;
          bMode = true; begin();
          letterCues.forEach((c) => { if ((ev.charIndex || 0) >= c.at) fireLetter(c); });
          const k = wordAt(ev.charIndex || 0);
          if (k > i) { i = k; setReveal(i); }
        };
        // Chrome can drop an utterance queued in the same tick as cancel(), so wait a moment
        this.tm(() => { if (live()) { try { s.speak(u); } catch (e) { end(); } } }, 60);
        // some voices never fire onstart: begin once the engine reports speaking, or after a grace period
        const kick = (n) => {
          if (!live() || started || sDone) return;
          let busy = false; try { busy = s.speaking && !s.pending; } catch (e) {}
          if (busy || n > 20) { begin(); return; }
          this.tm(() => kick(n + 1), 80);
        };
        this.tm(() => kick(0), 200);
        // watchdog for voices that never fire onend, or never start at all
        const watch = () => {
          if (!live() || sDone) return;
          let busy = true;
          try { busy = s.speaking || s.pending; } catch (e) { busy = false; }
          if (!busy && (spoke || started)) { end(); return; }
          this.tm(watch, 300);
        };
        this.tm(watch, 900);
        this.tm(() => { if (live() && !sDone) end(); }, est * 1.8 + 2500);
      } catch (e) { sDone = true; begin(); }
    };
    // recorded voice (js/voice.js): the clip is the clock. Words show by their share of the spoken line, and the
    // corner letters by their place in the spoken text
    const clip = !this.state.muted && window.Voice ? Voice.find(keep ? L.s : text) : null;
    if (clip) {
      const clipDur = clip.reduce((t, c) => t + c.dur, 0);
      const wt = words.map((w) => Voice.weight(this.speechOf(w)) + (/[.!?]$/.test(w) ? 6 : /[,:;]$/.test(w) ? 3 : 0));
      const all = wt.reduce((a, b) => a + b, 0) || 1, from = []; let acc = 0;
      wt.forEach((x) => { from.push(acc / all); acc += x; });
      const end = () => {
        if (!live() || sDone) return;
        if (!spoke) { Object.keys(timed).forEach((k) => { delete timed[k]; }); speakIt(); return; } // the clip couldn't play (missing, undecodable, refused, too slow)
        sDone = true; begin(); mouth(false); letterCues.forEach(fireLetter); fireTimed(() => true); revealAll(); finish();
      };
      // (an equation word like "∠A = 120°" is joined with non-breaking spaces)
      Object.keys(L.cueTimes || {}).forEach((w) => { const j = words.findIndex((x) => x.replace(/[.,!?;:]+$/, '').replace(/\s+/g, ' ') === w); if (j >= 0) timed[j] = L.cueTimes[w]; });
      // (the clip's tail: anything not yet fired goes when the line ends, so a cut-short clip still completes the screen)
      const fireTimed = (due) => {
        emphCues.forEach((c) => { if (timed[c.i] != null && due(timed[c.i])) fireEmph(c); });
        wordCues.forEach((c) => { if (timed[c.i] != null && due(timed[c.i])) fireCue(c); });
        keyCues.forEach((c) => { if (timed[c.i] != null && due(timed[c.i])) fireKey(c); });
      };
      Voice.play(clip, {
        start: () => { if (!live()) return; spoke = true; bMode = true; begin(); },
        progress: (f) => {
          if (!live() || sDone) return;
          // letterTimes: when each corner letter is heard in the clip (s, measured from the recording); else its place in the text
          if (L.letterTimes) { const t = f * Math.max(0.3, clipDur - 0.35) + 0.06; letterCues.forEach((c, j) => { if (t >= L.letterTimes[j] - 0.05) fireLetter(c); }); }
          else letterCues.forEach((c) => { if (f >= c.at / Math.max(1, sp.length)) fireLetter(c); });
          if (L.cueTimes) { const t = f * Math.max(0.3, clipDur - 0.35) + 0.06; fireTimed((s) => t >= s - 0.03); }
          let k = 0; while (k < from.length && from[k] <= f) k++;
          if (k > i) { i = k; setReveal(i); }
        },
        end: end
      });
      return;
    }
    speakIt();
  }
  preloadPose(state) { if (this.sw && this.sw.m) this.sw.preload(state); }
  // split a line into words, keeping "5 cm" and short equations like "AB = 6 cm" together
  toWords(t) { return t.replace(/(\d) (cm)\b/g, '$1\u00a0$2').replace(/ ([=+\u2212]) /g, '\u00a0$1\u00a0').split(/[ \t\n]+/).filter(Boolean); }
  // A screen's narration queue. Interjections (feedback, idle hints) play over it, then the queue
  // carries on with its next line, so later lines and chips are never lost.
  playLines(lines, done) {
    this.q = { lines: lines || [], i: 0, done: done, tok: this.stepTok };
    this.qNext();
  }
  qNext() {
    const q = this.q;
    if (!q || q.tok !== this.stepTok) return;
    if (q.i >= q.lines.length) { this.q = null; if (q.done) q.done(); this.armIdle(); return; }
    const L = q.lines[q.i++];
    if (L.chips && !L.keep && !L.holdChips) this.addChips(L.chips); // voice-only and held chips come in later, timed to the voice
    this.say(L, () => this.qNext());
  }
  interject(L) {
    const tok = this.stepTok;
    this.say(L, () => { if (tok !== this.stepTok) return; if (this.q) this.qNext(); else { this.armIdle(); this.maybeAdvance(true); } this.qBack(); });
  }
  // After a feedback line, put the question back in the bubble (shown, not spoken again), so the
  // learner can always read what is being asked.
  qBack() {
    const st = this.cur(), tok = this.stepTok, q = this.qText(st);
    if (!q || this.state.done) return;
    this.tm(() => { if (tok === this.stepTok && !this.state.done && !this.state.talking) this.setState({ line: q, reveal: 999, bubOff: false }); }, 1600);
  }
  // a check or practice screen's question: its qStatic text, or else its last line
  qText(st) {
    if (st.qStatic) return st.qStatic;
    if (!(st.cfu || st.practice) || !(st.lines || []).length) return null;
    return st.lines[st.lines.length - 1].t;
  }
  addChips(cs) {
    const have = this.state.chips.map((c) => c.t);
    this.setState({ chips: this.state.chips.concat(cs.filter((c) => have.indexOf(c.t) < 0)) });
  }

  // ---------- idle hints ----------
  // a quiet spell brings the pointing hand (and Swiftee's antics), never a spoken reminder: an instruction is said once,
  // as the screen opens
  armIdle() {
    this.armHand();
    this.armAntic();
  }
  poke() { this.hideHand(); this.endAntic(); this.armIdle(); }
  // ---------- idle antics ----------
  // Left alone for CONFIG.antics.idleMs with nothing happening, Swiftee amuses herself: dozes off (with floating
  // Zzz), daydreams, plays or reads, in turn. Any touch ends it; waking from a doze she gives a little start.
  armAntic() {
    if (this.anticId) { clearTimeout(this.anticId); this.T.delete(this.anticId); this.anticId = null; }
    if (!this.state.started || this.antic) return;
    const tok = this.stepTok;
    this.anticId = this.tm(() => {
      this.anticId = null;
      const st = this.cur();
      if (tok !== this.stepTok || this.antic) return;
      if (st.summary || st.hero || this.state.swAway) return;
      if (this.state.talking || this.drag || this.ld || this.rulerBusy || this.q || (st.auto && !this.state.done)) { this.armAntic(); return; } // (an auto task: she is measuring)
      const A = CONFIG.antics.list;
      this.antic = A[(this.anticN = ((this.anticN || 0) + 1)) % A.length];
      this.pose(this.antic);
      if (this.antic === 'sleeping') Motion.zzz(true);
    }, CONFIG.antics.idleMs);
  }
  endAntic(quiet) {
    if (this.anticId) { clearTimeout(this.anticId); this.T.delete(this.anticId); this.anticId = null; }
    const was = this.antic;
    if (!was) return;
    this.antic = null;
    Motion.zzz(false);
    if (quiet) return;
    if (was === 'sleeping') {
      this.react('surprised', 1200); this.sfx('pop');
    } else this.pose(this.restPose());
  }

  // ---------- hand nudge ----------
  // When a tap or drag is expected and nothing happens for CONFIG.hand.idleMs, a hand shows where (and for
  // drags, which way). Any touch hides it and restarts the wait. On checks it never points at an answer;
  // the options pulse together instead.
  handTarget() {
    const st = this.cur(), s = this.state, P = s.P;
    if (!s.started || st.end) return null;
    if (st.explore && s.explored) return null; // exploring freely: no more pointing
    if (!s.done) {
      const t = st.task;
      // drags slide toward the goal (equal legs, a right angle), or inward when any change will do
      const clamp = (v) => (Math.abs(v) < 12 ? 0 : Math.max(-70, Math.min(70, v)));
      if (t === 'dragFree') return { qa: 'vtx-B', kind: 'drag', dx: -60, dy: 0 };
      if (t === 'drag90') return { qa: 'vtx-A', kind: 'drag', dx: clamp(P.D.x - P.A.x) || -60, dy: 0 };
      if (t === 'dragA') return { qa: 'vtx-A', kind: 'drag', dx: clamp(P.D.x + (P.C.x - P.B.x) - P.A.x) || -60, dy: 0 };
      if (st.cfu === 4) {
        const c4 = s.c4, lab = this.labsDef().find((l) => !c4.locked[l.id] && !c4.at[l.id]);
        // press the label only: sliding it anywhere would hint at an answer
        return lab ? { qa: 'lab-' + lab.id, kind: 'tap' } : null;
      }
      if (st.cfu || st.opts) return { kind: 'opts' };
      return null;
    }
    return null;
  }
  hideHand() { if (this.state.hand) this.setState({ hand: null }); }
  armHand(extraMs) {
    if (this.state.hand) return; // already showing: only a touch (poke) or its own timer takes it down
    if (this.handId) { clearTimeout(this.handId); this.T.delete(this.handId); this.handId = null; }
    // handOnce: one demo gesture as the screen opens, and none once the learner has touched the shape
    const once = !!this.cur().handOnce && !this.state.done;
    if (once && this.touched) return;
    if (!this.handTarget() || (this.handShown || 0) >= (once ? 1 : CONFIG.hand.maxShows)) return;
    const focus = this.cur().layout === 'focus' && !this.state.done;
    if (focus && !this.state.centered) return; // re-armed once the shape reaches centre stage
    const tok = this.stepTok;
    this.handId = this.tm(() => {
      this.handId = null;
      if (tok !== this.stepTok) return;
      // wait for Swiftee to finish and for hands to be off the board
      if (this.state.talking || this.drag || this.ld || this.rulerBusy || this.state.c4.checking) { this.armHand(); return; }
      if (once && this.touched) return;
      const T = this.handTarget();
      if (!T) return;
      const k = this.boardMap().s; // drag hints are in board px
      let hand = { kind: T.kind, x: 0, y: 0, dx: (T.dx || 0) * k, dy: (T.dy || 0) * k, n: (this.handShown || 0), once: once };
      if (T.qa) {
        if (typeof document === 'undefined') return;
        const el = document.querySelector('[data-qa="' + T.qa + '"]'), stage = document.querySelector('.stage');
        if (!el || !stage) return;
        const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
        if (!r.width && !r.height) return;
        hand.x = Math.round((r.left + r.width / 2 - sr.left) / sc);
        hand.y = Math.round((r.top + r.height / 2 - sr.top) / sc);
        // near the bottom edge the hand would leave the stage, so it points down at the target's top instead
        if (hand.y + 75 > 715) { hand.down = true; hand.y = Math.round((r.top - sr.top) / sc) + 8; }
      }
      this.handShown = (this.handShown || 0) + 1;
      this.setState({ hand: hand });
      if (this.cur().idleFx && Motion[this.cur().idleFx]) Motion[this.cur().idleFx]();
      // show for a while, then hide; it comes back only if the learner is still idle
      this.handId = this.tm(() => { this.handId = null; if (tok === this.stepTok) { this.setState({ hand: null }, () => this.armHand()); } }, once ? CONFIG.hand.onceMs : CONFIG.hand.showMs);
    }, (once ? CONFIG.hand.onceDelayMs : focus ? CONFIG.focus.handMs + Math.max(0, (this.focusAt || 0) + CONFIG.focus.moveMs - Date.now()) : (this.cur().handMs || CONFIG.hand.idleMs)) + (extraMs || 0));
  }
  // Browsers only allow audio after a user gesture, so the first tap unlocks it.
  rootDown() { this.unlockAudio(); if (this.state.started) this.poke(); }
  // iOS lets a page speak only once a tap has started speech: say nothing, silently, inside the Play tap, so the
  // browser voice works later (older iPads can't play the Ogg recordings; any recording may fail to load)
  unlockSpeech() {
    const s = this.synth();
    if (!s || this.speechUnlocked || !this.utterance('')) return;
    this.speechUnlocked = true;
    try { const u = this.utterance(' '); u.volume = 0; s.speak(u); } catch (e) {}
  }
  unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext, shared = JOURNEY && JOURNEY.audioContext();
      if (shared && !this.actx) { this.actx = shared; this.actxShared = true; }
      if (AC && !this.actx) this.actx = new AC();
      if (this.actx && this.actx.state === 'suspended') this.actx.resume();
    } catch (e) {}
    if (window.Voice) Voice.unlock(); // the voice-over's <audio> needs the same tap
    this.loadSounds();
  }

  // ---------- flow ----------
  start() {
    if (this.state.started && this.state.step === 0 && Date.now() - (this.navAt || 0) < 800) return;
    this.unlockAudio();
    if (window.Voice) Voice.prefetch(); // every clip, quietly, one at a time
    const s = this.synth();
    if (s) { this.pickVoice(); try { s.onvoiceschanged = () => this.pickVoice(); } catch (e) {} }
    this.snaps = {};
    this.setState(this.fresh(true));
    this.goTo(0, true);
  }
  clone(P) { return JSON.parse(JSON.stringify(P)); }
  // Show screen i. Going forward the shape carries on from the current one; going back restores the
  // shape saved when the screen was first shown.
  goTo(i, fwd) {
    const st = this.steps()[i];
    if (!st) return;
    this.clearT();
    this.holdTo = 0;
    this.handId = null; this.handShown = 0; this.touched = false; this.overWig = false; this.letterAt = 0; this.morphing = false; this.settleWaiting = false; this.misses = 0; this.misses4 = {}; this.solved = false; this.solving = false; this.revealing = false;
    this.prevLine = this.state.line;
    this.revealUntil = 0;
    if (this.wk) this.wk.hide();
    if (this.aw) this.aw.cancel(); // stop screen 23's protractor walk so no late reading comes in
    this.stepTok++; this.narrTok++;
    if (window.Summary) Summary.stop(); // stop screen 37's summary
    if (window.Finale) Finale.stop(); // the end screen's closer
    this.endAntic(true);
    Motion.cueReset(); // clear cue marks left by the last screen
    // Stop the last screen's animations and remove their inline styles. This must run after the tokens move on,
    // so callbacks from tweens being reverted see a stale token and change nothing.
    const was = this.cur();
    if (this.state.started && st.noBoard && was && !was.noBoard && !was.cfu && !was.end && !was.summary && !was.room) Motion.boardGhost(); // (before clear(), with the board still as it was)
    this.fromHero = !!(was && was.hero && !was.end && fwd); // screen 37: Swiftee is already centre stage, from screen 36
    this.fromPlate = !!(was && this.isPlate(was)); // the journey: Swiftee was off this screen; where she is back, she flies in
    Motion.clear();
    this.q = null;
    this.cancelSpeech();
    this.drag = null; this.ld = null; this.rulerBusy = false; this.navAt = Date.now();
    let P;
    if (fwd || !this.snaps[i]) { P = this.applyShape(st, this.clone(this.state.P)); this.snaps[i] = this.clone(P); }
    else P = this.clone(this.snaps[i]);
    this.fit = st.room === 'measure' || st.noZoom ? null : this.fitFor(st, P); // the shape's size and place in the panel
    // screen 5 opens at the shape's own size (as screen 4); autoExtend pulls back step by step as the legs extend
    if (st.task === 'extLegs' && this.fit && this.isPlate(st)) this.fit = this.fitFor(st, P, 0);
    this.setState({
      step: i, P: P, done: !st.task && !st.cfu && !st.opts, ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, chips: [],
      moved: false, dragging: null, picks: {}, cfuFirst: true, hand: null, sumNext: false, tracking: false, bubOff: false, centered: false, glow: null, callout: null, emph: {}, qc: false, trace: null, build: null, numsGone: false, bubLetters: null, explored: false, angFocus: null, symAng: false, linesDone: false, labsIn: false, measuring: null, tape: null, swAway: false, line: '', reveal: 0, talking: false, // her speech was stopped above
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false }
    });
    if (st.layout === 'focus' && !(st.lines || []).length && !this.state.done) {
      this.setState({ line: fwd ? this.prevLine || '' : '', reveal: 999, bubOff: true, centered: true });
      this.focusAt = Date.now();
    }
    this.pose(this.restPose());
    // Swiftee coming onto the card (her dive back onto the measuring slab or a hero spot, her rise into the summary)
    // speaks only once she is there: landed() starts her lines, so her bubble never shows before she does
    this.whenLanded = null; this.landTok = null;
    const arrives = (st.summary && typeof window !== 'undefined' && !!window.Summary) || (this.fromPlate && !this.isPlate(st) && (st.room === 'measure' || (st.hero && !st.finale)));
    this.setState({}, () => this.stepMotion(st)); // once the new screen is drawn
    const lines = () => this.playLines(st.lines, () => {
      this.setState({ linesDone: true }); // the screen's own lines are over (later feedback lines don't count)
      // screen 16: after her line the bubble fades, then she walks out to measure the sides
      if (st.task === 'measure' && st.auto) this.tm(() => { this.setState({ bubOff: true }); this.tm(() => this.autoMeasure(), CONFIG.focus.fadeMs + 150); }, 1200);
      // screen 23: the same, then she measures the angles with the protractor
      else if (st.task === 'measureAngles' && st.auto) this.tm(() => { this.setState({ bubOff: true }); this.tm(() => this.autoAngles(), CONFIG.focus.fadeMs + 150); }, CONFIG.angleWalk.leadMs);
      else if (st.task === 'extLegs' && st.auto) this.autoExtend(['DA', 'BC']);
      else if (st.task === 'extBases' && st.auto) {
        // extendDelay (screen 8): a pause after the line (its own gap counts), then the marker and the extension (autoExtend)
        if (st.extendDelay != null) { const tok = this.stepTok; this.tm(() => { if (tok !== this.stepTok) return; this.autoExtend(['AB', 'CD']); }, Math.max(0, st.extendDelay - CONFIG.timing.lineGapMs)); }
        else this.autoExtend(['AB', 'CD']);
      }
      else if (st.summary && window.Summary) Summary.start(this); // screen 37: the summary cards, one by one
      else if (st.finale && window.Finale) this.tm(() => Finale.play(this), 500); // screen 44: The End
      else this.maybeAdvance(true);
    });
    // voiceDelay (ms): Swiftee waits for the screen's opening animation before she speaks
    const glide = fwd && i > 0 && this.steps()[i - 1].room === 'measure' && st.room !== 'measure' ? 800 : 0; // back from the measuring slab
    this.glideMs = glide;
    const speak = () => {
      if (st.voiceDelay || glide) this.tm(lines, Math.max(st.voiceDelay || 0, glide));
      else if (!(st.lines || []).length) this.tm(lines, 60); // a silent screen: let the screen change land before it can move on
      else lines();
    };
    if (arrives && this.landTok !== this.stepTok) this.whenLanded = speak; else speak();
  }
  // Swiftee has arrived on screen tok (stepMotion's dive, the summary's rise): her lines can start
  landed(tok) {
    if (tok !== this.stepTok) return; // (a dive that finished after the screen changed)
    this.landTok = tok;
    const go = this.whenLanded;
    this.whenLanded = null;
    if (go) go();
  }
  // a short lock after each screen change, so a double tap cannot skip a screen
  navLocked() { return Date.now() - (this.navAt || 0) < CONFIG.timing.navLockMs; }
  next() {
    if (!this.state.done || this.navLocked()) return;
    if (this.state.step < this.steps().length - 1) { this.sfx('tap'); this.goTo(this.state.step + 1, true); }
  }
  back() {
    if (this.state.step <= 0 || this.navLocked()) return;
    // skip back over screens that move on by themselves, or Back would bounce straight forward again
    let i = this.state.step - 1;
    while (i > 0 && (this.steps()[i].skip || (CONFIG.flow.autoAdvance && this.steps()[i].locked))) i--;
    this.sfx('tap'); this.goTo(i, false);
  }
  // Screens 30 and 31: the two angle sums, one pair at a time (A and D in focus first, then B and C).
  sumSteps() {
    const tok = this.stepTok, live = () => tok === this.stepTok, V = this.vals(this.state.P);
    const box = (t, r) => ({ t: t, r: r, k: 'gold sumstep' });
    const at = (ms, fn) => this.tm(() => { if (live()) fn(); }, ms);
    this.holdFor(this.cur().sumSteps === 'sym' ? 5200 : 7800);
    if (this.cur().sumSteps === 'sym') { // screen 31: the angle values turn into names, then each sum resolves
      const cs = [box('∠A + ∠D ', '= 180°'), box('∠B + ∠C ', '= 180°')];
      this.setState({ angFocus: 'AD', chips: cs }, () => Motion.wedgeGrow('AD', 0.35));
      at(500, () => this.setState({ symAng: true }, () => Motion.angleNames()));
      at(1500, () => { this.sfx('snap'); Motion.sumResolve(0, false); });
      at(3000, () => this.setState({ angFocus: 'BC' }, () => Motion.wedgeGrow('BC')));
      at(3700, () => { this.sfx('snap'); Motion.sumResolve(1, true); });
      return;
    }
    // screen 30, built like screen 25: each box starts as "∠A + ∠D = ?", the measured angles fly in from the shape
    // and it resolves to 180°; then the same for ∠B + ∠C, whose box stays faded until its turn
    this.setState({ angFocus: 'AD', chips: [] }, () => {
      Motion.wedgeGrow('AD', 0.35);
      Motion.eqStartAt({ i: 0, keys: 'AD', dx: -172, pair: 1 });
      Motion.eqStartAt({ i: 1, keys: 'BC', dx: 172, pair: 1, dim: 1 });
    });
    at(800, () => Motion.eqFlyAt(0));
    at(2400, () => Motion.eqResultAt(0, () => this.sfx('snap')));
    at(4000, () => this.setState({ angFocus: 'BC' }, () => Motion.wedgeGrow('BC')));
    at(4500, () => Motion.eqFlyAt(1));
    at(6100, () => Motion.eqResultAt(1, () => this.sfx('snap')));
  }
  // Screen 34: the learner's right angle glows; on "another" its partner on the same leg (also 90°, since the
  // two add up to 180°) pops and joins the glow.
  anotherStart() {
    const P = this.state.P, right = ['A', 'B', 'C', 'D'].filter((k) => Math.abs(this.angle(P, k) - 90) < 0.5);
    const partner = { A: 'D', D: 'A', B: 'C', C: 'B' };
    let first = this.first90 && right.indexOf(this.first90) >= 0 ? this.first90 : right[0];
    if (!first) return;
    this.another = { first: first, other: partner[first] };
    this.setState({ angFocus: first });
  }
  anotherReveal() {
    const a = this.another;
    if (!a) return;
    this.sfx('chime');
    this.setState({ angFocus: a.first + a.other }, () => Motion.anglePop(a.other));
  }
  // the summary's Next: the learner moves on when they choose (a replaying idea finishes first)
  sumNextGo() {
    if (!this.state.sumNext || !window.Summary || !Summary.canLeave()) return;
    Summary.leave();
    this.sfx('tap');
    this.setState({ sumNext: false });
    this.maybeAdvance(false);
  }
  // screen 29 (explore): Done is the only way to finish; repeat taps do nothing
  doneExplore() {
    const st = this.cur();
    if (!st.explore || !this.state.explored || this.doneTok === this.stepTok || this.state.step >= this.steps().length - 1) return;
    this.doneTok = this.stepTok;
    this.sfx('tap');
    this.setState({ done: true });
    this.goTo(this.state.step + 1, true);
  }
  finishTask() {
    if (this.state.done) return;
    this.setState({ done: true, hand: null }); // task done: the hand has nothing left to point at
    this.armIdle();
    const st = this.cur();
    if (st.auto || this.solved) { this.sfx('good'); this.react(CONFIG.swiftee.praise); } // Swiftee did it (or showed it): no confetti for the learner
    else this.cheer();
    if (st.after && !this.solved) this.playLines(st.after, () => this.maybeAdvance(true));
    else this.maybeAdvance(false); // (a task Swiftee showed: her explanation's end moves the lesson on)
  }
  // every correct learner action: the correct sound and a confetti burst together, then praise
  cheer() {
    this.sfx('good');
    if (window.Confetti) window.Confetti.burst();
    this.react(CONFIG.swiftee.praise);
    Motion.hop();
  }
  // Move a finished screen on by itself, a set time after its last line. Called whenever narration goes quiet;
  // does nothing until the screen's task or check is done, and never leaves the last screen.
  // There is no Next or Back: a finished screen moves on by itself (CONFIG.flow.autoAdvance), once its voice and its
  // animations are over (a screen that asks for something is finished when it has been done). After the journey's
  // last check the lesson hands over to the fishing.
  maybeAdvance(afterLine) {
    if (this.advId) { clearTimeout(this.advId); this.T.delete(this.advId); this.advId = null; }
    const st = this.cur(), i = this.state.step, tok = this.stepTok;
    // with autoAdvance off a screen waits, except steps with autoNext (ms after the voice ends), which flow
    // straight on; screens 1-3 run this way as one continuous intro
    if (!CONFIG.flow.autoAdvance && st.autoNext == null) return;
    const last = i >= this.steps().length - 1;
    if (!this.state.done || (st.end && st.autoNext == null) || (last && !JOURNEY)) return;
    const wait = st.autoNext != null ? st.autoNext : st.autoAdvance != null ? st.autoAdvance : CONFIG.flow.advanceMs;
    const t0 = Date.now();
    const go = () => {
      this.advId = null;
      // if Swiftee is talking again (a hint, feedback), that line's end schedules the move afresh
      if (tok !== this.stepTok || this.state.talking || this.drag || this.ld) return;
      const bd = this.state.build; // a building shape (screen 1) finishes its outline glow and fill fade first
      if (st.build && !(bd && bd.done && !bd.settle)) { this.maybeAdvance(false); return; }
      // a sequence still playing on the board (the angle sums, a straight angle forming) finishes first
      const busy = Date.now() < (this.holdTo || 0) || (typeof Motion !== 'undefined' && Motion.busy && Motion.busy());
      if (busy && Date.now() - t0 < CONFIG.flow.busyMaxMs) { this.advId = this.tm(go, 250); return; }
      if (last) this.handOff(); else this.goTo(i + 1, true);
    };
    this.advId = this.tm(go, Math.max(0, wait - (afterLine ? CONFIG.timing.lineGapMs : 0))); // a finished line has already paused lineGapMs
  }
  // a timed sequence that runs past its line keeps the screen until it is over (ms from now)
  holdFor(ms) { this.holdTo = Math.max(this.holdTo || 0, Date.now() + ms); }

  // ---------- screen animations and measuring ----------
  // measuring goes one side at a time, clockwise from the top
  measureOrder() { return ['AB', 'BC', 'CD', 'DA']; }
  activeSide() {
    const s = this.state;
    if (this.cur().task !== 'measure' || s.done || s.measuring) return null;
    return this.measureOrder().find((k) => !s.tap[k]) || null;
  }
  // a side's two corners, in the order Swiftee walks them
  walkEnds(leg) { const P = this.state.P; return { AB: [P.A, P.B], BC: [P.B, P.C], CD: [P.C, P.D], DA: [P.D, P.A] }[leg]; }
  // convert between board (SVG) coordinates and stage px
  // Board px <-> stage px, worked out from the same values renderVals() puts in boardTf (where the board sits and how
  // big it is on this screen), not measured from the page: some browsers misreport an SVG's on-screen position under
  // CSS transforms, which put Swiftee off the shape while she measured
  boardMap() {
    const st = this.cur(), O = CONFIG.board;
    if (st.room === 'measure') { const R = CONFIG.measureRoom; return { x: O.x + R.tx, y: O.y + R.ty, s: R.scale }; }
    if (!st.noZoom) { const Z = this.fit || (this.isPlate(st) ? CONFIG.lessonZoomPlate : CONFIG.lessonZoom); return { x: O.x + Z.tx, y: O.y + Z.ty, s: Z.scale }; }
    return { x: O.x + CONFIG.scene.boardX, y: O.y + (st.boardShiftY || 0), s: 1 };
  }
  // Lesson screens: the zoom that makes this screen's shape fill the ice panel. Fitted once per screen (goTo) from the
  // shape it opens with, widened to all the screen can do to it - a drag's corner range, a morph's frames, the point
  // where extended legs meet - and padded for the letters and labels round it. The board glides between fits.
  // In the journey's card, a screen without Swiftee: her line is an instruction plate at the top and the shape has the
  // card to itself. She stays where she does something: the opening (she flies in and recalls), the measuring rooms
  // (she measures), the hero screens and the summary (css/game.css .plate)
  isPlate(st) {
    return !!(st && typeof document !== 'undefined' && document.documentElement.classList.contains('in-card') && !st.hero && !st.summary && st.room !== 'measure' && st.id !== 'intro');
  }
  // a plate screen's name plates sit just under the shape, clear of the bottom letters and lengths (never lower than
  // fitPlate.chipTop): the row's top, its 104 px height centring the plate
  plateChipTop(P) {
    const st = this.cur(), m = this.boardMap(), lengths = st.lenPre || (st.f && st.f.sideLen); // (the bottom base's length sits under it)
    return Math.min(CONFIG.fitPlate.chipTop, Math.round(m.y + Math.max(P.C.y, P.D.y) * m.s + (lengths ? 66 : 33)));
  }
  // the box the shape is fitted to: the ice panel, or the plate screen's middle of the card
  fitBase(st) { return this.isPlate(st || this.cur()) ? CONFIG.fitPlate : CONFIG.fit; }
  fitFor(st, P, reach = 1) { // reach (screen 5): how far the legs have extended toward their meeting point, 0 (the shape alone) to 1
    const base = this.fitBase(st), box = Object.assign({}, st.fitBox || {});
    if (base !== CONFIG.fit) { // a screen's own box is placed about the panel: move it with the shape, and grow it with the card
      if (box.cx != null) box.cx += base.cx - CONFIG.fit.cx;
      if (box.cy != null) box.cy += base.cy - CONFIG.fit.cy;
      if (box.h != null) box.h *= 1.35;
      if (box.w != null) box.w *= 1.3;
    }
    const F = Object.assign({}, base, box), L = CONFIG.limits;
    if (base !== CONFIG.fit && st.task === 'extLegs') { F.cy += (382 - F.cy) * reach; F.h += (576 - F.h) * reach; } // the extended legs meet high above the shape: a taller box, up under the plate
    let x0 = Math.min(P.A.x, P.D.x), x1 = Math.max(P.B.x, P.C.x), y0 = Math.min(P.A.y, P.B.y), y1 = Math.max(P.C.y, P.D.y);
    const dragRoom = /^drag/.test(st.task || '') && !st.fitShape; // room for every corner position (fitShape: the shape itself)
    if (dragRoom) { x0 = Math.min(x0, L.minX + 30); x1 = Math.max(x1, L.maxX - 30); }
    (st.morph || []).forEach((m) => { x0 = Math.min(x0, m.A, P.D.x); x1 = Math.max(x1, m.B, P.C.x); });
    if (st.task === 'extLegs' && reach > 0) { // the two tips, `reach` of the way to where the legs meet
      const ap = this.inter(P.A, P.D, P.B, P.C);
      if (ap) [P.A, P.B].forEach((V) => { const x = V.x + (ap.x - V.x) * reach, y = V.y + (ap.y - V.y) * reach; y0 = Math.min(y0, y - 12 * reach); x0 = Math.min(x0, x); x1 = Math.max(x1, x); });
    }
    const padB = F.padBottom + (st.f && st.f.sums ? 34 : 0);
    // length labels stand beside the legs, so a screen that shows them keeps more room at the sides
    const f = st.f || {}, padX = F.padX + (st.lenPre || f.sideLen || f.legLen || dragRoom ? 44 : 0);
    const s = Math.min(F.maxScale, F.w / (x1 - x0 + 2 * padX), F.h / (y1 - y0 + F.padTop + padB));
    const cx = (x0 + x1) / 2, cy = (y0 - F.padTop + y1 + padB) / 2;
    return { scale: +s.toFixed(3), tx: +(F.cx - CONFIG.board.x - cx * s).toFixed(1), ty: +(F.cy - CONFIG.board.y - cy * s).toFixed(1) };
  }
  // how far the extended bases may run (board px): to the ice panel's inner edges, whatever the zoom
  extBounds() {
    const F = this.fitBase(), a = this.stageToBoard({ x: F.cx - F.w / 2, y: 0 }), b = this.stageToBoard({ x: F.cx + F.w / 2, y: 0 });
    return { l: a.x, r: b.x };
  }
  // How much the shape may grow about its centre (a pop or a zoom-in) and still stay inside the ice card, with its
  // corner letters and labels: the largest scale, never below 1
  popRoom() {
    const st = this.cur(), P = this.state.P, F = this.fitBase(st);
    if (!P || st.room === 'measure' || st.noZoom) return 1.04;
    const pad = 46, xs = [P.A.x, P.B.x, P.C.x, P.D.x], ys = [P.A.y, P.B.y, P.C.y, P.D.y];
    const cx = xs.reduce((a, b) => a + b) / 4, cy = ys.reduce((a, b) => a + b) / 4, c = this.boardToStage({ x: cx, y: cy }), k = this.boardMap().s;
    const half = { l: (cx - Math.min(...xs) + pad) * k, r: (Math.max(...xs) - cx + pad) * k, t: (cy - Math.min(...ys) + pad) * k, b: (Math.max(...ys) - cy + pad) * k };
    const L = F.cx - F.w / 2, R = F.cx + F.w / 2, T = F.cy - F.h / 2, B = F.cy + F.h / 2;
    return Math.max(1, Math.min((c.x - L) / half.l, (R - c.x) / half.r, (c.y - T) / half.t, (B - c.y) / half.b));
  }
  boardToStage(p) {
    if (!p) return null;
    const m = this.boardMap();
    return { x: m.x + p.x * m.s, y: m.y + p.y * m.s };
  }
  stageToBoard(p) {
    if (!p) return null;
    const m = this.boardMap();
    return { x: (p.x - m.x) / m.s, y: (p.y - m.y) / m.s };
  }
  // Screens 7 and 8, both sides of the pair at once, so the learner sees them as a pair. Legs: the yellow marker
  // runs up both, then two glowing pen tips race toward each other drawing the dotted extensions, while the board
  // pulls back to show where they will meet, and they meet with a burst. Bases (just marked by her line): the dotted
  // extensions run out to the card's edges both ways, and arrowheads show they go on forever. On screen 7 it waits
  // for the shape to reach centre stage.
  autoExtend(keys) {
    const tok = this.stepTok, live = () => tok === this.stepTok && !this.state.done;
    if (!live()) return;
    if (this.cur().layout === 'focus') {
      if (!this.state.centered) { this.tm(() => this.autoExtend(keys), 100); return; }
      const wait = (this.focusAt || 0) + CONFIG.focus.moveMs + 300 - Date.now();
      if (wait > 0) { this.tm(() => this.autoExtend(keys), wait); return; }
    }
    const st = this.cur(), isLegs = st.task === 'extLegs', P = this.state.P, sp = CONFIG.trace.pxPerMs;
    if (this.extTok === tok) return; // (the legs start on her word "extend": the end of her line finds them going)
    this.extTok = tok;
    let len;
    // the legs: straight out of their ends with no marker first, the camera pulling back as the tips climb (on the card)
    const pull = isLegs && this.fit && this.isPlate(st) ? (e) => { this.fit = this.fitFor(st, P, e); } : null;
    if (isLegs) {
      const ap = this.inter(P.A, P.D, P.B, P.C) || { x: (P.A.x + P.B.x) / 2, y: P.A.y - 60 };
      len = Math.max(this.dist(P.A, ap), this.dist(P.B, ap));
    } else { const X = this.extBounds(); len = Math.max(P.A.x - X.l, X.r - P.B.x, P.D.x - X.l, X.r - P.C.x); }
    this.sfx('whoosh');
    Motion.value(0, 1, Motion.reduced ? 0 : Math.min(2.2, Math.max(1.1, len / sp / 1000 * 0.75)), 'sine.inOut', (e) => {
      if (!live()) return;
      const ext = Object.assign({}, this.state.ext); keys.forEach((k) => { ext[k] = Math.max(e, 0.001); });
      if (pull) pull(e);
      this.setState({ ext: ext, tracking: !!pull });
    }, () => {
      if (!live()) return;
      const ext = Object.assign({}, this.state.ext); keys.forEach((k) => { ext[k] = 1; });
      if (pull) pull(1);
      this.setState({ ext: ext, emph: {}, tracking: false });
      this.sfx(isLegs ? 'snap' : 'pop');
      if (isLegs) this.tm(() => this.sfx('chime'), 120);
      this.tm(() => { if (live()) this.finishTask(); }, isLegs ? 700 : 450);
    });
  }
  extendLegs() { this.autoExtend(['DA', 'BC']); } // screen 5, on "extend"
  // Screen 1: the outline draws itself in one stroke, D -> A -> B -> C -> D, without stopping at the corners.
  // Then the outline glow settles and the fill fades in.
  runBuild() {
    const tok = this.stepTok, P = this.state.P, Bc = CONFIG.build;
    const total = this.dist(P.D, P.A) + this.dist(P.A, P.B) + this.dist(P.B, P.C) + this.dist(P.C, P.D);
    Motion.value(0.001, total, total / Bc.pxPerMs / 1000, 'sine.inOut', (d) => {
      if (tok === this.stepTok) this.setState({ build: { d: d, done: false } });
    }, () => {
      if (tok !== this.stepTok) return;
      this.setState({ build: { d: total, done: true, settle: true, fill: true }, trace: null }, () => Motion.settle());
      this.tm(() => { if (tok === this.stepTok) this.setState({ build: { d: total, done: true, settle: false, fill: true } }); }, Bc.settleMs);
    });
  }
  // Screen 28, on "change": the corners pulse, then A and B glide through the morph frames. Only x moves, so the
  // bases stay parallel, and each frame goes through setState so the angles update live.
  shapeMorph() {
    const st = this.cur(), tok = this.stepTok;
    if (!st.morph || this.morphing) return;
    this.morphing = true;
    Motion.vertexPulse();
    const P0 = this.state.P;
    Motion.morph({ A: P0.A.x, B: P0.B.x }, st.morph, (o) => {
      if (tok !== this.stepTok) return;
      const P = this.clone(this.state.P); P.A.x = o.A; P.B.x = o.B; this.setState({ P: P });
    }, () => this.sfx('tap'), () => {
      if (tok !== this.stepTok) return;
      this.morphing = false;
      if (this.settleWaiting) { this.settleWaiting = false; this.shapeSettle(); }
    });
  }
  // screen 28, on "trapezium": the new shape settles with a gentle bounce (after the morph, if it is still running)
  shapeSettle() {
    if (this.morphing) { this.settleWaiting = true; return; }
    this.sfx('pop');
    const P = this.state.P;
    Motion.settleShape((P.A.x + P.B.x + P.C.x + P.D.x) / 4, (P.A.y + P.B.y + P.C.y + P.D.y) / 4);
  }
  // screen 29, on "change": a guide hand drags vertex A sideways and back while the sums update live
  demoDrag() {
    const tok = this.stepTok, x0 = this.state.P.A.x, dx = -55;
    if (this.state.done) return;
    if (typeof document !== 'undefined') {
      const el = document.querySelector('[data-qa="vtx-A"]'), stage = document.querySelector('.stage');
      if (el && stage) {
        const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
        this.setState({ hand: { kind: 'drag', once: true, n: 99, x: Math.round((r.left + r.width / 2 - sr.left) / sc), y: Math.round((r.top + r.height / 2 - sr.top) / sc), dx: Math.round(dx * 1.15), dy: 0 } });
      }
    }
    const setX = (x) => { if (tok !== this.stepTok || this.drag) return; const P = this.clone(this.state.P); P.A.x = x; this.setState({ P: P }); };
    this.sfx('tap');
    Motion.wait(0.45, () => Motion.value(x0, x0 + dx, 0.75, 'sine.inOut', setX, () => {
      Motion.value(x0 + dx, x0, 0.75, 'back.out(1.4)', setX, () => { if (tok === this.stepTok) this.setState({ hand: null }); });
    }));
  }
  // small word cues for lines that name a part: the legs glow once (screens 5, 6); angles A and D grow again (24)
  // Highlight cues share one focus language (emphasize): the named sides get the gold highlighter, corners ping,
  // angles glow, and the rest of the shape steps back while Swiftee talks about them
  glowLegs() { this.emphasize(['DA', 'BC']); }
  growAD() { this.emphasize(['aA', 'aD']); } // the pair already swept open as the screen opened: now it is pointed out
  parPulse() { this.emphasize(['AB', 'CD']); Motion.parallelShow(); } // the arrows run along both bases the same way
  suppConfirmLater() { const tok = this.stepTok; this.holdFor(3800); this.tm(() => { if (tok !== this.stepTok) return; this.sfx('snap'); Motion.suppConfirm(); }, 2800); }
  // screen 1, on "4 sides": the sides are numbered one after another, each side lighting up as its number lands (once
  // the pen has drawn the outline)
  sideNumsGo() {
    const bd = this.state.build, tok = this.stepTok;
    if (this.cur().build && !(bd && bd.done)) { this.tm(() => { if (tok === this.stepTok) this.sideNumsGo(); }, 100); return; }
    Motion.sideNums((i) => this.emphasize([['AB', 'BC', 'CD', 'DA'][i]], null, true));
  }
  vertexPulse() { ['A', 'B', 'C', 'D'].forEach((k, i) => this.tm(() => this.emphasize(['v' + k]), i * 420)); } // one corner after another
  legsPop() { this.emphasize(['DA', 'BC']); Motion.legsPop(); }
  // screen 18, on "legs": both legs glow together and their lengths pulse
  legsTogether() {
    const P = this.state.P, d = (a, b) => this.cm(this.dist(P[a], P[b]));
    Motion.legsHold([['DA', d('D', 'A')], ['BC', d('B', 'C')]], 0, 1.4); // held through "same length?"
  }
  // screen 18, "Let's find out.": a chime, the legs glow once more and the board pulses gently
  findOut() {
    this.sfx('chime');
    this.legsTogether();
    Motion.boardPulse();
  }
  // screen 21, on "isosceles": the equal lengths turn into equal marks, then the name label pops in
  isoName() {
    const tok = this.narrTok;
    this.sfx('whoosh');
    Motion.lensToTicks();
    this.tm(() => { if (tok === this.narrTok) this.showTitle(); }, 900);
  }
  // the scalene screen, on "sides": the lengths come in side by side, and the name waits for the last one (showTitle)
  lensSeq() { this.revealUntil = Date.now() + Motion.lensSeq() * 1000; }
  // the line's name label pops in on its cue word (holdChips keeps it back until then), once the sides it names are in
  showTitle() {
    const L = this.curLine, wait = (this.revealUntil || 0) - Date.now(), tok = this.narrTok;
    if (wait > 0) { this.tm(() => { if (tok === this.narrTok) this.showTitle(); }, wait); return; }
    if (!L || !L.chips) return;
    this.addChips(L.chips);
    this.sfx('pop');
    this.setState({}, () => Motion.titlePop());
  }
  // what a screen animates once it is drawn (GSAP, js/motion.js)
  stepMotion(st) {
    if (st !== this.cur()) return;
    if (st.sumSteps) this.sumSteps();
    // focusAng: the pair's wedges grow in from the start (a line with angleCues grows them one by one instead)
    if (st.f && st.f.focusAng && !((st.lines || [])[0] || {}).angleCues) Motion.wedgeGrow(st.f.focusAng, 0.35 + (this.glideMs || 0) / 1000);
    if (st.build) { Motion.hideFill(); this.tm(() => this.runBuild(), CONFIG.build.delayMs); }
    if (st.sideNums) Motion.sideNumsHide(); // the side numbers wait for "4 sides" (sideNumsGo)
    // screen 3: the side numbers fade out, then are dropped so no later redraw can flash them back; the corner
    // letters start hidden and fly in on their voice cues
    if (st.letterIn) { Motion.lettersReset(); Motion.fadeOut('.tag.snum'); const tok = this.stepTok; this.tm(() => { if (tok === this.stepTok) this.setState({ numsGone: true }); }, 450); }
    if (st.entryPop) Motion.entryPop();
    if (st.hero && !st.finale) {
      const tok = this.stepTok;
      if (this.fromPlate) this.swifteeIn(() => { this.landed(tok); const sw = document.querySelector('.stage .swiftee'); if (sw && window.gsap && !Motion.reduced) gsap.to(sw, { y: -12, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }); });
      else Motion.heroIn(); // (on 44 she is already centre stage)
    }
    if (st.room === 'measure' && this.fromPlate) { const tok = this.stepTok; this.swifteeIn(() => this.landed(tok)); } // back from a plate screen: a swoop onto the slab, not a pop
    if (st.enterFx && Motion[st.enterFx]) Motion[st.enterFx]();
    if (st.summary && window.Summary) Summary.enter(this); // screen 37: set up the summary layer
  }
  // screen 16: measure the sides one after another
  autoMeasure() {
    const tok = this.stepTok;
    const nextSide = () => {
      if (tok !== this.stepTok || this.state.done) return;
      const k = this.activeSide();
      if (k) this.measureLeg(k, nextSide);
    };
    nextSide();
  }
  // Where Swiftee's feet are (stage px) and how tall she is drawn, read from her element so the measuring
  // walk starts and ends wherever the screen puts her.
  homeFeet() {
    const W = CONFIG.walker, el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), b = el && this.elBox(el);
    const base = (window.SWIFTEE_MANIFEST && SWIFTEE_MANIFEST.baselineY && SWIFTEE_MANIFEST.baselineY.normalized) || 0.877;
    return b ? { x: b.x + b.w / 2, y: b.y + b.h * base } : { x: W.homeX, y: W.homeY };
  }
  homeSize() {
    const el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), b = el && this.elBox(el);
    return b ? b.h : CONFIG.walker.homeSize;
  }
  // Screen 16: Swiftee walks along one side laying her tape measure, then its length shows.
  // Without a page (headless test) the same steps run on timers.
  measureLeg(leg, then) {
    const s = this.state;
    if (s.done || s.tap[leg] || this.rulerBusy) return;
    if (this.cur().task === 'measure' && leg !== this.activeSide()) return; // only the next side in order
    this.rulerBusy = true; // a measuring walk is under way
    this.setState({ measuring: leg, tape: { leg: leg, t: 0 }, hand: null });
    this.sfx('tap');
    const tok = this.stepTok, W = CONFIG.walker, ends = this.walkEnds(leg);
    const lenCm = this.dist(ends[0], ends[1]) / this.S;
    const walkMs = Math.max(900, lenCm * W.msPerCm);
    const wk = this.walker();
    const live = () => tok === this.stepTok;
    const arrive = () => {
      if (!live()) return;
      const tap = Object.assign({}, this.state.tap); tap[leg] = true;
      // the tape lies flat along the whole side until the next side starts
      // its length slides out of the side
      this.setState({ tap: tap, tape: Object.assign({}, this.state.tape, { t: 1, tip: null }) }, () => {
        if (typeof document === 'undefined') return;
        const lab = [...document.querySelectorAll('.stage .board .tag.mtag.m' + leg)].find((e) => getComputedStyle(e).display !== 'none' && !e.classList.contains('off'));
        if (lab) Motion.lenOut(lab, leg);
      });
      this.sfx('pop');
      this.rulerBusy = false;
      if (tap.AB && tap.BC && tap.CD && tap.DA) {
        // all four measured: she walks home, then the screen carries on
        const home = () => { if (!live()) return; this.setState({ measuring: null, swAway: false, tape: null }); if (wk) wk.hide(); this.pose(this.restPose()); this.tm(() => this.finishTask(), 250); };
        if (wk) { const from = this.boardToStage(ends[1]); this.tm(() => { if (live() && from) wk.stroll(from, this.homeFeet(), W.size, this.homeSize(), home); else home(); }, 450); }
        else this.tm(home, 450);
      } else {
        this.setState({ measuring: null }); // a short beat on the corner, then the next side
        if (then) this.tm(then, CONFIG.walker.pauseMs);
      }
    };
    const walkIt = () => {
      if (!live()) return;
      const from = wk && this.boardToStage(ends[0]), to = wk && this.boardToStage(ends[1]);
      if (wk && from && to) wk.walk(from, to, walkMs, (t) => { if (live()) this.setState({ tape: { leg: leg, t: t, tip: this.stageToBoard(wk.tip()) } }); }, arrive);
      else this.tm(arrive, 300);
    };
    if (wk && !this.state.swAway) {
      // first side: she walks from where she stands to the side's first corner
      const to = this.boardToStage(ends[0]);
      this.setState({ swAway: true });
      if (to) wk.stroll(this.homeFeet(), to, this.homeSize(), W.size, walkIt); else walkIt();
    } else walkIt();
  }
  walker() {
    if (typeof document === 'undefined' || !window.SwifteeWalker || !document.querySelector('.walker')) return null;
    return this.wk || (this.wk = new window.SwifteeWalker(CONFIG.swiftee.base));
  }
  // Screen 23: Swiftee carries a protractor round A, B, C, D (js/angle-walker.js). Each angle and its value
  // appear while she holds the protractor there; then she walks home and the screen is done. With reduced
  // motion, or no page (headless test), all four angles show at once.
  autoAngles() {
    const tok = this.stepTok, live = () => tok === this.stepTok && !this.state.done;
    if (!live()) return;
    const keys = ['A', 'B', 'C', 'D'], P = this.state.P, aw = this.angleWalker();
    const verts = aw ? keys.map((k) => this.boardToStage(P[k])) : [];
    const end = () => { if (live()) this.finishTask(); };
    if (!aw || Motion.reduced || verts.some((v) => !v)) { this.sfx('pop'); Motion.anglesIn(); this.tm(end, 2600); return; }
    aw.start({
      verts: verts, home: this.homeBody(), homeEl: document.querySelector('.stage .swiftee'), colors: ['#ff7a00', '#00c853', '#9d4dff', '#ffab00'],
      labelAt: (i) => { const lab = document.querySelector('.stage .tag.alab.l' + keys[i]); return lab && this.elToStage(lab); }, // where each count-up runs
      onReading: (i) => {
        if (!live()) return;
        const k = keys[i], lab = document.querySelector('.stage .tag.alab.l' + k);
        this.sfx('pop');
        Motion.angleIn(k); // the value stamps in where its count-up ran
      },
      onDone: () => { if (live()) { this.pose(this.restPose()); this.tm(end, 200); } }
    });
  }
  angleWalker() {
    if (typeof document === 'undefined' || !window.AngleWalker || !window.AngleMeasuringFrames || !document.querySelector('.angle-walk')) return null;
    return this.aw || (this.aw = new window.AngleWalker());
  }
  // an element's box (top-left x, y and w, h) and its middle, in stage px
  elBox(el) {
    const stage = document.querySelector('.stage'), r = el.getBoundingClientRect(), sr = stage && stage.getBoundingClientRect();
    if (!sr || (!r.width && !r.height)) return null;
    const k = sr.width / 1280 || 1;
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  }
  elToStage(el) { const b = this.elBox(el); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; }
  // Swiftee's body centre where she stands (stage px) and her scale there (k): where the protractor walk
  // starts and ends
  homeBody() {
    const el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee .swiftee-still'), b = el && this.elBox(el);
    const k = CONFIG.angleWalk.homeK * (b ? b.h / 198 : 1); // homeK is for her full size (the still is 198 px tall)
    return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 + 14 * b.h / 198, k: k } : { x: CONFIG.walker.homeX + 3, y: CONFIG.walker.homeY - 95, k: k };
  }

  // ---------- geometry ----------
  dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
  // the two neighbours of each corner
  nb(k) { return { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[k]; }
  // interior angle at corner k, in degrees
  angle(P, k) {
    const n = this.nb(k), V = P[k], p = P[n[0]], q = P[n[1]];
    const ux = p.x - V.x, uy = p.y - V.y, vx = q.x - V.x, vy = q.y - V.y;
    const c = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  // angle values as shown: D and C are 180 minus A and B, so each leg's pair always adds up to exactly 180
  vals(P) {
    const a = Math.round(this.angle(P, 'A')), b = Math.round(this.angle(P, 'B'));
    return { A: a, D: 180 - a, B: b, C: 180 - b };
  }
  // a length in px as a label: "5 cm", "4.5 cm"
  cm(px) {
    const v = Math.round((px / this.S) * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + ' cm';
  }
  // where line AD meets line BC (null if they are parallel)
  inter(A, D, B, C) {
    const x1 = A.x, y1 = A.y, x2 = D.x, y2 = D.y, x3 = B.x, y3 = B.y, x4 = C.x, y4 = C.y;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  // pointer position in board (SVG) coordinates
  toSvg(svg, e) {
    try {
      const m = svg.getScreenCTM();
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(m.inverse());
    } catch (err) { return null; }
  }
  // screen 20: only A can be dragged
  dragKey() {
    const st = this.cur(), s = this.state;
    return st.task === 'dragA' && !s.done ? 'A' : null;
  }
  // ---------- lesson interactions ----------
  // screens 29 and 33: any corner can be dragged
  anyCorner() { const t = this.cur().task; return (t === 'dragFree' || t === 'drag90') && !this.state.done; }
  canDrag(k) { return this.dragKey() === k || this.anyCorner(); }
  down(k, e) {
    if (this.solving) return; // (Swiftee is putting the corner right: solveDrag)
    if (!this.canDrag(k) || !this.firstPointer(e)) return;
    if (this.cur().lockTalk && this.state.talking && !this.state.explored) return; // listen first: the corners respond once she has finished
    const svg = e.currentTarget && e.currentTarget.ownerSVGElement;
    if (!svg) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
    // off: where the finger took hold, relative to the corner (the touch circle is wide), so the corner moves with the
    // finger instead of jumping under it on the first move
    const p0 = this.toSvg(svg, e);
    this.drag = { k: k, svg: svg, x0: this.state.P[k].x, pid: e.pointerId, off: p0 ? this.state.P[k].x - p0.x : 0 };
    this.touched = true; // the learner has started: no more demo hand
    if (this.handId) { clearTimeout(this.handId); this.T.delete(this.handId); this.handId = null; }
    this.setState({ dragging: k, hand: null });
    this.sfx('tap');
  }
  move(e) {
    if (!this.drag || !this.samePointer(this.drag, e)) return;
    const p = this.toSvg(this.drag.svg, e);
    if (!p) return;
    const P = this.clone(this.state.P), k = this.drag.k;
    let x = p.x + (this.drag.off || 0);
    // bases stay parallel (only x moves); the limits stop the shape crossing itself or going unreadably thin
    const Lm = CONFIG.limits, SL = Lm.maxLegRun;
    if (k === 'B') x = Math.max(P.A.x + Lm.minTop, P.C.x - SL, Math.min(Lm.maxX, P.C.x + SL, x)); // (B may pass C, as A may pass D)
    if (k === 'A') x = Math.max(Lm.minX, P.D.x - SL, Math.min(P.B.x - Lm.minTop, P.D.x + SL, x));
    if (k === 'D') x = Math.max(Lm.minX, P.A.x - SL, Math.min(P.C.x - Lm.minBottom, P.A.x + SL, x));
    if (k === 'C') x = Math.max(P.D.x + Lm.minBottom, P.B.x - SL, Math.min(Lm.maxX, P.B.x + SL, x));
    // fitShape: the shape fills the card, so a corner stops at the card's inner edge (room left for its letter)
    if (this.cur().fitShape) { const eb = this.extBounds(); x = Math.max(eb.l + 36, Math.min(eb.r - 36, x)); }
    P[k].x = x;
    // the drag tasks snap while the corner is still held: once AD is close to BC (or the drag jumps past it between two
    // moves), A locks at the equal-legs point; once the dragged corner's angle is close to 90°, its leg stands upright.
    // Either way the task is done straight away
    const task = this.cur().task;
    if (!this.state.done && (task === 'dragA' && k === 'A' || task === 'drag90')) {
      let near;
      if (task === 'dragA') {
        const bc = this.dist(P.B, P.C), adNow = this.dist(P.A, P.D), adWas = this.dist(this.state.P.A, P.D);
        near = Math.abs(adNow - bc) < CONFIG.snap.exactCm * this.S || (adWas - bc) * (adNow - bc) < 0;
        if (near) P.A.x = P.D.x + (P.C.x - P.B.x);
      } else {
        near = Math.abs(this.angle(P, k === 'A' || k === 'D' ? 'A' : 'B') - 90) < CONFIG.snap.rightAngleDeg;
        if (near) { this.uprightLeg(P, k); this.first90 = k; } // (screen 29 reveals this corner's partner on the same leg)
      }
      if (near) {
        this.drag = null;
        this.sfx('snap');
        this.setState({ P: P, moved: true, dragging: null });
        this.finishTask();
        return;
      }
    }
    this.setState({ P: P, moved: this.state.moved || Math.abs(x - this.drag.x0) > 25 });
    this.overDrag(k, x);
  }
  // wrongRight: { cm, side }. Dragging the corner right (the wrong way) more than cm from its start wiggles that
  // side with the incorrect sound. It fires on crossing the limit only, at most once per CONFIG.drag.wrongGapMs.
  overDrag(k, x) {
    const W = this.cur().wrongRight, start = this.snaps[this.state.step];
    if (!W || !start || this.state.done) return;
    const over = x - start[k].x > W.cm * this.S;
    if (over && !this.overWig && Date.now() - (this.wigAt || 0) > CONFIG.drag.wrongGapMs) {
      this.wigAt = Date.now();
      this.sfx('bad');
      Motion.wiggle(W.side);
    }
    this.overWig = over;
  }
  up(e) {
    if (!this.drag || !this.samePointer(this.drag, e)) return;
    const k = this.drag.k;
    this.dragMoved = Math.abs(this.state.P[k].x - this.drag.x0) > 2;
    this.drag = null;
    this.setState({ dragging: null });
    this.checkDrag(k);
  }
  // check a finished drag against the screen's task
  checkDrag(k) {
    const st = this.cur(), s = this.state, P = this.clone(s.P);
    if (st.task === 'dragA' && !s.done) {
      const ad = this.dist(P.A, P.D), bc = this.dist(P.B, P.C);
      if (Math.abs(ad - bc) < CONFIG.snap.exactCm * this.S) { // usually already caught while dragging
        P.A.x = P.D.x + (P.C.x - P.B.x);
        this.setState({ P: P });
        this.finishTask();
      } else if (s.moved) { // anything else (5.2 cm, 4.8 cm...) is not correct yet
        if (Date.now() - (this.wigAt || 0) > 2500) this.sfx('bad'); // skip it if a wrong-way wiggle just played it
        if ((this.misses = (this.misses || 0) + 1) >= 2) { this.solveDrag('A'); return; } // a second wrong try: shown
        this.interject({ t: 'AD is ' + this.cm(ad) + '. ' + (ad > bc ? 'Keep dragging A' : 'Drag A back a little') + ' until it shows exactly ' + this.cm(bc) + '.' });
      }
    } else if (st.task === 'dragFree' && st.explore && !s.done) {
      // explore (screen 29): drags just reshape, with no check and no success feedback. The first real drag
      // unlocks Done and plays the screen's `after` lines, if any.
      if (!this.dragMoved) return;
      this.sfx('tick');
      if (!s.explored) {
        this.setState({ explored: true, hand: null });
        if (st.after) this.playLines(st.after, () => {});
      }
    } else if (st.task === 'drag90' && !s.done && (s.moved || this.dragMoved)) { // (small nudges onto 90° count too)
      // screen 33: snap when the dragged corner's leg is close to a right angle
      const left = k === 'A' || k === 'D', a = this.angle(P, left ? 'A' : 'B');
      if (Math.abs(a - 90) < CONFIG.snap.rightAngleDeg) { // (usually already caught while dragging)
        this.uprightLeg(P, k);
        this.first90 = k; // screen 34 reveals this corner's partner on the same leg
        this.setState({ P: P });
        this.finishTask();
      } else {
        this.sfx('bad');
        if ((this.misses = (this.misses || 0) + 1) >= 2) { this.solveDrag(k); return; } // a second wrong try: shown
        this.interject({ t: '∠' + k + ' is ' + Math.round(this.angle(P, k)) + '° now. Keep dragging until it shows 90°.' });
      }
    }
  }

  // corner k's leg stands upright (k moves straight above or below its partner on the same leg): a right angle at k
  uprightLeg(P, k) { if (k === 'A') P.A.x = P.D.x; if (k === 'D') P.D.x = P.A.x; if (k === 'B') P.B.x = P.C.x; if (k === 'C') P.C.x = P.B.x; }
  // a corner-drag task after a second wrong try: the corner glides on its own to where it belongs (legs equal, or the
  // angle at 90°) while Swiftee says why (the step's revealLine), and the task finishes as if she had done it - no
  // confetti for the learner
  solveDrag(k) {
    const st = this.cur(), P0 = this.clone(this.state.P), P1 = this.clone(P0), tok = this.stepTok;
    if (st.task === 'dragA') P1.A.x = P1.D.x + (P1.C.x - P1.B.x);
    else { this.uprightLeg(P1, k); this.first90 = k; }
    let glided = false, said = !st.revealLine;
    const end = () => { if (glided && said && tok === this.stepTok) this.setState({ P: P1 }, () => this.finishTask()); };
    this.solving = true; this.revealing = true;
    this.tm(() => { said = true; end(); }, 12000); // whatever happens to her line, the screen still finishes
    this.setState({ hand: null });
    if (st.revealLine) { // what she is showing, said as the corner moves
      this.narrTok++; this.cancelSpeech(); this.q = null;
      this.say({ m: CONFIG.swiftee.nudge, t: st.revealLine.replace('{k}', k) }, () => { said = true; end(); });
    }
    Motion.value(0, 1, Motion.reduced ? 0 : 1.2, 'power2.inOut', (e) => {
      if (tok !== this.stepTok) return;
      const P = this.clone(P0); P[k].x = P0[k].x + (P1[k].x - P0[k].x) * e; this.setState({ P: P });
    }, () => {
      this.solving = false;
      if (tok !== this.stepTok) return;
      this.solved = true; glided = true;
      this.setState({ P: P1 }, end);
    });
  }
  // ---------- CFU ----------
  // an answer tapped on a check or practice screen; results keep whether each check was right first time
  pick(o) {
    const st = this.cur(), s = this.state;
    if (s.done || s.picks[o.id]) return;
    const picks = Object.assign({}, s.picks);
    if (o.ok) {
      picks[o.id] = 'good';
      const results = Object.assign({}, s.results);
      if (results[st.id] === undefined && !st.practice) results[st.id] = s.cfuFirst;
      let okChips = st.okChips;
      if (st.okSum) { const V = this.vals(s.P); okChips = [{ t: st.okSum.map((k) => V[k] + '°').join(' + ') + ' = 180°', k: 'gold' }]; }
      if (st.okFx) this.setState({}, () => Motion.paced(() => Motion[st.okFx](o), 1.35));
      this.setState({ picks: picks, done: true, results: results, chips: okChips || s.chips }, () => {
        if (st.okSum) { Motion.anglesTogether(st.okSum); Motion.chipPop(); Motion.chipGlow(0.35); }
      });
      this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      picks[o.id] = 'bad';
      this.misses = (this.misses || 0) + 1;
      if (st.badFx) Motion.paced(() => Motion[st.badFx](this.misses), 1.35);
      const right = this.misses >= 2 && !st.cfu && (st.opts || []).find((x) => x.ok);
      if (right) { this.revealing = true; // a practice question, second wrong try: the answer is shown rather than asked again (it would feel like a loop). Not on the checks: there the learner keeps trying, with Swiftee's hints
        picks[right.id] = 'good';
        const results = Object.assign({}, s.results);
        if (results[st.id] === undefined && !st.practice) results[st.id] = false;
        let okChips = st.okChips;
        if (st.okSum) { const V = this.vals(s.P); okChips = [{ t: st.okSum.map((k) => V[k] + '°').join(' + ') + ' = 180°', k: 'gold' }]; }
        this.setState({ picks: picks, cfuFirst: false, done: true, results: results, chips: okChips || s.chips }, () => {
          if (st.okFx) Motion.paced(() => Motion[st.okFx](right), 1.35);
          if (st.okSum) { Motion.anglesTogether(st.okSum); Motion.chipPop(); Motion.chipGlow(0.35); }
        });
        this.sfx('bad');
        this.interject({ m: CONFIG.swiftee.nudge, t: st.revealLine || st.ok }); // why that is the answer (then the lesson moves on: interject -> maybeAdvance)
        return;
      }
      this.setState({ picks: picks, cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: o.fb });
      this.poke();
    }
  }
  // check 4: where a label sits (being dragged, in a slot, or in the row below)
  labPos(id) {
    const c4 = this.state.c4;
    if (c4.drag && c4.drag.id === id) return { x: c4.drag.x, y: c4.drag.y };
    if (c4.at[id]) { const sl = this.slotsDef().find((q) => q.id === c4.at[id]); return c4.locked[id] ? { x: 840 + 4, y: sl.y + 4 } : { x: 840 + 42, y: sl.y + 4 }; } // a locked label widens to fill its slot (CSS .lab.lock)
    const i = this.labsDef().findIndex((l) => l.id === id);
    return { x: 556 + i * 216, y: this.isPlate(this.cur()) ? 516 : 476 }; // three 208-wide labels, 8 apart (lower on the card, where there is room)
  }
  // a stage point into check 4's group px (the group is drawn scaled, CONFIG.q4, or CONFIG.q4Plate on the journey's card)
  q4Pt(x, y) { const Q = this.isPlate(this.cur()) ? CONFIG.q4Plate : CONFIG.q4; return { x: Q.ox + (x - Q.ox - (Q.tx || 0)) / Q.k, y: Q.oy + (y - Q.oy - Q.ty) / Q.k }; }
  labDown(id, e) {
    const c4 = this.state.c4;
    if (this.cur().labelsAt && !this.state.labsIn) return; // labels arrive with the instruction
    if (c4.locked[id] || c4.checking || this.state.done || !this.firstPointer(e)) return;
    const tgt = e.currentTarget;
    const root = tgt && tgt.closest ? tgt.closest('.stage') : null;
    if (!root) return;
    const r = root.getBoundingClientRect(), sc = r.width / 1280 || 1;
    const pos = this.labPos(id);
    const q = this.q4Pt((e.clientX - r.left) / sc, (e.clientY - r.top) / sc), px = q.x, py = q.y;
    this.ld = { id: id, r: r, sc: sc, ox: px - pos.x, oy: py - pos.y, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId };
    try { tgt.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
  }
  // One finger at a time: a drag belongs to the pointer that started it. A second finger (or a right click) can't start
  // another drag, and its moves and lifts are ignored, so it can't take the corner or label from the first. A primary
  // pointer only goes down when no other is down, so it may replace a drag whose lift was lost
  firstPointer(e) { return !(e && (e.isPrimary === false || e.button > 0)); }
  samePointer(d, e) { return d.pid == null || !e || e.pointerId == null || e.pointerId === d.pid; }
  // pointer moves on the stage: a corner drag, or a label drag once it has moved a few px
  rootMove(e) {
    if (this.drag) return this.move(e);
    const L = this.ld;
    if (!L || !this.samePointer(L, e)) return;
    if (!L.moved && Math.hypot(e.clientX - L.sx, e.clientY - L.sy) < 6) return;
    L.moved = true;
    const q = this.q4Pt((e.clientX - L.r.left) / L.sc, (e.clientY - L.r.top) / L.sc), px = q.x, py = q.y;
    this.setState({ c4: Object.assign({}, this.state.c4, { drag: { id: L.id, x: px - L.ox, y: py - L.oy, px: px, py: py }, sel: null }) });
  }
  // The browser called the drag off (a system gesture, a palm): it ends where it is, and nothing is checked or placed
  // (a label goes back to its row)
  rootCancel(e) {
    if (this.drag) { if (this.samePointer(this.drag, e)) { this.drag = null; this.setState({ dragging: null }); } return; }
    const L = this.ld;
    if (!L || !this.samePointer(L, e)) return;
    this.ld = null;
    this.setState({ c4: Object.assign({}, this.state.c4, { drag: null }) });
  }
  // A label let go without moving is a tap that selects it (then slotTap places it).
  // One dropped outside a slot goes back.
  rootUp(e) {
    if (this.drag) return this.up(e);
    const L = this.ld;
    if (!L || !this.samePointer(L, e)) return;
    this.ld = null;
    const c4 = Object.assign({}, this.state.c4, { drag: null });
    if (!L.moved) {
      c4.sel = c4.sel === L.id ? null : L.id;
      this.setState({ c4: c4 });
      this.sfx('tap');
      return;
    }
    const q = this.q4Pt((e.clientX - L.r.left) / L.sc, (e.clientY - L.r.top) / L.sc), px = q.x, py = q.y;
    // a box takes the label when the pointer or the label's own middle is over it (a label held by its end still lands)
    const lx = px - L.ox + 104, ly = py - L.oy + 28, over = (x, y, sl) => x > 840 - 20 && x < 840 + 284 + 20 && y > sl.y - 20 && y < sl.y + 64 + 20;
    const slot = this.slotsDef().find((sl) => over(px, py, sl)) || this.slotsDef().find((sl) => over(lx, ly, sl)); // (the box under the pointer first)
    if (slot && !c4.checking) this.place(L.id, slot.id, c4);
    else { const at = Object.assign({}, c4.at); at[L.id] = null; this.setState({ c4: Object.assign(c4, { at: at }) }); }
  }
  slotTap(slotId) {
    const c4 = this.state.c4;
    if (!c4.sel || c4.checking || this.state.done) return;
    this.place(c4.sel, slotId, Object.assign({}, c4));
  }
  // put a label in a slot; once all three are placed they are checked together (unless the step is instant)
  place(labId, slotId, c4) {
    if (this.cur().instant) return this.place1(labId, slotId, c4);
    const at = Object.assign({}, c4.at);
    for (const k in at) { if (at[k] === slotId && k !== labId) { if (c4.locked[k]) return this.setState({ c4: c4 }); at[k] = null; } }
    at[labId] = slotId;
    this.setState({ c4: Object.assign({}, c4, { at: at, sel: null, drag: null }) });
    this.sfx('pop');
    if (at.iso && at.right && at.scal) {
      this.setState({ c4: Object.assign({}, this.state.c4, { checking: true }) });
      const tok = this.stepTok;
      this.tm(() => { if (tok === this.stepTok) this.check4(); }, 380);
    }
  }
  // instant checking (check 4, screen 41): each drop is checked on the spot. A right one locks in; a wrong one
  // goes back to the row, and after two misses with the same label its shape's clue lights up as a hint.
  place1(labId, slotId, c4) {
    const st = this.cur(), slots = this.slotsDef(), sl = slots.find((q) => q.id === slotId), idx = slots.indexOf(sl);
    const at = Object.assign({}, c4.at);
    const taken = Object.keys(c4.locked).some((k) => c4.locked[k] && c4.at[k] === slotId);
    if (sl && sl.ans === labId && !taken) {
      at[labId] = slotId;
      const locked = Object.assign({}, c4.locked, { [labId]: true });
      this.setState({ c4: Object.assign({}, c4, { at: at, locked: locked, sel: null, drag: null }) }, () => Motion.q4Ok(idx));
      this.sfx('snap');
      if (['iso', 'right', 'scal'].every((k) => locked[k])) {
        const s = this.state, results = Object.assign({}, s.results);
        if (results[st.id] === undefined) results[st.id] = s.cfuFirst;
        this.setState({ done: true, results: results }, () => Motion.q4Done());
        this.tm(() => { this.cheer(); this.interject({ m: CONFIG.swiftee.correct, t: st.ok }); }, 450);
      }
      return;
    }
    at[labId] = null;
    this.misses4 = this.misses4 || {};
    const m = (this.misses4[labId] = (this.misses4[labId] || 0) + 1);
    this.setState({ c4: Object.assign({}, c4, { at: at, sel: null, drag: null }), cfuFirst: false }, () => Motion.q4Bad(idx, labId));
    this.sfx('bad');
    if (m >= 2) this.tm(() => Motion.q4Clue(slots.findIndex((q) => q.ans === labId)), 500);
    this.interject({ m: CONFIG.swiftee.wrong, t: m >= 2 ? 'Watch the glowing clue. Which shape has that mark?' : 'Try again! Look closely at the shapes.' });
    this.poke();
  }
  // check 4, on "labels": the labels slide in and can now be dragged; a hand shows one drag
  q4LabelsIn() {
    if (this.state.labsIn) return;
    this.setState({ labsIn: true }, () => { this.sfx('pop'); Motion.q4Labels(); });
    const tok = this.stepTok;
    this.tm(() => {
      if (tok !== this.stepTok || this.ld || this.state.done || typeof document === 'undefined') return;
      const el = document.querySelector('[data-qa="lab-right"]'), stage = document.querySelector('.stage');
      if (!el || !stage) return;
      const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
      this.setState({ hand: { kind: 'drag', once: true, n: 99, x: Math.round((r.left + r.width / 2 - sr.left) / sc), y: Math.round((r.top + r.height / 2 - sr.top) / sc), dx: 40, dy: -70 } });
      this.tm(() => { if (tok === this.stepTok) this.setState({ hand: null }); }, CONFIG.hand.onceMs);
    }, 1400);
  }
  // check all three placed labels together: right ones lock, wrong ones go back
  check4() {
    const st = this.cur(), s = this.state, c4 = s.c4;
    const at = Object.assign({}, c4.at), locked = Object.assign({}, c4.locked);
    let all = true;
    Object.keys(at).forEach((k) => {
      const sl = this.slotsDef().find((q) => q.id === at[k]);
      if (sl && sl.ans === k) locked[k] = true; else { at[k] = null; all = false; }
    });
    this.setState({ c4: Object.assign({}, c4, { at: at, locked: locked, checking: false }) });
    if (all) {
      const results = Object.assign({}, s.results);
      if (results[st.id] === undefined) results[st.id] = s.cfuFirst;
      this.setState({ done: true, results: results });
      this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      this.setState({ cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: 'Some labels went back. Look for the marks: equal legs, right angles, or neither.' });
      this.poke();
    }
  }

  // ---------- render ----------
  // everything drawn on the board: sides, extensions, marks, angles and labels
  geo() {
    const s = this.state, st = this.cur(), f = st.f || {}, P = s.P, task = st.task;
    const A = P.A, B = P.B, C = P.C, D = P.D;
    const dsp = (b) => (b ? 'inline' : 'none');
    const r1 = (v) => Math.round(v * 10) / 10;
    const seg = (p, q, show, extra) => Object.assign({ x1: r1(p.x), y1: r1(p.y), x2: r1(q.x), y2: r1(q.y), d: dsp(show) }, extra || {});
    const lerp = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    const noop = () => {};
    const apex = this.inter(A, D, B, C) || { x: (A.x + B.x) / 2, y: A.y - 60 };
    const g = {};
    g.poly = [A, B, C, D].map((p) => r1(p.x) + ',' + r1(p.y)).join(' ');
    // legGlow (screens 5-6): AD and BC are drawn bolder, so the learner knows which two sides "will meet"
    const waitFocusG = st.layout === 'focus' && !s.centered;
    const said = (k) => !!(s.glow && s.glow.indexOf(k) >= 0);
    const glowLeg = (k) => !!f.legGlow || said(k) || (task === 'extLegs' && !st.auto && !s.done && !waitFocusG && !(s.ext[k] > 0));
    const act = task === 'measure' ? this.activeSide() : null;
    const meas = (k) => task === 'measure' && (!!s.tap[k] || s.measuring === k);
    // A highlighted ("lit") side is drawn a little bolder in its own colour (.edge.lit), never with a coloured
    // band: legGlow, a line's glow, or the side being measured.
    const lit = {};
    const light = (k, on) => { lit[k] = st.auto ? on : (on || act === k || meas(k)); };
    light('DA', glowLeg('DA'));
    light('BC', glowLeg('BC'));
    const glowBase = (k) => said(k) || (task === 'extBases' && !st.auto && !s.done && !waitFocusG && !(s.ext[k] > 0));
    light('AB', glowBase('AB'));
    light('CD', glowBase('CD'));
    // the measuring tape (screen 16)
    {
      const tp = s.tape, ends = tp ? this.walkEnds(tp.leg) : null;
      if (ends) {
        const L = this.dist(ends[0], ends[1]) || 1, ux = (ends[1].x - ends[0].x) / L, uy = (ends[1].y - ends[0].y) / L;
        // the tape lies along the side on the side Swiftee is standing on (she walks upright, so that is the screen-up side):
        // from the start corner under her feet and up into her hand, never crossing the line
        let nx = -uy, ny = ux; if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
        const off = 6, p0 = { x: ends[0].x + nx * off, y: ends[0].y + ny * off };
        const foot = { x: p0.x + ux * L * tp.t, y: p0.y + uy * L * tp.t }, tip = tp.tip || foot;
        g.tape = { p: 'M' + r1(p0.x) + ',' + r1(p0.y) + ' L' + r1(foot.x) + ',' + r1(foot.y) + ' L' + r1(tip.x) + ',' + r1(tip.y), d: 'inline' };
        let tk = '';
        for (let hh = 0; hh * this.S / 2 <= L * tp.t + 0.01; hh++) { // a tick every half cm
          const q = { x: p0.x + ux * hh * this.S / 2, y: p0.y + uy * hh * this.S / 2 }, len = hh % 2 ? 2.5 : 4.5;
          tk += 'M' + r1(q.x - nx * len) + ',' + r1(q.y - ny * len) + ' L' + r1(q.x + nx * len) + ',' + r1(q.y + ny * len) + ' ';
        }
        g.tapeTk = { p: tk || 'M0,0', d: 'inline' };
      } else {
        g.tape = { p: 'M0,0', d: 'none' }; g.tapeTk = { p: 'M0,0', d: 'none' };
      }
    }
    // leg extensions toward the point where the legs meet (screen 7)
    g.xA = seg(A, lerp(A, apex, s.ext.DA), task === 'extLegs' && s.ext.DA > 0);
    g.xB = seg(B, lerp(B, apex, s.ext.BC), task === 'extLegs' && s.ext.BC > 0);
    g.apex = { cx: r1(apex.x), cy: r1(apex.y), d: dsp(task === 'extLegs' && s.done) }; // round marker where the legs meet
    // screens 7-8: the glow being drawn along a side before its dotted extension
    const tr = s.trace, tm = tr && tr.mid ? lerp(tr.from, tr.to, 0.5) : null; // bases grow from the middle out
    g.trace = tr ? seg(tm ? lerp(tm, tr.from, tr.t) : tr.from, lerp(tm || tr.from, tr.to, tr.t), true, { cls: 'trace' + (tr.out ? ' out' : '') + (tr.leg ? ' leg' : '') }) : seg(D, D, false, { cls: 'trace' });
    // base extensions out to the card's edges (drawn on screen 8, shown in full with baseExt), with arrowheads once
    // they get there (css .xend). Two pieces, out from each corner, never over the side itself (a dotted line laid over
    // a side made it look broken)
    const X = this.extBounds(), tip = (p, show) => ({ cx: r1(p.x), cy: r1(p.y), d: dsp(show) });
    const be = (key, p, q) => {
      const t = f.baseExt ? 1 : (task === 'extBases' ? s.ext[key] : 0), lx = p.x - (p.x - X.l) * t, rx = q.x + (X.r - q.x) * t;
      return { p: 'M' + r1(lx) + ',' + r1(p.y) + ' L' + r1(p.x) + ',' + r1(p.y) + ' M' + r1(q.x) + ',' + r1(q.y) + ' L' + r1(rx) + ',' + r1(q.y), d: dsp(t > 0), cls: 'xleg xb' + (t >= 1 ? ' xend' : '') };
    };
    g.xAB = be('AB', A, B);
    g.xCD = be('CD', D, C);
    // screen 7: the pen tips riding up the legs, and the rays of the burst where they meet
    g.tA = tip(lerp(A, apex, s.ext.DA), task === 'extLegs' && s.ext.DA > 0 && s.ext.DA < 1);
    g.tB = tip(lerp(B, apex, s.ext.BC), task === 'extLegs' && s.ext.BC > 0 && s.ext.BC < 1);
    g.rays = { p: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * Math.PI) / 4 + Math.PI / 8, c = Math.cos(a), n = Math.sin(a); return 'M' + r1(apex.x + c * 16) + ',' + r1(apex.y + n * 16) + ' L' + r1(apex.x + c * 30) + ',' + r1(apex.y + n * 30); }).join(' ') };
    // edges: NAVY the bases' deep blue, PU the legs' deep aqua
    const NAVY = '#1e7bff', PU = '#00b8a9';
    const baseCol = () => NAVY; // bases always blue
    // the legs are purple from screen 5 (meet) onward
    const purpleFrom = this.steps().findIndex((x) => x.id === 'meet');
    const purple = purpleFrom >= 0 && s.step >= purpleFrom;
    const legCol = () => (purple ? PU : NAVY);
    // emph: the side is being named by the voice; lit: it is highlighted
    const eCls = (k) => 'e' + k + (s.emph && s.emph[k] ? ' emph' : '') + (lit[k] ? ' lit' : '');
    const hlCls = (k) => 'hl' + (s.emph && s.emph[k] ? ' on' : ''); // the gold highlighter that sweeps along a named side
    // build (screen 1): the pen draws D -> A -> B -> C -> D, leaving each finished edge behind, and each corner
    // appears as the pen reaches it (s.build, from runBuild)
    const bd = st.build ? (s.build || { d: 0 }) : null, building = !!(bd && !bd.done);
    const bOrder = [['DA', D, A], ['AB', A, B], ['BC', B, C], ['CD', C, D]], bAt = {};
    { let acc = 0; bOrder.forEach((e) => { const L = this.dist(e[1], e[2]); bAt[e[0]] = { s: acc, L: L, p: e[1], q: e[2] }; acc += L; }); }
    const edgeOn = (k) => !building || bd.d >= bAt[k].s + bAt[k].L - 0.01;
    const vOn = (k) => !building || (k === 'D' ? bd.d > 0 : bd.d >= bAt[{ A: 'AB', B: 'BC', C: 'CD' }[k]].s - 0.01);
    if (building && bd.d > 0) {
      const cur = bOrder.map((e) => bAt[e[0]]).find((e) => bd.d < e.s + e.L) || bAt.CD;
      g.trace = seg(cur.p, lerp(cur.p, cur.q, Math.min(1, (bd.d - cur.s) / cur.L)), true, { cls: 'trace' });
    }
    g.ol = { d: dsp(!!(bd && bd.settle)) };
    g.eAB = seg(A, B, edgeOn('AB'), { c: baseCol('AB'), cls: eCls('AB'), hl: hlCls('AB') });
    g.eCD = seg(C, D, edgeOn('CD'), { c: baseCol('CD'), cls: eCls('CD'), hl: hlCls('CD') });
    g.eBC = seg(B, C, edgeOn('BC'), { c: legCol('BC'), cls: eCls('BC'), hl: hlCls('BC') });
    g.eDA = seg(D, A, edgeOn('DA'), { c: legCol('DA'), cls: eCls('DA'), hl: hlCls('DA') });
    // the marker band under a named side draws one way for every side: up a leg, left to right along a base
    ['AB', 'BC', 'CD', 'DA'].forEach((k) => {
      const e = g['e' + k], steep = Math.abs(e.y2 - e.y1) > Math.abs(e.x2 - e.x1), flip = steep ? e.y1 < e.y2 : e.x1 > e.x2;
      Object.assign(e, flip ? { h1x: e.x2, h1y: e.y2, h2x: e.x1, h2y: e.y1 } : { h1x: e.x1, h1y: e.y1, h2x: e.x2, h2y: e.y2 });
    });
    // the "Base" / "Leg" callout (screens 14-15): a pill just outside each side's midpoint, joined to it by a
    // short tail. Bases: above AB and below CD. Legs: level, left of AD and right of BC.
    {
      const legs = s.callout === 'legs';
      const show = (s.callout === 'bases' && !s.tap.AB && !s.tap.CD) || (legs && !s.tap.DA && !s.tap.BC);
      const W = legs ? 64 : 78, H = 32, cx0 = (A.x + B.x + C.x + D.x) / 4, cy0 = (A.y + B.y + C.y + D.y) / 4;
      // dir 'v' points straight up or down (bases), 'h' straight left or right (legs)
      const pill = (p, q, dir) => {
        const vert = dir === 'v', horiz = dir === 'h';
        // bases: both pinned the same small step right of the middle, just clear of the parallel arrows on the middle
        // and well short of the corner letters (a bigger step put the top pill on B)
        const L = this.dist(p, q) || 1, sh = vert ? 20 : 0;
        const m = { x: (p.x + q.x) / 2 + sh, y: (p.y + q.y) / 2 };
        let nx = vert ? 0 : horiz ? (m.x < cx0 ? -1 : 1) : -(q.y - p.y) / L, ny = vert ? (m.y < cy0 ? -1 : 1) : horiz ? 0 : (q.x - p.x) / L;
        if (!vert && !horiz && nx * (m.x - cx0) + ny * (m.y - cy0) < 0) { nx = -nx; ny = -ny; }
        // the tail runs from the side itself out to the pill, so the name is plainly joined to its side
        const ext = (W / 2) * Math.abs(nx) + (H / 2) * Math.abs(ny), reach = 30;
        const c = { x: m.x + nx * (reach + ext), y: m.y + ny * (reach + ext) };
        // a Leg pill stays inside the ice card's inner area, however close its leg runs to the edge (its tail shortens)
        if (horiz) { const Bd = this.extBounds(); c.x = Math.max(Bd.l + W / 2, Math.min(Bd.r - W / 2, c.x)); }
        const d0 = { x: m.x, y: m.y }, e = { x: c.x - nx * ext, y: c.y - ny * ext };
        return { x: r1(c.x - W / 2), y: r1(c.y - H / 2), tx: r1(c.x), ty: r1(c.y + 6), dx: r1(d0.x), dy: r1(d0.y),
          stem: 'M' + r1(d0.x) + ',' + r1(d0.y) + ' L' + r1(e.x) + ',' + r1(e.y) };
      };
      g.cal = { d: dsp(show), cls: legs ? 'cal-legs' : 'cal-bases', tb: dsp(!legs), tl: dsp(legs), w: W,
        p1: legs ? pill(D, A, 'h') : pill(A, B, 'v'), p2: legs ? pill(B, C, 'h') : pill(D, C, 'v') };
    }
    // equal-leg ticks
    const ad = this.dist(A, D), bc = this.dist(B, C);
    const equal = Math.abs(ad - bc) < 0.5;
    const tick = (p, q) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, L = this.dist(p, q) || 1;
      const dx = (q.x - p.x) / L, dy = (q.y - p.y) / L, nx = -dy, ny = dx;
      let out = '';
      [-5, 5].forEach((k) => { // two bold marks across the side's middle
        const cx = mx + dx * k, cy = my + dy * k;
        out += 'M' + r1(cx - nx * 12) + ',' + r1(cy - ny * 12) + ' L' + r1(cx + nx * 12) + ',' + r1(cy + ny * 12) + ' ';
      });
      return out;
    };
    g.tk = { p: tick(A, D) + tick(B, C), d: dsp(f.ticks || (task === 'dragA' && s.done && equal)) };
    // parallel chevrons
    const chev = (p, q) => {
      const x = (p.x + q.x) / 2, y = p.y;
      // drawn over a white halo (.chev-halo in index.html) so they read on any side colour
      return 'M' + r1(x - 14) + ',' + r1(y - 11) + ' L' + r1(x - 3) + ',' + r1(y) + ' L' + r1(x - 14) + ',' + r1(y + 11) +
        ' M' + r1(x) + ',' + r1(y - 11) + ' L' + r1(x + 11) + ',' + r1(y) + ' L' + r1(x) + ',' + r1(y + 11);
    };
    g.ch = { p: chev(A, B) + ' ' + chev(D, C), d: dsp(f.par) };
    // angles
    const V = this.vals(P);
    const arcSet = f.arcs || '';
    const unit = (p, q) => { const L = this.dist(p, q) || 1; return { x: (q.x - p.x) / L, y: (q.y - p.y) / L }; };
    const aTag = {}, em = s.emph || {}, r90 = []; // em: parts the voice-over is naming right now
    // After screen 23 the angles are already measured, so they just stay (no draw-in again). fa: the angles in
    // focus glow and the others step back, dimmed like a disabled button (angFocus can move during a screen, as in
    // sumSteps). Exploring (screen 29), the dragged leg's two angles are the focus while the corner moves.
    const angIdx = this.steps().findIndex((x) => x.id === 'angles'), known = angIdx >= 0 && s.step > angIdx, fa = s.angFocus || f.focusAng;
    const livePair = s.dragging ? (s.dragging === 'A' || s.dragging === 'D' ? 'AD' : 'BC') : ''; // a corner changes the two angles on its leg
    const dragLive = (st.explore || st.task === 'drag90') && livePair; // the two angles a dragged corner changes
    const inFocus = fa || dragLive || '';
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const n = this.nb(k), Vk = P[k], u = unit(Vk, P[n[0]]), v = unit(Vk, P[n[1]]);
      // the angle's arc: the same size on screen whatever the board's zoom (30 stage px)
      const zs = this.boardMap().s || 1, R = CONFIG.angleR(this.angle(P, k)) / zs; // the same amount of colour for every angle, at any zoom
      const sx = Vk.x + u.x * R, sy = Vk.y + u.y * R, ex = Vk.x + v.x * R, ey = Vk.y + v.y * R;
      const cross = u.x * v.y - u.y * v.x;
      const show = arcSet.indexOf(k) >= 0;
      const isRight = Math.abs(this.angle(P, k) - 90) < 0.5;
      // when several angles light up together they draw in one after another
      const stag = (f.arcs || '').length > 1 ? ' d' + (f.arcs || '').indexOf(k) : '';
      const look = (known && (f.arcs || '').indexOf(k) >= 0 ? ' still' : '') + (fa && fa.indexOf(k) >= 0 ? ' glow' : '') +
        (dragLive && livePair.indexOf(k) >= 0 ? ' live' : '') + // dragging (screens 29, 33): the dragged leg's two angles glow while they change
        (inFocus && inFocus.indexOf(k) < 0 ? ' dim' : '');
      // at exactly 90° the arc gives way to the square right-angle mark
      g['a' + k] = { p: 'M' + r1(sx) + ',' + r1(sy) + ' A' + R + ',' + R + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + r1(ex) + ',' + r1(ey), d: dsp(show && !isRight && !(known || st.anglesIn)), cls: 'arc a' + k + stag + look + (em['a' + k] ? ' emph' : '') + (st.anglesIn ? ' pre' : ''), o: r1(Vk.x) + 'px ' + r1(Vk.y) + 'px' };
      // wedges (from screen 23 on): the angle filled in, out to the arc's outer edge so the arc is its rim. They follow
      // the arc's glow / dim and grow in from the corner when the angle comes into focus.
      const RW = R + 3.5 / zs, wsx = Vk.x + u.x * RW, wsy = Vk.y + u.y * RW, wex = Vk.x + v.x * RW, wey = Vk.y + v.y * RW;
      g['w' + k] = { p: 'M' + r1(Vk.x) + ',' + r1(Vk.y) + ' L' + r1(wsx) + ',' + r1(wsy) + ' A' + RW + ',' + RW + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + r1(wex) + ',' + r1(wey) + ' Z', d: dsp((known || !!st.anglesIn) && show && !isRight), cls: 'wedge w' + k + look + (em['a' + k] ? ' emph' : '') + (st.anglesIn ? ' pre' : '') };
      // the square right-angle mark
      const q = 27 / zs; // the right-angle square: big enough to show round the corner dot, even a pulsing one
      g['r' + k] = {
        // a closed square from the corner itself, so the whole square fills (its edges along the sides sit under them)
        p: 'M' + r1(Vk.x) + ',' + r1(Vk.y) + ' L' + r1(Vk.x + u.x * q) + ',' + r1(Vk.y + u.y * q) + ' L' + r1(Vk.x + u.x * q + v.x * q) + ',' + r1(Vk.y + u.y * q + v.y * q) + ' L' + r1(Vk.x + v.x * q) + ',' + r1(Vk.y + v.y * q) + ' Z',
        d: dsp(isRight && (f.right || show)),
        cls: inFocus && inFocus.indexOf(k) < 0 ? 'dim' : ''
      };

      const th = this.angle(P, k) * Math.PI / 180;
      // The value sits inside its corner on the angle's bisector, just past the arc and clear of both sides. Like the
      // arc it keeps one size on screen at any zoom (css: .tag.alab is 21px / --bz), so its box and gaps are screen
      // px divided by the zoom; only the sides' own stroke (5 board units) zooms. It is sized by the value even when
      // the name shows (screen 31), so names sit where values were.
      const lbl = V[k] + '°', hw = 1.2 * (lbl.length * 11.5 + 6) / 2 / zs, hh = 1.2 * 14 / zs; // 21px bold text, at its 1.2x focus size
      const sg = 2.5 + 5 / zs; // half a side's stroke, then a small gap
      const clearOf = (cx, cy) => {
        const sideGap = (w) => Math.abs((cx - Vk.x) * w.y - (cy - Vk.y) * w.x) - (hw * Math.abs(w.y) + hh * Math.abs(w.x));
        const near = Math.hypot(Math.max(0, Math.abs(cx - Vk.x) - hw), Math.max(0, Math.abs(cy - Vk.y) - hh));
        return sideGap(u) >= sg && sideGap(v) >= sg && near >= R + 8 / zs; // clear of both sides and just past the filled angle's rim
      };
      let bx0 = u.x + v.x, by0 = u.y + v.y; const bl0 = Math.hypot(bx0, by0) || 1; bx0 /= bl0; by0 /= bl0;
      let dl = R + 6 / zs; while (dl < 140 && !clearOf(Vk.x + bx0 * dl, Vk.y + by0 * dl)) dl += 1 / zs;
      let bx = u.x + v.x, by = u.y + v.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      // the 90° label sits just beyond the right-angle square, on the corner's diagonal: its near edge 6 px past the square
      // (the label is about 58 x 30 screen px), so it reads as the square's label without touching it
      if (st.right90 && isRight) { const rc = (q + 21 / zs) * Math.SQRT2; r90.push({ t: '90°', x: r1(Vk.x + bx * rc), y: r1(Vk.y + by * rc), cls: 'alab r90 r90' + k + (inFocus && inFocus.indexOf(k) < 0 ? ' dim' : '') }); }
      aTag[k] = { bx: bx, by: by, t: s.symAng ? '∠' + k : V[k] + '°', x: r1(Vk.x + bx * dl), y: r1(Vk.y + by * dl), cls: 'alab l' + k + stag + look + (show ? '' : ' off') + (em['a' + k] ? ' emph' : '') + (st.anglesIn ? ' pre' : '') };
    });
    // vertices: the dots and their touch targets
    const dk = this.dragKey();
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const anyV = this.anyCorner(), Vk = P[k], drag = dk === k || anyV;
      const gold = em['v' + k], big = drag;
      g['v' + k] = { x: r1(Vk.x), y: r1(Vk.y), r: vOn(k) ? (big ? 9 : 7) + (em['v' + k] ? 6 : 0) : 0, c: gold ? '#ffab00' : big ? PU : NAVY, w: big || gold ? 4 : 3,
        // (corners to drag stay small enough that the angles and square marks show round them)
        cls: (gold && vOn(k) ? 'on' : '') + (anyV && !s.moved && !s.explored && !s.dragging ? ' drag-cue' : '') }; // a named point pops gold, with a glow; a corner to drag pulses
      g['k' + k] = {
        x: r1(Vk.x), y: r1(Vk.y), d: dsp(drag), cls: '',
        cur: drag ? (s.dragging ? 'grabbing' : 'grab') : 'pointer',
        down: drag ? (e) => this.down(k, e) : noop
      };
    });
    // screen 20: a halo and a two-way arrow on A until the learner moves it
    if (dk) {
      // with the top side's length showing, the arrow sits left of the corner so both stay readable
      const Vk = P[dk], y0 = r1(Vk.y + (Vk.y < 280 ? -40 : 42)), x = r1(Vk.x - (dk === 'A' && f.sideLen ? 44 : 0));
      g.halo = { x: r1(Vk.x), y: r1(Vk.y), d: dsp(!s.dragging) };
      g.arw = {
        p: 'M' + (x - 26) + ',' + y0 + ' L' + (x + 26) + ',' + y0,
        h: 'M' + (x - 40) + ',' + y0 + ' L' + (x - 27) + ',' + (y0 - 7) + ' L' + (x - 27) + ',' + (y0 + 7) + ' Z M' + (x + 40) + ',' + y0 + ' L' + (x + 27) + ',' + (y0 - 7) + ' L' + (x + 27) + ',' + (y0 + 7) + ' Z',
        d: dsp(!s.moved && !s.dragging)
      };
    } else {
      g.halo = { x: 0, y: 0, d: 'none' };
      g.arw = { p: 'M0,0', h: 'M0,0', d: 'none' };
    }
    // labels: a fixed set of slots (hidden ones get "off") so each tag keeps its element and
    // only animates when it first appears
    const cx = (A.x + B.x + C.x + D.x) / 4, cy = (A.y + B.y + C.y + D.y) / 4;
    const tags = [];
    ['A', 'B', 'C', 'D'].forEach((k) => {
      // each corner letter sits outside its corner, mostly above (A, B) or below (C, D) it, so it never lands on a
      // base or a base's extension line
      const Vk = P[k]; let dx = Vk.x - cx, dy = Vk.y - cy;
      { const l0 = Math.hypot(dx, dy) || 1; dx /= l0; dy /= l0; if (Math.abs(dy) < 0.82) { dy = (dy < 0 ? -1 : 1) * 0.82; dx = (dx < 0 ? -1 : 1) * 0.57; } }
      const L = 1;
      // letterIn (screen 3): each corner letter stays hidden until the voice says it, then flies in from its corner
      const lin = st.letterIn ? ' vin c' + k : '';
      tags.push({ t: k, x: r1(Vk.x + dx * 28), y: r1(Vk.y + dy * 28), cls: 'vlab' + (vOn(k) ? '' : ' off') + (st.sideNums ? ' off' : '') + lin });
    });
    // two values at the ends of a short side can meet: the one pointing more steeply into the shape steps a little
    // deeper into its own corner, so they stack apart (never crossing, never leaving their corners). The values keep
    // one size on screen (css .tag.alab), so their boxes and steps are screen px divided by the board's zoom, and a
    // value moves at most 30 screen px
    {
      const z = this.boardMap().s || 1;
      const wd = (a) => (String(a.t).length * 10.5 + 26) / z, on = (a) => a && !/\boff\b/.test(a.cls);
      const touch = (a, b) => Math.abs(a.x - b.x) < (wd(a) + wd(b)) / 2 + 6 / z && Math.abs(a.y - b.y) < 36 / z;
      [['A', 'B'], ['D', 'C']].forEach(([p, q]) => {
        const a = aTag[p], b = aTag[q];
        if (!on(a) || !on(b)) return;
        const mv = Math.abs(a.by) >= Math.abs(b.by) ? a : b;
        for (let it = 0; it < 10 && touch(a, b); it++) { mv.x = r1(mv.x + mv.bx * 3 / z); mv.y = r1(mv.y + mv.by * 3 / z); }
      });
    }
    ['A', 'B', 'C', 'D'].forEach((k) => tags.push(aTag[k]));
    r90.forEach((x) => tags.push(x));
    // a tag beside a side, pushed out along the side's outward normal far enough that its box clears the line
    const side = (p, q, text, cls, show) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, L = this.dist(p, q) || 1;
      let nx = -(q.y - p.y) / L, ny = (q.x - p.x) / L;
      if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
      // the box's reach towards the side (half-width and half-height along the normal, border included) plus one
      // small gap, so every tag sits the same distance from its side whatever its slope; on the top and bottom sides
      // it also clears the parallel arrows that sit on the side's middle
      // a leg carrying equal marks gets more room, so the tag clears the marks that cross its middle
      const marked = g.tk && g.tk.d === 'inline' && /^(DA|AD|BC|CB)$/.test(Object.keys(P).find((k) => P[k] === p) + Object.keys(P).find((k) => P[k] === q));
      const hw = (text.length * 11.5 + 6) / 2, hh = 13; // plain text, no box (21px bold)
      const off = hw * Math.abs(nx) + hh * Math.abs(ny) + 10 + 12 * Math.abs(ny) + (marked ? 14 : 0); // (bases: clear of the parallel arrows)
      // outside the shape first; if the board edge would push it back onto the side, tuck it inside instead
      const need = hw * Math.abs(nx) + hh * Math.abs(ny) + 4;
      const place = (sg) => {
        const x = Math.max(hw - 70, Math.min(516 - hw, mx + sg * nx * off)) /* the panel has room left of the board */, y = Math.max(18, Math.min(404, my + sg * ny * off));
        return { x: x, y: y, ok: Math.abs(nx * (x - mx) + ny * (y - my)) >= need };
      };
      let pos = place(1);
      if (!pos.ok) pos = place(-1);
      const x = pos.x, y = pos.y;
      return { t: text, x: r1(x), y: r1(y), cls: cls + (show ? '' : ' off') };
    };
    // The angle sums (f.sums) sit in a row below the shape, each under its own leg, since there is no room beside
    // the legs. They stay inside the panel and at least SUM_GAP apart, spreading out when the legs close in.
    {
      const on = !!f.sums;
      const tL = V.A + '° + ' + V.D + '° = 180°', tR = V.B + '° + ' + V.C + '° = 180°';
      const hw = (t) => (t.length * 9.6 + 32) / 2, wL = hw(tL), wR = hw(tR), SUM_GAP = 16;
      const lo = -110, hi = 560; // the panel's inner edges, in board x
      let xL = (A.x + D.x) / 2, xR = (B.x + C.x) / 2;
      const need = wL + wR + SUM_GAP;
      if (xR - xL < need) { const m = (xL + xR) / 2; xL = m - need / 2; xR = m + need / 2; }
      if (xL - wL < lo) { const d = lo - (xL - wL); xL += d; xR = Math.max(xR, xL + need); }
      if (xR + wR > hi) { const d = xR + wR - hi; xR -= d; xL = Math.min(xL, xR - need); }
      let yS = Math.max(D.y, C.y) + 62;
      // explore (screen 29): a fixed row centred in the panel; only the values change, and the dragged leg's box glows
      if (st.explore) { const mid = (lo + hi) / 2; xL = mid - 126; xR = mid + 126; yS = Math.max(D.y, C.y) + 72; } // clear of the D and C letters
      const fixCls = st.explore ? ' fixed' : '', liveL = st.explore && livePair === 'AD' ? ' live' : '', liveR = st.explore && livePair === 'BC' ? ' live' : '';
      tags.push({ t: tL, x: r1(xL), y: r1(yS), cls: 'mtag sum sumL' + fixCls + liveL + (on ? '' : ' off') }); // A + D: orange / yellow
      tags.push({ t: tR, x: r1(xR), y: r1(yS), cls: 'mtag sum sumR' + fixCls + liveR + (on ? '' : ' off') }); // B + C: purple / blue
    }
    // side lengths, outside each side (on screen 16 each shows once its side has been measured)
    const isM = st.id === 'measure';
    tags.push(side(D, A, this.cm(ad), 'mtag mDA', isM && !!s.tap.DA)); // values only, no side names
    tags.push(side(B, C, this.cm(bc), 'mtag mBC', isM && !!s.tap.BC));
    tags.push(side(A, B, this.cm(this.dist(A, B)), 'mtag mAB', isM && !!s.tap.AB));
    tags.push(side(D, C, this.cm(this.dist(D, C)), 'mtag mCD', isM && !!s.tap.CD));
    tags.push(side(D, A, this.cm(ad), 'mtag mleg mDA', !!f.legLen)); // mXX: each length label can be animated on its own
    tags.push(side(B, C, this.cm(bc), 'mtag mleg mBC', !!f.legLen));
    tags.push(side(A, B, this.cm(this.dist(A, B)), 'mtag mAB', !!f.sideLen));
    tags.push(side(D, C, this.cm(this.dist(D, C)), 'mtag mCD', !!f.sideLen));
    // sideNums (screen 2): the sides are numbered 1 top, 2 right, 3 bottom, 4 left; each number flies in from its side
    {
      const on = !!(st.sideNums || (st.letterIn && !s.numsGone)), gone = ''; // still shown on screen 3 while they fade out
      tags.push(side(A, B, '1', 'snum n1 from-top' + gone, on));
      tags.push(side(B, C, '2', 'snum n2 from-right' + gone, on));
      tags.push(side(D, C, '3', 'snum n3 from-bottom' + gone, on));
      tags.push(side(D, A, '4', 'snum n4 from-left' + gone, on));
    }
    return { g: g, tags: tags, V: V };
  }

  // the values index.html binds to
  renderVals() {
    const s = this.state, steps = this.steps(), st = this.cur();
    const isLesson = !st.cfu && !st.end && !st.noBoard;
    // a newline forces a break in the bubble; the break is not a word, so reveal timing is unchanged
    let wi = 0;
    const words = [];
    // the lesson's key words stay orange in the bubble (KEY_WORDS)
    const isKey = (w) => KEY_WORDS.test(w.replace(/[^A-Za-z0-9°-]/g, '').toLowerCase());
    (s.line || '').split('\n').forEach((part, li) => {
      if (li) words.push({ t: '', h: '', cls: 'brk' });
      this.toWords(part).forEach((w) => {
        const i = wi++, cls = i < s.reveal - 1 ? 'on' : (i === s.reveal - 1 ? (s.talking ? 'cur' : 'on') : '');
        // a vertex name being spelt out (screen 3): the letters not yet said stay invisible but keep their space, so the
        // line never shifts; the closing full stop comes with the last letter
        const m = s.bubLetters != null && /^([A-D]{2,})(.*)$/.exec(w);
        // (the letters themselves decide when the name shows: from the spoken A, even before the voice reaches the word's end)
        if (m && s.bubLetters < m[1].length) { const n = s.bubLetters; words.push({ t: w.slice(0, n), h: w.slice(n), cls: n ? (s.talking ? 'cur' : 'on') : '' }); return; }
        words.push({ t: w, h: '', cls: cls + (isKey(w) ? ' key' : '') });
      });
    });
    const G = isLesson ? this.geo() : { g: {}, tags: [], V: {} };
    const chips = s.chips.slice();
    // answer buttons
    const mk = (o) => ({ id: o.id, t: o.t || o.id, cls: s.picks[o.id] || '', dis: !!s.picks[o.id] || s.done, pick: () => this.pick(o) });
    const c1 = {};
    if (st.cfu === 1) st.opts.forEach((o) => { c1[o.id] = mk(o); });
    // Screen-change fade class. Combined classes are built here because the template runtime drops a class
    // attribute that starts with a binding and holds two bindings ("{{a}} {{b}}").
    const fadeV = st.cfu || st.end ? (s.step % 2 ? 'fadeA' : 'fadeB') : 'fadeA';
    // qFocus / optsAfter: the answers stay hidden until qc is set
    const hasOpts = !!(st.opts && st.cfu !== 1) && (!(st.qFocus || st.optsAfter) || s.qc || s.done);
    const opts = hasOpts ? st.opts.map(mk) : [];
    // check 4: labels and drop slots
    const c4 = s.c4;
    const labs = this.labsDef().map((l) => {
      const p = this.labPos(l.id);
      const cls = (c4.locked[l.id] ? 'lock' : (c4.drag && c4.drag.id === l.id ? 'drag' : (c4.sel === l.id ? 'sel' : ''))) + (st.labelsAt && !s.labsIn ? ' pre' : '');
      return { id: l.id, t: l.t, x: Math.round(p.x), y: Math.round(p.y), cls: cls, down: (e) => this.labDown(l.id, e) };
    });
    const slots = this.slotsDef().map((q, i) => {
      const filled = Object.keys(c4.at).some((k) => c4.at[k] === q.id);
      const d = c4.drag, over = !filled && d && d.px > 840 - 20 && d.px < 840 + 284 + 20 && d.py > q.y - 20 && d.py < q.y + 64 + 20;
      // Empty slots brighten while a label is held or selected, and any empty slot lights up under a held
      // label (lighting only the right one would give the answer away).
      const okHere = Object.keys(c4.at).some((k) => c4.at[k] === q.id && c4.locked[k]);
      const cls = filled ? 'filled' + (okHere ? ' ok' : '') : over ? 'hot' : (c4.sel || d) ? 'ready' : 'empty';
      return { id: q.id, y: q.y, cls: cls, t: '', aria: 'Drop zone for shape ' + (i + 1), tap: () => this.slotTap(q.id) };
    });
    // scene: the ice panel on the right, Swiftee and her bubble on the left; the measuring room, summary and
    // hero screens rearrange it in CSS
    const tf = (c) => 'translate(' + c.tx + 'px, ' + c.ty + 'px) scale(' + c.scale + ')';
    // a plate screen (the journey's card): everything laid out about the panel's centre moves to the card's
    const plate = this.isPlate(st), pdx = plate ? CONFIG.fitPlate.cx - CONFIG.fit.cx : 0, pdy = plate ? CONFIG.fitPlate.cy - CONFIG.fit.cy : 0;
    return {
      rootMove: (e) => this.rootMove(e),
      rootUp: (e) => this.rootUp(e),
      rootCancel: (e) => this.rootCancel(e),
      isLesson: isLesson && s.started,
      isCfu1: st.cfu === 1, isCfu2: st.cfu === 2, isCfu3: st.cfu === 3, isCfu4: st.cfu === 4, isCfu5: st.cfu === 5,
      isEnd: !!st.end,
      isRecap: st.layout === 'recap',
      g: G.g, tags: G.tags,
      words: words,
      // a line with its own breaks keeps exactly those lines: the bubble widens instead of wrapping again
      bubCls: s.bub + ((s.line || '').indexOf('\n') >= 0 ? ' manual' : ''),
      // lesson steps share one board, so it only fades in when it first appears; each check fades in fresh
      fadeCls: fadeV,
      birdCls: 'bird', // Swiftee's expressions are driven by pose() (js/swiftee.js), not by re-rendering
      chips: chips.map((c) => ({ t: c.t, r: c.r || '', k: c.k + (c.t.length > 20 ? ' long' : '') })), // r: a result part animated on its own (screens 30-31)
      rootDown: () => this.rootDown(),
      showCover: !JOURNEY && (!s.started || !!s.coverLeaving), // (the journey has its own front page) coverCls: 'cover' + (s.coverLeaving ? ' leaving' : ''), coverGo: () => this.coverGo(),
      // explore (screen 29): Done pops in after the first real drag
      showDone: !!st.explore && !!s.explored, doneExplore: () => this.doneExplore(),
      showSumNext: !!st.summary && !!s.sumNext, sumNext: () => this.sumNextGo(),
      wordSize: wi > 15 || (s.line || '').length > 80 ? 22 : 24, // long lines get the smaller size
      c1: c1, hasOpts: hasOpts, opts: opts,
      // qFocus: the shape centred in the panel with the answers in a row under it; otherwise the usual right column
      // (plate: the answers are drawn larger, css .opts-row, and sit a little lower)
      optTop: (st.qFocus && s.qc ? CONFIG.qFocus.optTop : st.optTop || 376) + pdy + (plate ? (st.qFocus ? 92 : 36) + (st.plateOptDy || 0) : 0), optLeft: (st.qFocus && s.qc ? CONFIG.qFocus.cx - CONFIG.qFocus.optW / 2 : CONFIG.scene.chipLeft + 8) + pdx,
      optW: st.qFocus && s.qc ? CONFIG.qFocus.optW : 504, optCls: fadeV + (st.qFocus ? ' opts-in' : st.optsAfter ? ' opts-in quick' : '') + (st.softWrong ? ' soft-wrong' : ''),
      qx: CONFIG.qFocus.cx - 305 + pdx, qy: (s.qc ? CONFIG.qFocus.shapeTop : CONFIG.qFocus.shapeTop0) + pdy, chipTop: plate ? this.plateChipTop(s.P) : st.chipTop || CONFIG.scene.chipTop, chipLeft: CONFIG.scene.chipLeft + pdx,
      labs: labs, slots: slots,
      sceneCls: 'scene' + (plate ? ' plate' : '') + (st.noPanel ? ' nopanel' : '') + (st.hero ? ' hero' : '') + (st.hero && st.end ? ' endhero' : '') + (st.summary ? ' summary' : '') + (st.room === 'measure' ? ' measure-room' : ''), // hero (screens 36, 43-44): Swiftee centre stage, no board
      boardZ: this.boardMap().s || 1, // the board's zoom: angle values keep one size on screen (css .tag.alab)
      boardTf: st.room === 'measure' ? tf(CONFIG.measureRoom) : !st.noZoom ? tf(this.fit || (plate ? CONFIG.lessonZoomPlate : CONFIG.lessonZoom)) : 'translate(' + CONFIG.scene.boardX + 'px, ' + (st.boardShiftY || 0) + 'px)',
      // focusing: a part is being named, so the rest of the shape steps back
      boardCls: fadeV + (s.tracking ? ' tracking' : '') + (st.sideNums ? ' side-nums' : '') + (st.build && !(s.build && s.build.done) ? ' pre-build' : '') + (Object.keys(s.emph || {}).length ? ' focusing' : '') + (st.shapePre ? ' shape-pre' : '') + (st.parStrong ? ' par-strong' : '') + (st.lenPre ? ' len-pre' : '') + (st.tickPre ? ' tick-pre' : '') + (st.chevPre ? ' chev-pre' : '') + (st.legsSet ? ' legs-set' : '') + (st.right90 && st.r90Pre ? ' r90pre' : ''),
      // pulse: the shape and its labels zoom once about the shape's centre
      popO: s.P ? Math.round((s.P.A.x + s.P.B.x + s.P.C.x + s.P.D.x) / 4) + 'px ' + Math.round((s.P.A.y + s.P.B.y + s.P.C.y + s.P.D.y) / 4) + 'px' : 'center',
      swCls: s.swAway || s.arriving ? 'swiftee away' : 'swiftee',
      bubHide: !s.line || s.swAway ? 'gone' : s.bubOff ? 'away' : s.bubFresh && s.talking && !s.reveal ? 'wait' : '', // a bubble that was hidden waits for its first word, so it never shows empty
      // hand: the fingertip lands on (x, y); drags travel (dx, dy). On checks ('opts') the answers pulse instead
      handOn: !!(s.hand && s.hand.kind !== 'opts') && !(st.cfu && s.done), // no hint hand on an answered check
      hand: s.hand && s.hand.kind !== 'opts'
        ? { cls: 'hand-nudge ' + s.hand.kind + (s.hand.down ? ' down' : '') + (s.hand.once ? ' once' : ''), x: s.hand.x, y: s.hand.y, dx: s.hand.dx, dy: s.hand.dy }
        : { cls: 'hand-nudge', x: 0, y: 0, dx: 0, dy: 0 }
    };
  }
};
