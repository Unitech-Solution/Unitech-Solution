/* ============================================================
   FIRST SLIDE + NAV BAR — from the unitech-landing-page project
   (Downloads\unitech-landing-page), converted from React to plain JS.
   The nav (section 4: sliding tab, current section, mobile drawer) and
   three hero behaviours, each a port of the original:
   1. the panel illustration "wakes up" (useInstrumentWake.ts): it starts
      as a spreadsheet and reorganises itself into a dashboard;
   2. the title types itself once (HeroTitulo.tsx + kokonut Typewriter);
   3. the gradient waves behind it (React Bits GradientWaves.tsx — same
      shader; the `ogl` helper library replaced by plain WebGL2).
   Everything starts when this site's preloader hands over (main.js →
   uns:ready), so the entrance is seen rather than played under it.
   Styles: hero-lp.css.
   ============================================================ */
(function () {
  "use strict";

  const hero = document.getElementById("hero");
  if (!hero || !hero.classList.contains("lp-hero")) return;
  const root = document.documentElement;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  // index.html armed the sleeping panel and left a safety timer: from here on this file is responsible
  clearTimeout(window.__lpDisarm);

  /* ---------- 1. the panel wakes up ---------- */
  const instruments = Array.from(hero.querySelectorAll("[data-inst]"));
  const wakeAll = () => instruments.forEach((el) => el.classList.add("is-awake"));
  function startWake() {
    if (!instruments.length || reduceMQ.matches || !("IntersectionObserver" in window) || root.getAttribute("data-wake") !== "armed") {
      root.removeAttribute("data-wake");
      wakeAll();
      return;
    }
    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-awake");
          observer.unobserve(entry.target);          // lights up once and stays
        });
      }, { rootMargin: "0px 0px -8% 0px" });
    } catch (e) {
      root.removeAttribute("data-wake");
      wakeAll();
      return;
    }
    // observe two frames later: the sleeping state has to be painted, or the browser skips the transition
    requestAnimationFrame(() => requestAnimationFrame(() => instruments.forEach((el) => observer.observe(el))));
    setTimeout(wakeAll, 4000);                         // safety net: nothing stays asleep
    reduceMQ.addEventListener && reduceMQ.addEventListener("change", (e) => { if (e.matches) wakeAll(); });
  }

  /* ---------- 2. the title types itself, once ---------- */
  // The whole title is always in the HTML (search engines, no-JS, screen readers via aria-label); the effect
  // only reveals it, so its height and line breaks are final from the first letter and nothing below moves.
  const title = document.getElementById("lpTitle");
  let segments = [], fullText = "", originalHTML = "";
  if (title) {
    originalHTML = title.innerHTML;
    segments = Array.from(title.childNodes).map((n) => ({
      text: n.textContent,
      style: n.nodeType === 1 ? n.getAttribute("style") : null,
    }));
    fullText = segments.map((s) => s.text).join("");
    title.setAttribute("aria-label", fullText);
    if (root.getAttribute("data-wake") === "armed" && !reduceMQ.matches) title.setAttribute("data-tw", "espera");
    else title.setAttribute("data-tw", "feito");
  }
  // draws the first n characters; the rest is present but invisible, the cursor sits where typing is
  function drawTitle(n) {
    title.textContent = "";
    let start = 0, cursorSeg = segments.length - 1;
    for (let i = 0, end = 0; i < segments.length; i++) { end += segments[i].text.length; if (n <= end) { cursorSeg = i; break; } }
    segments.forEach((s, i) => {
      const seg = document.createElement("span");
      if (s.style) seg.setAttribute("style", s.style);
      const visible = Math.max(0, Math.min(s.text.length, n - start));
      start += s.text.length;
      seg.appendChild(document.createTextNode(s.text.slice(0, visible)));
      const rest = s.text.slice(visible);
      if (i === cursorSeg) {
        const cur = document.createElement("span");
        cur.className = "tw-cursor";
        cur.setAttribute("aria-hidden", "true");
        seg.appendChild(cur);
      }
      // a zero-width word joiner after the cursor at the very end keeps text-wrap:balance from re-breaking lines
      if (rest || (i === cursorSeg && i === segments.length - 1)) {
        const hidden = document.createElement("span");
        hidden.style.visibility = "hidden";
        hidden.textContent = rest || "⁠";
        seg.appendChild(hidden);
      }
      title.appendChild(seg);
    });
  }
  function typeTitle() {
    if (!title) return;
    if (title.getAttribute("data-tw") !== "espera") return;    // reduced motion / not armed: shown whole
    const SPEED = 30;
    // the same "human" variation as the original: 10% hesitations, 10% bursts, otherwise ±40%
    const delay = () => {
      const r = Math.random();
      if (r < 0.1) return SPEED * 2;
      if (r > 0.9) return SPEED * 0.5;
      return SPEED * (0.6 + Math.random() * 0.8);
    };
    let n = 0;
    title.setAttribute("data-tw", "escreve");
    drawTitle(0);
    const step = () => {
      n++;
      drawTitle(n);
      if (n < fullText.length) { setTimeout(step, delay()); return; }
      title.setAttribute("data-tw", "cursor");          // the cursor blinks for a moment after the last letter…
      setTimeout(() => {                                // …and leaves: nothing keeps moving
        title.innerHTML = originalHTML;
        title.setAttribute("data-tw", "feito");
      }, 1500);
    };
    setTimeout(step, 250);
  }

  /* ---------- 3. the waves ---------- */
  const VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  // The Unitech settings of the original (HeroWaves.tsx): the symbol's gradient on every wave, from Deep
  // Indigo in the trough to Sky Blue on the crest; the horizon dissolves into the white of the page; an
  // almost grazing camera (tilt 1.4); weaker on narrow screens, where the hero is tall; half resolution
  // (smooth gradients do not need more and the GPU work drops to a quarter); no grain, no mouse.
  function startWaves() {
    const box = document.getElementById("heroOndas");
    if (!box) return;
    const canvas = document.createElement("canvas");
    let gl;
    try { gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) { gl = null; }
    if (!gl) return;                                   // no WebGL2: the hero simply stays white
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return; }                           // a decorative background that fails takes nothing with it
    gl.useProgram(prog);
    const buf = gl.createBuffer();                     // one triangle that covers the whole screen
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (name) => gl.getUniformLocation(prog, name);
    const set1 = (name, v) => gl.uniform1f(U(name), v);
    set1("uSpeed", 0.3); set1("uAmplitude", 2.5); set1("uWaveScale", 0.6); set1("uWaveRatio", 0.9);
    set1("uSwell", 35); set1("uTurbulence", 20); set1("uTilt", 1.4); set1("uZoom", 1.0); set1("uHeight", 0);
    set1("uSteps", 40); set1("uBrightness", 1.0);
    gl.uniform3fv(U("uHorizonColor"), rgb("#FFFFFF"));
    gl.uniform3fv(U("uWaveColor"), rgb("#2B3990"));
    gl.uniform3fv(U("uCrestColor"), rgb("#27A9E1"));
    const uTime = U("iTime"), uRes = U("iResolution");
    gl.clearColor(0, 0, 0, 0);

    const narrowMQ = window.matchMedia("(max-width: 899.98px)");
    const setStrength = () => { set1("uFogDepth", narrowMQ.matches ? 28 : 34); set1("uOpacity", narrowMQ.matches ? 0.75 : 0.9); };
    setStrength();

    const t0 = performance.now();
    const draw = (now) => {
      gl.uniform1f(uTime, ((now || performance.now()) - t0) * 0.001);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const setSize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 0.5);
      canvas.width = Math.max(1, Math.floor(Math.max(1, r.width) * dpr));
      canvas.height = Math.max(1, Math.floor(Math.max(1, r.height) * dpr));
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
      draw();
    };
    box.appendChild(canvas);
    setSize();
    if (window.ResizeObserver) new ResizeObserver(setSize).observe(box);
    else window.addEventListener("resize", setSize, { passive: true });
    if (narrowMQ.addEventListener) narrowMQ.addEventListener("change", () => { setStrength(); draw(); });

    // only animate while the slide is on screen, the tab is visible and motion is welcome
    let raf = 0, onScreen = true;
    const loop = (now) => { draw(now); raf = requestAnimationFrame(loop); };
    const tryStart = () => { if (!reduceMQ.matches && onScreen && !document.hidden && !raf) raf = requestAnimationFrame(loop); };
    const tryStop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? tryStart() : tryStop(); }).observe(box);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? tryStop() : tryStart()));
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", () => (reduceMQ.matches ? (tryStop(), draw()) : tryStart()));
    tryStart();
    requestAnimationFrame(() => box.classList.add("is-on"));   // fades in, after the panel has woken
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); tryStop(); box.classList.remove("is-on"); });
  }

  /* ---------- 4. the nav bar (their Navbar.tsx + Smooth Tab + useSeccaoAtual + useMobileMenu) ---------- */
  (function nav() {
    const bar = document.getElementById("nav");
    if (!bar || !bar.classList.contains("lp-nav")) return;
    const BAR = 72;                                      // the fixed bar: what is under it does not count as seen

    // Desktop tabs: a cyan background slides to the section on screen, and follows the pointer and the focus.
    // On a click it goes straight to the destination and stays there until the page has finished scrolling,
    // or it would hop through every section passing by on the way.
    const tabsBox = document.getElementById("navTabs");
    const pill = tabsBox && tabsBox.querySelector(".nav-tab-fundo");
    const tabs = tabsBox ? Array.from(tabsBox.querySelectorAll(".nav-tab")) : [];
    let onScreen = null, chosen = null, preview = null, chosenT = 0;
    // spring of the original (stiffness 400, damping 30) on x, y, width, height
    const S = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, tx: 0, ty: 0, tw: 0, th: 0, raf: 0, placed: false };
    function springStep(dtMs) {
      const dt = Math.min(0.032, dtMs / 1000), n = Math.ceil(dt / 0.004), h = dt / n;
      for (let i = 0; i < n; i++) for (const k of ["x", "y", "w", "h"]) {
        const v = "v" + k, t = "t" + k;
        S[v] += (-400 * (S[k] - S[t]) - 30 * S[v]) * h;
        S[k] += S[v] * h;
      }
    }
    function paintPill() { pill.style.width = S.w + "px"; pill.style.height = S.h + "px"; pill.style.transform = "translate(" + S.x + "px," + S.y + "px)"; }
    function animate(last) {
      S.raf = requestAnimationFrame((now) => {
        springStep(now - last);
        paintPill();
        const moving = ["x", "y", "w", "h"].some((k) => Math.abs(S[k] - S["t" + k]) > 0.2 || Math.abs(S["v" + k]) > 0.5);
        if (moving) animate(now);
        else { S.raf = 0; S.x = S.tx; S.y = S.ty; S.w = S.tw; S.h = S.th; paintPill(); }
      });
    }
    function update() {
      if (!pill) return;
      const selected = chosen || onScreen;
      const target = preview || selected;
      tabs.forEach((a) => {
        a.classList.toggle("nav-tab-ativa", a.dataset.sec === target);
        if (a.dataset.sec === selected) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      const el = target && tabs.find((a) => a.dataset.sec === target);
      if (!el) { pill.classList.remove("is-on"); return; }
      const r = el.getBoundingClientRect(), box = tabsBox.getBoundingClientRect();
      S.tx = r.left - box.left - tabsBox.clientLeft; S.ty = r.top - box.top - tabsBox.clientTop; S.tw = r.width; S.th = r.height;
      if (!S.placed || reduceMQ.matches || !pill.classList.contains("is-on")) {   // first time (or reduced motion): no slide
        S.placed = true; S.x = S.tx; S.y = S.ty; S.w = S.tw; S.h = S.th; S.vx = S.vy = S.vw = S.vh = 0; paintPill();
      } else if (!S.raf) animate(performance.now());
      pill.classList.add("is-on");
    }
    tabs.forEach((a) => {
      a.addEventListener("mouseenter", () => { preview = a.dataset.sec; update(); });
      a.addEventListener("focus", () => { preview = a.dataset.sec; update(); });
      a.addEventListener("click", () => {
        chosen = a.dataset.sec; preview = null; update();
        clearTimeout(chosenT);
        chosenT = setTimeout(() => { chosen = null; update(); }, 1600);   // the smooth scroll takes 1.4 s
      });
    });
    if (tabsBox) {
      tabsBox.addEventListener("mouseleave", () => { preview = null; update(); });
      tabsBox.addEventListener("focusout", (e) => { if (!tabsBox.contains(e.relatedTarget)) { preview = null; update(); } });
      // the widths change when the font arrives
      if (window.ResizeObserver) new ResizeObserver(() => { S.placed = false; update(); }).observe(tabsBox);
    }

    // Which section is on screen: the band between the bar and 45% of the screen; the section covering the line
    // just under the bar wins, otherwise the first one that has entered the band. Read from the geometry on every
    // scroll (at most once a frame), so the result only depends on where the page is.
    const sections = tabs.map((a) => document.getElementById(a.dataset.sec)).filter(Boolean)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    let frame = 0;
    function read() {
      frame = 0;
      const bottom = window.innerHeight * 0.45, line = BAR + 2;
      let pick = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.bottom <= BAR || r.top >= bottom) continue;
        if (r.top <= line && r.bottom > line) { pick = s.id; break; }
        if (pick === null) pick = s.id;
      }
      if (pick !== onScreen) { onScreen = pick; update(); }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(read); };
    if (sections.length) {
      read();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    }

    // Below 900px: the drawer. Its state lives in the `hidden` attribute (the slide uses @starting-style).
    const toggle = bar.querySelector("[data-menu-toggle]");
    const menu = bar.querySelector("[data-mobile-menu]");
    const iconOpen = bar.querySelector('[data-menu-icon="open"]');
    const iconClose = bar.querySelector('[data-menu-icon="close"]');
    if (toggle && menu && iconOpen && iconClose) {
      const setOpen = (open) => {
        menu.hidden = !open;
        iconOpen.hidden = open;
        iconClose.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      };
      toggle.addEventListener("click", () => setOpen(menu.hidden !== false));
      menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setOpen(false); toggle.focus(); } });
      const desktop = window.matchMedia("(min-width: 900px)");
      if (desktop.addEventListener) desktop.addEventListener("change", () => setOpen(false));
    }
  })();

  /* ---------- start ---------- */
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    startWake();
    typeTitle();
    startWaves();
  }
  // after the site preloader hands over (main.js → uns:ready); without it (motion off), at once; and a fallback
  window.addEventListener("uns:ready", boot);
  if (window.__unsReady) boot();
  if (root.classList.contains("motion-off") || !document.getElementById("preloader")) boot();
  setTimeout(boot, 5200);
})();
