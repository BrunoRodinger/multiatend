"""
Servidor local MultiAtend
  localhost:8080          -> landing page  (multiatend.com.br/)
  localhost:8080/blog     -> pagina do blog (multiatend.com.br/blog)
  localhost:8080/lp-captura  -> captura de leads
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
            self.send_response(307)
            self.send_header("Location", "/lp-captura" + suffix)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path_only in ("/captura/privacidade", "/captura/privacidade/"):
            self.send_response(307)
            self.send_header("Location", "/lp-captura/privacidade" + suffix)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path_only in ("/lgpd", "/lgpd/"):
            self.send_response(301)
            self.send_header("Location", "/privacidade" + suffix)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path_only in ("/lp-captura", "/lp-captura/"):
            self.path = "/lp-captura/index.html" + suffix
        elif path_only in ("/lp-captura/privacidade", "/lp-captura/privacidade/"):
            self.path = "/lp-captura/privacidade.html" + suffix
        elif path_only in ("/privacidade", "/privacidade/"):
            self.path = "/privacidade.html" + suffix
        elif path_only in ("/termos", "/termos/"):
            self.path = "/termos.html" + suffix
        elif path_only in ("/exclusao-de-dados", "/exclusao-de-dados/"):
            self.path = "/exclusao-de-dados.html" + suffix
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
print(f"  Captura      : http://localhost:{PORT}/lp-captura")
print("=" * 48)
print("  Ctrl+C para parar\n")

with socketserver.TCPServer(("", PORT), MultiAtendHandler) as httpd:
    httpd.allow_reuse_address = True
    httpd.serve_forever()
