/* Shadows round 4: ideas from the reference sites, rebuilt for Shadows. Silent. No WebGL.
   Everything here is skipped with reduced motion; the desktop-only parts also skip phones. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (s, c) { return (c || document).querySelector(s); }, $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = window.matchMedia('(min-width: 901px) and (pointer: fine)').matches;
  var AR = window.SHADOWS_AR || {}, EN = window.SHADOWS_EN || {};
  var isAr = function () { return root.lang === 'ar'; };
  var tr = function (k, fallback) { return isAr() ? (AR[k] || fallback) : (EN[k] || fallback); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var langBtn = $('#langToggle');
  if (reduce) return;

  /* ===== 1. Manifesto lit by scrolling (albino "scroll slowly", majd text reveal) ===== */
  var mf = $('#manifesto'), mfWords = [], mfLit = -1;
  function splitMf() {
    mfWords = [];
    $$('.mf-line', mf).forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.setAttribute('aria-label', words.join(' '));
      el.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
      $$('.w', el).forEach(function (s) { mfWords.push(s); });
    });
    mfLit = -1; mfUpdate();
  }
  function mfUpdate() {
    if (!mf) return;
    var r = mf.getBoundingClientRect(), total = Math.max(1, mf.offsetHeight - innerHeight);
    var p = root.classList.contains('mf-static') ? 1 : clamp(-r.top / total, 0, 1);
    mf.style.setProperty('--mfp', p.toFixed(3));
    var n = Math.min(mfWords.length, Math.floor(p / .8 * (mfWords.length + 1)));
    if (n !== mfLit) { mfWords.forEach(function (w, i) { w.classList.toggle('on', i < n); }); mfLit = n; }
    mf.classList.toggle('mf-done', p > .86);
  }
  if (mf) {
    root.classList.add('mf-pinned');
    splitMf();
    window.addEventListener('scroll', mfUpdate, { passive: true });
    window.addEventListener('resize', mfUpdate);
  }

  /* ===== 2. Silent tour (weflash "20 second tour") ===== */
  var tourBtn = $('#tour'), touring = false, timers = [], bar = document.createElement('div');
  bar.className = 'tour-bar'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  var ease = function (p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  function label(stop) { var s = $('span', tourBtn); s.textContent = stop ? tr('tour.stop', 'Stop tour') : tr('tour.go', 'Silent tour \u00B7 20s'); }
  function glide(to, dur, done) {
    var s = window.scrollY, t0 = performance.now();
    (function st(t) {
      if (!touring) return;
      var p = Math.min(1, (t - t0) / dur);
      window.scrollTo({ top: s + (to - s) * ease(p), behavior: 'instant' });
      if (p < 1) requestAnimationFrame(st); else if (done) done();
    })(t0);
  }
  function stopTour() {
    if (!touring) return; touring = false; timers.forEach(clearTimeout); timers = [];
    tourBtn.classList.remove('on'); label(false); bar.style.transform = 'scaleX(0)';
    ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.removeEventListener(e, stopTour); });
  }
  function startTour() {
    touring = true; tourBtn.classList.add('on'); label(true);
    ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.addEventListener(e, stopTour, { passive: true }); });
    var ids = ['services', 'work', 'process', 'manifesto', 'studio', 'faq', 'contact'], i = 0;
    var navh = parseInt(getComputedStyle(root).getPropertyValue('--nav-h')) || 72;
    var yOf = function (id) { return $('#' + id).getBoundingClientRect().top + window.scrollY; };
    (function next() {
      if (!touring) return;
      if (i >= ids.length) { stopTour(); return; }
      var id = ids[i++]; bar.style.transform = 'scaleX(' + (i / ids.length).toFixed(2) + ')';
      if (id === 'manifesto') {
        glide(yOf(id), 1100, function () {
          var end = yOf(id) + Math.max(0, $('#manifesto').offsetHeight - innerHeight);
          glide(end, 3600, function () { timers.push(setTimeout(next, 500)); });
        });
      } else {
        glide(yOf(id) - (id === 'contact' ? navh - 10 : navh - 12), 1100, function () { timers.push(setTimeout(next, id === 'work' ? 1700 : 1300)); });
      }
    })();
  }
  if (tourBtn) {
    tourBtn.hidden = false; label(false);
    tourBtn.addEventListener('click', function () {
      if (touring) { stopTour(); return; }
      if (window.scrollY > 40) glide0(startTour); else startTour();
    });
  }
  window.shadowsStartTour = function () { if (!tourBtn || touring) return; if (window.scrollY > 40) glide0(startTour); else startTour(); };
  function glide0(cb) { touring = true; glide(0, 700, function () { touring = false; cb(); }); }
  if (langBtn) langBtn.addEventListener('click', function () { setTimeout(function () { if (tourBtn) label(touring); }, 0); });

  /* ===== 3. Ask the owl (aaabadcode's "ask me anything", with fixed answers, no live AI) ===== */
  var faqWrap = $('#faq .faq'), ask, askBody, askChips, typeT = 0, askDone = false;
  function addBubble(cls, text) { var b = document.createElement('div'); b.className = 'bub ' + cls; b.textContent = text; askBody.appendChild(b); askBody.scrollTop = askBody.scrollHeight; return b; }
  function answer(i) {
    var items = $$('.faq__i'), q = $('summary', items[i]).textContent, a = $('p', items[i]).textContent;
    clearInterval(typeT); $$('.ask__chips button', ask).forEach(function (b, k) { b.classList.toggle('on', k === i); });
    askBody.innerHTML = ''; addBubble('bub--me', q);
    var b = addBubble('bub--owl', ''), n = 0; b.classList.add('typing');
    typeT = setInterval(function () { n += 2; b.textContent = a.slice(0, n); if (n >= a.length) { clearInterval(typeT); b.classList.remove('typing'); } }, isAr() ? 22 : 16);
  }
  function buildAsk() {
    var items = $$('.faq__i');
    $('.ask__title', ask).textContent = tr('ask.t', 'Ask the owl');
    askBody.innerHTML = ''; addBubble('bub--owl', tr('ask.hi', 'Ask me anything about working with Shadows. Pick a question:'));
    askChips.innerHTML = '';
    items.forEach(function (it, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = $('summary', it).textContent; b.addEventListener('click', function () { answer(i); }); askChips.appendChild(b); });
  }
  if (faqWrap) {
    ask = document.createElement('div'); ask.className = 'ask';
    ask.innerHTML = '<div class="ask__head"><img src="assets/owl-head.webp" alt="" width="40" height="40"><b class="ask__title"></b><span class="ask__live" aria-hidden="true"></span></div><div class="ask__body" aria-live="polite"></div><div class="ask__chips"></div>';
    askBody = $('.ask__body', ask); askChips = $('.ask__chips', ask);
    var list = $('.faq__list', faqWrap); list.parentNode.insertBefore(ask, list);
    faqWrap.classList.add('has-ask'); buildAsk();
    if (langBtn) langBtn.addEventListener('click', function () { setTimeout(function () { clearInterval(typeT); buildAsk(); }, 0); });
    new IntersectionObserver(function (es, io) { if (es[0].isIntersecting && !askDone) { askDone = true; setTimeout(function () { answer(4); }, 600); io.disconnect(); } }, { threshold: .45 }).observe(ask);
  }

  if (!desk) return;

  /* ===== 4. Side rail (brittanychiang's sticky nav) + side email (tajmirul) ===== */
  var rail = document.createElement('nav'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Sections');
  var navLinks = $$('#navLinks a');
  rail.innerHTML = navLinks.map(function (a) { return '<a href="' + a.getAttribute('href') + '"><i></i><span>' + a.textContent + '</span></a>'; }).join('');
  document.body.appendChild(rail);
  var railA = $$('a', rail);
  var railIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) railA.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); }); }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { railIO.observe(s); });
  window.addEventListener('scroll', function () { rail.classList.toggle('show', window.scrollY > innerHeight * .5); }, { passive: true });
  if (langBtn) langBtn.addEventListener('click', function () { setTimeout(function () { navLinks.forEach(function (a, i) { $('span', railA[i]).textContent = a.textContent; }); }, 0); });
  var sm = document.createElement('a'); sm.className = 'side-mail'; sm.href = 'mailto:shvdows.co@gmail.com'; sm.textContent = 'shvdows.co@gmail.com'; document.body.appendChild(sm);

  /* ===== 5. Spotlight on cards and tiles (light in the dark) ===== */
  $$('.tile,.card').forEach(function (el) {
    var l = document.createElement('i'); l.className = 'lit'; l.setAttribute('aria-hidden', 'true'); el.appendChild(l);
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); el.style.setProperty('--px', (e.clientX - r.left) + 'px'); el.style.setProperty('--py', (e.clientY - r.top) + 'px'); });
  });

  /* ===== 6. Magnetic buttons (aadarshrai, weflash) ===== */
  var mags = $$('.btn--red,.disc'), magT = 0;
  window.addEventListener('pointermove', function (e) {
    if (magT) return; magT = requestAnimationFrame(function () {
      magT = 0;
      mags.forEach(function (el) {
        var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), R = Math.max(r.width, r.height) * .9 + 40;
        el.style.translate = d < R ? (dx * .28).toFixed(1) + 'px ' + (dy * .28).toFixed(1) + 'px' : '';
      });
    });
  }, { passive: true });
})();
