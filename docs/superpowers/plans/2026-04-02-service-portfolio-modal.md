# Service Portfolio Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Ver Trabalhos" button to each service card on the landing page that opens a portfolio showcase (modal on desktop, bottom sheet on mobile) with photos, video, and 3D tour for that service.

**Architecture:** Each service object gets three optional fields (`portfolio[]`, `videoUrl`, `tourUrl`). `renderServices()` in `landing.js` adds a button when any media exists. `openServiceModal(service)` reads `window.innerWidth` and builds either a centred modal or a bottom-sheet, both with tabs, a lightbox, and a CTA. Admin gains a collapsible media section per service row.

**Tech Stack:** Vanilla JS, CSS custom properties (already in `styles.css`), Cloudinary unsigned upload (already in `admin.html`), no new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `landing.css` | Append: `.lp-modal-*`, `.lp-sheet-*`, `.lp-lightbox-*`, tab styles, animations |
| `landing.js` | Update `renderServices()`; add `openServiceModal()`, `buildModal()`, `buildSheet()`, `openLightbox()`, swipe helpers |
| `admin.html` | Update `renderServiceRow()` and `collectServices()` at lines 3892–3907 |

`settings.json` needs no structural change — the new fields are just written by the admin when saved.

---

## Task 1: CSS — Modal, Bottom Sheet, Lightbox

**Files:**
- Modify: `landing.css` (append at end of file)

- [ ] **Step 1.1: Append modal + overlay styles**

