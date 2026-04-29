// admin.js — extracted from admin.html on 2026-04-25
// Block A (was inline <script> #2)
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = 'dnocmwoub';
const CLOUDINARY_PRESET = 'portfolio_upload';

// Admin token — stored in sessionStorage after login, sent with delete requests.
// Set ADMIN_TOKEN env var in Cloudflare Pages dashboard to activate server-side check.
function getAdminToken() {
  return sessionStorage.getItem('adminToken') || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://buhuwnkljilyysyrdkxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dc31AWiwdbDVgMGXEY4fTg_t2rPBi1G';

async function sbFetch(path, options = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT FIELDS — declared here so initApp() can use them on auto-login
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_FIELDS = [
  'heroPill','heroHeadline','heroSub',
  'aboutPhoto','aboutText1','aboutText2','aboutText3',
  'stat1Val','stat1Lbl','stat2Val','stat2Lbl',
  'stat3Val','stat3Lbl','stat4Val','stat4Lbl',
  'quote','contactLocation','contactPhone','contactEmail',
  'showreelUrl'
];
const SOCIAL_FIELDS = [
  'instagramUrl','facebookUrl','facebookReviewsUrl',
  'whatsappNumber','whatsappMessage',
  'mapEmbedUrl','mapLat','mapLng',
  'seoTitle','seoDescription','seoOgImage',
  'web3formsKey','gaMeasurementId'
];
const DEFAULT_REVIEWS = [
  { name: 'Junior Joly',          category: 'Photography', date: 'December 2020', stars: 5, text: 'Vinicius is a photographer who cares about the smallest details. He has the sensitivity to focus on the best aspects of every scene, bringing out the best in each one. A subtle and romantic photographer.' },
  { name: 'Isabela Castilho',     category: 'Photography', date: 'November 2020', stars: 5, text: 'He deserves far more than 5 stars — a dedicated, qualified, experienced and talented professional! Congratulations on your work, I would do 10 more projects with you!' },
  { name: 'Sabrina Almeida',      category: 'Photography', date: 'September 2019', stars: 5, text: 'Vinicius has an incredible talent!! We loved his professionalism — he treats every image with total dedication and love!! We absolutely recommend him!!!' },
  { name: 'Miyashiro Alexandre',  category: 'Photography', date: 'November 2020', stars: 5, text: 'A professional with excellent skills, great equipment and punctuality.' },
  { name: 'Maza Maza',            category: 'Photography', date: 'May 2019',      stars: 5, text: 'The Best! An attentive professional who plays beautifully with colours!!' },
  { name: 'Débora Arantes',       category: 'Photography', date: 'September 2019', stars: 5, text: 'A great professional, always doing incredible work! I highly recommend him.' },
];
const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
var LAUNCH_STEPS = []; // populated after counts is defined

// ─────────────────────────────────────────────────────────────────────────────
// DATA & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'wedding',      label: 'Wedding',              sub: 'Photography' },
  { id: 'portrait',     label: 'Portrait & Studio',    sub: 'Photography' },
  { id: 'food',         label: 'Food & Beverage',      sub: 'Photography' },
  { id: 'family',       label: 'Family',               sub: 'Photography' },
  { id: 'events',       label: 'Events',               sub: 'Photography' },
  { id: 'product',      label: 'Product & Still Life', sub: 'Photography' },
  { id: 'hotels',       label: 'Hotels & Hospitality', sub: 'Photography' },
  { id: 'corporate',    label: 'Corporate Events',     sub: 'Photography' },
  { id: 'architecture', label: 'Architecture',         sub: 'Photography' },
];

const COLOR_PRESETS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#0f1117','#06b6d4'];

const DEFAULT_SUBS = {
  wedding:      ['All','Pre-Wedding','Ceremony','Reception','Getting Ready','Details'],
  portrait:     ['All','Fashion','Professional','DJ','Studio','Essay'],
  food:         ['All','Restaurant','Products','Lifestyle'],
  family:       ['All','Studio','Outdoor','Newborn'],
  events:       ['All','Birthday','Gala','Launch'],
  product:      ['All','Cosmetics','Fashion','Tech'],
  hotels:       ['All','Interior','Exterior','Details'],
  corporate:    ['All','Conference','Team Day','Launch','Press'],
  architecture: ['All','Exterior','Interior','Details'],
};

// Load settings from localStorage
let S = JSON.parse(localStorage.getItem('vmSettings') || '{}');
if (!S.gallerySubs) S.gallerySubs = {};
if (!S.photoSubs)   S.photoSubs = {};

let catOrder = S.galleryOrder ? [...S.galleryOrder] : CATEGORIES.map(c => c.id);
const counts = {};
let current = catOrder[0] || CATEGORIES[0].id;
let dragSrc = null;
let sidebarDragSrc = null;
let photoDragData = null;   // { publicId, filename, category, url, thumb, card }
let activeSubFilter = null; // sub-category filter (lowercased); null = show all
let currentPhotosList = []; // last-loaded photos for current category (for re-filtering)

function saveSettings() {
  localStorage.setItem('vmSettings', JSON.stringify(S));
  // Save to settings.json (local dev) so git push picks it up for production
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(S)
  }).catch(() => {}); // silent fail on Cloudflare (no writable FS)
  sbSaveSettings(); // Save to Supabase — instant, visible everywhere
}

async function sbSaveSettings() {
  try {
    await sbFetch('/rest/v1/site_settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 1, data: S })
    });
  } catch(e) { /* silent fail */ }
}

// ─── Auto-save draft ───
let autoSaveTimer = null;
let hasUnsavedChanges = false;
function markUnsaved() {
  hasUnsavedChanges = true;
  const indicator = document.getElementById('unsavedIndicator');
  if (indicator) indicator.style.display = 'inline';
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    // Auto-save content fields to settings
    if (typeof CONTENT_FIELDS !== 'undefined') {
      CONTENT_FIELDS.forEach(key => {
        const el = document.getElementById('c-' + key);
        if (el) S[key] = el.value;
      });
    }
    saveSettings();
    hasUnsavedChanges = false;
    if (indicator) indicator.style.display = 'none';
  }, 5000);
}

// Listen for changes on content/social fields after init
setTimeout(() => {
  document.querySelectorAll('[id^="c-"]').forEach(el => {
    el.addEventListener('input', markUnsaved);
  });
}, 1000);

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', e => {
  if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — PBKDF2 (SHA-256, 200 000 iterations, 16-byte salt)
// Legacy SHA-256 hash kept as fallback so existing logins still work; on the
// next successful login the password is automatically rehashed with PBKDF2 and
// the legacy hash is replaced.
// ─────────────────────────────────────────────────────────────────────────────
const PASSWORD_HASH_LEGACY = 'fd45b6bf13a9617363cfc3bb5bbfcb2554fa0c7a42d41f59393ea51ee0c57afc';
const PBKDF2_ITERATIONS    = 200000;
const PBKDF2_SALT_BYTES    = 16;

const _bufToHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
const _hexToBuf = hex => new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16))).buffer;

async function hashPasswordLegacy(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return _bufToHex(buf);
}

async function hashPasswordPbkdf2(pwd, saltHex) {
  const salt = saltHex ? _hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)).buffer;
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key, 256
  );
  return { salt: _bufToHex(salt), hash: _bufToHex(bits) };
}

// Stored format: "pbkdf2$<iterations>$<saltHex>$<hashHex>"
function encodePbkdf2(iter, saltHex, hashHex) { return `pbkdf2$${iter}$${saltHex}$${hashHex}`; }
function isPbkdf2(stored) { return typeof stored === 'string' && stored.startsWith('pbkdf2$'); }

async function verifyPassword(pwd, stored) {
  if (isPbkdf2(stored)) {
    const [, , saltHex, expected] = stored.split('$');
    const { hash } = await hashPasswordPbkdf2(pwd, saltHex);
    return hash === expected;
  }
  // Legacy SHA-256 fallback
  return (await hashPasswordLegacy(pwd)) === stored;
}

async function upgradeToPbkdf2(pwd) {
  const { salt, hash } = await hashPasswordPbkdf2(pwd);
  const encoded = encodePbkdf2(PBKDF2_ITERATIONS, salt, hash);
  localStorage.setItem('adminPasswordHash', encoded);
  return encoded;
}

// hashPassword kept as a stable export for the admin token (used only as
// a session-binding identifier sent to /api/delete-photo, never as a password).
async function hashPassword(pwd) { return hashPasswordLegacy(pwd); }

function isLoggedIn() {
  return sessionStorage.getItem('adminAuth') === '1';
}

async function doLogin(pwd) {
  const stored = localStorage.getItem('adminPasswordHash') || PASSWORD_HASH_LEGACY;
  const ok = await verifyPassword(pwd, stored);
  if (!ok) return false;
  // Auto-upgrade legacy SHA-256 storage to PBKDF2 on first successful login
  if (!isPbkdf2(stored)) {
    try { await upgradeToPbkdf2(pwd); } catch(e) { /* keep legacy if crypto fails */ }
  }
  sessionStorage.setItem('adminAuth', '1');
  // Session token (random) — not derived from the password
  sessionStorage.setItem('adminToken', _bufToHex(crypto.getRandomValues(new Uint8Array(32))));
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
  return true;
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pwd = document.getElementById('loginInput').value;
  if (!(await doLogin(pwd))) {
    document.getElementById('loginError').textContent = 'Incorrect password. Try again.';
    document.getElementById('loginInput').value = '';
    document.getElementById('loginInput').focus();
  }
});

document.getElementById('loginInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
  document.getElementById('loginError').textContent = '';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminAuth');
  sessionStorage.removeItem('adminToken');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginInput').value = '';
});

// Change password — always stores PBKDF2 (never plain SHA-256)
document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
  const np = document.getElementById('newPassword').value;
  const cp = document.getElementById('confirmPassword').value;
  if (!np) return toast('Enter a new password', 'error');
  if (np !== cp) return toast('Passwords do not match', 'error');
  if (np.length < 12) return toast('Password must be at least 12 characters', 'error');
  await upgradeToPbkdf2(np);
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  toast('Password updated (PBKDF2). Use new password next login.', 'success');
});

// Boot
if (isLoggedIn()) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function setTab(tabId) {
  // Remove active from nav
  document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
  // Set panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');

  const navBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Topbar title
  const labels = {
    dashboard: 'Dashboard', galleries: 'Galleries',
    content: 'Content', appearance: 'Appearance',
    social: 'Social & Integrations', preview: 'Site Preview',
    launch: 'Launch Checklist', landingpages: 'Landing Pages', blog: 'Blog / Journal'
  };
  const titleEl = document.getElementById('topbar-title');
  if (tabId === 'galleries') {
    const cat = CATEGORIES.find(c => c.id === current);
    titleEl.innerHTML = `Galleries <small>${cat ? cat.label : ''}</small>`;
  } else {
    titleEl.textContent = labels[tabId] || tabId;
  }

  // Preview iframe
  if (tabId === 'preview') {
    const iframe = document.getElementById('sitePreviewFrame');
    if (!iframe.src || iframe.src === 'about:blank') iframe.src = '/';
  }
}

document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

// Quick actions on dashboard
document.querySelectorAll('.quick-action[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.goto;
    if (target === 'galleries') {
      setTab('galleries');
    } else if (target === 'content-reviews') {
      setTab('content');
      setTimeout(() => {
        document.getElementById('reviews-section').scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setTab(target);
    }
  });
});

document.getElementById('reloadPreviewBtn').addEventListener('click', () => {
  document.getElementById('sitePreviewFrame').src = '/';
});

// Sync to server button
document.getElementById('syncServerBtn').addEventListener('click', async () => {
  await syncAllToServer();
});

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB PUBLISH
// ─────────────────────────────────────────────────────────────────────────────
const GITHUB_OWNER = 'viniciusmurari-design';
const GITHUB_REPO  = 'portfolio-site';
const GITHUB_FILE  = 'settings.json';

// Save/load token from localStorage (never goes to server)
document.getElementById('saveGithubTokenBtn').addEventListener('click', () => {
  const token = document.getElementById('githubToken').value.trim();
  if (!token) { toast('Coloca o token primeiro', 'error'); return; }
  localStorage.setItem('ghToken', token);
  document.getElementById('githubToken').value = '';
  document.getElementById('githubToken').placeholder = '✓ Token guardado';
  toast('Token guardado com segurança no browser', 'success');
});

// Load token indicator on init
(function() {
  if (localStorage.getItem('ghToken')) {
    const el = document.getElementById('githubToken');
    if (el) el.placeholder = '✓ Token guardado — cola novo para substituir';
  }
})();

document.getElementById('publishBtn').addEventListener('click', async () => {
  const btn = document.getElementById('publishBtn');
  btn.textContent = '⏳ Publishing…';
  btn.disabled = true;

  // Collect all content fields before saving
  if (typeof CONTENT_FIELDS !== 'undefined') {
    CONTENT_FIELDS.forEach(key => {
      const el = document.getElementById('c-' + key);
      if (el) S[key] = el.value;
    });
  }

  try {
    const res = await sbFetch('/rest/v1/site_settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 1, data: S })
    });
    if (!res.ok) throw new Error('Supabase error ' + res.status);
    localStorage.setItem('vmSettings', JSON.stringify(S));
    toast('✓ Publicado! Visível em todo o lado em segundos', 'success');
    btn.textContent = '✓ Published!';
    hasUnsavedChanges = false;
    const indicator = document.getElementById('unsavedIndicator');
    if (indicator) indicator.style.display = 'none';
    setTimeout(() => { btn.textContent = '🚀 Publish'; btn.disabled = false; }, 3000);
  } catch(e) {
    toast('Erro ao publicar: ' + e.message, 'error');
    btn.textContent = '🚀 Publish';
    btn.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVER SYNC
// ─────────────────────────────────────────────────────────────────────────────
async function syncAllToServer() {
  const btn = document.getElementById('syncServerBtn');
  btn.textContent = '↑ Syncing…';
  btn.classList.add('loading');
  try {
    const [r1, r2] = await Promise.all([
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(S)
      }),
      fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getContentData())
      })
    ]);
    if (r1.ok && r2.ok) {
      toast('All data synced to server', 'success');
    } else {
      toast('Sync failed — check server is running', 'error');
    }
  } catch(e) {
    toast('Cannot reach server — is it running?', 'error');
  }
  btn.textContent = '↑ Sync to Server';
  btn.classList.remove('loading');
}

