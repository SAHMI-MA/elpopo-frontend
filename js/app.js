/* ===================================================================
   ELPOPO ACADEMY — Landing Page Interactions
   =================================================================== */

(() => {
  'use strict';

  // -------- Unregister legacy Service Workers (force fresh content) --------
  // The previous forge-academy app may have left a SW registered that caches
  // stale HTML. Strip it so the browser always loads the current files.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }

  // -------- CONFIG --------
  // Defaults below are overridden by window.SITE_CONFIG from js/config.js,
  // which is the single client-editable file. Never put secret keys here.
  const CONFIG = {
//   whatsappNumber: '15551234567',
//    whatsappMessage: "Hi, I'd like to learn more about the program.",
//    calendlyUrl: 'https://calendly.com/aji/30min',
    capacityPercent: 78,
    stripePublicKey: 'pk_live_51TM9xtFRyZR4XddRYfKPmePzZLbhbl1r48PhZZECs1PujhlZskdsFlvHpVyruxaYWwM5s2ZMgOIE6ICtu5fFsjXM00DzI9FWup',
    paypalUrl: 'https://paypal.me/elpopooacademy',
    formspreeEndpoint: 'https://formspree.io/f/mjgdkwav',
    apiBase: 'https://backend-elpopo-production.up.railway.app',
  };

  // Merge window.SITE_CONFIG into CONFIG (client-editable values from config.js).
  if (typeof window !== 'undefined' && window.SITE_CONFIG) {
    const sc = window.SITE_CONFIG;
    if (sc.whatsappNumber)       CONFIG.whatsappNumber = String(sc.whatsappNumber);
    if (sc.whatsappMessage)      CONFIG.whatsappMessage = String(sc.whatsappMessage);
    if (sc.calendlyUrl)          CONFIG.calendlyUrl = String(sc.calendlyUrl);
    if (sc.stripePublishableKey) CONFIG.stripePublicKey = String(sc.stripePublishableKey);
    if (sc.paypalFallbackUrl)    CONFIG.paypalUrl = String(sc.paypalFallbackUrl);
    if (typeof sc.apiBaseUrl === 'string') CONFIG.apiBase = sc.apiBaseUrl.replace(/\/+$/, '');
  }

  // Inject client-editable values from window.SITE_CONFIG into the DOM.
  // Looks for data-cfg-* attributes on existing elements + updates common
  // anchor targets (mailto:, tel:, wa.me) in one pass.
  function applyConfigDOM() {
    const sc = (typeof window !== 'undefined' && window.SITE_CONFIG) || {};

    // <title> + business-name elements
    if (sc.businessName) {
      try {
        document.title = document.title.replace(/ELPOPO ACADEMY|ELPOPO Academy/g, sc.businessName);
      } catch (_) { /* ignore */ }
      document.querySelectorAll('[data-cfg-business-name]').forEach((el) => {
        el.textContent = sc.businessName;
      });
    }

    // Logo image swap
    if (sc.logo) {
      document.querySelectorAll('img[data-cfg-logo]').forEach((img) => { img.src = sc.logo; });
    }
    if (sc.logoSeal) {
      document.querySelectorAll('img[data-cfg-logo-seal]').forEach((img) => { img.src = sc.logoSeal; });
    }

    // Email links (mailto:). Walk TEXT NODES only so the inner DOM
    // structure of the link (icon span, label div, etc.) is preserved -
    // setting a.textContent would replace every child node with a single
    // text node and break the card layout.
    if (sc.businessEmail) {
      const EMAIL_RE_GLOBAL = /[A-Za-z0-9._-]+@[A-Za-z0-9.-]+/;
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        a.href = 'mailto:' + sc.businessEmail;
        const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          if (EMAIL_RE_GLOBAL.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(EMAIL_RE_GLOBAL, sc.businessEmail);
          }
        }
      });
    }

    // Phone links (tel:)
    if (sc.phoneNumber) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.href = 'tel:' + sc.phoneNumber.replace(/[^+\d]/g, '');
      });
    }

    // WhatsApp links (wa.me) — only updated if the URL is a wa.me link.
    if (sc.whatsappNumber) {
      const num = String(sc.whatsappNumber).replace(/[^\d]/g, '');
      const msg = encodeURIComponent(sc.whatsappMessage || '');
      document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
        a.href = 'https://wa.me/' + num + (msg ? '?text=' + msg : '');
      });
    }

    // Social links
    if (sc.social) {
      const map = {
        instagram: 'a[data-cfg-social="instagram"]',
        facebook:  'a[data-cfg-social="facebook"]',
        youtube:   'a[data-cfg-social="youtube"]',
        linkedin:  'a[data-cfg-social="linkedin"]',
        tiktok:    'a[data-cfg-social="tiktok"]',
        x:         'a[data-cfg-social="x"]',
      };
      Object.keys(map).forEach((k) => {
        if (!sc.social[k]) return;
        document.querySelectorAll(map[k]).forEach((a) => { a.href = sc.social[k]; });
      });
    }

    // Video sources — supports <video data-cfg-video="hero">.
    if (sc.videos) {
      document.querySelectorAll('video[data-cfg-video]').forEach((v) => {
        const key = v.getAttribute('data-cfg-video');
        const entry = sc.videos[key];
        if (!entry) return;
        if (entry.poster) v.setAttribute('poster', entry.poster);
        if (entry.src) {
          const source = v.querySelector('source') || (function () {
            const s = document.createElement('source');
            v.appendChild(s);
            return s;
          })();
          source.src = entry.src;
          v.load();
        }
      });
    }

    // "Back to X" buttons on success/cancel pages.
    if (sc.businessName) {
      document.querySelectorAll('[data-cfg-back-label]').forEach((el) => {
        el.textContent = 'Back to ' + sc.businessName;
      });
    }
  }

  // app.js is loaded with defer, so DOM is parsed at this point — safe to inject.
  applyConfigDOM();

  /* -------- HELPERS -------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

  // Email regex — pragmatic, not RFC-perfect; catches the 99% of mistakes
  // (missing @, missing TLD, spaces) without rejecting valid edge cases.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isValidEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());

  // Universal browser-side dev-environment detection. These hostnames are
  // standard "this is a developer machine" identifiers - they are NOT the
  // site's configured domain (that lives in backend .env as PUBLIC_BASE_URL).
  // Used only to gate test-vs-live warnings and to refuse credit-card
  // collection over plain HTTP outside dev.
  const HOST = (typeof window !== 'undefined' && window.location.hostname) || '';
  const IS_LOCAL = HOST === 'localhost' || HOST === '127.0.0.1' || HOST.endsWith('.local') || HOST === '';
  const IS_HTTPS = (typeof window !== 'undefined' && window.location.protocol === 'https:');

  /* =============================================================
     NAVIGATION — scroll state + mobile toggle
     ============================================================= */
  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const navMobile = $('#navMobile');

  if (nav) {
    const updateNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    updateNav();
    on(window, 'scroll', updateNav, { passive: true });
  }

  if (navToggle && navMobile) {
    on(navToggle, 'click', () => {
      const isOpen = navMobile.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    // Close on link click
    $$('a', navMobile).forEach((a) => on(a, 'click', () => {
      navMobile.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* =============================================================
     WHATSAPP LINKS — wire all [data-whatsapp] anchors
     ============================================================= */
  const waLink = `https://wa.me/${CONFIG.whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
  $$('[data-whatsapp]').forEach((el) => {
    el.setAttribute('href', waLink);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  });

  /* =============================================================
     VSL — click poster to load YouTube
     ============================================================= */
  const vsl = $('#vslPlayer');
  if (vsl) {
    const ytId = vsl.getAttribute('data-yt');
    on(vsl.querySelector('.vsl-poster'), 'click', () => {
      if (!ytId) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = 'ELPOPO Academy — Founder Briefing';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
      const poster = vsl.querySelector('.vsl-poster');
      if (poster) poster.replaceWith(iframe);
    });
  }

  // Inline video sections (data-video-yt attribute on .video-frame)
  $$('.video-frame[data-video-yt]').forEach((frame) => {
    on(frame, 'click', () => {
      const ytId = frame.getAttribute('data-video-yt');
      if (!ytId) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = frame.getAttribute('aria-label') || 'Video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
      frame.innerHTML = '';
      frame.appendChild(iframe);
    });
    on(frame, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        frame.click();
      }
    });
  });

  /* =============================================================
     7-LAYER SOLUTION TABS — interactive layer detail
     ============================================================= */
const LAYERS = [
  {
    n: '01',
    name: 'Disarm',
    desc: 'Break down resistance and create openness to a new perspective.',
    example: '"Let me ask you something first..."',
  },
  {
    n: '02',
    name: 'Identity',
    desc: 'Connect the message to how the prospect sees themselves.',
    example: '"What matters most to you?"',
  },
  {
    n: '03',
    name: 'Reframe',
    desc: 'Shift the way the problem and solution are perceived.',
    example: '"What if there was another way?"',
  },
  {
    n: '04',
    name: 'Financial Reality',
    desc: 'Reveal the true financial impact of inaction.',
    example: '"What is this costing you today?"',
  },
  {
    n: '05',
    name: 'New Mechanism',
    desc: 'Introduce a new approach that challenges old assumptions.',
    example: '"Here is a different approach."',
  },
  {
    n: '06',
    name: 'Buyer Realization',
    desc: 'Guide prospects toward their own conclusion and decision.',
    example: '"Does that make sense to you?"',
  },
  {
    n: '07',
    name: 'Future Consequence',
    desc: 'Highlight the future outcome of action versus inaction.',
    example: '"Where will you be in a year?"',
  },
];

  const layerDetail = $('#layerDetail');
  const layerTabs = $$('.layer-tab');

  function renderLayer(i) {
    if (!layerDetail) return;
    const l = LAYERS[i];
    if (!l) return;
    layerDetail.innerHTML = `
      <div
        class="
          layer-detail-row
        "
      >
        <span
          class="
            layer-detail-mono
          "
        >Layer ${l.n}</span>
        <span
          class="
            layer-detail-counter
          "
        >${i + 1} / 7</span>
      </div>
      <h3>${l.name}</h3>
      <p
        class="
          layer-detail-desc
        "
      >${l.desc}</p>
      <div
        class="
          layer-example
        "
      >
        <div
          class="
            layer-example-l
          "
        >Example In The Room</div>
        <p>${l.example}</p>
      </div>
      <div
        class="
          layer-progress
        "
      >
        <div
          class="
            layer-progress-fill
          "
          style="width: ${((i + 1) / 7) * 100}%"
        ></div>
      </div>
    `;
  }
  renderLayer(0);

  layerTabs.forEach((tab) => {
    on(tab, 'click', () => {
      const i = parseInt(tab.getAttribute('data-layer'), 10) || 0;
      layerTabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      if (layerDetail && tab.id) layerDetail.setAttribute('aria-labelledby', tab.id);
      renderLayer(i);
    });
  });
  wireTabArrowNav(layerTabs);

  /* =============================================================
     PRICING TIER TABS
     ============================================================= */
  const TIERS = [
    {
      level: 'Level 01',
      name: 'Foundation',
      product: 'The ELPOPO Digital Playbook',
      productKey: 'playbook',
      amountCents: 19900,
      icon: '⚡',
      price: '$199',
      oldPrice: '$497',
      period: 'one-time · instant access',
      desc: 'The complete self-paced system — all 7 layers, every objection reframe, VPG tracking, presentation blueprint.',
      features: [
        '6-module video curriculum — full system on demand',
        '40+ objection reframe scripts (3-layer responses)',
        'VPG tracking worksheets with weekly leak diagnostic',
        'Presentation structure blueprint — zero escape routes',
        'Private community access for active reps',
        'Lifetime updates — every new module added free',
      ],
      cta: 'Get Instant Access',
      upgrade: 'Upgrade to live coaching →',
    },
    {
      level: 'Level 02',
      name: 'Accelerated',
      product: '8-Week 1-on-1 Coaching Program',
      productKey: 'coaching',
      amountCents: 199700,
      installment: '2 × $1,097',
      icon: '🎯',
      price: '$1,997',
      payOption: 'or 2 × $1,097',
      period: '8-week program',
      desc: 'Live, personalized coaching built around YOUR floor, YOUR numbers, and YOUR specific gaps.',
      features: [
        'Everything in Foundation — included free',
        '8 × 60-min weekly 1-on-1 calls (recorded)',
        'Direct WhatsApp line — real-time floor coaching',
        'Presentation audit — your tour dissected line-by-line',
        'Personal development plan from your actual data',
        'Priority pricing on all live events & VIP days',
      ],
      cta: 'Enroll Now',
      upgrade: 'Upgrade to live event →',
    },
    {
      level: 'Level 03',
      name: 'Live Training',
      product: '2-Day Intensive Seminar · Sept 19 · Las Vegas',
      productKey: 'seminar',
      amountCents: 79700,
      icon: '📅',
      badge: 'Live Event',
      price: '$797',
      period: 'general admission',
      desc: 'Two full days in the room — live demos, hot seats, roleplay battles, guest master closers.',
      features: [
        '2 full training days · Sept 19–20, MGM Grand',
        'Live objection battles — reps vs. coaches in the room',
        'Hot-seat coaching — your situation broken down live',
        '30-day recording access to every session',
        'Networking dinner with top-producing reps',
      ],
      cta: 'Get Tickets',
      upgrade: 'VIP Upgrade +$500 — $1,297',
    },
    {
      level: 'Level 04',
      name: 'Elite Summit',
      product: '3-Day Elite Summit · Nov 7 · Orlando',
      productKey: 'summit',
      amountCents: 149700,
      icon: '🏆',
      badge: 'Most Popular',
      price: '$1,497',
      period: 'elite admission',
      desc: 'Three days. Full faculty. Guest legends. Elliott energy. Golden frameworks. Cardone scale — applied to your floor.',
      highlight: true,
      features: [
        '3 full days · Nov 7–9, Rosen Shingle Creek Orlando',
        'Guest legends & master closers sharing what\'s working now',
        'The ELPOPO Gauntlet — 90-min group pressure-test roleplay',
        '90-day recording access (every session, every keynote)',
        'Digital Playbook included free for all Elite holders',
        'Private dinner with the coaching staff — off the record',
      ],
      cta: 'Get Elite Tickets',
      upgrade: 'VIP Upgrade +$1,000 — $2,497',
    },
    {
      level: 'Level 05',
      name: 'The Pinnacle',
      product: 'VIP Day · The Golden Circle · Jan 23 · Scottsdale',
      productKey: 'vip',
      applyOnly: true,
      icon: '👑',
      badge: 'Only 3 spots left',
      price: '$4,997',
      period: 'by application · max 10 reps',
      desc: 'One full day. Ten reps max. Your presentation rebuilt live. Golden money framework. Elliott roleplay gauntlet. Cardone scale thinking.',
      features: [
        'Full day private · 8am – 6pm, zero filler',
        'Golden "Make More Offers" framework — adapted for timeshare',
        'Elliott-level roleplay gauntlet — 3+ hours of live drilling',
        'Cardone scale mindset session',
        'Your presentation rebuilt live, in front of the room',
        'Personal 90-day domination plan',
        'Private VIP dinner with coaches & VIP cohort',
        'Lifetime alumni pricing on every future event',
        'Everything below included — Playbook + 8-Week Coaching free',
      ],
      cta: 'Apply For VIP Day',
    },
  ];

  const tierDetail = $('#tierDetail');
  const tierTabs = $$('.tier-tab');

  function renderTier(i) {
    if (!tierDetail) return;
    const t = TIERS[i];
    if (!t) return;
    tierDetail.classList.toggle('is-highlight', !!t.highlight);
    // Precompute all dynamic HTML strings OUTSIDE the template literal so a
    // formatter / Prettier hook cannot break JS expressions embedded in HTML attributes.
    const ctaClasses = 'btn ' + (t.highlight ? 'btn-gold' : 'btn-ghost') + ' btn-md btn-full';
    const ctaStyle = 'margin-top:1.25rem;';
    const ctaArrow = ' →';
    let ctaButton;
    if (t.applyOnly) {
      ctaButton = '<a href="#apply" class="' + ctaClasses + '" style="' + ctaStyle + '">' + t.cta + ctaArrow + '</a>';
    } else {
      ctaButton = '<button type="button" class="' + ctaClasses + '" style="' + ctaStyle + '" data-buy-tier="' + i + '">' + t.cta + ctaArrow + '</button>';
    }
    const features = t.features
      .map((f) => `<li
        class="
          tier-feat
        "
      ><span
        class="
          tier-feat-c
        "
      >✓</span><span>${f}</span></li>`)
      .join('');
    tierDetail.innerHTML = `
      ${t.badge ? `<span
        class="
          tier-badge
        "
      >${t.badge}</span>` : ''}
      <div
        class="
          tier-inner
        "
      >
        <div>
          <div
            class="
              tier-head
            "
          >
            <div>
              <span
                class="
                  tier-head-lv
                "
              >${t.level}</span>
              <h3>${t.name}</h3>
              <p
                class="
                  tier-product
                "
              >${t.product}</p>
            </div>
            <span
              class="
                tier-icon
              "
            >${t.icon}</span>
          </div>
          <p
            class="
              tier-desc
            "
          >${t.desc}</p>
          <ul
            class="
              tier-features
            "
          >${features}</ul>
        </div>
        <div
          class="
            tier-right
          "
        >
          <div
            class="
              tier-right-inner
            "
          >
            ${t.oldPrice ? `<div
              class="
                muted small
              "
              style="text-decoration:line-through;"
            >${t.oldPrice}</div>` : ''}
            <div
              class="
                tier-price
              "
            >${t.price}</div>
            ${t.payOption ? `<div
              class="
                tier-pay
              "
            >${t.payOption}</div>` : ''}
            <div
              class="
                tier-period
              "
            >${t.period}</div>
            ${ctaButton}
            <a href="#book" style="display:block;margin-top:.75rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.18em;color:#71717a;">Questions? Book a call</a>
            ${t.upgrade ? `<div
              class="
                tier-upgrade
              "
            >${t.upgrade}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  renderTier(0);

  tierTabs.forEach((tab) => {
    on(tab, 'click', () => {
      const i = parseInt(tab.getAttribute('data-tier'), 10) || 0;
      tierTabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      if (tierDetail && tab.id) tierDetail.setAttribute('aria-labelledby', tab.id);
      renderTier(i);
    });
  });
  wireTabArrowNav(tierTabs);

  // ARIA tabs pattern: ←/→ move focus between tabs and activate them,
  // Home/End jump to first/last. Tab key still cycles out of the group.
  function wireTabArrowNav(tabs) {
    tabs.forEach((tab, idx) => {
      on(tab, 'keydown', (e) => {
        let nextIdx = -1;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        else return;
        e.preventDefault();
        tabs[nextIdx].focus();
        tabs[nextIdx].click();
      });
    });
  }

  // Delegated Buy-button click — re-rendered tier markup uses [data-buy-tier].
  if (tierDetail) {
    on(tierDetail, 'click', (e) => {
      const btn = e.target.closest('[data-buy-tier]');
      if (!btn) return;
      e.preventDefault();
      const idx = parseInt(btn.getAttribute('data-buy-tier'), 10);
      const tier = TIERS[idx];
      if (tier) openCheckout(tier);
    });
  }

  /* =============================================================
     FAQ — only one open at a time
     ============================================================= */
  $$('.faq').forEach((faq) => {
    on(faq, 'toggle', () => {
      if (faq.open) {
        $$('.faq').forEach((other) => {
          if (other !== faq) other.open = false;
        });
      }
    });
  });

  /* =============================================================
     CAPACITY METER — animate on scroll into view
     ============================================================= */
  const meterFill = $('#meterFill');
  if (meterFill && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            meterFill.style.width = `${CONFIG.capacityPercent}%`;
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(meterFill);
  } else if (meterFill) {
    meterFill.style.width = `${CONFIG.capacityPercent}%`;
  }

  /* =============================================================
     REVEAL ANIMATIONS — IntersectionObserver
     ============================================================= */
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
    );
    $$('.reveal').forEach((el) => revealObs.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* =============================================================
     STICKY BOTTOM CTA — show after scroll, hide near #apply
     ============================================================= */
  const stickyCTA = $('#stickyCTA');
  if (stickyCTA) {
    const updateSticky = () => {
      const apply = $('#apply');
      if (!apply) return;
      const rect = apply.getBoundingClientRect();
      const show = window.scrollY > 800 && rect.top > 0;
      stickyCTA.classList.toggle('is-visible', show);
    };
    updateSticky();
    on(window, 'scroll', updateSticky, { passive: true });
  }

  /* =============================================================
     WHATSAPP FLOAT — show after scroll + popup toggle
     ============================================================= */
  const waFloat = $('#waFloat');
  const waBtn = $('#waBtn');
  const waPopup = $('#waPopup');
  const waClose = $('#waClose');

  if (waFloat) {
    // Show floating buttons immediately on page load (no scroll required).
    // Small delay so they fade in after the hero animation, for a premium entrance.
    setTimeout(() => waFloat.classList.add('is-visible'), 600);
  }

  if (waBtn && waPopup) {
    on(waBtn, 'click', () => {
      const isHidden = waPopup.hasAttribute('hidden');
      if (isHidden) waPopup.removeAttribute('hidden');
      else waPopup.setAttribute('hidden', '');
    });
  }
  if (waClose && waPopup) {
    on(waClose, 'click', () => waPopup.setAttribute('hidden', ''));
  }

  /* =============================================================
     MODAL UTILITIES — scroll lock + focus management
     -------------------------------------------------------------
     Shared by both the Calendly and Stripe modals so behaviour stays
     consistent. The lock uses a counter so two modals can never desync
     the lock state, even if one open/close is triggered programmatically.
     ============================================================= */
  let _scrollLockCount = 0;
  let _lockedScrollY = 0;

  function lockBodyScroll() {
    if (_scrollLockCount === 0) {
      _lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${_lockedScrollY}px`;
      document.body.classList.add('modal-open');
    }
    _scrollLockCount++;
  }

  function unlockBodyScroll() {
    _scrollLockCount = Math.max(0, _scrollLockCount - 1);
    if (_scrollLockCount === 0) {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      // Restore scroll WITHOUT smooth behaviour so it feels instant.
      window.scrollTo(0, _lockedScrollY);
    }
  }

  // Selector for naturally focusable elements that exist inside our modals.
  const FOCUSABLE_SEL = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SEL))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  // Trap Tab / Shift+Tab inside `container`. No-op if focus is outside it
  // or if there are no focusable children.
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const items = getFocusable(container);
    if (items.length === 0) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* =============================================================
     CALENDLY MODAL — floating calendar button + popup modal
     ============================================================= */
  const calBtn = $('#calBtn');
  const calModal = $('#calModal');
  const calModalBody = $('#calModalBody');
  let calIframeLoaded = false;
  let _calLastFocus = null;

  function openCalModal() {
    if (!calModal) return;
    // Lazy-load iframe on first open
    if (!calIframeLoaded && CONFIG.calendlyUrl) {
      const iframe = document.createElement('iframe');
      const sep = CONFIG.calendlyUrl.includes('?') ? '&' : '?';
      iframe.src = `${CONFIG.calendlyUrl}${sep}hide_event_type_details=0&hide_gdpr_banner=1&primary_color=d4af37&text_color=0a0d10&background_color=ffffff`;
      iframe.title = 'Book a strategy call';
      iframe.loading = 'lazy';
      iframe.setAttribute('allow', 'camera; microphone; autoplay; encrypted-media');
      calModalBody.innerHTML = '';
      calModalBody.appendChild(iframe);
      calIframeLoaded = true;
    } else if (!CONFIG.calendlyUrl) {
      calModalBody.innerHTML = `<div
        class="
          cal-modal-loader
        "
      ><p
        class="
          muted small
        "
        style="padding:2rem;text-align:center;"
      >No Calendly URL configured. Paste your URL into <code>CONFIG.calendlyUrl</code> in <code>app.js</code>.</p></div>`;
    }
    _calLastFocus = document.activeElement;
    calModal.classList.add('is-open');
    calModal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    // Move focus into the dialog so screen-reader users land inside it and
    // keyboard users can immediately interact. Use a short delay so the
    // browser has applied the open transition class before focusing.
    const closeBtn = $('#calModalClose');
    if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
  }

  function closeCalModal() {
    if (!calModal) return;
    calModal.classList.remove('is-open');
    calModal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    // Restore focus to the element that opened the modal so keyboard users
    // don't get dumped at the top of the page.
    if (_calLastFocus && typeof _calLastFocus.focus === 'function') {
      _calLastFocus.focus();
    }
    _calLastFocus = null;
  }

  if (calBtn && calModal) {
    on(calBtn, 'click', openCalModal);
    // Close on backdrop click, X click, or any [data-cal-close]
    $$('[data-cal-close]', calModal).forEach((el) => on(el, 'click', closeCalModal));
    // Esc to close + Tab cycling within the modal while open
    on(document, 'keydown', (e) => {
      if (!calModal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeCalModal(); return; }
      trapFocus(calModal, e);
    });
  }

  /* =============================================================
     FORM — handle submit with success state
     ============================================================= */
  const form = $('#applyForm');
  const success = $('#formSuccess');

  if (form && success) {
    let _formSubmitting = false;
    on(form, 'submit', async (e) => {
      e.preventDefault();
      if (_formSubmitting) return; // prevent double-click / Enter spam
      const btn = form.querySelector('button[type="submit"]');
      const origText = btn ? btn.textContent : '';

      // Honeypot — a real user can't see or focus the field. If anything's in it,
      // pretend it succeeded so the bot doesn't retry.
      const hp = $('#applyHp');
      if (hp && hp.value) {
        form.hidden = true;
        success.hidden = false;
        return;
      }

      const fd = new FormData(form);
      const email = (fd.get('email') || '').toString().trim();
      const firstName = (fd.get('firstName') || '').toString().trim();
      const lastName = (fd.get('lastName') || '').toString().trim();

      // Client-side email format check (server should still validate).
      if (!isValidEmail(email)) {
        showToast('⚠ Please enter a valid email address.');
        return;
      }

      _formSubmitting = true;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting…';
      }

      try {
        fd.append('_subject', 'New ELPOPO Academy Application — ' + firstName + ' ' + lastName);
        fd.append('_replyto', email);

        const res = await fetch(CONFIG.formspreeEndpoint, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error('formspree ' + res.status);
      } catch (err) {
        _formSubmitting = false;
        if (btn) { btn.disabled = false; btn.textContent = origText || 'Try again'; }
        showToast('⚠ Submission failed — please WhatsApp us instead.');
        return;
      }

      _formSubmitting = false;
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('🦁 Application received — we\'ll reach out within 4 hours.');
    });
  }

  /* =============================================================
     CALENDLY — paste URL in CONFIG.calendlyUrl to enable
     ============================================================= */
  const bookBody = $('.book-frame-body');
  if (bookBody && CONFIG.calendlyUrl) {
    const sep = CONFIG.calendlyUrl.includes('?') ? '&' : '?';
    const iframe = document.createElement('iframe');
    iframe.src = `${CONFIG.calendlyUrl}${sep}hide_event_type_details=1&hide_gdpr_banner=1&primary_color=d4af37&text_color=ffffff&background_color=0a0d10`;
    iframe.title = 'Book strategy call';
    iframe.loading = 'lazy';
    iframe.style.cssText = 'border:0;width:100%;height:100%;min-height:640px;';
    bookBody.innerHTML = '';
    bookBody.appendChild(iframe);
    bookBody.style.padding = '0';
  }

  /* =============================================================
     FOOTER YEAR
     ============================================================= */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =============================================================
     SCROLL PROGRESS BAR
     ============================================================= */
  const scrollBar = $('#scrollBar');
  if (scrollBar) {
    let raf = null;
    const updateBar = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      scrollBar.style.width = `${pct}%`;
    };
    on(window, 'scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { updateBar(); raf = null; });
    }, { passive: true });
    updateBar();
  }

  /* =============================================================
     COUNT-UP ANIMATION — for [data-count-to] elements
     ============================================================= */
  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1600; // ms
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const val = Math.round(target * ease(t));
      el.textContent = `${prefix}${val.toLocaleString()}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !e.target.dataset.counted) {
            e.target.dataset.counted = '1';
            animateCount(e.target);
            countObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    $$('[data-count-to]').forEach((el) => countObs.observe(el));
  } else {
    // No IO support — set final value immediately
    $$('[data-count-to]').forEach((el) => {
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      el.textContent = `${prefix}${parseInt(el.getAttribute('data-count-to'), 10).toLocaleString()}${suffix}`;
    });
  }

  /* =============================================================
     MAGNETIC BUTTON HOVER — cursor-following parallax for .btn-magnetic
     ============================================================= */
  const isCoarse = window.matchMedia('(hover: none)').matches;
  if (!isCoarse) {
    $$('.btn-magnetic').forEach((btn) => {
      const STRENGTH = 0.25; // 0..1 — higher = more movement
      let rect = null;

      const onMove = (e) => {
        if (!rect) rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.setProperty('--mx', `${x * STRENGTH}px`);
        btn.style.setProperty('--my', `${y * STRENGTH}px`);
      };
      const onEnter = () => { rect = btn.getBoundingClientRect(); };
      const onLeave = () => {
        rect = null;
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      };

      on(btn, 'mouseenter', onEnter);
      on(btn, 'mousemove', onMove);
      on(btn, 'mouseleave', onLeave);
    });
  }

  /* =============================================================
     HERO GLOW PARALLAX — subtle pointer-follow on hero glows
     ============================================================= */
  const heroBg = $('.hero .hero-bg');
  if (heroBg && !isCoarse) {
    const goldGlow = heroBg.querySelector('.glow-gold');
    const emeraldGlow = heroBg.querySelector('.glow-emerald');
    let pRaf = null;
    on(window, 'mousemove', (e) => {
      if (pRaf) return;
      pRaf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        if (goldGlow) goldGlow.style.transform = `translate(${x}px, ${y}px)`;
        if (emeraldGlow) emeraldGlow.style.transform = `translateX(calc(-50% + ${x * 0.5}px)) translateY(${y * 0.3}px)`;
        pRaf = null;
      });
    }, { passive: true });
  }

  /* =============================================================
     TOAST NOTIFICATIONS
     ============================================================= */
  const toastEl = $('#toast');
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3500);
  }

  /* =============================================================
     STRIPE CHECKOUT — modal, card element, Formspree fallback
     -------------------------------------------------------------
     Real production flow: your backend creates a PaymentIntent and
     returns a client_secret. The browser then calls
     _stripe.confirmCardPayment(clientSecret, { payment_method: {...} }).
     Here we run a no-backend "lead capture" variant: the form posts
     order details to Formspree (which emails you), then you manually
     confirm and ship access. Swap in the real flow when your backend
     endpoint is live.
     ============================================================= */
  const stripeModal = $('#stripeModal');
  const stripeModalBody = $('#stripeModalBody');
  const stripeModalSuccess = $('#stripeModalSuccess');
  let _stripe = null;
  let _cardEl = null;
  let _currentTier = null;
  let _stripeLastFocus = null;

  function initStripeOnce() {
    if (_stripe || !window.Stripe || !CONFIG.stripePublicKey) return;
    // Stripe.js refuses to load cards over plain HTTP outside localhost, but we
    // double-check here so a misconfigured deploy surfaces a clear warning
    // instead of a silent broken modal.
    if (!IS_LOCAL && !IS_HTTPS) {
      console.warn('[ELPOPO] Refusing to initialize Stripe over plain HTTP. Serve the site over HTTPS in production.');
      return;
    }
    if (!IS_LOCAL && /^pk_test_/.test(CONFIG.stripePublicKey)) {
      console.warn('[ELPOPO] Stripe TEST publishable key is active on a live domain. Replace CONFIG.stripePublicKey with your pk_live_… key before accepting real payments.');
    }
    _stripe = window.Stripe(CONFIG.stripePublicKey);
    const elements = _stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#d4af37',
          colorBackground: '#0a0d10',
          colorText: '#ffffff',
          colorDanger: '#dc2626',
          borderRadius: '8px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
    });
    _cardEl = elements.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '15px',
          '::placeholder': { color: 'rgba(255,255,255,0.4)' },
        },
        invalid: { color: '#dc2626' },
      },
    });
    _cardEl.mount('#stripeCardElement');
    _cardEl.on('change', (e) => {
      const err = $('#stripeCardErrors');
      if (err) err.textContent = e.error ? e.error.message : '';
    });
  }

  function openCheckout(tier) {
    if (!stripeModal || !tier) return;
    _currentTier = tier;
    const productEl = $('#stripeModalProduct');
    const priceEl = $('#stripeModalPrice');
    const installEl = $('#stripeInstallment');
    const installAmt = $('#stripeInstallmentAmount');
    if (productEl) productEl.textContent = tier.product;
    if (priceEl) priceEl.textContent = tier.price;
    if (installEl) {
      installEl.hidden = !tier.installment;
      if (tier.installment && installAmt) installAmt.textContent = tier.installment;
    }
    // Reset success / body state in case modal was closed mid-flow
    if (stripeModalBody) stripeModalBody.hidden = false;
    if (stripeModalSuccess) stripeModalSuccess.hidden = true;
    const payBtn = $('#stripePayBtn');
    if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Securely'; }
    const errEl = $('#stripeCardErrors');
    if (errEl) errEl.textContent = '';

    _stripeLastFocus = document.activeElement;
    stripeModal.classList.add('is-open');
    stripeModal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    initStripeOnce();
    // First text input is the natural focus target so the user can start
    // typing immediately. Fall back to the close button if the input isn't
    // available for some reason.
    const firstInput = $('#stripePayerName') || $('#stripeModalClose');
    if (firstInput) requestAnimationFrame(() => firstInput.focus());
  }

  function closeCheckout() {
    if (!stripeModal) return;
    stripeModal.classList.remove('is-open');
    stripeModal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    if (_stripeLastFocus && typeof _stripeLastFocus.focus === 'function') {
      _stripeLastFocus.focus();
    }
    _stripeLastFocus = null;
  }

  let _checkoutSubmitting = false;
  async function handleStripePayment() {
    if (_checkoutSubmitting) return;
    if (!_currentTier) return;

    const nameInput = $('#stripePayerName');
    const emailInput = $('#stripePayerEmail');
    const hpInput = $('#stripeHp');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    // Honeypot — silently drop bot submissions.
    if (hpInput && hpInput.value) {
      closeCheckout();
      return;
    }

    if (!name) { showToast('⚠ Please enter your name'); return; }
    if (!isValidEmail(email)) { showToast('⚠ Please enter a valid email address'); return; }
    if (name.length > 80 || email.length > 120) { showToast('⚠ Input too long'); return; }

    const btn = $('#stripePayBtn');
    const origLabel = btn ? btn.textContent : 'Reserve My Spot';
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    const errEl = $('#stripeCardErrors');
    if (errEl) errEl.textContent = '';
    _checkoutSubmitting = true;

    // Secure flow: the backend creates a PaymentIntent against an authoritative
    // server-side price catalog and returns a client_secret. The browser only
    // sends a productKey — it can't dictate the amount.
    const restoreBtn = () => {
      if (btn) { btn.disabled = false; btn.textContent = origLabel; }
      _checkoutSubmitting = false;
    };

    if (!_stripe || !_cardEl) {
      if (errEl) errEl.textContent = 'Payment system is still loading. Please try again in a moment.';
      restoreBtn();
      return;
    }

    let clientSecret = null;
    try {
      const r = await fetch(CONFIG.apiBase + '/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          productKey: _currentTier.productKey,
          name,
          email,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.clientSecret) {
        throw new Error(data.error || 'Could not start checkout. Please try again.');
      }
      clientSecret = data.clientSecret;
    } catch (e) {
      if (errEl) errEl.textContent = (e && e.message) || 'Network error. Please try again.';
      restoreBtn();
      return;
    }

    let result;
    try {
      result = await _stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: _cardEl,
          billing_details: { name, email },
        },
      });
    } catch (e) {
      if (errEl) errEl.textContent = 'Payment failed. Please try again.';
      restoreBtn();
      return;
    }

    if (result.error) {
      if (errEl) errEl.textContent = result.error.message || 'Card was declined.';
      restoreBtn();
      return;
    }
    if (!result.paymentIntent || result.paymentIntent.status !== 'succeeded') {
      if (errEl) errEl.textContent = 'Payment did not complete. Please try again.';
      restoreBtn();
      return;
    }

    // Success state — Stripe confirmed payment_intent.succeeded. Fulfillment
    // happens server-side from the /webhook handler so it can't be spoofed by
    // a tampered client.
    const sName = $('#stripeSuccessName');
    const sProduct = $('#stripeSuccessProduct');
    const sEmail = $('#stripeSuccessEmail');
    if (sName) sName.textContent = name;
    if (sProduct) sProduct.textContent = _currentTier.product;
    if (sEmail) sEmail.textContent = email;
    if (stripeModalBody) stripeModalBody.hidden = true;
    if (stripeModalSuccess) stripeModalSuccess.hidden = false;
    showToast('🦁 Payment confirmed — check your email for the receipt and access details.');
    _checkoutSubmitting = false;
    if (btn) { btn.disabled = false; btn.textContent = origLabel; }
  }

  async function handlePayPal() {
    const hpInput = $('#stripeHp');
    if (hpInput && hpInput.value) { closeCheckout(); return; } // silent bot drop
    const nameInput = $('#stripePayerName');
    const emailInput = $('#stripePayerEmail');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    if (!name) { showToast('⚠ Please enter your name first'); return; }
    if (!isValidEmail(email)) { showToast('⚠ Please enter a valid email'); return; }
    if (!_currentTier) return;

    // Try the real backend PayPal Orders flow first.
    try {
      const r = await fetch(CONFIG.apiBase + '/api/checkout/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ productKey: _currentTier.productKey, name, email }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.approveUrl) {
        showToast('↗ Redirecting to PayPal…');
        window.location.href = data.approveUrl;
        return;
      }
      // Fall through to fallback link if backend not configured.
      console.warn('PayPal backend unavailable:', data && data.error);
    } catch (e) {
      console.warn('PayPal backend error:', e && e.message);
    }

    // Fallback: paypal.me link from config (manual flow).
    let safeUrl = '';
    try {
      const u = new URL(CONFIG.paypalUrl);
      if (u.protocol === 'https:' && /(^|\.)paypal\.(com|me)$/i.test(u.hostname)) {
        safeUrl = u.toString();
      }
    } catch (_e) { /* ignore */ }
    if (!safeUrl) { showToast('⚠ PayPal not configured'); return; }
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
    showToast('↗ Opening PayPal…');
  }

  // Wire modal controls
  if (stripeModal) {
    $$('[data-stripe-close]', stripeModal).forEach((el) => on(el, 'click', closeCheckout));
    on($('#stripePayBtn'), 'click', handleStripePayment);
    on($('#stripePaypalBtn'), 'click', handlePayPal);
    on($('#stripeSuccessClose'), 'click', closeCheckout);
    on(document, 'keydown', (e) => {
      if (!stripeModal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeCheckout(); return; }
      trapFocus(stripeModal, e);
    });
  }

  // Expose so static-HTML buy buttons (e.g. inline #shop section) can call openCheckout(TIERS[n]).
  window.ELPOPO = window.ELPOPO || {};
  window.ELPOPO.openCheckout = openCheckout;
  window.ELPOPO.TIERS = TIERS;
  window.ELPOPO.showToast = showToast;

})();