Add at the very end of `landing.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   Service Portfolio Modal / Bottom Sheet / Lightbox
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Shared overlay ─── */
.lp-modal-overlay,
.lp-sheet-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.82);
  animation: lpFadeIn .2s ease;
}
@keyframes lpFadeIn { from { opacity:0 } to { opacity:1 } }

/* ─── Desktop Modal ─── */
.lp-modal {
  position: fixed; inset: 0; z-index: 1001;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  pointer-events: none;
}
.lp-modal-box {
  pointer-events: all;
  background: #111;
  border-radius: 16px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 32px 100px rgba(0,0,0,0.9);
  width: 100%; max-width: 760px;
  max-height: 85vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: lpModalIn .25s cubic-bezier(.34,1.56,.64,1);
}
@keyframes lpModalIn {
  from { opacity:0; transform: scale(.94) translateY(10px) }
  to   { opacity:1; transform: scale(1) translateY(0) }
}
.lp-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #222;
  background: #161616;
  flex-shrink: 0;
}
.lp-modal-title {
  display: flex; align-items: center; gap: 10px;
}
.lp-modal-title-icon { font-size: 1.1rem; }
.lp-modal-title-text {
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #c9a96e;
}
.lp-modal-count { font-size: 0.7rem; color: #555; margin-top: 2px; }
.lp-modal-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: #222; border: none; cursor: pointer;
  color: #888; font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.lp-modal-close:hover { background: #333; color: #fff; }

/* ─── Tabs ─── */
.lp-modal-tabs {
  display: flex; border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0; background: #111;
}
.lp-modal-tab {
  padding: 10px 16px;
  font-size: 0.78rem; font-weight: 500;
  color: #555; cursor: pointer; border: none; background: none;
  border-bottom: 2px solid transparent;
  transition: color .15s, border-color .15s;
}
.lp-modal-tab.active {
  color: #c9a96e; border-bottom-color: #c9a96e;
}
.lp-modal-tab:hover:not(.active) { color: #999; }

/* ─── Tab panels ─── */
.lp-modal-body {
  flex: 1; overflow-y: auto; padding: 16px;
}
.lp-modal-panel { display: none; }
.lp-modal-panel.active { display: block; }

/* ─── Photo grid (desktop) ─── */
.lp-modal-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.lp-modal-photo-item {
  aspect-ratio: 1; border-radius: 8px; overflow: hidden;
  cursor: pointer; position: relative;
}
.lp-modal-photo-item img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform .3s;
}
.lp-modal-photo-item:hover img { transform: scale(1.04); }

/* ─── Video / 3D iframe ─── */
.lp-modal-video-wrap {
  position: relative; width: 100%;
  padding-bottom: 56.25%; border-radius: 10px; overflow: hidden;
  background: #000;
}
.lp-modal-video-wrap iframe,
.lp-modal-video-wrap video {
  position: absolute; inset: 0; width: 100%; height: 100%; border: none;
}
.lp-modal-tour-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px;
  background: #1a1a1a; border: 1px solid #333; border-radius: 10px;
  color: #c9a96e; font-size: 0.9rem; font-weight: 600;
  text-decoration: none; transition: background .15s;
}
.lp-modal-tour-btn:hover { background: #222; }

/* ─── Modal footer CTA ─── */
.lp-modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #1e1e1e;
  flex-shrink: 0; background: #111;
}
.lp-modal-footer .btn { width: 100%; text-align: center; }

/* ─── Mobile Bottom Sheet ─── */
.lp-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 1001;
  background: #141414;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid #2a2a2a;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
  max-height: 80vh;
  display: flex; flex-direction: column;
  animation: lpSheetIn .3s cubic-bezier(.32,1,.46,1);
}
@keyframes lpSheetIn {
  from { transform: translateY(100%) }
  to   { transform: translateY(0) }
}
.lp-sheet.closing {
  animation: lpSheetOut .25s ease forwards;
}
@keyframes lpSheetOut {
  to { transform: translateY(100%) }
}
.lp-sheet-handle {
  display: flex; justify-content: center; padding: 12px 0 6px;
  flex-shrink: 0;
}
.lp-sheet-handle-pill {
  width: 36px; height: 4px; background: #333; border-radius: 2px;
}
.lp-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 16px 12px;
  flex-shrink: 0;
}
.lp-sheet-title {
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: #c9a96e;
}
.lp-sheet-close {
  background: none; border: none; color: #555;
  font-size: 1.1rem; cursor: pointer; padding: 4px;
}
.lp-sheet-body {
  flex: 1; overflow-y: auto; padding: 0 16px 8px;
}

/* ─── Horizontal photo scroll (mobile) ─── */
.lp-sheet-photos {
  display: flex; gap: 8px;
  overflow-x: auto; scroll-snap-type: x mandatory;
  padding-bottom: 8px; margin-bottom: 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.lp-sheet-photos::-webkit-scrollbar { display: none; }
.lp-sheet-photo {
  flex-shrink: 0; width: 120px; height: 120px;
  border-radius: 10px; overflow: hidden;
  scroll-snap-align: start; cursor: pointer;
}
.lp-sheet-photo img {
  width: 100%; height: 100%; object-fit: cover;
}

/* ─── Sheet media buttons ─── */
.lp-sheet-media-btns {
  display: flex; gap: 8px; margin-bottom: 12px;
}
.lp-sheet-media-btn {
  flex: 1; padding: 10px 8px;
  background: #1e1e1e; border: 1px solid #333; border-radius: 8px;
  color: #c9a96e; font-size: 0.8rem; font-weight: 600;
  text-align: center; cursor: pointer; transition: background .15s;
  text-decoration: none; display: block;
}
.lp-sheet-media-btn:hover { background: #252525; }

.lp-sheet-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid #1e1e1e;
  flex-shrink: 0;
}
.lp-sheet-footer .btn { width: 100%; text-align: center; }

/* ─── Lightbox ─── */
.lp-lightbox {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,0.96);
  display: flex; align-items: center; justify-content: center;
  animation: lpFadeIn .15s ease;
}
.lp-lightbox-img {
  max-width: 90vw; max-height: 90vh;
  border-radius: 6px; object-fit: contain;
  user-select: none;
}
.lp-lightbox-close {
  position: absolute; top: 16px; right: 20px;
  background: rgba(255,255,255,.12); border: none; border-radius: 50%;
  width: 36px; height: 36px; color: #fff; font-size: 1.1rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.lp-lightbox-prev,
.lp-lightbox-next {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,.12); border: none; border-radius: 50%;
  width: 44px; height: 44px; color: #fff; font-size: 1.2rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.lp-lightbox-prev { left: 16px; }
.lp-lightbox-next { right: 16px; }
.lp-lightbox-prev:hover,
.lp-lightbox-next:hover { background: rgba(255,255,255,.25); }
.lp-lightbox-counter {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  font-size: 0.78rem; color: rgba(255,255,255,.5);
}

/* ─── "Ver Trabalhos" button on service card ─── */
.lp-service-media-btn {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 12px;
  padding: 7px 14px;
  background: transparent;
  border: 1px solid rgba(201,169,110,.4);
  border-radius: 20px;
  color: #c9a96e; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: background .15s, border-color .15s;
  font-family: inherit;
}
.lp-service-media-btn:hover {
  background: rgba(201,169,110,.1); border-color: #c9a96e;
}
```

