/* ==========================================================================
   BHAVYA ARORA — Homepage scenes
   Hero drift, word-fill statement, WORK scene, APPROACH sticky scene,
   marquee. Registers with window.Site (js/core.js).
   ========================================================================== */

(() => {
  const Site = window.Site;
  if (!Site) return;
  const { $, $$, clamp, box, reduced, MOBILE } = Site;

  // Keep in sync with the stacked-hero media query in css/home.css
  const HERO_STACKED = window.matchMedia('(max-width: 760px), (max-width: 1100px) and (orientation: portrait)');

  /* ---------------------------------------------------------------------- */
  /* Split helpers                                                           */
  /* ---------------------------------------------------------------------- */

  $$('.hero-bgtype-line').forEach((line, li) => {
    const text = line.textContent.trim();
    line.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.transitionDelay = `${0.15 + li * 0.12 + i * 0.045}s`;
      line.appendChild(s);
    });
  });

  const wordfill = $('.js-wordfill');
  let words = [];
  if (wordfill) {
    const text = wordfill.textContent.trim().split(/\s+/);
    wordfill.textContent = '';
    text.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      wordfill.appendChild(s);
      if (i < text.length - 1) wordfill.appendChild(document.createTextNode(' '));
    });
    words = $$('.w', wordfill);
  }

  /* ---------------------------------------------------------------------- */
  /* APPROACH — sticky scene on tablet/desktop, stacked list otherwise       */
  /* ---------------------------------------------------------------------- */

  const approach = $('.js-approach');
  const stages = $$('.stage');
  const railSteps = $$('.approach-rail-step');
  const approachBar = $('.js-approach-bar');
  let activeStage = -1;
  let sticky = false;

  const setStage = (idx) => {
    activeStage = idx;
    stages.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-past', i < idx);
    });
    railSteps.forEach((s, i) => s.classList.toggle('is-active', i <= idx));
  };

  const syncApproachMode = () => {
    if (!approach) return;
    sticky = !reduced && !MOBILE.matches;
    approach.classList.toggle('is-sticky', sticky);
    activeStage = -1;                          // force a recompute
    Site.requestMeasure();
  };
  syncApproachMode();
  MOBILE.addEventListener('change', syncApproachMode);

  /* ---------------------------------------------------------------------- */
  /* Scroll-driven scenes                                                    */
  /* ---------------------------------------------------------------------- */

  const hero = $('.hero');
  const heroTypeA = $('.js-hero-type-a');
  const heroTypeB = $('.js-hero-type-b');
  const heroImg = $('.js-hero-img');
  const workIntro = $('.work-intro');
  const workSticky = $('.work-intro-sticky');
  const workWord = $('.js-work-word');
  const approachSticky = $('.approach-sticky');

  const m = { heroH: 0, fill: null, work: null, workPin: 0, appr: null, apprPin: 0 };

  Site.onMeasure(() => {
    if (hero) m.heroH = hero.offsetHeight;
    if (wordfill) m.fill = box(wordfill);
    if (workIntro && workSticky) { m.work = box(workIntro); m.workPin = workSticky.offsetHeight; }
    if (approach && approachSticky) { m.appr = box(approach); m.apprPin = approachSticky.offsetHeight; }
  });

  // Progress through a pinned scene: 0 when it reaches the top, 1 when it
  // unpins. Uses the pinned panel's real height, not window.innerHeight,
  // so mobile toolbar changes can't skew it.
  const pinProgress = (b, pin, y) => clamp((y - b.top) / Math.max(1, b.height - pin));

  if (!reduced) {
    Site.onScroll(({ y, vh, vw }) => {
      // HERO — kept deliberately subtle: the name drifts apart behind the
      // cut-out figure, which only eases in by ≤5%.
      if (hero && m.heroH && y < m.heroH * 1.2) {
        const p = clamp(y / m.heroH);
        const shift = p * vw * (HERO_STACKED.matches ? 0.08 : 0.16);
        if (heroTypeA) heroTypeA.style.transform = `translate3d(${-shift}px,0,0)`;
        if (heroTypeB) heroTypeB.style.transform = `translate3d(${shift}px,0,0)`;
        if (heroImg) heroImg.style.transform = `scale(${1 + p * 0.05})`;
      }

      if (m.fill && words.length) {
        const top = m.fill.top - y;
        const p = clamp((vh * 0.82 - top) / (m.fill.height + vh * 0.3));
        const n = Math.floor(p * words.length * 1.05);
        words.forEach((w, i) => w.classList.toggle('on', i < n));
      }

      if (m.work && workWord) {
        workWord.style.setProperty('--p', pinProgress(m.work, m.workPin, y).toFixed(4));
      }

      if (sticky && m.appr) {
        const p = pinProgress(m.appr, m.apprPin, y);
        if (approachBar) approachBar.style.transform = `scaleY(${p})`;
        const idx = Math.min(stages.length - 1, Math.floor(p * stages.length));
        if (idx !== activeStage) setStage(idx);
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Marquee — measured on every Site measure (incl. document.fonts.ready,  */
  /* so the loop width is the real webfont width), paused off-screen.        */
  /* ---------------------------------------------------------------------- */

  const marquees = $$('.js-marquee').map((el) => {
    const track = $('.marquee-track', el);
    return { el, track, unit: track.firstElementChild, unitW: 0, dir: parseFloat(el.dataset.dir || 1), x: 0, visible: true };
  });

  if (marquees.length) {
    Site.onMeasure(({ vw }) => {
      marquees.forEach((mq) => {
        mq.unitW = mq.unit.getBoundingClientRect().width;
        let guard = 0;
        while (mq.track.children.length * mq.unitW < vw * 2 + mq.unitW && guard < 12) {
          const c = mq.unit.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          mq.track.appendChild(c);
          guard++;
        }
        if (mq.unitW) mq.x %= mq.unitW;
      });
    });

    if ('IntersectionObserver' in window) {
      const mio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const mq = marquees.find((q) => q.el === e.target);
          if (mq) mq.visible = e.isIntersecting;
        });
      });
      marquees.forEach((mq) => mio.observe(mq.el));
    }

    if (!reduced) {
      Site.onFrame(({ velocity }) => {
        const boost = clamp(Math.abs(velocity) * 0.25, 0, 14);
        marquees.forEach((mq) => {
          if (!mq.visible || !mq.unitW) return;
          mq.x -= (0.6 + boost) * mq.dir;
          if (mq.x <= -mq.unitW) mq.x += mq.unitW;
          if (mq.x > 0) mq.x -= mq.unitW;
          mq.track.style.transform = `translate3d(${mq.x.toFixed(2)}px,0,0)`;
        });
      });
    }
  }
})();
