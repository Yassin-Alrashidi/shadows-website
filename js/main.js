/* Shadows site. Plain JS, no build step. Silent by design: no audio anywhere. */
(function () {
  'use strict';

  /* ---------- CONTACT FORM ENDPOINT ----------
     The form posts here. To activate it (free, no server needed):
       Web3Forms:  get an access key at https://web3forms.com, then set
                   FORM_ENDPOINT = 'https://api.web3forms.com/submit' and FORM_ACCESS_KEY = 'your-key'
       Formspree:  create a form at https://formspree.io, then set
                   FORM_ENDPOINT = 'https://formspree.io/f/yourFormId' and leave FORM_ACCESS_KEY empty
     While it still says PLACEHOLDER, the form shows a "not activated" message and sends nothing. */
  var FORM_ENDPOINT = 'PLACEHOLDER_FORM_ENDPOINT';
  var FORM_ACCESS_KEY = '';
  /* -------------------------------------------- */

  var root = document.documentElement;
  var AR = window.SHADOWS_AR, EN = window.SHADOWS_EN, META = window.SHADOWS_AR_META;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 700px)').matches || window.matchMedia('(pointer: coarse)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var nodes = [].slice.call(document.querySelectorAll('[data-i18n]'));
  nodes.forEach(function (n) { n._en = n.innerHTML; });
  var metaEn = {
    title: document.title,
    d: $('meta[name="description"]').content,
    og: $('meta[property="og:description"]').content,
    tw: $('meta[name="twitter:description"]').content
  };
  var ogTitle = $('meta[property="og:title"]'), twTitle = $('meta[name="twitter:title"]');
  var lang = 'en';

  function t(key) { return (lang === 'ar' ? AR[key] : EN[key]) || ''; }

  function setLang(l, remember) {
    lang = l;
    root.lang = l; root.dir = l === 'ar' ? 'rtl' : 'ltr';
    nodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n');
      n.innerHTML = (l === 'ar' && AR[k]) ? AR[k] : n._en;
    });
    $('#langToggle').textContent = l === 'ar' ? 'English' : 'العربية';
    var ar = l === 'ar';
    document.title = ar ? META.title : metaEn.title;
    $('meta[name="description"]').content = ar ? META.description : metaEn.d;
    $('meta[property="og:description"]').content = ar ? META.ogDescription : metaEn.og;
    $('meta[name="twitter:description"]').content = ar ? META.twDescription : metaEn.tw;
    ogTitle.content = twTitle.content = document.title;
    $('.wa').setAttribute('aria-label', ar ? 'تواصل معانا على واتساب' : 'Chat with us on WhatsApp');
    $('#heroOwl').alt = ar ? 'رمز البومة الخاص بـ Shadows' : 'Shadows owl symbol';
    if (remember) { try { localStorage.setItem('shadows-lang', l); } catch (e) {} }
  }

  var saved = null;
  try { saved = localStorage.getItem('shadows-lang'); } catch (e) {}
  var q = /[?&]lang=(ar|en)/.exec(location.search);
  var pref = q ? q[1] : saved || ((navigator.language || '').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en');
  setLang(pref, false);
  $('#langToggle').addEventListener('click', function () {
    setLang(lang === 'ar' ? 'en' : 'ar', true);
    if (introActive) typeLine(true);
  });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  var burger = $('#burger'), links = $('#navLinks');
  function closeMenu() { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () {
    var o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false');
  });
  links.addEventListener('click', closeMenu);

  /* ---------- nav shadow on scroll ---------- */
  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('nav--solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- nav scrollspy ---------- */
  if ('IntersectionObserver' in window) {
    var spy = [].slice.call(links.querySelectorAll('a'));
    var secs = spy.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        spy.forEach(function (a) { a.classList.toggle('on', document.querySelector(a.getAttribute('href')) === e.target); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (el) { if (el) so.observe(el); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('.card,.tile,.steps li,.values li,.channel,.form,.sec h2,.faq__i,.sec .eyebrow,.sec .lead'));
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('reveal-on');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- owl intro (first visit per session, silent) ---------- */
  var intro = $('#intro'), line = $('#introLine'), choices = $('#introChoices');
  var introActive = false, typeTimer = null;
  var owlEl = $('.intro__owl'), hint = $('#introHint'), typed = false, revealed = false, moved = false, revealTimer = null;
  var ptr = { x: innerWidth / 2, y: innerHeight * .4, has: false }, rest = null;
  function restCenter() { var tr = owlEl.style.transform; owlEl.style.transform = 'none'; var r = owlEl.getBoundingClientRect(); owlEl.style.transform = tr; rest = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
  function revealChoices() {
    if (revealed || !introActive) return; revealed = true; clearTimeout(revealTimer);
    hint.classList.remove('show'); choices.style.transition = 'none'; choices.classList.add('show');
    if (reduce || !choices.animate) return;
    var o = owlEl.getBoundingClientRect(), ox = o.left + o.width / 2, oy = o.top + o.height * .55;
    [].forEach.call(choices.children, function (b, i) {
      var r = b.getBoundingClientRect(), dx = ox - (r.left + r.width / 2), dy = oy - (r.top + r.height / 2);
      b.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: 0 }, { opacity: 1, offset: .35 }, { transform: 'none', opacity: 1 }],
        { duration: 900, delay: i * 120, easing: 'cubic-bezier(.2,1.2,.3,1)', fill: 'backwards' });
    });
  }
  function armReveal() {
    typed = true;
    if (moved) { setTimeout(revealChoices, 250); return; }
    hint.textContent = t(coarse ? 'intro.hint.t' : 'intro.hint.m'); hint.classList.add('show');
    revealTimer = setTimeout(revealChoices, coarse ? 2600 : 7000);   // a visitor who never moves still gets the choices
  }
  function touched(e) {
    if (!introActive) return;
    moved = true; ptr.has = true;
    var p = e.touches && e.touches[0] ? e.touches[0] : e; if (p.clientX != null) { ptr.x = p.clientX; ptr.y = p.clientY; }
    if (typed && !revealed) revealChoices();
  }
  var coarse = matchMedia('(pointer: coarse)').matches;
  ['pointermove', 'pointerdown', 'touchstart', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, touched, { passive: true }); });
  // the owl looks toward the pointer and flies after it, easing, never snapping
  var ox = 0, oy = 0, orx = 0, ory = 0, osc = 1, tPrev = 0;
  function owlFrame(now) {
    if (!introActive) { owlEl.style.transform = ''; return; }
    requestAnimationFrame(owlFrame);
    if (!rest) restCenter();
    var dt = Math.min(.05, (now - tPrev) / 1000 || .016); tPrev = now;
    var tx, ty;
    if (ptr.has) { tx = (ptr.x - rest.x) * .5; ty = (ptr.y - rest.y) * .22; }
    else { tx = Math.sin(now / 1500) * 34; ty = Math.cos(now / 1100) * 14; }
    var mxo = Math.max(0, innerWidth / 2 - rest.w * .55), myo = Math.max(0, Math.min(rest.y - rest.h * .5, innerHeight * .12));
    tx = Math.max(-mxo, Math.min(mxo, tx)); ty = Math.max(-myo, Math.min(myo, ty));
    var k = 1 - Math.exp(-dt * 3.6);
    ox += (tx - ox) * k; oy += (ty - oy) * k;
    var nx = ptr.has ? (ptr.x - (rest.x + ox)) / innerWidth : Math.sin(now / 1500) * .1, ny = ptr.has ? (ptr.y - (rest.y + oy)) / innerHeight : 0;
    orx += (Math.max(-1, Math.min(1, -ny * 2.2)) * 16 - orx) * k; ory += (Math.max(-1, Math.min(1, nx * 2.4)) * 26 - ory) * k;
    var near = ptr.has ? Math.max(0, 1 - Math.hypot(ptr.x - (rest.x + ox), ptr.y - (rest.y + oy)) / (innerWidth * .5)) : 0;
    osc += ((1 + near * .16) - osc) * k;
    owlEl.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) perspective(700px) rotateX(' + orx.toFixed(2) + 'deg) rotateY(' + ory.toFixed(2) + 'deg) scale(' + osc.toFixed(3) + ')';
  }
  addEventListener('resize', function () { rest = null; });
  function typeLine(restart) {
    clearTimeout(typeTimer);
    var text = t('intro.line'), i = 0;
    line.textContent = '';
    if (reduce) { line.textContent = text; choices.classList.add('show'); revealed = true; return; }
    if (restart) { choices.classList.remove('show'); revealed = false; typed = false; choices.style.transition = ''; }
    (function step() {
      i++; line.textContent = text.slice(0, i);
      if (i < text.length) typeTimer = setTimeout(step, lang === 'ar' ? 65 : 48);
      else typeTimer = setTimeout(armReveal, 350);
    })();
  }
  function closeIntro() {
    if (!introActive) return;
    introActive = false; clearTimeout(typeTimer);
    intro.classList.add('out');
    root.classList.remove('lock');
    document.dispatchEvent(new Event('shadows:intro-done'));
    setTimeout(function () { intro.hidden = true; }, reduce ? 0 : 700);
    try { sessionStorage.setItem('shadows-intro', '1'); } catch (e) {}
  }
  var seen = false;
  try { seen = sessionStorage.getItem('shadows-intro') === '1'; } catch (e) {}
  if (!seen && !location.hash) {
    intro.hidden = false; introActive = true; root.classList.add('lock');
    setTimeout(function () { intro.classList.add('on'); typeLine(false); if (!reduce) requestAnimationFrame(owlFrame); }, reduce ? 0 : 500);
    $('#introSkip').addEventListener('click', closeIntro);
    [].forEach.call(choices.querySelectorAll('a'), function (a) { a.addEventListener('click', closeIntro); });
    $('#introExplore').addEventListener('click', function () { setTimeout(function () { if (window.shadowsStartTour) window.shadowsStartTour(); }, 1100); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeIntro(); });
  }

  /* ---------- embers (lazy, no WebGL, skipped on phones and reduced motion) ---------- */
  var canvas = $('#embers');
  if (!reduce && !small && canvas.getContext) {
    var ctx = canvas.getContext('2d'), parts = [], sparks = [], ptr = { on: false, x: 0, y: 0 }, W = 0, H = 0, raf = 0, visible = true;
    var resize = function () {
      var r = canvas.parentNode.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    var spawn = function (init, ash) {
      if (ash) return { ash: 1, x: Math.random() * W, y: init ? Math.random() * H : -10, r: Math.random() * 1.2 + .5,
        vy: -(Math.random() * .35 + .12), vx: (Math.random() - .5) * .2, a: Math.random() * .25 + .08, ph: Math.random() * 6.28 };
      return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: Math.random() * 1.8 + .4,
        vy: Math.random() * .5 + .2, vx: (Math.random() - .5) * .25, a: Math.random() * .7 + .2, ph: Math.random() * 6.28 };
    };
    var frame = function (ts) {
      raf = 0; if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p, i) {
        p.y -= p.vy; p.x += p.vx + Math.sin(ts / 900 + p.ph) * .15;
        if (ptr.on) { var dx = p.x - ptr.x, dy = p.y - ptr.y, dd = dx * dx + dy * dy;
          if (dd < 25600 && dd > 1) { var mm = Math.sqrt(dd), f = (1 - mm / 160) * .55; p.ix = (p.ix || 0) + dx / mm * f; p.iy = (p.iy || 0) + dy / mm * f; } }
        if (p.ix || p.iy) { p.x += p.ix; p.y += p.iy; p.ix *= .92; p.iy *= .92; }
        if (p.ash) { if (p.y > H + 10) parts[i] = spawn(false, true); ctx.globalAlpha = p.a; ctx.fillStyle = '#AFAAAF'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); return; }
        if (p.y < -10) parts[i] = spawn(false);
        var f = Math.max(0, Math.min(1, p.y / H));
        ctx.globalAlpha = p.a * f * (.6 + .4 * Math.sin(ts / 400 + p.ph));
        ctx.fillStyle = p.r > 1.4 ? '#ff4a3d' : '#E11827';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        if (p.r > 1.3) { ctx.globalAlpha *= .18; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.283); ctx.fill(); }
      });
      for (var s = sparks.length - 1; s >= 0; s--) {
        var k = sparks[s]; k.x += k.vx; k.y += k.vy; k.vy += .06; k.vx *= .985; k.life -= .018;
        if (k.life <= 0) { sparks.splice(s, 1); continue; }
        ctx.globalAlpha = k.life; ctx.fillStyle = k.life > .6 ? '#ffd2c8' : '#ff4a3d';
        ctx.beginPath(); ctx.arc(k.x, k.y, 1.2 + k.life * 1.4, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    var start = function () {
      resize(); parts = []; for (var i = 0; i < 120; i++) parts.push(spawn(true)); for (var j = 0; j < 34; j++) parts.push(spawn(true, true));
      var hero = $('#top');
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(hero);
      window.addEventListener('resize', resize);
      raf = requestAnimationFrame(frame);
      hero.addEventListener('pointerleave', function () { ptr.on = false; });
      hero.addEventListener('pointerdown', function (e) {
        if (e.target.closest('a,button')) return;
        var cr = canvas.getBoundingClientRect(), x = e.clientX - cr.left, y = e.clientY - cr.top;
        for (var n = 0; n < 26; n++) { var a = Math.random() * 6.283, v = Math.random() * 3.2 + .8; sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, life: 1 }); }
      });
      // gentle owl parallax on pointer move
      var owl = $('#heroOwl');
      hero.addEventListener('pointermove', function (e) {
        var cr = canvas.getBoundingClientRect(); ptr.on = true; ptr.x = e.clientX - cr.left; ptr.y = e.clientY - cr.top;
        var x = (e.clientX / innerWidth - .5) * 10, y = (e.clientY / innerHeight - .5) * 6;
        owl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        // eyes follow the pointer a little (max 3px)
        var wrap = $('#owlWrap');
        wrap.style.setProperty('--ex', (x * .3).toFixed(1) + 'px'); wrap.style.setProperty('--ey', (y * .5).toFixed(1) + 'px');
      });
    };
    // lazy: only after the page is idle
    (window.requestIdleCallback || function (f) { setTimeout(f, 800); })(start);
  }

  /* ---------- contact form ---------- */
  var form = $('#form'), status = $('#formStatus'), send = $('#send');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    if (d.get('botcheck')) return;
    if (!d.get('name').trim() || !d.get('contact').trim() || !d.get('message').trim()) {
      status.textContent = t('f.req'); status.className = 'form__status err'; return;
    }
    if (FORM_ENDPOINT.indexOf('PLACEHOLDER') !== -1) {
      status.textContent = t('f.inactive'); status.className = 'form__status err'; return;
    }
    if (FORM_ACCESS_KEY) { d.append('access_key', FORM_ACCESS_KEY); d.append('subject', 'New message from the Shadows website'); }
    send.disabled = true; status.textContent = t('f.sending'); status.className = 'form__status';
    fetch(FORM_ENDPOINT, { method: 'POST', body: d, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () { status.textContent = t('f.ok'); status.className = 'form__status ok'; form.reset(); })
      .catch(function () { status.textContent = t('f.err'); status.className = 'form__status err'; })
      .then(function () { send.disabled = false; });
  });
})();
