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

  function flash(btn) {
    if (!btn) return;
    btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash');
  }

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
      document.dispatchEvent(new CustomEvent('sy:restored'));
    }
  });

  window.Common = {
    randInt: randInt, shuffled: shuffled, bloom: bloom, leaveTo: leaveTo, flash: flash,
    revealAbove: revealAbove, initInfo: initInfo, saveState: saveState, loadState: loadState,
    clearState: clearState, reduceMotion: reduceMotion, IMG: IMG
  };
})();
