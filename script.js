// ─── Dark Mode ───────────────────────────────────────────────────────────
(function() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('darkToggle');
  if (btn) btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
});

// ─── Supabase Config ──────────────────────────────────────────────────────
const SUPABASE_URL = 'https://buhuwnkljilyysyrdkxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dc31AWiwdbDVgMGXEY4fTg_t2rPBi1G';

// ─── XSS Helper ───────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Settings Manager (single source of truth) ───────────────────────────
const Settings = {
  get() {
    try { return JSON.parse(localStorage.getItem('vmSettings') || '{}'); }
    catch(e) { return {}; }
  },
  set(data) { localStorage.setItem('vmSettings', JSON.stringify(data)); },
  update(patch) { const s = this.get(); Object.assign(s, patch); this.set(s); }
};

// ─── Settings Loader (fetch from server, populate localStorage) ──────────
// The public site has no admin — so it must pull settings fresh on load.
// Order: /api/settings (local dev) → /settings.json (Cloudflare static) → Supabase
// Runs BEFORE DOMContentLoaded listeners so the gallery modal / hero / etc.
// see the latest data.
window.__settingsReady = (async function loadSettingsFromServer() {
  let loaded = null;
  // 1st try: local dev server API
  try {
    const r = await fetch('/api/settings');
    if (r.ok) loaded = await r.json();
  } catch(e) {}
  // 2nd try: static settings.json (production — Cloudflare serves with no-cache header)
  if (!loaded || !Object.keys(loaded).length) {
    try {
      const r2 = await fetch('/settings.json');
      if (r2.ok) loaded = await r2.json();
    } catch(e) {}
  }
  // 3rd try: Supabase — always merge on top so live admin changes (covers, etc.) win
  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=data`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (sbRes.ok) {
      const rows = await sbRes.json();
      if (rows && rows[0] && rows[0].data && Object.keys(rows[0].data).length) {
        // Merge: Supabase wins for keys it has (latest admin saves), file wins for the rest
        loaded = Object.assign({}, loaded || {}, rows[0].data);
      }
    }
  } catch(e) {}
  if (loaded && Object.keys(loaded).length > 0) {
    Settings.set(loaded);
  }
  return Settings.get();
})();

// ─── Cloudinary URL Helpers ──────────────────────────────────────────────
const CL_BASE = 'https://res.cloudinary.com/dnocmwoub/image/upload';

function clUrl(publicId, transforms) {
  const t = transforms ? transforms + ',q_auto,f_auto' : 'q_auto,f_auto';
  return CL_BASE + '/' + t + '/' + publicId;
}
function isClUrl(url) { return url && url.includes('res.cloudinary.com/dnocmwoub'); }
function extractPid(url) {
  const m = url && url.match(/\/upload\/[^/]+\/(portfolio\/.+)$/);
  return m ? m[1] : null;
}
function generateAlt(filename, category) {
  const labels = { wedding:'Wedding photography', portrait:'Portrait photography', food:'Food & beverage photography', family:'Family portrait session', events:'Event photography', product:'Product photography', hotels:'Hospitality & hotel photography', corporate:'Corporate photography', architecture:'Architectural photography', drone:'Drone & aerial photography' };
  const label = labels[category] || 'Photography';
  // Extract a readable descriptor from the filename (e.g. "DSC6033" → "photo 6033", "food-photography-01" → "food photography 01")
  const slug = filename.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').replace(/^\d+\s*/, '').trim();
  const descriptor = slug ? ` — ${slug}` : '';
  return `${label}${descriptor} by Vinicius Murari, Dublin`;
}

// ─── Video Helpers ────────────────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return m ? m[1] : null;
}
// Generate a srcset from a Cloudinary image URL with responsive widths
function cloudinarySrcset(url, widths = [640, 1024, 1600, 2400]) {
  if (!url || !url.includes('res.cloudinary.com')) return '';
  // Strip existing transformation segment (everything between /upload/ and the public_id)
  const base = url.replace(/\/upload\/[^/]*\//, '/upload/');
  const pidMatch = base.match(/\/upload\/(.+)$/);
  if (!pidMatch) return '';
  const publicId = pidMatch[1];
  return widths
    .map(w => `https://res.cloudinary.com/dnocmwoub/image/upload/w_${w},q_auto,f_auto/${publicId} ${w}w`)
    .join(', ');
}

function optimizeCloudinaryVideo(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return url;
  // Extract public_id after 'portfolio/' to avoid duplicating existing transformations
  const pidMatch = url.match(/(portfolio\/.+)$/);
  if (!pidMatch) return url;
  let publicId = pidMatch[1];
  if (!/\.(mp4|webm|mov)(\?.*)?$/.test(publicId)) publicId += '.mp4'; // ensure extension
  return `https://res.cloudinary.com/dnocmwoub/video/upload/q_auto/${publicId}`;
}
function getVideoPoster(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return '';
  const pidMatch = url.match(/(portfolio\/.+)$/);
  if (!pidMatch) return '';
  const publicId = pidMatch[1].replace(/\.(mp4|webm|mov)(\?.*)?$/, ''); // strip extension
  return `https://res.cloudinary.com/dnocmwoub/video/upload/so_0,f_jpg,q_auto,w_800/${publicId}.jpg`;
}
function isVideoUrl(url) {
  return !!url && (/\/video\/upload\//.test(url) || /\.(mp4|webm|mov)(\?.*)?$/i.test(url));
}

// ─── Page Loader ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('pageLoader').classList.add('done');
  }, 400);
});

// ─── Nav scroll effect ────────────────────────────────────────────────────
const nav = document.getElementById('nav');
const scrollTopBtn = document.getElementById('scrollTop');
const mobileCta = document.getElementById('mobileBookCta'); // cached once

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
      scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
      updateActiveNav();
      if (mobileCta) mobileCta.classList.toggle('visible', window.scrollY > 600);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Active nav link ──────────────────────────────────────────────────────
const sections = ['portfolio', 'drone', 'services', 'about', 'journal', 'contact'];
const navLinksAll = document.querySelectorAll('.nav-links a');

function updateActiveNav() {
  let current = '';
  for (const id of sections) {
    const sec = document.getElementById(id);
    if (sec && sec.getBoundingClientRect().top <= 200) current = id;
  }
  navLinksAll.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
}

// ─── Scroll reveal ────────────────────────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.rev').forEach(el => obs.observe(el));

// ─── Stat counter animation ──────────────────────────────────────────────
const statObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.a-stat strong').forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/^(\d+)(\+?)$/);
      if (!match) return; // skip non-numeric like "∞"
      const target = parseInt(match[1]);
      const suffix = match[2];
      let start = 0;
      const duration = 1200;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        el.textContent = Math.round(start + (target - start) * ease) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    statObs.unobserve(e.target);
  });
}, { threshold: 0.3 });
const statsSection = document.querySelector('.a-stats');
if (statsSection) statObs.observe(statsSection);

