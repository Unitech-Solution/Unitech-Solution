/* =========================================================
   services.js — Serviços no hero (lado direito)
   Cartões empilhados ao estilo da Metodologia: o seguinte sobe
   por cima e o anterior encolhe e escurece. Passa sozinho; a
   barra de baixo mostra o tempo e permite escolher. Pausa com
   o rato em cima ou com o separador escondido.
   ========================================================= */

(function () {
  'use strict';

  const root = document.getElementById('heroServices');
  if (!root) return;
  const cards = Array.from(root.querySelectorAll('.hs-card'));
  const tabs = Array.from(root.querySelectorAll('.hs__legend button'));
  const currentEl = document.getElementById('hsCurrent');
  if (cards.length < 2) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;

  function go(n) {
    const prev = active;
    active = (n + cards.length) % cards.length;
    if (active === prev) return;
    cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === active);
      c.classList.toggle('is-past', i === prev);
    });
    tabs.forEach((t, i) => {
      t.classList.toggle('is-active', i === active);
      t.classList.toggle('is-done', i < active);
    });
    if (currentEl) currentEl.textContent = String(active + 1).padStart(2, '0');
  }

  // a barra do separador activo enche em CSS; quando acaba, passa ao seguinte
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(i));
    t.querySelector('.hs__bar')?.addEventListener('animationend', () => {
      if (i === active) go(active + 1);
    });
  });

  if (reduce) root.classList.add('is-static');

  // pausa quando o separador do browser está escondido
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-paused', document.hidden);
  });
})();
