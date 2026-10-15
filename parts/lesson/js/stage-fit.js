// Scales the 1920x1080 stage (#dc-root) to fit the window, letterboxed and centred. window.fitStage() fits it now (js/swiftee.js
// calls it before measuring Swiftee's size on screen).
(function () {
  function fit() {
    var r = document.getElementById('dc-root');
    if (!r) return;
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    r.style.transform = 'scale(' + s + ')';
    r.style.left = ((innerWidth - 1920 * s) / 2) + 'px';
    r.style.top = ((innerHeight - 1080 * s) / 2) + 'px';
  }
  window.fitStage = fit;
  addEventListener('resize', fit);
  addEventListener('orientationchange', fit);
  // fit the moment the runtime adds #dc-root, so the stage never shows at full size first
  fit();
  if (window.MutationObserver && !document.getElementById('dc-root')) {
    var mo = new MutationObserver(function () { if (document.getElementById('dc-root')) { mo.disconnect(); fit(); } });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  // fit again every 50 ms for about 2 s, in case the page settles late
  var n = 0, t = setInterval(function () { fit(); if (++n > 40) clearInterval(t); }, 50);
})();
