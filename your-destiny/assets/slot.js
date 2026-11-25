/* Screen 1 (slot machine) + screen 2 (mysterious box).
   Sequence, timings and sounds follow the live site's component logic:
   pull -> lever + both reels spin (left 5 s, right 7 s; tick per row, thunk per
   stop) -> both stopped: losers dim, Accept appears -> Accept: whoosh,
   bloom, swap at 430 ms -> tap lock: crack + whoosh + bloom, open at 430 ms,
   tray rises, chime -> pick envelope (chime) -> Accept: whoosh, bloom,
   confirmation.html at 430 ms.
   Added on top: buttons that change the view press (darker, lifted, smoke
   puff) and wait 1 s first; 1 s after the slot screen loads the lever pulls
   itself once as a silent teaser (no result, no Accept); 1 s after the box
   screen appears the floating cards and dice spring into their places. */
(function () {
  var C = window.Common, S = window.Sound;

  var WL = ['FEAR', 'ABSURDITY', 'PRESTIGE', 'ISOLATION', 'SPEED'];
  var WR = ['AIR', 'WATER', 'EARTH', 'EMPTINESS', 'SPACE'];
  // Your Destiny: each drawn pair has its own three destinies, one per
  // envelope (assets/destinies.js, DESTINIES[left][right][envelope]).
  var DESTINIES = window.DESTINIES;
  function destinyFor(i) {
    var d = pair && DESTINIES[pair[0]] && DESTINIES[pair[0]][pair[1]];
    return d ? d[i] : '';
  }
  var ENV_CX = [101, 201, 301];   // envelope centres (Figma x), see .env in app.css
  var ROW = 28.45;          // Figma row height (5 rows fill the 142.3 window)
  var STRIP_ROWS = 20;      // two full colour/word periods (10 rows each)
  var LIVE_ROW = 48;        // live reel row height, for blur parity

  var app = document.getElementById('app');
  var slot = document.getElementById('s-slot');
  var box = document.getElementById('s-box');
  var u = 1;
  function measure() { u = app.getBoundingClientRect().width / 402; }
  measure();

  /* ================= reels ================= */
  function Reel(el, words, key) {
    this.el = el; this.words = words; this.key = key;
    this.strip = el.querySelector('.strip');
    this.p = 7;             // index of the row in the window centre (Figma idle: PRESTIGE / EARTH)
    this.rows = [];
    for (var k = 0; k < STRIP_ROWS; k++) {
      var r = document.createElement('div');
      r.className = 'row' + (k % 2 ? ' pk' : '');
      var s = document.createElement('span');
      s.textContent = words[k % 5];
      r.appendChild(s);
      this.strip.appendChild(r);
      this.rows.push(r);
    }
    this.render(0);
  }
  Reel.prototype.render = function (blurPx) {
    var q = (((this.p - 2) % 10) + 10) % 10;   // strip row at the top of the window
    this.strip.style.transform = 'translate3d(0,' + (-q * ROW * u).toFixed(2) + 'px,0)';
    this.strip.style.filter = blurPx > 0.4 && !C.reduceMotion ? 'blur(' + blurPx.toFixed(2) + 'px)' : 'none';
  };
  Reel.prototype.centerIndex = function () { return ((Math.round(this.p) % 5) + 5) % 5; };
  Reel.prototype.markWin = function (on) {
    var q = (((Math.round(this.p) - 2) % 10) + 10) % 10;
    this.rows.forEach(function (r) { r.classList.remove('win'); });
    if (on) this.rows[q + 2].classList.add('win');
    this.el.classList.toggle('dim', !!on);
  };
  // Live spin profile: constant speed for 62 % of the time, then linear
  // deceleration; the left reel runs one way, the right reel the other.
  // opts.cycles = full word cycles (live: 40 left / 56 right); opts.silent = no ticks.
  Reel.prototype.spin = function (target, dur, done, opts) {
    var self = this;
    opts = opts || {};
    var cur = this.centerIndex();
    var turns = opts.cycles || (this.key === 'L' ? 40 : 56);
    var D = this.key === 'L'
      ? -(5 * turns + ((((cur - target) % 5) + 5) % 5))
      : (5 * turns + ((((target - cur) % 5) + 5) % 5));
    var from = Math.round(this.p);
    var Tc = dur * 0.62, Tb = dur - Tc;
    var vC = D / (Tc + Tb / 2);
    var start = performance.now(), lastRow = 0, lastTickAt = 0;
    var gap = this.key === 'L' ? 26 : 30;
    function step(now) {
      var e = Math.min(Math.max(now - start, 0), dur), pos, vel;
      if (e <= Tc) { pos = vC * e; vel = vC; }
      else { var z = e - Tc; pos = vC * Tc + vC * z - 0.5 * (vC / Tb) * z * z; vel = vC * (1 - z / Tb); }
      self.p = from + pos;
      var bLive = Math.min(16, Math.abs(vel) * LIVE_ROW * 6.5);
      self.render(bLive * (ROW * u / LIVE_ROW));
      var rows = Math.floor(Math.abs(pos));
      if (rows > lastRow) { lastRow = rows; if (!opts.silent && now - lastTickAt >= gap) { lastTickAt = now; S.tick(self.key); } }
      if (e >= dur) {
        self.p = (((from + D) % 10) + 10) % 10 + 10;   // same row, small number
        self.render(0);
        done();
        return;
      }
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
  };
  Reel.prototype.stop = function () {
    cancelAnimationFrame(this.raf);
    this.p = Math.round(this.p);
    this.render(0);
  };
  Reel.prototype.setCenter = function (wordIdx) {
    this.p = 10 + wordIdx; this.render(0);
  };

  var reelL = new Reel(document.getElementById('reel-l'), WL, 'L');
  var reelR = new Reel(document.getElementById('reel-r'), WR, 'R');

  /* ================= screen 1 ================= */
  // Figma variant A on the slot machine, variant B on the box (02/03)
  var sloganSlot = new window.Slogan(document.getElementById('title-slot'), 'A');
  var sloganBox = new window.Slogan(document.getElementById('title-box'), 'B');
  C.initInfo(document.getElementById('info-btn'));

  var lever = document.getElementById('lever');
  var btnPull = document.getElementById('btn-pull');
  var btnAccept = document.getElementById('btn-accept');
  var copyIdle = document.getElementById('copy-idle');
  var copyResult = document.getElementById('copy-result');
  var wLeft = document.getElementById('w-left');
  var wX = document.getElementById('w-x');
  var wRight = document.getElementById('w-right');

  var busy = false, transitioning = false, pending = 0;
  var pressing = false;     // a button's 1 s press delay is running
  var teaser = null;        // the silent intro spin, while it runs
  var pair = null;          // [leftIdx, rightIdx] of the last completed draw
  var drawNo = 0;           // completed draws; the envelope pick is tied to one draw
  var pickDraw = -1;        // drawNo the envelope was picked for

  function setPullButton(mode) {
    // 'pull' | 'again'; disabled while the reels turn
    var again = mode === 'again';
    btnPull.textContent = again ? 'Spin Again' : 'Pull the Lever';
    btnPull.classList.toggle('btn-primary', !again);
    btnPull.classList.toggle('btn-secondary', again);
  }

  function emphasize(on) {
    reelL.markWin(on); reelR.markWin(on);
    if (on) {
      btnAccept.hidden = false;
      btnAccept.classList.remove('appear'); void btnAccept.offsetWidth; btnAccept.classList.add('appear');
      setPullButton('again');
    } else {
      btnAccept.hidden = true;
    }
  }

  function pop(el) {
    el.classList.remove('later', 'pop'); void el.offsetWidth; el.classList.add('pop');
  }

  function pullLever() {
    if (!lever.animate || C.reduceMotion) return null;
    return lever.animate([
      { transform: 'none', offset: 0, easing: 'cubic-bezier(.42,0,.3,1)' },
      { transform: 'rotate(12deg) scaleY(.42)', offset: 0.20 },
      { transform: 'rotate(12deg) scaleY(.42)', offset: 0.33, easing: 'cubic-bezier(.25,0,.25,1)' },
      { transform: 'rotate(-4deg) scaleY(1.05)', offset: 0.72 },
      { transform: 'rotate(1.5deg) scaleY(.98)', offset: 0.87 },
      { transform: 'none', offset: 1 }
    ], { duration: 1150, easing: 'linear' });
  }

  /* Intro teaser, 1 s after the slot screen has loaded: the lever pulls itself
     and the reels shuffle for ~2 s, then come back to the same idle words.
     Silent, no result line, no Accept button. A real pull cancels it. */
  function playTeaser() {
    if (busy || transitioning || pressing || pair || slot.hidden || C.reduceMotion) return;
    var left = 2;
    function end() { if (--left === 0) teaser = null; }
    teaser = { lever: pullLever() };
    reelL.spin(reelL.centerIndex(), 1700, end, { cycles: 8, silent: true });
    // even cycle counts: the strip's colour pattern repeats every 2 word cycles,
    // so both reels end on exactly the rows they started from
    reelR.spin(reelR.centerIndex(), 2300, end, { cycles: 12, silent: true });
  }
  function stopTeaser() {
    if (!teaser) return;
    if (teaser.lever) teaser.lever.cancel();
    reelL.stop(); reelR.stop();
    teaser = null;
  }

  function pull() {
    if (busy || transitioning || pressing) return;
    stopTeaser();
    busy = true;
    S.init();
    emphasize(false);
    btnPull.setAttribute('aria-disabled', 'true');

    // result line goes back to the heading until the first reel lands
    copyResult.classList.add('fade-out');
    copyIdle.classList.remove('fade-out');

    pullLever();

    // Two independent, uniformly random draws (25 equally likely pairs).
    var tL = C.randInt(5), tR = C.randInt(5);
    wLeft.textContent = WL[tL];
    wRight.textContent = WR[tR];
    wLeft.className = 'w later';
    wX.className = 'w later';
    wRight.className = 'w later';

    pending = 2;
    reelL.spin(tL, 5000, function () { S.thunk(); landed('L'); });
    reelR.spin(tR, 7000, function () { S.thunk(); landed('R'); });

    function landed(key) {
      if (key === 'L') {
        copyIdle.classList.add('fade-out');
        copyResult.classList.remove('fade-out');
        pop(wLeft);
      } else {
        pop(wX); pop(wRight);       // second item pops in after the first
      }
      if (--pending === 0) {
        busy = false;
        pair = [tL, tR];
        drawNo++;
        btnPull.removeAttribute('aria-disabled');
        emphasize(true);
        C.revealAbove(copyResult);
      }
    }
  }

  lever.addEventListener('click', pull);
  btnPull.addEventListener('click', function () {
    if (busy || transitioning || pressing) return;
    C.press(btnPull);        // no view change here, so the reels start right away
    pull();
  });
  btnAccept.addEventListener('click', function () {
    if (transitioning || busy || pressing) return;
    pressing = true;
    C.pressThen(btnAccept, function () { pressing = false; toBox(); });
  });

  /* ================= screen swaps ================= */
  function swap(from, to, withEntry) {
    window.scrollTo(0, 0);
    if (withEntry && !C.reduceMotion) {
      from.classList.add('leaving');
      to.hidden = false;
      to.classList.remove('entering'); void to.offsetWidth; to.classList.add('entering');
      setTimeout(function () {
        from.hidden = true; from.classList.remove('leaving'); to.classList.remove('entering');
      }, 780);
    } else {
      from.hidden = true; to.hidden = false;
    }
  }

  function toBox(opts) {
    opts = opts || {};
    if (transitioning) return;
    transitioning = true;
    if (!opts.silent) { S.init(); S.whoosh(); C.bloom(); }
    resetBox();
    var go = function () {
      swap(slot, box, !opts.silent);
      fitDice();
      if (!opts.noHistory && location.hash !== '#box') history.pushState({ s: 'box' }, '', '#box');
      C.afterShown(box, boxIntro);
    };
    if (opts.silent) { go(); transitioning = false; return; }
    setTimeout(go, 430);                                  // behind the bloom's brightest moment
    setTimeout(function () { transitioning = false; }, 1240);
  }

  function toSlot() {
    if (box.hidden) return;
    transitioning = false;
    swap(box, slot, false);
    slot.classList.remove('entering'); void slot.offsetWidth; slot.classList.add('entering');
    setTimeout(function () { slot.classList.remove('entering'); }, 780);
  }

  /* ================= screen 2: the box ================= */
  var chest = document.getElementById('chest');
  var btnUnlock = document.getElementById('btn-unlock');
  var btnAccept2 = document.getElementById('btn-accept2');
  var envs = document.getElementById('envs');
  var envBtns = Array.prototype.slice.call(envs.querySelectorAll('.env'));
  var envBar = document.getElementById('env-bar');
  var envInfo = document.getElementById('env-info');
  var envOffer = document.getElementById('env-offer');
  var boxTop = document.getElementById('box-top');
  var phase = 'closed', envReady = false, selected = null;

  /* Your Destiny: the dice behind "Unlock the box" need about 62u of free
     space above the button. Where the screen is too short (the sticky button
     then rides over the text) they would cover the copy, so they are left out.
     Layout values only (offset*), so the screen-entry scale doesn't skew it. */
  var dice = box.querySelector('.dice-unlock');
  var copyClosed = box.querySelector('.copy-closed');
  var boxGap = box.querySelector('.flow-gap');
  var boxBar = box.querySelector('.actions');
  function fitDice() {
    if (!dice || box.hidden) return;
    var textBottom = copyClosed.offsetTop + copyClosed.offsetHeight;
    var barTop = Math.min(boxGap.offsetTop + boxGap.offsetHeight,
      window.innerHeight - (parseFloat(getComputedStyle(boxBar).bottom) || 0) - boxBar.offsetHeight);
    box.classList.toggle('no-dice', barTop - 62 * u < textBottom + 4 * u);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDice);

  function resetBox() {
    phase = 'closed'; envReady = false;
    if (pickDraw !== drawNo) selected = null;   // only a new draw frees the pick
    box.classList.remove('open', 'ready', 'unlocking', 'live');
    introRun++;
    // start pose for the load animation (cards and dice spring into place from here)
    if (!C.reduceMotion && canCompose) box.classList.add('intro-pre');
    boxTop.style.setProperty('--zh', 706);
    btnUnlock.hidden = false;
    renderSelection();
  }

  /* Screen 2 load animation. The floating cards and the two dice start a
     little off their Figma spots (.intro-pre in app.css: a fifth of the way
     towards where they go when the box opens) and, 1 s after the screen
     appears, spring one way into the target layout, with the same easing as
     the box-opening transition. Nothing on the pool table moves. On the open
     box (coming back from the confirmation page) the envelopes hop in a wave
     instead. Uses the individual translate/rotate/scale properties, so the
     Figma placement in each element's transform stays untouched. Then the
     lock hint pulses. */
  var introRun = 0;
  var SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';
  var DRIFT = 'cubic-bezier(.34, 1.32, .38, 1)';        // = the box-opening transition (.box-d)
  var canCompose = window.CSS && CSS.supports && CSS.supports('translate', '1px 1px');
  function boxIntro() {
    if (box.hidden) return;
    var run = introRun;
    function live() { if (run === introRun) box.classList.add('live'); }
    if (C.reduceMotion || !canCompose || !box.animate) { live(); return; }
    var k = u;
    if (box.classList.contains('open')) {
      envBtns.forEach(function (b, i) {
        b.querySelector('img').animate([
          { translate: '0 0', rotate: '0deg' },
          { translate: '0 ' + (-9 * k) + 'px', rotate: (i % 2 ? 4 : -4) + 'deg', offset: 0.38 },
          { translate: '0 0', rotate: '0deg' }
        ], { duration: 640, delay: 120 + i * 110, easing: SPRING });
      });
      setTimeout(live, 900);
      return;
    }
    // start from the .intro-pre pose (read back from CSS), end on the Figma spots
    [['.d-cards', 0], ['.d-die1', 80], ['.d-die2', 150]].forEach(function (d) {
      var el = box.querySelector(d[0]);
      if (!el) return;
      var cs = getComputedStyle(el);
      el.animate([
        { translate: cs.translate, rotate: cs.rotate, scale: cs.scale },
        { translate: '0px 0px', rotate: '0deg', scale: '1' }
      ], { duration: 950, delay: d[1], easing: DRIFT, fill: 'backwards' });
    });
    box.classList.remove('intro-pre');       // the animations hold the start pose meanwhile
    setTimeout(live, 1100);
  }

  function unlock() {
    if (phase !== 'closed' || transitioning || pressing) return;
    transitioning = true;
    box.classList.remove('intro-pre');       // opened before the load animation ran
    box.classList.add('unlocking');
    S.init(); S.crack(); S.whoosh();
    C.bloom();
    setTimeout(function () {
      phase = 'open'; envReady = true;
      box.classList.add('open', 'ready');
      boxTop.style.setProperty('--zh', 762);
      btnUnlock.hidden = true;
      renderSelection();
      S.chime();
    }, 430);
    setTimeout(function () { transitioning = false; }, 1240);
  }

  /* Your Destiny: one pick per draw. Once an envelope is picked the other
     two are disabled (no taps, out of the tab order) and the pick cannot be
     cleared; a new draw frees it again. */
  function renderSelection() {
    var has = selected !== null;
    envs.classList.toggle('has-sel', has);
    envBtns.forEach(function (b, i) {
      var sel = i === selected;
      b.classList.toggle('sel', sel);
      b.setAttribute('aria-checked', sel ? 'true' : 'false');
      b.disabled = has && !sel;
    });
    if (has) {
      envBar.style.setProperty('--bx', ENV_CX[selected]);
      envOffer.textContent = destinyFor(selected);
      btnAccept2.textContent = 'Envelope ' + (selected + 1) + ' - Accept Your Destiny';
    }
    if (has && phase === 'open') {
      if (btnAccept2.hidden) {
        btnAccept2.hidden = false;
        btnAccept2.classList.remove('appear'); void btnAccept2.offsetWidth; btnAccept2.classList.add('appear');
      }
    } else {
      btnAccept2.hidden = true;
    }
    envInfo.classList.toggle('on', has);
  }

  function selectEnv(i) {
    if (!envReady || transitioning || selected !== null) return;   // the pick is final
    S.init();
    S.chime();
    selected = i;
    pickDraw = drawNo;
    renderSelection();
    C.revealAbove(envInfo);
  }

  envBtns.forEach(function (b, i) {
    b.addEventListener('click', function (e) { e.stopPropagation(); selectEnv(i); });
  });
  // (The live site clears the pick on a tap outside the envelopes; here the
  // pick is final, so that handler is gone.)

  chest.addEventListener('click', unlock);
  btnUnlock.addEventListener('click', function () {
    if (phase !== 'closed' || transitioning || pressing) return;
    pressing = true;
    C.pressThen(btnUnlock, function () { pressing = false; unlock(); });
  });

  btnAccept2.addEventListener('click', function (e) {
    e.stopPropagation();
    if (transitioning || selected === null) return;
    transitioning = true;
    C.saveState({ pair: pair, selected: selected });
    C.pressThen(btnAccept2, function () { C.leaveTo('confirmation.html'); });
  });

  document.getElementById('box-back').addEventListener('click', function () {
    if (transitioning || pressing) return;
    if (history.state && history.state.s === 'box') history.back();
    else { history.replaceState(null, '', location.pathname); toSlot(); }
  });
  window.addEventListener('popstate', function () {
    if (location.hash === '#box') { if (box.hidden && pair) toBox({ silent: true, noHistory: true }); }
    else toSlot();
  });

  /* ================= restore (coming back from the confirmation page) ================= */
  function restoreDraw(p) {
    reelL.setCenter(p[0]); reelR.setCenter(p[1]);
    wLeft.textContent = WL[p[0]]; wRight.textContent = WR[p[1]];
    wLeft.className = wX.className = wRight.className = 'w';
    copyIdle.classList.add('fade-out');
    copyResult.classList.remove('fade-out');
    reelL.markWin(true); reelR.markWin(true);
    btnAccept.hidden = false;
    setPullButton('again');
  }
  (function restore() {
    var st = C.loadState();
    if (location.hash === '#box' && st && st.pair) {
      pair = st.pair;
      restoreDraw(pair);
      slot.hidden = true; box.hidden = false;
      fitDice();
      phase = 'open'; envReady = true;
      box.classList.add('open', 'ready');
      boxTop.style.setProperty('--zh', 762);
      btnUnlock.hidden = true;
      selected = typeof st.selected === 'number' && st.selected < envBtns.length ? st.selected : null;
      pickDraw = drawNo;
      renderSelection();
      C.afterShown(box, boxIntro);
      // history: [slot] -> [box], so Back returns to the drawn pair
      history.replaceState(null, '', location.pathname);
      history.pushState({ s: 'box' }, '', '#box');
    } else if (location.hash === '#box') {
      history.replaceState(null, '', location.pathname);
    }
  })();

  document.addEventListener('sy:restored', function () { transitioning = false; pressing = false; });

  // first visit of the slot screen: the teaser, 1 s after it has loaded
  C.afterShown(slot, playTeaser);

  window.addEventListener('resize', function () {
    measure(); reelL.render(0); reelR.render(0); fitDice();
  });

  // debug hook for automated checks (no UI)
  window.__sy = { reelL: reelL, reelR: reelR, pull: pull, get pair() { return pair; }, slogans: [sloganSlot, sloganBox],
    get teaser() { return !!teaser; }, boxIntro: boxIntro };
})();
