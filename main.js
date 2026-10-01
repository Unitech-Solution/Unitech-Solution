/* =========================================================
   main.js — Unitech Solution
   GSAP + ScrollTrigger + Lenis motion system (preloader reveal,
   split-text hero reveal, velocity-aware marquees, pinned 3D
   project carousel, stacked process cards, contextual cursor,
   magnetic buttons…).
   Degrades gracefully to a static, fully usable page when GSAP
   fails to load or the visitor prefers reduced motion.
   ========================================================= */

'use strict';

/* ── SHARED HELPERS ───────────────────────────────────── */

// Splits text into one <span class="char"> per character (spaces stay
// as real breakable text nodes so wrapping still works).
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  const frag = document.createDocumentFragment();
  const chars = [];
  Array.from(text).forEach(ch => {
    if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch;
    frag.appendChild(span);
    chars.push(span);
  });
  el.appendChild(frag);
  return chars;
}

// Duplicates a marquee track's children until it can loop seamlessly,
// then drives it with an infinite modifier-wrapped tween.
function loopMarquee(el, duration) {
  if (!el || !el.children.length || !window.gsap) return null;
  const originals = Array.from(el.children);
  while (el.children.length < 16) {
    el.appendChild(originals[el.children.length % originals.length].cloneNode(true));
  }
  const getWidth = () => Math.max(el.firstElementChild.getBoundingClientRect().width, 1);
  return gsap.to(el, {
    x: () => -getWidth(),
    duration,
    ease: 'none',
    repeat: -1,
    repeatRefresh: true,
    modifiers: { x: x => (parseFloat(x) % getWidth()) + 'px' }
  });
}

