/* Screen 1 (slot machine) + screen 2 (mysterious box).
   Sequence, timings and sounds follow the live site's component logic:
   pull -> lever + both reels spin (left 5 s, right 7 s; tick per row, thunk per
   stop) -> both stopped: losers dim, Accept appears -> Accept: flash, whoosh,
   bloom, swap at 430 ms -> tap lock: crack + whoosh + bloom, open at 430 ms,
   tray rises, chime -> pick envelope (chime) -> Accept: whoosh, bloom,
   confirmation.html at 430 ms. */
(function () {
  var C = window.Common, S = window.Sound;

  var WL = ['FEAR', 'ABSURDITY', 'PRESTIGE', 'ISOLATION', 'SPEED'];
  var WR = ['AIR', 'WATER', 'EARTH', 'EMPTINESS', 'SPACE'];
  var OFFERS = [
    'Private Maldives Overwater Villa',
    'Kyoto Imperial Ryokan Retreat',
    'Venice–Istanbul Orient Express',
    'Antarctic Expedition Voyage',
    'Amalfi Coast Yacht Charter'
  ];
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
  Reel.prototype.spin = function (target, dur, done) {
    var self = this;
    var cur = this.centerIndex();
    var D = this.key === 'L'
      ? -(5 * 40 + ((((cur - target) % 5) + 5) % 5))
      : (5 * 56 + ((((target - cur) % 5) + 5) % 5));
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
      if (rows > lastRow) { lastRow = rows; if (now - lastTickAt >= gap) { lastTickAt = now; S.tick(self.key); } }
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
  var pair = null;          // [leftIdx, rightIdx] of the last completed draw

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

  function pull() {
    if (busy || transitioning) return;
    busy = true;
    S.init();
    emphasize(false);
    btnPull.setAttribute('aria-disabled', 'true');

    // result line goes back to the heading until the first reel lands
    copyResult.classList.add('fade-out');
    copyIdle.classList.remove('fade-out');

    if (lever.animate && !C.reduceMotion) {
      lever.animate([
        { transform: 'none', offset: 0, easing: 'cubic-bezier(.42,0,.3,1)' },
        { transform: 'rotate(12deg) scaleY(.42)', offset: 0.20 },
        { transform: 'rotate(12deg) scaleY(.42)', offset: 0.33, easing: 'cubic-bezier(.25,0,.25,1)' },
        { transform: 'rotate(-4deg) scaleY(1.05)', offset: 0.72 },
        { transform: 'rotate(1.5deg) scaleY(.98)', offset: 0.87 },
        { transform: 'none', offset: 1 }
      ], { duration: 1150, easing: 'linear' });
    }

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
        btnPull.removeAttribute('aria-disabled');
        emphasize(true);
        C.revealAbove(copyResult);
      }
    }
  }

  lever.addEventListener('click', pull);
  btnPull.addEventListener('click', pull);
  btnAccept.addEventListener('click', function () {
    if (transitioning || busy) return;
    C.flash(btnAccept);
    setTimeout(toBox, 150);
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
      if (!opts.noHistory && location.hash !== '#box') history.pushState({ s: 'box' }, '', '#box');
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
  var envName = document.getElementById('env-name');
  var envOffer = document.getElementById('env-offer');
  var boxTop = document.getElementById('box-top');
  var phase = 'closed', envReady = false, selected = null;

  function resetBox() {
    phase = 'closed'; envReady = false; selected = null;
    box.classList.remove('open', 'ready', 'unlocking');
    boxTop.style.setProperty('--zh', 706);
    btnUnlock.hidden = false;
    renderSelection();
  }

  function unlock() {
    if (phase !== 'closed' || transitioning) return;
    transitioning = true;
    box.classList.add('unlocking');
    S.init(); S.crack(); S.whoosh();
    C.bloom();
    setTimeout(function () {
      phase = 'open'; envReady = true;
      box.classList.add('open', 'ready');
      boxTop.style.setProperty('--zh', 762);
      btnUnlock.hidden = true;
      S.chime();
    }, 430);
    setTimeout(function () { transitioning = false; }, 1240);
  }

  function renderSelection() {
    var has = selected !== null;
    envs.classList.toggle('has-sel', has);
    envBtns.forEach(function (b, i) {
      b.classList.toggle('sel', i === selected);
      b.setAttribute('aria-checked', i === selected ? 'true' : 'false');
    });
    if (has) {
      envBar.style.setProperty('--bx', 65 + 68 * selected);
      envName.textContent = 'Envelope ' + (selected + 1);
      envOffer.textContent = OFFERS[selected];
      btnAccept2.textContent = 'Envelope ' + (selected + 1) + ' - Accept Your Destiny';
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
    if (!envReady) return;
    S.init();
    if (selected !== i) S.chime();
    selected = i;
    renderSelection();
    C.revealAbove(envInfo);
  }

  envBtns.forEach(function (b, i) {
    b.addEventListener('click', function (e) { e.stopPropagation(); selectEnv(i); });
  });
  // Live behaviour: tapping the scene outside the envelopes clears the pick.
  box.addEventListener('click', function (e) {
    if (selected === null || phase !== 'open') return;
    if (e.target.closest('.env, .actions, .icon-btn, .title')) return;
    selected = null;
    renderSelection();
  });

  chest.addEventListener('click', unlock);
  btnUnlock.addEventListener('click', unlock);

  btnAccept2.addEventListener('click', function (e) {
    e.stopPropagation();
    if (transitioning || selected === null) return;
    transitioning = true;
    C.flash(btnAccept2);
    C.saveState({ pair: pair, selected: selected });
    C.leaveTo('confirmation.html');
  });

  document.getElementById('box-back').addEventListener('click', function () {
    if (transitioning) return;
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
      phase = 'open'; envReady = true;
      box.classList.add('open', 'ready');
      boxTop.style.setProperty('--zh', 762);
      btnUnlock.hidden = true;
      selected = typeof st.selected === 'number' ? st.selected : null;
      renderSelection();
      // history: [slot] -> [box], so Back returns to the drawn pair
      history.replaceState(null, '', location.pathname);
      history.pushState({ s: 'box' }, '', '#box');
    } else if (location.hash === '#box') {
      history.replaceState(null, '', location.pathname);
    }
  })();

  document.addEventListener('sy:restored', function () { transitioning = false; });

  window.addEventListener('resize', function () {
    measure(); reelL.render(0); reelR.render(0);
  });

  // debug hook for automated checks (no UI)
  window.__sy = { reelL: reelL, reelR: reelR, pull: pull, get pair() { return pair; }, slogans: [sloganSlot, sloganBox] };
})();
