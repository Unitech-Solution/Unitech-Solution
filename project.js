/* Project detail page — nav state + reveal-on-scroll (lean) */
(function () {
  "use strict";
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nav scrolled state */
  const nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 30); }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* reveal on scroll */
  const revs = $$(".reveal");
  revs.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
    const i = sibs.indexOf(el);
    if (sibs.length > 1) el.style.setProperty("--d", (i * 0.08).toFixed(2) + "s");
  });
  if (reduce) {
    revs.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }),
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    revs.forEach((el) => io.observe(el));
  }

  /* smooth anchor scroll for same-page links (none expected, but safe) */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });
})();
