#!/usr/bin/env python3
"""開発用の簡易サーバー（python3 serve.py で起動 → http://localhost:8899）"""
import http.server
import os
import socketserver

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8899


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.webmanifest': 'application/manifest+json',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


with socketserver.TCPServer(('', PORT), Handler) as httpd:
    httpd.allow_reuse_address = True
    print(f'Wish Jar: http://localhost:{PORT}')
    httpd.serve_forever()
