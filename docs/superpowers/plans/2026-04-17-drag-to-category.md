# Drag Photo to Category — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin users to drag a photo card onto a sidebar category button to move or copy it, with a confirmation modal (Move / Copy / Cancel) and smart delete that only removes from Cloudinary when the last reference is gone.

**Architecture:** All logic lives in `admin.html`'s inline `<style>` and `<script>` blocks. A new `photoDragData` variable tracks when a photo card is being dragged (distinct from the existing `dragSrc` reorder variable and `sidebarDragSrc` sidebar-reorder variable). The sidebar `#catList` receives a `.gallery-drag-active` class during photo drags to activate drop-zone styles on category buttons.

**Tech Stack:** Vanilla JS, HTML5 Drag-and-Drop API, Supabase REST API, existing `sbFetch()` / `toast()` helpers.

---

### Task 1: Add CSS for drag-to-category visual states and modal

**Files:**
- Modify: `admin.html` — inside the `<style>` block, after the existing `.drop-target` rule

- [ ] **Step 1: Find the insertion point**

  Search for `.photo-card.drop-target` in `admin.html`. The new CSS goes immediately after that block.

- [ ] **Step 2: Add the CSS**

  After the `.photo-card.drop-target { ... }` rule, add:

  ```css
  /* ─── Drag photo-to-category states ─── */
  #catList.gallery-drag-active .nav-btn:not(.active) {
    box-shadow: inset 0 0 0 1px rgba(59,130,246,0.35);
    transition: box-shadow 0.15s, background 0.15s;
  }
  .nav-btn.cat-drop-hover {
    box-shadow: inset 0 0 0 2px var(--blue) !important;
    background: rgba(59,130,246,0.18) !important;
    color: #fff !important;
  }

  /* ─── Move/Copy confirmation modal ─── */
  #moveCopyModal {
    display: none; position: fixed; inset: 0; z-index: 4000;
    background: rgba(0,0,0,0.45); align-items: center; justify-content: center;
  }
  #moveCopyModal.open { display: flex; }
  .mc-dialog {
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); padding: 28px 32px; width: 340px;
    max-width: 90vw; text-align: center;
  }
  .mc-dialog h3 { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
  .mc-dialog p  { font-size: 0.82rem; color: var(--text-2); margin-bottom: 24px; }
  .mc-btns { display: flex; flex-direction: column; gap: 10px; }
  .mc-btn-move {
    background: var(--blue); color: #fff; border: none;
    border-radius: var(--radius-sm); padding: 10px 0; font-size: 0.88rem;
    font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .mc-btn-move:hover { background: var(--blue-h); }
  .mc-btn-copy {
    background: transparent; color: var(--blue); border: 1.5px solid var(--blue);
    border-radius: var(--radius-sm); padding: 10px 0; font-size: 0.88rem;
    font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s;
  }
  .mc-btn-copy:hover { background: var(--blue-soft); }
  .mc-btn-cancel {
    background: transparent; color: var(--text-3); border: none;
    font-size: 0.82rem; cursor: pointer; padding: 4px 0;
  }
  .mc-btn-cancel:hover { color: var(--text-2); }
  ```

- [ ] **Step 3: Verify visually (manual)**

  Run `python3 server.py`, open `http://localhost:3000/admin.html`, open the Galleries tab. No visual change expected yet — CSS is inert until classes are applied by JS.

- [ ] **Step 4: Commit**

  ```bash
  cd "/Users/viniciusmurari/new site"
  git add admin.html
  git commit -m "style: add drag-to-category CSS and move/copy modal styles"
  ```

---

### Task 2: Add modal HTML to the page

**Files:**
- Modify: `admin.html` — inside `<div id="app">`, just before `</div>` that closes `#app`

- [ ] **Step 1: Find the insertion point**

  Search for `id="toastContainer"` in admin.html. The modal goes right before that line (both are fixed overlays at the root level of `#app`).

- [ ] **Step 2: Add the modal HTML**

  ```html
  <!-- ─── Move/Copy modal ─── -->
  <div id="moveCopyModal" role="dialog" aria-modal="true" aria-labelledby="mcTitle">
    <div class="mc-dialog">
      <h3 id="mcTitle">Mover ou copiar?</h3>
      <p id="mcSubtitle">para <strong id="mcTargetLabel"></strong></p>
      <div class="mc-btns">
        <button class="mc-btn-move"   id="mcBtnMove">Mover</button>
        <button class="mc-btn-copy"   id="mcBtnCopy">Copiar</button>
        <button class="mc-btn-cancel" id="mcBtnCancel">Cancelar</button>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Verify (manual)**

  Reload admin. No change expected (modal `display:none` by default).

- [ ] **Step 4: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: add move/copy modal HTML"
  ```

---

### Task 3: Add `photoDragData` variable and modal open/close helpers

**Files:**
- Modify: `admin.html` — in the `<script>` block, near the top where `dragSrc` and `sidebarDragSrc` are declared (around line 1731)

