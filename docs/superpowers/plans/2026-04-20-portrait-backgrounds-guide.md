# Portrait Backgrounds Guide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "How to Choose Your Background" guide as a blog post + dark editorial journal card + CTA in portrait gallery modal + fix real estate copy.

**Architecture:** Blog post created directly in Supabase `posts` table. Journal card injected at end of `loadJournalPosts()` (always pinned). Portrait CTA banner injected by `openGallery()` when `id === 'portrait'`. CSS added to styles.css.

**Tech Stack:** Vanilla JS, CSS custom properties (Inter + Playfair Display), Supabase REST API

---

### Task 1: Create blog post in Supabase

**Files:**
- Run: Node.js inline script (no file needed)

- [ ] Run the following Node script to insert the post:

```bash
node -e "
const SUPABASE_URL = 'https://buhuwnkljilyysyrdkxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dc31AWiwdbDVgMGXEY4fTg_t2rPBi1G';

const post = {
  slug: 'portrait-studio-backgrounds',
  title: 'How to Choose the Right Background for Your Portrait Session',
  excerpt: 'White, black, brand colour or natural environment — every background tells a completely different story. Here is how to choose the one that is right for you.',
  cover_image: 'https://res.cloudinary.com/dnocmwoub/image/upload/w_1200,h_630,c_fill,q_auto,f_auto/portfolio/lupsia2am7haglugbr5t.jpg',
  status: 'published',
  published_at: new Date().toISOString(),
  body: \`<p>You have confirmed the date, chosen the outfit, and decided on the mood. There is just one question left: <em>what background?</em></p>
<p>It is a detail that gets overlooked, but it shapes everything — the tone, the emotion, the story the image tells. Here is a breakdown of each option and who it suits best.</p>

<h2>White Background</h2>
<p>Clean. Timeless. Professional. The white background is the most versatile option in the studio. It puts the focus entirely on you — your expression, your wardrobe, your presence — with zero distraction.</p>
<p><strong>Best for:</strong> LinkedIn headshots, corporate portraits, medical and legal professionals, actors and models building a portfolio, anyone who needs images that work across multiple contexts. White also gives the most flexibility in post-processing — it is the easiest background to swap digitally if you ever want a different colour later.</p>

<h2>Black Background</h2>
<p>Dramatic. Bold. Editorial. A dark background creates a completely different mood — it draws the light to the subject and gives portraits a cinematic, high-contrast quality that instantly commands attention.</p>
<p><strong>Best for:</strong> Musicians, DJs, artists, creative professionals and anyone building a strong personal brand with a bold, confident image. Black backgrounds work especially well with directional lighting and moody, expressive portraits. If you want your headshot to look like it belongs on a magazine cover, this is your background.</p>

<h2>Brand Colour Background</h2>
<p>This is where your identity becomes part of the image. Using digital colour manipulation, we can place you against any solid colour — your brand colour, the exact hex from your logo, or a tone that matches your website palette perfectly.</p>
<p><strong>Best for:</strong> Entrepreneurs, coaches, consultants, businesses with a strong visual identity. If your brand has a signature colour — terracotta, emerald, deep navy — your portrait can match it exactly. This level of consistency across your website, social media and marketing materials builds instant recognition and professionalism.</p>

<h2>Natural & Environmental Background</h2>
<p>Sometimes the best background is not a background at all — it is a place. A park, a street, a workspace, a landscape. Environmental portraits tell a richer story: who you are <em>and</em> where you belong.</p>
<p>For clients who want something more narrative, we can also create composite images that place you in a specific environment — blending studio precision with location storytelling.</p>
<p><strong>Best for:</strong> Creatives, artists, outdoor brands, anyone who wants portraits that feel lived-in rather than posed. Also ideal for family sessions where a natural setting adds warmth and ease.</p>

<h2>How to Decide</h2>
<p>Not sure where to start? Ask yourself these three questions:</p>
<ul>
  <li><strong>Where will these images live?</strong> Professional profiles lean white; social media and personal branding can go darker or more creative.</li>
  <li><strong>What mood do you want to project?</strong> Approachable and clean, or bold and expressive?</li>
  <li><strong>Do you have a brand palette?</strong> If yes, your portrait should speak the same visual language.</li>
</ul>
<p>During your session we will walk through the options together — and if you are still unsure, we can shoot two or three backgrounds and let you decide when you see the results.</p>
<p>Ready to book? <a href=\"/#contact\">Get in touch</a> and we will find the perfect background for your story.</p>\`
};

fetch(SUPABASE_URL + '/rest/v1/posts', {
  method: 'POST',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  },
  body: JSON.stringify(post)
}).then(r => {
  if (r.ok) console.log('Post created OK');
  else r.text().then(t => console.error('Error:', r.status, t));
}).catch(console.error);
"
```

Expected output: `Post created OK`

---

### Task 2: Add guide card CSS to styles.css

**Files:**
- Modify: `styles.css` — append after `.journal-skeleton` block (around line 1117)

- [ ] Add the following CSS after the last `.journal-*` rule (line 1117 in styles.css):

