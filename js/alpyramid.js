/* ==========================================================================
   BHAVYA ARORA — ALPYRAMID case study
   Image slots. Each <figure data-al-slot> holds an <img data-src>. A slot
   marked data-pending makes no request and shows its "Asset needed" frame;
   remove data-pending once the file is in assets/work/alpyramid/ and the
   image loads. A failed load falls back to the same frame.
   Lightbox for .mq-zoom buttons comes from js/muviq.js.
   ========================================================================== */

(() => {
  document.querySelectorAll('[data-al-slot]').forEach((slot) => {
    const img = slot.querySelector('img[data-src]');
    const btn = slot.querySelector('.mq-zoom');
    const missing = () => {
      slot.classList.add('is-missing');
      if (btn) btn.disabled = true;
    };
    if (!img || slot.hasAttribute('data-pending')) { missing(); return; }
    img.addEventListener('error', missing, { once: true });
    img.src = img.dataset.src;
  });
})();
