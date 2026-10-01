/* =========================================================
   strip.js — Projectos em destaque
   Carrossel 3D fixo (pin) controlado pelo scroll, com GSAP +
   ScrollTrigger. O projecto activo fica sempre no centro do
   ecrã, maior; os vizinhos ficam atrás, mais pequenos.
   Sem GSAP ou com "reduced motion", a secção fica como grelha.
   ========================================================= */

(function () {
  'use strict';

  const root = document.querySelector('[data-strip-carousel]');
  if (!root) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const pin = root.querySelector('.strip__pin');
  const rail = root.querySelector('.strip__rail');
  const cards = gsap.utils.toArray(root.querySelectorAll('.strip-card'));
  const currentEl = root.querySelector('#stripCurrent');
  if (!pin || !rail || cards.length < 2) return;

  const last = cards.length - 1;
  const ACTIVE_SCALE = 1.3;    // tamanho do projecto em destaque
  const SIDE_SCALE = .3;       // quanto encolhe por cada posição de distância

  let dominant = -1, override = -1, resizeTimer;
  let centersX = [], halfH = [], fit = [];
  const state = { pos: 0 };    // posição "contínua" do carrossel (0 … last)
  const head = root.querySelector('.strip__head');

  // desnível vertical entre cartões (o efeito em diagonal)
  const stepY = () => window.innerWidth <= 560 ? 34 : window.innerWidth <= 900 ? 48 : 64;
  // espaço livre entre a barra de projectos e o fundo da secção
  const headBottom = () => head ? head.getBoundingClientRect().bottom - pin.getBoundingClientRect().top : 0;
  const freeSpace = () => pin.clientHeight - headBottom() - 56;
  // o centro do cartão activo fica no meio desse espaço
  const anchorY = () => headBottom() + 24 + freeSpace() / 2;
  const pinDistance = () => Math.round(last * window.innerHeight * .75);

  // ligeira inclinação diferente em cada cartão
  const ROT = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5];
  const tilt = cards.map((_c, i) => {
    const val = ROT[i % ROT.length];
    return `rotate(${(val * .55).toFixed(2)}deg) rotateY(${val}deg)`;
  });

  // mede a posição de cada cartão dentro do carril (transforms não afectam offset*)
  function measure() {
    centersX = cards.map(c => c.offsetLeft + c.offsetWidth / 2);
    halfH = cards.map(c => c.offsetHeight / 2);
    // em ecrãs baixos, encolhe o cartão para caber nesse espaço (1.08 ≈ perspectiva)
    const free = freeSpace();
    fit = cards.map(c => Math.min(1, free / (c.offsetHeight * ACTIVE_SCALE * 1.08)));
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  function centerAt(pos) {
    const i = Math.max(0, Math.min(last - 1, Math.floor(pos)));
    return lerp(centersX[i], centersX[i + 1], Math.max(0, Math.min(1, pos - i)));
  }

  function place(progressIndex, forcedIndex) {
    const pos = forcedIndex >= 0 ? forcedIndex : progressIndex;
    const active = Math.max(0, Math.min(last, Math.round(pos)));
    const step = stepY();

    // move o carril para que a posição actual fique no centro do ecrã
    const x = window.innerWidth / 2 - centerAt(pos);
    const baseY = anchorY() - pos * step;
    gsap.set(rail, { x, y: baseY });

    for (let i = 0; i < cards.length; i++) {
      const dist = Math.abs(i - pos);
      const capped = Math.min(dist, 2);
      const scale = (ACTIVE_SCALE - capped * SIDE_SCALE) * fit[i];
      const z = Math.max(-220, 80 - dist * 120);
      cards[i].style.transform =
        `translate3d(0px, ${(i * step - halfH[i]).toFixed(2)}px, ${z.toFixed(2)}px) ${tilt[i]} scale(${scale.toFixed(4)})`;
      cards[i].style.opacity = Math.max(.18, 1 - capped * .38).toFixed(4);
      cards[i].style.zIndex = String(10 - Math.round(dist));
    }

    // se o cartão em destaque passar do fundo da secção, sobe o carril o
    // necessário (mede o tamanho real, já com escala e perspectiva)
    const pinBottom = pin.getBoundingClientRect().top + pin.clientHeight - 24;
    let over = 0;
    for (const i of [Math.floor(pos), Math.ceil(pos)]) {
      if (!cards[i]) continue;
      const weight = 1 - Math.abs(i - pos);
      over = Math.max(over, (cards[i].getBoundingClientRect().bottom - pinBottom) * weight);
    }
    if (over > 0) gsap.set(rail, { y: baseY - over });
    if (active !== dominant) {
      if (cards[dominant]) cards[dominant].classList.remove('is-dominant');
      cards[active].classList.add('is-dominant');
      dominant = active;
      if (currentEl) currentEl.textContent = String(active + 1).padStart(2, '0');
      legend.forEach((a, i) => a.classList.toggle('is-active', i === active));
    }
  }

  // barra do topo: marca o projecto activo; clicar leva o scroll até ele
  const legend = Array.from(root.querySelectorAll('.strip__legend a'));
  legend.forEach((a, i) => {
    a.addEventListener('click', e => {
      const st = pinTimeline?.scrollTrigger;
      if (!st) return;
      // já no projecto activo: segue o link para a página do projecto
      if (i === dominant && st.isActive) return;
      e.preventDefault();
      window.scrollTo({ top: st.start + (st.end - st.start) * (i / last) + 1, behavior: 'smooth' });
    });
  });

  // navegação por teclado: o cartão focado passa para o centro
  cards.forEach((card, i) => {
    card.addEventListener('focus', () => { override = i; place(i, i); });
    card.addEventListener('blur', () => { override = -1; place(state.pos, -1); });
  });

  root.classList.add('is-carousel-ready');
  measure();
  place(0, -1);

  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: self => root.classList.toggle('strip--near', self.isActive)
  });

  // a timeline anima state.pos; o scrub suaviza e place() desenha
  const pinTimeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top',
      end: () => `+=${pinDistance()}`,
      pin, pinSpacing: true, scrub: .5, invalidateOnRefresh: true, anticipatePin: 1,
      onRefresh: () => { measure(); place(state.pos, override); }
    },
    onUpdate: () => place(state.pos, override)
  }).fromTo(state, { pos: 0 }, { pos: last });

  let lastWidth = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
  };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  // as imagens mudam o tamanho dos cartões ao carregar
  cards.forEach(c => c.querySelector('img')?.addEventListener('load', () => { measure(); place(state.pos, override); }));

  // o splash do hero bloqueia o scroll (body.cinema); recalcula quando sai
  window.addEventListener('load', () => ScrollTrigger.refresh());
  new MutationObserver(() => ScrollTrigger.refresh())
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
