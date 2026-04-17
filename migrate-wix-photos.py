#!/usr/bin/env python3
"""
Migrate ALL wixstatic.com photos across every landing page to Cloudinary.

Usage:
    python3 migrate-wix-photos.py

What it does:
  For every landing page in settings.json (family, events, portrait, etc),
  finds any wixstatic.com URL in hero / services / portfolio / beforeAfter
  and re-uploads it to Cloudinary under portfolio/{slug}/. Then replaces
  the URL in settings.json.

Idempotent. Safe to re-run. After it finishes:
    git add settings.json && git commit -m "..." && git push origin main
"""

import json
import urllib.request
import urllib.parse
import re
import ssl
import sys

CLOUDINARY_CLOUD = 'dnocmwoub'
UPLOAD_PRESET = 'portfolio_upload'
UPLOAD_URL = f'https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD}/image/upload'

# macOS Python often ships without system CAs; use certifi's bundle when available.
try:
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CTX = ssl.create_default_context()


def clean_wix_url(url: str) -> str:
    """Strip the Wix resize transformation so we fetch the original file."""
    m = re.match(r'(https://static\.wixstatic\.com/media/[^/]+)', url)
    return m.group(1) if m else url


def upload_to_cloudinary(image_url: str, folder: str) -> str:
    """Upload a remote image URL to Cloudinary. Returns secure_url."""
    clean = clean_wix_url(image_url)
    data = urllib.parse.urlencode({
        'file': clean,
        'upload_preset': UPLOAD_PRESET,
        'folder': folder,
    }).encode('utf-8')
    req = urllib.request.Request(UPLOAD_URL, data=data, method='POST')
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as resp:
        result = json.loads(resp.read())
    return result['secure_url']


def migrate():
    with open('settings.json', 'r', encoding='utf-8') as f:
        d = json.load(f)

    total_migrated = 0
    total_skipped = 0
    total_failed = 0

    for lp in d.get('landingPages', []):
        if not lp.get('active'):
            continue
        slug = lp.get('slug', 'misc')
        folder = f'portfolio/{slug.replace("-photography", "")}'
        print(f"\n=== {slug} ===")

        migrated, skipped, failed = 0, 0, 0

        def process(url_getter, url_setter, label):
            nonlocal migrated, skipped, failed
            url = url_getter()
            if not url or 'wixstatic.com' not in url:
                skipped += 1
                return
            try:
                new = upload_to_cloudinary(url, folder)
                url_setter(new)
                migrated += 1
                print(f"  OK   {label}")
            except Exception as e:
                failed += 1
                print(f"  FAIL {label}: {e}")

        # Hero fallback image
        hero = lp.get('hero', {})
        process(
            lambda: hero.get('image', ''),
            lambda u: hero.__setitem__('image', u),
            'hero image'
        )

        # Hero slides
        for i, slide in enumerate(hero.get('slides', [])):
            process(
                lambda s=slide: s.get('url', ''),
                lambda u, s=slide: s.__setitem__('url', u),
                f'hero slide {i+1}'
            )

        # Service portfolios
        for svc in lp.get('services', []):
            title = svc.get('title', '?')
            for j, photo in enumerate(svc.get('portfolio', [])):
                process(
                    lambda p=photo: p.get('url', ''),
                    lambda u, p=photo: p.__setitem__('url', u),
                    f'{title} #{j+1}'
                )

        # Before/After pairs
        for j, pair in enumerate(lp.get('beforeAfter', [])):
            process(
                lambda p=pair: p.get('before', ''),
                lambda u, p=pair: p.__setitem__('before', u),
                f'B/A {j+1} before'
            )
            process(
                lambda p=pair: p.get('after', ''),
                lambda u, p=pair: p.__setitem__('after', u),
                f'B/A {j+1} after'
            )

        # Page-level portfolio array
        for j, photo in enumerate(lp.get('portfolio', [])):
            process(
                lambda p=photo: p.get('url', ''),
                lambda u, p=photo: p.__setitem__('url', u),
                f'portfolio #{j+1}'
            )

        print(f"  → migrated: {migrated}, skipped: {skipped}, failed: {failed}")
        total_migrated += migrated
        total_skipped += skipped
        total_failed += failed

    with open('settings.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 50)
    print(f"TOTAL migrated: {total_migrated}   skipped: {total_skipped}   failed: {total_failed}")
    if total_migrated:
        print()
        print("Next step:")
        print("  git add settings.json")
        print('  git commit -m "feat: migrate wix photos to cloudinary"')
        print("  git push origin main")


if __name__ == '__main__':
    migrate()
