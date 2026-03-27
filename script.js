// ─── Page Loader ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('pageLoader').classList.add('done');
  }, 900);
});

// ─── Nav scroll effect ────────────────────────────────────────────────────
const nav = document.getElementById('nav');
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
  scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
  updateActiveNav();
});

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
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
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

    const ok = document.getElementById('fok');
    ok.style.display = 'block';
    form.reset();
    setTimeout(() => ok.style.display = 'none', 5000);
  });
}

// ─── Mobile nav ───────────────────────────────────────────────────────────
function toggleNav() { document.getElementById('navLinks').classList.toggle('open'); }
function closeNav()  { document.getElementById('navLinks').classList.remove('open'); }

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

  galTitle.innerHTML     = section.dataset.title;
  galEyebrow.textContent = section.dataset.eyebrow || 'Photography';
  galDesc.textContent    = section.dataset.description || '';
  galPhotoCount.textContent = '';
  activeSubFilter = 'all';

  // Build sub-category pills — check localStorage first, then HTML fallback
  galSubs.innerHTML = '';
  const savedSettings = JSON.parse(localStorage.getItem('vmSettings') || '{}');
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

  galGrid.innerHTML = '<div style="padding:60px;text-align:center;color:#6e6e73;font-size:0.85rem">Loading…</div>';
  galModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load photos from Cloudinary (stored in localStorage by admin)
  let photos = [];
  try {
    const stored = localStorage.getItem('cloudPhotos_' + id);
    if (stored) photos = JSON.parse(stored);
  } catch(e) { photos = []; }

  // Fallback: try server API
  if (!photos.length) {
    try {
      const res = await fetch(`/api/photos?category=${id}`);
      if (res.ok) photos = await res.json();
    } catch(e) { /* server not running */ }
  }

  currentGalleryImages = [];
  allGalleryItems = [];
  galGrid.innerHTML = '';

  const photoSubMap = savedSettings.photoSubs || {};

  if (photos.length > 0) {
    photos.forEach((photo, i) => {
      const sub = photoSubMap[`${id}/${photo.filename}`] || photo.sub || 'all';
      currentGalleryImages.push({ src: photo.url, alt: photo.filename, sub });
      addGalItem(photo.url, photo.filename, i, sub);
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

  // Filter items
  let visibleCount = 0;
  allGalleryItems.forEach(({ el, sub: itemSub, index }) => {
    const show = sub === 'all' || itemSub === sub;
    el.classList.toggle('hidden', !show);
    if (show) visibleCount++;
  });

  // Update photo count
  galPhotoCount.textContent = `${visibleCount} photo${visibleCount !== 1 ? 's' : ''}`;

  // Rebuild currentGalleryImages for lightbox (only visible)
  currentGalleryImages = allGalleryItems
    .filter(({ sub: s }) => sub === 'all' || s === sub)
    .map(({ src, alt, sub: s }) => ({ src, alt, sub: s }));

  // Re-bind lightbox indices
  let lightboxIdx = 0;
  allGalleryItems.forEach(item => {
    const show = sub === 'all' || item.sub === sub;
    if (show) {
      item.lightboxIndex = lightboxIdx++;
      item.el.onclick = () => openLightbox(item.lightboxIndex);
    }
  });
}

function addGalItem(src, alt, index, sub) {
  const item = document.createElement('div');
  item.className = 'gal-item';
  item.innerHTML = `
    <img src="${src}" alt="${alt}" loading="lazy">
    <div class="gal-item-overlay">
      <div class="gal-zoom-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
    </div>`;
  item.addEventListener('click', () => openLightbox(index));
  galGrid.appendChild(item);

  allGalleryItems.push({ el: item, src, alt, sub: (sub || 'all').toLowerCase(), index, lightboxIndex: index });
}

function closeGallery() {
  galModal.classList.remove('open');
  document.body.style.overflow = '';
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
    t.innerHTML = `<img src="${photo.src}" alt="${photo.alt}" loading="lazy">`;
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
  const S = JSON.parse(localStorage.getItem('vmSettings') || '{}');

  document.querySelectorAll('[data-edit]').forEach(el => {
    const key = el.dataset.edit;
    S[key] = el.innerHTML;
  });

  localStorage.setItem('vmSettings', JSON.stringify(S));
  ebSave.textContent = '✓ Saved!';
  ebSave.classList.add('saved');
  setTimeout(() => { ebSave.textContent = 'Save Changes'; ebSave.classList.remove('saved'); }, 2500);
}

// Hero background image upload in edit mode
document.getElementById('heroBgInput').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/upload?category=hero', { method: 'POST', body: form });
    const data = await res.json();
    const url = data.uploaded?.[0]?.url;
    if (url) {
      document.documentElement.style.setProperty('--hero-bg', `url('${url}')`);
      const S = JSON.parse(localStorage.getItem('vmSettings') || '{}');
      S.heroBg = url;
      localStorage.setItem('vmSettings', JSON.stringify(S));
      ebSave.textContent = '✓ Background updated — Save Changes';
    }
  } catch(e) {
    alert('Could not upload — make sure server.py is running.');
  }
});
