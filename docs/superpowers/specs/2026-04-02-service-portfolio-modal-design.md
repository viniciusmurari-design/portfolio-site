# Service Portfolio Modal — Design Spec
**Date:** 2026-04-02
**Status:** Approved
**Scope:** Landing page (`landing.html` / `landing.js` / `landing.css`) + Admin panel (`admin.html`)

---

## Overview

Each service card on the landing page gains a "Ver Trabalhos" button. Clicking it opens a portfolio showcase specific to that service, with different UI depending on screen size:

- **Desktop (≥768px):** centered modal with dark overlay
- **Mobile (<768px):** bottom sheet that slides up from the bottom

The same click handler detects screen width and renders the appropriate pattern automatically.

---

## Data Model Changes

Each service object in `landingPages[].services[]` gains three new optional fields:

```json
{
  "icon": "📸",
  "title": "Photography",
  "description": "...",
  "features": ["..."],
  "portfolio": [
    { "url": "https://res.cloudinary.com/...", "caption": "Living room" }
  ],
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "tourUrl": "https://my.matterport.com/show/?m=..."
}
```

- `portfolio` — array of `{ url, caption }` objects. Empty array = tab hidden.
- `videoUrl` — YouTube, Vimeo, or direct video URL. Empty = tab hidden.
- `tourUrl` — Matterport or any iframe-embeddable URL. Empty = tab hidden.

If a service has no portfolio, videoUrl, or tourUrl, the "Ver Trabalhos" button is not rendered.

---

## UI — Desktop Modal

### Structure
```
┌─────────────────────────────────────────┐
│ [icon] SERVICE TITLE          [12 items] [✕] │
├─────────────────────────────────────────┤
│ [📷 Fotos] [🎬 Vídeo] [🏠 3D Tour]      │
├─────────────────────────────────────────┤
│                                         │
│  [photo] [photo] [photo]                │
│  [photo] [photo] [photo]   ← grid       │
│                                         │
├─────────────────────────────────────────┤
│        [Solicitar Orçamento]            │
└─────────────────────────────────────────┘
```

- Max width: 760px, max height: 85vh, scrollable body
- Dark overlay (`rgba(0,0,0,0.8)`) behind modal
- Close: ✕ button, ESC key, or clicking overlay
- Tabs only shown for available content (photos/video/3D)
- Photo grid: 3 columns, `aspect-ratio:1`, click opens lightbox
- Video tab: YouTube/Vimeo iframe embed, or `<video>` for direct URLs
- 3D Tour tab: iframe embed (Matterport) or external link button if iframe not allowed
- CTA button at bottom: links to `#lp-contact`

### Lightbox (within modal)
- Clicking a photo darkens the modal and shows the full image centered
- Left/right arrows to navigate, ESC or click outside to close
- Accessible: `aria-label`, keyboard navigation

---

## UI — Mobile Bottom Sheet

### Structure
```
┌──────────────────┐
│   [drag handle]  │
│ 📸 PHOTOGRAPHY ✕ │
├──────────────────┤
│ [→ photo scroll] │  ← horizontal scroll
├──────────────────┤
│ [🎬 Vídeo] [🏠 3D]│
├──────────────────┤
│ [Solicitar Orçamento] │
└──────────────────┘
```

- Slides up from bottom with CSS transition (`transform: translateY`)
- Rounded top corners (`border-radius: 20px 20px 0 0`)
- Drag handle pill at top (visual only, swipe-down gesture closes)
- Photos in horizontal scroll row (`overflow-x: auto`, `scroll-snap-type: x mandatory`)
- Video and 3D Tour as full-width buttons that open in new tab / expand inline
- CTA fixed at bottom
- Backdrop: semi-transparent overlay behind sheet, tap to close
- Swipe down gesture: closes sheet when drag distance > 80px

---

## Behaviour

| Action | Desktop | Mobile |
|--------|---------|--------|
| Click "Ver Trabalhos" | Open modal | Open bottom sheet |
| Click overlay/backdrop | Close | Close |
| Press ESC | Close | — |
| Swipe down | — | Close |
| Click photo | Open lightbox | Open lightbox (fullscreen) |
| Click CTA | Scroll to #lp-contact, close | Scroll to #lp-contact, close |
| Tab switch | Show photos/video/3D inline | Show video/3D as expandable |

---

## Admin Changes

In `admin.html`, the service repeater row for each landing page gains three new fields below the existing `features` list:

1. **Portfolio Photos** — multi-photo upload (same Cloudinary unsigned upload as elsewhere). Shows thumbnails, remove button per photo.
2. **Video URL** — text input. Accepts YouTube, Vimeo, or direct `.mp4` URL.
3. **3D Tour URL** — text input. Accepts Matterport or any iframe URL.

These fields are collapsible ("+ Add Portfolio Media") to keep the admin clean when not in use.

---

## Implementation Files

| File | Changes |
|------|---------|
| `landing.js` | `renderServices()` adds "Ver Trabalhos" button; new `openServiceModal(service)` function; modal/sheet HTML generation; lightbox; swipe handler; tab switching |
| `landing.css` | `.lp-modal`, `.lp-modal-overlay`, `.lp-bottom-sheet`, `.lp-sheet-backdrop`, `.lp-lightbox`, tab styles, animations |
| `admin.html` | Service repeater row gains portfolio photos uploader + videoUrl + tourUrl fields; `collectServices()` updated to include new fields |
| `settings.json` | No structural change needed — new fields are just added to existing service objects when saved from admin |

---

## Out of Scope

- No changes to `index.html`, `script.js`, or `styles.css`
- No new API endpoints or Cloudinary functions needed
- No changes to `_redirects` or `_headers`
