"""Open each protected painting through the mobile gallery. Run from tools/creatures; pass an output directory."""
import base64,json,sys
from pathlib import Path
from urllib.parse import urlsplit
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
out=Path(sys.argv[1]); out.mkdir(exist_ok=True,parents=True)
viewer=Path('viewer').resolve()
ids={p.stem for p in Path('golden').glob('*.json')}
entries=[r for r in json.loads((viewer/'catalog.json').read_text()) if r['id'] in ids]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=viewer))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 br=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-gpu'])
 pg=br.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 err=[];http=[];rows=[]
 pg.on('pageerror',lambda e:err.append(str(e)))
 pg.on('response',lambda r:http.append([urlsplit(r.url).path,r.status]) if r.status>=400 else None)
 pg.goto(f'http://127.0.0.1:{server.server_address[1]}/')
 pg.wait_for_selector('.work [data-select]')
 hero=pg.locator('.feature-painting')
 for no,entry in enumerate(entries,1):
  item=entry['id']; start_err=len(err); start_http=len(http)
  try:
   # select controls are genuine normal-entry buttons and take mobile tap events.
   choose=pg.locator('[data-select="'+item+'"]')
   if not choose.is_visible():
    # The historical archive is folded until its section summary is opened.
    details=choose.locator('xpath=ancestor::details')
    if details.count(): details.locator('summary').tap()
   choose.tap(timeout=8000)
   pg.wait_for_function("id=>{const b=document.querySelector('.feature-painting');return b.dataset.id===id && !!b.dataset.clip && b.getAttribute('aria-busy')==='false'}",arg=item,timeout=10000)
   first=hero.evaluate("h=>h.dataset.clip+'/'+h.dataset.frame")
   pg.wait_for_function("f=>{const b=document.querySelector('.feature-painting');return b.dataset.clip+'/'+b.dataset.frame!==f}",arg=first,timeout=4000)
   data=hero.evaluate("""h=>{const c=h.querySelector('canvas'),r=c.getBoundingClientRect();return {clip:h.dataset.clip,frame:Number(h.dataset.frame),width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,left:r.left,right:r.right,docWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,png:c.toDataURL('image/png').split(',')[1]}}""")
   (out/(item+'.png')).write_bytes(base64.b64decode(data.pop('png')))
   rows.append({'id':item,'initial':first,**data,'errors':err[start_err:],'httpErrors':http[start_http:]})
  except Exception as e: rows.append({'id':item,'failure':str(e),'errors':err[start_err:],'httpErrors':http[start_http:]})
  (out/'results.json').write_text(json.dumps({'browser':br.version,'mobile':True,'DPR':2,'viewport':[390,844],'paintings':rows},ensure_ascii=False,indent=2)+'\n')
 br.close()
server.shutdown()
print(len(rows),[(r['id'],r.get('failure','')[:120]) for r in rows if 'failure'in r])