// ─── Contact form with validation ────────────────────────────────────────
const form = document.getElementById('contactForm');
if (form) {
  const fields = form.querySelectorAll('input, select, textarea');

  fields.forEach(f => {
    f.addEventListener('input', () => {
      f.classList.remove('invalid');
      const err = f.parentElement.querySelector('.field-error');
      if (err) err.classList.remove('show');
    });
  });

  // Real-time validation on blur
  document.querySelectorAll('#contactForm input[required], #contactForm textarea[required], #contactForm select[required]').forEach(field => {
    field.addEventListener('blur', function() {
      if (!this.value.trim()) {
        this.classList.add('invalid');
      } else {
        this.classList.remove('invalid');
      }
    });
    field.addEventListener('input', function() {
      if (this.value.trim()) this.classList.remove('invalid');
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    // Validate required fields
    const firstName = form.querySelector('input[placeholder="John"]');
    const email = form.querySelector('input[type="email"]');
    const service = form.querySelector('select');
    const message = form.querySelector('textarea');

    [[firstName, 'Please enter your name'], [email, 'Please enter a valid email'], [service, 'Please select a service'], [message, 'Please enter a message']].forEach(([field, msg]) => {
      const empty = field.tagName === 'SELECT' ? !field.value || field.value === '' : !field.value.trim();
      const emailInvalid = field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
      if (empty || emailInvalid) {
        valid = false;
        field.classList.add('invalid');
        let err = field.parentElement.querySelector('.field-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'field-error';
          field.parentElement.appendChild(err);
        }
        err.textContent = emailInvalid ? 'Please enter a valid email' : msg;
        err.classList.add('show');
      }
    });

    if (!valid) return;

    const btn = form.querySelector('.fsub');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const _s = Settings.get();
    const _w3f = _s.web3formsKey;

    // Guard: if no Web3Forms key configured, show clear message instead of silently failing
    if (!_w3f) {
      btn.disabled = false;
      btn.textContent = 'Send Message';
      const warn = document.createElement('p');
      warn.style.cssText = 'color:#92400e;font-size:0.8rem;margin-top:10px;background:rgba(245,158,11,0.1);padding:10px;border-radius:8px;';
      warn.textContent = 'Contact form not yet active. Please reach out via WhatsApp or Instagram.';
      btn.insertAdjacentElement('afterend', warn);
      setTimeout(() => warn.remove(), 6000);
      return;
    }

    const _key = document.getElementById('w3fKey');
    if (_key) _key.value = _w3f;

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        const ok = document.getElementById('fok');
        ok.style.display = 'block';
        form.reset();
        setTimeout(() => ok.style.display = 'none', 5000);
      } else {
        btn.textContent = 'Error — try again';
        setTimeout(() => { btn.textContent = 'Send Message'; }, 3000);
      }
    }).catch(() => {
      btn.textContent = 'Error — try again';
      setTimeout(() => { btn.textContent = 'Send Message'; }, 3000);
    }).finally(() => {
      btn.disabled = false;
      if (btn.textContent === 'Sending…') btn.textContent = 'Send Message';
    });
  });
}

// ─── Mobile nav ───────────────────────────────────────────────────────────
function toggleNav() {
  const links = document.getElementById('navLinks');
  const burger = document.querySelector('.nav-burger');
  links.classList.toggle('open');
  burger?.setAttribute('aria-expanded', links.classList.contains('open'));
}
function closeNav() {
  document.getElementById('navLinks').classList.remove('open');
  document.querySelector('.nav-burger')?.setAttribute('aria-expanded', 'false');
}

// ─── Reviews scroll navigation ────────────────────────────────────────────
const reviewsScroll = document.getElementById('reviewsScroll');
const revPrev = document.getElementById('revPrev');
const revNext = document.getElementById('revNext');
if (reviewsScroll && revPrev && revNext) {
  const scrollAmt = 360;
  revPrev.addEventListener('click', () => reviewsScroll.scrollBy({ left: -scrollAmt, behavior: 'smooth' }));
  revNext.addEventListener('click', () => reviewsScroll.scrollBy({ left: scrollAmt, behavior: 'smooth' }));
}

// ─── Gallery ───────────────────────────────────────────────────────────────

const galModal      = document.getElementById('galleryModal');
const galTitle      = document.getElementById('galTitle');
const galEyebrow    = document.getElementById('galEyebrow');
const galDesc       = document.getElementById('galDesc');
const galPhotoCount = document.getElementById('galPhotoCount');
const galGrid       = document.getElementById('galGrid');
const galSubs       = document.getElementById('galSubs');
const galClose      = document.getElementById('galClose');
const galData       = document.getElementById('galleryData');

let currentGalleryImages = [];
let allGalleryItems = []; // all items with sub-category data
let activeSubFilter = 'all';

// Open gallery when a category card is clicked
document.querySelectorAll('.cat-card[data-gallery]').forEach(card => {
  card.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (editActive) {
      window.location.href = `/admin.html#${card.dataset.gallery}`;
    } else {
      openGallery(card.dataset.gallery);
    }
  });
});