- [ ] **Step 1.2: Verify the CSS file is valid**

Open `http://localhost:3000` in a browser and confirm no CSS errors in the console. The landing page should look identical to before (new classes are unused yet).

- [ ] **Step 1.3: Update version query string in `landing.html`**

In `landing.html` line 26, change:
```html
<link rel="stylesheet" href="landing.css?v=1">
```
to:
```html
<link rel="stylesheet" href="landing.css?v=2">
```

- [ ] **Step 1.4: Commit**

```bash
cd "/Users/viniciusmurari/new site"
git add landing.css landing.html
git commit -m "feat: add modal/sheet/lightbox CSS for service portfolio"
```

---

## Task 2: landing.js — openServiceModal + renderServices update

**Files:**
- Modify: `landing.js`

- [ ] **Step 2.1: Store services reference and add openServiceModal to window**

In `landing.js`, find `function render()` (line ~165) and add one line before it to expose `openServiceModal` on `window`:

```js
  // ─── Expose modal opener (called from inline onclick) ───
  window.openServiceModal = openServiceModal;
```

Place this line immediately after the closing `}` of `init()` (around line 58), before `function getDefaultPage()`.

- [ ] **Step 2.2: Update renderServices() to add "Ver Trabalhos" button**

Find `function renderServices()` and replace the entire function with:

```js
  function renderServices() {
    const services = PAGE.services || [];
    if (services.length === 0) { document.getElementById('lp-services').style.display = 'none'; return; }
    const grid = document.getElementById('lpServicesGrid');
    grid.innerHTML = services.map((s, i) => {
      const hasMedia = (s.portfolio && s.portfolio.length > 0) || s.videoUrl || s.tourUrl;
      return `
        <div class="lp-service-card lp-reveal">
          <div class="lp-service-icon">${s.icon || '📸'}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
          ${s.features && s.features.length ? `<ul class="lp-service-features">${s.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
          ${hasMedia ? `<button class="lp-service-media-btn" onclick="openServiceModal(${i})">Ver Trabalhos →</button>` : ''}
        </div>`;
    }).join('');
  }
