"""
Servidor local MultiAtend
  localhost:8080          -> landing page  (multiatend.com.br/)
  localhost:8080/blog     -> pagina do blog (multiatend.com.br/blog)
  localhost:8080/captura  -> captura de leads
  localhost:8080/*        -> arquivos estaticos da pasta Multatend/
"""

import http.server
import socketserver
import os

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class MultiAtendHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        path_only, _, query = self.path.partition("?")
        suffix = ("?" + query) if query else ""
        if path_only in ("/captura", "/captura/"):
            self.path = "/captura/index.html" + suffix
        elif path_only in ("/captura/privacidade", "/captura/privacidade/"):
            self.path = "/captura/privacidade.html" + suffix
        elif self.path in ("/preco", "/preco/"):
            self.path = "/preco.html"
        elif self.path in ("/blog", "/blog/"):
            self.path = "/blog.html"
        elif self.path.startswith("/blog/") and not self.path.endswith(".html"):
            self.path = self.path.rstrip("/") + ".html"
        super().do_GET()

    def log_message(self, format, *args):
        print(f"  {self.address_string()} -> {args[0]} {args[1]}")

print("=" * 48)
print("  MultiAtend dev server")
print(f"  Landing page : http://localhost:{PORT}/")
print(f"  Blog         : http://localhost:{PORT}/blog")
print(f"  Captura      : http://localhost:{PORT}/captura")
print("=" * 48)
print("  Ctrl+C para parar\n")

with socketserver.TCPServer(("", PORT), MultiAtendHandler) as httpd:
    httpd.allow_reuse_address = True
    httpd.serve_forever()