// Resolves the label/icon the custom cursor badge should show for a
// given hovered element, based on this site's own markup/classes.
function resolveCursorLabel(target) {
  if (target.closest('button:disabled, input:disabled, [aria-disabled="true"]')) {
    return { label: 'INDISPONÍVEL', icon: '—', state: 'cursor-state--disabled' };
  }
  if (target.closest('.strip-card')) {
    return { label: 'VER', icon: '↗', state: 'cursor-state--view' };
  }
  const choice = target.closest('.cform__choice');
  if (choice) {
    const checked = choice.querySelector('input')?.checked;
    return checked
      ? { label: 'ESCOLHIDO', icon: '✓', state: 'cursor-state--action' }
      : { label: 'ESCOLHER', icon: '+', state: 'cursor-state--action' };
  }
  if (target.closest('#cfBack')) return { label: 'VOLTAR', icon: '←', state: 'cursor-state--action' };
  if (target.closest('#cfNext')) {
    const lbl = document.getElementById('cfNextLabel');
    return /envoyer/i.test(lbl?.textContent || '')
      ? { label: 'ENVIAR', icon: '↗', state: 'cursor-state--action' }
      : { label: 'CONTINUAR', icon: '→', state: 'cursor-state--action' };
  }
  const burger = target.closest('.nav__burger');
  if (burger) {
    return burger.getAttribute('aria-expanded') === 'true'
      ? { label: 'FECHAR', icon: '×', state: 'cursor-state--action' }
      : { label: 'MENU', icon: '+', state: 'cursor-state--action' };
  }
  const link = target.closest('a, [role="link"]');
  if (link) {
    const href = link.getAttribute('href') || '';
    if (link.classList.contains('nav__brand')) {
      return href.startsWith('#')
        ? { label: 'TOPO', icon: '↑', state: 'cursor-state--action' }
        : { label: 'INÍCIO', icon: '←', state: 'cursor-state--action' };
    }
    if (href.startsWith('mailto:')) return { label: 'ESCREVER', icon: '↗', state: 'cursor-state--action' };
    if (href.startsWith('tel:')) return { label: 'LIGAR', icon: '↗', state: 'cursor-state--action' };
    if (link.matches('.nav__cta') || /#contacto$/.test(href)) return { label: 'FALAR', icon: '↘', state: 'cursor-state--action' };
    if (link.closest('.mnav__links')) return { label: 'IR', icon: '→', state: 'cursor-state--action' };
    if (link.target === '_blank' || /^https?:\/\//i.test(href)) return { label: 'ABRIR', icon: '↗', state: 'cursor-state--action' };
    if (href.startsWith('#')) return { label: 'DESLIZAR', icon: '↓', state: 'cursor-state--action' };
    return { label: 'IR', icon: '→', state: 'cursor-state--action' };
  }
  const btn = target.closest('button, input[type="checkbox"], input[type="radio"], input[type="submit"]');
  if (btn) {
    if (btn.matches('input[type="checkbox"], input[type="radio"]')) {
      return btn.checked
        ? { label: 'ESCOLHIDO', icon: '✓', state: 'cursor-state--action' }
        : { label: 'ESCOLHER', icon: '+', state: 'cursor-state--action' };
    }
    if (btn.matches('button[type="submit"], input[type="submit"]')) return { label: 'ENVIAR', icon: '↗', state: 'cursor-state--action' };
    return { label: 'ATIVAR', icon: '+', state: 'cursor-state--action' };
  }
  return null;
}

/* ── BOOT ──────────────────────────────────────────────── */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const motionOff = reduceMotion || !hasGSAP;

  document.documentElement.classList.toggle('motion-off', motionOff);
  if (!motionOff) gsap.registerPlugin(ScrollTrigger);

  const lenis = motionOff ? null : initLenis();
  window.__lenis = lenis; // hero-uns.js pauses/resumes scrolling through this

  // Always-on, animation-agnostic behaviour.
  initMenu(lenis);
  initContactForm();
  initVideoAutoplay();
  initSmoothAnchors(lenis);
  // initServices() drove the old navy services list; that section is now a static card grid.
  initStripMore();

  if (motionOff) {
    document.getElementById('preloader')?.remove();
    return;
  }

  initMarquees();
  const revealHero = initHeroSplit();
  initPreloader(revealHero);
  initHeroCanvas();
  // Custom cursor (dot + ring following the pointer) disabled at the user's
  // request — initCursor() is kept below in case it's wanted back.
  initMagnetic();
  initManifesto();
  initAboutReveal();
  initContactReveal();
  initGenericReveals();
  initStripCarousel();
  initProcess();
  initFooterParallax();
  initFooterWordmark();

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

/* ── 1. LENIS SMOOTH SCROLL ───────────────────────────── */
function initLenis() {
  if (!window.Lenis) return null;
  const lenis = new Lenis({ lerp: .1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/* ── 2. PRELOADER — draw-on logo, counter, curtain wipe ── */
function initPreloader(revealHero) {
  const loader = document.getElementById('preloader');
  const path = document.getElementById('preloaderPath');
  const counterEl = document.getElementById('preloaderCount');
  const curtain = document.getElementById('preloaderCurtain');
  const logo = document.getElementById('preloaderLogo');

  if (!loader || !path || !counterEl || !curtain) {
    revealHero && revealHero();
    loader && loader.remove();
    return;
  }

  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });

  const counter = { v: 0 };
  const tl = gsap.timeline({
    onComplete: () => {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 650);
      ScrollTrigger.refresh();
    }
  });

  tl.call(() => revealHero && revealHero(), null, 2.85)
    .to(path, { strokeDashoffset: 0, duration: 1.9, ease: 'power2.inOut' }, 0)
    .to(counter, {
      v: 100, duration: 2.2, ease: 'power2.inOut',
      onUpdate: () => { counterEl.textContent = String(Math.round(counter.v)); }
    }, 0)
    .to(path, { fillOpacity: 1, duration: .5, ease: 'power2.out' }, 1.75)
    .to(logo, { scale: 1.06, duration: .5, ease: 'power2.inOut', yoyo: true, repeat: 1 }, 1.75)
    .to('.preloader__marquee, .preloader__counter', { opacity: 0, duration: .35, ease: 'power2.in' }, 2.35)
    .to(logo, { yPercent: -30, opacity: 0, duration: .45, ease: 'power3.in' }, 2.45)
    .to(curtain, { scaleY: 1, duration: .7, ease: 'power4.inOut' }, 2.6)
    .to(loader, { opacity: 0, duration: .3 }, 3.15);
}

/* ── 3. HERO SPLIT-TEXT REVEAL ────────────────────────── */
// Sets the hidden initial state immediately (so nothing flashes once
// the preloader fades) and returns the function that plays it, called
// mid-way through the preloader timeline.
function initHeroSplit() {
  const lines = document.querySelectorAll('.hero__line[data-split]');
  const groups = Array.from(lines).map(splitChars);
  const allChars = [].concat(...groups);
  const indexItems = document.querySelectorAll('.hero__index li');
  const marquee = document.querySelector('.hero__marquee');
  const nav = document.querySelector('.nav');

  if (allChars.length) gsap.set(allChars, { yPercent: 115, rotate: 3 });
  if (indexItems.length) gsap.set(indexItems, { yPercent: 40, opacity: 0 });
  if (marquee) gsap.set(marquee, { yPercent: 100 });
  if (nav) gsap.set(nav, { opacity: 0, y: -16 });

  let played = false;
  return function revealHero() {
    if (played) return;
    played = true;
    window.__unsReady = true; window.dispatchEvent(new Event('uns:ready')); // lets the ported hero start its intro
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    groups.forEach((chars, i) => {
      if (!chars.length) return;
      tl.to(chars, { yPercent: 0, rotate: 0, duration: 1.2, stagger: .028 }, i * .12);
    });
    tl.to('.hero [data-reveal]', { opacity: 1, duration: 1, stagger: .1 }, .5);
    if (indexItems.length) tl.to(indexItems, { yPercent: 0, opacity: 1, duration: .8, stagger: .08 }, .55);
    if (marquee) tl.to(marquee, { yPercent: 0, duration: 1.4 }, .3);
    if (nav) tl.to(nav, { opacity: 1, y: 0, duration: .8 }, .6);
    return tl;
  };
}

/* ── 4. MARQUEES (preloader ticker + velocity-aware hero) ── */
function initMarquees() {
  loopMarquee(document.getElementById('preloaderTrack'), 14);

  const heroTween = loopMarquee(document.getElementById('heroMarquee'), 22);
  if (heroTween && document.querySelector('.hero')) {
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onUpdate: self => {
        const rate = 1 + Math.min(Math.abs(self.getVelocity()) / 1200, 2.5);
        gsap.to(heroTween, { timeScale: rate, duration: .3, overwrite: true });
      }
    });
  }
}

