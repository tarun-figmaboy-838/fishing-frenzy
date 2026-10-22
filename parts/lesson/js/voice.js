// =====================================================================
// VOICE - Swiftee's recorded voice-over (assets/vo/, mapped in js/vo-lines.js; see docs/VOICEOVER.md).
//   Voice.find(text)      the clip(s) for a line, by the exact text the bubble shows, or null
//   Voice.play(c, h)      play them in the one shared <audio>; h.start(), h.progress(0..1), h.end()
//   Voice.stop()          stop the current line (a new line, a screen change, a restart)
//   Voice.unlock()        call on the first tap (Play): tablets only allow audio after a gesture
//   Voice.prefetch()      after Play, fetch every clip quietly, one at a time
// Off (the game falls back to the browser voice) when the browser can't play Ogg Opus, with ?vo=0, or with no clips. A clip
// that can't play (missing, refused, too slow) ends without h.start(); the engine then says that line with the browser voice.
// ?vorate=2 plays the clips faster for testing (0.5-4).
// =====================================================================
window.Voice = (function () {
  // In the journey (shell/bridge.js) the clips play in the shell's <audio>, which the front page's Play tap has
  // unlocked; it belongs to the shell's page, so the clips' address is absolute
  const shared = window.Journey && window.Journey.embedded ? window.Journey.voiceElement() : null;
  const DIR = new URL('assets/vo/', location.href).href;
  const q = (k) => { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } };
  const LINES = typeof VO_LINES !== 'undefined' ? VO_LINES : {};
  let el = null, ok = false;
  try {
    el = shared || new Audio();
    ok = !!el.canPlayType('audio/ogg; codecs="opus"') && q('vo') !== '0' && Object.keys(LINES).length > 0;
  } catch (e) { ok = false; }
  const rate = Math.min(4, Math.max(0.5, +q('vorate') || 1));
  const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  // lines said in two clips: the corner, then the angle (screen 33)
  const JOINS = [/^(∠[A-D] is) (\d+° now\. Keep dragging until it shows 90°\.)$/];
  let cur = null; // the line playing: { tok, timer }
  let tokN = 0;

  function find(text) {
    if (!ok) return null;
    const t = norm(text);
    if (LINES[t]) return [{ id: LINES[t][0], dur: LINES[t][1] }];
    for (const re of JOINS) {
      const m = re.exec(t);
      if (m && m.slice(1).every((p) => LINES[p])) return m.slice(1).map((p) => ({ id: LINES[p][0], dur: LINES[p][1] }));
    }
    return null;
  }
  function stop() {
    if (cur) { clearInterval(cur.timer); cur = null; }
    tokN++;
    if (el) { try { el.pause(); } catch (e) {} el.onended = el.onerror = el.onplaying = null; }
  }
  // clips: from find(). h: { start, progress(f), end }. Progress is the share of the line said so far, on the audio's
  // own clock; the last 0.35 s of a clip is its tail, so the words finish just before the voice does.
  function play(clips, h) {
    stop();
    const tok = tokN, total = clips.reduce((t, c) => t + c.dur, 0), speak = Math.max(0.3, total - 0.35);
    let k = 0, before = 0, started = false, done = false;
    const live = () => tok === tokN;
    const finish = () => {
      if (!live() || done) return;
      done = true; if (cur) clearInterval(cur.timer); cur = null;
      // given up before it started (missing, refused, too slow): drop it, so a late clip can't start over what comes next
      if (!started) { el.onended = el.onerror = el.onplaying = null; try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {} }
      h.end();
    };
    const next = () => {
      if (!live()) return;
      if (k >= clips.length) { finish(); return; }
      const c = clips[k];
      el.onplaying = () => { if (!live()) return; if (!started) { started = true; h.start(); } };
      el.onended = () => { if (!live()) return; before += c.dur; k++; next(); };
      el.onerror = () => finish(); // missing file: the line carries on silently
      el.src = DIR + c.id + '.ogg';
      el.playbackRate = rate;
      el.muted = false;
      const p = el.play();
      if (p && p.catch) p.catch(() => finish()); // play() refused: the line types silently
    };
    cur = { timer: setInterval(() => {
      if (!live() || !started || done) return;
      h.progress(Math.min(1, Math.max(0, (before + (el.currentTime || 0) - 0.06) / speak)));
    }, 40) };
    // safety net: a clip that never starts (4 s) or stops moving (2 s) ends the line, so the lesson never waits on it
    let lastPos = -1, lastAt = Date.now();
    const watchdog = () => {
      if (!live() || done) return;
      const pos = before + (el.currentTime || 0);
      if (pos !== lastPos) { lastPos = pos; lastAt = Date.now(); }
      if (Date.now() - lastAt > (started ? 2000 : 4000)) { finish(); return; }
      setTimeout(watchdog, 300);
    };
    setTimeout(watchdog, 300);
    next();
  }
  // play silently once inside the first tap, so later lines may start without one
  function unlock() {
    if (!ok || unlock.done) return;
    // only inside a real activation (a touch counts when the finger lifts): a muted play outside one can succeed as
    // autoplay without unlocking anything
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    unlock.done = true;
    if (cur) return; // a line is already playing, so audio is allowed
    try {
      el.muted = true;
      el.src = DIR + LINES[Object.keys(LINES)[0]][0] + '.ogg';
      const p = el.play();
      const off = () => { try { if (!cur) el.pause(); } catch (e) {} el.muted = false; };
      // only a refusal means "try again on the next tap"; an abort (a line started meanwhile) means audio is allowed
      if (p && p.then) p.then(off, (e) => { if (e && e.name === 'NotAllowedError') unlock.done = false; el.muted = false; }); else off();
    } catch (e) { unlock.done = false; }
  }
  function prefetch() {
    if (!ok || prefetch.done || typeof fetch === 'undefined' || location.protocol === 'file:') return;
    prefetch.done = true;
    const ids = Object.keys(LINES).map((k) => LINES[k][0]);
    const one = (i) => { if (i < ids.length) fetch(DIR + ids[i] + '.ogg').then((r) => r.blob()).catch(() => {}).then(() => one(i + 1)); };
    one(0);
  }
  // rough spoken length of a word, for spreading the words over the clip: numbers count as their words
  // ("120" says "one hundred and twenty"), so a line with numbers doesn't run ahead of the voice
  const NUM = { 0: 4, 1: 3, 2: 3, 3: 5, 4: 4, 5: 4, 6: 3, 7: 5, 8: 5, 9: 4 };
  function weight(w) {
    return String(w).replace(/\d+(\.\d+)?/g, (m) => {
      const [a, b] = m.split('.'), n = +a;
      let s = n >= 100 ? 'one hundred and ' : '';
      const r = n % 100;
      s += r < 20 ? 'x'.repeat(NUM[r % 10] + (r >= 10 ? 4 : 0)) : 'x'.repeat(6 + (r % 10 ? NUM[r % 10] + 1 : 0));
      return s + (b ? ' point ' + b.split('').map((d) => 'x'.repeat(NUM[d])).join(' ') : '');
    }).length + 1;
  }
  // a screen's own clips, fetched as it opens (its later short lines, its feedback): the background prefetch goes in order
  // and may not have reached them yet, and a line whose clip is still loading shows nothing until its first word
  const warmed = {};
  function warm(texts) {
    if (!ok || typeof fetch === 'undefined' || location.protocol === 'file:') return;
    (texts || []).forEach((t) => (find(t) || []).forEach((c) => { if (!warmed[c.id]) { warmed[c.id] = 1; fetch(DIR + c.id + '.ogg').catch(() => { warmed[c.id] = 0; }); } }));
  }
  return { find: find, play: play, stop: stop, unlock: unlock, prefetch: prefetch, warm: warm, weight: weight, get on() { return ok; } };
})();
