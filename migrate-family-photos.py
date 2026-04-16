#!/usr/bin/env python3
"""
Migrate family photography photos from Wix (old site) to Cloudinary.

Usage:
    python3 migrate-family-photos.py

What it does:
  1. Reads settings.json
  2. For every wixstatic.com URL in the family-photography landing page,
     uploads it to Cloudinary under portfolio/family/
  3. Replaces the URL in settings.json with the Cloudinary URL
  4. Saves settings.json

Idempotent: re-running only processes URLs that still point to wixstatic.com.
After it finishes, commit + push settings.json.
"""

import json
import urllib.request
import urllib.parse
import re
import sys

CLOUDINARY_CLOUD = 'dnocmwoub'
UPLOAD_PRESET = 'portfolio_upload'
FOLDER = 'portfolio/family'
UPLOAD_URL = f'https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD}/image/upload'

def clean_wix_url(url: str) -> str:
    """Strip Wix resize transformation so we fetch the original high-res file."""
    # Wix pattern: https://static.wixstatic.com/media/FILE.jpg/v1/fill/w_...
    # Base URL (original) is everything before /v1/fill/...
    m = re.match(r'(https://static\.wixstatic\.com/media/[^/]+)', url)
    return m.group(1) if m else url

def upload_to_cloudinary(image_url: str) -> str:
    """Upload a remote image URL to Cloudinary. Returns secure_url."""
    clean = clean_wix_url(image_url)
    data = urllib.parse.urlencode({
        'file': clean,
        'upload_preset': UPLOAD_PRESET,
        'folder': FOLDER,
    }).encode('utf-8')
    req = urllib.request.Request(UPLOAD_URL, data=data, method='POST')
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
    return result['secure_url']

def migrate():
    with open('settings.json', 'r', encoding='utf-8') as f:
        d = json.load(f)

    family = next(
        lp for lp in d.get('landingPages', [])
        if lp.get('slug') == 'family-photography'
    )

    migrated, skipped, failed = 0, 0, 0

    def process(url_getter, url_setter, label):
        nonlocal migrated, skipped, failed
        url = url_getter()
        if not url or 'wixstatic.com' not in url:
            skipped += 1
            return
        try:
            new = upload_to_cloudinary(url)
            url_setter(new)
            migrated += 1
            print(f"  OK   {label}")
        except Exception as e:
            failed += 1
            print(f"  FAIL {label}: {e}")

    # Hero fallback image
    process(
        lambda: family['hero'].get('image', ''),
        lambda u: family['hero'].__setitem__('image', u),
        'Hero image'
    )

    # Hero slides
    for i, slide in enumerate(family['hero'].get('slides', [])):
        process(
            lambda s=slide: s.get('url', ''),
            lambda u, s=slide: s.__setitem__('url', u),
            f'Hero slide {i+1}'
        )

    # Service portfolios
    for svc in family.get('services', []):
        title = svc.get('title', '?')
        for j, photo in enumerate(svc.get('portfolio', [])):
            process(
                lambda p=photo: p.get('url', ''),
                lambda u, p=photo: p.__setitem__('url', u),
                f'{title} — photo {j+1}'
            )

    with open('settings.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

    print()
    print(f"Migrated: {migrated}   Skipped: {skipped}   Failed: {failed}")
    if migrated:
        print()
        print("Next step:")
        print("  git add settings.json")
        print("  git commit -m 'feat: migrate family photos from wix to cloudinary'")
        print("  git push origin main")

if __name__ == '__main__':
    migrate()
