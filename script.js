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

// ─── Settings Manager (single source of truth) ───────────────────────────
const Settings = {
  get() {
    try { return JSON.parse(localStorage.getItem('vmSettings') || '{}'); }
    catch(e) { return {}; }
  },
  set(data) { localStorage.setItem('vmSettings', JSON.stringify(data)); },
  update(patch) { const s = this.get(); Object.assign(s, patch); this.set(s); }
};

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
  const names = { wedding:'Wedding photography', portrait:'Portrait photography', food:'Food photography', family:'Family portrait', events:'Event photography', product:'Product photography', hotels:'Hospitality photography', corporate:'Corporate photography', architecture:'Architecture photography' };
  return (names[category] || 'Photography') + ' by Vinicius Murari in Dublin';
}

// ─── Video Helpers ────────────────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return m ? m[1] : null;
}
function optimizeCloudinaryVideo(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return url;
  // Extract public_id after 'portfolio/' to avoid duplicating existing transformations
  const pidMatch = url.match(/(portfolio\/.+)$/);
  if (!pidMatch) return url;
  let publicId = pidMatch[1];
  if (!/\.(mp4|webm|mov)(\?.*)?$/.test(publicId)) publicId += '.mp4'; // ensure extension
  return `https://res.cloudinary.com/dnocmwoub/video/upload/vc_h264,ac_none,q_auto,w_1080,c_limit/${publicId}`;
}
function getVideoPoster(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return '';
  const pidMatch = url.match(/(portfolio\/.+)$/);
  if (!pidMatch) return '';
  const publicId = pidMatch[1].replace(/\.(mp4|webm|mov)(\?.*)?$/, ''); // strip extension
  return `https://res.cloudinary.com/dnocmwoub/video/upload/so_0,f_jpg,q_auto,w_800/${publicId}.jpg`;
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
const sections = ['portfolio', 'drone', 'services', 'about', 'contact'];
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

  currentGalleryImages = [];
  allGalleryItems = [];
  galGrid.innerHTML = '';

  const photoSubMap = savedSettings.photoSubs || {};

  if (photos.length > 0) {
    photos.forEach((photo, i) => {
      const sub = photoSubMap[`${id}/${photo.filename}`] || photo.sub || 'all';
      const alt = photo.alt_text || generateAlt(photo.filename, id);
      currentGalleryImages.push({ src: photo.url, alt, sub });
      addGalItem(photo.url, alt, i, sub);
    });
  } else {
    section.querySelectorAll('figure').forEach((fig, i) => {
      const img = fig.querySelector('img');
      const sub = (fig.dataset.sub || 'all').toLowerCase();
      currentGalleryImages.push({ src: img.src, alt: img.alt, sub });
      addGalItem(img.src, img.alt, i, sub);
    });
  }

  if (currentGalleryImages.length === 0) {
    galGrid.innerHTML = '<div style="padding:60px 40px;text-align:center;color:#6e6e73;font-size:0.85rem">No photos yet — add some in the <a href="/admin.html" style="color:#0071e3">admin panel</a>.</div>';
  } else {
    galPhotoCount.textContent = `${currentGalleryImages.length} photo${currentGalleryImages.length !== 1 ? 's' : ''}`;
  }
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
      currentGalleryImages.push({ src: item.src, alt: item.alt, sub: item.sub });
      item.el.onclick = () => openLightbox(idx);
    }
  });

  galPhotoCount.textContent = `${currentGalleryImages.length} photo${currentGalleryImages.length !== 1 ? 's' : ''}`;
}

function addGalItem(src, alt, index, sub) {
  const item = document.createElement('div');
  item.className = 'gal-item';

  const pid = isClUrl(src) ? extractPid(src) : null;

  // LQIP blur-up background
  if (pid) {
    item.style.backgroundImage = "url('" + clUrl(pid, 'e_blur:800,q_10,w_50,c_limit') + "')";
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

  if (pid) {
    img.src = clUrl(pid, 'w_800,c_limit');
    img.srcset = [400,600,800,1200].map(w => clUrl(pid, 'w_' + w + ',c_limit') + ' ' + w + 'w').join(', ');
    img.sizes = '(max-width:600px) 50vw, (max-width:1024px) 33vw, 25vw';
  } else {
    img.src = src;
  }

  const overlay = document.createElement('div');
  overlay.className = 'gal-item-overlay';
  overlay.innerHTML = '<div class="gal-zoom-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>';

  item.appendChild(img);
  item.appendChild(overlay);
  item.onclick = () => openLightbox(index); // onclick so filterGallery can reassign without doubling
  galGrid.appendChild(item);

  allGalleryItems.push({ el: item, src, alt, sub: (sub || 'all').toLowerCase(), index, lightboxIndex: index });
}

function closeGallery() {
  galModal.classList.remove('open');
  document.body.style.overflow = '';
  allGalleryItems = [];
  currentGalleryImages = [];
}

galClose.addEventListener('click', closeGallery);
galModal.addEventListener('click', e => { if (e.target === galModal) closeGallery(); });

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
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

function buildThumbs() {
  lbThumbs.innerHTML = '';
  currentGalleryImages.forEach((photo, i) => {
    const t = document.createElement('div');
    t.className = 'lb-thumb' + (i === lbIndex ? ' active' : '');
    const pid = isClUrl(photo.src) ? extractPid(photo.src) : null;
    const thumbSrc = pid ? clUrl(pid, 'w_150,h_100,c_fill') : photo.src;
    t.innerHTML = `<img src="${thumbSrc}" alt="${photo.alt}" loading="lazy">`;
    t.addEventListener('click', () => { lbIndex = i; showLbPhoto(true); });
    lbThumbs.appendChild(t);
  });
}

function showLbPhoto(animate = true) {
  const photo = currentGalleryImages[lbIndex];

  if (animate) {
    lbImg.classList.add('lb-fade');
    setTimeout(() => {
      lbImg.src = photo.src;
      lbImg.alt = photo.alt;
      lbImg.classList.remove('lb-fade');
    }, 140);
  } else {
    lbImg.src = photo.src;
    lbImg.alt = photo.alt;
  }

  lbCounter.textContent = `${lbIndex + 1} / ${currentGalleryImages.length}`;
  lbPrev.style.visibility = lbIndex === 0 ? 'hidden' : 'visible';
  lbNext.style.visibility = lbIndex === currentGalleryImages.length - 1 ? 'hidden' : 'visible';

  // Update active thumb + scroll into view
  lbThumbs.querySelectorAll('.lb-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === lbIndex);
  });
  const activeThumb = lbThumbs.children[lbIndex];
  if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
}

lbClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lbPrev.addEventListener('click', () => { if (lbIndex > 0) { lbIndex--; showLbPhoto(true); } });
lbNext.addEventListener('click', () => { if (lbIndex < currentGalleryImages.length - 1) { lbIndex++; showLbPhoto(true); } });

document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  { if (lbIndex > 0) { lbIndex--; showLbPhoto(true); } }
    if (e.key === 'ArrowRight') { if (lbIndex < currentGalleryImages.length - 1) { lbIndex++; showLbPhoto(true); } }
    if (e.key === 'Escape')     closeLightbox();
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
        el.style.backgroundImage = `url('${slide.url}')`;
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
})();
