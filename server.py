#!/usr/bin/env python3
"""
Portfolio server — serves the static site AND handles photo uploads.
Usage: python3 server.py [port]   (default port 3000)
Compatible with Python 3.11+ (no deprecated cgi module).
"""
import http.server
import json
import os
import sys
import urllib.parse
from pathlib import Path

BASE = Path(__file__).parent
PHOTOS_DIR = BASE / 'photos'
PHOTOS_DIR.mkdir(exist_ok=True)

SETTINGS_FILE = BASE / 'settings.json'
CONTENT_FILE  = BASE / 'content.json'

CATEGORIES = [
    'wedding', 'portrait', 'food', 'family', 'events',
    'product', 'hotels', 'corporate', 'architecture', 'hero'
]
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif'}


def parse_multipart(content_type: str, body: bytes):
    """
    Minimal multipart/form-data parser.
    Returns list of (filename, data) for file fields.
    """
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

    for chunk in body.split(delimiter)[1:]:          # skip preamble
        if chunk.lstrip(b'\r\n').startswith(b'--'):  # epilogue
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

        # Parse Content-Disposition to get filename
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
        else:
            super().do_GET()

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
        cat_dir = PHOTOS_DIR / category
        cat_dir.mkdir(exist_ok=True)

        all_files = {f.name: f for f in cat_dir.iterdir() if f.suffix.lower() in IMAGE_EXTS}

        # Apply saved order if it exists
        order_file = cat_dir / 'order.json'
        ordered_names = []
        if order_file.exists():
            try:
                saved = json.loads(order_file.read_text())
                ordered_names = [n for n in saved if n in all_files]
            except Exception:
                pass
        # Append any files not in the saved order
        ordered_names += sorted(n for n in all_files if n not in ordered_names)

        photos = [{'filename': n, 'url': f'/photos/{category}/{n}'} for n in ordered_names]
        self._json(photos)

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
        order_file = PHOTOS_DIR / category / 'order.json'
        order_file.parent.mkdir(exist_ok=True)
        order_file.write_text(json.dumps(order))
        self._json({'saved': True})

    def _upload(self, category):
        if category not in CATEGORIES:
            return self._json({'error': 'Invalid category'}, 400)

        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            return self._json({'error': 'Expected multipart/form-data'}, 400)

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        cat_dir = PHOTOS_DIR / category
        cat_dir.mkdir(exist_ok=True)
        uploaded = []

        for filename, data in parse_multipart(content_type, body):
            safe_name = Path(filename).name  # strip any directory component
            target = cat_dir / safe_name
            # Avoid overwriting existing files
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

        # Guard against path traversal
        target = (PHOTOS_DIR / category / filename).resolve()
        expected = (PHOTOS_DIR / category).resolve()
        if not str(target).startswith(str(expected)):
            return self._json({'error': 'Invalid filename'}, 400)

        if target.exists():
            target.unlink()
            self._json({'deleted': filename})
        else:
            self._json({'error': 'File not found'}, 404)

    def _read_json_file(self, path: Path):
        if path.exists():
            try:
                data = json.loads(path.read_text())
                return self._json(data)
            except Exception:
                return self._json({})
        else:
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
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        pass  # Suppress request logs


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    os.chdir(BASE)
    srv = http.server.HTTPServer(('', port), Handler)
    print(f'\n  Portfolio server running')
    print(f'  Site:  http://localhost:{port}')
    print(f'  Admin: http://localhost:{port}/admin.html\n')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