- [ ] **Step 1: Add `photoDragData` variable**

  Find this block (around line 1731):
  ```javascript
  let dragSrc = null;
  let sidebarDragSrc = null;
  ```
  Add one line after it:
  ```javascript
  let dragSrc = null;
  let sidebarDragSrc = null;
  let photoDragData = null;   // { publicId, filename, category, url, thumb, card }
  ```

- [ ] **Step 2: Add modal helper functions**

  Find the `// TOAST NOTIFICATIONS` comment block (around line 3454). Just before it, add:

  ```javascript
  // ─────────────────────────────────────────────────────────────────────────────
  // MOVE / COPY MODAL
  // ─────────────────────────────────────────────────────────────────────────────

  let _mcResolve = null;

  function openMoveCopyModal(targetCatLabel) {
    document.getElementById('mcTargetLabel').textContent = targetCatLabel;
    document.getElementById('moveCopyModal').classList.add('open');
    return new Promise(resolve => { _mcResolve = resolve; });
  }

  function closeMoveCopyModal(result) {
    document.getElementById('moveCopyModal').classList.remove('open');
    if (_mcResolve) { _mcResolve(result); _mcResolve = null; }
  }

  document.getElementById('mcBtnMove').addEventListener('click',   () => closeMoveCopyModal('move'));
  document.getElementById('mcBtnCopy').addEventListener('click',   () => closeMoveCopyModal('copy'));
  document.getElementById('mcBtnCancel').addEventListener('click', () => closeMoveCopyModal(null));
  document.getElementById('moveCopyModal').addEventListener('click', e => {
    if (e.target === document.getElementById('moveCopyModal')) closeMoveCopyModal(null);
  });
  ```

- [ ] **Step 3: Verify (manual)**

  Open browser console on admin.html. Run:
  ```javascript
  openMoveCopyModal('Wedding').then(r => console.log('result:', r));
  ```
  Modal should appear. Click each button — console should log `move`, `copy`, or `null`. Modal should close each time.

- [ ] **Step 4: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: add photoDragData variable and move/copy modal helpers"
  ```

---

### Task 4: Activate sidebar drop zones on photo card dragstart/dragend

**Files:**
- Modify: `admin.html` — inside `renderGrid()`, the `dragstart` and `dragend` event listeners on photo cards (around lines 2288–2296)

- [ ] **Step 1: Find the existing dragstart/dragend block**

  Locate this exact code (inside `renderGrid`):
  ```javascript
  // Drag-to-reorder
  card.addEventListener('dragstart', e => {
    dragSrc = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.photo-card').forEach(c => c.classList.remove('drop-target'));
  });
  ```

- [ ] **Step 2: Replace with enhanced version**

  ```javascript
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
    // Activate sidebar drop zones
    document.getElementById('catList').classList.add('gallery-drag-active');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.photo-card').forEach(c => c.classList.remove('drop-target'));
    // Clear sidebar drop zones
    photoDragData = null;
    document.getElementById('catList').classList.remove('gallery-drag-active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('cat-drop-hover'));
  });
  ```

- [ ] **Step 3: Verify (manual)**

  Reload admin, open Galleries. Start dragging a photo. While dragging, the sidebar category buttons should glow with a blue outline. Release the photo anywhere (not on a category) — glow should disappear. No functionality change yet.

- [ ] **Step 4: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: activate sidebar drop zones when dragging a photo card"
  ```

---

### Task 5: Wire up drop on sidebar category buttons

**Files:**
- Modify: `admin.html` — inside `buildSidebar()`, the existing `dragover`/`dragleave`/`drop` listeners on `btn` (around lines 2117–2131)

- [ ] **Step 1: Find the existing listeners**

  Locate this exact block inside `buildSidebar()`:
  ```javascript
  btn.addEventListener('dragover', e => { e.preventDefault(); btn.classList.add('drag-over'); });
  btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
  btn.addEventListener('drop', e => {
    e.preventDefault(); btn.classList.remove('drag-over');
    if (sidebarDragSrc && sidebarDragSrc !== id) {
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
  ```

- [ ] **Step 2: Replace with version that handles both photo drops and sidebar reorder**

  ```javascript
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
  btn.addEventListener('drop', async e => {
    e.preventDefault();
    btn.classList.remove('drag-over');
    btn.classList.remove('cat-drop-hover');

    if (photoDragData && id !== current) {
      // Photo-to-category drop
      const data = photoDragData;
      photoDragData = null;
      document.getElementById('catList').classList.remove('gallery-drag-active');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('cat-drop-hover'));

      const targetCat = CATEGORIES.find(c => c.id === id);
      const targetLabel = targetCat ? targetCat.label : id;
      const action = await openMoveCopyModal(targetLabel);

      if (action === 'move') {
        await movePhoto(data, id, targetLabel);
      } else if (action === 'copy') {
        await copyPhoto(data, id, targetLabel);
      }
      // null = cancel, do nothing

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
  ```

- [ ] **Step 3: Verify (manual)**

  Drag a photo over a sidebar category button — it should show a solid blue outline (`.cat-drop-hover`). Release — the modal should appear with the target category name and Move/Copy/Cancel. Clicking Cancel should close modal with no changes. Sidebar reorder (dragging a category button) should still work as before.