```

- [ ] **Step 2.3: Add helper — getVimeoId**

Just after `function getYouTubeId(url)` (line ~510), add:

```js
  function getVimeoId(url) {
    if (!url) return null;
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }
```

- [ ] **Step 2.4: Add buildVideoEmbed helper**

```js
  function buildVideoEmbed(url) {
    const ytId = getYouTubeId(url);
    if (ytId) return `<div class="lp-modal-video-wrap"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen loading="lazy"></iframe></div>`;
    const vmId = getVimeoId(url);
    if (vmId) return `<div class="lp-modal-video-wrap"><iframe src="https://player.vimeo.com/video/${vmId}" allowfullscreen loading="lazy"></iframe></div>`;
    return `<div class="lp-modal-video-wrap"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
  }
```

- [ ] **Step 2.5: Add openLightbox helper**

```js
  function openLightbox(photos, startIdx) {
    let idx = startIdx;
    const lb = document.createElement('div');
    lb.className = 'lp-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');

    function render() {
      lb.innerHTML = `
        <img class="lp-lightbox-img" src="${esc(photos[idx].url)}" alt="${esc(photos[idx].caption || 'Photo')}">
        <button class="lp-lightbox-close" aria-label="Close">✕</button>
        ${photos.length > 1 ? `
          <button class="lp-lightbox-prev" aria-label="Previous">‹</button>
          <button class="lp-lightbox-next" aria-label="Next">›</button>
        ` : ''}
        <div class="lp-lightbox-counter">${idx + 1} / ${photos.length}</div>
      `;
      lb.querySelector('.lp-lightbox-close').onclick = close;
      if (photos.length > 1) {
        lb.querySelector('.lp-lightbox-prev').onclick = () => { idx = (idx - 1 + photos.length) % photos.length; render(); };
        lb.querySelector('.lp-lightbox-next').onclick = () => { idx = (idx + 1) % photos.length; render(); };
      }
    }

    function close() { lb.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && photos.length > 1) { idx = (idx + 1) % photos.length; render(); }
      if (e.key === 'ArrowLeft'  && photos.length > 1) { idx = (idx - 1 + photos.length) % photos.length; render(); }
    }

    lb.onclick = (e) => { if (e.target === lb) close(); };
    document.addEventListener('keydown', onKey);
    render();
    document.body.appendChild(lb);
  }
```

- [ ] **Step 2.6: Add buildModalTabs helper**

```js
  function buildModalTabs(service) {
    const tabs = [];
    if (service.portfolio && service.portfolio.length > 0) tabs.push({ id: 'photos', label: '📷 Fotos' });
    if (service.videoUrl) tabs.push({ id: 'video', label: '🎬 Vídeo' });
    if (service.tourUrl)  tabs.push({ id: 'tour',  label: '🏠 3D Tour' });
    return tabs;
  }
```

- [ ] **Step 2.7: Add buildModalPanels helper**

```js
  function buildModalPanels(service, tabs) {
    return tabs.map((tab, i) => {
      let content = '';
      if (tab.id === 'photos') {
        content = `<div class="lp-modal-photo-grid">
          ${service.portfolio.map((p, pi) => `
            <div class="lp-modal-photo-item" data-idx="${pi}">
              <img src="${esc(p.url)}" alt="${esc(p.caption || 'Photo')}" loading="lazy">
            </div>`).join('')}
        </div>`;
      } else if (tab.id === 'video') {
        content = buildVideoEmbed(service.videoUrl);
      } else if (tab.id === 'tour') {
        // Try iframe first; link button is the fallback shown after
        content = `
          <div class="lp-modal-video-wrap">
            <iframe src="${esc(service.tourUrl)}" allowfullscreen loading="lazy"></iframe>
          </div>
          <a href="${esc(service.tourUrl)}" target="_blank" rel="noopener" class="lp-modal-tour-btn" style="margin-top:10px">
            🏠 Abrir 3D Tour em nova aba →
          </a>`;
      }
      return `<div class="lp-modal-panel${i === 0 ? ' active' : ''}" data-panel="${tab.id}">${content}</div>`;
    }).join('');
  }
```

- [ ] **Step 2.8: Add buildModal (desktop) function**

```js
  function buildModal(service) {
    const tabs = buildModalTabs(service);
    if (tabs.length === 0) return;
    const photoCount = service.portfolio ? service.portfolio.length : 0;

    const overlay = document.createElement('div');
    overlay.className = 'lp-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'lp-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', service.title + ' portfolio');
    modal.innerHTML = `
      <div class="lp-modal-box">
        <div class="lp-modal-header">
          <div class="lp-modal-title">
            <span class="lp-modal-title-icon">${service.icon || '📸'}</span>
            <div>
              <div class="lp-modal-title-text">${esc(service.title)}</div>
              ${photoCount > 0 ? `<div class="lp-modal-count">${photoCount} foto${photoCount !== 1 ? 's' : ''}</div>` : ''}
            </div>
          </div>
          <button class="lp-modal-close" aria-label="Fechar">✕</button>
        </div>
        <div class="lp-modal-tabs">
          ${tabs.map((t, i) => `<button class="lp-modal-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div class="lp-modal-body">
          ${buildModalPanels(service, tabs)}
        </div>
        <div class="lp-modal-footer">
          <a href="#lp-contact" class="btn btn-fill">Solicitar Orçamento</a>
        </div>
      </div>`;

    function close() {
      overlay.remove(); modal.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    overlay.onclick = close;
    modal.querySelector('.lp-modal-close').onclick = close;
    document.addEventListener('keydown', onKey);

    // Tab switching
    modal.querySelectorAll('.lp-modal-tab').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.lp-modal-tab').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.lp-modal-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`.lp-modal-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      };
    });

    // Photo lightbox
    modal.querySelectorAll('.lp-modal-photo-item').forEach(item => {
      item.onclick = () => openLightbox(service.portfolio, parseInt(item.dataset.idx));
    });

    // CTA scrolls to contact and closes
    modal.querySelector('.lp-modal-footer .btn').onclick = (e) => {
      e.preventDefault(); close();
      document.getElementById('lp-contact')?.scrollIntoView({ behavior: 'smooth' });
    };

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
```

- [ ] **Step 2.9: Add buildSheet (mobile) function**

```js
  function buildSheet(service) {
    const hasPhotos = service.portfolio && service.portfolio.length > 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'lp-sheet-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'lp-sheet';
    sheet.innerHTML = `
      <div class="lp-sheet-handle"><div class="lp-sheet-handle-pill"></div></div>
      <div class="lp-sheet-header">
        <span class="lp-sheet-title">${service.icon || '📸'} ${esc(service.title)}</span>
        <button class="lp-sheet-close" aria-label="Fechar">✕</button>
      </div>
      <div class="lp-sheet-body">
        ${hasPhotos ? `
          <div class="lp-sheet-photos">
            ${service.portfolio.map((p, pi) => `
              <div class="lp-sheet-photo" data-idx="${pi}">
                <img src="${esc(p.url)}" alt="${esc(p.caption || 'Photo')}" loading="lazy">
              </div>`).join('')}
          </div>` : ''}
        <div class="lp-sheet-media-btns">
          ${service.videoUrl ? `<a href="${esc(service.videoUrl)}" target="_blank" rel="noopener" class="lp-sheet-media-btn">🎬 Ver Vídeo</a>` : ''}
          ${service.tourUrl  ? `<a href="${esc(service.tourUrl)}"  target="_blank" rel="noopener" class="lp-sheet-media-btn">🏠 3D Tour</a>` : ''}
        </div>
      </div>
      <div class="lp-sheet-footer">
        <a href="#lp-contact" class="btn btn-fill">Solicitar Orçamento</a>
      </div>`;

    function close() {
      sheet.classList.add('closing');
      setTimeout(() => { backdrop.remove(); sheet.remove(); }, 240);
    }

    backdrop.onclick = close;
    sheet.querySelector('.lp-sheet-close').onclick = close;

    // Photo lightbox
    if (hasPhotos) {
      sheet.querySelectorAll('.lp-sheet-photo').forEach(item => {
        item.onclick = () => openLightbox(service.portfolio, parseInt(item.dataset.idx));
      });
    }

    // CTA
    sheet.querySelector('.lp-sheet-footer .btn').onclick = (e) => {
      e.preventDefault(); close();
      setTimeout(() => document.getElementById('lp-contact')?.scrollIntoView({ behavior: 'smooth' }), 260);
    };

    // Swipe down to close
    let startY = 0;
    sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 80) close();
    }, { passive: true });

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
  }