async function openGallery(id) {
  const section = galData.querySelector(`[data-id="${id}"]`);
  if (!section) return;

  galTitle.textContent   = section.dataset.title;
  galEyebrow.textContent = section.dataset.eyebrow || 'Photography';
  galDesc.textContent    = section.dataset.description || '';
  galPhotoCount.textContent = '';
  activeSubFilter = 'all';

  // Wait for initial settings fetch so landingPages is populated
  if (window.__settingsReady) { try { await window.__settingsReady; } catch(e) {} }

  // Show landing page link if this gallery has a linked active landing page
  const galLandingBtn = document.getElementById('galLandingBtn');
  if (galLandingBtn) {
    const landingSlug = section.dataset.landing;
    const settings = Settings.get();
    const lp = landingSlug && (settings.landingPages || []).find(p => p.slug === landingSlug && p.active);
    if (lp) {
      galLandingBtn.href = '/' + landingSlug;
      galLandingBtn.style.display = '';
    } else {
      galLandingBtn.style.display = 'none';
    }
  }

  // Portrait gallery: backgrounds guide CTA pill
  const existingGuideCta = document.getElementById('galBgGuide');
  if (existingGuideCta) existingGuideCta.remove();
  if (id === 'portrait') {
    const guideCta = document.createElement('a');
    guideCta.id = 'galBgGuide';
    guideCta.className = 'gal-bg-guide';
    guideCta.href = '/blog-post?slug=portrait-studio-backgrounds';
    guideCta.setAttribute('target', '_blank');
    guideCta.setAttribute('rel', 'noopener');
    guideCta.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Not sure which background suits you? Read the guide →`;
    const countRow = document.querySelector('.gal-count-row');
    if (countRow) countRow.insertAdjacentElement('afterend', guideCta);
  }

  // Build sub-category pills — check settings first, then HTML fallback
  galSubs.innerHTML = '';
  const savedSettings = Settings.get();
  const savedSubs = savedSettings.gallerySubs && savedSettings.gallerySubs[id];
  const subsStr = section.dataset.subs || '';
  const subs = savedSubs || (subsStr ? subsStr.split(',').map(s => s.trim()) : []);
  if (subs.length > 1) {
    subs.forEach(sub => {
      const pill = document.createElement('button');
      pill.className = 'gal-sub-pill' + (sub.toLowerCase() === 'all' ? ' active' : '');
      pill.textContent = sub;
      pill.addEventListener('click', () => filterGallery(sub.toLowerCase(), pill));
      galSubs.appendChild(pill);
    });
  }

  galGrid.innerHTML = Array(8).fill('<div class="gal-skeleton"></div>').join('');
  galModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load photos from Supabase — visible to ALL visitors on ALL devices
  let photos = [];
  const skeletonTimeout = setTimeout(() => {
    if (galGrid.querySelector('.gal-skeleton')) {
      galGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:2rem">Could not load photos. Please try again.</p>';
    }
  }, 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?category=eq.${id}&order=created_at.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (res.ok) photos = await res.json();
  } catch(e) {
    // Fallback: localStorage (local dev only)
    try {
      const stored = localStorage.getItem('cloudPhotos_' + id);
      if (stored) photos = JSON.parse(stored);
    } catch(e2) { photos = []; }
  }
  clearTimeout(skeletonTimeout);

  currentGalleryImages = [];
  allGalleryItems = [];
  galGrid.innerHTML = '';

  const photoSubMap = savedSettings.photoSubs || {};

  if (photos.length > 0) {
    photos.forEach((photo, i) => {
      const sub = photoSubMap[`${id}/${photo.filename}`] || photo.sub || 'all';
      const alt = photo.alt_text || generateAlt(photo.filename, id);
      const type = isVideoUrl(photo.url) ? 'video' : 'photo';
      currentGalleryImages.push({ src: photo.url, alt, sub, type });
      addGalItem(photo.url, alt, i, sub);
    });
  } else {
    section.querySelectorAll('figure').forEach((fig, i) => {
      const img = fig.querySelector('img');
      const sub = (fig.dataset.sub || 'all').toLowerCase();
      currentGalleryImages.push({ src: img.src, alt: img.alt, sub, type: 'photo' });
      addGalItem(img.src, img.alt, i, sub);
    });
  }

  if (currentGalleryImages.length === 0) {
    galGrid.innerHTML = '<div style="padding:60px 40px;text-align:center;color:#6e6e73;font-size:0.85rem">No photos yet — add some in the <a href="/admin.html" style="color:#0071e3">admin panel</a>.</div>';
  } else {
    galPhotoCount.textContent = `${currentGalleryImages.length} photo${currentGalleryImages.length !== 1 ? 's' : ''}`;
  }
  adjustGalColumns(currentGalleryImages.length);
}

function adjustGalColumns(count) {
  if      (count <= 4)  galGrid.style.columns = '3';
  else if (count <= 9)  galGrid.style.columns = '4';
  else                  galGrid.style.columns = '';
}

function filterGallery(sub, activePill) {
  activeSubFilter = sub;

  // Update pill active states
  galSubs.querySelectorAll('.gal-sub-pill').forEach(p => p.classList.remove('active'));
  activePill.classList.add('active');

  // Single pass: filter, rebuild lightbox array, reassign click handlers
  currentGalleryImages = [];
  allGalleryItems.forEach(item => {
    const show = sub === 'all' || item.sub === sub;
    item.el.classList.toggle('hidden', !show);
    if (show) {
      const idx = currentGalleryImages.length;
      currentGalleryImages.push({ src: item.src, alt: item.alt, sub: item.sub, type: item.type || 'photo' });
      item.el.onclick = () => openLightbox(idx);
    }
  });

  galPhotoCount.textContent = `${currentGalleryImages.length} photo${currentGalleryImages.length !== 1 ? 's' : ''}`;
  adjustGalColumns(currentGalleryImages.length);
}

function addGalItem(src, alt, index, sub) {
  const item = document.createElement('div');
  const isVid = isVideoUrl(src);
  item.className = 'gal-item' + (isVid ? ' gal-item-video' : '');

  const pid = isClUrl(src) ? extractPid(src) : null;
  const posterSrc = isVid ? getVideoPoster(src) : null;

  // LQIP blur-up background (use poster for videos)
  const bgSrc = isVid ? posterSrc : (pid ? clUrl(pid, 'e_blur:800,q_10,w_50,c_limit') : null);
  if (bgSrc) {
    item.style.backgroundImage = "url('" + bgSrc + "')";
    item.style.backgroundSize = 'cover';
    item.style.backgroundPosition = 'center';
  }

  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.style.opacity = '0';
  img.style.transition = 'opacity .4s ease';
  img.onload = function() { this.style.opacity = '1'; };

  if (isVid) {
    // Show poster frame from Cloudinary (first frame as jpg)
    img.src = posterSrc || '';
    if (!posterSrc) img.style.opacity = '0.4';
  } else if (pid) {
    img.src = clUrl(pid, 'w_800,c_limit');
    img.srcset = [400,600,800,1200].map(w => clUrl(pid, 'w_' + w + ',c_limit') + ' ' + w + 'w').join(', ');
    img.sizes = '(max-width:600px) 50vw, (max-width:1024px) 33vw, 25vw';
  } else {
    img.src = src;
  }

  const overlay = document.createElement('div');
  overlay.className = 'gal-item-overlay';
  if (isVid) {
    overlay.innerHTML = '<div class="gal-zoom-icon gal-play-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
  } else {
    overlay.innerHTML = '<div class="gal-zoom-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>';
  }

  item.appendChild(img);
  item.appendChild(overlay);
  item.onclick = () => openLightbox(index);
  galGrid.appendChild(item);

  allGalleryItems.push({ el: item, src, alt, sub: (sub || 'all').toLowerCase(), index, lightboxIndex: index, type: isVid ? 'video' : 'photo' });
}

function closeGallery() {
  galModal.classList.remove('open');
  document.body.style.overflow = '';
  allGalleryItems = [];
  currentGalleryImages = [];
}

galClose.addEventListener('click', closeGallery);
galModal.addEventListener('click', e => { if (e.target === galModal) closeGallery(); });

// ─── Drone Preview Grid ────────────────────────────────────────────────────
async function loadDronePreview() {
  const grid = document.getElementById('dronePreviewGrid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill('<div class="drone-card drone-skeleton"></div>').join('');

  let photos = [];
  const droneTimeout = setTimeout(() => {
    if (grid.querySelector('.drone-skeleton')) {
      grid.innerHTML = '<div class="drone-card drone-card-placeholder" style="grid-column:1/-1">Could not load. Please refresh.</div>';
    }
  }, 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/photos?category=eq.drone&order=created_at.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (res.ok) photos = await res.json();
  } catch(e) {}
  clearTimeout(droneTimeout);

  if (!photos.length) {
    grid.innerHTML = `
      <div class="drone-card drone-card-placeholder">Aerial Photography</div>
      <div class="drone-card drone-card-placeholder">Landscape &amp; Real Estate</div>
      <div class="drone-card drone-card-placeholder">Video Production</div>
      <div class="drone-card drone-card-placeholder">Brand Films</div>`;
    return;
  }

  grid.innerHTML = '';
  photos.slice(0, 4).forEach(photo => {
    const isVid = isVideoUrl(photo.url);
    const thumbSrc = isVid ? (getVideoPoster(photo.url) || photo.thumb || photo.url) : photo.url;
    const label = photo.sub || (isVid ? 'Video' : 'Aerial');
    const card = document.createElement('div');
    card.className = 'drone-card' + (isVid ? ' gal-item-video' : '');
    card.innerHTML = `
      <img src="${escHtml(thumbSrc)}" alt="${escHtml(generateAlt(photo.filename || 'drone', 'drone'))}" loading="lazy" decoding="async">
      <div class="drone-card-label">${isVid ? '▶ ' : ''}${escHtml(label)}</div>
      ${isVid ? '<div class="gal-play-icon"><svg viewBox="0 0 24 24" fill="white" width="32" height="32"><polygon points="5,3 19,12 5,21"/></svg></div>' : ''}`;
    card.addEventListener('click', () => openGallery('drone'));
    grid.appendChild(card);
  });
}

loadDronePreview();

// ─── Journal Posts ────────────────────────────────────────────────────────
async function loadJournalPosts() {
  const grid = document.getElementById('journalGrid');
  if (!grid) return;

  grid.innerHTML = Array(3).fill('<div class="journal-skeleton"></div>').join('');

  let posts = [];
  const journalTimeout = setTimeout(() => {
    if (grid.querySelector('.journal-skeleton')) {
      grid.innerHTML = '<p class="journal-empty">Could not load posts. Please refresh.</p>';
    }
  }, 8000);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?status=eq.published&order=published_at.desc&limit=3`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    if (res.ok) posts = await res.json();
  } catch(e) {}
  clearTimeout(journalTimeout);

  if (!posts.length) {
    grid.innerHTML = '<p class="journal-empty">Posts coming soon.</p>';
    return;
  }

  grid.innerHTML = '';
  posts.forEach(post => {
    const date = post.published_at
      ? new Date(post.published_at).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const card = document.createElement('a');
    card.className = 'journal-card';
    card.href = `/blog-post?slug=${encodeURIComponent(post.slug)}`;
    card.innerHTML = `
      <div class="journal-card-img${post.cover_image ? '' : ' journal-card-img--empty'}">
        ${post.cover_image ? `<img src="${escHtml(post.cover_image)}" alt="${escHtml(post.title)}" loading="lazy" decoding="async">` : ''}
      </div>
      <div class="journal-card-body">
        ${date ? `<time class="journal-card-date">${escHtml(date)}</time>` : ''}
        <h3 class="journal-card-title">${escHtml(post.title)}</h3>
        ${post.excerpt ? `<p class="journal-card-excerpt">${escHtml(post.excerpt)}</p>` : ''}
        <span class="journal-card-cta">Read more →</span>
      </div>`;
    grid.appendChild(card);
  });

  // Pinned guide card — always last in the journal grid
  const guideCard = document.createElement('a');
  guideCard.className = 'journal-card journal-card--guide';
  guideCard.href = '/blog-post?slug=portrait-studio-backgrounds';
  guideCard.setAttribute('aria-label', 'Studio Background Guide — How to choose the right background for your portrait session');
  guideCard.innerHTML = `
    <div class="guide-swatches" aria-hidden="true">
      <div class="guide-swatch guide-swatch--white"><span class="guide-swatch-label">White</span></div>
      <div class="guide-swatch guide-swatch--black"><span class="guide-swatch-label">Black</span></div>
      <div class="guide-swatch guide-swatch--brand"><span class="guide-swatch-label">Brand</span></div>
      <div class="guide-swatch guide-swatch--nature"><span class="guide-swatch-label">Natural</span></div>
    </div>
    <div class="journal-card-body">
      <time class="journal-card-date">Studio Guide</time>
      <h3 class="journal-card-title">How to Choose the Right Background for Your Session</h3>
      <p class="journal-card-excerpt">White, black, brand colour or natural environment — each tells a completely different story. Find yours.</p>
      <span class="journal-card-cta">Read the guide</span>
    </div>`;
  grid.appendChild(guideCard);
}
loadJournalPosts();

