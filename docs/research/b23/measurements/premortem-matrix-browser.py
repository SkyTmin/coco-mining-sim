"""From tools/creatures. Local isolated viewer, no publication or changes to tracked files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from time import sleep
import json
import sys
from playwright.sync_api import sync_playwright

root=Path('viewer').resolve()
if not (root/'viewer.mjs').is_file(): raise SystemExit('Run from tools/creatures')
class Files(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.endswith(('.webp','.png')): sleep(.2)
        super().do_GET()
    def log_message(self,*unused): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Files,directory=root))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
first,second='moon_magician','pocket_magnet'
source=(root/'viewer.mjs').read_text();start='    if (!this.surface || (!this.visible && !(this === featured && heroVisible))) {'
# The original advance still runs. Count call arguments and name the selected and detached Paintings.
needle="if (this.entry.runtime !== 'f1' || this.selected === 'life') this.pet?.advance(dt);"
repl="""if (this.entry.runtime !== 'f1' || this.selected === 'life') {
          if (!this.surface && this.pet && dt > 0) {
            const key=this.entry.id;
            window.detachedCalls[key]=(window.detachedCalls[key]??0)+1;
          }
          this.pet?.advance(dt);
        }"""
if source.count(start)!=1 or source.count(needle)!=1: raise ValueError('Instrumentation source changed')
source=source.replace(needle,repl)
selector='.feature-painting'
def ready(page,key):
    page.wait_for_function("id=>{const h=document.querySelector('.feature-painting');return h.dataset.id===id&&h.dataset.clip&&h.getAttribute('aria-busy')==='false'}",arg=key,timeout=60000)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-gpu'])
    ctx=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('window.detachedCalls={};')
    page.route('**/viewer.mjs', lambda r:r.fulfill(body=source,content_type='text/javascript'))
    page.goto(base+'/?pet='+first);ready(page,first)
    page.evaluate("id=>document.querySelector('[data-select=\"'+id+'\"]').click()",second);ready(page,second)
    copied=urlsplit(page.url);share_path=copied.path+'?'+copied.query
    before=page.evaluate('({...window.detachedCalls})');page.wait_for_timeout(1000);after=page.evaluate('({...window.detachedCalls})')
    switches=['kettle_crab','ember_panda','moon_magician','pocket_magnet']
    mem_before=page.evaluate('galleryMemory()');start_t=page.evaluate('performance.now()');times=[]
    for key in switches:
        times.append([key,page.evaluate('performance.now()')]);page.evaluate("id=>document.querySelector('[data-select=\"'+id+'\"]').click()",key);page.wait_for_timeout(55)
    ready(page,switches[-1]);page.wait_for_timeout(800)
    downloads=page.evaluate('t=>performance.getEntriesByType("resource").filter(x=>x.startTime>=t&&x.name.includes("/atlases/")).map(x=>({url:new URL(x.name).pathname,start:Math.round(x.startTime-t),end:Math.round(x.responseEnd-t)}))',start_t)
    final=page.locator(selector).get_attribute('data-id');mem_after=page.evaluate('galleryMemory()')
    navigation={'selection_before_copy':second,'copied_address':share_path}
    for label,url,key in [('opened_copied',share_path,first),('opened_explicit','/?pet='+second,second)]:
        fresh=browser.new_context();newpage=fresh.new_page();newpage.goto(base+url);ready(newpage,key);navigation[label]=newpage.locator(selector).get_attribute('data-id');fresh.close()
    data={'browser':browser.version,'artificial_image_delay_ms':200,'share':navigation,'closed_advance_calls_in_one_sec':{k:after.get(k,0)-before.get(k,0) for k in set(before)|set(after)},'switches':[{'id':k,'at_ms':round(t-start_t)} for k,t in times],'switched_to':final,'memory_before':mem_before,'memory_after':mem_after,'downloads':downloads,'errors':errors};browser.close()
server.shutdown()
Path(sys.argv[1]).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