```css
/* ── Journal Guide Card (dark editorial) ── */
.journal-card--guide {
  background: #1d1d1f;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.journal-card--guide::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at top right, rgba(0,113,227,0.15) 0%, transparent 65%);
  pointer-events: none;
}
.guide-swatches {
  display: flex;
  aspect-ratio: 16/9;
  overflow: hidden;
  flex-shrink: 0;
}
.guide-swatch {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.guide-swatch + .guide-swatch { border-left: 1px solid rgba(255,255,255,0.10); }
.guide-swatch--white  { background: #f5f5f7; }
.guide-swatch--black  { background: #111111; }
.guide-swatch--brand  { background: linear-gradient(160deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); }
.guide-swatch--nature { background: linear-gradient(160deg, #1a3a2a 0%, #2d5a3d 40%, #4a7c5a 100%); }
.guide-swatch-label {
  position: absolute;
  bottom: 7px; left: 0; right: 0;
  text-align: center;
  font-size: 0.5rem; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.65);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}
.guide-swatch--white .guide-swatch-label { color: rgba(0,0,0,0.4); text-shadow: none; }
.journal-card--guide .journal-card-body { background: transparent; }
.journal-card--guide .journal-card-date { color: rgba(0,113,227,0.85); }
.journal-card--guide .journal-card-title { color: #fff; }
.journal-card--guide .journal-card-excerpt { color: rgba(255,255,255,0.52); }
.journal-card--guide .journal-card-cta {
  color: #fff;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.76rem; font-weight: 500;
}
.journal-card--guide .journal-card-cta::after {
  content: '→';
  transition: transform .2s ease;
}
.journal-card--guide:hover .journal-card-cta::after { transform: translateX(3px); }
.journal-card--guide:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.28); }
[data-theme="dark"] .journal-card--guide { background: #111; }

/* ── Portrait gallery guide CTA banner ── */
.gal-bg-guide {
  display: inline-flex; align-items: center; gap: 7px;
  margin-top: 10px;
  font-size: 0.76rem; font-weight: 500;
  color: var(--blue);
  text-decoration: none;
  padding: 6px 12px;
  background: rgba(0,113,227,0.07);
  border-radius: 20px;
  border: 1px solid rgba(0,113,227,0.18);
  transition: background .2s, border-color .2s;
  white-space: nowrap;
}
.gal-bg-guide:hover { background: rgba(0,113,227,0.13); border-color: rgba(0,113,227,0.35); }
.gal-bg-guide svg { flex-shrink: 0; }
```

---

### Task 3: Inject guide card in loadJournalPosts() — script.js

**Files:**
- Modify: `script.js` — inside `loadJournalPosts()`, after `grid.appendChild(card)` loop

- [ ] In `script.js`, find the line `grid.appendChild(card);` inside the `posts.forEach` loop (around line 636). After the closing `});` of that forEach, add the guide card injection:

Replace this block (lines ~618–638):
```js
  grid.innerHTML = '';
  posts.forEach(post => {
    // ... existing card building code ...
    grid.appendChild(card);
  });
```

With:
```js
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
        ${post.cover_image ? `<img src="${post.cover_image}" alt="${post.title}" loading="lazy" decoding="async">` : ''}
      </div>
      <div class="journal-card-body">
        ${date ? `<time class="journal-card-date">${date}</time>` : ''}
        <h3 class="journal-card-title">${post.title}</h3>
        ${post.excerpt ? `<p class="journal-card-excerpt">${post.excerpt}</p>` : ''}
        <span class="journal-card-cta">Read more →</span>
      </div>`;
    grid.appendChild(card);
  });

  // Pinned guide card — always last in the journal grid
  const guideCard = document.createElement('a');
  guideCard.className = 'journal-card journal-card--guide';
  guideCard.href = '/blog-post?slug=portrait-studio-backgrounds';
  guideCard.setAttribute('aria-label', 'Studio Background Guide');
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
```

---

### Task 4: Add portrait gallery CTA banner — script.js

**Files:**
- Modify: `script.js` — inside `openGallery()`, after the `galLandingBtn` block

- [ ] In `script.js`, find the `openGallery` function. After the `if (galLandingBtn) { ... }` block (around line 378), add:

```js
  // Portrait gallery: inject backgrounds guide CTA
  const existingGuideCta = document.getElementById('galBgGuide');
  if (existingGuideCta) existingGuideCta.remove();
  if (id === 'portrait') {
    const guideCta = document.createElement('a');
    guideCta.id = 'galBgGuide';
    guideCta.className = 'gal-bg-guide';
    guideCta.href = '/blog-post?slug=portrait-studio-backgrounds';
    guideCta.setAttribute('target', '_blank');
    guideCta.setAttribute('rel', 'noopener');
    guideCta.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Not sure which background? Read the guide`;
    const countRow = document.querySelector('.gal-count-row');
    if (countRow) countRow.insertAdjacentElement('afterend', guideCta);
  }
```

---

### Task 5: Fix "real estate" copy in services section — index.html

**Files:**
- Modify: `index.html` — Retouching service card description (line 540)

- [ ] In `index.html` line 540, change:
```html
<p>Colour grading, skin retouching, product cleanup and HDR real estate edits.</p>
```
To:
```html
<p>Colour grading, skin retouching, background compositing and creative post-processing.</p>
```

---

### Task 6: Update cache bust versions — index.html

**Files:**
- Modify: `index.html` — `styles.css` and `script.js` version params

- [ ] Find the CSS/JS links in `<head>` and increment:
  - `styles.css?v=32` → `styles.css?v=33`
  - `script.js?v=31` → `script.js?v=32`

---

### Task 7: Commit and push

- [ ] Stage and commit all changes:
```bash
cd "/Users/viniciusmurari/new site"
git add index.html script.js styles.css
git commit -m "feat: portrait backgrounds guide — blog post, dark journal card, gallery CTA (v2.6)"
git push origin main
```