async function loadFromServer() {
  let serverSettings = null;
  try {
    const [r1, r2] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/content')
    ]);
    if (r1.ok) {
      serverSettings = await r1.json();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        S = { ...S, ...serverSettings };
        if (!S.gallerySubs) S.gallerySubs = {};
        if (!S.photoSubs)   S.photoSubs = {};
        saveSettings();
      }
    }
    if (r2.ok) {
      const serverContent = await r2.json();
      if (serverContent && Object.keys(serverContent).length > 0) {
        // Merge into S for content fields
        Object.assign(S, serverContent);
        saveSettings();
      }
    }
  } catch(e) {
    // Server not responding — use localStorage only
  }
  // Fallback: if /api/settings is unavailable (e.g. Cloudflare Pages),
  // load the static settings.json so the admin picks up new landing pages
  // that were pushed via git.
  if (!serverSettings) {
    try {
      const rStatic = await fetch('/settings.json?t=' + Date.now());
      if (rStatic.ok) {
        const staticSettings = await rStatic.json();
        if (staticSettings && Object.keys(staticSettings).length > 0) {
          // Merge landingPages by slug — preserve any local-only edits while
          // adding pages that exist on the server but not locally
          const localPages = S.landingPages || [];
          const staticPages = staticSettings.landingPages || [];
          const merged = [...localPages];
          staticPages.forEach(sp => {
            const localIdx = merged.findIndex(lp => lp.slug === sp.slug);
            if (localIdx === -1) merged.push(sp);
          });
          S = { ...staticSettings, ...S, landingPages: merged };
          if (!S.gallerySubs) S.gallerySubs = {};
          if (!S.photoSubs)   S.photoSubs = {};
          saveSettings();
        }
      }
    } catch(eStatic) { /* silent */ }
  }
  // Sync landingPages from Supabase — ensures admin always sees pages
  // added outside this session (e.g. via settings.json + push).
  // Merge by slug so new pages from any source appear.
  try {
    const sbRes = await sbFetch('/rest/v1/site_settings?id=eq.1&select=data');
    if (sbRes.ok) {
      const rows = await sbRes.json();
      const sbData = rows?.[0]?.data;
      if (sbData?.landingPages?.length) {
        const localPages = S.landingPages || [];
        const merged = [...localPages];
        sbData.landingPages.forEach(sp => {
          const localIdx = merged.findIndex(lp => lp.slug === sp.slug);
          if (localIdx === -1) merged.push(sp);
        });
        if (merged.length !== localPages.length) {
          S.landingPages = merged;
          localStorage.setItem('vmSettings', JSON.stringify(S));
        }
      }
    }
  } catch(e2) { /* silent — Supabase unavailable */ }
}

// ─────────────────────────────────────────────────────────────────────────────
var batchMode = false;

// SIDEBAR — CATEGORY LIST
// ─────────────────────────────────────────────────────────────────────────────
function buildSidebar() {
  const catList = document.getElementById('catList');
  catList.innerHTML = '';
  catOrder.forEach(id => {
    const cat = CATEGORIES.find(c => c.id === id);
    if (!cat) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn' + (id === current ? ' active' : '');
    btn.dataset.id = id;
    btn.draggable = true;
    btn.innerHTML = `
      <span class="nav-drag" title="Drag to reorder">⠿</span>
      <span class="nav-label">${cat.label}</span>
      <span class="nav-badge" id="cnt-${id}">${counts[id] ?? '…'}</span>`;
    btn.addEventListener('click', () => {
      setTab('galleries');
      switchCategory(id);
    });
    btn.addEventListener('dragstart', e => {
      sidebarDragSrc = id;
      e.dataTransfer.effectAllowed = 'move';
    });
    btn.addEventListener('dragover', e => {
      e.preventDefault();
      if (photoDragData && id !== current) {
        btn.classList.add('cat-drop-hover');
      } else if (!photoDragData) {
        btn.classList.add('drag-over');
      }
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drag-over');
      btn.classList.remove('cat-drop-hover');
    });
    btn.addEventListener('dragend', () => { sidebarDragSrc = null; });
    btn.addEventListener('drop', async e => {
      e.preventDefault();
      btn.classList.remove('drag-over');
      btn.classList.remove('cat-drop-hover');

      if (photoDragData && id !== current) {
        // Photo-to-category drop
        const data = photoDragData;
        photoDragData = null;
        document.getElementById('catList').classList.remove('gallery-drag-active');
        document.getElementById('subsList').classList.remove('gallery-drag-active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('cat-drop-hover'));
        document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('sub-drop-hover'));

        const targetCat = CATEGORIES.find(c => c.id === id);
        const targetLabel = targetCat ? targetCat.label : id;
        const action = await openMoveCopyModal(targetLabel);

        if (action === 'move') {
          await movePhoto(data, id, targetLabel);
        } else if (action === 'copy') {
          await copyPhoto(data, id, targetLabel);
        }
        // action === null means Cancel — do nothing

      } else if (!photoDragData && sidebarDragSrc && sidebarDragSrc !== id) {
        // Existing sidebar reorder logic
        const from = catOrder.indexOf(sidebarDragSrc);
        const to   = catOrder.indexOf(id);
        catOrder.splice(from, 1);
        catOrder.splice(to, 0, sidebarDragSrc);
        S.galleryOrder = [...catOrder];
        saveSettings();
        buildSidebar();
        toast('Gallery order saved', 'success');
      }
    });
    catList.appendChild(btn);
  });
}

function switchCategory(id) {
  current = id;
  activeSubFilter = null;
  buildSidebar();
  buildSubsEditor();
  const cat = CATEGORIES.find(c => c.id === id);
  document.getElementById('panelTitle').textContent = cat ? cat.label : id;
  document.getElementById('panelSubtitle').textContent = cat ? cat.sub : '';
  const titleEl = document.getElementById('topbar-title');
  titleEl.innerHTML = `Galleries <small>${cat ? cat.label : ''}</small>`;
  window.location.hash = id;
  loadPhotos(id);
  if (typeof updateUploadSubSelect === 'function') updateUploadSubSelect();
  // Exit batch mode when switching categories
  if (batchMode) document.getElementById('batchSelectBtn')?.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTOS
// ─────────────────────────────────────────────────────────────────────────────
async function loadPhotos(id) {
  const grid = document.getElementById('photoGrid');
  const cnt  = document.getElementById('photosCount');
  const hint = document.getElementById('photosHint');
  grid.innerHTML = '';
  cnt.textContent = 'Loading…';
  hint.textContent = '';

  // Fetch from Supabase — visible to ALL visitors on ALL devices
  let photos = [];
  try {
    const res = await sbFetch(`/rest/v1/photos?category=eq.${id}&order=created_at.asc`);
    if (res.ok) photos = await res.json();
  } catch(e) {
    photos = getCloudPhotos(id); // localStorage fallback (local dev only)
  }

  // Apply custom order saved by admin on this device
  const savedOrder = JSON.parse(localStorage.getItem('photoOrder_' + id) || '[]');
  if (savedOrder.length) {
    const orderMap = {};
    savedOrder.forEach((fname, i) => orderMap[fname] = i);
    photos.sort((a, b) => (orderMap[a.filename] ?? 9999) - (orderMap[b.filename] ?? 9999));
  }

  // Keep localStorage cache in sync for local dev
  setCloudPhotos(id, photos);

  counts[id] = photos.length;
  const el = document.getElementById(`cnt-${id}`);
  if (el) el.textContent = photos.length;
  currentPhotosList = photos;
  renderFilteredGrid();
  updateDashboard();
}

function renderFilteredGrid() {
  const id = current;
  let photos = currentPhotosList;
  if (activeSubFilter) {
    photos = photos.filter(p => getPhotoSub(id, p.filename) === activeSubFilter);
  }
  renderGrid(photos, id);
  const hint = document.getElementById('photosHint');
  if (activeSubFilter && hint) {
    hint.textContent = `Filtered by "${activeSubFilter}" — click the tag again or "All" to clear`;
  }
}

function renderGrid(photos, id) {
  const grid = document.getElementById('photoGrid');
  const cnt  = document.getElementById('photosCount');
  const hint = document.getElementById('photosHint');
  grid.innerHTML = '';

  if (!photos.length) {
    cnt.textContent = 'No photos yet';
    grid.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <p>Upload your first photos above</p>
    </div>`;
    return;
  }

  cnt.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  hint.textContent = photos.length > 1 ? 'Drag photos to reorder' : '';

  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.draggable = true;
    card.dataset.filename = photo.filename;
    card.dataset.publicId  = photo.public_id || '';
    card.dataset.url       = photo.url || '';
    const photoSub = getPhotoSub(id, photo.filename);
    const subLabel = photoSub || 'Tag';
    const altText = photo.alt_text || '';
    const isVid = /video\/upload|\.mp4|\.webm|\.mov/i.test(photo.url);
    const thumbSrc = isVid
      ? photo.thumb || photo.url.replace(/video\/upload\/[^/]*\//, 'video/upload/so_0,f_jpg,q_auto,w_400,h_300,c_fill/').replace(/\.(mp4|webm|mov)$/, '.jpg')
      : photo.url;
    card.innerHTML = `
      <img src="${thumbSrc}" alt="${altText || photo.filename}" loading="lazy">
      ${isVid ? '<div class="photo-video-badge">▶ video</div>' : ''}
      <div class="photo-name">${photo.filename}</div>
      <button class="photo-delete" title="Delete photo">×</button>
      <button class="photo-alt-btn" title="Edit alt text">ALT</button>
      <div class="photo-sub-badge" data-file="${photo.filename}">${subLabel}</div>
      <div class="photo-sub-select" data-file="${photo.filename}"></div>`;

    // Sub-category dropdown
    const badge    = card.querySelector('.photo-sub-badge');
    const dropdown = card.querySelector('.photo-sub-select');
    const subs     = getSubsFor(id).filter(s => s.toLowerCase() !== 'all');

    subs.forEach(sub => {
      const opt = document.createElement('button');
      opt.className = 'photo-sub-opt' + (photoSub === sub.toLowerCase() ? ' active' : '');
      opt.textContent = sub;
      opt.addEventListener('click', e => {
        e.stopPropagation();
        setPhotoSub(id, photo.filename, sub.toLowerCase());
        badge.textContent = sub;
        dropdown.classList.remove('open');
        dropdown.querySelectorAll('.photo-sub-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        toast(`Tagged as "${sub}"`);
      });
      dropdown.appendChild(opt);
    });

    badge.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.photo-sub-select.open').forEach(d => d.classList.remove('open'));
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    card.querySelector('.photo-delete').addEventListener('click', e => {
      e.stopPropagation();
      deletePhoto(id, photo.filename, card);
    });

    // Open lightbox on card click (skip interactive child elements)
    card.addEventListener('click', e => {
      if (e.target.closest('.photo-delete,.photo-alt-btn,.photo-sub-badge,.photo-sub-select,.photo-check,label')) return;
      const allCards = [...document.querySelectorAll('#photoGrid .photo-card')];
      const idx      = allCards.indexOf(card);
      const lbPhotos = allCards.map(c => ({ filename: c.dataset.filename, url: c.dataset.url, publicId: c.dataset.publicId }));
      openLightbox(lbPhotos, idx >= 0 ? idx : 0);
    });

    card.querySelector('.photo-alt-btn').addEventListener('click', e => {
      e.stopPropagation();
      const current = photo.alt_text || '';
      const newAlt = prompt('Alt text for this photo (SEO):', current);
      if (newAlt === null) return;
      photo.alt_text = newAlt;
      card.querySelector('img').alt = newAlt || photo.filename;
      // Save to Supabase
      if (photo.public_id) {
        sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(photo.public_id)}`, {
          method: 'PATCH', body: JSON.stringify({ alt_text: newAlt })
        }).catch(() => {});
      }
      // Update localStorage cache
      const cached = getCloudPhotos(id);
      const idx = cached.findIndex(p => p.filename === photo.filename);
      if (idx >= 0) { cached[idx].alt_text = newAlt; setCloudPhotos(id, cached); }
      toast(newAlt ? 'Alt text saved' : 'Alt text cleared', 'success');
    });

    // Drag-to-reorder + drag-to-category
    card.addEventListener('dragstart', e => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Store photo data for potential category drop
      photoDragData = {
        publicId: card.dataset.publicId,
        filename: card.dataset.filename,
        category: id,
        url:      photo.url,
        thumb:    photo.thumb,
        card
      };
      // Activate sidebar + sub-category drop zones
      document.getElementById('catList').classList.add('gallery-drag-active');
      document.getElementById('subsList').classList.add('gallery-drag-active');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.photo-card').forEach(c => c.classList.remove('drop-target'));
      dragSrc = null;
      // Clear sidebar + sub-category drop zones
      photoDragData = null;
      document.getElementById('catList').classList.remove('gallery-drag-active');
      document.getElementById('subsList').classList.remove('gallery-drag-active');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('cat-drop-hover'));
      document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('sub-drop-hover'));
    });
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drop-target'); });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drop-target');
      if (dragSrc && dragSrc !== card) {
        const cards   = [...document.querySelectorAll('.photo-card')];
        const fromIdx = cards.indexOf(dragSrc);
        const toIdx   = cards.indexOf(card);
        if (fromIdx < toIdx) grid.insertBefore(dragSrc, card.nextSibling);
        else grid.insertBefore(dragSrc, card);
        savePhotoOrder(id);
      }
    });

    grid.appendChild(card);
  });
}

function savePhotoOrder(id) {
  const order = [...document.querySelectorAll('.photo-card')].map(c => c.dataset.filename);
  localStorage.setItem('photoOrder_' + id, JSON.stringify(order));
  // Update cache to match new order
  const photoMap = {};
  getCloudPhotos(id).forEach(p => photoMap[p.filename] = p);
  setCloudPhotos(id, order.map(n => photoMap[n]).filter(Boolean));
  toast('Photo order saved', 'success');
}

async function deletePhoto(cat, filename, card) {
  if (!confirm(`Delete "${filename}"?`)) return;

  const publicId = card.dataset.publicId;

  // Reference-counted delete: only remove from Cloudinary if this is the last reference
  if (publicId) {
    try {
      // Count how many categories use this asset
      const countRes = await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&select=id`);
      if (!countRes.ok) {
        toast('Erro ao verificar referências, tente novamente', 'error');
        return;
      }
      const refs = await countRes.json();
      // refs.length <= 1: handles 0 (orphan/already removed) and 1 (this is the last row)
      const isLastRef = refs.length <= 1;

      if (isLastRef) {
        // Delete the Supabase row (last one)
        await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}`, { method: 'DELETE' });
        // Delete the actual Cloudinary file
        await fetch('/api/delete-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': getAdminToken() },
          body: JSON.stringify({ public_id: publicId })
        });
      } else {
        // Only delete THIS category's Supabase row — keep Cloudinary file intact
        await sbFetch(
          `/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&category=eq.${encodeURIComponent(cat)}`,
          { method: 'DELETE' }
        );
      }
    } catch(e) { console.error('Delete failed', e); }
  }

  // Remove from localStorage cache and order
  setCloudPhotos(cat, getCloudPhotos(cat).filter(p => p.filename !== filename));
  const order = JSON.parse(localStorage.getItem('photoOrder_' + cat) || '[]').filter(f => f !== filename);
  localStorage.setItem('photoOrder_' + cat, JSON.stringify(order));

  card.style.transition = 'opacity .2s, transform .2s';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.9)';
  setTimeout(() => { card.remove(); loadPhotos(cat); }, 230);
  toast('Photo deleted', 'success');
}

async function movePhoto(data, newCatId, newCatLabel) {
  if (!data.publicId) { toast('Erro ao mover foto: sem ID', 'error'); return; }
  try {
    const res = await sbFetch(
      `/rest/v1/photos?public_id=eq.${encodeURIComponent(data.publicId)}&category=eq.${encodeURIComponent(data.category)}`,
      { method: 'PATCH', body: JSON.stringify({ category: newCatId }) }
    );
    if (!res.ok) throw new Error(await res.text());

    // Remove from source category localStorage cache & order
    setCloudPhotos(data.category, getCloudPhotos(data.category).filter(p => p.filename !== data.filename));
    const order = JSON.parse(localStorage.getItem('photoOrder_' + data.category) || '[]').filter(f => f !== data.filename);
    localStorage.setItem('photoOrder_' + data.category, JSON.stringify(order));

    // Animate and remove card from grid
    data.card.style.transition = 'opacity .2s, transform .2s';
    data.card.style.opacity = '0';
    data.card.style.transform = 'scale(0.9)';
    setTimeout(() => { data.card.remove(); if (current === data.category) loadPhotos(data.category); }, 230);

    toast(`Movido para ${newCatLabel} ✓`, 'success');
  } catch(err) {
    console.error('movePhoto error', err);
    toast('Erro ao mover foto', 'error');
  }
}

