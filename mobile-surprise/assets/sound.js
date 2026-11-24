/*
 * Sound engine — a line-for-line port of the Web Audio synthesis used by the
 * live site (https://drdrelich.github.io/). Same oscillators, envelopes,
 * filters, gains and timings, so the slot machine sounds identical:
 *   tick(key)  per reel row passing (L = 168 Hz base, R = 138 Hz base)
 *   thunk()    a reel locking into place
 *   whoosh()   screen transition (sweep + three sparkle bells)
 *   crack()    the box lock snapping
 *   chime()    two-note chime (box opens / envelope picked)
 *   whooshConfirm()  the sweep-only variant used on the live confirmation page
 */
(function () {
  var actx = null, comp = null, master = null;

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) {
      // iOS: let the effects play even when the ring/silent switch is on,
      // like a game or video would. No-op where unsupported.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      actx = new AC();
      comp = actx.createDynamicsCompressor();
      master = actx.createGain();
      master.gain.value = 0.5;
      master.connect(comp);
      comp.connect(actx.destination);
    }
    if (actx.state === 'suspended' || actx.state === 'interrupted') {
      try { actx.resume(); } catch (e) {}
    }
  }

  function noise(dur) {
    var sr = actx.sampleRate;
    var buf = actx.createBuffer(1, Math.max(1, Math.ceil(sr * dur)), sr);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var s = actx.createBufferSource();
    s.buffer = buf;
    return s;
  }

  function tick(key) {
    if (!actx) return;
    var t = actx.currentTime;
    var base = key === 'L' ? 168 : 138;
    var o = actx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(base + Math.random() * 42, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.6, t + 0.045);
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.07);
    var n = noise(0.03);
    var nf = actx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 1700; nf.Q.value = 1.1;
    var ng = actx.createGain();
    ng.gain.setValueAtTime(0.07, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(nf).connect(ng).connect(master);
    n.start(t); n.stop(t + 0.035);
  }

  function thunk() {
    if (!actx) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(122, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.62, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.45);
    var o2 = actx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = 92;
    var g2 = actx.createGain();
    g2.gain.setValueAtTime(0.32, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o2.connect(g2).connect(master);
    o2.start(t); o2.stop(t + 0.13);
    var n = noise(0.14);
    var nf = actx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 620;
    var ng = actx.createGain();
    ng.gain.setValueAtTime(0.34, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    n.connect(nf).connect(ng).connect(master);
    n.start(t); n.stop(t + 0.18);
  }

  function whoosh() {
    if (!actx) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.55);
    var f = actx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(f).connect(g).connect(master);
    o.start(t); o.stop(t + 0.75);
    [[988, 0.0], [1319, 0.12], [1760, 0.24]].forEach(function (p) {
      var tt = t + p[1];
      var oo = actx.createOscillator();
      oo.type = 'sine'; oo.frequency.value = p[0];
      var gg = actx.createGain();
      gg.gain.setValueAtTime(0.0001, tt);
      gg.gain.exponentialRampToValueAtTime(0.12, tt + 0.02);
      gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.6);
      oo.connect(gg).connect(master);
      oo.start(tt); oo.stop(tt + 0.65);
    });
  }

  function crack() {
    if (!actx) return;
    var t = actx.currentTime;
    var n = noise(0.05);
    var nf = actx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.8;
    var ng = actx.createGain();
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(nf).connect(ng).connect(master);
    n.start(t); n.stop(t + 0.07);
  }

  function chime() {
    if (!actx) return;
    var t0 = actx.currentTime;
    [[784, 0], [1175, 0.13]].forEach(function (p) {
      var t = t0 + p[1];
      var o = actx.createOscillator();
      o.type = 'sine'; o.frequency.value = p[0];
      var g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 1.2);
    });
  }

  // Live confirmation.html: its own context, master gain 0.7, no compressor,
  // sweep only (no bells), stop at +0.8 s.
  function whooshConfirm() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      var c = new AC();
      var m = c.createGain();
      m.gain.value = 0.7;
      m.connect(c.destination);
      var t = c.currentTime;
      var o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.55);
      var f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(f).connect(g).connect(m);
      o.start(t); o.stop(t + 0.8);
    } catch (err) {}
  }

  // Browsers suspend audio in background tabs; wake it on the next touch.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && actx && actx.state !== 'running') {
      var wake = function () { init(); document.removeEventListener('pointerdown', wake, true); };
      document.addEventListener('pointerdown', wake, true);
    }
  });

  window.Sound = { init: init, tick: tick, thunk: thunk, whoosh: whoosh, crack: crack, chime: chime, whooshConfirm: whooshConfirm };
})();
