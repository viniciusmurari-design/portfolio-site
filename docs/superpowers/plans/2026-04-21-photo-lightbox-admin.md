# Photo Lightbox Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen lightbox modal to the admin photo grid so the photographer can preview, download (original), and permanently delete photos without leaving the gallery.

**Architecture:** Single `#photoLightbox` div added to admin.html. Clicking a `.photo-card` (but not its interactive child buttons) stores the current photo array and index in two module-scope variables, then populates and opens the modal. Navigation arrows, keyboard shortcuts, download via fetch→blob, and delete via the existing `deletePhoto()` function are all handled inside the modal.

**Tech Stack:** Vanilla JS, existing `deletePhoto()` / `sbFetch()` patterns in admin.html.

---

## Task 1: Add HTML modal + CSS

**Files:**
- Modify: `admin.html` — add `#photoLightbox` HTML near other modals, add CSS to `<style>` block

- [ ] **Step 1: Add `#photoLightbox` HTML before `</body>`**

Search for `</body>` at the end of admin.html and insert immediately before it:

```html
<!-- ─── Photo Lightbox ─── -->
<div id="photoLightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
  <button class="lb-close" id="lbClose" aria-label="Close">✕</button>
  <button class="lb-arrow lb-prev" id="lbPrev" aria-label="Previous photo">‹</button>
  <img id="lbImg" class="lb-img" src="" alt="Preview">
  <button class="lb-arrow lb-next" id="lbNext" aria-label="Next photo">›</button>
  <div class="lb-bar">
    <span id="lbFilename" class="lb-filename"></span>
    <div class="lb-actions">
      <button id="lbDownload" class="lb-btn lb-btn-download">⬇ Download</button>
      <button id="lbDelete" class="lb-btn lb-btn-delete">🗑 Excluir</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add CSS to `<style>` block**

Find `.cat-cover-input { width:100%; box-sizing:border-box; }` and add immediately after:

```css
/* ─── Photo Lightbox ──────────────────────────────────────────── */
#photoLightbox {
  display:none; position:fixed; inset:0; z-index:5000;
  background:rgba(0,0,0,0.93);
  align-items:center; justify-content:center; flex-direction:column;
}
#photoLightbox.open { display:flex; }
.lb-img { max-height:85vh; max-width:90vw; object-fit:contain; border-radius:4px; user-select:none; }
.lb-close {
  position:absolute; top:16px; right:20px;
  background:none; border:none; color:#fff; font-size:1.6rem; cursor:pointer; opacity:0.7; line-height:1;
}
.lb-close:hover { opacity:1; }
.lb-arrow {
  position:absolute; top:50%; transform:translateY(-50%);
  background:rgba(255,255,255,0.1); border:none; color:#fff;
  font-size:2.2rem; cursor:pointer; padding:10px 18px; border-radius:8px; transition:background .15s;
}
.lb-arrow:hover { background:rgba(255,255,255,0.22); }
.lb-prev { left:16px; }
.lb-next { right:16px; }
.lb-bar {
  position:absolute; bottom:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 20px; background:rgba(0,0,0,0.65); gap:12px;
}
.lb-filename { font-size:0.78rem; color:rgba(255,255,255,0.55); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.lb-actions { display:flex; gap:10px; flex-shrink:0; }
.lb-btn { padding:7px 16px; border-radius:6px; border:none; font-size:0.78rem; font-weight:600; cursor:pointer; transition:background .15s; }
.lb-btn-download { background:rgba(255,255,255,0.14); color:#fff; }
.lb-btn-download:hover { background:rgba(255,255,255,0.26); }
.lb-btn-delete { background:rgba(210,45,45,0.75); color:#fff; }
.lb-btn-delete:hover { background:rgba(210,45,45,1); }
```

---

## Task 2: Add JavaScript functions

**Files:**
- Modify: `admin.html` — add lightbox JS after the `initCatCovers` IIFE

- [ ] **Step 1: Find anchor for JS insertion**

Search for `// Showreel preview` in admin.html (the line right after `initCatCovers`).

- [ ] **Step 2: Insert lightbox JS immediately before `// Showreel preview`**

```js
// ─── Photo Lightbox ─────────────────────────────────────────────────────────
let _lbPhotos = [];
let _lbIndex  = 0;

function openLightbox(photos, index) {
  _lbPhotos = photos;
  _lbIndex  = index;
  _lbRender();
  document.getElementById('photoLightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('photoLightbox').classList.remove('open');
  document.getElementById('lbImg').src = '';
}

function _lbRender() {
  const photo = _lbPhotos[_lbIndex];
  if (!photo) return;
  document.getElementById('lbImg').src      = photo.url;
  document.getElementById('lbImg').alt      = photo.filename;
  document.getElementById('lbFilename').textContent = photo.filename;
  const multi = _lbPhotos.length > 1;
  document.getElementById('lbPrev').style.display = multi ? '' : 'none';
  document.getElementById('lbNext').style.display = multi ? '' : 'none';
}

function _lbNavigate(dir) {
  _lbIndex = (_lbIndex + dir + _lbPhotos.length) % _lbPhotos.length;
  _lbRender();
}

async function _lbDownload() {
  const photo = _lbPhotos[_lbIndex];
  if (!photo) return;
  const btn = document.getElementById('lbDownload');
  btn.textContent = '...';
  btn.disabled = true;
  try {
    const res  = await fetch(photo.url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = photo.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(e) {
    alert('Download failed: ' + e.message);
  } finally {
    btn.textContent = '⬇ Download';
    btn.disabled = false;
  }
}

(function _initLightbox() {
  const lb = document.getElementById('photoLightbox');
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => _lbNavigate(-1));
  document.getElementById('lbNext').addEventListener('click', () => _lbNavigate(1));
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
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  _lbNavigate(-1);
    if (e.key === 'ArrowRight') _lbNavigate(1);
  });
})();
```

---

## Task 3: Wire click listener in renderGrid()

**Files:**
- Modify: `admin.html` — two edits inside `renderGrid()` / `photos.forEach` loop

- [ ] **Step 1: Store `photo.url` on the card dataset**

Find this exact line in the `photos.forEach` loop (around line 2427):
```js
    card.dataset.publicId  = photo.public_id || '';
```
Add the url dataset line immediately after it:
```js
    card.dataset.publicId  = photo.public_id || '';
    card.dataset.url       = photo.url || '';
```

- [ ] **Step 2: Add click listener after the `.photo-alt-btn` listener block**

Find the block that ends with:
```js
    card.querySelector('.photo-delete').addEventListener('click', e => {
      e.stopPropagation();
      deletePhoto(id, photo.filename, card);
    });
```
Add immediately after it:
```js
    // Lightbox on card click (skip interactive child elements)
    card.addEventListener('click', e => {
      if (e.target.closest('.photo-delete,.photo-alt-btn,.photo-sub-badge,.photo-sub-select,.photo-check,label')) return;
      const allCards = [...document.querySelectorAll('#photoGrid .photo-card')];
      const idx      = allCards.indexOf(card);
      const lbPhotos = allCards.map(c => ({ filename: c.dataset.filename, url: c.dataset.url, publicId: c.dataset.publicId }));
      openLightbox(lbPhotos, idx >= 0 ? idx : 0);
    });
```

---

## Task 4: Verify + commit

- [ ] **Step 1: Open admin, navigate to a gallery with photos, click a photo**

Expected: lightbox opens with full-size image, filename shown at bottom, Download and Excluir buttons visible.

- [ ] **Step 2: Test navigation**

Press `ArrowLeft` / `ArrowRight` or click the `‹` `›` arrows. Expected: photo changes.

- [ ] **Step 3: Test download**

Click ⬇ Download. Expected: browser downloads the file with the original filename.

- [ ] **Step 4: Test close**

Press `ESC` or click the overlay. Expected: lightbox closes.

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat: add photo lightbox to admin — preview, download, delete from full-screen viewer"
```
