/* =========================================================
   YOUR DESTINY — notification banner + floating dice + modal.
   Homepage only (needs .canvas .grid). Loaded with one <script defer>
   tag; it adds its own stylesheet and elements and changes nothing
   else on the page. See destiny-toast.css.

   Flow
   - The banner drops in at the top of the layout.
   - TRY IT opens a modal (a module-style white card) with
     ../your-destiny/ in an iframe, centred on the layout and never
     larger than it.
   - × on the banner, or closing the modal, slides the banner up and
     leaves the floating dice; a click on the dice brings it back.
   - The dismissed state lasts for the visit (sessionStorage).
   ?shot (clean og:image render) turns the whole layer off.
   ========================================================= */
(function () {
  'use strict';

  if (/[?&]shot\b/.test(location.search)) return;
  var canvas = document.querySelector('.canvas');
  if (!canvas || !canvas.querySelector('.grid')) return;           // homepage only
  if (!window.HTMLDialogElement) return;

  var script = document.currentScript;
  var DIR = script ? script.src.replace(/[^/]*$/, '') : 'assets/destiny-toast/';
  var V = '?v=3';
  var TARGET = new URL('../your-destiny/', location.href).href;
  var KEY = 'dz-toast';                                              // 'cube' once dismissed (this visit)
  var DESIGN_W = 1440, DESIGN_H = 837;
  var APP_W = 402, APP_H = 874;                                      // Your Destiny frame
  var mobile = window.matchMedia('(max-width: 759px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function store(v) {
    try { if (v === undefined) return sessionStorage.getItem(KEY); if (v === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, v); } catch (e) { return null; }
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function after(ms, fn) { return setTimeout(fn, reduce.matches ? Math.min(ms, 200) : ms); }

  /* ---------- elements ---------- */
  var toast = el(
    '<aside class="dz-toast" aria-label="Your Destiny prototype" hidden>' +
      '<div class="dz-toast__bg"></div>' +
      '<div class="dz-toast__text">' +
        '<p class="dz-toast__title">Wanna know your destiny?</p>' +
        '<p class="dz-toast__sub">Don\'t tempt fate. Discover the truth.</p>' +
      '</div>' +
      '<button type="button" class="dz-try" aria-haspopup="dialog">TRY IT</button>' +
      '<button type="button" class="dz-x" aria-label="Dismiss">×</button>' +
      '<div class="dz-dice" aria-hidden="true">' +
        '<span class="dz-pair">' +
          '<span class="dz-die dz-die--a"><img src="' + DIR + 'die-a.png' + V + '" alt="" width="38" height="41"></span>' +
          '<span class="dz-die dz-die--b"><img src="' + DIR + 'die-b.png' + V + '" alt="" width="31" height="31"></span>' +
        '</span>' +
        '<span class="dz-die dz-die--c"><img src="' + DIR + 'die-b.png' + V + '" alt="" width="21" height="22"></span>' +
      '</div>' +
    '</aside>');

  var cube = el(
    '<button type="button" class="dz-cube" aria-label="Wanna know your destiny? Show the notification" hidden>' +
      '<span class="dz-cube__in" aria-hidden="true">' +
        '<img class="dz-cube__a" src="' + DIR + 'die-a.png' + V + '" alt="" width="38" height="41">' +
        '<img class="dz-cube__b" src="' + DIR + 'die-b.png' + V + '" alt="" width="31" height="32">' +
      '</span>' +
      '<span class="dz-cube__tip" aria-hidden="true">Wanna know your destiny?</span>' +
    '</button>');

  var modal = el(
    '<dialog class="dz-modal" aria-labelledby="dz-modal-title">' +
      '<div class="dz-card">' +
        '<h2 class="dz-card__title" id="dz-modal-title">Your Destiny</h2>' +
        '<p class="dz-card__sub">Slot-machine prototype</p>' +
        '<button type="button" class="dz-card__close" aria-label="Close">' +
          '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>' +
        '</button>' +
        '<div class="dz-card__panel">' +
          '<span class="dz-card__spin" aria-hidden="true"></span>' +
          '<iframe title="Your Destiny — interactive prototype" src="about:blank"></iframe>' +
        '</div>' +
      '</div>' +
    '</dialog>');

  var tryBtn = toast.querySelector('.dz-try');
  var xBtn = toast.querySelector('.dz-x');
  var card = modal.querySelector('.dz-card');
  var closeBtn = modal.querySelector('.dz-card__close');
  var panel = modal.querySelector('.dz-card__panel');
  var frame = modal.querySelector('iframe');

  /* ---------- banner + floating dice ---------- */
  var timers = {};
  function clear(name) { clearTimeout(timers[name]); }

  function showToast(delay) {
    clear('toast'); clear('cube');
    store(null);
    if (!cube.hidden) {
      cube.dataset.state = 'out';
      timers.cube = after(200, function () { cube.hidden = true; });
    }
    timers.toast = after(delay || 0, function () {
      toast.hidden = false;
      toast.classList.add('is-entering');
      toast.dataset.state = 'in';
      timers.enter = after(1100, function () { toast.classList.remove('is-entering'); });
    });
  }

  function hideToast(focusCube) {
    clear('toast'); clear('enter');
    store('cube');
    if (toast.hidden) { showCube(focusCube, 0); return; }
    toast.classList.remove('is-entering');
    toast.dataset.state = 'out';
    timers.toast = after(560, function () { toast.hidden = true; });
    showCube(focusCube, 260);
  }

  function showCube(focus, delay) {
    clear('cube');
    timers.cube = after(delay, function () {
      cube.hidden = false;
      cube.dataset.state = 'in';
      if (focus) cube.focus({ preventScroll: true });
    });
  }

  xBtn.addEventListener('click', function () { hideToast(true); });
  cube.addEventListener('click', function () {
    var hadFocus = document.activeElement === cube;
    showToast(120);
    if (hadFocus) after(160, function () { tryBtn.focus({ preventScroll: true }); });
  });
  tryBtn.addEventListener('click', openModal);

  /* ---------- modal ---------- */
  // The modal is centred on the layout ("content area") and never larger than it:
  // desktop = the scaled 1440×837 canvas; phone layout = the window minus the 16 px gutters.
  function contentBox() {
    if (mobile.matches) {
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      return { left: 16, top: 16, width: vw - 32, height: vh - 32, s: 1, phone: true };
    }
    var r = canvas.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, s: r.width / DESIGN_W };
  }

  function layout() {
    var b = contentBox(), s = b.s, w, h;
    // Only the top has a margin (design px): 19 padding, 26.39 title, 5 + 14.52
    // subtitle, 13.48 gap. Below it the prototype runs edge to edge in its own
    // 402 × 874 shape, so the app fills the card without scrolling.
    var TOP = 78.39;
    if (b.phone) {
      h = b.height;
      var fit = Math.floor((h - TOP) * APP_W / APP_H);
      w = b.width < 568 ? b.width : Math.min(b.width, fit);   // phones: full width; tablets: phone-shaped
    } else {
      var gap = 28 * s;                                  // the layout's own bottom margin
      h = Math.min(b.height - gap * 2, DESIGN_H * s);
      w = Math.min(Math.floor((h - TOP * s) * APP_W / APP_H), b.width - 58 * s);
    }
    modal.style.setProperty('--dz-s', s.toFixed(4));
    modal.style.width = w + 'px';
    modal.style.height = h + 'px';
    modal.style.left = Math.round(b.left + (b.width - w) / 2) + 'px';
    modal.style.top = Math.round(b.top + (b.height - h) / 2) + 'px';
  }

  var closing = false;
  function openModal() {
    if (modal.open) return;
    layout();
    var t = tryBtn.getBoundingClientRect();                 // the card grows out of TRY IT
    modal.style.setProperty('--dz-ox', Math.round(t.left + t.width / 2 - parseFloat(modal.style.left)) + 'px');
    modal.style.setProperty('--dz-oy', Math.round(t.top + t.height / 2 - parseFloat(modal.style.top)) + 'px');
    if (frame.getAttribute('src') !== TARGET) {
      panel.classList.remove('is-loaded');
      frame.setAttribute('src', TARGET);
    }
    document.documentElement.classList.add('dz-lock');
    modal.classList.remove('is-closing');
    modal.classList.add('is-opening');
    modal.showModal();
    closeBtn.focus({ preventScroll: true });
    clear('open');
    timers.open = after(360, function () { modal.classList.remove('is-opening'); });
  }

  function closeModal() {
    if (!modal.open || closing) return;
    closing = true;
    modal.classList.remove('is-opening');
    modal.classList.add('is-closing');
    timers.close = after(220, function () { modal.close(); });
  }

  modal.addEventListener('close', function () {        // × button, Esc, backdrop click
    clear('close');
    closing = false;
    modal.classList.remove('is-closing', 'is-opening');
    document.documentElement.classList.remove('dz-lock');
    frame.setAttribute('src', 'about:blank');            // stops the prototype's sound
    panel.classList.remove('is-loaded');
    hideToast(true);
  });
  modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {          // click on the dimmed backdrop
    if (e.target !== modal) return;
    var r = card.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal();
  });
  frame.addEventListener('load', function () {
    if (frame.getAttribute('src') !== TARGET) return;
    panel.classList.add('is-loaded');
    try {                                                 // same origin: Esc inside the prototype closes the modal too
      frame.contentWindow.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    } catch (err) {}
  });

  function relayout() { if (modal.open) layout(); }
  window.addEventListener('resize', relayout);
  if (mobile.addEventListener) mobile.addEventListener('change', relayout);

  /* ---------- start ---------- */
  function start() {
    var header = canvas.querySelector('.header');
    canvas.insertBefore(toast, header ? header.nextSibling : canvas.firstChild);
    canvas.insertBefore(cube, toast.nextSibling);
    document.body.appendChild(modal);
    if (store() === 'cube') showCube(false, 300);
    else {
      var seen = false;
      try { seen = !!sessionStorage.getItem('dz-seen'); sessionStorage.setItem('dz-seen', '1'); } catch (e) {}
      showToast(seen ? 350 : 1100);                       // first visit: after the opening card sequence starts
    }
  }

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = DIR + 'destiny-toast.css' + V;
  var started = false;
  function go() { if (started) return; started = true; start(); }
  css.addEventListener('load', go);
  css.addEventListener('error', go);
  document.head.appendChild(css);
})();
