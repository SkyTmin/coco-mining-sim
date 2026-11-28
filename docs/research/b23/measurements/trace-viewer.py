"""Trace two normal gallery deep links with a read-only loopback server. Run in tools/creatures."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import shutil
from playwright.sync_api import sync_playwright

class QuietFiles(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietFiles,directory=Path('viewer').resolve()))
Thread(target=server.serve_forever, daemon=True).start()
rows=[]
try:
    with sync_playwright() as driver:
        browser = driver.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-gpu'])
        for ident in ['pocket_magnet','rat_king']:
            page = browser.new_page(viewport={'width':860,'height':680})
            requests, errors = {}, []
            page.on('response',lambda response: requests.update({urlsplit(response.url).path:response.status}))
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.add_init_script("""globalThis.heroPaints = 0;
                const draw = CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.drawImage = function(...args) {
                  if (this.canvas.closest('.feature-painting')) globalThis.heroPaints++;
                  return draw.apply(this,args);
                };""")
            page.goto(f'http://127.0.0.1:{server.server_port}/?pet={ident}',wait_until='domcontentloaded')
            page.wait_for_function("heroPaints > 4 && !document.querySelector('#mood').textContent.includes('Загруз')",timeout=15000)
            state=page.evaluate("""() => {const c=document.querySelector('.feature-painting canvas');
                return {size:[c.width,c.height],mood:document.querySelector('#mood').textContent};}""")
            # Keep membership observables. Elapsed timings or paint counts depend on machine load.
            rows.append(dict(id=ident, **state, at_least_five_hero_paints=True, page_errors=errors,
                ok=sorted(k for k,v in requests.items() if v==200 and (k.endswith(('.mjs','.json')) or k.startswith('/atlases/'+ident+'/'))),
                bad={k:v for k,v in sorted(requests.items()) if v>=400}))
            page.close()
        version=browser.version
        browser.close()
finally:
    server.shutdown()
print(json.dumps(dict(chromium=version,rows=rows),ensure_ascii=False,indent=2))
