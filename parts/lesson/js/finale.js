// =====================================================================
// FINALE - the old-cartoon closer on the end screen. After Swiftee's goodbye an iris closes in on her,
// the dark round the circle turns into a turning sunburst, the circle (with the two of them inside) slides to the left
// and "The End" bounces in beside it letter by letter, with twinkling sparkles. It is screen 44, the last one.
// A round button plays the game again from the front page; the screen list (top left) still jumps to any screen.
// Finale.play(engine) runs it; Finale.stop() (every screen change) clears it.
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // stage px: the iris centre and radius as it closes round the two of them (centre stage), and where it ends up
  const CLOSE = { x: 640, y: 445, r: 255 }, END = { x: 405, y: 385 };
  // inside the circle she grows a little: her move (stage px) and scale
  const SW_TO = { x: -235, y: -42 }, ZOOM = 1.4;
  const TITLE = 'The End';
  const SPARKS = [[1090, 200, 1], [1015, 530, 0.7], [740, 160, 0.6], [1215, 420, 0.8], [880, 245, 0.5]];

  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  const Finale = {
    run: 0,
    play(engine) {
      this.stop();
      const root = document.querySelector('.stage .finale-root');
      if (!root || !G) return;
      const run = ++this.run, eng = engine, tok = eng.stepTok;
      const live = () => run === this.run && tok === eng.stepTok && root.isConnected;
      const R = reduced(), D = (s) => (R ? 0 : s);
      this.root = root; this.ctx = G.context(() => {});
      eng.setState({ bubOff: true });

      root.innerHTML = '';
      const bg = el('div', 'fin-bg', root);
      const sun = el('div', 'fin-sun', bg), rays = el('div', 'fin-rays', sun), dark = el('div', 'fin-dark', bg);
      const ring = el('div', 'fin-ring', root);
      const title = el('div', 'fin-title', root);
      title.setAttribute('role', 'heading'); title.setAttribute('aria-label', TITLE);
      const letters = TITLE.split('').map((ch) => {
        const s = el('span', 'fin-ch' + (ch === ' ' ? ' sp' : ''), title);
        if (ch !== ' ') { el('b', 'o', s, ch); el('b', 'f', s, ch); }
        return s;
      }).filter((s) => !s.classList.contains('sp'));
      const sparks = SPARKS.map(([x, y, k]) => { const s = el('i', 'fin-spark', root); s.style.left = x + 'px'; s.style.top = y + 'px'; s.dataset.k = k; return s; });
      const again = el('button', 'fin-again', root, '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"></path><path d="M20 4v5h-5"></path></svg>');
      again.type = 'button'; again.setAttribute('aria-label', 'Play again');
      const againLab = el('div', 'fin-again-lab', root, 'Play again');
      again.addEventListener('click', () => { eng.sfx('tap'); setTimeout(() => location.reload(), 150); });
      document.documentElement.classList.add('finale-on'); // css/game.css hides the bubble and top buttons under it

      const sw = document.querySelector('.stage .swiftee');
      // "The End!" in Swiftee's voice as the title lands
      const sayEnd = () => {
        // the recorded voice-over (js/voice.js) when there is a clip; otherwise the device's voice
        const speak = () => {
          const s = eng.synth && eng.synth();
          if (!s || eng.state.muted || typeof SpeechSynthesisUtterance === 'undefined') return;
          try { eng.cancelSpeech(); const u = new SpeechSynthesisUtterance('The End!'); if (eng.voice) u.voice = eng.voice; u.lang = (eng.voice && eng.voice.lang) || 'en-GB'; u.pitch = 1.15; s.speak(u); } catch (e) {}
        };
        const clip = window.Voice && !eng.state.muted ? Voice.find('The End!') : null;
        if (!clip) { speak(); return; }
        // a clip that can't play (missing, refused, too slow) ends without starting: the device's voice says it instead
        let heard = false;
        eng.cancelSpeech(); Voice.play(clip, { start() { heard = true; }, progress() {}, end() { if (!heard && live()) speak(); } });
      };

      this.ctx.add(() => {
        G.set(root, { '--x': CLOSE.x + 'px', '--y': CLOSE.y + 'px', '--r': '1500px' });
        G.set([ring, again, againLab].concat(sparks), { opacity: 0 });
        G.set(sun, { opacity: 0 });
        G.set(letters, { opacity: 0 });
        const tl = G.timeline();
        // 1. the iris closes round them, with a little cartoon squeeze at the end
        tl.call(() => { eng.sfx('whoosh'); eng.pose('happy'); }, null, 0)
          .to(root, { '--r': (CLOSE.r - 18) + 'px', duration: D(1.4), ease: 'power3.inOut' }, 0.1)
          .call(() => eng.sfx('pop'), null, D(1.5))
          .to(root, { '--r': CLOSE.r + 'px', duration: D(0.35), ease: 'back.out(3)' }, D(1.5))
        // 2. the dark turns into a sunburst and the circle gets its frame
          .to(sun, { opacity: 1, duration: D(0.6), ease: 'sine.out' }, D(1.9))
          .to(dark, { opacity: 0, duration: D(0.6), ease: 'sine.out' }, D(1.9))
          .fromTo(ring, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: D(0.45), ease: 'back.out(2.4)' }, D(2.0))
        // 3. the circle slides left, taking her with it
          .to(root, { '--x': END.x + 'px', '--y': END.y + 'px', duration: D(1), ease: 'power2.inOut' }, D(2.6));
        if (sw) tl.to(sw, { x: SW_TO.x, y: SW_TO.y, scale: ZOOM, transformOrigin: '50% 88%', duration: D(1), ease: 'power2.inOut' }, D(2.6));
        // 4. "The End" drops in letter by letter, each landing with a bounce
        tl.call(() => eng.sfx('flourish'), null, D(3.6))
          .fromTo(letters, { opacity: 0, y: -150, scale: 0.3, rotation: (i) => (i % 2 ? 24 : -24) },
            { opacity: 1, y: 0, scale: 1, rotation: 0, duration: D(0.55), ease: 'back.out(2.8)', stagger: D(0.09) }, D(3.6))
          .call(() => { eng.sfx('good'); sayEnd(); if (window.Confetti) window.Confetti.burst(); eng.pose('celebrating'); }, null, D(4.4))
          .fromTo(again, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: D(0.45), ease: 'back.out(2.4)' }, D(4.9))
          .to(againLab, { opacity: 1, duration: D(0.3) }, D(5.2));
        // and then it keeps playing: the sunburst turns, the sparkles twinkle, the title wobbles
        if (!R) {
          G.to(rays, { rotation: 360, duration: 40, ease: 'none', repeat: -1 });
          sparks.forEach((s, i) => G.fromTo(s, { opacity: 0, scale: 0.2, rotation: 0 }, { opacity: 1, scale: +s.dataset.k, rotation: 90, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 4.5 + i * 0.37, repeatDelay: 0.6 }));
          G.to(title, { rotation: 2, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 5, transformOrigin: '50% 60%' });
          G.to(again, { scale: 1.08, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 5.5 });
        } else G.set(sparks, { opacity: 1 });
        return tl;
      });
      this.live = live;
    },
    stop() {
      this.run++;
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      if (this.root) { this.root.innerHTML = ''; this.root.removeAttribute('style'); }
      document.documentElement.classList.remove('finale-on');
      this.root = null;
    }
  };
  window.Finale = Finale;
})();
