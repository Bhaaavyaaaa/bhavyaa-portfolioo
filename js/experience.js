/* ==========================================================================
   BHAVYA ARORA — Experience
   Journey rails: each .ev-rail fills from the top as the viewport centre
   moves through its section. Reduced motion shows the rails full.
   ========================================================================== */

(() => {
  const rails = [...document.querySelectorAll('.ev-rail')];
  if (!rails.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { rails.forEach((r) => r.style.setProperty('--p', 1)); return; }

  let queued = false;
  const update = () => {
    queued = false;
    const mid = window.innerHeight * 0.55;
    rails.forEach((rail) => {
      const box = rail.getBoundingClientRect();
      const p = box.height ? (mid - box.top) / box.height : 0;
      rail.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();