// ─── Lightbox ──────────────────────────────────────────────────────────────

const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lbImg');
const lbCounter = document.getElementById('lbCounter');
const lbThumbs  = document.getElementById('lbThumbs');
const lbClose   = document.getElementById('lbClose');
const lbPrev    = document.getElementById('lbPrev');
const lbNext    = document.getElementById('lbNext');

let lbIndex = 0;

function openLightbox(index) {
  lbIndex = index;
  buildThumbs();
  showLbPhoto(false);
  lightbox.classList.add('open');
  // Focus close button so keyboard users are immediately inside the lightbox
  requestAnimationFrame(() => lbClose.focus());
}

function closeLightbox() {
  lightbox.classList.remove('open');
  if (lbVideo) { lbVideo.pause(); lbVideo.src = ''; lbVideo.style.display = 'none'; }
  lbImg.style.display = '';
}

function buildThumbs() {
  lbThumbs.innerHTML = '';
  currentGalleryImages.forEach((photo, i) => {
    const t = document.createElement('div');
    t.className = 'lb-thumb' + (i === lbIndex ? ' active' : '');
    const pid = isClUrl(photo.src) ? extractPid(photo.src) : null;
    let thumbSrc;
    if (photo.type === 'video') {
      thumbSrc = getVideoPoster(photo.src) || (pid ? clUrl(pid, 'w_150,h_100,c_fill') : photo.src);
    } else {
      thumbSrc = pid ? clUrl(pid, 'w_150,h_100,c_fill') : photo.src;
    }
    const inner = photo.type === 'video'
      ? `<img src="${thumbSrc}" alt="${photo.alt}" loading="lazy" decoding="async"><span class="lb-thumb-play">▶</span>`
      : `<img src="${thumbSrc}" alt="${photo.alt}" loading="lazy" decoding="async">`;
    t.innerHTML = inner;
    t.addEventListener('click', () => { lbIndex = i; showLbPhoto(true); });
    lbThumbs.appendChild(t);
  });
}

const lbVideo = document.getElementById('lbVideo');

let _lbFadeTimer = null; // cancel pending fade if user navigates fast

function showLbPhoto(animate = true) {
  const targetIndex = lbIndex; // snapshot — may change before setTimeout fires
  const photo = currentGalleryImages[targetIndex];
  const isVid = photo.type === 'video';

  // Cancel any in-flight fade from a previous navigation
  if (_lbFadeTimer) { clearTimeout(_lbFadeTimer); _lbFadeTimer = null; lbImg.classList.remove('lb-fade'); }

  // Pause any playing video when switching
  if (!isVid && lbVideo) { lbVideo.pause(); lbVideo.src = ''; lbVideo.style.display = 'none'; }

  if (isVid) {
    lbImg.style.display = 'none';
    lbVideo.style.display = 'block';
    lbVideo.src = optimizeCloudinaryVideo(photo.src);
    lbVideo.poster = getVideoPoster(photo.src);
    lbVideo.load();
  } else {
    lbImg.style.display = '';
    if (animate) {
      lbImg.classList.add('lb-fade');
      _lbFadeTimer = setTimeout(() => {
        _lbFadeTimer = null;
        // Only apply if the user hasn't moved on to another photo
        if (lbIndex === targetIndex) {
          lbImg.src = photo.src;
          lbImg.alt = photo.alt;
        }
        lbImg.classList.remove('lb-fade');
      }, 120);
    } else {
      lbImg.src = photo.src;
      lbImg.alt = photo.alt;
    }
  }

  lbCounter.textContent = `${targetIndex + 1} / ${currentGalleryImages.length}`;
  lbPrev.style.visibility = targetIndex === 0 ? 'hidden' : 'visible';
  lbNext.style.visibility = targetIndex === currentGalleryImages.length - 1 ? 'hidden' : 'visible';

  // Update active thumb + scroll into view
  lbThumbs.querySelectorAll('.lb-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === targetIndex);
  });
  const activeThumb = lbThumbs.children[targetIndex];
  if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });

  // Preload adjacent images so next/prev are instant
  [targetIndex - 1, targetIndex + 1, targetIndex + 2].forEach(pi => {
    const p = currentGalleryImages[pi];
    if (p && p.type !== 'video' && p.src) {
      const pre = new Image();
      pre.src = p.src;
    }
  });
}

lbClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lbPrev.addEventListener('click', () => { if (lbIndex > 0) { lbIndex--; showLbPhoto(true); } });
lbNext.addEventListener('click', () => { if (lbIndex < currentGalleryImages.length - 1) { lbIndex++; showLbPhoto(true); } });

