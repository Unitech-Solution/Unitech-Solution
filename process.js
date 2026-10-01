/* =========================================================
   process.js — Como trabalhamos
   Cada etapa é uma folha "sticky"; a anterior encolhe e
   escurece quando a seguinte desliza por cima (GSAP +
   ScrollTrigger). Sem GSAP ou com "reduced motion", as folhas
   continuam a empilhar só com CSS.
   ========================================================= */

(function () {
  'use strict';

  const section = document.querySelector('.process');
  if (!section) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const cards = gsap.utils.toArray('.process-card');

  // só promove as camadas para a GPU quando a secção está perto
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom top',
    onToggle: self => section.classList.toggle('process--near', self.isActive)
  });

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

  // entrada do cabeçalho
  const head = section.querySelector('.process__head');
  if (head) {
    gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 78%', once: true } })
      .from('.process__head-top > *', { opacity: 0, y: 24, duration: .75, stagger: .08, ease: 'power3.out' })
      .from('.process__title-serif', { opacity: 0, y: 48, rotation: -10, duration: .9, ease: 'power3.out' }, '-=0.35')
      .fromTo('.process__title-main',
        { opacity: 0, yPercent: 22, clipPath: 'inset(-40% 0 100% 0)' },
        { opacity: 1, yPercent: 0, clipPath: 'inset(-40% 0 -20% 0)', duration: 1.05, ease: 'power4.out', clearProps: 'clipPath' },
        '-=0.68')
      .from('.process__head-bottom, .process__legend li', { opacity: 0, y: 18, duration: .65, stagger: .055, ease: 'power3.out' }, '-=0.52');
  }
})();
