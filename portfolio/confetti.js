/* =========================================================
   CTA confetti burst — vanilla JS, no dependencies.

   Any element matching SELECTOR gets a ~1s confetti burst on click.
   The default action (link navigation, form submit) is held back
   and replayed exactly when the animation ends.

   - Links opening in a new tab (target="_blank") wait a shorter
     NEW_TAB_DELAY, then open the tab themselves. Otherwise the new tab
     would cover the page before the burst is seen. Browsers only allow
     a delayed tab while the click still counts as recent (Safari: ~1s),
     so if that window has closed the link opens in the current tab
     instead of being blocked silently.
   - Cmd/Ctrl/Shift/Alt and middle clicks keep native behaviour.
   - prefers-reduced-motion: no burst, no delay.
   ========================================================= */
(function () {
  'use strict';

  var SELECTOR = '.cta, [data-confetti]';
  var DURATION = 1000;         // ms, animation length and navigation delay
  var NEW_TAB_DELAY = 800;     // ms, for target="_blank" links (popup-blocker safe)
  var COUNT = 13;            // particles per burst
  var COLORS = ['#007AFF', '#5AA9FF', '#A838E8', '#D846FF', '#00C2E0', '#00C853', '#1A1A1A'];

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var layer = null;
  var pending = false;         // one delayed navigation at a time

  function getLayer() {
    if (!layer || !layer.isConnected) {
      layer = document.createElement('div');
      layer.className = 'confetti-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function burst(el, duration) {
    if (reducedMotion.matches) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var host = getLayer();
    var frag = document.createDocumentFragment();

    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement('span');
      // Evenly spaced angles with jitter -> covers every direction without clumping.
      var angle = (i / COUNT) * Math.PI * 2 + rand(-0.18, 0.18);
      var cos = Math.cos(angle), sin = Math.sin(angle);
      // Start just inside the button's edge so particles appear to emerge from beneath it.
      var sx = cx + cos * r.width * 0.36;
      var sy = cy + sin * r.height * 0.36;
      // Travel further horizontally, matching the button's wide shape.
      var dist = rand(18, 38);
      var dot = Math.random() < 0.3;
      var size = rand(3, 5);

      p.className = dot ? 'confetti confetti--dot' : 'confetti';
      p.style.cssText =
        '--x:' + sx.toFixed(1) + 'px;' +
        '--y:' + sy.toFixed(1) + 'px;' +
        '--dx:' + (cos * dist * 1.35).toFixed(1) + 'px;' +
        '--dy:' + (sin * dist).toFixed(1) + 'px;' +
        '--fall:' + rand(4, 10).toFixed(1) + 'px;' +
        '--rot:' + rand(-540, 540).toFixed(0) + 'deg;' +
        '--w:' + size.toFixed(1) + 'px;' +
        '--h:' + (dot ? size : size * rand(1.6, 2.2)).toFixed(1) + 'px;' +
        '--c:' + COLORS[(Math.random() * COLORS.length) | 0] + ';' +
        '--delay:' + rand(0, 40).toFixed(0) + 'ms;' +
        '--dur:' + (duration - 40) + 'ms;';
      frag.appendChild(p);
    }

    var batch = Array.prototype.slice.call(frag.childNodes);
    host.appendChild(frag);
    setTimeout(function () {
      batch.forEach(function (n) { n.remove(); });
    }, duration + 60);
  }

  // Opens a target="_blank" link after the delay, keeping its target and rel
  // (noopener/noreferrer). The temporary link has no .cta class, so this
  // handler ignores its click.
  function openNewTab(el) {
    var ua = navigator.userActivation;
    if (ua && !ua.isActive) { window.location.assign(el.href); return; } // would be blocked
    var a = document.createElement('a');
    a.href = el.href;
    a.target = el.target;
    a.rel = el.rel || 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Replays what the click would have done.
  function runDefault(el, opensNewTab) {
    if (opensNewTab) { openNewTab(el); return; }
    if (el.tagName === 'A' && el.href) {
      window.location.assign(el.href);
      return;
    }
    var form = el.form || (el.closest && el.closest('form'));
    if (form && (el.type === 'submit' || el.tagName === 'BUTTON' && !el.type)) {
      if (form.requestSubmit) form.requestSubmit(el); else form.submit();
      return;
    }
    if (el.dataset.confettiAction === 'reload') window.location.reload();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest(SELECTOR);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.hasAttribute('download') || e.defaultPrevented) return;
    // Let the browser handle "open in new tab/window" gestures natively.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    if (reducedMotion.matches) return; // no burst, no delay

    var opensNewTab = el.tagName === 'A' && !!el.href && !!el.target && el.target !== '_self';
    var delay = opensNewTab ? NEW_TAB_DELAY : DURATION;

    e.preventDefault();
    if (pending) return; // ignore repeat clicks while waiting
    pending = true;
    burst(el, delay);
    setTimeout(function () {
      pending = false;
      runDefault(el, opensNewTab);
    }, delay);
  });

  // Coming back via the back button restores the page from bfcache; reset state.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      pending = false;
      if (layer) layer.textContent = '';
    }
  });
})();
