/* ==========================================================================
   BHAVYA ARORA — Core (every page)
   Smooth scroll, reveals, theme switching, nav, mobile menu, parallax,
   cursor, magnetic buttons, fit-to-width type.
   Vanilla JS. Lenis (optional) for smooth scroll; everything degrades
   without it. Page scripts register with window.Site (see bottom).
   ========================================================================== */

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MOBILE = window.matchMedia('(max-width: 760px)');

  // Document-space box of an element (layout reads happen only in measure).
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  };

  const state = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth, velocity: 0 };

  /* ---------------------------------------------------------------------- */
  /* Frame loop                                                              */
  /* measure → layout reads (on load, resize, font load, content resize)     */
  /* scroll  → style writes only, when the scroll position changed           */
  /* frame   → every frame (marquee, cursor)                                  */
  /* ---------------------------------------------------------------------- */

  const measureFns = [];
  const scrollFns = [];
  const frameFns = [];
  let needsMeasure = true;
  let needsScroll = true;
  const requestMeasure = () => { needsMeasure = true; };

  let lenis = null;

  const loop = (time) => {
    if (lenis) lenis.raf(time);
    if (needsMeasure) {
      needsMeasure = false;
      state.vh = window.innerHeight;
      state.vw = window.innerWidth;
      measureFns.forEach((fn) => fn(state));
      needsScroll = true;
    }
    const y = window.scrollY;
    state.velocity = lerp(state.velocity, y - state.y, 0.2);
    if (Math.abs(state.velocity) < 0.01) state.velocity = 0;
    if (y !== state.y || needsScroll) {
      state.y = y;
      needsScroll = false;
      scrollFns.forEach((fn) => fn(state));
    }
    frameFns.forEach((fn) => fn(state, time));
    requestAnimationFrame(loop);
  };

  window.addEventListener('resize', requestMeasure);
  window.addEventListener('load', requestMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestMeasure);
  if ('ResizeObserver' in window) {
    let first = true;
    new ResizeObserver(() => { if (first) { first = false; return; } requestMeasure(); }).observe(body);
  }

  /* ---------------------------------------------------------------------- */
  /* Smooth scroll + in-page anchors                                         */
  /* ---------------------------------------------------------------------- */

  const initLenis = () => {
    if (reduced || lenis || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    Site.lenis = lenis;
    if (body.classList.contains('menu-open')) lenis.stop();
  };
  // Lenis loads async from the CDN, so a slow or blocked CDN never delays
  // the page; it takes over whenever it arrives.
  const lenisScript = $('#lenis-js');
  if (lenisScript) lenisScript.addEventListener('load', initLenis);

  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]:not(.skip-link)').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id === '#top') { e.preventDefault(); scrollToTarget(0); return; }
      const el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      scrollToTarget(el);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Reveals                                                                 */
  /* [data-intro] regions (hero, page heads) reveal on load; everything else */
  /* as it scrolls into view.                                                */
  /* ---------------------------------------------------------------------- */

  const inIntro = (el) => el.closest('[data-intro]');
  const inMenu = (el) => el.closest('.menu');

  const revealTargets = new Set();
  $$('.line').forEach((l) => {
    if (!inIntro(l) && !inMenu(l)) revealTargets.add(l.parentElement);
  });
  $$('.fade-up, .reveal-el, .reveal-rule, .js-reveal')
    .forEach((el) => { if (!inIntro(el) && !inMenu(el)) revealTargets.add(el); });

  // Clip-path masked media is observed through its parent: a fully clipped
  // element reports no intersection area and would never reveal.
  const proxyMap = new Map();
  $$('.js-media').forEach((el) => {
    const parent = el.parentElement;
    if (!proxyMap.has(parent)) proxyMap.set(parent, []);
    proxyMap.get(parent).push(el);
    revealTargets.add(parent);
  });

  const counted = new WeakSet();
  const runCount = (el) => {
    if (counted.has(el)) return;
    counted.add(el);
    const to = parseInt(el.dataset.to, 10);
    if (reduced || Number.isNaN(to)) return;          // markup already holds the final value
    const t0 = performance.now();
    const dur = 1600;
    const step = (now) => {
      const t = clamp((now - t0) / dur);
      el.textContent = Math.round((1 - Math.pow(1 - t, 4)) * to);
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };

  const reveal = (el) => {
    el.classList.add('is-in');
    (proxyMap.get(el) || []).forEach((m) => m.classList.add('is-in'));
    $$('.js-count', el).forEach(runCount);
  };

  if (reduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach(reveal);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------------- */
  /* Theme switching (light ↔ dark) by the section under the viewport centre */
  /* ---------------------------------------------------------------------- */

  const themed = $$('[data-bg]');
  if (themed.length && 'IntersectionObserver' in window) {
    const themeIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) body.dataset.theme = entry.target.dataset.bg;
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    themed.forEach((s) => themeIO.observe(s));
  }

  /* ---------------------------------------------------------------------- */
  /* Nav: hide on scroll down, progress bar                                  */
  /* ---------------------------------------------------------------------- */

  const navEl = $('.nav');
  const navBar = $('.nav-progress span');
  let navAnchorY = window.scrollY;
  let maxScroll = 1;

  measureFns.push(() => { maxScroll = document.documentElement.scrollHeight - state.vh; });
  scrollFns.push(({ y }) => {
    if (navEl && !body.classList.contains('menu-open') && y !== navAnchorY) {
      if (y < 80) { navEl.classList.remove('is-hidden'); navAnchorY = y; }
      else if (y - navAnchorY > 60) { navEl.classList.add('is-hidden'); navAnchorY = y; }
      else if (navAnchorY - y > 30) { navEl.classList.remove('is-hidden'); navAnchorY = y; }
      else if ((y > navAnchorY) === navEl.classList.contains('is-hidden')) navAnchorY = y;
    }
    if (navBar) navBar.style.transform = `scaleX(${maxScroll > 0 ? clamp(y / maxScroll) : 0})`;
  });

  // Keyboard users tabbing into the page must always see the nav.
  if (navEl) navEl.addEventListener('focusin', () => navEl.classList.remove('is-hidden'));

  /* ---------------------------------------------------------------------- */
  /* Mobile menu                                                             */
  /* ---------------------------------------------------------------------- */

  const toggle = $('.nav-toggle');
  const menu = $('#menu');
  if (toggle && menu) {
    const label = $('.nav-toggle-label', toggle);
    const outside = [...body.children].filter((el) => el !== navEl && el !== menu && !el.matches('script, .grain, .cursor'));
    let open = false;
    let hideTimer = 0;

    const setOpen = (value, { restoreFocus = true } = {}) => {
      if (value === open) return;
      open = value;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (label) label.textContent = open ? 'Close' : 'Menu';
      body.classList.toggle('menu-open', open);
      outside.forEach((el) => { el.inert = open; });
      clearTimeout(hideTimer);

      if (open) {
        menu.hidden = false;
        navEl.classList.remove('is-hidden');
        root.classList.add('is-locked');
        if (lenis) lenis.stop();
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open', 'is-in')));
        const first = $('a', menu);
        if (first) first.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open', 'is-in');
        root.classList.remove('is-locked');
        if (lenis) lenis.start();
        hideTimer = setTimeout(() => { menu.hidden = true; }, reduced ? 0 : 800);
        if (restoreFocus) toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(!open));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, { restoreFocus: false }); });
    MOBILE.addEventListener('change', (e) => { if (!e.matches) setOpen(false, { restoreFocus: false }); });
  }

  /* ---------------------------------------------------------------------- */
  /* Parallax — travel is capped at the layer's overscan, so an edge can    */
  /* never become visible.                                                   */
  /* ---------------------------------------------------------------------- */

  const parallax = reduced ? [] : $$('.js-parallax').map((el) => ({ el, frame: el.parentElement, top: 0, height: 0, overscan: 0 }));
  if (parallax.length) {
    measureFns.push(() => {
      parallax.forEach((p) => {
        const b = box(p.frame);
        p.top = b.top;
        p.height = b.height;
        p.overscan = (p.el.offsetHeight - p.frame.offsetHeight) / 2;
      });
    });
    scrollFns.push(({ y, vh }) => {
      parallax.forEach((p) => {
        const top = p.top - y;
        if (p.overscan <= 0 || top + p.height < -50 || top > vh + 50) return;
        const progress = clamp((top + p.height / 2 - vh / 2) / (vh / 2 + p.height / 2), -1, 1);
        p.el.style.transform = `translate3d(0, ${(-progress * p.overscan * 0.95).toFixed(2)}px, 0)`;
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Fit-to-width type ([data-fit]): sized so the line exactly fills its     */
  /* container. Linear in font-size, so one measurement is enough.           */
  /* ---------------------------------------------------------------------- */

  const fits = $$('[data-fit]');
  if (fits.length) {
    measureFns.push(() => {
      fits.forEach((el) => {
        const target = el.parentElement.clientWidth
          - parseFloat(getComputedStyle(el.parentElement).paddingLeft)
          - parseFloat(getComputedStyle(el.parentElement).paddingRight);
        const w = el.getBoundingClientRect().width;
        if (!w || !target) return;
        const size = parseFloat(getComputedStyle(el).fontSize);
        const next = Math.floor(size * (target / w) * 100) / 100;
        if (Math.abs(next - size) > 0.2) el.style.fontSize = `${next}px`;
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Cursor + magnetic button                                                */
  /* ---------------------------------------------------------------------- */

  const cursor = $('.cursor');
  const cursorLabel = $('.cursor-label');
  if (finePointer && cursor) {
    root.classList.add('has-cursor');
    const mouse = { x: state.vw / 2, y: state.vh / 2 };
    const cpos = { x: mouse.x, y: mouse.y };
    let dirty = false;
    let mode = '';
    cursor.style.opacity = '0';

    // Hover state is derived from what is under the pointer each time the
    // pointer moves OR the page scrolls. mouseenter/leave alone don't fire
    // when content scrolls under a still pointer, which left "VIEW" stuck.
    const sync = () => {
      const el = document.elementFromPoint(mouse.x, mouse.y);
      const view = el && el.closest('[data-cursor]');
      const link = !view && el && el.closest('a, button, input, textarea, select, label');
      const next = view ? 'view' : link ? 'link' : '';
      if (next === mode) return;
      mode = next;
      if (view && cursorLabel) cursorLabel.textContent = view.dataset.cursor;
      cursor.classList.toggle('is-view', mode === 'view');
      cursor.classList.toggle('is-link', mode === 'link');
    };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      cursor.style.opacity = '1';
      dirty = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
    scrollFns.push(() => { dirty = true; });

    frameFns.push(() => {
      const dx = mouse.x - cpos.x;
      const dy = mouse.y - cpos.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        cpos.x += dx * 0.2;
        cpos.y += dy * 0.2;
        cursor.style.transform = `translate3d(${cpos.x.toFixed(1)}px, ${cpos.y.toFixed(1)}px, 0)`;
      }
      if (dirty) { dirty = false; sync(); }
    });
  }

  const magnets = finePointer && !reduced ? $$('.js-magnetic') : [];
  magnets.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${dx * 0.25}px, ${dy * 0.25}px, 0)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.8s cubic-bezier(0.16,1,0.3,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 800);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Public API for page scripts                                             */
  /* ---------------------------------------------------------------------- */

  const Site = {
    $, $$, clamp, lerp, box,
    reduced, finePointer, MOBILE, state,
    lenis: null,
    scrollTo: scrollToTarget,
    requestMeasure,
    onMeasure: (fn) => { measureFns.push(fn); needsMeasure = true; },
    onScroll: (fn) => { scrollFns.push(fn); needsScroll = true; },
    onFrame: (fn) => { frameFns.push(fn); },
  };
  window.Site = Site;

  /* ---------------------------------------------------------------------- */
  /* Start — no loading screen; reveal the intro as soon as the page is      */
  /* ready. Page scripts (deferred, after this file) have registered by then. */
  /* ---------------------------------------------------------------------- */

  const start = () => {
    root.classList.add('is-ready');
    body.classList.add('is-loaded');
    $$('[data-intro] .line').forEach((l) => l.parentElement.classList.add('is-in'));
    $$('[data-intro] .fade-up, [data-intro] .reveal-el, [data-intro] .reveal-rule, [data-intro] .js-reveal').forEach((el) => el.classList.add('is-in'));
    initLenis();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(() => requestAnimationFrame(start));
})();
