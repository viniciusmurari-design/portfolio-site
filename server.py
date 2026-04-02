#!/usr/bin/env python3
"""
Portfolio server — serves static site + handles photo uploads via Cloudinary.
Usage: python3 server.py [port]   (default port 3000)
"""
import http.server
import json
import os
import sys
import urllib.parse
from pathlib import Path

# Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Cloudinary setup
import cloudinary
import cloudinary.uploader
import cloudinary.api

CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
API_KEY    = os.environ.get('CLOUDINARY_API_KEY', '')
API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

USE_CLOUDINARY = bool(CLOUD_NAME and API_KEY and API_SECRET)

if USE_CLOUDINARY:
    cloudinary.config(cloud_name=CLOUD_NAME, api_key=API_KEY, api_secret=API_SECRET, secure=True)

BASE = Path(__file__).parent
PHOTOS_DIR = BASE / 'photos'
PHOTOS_DIR.mkdir(exist_ok=True)

# Local JSON "database" for Cloudinary photo records
CLOUD_DB = BASE / 'cloud_photos.json'

SETTINGS_FILE = BASE / 'settings.json'
CONTENT_FILE  = BASE / 'content.json'

CATEGORIES = [
    'wedding', 'portrait', 'food', 'family', 'events',
    'product', 'hotels', 'corporate', 'architecture', 'hero'
]
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif'}

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


def load_cloud_db():
    if CLOUD_DB.exists():
        try:
            return json.loads(CLOUD_DB.read_text())
        except Exception:
            pass
    return {}


def save_cloud_db(data):
    CLOUD_DB.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def cloudinary_url(public_id):
    return f'https://res.cloudinary.com/{CLOUD_NAME}/image/upload/q_auto,f_auto/{public_id}'


def parse_multipart(content_type: str, body: bytes):
    boundary = None
    for part in content_type.split(';'):
        part = part.strip()
        if part.lower().startswith('boundary='):
            boundary = part[9:].strip('"\'')
            break
    if not boundary:
        return []

    delimiter = ('--' + boundary).encode()
    results = []

    for chunk in body.split(delimiter)[1:]:
        if chunk.lstrip(b'\r\n').startswith(b'--'):
            break
        if chunk.startswith(b'\r\n'):
            chunk = chunk[2:]

        sep = chunk.find(b'\r\n\r\n')
        if sep == -1:
            continue

        raw_headers = chunk[:sep].decode('utf-8', errors='replace')
        payload = chunk[sep + 4:]
        if payload.endswith(b'\r\n'):
            payload = payload[:-2]

        disposition = ''
        for line in raw_headers.split('\r\n'):
            if line.lower().startswith('content-disposition'):
                disposition = line
                break

        filename = None
        for item in disposition.split(';'):
            item = item.strip()
            if item.lower().startswith('filename='):
                filename = item[9:].strip('"\'')
                break

        if filename:
            results.append((filename, payload))

    return results