// Swipe navigation on the full lightbox overlay (mobile)
(function() {
  let swipeStartX = 0, swipeStartY = 0, swipeMoved = false;
  lightbox.addEventListener('touchstart', e => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeMoved = false;
  }, { passive: true });
  lightbox.addEventListener('touchmove', e => {
    const dx = Math.abs(e.touches[0].clientX - swipeStartX);
    const dy = Math.abs(e.touches[0].clientY - swipeStartY);
    if (dx > 8 || dy > 8) swipeMoved = true;
  }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (!swipeMoved) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY);
    // Only treat as horizontal swipe if it's clearly horizontal
    if (Math.abs(dx) < 40 || dy > Math.abs(dx) * 0.7) return;
    if (dx < 0 && lbIndex < currentGalleryImages.length - 1) { lbIndex++; showLbPhoto(true); }
    else if (dx > 0 && lbIndex > 0) { lbIndex--; showLbPhoto(true); }
  }, { passive: true });
})();

document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  { if (lbIndex > 0) { lbIndex--; showLbPhoto(true); } }
    if (e.key === 'ArrowRight') { if (lbIndex < currentGalleryImages.length - 1) { lbIndex++; showLbPhoto(true); } }
    if (e.key === 'Escape')     closeLightbox();
    // Focus trap: keep Tab cycling inside the lightbox
    if (e.key === 'Tab') {
      const focusable = Array.from(lightbox.querySelectorAll('button, [tabindex="0"], video[controls]')).filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    }
  } else if (galModal.classList.contains('open')) {
    if (e.key === 'Escape') closeGallery();
  }
});

// ─── Lightbox Zoom (pinch + double-tap + scroll) ─────────────────────────
(function() {
  let scale = 1, tx = 0, ty = 0, startDist = 0, startScale = 1;
  let isDragging = false, dragStartX, dragStartY, dragTx, dragTy;
  let lastTap = 0;

  function resetZoom() { scale = 1; tx = 0; ty = 0; applyTransform(); }
  function applyTransform() { lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; }
  function clampPan() {
    const maxX = Math.max(0, (scale - 1) * lbImg.offsetWidth / 2);
    const maxY = Math.max(0, (scale - 1) * lbImg.offsetHeight / 2);
    tx = Math.max(-maxX, Math.min(maxX, tx)); ty = Math.max(-maxY, Math.min(maxY, ty));
  }

  lbImg.style.transition = 'transform 0.15s ease';
  lbImg.style.transformOrigin = 'center center';

  // Double-tap to zoom
  lbImg.addEventListener('click', e => {
    const now = Date.now();
    if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.5; tx = 0; ty = 0; applyTransform(); }
    lastTap = now;
  });

  // Pinch to zoom
  lbImg.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      startDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      startScale = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
      dragTx = tx; dragTy = ty;
    }
  }, { passive: false });

  lbImg.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      scale = Math.max(1, Math.min(5, startScale * (dist / startDist)));
      if (scale === 1) { tx = 0; ty = 0; }
      applyTransform();
    } else if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      tx = dragTx + (e.touches[0].clientX - dragStartX);
      ty = dragTy + (e.touches[0].clientY - dragStartY);
      clampPan(); applyTransform();
    }
  }, { passive: false });

  lbImg.addEventListener('touchend', () => { isDragging = false; });

  // Mouse wheel zoom
  lbImg.addEventListener('wheel', e => {
    if (!lightbox.classList.contains('open')) return;
    e.preventDefault();
    scale = Math.max(1, Math.min(5, scale + (e.deltaY > 0 ? -0.3 : 0.3)));
    if (scale === 1) { tx = 0; ty = 0; }
    clampPan(); applyTransform();
  }, { passive: false });

  // Reset zoom on photo change
  const origShow = showLbPhoto;
  showLbPhoto = function(animate) { resetZoom(); origShow(animate); };
  lbClose.addEventListener('click', resetZoom);
})();

// ─── Inline Edit Mode ──────────────────────────────────────────────────────

const editToggle = document.getElementById('editToggle');
const editBar    = document.getElementById('editBar');
const ebSave     = document.getElementById('ebSave');
const ebExit     = document.getElementById('ebExit');
let editActive   = false;

// Secret shortcut: press 'e' three times quickly to show edit button
(function() {
  let taps = 0, timer = null;
  document.addEventListener('keydown', e => {
    if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'e' || e.key === 'E') {
      taps++;
      clearTimeout(timer);
      if (taps >= 3) {
        taps = 0;
        editToggle.classList.toggle('visible');
      }
      timer = setTimeout(() => taps = 0, 600);
    }
  });
})();

editToggle.addEventListener('click', () => editActive ? exitEdit() : enterEdit());
ebExit.addEventListener('click', exitEdit);
ebSave.addEventListener('click', saveEdits);

function enterEdit() {
  editActive = true;
  document.body.classList.add('edit-mode');
  editBar.classList.add('open');
  editToggle.classList.add('active');
  editToggle.textContent = '✕ Editing';

  // Make all data-edit elements editable
  document.querySelectorAll('[data-edit]').forEach(el => {
    el.contentEditable = 'true';
    el.spellcheck = false;
  });

}

function exitEdit() {
  editActive = false;
  document.body.classList.remove('edit-mode');
  editBar.classList.remove('open');
  editToggle.classList.remove('active');
  editToggle.textContent = '✏️ Edit Site';
  ebSave.textContent = 'Save Changes';
  ebSave.classList.remove('saved');

  document.querySelectorAll('[data-edit]').forEach(el => {
    el.contentEditable = 'false';
  });

}

function saveEdits() {
  const S = Settings.get();
  document.querySelectorAll('[data-edit]').forEach(el => { S[el.dataset.edit] = el.innerHTML; });
  Settings.set(S);
  ebSave.textContent = '✓ Saved!';
  ebSave.classList.add('saved');
  setTimeout(() => { ebSave.textContent = 'Save Changes'; ebSave.classList.remove('saved'); }, 2500);
}

