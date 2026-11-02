/* ===== M.K. Tour & Travels – script.js =====
   Page content lives in index.html. This file only adds behaviour. */
(() => {
  'use strict';

  document.documentElement.classList.add('js'); // lets the CSS hide items that will animate in

  const WA_NUMBER = '919157745453';
  const GOOGLE = { API_KEY: '', PLACE_ID: 'ChIJr2yrsGNrVzkRAmwLAuIw53A', CACHE_HOURS: 6 }; // paste your Places API key in API_KEY

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Quick booking -> WhatsApp */
  $('#quickBook').addEventListener('click', () => {
    const text = `Hello M.K. Tour & Travels, I need a quote for: ${$('#quickService').value}.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  /* Mobile menu */
  const toggle = $('#menuToggle');
  const menu = $('#mobileMenu');
  function setMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.innerHTML = icon(open ? 'close' : 'menu');
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  /* Active menu link while scrolling */
  const links = $$('.nav__link, .mobile-menu__link');
  const setActive = (id) => links.forEach((l) => {
    const on = l.hash === '#' + id;
    l.classList.toggle('is-active', on);
    if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
  });
  const spySections = [...$$('main section[id]'), $('#contact')];
  let spyQueued = false;
  function updateActive() {
    spyQueued = false;
    const line = window.innerHeight * 0.4;
    let id = 'home';
    spySections.forEach((s) => { if (s.getBoundingClientRect().top <= line) id = s.dataset.nav || s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) id = 'contact';
    setActive(id);
  }
  window.addEventListener('scroll', () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateActive); } }, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();

  /* Infinite loops (area strip + services): repeat the items until the track is wider than any screen,
     then slide it by exactly half. The loop never shows a gap. */
  if (!reduceMotion) {
    $$('[data-loop]').forEach((track) => {
      const items = Array.from(track.children);
      const baseWidth = track.scrollWidth;
      if (!baseWidth) return;
      const k = Math.max(1, Math.ceil(Math.max(window.screen.width, window.innerWidth, 1920) * 1.25 / baseWidth)); // copies per half
      const makeCopies = () => items.map((node) => {
        const copy = node.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('a, button').forEach((el) => { el.tabIndex = -1; });
        return copy;
      });
      for (let i = 0; i < k * 2 - 1; i++) track.append(...makeCopies()); // total = 2k copies
      track.parentElement.classList.add('is-looping');
      const base = parseFloat(getComputedStyle(track).animationDuration) || 30;
      track.style.animationDuration = (base * k) + 's'; // keep the same speed however many copies
    });
  }

  /* Reviews carousel (buttons, keyboard, autoplay that pauses on hover/touch/focus) */
  const viewport = $('#reviewViewport');
  const behavior = reduceMotion ? 'auto' : 'smooth';
  const step = () => { const c = viewport.querySelector('.review-card'); return c ? c.offsetWidth + 20 : viewport.clientWidth; };
  const atEnd = () => viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 4;
  const next = () => viewport.scrollTo({ left: atEnd() ? 0 : viewport.scrollLeft + step(), behavior });
  const prev = () => viewport.scrollTo({ left: viewport.scrollLeft <= 4 ? viewport.scrollWidth : viewport.scrollLeft - step(), behavior });
  $('#reviewNext').addEventListener('click', next);
  $('#reviewPrev').addEventListener('click', prev);
  viewport.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });
  if (!reduceMotion) {
    let timer = setInterval(next, 5000);
    const stop = () => clearInterval(timer);
    const start = () => { clearInterval(timer); timer = setInterval(next, 5000); };
    ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => viewport.addEventListener(ev, stop, { passive: true }));
    ['mouseleave', 'focusout', 'touchend'].forEach((ev) => viewport.addEventListener(ev, start, { passive: true }));
  }

  /* ---------- Scroll animations ---------- */
  const REVEALS = [
    ['.section__intro:not(.section__head .section__intro), .section__head', 'up'],
    ['.areas', 'up'],
    ['.service-card', 'up'],
    ['.route-card:nth-child(odd)', 'left'],
    ['.route-card:nth-child(even)', 'right'],
    ['.gallery__item', 'zoom'],
    ['.feature-card', 'zoom'],
    ['.carousel', 'up'],
    ['.faq__item', 'up'],
    ['.cta__box', 'zoom'],
    ['.footer__grid > div', 'up']
  ];
  const REVEAL_CLASSES = ['reveal', 'reveal--up', 'reveal--left', 'reveal--right', 'reveal--zoom', 'is-visible'];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      revealObserver.unobserve(el);
      el.classList.add('is-visible');
      setTimeout(() => el.classList.remove(...REVEAL_CLASSES), 1500); // hand hover effects back to the normal styles
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.documentElement.classList.add('motion'); // CSS only animates when motion is allowed
    const sectionObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-inview'); // stays on: draws the title underline, pops the icons
      sectionObserver.unobserve(entry.target);
    }), { threshold: 0.15 });
    $$('main .section, main .cta').forEach((s) => sectionObserver.observe(s));
    REVEALS.forEach(([selector, kind]) => {
      const counts = new Map(); // stagger siblings one after another
      $$(selector).forEach((el) => {
        const n = counts.get(el.parentElement) || 0;
        counts.set(el.parentElement, n + 1);
        el.classList.add('reveal', 'reveal--' + kind);
        el.style.setProperty('--d', Math.min(n * 0.09, 0.45) + 's');
        revealObserver.observe(el);
      });
    });
  }

  const progressBar = $('#scrollProgress');
  let fxQueued = false;
  function updateScrollFx() {
    fxQueued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (!reduceMotion && max > 0) progressBar.style.transform = `scaleX(${(window.scrollY / max).toFixed(4)})`;
  }
  window.addEventListener('scroll', () => { if (!fxQueued) { fxQueued = true; requestAnimationFrame(updateScrollFx); } }, { passive: true });
  window.addEventListener('resize', updateScrollFx);
  updateScrollFx();

  /* Footer year */
  $('#year').textContent = new Date().getFullYear();

  /* ===== Optional: live Google Business data (needs GOOGLE.API_KEY) ===== */
  function renderGallery(photos) {
    $('#galleryGrid').innerHTML = photos.map((p, i) => `
      <a class="gallery__item" href="${esc(p.full)}" target="_blank" rel="noopener">
        <img class="gallery__img" src="${esc(p.thumb)}" width="700" height="700" loading="lazy" alt="M.K. Tour &amp; Travels photo ${i + 1}">
      </a>`).join('');
  }

  function renderReviews(list) {
    $('#reviewTrack').innerHTML = list.map((r) => {
      const letter = esc((r.name[0] || 'G').toUpperCase());
      const avatar = r.photo ? `<img src="${esc(r.photo)}" alt="" referrerpolicy="no-referrer">` : letter; // photo if Google gives one, else the letter
      return `
        <figure class="card review-card">
          <div class="review-card__head">
            <span class="avatar" aria-hidden="true">${avatar}</span>
            <span class="review-card__who"><span class="review-card__name">${esc(r.name)}</span><span class="review-card__date">${esc(r.when)}</span></span>
            <svg class="icon icon--google" role="img" aria-label="Google review"><use href="#i-google"/></svg>
          </div>
          <div class="review-card__stars" role="img" aria-label="${r.rating} out of 5 stars">${icon('star', 'icon--star').repeat(r.rating)}</div>
          <blockquote class="review-card__text">${esc(r.text)}</blockquote>
        </figure>`;
    }).join('');
    viewport.scrollLeft = 0;
  }

  function applyGoogle(data) {
    if (data.rating) $$('[data-rating]').forEach((el) => { el.textContent = Number(data.rating).toFixed(1); });
    if (data.userRatingCount) $$('[data-count]').forEach((el) => { el.textContent = data.userRatingCount; });
    const media = (name, w) => `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&key=${GOOGLE.API_KEY}`;
    if (data.photos && data.photos.length) {
      renderGallery(data.photos.slice(0, 6).map((p) => ({ thumb: media(p.name, 800), full: media(p.name, 1600) })));
      $('#heroImage').src = media(data.photos[0].name, 900);
    }
    if (data.reviews && data.reviews.length) {
      renderReviews(data.reviews.filter((r) => r.rating >= 4).map((r) => ({
        name: (r.authorAttribution && r.authorAttribution.displayName) || 'Google user',
        photo: r.authorAttribution && r.authorAttribution.photoUri,
        rating: r.rating,
        text: (r.originalText && r.originalText.text) || (r.text && r.text.text) || '',
        when: r.relativePublishTimeDescription || ''
      })));
    }
  }

  async function loadGoogle() {
    if (!GOOGLE.API_KEY) return;
    const KEY = 'mk_google_cache';
    try {
      const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (cached && Date.now() - cached.time < GOOGLE.CACHE_HOURS * 3600000) return applyGoogle(cached.data);
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places/' + GOOGLE.PLACE_ID, {
        headers: { 'X-Goog-Api-Key': GOOGLE.API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,photos' }
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      try { localStorage.setItem(KEY, JSON.stringify({ time: Date.now(), data })); } catch (e) { /* ignore */ }
      applyGoogle(data);
    } catch (e) { console.warn('Google data not loaded, showing built-in content.', e); }
  }

  const heroImage = $('#heroImage'); // hide a broken hero photo (no inline handlers, so a strict CSP works)
  const hideHero = () => heroImage.remove();
  heroImage.addEventListener('error', hideHero);
  if (heroImage.complete && !heroImage.naturalWidth) hideHero();
  loadGoogle();
})();