async function copyPhoto(data, newCatId, newCatLabel) {
  if (!data.publicId) { toast('Erro ao copiar foto: sem ID', 'error'); return; }
  try {
    // Source category cache stays intact — photo remains in original category
    const res = await sbFetch('/rest/v1/photos', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        category:  newCatId,
        filename:  data.filename,
        url:       data.url,
        thumb:     data.thumb,
        public_id: data.publicId
      })
    });
    if (!res.ok) throw new Error(await res.text());
    toast(`Copiado para ${newCatLabel} ✓`, 'success');
  } catch(err) {
    console.error('copyPhoto error', err);
    toast('Erro ao copiar foto', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const uploadBtn    = document.getElementById('uploadBtn');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const uploadStatus = document.getElementById('uploadStatus');

// uploadBtn is now a label — no JS needed to open file dialog
fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  uploadFiles(e.dataTransfer.files);
});

function getCloudPhotos(category) {
  try { return JSON.parse(localStorage.getItem('cloudPhotos_' + category) || '[]'); } catch { return []; }
}
function setCloudPhotos(category, photos) {
  localStorage.setItem('cloudPhotos_' + category, JSON.stringify(photos));
}

async function uploadToCloudinary(file, category) {
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  // Strip extension — Cloudinary treats .ext in public_id as format, breaking URLs
  // NOTE: upload preset automatically prepends 'portfolio/' folder, so don't add it here
  const nameNoExt = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  form.append('public_id', category + '/' + Date.now() + '_' + nameNoExt);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, {
    method: 'POST', body: form
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();

  let url, thumb;
  if (isVideo) {
    url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/q_auto/${data.public_id}.mp4`;
    // Poster frame as thumbnail
    thumb = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/so_0,f_jpg,q_auto,w_400,h_300,c_fill/${data.public_id}.jpg`;
  } else {
    url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/q_auto,f_auto/${data.public_id}`;
    thumb = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/w_400,h_300,c_fill,q_auto/${data.public_id}`;
  }

  const photo = { filename: file.name, url, public_id: data.public_id, thumb };

  // Save to Supabase so ALL visitors can see this photo/video
  await sbFetch('/rest/v1/photos', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ category, filename: photo.filename, url: photo.url, thumb: photo.thumb, public_id: photo.public_id })
  });

  return photo;
}

async function uploadFiles(files) {
  if (!files?.length) return;
  if (!current) { toast('Select a gallery category first', 'error'); return; }
  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';
  const total = files.length;
  uploadStatus.textContent = `Uploading ${total} file${total > 1 ? 's' : ''}…`;

  const uploaded = [];
  let failed = 0;
  for (let i = 0; i < total; i++) {
    try {
      progressBar.style.width = Math.round(((i + 0.5) / total) * 100) + '%';
      uploadStatus.textContent = `Uploading ${i + 1} of ${total}…`;
      const photo = await uploadToCloudinary(files[i], current);
      uploaded.push(photo);
      const existing = getCloudPhotos(current);
      existing.push(photo);
      setCloudPhotos(current, existing);
    } catch(e) {
      console.error('Upload failed for', files[i].name, e);
      failed++;
    }
  }

  progressBar.style.width = '100%';
  const n = uploaded.length;
  if (n === 0) {
    uploadStatus.textContent = '✗ Upload failed';
    toast('Upload failed — check your internet connection', 'error');
  } else {
    uploadStatus.textContent = `✓ ${n} photo${n !== 1 ? 's' : ''} uploaded${failed ? ` (${failed} failed)` : ''}`;
    const uploadSub = document.getElementById('uploadSubSelect').value;
    if (uploadSub && uploaded.length) {
      uploaded.forEach(p => setPhotoSub(current, p.filename, uploadSub));
      toast(`${n} photo${n !== 1 ? 's' : ''} added to "${uploadSub}"`, 'success');
    } else {
      toast(`${n} photo${n !== 1 ? 's' : ''} added to ${CATEGORIES.find(c=>c.id===current)?.label || current}`, 'success');
    }
  }
  fileInput.value = '';
  await loadPhotos(current);
  setTimeout(() => { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; }, 2500);
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH SELECTION
// ─────────────────────────────────────────────────────────────────────────────
const batchBar = document.getElementById('batchBar');
const batchCount = document.getElementById('batchCount');

document.getElementById('batchSelectBtn').addEventListener('click', () => {
  batchMode = !batchMode;
  document.getElementById('batchSelectBtn').textContent = batchMode ? '✗ Cancel' : '☑ Select';
  batchBar.style.display = batchMode ? 'flex' : 'none';
  // Populate batch sub-category dropdown
  if (batchMode) {
    const sel = document.getElementById('batchSubSelect');
    sel.innerHTML = '<option value="">— Assign sub-category —</option>';
    getSubsFor(current).filter(s => s.toLowerCase() !== 'all').forEach(s => {
      sel.innerHTML += `<option value="${s.toLowerCase()}">${s}</option>`;
    });
  }
  // Toggle select mode on cards
  document.querySelectorAll('.photo-card').forEach(c => {
    c.classList.toggle('select-mode', batchMode);
    c.classList.remove('selected');
    if (batchMode) {
      // Add checkbox overlay
      if (!c.querySelector('.photo-check')) {
        const chk = document.createElement('div');
        chk.className = 'photo-check';
        chk.textContent = '✓';
        c.appendChild(chk);
      }
      c.draggable = false;
    } else {
      const chk = c.querySelector('.photo-check');
      if (chk) chk.remove();
      c.draggable = true;
    }
  });
  updateBatchCount();
});

document.getElementById('batchCancelBtn').addEventListener('click', () => {
  document.getElementById('batchSelectBtn').click(); // toggle off
});

document.getElementById('batchSelectAll').addEventListener('click', () => {
  const cards = document.querySelectorAll('.photo-card.select-mode');
  const allSelected = [...cards].every(c => c.classList.contains('selected'));
  cards.forEach(c => c.classList.toggle('selected', !allSelected));
  document.getElementById('batchSelectAll').textContent = allSelected ? 'Select All' : 'Deselect All';
  updateBatchCount();
});

document.getElementById('batchAssignBtn').addEventListener('click', () => {
  const sub = document.getElementById('batchSubSelect').value;
  if (!sub) { toast('Select a sub-category first', 'error'); return; }
  const selected = document.querySelectorAll('.photo-card.selected');
  if (!selected.length) { toast('No photos selected', 'error'); return; }
  selected.forEach(card => {
    const filename = card.dataset.filename;
    setPhotoSub(current, filename, sub);
    const badge = card.querySelector('.photo-sub-badge');
    if (badge) badge.textContent = sub.charAt(0).toUpperCase() + sub.slice(1);
  });
  toast(`${selected.length} photo${selected.length > 1 ? 's' : ''} assigned to "${sub}"`, 'success');
  document.getElementById('batchSelectBtn').click(); // exit batch mode
});

// Batch delete
document.getElementById('batchDeleteBtn').addEventListener('click', async () => {
  const selected = document.querySelectorAll('.photo-card.selected');
  if (!selected.length) { toast('No photos selected', 'error'); return; }
  if (!confirm(`Delete ${selected.length} photo${selected.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
  let deleted = 0;
  for (const card of selected) {
    const publicId = card.dataset.publicId;
    const filename = card.dataset.filename;
    if (publicId) {
      try {
        // Count how many categories use this asset
        const countRes = await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&select=id`);
        if (!countRes.ok) {
          toast('Erro ao verificar referências, tente novamente', 'error');
          continue; // skip this photo, move to next in batch
        }
        const refs = await countRes.json();
        // refs.length <= 1: handles 0 (orphan) and 1 (last reference)
        const isLastRef = refs.length <= 1;

        if (isLastRef) {
          // Delete the Supabase row (last one)
          await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}`, { method: 'DELETE' });
          // Delete the actual Cloudinary file
          await fetch('/api/delete-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': getAdminToken() },
            body: JSON.stringify({ public_id: publicId })
          });
        } else {
          // Only delete THIS category's Supabase row — keep Cloudinary file intact
          await sbFetch(
            `/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&category=eq.${encodeURIComponent(current)}`,
            { method: 'DELETE' }
          );
        }
      } catch(e) { console.error('Delete failed', e); }
    }
    setCloudPhotos(current, getCloudPhotos(current).filter(p => p.filename !== filename));
    const order = JSON.parse(localStorage.getItem('photoOrder_' + current) || '[]').filter(f => f !== filename);
    localStorage.setItem('photoOrder_' + current, JSON.stringify(order));
    card.remove();
    deleted++;
  }
  toast(`${deleted} photo${deleted > 1 ? 's' : ''} deleted`, 'success');
  document.getElementById('batchSelectBtn').click();
  loadPhotos(current);
});

// Delegate click for selecting cards in batch mode
document.getElementById('photoGrid').addEventListener('click', e => {
  if (!batchMode) return;
  const card = e.target.closest('.photo-card');
  if (!card) return;
  e.preventDefault();
  e.stopPropagation();
  card.classList.toggle('selected');
  updateBatchCount();
});

function updateBatchCount() {
  const n = document.querySelectorAll('.photo-card.selected').length;
  batchCount.textContent = `${n} selected`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POPULATE UPLOAD SUB-CATEGORY DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function updateUploadSubSelect() {
  const sel = document.getElementById('uploadSubSelect');
  sel.innerHTML = '<option value="">None (All)</option>';
  getSubsFor(current).filter(s => s.toLowerCase() !== 'all').forEach(s => {
    sel.innerHTML += `<option value="${s.toLowerCase()}">${s}</option>`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
function getSubsFor(catId) {
  return S.gallerySubs[catId] || DEFAULT_SUBS[catId] || ['All'];
}

function saveSubsFor(catId, subs) {
  S.gallerySubs[catId] = subs;
  saveSettings();
}

function buildSubsEditor() {
  const list = document.getElementById('subsList');
  list.innerHTML = '';
  const subs = getSubsFor(current);

  subs.forEach((sub, i) => {
    const tag = document.createElement('div');
    const subLower = sub.toLowerCase();
    const isAll = subLower === 'all';
    tag.className = 'sub-tag' + (isAll ? ' all-tag' : '');
    tag.draggable = !isAll;
    tag.dataset.index = i;
    // Highlight if currently filtering by this sub (or "All" when no filter)
    if ((isAll && !activeSubFilter) || (!isAll && activeSubFilter === subLower)) {
      tag.classList.add('filter-active');
    }
    // Click to filter photo grid by this sub-category
    tag.addEventListener('click', e => {
      // Ignore clicks on the editable name input or the delete button
      if (e.target.closest('.sub-tag-name') || e.target.closest('.sub-del')) return;
      if (isAll) {
        activeSubFilter = null;
      } else {
        activeSubFilter = (activeSubFilter === subLower) ? null : subLower;
      }
      buildSubsEditor();
      renderFilteredGrid();
    });

    const nameInput = document.createElement('input');
    nameInput.className = 'sub-tag-name';
    nameInput.value = sub;
    nameInput.disabled = sub.toLowerCase() === 'all';
    nameInput.size = Math.max(sub.length, 3);
    nameInput.addEventListener('input', () => {
      nameInput.size = Math.max(nameInput.value.length, 3);
    });
    nameInput.addEventListener('blur', () => {
      const val = nameInput.value.trim();
      if (!val) { nameInput.value = sub; return; }
      const newSubs = [...getSubsFor(current)];
      newSubs[i] = val;
      saveSubsFor(current, newSubs);
      toast('Sub-category renamed');
    });
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
    tag.appendChild(nameInput);

    const del = document.createElement('button');
    del.className = 'sub-del';
    del.textContent = '×';
    del.title = 'Remove sub-category';
    del.addEventListener('click', () => {
      const newSubs = getSubsFor(current).filter((_, idx) => idx !== i);
      saveSubsFor(current, newSubs);
      buildSubsEditor();
      toast('Sub-category removed');
    });
    tag.appendChild(del);

    if (sub.toLowerCase() !== 'all') {
      tag.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', String(i));
        e.dataTransfer.effectAllowed = 'move';
      });
      tag.addEventListener('dragover', e => {
        e.preventDefault();
        if (photoDragData) {
          tag.classList.add('sub-drop-hover');
        } else {
          tag.classList.add('drag-over');
        }
      });
      tag.addEventListener('dragleave', () => {
        tag.classList.remove('drag-over');
        tag.classList.remove('sub-drop-hover');
      });
      tag.addEventListener('drop', e => {
        e.preventDefault();
        tag.classList.remove('drag-over');
        tag.classList.remove('sub-drop-hover');

        if (photoDragData) {
          // Assign sub-category to the dragged photo
          const data = photoDragData;
          photoDragData = null;
          document.getElementById('catList').classList.remove('gallery-drag-active');
          document.getElementById('subsList').classList.remove('gallery-drag-active');
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('cat-drop-hover'));
          document.querySelectorAll('.sub-tag').forEach(t => t.classList.remove('sub-drop-hover'));

          setPhotoSub(data.category, data.filename, sub.toLowerCase());
          const badge = data.card.querySelector('.photo-sub-badge');
          if (badge) badge.textContent = sub;
          toast(`Marcado como "${sub}" ✓`, 'success');
        } else {
          // Existing reorder logic
          const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
          const toIdx = i;
          if (fromIdx !== toIdx && fromIdx > 0) {
            const newSubs = [...getSubsFor(current)];
            const [moved] = newSubs.splice(fromIdx, 1);
            newSubs.splice(toIdx, 0, moved);
            saveSubsFor(current, newSubs);
            buildSubsEditor();
            toast('Sub-category order saved');
          }
        }
      });
    }
    list.appendChild(tag);
  });
  if (typeof updateUploadSubSelect === 'function') updateUploadSubSelect();
}

document.getElementById('addSubBtn').addEventListener('click', () => {
  const subs = [...getSubsFor(current)];
  subs.push('New Category');
  saveSubsFor(current, subs);
  buildSubsEditor();
  const inputs = document.querySelectorAll('.sub-tag-name');
  const last = inputs[inputs.length - 1];
  if (last) { last.disabled = false; last.focus(); last.select(); }
  toast('New sub-category added — click to rename');
});

function getPhotoSub(catId, filename) {
  return (S.photoSubs || {})[`${catId}/${filename}`] || '';
}

function setPhotoSub(catId, filename, sub) {
  if (!S.photoSubs) S.photoSubs = {};
  S.photoSubs[`${catId}/${filename}`] = sub;
  saveSettings();
  // If the admin is currently filtering this category by a sub, re-render
  // so photos that no longer match drop out (or newly-match photos appear).
  if (catId === current && activeSubFilter) renderFilteredGrid();
}


function getContentData() {
  const data = {};
  CONTENT_FIELDS.forEach(k => { data[k] = S[k] || ''; });
  if (S.reviews) data.reviews = S.reviews;
  return data;
}

function loadContentFields() {
  CONTENT_FIELDS.forEach(key => {
    const el = document.getElementById('c-' + key);
    if (el && S[key]) el.value = S[key];
  });
  // About photo preview
  const aboutPreview = document.getElementById('aboutPhotoPreview');
  if (S.aboutPhoto) {
    aboutPreview.src = S.aboutPhoto;
    aboutPreview.style.display = 'block';
  }
  document.getElementById('c-aboutPhoto').addEventListener('input', function() {
    if (this.value) { aboutPreview.src = this.value; aboutPreview.style.display = 'block'; }
    else aboutPreview.style.display = 'none';
  });

  // ─── Category Covers ───────────────────────────────────────────────────────
  // Showreel preview
  updateShowreelPreview();
  document.getElementById('c-showreelUrl').addEventListener('input', updateShowreelPreview);

  // Hero strip mode
  updateStripModeUI(S.heroStripMode || 'gallery');
  buildStripPhotoGrid();

  // Showreel video upload
  document.getElementById('c-showreelUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', CLOUDINARY_PRESET);
      form.append('resource_type', 'video');
      form.append('public_id', 'showreel/' + Date.now() + '_' + file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_'));
      toast('Uploading video…', 'info');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, { method: 'POST', body: form });
      const data = await res.json();
      const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/q_auto/${data.public_id}.${data.format || 'mp4'}`;
      document.getElementById('c-showreelUrl').value = url;
      updateShowreelPreview();
      toast('Video uploaded!', 'success');
    } catch(err) {
      toast('Upload failed: ' + err.message, 'error');
    }
    e.target.value = '';
  });
}