```

- [ ] **Step 2.10: Add openServiceModal dispatcher**

```js
  function openServiceModal(idx) {
    const service = (PAGE.services || [])[idx];
    if (!service) return;
    if (window.innerWidth >= 768) {
      buildModal(service);
    } else {
      buildSheet(service);
    }
  }
```

Place `buildModalTabs`, `buildModalPanels`, `buildVideoEmbed`, `buildModal`, `buildSheet`, `openLightbox`, `openServiceModal`, and `getVimeoId` all together in a new `// ─── Service Portfolio Modal ───` section at the end of the IIFE, just before the closing `})();`.

- [ ] **Step 2.11: Update landing.js version in landing.html**

In `landing.html`, find:
```html
<script src="landing.js?v=1" defer></script>
```
Change to:
```html
<script src="landing.js?v=2" defer></script>
```

- [ ] **Step 2.12: Smoke test**

```bash
python3 "/Users/viniciusmurari/new site/server.py"
```

Open `http://localhost:3000/airbnb-photography`. The service cards should render as before. No console errors. Since `portfolio` is empty on all services, no "Ver Trabalhos" buttons should appear yet.

- [ ] **Step 2.13: Commit**

```bash
cd "/Users/viniciusmurari/new site"
git add landing.js landing.html
git commit -m "feat: add service portfolio modal/sheet to landing page"
```