class Handler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/photos':
            params = urllib.parse.parse_qs(parsed.query)
            category = params.get('category', [''])[0]
            self._list_photos(category)
        elif parsed.path == '/api/settings':
            self._read_json_file(SETTINGS_FILE)
        elif parsed.path == '/api/content':
            self._read_json_file(CONTENT_FILE)
        elif parsed.path == '/api/cloudinary-config':
            self._json({'cloudName': CLOUD_NAME, 'useCloudinary': USE_CLOUDINARY})
        elif self._is_landing_page(parsed.path):
            # Serve landing.html for dynamic landing page slugs
            self._serve_landing(parsed.path)
        else:
            super().do_GET()

    def _is_landing_page(self, path):
        """Check if path matches a landing page slug."""
        clean = path.strip('/')
        if not clean or '.' in clean or '/' in clean:
            return False
        # Don't intercept known files or API routes
        known = {'admin', 'index', 'landing', 'photos', 'functions', 'api'}
        if clean in known:
            return False
        # Check if slug exists in settings
        if SETTINGS_FILE.exists():
            try:
                settings = json.loads(SETTINGS_FILE.read_text())
                pages = settings.get('landingPages', [])
                return any(p.get('slug') == clean for p in pages)
            except Exception:
                pass
        return False

    def _serve_landing(self, path):
        """Serve landing.html with the slug as a query parameter."""
        slug = path.strip('/')
        landing_file = BASE / 'landing.html'
        if landing_file.exists():
            content = landing_file.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if parsed.path == '/api/upload':
            self._upload(params.get('category', [''])[0])
        elif parsed.path == '/api/order':
            self._save_order(params.get('category', [''])[0])
        elif parsed.path == '/api/settings':
            self._write_json_file(SETTINGS_FILE)
        elif parsed.path == '/api/content':
            self._write_json_file(CONTENT_FILE)
        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/photos':
            params = urllib.parse.parse_qs(parsed.query)
            category = params.get('category', [''])[0]
            filename = params.get('file', [''])[0]
            self._delete(category, filename)
        else:
            self.send_error(404)

    # ── API handlers ──────────────────────────────────────────────────────────

    def _list_photos(self, category):
        if category not in CATEGORIES:
            return self._json({'error': 'Invalid category'}, 400)

        if USE_CLOUDINARY:
            db = load_cloud_db()
            photos = db.get(category, [])
            return self._json(photos)

        # Local fallback
        cat_dir = PHOTOS_DIR / category
        cat_dir.mkdir(exist_ok=True)
        all_files = {f.name: f for f in cat_dir.iterdir() if f.suffix.lower() in IMAGE_EXTS}
        order_file = cat_dir / 'order.json'
        ordered_names = []
        if order_file.exists():
            try:
                saved = json.loads(order_file.read_text())
                ordered_names = [n for n in saved if n in all_files]
            except Exception:
                pass
        ordered_names += sorted(n for n in all_files if n not in ordered_names)
        photos = [{'filename': n, 'url': f'/photos/{category}/{n}'} for n in ordered_names]
        self._json(photos)

    def _upload(self, category):
        if category not in CATEGORIES:
            return self._json({'error': 'Invalid category'}, 400)

        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            return self._json({'error': 'Expected multipart/form-data'}, 400)

        length = int(self.headers.get('Content-Length', 0))
        if length > MAX_UPLOAD_SIZE:
            return self._json({'error': 'File too large. Maximum 50MB.'}, 413)
        body = self.rfile.read(length)
        uploaded = []

        for filename, data in parse_multipart(content_type, body):
            safe_name = Path(filename).name

            if USE_CLOUDINARY:
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=Path(safe_name).suffix, delete=False) as tmp:
                    tmp.write(data)
                    tmp_path = tmp.name
                try:
                    stem = Path(safe_name).stem
                    result = cloudinary.uploader.upload(
                        tmp_path,
                        folder=f'portfolio/{category}',
                        public_id=stem,
                        overwrite=False,
                        resource_type='image',
                        quality='auto',
                        fetch_format='auto',
                    )
                    public_id = result['public_id']
                    url = cloudinary_url(public_id)
                    photo = {'filename': safe_name, 'url': url, 'public_id': public_id}

                    # Save to local DB
                    db = load_cloud_db()
                    db.setdefault(category, [])
                    # Avoid duplicates
                    db[category] = [p for p in db[category] if p.get('public_id') != public_id]
                    db[category].append(photo)
                    save_cloud_db(db)

                    uploaded.append(photo)
                finally:
                    os.unlink(tmp_path)
            else:
                # Local fallback
                cat_dir = PHOTOS_DIR / category
                cat_dir.mkdir(exist_ok=True)
                target = cat_dir / safe_name
                stem, suffix = Path(safe_name).stem, Path(safe_name).suffix
                n = 1
                while target.exists():
                    target = cat_dir / f"{stem}_{n}{suffix}"
                    n += 1
                target.write_bytes(data)
                uploaded.append({'filename': target.name, 'url': f'/photos/{category}/{target.name}'})

        self._json({'uploaded': uploaded})

    def _delete(self, category, filename):
        if category not in CATEGORIES or not filename:
            return self._json({'error': 'Invalid parameters'}, 400)

        if USE_CLOUDINARY:
            db = load_cloud_db()
            photos = db.get(category, [])
            photo = next((p for p in photos if p['filename'] == filename), None)
            if photo and photo.get('public_id'):
                try:
                    cloudinary.uploader.destroy(photo['public_id'])
                except Exception:
                    pass
                db[category] = [p for p in photos if p['filename'] != filename]
                save_cloud_db(db)
                return self._json({'deleted': filename})
            return self._json({'error': 'File not found'}, 404)

        # Local fallback
        target = (PHOTOS_DIR / category / filename).resolve()
        expected = (PHOTOS_DIR / category).resolve()
        if not str(target).startswith(str(expected)):
            return self._json({'error': 'Invalid filename'}, 400)
        if target.exists():
            target.unlink()
            self._json({'deleted': filename})
        else:
            self._json({'error': 'File not found'}, 404)

    def _save_order(self, category):
        if category not in CATEGORIES:
            return self._json({'error': 'Invalid category'}, 400)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            order = json.loads(body)
            if not isinstance(order, list):
                raise ValueError
        except Exception:
            return self._json({'error': 'Expected JSON array'}, 400)

        if USE_CLOUDINARY:
            db = load_cloud_db()
            photos = db.get(category, [])
            photo_map = {p['filename']: p for p in photos}
            db[category] = [photo_map[n] for n in order if n in photo_map]
            save_cloud_db(db)
            return self._json({'saved': True})

        order_file = PHOTOS_DIR / category / 'order.json'
        order_file.parent.mkdir(exist_ok=True)
        order_file.write_text(json.dumps(order))
        self._json({'saved': True})

    def _read_json_file(self, path: Path):
        if path.exists():
            try:
                return self._json(json.loads(path.read_text()))
            except Exception:
                return self._json({})
        return self._json({})

    def _write_json_file(self, path: Path):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except Exception:
            return self._json({'error': 'Invalid JSON'}, 400)
        try:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
            self._json({'saved': True})
        except Exception as e:
            self._json({'error': str(e)}, 500)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        origin = self.headers.get('Origin', '')
        allowed = ['http://localhost:3000', 'http://localhost:8000', 'https://viniciusmurari.com', 'https://www.viniciusmurari.com']
        if origin in allowed:
            self.send_header('Access-Control-Allow-Origin', origin)
        else:
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3000')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write(f"  {args[0]}\n")


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    os.chdir(BASE)
    srv = http.server.HTTPServer(('', port), Handler)
    mode = 'Cloudinary' if USE_CLOUDINARY else 'Local'
    print(f'\n  Portfolio server running [{mode} mode]')
    print(f'  Site:  http://localhost:{port}')
    print(f'  Admin: http://localhost:{port}/admin.html\n')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
