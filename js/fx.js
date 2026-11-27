/* Shadows premium effects. Desktop-only and motion-safe: phones and reduced-motion get the static page. No WebGL, no audio. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (s) { return document.querySelector(s); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = window.matchMedia('(min-width: 901px) and (pointer: fine)').matches;

  /* stagger delays inside grids and lists (cheap, works on every device) */
  [].forEach.call(document.querySelectorAll('.grid,.steps,.values,.faq__list,.channels'), function (c) {
    [].forEach.call(c.children, function (el, i) { el.style.setProperty('--d', (i * 90) + 'ms'); });
  });

  if (reduce) return;
  root.classList.add('fx');

  /* hero headline: split into letters so they can rise in one by one */
  var h1 = $('.hero__title');
  if (h1) {
    var txt = h1.textContent.trim(), lines = [txt.split(' ').slice(0, 2).join(' '), txt.split(' ').slice(2).join(' ')], n = 0;
    h1.setAttribute('aria-label', txt);
    h1.innerHTML = lines.map(function (l) {
      return '<span class="ln" aria-hidden="true">' + l.split('').map(function (ch) {
        return ch === ' ' ? ' ' : '<span class="lt" style="--i:' + (n++) + '">' + ch + '</span>';
      }).join('') + '</span>';
    }).join('');
  }

  /* start the entrance once the silent intro is gone (or was never shown) */
  var intro = $('#intro'), went = false;
  function go() { if (went) return; went = true; root.classList.add('go'); }
  if (!intro || intro.hidden) go();
  else new MutationObserver(function () { if (intro.hidden || intro.classList.contains('out')) go(); }).observe(intro, { attributes: true });
  setTimeout(function () { if (intro && intro.hidden) go(); }, 1500);

  if (!desk) return;

  /* scroll depth: layers of the hero drift at different speeds */
  var hero = $('#top'), sy = 0, tick = false;
  function apply() { tick = false; hero.style.setProperty('--sy', Math.min(sy, 1000)); }
  window.addEventListener('scroll', function () { sy = window.scrollY; if (!tick && sy < 1100) { tick = true; requestAnimationFrame(apply); } }, { passive: true });
  hero.addEventListener('pointermove', function (e) {
    hero.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
    hero.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
  });

  /* ember cursor: a small red dot with a soft glow. The normal cursor stays. */
  var dot = document.createElement('div'), glow = document.createElement('div');
  dot.className = 'cur'; glow.className = 'cur-glow'; dot.setAttribute('aria-hidden', 'true'); glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow); document.body.appendChild(dot);
  var tx = -100, ty = -100, gx = -100, gy = -100;
  window.addEventListener('pointermove', function (e) {
    tx = e.clientX; ty = e.clientY; dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    root.classList.add('cur-on');
  }, { passive: true });
  document.addEventListener('pointerleave', function () { root.classList.remove('cur-on'); });
  document.addEventListener('pointerover', function (e) {
    root.classList.toggle('cur-hot', !!e.target.closest('a,button,summary,input,textarea,.tile'));
  });
  (function loop() {
    gx += (tx - gx) * .14; gy += (ty - gy) * .14;
    glow.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px)';
    requestAnimationFrame(loop);
  })();
})();
