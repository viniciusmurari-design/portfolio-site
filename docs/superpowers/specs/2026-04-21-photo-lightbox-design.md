# Photo Lightbox — Admin Viewer Design

**Date:** 2026-04-21  
**Status:** Approved

---

## Goal

Add a lightbox modal to the admin photo grid so the photographer can preview photos full-size, download the original, and permanently delete them (including from Cloudinary) without leaving the gallery management view.

---

## Trigger

Clicking anywhere on a `.photo-card` element opens the lightbox, **except** when the click target is one of the existing interactive child elements: `.photo-delete` (×), `.photo-alt-btn` (ALT), `.photo-sub-badge`, `.photo-sub-select`, `.photo-check` (batch checkbox). This prevents accidental lightbox opens when using existing controls.

---

## Modal Structure

Single `<div id="photoLightbox">` added to `admin.html` body. Always present in DOM, toggled with an `.open` class.

```
┌─────────────────────────────────────────┐
│  ✕                                      │  ← close button (top-right)
│                                         │
│       ‹    [ IMAGE ]    ›               │  ← nav arrows + image
│                                         │
│  filename.jpg        [Download] [Delete]│  ← bottom bar
└─────────────────────────────────────────┘
```

- **Overlay:** Fixed full-screen, dark semi-transparent background. Click outside image closes.
- **Image:** `max-height: 85vh; max-width: 90vw; object-fit: contain`. Uses `photo.url` directly (full Cloudinary URL, no crop transforms).
- **Navigation arrows:** `‹` and `›` buttons on left/right edges. Hidden when only 1 photo in gallery.
- **Bottom bar:** Filename (left) + Download and Delete buttons (right).
- **Close button:** Fixed top-right corner, `✕`.

---

## Keyboard & Accessibility

- `ESC` closes lightbox
- `ArrowLeft` / `ArrowRight` navigate
- Overlay background click closes
- `aria-modal="true"`, `role="dialog"` on container
- Focus trapped inside while open

---

## Download

Cloudinary URLs support `fl_attachment` flag to force browser download. The download button constructs the URL by inserting `fl_attachment` into the Cloudinary transformation string:

- Input URL: `https://res.cloudinary.com/dnocmwoub/image/upload/q_auto,f_auto/portfolio/...`
- Download URL: `https://res.cloudinary.com/dnocmwoub/image/upload/fl_attachment/portfolio/...` (strip existing transforms, add `fl_attachment`)

Use `fetch(url) → blob → URL.createObjectURL → <a download>` to trigger native file download with the original filename.

For videos, download the `.url` directly (same pattern).

---

## Delete

Calls the existing `deletePhoto(cat, filename, card)` function unchanged. Existing behavior:
- If photo has only 1 Supabase reference: deletes from Supabase + Cloudinary via `POST /api/delete-photo`
- If photo has multiple references: deletes only the current category's Supabase row (keeps Cloudinary file)

After deletion:
- If more photos remain in gallery: advance to next photo (wrap to previous if it was the last)
- If no photos remain: close lightbox

---

## JavaScript Functions

### `openLightbox(photos, index)`
- `photos`: current gallery's photo array (same array used by `renderGrid()`)
- `index`: index of clicked photo in that array
- Stores `currentLightboxPhotos` and `currentLightboxIndex` in module-scope vars
- Populates image src, filename, sets arrow visibility
- Adds `.open` class to `#photoLightbox`

### `closeLightbox()`
- Removes `.open` class
- Clears image src to free memory

### `navigateLightbox(direction)` (+1 / -1)
- Updates index, calls `openLightbox` with same array and new index

### `downloadLightboxPhoto()`
- Constructs `fl_attachment` URL from current photo's `.url`
- Fetches as blob, triggers download with `photo.filename`

### Integration with `renderGrid()`
- After creating each card, add click listener that calls `openLightbox(currentPhotos, i)`
- Skip open if click target matches interactive child selectors

---

## CSS (added to existing `<style>` block)

~35 lines covering:
- `#photoLightbox`: fixed, full-screen, z-index 5000, hidden by default, flex centering
- `#photoLightbox.open`: visible
- `.lb-img`: max dimensions, object-fit contain, pointer-events none
- `.lb-close`, `.lb-arrow`: button styles
- `.lb-bar`: bottom info/action bar
- `.lb-btn-download`, `.lb-btn-delete`: action button styles

---

## Files Changed

- `admin.html`: HTML for `#photoLightbox` modal + CSS additions + JS functions + click listener in `renderGrid()`

No other files need changes.

---

## Out of Scope

- Zoom/pan on image
- Edit metadata from lightbox
- Lightbox on the main portfolio site (visitors)