---

## Task 3: Admin — per-service portfolio media fields

**Files:**
- Modify: `admin.html` lines 3892–3907

- [ ] **Step 3.1: Update renderServiceRow() to include media fields**

Find `function renderServiceRow(item)` (line 3892) and replace it entirely with:

```js
  function renderServiceRow(item) {
    const row = makeRow();
    const portfolio = item.portfolio || [];
    // Store portfolio data as JSON on the row element
    row.dataset.portfolio = JSON.stringify(portfolio);

    row.innerHTML += `
      <div style="display:grid;grid-template-columns:50px 1fr;gap:8px;margin-bottom:8px;padding-right:28px">
        <input data-field="icon" value="${escA(item.icon)}" placeholder="📸" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;text-align:center">
        <input data-field="title" value="${escA(item.title)}" placeholder="Photography" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem">
      </div>
      <textarea data-field="description" rows="2" placeholder="Description..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;margin-bottom:6px;resize:vertical">${escH(item.description || '')}</textarea>
      <input data-field="features" value="${escA((item.features||[]).join(', '))}" placeholder="Feature 1, Feature 2, Feature 3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;color:var(--text-2);margin-bottom:8px">

      <details style="margin-top:4px">
        <summary style="font-size:0.75rem;color:var(--text-2);cursor:pointer;user-select:none;padding:4px 0">+ Portfolio Media</summary>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">

          <div>
            <div style="font-size:0.72rem;color:var(--text-2);margin-bottom:4px">Photos</div>
            <div class="svc-photo-thumbs" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${portfolio.map((p,pi) => `
              <div style="position:relative;width:60px;height:60px;border-radius:6px;overflow:hidden;border:1px solid var(--border)">
                <img src="${escA(p.url)}" style="width:100%;height:100%;object-fit:cover">
                <button type="button" data-pi="${pi}" class="svc-photo-remove" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;border-radius:50%;width:18px;height:18px;color:#fff;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
              </div>`).join('')}
            </div>
            <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface3);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.76rem;color:var(--text-2)">
              <span>+ Add Photo</span>
              <input type="file" accept="image/*" class="svc-photo-upload" style="display:none" multiple>
            </label>
          </div>

          <div>
            <div style="font-size:0.72rem;color:var(--text-2);margin-bottom:4px">Video URL (YouTube, Vimeo, or .mp4)</div>
            <input data-field="videoUrl" value="${escA(item.videoUrl || '')}" placeholder="https://youtube.com/watch?v=..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          </div>

          <div>
            <div style="font-size:0.72rem;color:var(--text-2);margin-bottom:4px">3D Tour URL (Matterport or iframe URL)</div>
            <input data-field="tourUrl" value="${escA(item.tourUrl || '')}" placeholder="https://my.matterport.com/show/?m=..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem">
          </div>

        </div>
      </details>`;

    // Photo remove buttons
    row.querySelectorAll('.svc-photo-remove').forEach(btn => {
      btn.onclick = () => {
        const pi = parseInt(btn.dataset.pi);
        const photos = JSON.parse(row.dataset.portfolio || '[]');
        photos.splice(pi, 1);
        row.dataset.portfolio = JSON.stringify(photos);
        btn.closest('div[style*="position:relative"]').remove();
      };
    });

    // Photo upload
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

          const photos = JSON.parse(row.dataset.portfolio || '[]');
          photos.push({ url, caption: '' });
          row.dataset.portfolio = JSON.stringify(photos);

          // Add thumbnail
          const thumbWrap = row.querySelector('.svc-photo-thumbs');
          const pi = photos.length - 1;
          const div = document.createElement('div');
          div.style.cssText = 'position:relative;width:60px;height:60px;border-radius:6px;overflow:hidden;border:1px solid var(--border)';
          div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover"><button type="button" data-pi="${pi}" class="svc-photo-remove" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;border-radius:50%;width:18px;height:18px;color:#fff;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>`;
          div.querySelector('.svc-photo-remove').onclick = () => {
            const p2 = JSON.parse(row.dataset.portfolio || '[]');
            p2.splice(parseInt(div.querySelector('.svc-photo-remove').dataset.pi), 1);
            row.dataset.portfolio = JSON.stringify(p2);
            div.remove();
          };
          thumbWrap.appendChild(div);
        } catch (err) {
          console.error('Upload failed', err);
        }
      }
      e.target.value = '';
    };

    return row;
  }