/* ── 4b. HERO CANVAS — particle logo, ambient + pointer parallax ── */
// A dependency-free stand-in for the reference site's lazy-loaded WebGL
// scene: the mark is rasterised off-screen, sampled into a particle
// field, then drifted with gentle noise and a soft pointer-parallax.
function initHeroCanvas() {
  const canvas = document.getElementById('logoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Real Unitech Solution mark, pre-isolated to just the abstract icon
  // (wordmark removed at the pixel level, not by source-rect cropping).
  const LOGO_SRC = 'assets/img/logo-mark.png';
  const logoImg = new Image();
  let logoReady = false;
  logoImg.onload = () => { logoReady = true; resize(); if (visible && !rafId) loop(); };
  logoImg.src = LOGO_SRC;

  let W = 0, H = 0, particles = [], offCtx = null;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;

  class Particle {
    constructor(x, y) {
      this.ox = x; this.oy = y;
      this.x = x; this.y = y;
      this.r = Math.random() * 1.8 + .6;
      this.alpha = Math.random() * .55 + .2;
      this.speed = Math.random() * .012 + .006;
    }
    update(t) {
      this.x = this.ox + Math.sin(t * this.speed + this.ox) * 18 + targetX;
      this.y = this.oy + Math.cos(t * this.speed + this.oy) * 14 + targetY;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(133,192,250,${this.alpha})`;
      ctx.fill();
    }
  }

  function drawLogo(off, w, h) {
    const c = off.getContext('2d');
    c.clearRect(0, 0, w, h);
    if (!logoReady) return;
    const pad = w * .16;
    const s = Math.min((w - pad * 2) / logoImg.naturalWidth, (h - pad * 2) / logoImg.naturalHeight);
    const dw = logoImg.naturalWidth * s, dh = logoImg.naturalHeight * s;
    c.drawImage(logoImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function buildParticles() {
    particles = [];
    if (!offCtx) return;
    const imgData = offCtx.getImageData(0, 0, W, H);
    const step = Math.max(3, Math.round(W / 130));
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (imgData.data[(y * W + x) * 4 + 3] > 128) particles.push(new Particle(x, y));
      }
    }
  }

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    offCtx = off.getContext('2d');
    drawLogo(off, W, H);
    buildParticles();
  }

  let t = 0, rafId = null, visible = true;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    t += 1;
    targetX += (pointerX - targetX) * .04;
    targetY += (pointerY - targetY) * .04;
    particles.forEach(p => { p.update(t); p.draw(); });
    rafId = visible ? requestAnimationFrame(loop) : null;
  }

  resize();
  loop();

  window.addEventListener('resize', () => { cancelAnimationFrame(rafId); resize(); if (visible) loop(); });

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width - .5) * -24;
    pointerY = ((e.clientY - rect.top) / rect.height - .5) * -18;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });

  // Pause the RAF loop while the hero is off-screen (perf on long pages).
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        visible = entry.isIntersecting;
        if (visible && !rafId) loop();
      });
    }, { threshold: 0 }).observe(hero);
  }
}

/* ── 5. CONTEXTUAL CURSOR (dot + ring + badge) ────────── */
function initCursor() {
  if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

  const mkDiv = (cls, ...children) => {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    children.forEach(c => el.appendChild(c));
    return el;
  };
  const mkSpan = (cls, ...children) => {
    const el = document.createElement('span');
    el.className = cls;
    children.forEach(c => el.appendChild(c));
    return el;
  };

  const dot = mkSpan('cursor__dot');
  const cursorEl = mkDiv('cursor', dot);
  const ringIn = mkSpan('cursor-ring__in');
  const ringFx = mkSpan('cursor-ring__fx', ringIn);
  const ringEl = mkDiv('cursor-ring', ringFx);
  const badgeLabel = mkSpan('cursor-badge__label');
  const badgeIcon = mkSpan('cursor-badge__icon');
  const badgeIn = mkSpan('cursor-badge__in', badgeLabel, badgeIcon);
  const badgeFx = mkSpan('cursor-badge__fx', badgeIn);
  const badgeEl = mkDiv('cursor-badge', badgeFx);
  document.body.append(cursorEl, ringEl, badgeEl);

  const html = document.documentElement;
  html.classList.add('has-cursor');

  const setDotX = gsap.quickSetter(cursorEl, 'x', 'px');
  const setDotY = gsap.quickSetter(cursorEl, 'y', 'px');
  const setRingX = gsap.quickSetter(ringEl, 'x', 'px');
  const setRingY = gsap.quickSetter(ringEl, 'y', 'px');
  const setBadgeX = gsap.quickSetter(badgeEl, 'x', 'px');
  const setBadgeY = gsap.quickSetter(badgeEl, 'y', 'px');

  let active = false;
  let hoverTarget = null;
  let badgeKey = '';
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0, badgeX = 0, badgeY = 0;
  let pendingTarget = null, forceUpdate = false;
  let badgeWidth = 0, badgeFlip = false;

  const STATES = ['cursor-state--view', 'cursor-state--action', 'cursor-state--disabled'];
  const clearStates = () => STATES.forEach(s => html.classList.remove(s));

  const EDGE = 16, GAP = 12;
  const measureBadge = () => { badgeWidth = badgeLabel.textContent ? badgeIn.offsetWidth : 0; };
  const positionBadge = x => {
    if (!badgeWidth) return;
    const limit = html.clientWidth - GAP;
    const flip = (x + EDGE + badgeWidth > (badgeFlip ? limit - 24 : limit)) && (x - EDGE - badgeWidth >= GAP);
    if (flip !== badgeFlip) {
      badgeFlip = flip;
      html.classList.toggle('cursor-state--badge-left', flip);
    }
  };

  function setBadge(label, icon) {
    const key = label ? `${label}|${icon || ''}` : '';
    if (key === badgeKey) return;
    badgeKey = key;
    if (label) {
      badgeLabel.textContent = label;
      badgeIcon.textContent = icon || '';
      badgeIcon.hidden = !icon;
      html.classList.add('cursor-state--badge');
      measureBadge();
      positionBadge(badgeX);
    } else {
      html.classList.remove('cursor-state--badge');
      badgeWidth = 0;
      badgeFlip = false;
      html.classList.remove('cursor-state--badge-left');
    }
  }

  function refreshTarget(el) {
    const target = el instanceof Element ? el : document.body;
    hoverTarget = target;
    clearStates();
    if (target.closest('textarea, select, [contenteditable="true"], input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], input[type="password"], input[type="number"]')) {
      html.classList.add('cursor-state--text');
      setBadge(null);
      return;
    }
    html.classList.remove('cursor-state--text');
    const info = resolveCursorLabel(target);
    if (info) {
      html.classList.add(info.state);
      setBadge(info.label, info.icon);
    } else {
      setBadge(null);
    }
  }

  function show(e) {
    if (active) return;
    active = true;
    mouseX = ringX = badgeX = e.clientX;
    mouseY = ringY = badgeY = e.clientY;
    gsap.set([cursorEl, ringEl, badgeEl], { x: e.clientX, y: e.clientY });
    gsap.to([cursorEl, ringEl, badgeEl], { opacity: 1, duration: .22, overwrite: true });
  }
  function hide() {
    gsap.to([cursorEl, ringEl, badgeEl], { opacity: 0, duration: .18, overwrite: true });
    clearStates();
    html.classList.remove('cursor-state--press', 'cursor-state--text');
    setBadge(null);
    hoverTarget = null;
    active = false;
  }

  gsap.ticker.add((_time, deltaMs) => {
    if (!active) return;
    const dt = Math.min(deltaMs, 100) / (1000 / 60);
    const ringEase = 1 - Math.pow(1 - .24, dt);
    const badgeEase = 1 - Math.pow(1 - .32, dt);
    ringX += (mouseX - ringX) * ringEase;
    ringY += (mouseY - ringY) * ringEase;
    badgeX += (mouseX - badgeX) * badgeEase;
    badgeY += (mouseY - badgeY) * badgeEase;
    setRingX(ringX); setRingY(ringY);
    setBadgeX(badgeX); setBadgeY(badgeY);
    positionBadge(badgeX);
    if (pendingTarget && (forceUpdate || pendingTarget !== hoverTarget)) {
      forceUpdate = false;
      refreshTarget(pendingTarget);
    }
  });

  document.addEventListener('pointermove', e => {
    show(e);
    mouseX = e.clientX; mouseY = e.clientY;
    setDotX(e.clientX); setDotY(e.clientY);
    pendingTarget = e.target instanceof Element ? e.target : document.body;
  }, { passive: true });

  const forceRefresh = () => {
    if (!active) return;
    pendingTarget = document.elementFromPoint(mouseX, mouseY) || hoverTarget || document.body;
    forceUpdate = true;
  };
  document.addEventListener('click', forceRefresh);
  document.addEventListener('change', forceRefresh);

  document.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    html.classList.add('cursor-state--press');
    pendingTarget = e.target instanceof Element ? e.target : document.body;
    forceUpdate = true;
  });
  const releasePress = () => {
    html.classList.remove('cursor-state--press');
    gsap.fromTo(ringIn, { scale: .88 }, { scale: 1, duration: .36, ease: 'back.out(2)', clearProps: 'scale', overwrite: true });
  };
  document.addEventListener('pointerup', releasePress);
  document.addEventListener('pointercancel', releasePress);

  window.addEventListener('resize', () => { measureBadge(); positionBadge(badgeX); }, { passive: true });
  document.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
}

/* ── 6. MAGNETIC BUTTONS ──────────────────────────────── */
function initMagnetic() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  gsap.utils.toArray('.nav__cta, .cform__submit').forEach(el => {
    const moveX = gsap.quickTo(el, 'x', { duration: .4, ease: 'power3.out' });
    const moveY = gsap.quickTo(el, 'y', { duration: .4, ease: 'power3.out' });
    let originX = 0, originY = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      originX = rect.left + rect.width / 2 - gsap.getProperty(el, 'x');
      originY = rect.top + rect.height / 2 - gsap.getProperty(el, 'y');
    };
    el.addEventListener('pointerenter', measure);
    el.addEventListener('pointermove', e => {
      moveX((e.clientX - originX) * .35);
      moveY((e.clientY - originY) * .35);
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
    });
  });
}

/* ── 7. MANIFESTO — scrub word-by-word reveal ─────────── */
function initManifesto() {
  const el = document.getElementById('manifestoText');
  if (!el) return;

  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = el.querySelectorAll('.w');

  gsap.to(words, {
    opacity: 1, stagger: .06, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: .6 }
  });

  gsap.utils.toArray('.manifesto [data-reveal]').forEach(elm => {
    gsap.to(elm, { opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: elm, start: 'top 85%', once: true } });
  });
}

/* ── 8. ABOUT / CONTACT REVEALS ───────────────────────── */
function initAboutReveal() {
  gsap.utils.toArray('.about [data-reveal]').forEach(el => {
    gsap.set(el, { y: 24 });
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
}

function initContactReveal() {
  document.querySelectorAll('.contact__hook, .contact__mail').forEach(el => {
    const chars = splitChars(el);
    if (!chars.length) return;
    gsap.set(chars, { yPercent: 110 });
    gsap.to(chars, {
      yPercent: 0, duration: 1, ease: 'power4.out', stagger: .02,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
}

// Defensive fallback: fades in any [data-reveal] not already handled above.
function initGenericReveals() {
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    if (el.closest('.hero') || el.closest('.manifesto') || el.closest('.about')) return;
    gsap.to(el, { opacity: 1, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
}

/* ── 8b. PROJECTS — show the first 8, "ver mais" / "ver menos" ── */
// Runs with or without motion: hides every project after the 8th behind a
// "ver mais" tile; once revealed, a "ver menos" tile at the very end folds
// them away again. Announces each change with 'strip:changed'.
function initStripMore() {
  const root = document.querySelector('.strip');
  const rail = root?.querySelector('.strip__rail');
  if (!rail) return;
  const LIMIT = 8;
  const projects = Array.from(rail.querySelectorAll('.strip-card'));
  const extras = projects.slice(LIMIT);
  if (!extras.length) return;

  const tile = (kind, arrow, label, note) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `strip-card strip-card--square strip-card--more strip-card--${kind}`;
    el.setAttribute('aria-label', label);
    el.innerHTML = `<span class="strip-card__float"><span class="strip-more__ring" aria-hidden="true">${arrow}</span><span class="strip-more__label">${label}</span><span class="strip-more__count">${note}</span></span>`;
    return el;
  };
  const more = tile('expand', '&#8594;', 'Ver mais projectos', `+${extras.length}`);
  const less = tile('collapse', '&#8592;', 'Ver menos', `Mostrar só ${LIMIT}`);
  rail.insertBefore(more, extras[0]);
  rail.appendChild(less);

  function set(expanded) {
    extras.forEach(c => { c.hidden = !expanded; });
    more.hidden = expanded;
    less.hidden = !expanded;
    // where the carousel should settle: first revealed project, or the last of the 8
    const focusEl = expanded ? extras[0] : projects[LIMIT - 1];
    root.dispatchEvent(new CustomEvent('strip:changed', { detail: { expanded, focusEl } }));
  }
  more.addEventListener('click', () => set(true));
  less.addEventListener('click', () => set(false));
  extras.forEach(c => { c.hidden = true; });
  less.hidden = true;
}

/* ── 9. PROJECTS — pinned 3D carousel ─────────────────── */
function initStripCarousel() {
  const root = document.querySelector('[data-strip-carousel]');
  if (!root) return;
  const pin = root.querySelector('.strip__pin');
  const rail = root.querySelector('.strip__rail');
  // Only the cards currently shown take part; initStripMore() hides the extra
  // projects behind "ver mais" / "ver menos" tiles and announces 'strip:changed'.
  const visibleCards = () => gsap.utils.toArray(root.querySelectorAll('.strip-card')).filter(c => !c.hidden);
  let cards = visibleCards();
  const currentEl = root.querySelector('#stripCurrent');
  const totalEl = root.querySelector('#stripTotal');
  const projectCount = () => cards.filter(c => !c.classList.contains('strip-card--more')).length;
  if (!pin || !rail || cards.length < 2) return;

  let dominant = -1, override = -1, resizeTimer, pinTimeline = null;

  const gapMult = () => window.innerWidth <= 560 ? 1.15 : window.innerWidth <= 900 ? 1.25 : 1.35;
  const stepY = () => window.innerWidth <= 560
    ? Math.max(36, Math.min(52, window.innerHeight * .065))
    : window.innerWidth <= 900 ? 64
      : Math.max(62, Math.min(72, window.innerHeight * .08));
  const extraOffset = () => window.innerWidth <= 560 ? -12 : 0;
  const head = root.querySelector('.strip__head');
  const headGap = () => head ? head.getBoundingClientRect().bottom - pin.getBoundingClientRect().top : 0;
  const anchorY = () => {
    const base = window.innerHeight * .14 + extraOffset();
    if (window.innerWidth > 900 || !head) return base;
    const currentTop = parseFloat(getComputedStyle(rail).top) || 0;
    return Math.max(base, headGap() + 16 - currentTop);
  };
  const startX = () => Math.min(window.innerWidth, 2048) * .12;
  const endX = () => {
    const vw = Math.min(window.innerWidth, 2048);
    return -Math.max(rail.scrollWidth - vw * .76, vw * .35);
  };
  const pinDistance = () => Math.round(Math.max((startX() - endX()) * gapMult(), window.innerHeight * .6));

  const ROT = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];
  const staticTransform = i => {
    const val = ROT[i % ROT.length];
    const ry = Math.max(-4, Math.min(4, val * .55));
    const rx = Math.max(-4, Math.min(4, val));
    return `rotate(${ry}deg) rotateY(${rx}deg)`;
  };
  let staticTransforms = cards.map((_c, i) => staticTransform(i));

  let step = stepY();

  function place(progressIndex, forcedIndex) {
    const active = forcedIndex >= 0
      ? forcedIndex
      : Math.max(0, Math.min(cards.length - 1, Math.round(progressIndex)));
    const pos = forcedIndex >= 0 ? active : progressIndex;

    for (let i = 0; i < cards.length; i++) {
      const dist = Math.abs(i - pos);
      const capped = Math.min(dist, 2);
      cards[i].style.transform = `translate3d(0px, ${(i * step).toFixed(2)}px, ${Math.max(-180, 80 - dist * 105).toFixed(2)}px) ${staticTransforms[i]} scale(${(1 - capped * .055).toFixed(4)})`;
      cards[i].style.opacity = (1 - capped * .24).toFixed(4);
    }
    if (active !== dominant) {
      if (cards[dominant]) cards[dominant].classList.remove('is-dominant');
      if (cards[active]) cards[active].classList.add('is-dominant');
      dominant = active;
      root.dataset.activeIndex = String(active);
      if (currentEl) currentEl.textContent = String(Math.min(active + 1, projectCount())).padStart(2, '0');
      const li = Math.min(legendCards.indexOf(cards[active]) < 0 ? legendCards.length - 1 : legendCards.indexOf(cards[active]), legendCards.length - 1);
      legendBtns.forEach((b, i) => b.classList.toggle('is-active', i === li));
    }
  }

  // Focus or hover pulls that card to the front (same pose the scroll gives the
  // dominant card); a short CSS transition is switched on only while this is in
  // play so the scrubbed scroll itself never lags.
  let hoverTimer;
  const bringForward = card => {
    const i = cards.indexOf(card);
    if (i < 0) return;
    clearTimeout(hoverTimer);
    root.classList.add('is-hovering');
    override = i; place(i, i);
  };
  const release = () => {
    override = -1;
    const progress = pinTimeline?.scrollTrigger?.progress ?? 0;
    place(progress * (cards.length - 1), -1);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => root.classList.remove('is-hovering'), 480);
  };
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  gsap.utils.toArray(root.querySelectorAll('.strip-card')).forEach(card => {
    card.addEventListener('focus', () => bringForward(card));
    card.addEventListener('blur', release);
    if (fine) {
      card.addEventListener('mouseenter', () => bringForward(card));
      card.addEventListener('mouseleave', release);
    }
  });
  if (totalEl) totalEl.textContent = String(projectCount()).padStart(2, '0');

  // Project-name bar (same idea as Uns2's .strip__legend): one tab per project on
  // show, the active one lights up as the carousel moves; clicking scrolls to it.
  let legendBtns = [], legendCards = [];
  function buildLegend() {
    if (!head) return;
    let ol = pin.querySelector('.strip__legend'); // lives in the pin (before the header), not inside it
    if (!ol) {
      ol = document.createElement('ol');
      ol.className = 'strip__legend';
      ol.setAttribute('aria-label', 'Projectos em destaque');
      pin.insertBefore(ol, head); // first thing in the section, right at the white→blue seam
    }
    ol.innerHTML = '';
    legendCards = cards.filter(c => !c.classList.contains('strip-card--more'));
    ol.classList.toggle('is-compact', legendCards.length > 8);
    legendBtns = legendCards.map((card, i) => {
      const title = card.querySelector('.strip-card__meta p');
      const name = title ? title.lastChild.textContent.trim() : '';
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      const n = document.createElement('span');
      n.textContent = String(i + 1).padStart(2, '0');
      btn.append(n, name);
      btn.addEventListener('click', () => {
        const st = pinTimeline?.scrollTrigger;
        if (!st) return;
        const target = st.start + (cards.indexOf(card) / (cards.length - 1)) * (st.end - st.start) + 1;
        if (window.__lenis) window.__lenis.scrollTo(target, { duration: .9 });
        else window.scrollTo({ top: target, behavior: 'smooth' });
      });
      li.appendChild(btn);
      ol.appendChild(li);
      return btn;
    });
  }

  root.addEventListener('strip:changed', e => {
    cards = visibleCards();
    buildLegend();
    staticTransforms = cards.map((_c, i) => staticTransform(i));
    override = -1; dominant = -1;
    if (totalEl) totalEl.textContent = String(projectCount()).padStart(2, '0');
    ScrollTrigger.refresh();
    const st = pinTimeline?.scrollTrigger;
    const focus = Math.max(0, cards.indexOf(e.detail?.focusEl));
    if (st) {
      // keep the visitor in the carousel, settled on the relevant project
      const target = st.start + (focus / (cards.length - 1)) * (st.end - st.start);
      if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true, force: true });
      else window.scrollTo(0, target);
      place(focus, -1);
    }
  });

  buildLegend();
  root.classList.add('is-carousel-ready');
  root.dataset.activeIndex = '0';
  root.dataset.pinDistance = String(pinDistance());
  place(0, -1);

  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: self => root.classList.toggle('strip--near', self.isActive)
  });

  pinTimeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top',
      end: () => { root.dataset.pinDistance = String(pinDistance()); return `+=${pinDistance()}`; },
      pin, pinSpacing: true, scrub: .35, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: self => {
        const progress = Math.max(0, Math.min(1, self.progress));
        place(progress * (cards.length - 1), override);
      }
    }
  }).fromTo(rail, { x: startX, y: anchorY }, { x: endX, y: () => anchorY() - (cards.length - 1) * stepY() }, 0);

  const intro = root.querySelector('.strip__intro');
  if (intro) pinTimeline.to(intro, { opacity: () => window.innerWidth <= 900 ? 0 : 1, duration: .06 }, 0);

  let lastWidth = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      step = stepY();
      root.dataset.pinDistance = String(pinDistance());
      ScrollTrigger.refresh();
    }, 220);
  };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
}

/* ── 10. PROCESS — stacked cards, shade + ghost parallax ── */
function initProcess() {
  const cards = gsap.utils.toArray('.process-card');
  const section = document.querySelector('.process');
  if (section) {
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onToggle: self => section.classList.toggle('process--near', self.isActive)
    });
  }

  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    const shade = card.querySelector('.process-card__shade');
    const tl = gsap.timeline({ scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
    tl.to(card, { scale: .93, ease: 'none' }, 0);
    if (shade) tl.to(shade, { opacity: .55, ease: 'none' }, 0);
  });

  cards.forEach(card => {
    const visual = card.querySelector('.process-card__visual-img');
    const ghost = card.querySelector('.process-card__ghost');
    if (visual) {
      gsap.fromTo(visual, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top top', scrub: true } });
    }
    if (ghost) {
      gsap.fromTo(ghost, { yPercent: 12 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  const head = document.querySelector('.process__head');
  if (head) {
    gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 78%', once: true } })
      .from('.process__eyebrow, .process__promise', { opacity: 0, y: 24, duration: .75, stagger: .08, ease: 'power3.out' })
      .from('.process__title-serif', { opacity: 0, y: 48, rotation: -10, duration: .9, ease: 'power3.out' }, '-=0.35')
      .fromTo('.process__title-main',
        { opacity: 0, yPercent: 22, clipPath: 'inset(-40% 0 100% 0)' },
        { opacity: 1, yPercent: 0, clipPath: 'inset(-40% 0 -20% 0)', duration: 1.05, ease: 'power4.out', clearProps: 'clipPath' },
        '-=0.68')
      .from('.process__head-bottom, .process__legend li', { opacity: 0, y: 18, duration: .65, stagger: .055, ease: 'power3.out' }, '-=0.52');
  }
}

/* ── 11. SERVICES — hover (desktop) or scroll (touch) activation, header reveal, live panel ── */
function initServices(withScrollTrigger) {
  const items = document.querySelectorAll('.services__item');
  if (!items.length) return;
  const fine = window.matchMedia('(pointer: fine)').matches;

  // Header reveal — same beat as .process__head (eyebrow/promise in, title masks up,
  // list staggers in) so the two sections read as one system rather than two styles.
  const head = document.querySelector('.services__head');
  if (withScrollTrigger && window.gsap && window.ScrollTrigger && head) {
    gsap.set('.services__title .line > span', { yPercent: 110 });
    gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 80%', once: true } })
      .from('.services__eyebrow', { opacity: 0, y: 18, duration: .7, ease: 'power3.out' })
      .to('.services__title .line > span', { yPercent: 0, duration: .95, stagger: .1, ease: 'power4.out' }, '-=0.4')
      .from('.services__promise', { opacity: 0, y: 16, duration: .7, ease: 'power3.out' }, '-=0.55')
      .from(items, { opacity: 0, yPercent: 40, duration: .8, stagger: .07, ease: 'power3.out' }, '-=0.5')
      .from('.services__panel', { opacity: 0, y: 28, duration: .8, ease: 'power3.out' }, '-=0.6');
  } else if (withScrollTrigger && window.gsap && window.ScrollTrigger) {
    items.forEach(item => {
      gsap.from(item, {
        yPercent: 50, opacity: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 92%', once: true }
      });
    });
  }

  if (withScrollTrigger && window.gsap && window.ScrollTrigger && !fine) {
    items.forEach(item => {
      ScrollTrigger.create({
        trigger: item, start: 'top 58%', end: 'bottom 42%',
        onToggle: self => { if (self.isActive) setActive(item); }
      });
    });
  }

  // Live panel: swap the number/name/tags with a quick fade+rise, mirroring the
  // reference site's image-crossfade panel but text-driven (no per-service photos yet).
  const panel = document.getElementById('servicesPanel');
  const panelSwap = document.getElementById('servicesPanelSwap');
  const panelNum = document.getElementById('servicesPanelNum');
  const panelGhost = document.getElementById('servicesPanelGhost');
  const panelName = document.getElementById('servicesPanelName');
  const panelTags = document.getElementById('servicesPanelTags');
  let current = -1, swapping = false;

  function writePanel(item) {
    const idx = Array.from(items).indexOf(item);
    const num = String(idx + 1).padStart(2, '0');
    const name = item.querySelector('.services__name')?.textContent.trim() ?? '';
    const tags = (item.dataset.tags || '').split('|').filter(Boolean);
    if (panelNum) panelNum.textContent = num;
    if (panelGhost) panelGhost.textContent = num;
    if (panelName) panelName.textContent = name;
    if (panelTags) panelTags.innerHTML = tags.map(t => `<li>${t}</li>`).join('');
    current = idx;
  }

  function setActive(item, { animate = true } = {}) {
    items.forEach(i => i.classList.toggle('is-active', i === item));
    const idx = Array.from(items).indexOf(item);
    if (idx === current) return;
    if (!animate || !panel || !window.gsap || document.documentElement.classList.contains('motion-off')) {
      writePanel(item);
      return;
    }
    if (swapping) return;
    swapping = true;
    gsap.to(panelSwap, {
      opacity: 0, y: -10, duration: .28, ease: 'power2.in',
      onComplete: () => {
        writePanel(item);
        gsap.fromTo(panelSwap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .38, ease: 'power2.out', onComplete: () => swapping = false });
      }
    });
  }

  if (fine) {
    items.forEach(item => item.addEventListener('mouseenter', () => setActive(item)));
    const list = document.getElementById('servicesList');
    if (list) list.addEventListener('mouseleave', () => setActive(items[0]));
  }

  setActive(document.querySelector('.services__item.is-active') || items[0], { animate: false });
}

/* ── 12. FOOTER — parallax wordmark + magnetic letters ── */
function initFooterParallax() {
  const wordmark = document.querySelector('.footer__wordmark');
  if (!wordmark) return;
  gsap.from(wordmark, {
    yPercent: 26, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top 70%', end: 'bottom bottom', scrub: .8 }
  });
}

// Splits the giant wordmark into per-letter spans and gently repels
// them away from the pointer — a lighter, dependency-free take on the
// reference site's physics-driven "breakable" wordmark.
function initFooterWordmark() {
  const wordmark = document.querySelector('.footer__wordmark');
  const giant = wordmark?.querySelector('.footer__giant');
  if (!wordmark || !giant) return;

  (function splitNode(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        Array.from(child.textContent || '').forEach(ch => {
          if (!ch.trim()) { frag.appendChild(document.createTextNode(ch)); return; }
          const span = document.createElement('span');
          span.className = 'fw-piece';
          span.textContent = ch;
          frag.appendChild(span);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitNode(child);
      }
    });
  })(giant);

  if (!window.matchMedia('(pointer: fine)').matches) return;
  const pieces = Array.from(wordmark.querySelectorAll('.fw-piece'));
  if (!pieces.length) return;

  const movers = pieces.map(el => ({
    el,
    moveX: gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' }),
    moveY: gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' })
  }));
  const RADIUS = 140, FORCE = 26;

  wordmark.addEventListener('pointermove', e => {
    movers.forEach(({ el, moveX, moveY }) => {
      const rect = el.getBoundingClientRect();
      const dx = (rect.left + rect.width / 2) - e.clientX;
      const dy = (rect.top + rect.height / 2) - e.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < RADIUS) {
        const force = (1 - dist / RADIUS) * FORCE;
        moveX(dx / (dist || 1) * force);
        moveY(dy / (dist || 1) * force);
      } else {
        moveX(0); moveY(0);
      }
    });
  }, { passive: true });

  wordmark.addEventListener('pointerleave', () => {
    movers.forEach(({ moveX, moveY }) => { moveX(0); moveY(0); });
  });
}

/* ── 13. MOBILE MENU ───────────────────────────────────── */
function initMenu(lenis) {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  let open = false;
  function set(state) {
    if (open === state) return;
    open = state;
    burger.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }

  burger.addEventListener('click', () => set(!open));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { set(false); burger.focus(); } });
  window.addEventListener('resize', () => { if (open && window.innerWidth > 900) set(false); });
}

/* ── 14. CONTACT FORM — multi-step, animated when possible ── */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.cform__step'));
  const backBtn = document.getElementById('cfBack');
  const nextBtn = document.getElementById('cfNext');
  const nextLabel = document.getElementById('cfNextLabel');
  const stepNow = document.getElementById('cfStepNow');
  const stepLbl = document.getElementById('cfStepLabel');
  const progBar = document.getElementById('cfProgress');
  const done = document.getElementById('cfDone');
  if (!steps.length || !nextBtn || !backBtn) return;

  const canAnimate = !!(window.gsap && !document.documentElement.classList.contains('motion-off'));
  let current = 0;
  const total = steps.length;

  function validateStep() {
    const inputs = steps[current].querySelectorAll('[required]');
    for (const inp of inputs) {
      if (inp.type === 'checkbox' ? !inp.checked : !inp.value.trim()) {
        inp.focus();
        if (inp.reportValidity) inp.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goTo(idx, dir) {
    steps[current].classList.remove('is-active');
    current = idx;
    steps[current].classList.add('is-active');
    stepNow.textContent = String(current + 1).padStart(2, '0');
    stepLbl.textContent = steps[current].dataset.label || '';
    progBar.style.width = `${((current + 1) / total) * 100}%`;
    backBtn.hidden = current === 0;
    nextLabel.textContent = current === total - 1 ? 'Enviar' : 'Continuar';

    if (canAnimate) {
      gsap.fromTo(steps[current], { opacity: 0, x: 34 * dir }, { opacity: 1, x: 0, duration: .55, ease: 'power3.out', clearProps: 'opacity,transform' });
      gsap.fromTo([stepNow?.parentElement, stepLbl].filter(Boolean), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out', stagger: .05, clearProps: 'all' });
    }
    const first = steps[current].querySelector('input, textarea');
    if (first && idx !== 0) setTimeout(() => first.focus({ preventScroll: true }), canAnimate ? 100 : 0);
  }

  function sendByEmail() {
    const data = new FormData(form);
    const get = key => (data.get(key) || '').toString().trim();
    const subject = `Novo pedido de projecto — ${get('name') || 'Website Unitech'}`;
    const body = [
      `Nome: ${get('name')}`,
      `Email: ${get('email')}`,
      `Telefone: ${get('phone') || '—'}`,
      `Área: ${get('area') || '—'}`,
      `Dimensão do projecto: ${get('dimensao') || '—'}`,
      '',
      'Mensagem:',
      get('message')
    ].join('\n');
    const mailto = `mailto:unitechsolution.inc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  function finish() {
    form.classList.add('is-sent');
    sendByEmail();
    if (!canAnimate || !done) return;
    const mark = done.querySelector('.cform__done-mark path');
    const tl = gsap.timeline();
    if (mark && mark.getTotalLength) {
      const len = mark.getTotalLength();
      gsap.set(mark, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(mark, { strokeDashoffset: 0, duration: .7, ease: 'power2.inOut' });
    }
    const rest = Array.from(done.children).filter(c => !c.classList.contains('cform__done-mark'));
    tl.fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', stagger: .08, clearProps: 'all' }, mark ? '-=0.35' : 0);
  }

  nextBtn.addEventListener('click', e => {
    e.preventDefault();
    if (!validateStep()) return;
    if (current < total - 1) goTo(current + 1, 1);
    else finish();
  });
  backBtn.addEventListener('click', () => { if (current > 0) goTo(current - 1, -1); });
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); nextBtn.click(); }
  });

  goTo(0, 0);
}

/* ── 15. VIDEO AUTOPLAY ON SCROLL ─────────────────────── */
function initVideoAutoplay() {
  const videos = document.querySelectorAll('.strip-card__media video');
  if (!videos.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  }, { threshold: .3 });
  videos.forEach(v => obs.observe(v));
}

/* ── 16. SMOOTH ANCHOR LINKS ───────────────────────────── */
function initSmoothAnchors(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const targetEl = document.querySelector(a.getAttribute('href'));
      if (!targetEl) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(targetEl, { offset: 0, duration: 1.4 });
      else targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
