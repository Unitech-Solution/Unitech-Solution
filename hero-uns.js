/* ============================================================
   UNS HERO — idea field, proposal page and page chrome, ported from the
   unitechsolution.web.app source (github.com/lutherbanze/Uns2, main.js).
   Logic is the original; the changes are marked "this site": .hero → .uhero,
   asset paths, scroll lock through Lenis, Mozambique as the default dial code.
   The first slide's 3D project ring lives in hero-orbit.js.
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  // (the first slide is now hero-lp.js; this file keeps the proposal page, the FAB, the nav state and the reveals)

  /* this site: the original locked scrolling with body{overflow:hidden}; here the
     page scrolls on <html> through Lenis, so lock both from one place. */
  let proposalOpen = false;
  function syncLock() {
    const lock = proposalOpen;
    document.documentElement.classList.toggle("uns-lock", lock);
    if (window.__lenis) lock ? window.__lenis.stop() : window.__lenis.start();
  }

  /* ---------- Idea field → Proposal page → Firestore ---------- */
  (function () {
    /* Firebase (compat SDK loaded in index.html) */
    const firebaseConfig = {
      apiKey: "AIzaSyC6ejzi1lh024ZoLFwWiRJac2Jli30N_Bw",
      authDomain: "envett-rcdk0f.firebaseapp.com",
      projectId: "envett-rcdk0f",
      storageBucket: "envett-rcdk0f.firebasestorage.app",
      messagingSenderId: "936384871770",
      appId: "1:936384871770:web:c0258d53ac64e4f5788763",
    };
    let db = null;
    try {
      if (window.firebase && firebase.initializeApp) {
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
      }
    } catch (e) { db = null; }

    function shake(el) {
      if (!el || reduce || !el.animate) return;
      el.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" },
         { transform: "translateX(7px)" }, { transform: "translateX(0)" }],
        { duration: 320, easing: "ease-in-out" }
      );
    }

    /* ---- hero idea field: validate (no empty) → open the proposal page ---- */
    const askForm = $("#askForm");
    const askInput = $("#askInput");
    const askGlass = askForm && askForm.querySelector(".ask__glass");
    if (askForm) {
      askForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const idea = (askInput.value || "").trim();
        if (!idea) { askInput.focus(); shake(askGlass); return; }
        openProposal(idea);
      });
    }

    /* ---- proposal page (overlay) ---- */
    const proposal = $("#proposal");
    const panel = $("#proposalForm");
    const backBtn = $("#proposalBack");
    const video = $("#proposalVideo");
    const msg = $("#proposalMsg");
    const f = {
      idea: $("#pIdea"), category: $("#pCategory"), budget: $("#pBudget"),
      email: $("#pEmail"), country: $("#pCountry"), phone: $("#pPhone"),
      whats: $("#pWhats"), callOnly: $("#pCallOnly"),
    };
    let open = false;

    /* ---- country dial codes (all countries) ---- */
    const COUNTRIES = [
      ["Afghanistan","AF","+93"],["Albania","AL","+355"],["Algeria","DZ","+213"],["Andorra","AD","+376"],
      ["Angola","AO","+244"],["Antigua and Barbuda","AG","+1268"],["Argentina","AR","+54"],["Armenia","AM","+374"],
      ["Australia","AU","+61"],["Austria","AT","+43"],["Azerbaijan","AZ","+994"],["Bahamas","BS","+1242"],
      ["Bahrain","BH","+973"],["Bangladesh","BD","+880"],["Barbados","BB","+1246"],["Belarus","BY","+375"],
      ["Belgium","BE","+32"],["Belize","BZ","+501"],["Benin","BJ","+229"],["Bhutan","BT","+975"],
      ["Bolivia","BO","+591"],["Bosnia and Herzegovina","BA","+387"],["Botswana","BW","+267"],["Brazil","BR","+55"],
      ["Brunei","BN","+673"],["Bulgaria","BG","+359"],["Burkina Faso","BF","+226"],["Burundi","BI","+257"],
      ["Cambodia","KH","+855"],["Cameroon","CM","+237"],["Canada","CA","+1"],["Cape Verde","CV","+238"],
      ["Central African Republic","CF","+236"],["Chad","TD","+235"],["Chile","CL","+56"],["China","CN","+86"],
      ["Colombia","CO","+57"],["Comoros","KM","+269"],["Congo (Republic)","CG","+242"],["Congo (DRC)","CD","+243"],
      ["Costa Rica","CR","+506"],["Côte d'Ivoire","CI","+225"],["Croatia","HR","+385"],["Cuba","CU","+53"],
      ["Cyprus","CY","+357"],["Czechia","CZ","+420"],["Denmark","DK","+45"],["Djibouti","DJ","+253"],
      ["Dominica","DM","+1767"],["Dominican Republic","DO","+1809"],["Ecuador","EC","+593"],["Egypt","EG","+20"],
      ["El Salvador","SV","+503"],["Equatorial Guinea","GQ","+240"],["Eritrea","ER","+291"],["Estonia","EE","+372"],
      ["Eswatini","SZ","+268"],["Ethiopia","ET","+251"],["Fiji","FJ","+679"],["Finland","FI","+358"],
      ["France","FR","+33"],["Gabon","GA","+241"],["Gambia","GM","+220"],["Georgia","GE","+995"],
      ["Germany","DE","+49"],["Ghana","GH","+233"],["Greece","GR","+30"],["Grenada","GD","+1473"],
      ["Guatemala","GT","+502"],["Guinea","GN","+224"],["Guinea-Bissau","GW","+245"],["Guyana","GY","+592"],
      ["Haiti","HT","+509"],["Honduras","HN","+504"],["Hong Kong","HK","+852"],["Hungary","HU","+36"],
      ["Iceland","IS","+354"],["India","IN","+91"],["Indonesia","ID","+62"],["Iran","IR","+98"],
      ["Iraq","IQ","+964"],["Ireland","IE","+353"],["Israel","IL","+972"],["Italy","IT","+39"],
      ["Jamaica","JM","+1876"],["Japan","JP","+81"],["Jordan","JO","+962"],["Kazakhstan","KZ","+7"],
      ["Kenya","KE","+254"],["Kiribati","KI","+686"],["Kosovo","XK","+383"],["Kuwait","KW","+965"],
      ["Kyrgyzstan","KG","+996"],["Laos","LA","+856"],["Latvia","LV","+371"],["Lebanon","LB","+961"],
      ["Lesotho","LS","+266"],["Liberia","LR","+231"],["Libya","LY","+218"],["Liechtenstein","LI","+423"],
      ["Lithuania","LT","+370"],["Luxembourg","LU","+352"],["Macau","MO","+853"],["Madagascar","MG","+261"],
      ["Malawi","MW","+265"],["Malaysia","MY","+60"],["Maldives","MV","+960"],["Mali","ML","+223"],
      ["Malta","MT","+356"],["Marshall Islands","MH","+692"],["Mauritania","MR","+222"],["Mauritius","MU","+230"],
      ["Mexico","MX","+52"],["Micronesia","FM","+691"],["Moldova","MD","+373"],["Monaco","MC","+377"],
      ["Mongolia","MN","+976"],["Montenegro","ME","+382"],["Morocco","MA","+212"],["Mozambique","MZ","+258"],
      ["Myanmar","MM","+95"],["Namibia","NA","+264"],["Nauru","NR","+674"],["Nepal","NP","+977"],
      ["Netherlands","NL","+31"],["New Zealand","NZ","+64"],["Nicaragua","NI","+505"],["Niger","NE","+227"],
      ["Nigeria","NG","+234"],["North Korea","KP","+850"],["North Macedonia","MK","+389"],["Norway","NO","+47"],
      ["Oman","OM","+968"],["Pakistan","PK","+92"],["Palau","PW","+680"],["Palestine","PS","+970"],
      ["Panama","PA","+507"],["Papua New Guinea","PG","+675"],["Paraguay","PY","+595"],["Peru","PE","+51"],
      ["Philippines","PH","+63"],["Poland","PL","+48"],["Portugal","PT","+351"],["Puerto Rico","PR","+1787"],
      ["Qatar","QA","+974"],["Romania","RO","+40"],["Russia","RU","+7"],["Rwanda","RW","+250"],
      ["Saint Kitts and Nevis","KN","+1869"],["Saint Lucia","LC","+1758"],["Saint Vincent and the Grenadines","VC","+1784"],
      ["Samoa","WS","+685"],["San Marino","SM","+378"],["São Tomé and Príncipe","ST","+239"],["Saudi Arabia","SA","+966"],
      ["Senegal","SN","+221"],["Serbia","RS","+381"],["Seychelles","SC","+248"],["Sierra Leone","SL","+232"],
      ["Singapore","SG","+65"],["Slovakia","SK","+421"],["Slovenia","SI","+386"],["Solomon Islands","SB","+677"],
      ["Somalia","SO","+252"],["South Africa","ZA","+27"],["South Korea","KR","+82"],["South Sudan","SS","+211"],
      ["Spain","ES","+34"],["Sri Lanka","LK","+94"],["Sudan","SD","+249"],["Suriname","SR","+597"],
      ["Sweden","SE","+46"],["Switzerland","CH","+41"],["Syria","SY","+963"],["Taiwan","TW","+886"],
      ["Tajikistan","TJ","+992"],["Tanzania","TZ","+255"],["Thailand","TH","+66"],["Timor-Leste","TL","+670"],
      ["Togo","TG","+228"],["Tonga","TO","+676"],["Trinidad and Tobago","TT","+1868"],["Tunisia","TN","+216"],
      ["Turkey","TR","+90"],["Turkmenistan","TM","+993"],["Tuvalu","TV","+688"],["Uganda","UG","+256"],
      ["Ukraine","UA","+380"],["United Arab Emirates","AE","+971"],["United Kingdom","GB","+44"],["United States","US","+1"],
      ["Uruguay","UY","+598"],["Uzbekistan","UZ","+998"],["Vanuatu","VU","+678"],["Vatican City","VA","+379"],
      ["Venezuela","VE","+58"],["Vietnam","VN","+84"],["Yemen","YE","+967"],["Zambia","ZM","+260"],["Zimbabwe","ZW","+263"],
    ];
    function flagEmoji(iso) {
      return iso.replace(/./g, (c) => String.fromCodePoint(0x1F1E6 + c.toUpperCase().charCodeAt(0) - 65));
    }
    if (f.country && !f.country.options.length) {
      const frag = document.createDocumentFragment();
      COUNTRIES.forEach(([name, iso, dial]) => {
        const o = document.createElement("option");
        o.value = dial;
        o.dataset.country = name;
        o.dataset.iso = iso;
        o.textContent = flagEmoji(iso) + "  " + dial;
        if (iso === "MZ") o.selected = true;   // this site: Mozambique by default
        frag.appendChild(o);
      });
      f.country.appendChild(frag);
    }

    function lazyVideo() {
      if (video && !video.getAttribute("src")) {
        video.src = "assets/video/hero.mp4";
        const p = video.play && video.play();
        if (p && p.catch) p.catch(() => {});
      }
    }

    function openProposal(idea) {
      if (!proposal) return;
      if (f.idea && idea) f.idea.value = idea;
      proposal.classList.add("is-open");
      proposal.setAttribute("aria-hidden", "false");
      proposalOpen = true; syncLock();
      lazyVideo();
      open = true;
      if (!(history.state && history.state.proposal)) {
        try { history.pushState({ proposal: true }, ""); } catch (e) {}
      }
      setTimeout(() => { if (f.idea) try { f.idea.focus(); } catch (e) {} }, 360);
    }
    function closeProposal() {
      if (!proposal) return;
      proposal.classList.remove("is-open");
      proposal.setAttribute("aria-hidden", "true");
      proposalOpen = false; syncLock();
      if (video) { try { video.pause(); } catch (e) {} }
      open = false;
    }
    function goBack() {
      if (history.state && history.state.proposal) history.back();
      else closeProposal();
    }

    if (backBtn) backBtn.addEventListener("click", goBack);
    window.addEventListener("popstate", () => { if (open) closeProposal(); });
    document.addEventListener("keydown", (e) => { if (open && e.key === "Escape") goBack(); });

    /* ---- validation + Firestore submit ---- */
    function setError(input, on) {
      const field = input && input.closest(".field");
      if (field) field.classList.toggle("is-error", !!on);
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (panel) {
      [f.idea, f.category, f.budget, f.email, f.phone].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", () => setError(el, false));
        el.addEventListener("change", () => setError(el, false));
      });

      panel.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.className = "pform__msg";
        msg.textContent = "";

        const number = (f.phone.value || "").trim();
        const dialCode = f.country ? f.country.value : "";
        const countryName = (f.country && f.country.selectedOptions[0])
          ? (f.country.selectedOptions[0].dataset.country || "") : "";
        const data = {
          idea: (f.idea.value || "").trim(),
          category: f.category.value || "",
          budget: f.budget.value || "",
          email: (f.email.value || "").trim(),
          country: countryName,
          dialCode: dialCode,
          phone: number,
          phoneFull: (dialCode ? dialCode + " " : "") + number,
          whatsapp: !!(f.whats && f.whats.checked),
          callOnly: !!(f.callOnly && f.callOnly.checked),
        };

        let firstBad = null;
        const check = (el, bad) => { setError(el, bad); if (bad && !firstBad) firstBad = el; };
        check(f.idea, !data.idea);
        check(f.category, !data.category);
        check(f.budget, !data.budget);
        check(f.email, !emailRe.test(data.email));
        check(f.phone, !data.phone);
        if (firstBad) {
          msg.className = "pform__msg is-error";
          msg.textContent = "Preencha os campos destacados para continuar.";
          try { firstBad.focus(); } catch (e) {}
          return;
        }

        const submitBtn = panel.querySelector(".pform__submit");
        if (submitBtn) submitBtn.disabled = true;
        msg.className = "pform__msg";
        msg.textContent = "A enviar a sua proposta…";

        try {
          if (!db) throw new Error("firestore-unavailable");
          await db.collection("proposals").add(Object.assign({}, data, {
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: location.hostname,
            userAgent: navigator.userAgent,
          }));
          msg.className = "pform__msg is-ok";
          msg.textContent = "✦ Proposta enviada! A equipa Unitech entra em contacto em breve.";
          panel.reset();
        } catch (err) {
          msg.className = "pform__msg is-error";
          msg.textContent = "Não foi possível enviar agora. Tente novamente em instantes.";
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  })();

  /* ---------- Hero idea field → collapses into a floating FAB on scroll ---------- */
  (function () {
    const form = $("#askForm");
    const fab = $("#ideaFab");
    if (!form || !fab) return;

    let ticking = false;
    function update() {
      ticking = false;
      // nothing happens until the field reaches the header — then it dissolves into it
      const top = form.getBoundingClientRect().top;
      const fadeStart = 178;   // field top below this → fully visible
      const fadeEnd = 96;      // field top at the header → fully dissolved
      let vis = (top - fadeEnd) / (fadeStart - fadeEnd);
      vis = Math.min(Math.max(vis, 0), 1);
      form.style.setProperty("--fade", vis.toFixed(3));

      const gone = vis <= 0.02;
      form.classList.toggle("is-gone", gone);
      fab.classList.toggle("is-on", gone);
    }
    addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();

    // tapping the FAB brings the idea field back
    fab.addEventListener("click", () => {
      const input = $("#askInput");
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: reduce ? 0 : 0.6 });
      else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      if (input) setTimeout(() => { try { input.focus(); } catch (e) {} }, reduce ? 0 : 540);
    });
  })();
  /* ---------- Reveal on scroll (ported; scoped to the Inovação section) ---------- */
  (function () {
    const revs = Array.from(document.querySelectorAll(".uns-inova .reveal, .uns-services .reveal"));
    if (!revs.length) return;
    revs.forEach((el) => {
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
      const i = sibs.indexOf(el);
      if (sibs.length > 1) el.style.setProperty("--d", (i * 0.08).toFixed(2) + "s");
    });
    if (reduce || !("IntersectionObserver" in window)) { revs.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revs.forEach((el) => io.observe(el));
  })();
  /* ---------- Nav state (ported): glass bar once the page is scrolled ---------- */
  (function () {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 30);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();
})();