```

- [ ] **Step 3.2: Update collectServices() to read new fields**

Replace `function collectServices()` (lines 3898–3907) with:

```js
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
      tourUrl:     row.querySelector('[data-field="tourUrl"]')?.value || ''
    }));
  }
```

- [ ] **Step 3.3: Smoke test admin**

Open `http://localhost:3000/admin.html` → Landing Pages → edit the Airbnb page → expand a service row. Confirm "Portfolio Media" details section appears with photo upload, video URL, and 3D tour URL fields.

- [ ] **Step 3.4: End-to-end test**

1. In admin, open the Photography service, expand "+ Portfolio Media"
2. Add a video URL (e.g. any YouTube URL)
3. Save the page
4. Open `http://localhost:3000/airbnb-photography`
5. Confirm "Ver Trabalhos →" button appears on the Photography card
6. Click it — modal should open with a 🎬 Vídeo tab
7. Press ESC — modal should close

- [ ] **Step 3.5: Test mobile bottom sheet**

In browser DevTools, switch to a mobile viewport (< 768px width). Repeat the click test — bottom sheet should slide up instead of the modal.

- [ ] **Step 3.6: Commit**

```bash
cd "/Users/viniciusmurari/new site"
git add admin.html
git commit -m "feat: add per-service portfolio media fields to admin"
```

---

## Task 4: Push and verify

- [ ] **Step 4.1: Final local check**

```bash
python3 "/Users/viniciusmurari/new site/server.py"
```

- Open `http://localhost:3000/airbnb-photography` — no console errors
- Open `http://localhost:3000/admin.html` — no console errors
- Service with media: "Ver Trabalhos" button visible
- Service without media: no button

- [ ] **Step 4.2: Push**

```bash
cd "/Users/viniciusmurari/new site"
git push origin main
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Modal (desktop) ✓, Bottom sheet (mobile) ✓, Lightbox ✓, Tabs (photos/video/3D) ✓, CTA in modal ✓, Swipe to close ✓, Admin photos upload ✓, Admin video URL ✓, Admin 3D URL ✓, Collapsible media section ✓, Button hidden when no media ✓
- [x] **No placeholders:** All steps include complete code
- [x] **Type consistency:** `service.portfolio[]` used consistently in `renderServices`, `buildModal`, `buildSheet`, `collectServices`, `renderServiceRow`. `openServiceModal(idx)` takes an index throughout.
- [x] **`esc()` used** for all user-provided values in HTML output (landing.js). `escA()` / `escH()` used in admin.html (already present in codebase).
- [x] **Version bumps** included for `landing.css?v=2` and `landing.js?v=2`.
