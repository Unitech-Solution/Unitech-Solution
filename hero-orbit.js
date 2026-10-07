/* ============================================================
   HERO ORBIT — first slide. The developer stands in the middle and
   pictures of the projects we built turn round him on a 3D ring: the
   ones at the back pass behind his body, the ones in front pass in
   front of it. The ring turns one project at a time: each picture docks
   in front of him (just under his open hands), grows, and a small meter
   names it and counts the hold before the next one comes round.

   Plain CSS 3D (perspective + rotateY/translateZ), no extra library:
   the page already ships GSAP, and a WebGL ring (Three.js ≈ 650 KB)
   would cost far more than the effect is worth on a phone.

   The pictures never move individually: one transform on the list
   turns the whole ring, so a frame costs one transform plus a handful
   of opacity updates.

   The projects come from the cards in #projetos — add a card there and
   it joins the ring. Each picture is loaded from a small copy in
   assets/img/ring/<same name>.webp (≈ 20 KB instead of ≈ 160 KB); when
   that copy does not exist the card's own image is used.
   ============================================================ */
(function () {
  "use strict";

  const hero = document.querySelector(".uhero");
  const scene = document.getElementById("orbitScene");
  const stage = document.getElementById("orbitStage");
  const list = document.getElementById("orbitWords");
  const dev = document.getElementById("orbitDev");
  const notch = document.getElementById("orbitNotch");
  const meter = document.getElementById("orbitMeter");
  const nowEl = document.getElementById("orbitNow");
  const idxEl = document.getElementById("orbitIdx");
  const nameEl = document.getElementById("orbitName");
  const totalEl = document.getElementById("orbitTotal");
  const form = document.getElementById("askForm");
  if (!hero || !scene || !stage || !list) return;

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const TAU = Math.PI * 2, DEG = 180 / Math.PI;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap = (a) => a - TAU * Math.round(a / TAU);                      // any angle → (−π, π]
  const nearest = (base, ref) => base + TAU * Math.round((ref - base) / TAU);   // the turn of `base` closest to `ref`
  const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
  const pad = (n) => String(n).padStart(2, "0");

  const HOLD = 2400;           // ms a project stays in front before the ring steps on
  const HOLD_TOUCHED = 5200;   // longer pause after the visitor picked one
  const WAIT_IMAGES = 3000;    // the entrance does not wait longer than this for the pictures

  // where the ring meets the developer, as fractions of his height from the top of his head
  // (measured on assets/img/dev2-hero.webp — re-measure if the photo changes)
  const HANDS = 0.71;          // just under his open hands, and clear of the logo on his chest: the top edge of the picture in front of him
  const CHEST = 0.40;          // where the pictures passing behind him sit: level with his chest
  const SCALE = 0.36;          // height of the picture in front, relative to him (a laptop next to a person)

  /* ---------- 1. the projects: every card with a picture ---------- */
  const items = [];
  document.querySelectorAll(".strip-card").forEach((card) => {
    const pic = card.querySelector("img");
    const p = card.querySelector(".strip-card__meta p:first-child");        // "01 Yentelelo"
    if (!pic || !p) return;
    const src = pic.getAttribute("src");
    const name = (p.lastChild ? p.lastChild.textContent : p.textContent).replace(/\s+/g, " ").trim();
    if (!src || !name) return;

    const li = document.createElement("li");
    li.className = "orbit__item";
    li.dataset.i = items.length;
    const img = new Image();
    img.className = "orbit__pic";
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    img.onerror = () => { img.onerror = null; img.src = src; };              // no small copy yet → the card's own image
    img.addEventListener("load", () => img.classList.add("is-in"));          // fades in instead of popping in
    img.src = "assets/img/ring/" + src.split("/").pop().replace(/\.\w+$/, ".webp");
    const back = new Image();                                                // what the device shows from behind
    back.className = "orbit__back";
    back.alt = "";
    back.draggable = false;
    back.addEventListener("load", () => li.classList.add("has-back"));
    img.addEventListener("load", () => paintBack(img, back));
    li.append(img, back);
    list.appendChild(li);
    items.push({ li, img, name, ar: 1.5, w: 0, slot: 0, half: 0, a: -1, back: null });
  });
  const N = items.length;
  if (totalEl) totalEl.textContent = pad(N);

  // The far side of a device: its outline in brushed grey, like the back of a lid or of a phone.
  // Painted once on a scratch canvas and handed over as a plain image: a canvas left in the ring
  // would be its own GPU layer, added and removed every time a device turns its back (it stuttered).
  function paintBack(img, out) {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w) return;
    const cv = document.createElement("canvas");
    const k = Math.min(1, 260 / h);
    cv.width = Math.round(w * k);
    cv.height = Math.round(h * k);
    const x = cv.getContext("2d");
    x.drawImage(img, 0, 0, cv.width, cv.height);
    x.globalCompositeOperation = "source-in";       // keep the shape, replace what is inside it
    const g = x.createLinearGradient(0, 0, cv.width * 0.6, cv.height);
    g.addColorStop(0, "#c2cad8");
    g.addColorStop(0.45, "#9aa5b8");
    g.addColorStop(1, "#6f7b90");
    x.fillStyle = g;
    x.fillRect(0, 0, cv.width, cv.height);
    // a soft sheen across the metal and a darker foot, so it reads as a solid object rather than a flat cut-out
    x.globalCompositeOperation = "source-atop";
    const s = x.createLinearGradient(0, 0, cv.width, 0);
    s.addColorStop(0.15, "rgba(255,255,255,0)");
    s.addColorStop(0.42, "rgba(255,255,255,0.28)");
    s.addColorStop(0.6, "rgba(255,255,255,0)");
    x.fillStyle = s;
    x.fillRect(0, 0, cv.width, cv.height);
    const f = x.createLinearGradient(0, cv.height * 0.78, 0, cv.height);
    f.addColorStop(0, "rgba(20,30,52,0)");
    f.addColorStop(1, "rgba(20,30,52,0.35)");
    x.fillStyle = f;
    x.fillRect(0, 0, cv.width, cv.height);
    try {
      cv.toBlob((blob) => {
        if (!blob) return;
        if (out.src) URL.revokeObjectURL(out.src);
        out.src = URL.createObjectURL(blob);
      }, "image/png");
    } catch (_) { /* picture from another origin: no back view, the front stays mirrored */ }
  }

  // His outline (a small alpha map of the photo). Pointer events go through him to the pictures, so this is
  // how a click on his body is told apart from a click on a picture that shows beside him.
  let devMap = null;
  function mapDev() {
    if (!dev || !dev.naturalWidth) return;
    const w = 96, h = Math.round(96 * dev.naturalHeight / dev.naturalWidth);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const x = cv.getContext("2d", { willReadFrequently: true });
    x.drawImage(dev, 0, 0, w, h);
    try { devMap = { w, h, a: x.getImageData(0, 0, w, h).data }; } catch (_) { devMap = null; }
  }
  function onDev(cx, cy) {
    if (!devMap) return false;
    const r = dev.getBoundingClientRect();
    const u = Math.floor((cx - r.left) / r.width * devMap.w), v = Math.floor((cy - r.top) / r.height * devMap.h);
    return u >= 0 && v >= 0 && u < devMap.w && v < devMap.h && devMap.a[(v * devMap.w + u) * 4 + 3] > 60;
  }
  // a picture passing behind him, at a point where his body covers it
  const hiddenByDev = (li, e) => !!li && li.classList.contains("is-back") && onDev(e.clientX, e.clientY);
  if (dev) {
    if (dev.complete && dev.naturalWidth) mapDev();
    dev.addEventListener("load", mapDev);
  }

  /* ---------- 2. geometry ---------- */
  let R = 400, P = 1600, tiltDeg = 12, kFront = 1.3, devTop = 0, lastWidth = -1;
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    lastWidth = vw;
    const phone = vw <= 600;
    const pop = phone ? 1.1 : 1.14;                   // how much the project in front grows (in place, on the rail)
    list.style.setProperty("--pop", pop);
    items.forEach((it) => { if (it.img.naturalWidth) it.ar = it.img.naturalWidth / it.img.naturalHeight; });
    const devAR = dev && dev.naturalWidth ? dev.naturalWidth / dev.naturalHeight
      : dev ? (+dev.getAttribute("width") / +dev.getAttribute("height")) || 1.19 : 1.19;

    // room between the menu and the idea field
    const cs = getComputedStyle(hero);
    const ask = hero.querySelector(".uhero__ask");
    const rowGap = parseFloat(getComputedStyle(hero.querySelector(".uhero__grid")).rowGap) || 0;
    const room = vh - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (ask ? ask.offsetHeight : 100) - rowGap;
    const meterH = meter && getComputedStyle(meter).display !== "none" ? 40 : 0;

    // screen-y of a stage point straight ahead (x = 0) for a tilt of t rad
    const proj = (y, z, t) => (y * Math.cos(t) + z * Math.sin(t)) * P / (P - (z * Math.cos(t) - y * Math.sin(t)));
    let ih, sep, rail, t, top, bottom, h;
    // the developer is as tall as the room allows (and no wider than the screen); everything else follows from him
    let H = Math.min((room - meterH - 10) / (HANDS + SCALE), vw * 0.96 / devAR, 700);
    for (;;) {
      ih = clamp(SCALE * H / (pop * 1.32), 44, vw * 0.3);
      items.forEach((it) => { it.w = ih * it.ar; });
      const sum = items.reduce((m, it) => m + it.w, 0);
      // radius: the pictures side by side with a little air, always well clear of his open hands, and wide
      // enough to read as a ring around him (a wide, flat ring is also what an eye-level photo calls for)
      R = Math.max(150, (sum + N * ih * (phone ? 0.34 : 0.42)) / TAU, H * devAR * 0.62, Math.min(vw * 0.31, H * 1.25));
      sep = N ? (TAU * R - sum) / N : 0;              // space between two pictures
      P = R * 4;                                      // perspective: pictures in front ≈ 1.3× the ones at the back
      rail = ih / 2 + 8;                              // the rail runs just under the pictures
      // tilt: the picture in front sits just under his hands, the ones behind him pass at chest height
      t = 12 / DEG;
      for (let n = 0; n < 4; n++) {
        const kF = P / (P - R * Math.cos(t)), kB = P / (P + R * Math.cos(t));
        const drop = (HANDS - CHEST) * H + ih * pop * kF / 2;     // from the pictures behind him down to the ones in front
        t = Math.asin(clamp(drop / (kF + kB) / R, Math.sin(6 / DEG), Math.sin(27 / DEG)));
      }
      devTop = proj(-ih / 2 * pop, R, t) - HANDS * H;             // top of his head, from the ring centre
      top = -Math.min(devTop, proj(-ih / 2, -R, t));
      bottom = Math.max(proj(ih / 2 * pop, R, t) + ih * 0.12, proj(rail + 6, R, t));   // picture in front (+ its shadow), rail marker
      h = Math.ceil(top + bottom + meterH + 10);
      if (h <= room || H <= 140) break;
      H *= 0.96;
    }
    tiltDeg = t * DEG;

    if (dev) {
      dev.style.width = (H * devAR).toFixed(1) + "px";
      dev.style.height = H.toFixed(1) + "px";
    }
    scene.style.perspective = P.toFixed(0) + "px";
    scene.style.setProperty("--R", R.toFixed(1) + "px");
    hero.style.setProperty("--rail", rail.toFixed(1) + "px");
    let acc = 0;
    items.forEach((it) => {
      it.slot = (acc + it.w / 2) / R;                 // angle of the middle of the picture
      it.half = (it.w + sep) / 2 / R;                 // half of the arc it owns
      it.li.style.width = it.w.toFixed(1) + "px";
      it.li.style.height = ih.toFixed(1) + "px";
      it.li.style.setProperty("--ang", (it.slot * DEG).toFixed(3) + "deg");
      it.a = -1;                                      // rewrite its opacity on the next frame
      acc += it.w + sep;
    });

    kFront = P / (P - R * Math.cos(t));
    hero.style.setProperty("--orbit-h", h + "px");
    scene.style.setProperty("--oy", Math.round((top - bottom - meterH) / 2) + "px");   // ring centre, from the middle of the scene
    scene.style.setProperty("--ob", Math.round(bottom) + "px");                        // lowest point of the ring, from its centre

    if (N) {                                          // slots moved: keep the current project in front
      target = nearest(-items[cur].slot, th);
      if (!intro && !dragging) { th = target; vel = 0; }
    }
  }

  /* ---------- 3. state + one frame ---------- */
  let th = 0, vel = 0, target = 0, cur = 0;           // ring angle, its speed, where it is heading, which project that is
  let intro = false, atRest = true, appear = 0, t0 = 0;
  let dragging = false, touched = false;
  let mx = 0, my = 0, px = 0, py = 0;                 // pointer parallax (target / eased)
  let lit = -1, focus = -1;
  let sayOpen = null;                                 // whose statement is open: "left", "right" or null (section 7)
  let hinted = false;                                 // the palms' one-off "try me" pulse has been played
  let lastListT = "", lastStageT = "", lastDevT = "";

  // 1 facing us → a little hazy on the far side (they are real objects behind him, not ghosts)
  const depthAlpha = (a) => 0.62 + 0.38 * Math.pow((Math.cos(a) + 1) / 2, 1.5);

  function setLit(i) {
    if (i === lit) return;
    if (lit >= 0) items[lit].li.classList.remove("is-lit");
    lit = i;
    if (i < 0) return;
    items[i].li.classList.add("is-lit");
    if (notch && !reduce) {                           // the rail marker answers each docking
      notch.classList.remove("is-pulse");
      void notch.offsetWidth;
      notch.classList.add("is-pulse");
    }
  }
  function setFocus(i) {
    if (i === focus) return;
    focus = i;
    if (idxEl) idxEl.textContent = pad(i + 1);
    if (nameEl) nameEl.textContent = items[i].name;
    if (!nowEl || reduce) return;
    nowEl.classList.remove("is-flip");
    void nowEl.offsetWidth;
    nowEl.classList.add("is-flip");
  }

  function render() {
    const lt = "rotateY(" + (th * DEG).toFixed(3) + "deg)";
    if (lt !== lastListT) { lastListT = lt; list.style.transform = lt; }

    let front = 0, best = 9;
    for (let i = 0; i < N; i++) {
      const it = items[i];
      const a = wrap(th + it.slot);
      const off = Math.abs(a) - it.half;              // < 0 → this picture's arc covers the front
      if (off < best) { best = off; front = i; }
      // Depth fade. Opacity only, so the compositor fades the pictures without repainting them;
      // kept just under 1 so a picture never gains or loses its compositing effect on the way round.
      const al = Math.min(0.99, Math.round(depthAlpha(a) * appear * 50) / 50);
      if (al !== it.a) { it.a = al; it.li.style.opacity = al; }
      const away = Math.cos(a) < 0;                   // facing away: show the back of the device (it swaps while edge-on)
      if (away !== it.back) { it.back = away; it.li.classList.toggle("is-back", away); }
    }
    if (N) {
      setFocus(front);
      // highlight the picture in front once the ring has (almost) come to rest — or follow the finger while dragging
      setLit(appear > 0.85 && (dragging || Math.abs(vel) < 0.7) ? front : -1);
    }

    const tx = -tiltDeg + py * 2, ry = px * 4.5;
    const sT = "rotateX(" + tx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
    if (sT !== lastStageT) { lastStageT = sT; stage.style.transform = sT; }
    // the developer counter-rotates so he stays upright, facing the screen, while the ring leans
    if (dev) {
      const dT = "rotateY(" + (-ry).toFixed(2) + "deg) rotateX(" + (-tx).toFixed(2) + "deg) translate(-50%, " + devTop.toFixed(1) + "px)";
      if (dT !== lastDevT) { lastDevT = dT; dev.style.transform = dT; }
    }
  }

  let running = false, visible = true, last = 0;
  function frame(now) {
    if (!running) return;
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    if (t0) {
      appear = easeOut3(clamp((now - t0) / 1500, 0, 1));
      if (appear >= 1) t0 = 0;
    }
    if (!dragging && !atRest) {
      if (reduce) { th = target; vel = 0; }
      else {
        // spring towards the project that should face the visitor (softer for the entrance)
        const k = intro ? 7 : 30, c = intro ? 2 * Math.sqrt(7) : 2 * 0.82 * Math.sqrt(30);
        const n = Math.ceil(dt / 0.008), h = dt / n;
        for (let s = 0; s < n; s++) {
          vel += (-k * (th - target) - c * vel) * h;
          th += vel * h;
        }
      }
      if (Math.abs(th - target) < 0.0008 && Math.abs(vel) < 0.006) {
        th = target; vel = 0; atRest = true; intro = false;
        hero.classList.add("is-live");                // meter + rail marker come in after the first docking
        if (!hinted) { hinted = true; hintHands(); }
        arm(touched ? HOLD_TOUCHED : HOLD);
        touched = false;
      }
    }
    const e = 1 - Math.exp(-dt * 4);
    px += (mx - px) * e;
    py += (my - py) * e;
    render();

    if (!dragging && atRest && !t0 && Math.abs(mx - px) < 0.002 && Math.abs(my - py) < 0.002) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function kick() {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  /* ---------- 4. stepping ---------- */
  let holdTimer = null, booted = false, started = false;
  function disarm() {
    clearTimeout(holdTimer);
    holdTimer = null;
    if (meter) meter.classList.remove("is-run");
  }
  // count the hold on the meter, then bring the next project round
  function arm(ms) {
    disarm();
    if (reduce || !started || N < 2 || !visible || document.hidden || dragging || sayOpen) return;   // a statement is being read: wait
    if (meter) {
      meter.style.setProperty("--hold", ms + "ms");
      void meter.offsetWidth;
      meter.classList.add("is-run");
    }
    holdTimer = setTimeout(() => {
      if (root.classList.contains("uns-lock") || sayOpen) arm(HOLD);   // proposal page open on top, or a statement being read: wait
      else go(cur + 1);
    }, ms);
  }
  function go(i) {
    disarm();
    cur = ((i % N) + N) % N;
    target = nearest(-items[cur].slot, th);
    atRest = false;
    kick();
  }

  /* ---------- 5. interaction ---------- */
  // drag / swipe sideways to turn the ring (it lands on the nearest project); click or tap a picture to bring it round
  let pid = null, startX = 0, lastX = 0, lastT = 0, moved = false;
  scene.addEventListener("pointerdown", (e) => {
    if (!N || !started || (e.pointerType === "mouse" && e.button !== 0)) return;
    pid = e.pointerId; startX = lastX = e.clientX; lastT = e.timeStamp; moved = false;
    dragging = true; vel = 0; intro = false;
    disarm();
    scene.classList.add("is-drag");
    try { scene.setPointerCapture(pid); } catch (_) {}
    kick();
  });
  scene.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pid) return;
    if (!moved && Math.abs(e.clientX - startX) < 5) return;
    moved = true;
    const dx = e.clientX - lastX, dtm = Math.max(1, e.timeStamp - lastT);
    lastX = e.clientX; lastT = e.timeStamp;
    const d = dx / (R * kFront);
    th += d;
    vel = vel * 0.6 + (d / dtm * 1000) * 0.4;
  });
  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false;
    scene.classList.remove("is-drag");
    touched = true;
    if (moved) {
      vel = e && e.timeStamp - lastT > 80 ? 0 : clamp(vel, -6, 6);      // a held finger has no momentum left
      const landing = th + vel * 0.28;
      let best = 9;
      for (let i = 0; i < N; i++) {
        const d = Math.abs(wrap(landing + items[i].slot));
        if (d < best) { best = d; cur = i; }
      }
      target = nearest(-items[cur].slot, landing);
      atRest = false;
      kick();
    } else {
      const el = e && e.type === "pointerup" ? document.elementFromPoint(e.clientX, e.clientY) : null;
      vel = 0;
      // a tap on one of his hands opens (or, on a touch screen, closes again) that hand's statement
      const side = el ? handAt(e.clientX, e.clientY, el) : null;
      if (side) {
        if (e.pointerType !== "mouse" && side === sayOpen) closeSay(); else openSay(side);
        if (!sayOpen && atRest) arm(HOLD);
        return;
      }
      const li = el && el.closest ? el.closest(".orbit__item") : null;
      go(li && !hiddenByDev(li, e) ? +li.dataset.i : cur);
    }
  }
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("lostpointercapture", endDrag);

  if (fine && !reduce) {
    // mouse: the ring leans a touch towards the pointer
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || sayOpen) return;    // keep the ring still behind a statement being read
      const r = scene.getBoundingClientRect();
      mx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      my = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      kick();
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { mx = 0; my = 0; kick(); });
  }
  if (fine) {
    // mouse: the picture under the pointer comes forward a little (it can be clicked to bring it round)
    let hov = null;
    const itemOf = (el) => (el && el.closest ? el.closest(".orbit__item") : null);
    list.addEventListener("pointerover", (e) => {
      let li = itemOf(e.target);
      if (hiddenByDev(li, e)) li = null;
      if (li === hov) return;
      if (hov) hov.classList.remove("is-hover");
      hov = li;
      if (li) li.classList.add("is-hover");
    });
    list.addEventListener("pointerout", (e) => {
      if (!hov || itemOf(e.relatedTarget) === hov) return;
      hov.classList.remove("is-hover");
      hov = null;
    });
  }

  // only run while the slide is on screen and the tab is visible
  function resume() {
    if (!started) return;
    kick();
    if (atRest && !dragging && !holdTimer) arm(HOLD);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) resume(); else { disarm(); closeSay(); }
    }).observe(scene);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) disarm(); else resume(); });

  /* ---------- 7. what his hands say ---------- */
  // Hovering one of his open hands (tapping it on a touch screen) brings that hand's statement out of the palm:
  // the palm lights up, a beam reaches out and a glass card unfolds from it (styles: "WHAT HIS HANDS SAY" in
  // hero-uns.css). The card then stays put — beside the hand on wide screens, between his hands on narrow ones —
  // until the pointer has left both the hand and the card; the ring waits meanwhile. Keyboard: Tab reaches an
  // invisible button over each hand. The same text is in an sr-only paragraph for screen readers.
  const say = document.getElementById("handSay");
  const sayCard = {}, sayBtn = {}, sayHint = {};
  const sayBeam = say && say.querySelector(".say__beam");
  const sayGlow = say && say.querySelector(".say__glow");
  // his hands on assets/img/dev2-hero.webp, as fractions of the photo box (re-measure if the photo changes):
  // an ellipse a little larger than the hand (easy to find with the mouse), the palm (where the statement comes
  // from), and the hand's outer and inner edges (the card goes beside the outer one, or between the two hands)
  const HAND_ZONES = {
    left:  { cx: 0.100, cy: 0.722, rx: 0.112, ry: 0.182, palm: [0.088, 0.754], outer: 0.010, inner: 0.191 },
    right: { cx: 0.882, cy: 0.707, rx: 0.106, ry: 0.180, palm: [0.899, 0.745], outer: 0.967, inner: 0.797 },
  };
  const SAY_GRACE = 450;      // ms a statement waits once the pointer has left its hand and the card
  const SAY_INTENT = 70;      // ms on a hand before its statement opens (a pointer just passing by does nothing)
  const SAY_MARGIN = 12;      // smallest gap to the screen edges
  const SAY_GAP = 34;         // from the hand to the card: room for the beam to be seen
  let sayCloseT = null, sayIntentT = null, saySeen = false;

  if (say) {
    for (const side of ["left", "right"]) {
      sayCard[side] = say.querySelector('.say__card[data-side="' + side + '"]');
      sayBtn[side] = say.querySelector('.say__hand[data-side="' + side + '"]');
      sayHint[side] = say.querySelector('.say__hint[data-side="' + side + '"]');
    }
    // every word in its own span, so they can flip up one after the other
    say.querySelectorAll(".say__face").forEach((face) => {
      let i = 0;
      (function split(node) {
        Array.from(node.childNodes).forEach((ch) => {
          if (ch.nodeType === 1) { split(ch); return; }
          if (ch.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"), inner = document.createElement("span");
            w.className = "say__w";
            w.style.setProperty("--i", i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        });
      })(face);
    });
  }

  // which hand (if any) is under the pointer — a picture passing in front of him wins over his hand
  function handAt(x, y, target) {
    if (!say || !dev || !started) return null;
    const item = target && target.closest ? target.closest(".orbit__item") : null;
    if (item && !item.classList.contains("is-back")) return null;
    const r = dev.getBoundingClientRect();
    if (!r.width) return null;
    const u = (x - r.left) / r.width, v = (y - r.top) / r.height;
    for (const side of ["left", "right"]) {
      const z = HAND_ZONES[side], du = (u - z.cx) / z.rx, dv = (v - z.cy) / z.ry;
      if (du * du + dv * dv <= 1) return side;
    }
    return null;
  }

  // where the card, the beam and the palm glow go for this hand
  function placeSay(side) {
    const card = sayCard[side], z = HAND_ZONES[side];
    if (!card || !dev) return;
    const box = say.getBoundingClientRect(), d = dev.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const P = { x: d.left + z.palm[0] * d.width, y: d.top + z.palm[1] * d.height };
    const nav = document.getElementById("nav");
    const top = (nav ? nav.getBoundingClientRect().bottom : 0) + 10;
    const fieldTop = form ? form.getBoundingClientRect().top : vh;
    const mr = meter && getComputedStyle(meter).display !== "none" ? meter.getBoundingClientRect() : null;
    const outerX = d.left + z.outer * d.width;
    const room = side === "left" ? outerX - SAY_GAP - SAY_MARGIN : vw - SAY_MARGIN - (outerX + SAY_GAP);
    let w, h, x, y, center;
    if (room >= 230) {
      // wide screens: beside the hand, on its outer side, level with his fingers
      center = false;
      w = Math.min(room, clamp(vw * 0.24, 250, 340));
      card.style.setProperty("--w", w.toFixed(1) + "px");
      h = card.offsetHeight;
      x = side === "left" ? outerX - SAY_GAP - w : outerX + SAY_GAP;
      const bottom = Math.min(fieldTop, mr && mr.height ? mr.top : vh) - 10;
      y = clamp(P.y - 0.12 * d.height - h / 2, top, Math.max(top, bottom - h));
    } else {
      // narrow screens (his hands reach the screen edges): between his hands, under the logo — as if he held it
      center = true;
      const innerL = d.left + HAND_ZONES.left.inner * d.width, innerR = d.left + HAND_ZONES.right.inner * d.width;
      w = Math.min(360, Math.max(200, innerR - innerL + 20), vw - 2 * SAY_MARGIN);
      card.style.setProperty("--w", w.toFixed(1) + "px");
      h = card.offsetHeight;
      x = clamp((innerL + innerR) / 2 - w / 2, SAY_MARGIN, vw - SAY_MARGIN - w);
      y = clamp(d.top + 0.69 * d.height, top, Math.max(top, fieldTop - 10 - h));
    }
    hero.classList.toggle("is-say-center", center);
    card.style.left = (x - box.left).toFixed(1) + "px";
    card.style.top = (y - box.top).toFixed(1) + "px";
    // it unfolds from the point of the card nearest the palm, starting right at the palm
    const ox = clamp(P.x - x, 0, w), oy = clamp(P.y - y, 0, h);
    card.style.setProperty("--ox", ox.toFixed(1) + "px");
    card.style.setProperty("--oy", oy.toFixed(1) + "px");
    card.style.setProperty("--fx", (P.x - x - ox).toFixed(1) + "px");
    card.style.setProperty("--fy", (P.y - y - oy).toFixed(1) + "px");
    card.style.setProperty("--ry", (P.x > x + w / 2 ? 78 : -78) + "deg");
    // the beam: from the palm to the middle of the card's edge that faces it
    const beside = P.x > x + w || P.x < x;
    const ex = P.x > x + w ? x + w : P.x < x ? x : clamp(P.x, x + 0.2 * w, x + 0.8 * w);
    const ey = beside ? clamp(P.y, y + 0.3 * h, y + 0.7 * h) : (P.y < y ? y : y + h);
    const bh = clamp(h * 0.62, 34, 120);
    if (sayBeam) {
      sayBeam.style.left = (P.x - box.left).toFixed(1) + "px";
      sayBeam.style.top = (P.y - box.top - bh / 2).toFixed(1) + "px";
      sayBeam.style.setProperty("--len", Math.max(0, Math.hypot(ex - P.x, ey - P.y) - 2).toFixed(1) + "px");
      sayBeam.style.setProperty("--bh", bh.toFixed(1) + "px");
      sayBeam.style.setProperty("--ang", (Math.atan2(ey - P.y, ex - P.x) * DEG).toFixed(2) + "deg");
    }
    if (sayGlow) {
      sayGlow.style.left = (P.x - box.left).toFixed(1) + "px";
      sayGlow.style.top = (P.y - box.top).toFixed(1) + "px";
    }
  }

  // the keyboard buttons sit over the hands, and the "try me" rings on the palms
  function placeHands() {
    if (!say || !dev) return;
    const box = say.getBoundingClientRect(), d = dev.getBoundingClientRect();
    if (!d.width) return;
    for (const side of ["left", "right"]) {
      const z = HAND_ZONES[side], b = sayBtn[side], hint = sayHint[side];
      if (b) {
        b.style.left = (d.left + (z.cx - z.rx) * d.width - box.left).toFixed(1) + "px";
        b.style.top = (d.top + (z.cy - z.ry) * d.height - box.top).toFixed(1) + "px";
        b.style.width = (2 * z.rx * d.width).toFixed(1) + "px";
        b.style.height = (2 * z.ry * d.height).toFixed(1) + "px";
      }
      if (hint) {
        hint.style.left = (d.left + z.palm[0] * d.width - box.left).toFixed(1) + "px";
        hint.style.top = (d.top + z.palm[1] * d.height - box.top).toFixed(1) + "px";
      }
    }
    // the palm glow waits (invisible) on a palm rather than in the corner, until a statement places it
    if (sayGlow && !sayOpen && sayHint.left) {
      sayGlow.style.left = sayHint.left.style.left;
      sayGlow.style.top = sayHint.left.style.top;
    }
  }

  const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function openSay(side) {
    clearTimeout(sayCloseT); sayCloseT = null;
    clearTimeout(sayIntentT); sayIntentT = null;
    if (!say || !sayCard[side] || !started || side === sayOpen || root.classList.contains("uns-lock")) return;
    if (sayOpen) sayCard[sayOpen].classList.remove("is-open");
    sayOpen = side;
    saySeen = true;
    disarm();                                         // the ring waits while it is read
    placeSay(side);
    void sayCard[side].offsetWidth;                   // start from the folded state, even when switching hands
    say.classList.remove("is-on");
    void say.offsetWidth;
    say.classList.add("is-on");
    sayCard[side].classList.add("is-open");
    hero.classList.add("is-saying");
    if (!reduce) replay(sayGlow, "is-pulse");
    for (const s of ["left", "right"]) if (sayBtn[s]) sayBtn[s].setAttribute("aria-expanded", String(s === side));
  }

  function closeSay() {
    clearTimeout(sayCloseT); sayCloseT = null;
    clearTimeout(sayIntentT); sayIntentT = null;
    if (!sayOpen) return;
    sayCard[sayOpen].classList.remove("is-open");
    say.classList.remove("is-on");
    hero.classList.remove("is-saying");
    for (const s of ["left", "right"]) if (sayBtn[s]) sayBtn[s].setAttribute("aria-expanded", "false");
    sayOpen = null;
    if (atRest && !dragging) arm(HOLD);               // the ring carries on
  }
  const closeSoon = () => { if (sayOpen && !sayCloseT) sayCloseT = setTimeout(closeSay, SAY_GRACE); };

  // once, after the ring has first docked: each palm sends out a faint ring of light (again 8 s later if
  // nobody has tried a hand yet)
  function hintHands() {
    if (reduce || !say) return;
    placeHands();
    [["left", 900], ["right", 1250], ["left", 9000], ["right", 9350]].forEach(([side, ms]) =>
      setTimeout(() => { if (!saySeen && visible) replay(sayHint[side], "is-pulse"); }, ms));
  }

  if (say) {
    if (fine) {
      hero.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || dragging) return;
        const side = handAt(e.clientX, e.clientY, e.target);
        scene.classList.toggle("is-hand", !!side);
        if (side) {
          clearTimeout(sayCloseT); sayCloseT = null;
          if (side !== sayOpen && !sayIntentT) sayIntentT = setTimeout(() => { sayIntentT = null; openSay(side); }, SAY_INTENT);
          return;
        }
        clearTimeout(sayIntentT); sayIntentT = null;
        if (e.target.closest && e.target.closest(".say__card.is-open")) { clearTimeout(sayCloseT); sayCloseT = null; }
        else closeSoon();
      }, { passive: true });
      hero.addEventListener("pointerleave", () => {
        clearTimeout(sayIntentT); sayIntentT = null;
        scene.classList.remove("is-hand");
        closeSoon();
      });
    }
    // touch: a tap anywhere but on a hand or on the card closes it (taps on a hand are handled by the scene)
    document.addEventListener("pointerdown", (e) => {
      if (!sayOpen || e.pointerType === "mouse") return;
      if (e.target.closest && e.target.closest(".say__card")) return;
      if (handAt(e.clientX, e.clientY, e.target)) return;
      closeSay();
    }, true);
    for (const side of ["left", "right"]) {
      const b = sayBtn[side];
      if (!b) continue;
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("focus", () => openSay(side));
      b.addEventListener("blur", () => closeSoon());
      b.addEventListener("click", () => (sayOpen === side ? closeSay() : openSay(side)));
    }
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSay(); });
  }

  // measure everything again (fonts, pictures or the screen width changed)
  function relayout() {
    layout();
    render();
    placeHands();
    if (sayOpen) placeSay(sayOpen);
  }

  /* ---------- 6. start ---------- */
  // the ring needs the pictures' proportions to space them, so it comes in once they have loaded
  // (or after WAIT_IMAGES at the latest); the idea field does not wait for it
  let imagesIn = !N;
  const loaded = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : new Promise((res) => {
    img.addEventListener("load", res, { once: true });
    img.addEventListener("error", () => setTimeout(res, 1200), { once: true });   // gives the fallback image a moment
  }));
  function imagesReady() {
    if (imagesIn) return;
    imagesIn = true;
    relayout();
    if (booted) start();
  }
  Promise.all(items.map((it) => loaded(it.img)).concat(dev ? [loaded(dev)] : [])).then(imagesReady);
  setTimeout(imagesReady, WAIT_IMAGES);
  // a picture that arrives after the entrance: re-space the ring with its real proportions
  let late;
  items.forEach((it) => it.img.addEventListener("load", () => {
    if (!imagesIn) return;
    clearTimeout(late);
    late = setTimeout(relayout, 150);
  }));

  function start() {
    if (started || !N) return;
    started = true;
    if (reduce) {
      appear = 1;
      th = target = -items[0].slot;
      hero.classList.add("is-live");
      render();
      return;
    }
    // entrance: the ring spins in from the side and settles on the first project
    cur = 0;
    target = -items[0].slot;
    th = target + 3.4;
    vel = 0; intro = true; atRest = false;
    t0 = performance.now();
    kick();
  }
  function boot() {
    if (booted) return;
    booted = true;
    hero.classList.add("is-ready");                   // the developer and the rail fade up
    if (imagesIn) start();
    if (reduce) { if (form) form.classList.add("is-in"); return; }
    setTimeout(() => { if (form) form.classList.add("is-in"); }, 1100);
  }
  // after the site preloader hands over (main.js → uns:ready), with a fallback
  window.addEventListener("uns:ready", () => setTimeout(boot, 250));
  if (window.__unsReady) setTimeout(boot, 250);
  if (root.classList.contains("motion-off")) boot();
  setTimeout(boot, 5200);

  /* measure now, and again if the width changes */
  relayout();
  let rz;
  window.addEventListener("resize", () => {
    // width only: on phones the URL bar shows/hides while scrolling and would keep resizing the height
    if (window.innerWidth === lastWidth) return;
    clearTimeout(rz);
    rz = setTimeout(relayout, 120);
  }, { passive: true });
})();
