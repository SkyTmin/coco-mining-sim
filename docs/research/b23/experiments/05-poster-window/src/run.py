"""Run from any directory: python run.py REPOSITORY results.json --chromium CHROME."""
import argparse
import hashlib
import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('repo', type=Path)
parser.add_argument('results', type=Path)
parser.add_argument('--chromium', required=True)
args = parser.parse_args()
root = args.repo.resolve()
viewer = root / 'tools/creatures/viewer'
atlas = viewer / 'atlases/posters'
index = json.loads((atlas / 'posters.json').read_text())
catalog = json.loads((viewer / 'catalog.json').read_text())
protected = {f.stem for f in (viewer.parent/'golden').glob('*.json')}
accepted = [row['id'] for row in catalog if row['id'] in protected]
assert len(accepted) == len(protected) == 41
eight = ['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician']
assets = {'/': ('text/html',Path(__file__).with_name('wall.html').read_bytes()),
          '/input': ('application/json',json.dumps({'rects':index['rects']}).encode()),
          '/posters.webp': ('image/webp',(atlas/index['file']).read_bytes())}
class Local(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in assets:
            self.send_error(404)
            return
        mime,body=assets[self.path]
        self.send_response(200)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self,*unused):
        pass
result={'revision':subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip(),
        'posterSha256':hashlib.sha256(assets['/posters.webp'][1]).hexdigest(),'eight':eight,'cases':[]}
with ThreadingHTTPServer(('127.0.0.1',0),Local) as server, sync_playwright() as pw:
    worker=threading.Thread(target=server.serve_forever,daemon=True)
    worker.start()
    browser=pw.chromium.launch(executable_path=args.chromium,args=['--no-sandbox','--disable-gpu'])
    result['browser']=browser.version
    for n in (8,41,100,300):
        ids = eight if n==8 else [accepted[i%len(accepted)] for i in range(n)]
        runs={}
        for mode in ('all','window'):
            with browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True) as ctx:
                pg=ctx.new_page()
                pg.goto('http://127.0.0.1:%d/'%server.server_port)
                pg.wait_for_function('typeof window.run === "function"')
                runs[mode]=pg.evaluate('([ids,mode])=>window.run(ids,mode)',[ids,mode])
        visible_checks=0
        for left,right in zip(runs['all'],runs['window'],strict=True):
            assert left['visible']==right['visible'] and left['y']==right['y']
            visible_checks+=len(left['visible'])
            for row in (left,right):
                row['visibleCount']=len(row['visible'])
                row['visibleDigest']=hashlib.sha256(json.dumps(row.pop('visible'),separators=(',',':')).encode()).hexdigest()
        result['cases'].append({'n':n,'history':runs,'visibleComparisons':visible_checks})
    server.shutdown()
    browser.close()
args.results.write_text(json.dumps(result,indent=2)+'\n')
