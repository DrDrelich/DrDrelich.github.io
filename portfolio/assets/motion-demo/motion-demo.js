/* =========================================================
   MOTION LAYER — added on top of the existing pages without
   changing their own scripts. See motion-demo.css.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = window.matchMedia('(max-width: 759px)');
  var EMAIL = 'prochow@gmail.com';
  var isHome = !!document.querySelector('.canvas .grid');
  var isNative = /native-mobile-apps\.html$/.test(location.pathname);

  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }

  if (params.has('shot')) return;                    // clean render for the og:image screenshot

  // Confetti stays on VIEW / BACK with its 1 s delay, exactly as each page set it up
  // (or confetti.js's default); the copy-email burst is added on top.
  window.CONFETTI_SELECTOR = (window.CONFETTI_SELECTOR || '.cta, [data-confetti]') + ', [data-md-confetti]';

  followSystem();
  setupCopyEmail();
  setupFallbackMorph();
  if (isHome) {
    setupThemeFlip();
    setupExplode();
    whenReady(function () {
      cascade(false);
      cleanHomeUrl();
      delete root.dataset.mdFrom;            // fallback morph: the returning cards have faded in
    });
  }
  if (isNative) whenReady(setupDevices);
  window.addEventListener('pageshow', function (e) {   // back/forward cache: undo a half-played fallback morph
    if (!e.persisted) return;
    document.querySelectorAll('.md-morph').forEach(function (o) { o.remove(); });
    document.querySelectorAll('.md-morph-away').forEach(function (m) { m.classList.remove('md-morph-away'); });
    var panel = document.querySelector('main.content');
    if (panel) panel.style.visibility = '';
  });

  /* -------------------------------------------------------
     5 · after BACK — BACK links point to index.html#<card> so the
     phone layout can scroll back to that card. Once that's done,
     show the plain address (…/portfolio/) instead.
     ------------------------------------------------------- */
  function cleanHomeUrl() {
    if (!location.hash && !/\/index\.html$/.test(location.pathname)) return;
    try { history.replaceState(history.state, '', location.pathname.replace(/index\.html$/, '') + location.search); } catch (e) {}
  }

  /* -------------------------------------------------------
     5 · MORPH FALLBACK — for browsers without cross-page View
     Transitions (Firefox, Safari before 18.2). It plays inside the
     1 s confetti delay: the card grows into the case-study panel
     (BACK: the panel shrinks into its card) and ends just as the
     page changes, so the new page opens where the motion stopped.
     Desktop layout only; reduced motion skips it.
     ------------------------------------------------------- */
  var CONFETTI_MS = 1000, MORPH_MS = 430;

  function frameBox() {                     // the scaled 1440-px design frame, on screen
    var f = document.querySelector('.canvas, .frame');
    if (!f) return null;
    var r = f.getBoundingClientRect();
    return { left: r.left, top: r.top, s: r.width / 1440 };
  }
  function storeCardRects() {               // homepage: each card's box in design px
    var b = frameBox();
    if (!b || mobile.matches) return;
    var out = {};
    document.querySelectorAll('.module').forEach(function (m) {
      var r = m.querySelector('.card').getBoundingClientRect();
      out[m.id] = [(r.left - b.left) / b.s, (r.top - b.top) / b.s, r.width / b.s, r.height / b.s];
    });
    store('md-cards', JSON.stringify(out));
  }
  function playMorph(from, to, r0, r1, color, onCovered) {
    var o = document.createElement('div');
    o.className = 'md-morph';
    o.setAttribute('aria-hidden', 'true');
    o.style.background = color;
    document.body.appendChild(o);
    var box = function (r, rad) { return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: rad + 'px' }; };
    var a = box(from, r0), z = box(to, r1);
    a.opacity = 0; var a2 = Object.assign({}, a, { opacity: 1, offset: .22 }); z.opacity = 1;
    var anim = o.animate([a, a2, z], { duration: MORPH_MS, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
    setTimeout(onCovered || function () {}, MORPH_MS * .22);
    return anim;
  }

  function setupFallbackMorph() {
    if (typeof CSSViewTransitionRule !== 'undefined') return;   // native morph available
    if (isHome) { whenReady(storeCardRects); window.addEventListener('resize', storeCardRects); }
    document.addEventListener('click', function (e) {
      if (reduce.matches || mobile.matches) return;              // confetti adds no delay then
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a.cta, a.back-btn');
      if (!a || (a.target && a.target !== '_self') || a.origin !== location.origin) return;
      var b = frameBox();
      if (!b) return;
      var start = CONFETTI_MS - MORPH_MS - 40;

      if (isHome) {
        var m = a.closest('.module');
        if (!m) return;
        var card = m.querySelector('.card');
        setTimeout(function () {
          var r = card.getBoundingClientRect();
          var top = b.top + 124 * b.s;                            // case-study panel: x 29, y 124, w 1382 (design px)
          playMorph(r, { left: b.left + 29 * b.s, top: top, width: 1382 * b.s, height: window.innerHeight - top + 24 },
                    22 * b.s, 14 * b.s, getComputedStyle(card).backgroundColor);
          document.querySelectorAll('.module').forEach(function (x) { if (x !== m) x.classList.add('md-morph-away'); });
        }, start);
      } else {
        var panel = document.querySelector('main.content');
        var id = (a.getAttribute('href') || '').split('#')[1] || '';
        var cards = {};
        try { cards = JSON.parse(store('md-cards') || '{}'); } catch (x) {}
        var c = cards[id];
        if (!panel || !c) return;
        setTimeout(function () {
          var pr = panel.getBoundingClientRect();
          var t = Math.max(pr.top, 0);
          var from = { left: pr.left, top: t, width: pr.width, height: Math.min(pr.bottom, window.innerHeight) - t };
          // the homepage opens at the top, its canvas 24 px down and centred like this frame
          var to = { left: b.left + c[0] * b.s, top: 24 + c[1] * b.s, width: c[2] * b.s, height: c[3] * b.s };
          store('md-arrive', id);
          playMorph(from, to, 14 * b.s, 22 * b.s, getComputedStyle(panel).backgroundColor,
                    function () { panel.style.visibility = 'hidden'; });
        }, start);
      }
    }, true);
  }

  /* -------------------------------------------------------
     Helpers
     ------------------------------------------------------- */
  function whenReady(fn) {
    var go = function () { requestAnimationFrame(function () { requestAnimationFrame(fn); }); };
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    if (document.readyState === 'complete') fonts.then(go);
    else window.addEventListener('load', function () { fonts.then(go); }, { once: true });
  }

  // Fires the site's own confetti.js burst from an element's position.
  function confettiAt(el) {
    var r = el.getBoundingClientRect();
    var h = document.createElement('span');
    h.setAttribute('data-md-confetti', '');
    h.setAttribute('aria-hidden', 'true');
    h.style.cssText = 'position:fixed;pointer-events:none;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    document.body.appendChild(h);
    h.click();
    setTimeout(function () { h.remove(); }, 1300);
  }

  var toastEl = null, toastTimer = 0;
  function toast(anchor, html, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'md-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    var r = anchor.getBoundingClientRect();
    toastEl.classList.remove('is-in');
    toastEl.style.left = '0px'; toastEl.style.top = '0px';
    var w = toastEl.offsetWidth, h = toastEl.offsetHeight;
    var W = window.innerWidth, gap = 12;
    // Keep the toast on the clicked link's own row so it never covers the next
    // link (LinkedIn): left of the link when there is room (desktop header),
    // else right after its visible label, else at the row's right end as long
    // as no other link sits there; only failing all that, below the link.
    var y = r.top + (r.height - h) / 2;
    var label = anchor.querySelector('.md-copied__label');
    var textRight = label ? label.getBoundingClientRect().right : r.right;
    var others = [].filter.call((anchor.parentElement || document).querySelectorAll('a'), function (o) { return o !== anchor; })
                   .map(function (o) { return o.getBoundingClientRect(); });
    var clear = function (x) { return others.every(function (o) { return o.right < x || o.left > x + w || o.bottom < y || o.top > y + h; }); };
    var x = null;
    if (r.left - gap - w >= gap) x = r.left - gap - w;
    else if (textRight + 10 + w <= W - gap) x = textRight + 10;
    else if (clear(W - gap - w)) x = W - gap - w;
    if (x === null) { x = Math.max(gap, Math.min(W - w - gap, r.right - w)); y = r.bottom + 10; }
    else if (!clear(x)) { y = r.bottom + 10; }
    toastEl.style.left = Math.round(x) + 'px';
    toastEl.style.top = Math.round(y) + 'px';
    requestAnimationFrame(function () { toastEl.classList.add('is-in'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-in'); }, ms || 3600);
  }

  /* -------------------------------------------------------
     1 · OPENING SEQUENCE — each card's own micro-animation,
     once, left to right. Once per visit.
     ------------------------------------------------------- */
  var ORDER = ['b2b-saas', 'forex-withdrawal', 'native-mobile-apps', 'ux-flow-maps', 'saas-dashboard-workflow', 'interaction-design', 'design-system'];
  function cascade(force) {
    if (reduce.matches || mobile.matches) return;
    if (!force) { if (store('md-cascade')) return; store('md-cascade', '1'); }
    ORDER.forEach(function (id, i) {
      var m = document.getElementById(id);
      if (!m || !m._play) return;
      setTimeout(function () {
        if (m.classList.contains('is-play')) return;
        m._play();
      }, 200 + i * 160);
    });
  }

  /* -------------------------------------------------------
     2 · COPY EMAIL — click copies; the label confirms;
     a toast offers the mail app as the fallback.
     ------------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }
  function setupCopyEmail() {
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      var label = [].filter.call(a.querySelectorAll('span'), function (s) { return s.textContent.trim() === EMAIL; })[0];
      a.setAttribute('aria-label', 'Copy email address: ' + EMAIL);
      a.title = 'Click to copy';
      var timer = 0;
      a.addEventListener('click', function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        copyText(EMAIL).then(function (ok) {
          if (!ok) { window.location.href = a.href; return; }
          // only where the address is shown as text (phone case studies use a round icon button)
          var showsText = label && getComputedStyle(label).display !== 'none';
          if (showsText) {
            if (!label.dataset.mdW) label.dataset.mdW = label.getBoundingClientRect().width / currentScale(a);
            label.style.display = 'inline-block';
            label.style.minWidth = label.dataset.mdW + 'px';
            label.innerHTML = '<span class="md-copied__label">Copied ✓</span>';
          }
          if (showsText) a.classList.add('md-copied');   // icon buttons keep their own pressed colours
          confettiAt(a);
          toast(a, '<span class="md-toast__tick">✓</span><span>Email copied</span><a href="mailto:' + EMAIL + '">Open mail app</a>');
          clearTimeout(timer);
          timer = setTimeout(function () {
            a.classList.remove('md-copied');
            if (label) { label.textContent = EMAIL; label.style.display = ''; label.style.minWidth = ''; }
          }, 2200);
        });
      });
    });
  }
  // Header lives inside the scaled canvas; convert screen px back to design px.
  function currentScale(el) {
    var c = el.closest('.canvas, .frame');
    if (!c) return 1;
    var s = c.getBoundingClientRect().width / c.offsetWidth;
    return s || 1;
  }

  /* -------------------------------------------------------
     4 · TOKEN FLIP — the Design System card re-themes the
     whole page, revealed in a circle from the click point.
     ------------------------------------------------------- */
  // The page starts in the visitor's saved choice, else the system setting —
  // boot.js decides that before the first paint. Illustration SVGs have
  // pre-coloured copies in assets/motion-demo/dark/; inline SVG colours are
  // mapped in CSS ([data-theme="dark"] ... [fill="…"]).
  var DARK_DIR = 'assets/motion-demo/dark/';
  var LIGHT_SVG = /(^|\/)assets\/new-layout\/([\w-]+\.svg)$/;
  // Native Mobile Apps mock-ups with a light backdrop baked in (see boot.js)
  var GALLERY_IMG = /^(.*NATIVE(?: |%20)MOBILE(?: |%20)APPS\/)([145]\.webp)$/;

  function savedTheme() { try { return localStorage.getItem('md-theme'); } catch (e) { return null; } }
  function saveTheme(t) { try { localStorage.setItem('md-theme', t); } catch (e) {} }
  function clearTheme() { try { localStorage.removeItem('md-theme'); } catch (e) {} }
  function systemIsDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function lightSrc(img) { return img.dataset.mdSrc || img.getAttribute('src'); }
  function darkSrc(src) {
    var m = src && LIGHT_SVG.exec(src);
    if (m) return DARK_DIR + m[2];
    m = src && GALLERY_IMG.exec(src);
    return m ? m[1] + 'dark/' + m[2] : null;
  }

  var preloaded = null;
  function prepareDark() {          // warm the cache so a flip has nothing left to fetch
    if (preloaded) return preloaded;
    var seen = {};
    preloaded = Promise.all([].map.call(document.querySelectorAll('img'), function (img) {
      var d = darkSrc(lightSrc(img));
      if (!d || seen[d]) return null;
      seen[d] = true;
      var pre = new Image();
      pre.src = d;
      return pre.decode ? pre.decode().catch(function () {}) : null;
    }));
    return preloaded;
  }

  function applyTheme(dark) {
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    var swapped = [];
    document.querySelectorAll('img').forEach(function (img) {
      var light = lightSrc(img), d = darkSrc(light);
      if (!d) return;
      img.dataset.mdSrc = light;
      var want = dark ? d : light;
      if (img.getAttribute('src') !== want) { img.setAttribute('src', want); swapped.push(img); }
    });
    var sw = document.querySelector('.md-switch');
    if (sw) sw.setAttribute('aria-checked', dark ? 'true' : 'false');
    return Promise.all(swapped.map(function (img) { return img.decode ? img.decode().catch(function () {}) : null; }));
  }

  // No saved choice yet → keep following the system if it changes while the page is open.
  function followSystem() {
    var sysDark = window.matchMedia('(prefers-color-scheme: dark)');   // local: this runs before the vars above are assigned
    var on = function (e) {
      var s = savedTheme();
      if (!s) applyTheme(e.matches);                       // following the system
      else if ((s === 'dark') === e.matches) clearTheme(); // system now agrees with the choice: follow it from here on
    };
    if (sysDark.addEventListener) sysDark.addEventListener('change', on); else sysDark.addListener(on);
  }

  function flipTheme(x, y) {
    var dark = root.dataset.theme !== 'dark';
    // Only a choice that differs from the system is remembered (and then wins over it);
    // switching back to the system's theme forgets it, so the page follows the system again.
    if (dark === systemIsDark()) clearTheme(); else saveTheme(dark ? 'dark' : 'light');
    var ds = document.getElementById('design-system');
    if (ds) ds.classList.remove('is-play');      // stop the card's own dark preview mid-way
    return prepareDark().then(function () {
      if (!document.startViewTransition || reduce.matches) return applyTheme(dark);
      root.classList.add('md-theme-vt');
      var t = document.startViewTransition(function () { return applyTheme(dark); });
      t.ready.then(function () {
        var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 950, easing: 'cubic-bezier(.22,.61,.36,1)', pseudoElement: '::view-transition-new(root)' }   // a touch slower than first tried (700 ms)
        );
      }).catch(function () {});
      return t.finished.catch(function () {}).then(function () { root.classList.remove('md-theme-vt'); });
    });
  }

  function setupThemeFlip() {
    var card = document.querySelector('#design-system .card');
    if (!card) return;
    var sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'md-switch';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', root.dataset.theme === 'dark' ? 'true' : 'false');
    sw.setAttribute('aria-label', 'Dark tokens: re-theme the portfolio');
    sw.innerHTML = '<span class="md-switch__track"><span class="md-switch__knob"></span></span><span class="md-switch__label">Dark tokens</span>';
    // takes the place of the footer tag ("TOKENS / COMPONENTS"), left of VIEW
    var tag = card.querySelector('.card__foot .tag');
    if (tag) tag.replaceWith(sw);
    else card.querySelector('.card__foot').prepend(sw);
    sw.addEventListener('click', function (e) {
      e.stopPropagation();
      var r = sw.querySelector('.md-switch__track').getBoundingClientRect();
      flipTheme(r.left + r.width / 2, r.top + r.height / 2);   // reveal grows from the toggle
    });
    card.querySelectorAll('.ds__row').forEach(function (row) {
      row.addEventListener('click', function (e) { flipTheme(e.clientX, e.clientY); });
    });
    // Warm the dark (or light) artwork while idle so the first flip is instant.
    setTimeout(function () {
      if (window.requestIdleCallback) window.requestIdleCallback(function () { prepareDark(); });
      else prepareDark();
    }, 1500);
  }

  /* -------------------------------------------------------
     7 · EXPLODED DASHBOARD — hover the B2B illustration.
     The hit area is the panel's resting rectangle, so the
     tilted layers can't make the pointer "leave" and flicker.
     ------------------------------------------------------- */
  var explodeLock = false;
  function setupExplode() {
    var module = document.getElementById('b2b-saas');
    var panel = module && module.querySelector('.b2b__panel');
    if (!panel) return;
    var card = module.querySelector('.card');
    var tags = document.createElement('div');
    tags.className = 'md-layer-tags';
    tags.setAttribute('aria-hidden', 'true');
    card.appendChild(tags);
    var LAYERS = [
      ['.b2b__kpi', 'KPI layer'],
      ['.b2b__chart', 'components'],
      ['.b2b__side', 'navigation', 'left'],   // the bar runs diagonally: label it from the free grid on its left
      [null, 'layout grid']
    ];
    var rest = null, timer = 0, tagTimer = 0, on = false;

    function measureRest() { if (!on) rest = panel.getBoundingClientRect(); }
    function set(v) {
      if (v === on) return;
      on = v;
      panel.classList.toggle('md-explode', v);
      card.classList.remove('md-tags-on');
      clearTimeout(tagTimer);
      if (v) tagTimer = setTimeout(placeTags, 1100);   // after the last layer (KPI, .3 s delay + .75 s) has landed
    }
    function placeTags() {
      var s = currentScale(card);
      var c = card.getBoundingClientRect();
      tags.innerHTML = '';
      var used = [];
      LAYERS.forEach(function (L, i) {
        var el = L[0] ? panel.querySelector(L[0]) : panel;
        if (!el) return;
        var r = el.getBoundingClientRect();
        var t = document.createElement('span');
        t.className = 'md-layer-tag';
        t.style.setProperty('--i', i);
        t.textContent = L[1];

        if (L[2] === 'left') {
          // A tilted element's bounding box is much wider than the element, so find
          // the bar's real left edge at its mid-height by hit-testing, and end the
          // label's line there.
          var cy = r.top + r.height / 2, edge = null;
          for (var x = r.left; x < r.right; x += 2) {
            if (document.elementFromPoint(x, cy) === el) { edge = x; break; }
          }
          if (edge === null) edge = r.left + r.width / 2;
          t.classList.add('md-layer-tag--left');
          t.style.top = ((cy - c.top) / s) + 'px';
          tags.appendChild(t);
          t.style.left = Math.max(2, (edge - c.left) / s - 4 - t.offsetWidth) + 'px';
          return;
        }

        // label at the layer's right-most corner, kept inside the card
        var y = (r.top + r.height * (L[0] ? .5 : .78) - c.top) / s;
        while (used.some(function (u) { return Math.abs(u - y) < 15; })) y += 15;
        used.push(y);
        t.style.top = y + 'px';
        t.style.left = Math.min((r.right - c.left) / s + 4, card.offsetWidth - 74) + 'px';
        tags.appendChild(t);
      });
      requestAnimationFrame(function () { card.classList.add('md-tags-on'); });
    }

    module.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || reduce.matches || explodeLock) return;
      if (!rest) measureRest();
      var inside = e.clientX >= rest.left && e.clientX <= rest.right && e.clientY >= rest.top - 8 && e.clientY <= rest.bottom;
      clearTimeout(timer);
      if (inside && !on) timer = setTimeout(function () { set(true); }, 120);
      else if (!inside && on) timer = setTimeout(function () { set(false); }, 80);
    });
    module.addEventListener('pointerleave', function () { if (explodeLock) return; clearTimeout(timer); set(false); });
    module.addEventListener('pointerenter', function () { if (!on) rest = null; });
    window.addEventListener('resize', function () { rest = null; });
    module._mdExplode = function (v) { explodeLock = v; rest = null; set(v); };
  }

  /* -------------------------------------------------------
     8 · 3D PHONES — drag a live screen to turn the device;
     it springs back to face you. Hover tilts it slightly.
     ------------------------------------------------------- */
  function setupDevices() {
    // Desktop with a real mouse only. On phones and touch screens the live screens
    // stay exactly as designed (some mobile browsers mis-draw the 3D layer stack).
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reduce.matches || mobile.matches || !fine.matches) return;
    var slots = [].slice.call(document.querySelectorAll('.live-slot'));
    if (!slots.length) return;

    slots.forEach(function (slot) {
      var screen = slot.firstElementChild;
      if (!screen) return;
      slot.classList.add('md-device');
      var SLABS = 16;
      var frag = document.createDocumentFragment();
      for (var i = 1; i <= SLABS; i++) {
        var sl = document.createElement('span');
        sl.className = 'md-slab';
        sl.style.setProperty('--z', (-i * 1.9).toFixed(1) + 'px');
        frag.appendChild(sl);
      }
      var back = document.createElement('span');
      back.className = 'md-back';
      back.innerHTML = '<span>Jacek Waz<br>Native iOS</span>';
      var glare = document.createElement('span');
      glare.className = 'md-glare';
      frag.appendChild(back);
      frag.appendChild(glare);
      slot.appendChild(frag);

      function size() {
        var k = slot.offsetWidth / 402;
        var rad = parseFloat(getComputedStyle(screen).borderTopLeftRadius) || 32;
        slot.style.setProperty('--md-r', (rad * k).toFixed(1) + 'px');
        slot.style.setProperty('--md-depth', (-(SLABS * 1.9 + .6)).toFixed(1) + 'px');
      }
      size();
      window.addEventListener('resize', size);

      var st = { rx: 0, ry: 0, vx: 0, vy: 0, tx: 0, ty: 0, drag: false, raf: 0 };
      var start = null;
      function render() {
        slot.style.transform = 'perspective(1500px) rotateX(' + st.rx.toFixed(2) + 'deg) rotateY(' + st.ry.toFixed(2) + 'deg)';
        var ny = ((st.ry % 360) + 540) % 360 - 180;   // -180..180
        var facing = Math.abs(ny) < 90;
        slot.style.setProperty('--gx', (50 - ny * 1.6) + '%');
        slot.style.setProperty('--gy', (35 + st.rx * 1.6) + '%');
        slot.style.setProperty('--go', facing ? Math.min(.85, (Math.abs(ny) + Math.abs(st.rx)) / 30).toFixed(2) : 0);
      }
      function frame() {
        var k = st.drag ? .3 : .075, d = st.drag ? .55 : .84;
        st.vx = (st.vx + (st.tx - st.rx) * k) * d;
        st.vy = (st.vy + (st.ty - st.ry) * k) * d;
        st.rx += st.vx; st.ry += st.vy;
        render();
        var moving = st.drag || Math.abs(st.vx) + Math.abs(st.vy) + Math.abs(st.tx - st.rx) + Math.abs(st.ty - st.ry) > .03;
        if (moving) st.raf = requestAnimationFrame(frame);
        else { st.raf = 0; if (st.tx === 0 && st.ty === 0 && Math.abs(st.ry) < .05) { st.ry = 0; slot.style.transform = ''; slot.classList.remove('is-3d'); } }
      }
      // the 3D layers (edge, back, glare) exist only while the phone moves or is hovered
      function kick() { slot.classList.add('is-3d'); if (!st.raf) st.raf = requestAnimationFrame(frame); }

      slot.addEventListener('pointermove', function (e) {
        var r;
        if (st.drag && start) {
          st.ty = start.ry + (e.clientX - start.x) * .55;
          st.tx = Math.max(-32, Math.min(32, start.rx - (e.clientY - start.y) * .3));
          kick();
        } else if (e.pointerType === 'mouse') {
          r = slot.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          st.tx = -py * 9; st.ty = Math.round(st.ry / 360) * 360 + px * 13;
          kick();
        }
      });
      slot.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        st.drag = true;
        start = { x: e.clientX, y: e.clientY, rx: st.rx, ry: st.ry };
        slot.classList.add('is-dragging');
        try { slot.setPointerCapture(e.pointerId); } catch (err) {}
        kick();
      });
      function release() {
        if (!st.drag) return;
        st.drag = false; start = null;
        slot.classList.remove('is-dragging');
        // settle on the nearest "facing you" turn, so a flick can spin it all the way round
        var base = Math.round((st.ry + st.vy * 6) / 360) * 360;
        st.ry -= base; st.ty = 0; st.tx = 0;
        kick();
      }
      slot.addEventListener('pointerup', release);
      slot.addEventListener('pointercancel', release);
      slot.addEventListener('pointerleave', function () { if (!st.drag) { st.tx = 0; st.ty = Math.round(st.ry / 360) * 360; kick(); } });
      slot.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  }
})();
