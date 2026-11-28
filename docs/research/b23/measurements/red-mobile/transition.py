"""Run from tools/creatures: python transition.py PATH-TO-OUTPUT. Only reads the checked-in viewer."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json, sys
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
out=Path(sys.argv[1]); out.mkdir(parents=True,exist_ok=True)
class QuietFiles(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietFiles,directory=Path('viewer').resolve()))
Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-gpu'])
    page=br.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    errors=[];http=[]
    page.on('pageerror',lambda x: errors.append(str(x)))
    page.on('response',lambda x:http.append([urlsplit(x.url).path,x.status]) if x.status>=400 else None)
    page.goto(f'http://127.0.0.1:{srv.server_port}/?pet=moon_magician')
    page.wait_for_function("()=>{const h=document.querySelector('.feature-painting');return h.dataset.id==='moon_magician' && h.dataset.clip && h.getAttribute('aria-busy')==='false'}")
    page.evaluate("""() => {
      window.samples=[]; let recording=false,done=false,last='';
      const hero=document.querySelector('.feature-painting');
      const can=hero.querySelector('canvas');
      const observe=()=>{
        if(done)return;
        const {frame,clip}=hero.dataset, n=Number(frame);
        if(clip==='trick' && n>=123)recording=true;
        if(!recording||clip+'/'+frame===last)return;
        const ctx=can.getContext('2d');
        const rgb=ctx.getImageData(140,28,36,20).data;
        let bright=0;for(let i=0;i<rgb.length;i+=4)if(Math.min(rgb[i],rgb[i+1],rgb[i+2])>190)bright++;
        window.samples.push({frame:n,clip,bright,width:can.width,height:can.height});
        if(clip!=='trick')done=true;
        last=clip+'/'+frame;
      };
      new MutationObserver(observe).observe(hero,{attributes:true,attributeFilter:['data-frame','data-clip']});
    }""")
    hero=page.locator('.feature-painting')
    hero.tap(); hero.tap()
    try: page.wait_for_function("()=>window.samples.some(s=>s.clip!=='trick')",timeout=14500)
    except Exception as e: errors.append(type(e).__name__)
    record={'viewport':[390,844],'devicePixelRatio':2,'browser':br.version,'samples':page.evaluate('window.samples'),'errors':errors,'httpErrors':http,'final':page.locator('.feature-painting').evaluate("h=>({...h.dataset})")}
    (out/'result.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(record)
    br.close()
srv.shutdown()
