# Security Hardening Checklist

This document explains the security model and the manual steps required outside this repository to keep the site safe in production.

---

## 1. Cloudinary unsigned upload preset (CRITICAL — manual step required)

The admin panel uploads images directly from the browser using an **unsigned** Cloudinary preset (`portfolio_upload`, cloud `dnocmwoub`). The preset name is visible in the page source — anyone who finds it can POST uploads to your Cloudinary account.

To stop abuse you **must** harden the preset in the Cloudinary dashboard:

1. Sign in at https://cloudinary.com/console.
2. Go to **Settings → Upload → Upload presets**.
3. Click `portfolio_upload`.
4. Apply ALL of the following:

   | Setting | Value | Why |
   |---|---|---|
   | **Mode** | Unsigned | (required for browser uploads) |
   | **Folder** | `portfolio` | Limits writes to this folder only |
   | **Use filename** | OFF | Prevents predictable names |
   | **Unique filename** | ON | Avoids overwriting existing assets |
   | **Allowed formats** | `jpg,jpeg,png,webp,heic,mp4,mov,webm` | Blocks `.exe`, `.svg`, `.html` |
   | **Max image file size** | `25 MB` | Stops huge uploads draining quota |
   | **Max video file size** | `200 MB` | Same for video |
   | **Max image width / height** | `6000` | Prevents giant decompression bombs |
   | **Image moderation** | `aws_rek` (or `manual`) | Auto-flags adult / illegal content |
   | **Tags** | `portfolio,public-upload` | Lets you bulk-clean abusive uploads |
   | **Notification URL** | (your webhook, optional) | Real-time abuse alerts |

5. **Save.**

Without these settings a single bad actor can fill your free 25 GB quota in minutes or upload illegal content tied to your account.

---

## 2. Admin password (PBKDF2, client-side)

The admin login uses **PBKDF2-SHA256, 200 000 iterations, 16-byte random salt** stored in `localStorage`. The legacy SHA-256 hash is kept as a fallback for first login and is **automatically upgraded** the first time you log in successfully.

### Strong-password rules

- Minimum **12 characters** (enforced by the change-password UI).
- Use a passphrase: `four-random-words-stapler-correct-horse-battery`.
- Change the password **immediately** after first deploy via the admin panel.

### Threat model

Client-side PBKDF2 is good against offline brute-force after someone steals the hash. It is **not** a defence against:

- Someone who already has admin access (XSS, stolen device).
- Server-side attacks (none here — admin is static HTML).

For higher assurance, move the auth check to a Cloudflare Pages Function that validates a server-side bcrypt hash from `env.ADMIN_PASSWORD_HASH`.

---

## 3. Web3Forms key

Stored in `settings.json` and embedded in the contact form `<input name="access_key">`. **This is by design** — Web3Forms keys are public by nature; they identify the destination inbox, not authenticate it. Web3Forms rate-limits per key.

To rotate: get a new key at https://web3forms.com → paste in admin → Social & Integrations → save.

---

## 4. GitHub token (admin → Push to GitHub feature)

If you fill in `githubToken` in the admin panel, it is stored in `localStorage` in plaintext. **Treat your browser as the trust boundary.**

### Safer alternative

Don't put the token in the admin. Instead:

```bash
# Locally only
git add -A && git commit -m "..." && git push
```

If the GitHub-from-admin feature stays, the token MUST be a fine-grained PAT scoped to the single repo, with `contents:write` only — nothing else.

---

## 5. Supabase keys

The `sb_publishable_*` key is **publishable by design** (Supabase calls it "anon key" in older docs). It is safe to ship in client code — Row Level Security on the database is what actually protects data.

### RLS policies you MUST verify in the Supabase dashboard

| Table | Anon SELECT | Anon INSERT | Anon UPDATE | Anon DELETE |
|---|---|---|---|---|
| `photos` | ✅ Public read | ❌ Block | ❌ Block | ❌ Block |
| `site_settings` | ✅ Public read | ❌ Block | ❌ Block | ❌ Block |
| `posts` | ✅ where status='published' | ❌ Block | ❌ Block | ❌ Block |

If anon INSERT/UPDATE/DELETE is open on these tables, anyone can scrape the publishable key from this site and **rewrite your portfolio**.

To verify: Supabase dashboard → Authentication → Policies → check each table.

---

## 6. CSP & response headers

Configured in `_headers` (read by Cloudflare Pages):

- **Strict CSP** with explicit allow-lists for Cloudinary, Supabase, Web3Forms, YouTube, Vimeo, Google Maps, Google Analytics.
- **HSTS** (`max-age=63072000; includeSubDomains`) on every response.
- **CORS on `/api/*`** restricted to `https://viniciusmurari.com`.

---

## 7. Privacy & GDPR (you are Dublin-based — EU)

The site collects:

- Form submissions via **Web3Forms** (name, email, message)
- **Google Analytics 4** — but only after the visitor clicks "Accept" on the cookie banner. Configured with `anonymize_ip`, no Google Signals, no ad personalization.
- Photos uploaded by you only

**Already in place:**

1. `/privacy.html` lists every third-party processor.
2. **Consent banner** (`script.js`) — never shows if you leave the GA Measurement ID empty in admin. If you paste a GA ID, the banner appears once per visitor; their choice is remembered in `localStorage`.
3. If a visitor rejects, GA is not loaded at all (no cookies, no requests).

---

## 8. Quarterly review checklist

- [ ] Rotate admin password.
- [ ] Verify Cloudinary preset still has all hardening.
- [ ] Verify Supabase RLS policies still block anon writes.
- [ ] Check Cloudinary usage dashboard for unusual upload spikes.
- [ ] `gh secret list` (if using GitHub Actions) — rotate any > 90 days old.
- [ ] Re-run `npm audit` / dependency scan (no current dependencies, but check `functions/`).
- [ ] Lighthouse Best Practices score still ≥ 90.