// ─── Photo Lightbox ──────────────────────────────────────────────────────────
let _lbPhotos = [];
let _lbIndex  = 0;
let _lbLastFocused = null;

function openLightbox(photos, index) {
  _lbPhotos = photos;
  _lbIndex  = index;
  _lbLastFocused = document.activeElement;
  _lbRender();
  const lb = document.getElementById('photoLightbox');
  lb.classList.add('open');
  // Move focus into the modal
  const closeBtn = document.getElementById('lbClose');
  if (closeBtn) closeBtn.focus();
}

function closeLightbox() {
  document.getElementById('photoLightbox').classList.remove('open');
  document.getElementById('lbImg').src = '';
  // Return focus to the element that opened the lightbox
  if (_lbLastFocused && typeof _lbLastFocused.focus === 'function') {
    try { _lbLastFocused.focus(); } catch(e) {}
  }
  _lbLastFocused = null;
}

function _lbRender() {
  const photo = _lbPhotos[_lbIndex];
  if (!photo) return;
  document.getElementById('lbImg').src = photo.url;
  document.getElementById('lbImg').alt = photo.filename;
  document.getElementById('lbFilename').textContent = photo.filename;
  const multi = _lbPhotos.length > 1;
  document.getElementById('lbPrev').style.display = multi ? '' : 'none';
  document.getElementById('lbNext').style.display = multi ? '' : 'none';
}

function _lbNavigate(dir) {
  _lbIndex = (_lbIndex + dir + _lbPhotos.length) % _lbPhotos.length;
  _lbRender();
}

function _lbDownload() {
  const photo = _lbPhotos[_lbIndex];
  if (!photo) return;
  // Use Cloudinary fl_attachment to serve with Content-Disposition: attachment
  // This avoids CORS issues with fetch — the browser downloads directly from CDN
  const url = photo.url.replace('/upload/', '/upload/fl_attachment/');
  const a = document.createElement('a');
  a.href = url;
  a.download = photo.filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

(function _initLightbox() {
  const lb = document.getElementById('photoLightbox');
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => _lbNavigate(-1));
  document.getElementById('lbNext').addEventListener('click', () => _lbNavigate(1));
  document.getElementById('lbSetCover').addEventListener('click', () => {
    const photo = _lbPhotos[_lbIndex];
    if (!photo || !current) return;
    if (!S.categoryCover) S.categoryCover = {};
    S.categoryCover[current] = photo.url;
    saveSettings();
    // Visual feedback on button
    const btn = document.getElementById('lbSetCover');
    btn.textContent = '✓ Capa definida!';
    btn.style.background = 'rgba(52,199,89,0.85)';
    setTimeout(() => {
      btn.textContent = '📌 Set as Cover';
      btn.style.background = '';
    }, 2500);
    toast(`Capa da galeria "${current}" guardada ✓`, 'success');
  });
  document.getElementById('lbDownload').addEventListener('click', _lbDownload);
  document.getElementById('lbDelete').addEventListener('click', () => {
    const photo = _lbPhotos[_lbIndex];
    if (!photo) return;
    const card = document.querySelector(`#photoGrid .photo-card[data-filename="${CSS.escape(photo.filename)}"]`);
    deletePhoto(current, photo.filename, card || document.createElement('div'));
    _lbPhotos.splice(_lbIndex, 1);
    if (_lbPhotos.length === 0) { closeLightbox(); return; }
    if (_lbIndex >= _lbPhotos.length) _lbIndex = _lbPhotos.length - 1;
    _lbRender();
  });
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     return closeLightbox();
    if (e.key === 'ArrowLeft')  return _lbNavigate(-1);
    if (e.key === 'ArrowRight') return _lbNavigate(1);
    // Focus trap — keep Tab cycling inside the modal
    if (e.key === 'Tab') {
      const focusables = lb.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
})();

function updateStripModeUI(mode) {
  const hints = {
    gallery:   'Clicking a strip photo scrolls to that gallery and opens it.',
    slideshow: 'Clicking a strip photo changes the hero background to that image.'
  };
  const btnGallery   = document.getElementById('stripModeGallery');
  const btnSlideshow = document.getElementById('stripModeSlideshow');
  const hint         = document.getElementById('stripModeHint');
  if (!btnGallery) return;
  btnGallery.style.background   = mode === 'gallery'   ? 'var(--accent)' : '';
  btnGallery.style.color        = mode === 'gallery'   ? '#fff' : '';
  btnSlideshow.style.background = mode === 'slideshow' ? 'var(--accent)' : '';
  btnSlideshow.style.color      = mode === 'slideshow' ? '#fff' : '';
  if (hint) hint.textContent = hints[mode] || '';
}

function setStripMode(mode) {
  S.heroStripMode = mode;
  updateStripModeUI(mode);
  saveSettings();
  toast(`Strip mode: ${mode === 'gallery' ? 'Gallery Links' : 'Slideshow Selector'}`, 'success');
}

// ─── Hero Strip Photo Editor ──────────────────────────────────────────────
const STRIP_DEFAULTS = [
  { gallery: 'portrait', label: 'Portrait' },
  { gallery: 'food',     label: 'Food'     },
  { gallery: 'wedding',  label: 'Wedding'  },
  { gallery: 'family',   label: 'Family'   },
  { gallery: 'product',  label: 'Product'  }
];

function buildStripPhotoGrid() {
  const grid = document.getElementById('stripPhotoGrid');
  if (!grid) return;
  const stripData = S.heroStrip || STRIP_DEFAULTS.map(d => ({ ...d, url: '' }));
  grid.innerHTML = '';
  stripData.forEach((item, idx) => {
    const slot = document.createElement('div');
    slot.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer';
    slot.title = `Click to change ${item.label} photo`;

    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'width:100%;aspect-ratio:2/3;border-radius:6px;overflow:hidden;border:2px solid var(--border);position:relative;background:var(--surface-2)';

    const img = document.createElement('img');
    img.src = item.url || '';
    img.alt = item.label;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    if (!item.url) img.style.display = 'none';

    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--muted)';
    placeholder.textContent = '+';
    placeholder.style.display = item.url ? 'none' : 'flex';

    const spinner = document.createElement('div');
    spinner.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.5);font-size:0.7rem;color:#fff;border-radius:4px';
    spinner.textContent = 'Uploading…';

    imgWrap.append(img, placeholder, spinner);

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:0.7rem;color:var(--text-3);text-align:center';
    lbl.textContent = item.label;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;
      spinner.style.display = 'flex';
      try {
        const url = await uploadImageOnly(file, 'hero/strip');
        const strip = S.heroStrip || STRIP_DEFAULTS.map(d => ({ ...d, url: '' }));
        strip[idx] = { ...strip[idx], url };
        S.heroStrip = strip;
        saveSettings();
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        toast(`${item.label} photo updated`, 'success');
      } catch(e) {
        toast('Upload failed: ' + e.message, 'error');
      } finally {
        spinner.style.display = 'none';
        this.value = '';
      }
    });

    slot.append(imgWrap, lbl, fileInput);
    slot.addEventListener('click', () => fileInput.click());
    grid.appendChild(slot);
  });
}

function updateShowreelPreview() {
  const url = document.getElementById('c-showreelUrl')?.value || '';
  const preview = document.getElementById('showreelPreview');
  if (!url) { preview.style.display = 'none'; preview.innerHTML = ''; return; }
  preview.style.display = 'block';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  const vmMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (ytMatch) {
    preview.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`;
  } else if (vmMatch) {
    preview.innerHTML = `<iframe src="https://player.vimeo.com/video/${vmMatch[1]}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`;
  } else {
    preview.innerHTML = `<video src="${url}" style="width:100%;height:100%;object-fit:cover" controls muted></video>`;
  }
}

function loadSocialFields() {
  SOCIAL_FIELDS.forEach(key => {
    const el = document.getElementById('c-' + key);
    if (el && S[key]) el.value = S[key];
  });
  // SEO character counters
  setupCharCount('c-seoTitle', 'seoTitleCount', 60);
  setupCharCount('c-seoDescription', 'seoDescCount', 160);
}

function setupCharCount(inputId, countId, max) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(countId);
  if (!input || !counter) return;
  const update = () => {
    const len = input.value.length;
    counter.textContent = `${len}/${max}`;
    counter.className = 'char-count' + (len > max ? ' over' : len > max * 0.9 ? ' warn' : '');
  };
  input.addEventListener('input', update);
  update();
}

// About photo upload
document.getElementById('aboutPhotoUploadBtn').addEventListener('click', () => {
  document.getElementById('aboutPhotoFile').click();
});
document.getElementById('aboutPhotoFile').addEventListener('change', async function() {
  if (!this.files?.length) return;
  try {
    const url = await uploadImageOnly(this.files[0], 'about');
    document.getElementById('c-aboutPhoto').value = url;
    const preview = document.getElementById('aboutPhotoPreview');
    preview.src = url; preview.style.display = 'block';
    toast('Profile photo uploaded — click Save Content to apply', 'success');
  } catch(e) { toast('Upload failed: ' + e.message, 'error'); }
  this.value = '';
});

// Save content
document.getElementById('saveContentBtn').addEventListener('click', async function() {
  CONTENT_FIELDS.forEach(key => {
    const el = document.getElementById('c-' + key);
    if (el) S[key] = el.value;
  });
  saveReviewsFromUI();
  saveSettings();
  // Also push to server
  try {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S)
    });
    await fetch('/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getContentData())
    });
    toast('Content saved to server successfully', 'success');
  } catch(e) {
    toast('Saved to localStorage (server not reachable)', 'info');
  }
  const orig = this.textContent;
  this.textContent = '✓ Saved!';
  this.classList.add('saved');
  setTimeout(() => { this.textContent = orig; this.classList.remove('saved'); }, 2500);
});

// Save social
document.getElementById('saveSocialBtn').addEventListener('click', async function() {
  SOCIAL_FIELDS.forEach(key => {
    const el = document.getElementById('c-' + key);
    if (el) S[key] = el.value;
  });
  saveSettings();
  try {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S)
    });
    toast('Social & SEO settings saved', 'success');
  } catch(e) {
    toast('Saved to localStorage (server not reachable)', 'info');
  }
  const orig = this.textContent;
  this.textContent = '✓ Saved!';
  this.classList.add('saved');
  setTimeout(() => { this.textContent = orig; this.classList.remove('saved'); }, 2500);
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

function getReviews() {
  return S.reviews || DEFAULT_REVIEWS;
}

