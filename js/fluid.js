/* EMBER FLUID: a real-time fluid simulation (WebGL2) that follows the pointer. Same family of effect
   as the colour trails on aaabadcode.com, but the dye is only Shadows colours: deep ruby that heats
   to ember orange the faster you move. Silent. Skipped for reduced motion, without WebGL2, or when
   the GPU cannot render to float textures; the page is complete without it. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var coarse = matchMedia('(pointer: coarse)').matches, small = innerWidth < 700;
  var cv = document.createElement('canvas'); cv.className = 'fluid'; cv.setAttribute('aria-hidden', 'true');
  var gl = cv.getContext('webgl2', { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return;
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return;
  var C = { sim: small ? 80 : 128, dye: small ? 360 : 640, render: small || coarse ? .4 : .55, dDiss: 1.7, vDiss: .45, press: .8, iter: small ? 12 : 20, curl: 22, radius: .2, force: 5200 };

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var VS = 'precision highp float;attribute vec2 aP;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;void main(){vUv=aP*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aP,0.,1.);}';
  var vsh = sh(gl.VERTEX_SHADER, VS); if (!vsh) return;
  function prog(fs) {
    var f = sh(gl.FRAGMENT_SHADER, 'precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;' + fs); if (!f) return null;
    var p = gl.createProgram(); gl.attachShader(p, vsh); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'aP'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }
  var P = {
    splat: prog('uniform sampler2D uTarget;uniform float aspect;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point;p.x*=aspect;vec3 s=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.);}'),
    adv: prog('uniform sampler2D uVel,uSrc;uniform float dt,diss;void main(){vec2 c=vUv-dt*texture2D(uVel,vUv).xy*texelSize;gl_FragColor=texture2D(uSrc,c)/(1.+diss*dt);}'),
    div: prog('uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).x,R=texture2D(uVel,vR).x,T=texture2D(uVel,vT).y,B=texture2D(uVel,vB).y;vec2 C=texture2D(uVel,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}'),
    curl: prog('uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).y,R=texture2D(uVel,vR).y,T=texture2D(uVel,vT).x,B=texture2D(uVel,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}'),
    vort: prog('uniform sampler2D uVel,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVel,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}'),
    pres: prog('uniform sampler2D uP,uDiv;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x,D=texture2D(uDiv,vUv).x;gl_FragColor=vec4((L+R+B+T-D)*.25,0.,0.,1.);}'),
    grad: prog('uniform sampler2D uP,uVel;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;vec2 v=texture2D(uVel,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}'),
    clear: prog('uniform sampler2D uT;uniform float value;void main(){gl_FragColor=value*texture2D(uT,vUv);}'),
    disp: prog('uniform sampler2D uT;void main(){vec3 c=texture2D(uT,vUv).rgb;c=min(c,vec3(1.));float a=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c,a);}')
  };
  for (var k in P) if (!P[k]) return;

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  var HF = gl.HALF_FLOAT;
  function fbo(w, h, ifmt, fmt) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, HF, null);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { t: t, f: f, w: w, h: h, tx: [1 / w, 1 / h], at: function (i) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); return i; } };
  }
  function dbl(w, h, ifmt, fmt) { var a = fbo(w, h, ifmt, fmt), b = fbo(w, h, ifmt, fmt); return { get r() { return a; }, get w() { return b; }, swap: function () { var x = a; a = b; b = x; }, tx: a.tx }; }
  var vel, dye, dv, cu, pr;
  function res(r) { var a = innerWidth / innerHeight; if (a < 1) a = 1 / a; var mn = Math.round(r), mx = Math.round(r * a); return innerWidth > innerHeight ? { w: mx, h: mn } : { w: mn, h: mx }; }
  function init() {
    var s = res(C.sim), d = res(C.dye);
    vel = dbl(s.w, s.h, gl.RG16F, gl.RG); dye = dbl(d.w, d.h, gl.RGBA16F, gl.RGBA);
    dv = fbo(s.w, s.h, gl.R16F, gl.RED); cu = fbo(s.w, s.h, gl.R16F, gl.RED); pr = dbl(s.w, s.h, gl.R16F, gl.RED);
    cv.width = Math.max(2, Math.round(innerWidth * C.render)); cv.height = Math.max(2, Math.round(innerHeight * C.render));
  }
  try { init(); } catch (e) { return; }
  if (gl.getError() !== gl.NO_ERROR) return;
  document.body.appendChild(cv); document.documentElement.classList.add('has-fluid');
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { try { init(); } catch (e) {} }, 250); });

  function use(p) { gl.useProgram(p.p); return p.u; }
  function blit(target) {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
    else { gl.viewport(0, 0, cv.width, cv.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function splat(x, y, dx, dy, col, rad) {
    var u = use(P.splat); gl.uniform2fv(u.texelSize, vel.tx);
    gl.uniform1i(u.uTarget, vel.r.at(0)); gl.uniform1f(u.aspect, cv.width / cv.height); gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, rad / 100 * (cv.width > cv.height ? 1 : cv.height / cv.width)); blit(vel.w); vel.swap();
    gl.uniform2fv(u.texelSize, dye.tx); gl.uniform1i(u.uTarget, dye.r.at(0)); gl.uniform3f(u.color, col[0], col[1], col[2]); blit(dye.w); dye.swap();
  }
  function step(dt) {
    gl.disable(gl.BLEND);
    var u = use(P.curl); gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uVel, vel.r.at(0)); blit(cu);
    u = use(P.vort); gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uVel, vel.r.at(0)); gl.uniform1i(u.uCurl, cu.at(1)); gl.uniform1f(u.curl, C.curl); gl.uniform1f(u.dt, dt); blit(vel.w); vel.swap();
    u = use(P.div); gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uVel, vel.r.at(0)); blit(dv);
    u = use(P.clear); gl.uniform1i(u.uT, pr.r.at(0)); gl.uniform1f(u.value, C.press); blit(pr.w); pr.swap();
    u = use(P.pres); gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uDiv, dv.at(0));
    for (var i = 0; i < C.iter; i++) { gl.uniform1i(u.uP, pr.r.at(1)); blit(pr.w); pr.swap(); }
    u = use(P.grad); gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uP, pr.r.at(0)); gl.uniform1i(u.uVel, vel.r.at(1)); blit(vel.w); vel.swap();
    u = use(P.adv); gl.uniform2fv(u.texelSize, vel.tx); var vi = vel.r.at(0); gl.uniform1i(u.uVel, vi); gl.uniform1i(u.uSrc, vi); gl.uniform1f(u.dt, dt); gl.uniform1f(u.diss, C.vDiss); blit(vel.w); vel.swap();
    gl.uniform2fv(u.texelSize, vel.tx); gl.uniform1i(u.uVel, vel.r.at(0)); gl.uniform1i(u.uSrc, dye.r.at(1)); gl.uniform1f(u.diss, C.dDiss); blit(dye.w); dye.swap();
  }
  function draw() { var u = use(P.disp); gl.uniform2fv(u.texelSize, dye.tx); gl.uniform1i(u.uT, dye.r.at(0)); blit(null); }

  /* Shadows colour: deep ruby, heating to ember orange with speed. Nothing else. */
  var RUBY = [.62, .02, .05], HOT = [1, .22, .04], EMB = [1, .5, .12];
  function colour(speed) {
    var h = Math.min(1, speed * 7), a = RUBY, b = h > .6 ? EMB : HOT, m = h > .6 ? (h - .6) / .4 : h / .6, k = .2 + h * .12;
    return [(a[0] + (b[0] - a[0]) * m) * k, (a[1] + (b[1] - a[1]) * m) * k, (a[2] + (b[2] - a[2]) * m) * k];
  }
  var lx = null, ly = null, last = 0, lastSplat = 0;
  window.addEventListener('pointermove', function (e) {
    var x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
    if (lx === null) { lx = x; ly = y; return; }
    var dx = x - lx, dy = y - ly; lx = x; ly = y;
    var sp = Math.sqrt(dx * dx + dy * dy); if (sp < .0004) return;
    splat(x, y, dx * C.force, dy * C.force, colour(sp), C.radius * (.75 + Math.min(.9, sp * 10)));
    lastSplat = performance.now();
  }, { passive: true });
  addEventListener('pointerdown', function (e) {
    var x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
    for (var i = 0; i < 5; i++) { var a = i / 5 * 6.283 + Math.random(); splat(x, y, Math.cos(a) * 900, Math.sin(a) * 900, [.2, .05, .012], C.radius * .8); }
    lastSplat = performance.now(); lx = x; ly = y;
  }, { passive: true });
  addEventListener('pointerup', function () { if (coarse) lx = null; }, { passive: true });
  window.shadowsFluidSplat = function (x, y, n) { for (var i = 0; i < (n || 4); i++) { var a = Math.random() * 6.283; splat(x, 1 - y, Math.cos(a) * 1200, Math.sin(a) * 1200, [.28, .06, .015], C.radius * .9); } lastSplat = performance.now(); };
  var introEl = document.getElementById('intro');
  (function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - lastSplat > 9000) return;
    var dt = Math.min((now - last) / 1000, .0167); last = now; if (dt <= 0) return;
    cv.style.zIndex = introEl && !introEl.hidden ? 101 : '';
    step(dt); draw();
  })(0);
})();
