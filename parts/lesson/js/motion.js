// =====================================================================
// MOTION - the lesson's animations, built on GSAP (js/vendor/gsap.min.js).
// Every animation a screen starts runs inside one gsap.context. Motion.clear(), called on every screen change,
// kills it and wipes the inline styles it set, so no screen inherits half-finished motion from the one before.
// The template runtime owns left/top and stroke colour, so animations use other properties (opacity, transform,
// filter, stroke-width...) and the two never fight. Hover/tap feedback stays in CSS.
// With prefers-reduced-motion, entrances jump to their end state; value tweens still run (they drive lesson state).
// =====================================================================
(function () {
  const G = window.gsap;
  // a cue can fire while its screen is being left (fast Next/Back); its targets are gone, so don't warn
  if (G && G.config) G.config({ nullTargetWarn: false });
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (sel) => Array.from(document.querySelectorAll('.stage ' + sel)).filter((e) => !e.closest('.board-ghost')); // (a fading copy of the last board is left alone)
  const GLOW = 'drop-shadow(0px 0px 6px rgba(30,123,255,0.6))', NOGLOW = 'drop-shadow(0px 0px 0px rgba(30,123,255,0))';
  // the shared timing for entrances: a soft ease-out with a slight overshoot
  const ENTER = { duration: 0.6, ease: 'back.out(1.3)' };
  let ctx = G ? G.context(() => {}) : null;
  // Teaching animations - the ones a spoken word starts, and the feedback on an answer - play slower than written
  // (Motion.paced), so a child can follow them while the voice says the word. pace stretches every animation
  // started inside add() while it is set.
  const TEACH_PACE = 1.7;
  // a tag's glow (a right answer, a question arriving): the tags' own gold rim swelling out, and back to nothing
  const TAG_GLOW = '0 0 0 6px rgba(255,201,77,0.5), 0 6px 18px rgba(0,20,60,0.3)', TAG_GLOW_OFF = '0 0 0 0px rgba(255,201,77,0), 0 6px 18px rgba(0,20,60,0.3)';
  let pace = 1;
  const add = (fn) => {
    if (!ctx) return null;
    if (pace === 1) return ctx.add(fn);
    const n0 = ctx.data.length, r = ctx.add(fn);
    ctx.data.slice(n0).forEach((a) => { if (a && a.timeScale && a.parent === G.globalTimeline) a.timeScale(1 / pace); });
    return r;
  };
  // ---------- marks drawn the way a teacher draws them ----------
  // An angle sweeps open from its first arm to its second: its wedge path ("M vertex L arm-start A r r 0 0 sweep
  // arm-end Z") is rebuilt as the sweep grows, and put back as drawn at the end (or by clear(), if cut short).
  const sweeps = [];
  const sweepOf = (w) => {
    // a wedge swept again while its last sweep is still running keeps its full shape (never the half-open one on screen)
    const open = sweeps.find((s) => s.w === w && !s.done);
    if (open) open.done = true;
    const d0 = open ? open.d0 : w && w.getAttribute('d'), n = ((d0 || '').match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (n.length < 11) return null;
    const vx = n[0], vy = n[1], sx = n[2], sy = n[3], R = n[4], f = n[8], a1 = Math.atan2(sy - vy, sx - vx);
    let da = Math.atan2(n[10] - vy, n[9] - vx) - a1;
    if (f === 1) { while (da < 0) da += Math.PI * 2; } else { while (da > 0) da -= Math.PI * 2; }
    const rec = { w: w, d0: d0 }; sweeps.push(rec);
    return { rec: rec, set: (t) => { const a = a1 + da * t, f1 = (v) => Math.round(v * 10) / 10;
      w.setAttribute('d', 'M' + vx + ',' + vy + ' L' + sx + ',' + sy + ' A' + R + ',' + R + ' 0 0 ' + f + ' ' + f1(vx + R * Math.cos(a)) + ',' + f1(vy + R * Math.sin(a)) + ' Z'); } };
  };
  // add the sweep of wedge w to timeline tl at time `at`
  const sweepIn = (tl, w, at, dur) => {
    const s = sweepOf(w);
    if (!s) { tl.set(w, { opacity: 1 }, at); return; }
    const p = { t: 0 };
    tl.set(w, { opacity: 1 }, at).fromTo(p, { t: 0 }, { t: 1, duration: reduced ? 0 : (dur || 0.7), ease: 'power1.inOut',
      onStart: () => s.set(0), onUpdate: () => { if (!s.rec.done) s.set(p.t); }, onComplete: () => { if (!s.rec.done) { w.setAttribute('d', s.rec.d0); s.rec.done = true; } } }, at);
  };
  // a value label slides out from where it belongs - an angle's corner, a side's middle - to its place
  const labelOut = (tl, lab, from, at) => {
    if (!lab) return;
    const x = parseFloat(lab.style.left), y = parseFloat(lab.style.top), dx = from && isFinite(x) ? (from.x - x) * 0.75 : 0, dy = from && isFinite(y) ? (from.y - y) * 0.75 : 0;
    tl.fromTo(lab, { opacity: 0, xPercent: -50, yPercent: -50, x: dx, y: dy, scale: 0.85 }, { opacity: 1, x: 0, y: 0, scale: 1, duration: reduced ? 0 : 0.6, ease: 'power3.out' }, at);
  };
  const sideMid = (k) => { const P = window.__trapP && window.__trapP(), ab = { AB: 'AB', BC: 'BC', CD: 'CD', DA: 'DA' }[k]; return P && ab ? { x: (P[ab[0]].x + P[ab[1]].x) / 2, y: (P[ab[0]].y + P[ab[1]].y) / 2 } : null; };
  const corner = (k) => { const P = window.__trapP && window.__trapP(); return P && P[k] ? { x: P[k].x, y: P[k].y } : null; };
  // the visible length label of a side (each side has two: one for the measuring screen, one for the lesson)
  const lenTag = (k) => $('.board .tag.m' + k).filter((x) => getComputedStyle(x).display !== 'none')[0];
  // CSS centres labels on their point with translate(-50%, -50%); GSAP must keep that once it owns the transform
  const centred = (els) => G.set(els, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  // every element Motion animates; clear() wipes the animated properties from all of them
  const ANIMATED = '.tag.snum, .tag.vlab, .edge, .vdot, .shape-fill, .outline-settle, .pop-g, .chev, .calp > *, .ticks, .tag.mtag, .okcheck *, .tag.alab, .arc, .wedge, .chip, .chip-res, .xleg, .swiftee, .swiftee canvas, .swiftee img, .bubble, .rmark, .tag.r90, .q3, .q3 *, .q3-hint, .q3-hint *, .q3-fly, .q4s, .q4s *, .slot, .lab, .q4-strip, .q4-card, .q4-link, .opt svg, .qshape, .hl, .spark, .q1-par, .q1-chev, .q2-leg, .q2-tick, .q2-eq, .q5-leg, .q5-tick, .q5-ad, .q5-q, .q5-bc, .q5-ab, .q5-cd, .q5-hab, .q5-hcd, .q5-hl';
  // the SVG ones among them (clear() removes transform-origin and stroke-dasharray from these by hand)
  const ANIMATED_SVG = '.wedge, .edge, .vdot, .shape-fill, .outline-settle, svg g.pop-g, .chev, .calp > *, .ticks, .okcheck *, .arc, .rmark, .q1-par, .q1-chev, .q2-leg, .q2-tick, .q2-eq, .q5-leg, .q5-tick, .q5-ad, .q5-q, .q5-bc, .q5-ab, .q5-cd, .q5-hab, .q5-hcd, .q5-hl';

  const Motion = {
    ok: !!G,
    // is something on the board animating right now? (a finite GSAP animation on the shape, its labels, the chips or
    // the effects layer; Swiftee, her bubble and endless ambient loops don't count)
    busy() {
      if (!G) return false;
      return G.globalTimeline.getChildren(true, true, false).some((t) => {
        if (!t.isActive || !t.isActive() || t.repeat() === -1 || !t.targets) return false;
        if (t.totalDuration() - t.totalTime() < 0.12) return false; // about to finish
        return t.targets().some((el) => el && el.closest && !el.closest('.swiftee, .bubble, .hand-nudge') && !!el.closest('.stage svg, .stage .board, .stage .chip-row, .eq-layer, .stage .q4-wrap'));
      });
    },
    // run fn with every animation it starts played k times slower (default: the teaching pace)
    paced(fn, k) { const was = pace; pace = k || TEACH_PACE; try { return fn(); } finally { pace = was; } },
    reduced: reduced,
    // stop everything the current screen started and put every element back as the stylesheet draws it.
    // revert() alone is not enough: a tween that started from another's end state (e.g. letters faded out, then
    // flown back in) can "revert" to a hidden state, so every animated property is also cleared by hand.
    // leaving the board for a screen without one (35 -> 36): a still copy of the shape, its labels and name plate fades out
    // with the ice panel, so the panel never shows empty while it fades. Called before clear(), which leaves the copy alone
    boardGhost() {
      const stage = document.querySelector('.stage'), b = document.querySelector('.stage .board'), sw = document.querySelector('.stage .swiftee');
      if (!stage || !b || reduced || !b.animate) return;
      const wrap = document.createElement('div');
      wrap.className = 'board-ghost';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.setAttribute('style', 'position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none');
      [b.previousElementSibling, b, document.querySelector('.stage .chip-row')].forEach((el) => { if (el) wrap.appendChild(el.cloneNode(true)); });
      if (sw && sw.parentNode === stage) stage.insertBefore(wrap, sw); else stage.appendChild(wrap); // under Swiftee and her bubble
      wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease', fill: 'forwards' }).onfinish = () => wrap.remove();
    },
    clear() {
      if (ctx) ctx.revert();
      sweeps.splice(0).forEach((s) => { if (!s.done && s.w.isConnected) s.w.setAttribute('d', s.d0); });
      document.querySelectorAll('[data-lencol]').forEach((e) => e.removeAttribute('data-lencol'));
      document.querySelectorAll('.stage [vector-effect]').forEach((e) => e.removeAttribute('vector-effect')); // growFocus's thin-stroke trick, if its tidy-up was cut short
      document.querySelectorAll('.stage .spark').forEach((e) => e.remove()); // a spark cut short by a screen change never lingers
      if (G) G.set($(ANIMATED), { clearProps: 'opacity,transform,filter,textShadow,strokeWidth,translate,rotate,scale,backgroundColor,borderColor,color' });
      // GSAP writes transform-origin on any SVG element it touches (even when clearing), and some draws set
      // stroke-dasharray directly: remove both by hand
      $(ANIMATED_SVG).forEach((el) => { el.style.removeProperty('transform-origin'); el.style.removeProperty('stroke-dasharray'); });
      document.querySelectorAll('.eq-layer, .stage .supp-at').forEach((el) => el.remove()); // equation builds and suppAt figures are added outside the context, so remove them by hand
      ctx = G ? G.context(() => {}) : null;
    },

    // a tween on plain values (pen position, trace length...): onUpdate(value) each frame, onDone at the end
    value(from, to, duration, ease, onUpdate, onDone) {
      if (!G) { onUpdate(to); if (onDone) onDone(); return; }
      const o = { v: from };
      add(() => G.to(o, { v: to, duration: duration, ease: ease, onUpdate: () => onUpdate(o.v), onComplete: onDone }));
    },
    // a pause that dies with the screen
    wait(seconds, fn) { if (!G) { fn(); return; } add(() => G.delayedCall(seconds, fn)); },

    // screen 1: the fill stays hidden while the pen draws; once the outline closes, a soft glow settles on it
    // and the fill fades in
    hideFill() { if (G) add(() => G.set($('.shape-fill'), { opacity: 0 })); },
    settle() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        // the finished outline flashes, and the shape fills up from its base to its top, like water
        tl.fromTo($('.outline-settle'), { opacity: 0 }, { opacity: 0.75, duration: 0.45, ease: 'sine.out' })
          .to($('.outline-settle'), { opacity: 0, duration: 0.85, ease: 'sine.inOut' })
          .fromTo($('.shape-fill'), { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0 : 1.1, ease: 'power2.inOut' }, 0.15)
          .set($('.shape-fill'), { clearProps: 'clipPath' });
        return tl;
      });
    },

    // screen 2: the side numbers 1-4 (top, right, bottom, left) glide in from their own sides, one after another;
    // onLand(i) fires as number i settles
    sideNumsHide() { const els = $('.tag.snum'); if (G && els.length) add(() => { centred(els); G.set(els, { opacity: 0 }); }); },
    // onSide(i) starts side i's marker as its number starts: both take 0.35 s (css .side-nums .hl.on), so the number
    // lands as its side finishes lighting, and the next side follows straight on
    sideNums(onSide) {
      const els = ['.tag.snum.n1', '.tag.snum.n2', '.tag.snum.n3', '.tag.snum.n4'].map((s) => $(s)[0]).filter(Boolean);
      if (!G || !els.length) { els.forEach((e, i) => onSide && onSide(i)); return; }
      const from = [{ y: -46 }, { x: 46 }, { y: 46 }, { x: -46 }], gap = 0.45;
      add(() => {
        centred(els);
        const tl = G.timeline();
        els.forEach((el, i) => {
          tl.call(() => onSide && onSide(i), null, i * gap)
            .fromTo(el, Object.assign({ opacity: 0, x: 0, y: 0 }, from[i]),
              { opacity: 1, x: 0, y: 0, duration: reduced ? 0 : 0.35, ease: 'power2.out' }, i * gap);
        });
        return tl;
      });
    },

    // screens 9 and 11: the parallel pair AB, DC pulses together with a soft purple glow (with its dashed
    // extensions on screen 9, its arrows on screen 11), showing which pair runs side by side without meeting

    // screens 14 ("parallel") and 15 ("other"): the named pair redraws itself one side after the other, like a pen stroke
    focusPair(keys) {
      const pair = keys.map((k) => $('.e' + k)[0]).filter(Boolean);
      const others = ['AB', 'BC', 'CD', 'DA'].filter((k) => keys.indexOf(k) < 0).map((k) => $('.e' + k)[0]).filter(Boolean);
      if (!G || !pair.length) return;
      // the pair is lit by the engine's focus (its sides thicken, bands draw along both): no dots
    },
    // screens 14 and 15: the "Base" / "Leg" pills come in together as the word is said (each connector draws out from
    // its side as its pill fades in), then the other two sides ease back to full strength. The pills stay.
    calloutIn(pairKeys) {
      if (!G) return;
      const keys = pairKeys || [];
      const pills = [$('.calp1')[0], $('.calp2')[0]].filter(Boolean);
      const others = ['AB', 'BC', 'CD', 'DA'].filter((k) => keys.indexOf(k) < 0).map((k) => $('.e' + k)[0]).filter(Boolean);
      add(() => {
        const tl = G.timeline();
        pills.forEach((p, i) => {
          const stem = p.querySelector('.cal-stem'), body = Array.from(p.children).filter((c) => c !== stem);
          const L = (stem && stem.getTotalLength && stem.getTotalLength()) || 1, at = i * 0.12;
          tl.set(body, { opacity: 0 }, 0);
          if (stem) tl.fromTo(stem, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.25, ease: 'sine.out' }, at);
          tl.fromTo(body, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.3, ease: 'power2.out', immediateRender: false }, at + 0.1);
        });
        tl.to(others, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, '>+0.6').set(others, { clearProps: 'opacity' });
        return tl;
      });
    },

    // screen 21, on "same": the bases dim, both legs draw in from their ends to their middles together, then pulse
    // once as the equal marks and leg lengths appear; after a short hold everything eases back
    equalLegs() {
      const legs = [$('.eDA')[0], $('.eBC')[0]].filter(Boolean);
      if (!G || legs.length < 2) return;
      // with .tick-pre (screen 21) the equal marks come later, from lensToTicks, so leave them alone here
      const ticks = document.querySelector('.board.tick-pre, .tick-pre') ? [] : $('.ticks'), labels = $('.board .tag.mleg');
      // both legs light up together (a spark runs along each), and their equal lengths slide out of them side by side
      add(() => {
        const tl = G.timeline();
        tl.to(legs, { strokeWidth: 7, duration: 0.3, ease: 'sine.out' }, 0)
          .call(() => labels.forEach((l) => l.setAttribute('data-in', '1')), null, 0.25); // data-in keeps them shown (they start hidden by .len-pre)
        labels.forEach((l) => labelOut(tl, l, sideMid(l.classList.contains('mDA') ? 'DA' : 'BC'), 0.25));
        if (ticks.length) tl.fromTo(ticks, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
        tl.to(legs, { strokeWidth: 5, duration: 0.45, ease: 'sine.inOut' }, 1.9)
          .set(legs, { clearProps: 'strokeWidth' });
        return tl;
      });
    },

    // screen 29 opens: the corner handles pop in one after another, then any length labels fade in
    entryPop() {
      const dots = $('.vdot'), labels = $('.board .tag.mtag');
      if (!G || !dots.length) return;
      add(() => G.timeline()
        .fromTo(dots, { scale: 0.4, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: reduced ? 0 : 0.35, ease: 'back.out(1.8)', stagger: 0.08 }, 0.15)
        .fromTo(labels, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'sine.out', stagger: 0.05 }, '>-0.1'));
    },

    // screen 23 without the protractor walk (reduced motion, or no walker): A -> B -> C -> D, each arc draws
    // round its corner, its filled angle grows out and its value glides in toward the corner
    anglesIn() {
      if (!G) return;
      // each value starts a little further inside the shape, along the line from its corner, so it stays inside
      // the trapezium as it moves (the arcs are clipped to the shape by index.html #shapeClip)
      const dots = $('.vdot'), order = ['A', 'B', 'C', 'D'];
      const dir = {};
      order.forEach((k, i) => {
        const lab = $('.tag.alab.l' + k)[0], dot = dots[i];
        if (!lab || !dot) { dir[k] = [0, 0]; return; }
        const lx = parseFloat(lab.style.left), ly = parseFloat(lab.style.top), vx = +dot.getAttribute('cx'), vy = +dot.getAttribute('cy');
        const L = Math.hypot(lx - vx, ly - vy) || 1;
        dir[k] = [(lx - vx) / L * 16, (ly - vy) / L * 16];
      });
      add(() => {
        const tl = G.timeline();
        order.forEach((k, i) => {
          const arc = $('.arc.a' + k)[0], lab = $('.tag.alab.l' + k)[0], at = i * 0.55;
          if (arc) tl.fromTo(arc, { opacity: 1, strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out' }, at);
          // the filled angle sweeps open from one arm to the other, as the arc draws round
          const wd = $('.wedge.w' + k)[0];
          if (wd) sweepIn(tl, wd, at, 0.45);
          if (lab) tl.fromTo(lab, { opacity: 0, x: dir[k][0], y: dir[k][1], xPercent: -50, yPercent: -50, scale: 0.9 },
            { opacity: 1, x: 0, y: 0, scale: 1, duration: reduced ? 0 : 0.5, ease: 'power3.out' }, at + 0.1);
        });
        return tl;
      });
    },

    // screen 23, one corner at a time: as Swiftee holds the protractor on corner k (js/angle-walker.js), its arc
    // draws, its filled angle grows out and glows once, and its value pops in; all of it stays
    angleIn(k) {
      if (!G) return;
      const i = ['A', 'B', 'C', 'D'].indexOf(k), dot = $('.vdot')[i];
      const arc = $('.arc.a' + k)[0], wd = $('.wedge.w' + k)[0], lab = $('.tag.alab.l' + k)[0];
      const C = { A: 'rgba(255,122,0,0.8)', B: 'rgba(31,207,102,0.7)', C: 'rgba(18,164,255,0.7)', D: 'rgba(255,196,0,0.9)' };
      add(() => {
        const tl = G.timeline();
        if (arc) tl.fromTo(arc, { opacity: 1, strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out' }, 0);
        if (wd) sweepIn(tl, wd, 0, 0.5);
        labelOut(tl, lab, corner(k), 0.3);
        return tl;
      });
    },
    // an angle named in the line: its filled angle and its value jump once about the corner (quick up, soft settle)
    angleJump(k) {
      const P = window.__trapP && window.__trapP(), w = $('.wedge.w' + k)[0], lab = $('.tag.alab.l' + k)[0];
      if (!G || reduced || !P || !w) return;
      add(() => G.timeline()
        .fromTo(w, { scale: 1, svgOrigin: P[k].x + ' ' + P[k].y }, { scale: 1.3, duration: 0.22, ease: 'power2.out' }, 0)
        .to(w, { scale: 1, duration: 0.38, ease: 'power2.inOut' }, 0.22)
        .set(w, { clearProps: 'transform' })
        // its value hops with it: up and a little bigger, then lands with a small bounce
        .add(lab ? G.timeline()
          .fromTo(lab, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { y: -11, scale: 1.28, duration: 0.22, ease: 'power2.out' })
          .to(lab, { y: 0, scale: 1, duration: 0.42, ease: 'bounce.out' }) : G.timeline(), 0));
    },
    // screen 27, as each angle is named: this arc redraws round its corner and pulses once, and its filled angle grows
    // in and its value pulses with it (the other angles stay as they are)
    angleFocus(k) {
      if (!G) return;
      const arc = $('.arc.a' + k)[0], lab = $('.tag.alab.l' + k)[0];
      this.wedgeGrow([k]);
      add(() => {
        const tl = G.timeline();
        if (arc) tl.fromTo(arc, { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.5, ease: 'power2.out' }, 0)
          .to(arc, { strokeWidth: 7, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5);
        if (lab) tl.fromTo(lab, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.15, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5);
        return tl;
      });
    },
    // ---------- the equation build (screen 25; two boxes on screen 30) ----------
    // eqStart as the line starts: "∠A + ∠D = ?" rises in; eqFlyA / eqFlyD as each angle is named: its value flies in;
    // eqResult on "180": they add up to 180°. A cue that arrives early first completes the steps before it.
    // The build has its own layer outside the runtime's markup (the runtime must not meet nodes it did not make),
    // laid over the stage and scaled with it, so its children use stage coordinates. clear() removes it.
    eqLayer() {
      const stage = document.querySelector('.stage');
      if (!stage) return null;
      let L = document.querySelector('.eq-layer');
      if (!L) { L = document.createElement('div'); L.className = 'eq-layer'; document.body.appendChild(L); }
      // fixed to the window, so it follows the stage when the window changes (a resize, a tablet turned)
      if (!this.eqResize) {
        this.eqResize = () => { if (document.querySelector('.eq-layer')) { if (window.fitStage) window.fitStage(); this.eqLayer(); } };
        addEventListener('resize', this.eqResize);
      }
      const r = stage.getBoundingClientRect(), k = r.width / 1280 || 1;
      L.style.left = r.left + 'px'; L.style.top = r.top + 'px'; L.style.transform = 'scale(' + k + ')';
      return L;
    },
    // eqStartAt(spec): { i: box number, keys: 'AD' | 'BC', dx: offset from the formula row's centre,
    // pair: one of two boxes side by side, dim: start faded until its turn }. Screen 25 uses box 0, screen 30 both.
    eqBox(i) { return document.querySelector('.eq-build[data-i="' + (i || 0) + '"]'); },
    eqStart() { this.eqStartAt({ i: 0, keys: 'AD' }); },
    eqStartAt(sp) {
      if (!G || this.eqBox(sp.i)) return;
      const row = $('.chip-row')[0], stage = this.eqLayer();
      if (!row || !stage) return;
      const box = document.createElement('div'), K = sp.keys || 'AD';
      box.className = 'chip gold eq-build' + (sp.pair ? ' eq-pair' : ''); box.dataset.i = sp.i || 0; box.dataset.keys = K;
      // the answer side goes "?" -> "120° + 60°" -> "180°" in one fixed-width cell, so the equation never shifts
      box.innerHTML = '<span>∠' + K[0] + '</span><span class="eq-op">+</span><span>∠' + K[1] + '</span><span class="eq-op">=</span>' +
        '<span class="eq-r"><span class="eq-q">?</span><span class="eq-sum"><span class="eq-v1"></span><span class="eq-op eq-plus">+</span><span class="eq-v2"></span></span><span class="eq-res">180°</span></span>';
      // centred on the formula row (in stage coordinates)
      box.style.left = (row.offsetLeft + row.offsetWidth / 2 + (sp.dx || 0)) + 'px'; box.style.top = (row.offsetTop + row.offsetHeight / 2) + 'px';
      stage.appendChild(box);
      add(() => G.timeline()
        .fromTo(box, { xPercent: -50, yPercent: -50, x: 0, opacity: 0, y: 14, scale: 0.94 }, { opacity: sp.dim ? 0.5 : 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.15)
        .fromTo(box.querySelector('.eq-q'), { scale: 1 }, { scale: 1.25, color: '#ffab00', duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.6)); // (bright: it pulses inside a navy tag)
    },
    // "add": copies of the two values lift off the shape and fly, one after the other, to the answer side;
    // the first replaces the "?", then the "+" appears and the second lands beside it
    // screen 25: each value jumps into the sum as the voice names its angle (eqFlyA on "angle A", eqFlyD on "angle D");
    // on "180" they merge (eqResult)
    // (delay: the value hops first - angleJump - and its copy lifts off for the sum just as it lands)
    eqFlyA() { this.eqFlyAt(0, { only: 0, delay: 0.4, lift: 0.2, travel: 0.6 }); },
    eqFlyD() { this.eqFlyAt(0, { only: 1, delay: 0.4, lift: 0.2, travel: 0.6 }); },
    // o: { only (0 or 1: just that value), delay, gap (s between the two values), lift, travel } - by default both values,
    // one after the other (screen 30)
    eqFlyAt(i, o) {
      o = o || {};
      const gap = o.gap != null ? o.gap : 1.05, lift = o.lift || 0.25, travel = o.travel || 0.7, land = lift + travel;
      if (!G) return;
      if (!this.eqBox(i)) this.eqStart();
      const box = this.eqBox(i), stage = this.eqLayer();
      if (!box) return;
      const which = (o.only != null ? [o.only] : [0, 1]).filter((j) => !box.dataset['f' + j]); // values not yet on their way
      if (!which.length) return;
      which.forEach((j) => { box.dataset['f' + j] = '1'; });
      const sr = stage.getBoundingClientRect(), k = sr.width / 1280 || 1;
      const local = (r) => ({ x: (r.left - sr.left + r.width / 2) / k, y: (r.top - sr.top + r.height / 2) / k });
      const K = box.dataset.keys, txt = (k) => (($('.board .tag.alab.l' + k)[0] || {}).textContent || '').trim();
      box.querySelector('.eq-v1').textContent = txt(K[0]); box.querySelector('.eq-v2').textContent = txt(K[1]);
      if (+getComputedStyle(box).opacity < 0.99) G.to(box, { opacity: 1, duration: 0.3 }); // a dimmed box comes up to full strength for its turn
      add(() => {
        // landed: once both values are in, the merge (eqResult) may run
        const tl = G.timeline({ onComplete: () => { which.forEach((j) => { box.dataset['l' + j] = '1'; }); if (box.dataset.l0 && box.dataset.l1) { box.dataset.landed = '1'; if (box._after) box._after(); } } });
        which.forEach((j, i) => {
          const v = K[j], sel = j ? '.eq-v2' : '.eq-v1';
          const src = $('.board .tag.alab.l' + v)[0], dst = box.querySelector(sel);
          if (!src || !dst) return;
          // the answer side is already laid out (just invisible), so the landing spot can be measured
          const from = local(src.getBoundingClientRect()), to = local(dst.getBoundingClientRect());
          const c = document.createElement('div');
          // in its angle's colour: the value itself lifting off
          c.className = 'tag alab eq-fly l' + v + (box.classList.contains('eq-pair') ? ' small' : ''); c.textContent = src.textContent.trim(); c.style.left = from.x + 'px'; c.style.top = from.y + 'px';
          stage.appendChild(c);
          const at = (o.delay || 0) + i * gap, grow = 28 / 21; // the text grows from label size to formula size in flight
          // the label itself lifts off and flies (its copy takes its place at once, the original hidden), so there is
          // only ever one of the value on screen; the original comes back once the value has landed in the sum
          // (the copy waits hidden until its moment, then swaps in for the label in the same instant)
          tl.fromTo(c, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, opacity: 0 }, { opacity: 1, duration: 0.01 }, at)
            .call(() => src.classList.add('eq-src'), null, at)
            .set(src, { opacity: 0 }, at)
            .to(c, { y: -16, scale: 1.12, duration: lift, ease: 'power2.out' }, at)
            .to(src, { opacity: 1, duration: 0.4, ease: 'sine.inOut', onComplete: () => src.classList.remove('eq-src') }, at + land + 0.1);
          if (o.only == null) tl.fromTo(src, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 }, at); // (a single value's label is already hopping: angleJump)
          tl.to(c, { x: to.x - from.x, y: to.y - from.y, scale: grow, duration: travel, ease: 'power2.inOut' }, at + lift)
            .fromTo(dst, { opacity: 0 }, { opacity: 1, duration: 0.15 }, at + land - 0.05)
            .to(c, { opacity: 0, duration: 0.15, onComplete: () => c.remove() }, at + land - 0.03)
            .fromTo(dst, { scale: 1 }, { scale: 1.12, duration: 0.14, ease: 'sine.out', yoyo: true, repeat: 1 }, at + land);
          if (j === 0) tl.to(box.querySelector('.eq-q'), { opacity: 0, scale: 0.5, duration: 0.2 }, at + land - 0.15)
            .fromTo(box.querySelector('.eq-plus'), { opacity: 0 }, { opacity: 1, duration: 0.25 }, at + land + 0.05);
        });
        return tl;
      });
    },
    // "180": the two values slide together and merge into "180°", which pops with a warm halo
    eqResult(onPop) { this.eqResultAt(0, onPop); },
    eqResultAt(i, onPop) {
      if (!G) return;
      if (!this.eqBox(i)) this.eqStart();
      const box = this.eqBox(i);
      if (!box || box.dataset.result) return;
      box.dataset.result = '1';
      const go = () => {
        const v1 = box.querySelector('.eq-v1'), v2 = box.querySelector('.eq-v2'), plus = box.querySelector('.eq-plus'), res = box.querySelector('.eq-res');
        if (onPop) onPop();
        // the sum "120° + 60°" fades out where it stands, and only then does "180°" pop in: the numbers never collide
        add(() => G.timeline()
          .to([v1, plus, v2], { opacity: 0, scale: 0.85, duration: 0.28, ease: 'power2.in' }, 0)
          .fromTo(res, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, 0.3)
          .fromTo(box, { boxShadow: '0 0 0 0 rgba(255,196,60,0)' }, { boxShadow: '0 0 0 6px rgba(255,214,110,.5)', duration: 0.35, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.4)
          .to(res, { scale: 1.15, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.85)
          // the answer cell shrinks to the width of "180°" (the faded values leave the layout), so the equation
          // stays centred
          .set(box.querySelector('.eq-r'), { width: box.querySelector('.eq-r').offsetWidth, minWidth: 0 }, 0.29)
          .set(box.querySelector('.eq-sum'), { position: 'absolute' }, 0.29)
          .to(box.querySelector('.eq-r'), { width: res.offsetWidth, duration: 0.4, ease: 'power2.inOut' }, 0.3));
      };
      // wait for the values to land first
      if (box.dataset.landed) go();
      else { box._after = go; this.eqFlyAt(i); } // (flies any value not yet on its way)
    },
    // screen 34, on "another": the second right angle steps forward - its arc thickens and its value pops
    anglePop(k) {
      const arc = $('.arc.a' + k)[0], lab = $('.tag.alab.l' + k)[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (lab) tl.fromTo(lab, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.3, duration: 0.25, ease: 'back.out(2)', yoyo: true, repeat: 1 }, 0);
        if (arc) tl.fromTo(arc, { strokeWidth: 5 }, { strokeWidth: 7, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        return tl;
      });
    },
    // screen 31: the angle values turn into their names (∠A...) with a soft pop
    angleNames() {
      const labs = $('.board .tag.alab');
      if (!G || !labs.length) return;
      add(() => G.fromTo(labs, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(1.8)', stagger: 0.06 }));
    },
    // screen 31: sum box i resolves - "= 180°" pops in and the box gets a warm halo (strong: an extra pulse)
    sumResolve(i, strong) {
      const c = $('.chip-row .chip')[i], r = c && c.querySelector('.chip-res');
      if (!G || !c || !r) return;
      add(() => {
        const tl = G.timeline();
        tl.fromTo(r, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)' }, 0)
          .fromTo(c, { boxShadow: '0 0 0 0px rgba(255,196,60,0)' }, { boxShadow: '0 0 0 6px rgba(255,214,110,.5)', duration: 0.35, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1);
        if (strong) tl.to(r, { scale: 1.18, color: '#ffab00', duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.55);
        return tl;
      });
    },
    // ---------- side-length labels and the definition story (screens 13, 16, 17, 18, 21) ----------
    // screens 17 and 21, on "trapezium": the whole shape pops once about its centre
    shapePop() {
      const P = window.__trapP && window.__trapP();
      if (P) this.pop((P.A.x + P.B.x + P.C.x + P.D.x) / 4, (P.A.y + P.B.y + P.C.y + P.D.y) / 4);
    },
    // the length labels (hidden by .len-pre) pop in `gap` s apart, each side glowing as its label lands
    lensIn(keys, gap) {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        keys.forEach((k, i) => {
          const lab = lenTag(k), e = $('.e' + k)[0], at = i * gap;
          // data-in keeps it shown: the runtime rewrites the label's style on every redraw but leaves attributes alone
          if (lab) { tl.call(() => lab.setAttribute('data-in', '1'), null, at + 0.15); labelOut(tl, lab, sideMid(k), at + 0.15); }
          if (e) tl.to(e, { strokeWidth: 7, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
            .set(e, { clearProps: 'strokeWidth,filter' }, at + 0.65);
        });
        return tl;
      });
    },
    // the scalene screen, on "sides": AB, BC, CD, DA in turn, each side and its length in its own colour (all
    // different). Returns how long it runs (s), so the name can wait for the last length
    lensSeq() {
      const keys = ['AB', 'BC', 'CD', 'DA'], gap = 0.3;
      this.lensIn(keys, gap);
      keys.forEach((k, i) => add(() => G && G.delayedCall(i * gap + 0.15, () => { const l = lenTag(k); if (l) l.setAttribute('data-col', k); this.sideColours(); })));
      return (keys.length - 1) * gap + 0.65;
    },
    // the sides take their own colours (CSS svg[data-lencol]); an attribute, so a redraw keeps it, and clear() removes it
    sideColours() { $('svg[aria-label="Trapezium ABCD"]').forEach((s) => s.setAttribute('data-lencol', '1')); },
    // screen 16, on "sides": the same rhythm as lensSeq - each side glows in turn while its length pops and
    // takes the side's own colour
    lenColors() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        ['AB', 'BC', 'CD', 'DA'].forEach((k, i) => {
          const lab = lenTag(k), e = $('.e' + k)[0], at = i * 0.45;
          if (lab) { tl.call(() => { lab.setAttribute('data-col', k); this.sideColours(); }, null, at + 0.15); labelOut(tl, lab, sideMid(k), at + 0.15); } // the colour comes from CSS (.tag.mtag[data-col]), so a redraw keeps it
          if (e) tl.to(e, { strokeWidth: 7, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
            .set(e, { clearProps: 'strokeWidth,filter' }, at + 0.65);
        });
        return tl;
      });
    },
    // a mark arriving (arrows, equal marks, right-angle squares, the point where legs meet): it glows gold once
    markPing(what) {
      if (!G || reduced) return;
      const els = (Array.isArray(what) ? what : [what]).filter((e) => e && e.nodeType === 1);
      if (els.length) add(() => G.fromTo(els, { filter: 'drop-shadow(0px 0px 0px rgba(255,196,0,0))' }, { filter: 'drop-shadow(0px 0px 6px rgba(255,196,0,0.95))', duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }));
    },
    // a bright spark runs along a side from end to end, so the eye follows the side being named
    spark(k) {
      const e = $('.e' + k)[0];
      if (!G || reduced || !e || getComputedStyle(e).display === 'none') return;
      if (e.parentNode.querySelector('.spark[data-k="' + k + '"]')) return; // one spark on a side at a time (never a second dot)
      let a = { x: +e.getAttribute('x1'), y: +e.getAttribute('y1') }, b = { x: +e.getAttribute('x2'), y: +e.getAttribute('y2') };
      // one direction for everything: up a leg (towards where the legs would meet), left to right along a base
      const steep = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      if (steep ? a.y < b.y : a.x > b.x) { const t = a; a = b; b = t; }
      // the spark's place is its circle's own cx / cy (never a transform the screen-change cleanup could strip)
      const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'circle');
      g.setAttribute('class', 'spark'); g.setAttribute('data-k', k); g.setAttribute('pointer-events', 'none');
      g.setAttribute('r', 9); g.setAttribute('fill', '#ffffff'); g.setAttribute('stroke', '#ffab00'); g.setAttribute('stroke-width', 4);
      e.parentNode.appendChild(g);
      const p = { t: 0 }, put = () => { g.setAttribute('cx', (a.x + (b.x - a.x) * p.t).toFixed(1)); g.setAttribute('cy', (a.y + (b.y - a.y) * p.t).toFixed(1)); };
      put();
      add(() => G.timeline({ onComplete: () => g.remove() })
        .fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0)
        .to(p, { t: 1, duration: 0.55, ease: 'power1.inOut', onUpdate: put }, 0) // (as long as the marker's draw, css .hl.on)
        .to(g, { opacity: 0, duration: 0.2 }, 0.52));
    },
    // screen 18, on "different": the legs are highlighted (engine) and their two lengths glow gold together
    legsPop() {
      const labs = ['DA', 'BC'].map((k) => lenTag(k)).filter(Boolean);
      if (!G || !labs.length) return;
      add(() => G.timeline()
        .fromTo(labs, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.18, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
        .set(labs, { clearProps: 'transform' }));
    },
    // "parallel": the arrows glide along both bases the same way, and any extension lines brighten with them
    parallelShow() {
      const chev = $('.chev').filter((e) => getComputedStyle(e).display !== 'none'), ext = $('.xleg').filter((e) => getComputedStyle(e).display !== 'none');
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (chev.length) tl.fromTo(chev, { x: -34, opacity: 0.2 }, { x: 0, opacity: 1, duration: reduced ? 0 : 0.9, ease: 'power2.out' }, 0)
          .to(chev, { duration: 0.35, yoyo: true, repeat: 1 }, 0.6);
        if (ext.length) tl.to(ext, { strokeWidth: 5, opacity: 1, duration: 0.4, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        tl.call(() => { if (chev.length) G.set(chev, { clearProps: 'transform,opacity,filter' }); if (ext.length) G.set(ext, { clearProps: 'strokeWidth,opacity' }); });
        return tl;
      });
    },
    // screen 21, on "isosceles": the two equal lengths shrink into their legs and turn into the equal marks
    // (hidden by .tick-pre until now)
    lensToTicks() {
      const labs = ['DA', 'BC'].map((k) => lenTag(k)).filter(Boolean), ticks = $('.ticks'), P = window.__trapP && window.__trapP();
      if (G) G.killTweensOf(labs);
      if (!G || !P) return;
      const mid = { DA: { x: (P.D.x + P.A.x) / 2, y: (P.D.y + P.A.y) / 2 }, BC: { x: (P.B.x + P.C.x) / 2, y: (P.B.y + P.C.y) / 2 } };
      add(() => {
        const tl = G.timeline();
        labs.forEach((lab) => {
          const k = lab.classList.contains('mDA') ? 'DA' : 'BC';
          tl.to(lab, { x: mid[k].x - parseFloat(lab.style.left), y: mid[k].y - parseFloat(lab.style.top), scale: 0.3, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0)
            .call(() => lab.setAttribute('data-gone', '1'), null, 0.55);
        });
        tl.call(() => { ticks.forEach((t) => t.setAttribute('data-in', '1')); this.drawOn(ticks, 0, 0.4); this.markPing(ticks); }, null, 0.45)
          .to(ticks, { duration: 0.3, yoyo: true, repeat: 1 }, 0.85);
        return tl;
      });
    },
    // screen 22: the whole shape fades in with a soft scale-up. It is a CSS animation keyed on data-in
    // (.shape-pre), so a redraw mid-way cannot cut it short.
    shapeIn() { $('.pop-g').forEach((e) => e.setAttribute('data-in', '1')); },
    // the definitions (the trapezium's and the right trapezium's): the parallel arrows (hidden by .chev-pre) glide onto their sides
    chevIn() {
      const chev = $('.chev');
      if (!G || !chev.length) return;
      chev.forEach((c) => c.setAttribute('data-in', '1'));
      // the arrows glide along their sides the way they point: both bases run the same way
      add(() => G.timeline()
        .fromTo(chev, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: reduced ? 0 : 0.8, ease: 'power2.out' }, 0)
        .call(() => this.markPing(chev.filter((c) => !c.classList.contains('chev-halo'))), null, 0.7)
        .to(chev, { duration: 0.3, yoyo: true, repeat: 1 }, 0.75));
    },
    // screen 35, on "right": A's square and 90° come in, then D's, then both glow gold - one at a time
    rightBoth() {
      this.rightMark('A');
      add(() => G.delayedCall(0.6, () => this.rightMark('D')));
      add(() => G.delayedCall(1.3, () => this.rightGlow()));
    },
    // the filled angle of each key grows out of its corner (soft overshoot) and glows once in its own colour.
    // keys: 'AD' or ['B'] ...; 0.3 s apart, after `delay` s
    wedgeGrow(keys, delay) {
      const P = window.__trapP && window.__trapP(), K = typeof keys === 'string' ? keys.split('') : keys;
      const C = { A: 'rgba(255,122,0,0.8)', B: 'rgba(31,207,102,0.7)', C: 'rgba(18,164,255,0.7)', D: 'rgba(255,196,0,0.9)' };
      if (!G || !P) return;
      add(() => {
        const tl = G.timeline({ delay: delay || 0 });
        K.forEach((k, i) => {
          const w = $('.wedge.w' + k)[0];
          if (!w || getComputedStyle(w).display === 'none') return;
          sweepIn(tl, w, i * 0.45, 0.6);
          tl.to(w, { duration: 0.3, yoyo: true, repeat: 1 }, i * 0.45 + 0.6)
            .set(w, { clearProps: 'filter' }, i * 0.45 + 1.25);
        });
        return tl;
      });
    },
    // screen 27: the named pair pulses together (arcs and values), then every angle returns to full strength
    anglesTogether(keys) {
      if (!G || !keys.length) return;
      const arcs = keys.map((k) => $('.arc.a' + k)[0]).filter(Boolean), labs = keys.map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
      const all = $('.arc').concat($('.board .tag.alab'), $('.wedge'));
      add(() => G.timeline()
        .to(arcs.concat(labs), { opacity: 1, duration: 0.2 }, 0)
        .to(arcs, { strokeWidth: 7, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        .fromTo(labs, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.15, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        .to(all, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, '>+0.8')
        .set(all, { clearProps: 'opacity,strokeWidth,strokeDasharray,strokeDashoffset' }));
    },
    // a name label arriving (showTitle: screens 13, 17, 21, 22, 35): 85% -> 105% -> 100%, then one gentle pulse
    titlePop() {
      const els = $('.chip'), el = els[els.length - 1];
      if (!G || !el) return;
      // the name glides up into place and stays still (no pulse)
      add(() => G.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out' }));
    },
    // a new label arriving: a soft pop with a slight lift
    chipPop() {
      const els = $('.chip');
      const el = els[els.length - 1];
      // a name plate (title) glides up into place - no pop
      if (G && el) add(() => G.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out' }));
    },

    // screen 43 (end): Swiftee flies in a gentle arc from her usual spot to centre stage, then hovers softly
    heroIn() {
      const sw = $('.swiftee')[0];
      if (!G || !sw) return;
      add(() => {
        const tl = G.timeline(), fly = reduced ? 0 : 1.1;
        tl.fromTo(sw, { x: -440, scale: 0.9 }, { x: 0, scale: 1, duration: fly, ease: 'power2.inOut' }, 0)
          .fromTo(sw, { y: 0 }, { y: -110, duration: fly / 2, ease: 'sine.out' }, 0)
          .to(sw, { y: 0, duration: fly / 2, ease: 'sine.in' }, fly / 2)
          .call(() => { if (!reduced) G.to(sw, { y: -12, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }); });
        return tl;
      });
    },

    // ---------- screen 26 "That means they are supplementary angles." ----------
    // as the line starts: A and D pulse gently (their filled angles grow in as the screen opens: focusAng); B and C
    // step back
    suppStart() {
      if (!G) return;
      const focus = ['A', 'D'].map((k) => $('.arc.a' + k)[0]).filter(Boolean), flab = ['A', 'D'].map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
      add(() => G.timeline()
        .to(focus, { strokeWidth: 7, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1)
        .fromTo(flab, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.12, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1));
    },
    // on "angles": the equation glows softly; a little later the angles' pulses settle (B and C stay back: focusAng)
    suppConfirm() {
      if (!G) return;
      const chips = $('.chip'), chip = chips[chips.length - 1];
      const all = $('.arc').concat($('.board .tag.alab'), $('.wedge'));
      add(() => {
        const tl = G.timeline();
        if (chip) tl.to(chip, { scale: 1.06, boxShadow: TAG_GLOW, duration: 0.3, ease: 'sine.out' }, 0)
          .to(chip, { scale: 1, boxShadow: TAG_GLOW_OFF, duration: 0.5, ease: 'sine.inOut' }, 0.35).set(chip, { clearProps: 'boxShadow' });
        tl.to(all, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 2.6)
          .set(all, { clearProps: 'opacity,strokeWidth' });
        return tl;
      });
    },

    // screens 26 and 27, on the shape: the bottom base extends past corner S as a dashed line; a copy of the upper
    // angle T slides down the leg to S and makes a half-turn about S, landing on the extension beside S's own angle,
    // so the two fill a straight angle (half-circle + "180°"). The half-turn makes the copy exact for any shape.
    suppAt(T, S) {
      const P = window.__trapP && window.__trapP(), e = $('.eAB')[0];
      if (!G || !P || !e) return;
      const ns = 'http://www.w3.org/2000/svg', R = 38 / ((window.__boardS && window.__boardS()) || 1), COL = { A: '#ff7a00', B: '#00c853', C: '#9d4dff', D: '#ffab00' };
      const nb = { A: 'B', B: 'A', C: 'D', D: 'C' }, unit = (p, q) => { const L = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: (q.x - p.x) / L, y: (q.y - p.y) / L }; };
      const t = P[T], s = P[S], dT = unit(t, P[nb[T]]), dS = unit(s, P[nb[S]]), up = unit(s, t);
      const wedge = (u, v, col) => { const c = u.x * v.y - u.y * v.x, g = document.createElementNS(ns, 'path');
        g.setAttribute('d', 'M0,0 L' + (u.x * R).toFixed(1) + ',' + (u.y * R).toFixed(1) + ' A' + R + ',' + R + ' 0 0 ' + (c > 0 ? 1 : 0) + ' ' + (v.x * R).toFixed(1) + ',' + (v.y * R).toFixed(1) + ' Z');
        g.setAttribute('fill', col); g.setAttribute('fill-opacity', '1'); g.setAttribute('stroke', '#fff'); g.setAttribute('stroke-width', '1.5'); return g; };
      const el = (tag, at) => { const n = document.createElementNS(ns, tag); Object.keys(at).forEach((k) => n.setAttribute(k, at[k])); return n; };
      const root = el('g', { class: 'supp-at' });
      // the base carried on past S (dashed, in the bases' blue), so the two angles can sit side by side on one line
      // ...as far as the card allows: never past its inner edge
      const ex = { x: -dS.x, y: -dS.y }, B = window.__extBounds ? window.__extBounds() : null;
      const L = Math.max(R + 6, Math.min(80, B ? (ex.x < 0 ? s.x - B.l - 12 : B.r - 12 - s.x) / Math.max(0.2, Math.abs(ex.x)) : 80));
      const line = el('line', { x1: s.x, y1: s.y, x2: s.x, y2: s.y, stroke: '#1e7bff', 'stroke-width': 4, 'stroke-dasharray': '10 8', 'stroke-linecap': 'round' });
      const own = wedge(dS, up, COL[S]); own.setAttribute('transform', 'translate(' + s.x + ' ' + s.y + ')');
      const copy = wedge(dT, unit(t, s), COL[T]); copy.setAttribute('transform', 'translate(' + t.x + ' ' + t.y + ')');
      // once the copy has turned onto the line, the two make a half-disc: a gold rim draws round it - a straight angle
      const a0 = { x: s.x + ex.x * R, y: s.y + ex.y * R }, a1 = { x: s.x + dS.x * R, y: s.y + dS.y * R }, side = ex.x * up.y - ex.y * up.x;
      const rim = el('path', { d: 'M' + a0.x.toFixed(1) + ',' + a0.y.toFixed(1) + ' A' + R + ',' + R + ' 0 0 ' + (side > 0 ? 1 : 0) + ' ' + a1.x.toFixed(1) + ',' + a1.y.toFixed(1),
        fill: 'none', stroke: '#ffc400', 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 100, opacity: 0 });
      // its "180°" label: plain text (white outline, no box) beyond the half-disc on the outside of the shape, between the line and the leg
      let bx = ex.x + up.x, by = ex.y + up.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      // (21 px on screen at any zoom, like every angle value: board units divided by the board's zoom)
      const z = (window.__boardS && window.__boardS()) || 1;
      let lx = s.x + bx * (R + 24 / z); const ly = s.y + by * (R + 24 / z), lbl = el('g', {});
      if (B) lx = Math.max(B.l + 34 / z, Math.min(B.r - 34 / z, lx)); // the label stays inside the card too
      const tx = el('text', { x: lx.toFixed(1), y: (ly + 7 / z).toFixed(1), 'text-anchor': 'middle', 'font-family': 'Nunito, sans-serif', 'font-weight': 900, 'font-size': (21 / z).toFixed(2), fill: '#123b63',
        stroke: '#fff', 'stroke-width': (4 / z).toFixed(2), 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
      tx.textContent = '180°'; lbl.appendChild(tx);
      [line, own, copy, rim, lbl].forEach((n) => root.appendChild(n));
      const dot = $('.vdot')[0];
      if (dot && dot.parentNode === e.parentNode) e.parentNode.insertBefore(root, dot); else e.parentNode.appendChild(root);
      const o = { x: t.x, y: t.y, r: 0 }, place = () => copy.setAttribute('transform', 'translate(' + o.x.toFixed(1) + ' ' + o.y.toFixed(1) + ') rotate(' + o.r.toFixed(1) + ')');
      add(() => G.timeline({ onComplete: () => root.remove() })
        .to(line, { attr: { x2: s.x + ex.x * L, y2: s.y + ex.y * L }, duration: reduced ? 0 : 0.5, ease: 'power2.out' }, 0)
        .fromTo(own, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.25)
        .fromTo(copy, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.55)
        // down the leg, then the half-turn onto the line beside its partner
        .to(o, { x: s.x, y: s.y, duration: reduced ? 0 : 0.9, ease: 'power2.inOut', onUpdate: place }, 0.8)
        .to(o, { r: 180, duration: reduced ? 0 : 0.7, ease: 'power2.inOut', onUpdate: place }, 1.75)
        .fromTo(rim, { opacity: 1, strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.5, ease: 'sine.out' }, 2.5)
        .fromTo(lbl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 2.85)
        .to(root, { opacity: 0, duration: 0.5, ease: 'sine.inOut' }, 6.4));
    },
    suppAtAD() { this.suppAt('A', 'D'); },
    suppAtBC() { this.suppAt('B', 'C'); },
    // screen 27: the question label drops into place, then glows once
    askIn() {
      const chips = $('.chip'), el = chips[chips.length - 1];
      if (!G || !el) return;
      add(() => G.timeline()
        .fromTo(el, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? 0 : 0.5, ease: 'back.out(1.7)' })
        .to(el, { boxShadow: TAG_GLOW, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, '>+0.05').set(el, { clearProps: 'boxShadow' }));
    },
    // a soft success glow round the latest label, after `delay` s (screen 27's right answer)
    chipGlow(delay) {
      const chips = $('.chip'), el = chips[chips.length - 1];
      if (!G || !el) return;
      add(() => G.timeline({ delay: delay || 0 })
        .to(el, { scale: 1.06, boxShadow: TAG_GLOW, duration: 0.3, ease: 'sine.out' })
        .to(el, { scale: 1, boxShadow: TAG_GLOW_OFF, duration: 0.5, ease: 'sine.inOut' }, '>+0.05').set(el, { clearProps: 'boxShadow' }));
    },

    // screen 28, as the line starts: the shape gives a small squash, as if about to change
    whatIfStart() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      if (!G || reduced) return;
      add(() => G.timeline()
        .to([g, d].filter(Boolean), { scaleY: 0.97, scaleX: 1.02, transformOrigin: '50% 80%', duration: 0.25, ease: 'sine.out' })
        .to([g, d].filter(Boolean), { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' }));
    },
    // screen 16: as Swiftee reaches the end of a side, its length slides out of the side's middle
    lenOut(lab, k) { if (G && lab) add(() => { const tl = G.timeline(); labelOut(tl, lab, sideMid(k), 0); return tl; }); },
    // marks are drawn like pen strokes rather than popping: each path's stroke runs on from its start
    drawOn(paths, delay, dur) {
      const list = paths.filter(Boolean);
      if (!G || !list.length) return;
      add(() => {
        const tl = G.timeline({ delay: delay || 0 });
        list.forEach((p) => {
          let L = 0; try { L = p.getTotalLength(); } catch (e) {}
          if (!L) { tl.set(p, { opacity: 1 }, 0); return; }
          tl.fromTo(p, { opacity: 1, strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : (dur || 0.5), ease: 'power2.inOut' }, 0)
            .set(p, { clearProps: 'strokeDasharray,strokeDashoffset' });
        });
        return tl;
      });
    },
    // stage px of an element's centre
    centreOf(el) {
      const st = document.querySelector('.stage'); if (!st || !el) return null;
      const s = st.getBoundingClientRect(), r = el.getBoundingClientRect(), k = s.width / 1280;
      return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
    },
    // ---------- the checks: show why ----------
    // check 1 found: the two parallel sides light up and their arrows draw on
    q1Correct() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q1-par'), { opacity: 0 }, { opacity: 0.9, duration: 0.3 }, 0.2)
        .to($('.q1-par'), { opacity: 0, duration: 0.6 }, 2.2));
      this.drawOn($('.q1-par'), 0.2, 0.5);
      this.drawOn($('.q1-chev'), 0.75, 0.4);
    },
    // the questions: each part lights up as Swiftee reads it out
    q1Cards() { if (G) add(() => G.fromTo($('.opt'), { y: 0 }, { y: -14, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, stagger: 0.14 })); },
    q1Look() { if (G) add(() => G.fromTo($('.opt svg'), { scale: 1 }, { scale: 1.12, transformOrigin: '50% 50%', duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.18 })); },
    // check 4, "type": the shape's outline thickens, so the eye goes to it as the question is asked
    q2Shape() {
      if (G) add(() => G.fromTo($('.qshape polygon'), { strokeWidth: 5 }, { strokeWidth: 8, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 })); // (the shape itself stays put: on the card it is zoomed about its top, css .plate .qshape)
    },
    q5Say(lab, line) {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($(lab), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.4, fill: '#d9640a', duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0)
        .fromTo($(line), { opacity: 0 }, { opacity: 0.85, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.2 }, 0));
    },
    q5AB() { this.q5Say('.q5-ab', '.q5-hab'); },
    q5CD() { this.q5Say('.q5-cd', '.q5-hcd'); },
    q5AD() { this.q5Say('.q5-ad', '.q5-hl.ad'); },
    q5BC() { this.q5Say('.q5-q', '.q5-hl.bc'); },
    // check 2: a wrong type - the legs and their equal marks flash, which is the clue. The marks of both legs are one
    // path, so they pulse in place (thicker, orange): scaling it would push each mark off its leg
    q2Wrong() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q2-leg'), { strokeWidth: 5 }, { strokeWidth: 7, stroke: '#ff7a00', duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0)
        .fromTo($('.q2-tick'), { strokeWidth: 3 }, { strokeWidth: 5.5, stroke: '#ff7a00', duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0));
    },
    // check 2 right: the legs glow and "AD = BC" stamps in
    q2Correct() {
      if (!G) return;
      const eq = $('.q2-eq')[0];
      add(() => G.timeline()
        .to($('.q2-leg'), { strokeWidth: 7, duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .fromTo(eq, { opacity: 0, scale: 1.9, rotation: -10, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: 0, duration: reduced ? 0 : 0.45, ease: 'back.out(2.6)' }, 0.4)
        );
    },
    // check 5: a wrong length - both legs light up with their equal marks, and AD's 5 cm pulses: "BC is a leg, like AD"
    q5Wrong() {
      if (!G) return;
      add(() => G.timeline()
        .to($('.q5-leg'), { opacity: 1, duration: 0.3 }, 0)
        .fromTo($('.q5-tick'), { strokeWidth: 3 }, { strokeWidth: 5.5, stroke: '#ff7a00', duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.2) // in place, as on check 2
        .fromTo($('.q5-ad'), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.35, fill: '#d9640a', duration: 0.3, yoyo: true, repeat: 3 }, 0.2));
    },
    // check 5 right: the 5 cm on AD flies across to BC
    q5Correct() {
      if (!G) return;
      const L = this.eqLayer(), ad = $('.q5-ad')[0], q = $('.q5-q')[0], bc = $('.q5-bc')[0];
      const a = this.centreOf(ad), b = this.centreOf(q);
      if (!L || !a || !b) return;
      const f = document.createElement('div'); f.className = 'fx-fly'; f.textContent = '5 cm';
      f.style.left = a.x + 'px'; f.style.top = a.y + 'px'; L.appendChild(f);
      add(() => G.timeline({ onComplete: () => f.remove() })
        .to($('.q5-leg'), { opacity: 1, duration: 0.3 }, 0)
        .fromTo(f, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.8, opacity: 0 }, { scale: 1.3, opacity: 1, duration: 0.25 }, 0.2)
        .to(f, { left: b.x, duration: reduced ? 0 : 0.8, ease: 'power1.inOut' }, 0.45)
        .to(f, { keyframes: [{ top: Math.min(a.y, b.y) - 70, ease: 'power2.out' }, { top: b.y, ease: 'power2.in' }], duration: reduced ? 0 : 0.8 }, 0.45)
        .to(q, { opacity: 0, duration: 0.15 }, 1.15)
        .to(f, { opacity: 0, duration: 0.12 }, 1.25)
        .fromTo(bc, { opacity: 0, scale: 1.9, rotation: -10, transformOrigin: '0% 50%' }, { opacity: 1, scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(2.6)' }, 1.25)
        );
    },
    // Swiftee dozing (an idle antic): three soft "z"s float up from her head, over and over, until zzz(false)
    zzz(on) {
      document.querySelectorAll('.eq-layer .zzz').forEach((e) => e.remove());
      if (!on || reduced) return;
      const L = this.eqLayer(), sw = $('.swiftee .swiftee-still')[0], st = document.querySelector('.stage');
      if (!L || !sw || !st) return;
      const r = sw.getBoundingClientRect(), s = st.getBoundingClientRect(), k = s.width / 1280;
      const z = document.createElement('div'); z.className = 'zzz';
      z.style.left = ((r.right - s.left) / k - 34) + 'px'; z.style.top = ((r.top - s.top) / k + 6) + 'px';
      z.innerHTML = '<i>z</i><i>z</i><i>Z</i>';
      L.appendChild(z);
    },
    // Swiftee's happy hop: a quick squash, a jump and a bouncy landing (discoveries, excitement, a correct answer).
    // Only her sprite canvas moves, so her spot on the screen never changes
    hop() {
      const c = $('.swiftee canvas')[0];
      if (!G || !c || reduced) return;
      add(() => G.timeline()
        .to(c, { scaleY: 0.86, scaleX: 1.08, y: 6, transformOrigin: '50% 95%', duration: 0.1, ease: 'sine.out' })
        .to(c, { scaleY: 1.06, scaleX: 0.96, y: -26, duration: 0.2, ease: 'power2.out' })
        .to(c, { scaleY: 1, scaleX: 1, y: 0, duration: 0.42, ease: 'bounce.out' })
        .set(c, { clearProps: 'transform' }));
    },
    vertexPulse() {
      const dots = $('.vdot');
      if (G && dots.length) add(() => G.fromTo(dots, { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.6, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.07 }));
    },
    // screen 28, on "change": the top corners A and B glide through each frame; onSeg fires as each glide starts
    morph(from, frames, onUpdate, onSeg, onDone) {
      if (!G) { const f = frames[frames.length - 1]; onUpdate({ A: f.A, B: f.B }); onDone(); return; }
      const o = { A: from.A, B: from.B };
      add(() => {
        const tl = G.timeline({ onComplete: onDone, delay: 0.35 });
        frames.forEach((f, i) => tl.call(onSeg).to(o, { A: f.A, B: f.B, duration: reduced ? 0.01 : 0.85, ease: i === frames.length - 1 ? 'back.out(1.6)' : 'back.inOut(1.3)', onUpdate: () => onUpdate(o) }, '>+0.12'));
        return tl;
      });
    },
    // screen 28, on "trapezium": the reshaped trapezium settles with a gentle bounce about its centre
    settleShape(cx, cy) {
      if (!G) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline();
        const S = Math.min(1.04, window.__popRoom ? window.__popRoom() : 1.04);
        if (g) tl.fromTo(g, { scale: 1 }, { scale: S, svgOrigin: cx + ' ' + cy, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: S, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        return tl;
      });
    },

    // screen 29, on "sum": A and D pulse with the left sum panel, then B and C with the right one
    sumPanels() {
      if (!G) return;
      const L = $('.tag.sumL')[0], R = $('.tag.sumR')[0];
      const pulse = (keys, panel, at, tl) => {
        const arcs = keys.map((k) => $('.arc.a' + k)[0]).filter(Boolean), labs = keys.map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
        tl.to(arcs, { strokeWidth: 7, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
          .fromTo(labs, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.15, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, at);
        if (panel) tl.fromTo(panel, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.08, duration: 0.3, ease: 'back.out(2)', yoyo: true, repeat: 1 }, at + 0.2);
      };
      add(() => { const tl = G.timeline(); pulse(['A', 'D'], L, 0, tl); pulse(['B', 'C'], R, 0.8, tl); return tl; });
    },

    // a right-angle square opens out of its corner, then its 90° label fades in where it stays (no slide)
    rightMark(k) {
      const m = $('.rm' + k)[0], lab = $('.tag.r90' + k)[0], c = corner(k);
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (m) tl.fromTo(m, Object.assign({ opacity: 0, scale: 0.2 }, c ? { svgOrigin: c.x + ' ' + c.y } : {}), { opacity: 1, scale: 1, duration: reduced ? 0 : 0.35, ease: 'power2.out' }, 0)
          .call(() => this.markPing(m), null, 0.35);
        if (lab) tl.fromTo(lab, { opacity: 0, xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.3, ease: 'power2.out' }, 0.3);
        return tl;
      });
    },
    // screen 35: both right-angle markers and their 90° labels take a soft gold glow and keep it
    rightGlow() {
      const ms = $('.rmark'), labs = $('.tag.r90');
      if (!G) return;
      add(() => G.timeline()
        .fromTo(labs, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.15, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.12 }, 0)
        .call(() => ms.forEach((m) => this.markPing(m)), null, 0));
    },

    // ---------- screen 40 (check 3: find ∠D) ----------
    // entrance: outline draws, fill fades in, corners and letters pop, the parallel arrows slide into place
    q3In() {
      if (!G) return;
      const line = $('.q3-line')[0];
      const L = (line && line.getTotalLength && line.getTotalLength()) || 1000;
      add(() => G.timeline()
        .fromTo(line, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.9, ease: 'power2.inOut' }, 0)
        .fromTo($('.q3-fill'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6)
        .fromTo($('.q3-dot').concat($('.q3-lab')), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.05 }, 0.7)
        .fromTo($('.q3-chev'), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }, 1.0));
    },
    // "120": ∠A's orange wedge opens from A, its value pops in and the wedge glows once
    q3A() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q3-wA'), { opacity: 1, scale: 0, transformOrigin: '0% 0%' }, { scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0)
        .fromTo($('.q3-vA'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.25)
        .to($('.q3-wA'), { duration: 0.3, yoyo: true, repeat: 1 }, 0.6));
    },
    // "value": a light runs down AD, D's yellow wedge opens, a big "?" pops and pulses, then A and D glow
    // together (60° stays hidden)
    q3D() {
      if (!G) return;
      const ad = $('.q3-ad')[0], L = 177;
      add(() => G.timeline()
        .fromTo(ad, { opacity: 0.9, strokeDasharray: '30 ' + L, strokeDashoffset: 0 }, { strokeDashoffset: -L, duration: reduced ? 0 : 0.7, ease: 'sine.inOut' }, 0)
        .to(ad, { opacity: 0, duration: 0.2 }, 0.7)
        .fromTo($('.q3-wD'), { opacity: 1, scale: 0, transformOrigin: '0% 100%' }, { scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0.6)
        .fromTo($('.q3-q'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.85)
        .to($('.q3-q'), { scale: 1.15, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 1.3)
        .to($('.q3-wA').concat($('.q3-wD')), { duration: 0.3, yoyo: true, repeat: 1 }, 1.4));
    },
    // AD glows once and the hint equation "120° + ? = 180°" appears above the shape (after a miss, or with the right answer)
    q3Hint() {
      if (!G) return;
      const ad = $('.q3-ad')[0];
      add(() => G.timeline()
        .fromTo(ad, { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.8, duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .fromTo($('.q3-hint'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }, 0.2)); // (rises in under the shape)
    },
    // a wrong answer: once the spoken hint has played, the hint equation comes in (q3Hint); later misses pulse it again
    q3Wrong() {
      if (!G) return;
      const h = $('.q3-hint')[0], shown = h && +getComputedStyle(h).opacity > 0.5;
      add(() => {
        const tl = G.timeline();
        if (!shown) tl.call(() => this.q3Hint(), null, 1.9);
        else tl.fromTo($('.q3h-a').concat($('.q3h-s')), { scale: 1 }, { scale: 1.25, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.2 }, 0.4);
        return tl;
      });
    },
    // idle: the "?" at D pulses (and the equation, if it is already showing)
    q3Idle() {
      if (!G) return;
      add(() => G.timeline()
        .to($('.q3-q'), { scale: 1.2, transformOrigin: '50% 50%', duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .to($('.q3-hint'), { boxShadow: TAG_GLOW, duration: 0.3, yoyo: true, repeat: 1 }, 0.1).set($('.q3-hint'), { clearProps: 'boxShadow' }));
    },
    // the right answer: 60° flies from its card to D and replaces the "?", A and D glow, the hint equation reads
    // "120° + 60° = 180°" and its two wedges close into a straight angle
    q3Correct() {
      if (!G) return;
      const st = document.querySelector('.stage'), sr = st.getBoundingClientRect(), k = sr.width / 1280;
      const card = Array.from(document.querySelectorAll('.stage .opt')).find((e) => e.textContent.trim() === '60°');
      const q = $('.q3-q')[0], fly = $('.q3-fly')[0], h = $('.q3-hint')[0];
      const at = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; };
      const a = card ? at(card) : { x: 700, y: 470 }, b = q ? at(q) : { x: 760, y: 350 };
      if (h && +getComputedStyle(h).opacity < 0.5) this.q3Hint(); // right first time: the equation appears as it resolves
      add(() => G.timeline()
        .set(fly, { left: a.x, top: a.y, opacity: 1, scale: 1 }, 0)
        .to(fly, { left: b.x, top: b.y, scale: 0.9, duration: reduced ? 0 : 0.7, ease: 'power2.inOut' }, 0)
        .to(q, { opacity: 0, scale: 0.4, duration: 0.2 }, 0.55)
        .to(fly, { opacity: 0, duration: 0.15 }, 0.7)
        .fromTo($('.q3-vD'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.7)
        .to($('.q3-wA').concat($('.q3-wD')), { duration: 0.35, yoyo: true, repeat: 1 }, 0.8)
        .call(() => {
          const ops = h.querySelectorAll('.q3h-op');
          h.querySelector('.q3h-a').textContent = '120°'; ops[0].textContent = '+'; ops[1].textContent = '=';
          const x = h.querySelector('.q3h-x'); x.textContent = '60°'; x.style.color = '#ffab00'; h.querySelector('.q3h-s').textContent = '180°'; // (∠D's and ∠A's own colours, bright on the navy tag)
          h.querySelector('.q3h-a').style.color = '#ff7a00'; h.querySelector('.q3h-s').style.color = '';
        }, null, 0.9)
        .fromTo(h, { scale: 0.92 }, { scale: 1.06, boxShadow: TAG_GLOW, duration: 0.3, ease: 'back.out(2)' }, 0.9)
        .to(h, { scale: 1, boxShadow: TAG_GLOW_OFF, duration: 0.4 }, 1.3).set(h, { clearProps: 'boxShadow' }));
    },

    // ---------- screen 41 (check 4: label the trapeziums) ----------
    // entrance: each shape draws its outline then fills, top to bottom; arrows slide in; the cards and drop boxes pop
    q4In() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        $('.q4s').forEach((s, i) => {
          const p = s.querySelector('.q4-poly'), L = (p.getTotalLength && p.getTotalLength()) || 400, at = 0.1 + i * 0.35;
          const fill = p.getAttribute('fill');
          tl.fromTo(p, { strokeDasharray: L, strokeDashoffset: L, fillOpacity: 0 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.6, ease: 'power2.inOut' }, at)
            .to(p, { fillOpacity: 1, duration: 0.35 }, at + 0.45)
            .set(p, { clearProps: 'strokeDasharray,strokeDashoffset,fillOpacity' }, at + 0.85)
            .fromTo(s.querySelector('.q4-chev'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }, at + 0.5);
          const mark = s.querySelector('.q4-tick, .q4-right');
          if (mark) tl.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at + 0.6);
        });
        tl.fromTo($('.q4-strip'), { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.1 }, 0)
          .fromTo($('.q4-card'), { opacity: 0, scale: 0.9, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)', stagger: 0.35 }, 0.05)
          .fromTo($('.q4-link'), { opacity: 0, x: -6 }, { opacity: 0.75, x: 0, duration: 0.3, stagger: 0.12 }, 1.2)
          .fromTo($('.slot'), { opacity: 0, scaleX: 0.7 }, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'back.out(1.6)', stagger: 0.12 }, 1.3)
          .set($('.slot'), { clearProps: 'transform,scale' });
        return tl;
      });
    },
    // shape i's clue (never its name): 0 scalene - each leg traced in turn; 1 isosceles - both legs glow together
    // and the ticks pop; 2 right - the right-angle squares draw and the vertical leg glows
    q4Clue(i, tl0, at0) {
      const s = $('.q4s' + i)[0];
      if (!G || !s) return;
      const legs = [s.querySelector('.q4-leg0'), s.querySelector('.q4-leg1')];
      const len = (e) => Math.hypot(e.getAttribute('x2') - e.getAttribute('x1'), e.getAttribute('y2') - e.getAttribute('y1')) || 1;
      const run = (tl, at) => {
        if (i === 0) legs.forEach((e, j) => tl.fromTo(e, { opacity: 0.9, strokeDasharray: len(e), strokeDashoffset: len(e) }, { strokeDashoffset: 0, duration: 0.4, ease: 'sine.inOut' }, at + j * 0.5).to(e, { opacity: 0, duration: 0.3 }, at + j * 0.5 + 0.6));
        if (i === 1) tl.fromTo(legs, { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.3 }, at)
          .fromTo(s.querySelector('.q4-tick'), { strokeWidth: 2.5 }, { strokeWidth: 4.5, stroke: '#ff7a00', duration: 0.2, yoyo: true, repeat: 1 }, at + 0.1); // in place, as on check 2
        if (i === 2) {
          const r = s.querySelector('.q4-right'), L = (r.getTotalLength && r.getTotalLength()) || 60;
          tl.fromTo(r, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, at)
            .set(r, { clearProps: 'strokeDasharray,strokeDashoffset' }, at + 0.5)
            .fromTo(legs[0], { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.3 }, at + 0.35);
        }
        return tl;
      };
      if (tl0) return run(tl0, at0);
      add(() => run(G.timeline(), 0));
    },
    // "drag": the shapes light up one after another, each showing its clue
    q4Shapes() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        $('.q4s').forEach((s, i) => {
          tl.fromTo(s, { filter: 'drop-shadow(0px 0px 0px rgba(255,255,255,0))' }, { filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.95))', duration: 0.3, yoyo: true, repeat: 1 }, i * 0.7);
          this.q4Clue(i, tl, i * 0.7 + 0.1);
        });
        return tl;
      });
    },
    // "place": the cards and drop boxes pulse in turn
    q4HiShapes() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q4-card'), { scale: 1 }, { scale: 1.08, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.15 }, 0)
        .fromTo($('.slot'), { boxShadow: '0 0 0 0 rgba(255,122,0,0)' }, { boxShadow: '0 0 0 7px rgba(255,122,0,0.35)', duration: 0.28, yoyo: true, repeat: 1, stagger: 0.15 }, 0.1)
        .set($('.slot'), { clearProps: 'boxShadow' }));
    },
    // "labels": the three labels rise in with a soft spring, one after another
    q4Labels() {
      const labs = $('.lab');
      if (G && labs.length) add(() => G.fromTo(labs, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)', stagger: 0.12, clearProps: 'transform' }));
    },
    // a right match: the box pulses, its row glows green, the shape glows and shows its clue again
    q4Ok(i) {
      const box = $('.slot')[i], s = $('.q4s' + i)[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (box) tl.fromTo(box, { scale: 1 }, { scale: 1.05, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        const strip = $('.q4-strip' + i)[0], card = $('.q4-card' + i)[0];
        if (strip) tl.fromTo(strip, { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.65)' }, { boxShadow: 'inset 0 0 0 2.5px rgba(46,158,79,0.6), 0 0 18px rgba(46,158,79,0.25)', duration: 0.35 }, 0.05);
        if (card) tl.fromTo(card, { y: 0 }, { y: -4, duration: 0.18, yoyo: true, repeat: 1 }, 0.05);
        if (s) tl.fromTo(s, { filter: 'drop-shadow(0px 0px 0px rgba(46,158,79,0))' }, { duration: 0.3, yoyo: true, repeat: 1 }, 0.05);
        this.q4Clue(i, tl, 0.15);
        return tl;
      });
    },
    // a wrong drop: that box pulses soft orange and the label wobbles on its way back to the row
    q4Bad(i, labId) {
      const box = $('.slot')[i], lab = $('.lab[data-qa="lab-' + labId + '"]')[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (box) tl.fromTo(box, { boxShadow: '0 0 0 0 rgba(240,160,32,0)' }, { boxShadow: '0 0 0 6px rgba(240,160,32,0.45)', borderColor: '#f0a020', duration: 0.2, yoyo: true, repeat: 1 }, 0)
          .set(box, { clearProps: 'boxShadow,borderColor' });
        if (lab) tl.to(lab, { x: -8, duration: 0.07 }, 0).to(lab, { x: 7, duration: 0.08 }).to(lab, { x: -4, duration: 0.07 }).to(lab, { x: 0, duration: 0.08 }).set(lab, { clearProps: 'transform' });
        return tl;
      });
    },
    // all three matched: the shapes light up in turn
    q4Done() {
      if (!G) return;
      add(() => G.fromTo($('.q4s'), { filter: 'drop-shadow(0px 0px 0px rgba(46,158,79,0))' }, { filter: 'drop-shadow(0px 0px 9px rgba(46,158,79,0.7))', duration: 0.3, yoyo: true, repeat: 1, stagger: 0.25 }));
    },

    // screen 4, as the first line starts: the whole shape grows to 120% about its centre, holds, and returns to
    // its exact size. Lines use non-scaling-stroke meanwhile so they keep their thickness.
    growFocus() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0], P = window.__trapP && window.__trapP();
      if (!G || !P) return;
      // it grows as much as the card allows (at most 20%), so no corner or letter ever touches the card's edge
      const room = window.__popRoom ? window.__popRoom() : 1.1;
      const cx = (P.A.x + P.B.x + P.C.x + P.D.x) / 4, cy = (P.A.y + P.B.y + P.C.y + P.D.y) / 4, S = Math.min(1.2, room), f = reduced ? 0 : 1;
      const lines = g ? Array.from(g.querySelectorAll('.edge, circle')) : [];
      add(() => {
        const tl = G.timeline();
        tl.call(() => lines.forEach((l) => l.setAttribute('vector-effect', 'non-scaling-stroke')), null, 0);
        if (g) tl.fromTo(g, { scale: 1 }, { scale: S, svgOrigin: cx + ' ' + cy, duration: 0.8 * f, ease: 'sine.inOut' }, 0)
          .to(g, { scale: 1, duration: 0.8 * f, ease: 'sine.inOut' }, 0.8 * f + 0.5);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: S, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.8 * f, ease: 'sine.inOut' }, 0)
          .to(d, { scale: 1, duration: 0.8 * f, ease: 'sine.inOut' }, 0.8 * f + 0.5);
        tl.call(() => { lines.forEach((l) => l.removeAttribute('vector-effect')); if (g) G.set(g, { clearProps: 'transform' }); if (d) G.set(d, { clearProps: 'transform' }); });
        return tl;
      });
    },

    // screen 18, on "legs": each leg and its length light up (`gap` s apart) and stay lit until `hold` s, then settle
    legsHold(list, gap, hold) {
      if (!G) return;
      const tags = $('.board .tag.mtag');
      add(() => {
        const tl = G.timeline(), els = [], labs = [];
        list.forEach(([k, len], i) => {
          const e = $('.e' + k)[0], lab = tags.find((x) => x.textContent.trim() === len && getComputedStyle(x).display !== 'none'), at = i * gap;
          if (e) { els.push(e); tl.to(e, { strokeWidth: 7, duration: 0.3, ease: 'sine.out' }, at); }
          if (lab) { labs.push(lab); tl.fromTo(lab, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { scale: 1.18, duration: 0.3, ease: 'sine.out' }, at); }
        });
        tl.to(els, { strokeWidth: 5, duration: 0.45, ease: 'sine.inOut' }, hold)
          .to(labs, { scale: 1, duration: 0.45, ease: 'sine.inOut' }, hold)
          .set(els, { clearProps: 'strokeWidth' })
          .set(labs, { clearProps: 'transform' });
        return tl;
      });
    },

    // screen 18, on "find": a very slight (2%) pulse of the shape
    boardPulse() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0], P = window.__trapP && window.__trapP();
      if (!G || !P) return;
      const cx = (P.A.x + P.B.x + P.C.x + P.D.x) / 4, cy = (P.A.y + P.B.y + P.C.y + P.D.y) / 4;
      add(() => {
        const tl = G.timeline();
        if (g) tl.fromTo(g, { scale: 1 }, { scale: 1.02, svgOrigin: cx + ' ' + cy, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: 1.02, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        tl.call(() => { if (g) G.set(g, { clearProps: 'transform' }); if (d) G.set(d, { clearProps: 'transform' }); });
        return tl;
      });
    },

    // every screen starts with the cue marks (data-in / data-gone / data-col) cleared: the elements are reused
    cueReset() { document.querySelectorAll('.stage [data-in], .stage [data-gone], .stage [data-col]').forEach((e) => { e.removeAttribute('data-in'); e.removeAttribute('data-gone'); e.removeAttribute('data-col'); }); },
    // screen 3 starts with every corner letter hidden again, waiting for its cue
    lettersReset() { $('.tag.vlab').forEach((e) => e.removeAttribute('data-landed')); },
    // a soft exit for labels leaving with the screen change (the side numbers on screen 3)
    fadeOut(sel) { const els = $(sel); if (G && els.length) add(() => G.to(els, { opacity: 0, duration: 0.35, ease: 'sine.out' })); },

    // screen 3: a corner letter flies in from its own corner as it is said, then glows once
    letterIn(k, onLand) {
      const el = $('.tag.vlab.c' + k)[0];
      if (el) el.setAttribute('data-landed', '1'); // stays shown through the hand-over to the next screen (CSS .vlab.vin)
      if (!G || !el) { if (onLand) onLand(); return; }
      // it comes out of its own point and moves out to its place (never in from far away)
      const P = window.__trapP && window.__trapP(), lx = parseFloat(el.style.left), ly = parseFloat(el.style.top);
      const d = P && P[k] && isFinite(lx) ? [P[k].x - lx, P[k].y - ly] : [0, 0];
      add(() => {
        centred(el);
        const tl = G.timeline();
        tl.fromTo(el, { opacity: 0, x: d[0], y: d[1] }, { opacity: 1, x: 0, y: 0, overwrite: 'auto', duration: reduced ? 0 : 0.45, ease: 'power2.out' })
          .call(() => onLand && onLand(), null, 0.48)
          .fromTo(el, { textShadow: '0px 0px 0px rgba(30,123,255,0)' }, { textShadow: '0px 0px 10px rgba(30,123,255,0.55)', duration: 0.4, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.45);
        return tl;
      });
    },

    // screen 12, on "trapezium" (and via shapePop): the shape and its labels zoom up once about (cx, cy) and ease back
    pop(cx, cy) {
      if (!G || reduced) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline();
        if (g) tl.fromTo(g, { scale: 1 }, { scale: 1.07, svgOrigin: cx + ' ' + cy, duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1, repeatDelay: 0.04 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: 1.07, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1, repeatDelay: 0.04 }, 0);
        return tl;
      });
    },

    // a wrong move (dragged the wrong way, or a tapped corner that is not 90°): that side gives one small wiggle
    wiggle(side) {
      const el = $('.e' + side)[0];
      if (!G || !el || reduced) return;
      add(() => G.timeline()
        .to(el, { rotation: 1.6, transformOrigin: '50% 50%', duration: 0.09, ease: 'sine.out' })
        .to(el, { rotation: -1.4, duration: 0.11, ease: 'sine.inOut' })
        .to(el, { rotation: 0.8, duration: 0.1, ease: 'sine.inOut' })
        .to(el, { rotation: 0, duration: 0.12, ease: 'sine.out' }));
    }
  };
  window.Motion = Motion;
})();