function buildReviewsList() {
  const list = document.getElementById('reviewsList');
  list.innerHTML = '';
  const reviews = getReviews();

  reviews.forEach((rev, i) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    card.innerHTML = `
      <div class="review-card-header">
        <div class="field" style="margin:0">
          <label>Reviewer Name</label>
          <input class="rev-name" value="${escHtml(rev.name)}" placeholder="Client name">
        </div>
        <div class="field" style="margin:0">
          <label>Category / Service</label>
          <input class="rev-cat" value="${escHtml(rev.category)}" placeholder="e.g. Wedding">
        </div>
        <div class="field" style="margin:0">
          <label>Date</label>
          <input class="rev-date" value="${escHtml(rev.date)}" placeholder="March 2025">
        </div>
        <button class="rev-del-btn" title="Delete review">Delete</button>
      </div>
      <div class="field" style="margin-bottom:10px">
        <label>Review Text</label>
        <textarea class="rev-text" rows="3">${escHtml(rev.text)}</textarea>
      </div>
      <div class="field" style="margin:0">
        <label>Star Rating</label>
        <div class="star-input" data-value="${rev.stars}"></div>
      </div>`;

    // Build star rating
    const starInput = card.querySelector('.star-input');
    for (let s = 1; s <= 5; s++) {
      const sb = document.createElement('button');
      sb.className = 'star-btn' + (s <= rev.stars ? ' active' : '');
      sb.type = 'button';
      sb.textContent = '★';
      sb.dataset.val = s;
      sb.addEventListener('click', () => {
        starInput.dataset.value = s;
        starInput.querySelectorAll('.star-btn').forEach((b, idx) => {
          b.classList.toggle('active', idx < s);
        });
      });
      starInput.appendChild(sb);
    }

    card.querySelector('.rev-del-btn').addEventListener('click', () => {
      const reviews = getReviews();
      reviews.splice(i, 1);
      S.reviews = reviews;
      saveSettings();
      buildReviewsList();
      toast('Review removed');
    });

    list.appendChild(card);
  });

  const cnt = document.getElementById('reviewsCount');
  if (cnt) cnt.textContent = `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;
}

function saveReviewsFromUI() {
  const cards = document.querySelectorAll('#reviewsList .review-card');
  S.reviews = [...cards].map(card => ({
    name:     card.querySelector('.rev-name').value,
    category: card.querySelector('.rev-cat').value,
    date:     card.querySelector('.rev-date').value,
    text:     card.querySelector('.rev-text').value,
    stars:    parseInt(card.querySelector('.star-input').dataset.value) || 5
  }));
}

document.getElementById('addReviewBtn').addEventListener('click', () => {
  const reviews = getReviews();
  reviews.push({ name: 'New Reviewer', category: 'Photography', date: 'March 2026', stars: 5, text: 'Write the review text here…' });
  S.reviews = reviews;
  saveSettings();
  buildReviewsList();
  document.getElementById('reviewsList').lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  toast('New review added — edit the fields and save');
});

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEARANCE — Hero Slideshow Manager
// ─────────────────────────────────────────────────────────────────────────────

// ─── Upload to Cloudinary with progress reporting ───
function uploadImageOnly(file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_PRESET);
    const nameNoExt = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    form.append('public_id', folder + '/' + Date.now() + '_' + nameNoExt);
    const isVideo = file.type.startsWith('video/');
    const endpoint = isVideo
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        if (isVideo) resolve(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/q_auto/${data.public_id}`);
        else resolve(`https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/q_auto,f_auto/${data.public_id}`);
      } else {
        reject(new Error('Upload failed: ' + xhr.status));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

// ─── Show video thumbnail in admin (first frame via Cloudinary) ───
function showVideoPreview(url) {
  const vid = document.getElementById('heroVideoPreviewEl');
  const label = document.getElementById('heroVideoLabel');
  if (!url) { vid.style.display = 'none'; label.textContent = 'No video uploaded'; label.style.display = 'flex'; return; }
  if (url.includes('youtu')) {
    vid.style.display = 'none';
    label.innerHTML = '▶ YouTube video added';
    label.style.display = 'flex'; return;
  }
  // Show thumbnail image instead of trying to play video
  const pidMatch = url.match(/(portfolio\/.+)$/);
  if (pidMatch) {
    const pid = pidMatch[1].replace(/\.(mp4|webm|mov)$/, '');
    const thumb = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/so_0,f_jpg,q_auto,w_640/${pid}.jpg`;
    vid.style.display = 'none';
    // Use an img element for the thumbnail
    let img = document.getElementById('heroVideoThumb');
    if (!img) {
      img = document.createElement('img');
      img.id = 'heroVideoThumb';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';
      document.getElementById('heroVideoPreview').appendChild(img);
    }
    img.src = thumb;
    img.style.display = 'block';
    label.innerHTML = '▶ <span style="background:rgba(0,0,0,.5);padding:2px 8px;border-radius:4px">Video ready</span>';
    label.style.display = 'flex';
    label.style.alignItems = 'flex-end';
    label.style.padding = '8px';
  } else {
    // Fallback: try native video element
    vid.src = url; vid.style.display = 'block'; label.style.display = 'none';
  }
}

// Gallery categories for slide linking
const GALLERY_CATS = CATEGORIES.map(c => ({ id: c.id, label: c.label }));

let heroSlides = []; // Array of { url, link }
let heroMode = 'photos'; // 'photos' or 'video'

function loadHeroSlides() {
  heroMode = 'photos';
  if (S.heroSlides && S.heroSlides.length) {
    heroSlides = S.heroSlides.map(s => ({ url: s.url, link: s.link || '', type: s.type || '' }));
    // If slides contain a video, pre-fill the video URL field
    const vidSlide = heroSlides.find(s => s.type === 'video');
    if (vidSlide) {
      document.getElementById('heroVideoUrl').value = vidSlide.url;
    }
  } else if (S.heroVideo) {
    // Legacy: migrate heroVideo → slide entry
    heroSlides = [{ url: S.heroVideo, type: 'video', link: '' }];
    document.getElementById('heroVideoUrl').value = S.heroVideo;
    const vid = document.getElementById('heroVideoPreviewEl');
    vid.src = S.heroVideo; vid.style.display = 'block';
    document.getElementById('heroVideoLabel').style.display = 'none';
  } else if (S.heroBg) {
    heroSlides = [{ url: S.heroBg, link: '', type: '' }];
  } else {
    heroSlides = [];
  }
  if (S.heroSlideDuration) {
    document.getElementById('heroSlideDuration').value = S.heroSlideDuration;
  }
  // Pre-fill saved video URL if no active video slide
  if (S.heroVideoSaved && !heroSlides.find(s => s.type === 'video')) {
    document.getElementById('heroVideoUrl').value = S.heroVideoSaved;
  }
  // Show video preview for whatever URL is in the field
  const vidUrlEl = document.getElementById('heroVideoUrl');
  if (vidUrlEl && vidUrlEl.value) showVideoPreview(vidUrlEl.value);
  updateModeUI();
  renderHeroSlidesGrid();
}

function updateModeUI() {
  document.getElementById('heroModePhotos').classList.toggle('active', heroMode === 'photos');
  document.getElementById('heroModeVideo').classList.toggle('active', heroMode === 'video');
  document.getElementById('heroPhotosPanel').style.display = heroMode === 'photos' ? 'block' : 'none';
  document.getElementById('heroVideoPanel').style.display = heroMode === 'video' ? 'block' : 'none';
}

function renderHeroSlidesGrid() {
  const grid = document.getElementById('heroSlidesGrid');
  grid.innerHTML = '';
  if (!heroSlides.length) {
    grid.innerHTML = '<div style="font-size:0.78rem;color:var(--text-3);padding:20px;text-align:center">No slides yet — upload photos above</div>';
    return;
  }
  heroSlides.forEach((slide, i) => {
    const card = document.createElement('div');
    card.className = 'hero-slide-card';
    const isVideo = slide.type === 'video';
    const thumb = !isVideo && slide.url.includes('res.cloudinary.com') ? slide.url.replace(/\/upload\/[^/]*\//, '/upload/w_320,h_180,c_fill,q_auto,f_auto/') : '';
    card.innerHTML = isVideo
      ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:1.8rem;flex-direction:column;gap:4px">
           <span>▶</span><span style="font-size:0.6rem;opacity:0.6">VIDEO</span>
         </div>
         <button class="hsc-del" title="Remove video">&times;</button>`
      : `<img src="${thumb}" alt="Slide ${i+1}" loading="lazy">
         <button class="hsc-del" title="Remove slide">&times;</button>
         <div class="hsc-link">
           <select title="Link to gallery">
             <option value="">No link</option>
             ${GALLERY_CATS.map(c => `<option value="#${c.id}" ${slide.link === '#' + c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
           </select>
         </div>`;
    card.querySelector('.hsc-del').addEventListener('click', () => {
      heroSlides.splice(i, 1);
      renderHeroSlidesGrid();
    });
    const sel = card.querySelector('select');
    if (sel) sel.addEventListener('change', function() { heroSlides[i].link = this.value; });

    // Drag-and-drop reordering
    card.draggable = true;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', i);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault(); card.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      if (from !== i) {
        const moved = heroSlides.splice(from, 1)[0];
        heroSlides.splice(i, 0, moved);
        renderHeroSlidesGrid();
      }
    });

    grid.appendChild(card);
  });
}

// Mode toggle
document.getElementById('heroModePhotos').addEventListener('click', () => { heroMode = 'photos'; updateModeUI(); });
document.getElementById('heroModeVideo').addEventListener('click', () => { heroMode = 'video'; updateModeUI(); });

// Upload slide photos
document.getElementById('heroSlideUploadBtn').addEventListener('click', () => document.getElementById('heroSlideFile').click());
document.getElementById('heroSlideFile').addEventListener('change', async function() {
  const files = [...this.files];
  if (!files.length) return;
  if (heroSlides.length + files.length > 8) { toast('Maximum 8 slides allowed', 'error'); return; }
  const status = document.getElementById('heroSlideStatus');
  for (let i = 0; i < files.length; i++) {
    status.textContent = `Uploading ${i+1}/${files.length}…`;
    try {
      const url = await uploadImageOnly(files[i], 'hero');
      heroSlides.push({ url, link: '' });
      renderHeroSlidesGrid();
    } catch(e) { status.textContent = `✗ Failed: ${files[i].name}`; }
  }
  status.textContent = `✓ ${files.length} photo${files.length > 1 ? 's' : ''} uploaded`;
  setTimeout(() => { status.textContent = ''; }, 3000);
  this.value = '';
});

// Add by URL
document.getElementById('heroSlideUrlAddBtn').addEventListener('click', () => {
  const input = document.getElementById('heroSlideUrlInput');
  const url = input.value.trim();
  if (!url) return;
  if (heroSlides.length >= 8) { toast('Maximum 8 slides', 'error'); return; }
  heroSlides.push({ url, link: '' });
  renderHeroSlidesGrid();
  input.value = '';
  toast('Slide added');
});

// Video upload with progress bar
document.getElementById('heroVideoUploadBtn').addEventListener('click', () => document.getElementById('heroVideoFile').click());
document.getElementById('heroVideoFile').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  const status = document.getElementById('heroVideoStatus');
  // Build progress bar
  status.innerHTML = `<div style="background:var(--border);border-radius:99px;height:6px;overflow:hidden;margin-top:8px">
    <div id="videoUploadBar" style="height:100%;background:var(--blue);width:0%;transition:width .2s;border-radius:99px"></div>
  </div><div id="videoUploadPct" style="font-size:0.72rem;color:var(--text-3);margin-top:4px">0%</div>`;
  try {
    const url = await uploadImageOnly(file, 'hero_video', pct => {
      const bar = document.getElementById('videoUploadBar');
      const pctEl = document.getElementById('videoUploadPct');
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    });
    document.getElementById('heroVideoUrl').value = url;
    showVideoPreview(url);
    status.innerHTML = '<span style="color:#10b981">✓ Video uploaded — click <strong>+ Add to Slideshow</strong></span>';
  } catch(e) {
    status.innerHTML = '<span style="color:var(--red)">✗ Upload failed — ' + e.message + '</span>';
  }
  this.value = '';
});

// Video URL manual input — update preview
document.getElementById('heroVideoUrl').addEventListener('input', function() {
  showVideoPreview(this.value.trim());
});

// Add to Slideshow button
document.getElementById('heroVideoAddBtn').addEventListener('click', () => {
  const url = document.getElementById('heroVideoUrl').value.trim();
  if (!url) { toast('Paste a URL first', 'error'); return; }
  // Remove existing video slide and replace
  heroSlides = heroSlides.filter(s => s.type !== 'video');
  heroSlides.push({ url, type: 'video', link: '' });
  S.heroSlides = heroSlides;
  S.heroBg = heroSlides.find(s => s.type !== 'video')?.url || heroSlides[0]?.url || '';
  S.heroSlideDuration = parseInt(document.getElementById('heroSlideDuration').value) || 5;
  delete S.heroVideo;
  saveSettings();
  renderHeroSlidesGrid();
  toast('✓ Video added to slideshow! Click Publish to go live.', 'success');
});

// Save video URL for later (store in settings but don't add to slideshow)
document.getElementById('heroVideoSaveLaterBtn').addEventListener('click', () => {
  const url = document.getElementById('heroVideoUrl').value.trim();
  if (!url) { toast('No video URL to save', 'error'); return; }
  S.heroVideoSaved = url;
  // Remove from slideshow if it's there
  heroSlides = heroSlides.filter(s => s.type !== 'video');
  S.heroSlides = heroSlides;
  delete S.heroVideo;
  saveSettings();
  renderHeroSlidesGrid();
  const hint = document.getElementById('heroVideoSavedHint');
  hint.style.display = 'block';
  setTimeout(() => hint.style.display = 'none', 4000);
  toast('URL saved — not in slideshow', 'success');
});

// Remove video from slideshow entirely
document.getElementById('heroVideoRemoveBtn').addEventListener('click', () => {
  if (!confirm('Remove video from the slideshow?')) return;
  heroSlides = heroSlides.filter(s => s.type !== 'video');
  S.heroSlides = heroSlides;
  delete S.heroVideo;
  // Keep heroVideoSaved if it exists so URL isn't lost
  document.getElementById('heroVideoUrl').value = '';
  const vid = document.getElementById('heroVideoPreviewEl');
  vid.src = ''; vid.style.display = 'none';
  document.getElementById('heroVideoLabel').style.display = 'flex';
  saveSettings();
  renderHeroSlidesGrid();
  toast('Video removed from slideshow', 'success');
});

// Save hero
document.getElementById('saveHeroSlidesBtn').addEventListener('click', () => {
  if (heroMode === 'video') {
    const videoUrl = document.getElementById('heroVideoUrl').value.trim();
    if (!videoUrl) { toast('Enter a video URL or upload a video', 'error'); return; }
    // If there are existing photo slides, add/replace the video slide in the sequence
    // Remove any previous video slide, then add the new one
    heroSlides = heroSlides.filter(s => s.type !== 'video');
    heroSlides.push({ url: videoUrl, type: 'video', link: '' });
    S.heroSlides = heroSlides;
    S.heroBg = heroSlides.find(s => s.type !== 'video')?.url || heroSlides[0].url;
    S.heroSlideDuration = parseInt(document.getElementById('heroSlideDuration').value) || 5;
    delete S.heroVideo; // migrate to new format
  } else {
    if (!heroSlides.length) { toast('Add at least one photo', 'error'); return; }
    S.heroSlides = heroSlides;
    S.heroBg = heroSlides.find(s => s.type !== 'video')?.url || heroSlides[0].url;
    S.heroSlideDuration = parseInt(document.getElementById('heroSlideDuration').value) || 5;
    delete S.heroVideo;
  }
  saveSettings();
  toast('Hero saved! Click Publish to go live.', 'success');
  if (typeof window.reloadHeroSlides === 'function') window.reloadHeroSlides();
});

// Reset hero
document.getElementById('resetHeroSlidesBtn').addEventListener('click', () => {
  if (!confirm('Reset hero to default?')) return;
  delete S.heroSlides; delete S.heroBg; delete S.heroVideo; delete S.heroSlideDuration;
  heroSlides = [];
  saveSettings();
  renderHeroSlidesGrid();
  document.getElementById('heroVideoUrl').value = '';
  document.getElementById('heroVideoPreviewEl').style.display = 'none';
  document.getElementById('heroVideoLabel').style.display = 'flex';
  toast('Hero reset to default', 'success');
});

// Color picker
const colorInput = document.getElementById('c-accentColor');
const colorValEl = document.getElementById('colorVal');

colorInput.addEventListener('input', () => { colorValEl.textContent = colorInput.value; });

COLOR_PRESETS.forEach(hex => {
  const dot = document.createElement('div');
  dot.className = 'color-preset' + (hex === (S.accentColor || '#3b82f6') ? ' active' : '');
  dot.style.background = hex;
  dot.title = hex;
  dot.addEventListener('click', () => {
    colorInput.value = hex;
    colorValEl.textContent = hex;
    document.querySelectorAll('.color-preset').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
  });
  document.getElementById('colorPresets').appendChild(dot);
});

document.getElementById('saveColorBtn').addEventListener('click', async function() {
  S.accentColor = colorInput.value;
  saveSettings();
  document.querySelectorAll('.color-preset').forEach(d => {
    d.classList.toggle('active', d.title === colorInput.value);
  });
  try {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S) });
    toast('Accent color saved — reload the site to see it', 'success');
  } catch(e) { toast('Color saved locally', 'info'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function updateDashboard() {
  const total = Object.values(counts).reduce((a, b) => (a + (typeof b === 'number' ? b : 0)), 0);
  const reviews = getReviews();

  const el = document.getElementById('dash-totalPhotos');
  if (el) el.textContent = total;
  const rel = document.getElementById('dash-totalReviews');
  if (rel) rel.textContent = reviews.length;

  buildBarChart();
}

function buildBarChart() {
  const chart = document.getElementById('dashBarChart');
  if (!chart) return;
  chart.innerHTML = '';
  const sorted = [...catOrder]
    .map(id => ({ id, label: CATEGORIES.find(c => c.id === id)?.label || id, count: counts[id] || 0 }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map(c => c.count), 1);

  sorted.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const pct = Math.round((cat.count / max) * 100);
    row.innerHTML = `
      <div class="bar-label" title="${cat.label}">${cat.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-count">${cat.count}</div>`;
    chart.appendChild(row);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVE / COPY MODAL
// ─────────────────────────────────────────────────────────────────────────────

let _mcResolve = null;
let _mcPreviousFocus = null;
let _mcOnKeydown = null;

function openMoveCopyModal(targetCatLabel) {
  // Guard against being called while already open
  if (_mcResolve) { _mcResolve(null); }
  _mcPreviousFocus = document.activeElement;

  document.getElementById('mcTargetLabel').textContent = targetCatLabel;
  document.getElementById('moveCopyModal').classList.add('open');
  // Double-rAF: consistent with toast pattern in this file — ensures element is painted before focus
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.getElementById('mcBtnMove').focus())
  );

  // Escape key closes modal (WCAG 2.1 SC 2.1.2 — No Keyboard Trap)
  _mcOnKeydown = e => { if (e.key === 'Escape') closeMoveCopyModal(null); };
  document.addEventListener('keydown', _mcOnKeydown);

  return new Promise(resolve => { _mcResolve = resolve; });
}

function closeMoveCopyModal(result) {
  document.getElementById('moveCopyModal').classList.remove('open');
  if (_mcOnKeydown) { document.removeEventListener('keydown', _mcOnKeydown); _mcOnKeydown = null; }
  // Return focus to the element that triggered the drag
  if (_mcPreviousFocus) { _mcPreviousFocus.focus(); _mcPreviousFocus = null; }
  if (_mcResolve) { _mcResolve(result); _mcResolve = null; }
}

document.getElementById('mcBtnMove').addEventListener('click',   () => closeMoveCopyModal('move'));
document.getElementById('mcBtnCopy').addEventListener('click',   () => closeMoveCopyModal('copy'));
document.getElementById('mcBtnCancel').addEventListener('click', () => closeMoveCopyModal(null));
document.getElementById('moveCopyModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeMoveCopyModal(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const item = document.createElement('div');
  item.className = `toast-item${type ? ' ' + type : ''}`;
  item.innerHTML = `<span class="toast-icon">${ICONS[type] || '•'}</span><span>${msg}</span>`;
  container.appendChild(item);
  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => item.classList.add('show'));
  });
  const timer = setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 350);
  }, 3200);
  item.addEventListener('click', () => {
    clearTimeout(timer);
    item.classList.remove('show');
    setTimeout(() => item.remove(), 350);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD ALL COUNTS
// ─────────────────────────────────────────────────────────────────────────────
async function loadAllCounts() {
  await Promise.all(CATEGORIES.map(async cat => {
    try {
      const res = await sbFetch(`/rest/v1/photos?category=eq.${cat.id}&select=public_id`);
      const photos = res.ok ? await res.json() : [];
      counts[cat.id] = Array.isArray(photos) ? photos.length : 0;
    } catch(e) { counts[cat.id] = 0; }
  }));
  buildSidebar();
  updateDashboard();
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
async function initApp() {
  // Try loading from server first
  await loadFromServer();

  // Resolve starting category from hash
  const hashCat = window.location.hash.replace('#', '');
  if (hashCat && CATEGORIES.find(c => c.id === hashCat)) {
    current = hashCat;
  }

  // Hash change
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (h && CATEGORIES.find(c => c.id === h) && h !== current) {
      setTab('galleries');
      switchCategory(h);
    }
  });

  // Build UI
  buildSidebar();
  loadContentFields();
  loadSocialFields();
  buildReviewsList();
  buildSubsEditor();

  // Load appearance fields
  loadHeroSlides();
  if (S.accentColor) {
    colorInput.value = S.accentColor;
    colorValEl.textContent = S.accentColor;
    document.querySelectorAll('.color-preset').forEach(d => {
      d.classList.toggle('active', d.title === S.accentColor);
    });
  }

  // Navigate to correct tab
  const startTab = window.location.hash && CATEGORIES.find(c => c.id === hashCat) ? 'galleries' : 'dashboard';
  setTab(startTab);

  // Switch to correct category and load photos
  switchCategory(current);

  // Load all counts in background (also refreshes dashboard)
  loadAllCounts();

  // Build launch checklist
  buildLaunchChecklist();
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
let mlAllPhotos  = [];
let mlFiltered   = [];
let mlSelected   = new Set();
let mlCallback   = null;
let mlActiveFilter = 'all';

async function openMediaLibrary(callback, opts = {}) {
  mlCallback = callback;
  mlSelected.clear();
  mlActiveFilter = 'all';
  document.getElementById('mlSearchInput').value = '';
  document.getElementById('mlSubtitle').textContent = opts.subtitle || 'Pick from files already uploaded to Cloudinary';
  const confirmBtn = document.getElementById('mlConfirmBtn');
  confirmBtn.textContent = opts.confirmLabel || 'Add Selected';
  confirmBtn.disabled = true;
  document.getElementById('mlCount').innerHTML = 'Select photos to add';
  document.getElementById('mlGrid').innerHTML = '<div class="ml-status">⏳ Loading library…</div>';
  document.getElementById('mlTabs').innerHTML = '';
  document.getElementById('mlModal').classList.add('open');

  await loadMlPhotos();
}

async function loadMlPhotos() {
  try {
    const res = await sbFetch('/rest/v1/photos?select=category,url,thumb,public_id,filename&order=created_at.desc&limit=600');
    mlAllPhotos = res.ok ? (await res.json() || []) : [];
  } catch(e) { mlAllPhotos = []; }

  // Merge hero slide images that might not be in Supabase
  const seenUrls = new Set(mlAllPhotos.map(p => p.url));
  (S.heroSlides || []).filter(s => !s.type && s.url && !seenUrls.has(s.url)).forEach(s => {
    const fname = decodeURIComponent(s.url.split('/').pop().split('?')[0]);
    const pid = s.url.match(/(portfolio\/.+)$/)?.[1] || fname;
    const thumb = s.url.replace(/\/upload\/[^/]+\//, '/upload/w_200,h_200,c_fill,q_auto/');
    mlAllPhotos.push({ category: 'hero', url: s.url, thumb, public_id: pid, filename: fname });
  });

  buildMlTabs();
  filterMl();
}

function buildMlTabs() {
  const tabsEl = document.getElementById('mlTabs');
  tabsEl.innerHTML = '';
  const cats = ['all', ...new Set(mlAllPhotos.map(p => p.category).filter(Boolean).sort())];
  cats.forEach(cat => {
    const n = cat === 'all' ? mlAllPhotos.length : mlAllPhotos.filter(p => p.category === cat).length;
    const label = cat === 'all' ? `All (${n})` : `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${n})`;
    const btn = document.createElement('button');
    btn.className = 'ml-tab' + (cat === mlActiveFilter ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      mlActiveFilter = cat;
      tabsEl.querySelectorAll('.ml-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterMl();
    });
    tabsEl.appendChild(btn);
  });
}

function filterMl() {
  const q = document.getElementById('mlSearchInput').value.toLowerCase();
  mlFiltered = mlAllPhotos.filter(p => {
    const matchCat = mlActiveFilter === 'all' || p.category === mlActiveFilter;
    const matchQ   = !q || (p.filename || '').toLowerCase().includes(q) || (p.public_id || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderMlGrid();
}

function renderMlGrid() {
  const grid = document.getElementById('mlGrid');
  grid.innerHTML = '';
  if (!mlFiltered.length) {
    grid.innerHTML = '<div class="ml-status">No photos found</div>';
    return;
  }
  mlFiltered.forEach(photo => {
    const isSelected = photo.public_id && mlSelected.has(photo.public_id);
    const item = document.createElement('div');
    item.className = 'ml-item' + (isSelected ? ' selected' : '');
    const thumb = photo.thumb || photo.url.replace(/\/upload\/[^/]+\//, '/upload/w_200,h_200,c_fill,q_auto/');
    item.innerHTML = `
      <img src="${thumb}" alt="${escHtml(photo.filename || '')}" loading="lazy">
      <div class="ml-item-check">✓</div>
      <div class="ml-item-cat">${escHtml(photo.category || '')}</div>`;
    item.addEventListener('click', () => {
      if (!photo.public_id) return;
      if (mlSelected.has(photo.public_id)) {
        mlSelected.delete(photo.public_id);
        item.classList.remove('selected');
      } else {
        mlSelected.add(photo.public_id);
        item.classList.add('selected');
      }
      updateMlFoot();
    });
    grid.appendChild(item);
  });
}

function updateMlFoot() {
  const n = mlSelected.size;
  const confirmBtn = document.getElementById('mlConfirmBtn');
  confirmBtn.disabled = n === 0;
  document.getElementById('mlCount').innerHTML =
    n === 0 ? 'Select photos to add' : `<strong>${n}</strong> photo${n > 1 ? 's' : ''} selected`;
}

function closeMl() {
  document.getElementById('mlModal').classList.remove('open');
  mlSelected.clear();
  mlCallback = null;
}

document.getElementById('mlCloseBtn').addEventListener('click', closeMl);
document.getElementById('mlCancelBtn').addEventListener('click', closeMl);
document.getElementById('mlBackdrop').addEventListener('click', closeMl);
document.getElementById('mlSearchInput').addEventListener('input', filterMl);
document.getElementById('mlConfirmBtn').addEventListener('click', () => {
  if (!mlCallback || !mlSelected.size) return;
  const items = mlAllPhotos.filter(p => p.public_id && mlSelected.has(p.public_id));
  mlCallback(items);
  closeMl();
});

// Hero slideshow — browse library
document.getElementById('heroLibraryBtn').addEventListener('click', () => {
  openMediaLibrary(items => {
    if (heroSlides.length + items.length > 8) {
      toast('Maximum 8 slides — remove some first', 'error'); return;
    }
    items.forEach(photo => heroSlides.push({ url: photo.url, link: '' }));
    renderHeroSlidesGrid();
    toast(`${items.length} photo${items.length > 1 ? 's' : ''} added to slideshow`, 'success');
  }, { confirmLabel: 'Add to Slideshow', subtitle: 'Pick photos to add to the hero slideshow' });
});

// Gallery — browse library
document.getElementById('galleryLibraryBtn').addEventListener('click', () => {
  const catLabel = CATEGORIES.find(c => c.id === current)?.label || current;
  openMediaLibrary(async items => {
    let added = 0;
    for (const photo of items) {
      try {
        await sbFetch('/rest/v1/photos', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            category: current,
            filename: photo.filename,
            url: photo.url,
            thumb: photo.thumb,
            public_id: photo.public_id
          })
        });
        added++;
      } catch(e) { /* silent — may already exist */ }
    }
    await loadPhotos(current);
    toast(`${added} photo${added > 1 ? 's' : ''} added to ${catLabel}`, 'success');
  }, { confirmLabel: `Add to ${catLabel}`, subtitle: `Pick photos to add to the ${catLabel} gallery` });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
LAUNCH_STEPS = [
  {
    id: 'photos',
    title: 'Add portfolio photos',
    desc: 'Upload your best work to at least 3 gallery categories. Quality photos are the most important part of your site.',
    tag: 'free', tagLabel: 'Free',
    auto: () => Object.values(counts).reduce((a,b) => a + (b||0), 0) >= 5
  },
  {
    id: 'content',
    title: 'Fill in site content',
    desc: 'Go to Content tab and fill in your About Me text, stats, quote, and contact info. This helps Google understand your site.',
    linkLabel: '→ Edit Content', linkTab: 'content',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'reviews',
    title: 'Add client reviews',
    desc: 'Add at least 3 real client reviews in the Content tab. Reviews build trust and help with Google ranking.',
    linkLabel: '→ Add Reviews', linkTab: 'content',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'social',
    title: 'Configure social links & WhatsApp',
    desc: 'Add your Instagram, Facebook, and WhatsApp number in the Social & SEO tab so clients can reach you.',
    linkLabel: '→ Social Settings', linkTab: 'social',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'seo',
    title: 'Review SEO settings',
    desc: 'Check the SEO section in Social & SEO tab. Make sure your page title, meta description, and OG image are set.',
    linkLabel: '→ SEO Settings', linkTab: 'social',
    tag: 'important', tagLabel: 'Important',
  },
  {
    id: 'hosting',
    title: 'Choose a hosting provider',
    desc: 'Your site is static HTML — you can host it for free! Recommended: Netlify (easiest) or Vercel. Just drag your site folder and it\'s live.',
    linkLabel: '→ Netlify (free)', linkUrl: 'https://app.netlify.com/drop',
    link2Label: '→ Vercel', link2Url: 'https://vercel.com/new',
    link3Label: '→ GitHub Pages', link3Url: 'https://pages.github.com/',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'domain',
    title: 'Buy a custom domain',
    desc: 'Get a professional domain like viniciusmurari.com. Recommended registrars: Namecheap (~€9/year), Google Domains, or Cloudflare (cheapest).',
    linkLabel: '→ Namecheap', linkUrl: 'https://www.namecheap.com/',
    link2Label: '→ Cloudflare', link2Url: 'https://www.cloudflare.com/products/registrar/',
    tag: 'paid', tagLabel: '~€9/year',
  },
  {
    id: 'linkdomain',
    title: 'Link domain to hosting',
    desc: 'After buying the domain, connect it to your hosting. On Netlify: Site Settings → Domain Management → Add custom domain. Then update your DNS records.',
    linkLabel: '→ Netlify DNS Guide', linkUrl: 'https://docs.netlify.com/domains-https/custom-domains/',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'ssl',
    title: 'Enable HTTPS (SSL)',
    desc: 'Netlify and Vercel provide free SSL automatically. If using another host, use Cloudflare for free SSL. Google penalizes sites without HTTPS.',
    tag: 'free', tagLabel: 'Free / Automatic',
  },
  {
    id: 'analytics',
    title: 'Set up Google Analytics',
    desc: 'Create a Google Analytics account to track visitors, see where they come from, and which pages are most popular. Ask me to add the tracking code!',
    linkLabel: '→ Google Analytics', linkUrl: 'https://analytics.google.com/',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'searchconsole',
    title: 'Submit to Google Search Console',
    desc: 'Register your site with Google Search Console so Google indexes it faster. Submit your sitemap.xml to speed up ranking.',
    linkLabel: '→ Search Console', linkUrl: 'https://search.google.com/search-console/',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'gmb',
    title: 'Create Google Business Profile',
    desc: 'Register "Vinicius Murari Photography" on Google Business. This makes you appear on Google Maps and local searches for "photographer dublin".',
    linkLabel: '→ Google Business', linkUrl: 'https://business.google.com/',
    tag: 'free', tagLabel: 'Free',
  },
  {
    id: 'speed',
    title: 'Test site speed',
    desc: 'Run your live site through PageSpeed Insights. Aim for 90+ on mobile. Your site is already optimized with lazy loading and minimal JS.',
    linkLabel: '→ PageSpeed Insights', linkUrl: 'https://pagespeed.web.dev/',
    tag: 'free', tagLabel: 'Free',
  },
];

function getLaunchState() {
  return JSON.parse(localStorage.getItem('vmLaunchState') || '{}');
}
function saveLaunchState(state) {
  localStorage.setItem('vmLaunchState', JSON.stringify(state));
}

function buildLaunchChecklist() {
  const container = document.getElementById('launchSteps');
  if (!container) return;
  container.innerHTML = '';
  const state = getLaunchState();

  // Auto-check steps that can be detected
  LAUNCH_STEPS.forEach(step => {
    if (step.auto && step.auto()) state[step.id] = true;
  });

  let doneCount = 0;
  LAUNCH_STEPS.forEach((step, i) => {
    const isDone = !!state[step.id];
    if (isDone) doneCount++;
    const isNext = !isDone && doneCount === i; // first unchecked

    const el = document.createElement('div');
    el.className = 'launch-step' + (isDone ? ' done' : '') + (isNext ? ' active-step' : '');

    let linksHtml = '';
    if (step.linkUrl) {
      linksHtml += `<a href="${step.linkUrl}" target="_blank" class="launch-step-link">${step.linkLabel} ↗</a> `;
    } else if (step.linkTab) {
      linksHtml += `<a href="#" class="launch-step-link" data-goto-tab="${step.linkTab}">${step.linkLabel}</a> `;
    }
    if (step.link2Url) linksHtml += `<a href="${step.link2Url}" target="_blank" class="launch-step-link">${step.link2Label} ↗</a> `;
    if (step.link3Url) linksHtml += `<a href="${step.link3Url}" target="_blank" class="launch-step-link">${step.link3Label} ↗</a> `;

    el.innerHTML = `
      <div class="launch-step-num">${i + 1}</div>
      <div class="launch-step-check">✓</div>
      <div class="launch-step-body">
        <div class="launch-step-title">${step.title}
          <span class="launch-step-tag ${step.tag}">${step.tagLabel}</span>
        </div>
        <div class="launch-step-desc">${step.desc}</div>
        <div>${linksHtml}</div>
      </div>`;

    // Click number/check to toggle
    const check = el.querySelector('.launch-step-check');
    const num = el.querySelector('.launch-step-num');
    [check, num].forEach(btn => {
      btn.addEventListener('click', () => {
        state[step.id] = !state[step.id];
        saveLaunchState(state);
        buildLaunchChecklist();
      });
    });

    // Internal tab links
    el.querySelectorAll('[data-goto-tab]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const tab = a.dataset.gotoTab;
        setTab(tab);
        document.querySelector(`.nav-btn[data-tab="${tab}"]`)?.classList.add('active');
      });
    });

    container.appendChild(el);
  });

  // Update progress bar
  const pct = Math.round((doneCount / LAUNCH_STEPS.length) * 100);
  document.getElementById('launchPercent').textContent = `${pct}% — ${doneCount}/${LAUNCH_STEPS.length} steps`;
  document.getElementById('launchBar').style.width = `${pct}%`;
}

// Block B (was inline <script> #3)
// Mobile nav tab switching
document.querySelectorAll('.mob-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setTab(btn.dataset.tab);
  });
});
// Sync mobile nav active state when tab changes via desktop
const _origSetTab = window.setTab;
window.setTab = function(tab) {
  _origSetTab(tab);
  document.querySelectorAll('.mob-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// LANDING PAGES ADMIN
// ═══════════════════════════════════════════════════════════════════════════
(function() {
  let editingId = null;

  function getPages() { return S.landingPages || []; }
  function setPages(pages) { S.landingPages = pages; }

  // ── Render page list ──
  function renderList() {
    const pages = getPages();
    const countEl = document.getElementById('lpCount');
    if (countEl) countEl.textContent = pages.length;

    const list = document.getElementById('lpPageList');
    if (!list) return;

    if (pages.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--text-3);font-size:0.85rem">No landing pages yet. Click <strong>+ New Landing Page</strong> to create one.</div>';
      return;
    }

    list.innerHTML = pages.map(p => `
      <div style="display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-sm);cursor:pointer" data-lp-id="${p.id}" class="lp-list-item">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px">${escH(p.seo?.title || p.slug || 'Untitled')}</div>
          <div style="font-size:0.75rem;color:var(--text-3)">/${escH(p.slug)} ${p.active ? '<span style="color:var(--green);font-weight:600">● Live</span>' : '<span style="color:var(--text-3)">● Draft</span>'}</div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:0.72rem;color:var(--text-2);cursor:pointer" onclick="event.stopPropagation()">
          Active
          <input type="checkbox" ${p.active ? 'checked' : ''} onchange="lpToggleActive('${p.id}', this.checked)">
        </label>
        <button style="font-size:0.75rem;color:var(--blue);background:none;border:none;cursor:pointer;padding:4px 8px" onclick="event.stopPropagation();lpEditPage('${p.id}')">Edit</button>
      </div>
    `).join('');

    list.querySelectorAll('.lp-list-item').forEach(el => {
      el.addEventListener('click', () => lpEditPage(el.dataset.lpId));
    });
  }

  // ── Create new page ──
  window.lpCreatePage = function() {
    const pages = getPages();
    const newPage = {
      id: 'lp_' + Date.now(),
      slug: 'new-landing-page',
      active: false,
      seo: { title: 'New Landing Page', description: '', ogImage: '' },
      hero: {
        mode: 'photo', headline: 'Your Headline <em>Here</em>',
        subheadline: 'Your sub-headline goes here.',
        cta: { text: 'Get a Free Quote', action: 'form' },
        ctaSecondary: { text: 'See My Work', link: '#lp-portfolio' },
        image: '', slides: [],
        pillText: 'Available for bookings in Dublin',
        trustLine: ''
      },
      stats: [{ value: '40%', label: 'More Bookings' }],
      problem: { headline: '', text: '', image: '' },
      services: [],
      portfolio: [],
      showreel: { url: '', thumbnail: '' },
      beforeAfter: [],
      process: [
        { step: '1', title: 'Book', text: 'Choose your package.' },
        { step: '2', title: 'Shoot', text: 'We capture your property.' },
        { step: '3', title: 'Receive', text: 'Get your files in 48h.' }
      ],
      packages: [],
      testimonials: [],
      faq: [],
      contact: { whatsapp: '', whatsappMessage: '', web3formsKey: '', finalCtaTitle: '', finalCtaSub: '' }
    };
    pages.push(newPage);
    setPages(pages);
    saveSettings();
    lpEditPage(newPage.id);
  };

  // ── Toggle active ──
  window.lpToggleActive = function(id, val) {
    const pages = getPages();
    const p = pages.find(x => x.id === id);
    if (p) { p.active = val; setPages(pages); saveSettings(); renderList(); }
  };

  // ── Edit page ──
  window.lpEditPage = function(id) {
    editingId = id;
    const pages = getPages();
    const p = pages.find(x => x.id === id);
    if (!p) return;

    document.getElementById('lpPageList').style.display = 'none';
    document.getElementById('lpCreateBtn').style.display = 'none';
    document.getElementById('lpEditor').style.display = '';

    document.getElementById('lpEditorTitle').textContent = p.seo?.title || p.slug;
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    document.getElementById('lpPreviewLink').href = isLocal ? '/landing.html?page=' + (p.slug || '') : '/' + (p.slug || '');

    // SEO
    val('lp-slug', p.slug);
    val('lp-seoTitle', p.seo?.title);
    val('lp-seoDesc', p.seo?.description);
    document.getElementById('lpSlugPreview').textContent = p.slug || '';

    // Hero
    val('lp-heroHeadline', p.hero?.headline);
    val('lp-heroSub', p.hero?.subheadline);
    val('lp-heroCta', p.hero?.cta?.text);
    val('lp-heroCta2', p.hero?.ctaSecondary?.text);
    val('lp-heroPill', p.hero?.pillText);
    val('lp-heroTrust', p.hero?.trustLine);
    val('lp-heroImage', p.hero?.image);
    val('lp-heroSlides', (p.hero?.slides || []).map(s => s.url || s).join('\n'));

    // Stats
    renderRepeater('lpStatsEditor', p.stats || [], renderStatRow);

    // Problem
    val('lp-problemTitle', p.problem?.headline);
    val('lp-problemText', p.problem?.text);
    val('lp-problemImage', p.problem?.image);

    // Services
    renderRepeater('lpServicesEditor', p.services || [], renderServiceRow);

    // Portfolio
    renderRepeater('lpPortfolioEditor', p.portfolio || [], renderPortfolioRow);

    // Before & After
    const baCheck = document.getElementById('lp-showBeforeAfter');
    if (baCheck) baCheck.checked = !!p.showBeforeAfter;
    renderRepeater('lpBAEditor', p.beforeAfter || [], renderBARow);

    // Showreel
    val('lp-showreelUrl', p.showreel?.url);
    val('lp-showreelThumb', p.showreel?.thumbnail);

    // Process
    renderRepeater('lpProcessEditor', p.process || [], renderProcessRow);

    // Packages
    renderRepeater('lpPackagesEditor', p.packages || [], renderPackageRow);

    // Testimonials
    renderRepeater('lpTestimonialsEditor', p.testimonials || [], renderTestimonialRow);

    // FAQ
    renderRepeater('lpFaqEditor', p.faq || [], renderFaqRow);

    // Contact
    val('lp-whatsapp', p.contact?.whatsapp);
    val('lp-whatsappMsg', p.contact?.whatsappMessage);
    val('lp-web3key', p.contact?.web3formsKey);
    val('lp-finalCtaTitle', p.contact?.finalCtaTitle);
    val('lp-finalCtaSub', p.contact?.finalCtaSub);

    // Slug preview live update
    document.getElementById('lp-slug').oninput = function() {
      document.getElementById('lpSlugPreview').textContent = this.value;
    };
  };

  // ── Back to list ──
  function backToList() {
    editingId = null;
    document.getElementById('lpEditor').style.display = 'none';
    document.getElementById('lpPageList').style.display = '';
    document.getElementById('lpCreateBtn').style.display = '';
    renderList();
  }

  // ── Save current page ──
  function savePage() {
    if (!editingId) return;
    const pages = getPages();
    const p = pages.find(x => x.id === editingId);
    if (!p) return;

    p.slug = gval('lp-slug').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    p.seo = { title: gval('lp-seoTitle'), description: gval('lp-seoDesc'), ogImage: p.seo?.ogImage || '' };

    p.hero = {
      mode: p.hero?.mode || 'photo',
      headline: gval('lp-heroHeadline'),
      subheadline: gval('lp-heroSub'),
      cta: { text: gval('lp-heroCta'), action: 'form' },
      ctaSecondary: { text: gval('lp-heroCta2'), link: '#lp-portfolio' },
      image: gval('lp-heroImage'),
      slides: gval('lp-heroSlides').split('\n').filter(u => u.trim()).map(u => ({ url: u.trim() })),
      pillText: gval('lp-heroPill'),
      trustLine: gval('lp-heroTrust')
    };

    p.stats = collectRepeater('lpStatsEditor', ['value', 'label']);
    p.problem = { headline: gval('lp-problemTitle'), text: gval('lp-problemText'), image: gval('lp-problemImage') };
    p.services = collectServices();
    p.portfolio = collectRepeater('lpPortfolioEditor', ['url', 'caption']);
    p.showBeforeAfter = document.getElementById('lp-showBeforeAfter')?.checked || false;
    p.beforeAfter = collectRepeater('lpBAEditor', ['before', 'after']);
    p.showreel = { url: gval('lp-showreelUrl'), thumbnail: gval('lp-showreelThumb') };
    p.process = collectRepeater('lpProcessEditor', ['step', 'title', 'text']);
    p.packages = collectPackages();
    p.testimonials = collectRepeater('lpTestimonialsEditor', ['name', 'role', 'text', 'photo', 'rating']);
    p.faq = collectRepeater('lpFaqEditor', ['q', 'a']);

    p.contact = {
      whatsapp: gval('lp-whatsapp'),
      whatsappMessage: gval('lp-whatsappMsg'),
      web3formsKey: gval('lp-web3key'),
      finalCtaTitle: gval('lp-finalCtaTitle'),
      finalCtaSub: gval('lp-finalCtaSub')
    };

    setPages(pages);
    saveSettings();
    toast('Landing page saved!', 'success');
    document.getElementById('lpEditorTitle').textContent = p.seo.title || p.slug;
    document.getElementById('lpSlugPreview').textContent = p.slug;
  }

  // ── Duplicate ──
  function duplicatePage() {
    if (!editingId) return;
    const pages = getPages();
    const p = pages.find(x => x.id === editingId);
    if (!p) return;
    const dup = JSON.parse(JSON.stringify(p));
    dup.id = 'lp_' + Date.now();
    dup.slug = p.slug + '-copy';
    dup.active = false;
    if (dup.seo) dup.seo.title = (dup.seo.title || '') + ' (Copy)';
    pages.push(dup);
    setPages(pages);
    saveSettings();
    toast('Page duplicated', 'success');
    lpEditPage(dup.id);
  }

  // ── Delete ──
  function deletePage() {
    if (!editingId) return;
    if (!confirm('Delete this landing page? This cannot be undone.')) return;
    let pages = getPages();
    pages = pages.filter(x => x.id !== editingId);
    setPages(pages);
    saveSettings();
    toast('Page deleted', 'success');
    backToList();
  }

  // ── Repeater helpers ──
  function renderRepeater(containerId, items, rowFn) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    items.forEach((item, i) => {
      const row = rowFn(item, i);
      c.appendChild(row);
    });
  }

  function collectRepeater(containerId, fields) {
    const c = document.getElementById(containerId);
    if (!c) return [];
    const rows = c.querySelectorAll('.lp-rep-row');
    return Array.from(rows).map(row => {
      const obj = {};
      fields.forEach(f => {
        const el = row.querySelector(`[data-field="${f}"]`);
        if (el) obj[f] = el.type === 'checkbox' ? el.checked : el.value;
      });
      return obj;
    });
  }

  function makeRemoveBtn(row) {
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.style.cssText = 'position:absolute;top:8px;right:8px;background:var(--red-soft);color:var(--red);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center';
    btn.onclick = () => row.remove();
    return btn;
  }

  function makeRow() {
    const row = document.createElement('div');
    row.className = 'lp-rep-row';
    row.style.cssText = 'position:relative;padding:16px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px';
    row.appendChild(makeRemoveBtn(row));
    return row;
  }

  // ── Row renderers ──
  function renderStatRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;padding-right:28px"><input data-field="value" value="${escA(item.value)}" placeholder="40%" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"><input data-field="label" value="${escA(item.label)}" placeholder="More Bookings" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"></div>`;
    return row;
  }

  // Helper: add a photo thumb to a service row
  function svcAddThumb(row, url) {
    const photos = JSON.parse(row.dataset.portfolio || '[]');
    photos.push({ url, caption: '' });
    row.dataset.portfolio = JSON.stringify(photos);
    const thumbWrap = row.querySelector('.svc-photo-thumbs');
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0;cursor:grab';
    div.innerHTML = `<img src="${escA(url)}" style="width:100%;height:100%;object-fit:cover"><button type="button" class="svc-photo-remove" title="Remove" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.75);border:none;border-radius:50%;width:20px;height:20px;color:#fff;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>`;
    div.querySelector('.svc-photo-remove').onclick = () => {
      const p2 = JSON.parse(row.dataset.portfolio || '[]');
      const idx = p2.findIndex(p => p.url === url);
      if (idx > -1) p2.splice(idx, 1);
      row.dataset.portfolio = JSON.stringify(p2);
      div.remove();
      svcUpdateBadge(row);
    };
    thumbWrap.appendChild(div);
    svcUpdateBadge(row);
  }

  function svcUpdateBadge(row) {
    const count = JSON.parse(row.dataset.portfolio || '[]').length;
    const summary = row.querySelector('details summary');
    if (!summary) return;
    let badge = summary.querySelector('.svc-count-badge');
    let empty = summary.querySelector('.svc-empty-hint');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'svc-count-badge';
        badge.style.cssText = 'background:var(--blue);color:#fff;border-radius:100px;padding:1px 7px;font-size:0.65rem;font-weight:600';
        summary.appendChild(badge);
      }
      badge.textContent = count;
      if (empty) empty.remove();
    } else {
      if (badge) badge.remove();
      if (!empty) {
        empty = document.createElement('span');
        empty.className = 'svc-empty-hint';
        empty.style.cssText = 'color:var(--text-3);font-size:0.7rem';
        empty.textContent = '— click to add';
        summary.appendChild(empty);
      }
    }
  }

  function renderServiceRow(item) {
    const row = makeRow();
    const portfolio = item.portfolio || [];
    row.dataset.portfolio = JSON.stringify(portfolio);

    row.innerHTML += `
      <div style="display:grid;grid-template-columns:50px 1fr;gap:8px;margin-bottom:8px;padding-right:28px">
        <input data-field="icon" value="${escA(item.icon)}" placeholder="📸" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;text-align:center">
        <input data-field="title" value="${escA(item.title)}" placeholder="Photography" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem">
      </div>
      <textarea data-field="description" rows="2" placeholder="Description..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;margin-bottom:6px;resize:vertical">${escH(item.description || '')}</textarea>
      <input data-field="features" value="${escA((item.features||[]).join(', '))}" placeholder="Feature 1, Feature 2, Feature 3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;color:var(--text-2);margin-bottom:8px">

      <details style="margin-top:4px" ${portfolio.length > 0 ? 'open' : ''}>
        <summary style="font-size:0.75rem;color:var(--text-2);cursor:pointer;user-select:none;padding:4px 0;display:flex;align-items:center;gap:6px">
          <span>Portfolio Media</span>
          ${portfolio.length > 0 ? `<span style="background:var(--blue);color:#fff;border-radius:100px;padding:1px 7px;font-size:0.65rem;font-weight:600">${portfolio.length}</span>` : '<span style="color:var(--text-3);font-size:0.7rem">— click to add</span>'}
        </summary>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px">

          <div>
            <div style="font-size:0.72rem;font-weight:600;color:var(--text-2);margin-bottom:6px">Photos <span style="font-weight:400;color:var(--text-3)">(drag to reorder)</span></div>
            <div class="svc-photo-thumbs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">${portfolio.map(p => `
              <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0;cursor:grab">
                <img src="${escA(p.url)}" style="width:100%;height:100%;object-fit:cover">
                <button type="button" data-url="${escA(p.url)}" class="svc-photo-remove" title="Remove" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.75);border:none;border-radius:50%;width:20px;height:20px;color:#fff;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
              </div>`).join('')}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="svc-library-btn" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--blue-soft);border:1px solid var(--blue);border-radius:6px;cursor:pointer;font-size:0.76rem;color:var(--blue);font-weight:500">
                📂 Browse Library
              </button>
              <label style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.76rem;color:var(--text-2)">
                ⬆ Upload New
                <input type="file" accept="image/*" class="svc-photo-upload" style="display:none" multiple>
              </label>
            </div>
          </div>

          <div>
            <div style="font-size:0.72rem;font-weight:600;color:var(--text-2);margin-bottom:4px">Video URL</div>
            <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:4px">YouTube, Vimeo, or direct .mp4</div>
            <input data-field="videoUrl" value="${escA(item.videoUrl || '')}" placeholder="https://youtube.com/watch?v=..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          </div>

          <div>
            <div style="font-size:0.72rem;font-weight:600;color:var(--text-2);margin-bottom:4px">3D Tour URL</div>
            <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:4px">Matterport or any iframe URL</div>
            <input data-field="tourUrl" value="${escA(item.tourUrl || '')}" placeholder="https://my.matterport.com/show/?m=..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          </div>

          <div>
            <div style="font-size:0.72rem;font-weight:600;color:var(--text-2);margin-bottom:4px">WhatsApp Button</div>
            <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:4px">Custom message for this service (uses global number)</div>
            <input data-field="whatsappMsg" value="${escA(item.whatsappMsg || '')}" placeholder="Hi! I'm interested in photography for my property." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          </div>

        </div>
      </details>`;

    // Remove existing photo
    row.querySelectorAll('.svc-photo-remove').forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.url;
        const photos = JSON.parse(row.dataset.portfolio || '[]');
        const idx = photos.findIndex(p => p.url === url);
        if (idx > -1) photos.splice(idx, 1);
        row.dataset.portfolio = JSON.stringify(photos);
        btn.closest('div[style*="position:relative"]').remove();
        svcUpdateBadge(row);
      };
    });

    // Browse library
    row.querySelector('.svc-library-btn').onclick = () => {
      openMediaLibrary(items => {
        items.forEach(photo => svcAddThumb(row, photo.url));
      }, { subtitle: 'Pick photos for this service portfolio', confirmLabel: 'Add to Portfolio' });
    };

    // Upload new photo
    row.querySelector('.svc-photo-upload').onchange = async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('upload_preset', CLOUDINARY_PRESET);
          const nameNoExt = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          form.append('public_id', 'landing/' + Date.now() + '_' + nameNoExt);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form });
          const data = await res.json();
          const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/q_auto,f_auto/${data.public_id}`;
          svcAddThumb(row, url);
        } catch (err) {
          console.error('Upload failed', err);
        }
      }
      e.target.value = '';
    };

    return row;
  }

  function collectServices() {
    const c = document.getElementById('lpServicesEditor');
    if (!c) return [];
    return Array.from(c.querySelectorAll('.lp-rep-row')).map(row => ({
      icon:        row.querySelector('[data-field="icon"]')?.value || '',
      title:       row.querySelector('[data-field="title"]')?.value || '',
      description: row.querySelector('[data-field="description"]')?.value || '',
      features:    (row.querySelector('[data-field="features"]')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      portfolio:   JSON.parse(row.dataset.portfolio || '[]'),
      videoUrl:    row.querySelector('[data-field="videoUrl"]')?.value || '',
      tourUrl:     row.querySelector('[data-field="tourUrl"]')?.value || '',
      whatsappMsg: row.querySelector('[data-field="whatsappMsg"]')?.value || ''
    }));
  }

  function renderBARow(item) {
    const row = makeRow();
    row.innerHTML += `
      <div style="font-size:0.72rem;font-weight:600;color:var(--text-2);margin-bottom:8px;padding-right:28px">Before / After pair</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-right:28px">
        <div>
          <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:4px">BEFORE — original/raw image URL</div>
          <input data-field="before" value="${escA(item.before||'')}" placeholder="https://..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          ${item.before ? `<img src="${escA(item.before)}" style="margin-top:6px;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : ''}
        </div>
        <div>
          <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:4px">AFTER — retouched/final image URL</div>
          <input data-field="after" value="${escA(item.after||'')}" placeholder="https://..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          ${item.after ? `<img src="${escA(item.after)}" style="margin-top:6px;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : ''}
        </div>
      </div>`;
    return row;
  }

  function renderPortfolioRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;padding-right:28px"><input data-field="url" value="${escA(item.url)}" placeholder="Image URL" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"><input data-field="caption" value="${escA(item.caption || '')}" placeholder="Caption" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"></div>`;
    return row;
  }

  function renderProcessRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="display:grid;grid-template-columns:50px 1fr;gap:8px;margin-bottom:6px;padding-right:28px"><input data-field="step" value="${escA(item.step)}" placeholder="#" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;text-align:center"><input data-field="title" value="${escA(item.title)}" placeholder="Step title" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"></div><input data-field="text" value="${escA(item.text || '')}" placeholder="Description" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem">`;
    return row;
  }

  function renderPackageRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="display:grid;grid-template-columns:1fr 100px;gap:8px;margin-bottom:6px;padding-right:28px"><input data-field="name" value="${escA(item.name)}" placeholder="Package name" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"><input data-field="price" value="${escA(item.price || '')}" placeholder="€299" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"></div><input data-field="features" value="${escA((item.features||[]).join(', '))}" placeholder="Feature 1, Feature 2, ..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;margin-bottom:6px"><div style="display:flex;gap:16px;align-items:center;font-size:0.75rem;color:var(--text-2)"><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" data-field="showPrice" ${item.showPrice ? 'checked' : ''}> Show price</label><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" data-field="highlighted" ${item.highlighted ? 'checked' : ''}> Highlight (Most Popular)</label></div>`;
    return row;
  }

  function collectPackages() {
    const c = document.getElementById('lpPackagesEditor');
    if (!c) return [];
    return Array.from(c.querySelectorAll('.lp-rep-row')).map(row => ({
      name: row.querySelector('[data-field="name"]')?.value || '',
      price: row.querySelector('[data-field="price"]')?.value || '',
      features: (row.querySelector('[data-field="features"]')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      showPrice: row.querySelector('[data-field="showPrice"]')?.checked || false,
      highlighted: row.querySelector('[data-field="highlighted"]')?.checked || false
    }));
  }

  function renderTestimonialRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;padding-right:28px"><input data-field="name" value="${escA(item.name)}" placeholder="Client name" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"><input data-field="role" value="${escA(item.role || '')}" placeholder="Airbnb Superhost, Dublin" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"></div><textarea data-field="text" rows="2" placeholder="Review text..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;margin-bottom:6px;resize:vertical">${escH(item.text || '')}</textarea><div style="display:grid;grid-template-columns:1fr 80px;gap:8px"><input data-field="photo" value="${escA(item.photo || '')}" placeholder="Photo URL (optional)" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem"><input data-field="rating" type="number" min="1" max="5" value="${item.rating || 5}" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;text-align:center"></div>`;
    return row;
  }

  function renderFaqRow(item) {
    const row = makeRow();
    row.innerHTML += `<div style="padding-right:28px"><input data-field="q" value="${escA(item.q)}" placeholder="Question" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;margin-bottom:6px"><textarea data-field="a" rows="2" placeholder="Answer" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;resize:vertical">${escH(item.a || '')}</textarea></div>`;
    return row;
  }

  // ── Add buttons for repeaters ──
  function addRepeater(containerId, rowFn, defaultItem) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.appendChild(rowFn(defaultItem));
  }

  // ── Helpers ──
  function val(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function gval(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function escH(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function escA(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  // ── Wire up buttons ──
  document.getElementById('lpCreateBtn')?.addEventListener('click', lpCreatePage);
  document.getElementById('lpBackBtn')?.addEventListener('click', backToList);
  document.getElementById('lpSaveBtn')?.addEventListener('click', savePage);
  document.getElementById('lpDuplicateBtn')?.addEventListener('click', duplicatePage);
  document.getElementById('lpDeleteBtn')?.addEventListener('click', deletePage);

  document.getElementById('lpAddStat')?.addEventListener('click', () => addRepeater('lpStatsEditor', renderStatRow, { value: '', label: '' }));
  document.getElementById('lpAddService')?.addEventListener('click', () => addRepeater('lpServicesEditor', renderServiceRow, { icon: '', title: '', description: '', features: [] }));
  document.getElementById('lpAddBA')?.addEventListener('click', () => addRepeater('lpBAEditor', renderBARow, { before: '', after: '' }));
  document.getElementById('lpAddPortfolio')?.addEventListener('click', () => addRepeater('lpPortfolioEditor', renderPortfolioRow, { url: '', caption: '' }));
  document.getElementById('lpAddProcess')?.addEventListener('click', () => addRepeater('lpProcessEditor', renderProcessRow, { step: '', title: '', text: '' }));
  document.getElementById('lpAddPackage')?.addEventListener('click', () => addRepeater('lpPackagesEditor', renderPackageRow, { name: '', features: [], price: '', showPrice: false, highlighted: false }));
  document.getElementById('lpAddTestimonial')?.addEventListener('click', () => addRepeater('lpTestimonialsEditor', renderTestimonialRow, { name: '', role: '', text: '', photo: '', rating: 5 }));
  document.getElementById('lpAddFaq')?.addEventListener('click', () => addRepeater('lpFaqEditor', renderFaqRow, { q: '', a: '' }));

  // ── Init: render list when tab is shown + after settings load ──
  // Hook into setTab to refresh list each time LP tab opens
  const _origSetTabLP = window.setTab;
  window.setTab = function(tab) {
    _origSetTabLP(tab);
    if (tab === 'landingpages') renderList();
  };
  // Also render after settings load and on timeout
  const _origLoadSettings = window.loadFromServer;
  if (_origLoadSettings) {
    const origFn = _origLoadSettings;
    window.loadFromServer = async function() {
      await origFn.apply(this, arguments);
      renderList();
    };
  }
  setTimeout(renderList, 800);
  setTimeout(renderList, 2000);
})();

// ─────────────────────────────────────────────────────────────────────────────
// BLOG / JOURNAL
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  let blogPosts = [];
  let editingId = null;

  function slugify(str) {
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async function loadBlogPosts() {
    const list = document.getElementById('blogPostList');
    list.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">Loading…</div>';
    try {
      const res = await sbFetch('/rest/v1/posts?order=created_at.desc');
      if (res.status === 404 || res.status === 400) {
        document.getElementById('blogSetupNote').style.display = 'block';
        list.innerHTML = '';
        return;
      }
      blogPosts = res.ok ? await res.json() : [];
    } catch(e) {
      blogPosts = [];
      document.getElementById('blogSetupNote').style.display = 'block';
    }
    document.getElementById('blogSetupNote').style.display = 'none';
    renderBlogList();
    const badge = document.getElementById('blogCount');
    const pub = blogPosts.filter(p => p.status === 'published').length;
    if (pub > 0) { badge.textContent = pub; badge.style.display = 'inline'; }
  }

  function renderBlogList() {
    const list = document.getElementById('blogPostList');
    if (!blogPosts.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;padding:12px 0">No posts yet. Click "+ New Post" to create your first.</div>';
      return;
    }
    list.innerHTML = blogPosts.map(p => {
      const date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-IE', { year:'numeric', month:'short', day:'numeric' }) : '—';
      const statusColor = p.status === 'published' ? '#34c759' : '#ff9f0a';
      return `<div style="display:flex;align-items:center;gap:12px;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title || 'Untitled'}</div>
          <div style="font-size:0.72rem;color:var(--muted);margin-top:3px">${date} · <span style="color:${statusColor}">${p.status}</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="blogEdit('${p.id}')">Edit</button>
          <button class="btn btn-sm" style="background:rgba(255,59,48,0.1);color:#ff3b30;border:none" onclick="blogDelete('${p.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  function openEditor(post) {
    editingId = post ? post.id : null;
    document.getElementById('blogEditorTitle').textContent = post ? 'Edit Post' : 'New Post';
    document.getElementById('blogTitle').value = post?.title || '';
    document.getElementById('blogSlug').value = post?.slug || '';
    document.getElementById('blogExcerpt').value = post?.excerpt || '';
    document.getElementById('blogCover').value = post?.cover_image || '';
    document.getElementById('blogStatus').value = post?.status || 'draft';
    document.getElementById('blogBody').value = post?.body || '';
    if (post?.published_at) {
      const d = new Date(post.published_at);
      document.getElementById('blogDate').value = d.toISOString().slice(0,16);
    } else {
      document.getElementById('blogDate').value = new Date().toISOString().slice(0,16);
    }
    document.getElementById('blogEditor').style.display = 'block';
    document.getElementById('blogEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Auto-generate slug from title
  document.getElementById('blogTitle')?.addEventListener('input', function() {
    const slugEl = document.getElementById('blogSlug');
    if (!editingId || !slugEl.value) slugEl.value = slugify(this.value);
  });

  document.getElementById('blogNewBtn')?.addEventListener('click', () => openEditor(null));
  document.getElementById('blogCancelBtn')?.addEventListener('click', () => {
    document.getElementById('blogEditor').style.display = 'none';
    editingId = null;
  });

  document.getElementById('blogSaveBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('blogTitle').value.trim();
    if (!title) return toast('Title is required', 'error');
    const slug = document.getElementById('blogSlug').value.trim() || slugify(title);
    const dateVal = document.getElementById('blogDate').value;
    const payload = {
      title,
      slug,
      excerpt:     document.getElementById('blogExcerpt').value.trim(),
      cover_image: document.getElementById('blogCover').value.trim(),
      status:      document.getElementById('blogStatus').value,
      body:        document.getElementById('blogBody').value,
      published_at: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    };
    if (editingId) payload.id = editingId;

    const btn = document.getElementById('blogSaveBtn');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const res = await sbFetch('/rest/v1/posts', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(payload)
      });
      if (res.ok || res.status === 201) {
        toast(editingId ? 'Post updated!' : 'Post created!', 'success');
        document.getElementById('blogEditor').style.display = 'none';
        editingId = null;
        await loadBlogPosts();
      } else {
        const err = await res.text();
        toast('Save failed: ' + err, 'error');
      }
    } catch(e) { toast('Save failed', 'error'); }
    btn.textContent = 'Save Post'; btn.disabled = false;
  });

  window.blogEdit = function(id) {
    const post = blogPosts.find(p => p.id === id);
    if (post) openEditor(post);
  };

  window.blogDelete = async function(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      const res = await sbFetch(`/rest/v1/posts?id=eq.${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Post deleted', 'success'); await loadBlogPosts(); }
      else toast('Delete failed', 'error');
    } catch(e) { toast('Delete failed', 'error'); }
  };

  // Load when tab opens
  const _origSetTabBlog = window.setTab;
  window.setTab = function(tab) {
    _origSetTabBlog(tab);
    if (tab === 'blog') loadBlogPosts();
  };
})();

// ─── CSP-friendly delegation: strip mode buttons (replace inline onclick) ────
document.querySelectorAll('[data-strip-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (typeof setStripMode === 'function') setStripMode(btn.dataset.stripMode);
  });
});
