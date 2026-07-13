/* ============================================================
   UNITECH SOLUTION — dot-matrix wave
   A light grid of dots that pulse with a travelling wave and
   ripple around the cursor. Cheap, crisp and minimal. Bloom on
   the dark theme; soft blue dots on the light theme.
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("bh");
  const gl =
    canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" }) ||
    canvas.getContext("experimental-webgl");

  if (!gl) {
    canvas.style.background =
      "radial-gradient(70% 60% at 50% 50%, #eaf1fb 0%, #f4f7fc 60%, #eef2f8 100%)";
    document.documentElement.classList.add("no-webgl");
    window.dispatchEvent(new Event("bh:ready"));
    return;
  }

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

  /* ----------------------------------------------------------
     SCENE — dot-matrix wave
     ---------------------------------------------------------- */
  const FRAG_SCENE = `
    precision highp float;
    uniform vec2  iResolution;
    uniform float iTime;
    uniform vec2  iMouse;
    uniform float iScroll;
    uniform float uLight;

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*iResolution.xy) / iResolution.y;
      float aspect = iResolution.x / iResolution.y;
      float t = iTime;

      float gs = 0.055;                          // grid spacing
      vec2 gp = (floor(uv/gs) + 0.5) * gs;        // nearest grid point
      float d = length(uv - gp);

      // travelling wave across the grid
      float wave = 0.5 + 0.5*sin(gp.x*7.0 + gp.y*5.0 - t*1.6);

      // ripple around the cursor
      vec2 m = vec2(iMouse.x*0.5*aspect, iMouse.y*0.5);
      float md = length(gp - m);
      float ripple = (sin(md*16.0 - t*4.0)*0.5 + 0.5) * smoothstep(0.9, 0.0, md);

      float radius = 0.0032 + 0.0042*wave + 0.0045*ripple;
      float dot = smoothstep(radius, radius*0.5, d);
      float bright = 0.45 + 0.55*wave + 0.5*ripple;

      vec3 col;
      if(uLight > 0.5){
        float r = length(uv);
        vec3 bg = mix(vec3(0.972,0.983,0.997), vec3(0.91,0.94,0.99), smoothstep(0.0,1.3,r));
        vec3 dotCol = mix(vec3(0.34,0.55,0.95), vec3(0.00,0.68,0.96), wave);
        col = mix(bg, dotCol, dot * bright * 0.55);
      } else {
        col = vec3(0.010, 0.018, 0.045);
        vec3 dotCol = mix(vec3(0.20,0.50,1.0), vec3(0.10,0.75,1.0), wave);
        col += dotCol * dot * bright * 1.4;
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ----------------------------------------------------------
     BLUR — separable Gaussian (+ bright extract)
     ---------------------------------------------------------- */
  const FRAG_BLUR = `
    precision highp float;
    uniform sampler2D uTex;
    uniform vec2  uOutRes;
    uniform vec2  uTexel;
    uniform float uExtract;
    vec3 tap(vec2 uv){
      vec3 c = texture2D(uTex, uv).rgb;
      if(uExtract > 0.5){
        float l = max(max(c.r, c.g), c.b);
        c *= smoothstep(0.40, 0.85, l);
      }
      return c;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uOutRes;
      vec3 sum = tap(uv) * 0.227027;
      sum += tap(uv + uTexel*1.0) * 0.194595;
      sum += tap(uv - uTexel*1.0) * 0.194595;
      sum += tap(uv + uTexel*2.0) * 0.121622;
      sum += tap(uv - uTexel*2.0) * 0.121622;
      sum += tap(uv + uTexel*3.0) * 0.070270;
      sum += tap(uv - uTexel*3.0) * 0.070270;
      gl_FragColor = vec4(sum, 1.0);
    }
  `;

  /* ----------------------------------------------------------
     COMPOSITE — scene + bloom, chroma + grade + vignette
     ---------------------------------------------------------- */
  const FRAG_COMP = `
    precision highp float;
    uniform sampler2D uScene;
    uniform sampler2D uBloom;
    uniform vec2  uRes;
    uniform float uStrength;
    uniform float uLight;
    float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 c  = uv - 0.5;
      float r2 = dot(c, c);

      vec2 ca = c * (0.0020 + 0.009*r2);
      vec3 s;
      s.r = texture2D(uScene, uv + ca).r;
      s.g = texture2D(uScene, uv).g;
      s.b = texture2D(uScene, uv - ca).b;

      vec3 b = texture2D(uBloom, uv).rgb;
      vec3 col = s + b * uStrength;

      if(uLight > 0.5){
        col *= 1.0 - smoothstep(0.55, 1.25, r2) * 0.10;
        col += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
      } else {
        col *= vec3(0.94, 0.99, 1.07);
        col += vec3(0.0, 0.008, 0.028) * (1.0 - smoothstep(0.0, 0.5, col));
        col *= 1.0 - smoothstep(0.30, 1.05, r2) * 0.42;
        col = mix(col, 1.0 - exp(-col), 0.40);
        col += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ---------- GL helpers ---------- */
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader:", gl.getShaderInfoLog(s), src);
      return null;
    }
    return s;
  }
  function program(fragSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.bindAttribLocation(p, 0, "p");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("Link:", gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  const progScene = program(FRAG_SCENE);
  const progBlur = program(FRAG_BLUR);
  const progComp = program(FRAG_COMP);
  if (!progScene || !progBlur || !progComp) {
    canvas.style.background =
      "radial-gradient(70% 60% at 50% 50%, #eaf1fb 0%, #f4f7fc 60%, #eef2f8 100%)";
    window.dispatchEvent(new Event("bh:ready"));
    return;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const U = {
    scene: {
      res: gl.getUniformLocation(progScene, "iResolution"),
      time: gl.getUniformLocation(progScene, "iTime"),
      mouse: gl.getUniformLocation(progScene, "iMouse"),
      scroll: gl.getUniformLocation(progScene, "iScroll"),
      light: gl.getUniformLocation(progScene, "uLight"),
    },
    blur: {
      tex: gl.getUniformLocation(progBlur, "uTex"),
      outRes: gl.getUniformLocation(progBlur, "uOutRes"),
      texel: gl.getUniformLocation(progBlur, "uTexel"),
      extract: gl.getUniformLocation(progBlur, "uExtract"),
    },
    comp: {
      scene: gl.getUniformLocation(progComp, "uScene"),
      bloom: gl.getUniformLocation(progComp, "uBloom"),
      res: gl.getUniformLocation(progComp, "uRes"),
      strength: gl.getUniformLocation(progComp, "uStrength"),
      light: gl.getUniformLocation(progComp, "uLight"),
    },
  };

  /* ---------- framebuffers ---------- */
  function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fbo, tex, w, h };
  }
  let fbScene = null, fbA = null, fbB = null;
  function freeTarget(t) { if (!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }

  /* ---------- state ---------- */
  const DPR = Math.min(window.devicePixelRatio || 1, 1.6);
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  let renderScale = small ? 0.8 : 1.0;   // crisp dots

  const LIGHT = document.documentElement.getAttribute("data-theme") === "light";
  const uLightVal = LIGHT ? 1.0 : 0.0;
  let bloomStrength = LIGHT ? 0.0 : 1.3;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;

  function resize() {
    const w = Math.max(2, Math.floor(window.innerWidth * DPR * renderScale));
    const h = Math.max(2, Math.floor(window.innerHeight * DPR * renderScale));
    canvas.width = w; canvas.height = h;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    freeTarget(fbScene); freeTarget(fbA); freeTarget(fbB);
    const bw = Math.max(2, Math.floor(w / 2));
    const bh = Math.max(2, Math.floor(h / 2));
    fbScene = makeTarget(w, h);
    fbA = makeTarget(bw, bh);
    fbB = makeTarget(bw, bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  window.addEventListener("scroll", () => {
    const max = document.body.scrollHeight - window.innerHeight;
    scroll = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  }, { passive: true });

  /* ---------- render ---------- */
  function drawTo(target) {
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function blur(src, dst, dx, dy, spread, extract) {
    gl.useProgram(progBlur);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(U.blur.tex, 0);
    gl.uniform2f(U.blur.outRes, dst.w, dst.h);
    gl.uniform2f(U.blur.texel, (dx * spread) / src.w, (dy * spread) / src.h);
    gl.uniform1f(U.blur.extract, extract ? 1.0 : 0.0);
    drawTo(dst);
  }

  const start = performance.now();
  let running = true, frames = 0, fpsT0 = 0, tuned = false;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  function loop(now) {
    if (!running) return;
    const t = (now - start) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    // 1) scene
    gl.useProgram(progScene);
    gl.uniform2f(U.scene.res, fbScene.w, fbScene.h);
    gl.uniform1f(U.scene.time, t);
    gl.uniform2f(U.scene.mouse, mouse.x, mouse.y);
    gl.uniform1f(U.scene.scroll, scroll);
    gl.uniform1f(U.scene.light, uLightVal);
    drawTo(fbScene);

    // 2) bright extract + blur (two widening iterations)
    blur(fbScene, fbA, 1, 0, 1.2, true);
    blur(fbA, fbB, 0, 1, 1.2, false);
    blur(fbB, fbA, 1, 0, 2.6, false);
    blur(fbA, fbB, 0, 1, 2.6, false);

    // 3) composite
    gl.useProgram(progComp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbScene.tex); gl.uniform1i(U.comp.scene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fbB.tex);     gl.uniform1i(U.comp.bloom, 1);
    gl.uniform2f(U.comp.res, canvas.width, canvas.height);
    gl.uniform1f(U.comp.strength, bloomStrength);
    gl.uniform1f(U.comp.light, uLightVal);
    drawTo(null);

    if (!tuned) {
      frames++;
      if (fpsT0 === 0) fpsT0 = now;
      else if (now - fpsT0 > 1300) {
        const fps = frames / ((now - fpsT0) / 1000);
        if (fps < 45) { renderScale = Math.max(0.55, renderScale - 0.2); resize(); }
        tuned = true;
      }
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame((n) => {
    loop(n);
    requestAnimationFrame(() => window.dispatchEvent(new Event("bh:ready")));
  });
})();
