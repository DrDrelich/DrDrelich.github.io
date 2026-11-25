/* Shared helpers: unbiased RNG, bloom
   transitions (timings from the live site), info sheet, small utilities. */
(function () {
  var IMG = 'assets/img/';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- randomness ----------
     Uniform integer in [0, n) from the platform CSPRNG, with rejection
     sampling so no outcome is favoured by modulo bias. */
  function randInt(n) {
    var c = window.crypto || window.msCrypto;
    if (c && c.getRandomValues) {
      var buf = new Uint32Array(1);
      var limit = Math.floor(4294967296 / n) * n;
      do { c.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = randInt(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- bloom (live keyframes: 0 / 38% / 55% / 100%, 1200 ms) ---------- */
  function bloom() {
    var b = document.getElementById('bloom');
    if (!b) return;
    b.classList.remove('entry');
    b.style.display = 'block';
    if (b.animate && !reduceMotion) {
      b.animate([
        { opacity: 0, transform: 'translate(-50%,-50%) scale(0.12)', offset: 0 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1.0)', offset: 0.38 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1.3)', offset: 0.55 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(2.2)', offset: 1 }
      ], { duration: 1200, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'none' });
    }
    clearTimeout(bloom._t);
    bloom._t = setTimeout(function () { b.style.display = 'none'; }, 1240);
  }

  // Leave the page the way the live site does: whoosh + bloom, navigate at 430 ms.
  function leaveTo(url, opts) {
    opts = opts || {};
    if (opts.sound !== false && window.Sound) {
      if (opts.confirmSound) window.Sound.whooshConfirm();
      else { window.Sound.init(); window.Sound.whoosh(); }
    }
    bloom();
    setTimeout(function () { window.location.href = url; }, 430);
  }

  /* ---------- pressed buttons: darker + lifted, smoke puff, 1 s before the view changes ---------- */
  var PRESS_DELAY = reduceMotion ? 300 : 1000;

  // Soft vapour bursting out from under the button's bottom edge. Every blob
  // has faded out by ~900 ms, before the 1 s mark when the view changes.
  function puff(btn) {
    if (reduceMotion || !btn || !btn.animate || !btn.parentNode) return;
    var w = btn.offsetWidth, h = btn.offsetHeight;
    if (!w) return;
    var k = w / 362;                       // the design buttons are 362 px wide
    var wrap = document.createElement('span');
    wrap.className = 'puff';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'left:' + btn.offsetLeft + 'px;top:' + btn.offsetTop + 'px;width:' + w + 'px;height:' + h + 'px';
    btn.parentNode.insertBefore(wrap, btn);   // earlier sibling = painted under the button
    var N = 18;
    for (var i = 0; i < N; i++) {
      var t = (i + 0.2 + Math.random() * 0.6) / N;
      var side = t - 0.5;                                   // -0.5 (left) .. 0.5 (right)
      var size = (20 + Math.random() * 16) * k;
      // mostly sideways: the sticky action bar leaves only ~16 px below the button,
      // so the vapour billows out along the bottom edge and curls up at the ends
      var dx = side * (62 + Math.random() * 50) * k + (Math.random() - 0.5) * 12 * k;
      var dy = (4 + Math.random() * 6) * k - side * side * 4 * 28 * k;
      var b = document.createElement('i');
      b.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (t * w - size / 2) + 'px;top:' + (h - 14 * k - size / 2) + 'px';
      wrap.appendChild(b);
      // burst out fast, drift and thin out, gone by ~0.9 s
      b.animate([
        { transform: 'translate(0,0) scale(.35)', opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: 'translate(' + (dx * 0.45) + 'px,' + (dy * 0.45) + 'px) scale(1)', opacity: 1, offset: 0.18, easing: 'ease-out' },
        { transform: 'translate(' + (dx * 0.8) + 'px,' + (dy * 0.8) + 'px) scale(1.4)', opacity: 0.85, offset: 0.55, easing: 'ease-in' },
        { transform: 'translate(' + dx + 'px,' + (dy - 6 * k) + 'px) scale(1.75)', opacity: 0 }
      ], { duration: 760 + Math.random() * 120, delay: Math.random() * 40, easing: 'linear', fill: 'both' });
    }
    setTimeout(function () { wrap.remove(); }, PRESS_DELAY);
  }

  function release(btn) { if (btn) btn.classList.remove('is-clicked'); }

  // Visual press only (the action follows right away).
  function press(btn, holdMs) {
    if (!btn) return;
    btn.classList.add('is-clicked');
    puff(btn);
    setTimeout(function () { release(btn); }, holdMs || 700);
  }

  // Press, let the puff play for 1 s, then run fn (the view change). The
  // button stays pressed until the next view has taken over.
  function pressThen(btn, fn) {
    if (window.Sound) window.Sound.init();   // unlock audio inside the tap itself
    if (btn) { btn.classList.add('is-clicked'); puff(btn); }
    setTimeout(function () {
      fn();
      setTimeout(function () { release(btn); }, 1300);
    }, PRESS_DELAY);
  }

  /* ---------- screen-load micro-animations start 1 s after the screen is shown ---------- */
  var SCREEN_DELAY = 1000;
  function afterShown(root, fn) {
    var imgs = Array.prototype.slice.call((root || document).querySelectorAll('img'));
    var waits = imgs.map(function (im) {
      if (im.complete) return Promise.resolve();
      return new Promise(function (res) {
        im.addEventListener('load', res, { once: true });
        im.addEventListener('error', res, { once: true });
      });
    });
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    var cap = new Promise(function (res) { setTimeout(res, 5000); });   // never wait forever
    Promise.race([Promise.all(waits), cap]).then(function () { setTimeout(fn, SCREEN_DELAY); });
  }

  // iOS only applies :active styles when a touch listener exists
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ---------- keep newly revealed content above the sticky action bar ---------- */
  function revealAbove(el) {
    if (!el) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var scr = el.closest('.screen');
        var bar = scr && scr.querySelector('.actions');
        var limit = window.innerHeight - 12;
        if (bar && bar.offsetHeight) limit = Math.min(limit, bar.getBoundingClientRect().top - 12);
        var r = el.getBoundingClientRect();
        if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- info sheet (design's "i" button) ---------- */
  function initInfo(btn) {
    if (!btn) return;
    var sheet = null;
    function close() {
      if (!sheet) return;
      sheet.remove(); sheet = null;
      document.removeEventListener('keydown', onKey);
      btn.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    btn.addEventListener('click', function () {
      if (sheet) return;
      sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.innerHTML =
        '<div class="sheet-backdrop" data-close></div>' +
        '<div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
          '<h2 id="sheet-title">Choose your destiny</h2>' +
          '<ol>' +
            '<li>Pull the lever to spin the reels.</li>' +
            '<li>Accept your destiny.</li>' +
            '<li>Unlock the box.</li>' +
            '<li>Each envelope holds a different offer. Select one.</li>' +
            '<li>Confirm your e-mail address.</li>' +
          '</ol>' +
          '<button class="btn btn-secondary" type="button" data-close>Close</button>' +
        '</div>';
      sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
      document.body.appendChild(sheet);
      document.addEventListener('keydown', onKey);
      sheet.querySelector('button').focus();
    });
  }

  /* ---------- flow state shared between pages ---------- */
  var KEY = 'sy-mobile-state';
  function saveState(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function loadState() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function clearState() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  // Coming back through the back/forward cache: drop any half-finished bloom.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      var b = document.getElementById('bloom');
      if (b) { b.style.display = 'none'; b.getAnimations && b.getAnimations().forEach(function (a) { a.cancel(); }); }
      Array.prototype.forEach.call(document.querySelectorAll('.is-clicked'), release);
      Array.prototype.forEach.call(document.querySelectorAll('.puff'), function (p) { p.remove(); });
      document.dispatchEvent(new CustomEvent('sy:restored'));
    }
  });

  window.Common = {
    randInt: randInt, shuffled: shuffled, bloom: bloom, leaveTo: leaveTo,
    press: press, pressThen: pressThen, puff: puff, afterShown: afterShown,
    revealAbove: revealAbove, initInfo: initInfo, saveState: saveState, loadState: loadState,
    clearState: clearState, reduceMotion: reduceMotion, IMG: IMG
  };
})();
