# Drag Photo to Category — Design Spec
Date: 2026-04-17

## Overview
Allow admin users to drag a photo card from the gallery grid and drop it onto a sidebar category button to move or copy the photo to that category.

## User Flow

1. User begins dragging a `.photo-card` in the admin gallery grid.
2. Sidebar enters **drop-ready mode**: all category buttons except the currently active one display a blue glow/highlight, signalling they are valid drop targets.
3. Hovering over a category button applies a solid blue border + label "Soltar aqui" on that button.
4. Dropping on a category button opens a **confirmation modal**:
   > **Mover ou copiar para [Category Label]?**
   > [Mover] [Copiar] [Cancelar]
5. **Mover**: updates the Supabase row's `category` field to the new category, removes the card from the current grid.
6. **Copiar**: inserts a new Supabase row with the same Cloudinary data (url, thumb, public_id) and the new category. The card stays in the current grid.
7. **Cancelar**: clears all visual state, no data changes.
8. On success: toast notification — "Movido para [Label] ✓" or "Copiado para [Label] ✓".
9. On error: toast "Erro ao mover foto", card stays in place.

## Components

### 1. Drag Events on Photo Cards
- `dragstart`: store `dragData = { publicId, filename, category, url, thumb }` and add class `.gallery-drag-active` to the sidebar element.
- `dragend`: remove `.gallery-drag-active` from sidebar and `.drop-hover` from all category buttons (cleanup in case modal was cancelled or drop missed).

### 2. Drop Zones on Sidebar Category Buttons
- Add `dragover` listener to each `.cat-btn` (non-active): prevent default, apply `.drop-hover` class.
- Add `dragleave` listener: remove `.drop-hover` class.
- Add `drop` listener: prevent default, capture target category id/label, open confirmation modal.
- The active/current category button is NOT a valid drop target (dropping on same category does nothing).

### 3. Visual Feedback (CSS)
```
.cat-sidebar.gallery-drag-active .cat-btn:not(.active) {
  /* subtle blue glow to signal droppable */
  box-shadow: 0 0 0 2px rgba(59,130,246,0.35);
  transition: box-shadow 0.15s;
}
.cat-btn.drop-hover {
  box-shadow: 0 0 0 2px #3b82f6;
  outline: none;
  /* show "Soltar aqui" label via ::after pseudo-element */
}
```

### 4. Confirmation Modal
- Small modal (not full-screen overlay) centred on screen.
- Title: "Mover ou copiar para [Category Label]?"
- Three buttons: **Mover** (primary/blue), **Copiar** (secondary/outline), **Cancelar** (ghost).
- Closes on Cancelar or after action completes.

### 5. Supabase Operations

**Move:**
```
PATCH /rest/v1/photos?public_id=eq.{publicId}
Body: { "category": "{newCategoryId}" }
```
After success: remove photo card from DOM.

**Copy:**
```
POST /rest/v1/photos
Body: { category, filename, url, thumb, public_id }
  where category = newCategoryId, all others from dragData
```
After success: card stays in current grid.

### 6. Smart Delete (reference counting)
Before deleting any photo from Cloudinary, check how many Supabase rows share the same `public_id`:
```
GET /rest/v1/photos?public_id=eq.{publicId}&select=id
```
- Count > 1 → delete only the Supabase row for the current category (`DELETE /rest/v1/photos?public_id=eq.{publicId}&category=eq.{currentCategory}`). Cloudinary file is preserved.
- Count == 1 → delete Supabase row AND Cloudinary file (existing behaviour via `/api/delete-photo`).

## Data Flow Summary

```
dragstart → dragData stored, sidebar activates drop-ready state
    ↓
dragover sidebar btn → .drop-hover applied
    ↓
drop on btn → modal opens (Mover / Copiar / Cancelar)
    ↓
Mover confirmed → PATCH Supabase category → remove card from DOM → toast
Copiar confirmed → POST Supabase new row (same Cloudinary asset) → toast
Cancelar → clear classes, no change
```

## Error Handling
- On Supabase PATCH/POST failure: show toast "Erro ao mover foto", card stays in place, no DOM change.
- Drag to same active category: drop listener is not attached; no action.
- Dropping outside any category button: `dragend` fires, clears state naturally.

## Out of Scope
- Undo/redo of move/copy action.
- Visual indicator on card showing it exists in multiple categories (deferred).
- Drag multiple selected photos at once (deferred).

## Files to Change
- `admin.html` — all logic lives inline in the `<script>` block at the bottom of the file.
  - Add CSS for `.gallery-drag-active`, `.drop-hover` states.
  - Add `dragstart`/`dragend` to existing `renderGrid()` photo card creation.
  - Add `dragover`/`dragleave`/`drop` to sidebar category buttons in `renderSidebar()` / `switchCategory()`.
  - Add confirmation modal HTML + open/close logic.
  - Modify existing delete function to do reference-count check before removing Cloudinary file.