// ─── Hero Slideshow (activates only when heroSlides or heroVideo configured) ─
(function() {
  const hero = document.getElementById('hero');
  const slidesContainer = document.getElementById('heroSlides');
  const dotsContainer = document.getElementById('heroDots');
  const heroVideo = document.getElementById('heroVideo');
  if (!slidesContainer || !hero) return;

  let slides = [];
  let currentSlide = 0;
  let interval = null;
  let duration = 5000;

  function applyHeroSettings(s) {
    heroVideo.style.display = 'none';

    // Build unified slide array — images and video mixed together
    let allSlides = [];
    if (s.heroSlides && s.heroSlides.length > 0) {
      allSlides = s.heroSlides;
    } else if (s.heroVideo) {
      // Legacy single-video mode → treat as one video slide
      allSlides = [{ url: s.heroVideo, type: 'video' }];
    }

    if (allSlides.length > 0) {
      hero.classList.add('slideshow-active');
      slides = allSlides;
      duration = (s.heroSlideDuration || 5) * 1000;
    } else {
      hero.classList.remove('slideshow-active');
      slides = [];
    }
  }

  function loadHeroConfig() {
    applyHeroSettings(Settings.get());
  }

  function makeYtSrc(ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&playsinline=1&rel=0&modestbranding=1`;
  }

  function buildSlides() {
    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    if (!slides.length) return;

    slides.forEach((slide, i) => {
      const el = document.createElement('div');
      el.className = 'hero-slide' + (i === 0 ? ' active' : '');

      if (slide.type === 'video') {
        const ytId = getYouTubeId(slide.url);
        if (ytId) {
          // ── YouTube embed ──────────────────────────────────────────────
          el.dataset.type = 'youtube';
          el.dataset.ytid = ytId;
          const iframe = document.createElement('iframe');
          iframe.allow = 'autoplay; fullscreen';
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('frameborder', '0');
          // Only autoplay the first slide immediately; others load on demand
          iframe.src = i === 0 ? makeYtSrc(ytId) : '';
          el.appendChild(iframe);
          // YouTube loops via playlist param — advance after a fixed duration
          if (i === 0) setTimeout(() => goToSlide((i + 1) % slides.length), duration);
        } else {
          // ── Cloudinary / direct video ──────────────────────────────────
          el.dataset.type = 'video';
          const optimisedUrl = optimizeCloudinaryVideo(slide.url);
          const poster = getVideoPoster(slide.url);
          const vid = document.createElement('video');
          vid.muted = true;
          vid.playsInline = true;
          vid.setAttribute('playsinline', '');
          vid.preload = i === 0 ? 'metadata' : 'none'; // lazy-load non-active slides
          if (poster) vid.poster = poster;
          vid.src = optimisedUrl;
          vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
          el.appendChild(vid);
          vid.addEventListener('ended', () => goToSlide((i + 1) % slides.length));
          if (i === 0) vid.play().catch(() => {});
        }
      } else {
        // Image slide — use <img> with srcset for responsive loading
        el.dataset.type = 'image';
        const img = document.createElement('img');
        img.src = slide.url;
        const ss = cloudinarySrcset(slide.url);
        if (ss) img.srcset = ss;
        img.sizes = '100vw';
        img.alt = slide.caption || '';
        img.loading = i === 0 ? 'eager' : 'lazy';
        img.fetchPriority = i === 0 ? 'high' : 'auto';
        img.decoding = i === 0 ? 'sync' : 'async';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        el.appendChild(img);
      }

      if (slide.link) {
        el.dataset.link = slide.link;
        el.addEventListener('click', () => {
          const target = document.querySelector(slide.link);
          if (target) { target.scrollIntoView({ behavior: 'smooth' }); }
          else if (slide.link.startsWith('#')) {
            const catId = slide.link.replace('#', '');
            const card = document.querySelector(`[data-id="${catId}"]`);
            if (card) card.click();
          }
        });
      }
      slidesContainer.appendChild(el);
    });

    if (slides.length > 1) {
      dotsContainer.style.display = 'flex';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      });
    } else {
      dotsContainer.style.display = 'none';
    }

    updateHeroCta(0);
  }

  const SLIDE_LABELS = {
    food: 'Food Photography', wedding: 'Wedding Photography',
    portrait: 'Portrait & Studio', drone: 'Drone & Film',
    family: 'Family', events: 'Events', product: 'Product Photography',
    hotels: 'Hotels & Hospitality', corporate: 'Corporate', architecture: 'Architecture'
  };

  function updateHeroCta(index) {
    const ctaEl = document.getElementById('heroCta');
    if (!ctaEl) return;
    const slide = slides[index];
    if (!slide || !slide.link) { ctaEl.style.display = 'none'; return; }
    const catKey = slide.link.replace('#', '');
    const label = slide.caption || SLIDE_LABELS[catKey] || 'View Gallery';
    ctaEl.style.display = 'block';
    ctaEl.innerHTML = `<div class="hero-slide-cta-pill">
      <span>${label}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </div>`;
    ctaEl.onclick = () => {
      const catId = slide.link.replace('#', '');
      const card = document.querySelector(`.cat-card[data-gallery="${catId}"]`)
                || document.querySelector(`.cat-card[data-id="${catId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => card.click(), 350);
      } else {
        const section = document.getElementById(catId) || document.querySelector(slide.link);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }
    };
    // Animate in
    requestAnimationFrame(() => {
      const pill = ctaEl.querySelector('.hero-slide-cta-pill');
      if (pill) { pill.offsetHeight; pill.classList.add('visible'); }
    });
  }

  function goToSlide(index) {
    // Stop all video/YouTube slides that are leaving
    slidesContainer.querySelectorAll('.hero-slide[data-type="video"] video').forEach(v => {
      v.pause(); v.currentTime = 0;
    });
    slidesContainer.querySelectorAll('.hero-slide[data-type="youtube"] iframe').forEach(f => {
      f.src = ''; // stops playback without destroying element
    });

    currentSlide = index;
    const slideEls = slidesContainer.querySelectorAll('.hero-slide');
    slideEls.forEach((s, i) => s.classList.toggle('active', i === index));
    dotsContainer.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === index));
    updateHeroCta(index);

    const activeEl = slideEls[index];
    if (!activeEl) return;

    if (activeEl.dataset.type === 'video') {
      clearInterval(interval);
      const vid = activeEl.querySelector('video');
      if (vid) { vid.preload = 'auto'; vid.play().catch(() => {}); }
      // fallback timer in case video never ends (e.g. network issue)
      const fallback = setTimeout(() => goToSlide((index + 1) % slides.length), duration + 15000);
      vid?.addEventListener('ended', () => clearTimeout(fallback), { once: true });
    } else if (activeEl.dataset.type === 'youtube') {
      clearInterval(interval);
      const iframe = activeEl.querySelector('iframe');
      if (iframe) iframe.src = makeYtSrc(activeEl.dataset.ytid);
      // YouTube loops via playlist — advance after slide duration
      setTimeout(() => goToSlide((index + 1) % slides.length), duration);
    } else {
      resetInterval();
    }
  }

  function nextSlide() {
    if (slides.length <= 1) return;
    goToSlide((currentSlide + 1) % slides.length);
  }

  function resetInterval() {
    clearInterval(interval);
    if (slides.length > 1) {
      interval = setInterval(nextSlide, duration);
    }
  }

  // Touch swipe support
  let touchStartX = 0;
  slidesContainer.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  slidesContainer.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToSlide((currentSlide + 1) % slides.length);
      else goToSlide((currentSlide - 1 + slides.length) % slides.length);
    }
  }, { passive: true });

  // Init
  loadHeroConfig();
  buildSlides();
  resetInterval();

  // Expose for admin panel reload
  window.reloadHeroSlides = function() {
    clearInterval(interval);
    loadHeroConfig();
    buildSlides();
    resetInterval();
  };

  // Expose slide navigation for hero strip slideshow mode
  window._heroGoToSlide  = goToSlide;
  window._heroGetSlides  = () => slides;
  window._heroPauseAuto  = () => { clearInterval(interval); interval = null; };
  window._heroResumeAuto = () => resetInterval();
})();

// ─── Hero Strip interactive cards ────────────────────────────────────────────
(function initHeroStrip() {
  const cards = document.querySelectorAll('.strip-card[data-gallery]');
  if (!cards.length) return;

  // Apply heroStrip photos/labels from settings
  const stripConfig = Settings.get().heroStrip;
  if (stripConfig && stripConfig.length) {
    stripConfig.forEach(item => {
      const card = document.querySelector(`.strip-card[data-gallery="${item.gallery}"]`);
      if (!card) return;
      const img = card.querySelector('img');
      const label = card.querySelector('.strip-label');
      if (img && item.url) img.src = item.url;
      if (label && item.label) label.textContent = item.label;
    });
  }

  // Category covers applied after Supabase fetch resolves (see applyCategoryCover below)

  function getMode() {
    return (Settings.get().heroStripMode) || 'gallery';
  }

  function setActive(card) {
    cards.forEach(c => c.classList.remove('strip-active'));
    if (card) card.classList.add('strip-active');
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const gallery = card.dataset.gallery;
      const mode = getMode();

      if (mode === 'slideshow') {
        // ── Slideshow mode: swap hero to matching slide ──────────────────
        const allSlides = window._heroGetSlides ? window._heroGetSlides() : [];
        const idx = allSlides.findIndex(s => s.link && s.link.replace('#', '') === gallery);
        if (idx !== -1 && window._heroGoToSlide) {
          window._heroPauseAuto && window._heroPauseAuto();
          window._heroGoToSlide(idx);
          // Resume auto after 6s of inactivity
          clearTimeout(window._heroStripResumeTimer);
          window._heroStripResumeTimer = setTimeout(() => {
            window._heroResumeAuto && window._heroResumeAuto();
          }, 6000);
        } else {
          // No matching slide — fall back to gallery mode
          triggerGallery(gallery);
        }
        setActive(card);
      } else {
        // ── Gallery mode: scroll to category card + open gallery ─────────
        triggerGallery(gallery);
      }
    });
  });

  function triggerGallery(gallery) {
    const catCard = document.querySelector(`.cat-card[data-gallery="${gallery}"]`);
    if (catCard) {
      catCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => catCard.click(), 400);
    }
  }
})();

