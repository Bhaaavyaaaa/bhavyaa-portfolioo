/* ==========================================================================
   BHAVYA ARORA — MUVIQ case study
   1. Asset slots: each image uses its src, else its data-alt-src; if
      neither file exists the slot shows an "Asset needed" frame.
   2. Lightbox for screenshots and creatives (native <dialog>).
   ========================================================================== */

(() => {
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* 1 — asset slots ------------------------------------------------------- */
  // Probe each file up front (lazy images off-screen would otherwise only
  // report a missing file once scrolled to). The probe shares the browser
  // cache with the real <img>, so an existing file is fetched once.
  const exists = (src) => new Promise((ok) => {
    const probe = new Image();
    probe.onload = () => ok(true);
    probe.onerror = () => ok(false);
    probe.src = src;
  });

  $$('[data-asset-slot]').forEach(async (slot) => {
    const img = slot.querySelector('img');
    if (!img) return;
    const primary = img.getAttribute('src');
    const alt = img.dataset.altSrc;
    if (await exists(primary)) return;
    if (alt && await exists(alt)) { img.src = alt; return; }
    slot.classList.add('is-missing');
    const btn = slot.querySelector('.mq-zoom');
    if (btn) btn.disabled = true;
  });

  /* 2 — lightbox ---------------------------------------------------------- */
  if (typeof HTMLDialogElement !== 'function') return;

  const dlg = document.createElement('dialog');
  dlg.className = 'mq-lightbox';
  dlg.setAttribute('aria-label', 'Enlarged image');
  dlg.innerHTML =
    '<div class="mq-lightbox-bar mono"><span class="mq-lightbox-cap"></span>' +
    '<button class="mq-lightbox-close mono" type="button">Close ✕</button></div>' +
    '<div class="mq-lightbox-frame"><img alt="" /></div>';
  document.body.appendChild(dlg);

  const big = dlg.querySelector('img');
  const cap = dlg.querySelector('.mq-lightbox-cap');
  const lenis = () => (window.Site && window.Site.lenis) || null;

  $$('.mq-zoom').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      if (!img || !img.naturalWidth) return;
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      cap.textContent = img.alt;
      dlg.classList.toggle('is-wide', img.naturalWidth / img.naturalHeight > 1.4);
      dlg.showModal();
      document.documentElement.classList.add('is-locked');
      if (lenis()) lenis().stop();
    });
  });

  dlg.querySelector('.mq-lightbox-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.classList.contains('mq-lightbox-frame')) dlg.close();
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    if (lenis()) lenis().start();
  });
})();
