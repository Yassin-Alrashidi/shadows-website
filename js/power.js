/* POWER PASS: smooth inertial scroll (Lenis), a live WebGL smoke shader behind the content that
   reacts to the pointer and to scroll speed, scroll-speed-driven marquees, and an ember "ink wipe"
   page transition between sections. Silent. All of it steps down on phones and stands down for
   reduced motion; if WebGL is missing the page just has no smoke. */
(function () {
  'use strict';
  var html = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var coarse = matchMedia('(pointer: coarse)').matches, small = innerWidth < 700;
  var vel = 0, lenis = null;

  /* ---------- 1. smooth scroll ---------- */
  if (window.Lenis) {
    try {
      lenis = new Lenis({ lerp: .085, wheelMultiplier: .95, smoothWheel: true, syncTouch: false });
      html.classList.add('lenis');
      lenis.on('scroll', function (e) { vel = e.velocity || 0; });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      window.shadowsLenis = lenis;
    } catch (e) { lenis = null; }
  }

  /* ---------- 2. scroll-speed: marquees speed up and lean, the page tilts a hair ---------- */
  var marq = document.querySelectorAll('.marquee'), v = 0, lastV = 0;
  function tickV() {
    var target = lenis ? lenis.velocity || 0 : vel;
    v += (target - v) * .12;
    var c = Math.max(-1, Math.min(1, v / 30));
    if (Math.abs(c - lastV) > .004) {
      lastV = c; html.style.setProperty('--v', c.toFixed(3));
      marq.forEach(function (m) {
        var tr = m.querySelector('.marquee__track'); if (!tr || !tr.getAnimations) return;
        var a = tr.getAnimations()[0]; if (a) a.playbackRate = 1 + Math.abs(c) * 7;
      });
    }
    requestAnimationFrame(tickV);
  }
  requestAnimationFrame(tickV);

  /* ---------- 3. smoke shader ---------- */
  var cv = document.createElement('canvas'); cv.className = 'smoke'; cv.setAttribute('aria-hidden', 'true');
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) {}
  if (gl) {
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = 'precision mediump float;uniform vec2 R;uniform float T,S,V;uniform vec2 M;' +
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}' +
      'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}' +
      'void main(){vec2 uv=gl_FragCoord.xy/R;vec2 q=vec2(uv.x*R.x/R.y,uv.y);' +
      'float t=T*.045;vec2 m=M*vec2(R.x/R.y,1.);' +
      'vec2 w=vec2(fbm(q*1.6+vec2(t,-t*.7)+S*.0006),fbm(q*1.6+vec2(-t*.8,t)+3.1));' +
      'float d=fbm(q*2.1+w*1.6+vec2(0.,-t*1.3)+S*.0011);' +
      'float k=smoothstep(.34,.86,d);' +
      'float md=1.-smoothstep(0.,.55,distance(q,m));' +
      'float a=k*(.3+.5*md+V*.6);' +
      'vec3 col=mix(vec3(.38,.015,.035),vec3(.95,.12,.1),k*k+md*.4);' +
      'a*=smoothstep(1.15,.25,distance(uv,vec2(.5)));' +
      'gl_FragColor=vec4(col*a,a*.9);}';
    var sh = function (ty, src) { var s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    var vsh = sh(gl.VERTEX_SHADER, vs), fsh = sh(gl.FRAGMENT_SHADER, fs), pr = gl.createProgram();
    if (vsh && fsh) {
      gl.attachShader(pr, vsh); gl.attachShader(pr, fsh); gl.linkProgram(pr);
      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uS = gl.getUniformLocation(pr, 'S'), uV = gl.getUniformLocation(pr, 'V'), uM = gl.getUniformLocation(pr, 'M');
        document.body.insertBefore(cv, document.body.firstChild); html.classList.add('has-smoke');
        var scale = small || coarse ? .3 : .5, mx = .5, my = .5, tx = .5, ty = .5, ok = true, lastDraw = 0, vis = true;
        var size = function () { cv.width = Math.max(2, Math.round(innerWidth * scale)); cv.height = Math.max(2, Math.round(innerHeight * scale)); gl.viewport(0, 0, cv.width, cv.height); };
        size(); addEventListener('resize', size);
        addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }, { passive: true });
        document.addEventListener('visibilitychange', function () { vis = !document.hidden; });
        cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); ok = false; cv.remove(); html.classList.remove('has-smoke'); });
        var slow = 0;
        (function draw(now) {
          if (!ok) return; requestAnimationFrame(draw);
          if (!vis) return;
          var gap = small || coarse ? 42 : 24;
          if (now - lastDraw < gap) return;
          var dt = now - lastDraw; lastDraw = now;
          // step down by itself: if frames are slow, draw smaller; never back up
          if (dt > 70 && ++slow > 20 && scale > .22) { scale *= .75; size(); slow = 0; }
          mx += (tx - mx) * .06; my += (ty - my) * .06;
          gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, now / 1000 * 22);
          gl.uniform1f(uS, window.scrollY); gl.uniform1f(uV, Math.min(1, Math.abs(v) / 40)); gl.uniform2f(uM, mx, my);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        })(0);
      }
    }
  }

  /* ---------- 4. ember ink-wipe page transition ---------- */
  var wipe = document.createElement('div'); wipe.className = 'wipe'; wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<i></i><b></b>'; document.body.appendChild(wipe);
  var busy = false;
  function jump(id) {
    var el = id === '#top' || id === '#' ? null : document.querySelector(id);
    var y = el ? el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0) : 0;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo({ top: y, behavior: 'instant' });
    if (history.replaceState) history.replaceState(null, '', id === '#' ? location.pathname + location.search : id);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || a.getAttribute('href') === '#') return;
    var id = a.getAttribute('href');
    if (id !== '#top' && !document.querySelector(id)) return;
    e.preventDefault();
    if (busy) return; busy = true;
    var from = Math.abs(scrollY - (id === '#top' ? 0 : document.querySelector(id).offsetTop)) > innerHeight * .6;
    if (!from) { // close by: just glide
      var el = id === '#top' ? 0 : document.querySelector(id).getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0);
      if (lenis) lenis.scrollTo(el, { duration: 1.1 }); else scrollTo({ top: el, behavior: 'smooth' });
      busy = false; return;
    }
    wipe.className = 'wipe in';
    setTimeout(function () { jump(id); wipe.className = 'wipe out'; }, 430);
    setTimeout(function () { wipe.className = 'wipe'; busy = false; }, 1000);
  });
})();