// ─── Apply Category Covers ────────────────────────────────────────────────
// Runs after Supabase/settings fetch so covers set in admin appear on the site.
// Updates both the portfolio cat-cards AND the hero strip thumbnails.
window.__settingsReady.then(() => {
  const covers = (Settings.get().categoryCover) || {};
  Object.entries(covers).forEach(([cat, url]) => {
    if (!url) return;
    // Portfolio grid thumbnail
    const catImg = document.querySelector(`.cat-card[data-gallery="${CSS.escape(cat)}"] img`);
    if (catImg) catImg.src = url;
    // Hero strip thumbnail
    const stripImg = document.querySelector(`.strip-card[data-gallery="${CSS.escape(cat)}"] img`);
    if (stripImg) stripImg.src = url;
  });
});

// ─── Extracted from index.html on 2026-04-25 ─────────────────────────────

// Block #9 — Google Maps now embedded directly as an iframe in HTML
// (no JS needed; this block intentionally left empty for diff parity).
function loadMap() { /* no-op: map now embedded directly in markup */ }


// Block #10 (was inline) — Apply saved settings to DOM

// Apply saved settings — load from settings.json (server/static) first, fallback to localStorage
(function() {
  function applySettings(s) {
    function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
    function set(id, val) { const el = document.getElementById(id); if (el && val) el.textContent = val; }
    // Allow only safe inline tags (<em>, <strong>, <br>) — strip everything else
    function setHTML(id, val) {
      const el = document.getElementById(id);
      if (!el || !val) return;
      el.innerHTML = val.replace(/<(?!\/?(?:em|strong|br)\s*\/?>)[^>]+>/gi, '');
    }

    // Hero — only apply pill text if it looks like a real message (guard against "All" corruption)
    if (s.heroPill && s.heroPill.trim().length > 8) set('heroPillText', s.heroPill);
    setHTML('heroHeadline', s.heroHeadline);
    set('heroSub', s.heroSub);
    if (s.heroBg && /^https?:\/\//.test(s.heroBg)) document.documentElement.style.setProperty('--hero-bg', `url('${s.heroBg.replace(/['"()]/g, '')}')`);
    // Hero slideshow (multiple slides) is loaded by script.js

    // About
    if (s.aboutPhoto) {
      const ap = document.getElementById('aboutPhoto');
      if (ap) {
        // Inject size transforms if missing to prevent grid expansion from large intrinsic image size
        let src = s.aboutPhoto;
        if (src.includes('res.cloudinary.com') && !src.match(/\/w_\d+/)) {
          src = src.replace(/\/upload\/.*?\/(portfolio\/)/, '/upload/w_600,h_800,c_fill,q_auto,f_auto/$1');
        }
        ap.src = src;
      }
    }
    set('aboutText1', s.aboutText1);
    set('aboutText2', s.aboutText2);
    set('aboutText3', s.aboutText3);
    const okStat = v => v && v.length <= 12 && !v.includes('/') && !v.includes('http');
    if (okStat(s.stat1Val)) set('stat1Val', s.stat1Val); if (okStat(s.stat1Lbl)) set('stat1Lbl', s.stat1Lbl);
    if (okStat(s.stat2Val)) set('stat2Val', s.stat2Val); if (okStat(s.stat2Lbl)) set('stat2Lbl', s.stat2Lbl);
    if (okStat(s.stat3Val)) set('stat3Val', s.stat3Val); if (okStat(s.stat3Lbl)) set('stat3Lbl', s.stat3Lbl);
    if (okStat(s.stat4Val)) set('stat4Val', s.stat4Val); if (okStat(s.stat4Lbl)) set('stat4Lbl', s.stat4Lbl);

    // Quote & contact
    set('quoteText', s.quote);
    set('contactLocation', s.contactLocation);
    set('contactPhone', s.contactPhone);
    set('contactEmail', s.contactEmail);

    // Gallery order
    if (s.galleryOrder && Array.isArray(s.galleryOrder)) {
      const grid = document.querySelector('.cat-grid');
      if (grid) {
        const cards = {};
        grid.querySelectorAll('.cat-card[data-gallery]').forEach(c => { cards[c.dataset.gallery] = c; });
        s.galleryOrder.forEach(id => { if (cards[id]) grid.appendChild(cards[id]); });
      }
    }

    // Accent color
    if (s.accentColor) document.documentElement.style.setProperty('--blue', s.accentColor);

    // ── Reviews from admin ──
    if (s.reviews && s.reviews.length) {
      const scroll = document.getElementById('reviewsScroll');
      if (scroll) {
        const starSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-star"/></svg>';
        const fbSvg = '<svg viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><use href="#ico-facebook"/></svg>';
        scroll.innerHTML = s.reviews.map(r => `
          <article class="review-card">
            <div class="review-top">
              <div class="review-avatar">${esc(r.name).charAt(0)}</div>
              <div><div class="review-name">${esc(r.name)}</div><div class="review-date">${esc(r.category)} · ${esc(r.date)}</div></div>
            </div>
            <div class="review-stars">${starSvg.repeat(Math.min(r.stars || 5, 5))}</div>
            <p class="review-text">${esc(r.text)}</p>
            <div class="review-source">${fbSvg}<span>Facebook Review</span></div>
          </article>`).join('');
      }
    }

    // ── Social & Integrations ──
    // WhatsApp float button
    const waFloat = document.getElementById('waFloat');
    if (waFloat && s.whatsappNumber) {
      const num = s.whatsappNumber.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(s.whatsappMessage || "Hi Vinicius, I'd like to know more about your services");
      waFloat.href = `https://wa.me/${num}?text=${msg}`;
    }
    // WhatsApp link in contact
    const waContact = document.getElementById('waContactLink');
    if (waContact && s.whatsappNumber) {
      const num = s.whatsappNumber.replace(/[^0-9]/g, '');
      waContact.href = `https://wa.me/${num}`;
    }

    // Social links
    function setLink(id, url) { const el = document.getElementById(id); if (el && url) el.href = url; }
    setLink('igLink', s.instagramUrl);
    setLink('igContactLink', s.instagramUrl);
    setLink('fbContactLink', s.facebookUrl);
    setLink('fbReviewsLink', s.facebookReviewsUrl);

    // Map
    if (s.mapEmbedUrl) {
      const mapFrame = document.getElementById('mapFrame');
      if (mapFrame) mapFrame.src = s.mapEmbedUrl;
    }

    // Showreel
    const showreelBtn = document.getElementById('showreelBtn');
    if (showreelBtn) {
      if (s.showreelUrl) {
        showreelBtn.style.display = '';
        window._showreelUrl = s.showreelUrl;
      } else if (!window._showreelUrl) {
        showreelBtn.style.display = 'none';
      }
    }

    // SEO
    if (s.seoTitle) document.title = s.seoTitle;
    if (s.seoDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = s.seoDescription;
    }
    if (s.seoOgImage) {
      let og = document.querySelector('meta[property="og:image"]');
      if (og) og.content = s.seoOgImage;
    }
  }

  // Try settings.json first (works on both local server and Netlify static),
  // then fall back to localStorage
  try {
    const local = JSON.parse(localStorage.getItem('vmSettings') || '{}');
    applySettings(local); // Apply localStorage immediately (no flash)
  } catch(e) {}

  // Load from Supabase — instant, works everywhere (Cloudflare, any device)
  const _SB_URL = 'https://buhuwnkljilyysyrdkxr.supabase.co';
  const _SB_KEY = 'sb_publishable_dc31AWiwdbDVgMGXEY4fTg_t2rPBi1G';
  var _settingsJsonP = fetch('settings.json').then(r => r.ok ? r.json() : null).catch(() => null);

  fetch(_SB_URL + '/rest/v1/site_settings?id=eq.1&select=data', {
    headers: { 'apikey': _SB_KEY, 'Authorization': 'Bearer ' + _SB_KEY }
  }).then(r => r.ok ? r.json() : [])
    .then(rows => {
      const server = rows?.[0]?.data;
      if (server && Object.keys(server).length > 0) {
        // Merge settings.json defaults for any keys missing in Supabase
        _settingsJsonP.then(file => {
          if (file) Object.keys(file).forEach(k => { if (!server[k] && file[k]) server[k] = file[k]; });
          localStorage.setItem('vmSettings', JSON.stringify(server));
          applySettings(server);
          if (typeof window.reloadHeroSlides === 'function') window.reloadHeroSlides();
        });
      }
    }).catch(() => {
      // Fallback to settings.json if Supabase unreachable
      _settingsJsonP.then(s => {
        if (s && Object.keys(s).length > 0) {
          localStorage.setItem('vmSettings', JSON.stringify(s));
          applySettings(s);
          if (typeof window.reloadHeroSlides === 'function') window.reloadHeroSlides();
        }
      });
    });
})();


// Block #11 (was inline) — Footer year + showreel player + misc

// Dynamic copyright year
(function(){ const el = document.getElementById('footerYear'); if(el) el.textContent = new Date().getFullYear(); })();

// Showreel cinema player
(function() {
  const btn = document.getElementById('showreelBtn');
  const cinema = document.getElementById('showreelCinema');
  if (!btn || !cinema) return;

  function closeShowreel() {
    cinema.classList.remove('open');
    setTimeout(function() { document.getElementById('showreelPlayer').innerHTML = ''; }, 400);
  }

  btn.addEventListener('click', function(e) {
    e.preventDefault();
    var url = window._showreelUrl;
    if (!url) return;
    var player = document.getElementById('showreelPlayer');
    var ytM = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/\s]+)/);
    var vmM = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (ytM) {
      player.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytM[1] + '?autoplay=1&rel=0" allow="autoplay;fullscreen" allowfullscreen></iframe>';
    } else if (vmM) {
      player.innerHTML = '<iframe src="https://player.vimeo.com/video/' + vmM[1] + '?autoplay=1" allow="autoplay;fullscreen" allowfullscreen></iframe>';
    } else {
      player.innerHTML = '<video src="' + url + '" autoplay controls playsinline style="width:100%;height:100%;object-fit:contain"></video>';
    }
    cinema.classList.add('open');
  });

  document.getElementById('showreelClose').addEventListener('click', closeShowreel);
  cinema.addEventListener('click', function(e) { if (e.target === cinema) closeShowreel(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && cinema.classList.contains('open')) closeShowreel(); });
})();

