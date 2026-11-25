/* =========================================================
   MOTION LAYER — boot (loads in <head> WITHOUT defer, so it runs
   before the first paint on every page).

   1. Theme: follows the system / browser setting (prefers-color-scheme).
      A Dark tokens choice that differs from it is remembered
      (localStorage "md-theme") and wins; one that matches it is forgotten.
      Sets <html data-theme="dark">.
   2. In dark mode, swaps each illustration SVG for its pre-coloured
      copy in assets/motion-demo/dark/ as the parser inserts it, so
      light artwork never flashes on a dark page. The same goes for the
      Native Mobile Apps mock-ups 1/4/5.webp (copies in NATIVE MOBILE
      APPS/dark/, the light backdrop redrawn on the dark section colour).
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var q = location.search;

  var off = /[?&]shot\b/.test(q);          // clean light render for the og:image screenshot

  // Morph fallback (browsers without cross-page View Transitions): coming back
  // from a case study, the other cards fade in around the returning one.
  try {
    var from = sessionStorage.getItem('md-arrive');
    if (from) { sessionStorage.removeItem('md-arrive'); if (/^[\w-]+$/.test(from)) root.dataset.mdFrom = from; }
  } catch (e) {}

  if (!off) {
    var saved = null;
    try { saved = localStorage.getItem('md-theme'); } catch (e) {}
    var sys = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    // a saved choice that now equals the system setting is no longer an override: forget it
    if (saved && (saved === 'dark') === sys) { try { localStorage.removeItem('md-theme'); } catch (e) {} saved = null; }
    var dark = saved ? saved === 'dark' : sys;
    if (dark) {
      root.dataset.theme = 'dark';
      var LIGHT = /(^|\/)assets\/new-layout\/([\w-]+\.svg)$/;
      // Native Mobile Apps gallery: mock-ups with the light #EFEFEF backdrop baked in
      // have copies on the dark section colour in NATIVE MOBILE APPS/dark/.
      var GALLERY = /^(.*NATIVE(?: |%20)MOBILE(?: |%20)APPS\/)([145]\.webp)$/;
      var swap = function (img) {
        var src = img.getAttribute('src');
        var m = src && LIGHT.exec(src), g = !m && src && GALLERY.exec(src);
        if (!m && !g) return;
        img.dataset.mdSrc = src;
        img.setAttribute('src', m ? 'assets/motion-demo/dark/' + m[2] : g[1] + 'dark/' + g[2]);
      };
      var mo = new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var nodes = list[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            if (n.nodeType !== 1) continue;
            if (n.tagName === 'IMG') swap(n);
            else if (n.querySelectorAll) [].forEach.call(n.querySelectorAll('img'), swap);
          }
        }
      });
      mo.observe(root, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', function () {
        [].forEach.call(document.querySelectorAll('img'), function (img) { if (!img.dataset.mdSrc) swap(img); });
        mo.disconnect();
      });
    }
  }
})();
