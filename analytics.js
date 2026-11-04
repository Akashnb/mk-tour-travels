/* ===== M.K. Tour & Travels – analytics.js =====
   Google Analytics 4 (Measurement ID below) plus event tracking for menu, cards and buttons.
   - Does nothing on localhost or when the file is opened from a folder, so your test visits are not counted.
   - To test on your live site: add ?ga_debug=1 to the address, then open GA4 > Admin > DebugView. */
(() => {
  'use strict';

  const GA_ID = 'G-RXKSXSLDDT';
  const DEBUG = /[?&]ga_debug=1\b/.test(location.search);
  const LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); }; // gtag.js needs the real `arguments` object
  if (LOCAL && !DEBUG) return;

  /* ---------- Standard Google tag ---------- */
  gtag('js', new Date());
  gtag('config', GA_ID, Object.assign({ transport_type: 'beacon' }, DEBUG ? { debug_mode: true } : {}));
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(tag);

  /* ---------- Helpers ---------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 100); // GA limit: 100 characters
  const slug = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const textOf = (el) => clean(el.getAttribute('aria-label') || el.textContent);

  function track(name, params = {}) {
    const data = {};
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      data[key] = typeof value === 'string' ? clean(value) : value;
    });
    gtag('event', name, data);
    if (DEBUG) console.log('[GA event]', name, data);
  }

  // Where on the page the click happened
  function placeOf(el) {
    if (el.closest('.mobile-menu')) return 'mobile_menu';
    if (el.closest('.site-header')) return 'header';
    if (el.closest('.mobile-bar')) return 'mobile_bar';
    if (el.closest('.site-footer')) return 'footer';
    if (el.closest('.cta')) return 'cta_banner';
    const section = el.closest('section[id]');
    return section ? section.id : 'page';
  }

  // Which card (fleet car, service, route, review) the click happened in
  function cardOf(el) {
    const kinds = [['.fleet-card', 'fleet'], ['.service-card', 'service'], ['.route-card', 'route'], ['.review-card', 'review']];
    for (const [selector, kind] of kinds) {
      const card = el.closest(selector);
      if (card) {
        const title = $('.card__title', card);
        return { kind, name: title ? clean(title.textContent) : '' };
      }
    }
    return null;
  }

  const waItem = (href) => { // the service named in the prefilled WhatsApp message
    try {
      const text = new URL(href, location.href).searchParams.get('text') || '';
      const match = text.match(/quote for:\s*(.+?)\.?$/i);
      return match ? match[1] : '';
    } catch (e) { return ''; }
  };

  /* ---------- Clicks (one listener covers the whole page) ---------- */
  document.addEventListener('click', (event) => {
    // composedPath still works when the clicked icon was replaced by another script (e.g. the menu button)
    const el = event.composedPath().find((n) => n.matches && n.matches('a, button, summary'));
    if (!el) return;

    const href = el.getAttribute('href') || '';
    const place = placeOf(el);
    const text = textOf(el);
    const card = cardOf(el);
    const base = { click_location: place, button_text: text };

    // Menu, logo and footer links
    const footerLink = place === 'footer' && href && !/^(tel:|mailto:|https?:)/.test(href);
    if (el.matches('.nav__link, .mobile-menu__link, .brand') || footerLink) {
      const where = el.matches('.nav__link') ? 'desktop_nav' : el.matches('.mobile-menu__link') ? 'mobile_nav' : el.matches('.brand') ? 'logo' : 'footer_nav';
      return track('menu_click', { menu_item: where === 'logo' ? 'Logo' : text, menu_location: where, link_url: href });
    }
    if (el.id === 'menuToggle') return track('mobile_menu_toggle', { state: el.getAttribute('aria-expanded') === 'true' ? 'open' : 'close' });

    // Reviews, FAQ, gallery
    if (el.id === 'reviewPrev' || el.id === 'reviewNext') return track('review_carousel_click', { direction: el.id === 'reviewNext' ? 'next' : 'previous' });
    if (el.matches('.review-card__toggle')) return track('review_read_more', { state: el.closest('.review-card').classList.contains('is-expanded') ? 'expanded' : 'collapsed' });
    if (el.matches('summary.faq__question')) {
      const details = el.closest('details');
      const question = $('.faq__q', el);
      return track('faq_toggle', { question: question ? question.textContent : text, state: details && details.open ? 'close' : 'open' });
    }
    if (el.matches('.gallery__item')) return track('gallery_click', { photo_number: Array.from(el.parentElement.children).indexOf(el) + 1 });

    // Call button
    if (href.startsWith('tel:')) {
      track('click_call', base);
      return track('generate_lead', { method: 'phone', lead_source: place });
    }

    // WhatsApp (links and the quick-booking button), with the card or service that was chosen
    if (/\/\/(wa\.me|api\.whatsapp\.com)/.test(href) || el.id === 'quickBook') {
      const quick = el.id === 'quickBook';
      const item = card ? card.name : quick ? ($('#quickService') || {}).value : waItem(href);
      const category = card ? card.kind : quick ? 'quick_booking' : '';
      track('click_whatsapp', Object.assign({}, base, { item_name: item, item_category: category }));
      track('generate_lead', { method: 'whatsapp', lead_source: place, item_name: item });
      if (card && card.kind === 'fleet') {
        track('select_item', { item_list_name: 'Our fleet', items: [{ item_id: slug(card.name), item_name: card.name, item_category: 'Fleet car' }] });
        track('fleet_book_click', { car_name: card.name });
      }
      if (card && card.kind === 'service') track('service_enquiry_click', { service_name: card.name });
      if (card && card.kind === 'route') track('route_quote_click', { route_name: card.name });
      return;
    }

    // Google Maps links and Instagram
    if (/google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(href)) {
      return track(place === 'reviews' ? 'click_google_reviews' : place === 'gallery' ? 'click_google_photos' : 'click_directions', base);
    }
    if (/instagram\.com/.test(href)) return track('click_instagram', base);

    // Any other button
    if (el.matches('.btn, .link-btn')) track('cta_click', Object.assign({}, base, { link_url: href }));
  });

  /* ---------- Sections the visitor reaches ---------- */
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const sectionObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const name = el.id || (el.classList.contains('cta') ? 'cta_banner' : 'footer');
      if (seen.has(name)) return;
      seen.add(name);
      sectionObserver.unobserve(el);
      track('section_view', { section_name: name });
      if (name === 'fleet') { // the cars the visitor was shown
        track('view_item_list', {
          item_list_name: 'Our fleet',
          items: Array.from(el.querySelectorAll('.fleet-card .card__title')).map((t, i) => ({ item_id: slug(t.textContent), item_name: clean(t.textContent), item_category: 'Fleet car', index: i + 1 }))
        });
      }
    }), { threshold: 0.25 });
    document.querySelectorAll('main section[id], .cta, .site-footer').forEach((s) => sectionObserver.observe(s));
  }

  /* ---------- How far visitors scroll ---------- */
  const depthMarks = [25, 50, 75, 90, 100];
  const depthSeen = new Set();
  let depthQueued = false;
  function checkDepth() {
    depthQueued = false;
    const doc = document.documentElement;
    const percent = Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100);
    depthMarks.forEach((mark) => {
      if (percent >= mark && !depthSeen.has(mark)) { depthSeen.add(mark); track('scroll_depth', { percent_scrolled: mark }); }
    });
  }
  window.addEventListener('scroll', () => { if (!depthQueued) { depthQueued = true; requestAnimationFrame(checkDepth); } }, { passive: true });

  /* ---------- Other standard events ---------- */
  document.addEventListener('copy', () => { // someone copying the phone number
    if (String(window.getSelection()).replace(/\D/g, '').includes('9157745453')) track('copy_phone');
  });
  window.addEventListener('error', (e) => track('exception', { description: (e.message || 'error') + ' @' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || 0), fatal: false }));
  window.addEventListener('unhandledrejection', (e) => track('exception', { description: 'Unhandled promise: ' + (e.reason && e.reason.message || e.reason), fatal: false }));
  if ($('.error-page')) track('page_not_found', { page_path: location.pathname, page_referrer: document.referrer });
})();