// ─── CSP-friendly event delegation (replaces removed inline onclick=...) ─────
(function() {
  document.querySelectorAll('[data-close-nav]').forEach(a => {
    a.addEventListener('click', () => { if (typeof closeNav === 'function') closeNav(); });
  });
  document.querySelectorAll('[data-toggle-nav]').forEach(b => {
    b.addEventListener('click', () => { if (typeof toggleNav === 'function') toggleNav(); });
  });
  document.querySelectorAll('[data-open-gallery]').forEach(b => {
    b.addEventListener('click', () => { if (typeof openGallery === 'function') openGallery(b.dataset.openGallery); });
  });
  document.querySelectorAll('[data-load-map]').forEach(el => {
    el.addEventListener('click', () => { if (typeof loadMap === 'function') loadMap(); });
    el.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && typeof loadMap === 'function') { e.preventDefault(); loadMap(); }
    });
  });
  document.querySelectorAll('img[data-fallback="map"]').forEach(img => {
    img.addEventListener('error', function() {
      this.style.background = '#e8e8e8';
      this.alt = '';
    });
  });
  document.querySelectorAll('[data-close-gallery]').forEach(b => {
    b.addEventListener('click', () => { if (typeof closeGallery === 'function') closeGallery(); });
  });
})();

// ─── Google Analytics 4 + RGPD cookie consent ────────────────────────────────
// GA only loads AFTER the visitor accepts (or has previously accepted).
// Measurement ID is read from settings.gaMeasurementId — paste it in the admin
// panel (Social & SEO tab → "Google Analytics ID"). Without an ID, the banner
// never shows and no tracking happens.
(function gaConsent() {
  function getStoredConsent() {
    try { return localStorage.getItem('vm_consent_analytics'); } catch(e) { return null; }
  }
  function setStoredConsent(v) {
    try { localStorage.setItem('vm_consent_analytics', v); } catch(e) {}
  }

  function loadGA(gaId) {
    if (!gaId || window._gaLoaded) return;
    window._gaLoaded = true;
    // gtag stub
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', gaId, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    // Inject script
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(s);
  }

  function showBanner(gaId) {
    if (document.getElementById('vmConsentBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'vmConsentBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;max-width:520px;margin-left:auto;margin-right:16px;background:#0e0e0e;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:18px 20px;font-family:Inter,system-ui,sans-serif;font-size:0.85rem;line-height:1.5;z-index:10000;box-shadow:0 18px 40px rgba(0,0,0,0.35)';
    banner.innerHTML =
      '<div style="margin-bottom:14px">This site uses Google Analytics (cookies) so I can see what people read most. Pure stats — never sold or shared. <a href="/privacy" style="color:#c8a96e;text-decoration:underline">Privacy policy</a>.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="vmConsentAccept" style="background:#fff;color:#0e0e0e;border:0;padding:9px 18px;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer">Accept</button>' +
      '<button id="vmConsentReject" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.25);padding:9px 18px;border-radius:8px;font-size:0.8rem;font-weight:500;cursor:pointer">Reject</button>' +
      '</div>';
    document.body.appendChild(banner);
    document.getElementById('vmConsentAccept').addEventListener('click', function() {
      setStoredConsent('granted');
      banner.remove();
      loadGA(gaId);
    });
    document.getElementById('vmConsentReject').addEventListener('click', function() {
      setStoredConsent('denied');
      banner.remove();
    });
  }

  // Wait for settings to load before deciding
  if (!window.__settingsReady) return;
  window.__settingsReady.then(function() {
    var s = (typeof Settings !== 'undefined') ? Settings.get() : {};
    var gaId = s.gaMeasurementId || '';
    if (!gaId) return; // No GA configured → nothing happens, no banner
    var stored = getStoredConsent();
    if (stored === 'granted') { loadGA(gaId); return; }
    if (stored === 'denied') return;
    // First visit + GA configured → show banner
    showBanner(gaId);
  });
})();
