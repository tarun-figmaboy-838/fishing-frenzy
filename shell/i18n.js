// =====================================================================
// I18N - every word the player reads, by key. Loaded by the journey's page (index.html) and by every part
// (parts/*/index.html) before their own scripts, so the words are there from the first line of the game.
//
//   T('key')                  the line in the chosen language (missing there: English; missing everywhere: the key
//                             itself, left visible on purpose - add it to locales/locales.json)
//   T('key', { shape: 'x' })  the same, its {placeholders} filled
//   data-i18n="key"           in the markup: the element's text   } I18n.applyStatic() fills both, run straight
//   data-i18n-attr="aria-label:key; alt:key"   its attributes      } after the markup, before any game script
//
// The language: ?lan=hi on the journey's address (?lang=hi works too); the journey hands it on to every part. A
// language locales.json doesn't have yet plays in its defaultLanguage (English).
//
// The words: locales/locales.json is their one source (English only until other languages are asked for). Pages read
// its copy, locales/locales.js (window.LOCALES), as a plain script, so the words are there before any game script
// runs, served or opened from disk alike. After editing the JSON, regenerate the copy: python3 tools/build-locales.py
//
// The voice-over is English for now (a translated voice comes later), and every recording is found by its English
// line. So a translated line remembers its English: I18n.source(line) gives it, for the voice lookups, for the
// lesson's word cues (timed to the English recording) and for the fishing games' story cues (I18n.mapWord).
// I18n.voice(key) is where a line's own recording will go (assets/VO/<lang>/<key>.webm).
// In English nothing is remembered and every helper hands its input straight back.
// =====================================================================
var I18n = (function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : {};
  var META = { defaultLanguage: 1, languageLabels: 1, supportedLanguages: 1 }; // top-level keys that are not languages
  var HTML_LANG = { od: 'or' }; // the file's codes the browser knows by another name (Odia)
  var data = null, lang = 'en', en = {}, cur = {};
  var srcOf = Object.create(null), srcLow = Object.create(null), keyOf = Object.create(null), missing = Object.create(null);
  var own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var warn = function (m) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[i18n] ' + m); } catch (e) { /* no console */ } };

  // ---------- which language ----------
  function asked() {
    try {
      var p = new URLSearchParams(W.location.search);
      return String(p.get('lan') || p.get('lang') || '').trim().toLowerCase();
    } catch (e) { return ''; }
  }
  function isLang(c) { return !!(c && !META[c] && own(data, c) && data[c] && typeof data[c] === 'object'); }

  // a translated line and its English (the voice and the cues go by the English)
  function remember(shown, english) {
    if (typeof shown !== 'string' || typeof english !== 'string' || shown === english) return;
    if (!(shown in srcOf)) srcOf[shown] = english;
    var low = shown.toLowerCase(); // a name lowered for the middle of a sentence ("Catch the *triangle* fish!")
    if (!(low in srcLow)) srcLow[low] = english.toLowerCase();
  }

  // on first use: the words (window.LOCALES), the language, and each translated line's English
  function init() {
    if (data) return;
    var L = W.LOCALES;
    if (!L || typeof L !== 'object' || !L.en || typeof L.en !== 'object') {
      warn('locales/locales.js did not load: showing keys');
      L = { defaultLanguage: 'en', en: {} };
    }
    data = L;
    var want = asked(), def = isLang(data.defaultLanguage) ? data.defaultLanguage : 'en';
    lang = isLang(want) ? want : def;
    if (want && want !== lang) warn('no "' + want + '" in locales/locales.json yet: playing in "' + lang + '"');
    en = data.en;
    cur = data[lang] || en;
    Object.keys(cur).forEach(function (k) {
      var v = cur[k];
      if (typeof v !== 'string') return;
      if (!(v in keyOf)) keyOf[v] = k;
      if (cur !== en) remember(v, en[k]);
    });
    try { document.documentElement.lang = HTML_LANG[lang] || lang; } catch (e) { /* no page (the headless lesson test) */ }
  }

  // ---------- the lookup ----------
  function sub(s, vars) {
    Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  // a line with its {placeholders} filled; a translated one remembers its filled English, so its recording is found
  function fill(text, vars) {
    init();
    var s = String(text), v = vars || {}, out = sub(s, v);
    if (cur !== en) {
      var ev = {};
      Object.keys(v).forEach(function (k) { ev[k] = source(v[k]); });
      remember(out, sub(source(s), ev));
    }
    return out;
  }
  function t(key, vars) {
    init();
    var k = String(key);
    var v = own(cur, k) ? cur[k] : own(en, k) ? en[k] : null;
    if (typeof v !== 'string') {
      if (!missing[k]) { missing[k] = 1; warn('missing key "' + k + '" in locales/locales.json'); }
      return k;
    }
    return vars ? fill(v, vars) : v;
  }
  function has(key) { init(); return typeof (own(cur, key) ? cur[key] : en[key]) === 'string'; }
  // the English of a line on screen (itself when it is English already, or not one of ours)
  function source(text) {
    init();
    var s = String(text);
    if (s in srcOf) return srcOf[s];
    var low = s.toLowerCase();
    return low in srcLow ? srcLow[low] : s;
  }

  // ---------- helpers for the games ----------
  // Story cues (the fishing games): word i of a line's English `from` -> the word of its translation `to` that plays
  // its part. Words are split on spaces; a *stressed* word has an asterisk. The same line keeps i. Otherwise a stressed
  // word goes to the translation's stressed word of the same rank, the first and the last word stay first and last,
  // and any other keeps its share of the line - always a word of the line, so every cue still fires.
  function mapWord(i, from, to) {
    if (from === to) return i;
    var a = String(from).split(' '), b = String(to).split(' '), last = b.length - 1;
    var em = function (w) { return w.indexOf('*') >= 0; };
    if (a[i] != null && em(a[i])) {
      var rank = a.slice(0, i).filter(em).length, hits = [];
      b.forEach(function (w, k) { if (em(w)) hits.push(k); });
      if (hits.length) return hits[Math.min(rank, hits.length - 1)];
    }
    if (i <= 0) return 0;
    if (i >= a.length - 1) return last;
    return Math.max(0, Math.min(last, Math.round((i * last) / Math.max(1, a.length - 1))));
  }
  // A title that pops in piece by piece ("The End"): letter by letter in a script whose letters stand alone (Latin),
  // word by word in one whose letters join up (Devanagari, Telugu, Gujarati, Odia: a vowel sign or a conjunct cut off
  // from its letter would be drawn broken). Each space is a piece of its own, as before.
  function pieces(text) {
    var s = String(text);
    if (/^[\u0000-ɏ\s]*$/.test(s)) return s.split('');
    return s.split(/(\s)/).filter(Boolean);
  }

  // ---------- the page's own words ----------
  function applyStatic(root) {
    init();
    var r = root || (typeof document !== 'undefined' ? document : null);
    if (!r || !r.querySelectorAll) return;
    var each = function (sel, fn) { Array.prototype.forEach.call(r.querySelectorAll(sel), fn); };
    each('[data-i18n]', function (el) { var k = el.getAttribute('data-i18n'); if (k) el.textContent = t(k); });
    each('[data-i18n-attr]', function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var at = pair.indexOf(':');
        if (at < 0) return;
        var name = pair.slice(0, at).trim(), k = pair.slice(at + 1).trim();
        if (name && k) el.setAttribute(name, t(k));
      });
    });
  }

  return {
    t: t,
    has: has,
    fill: fill,
    source: source,
    keyOf: function (text) { init(); return keyOf[String(text)] || null; }, // a line on screen -> its key (for the voice-over to come)
    voice: function (key) { init(); return 'assets/VO/' + lang + '/' + key + '.webm'; },
    mapWord: mapWord,
    pieces: pieces,
    applyStatic: applyStatic,
    get lang() { init(); return lang; },
    languages: function () { init(); return (data && data.supportedLanguages) || {}; }
  };
})();
var T = I18n.t;