- [ ] **Step 4: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: wire sidebar category buttons as photo drop targets"
  ```

---

### Task 6: Implement `movePhoto()`

**Files:**
- Modify: `admin.html` — add function near `deletePhoto()` (around line 2363, after its closing brace)

- [ ] **Step 1: Add `movePhoto()` function**

  After the closing `}` of `deletePhoto()`, add:

  ```javascript
  async function movePhoto(data, newCatId, newCatLabel) {
    if (!data.publicId) { toast('Cannot move: no public ID', 'error'); return; }
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
      setTimeout(() => { data.card.remove(); loadPhotos(data.category); }, 230);

      toast(`Movido para ${newCatLabel} ✓`, 'success');
    } catch(err) {
      console.error('movePhoto error', err);
      toast('Erro ao mover foto', 'error');
    }
  }
  ```

- [ ] **Step 2: Verify (manual)**

  Drag a photo onto a different category, click **Mover**. The card should fade out. Navigate to the target category — the photo should appear there. Navigate back to the source category — the photo should be gone.

- [ ] **Step 3: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: implement movePhoto — PATCH Supabase category and remove card from grid"
  ```

---

### Task 7: Implement `copyPhoto()`

**Files:**
- Modify: `admin.html` — add function right after `movePhoto()`

- [ ] **Step 1: Add `copyPhoto()` function**

  ```javascript
  async function copyPhoto(data, newCatId, newCatLabel) {
    if (!data.publicId) { toast('Cannot copy: no public ID', 'error'); return; }
    try {
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
  ```

- [ ] **Step 2: Verify (manual)**

  Drag a photo onto a different category, click **Copiar**. The card should STAY in the source category. Navigate to the target category — the photo should appear there too. Both categories should now show the photo.

- [ ] **Step 3: Commit**

  ```bash
  git add admin.html
  git commit -m "feat: implement copyPhoto — POST new Supabase row with same Cloudinary asset"
  ```

---

### Task 8: Fix `deletePhoto()` — reference-counting before Cloudinary delete

**Files:**
- Modify: `admin.html` — `deletePhoto()` function (around line 2326)

- [ ] **Step 1: Find the current delete logic**

  Locate the two blocks inside `deletePhoto()`:
  ```javascript
  // Delete from Supabase (metadata)
  if (publicId) {
    try {
      await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}`, { method: 'DELETE' });
    } catch(e) { console.error('Supabase delete failed', e); }
  }

  // Delete from Cloudinary (actual file) — requires ADMIN_TOKEN env var on Cloudflare
  if (publicId) {
    try {
      await fetch('/api/delete-photo', { ... });
    } catch(e) { console.error('Cloudinary delete failed', e); }
  }
  ```

- [ ] **Step 2: Replace both blocks with reference-counting version**

  ```javascript
  // Reference-counted delete: only remove from Cloudinary if this is the last reference
  if (publicId) {
    try {
      // Count how many categories use this asset
      const countRes = await sbFetch(`/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&select=id`);
      const refs = countRes.ok ? (await countRes.json()) : [];
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
        // Only delete THIS category's Supabase row — keep Cloudinary file
        await sbFetch(
          `/rest/v1/photos?public_id=eq.${encodeURIComponent(publicId)}&category=eq.${encodeURIComponent(cat)}`,
          { method: 'DELETE' }
        );
      }
    } catch(e) { console.error('Delete failed', e); }
  }
  ```

- [ ] **Step 3: Verify single-reference delete (manual)**

  Pick a photo that exists only in ONE category. Delete it from admin. It should disappear from both the grid and Cloudinary (check Cloudinary dashboard or try loading the URL directly — should 404).

- [ ] **Step 4: Verify multi-reference delete (manual)**

  Copy a photo to another category (using Task 7). Then delete it from one category. It should disappear from that category's grid but still be visible in the other category. The Cloudinary file should still load.

- [ ] **Step 5: Commit**

  ```bash
  git add admin.html
  git commit -m "fix: smart delete — only remove Cloudinary file when last Supabase reference is gone"
  ```

---

### Task 9: Increment version and push

**Files:**
- Modify: `admin.html` — version number in sidebar footer

- [ ] **Step 1: Find and bump the version**

  Search for `v1.9` in `admin.html`. Change it to `v2.0`.

- [ ] **Step 2: Final smoke test (manual)**

  1. Open `http://localhost:3000/admin.html`, open Galleries tab.
  2. Drag a photo — sidebar category buttons glow blue.
  3. Drop on a different category — modal appears with target name.
  4. Click **Mover** — card fades out, photo is in new category.
  5. Drag a photo, drop on a category, click **Copiar** — card stays, photo appears in both.
  6. Delete a copied photo from one category — disappears from that category only.
  7. Delete it from remaining category — Cloudinary file removed.
  8. Sidebar reorder (drag category button up/down) still works normally.
  9. Cancelling the modal leaves everything unchanged.

- [ ] **Step 3: Commit and push**

  ```bash
  git add admin.html
  git commit -m "feat: drag photo to category with move/copy/smart-delete (v2.0)"
  git push origin main
  ```
