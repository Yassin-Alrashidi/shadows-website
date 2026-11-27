/* The hero owl: the ORIGINAL Shadows owl on its burning branch, layered artwork rendered with
   three.js (see stage/stage.html). It lives in an iframe so it is its own world, and it loads when
   the intro closes (the branch then grows in as the intro fades). If WebGL is not available, or the
   browser is told to save data, the static owl stays. */
(function () {
  'use strict';
  var html = document.documentElement, hero = document.querySelector('.hero');
  if (!hero) return;
  var gl = false;
  try { var c = document.createElement('canvas'); gl = !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) {}
  var save = navigator.connection && navigator.connection.saveData;
  if (!gl || save) { html.classList.add('no-gl'); return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, f = null, ready = false, heroVisible = true, mounted = false;
  function post(m) { try { f.contentWindow.postMessage(m, '*'); } catch (e) {} }
  function flap() { if (ready && !reduce && !document.hidden && heroVisible) post({ t: 'flap' }); }
  window.shadowsFlap = flap;
  function mount() {
    if (mounted) return; mounted = true;
    f = document.createElement('iframe');
    f.className = 'hero__stage'; f.src = 'stage/stage.html'; f.title = ''; f.tabIndex = -1;
    // inline styles: if a cached old stylesheet is served, the frame still never shows as a box
    f.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100vh;height:100svh;min-height:560px;border:0;background:transparent;pointer-events:none;opacity:0;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent)';
    f.setAttribute('aria-hidden', 'true'); f.setAttribute('scrolling', 'no');
    hero.insertBefore(f, hero.firstChild);
    html.classList.add('has-gl');
    f.addEventListener('load', function () { setTimeout(function () { ready = true; f.classList.add('on'); f.style.opacity = '1'; if (!reduce) setTimeout(flap, 2600); }, 600); });
  }
  var introEl = document.getElementById('intro');
  if (introEl && !introEl.hidden) document.addEventListener('shadows:intro-done', mount, { once: true }); else mount();

  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; }, { threshold: .15 }).observe(hero);
  // the owl looks where the pointer is
  var last = 0;
  addEventListener('pointermove', function (e) {
    if (!ready || !heroVisible) return;
    var n = performance.now(); if (n - last < 16) return; last = n;
    var r = f.getBoundingClientRect();
    post({ t: 'pt', x: e.clientX / r.width, y: (e.clientY - r.top) / r.height });
  }, { passive: true });
  // it watches the calls to action
  document.addEventListener('pointerover', function (e) { if (ready && e.pointerType === 'mouse' && e.target.closest && e.target.closest('.btn--red, .disc')) post({ t: 'hot', v: 1 }); });
  document.addEventListener('pointerout', function (e) { if (ready && e.target.closest && e.target.closest('.btn--red, .disc')) post({ t: 'hot', v: 0 }); });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.btn--red, .disc')) { if (ready) post({ t: 'hot', v: 2 }); flap(); }
    else if (e.target.closest && e.target.closest('#tour')) flap();
  });
  // now and then, and when the page first starts to move, it beats its wings
  setInterval(flap, 15000);
  var moved = false;
  addEventListener('scroll', function () { if (!moved && scrollY > 30 && scrollY < innerHeight * .6) { moved = true; flap(); } }, { passive: true });
})();
