/* =========================================================
   MOTION LAYER — boot (loads in <head> WITHOUT defer, so it runs
   before the first paint on every page).

   1. Theme: the visitor's own choice from the Dark tokens switch
      (localStorage "md-theme") wins; otherwise the system / browser
      setting (prefers-color-scheme). Sets <html data-theme="dark">.
   2. In dark mode, swaps each illustration SVG for its pre-coloured
      copy in assets/motion-demo/dark/ as the parser inserts it, so
      light artwork never flashes on a dark page.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var q = location.search;

  var off = /[?&]shot\b/.test(q);          // clean light render for the og:image screenshot

  if (!off) {
    var saved = null;
    try { saved = localStorage.getItem('md-theme'); } catch (e) {}
    var dark = saved ? saved === 'dark'
                     : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      root.dataset.theme = 'dark';
      var LIGHT = /(^|\/)assets\/new-layout\/([\w-]+\.svg)$/;
      var swap = function (img) {
        var src = img.getAttribute('src');
        var m = src && LIGHT.exec(src);
        if (!m) return;
        img.dataset.mdSrc = src;
        img.setAttribute('src', 'assets/motion-demo/dark/' + m[2]);
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
