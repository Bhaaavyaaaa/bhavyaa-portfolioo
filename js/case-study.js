/* ==========================================================================
   BHAVYA ARORA — Case study
   Chapter index: highlights the chapter currently being read.
   ========================================================================== */

(() => {
  const Site = window.Site;
  if (!Site || !('IntersectionObserver' in window)) return;
  const { $$ } = Site;

  const links = $$('.cs-index a[href^="#"]');
  const chapters = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (!chapters.length) return;

  const setActive = (id) => {
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  // A chapter is "current" while it crosses a line 35% down the viewport.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-35% 0px -64% 0px', threshold: 0 });
  chapters.forEach((c) => io.observe(c));
})();
