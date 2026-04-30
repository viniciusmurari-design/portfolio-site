// ═══════════════════════════════════════════════════════════════════════════
// Landing Page — Dynamic Renderer
// Loads page data from settings.json based on URL slug
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── Determine which landing page to load ───
  const slug = getSlug();
  let PAGE = null;
  let SETTINGS = {};

  function getSlug() {
    // Check URL param first (?page=slug), then path
    const params = new URLSearchParams(window.location.search);
    if (params.get('page')) return params.get('page');
    // /airbnb-photography → airbnb-photography
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    if (path && path !== 'landing') return path;
    return null;
  }

  // ─── Load settings and render ───
  async function init() {
    let settings = {};
    try {
      const r = await fetch('/api/settings');
      if (r.ok) {
        settings = await r.json();
      } else {
        throw new Error('api/settings unavailable');
      }
    } catch(e) {
      try {
        const r2 = await fetch('/settings.json');
        if (r2.ok) settings = await r2.json();
      } catch(e2) {}
    }

    const pages = settings.landingPages || [];

    // Find page by slug, or use first page
    if (slug) {
      PAGE = pages.find(p => p.slug === slug);
    }
    if (!PAGE && pages.length > 0) {
      PAGE = pages[0];
    }
    if (!PAGE) {
      PAGE = getDefaultPage();
    }

    SETTINGS = settings;
    updateSeoTags();
    render();
    setupNav();
    setupScrollReveal();
    setupForm(settings);
    setupStickyCta();
  }

  // ─── Expose modal opener (called from inline onclick) ───
  window.openServiceModal = openServiceModal;

  // ─── Default page data (Airbnb/Hotel) ───
  function getDefaultPage() {
    return {
      id: 'lp_default',
      slug: 'airbnb-photography',
      active: true,
      hero: {
        mode: 'photo',
        headline: 'More Bookings.<br><em>Higher Rates.</em>',
        subheadline: '83% of guests decide based on photos alone. Make yours count.',
        cta: { text: 'Get a Free Quote', action: 'form' },
        ctaSecondary: { text: 'See My Work', link: '#lp-services' },
        image: '',
        slides: [],
        pillText: 'Available for bookings in Dublin',
        trustLine: 'Trusted by 50+ Airbnb hosts in Dublin'
      },
      stats: [
        { value: '40%', label: 'More Bookings' },
        { value: '2.5x', label: 'Higher Occupancy' },
        { value: '€2,455', label: 'Extra Revenue/Year' }
      ],
      problem: {
        headline: 'Your Photos Are <em>Costing You Bookings</em>',
        text: 'Guests scroll through hundreds of listings in seconds. Low-quality photos make your property invisible — no matter how beautiful it actually is. You\'re losing revenue every single day to competitors with better visuals.',
        image: ''
      },
      services: [
        { icon: '📸', title: 'Photography', description: 'High-end interior and exterior shots that make guests fall in love before they arrive.', features: ['HDR professional editing', 'Twilight & golden hour shots', 'Optimised for Airbnb/Booking.com'] },
        { icon: '🎬', title: 'Video Tour', description: 'Cinematic walkthrough videos that give guests the full experience of your property.', features: ['4K cinematic quality', 'Professional colour grading', 'Background music licensed'] },
        { icon: '🚁', title: 'Drone & Aerial', description: 'Stunning aerial perspectives that showcase your property\'s location and surroundings.', features: ['Licensed drone operator', 'Location & neighbourhood views', '4K aerial video included'] },
        { icon: '📱', title: 'Reels & Social', description: 'Short-form vertical content optimised for Instagram, TikTok and social media marketing.', features: ['Vertical 9:16 format', 'Trending transitions & effects', 'Ready to post'] },
        { icon: '🏠', title: '3D Virtual Tour', description: 'Interactive Matterport 3D tours that let guests explore every room from their phone.', features: ['Matterport technology', 'Embed on any platform', 'Floor plans included'] },
        { icon: '✨', title: 'Full Package', description: 'The complete visual solution — everything your property needs in one shoot day.', features: ['All services combined', 'Best value', 'Priority turnaround'] }
      ],
      portfolio: [],
      showreel: { url: '', youtubeUrl: '', thumbnail: '' },
      beforeAfter: [],
      process: [
        { step: '1', title: 'Book', text: 'Choose your package and pick a date that works for you. We\'ll handle the rest.' },
        { step: '2', title: 'Shoot', text: 'Our team arrives, sets up, and captures your property at its absolute best.' },
        { step: '3', title: 'Receive', text: 'Get your professionally edited photos, videos and tours within 48 hours.' }
      ],
      packages: [
        { name: 'Essential', features: ['Up to 20 professional photos', 'HDR editing', 'Delivered in 48h', 'Optimised for platforms'], price: '', showPrice: false, highlighted: false },
        { name: 'Professional', features: ['Up to 40 professional photos', 'HDR editing', '60s video walkthrough', 'Drone aerial shots', 'Delivered in 48h'], price: '', showPrice: false, highlighted: true },
        { name: 'Premium', features: ['Unlimited professional photos', 'HDR editing', '2-3 min cinematic video', 'Drone aerial shots', 'Matterport 3D tour', 'Social media reels', 'Floor plan'], price: '', showPrice: false, highlighted: false }
      ],
      testimonials: [
        { name: 'Sarah M.', role: 'Airbnb Superhost, Dublin 4', text: 'Since getting professional photos, my bookings increased by 35% in the first month. Best investment I\'ve made for my property.', photo: '', rating: 5 },
        { name: 'James K.', role: 'Hotel Manager, Dublin 2', text: 'Vinicius captured our hotel beautifully. The drone shots of our rooftop terrace have been incredible for marketing.', photo: '', rating: 5 },
        { name: 'Ana L.', role: 'Property Manager, Dublin 6', text: 'Managing 12 Airbnbs, I needed a photographer who understands the platform. The 3D tours have been a game-changer for our listings.', photo: '', rating: 5 }
      ],
      faq: [
        { q: 'How long does a typical shoot take?', a: 'Most property shoots take 1-3 hours depending on size and services booked. A full package with video, drone and 3D tour typically takes 3-4 hours.' },
        { q: 'How quickly will I receive my photos?', a: 'Standard turnaround is 48 hours for photos, 5 business days for video and 3D tours. Rush delivery is available upon request.' },
        { q: 'Do you photograph multiple properties?', a: 'Absolutely! We offer discounts for multiple properties. Many property managers book us for their entire portfolio.' },
        { q: 'What if the weather is bad on shoot day?', a: 'For exterior and drone work, we monitor weather closely and will reschedule at no extra cost if conditions aren\'t ideal.' },
        { q: 'Can I use the photos on any platform?', a: 'Yes — you receive full commercial usage rights. Use them on Airbnb, Booking.com, your website, social media, or anywhere else.' }
      ],
      contact: {
        whatsapp: '',
        whatsappMessage: 'Hi! I\'m interested in property photography services.',
        finalCtaTitle: 'Ready to Transform <em>Your Property?</em>',
        finalCtaSub: 'Book your shoot today and start getting more bookings.'
      },
      seo: {
        title: 'Professional Property Photography Dublin | Airbnb & Hotel | Vinicius Murari',
        description: 'Professional Airbnb & hotel photography, video, drone and 3D virtual tours in Dublin. Increase your bookings by up to 40%.',
        ogImage: ''
      }
    };
  }

  // ─── Update <head> canonical + OG tags based on loaded PAGE ───
  function updateSeoTags() {
    const base = 'https://viniciusmurari.com/';
    const pageSlug = PAGE.slug || '';
    const url = pageSlug ? base + pageSlug : base;
    const seo = PAGE.seo || {};

    const canonical = document.getElementById('lpCanonical');
    if (canonical) canonical.href = url;

    const ogUrl = document.getElementById('ogUrl');
    if (ogUrl) ogUrl.content = url;

    if (seo.title) {
      document.title = seo.title;
      const ogTitle = document.getElementById('ogTitle');
      if (ogTitle) ogTitle.content = seo.title;
    }
    if (seo.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = seo.description;
      const ogDesc = document.getElementById('ogDesc');
      if (ogDesc) ogDesc.content = seo.description;
    }
    if (seo.ogImage) {
      const ogImg = document.getElementById('ogImage');
      if (ogImg) ogImg.content = seo.ogImage;
    }
  }

  // ─── Render all sections ───
  function render() {
    renderSEO();
    renderSectionTitles();
    renderHero();
    renderStats();
    renderProblem();
    renderServices();
    renderBackgroundsGuide();
    renderPortfolio();
    renderShowreel();
    renderBeforeAfter();
    renderProcess();
    renderPackages();
    renderTestimonials();
    renderFaq();
    renderContact();
  }

  // ─── Section titles override (per-page, falls back to HTML defaults) ───
  function renderSectionTitles() {
    const t = PAGE.sectionTitles || {};
    const map = {
      servicesEyebrow: '#lp-services .eyebrow',
      servicesTitle: '#lpServicesTitle',
      servicesSub: '#lpServicesSub',
      portfolioEyebrow: '#lp-portfolio .eyebrow',
      portfolioTitle: '#lpPortfolioTitle',
      processEyebrow: '#lp-process .eyebrow',
      processTitle: '#lpProcessTitle',
      packagesEyebrow: '#lp-packages .eyebrow',
      packagesTitle: '#lpPackagesTitle',
      testimonialsEyebrow: '#lp-testimonials .eyebrow',
      testimonialsTitle: '#lpTestimonialsTitle',
      faqEyebrow: '#lp-faq .eyebrow',
      faqTitle: '#lpFaqTitle',
      baTitle: '#lpBATitle'
    };
    Object.keys(map).forEach(k => {
      if (!t[k]) return;
      const el = document.querySelector(map[k]);
      if (el) el.innerHTML = t[k];
    });
  }

  // ─── Backgrounds Guide CTA banner (portrait landing only) ───
  function renderBackgroundsGuide() {
    const g = PAGE.backgroundsGuide;
    if (!g || !g.enabled) return;
    // Avoid duplicate insert on re-render
    if (document.getElementById('lp-bg-guide')) return;
    const section = document.createElement('section');
    section.className = 'lp-section lp-bg-guide-section';
    section.id = 'lp-bg-guide';
    section.innerHTML = `
      <div class="lp-inner">
        <div class="lp-bg-guide-card lp-reveal">
          <div class="lp-bg-guide-swatches" aria-hidden="true">
            <div class="lp-bg-guide-swatch" style="background:#f5f5f7"><span>White</span></div>
            <div class="lp-bg-guide-swatch" style="background:#111"><span>Black</span></div>
            <div class="lp-bg-guide-swatch" style="background:linear-gradient(160deg,#3b82f6 0%,#8b5cf6 50%,#ec4899 100%)"><span>Brand</span></div>
            <div class="lp-bg-guide-swatch" style="background:linear-gradient(160deg,#1a3a2a 0%,#2d5a3d 40%,#4a7c5a 100%)"><span>Natural</span></div>
          </div>
          <div class="lp-bg-guide-body">
            <span class="eyebrow">${esc(g.eyebrow || 'Studio Guide')}</span>
            <h2>${g.title || 'Not Sure Which Background Suits You?'}</h2>
            <p>${esc(g.text || '')}</p>
            <a href="${esc(g.link || '#')}" class="btn btn-fill" target="_blank" rel="noopener">${esc(g.cta || 'Read the Guide')} →</a>
          </div>
        </div>
      </div>`;
    // Insert after services
    const servicesSection = document.getElementById('lp-services');
    if (servicesSection && servicesSection.parentNode) {
      servicesSection.parentNode.insertBefore(section, servicesSection.nextSibling);
    }
  }

  function renderSEO() {
    if (PAGE.seo) {
      if (PAGE.seo.title) document.title = PAGE.seo.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && PAGE.seo.description) desc.content = PAGE.seo.description;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.content = PAGE.seo.title || '';
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = PAGE.seo.description || '';
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && PAGE.seo.ogImage) ogImg.content = PAGE.seo.ogImage;
    }
    injectStructuredData();
  }

  // ─── JSON-LD: Service + FAQPage + BreadcrumbList per landing page ───
  function injectStructuredData() {
    const slug    = PAGE.slug || '';
    const url     = 'https://viniciusmurari.com/' + slug;
    const seoT    = (PAGE.seo && PAGE.seo.title) || '';
    const seoD    = (PAGE.seo && PAGE.seo.description) || '';
    const ogImage = (PAGE.seo && PAGE.seo.ogImage) || (PAGE.hero && PAGE.hero.image) || '';

    const blocks = [];

    // Service schema (one per landing page)
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': url + '#service',
      'name': seoT.replace(/\s*\|.*$/, ''), // strip "| Vinicius Murari" suffix
      'description': seoD,
      'url': url,
      'provider': { '@id': 'https://viniciusmurari.com/#organization' },
      'areaServed': [
        { '@type': 'City',    'name': 'Dublin' },
        { '@type': 'Country', 'name': 'Ireland' }
      ],
      'serviceType': 'Photography',
      'image': ogImage || undefined
    });

    // FAQPage schema (if FAQs exist)
    if (PAGE.faq && PAGE.faq.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': url + '#faq',
        'mainEntity': PAGE.faq.map(item => ({
          '@type': 'Question',
          'name': item.q,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': item.a
          }
        }))
      });
    }

    // Breadcrumbs
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home',     'item': 'https://viniciusmurari.com/' },
        { '@type': 'ListItem', 'position': 2, 'name': seoT.replace(/\s*\|.*$/, '') || slug, 'item': url }
      ]
    });

    // Remove any previous JSON-LD blocks we injected (re-renders)
    document.querySelectorAll('script[data-lp-jsonld]').forEach(s => s.remove());

    blocks.forEach(b => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-lp-jsonld', '1');
      s.textContent = JSON.stringify(b);
      document.head.appendChild(s);
    });
  }

  function renderHero() {
    const h = PAGE.hero || {};
    setText('lpHeroHeadline', h.headline);
    setText('lpHeroSub', h.subheadline);
    setText('lpHeroPillText', h.pillText);
    setText('lpTrustLine', h.trustLine);
    if (h.cta) {
      const ctaEl = document.getElementById('lpHeroCta');
      if (ctaEl) { ctaEl.textContent = h.cta.text || 'Get a Free Quote'; }
    }
    if (h.ctaSecondary) {
      const cta2 = document.getElementById('lpHeroCta2');
      if (cta2) {
        cta2.textContent = h.ctaSecondary.text || 'See My Work';
        if (h.ctaSecondary.link) cta2.href = h.ctaSecondary.link;
      }
    }

    // Hero background
    const slidesContainer = document.getElementById('lpHeroSlides');
    const dotsContainer = document.getElementById('lpHeroDots');
    const slides = h.slides && h.slides.length > 0 ? h.slides : (h.image ? [{ url: h.image }] : []);

    if (slides.length > 0) {
      slides.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'hero-slide' + (i === 0 ? ' active' : '');
        div.style.backgroundImage = `url(${s.url})`;
        slidesContainer.appendChild(div);

        if (slides.length > 1) {
          const dot = document.createElement('button');
          dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', `Slide ${i+1}`);
          dot.addEventListener('click', () => goToSlide(i));
          dotsContainer.appendChild(dot);
        }
      });

      if (slides.length > 1) startSlideshow(slides.length);
    } else {
      // Default dark background
      document.querySelector('.lp-hero').style.background = '#111';
    }
  }

  let slideIndex = 0;
  let slideTimer = null;
  function startSlideshow(count) {
    slideTimer = setInterval(() => {
      slideIndex = (slideIndex + 1) % count;
      goToSlide(slideIndex);
    }, 5000);
  }
  function goToSlide(idx) {
    slideIndex = idx;
    document.querySelectorAll('#lpHeroSlides .hero-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
    document.querySelectorAll('#lpHeroDots .hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function renderStats() {
    const stats = PAGE.stats || [];
    if (stats.length === 0) { document.getElementById('lp-stats').style.display = 'none'; return; }
    const grid = document.getElementById('lpStatsGrid');
    grid.style.setProperty('--stat-cols', stats.length);
    grid.innerHTML = stats.map(s => `
      <div class="lp-stat lp-reveal">
        <div class="lp-stat-value">${esc(s.value)}</div>
        <div class="lp-stat-label">${esc(s.label)}</div>
      </div>
    `).join('');
  }

  function renderProblem() {
    const p = PAGE.problem || {};
    setText('lpProblemTitle', p.headline);
    setText('lpProblemText', p.text);
    const imgWrap = document.getElementById('lpProblemImg');
    if (p.image) {
      imgWrap.innerHTML = `<img src="${esc(p.image)}" alt="Property photography example" loading="lazy">`;
    } else {
      imgWrap.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
      imgWrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.2);font-size:3rem">📸</div>';
    }
  }

  function renderServices() {
    const services = PAGE.services || [];
    if (services.length === 0) { document.getElementById('lp-services').style.display = 'none'; return; }
    const grid = document.getElementById('lpServicesGrid');
    grid.innerHTML = services.map((s, i) => {
      const hasMedia = (s.portfolio && s.portfolio.length > 0) || s.videoUrl;
      return `
        <div class="lp-service-card lp-reveal">
          <div class="lp-service-icon">${s.icon || '📸'}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
          ${s.features && s.features.length ? `<ul class="lp-service-features">${s.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:12px">
            ${hasMedia ? `<button class="lp-service-media-btn" onclick="openServiceModal(${i})">View Portfolio →</button>` : ''}
            ${s.tourUrl ? `<a href="${esc(s.tourUrl)}" target="_blank" rel="noopener" class="lp-service-media-btn" style="text-decoration:none">Open 3D Tour ↗</a>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function renderPortfolio() {
    const items = PAGE.portfolio || [];
    if (items.length === 0) { document.getElementById('lp-portfolio').style.display = 'none'; return; }
    const grid = document.getElementById('lpPortfolioGrid');
    grid.innerHTML = items.map(p => `
      <div class="lp-portfolio-item lp-reveal">
        <img src="${esc(p.url)}" alt="${esc(p.caption || 'Property photography')}" loading="lazy">
        ${p.caption ? `<div class="lp-portfolio-caption">${esc(p.caption)}</div>` : ''}
      </div>
    `).join('');
  }

  function renderShowreel() {
    const sr = PAGE.showreel || {};
    const hasVideo = !!sr.url;
    const hasYT = !!sr.youtubeUrl;
    if (!hasVideo && !hasYT) return;
    document.getElementById('lp-showreel').style.display = '';
    const wrap = document.getElementById('lpShowreelWrap');
    const parts = [];
    if (hasVideo) {
      const ytId = getYouTubeId(sr.url);
      if (ytId) {
        parts.push(`<iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen loading="lazy"></iframe>`);
      } else {
        parts.push(`<video src="${esc(sr.url)}" controls preload="metadata" poster="${esc(sr.thumbnail || '')}"></video>`);
      }
    }
    if (hasYT) {
      const ytId = getYouTubeId(sr.youtubeUrl);
      if (ytId) {
        parts.push(`<iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen loading="lazy"></iframe>`);
      }
    }
    if (parts.length === 1) {
      wrap.innerHTML = parts[0];
      wrap.style.display = '';
    } else {
      // Two items: side-by-side grid
      wrap.style.display = 'grid';
      wrap.style.gridTemplateColumns = '1fr 1fr';
      wrap.style.gap = '24px';
      wrap.innerHTML = parts.join('');
    }
  }

  function renderBeforeAfter() {
    const items = PAGE.beforeAfter || [];
    if (!PAGE.showBeforeAfter || items.length === 0) return;
    document.getElementById('lp-beforeafter').style.display = '';
    const grid = document.getElementById('lpBAGrid');
    grid.innerHTML = items.map(ba => `
      <div class="lp-ba-item lp-reveal">
        <div class="lp-ba-side">
          <img src="${esc(ba.before)}" alt="Before" loading="lazy">
          <span class="lp-ba-label lp-ba-label--before">Before</span>
        </div>
        <div class="lp-ba-side">
          <img src="${esc(ba.after)}" alt="After" loading="lazy">
          <span class="lp-ba-label lp-ba-label--after">After</span>
        </div>
      </div>
    `).join('');
  }

  function renderProcess() {
    const steps = PAGE.process || [];
    if (steps.length === 0) { document.getElementById('lp-process').style.display = 'none'; return; }
    const grid = document.getElementById('lpProcessGrid');
    grid.innerHTML = steps.map(s => `
      <div class="lp-process-step lp-reveal">
        <div class="lp-process-num">${esc(s.step)}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
      </div>
    `).join('');
  }

  function renderPackages() {
    const pkgs = PAGE.packages || [];
    if (pkgs.length === 0) { document.getElementById('lp-packages').style.display = 'none'; return; }
    const grid = document.getElementById('lpPackagesGrid');
    grid.innerHTML = pkgs.map(p => `
      <div class="lp-package${p.highlighted ? ' highlighted' : ''} lp-reveal">
        ${p.highlighted ? '<div class="lp-package-badge">Most Popular</div>' : ''}
        <h3>${esc(p.name)}</h3>
        <div class="lp-package-price${!p.showPrice || !p.price ? ' hidden-price' : ''}">
          ${p.showPrice && p.price ? esc(p.price) : 'Get a quote'}
        </div>
        <ul class="lp-package-features">
          ${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}
        </ul>
        <a href="#lp-contact" class="btn btn-fill">Choose ${esc(p.name)}</a>
      </div>
    `).join('');
  }

  function renderTestimonials() {
    const items = PAGE.testimonials || [];
    if (items.length === 0) { document.getElementById('lp-testimonials').style.display = 'none'; return; }
    const grid = document.getElementById('lpTestimonialsGrid');
    grid.innerHTML = items.map(t => {
      const stars = Array(t.rating || 5).fill('<svg viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>').join('');
      const initials = (t.name || '?').split(' ').map(w => w[0]).join('').toUpperCase();
      return `
        <div class="lp-testimonial lp-reveal">
          <div class="lp-testimonial-stars">${stars}</div>
          <p class="lp-testimonial-text">"${esc(t.text)}"</p>
          <div class="lp-testimonial-author">
            <div class="lp-testimonial-avatar">
              ${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}">` : initials}
            </div>
            <div>
              <div class="lp-testimonial-name">${esc(t.name)}</div>
              <div class="lp-testimonial-role">${esc(t.role)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderFaq() {
    const items = PAGE.faq || [];
    if (items.length === 0) { document.getElementById('lp-faq').style.display = 'none'; return; }
    const list = document.getElementById('lpFaqList');
    list.innerHTML = items.map((f, i) => `
      <details class="faq-item">
        <summary aria-controls="lp-faq-ans-${i}">${esc(f.q)}</summary>
        <p id="lp-faq-ans-${i}">${esc(f.a)}</p>
      </details>
    `).join('');
  }

  function renderContact() {
    const c = PAGE.contact || {};
    setText('lpFinalCtaTitle', c.finalCtaTitle);
    setText('lpFinalCtaSub', c.finalCtaSub);

    // WhatsApp — falls back to global settings.whatsappNumber
    const waBtn = document.getElementById('lpWhatsappBtn');
    const waNum = c.whatsapp || SETTINGS.whatsappNumber || '';
    if (waNum) {
      const msg = encodeURIComponent(c.whatsappMessage || 'Hi! I\'m interested in your photography services.');
      waBtn.href = `https://wa.me/${waNum.replace(/\D/g, '')}?text=${msg}`;
    } else {
      waBtn.style.display = 'none';
      const orEl = document.querySelector('.lp-contact-or');
      if (orEl) orEl.style.display = 'none';
      const noteEl = document.querySelector('.lp-wa-note');
      if (noteEl) noteEl.style.display = 'none';
    }

    // Nav CTA
    const navCta = document.getElementById('lpNavCta');
    if (navCta && PAGE.hero && PAGE.hero.cta) {
      navCta.textContent = PAGE.hero.cta.text || 'Get a Free Quote';
    }
  }

  // ─── Form ───
  function setupForm(settings) {
    const form = document.getElementById('lpForm');
    const keyInput = document.getElementById('lpFormKey');
    const key = (PAGE.contact && PAGE.contact.web3formsKey) || settings.web3formsKey || '';
    if (keyInput) keyInput.value = key;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!key) {
        alert('Contact form is not configured yet. Please use WhatsApp instead.');
        return;
      }
      const data = new FormData(form);
      try {
        const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
        if (r.ok) {
          document.getElementById('lpFormOk').style.display = 'block';
          form.reset();
        }
      } catch(err) {
        alert('Something went wrong. Please try WhatsApp instead.');
      }
    });
  }

  // ─── Nav scroll ───
  function setupNav() {
    const nav = document.getElementById('lpNav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ─── Scroll reveal ───
  function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

    // Observe all reveal elements, with retries for dynamic content
    function observeAll() {
      document.querySelectorAll('.lp-reveal:not(.in)').forEach(el => observer.observe(el));
    }
    observeAll();
    setTimeout(observeAll, 200);
    setTimeout(observeAll, 600);
  }

  // ─── Sticky CTA ───
  function setupStickyCta() {
    const cta = document.getElementById('lpStickyCta');
    if (!cta) return;
    if (PAGE.hero && PAGE.hero.cta) cta.textContent = PAGE.hero.cta.text || 'Get a Free Quote';
    window.addEventListener('scroll', () => {
      cta.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
  }

  // ─── Helpers ───
  function setText(id, html) {
    const el = document.getElementById(id);
    if (el && html) el.innerHTML = html;
  }
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
    return m ? m[1] : null;
  }

  // ─── Service Portfolio Gallery (matches main site aesthetic) ────────────

  function getVimeoId(url) {
    if (!url) return null;
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }

  function buildVideoEmbed(url) {
    const ytId = getYouTubeId(url);
    if (ytId) return `<div class="lp-gallery-video-wrap"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen loading="lazy"></iframe></div>`;
    const vmId = getVimeoId(url);
    if (vmId) return `<div class="lp-gallery-video-wrap"><iframe src="https://player.vimeo.com/video/${vmId}" allowfullscreen loading="lazy"></iframe></div>`;
    return `<div class="lp-gallery-video-wrap"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
  }

  function openLightbox(photos, startIdx) {
    let idx = startIdx;
    const lb = document.createElement('div');
    lb.className = 'lp-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');

    function renderLb() {
      lb.innerHTML = `
        <img class="lp-lightbox-img" src="${esc(photos[idx].url)}" alt="${esc(photos[idx].caption || 'Photo')}">
        <button class="lp-lightbox-close" aria-label="Close">✕</button>
        ${photos.length > 1 ? `
          <button class="lp-lightbox-prev" aria-label="Previous">‹</button>
          <button class="lp-lightbox-next" aria-label="Next">›</button>
        ` : ''}
        <div class="lp-lightbox-counter">${idx + 1} / ${photos.length}</div>
      `;
      lb.querySelector('.lp-lightbox-close').onclick = closeLb;
      if (photos.length > 1) {
        lb.querySelector('.lp-lightbox-prev').onclick = () => { idx = (idx - 1 + photos.length) % photos.length; renderLb(); };
        lb.querySelector('.lp-lightbox-next').onclick = () => { idx = (idx + 1) % photos.length; renderLb(); };
      }
    }

    const _lastFocused = document.activeElement;
    function closeLb() {
      lb.remove();
      document.removeEventListener('keydown', onLbKey);
      if (_lastFocused && typeof _lastFocused.focus === 'function') _lastFocused.focus();
    }
    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      const focusables = lb.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    function onLbKey(e) {
      trapFocus(e);
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight' && photos.length > 1) { idx = (idx + 1) % photos.length; renderLb(); }
      if (e.key === 'ArrowLeft'  && photos.length > 1) { idx = (idx - 1 + photos.length) % photos.length; renderLb(); }
    }

    lb.onclick = (e) => { if (e.target === lb) closeLb(); };
    document.addEventListener('keydown', onLbKey);
    renderLb();
    document.body.appendChild(lb);
    // Move focus into the dialog
    const closeBtn = lb.querySelector('.lp-lightbox-close');
    if (closeBtn) closeBtn.focus();
  }

  function buildGalleryTabs(service) {
    const tabs = [];
    if (service.portfolio && service.portfolio.length > 0) tabs.push({ id: 'photos', label: 'Photos' });
    if (service.videoUrl) tabs.push({ id: 'video', label: 'Video' });
    if (service.tourUrl)  tabs.push({ id: 'tour',  label: '3D Tour' });
    return tabs;
  }

  function buildGalleryPanels(service, tabs) {
    return tabs.map((tab, i) => {
      let content = '';
      if (tab.id === 'photos') {
        content = `<div class="lp-gallery-photo-grid">
          ${service.portfolio.map((p, pi) => `
            <div class="lp-gallery-photo-item" data-idx="${pi}">
              <img src="${esc(p.url)}" alt="${esc(p.caption || 'Photo')}" loading="lazy">
              <div class="lp-gallery-zoom-icon">⌕</div>
            </div>`).join('')}
        </div>`;
      } else if (tab.id === 'video') {
        content = buildVideoEmbed(service.videoUrl);
      } else if (tab.id === 'tour') {
        content = `
          <div class="lp-gallery-video-wrap">
            <iframe src="${esc(service.tourUrl)}" allowfullscreen loading="lazy"></iframe>
          </div>
          <a href="${esc(service.tourUrl)}" target="_blank" rel="noopener" class="lp-gallery-tour-btn">
            Open full 3D Tour ↗
          </a>`;
      }
      return `<div class="lp-gallery-panel${i === 0 ? ' active' : ''}" data-panel="${tab.id}">${content}</div>`;
    }).join('');
  }

  function openServiceGallery(service) {
    const tabs = buildGalleryTabs(service);
    if (tabs.length === 0) return;
    const photoCount = service.portfolio ? service.portfolio.length : 0;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'lp-gallery-backdrop';

    // Gallery container
    const gallery = document.createElement('div');
    gallery.className = 'lp-gallery';
    gallery.setAttribute('role', 'dialog');
    gallery.setAttribute('aria-modal', 'true');
    gallery.setAttribute('aria-label', service.title + ' portfolio');

    gallery.innerHTML = `
      <div class="lp-gallery-inner">
        <div class="lp-gallery-header">
          <div class="lp-gallery-header-left">
            <div class="lp-gallery-eyebrow">Portfolio</div>
            <h3 class="lp-gallery-title">${esc(service.title)}</h3>
            ${service.description ? `<p class="lp-gallery-desc">${esc(service.description)}</p>` : ''}
          </div>
          <div class="lp-gallery-header-right">
            <button class="lp-gallery-close" aria-label="Close">✕</button>
            ${photoCount > 0 ? `<span class="lp-gallery-count">${photoCount} photo${photoCount !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        ${tabs.length > 1 ? `
          <div class="lp-gallery-tabs">
            ${tabs.map((t, i) => `<button class="lp-gallery-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>` : ''}
        <div class="lp-gallery-body">
          ${buildGalleryPanels(service, tabs)}
        </div>
        <div class="lp-gallery-footer">
          <a href="#lp-contact" class="btn">Get a Free Quote</a>
          ${(() => {
            const waNum = (PAGE.contact?.whatsapp || '').replace(/\D/g, '');
            if (!waNum) return '';
            const msg = encodeURIComponent(service.whatsappMsg || PAGE.contact?.whatsappMessage || 'Hi! I\'m interested in your photography services.');
            return `<a href="https://wa.me/${waNum}?text=${msg}" target="_blank" rel="noopener" class="btn btn-wa">💬 WhatsApp</a>`;
          })()}
        </div>
      </div>`;

    function closeGallery() {
      backdrop.classList.remove('open');
      gallery.classList.remove('open');
      setTimeout(() => { backdrop.remove(); gallery.remove(); }, 350);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') closeGallery(); }

    backdrop.onclick = closeGallery;
    gallery.querySelector('.lp-gallery-close').onclick = closeGallery;
    gallery.addEventListener('click', (e) => { if (e.target === gallery) closeGallery(); });
    document.addEventListener('keydown', onKey);

    // Tab switching
    gallery.querySelectorAll('.lp-gallery-tab').forEach(btn => {
      btn.onclick = () => {
        gallery.querySelectorAll('.lp-gallery-tab').forEach(b => b.classList.remove('active'));
        gallery.querySelectorAll('.lp-gallery-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        gallery.querySelector(`.lp-gallery-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      };
    });

    // Photo click → lightbox
    gallery.querySelectorAll('.lp-gallery-photo-item').forEach(item => {
      item.onclick = () => openLightbox(service.portfolio, parseInt(item.dataset.idx));
    });

    // Footer CTA
    gallery.querySelector('.lp-gallery-footer .btn').onclick = (e) => {
      e.preventDefault(); closeGallery();
      setTimeout(() => document.getElementById('lp-contact')?.scrollIntoView({ behavior: 'smooth' }), 360);
    };

    // Swipe down to close on mobile
    let startY = 0;
    const inner = gallery.querySelector('.lp-gallery-inner');
    inner.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    inner.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 80) closeGallery();
    }, { passive: true });

    document.body.appendChild(backdrop);
    document.body.appendChild(gallery);

    // Trigger open animation after DOM paint
    setTimeout(() => {
      backdrop.classList.add('open');
      gallery.classList.add('open');
    }, 20);
  }

  function openServiceModal(idx) {
    const service = (PAGE.services || [])[idx];
    if (!service) return;
    openServiceGallery(service);
  }

  // ─── Boot ───
  init();
})();
