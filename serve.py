"""
Local dev server for testing only (not part of the deployed site).

Adds two things plain `python -m http.server` lacks, both of which otherwise
make local testing diverge from production:
  - `Cache-Control: no-store` so edits to js/css/hls are always picked up
  - correct MIME types for HLS (`.m3u8`, `.ts`)

Usage:  python serve.py   (serves the current folder on http://localhost:8000)
"""
import http.server
import socketserver

PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def guess_type(self, path):
        p = str(path).lower()
        if p.endswith(".m3u8"):
            return "application/vnd.apple.mpegurl"
        if p.endswith(".ts"):
            return "video/mp2t"
        return super().guess_type(path)


with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://localhost:{PORT} (no-store, HLS MIME)")
    httpd.serve_forever()
