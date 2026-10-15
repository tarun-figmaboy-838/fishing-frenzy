// =====================================================================
// JOURNEY BRIDGE - loaded first by every part (parts/*/index.html), so the part can run inside the
// journey's shell (index.html at the root), which shows one front page and plays the parts in order.
//
//   Journey.embedded        true inside the shell
//   Journey.ready()         the part has loaded and can begin at once
//   Journey.progress(k)     how much of it has loaded (0 to 1), for the shell's loading bar
//   Journey.failed(msg)     it could not load
//   Journey.finish(detail)  the part is over (call it inside the tap that ends it, where there is one)
//   Journey.onBegin(fn)     the shell starts the part (the player has already tapped Play); fn(opts), where
//                           opts.arrive means it follows the part before it: Swiftee flies in
//   Journey.onDispose(fn)   the shell is about to remove the part: stop every sound and loop
//   Journey.onCommand(fn)   the shell's word while the part plays: fn(name, args)
//   Journey.card(rect)      fishing 2: the lesson's card is up at rect (CSS px of its frame), or gone (null)
//   Journey.devScreens(l)   with ?dev=1: the part's screens, for the journey's one jump panel
//
// Sound: the front page's Play tap unlocks one AudioContext, one <audio> and the speech voice in the
// shell's own document, and the parts play through those (audioContext, audioOut, voiceElement,
// speech), so no part needs a tap of its own before it can be heard. Opened from disk (file://) the
// shell's document can't be reached; the part then uses its own and the flow runs on messages.
// Opened on its own, a part goes to the front page, which then starts with it.
// =====================================================================
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var me = document.currentScript;
  var part = (me && me.getAttribute('data-part')) || params.get('part') || '';
  var inFrame = window.parent !== window;
  var host = null;
  try { if (inFrame && window.parent.FishingFrenzy) host = window.parent.FishingFrenzy; } catch (e) { host = null; }
  var embedded = inFrame && (!!host || params.has('embed'));

  if (!embedded) {
    var shell = new URL('../../index.html', location.href);
    shell.searchParams.set('start', part);
    ['dev', 'debug'].forEach(function (k) { if (params.has(k)) shell.searchParams.set(k, params.get(k) || '1'); });
    window.Journey = { embedded: false, leaving: true }; // the part's own start-up checks this and stays idle
    location.replace(shell.href);
    return;
  }

  var handlers = { begin: [], dispose: [], command: [] };
  var begun = false;
  var beginOpts = null;
  var disposed = false;
  function run(kind, opts) {
    var list = handlers[kind].splice(0);
    for (var i = 0; i < list.length; i++) {
      try { list[i](opts); } catch (err) { console.error(err); }
    }
  }
  function send(type, detail) {
    if (host && host.fromPart) { host.fromPart(part, type, detail, window); return; }
    window.parent.postMessage({ journey: true, part: part, type: type, detail: detail }, '*');
  }
  // opts.arrive: the part follows the one before it, with Swiftee flying in (the lesson, fishing 2)
  function begin(opts) { if (begun || disposed) return; begun = true; beginOpts = opts || {}; run('begin', beginOpts); }
  var devList = [];
  function command(o) {
    if (disposed) return;
    if (o && o.name === 'devJump') { var jump = devList[o.args]; if (jump) { try { jump.run(); } catch (err) { console.error(err); } } return; }
    for (var i = 0; i < handlers.command.length; i++) {
      try { handlers.command[i](o && o.name, o && o.args); } catch (err) { console.error(err); }
    }
  }
  function dispose() { if (disposed) return; disposed = true; handlers.begin = []; run('dispose'); }
  // the shell's messages, for when its document can't be reached (file://)
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.journey !== true || e.source !== window.parent) return;
    if (m.type === 'begin') begin(m.opts);
    else if (m.type === 'dispose') dispose();
    else if (m.type === 'command') command(m.opts);
  });
  // the context exists from the Play tap on; the <audio> element and the speech voice from the start (Play unlocks them)
  var audio = function () { return host && host.audio ? host.audio : null; };

  window.Journey = {
    embedded: true,
    part: part,
    params: params,
    get begun() { return begun; },
    ready: function () { send('ready'); },
    progress: function (k) { send('progress', k); },
    failed: function (msg) { send('failed', String(msg || '')); },
    finish: function (detail) { send('finish', detail || {}); },
    // ?dev=1: this part's screens, [{ label, run }], for the journey's one jump panel (where the shell's page can't be
    // reached - file:// - their labels go by message, and the panel's taps come back as devJump commands)
    devScreens: function (list) {
      devList = list || [];
      if (host && host.devScreens) { host.devScreens(part, devList, window); return; }
      send('devScreens', devList.map(function (s) { return s.label; }));
    },
    onBegin: function (fn) { if (begun) fn(beginOpts); else handlers.begin.push(fn); },
    onDispose: function (fn) { handlers.dispose.push(fn); },
    onCommand: function (fn) { handlers.command.push(fn); },
    card: function (rect) { send('card', rect); },
    // called by the shell
    _begin: begin,
    _dispose: dispose,
    _command: command,
    // the shell's unlocked sound (null if there is none: then the part uses its own)
    audioContext: function () { var a = audio(); return a ? a.context() : null; },
    audioOut: function () { var a = audio(); return a ? a.output(part) : null; },
    voiceElement: function () { var a = audio(); return a ? a.voiceElement() : null; },
    speech: function () { var a = audio(); return a ? a.speech() : null; }
  };
})();
