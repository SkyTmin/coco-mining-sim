"""Measure a local virtual gallery. Run from checkout root, pass a temporary output directory."""
import argparse
import contextlib
import copy
import functools
import json
import mimetypes
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("out",type=Path)
args = parser.parse_args()
args.out.mkdir(parents=True,exist_ok=True)
tools = Path("tools/creatures").resolve()
viewer = tools / "viewer"
base = json.loads((viewer / "catalog.json").read_text())
golden_ids = {p.stem for p in (tools / "golden").glob("*.json")}
accepted = [row for row in base if row["id"] in golden_ids]
assert {e["id"] for e in accepted} == golden_ids and len(accepted) == 41
poster_dir = viewer / "atlases/posters"
index = json.loads((poster_dir / "posters.json").read_text())
sheet = Image.open(poster_dir / index["file"]).convert("RGBA")
def compact(obj):
    return json.dumps(obj,separators=(",",":"),ensure_ascii=False).encode()

def packed(entries, share, alias):
    rects = {}
    pos = {}
    x = y = height = 0
    for entry in entries:
        key = entry["id"]
        original = alias.get(key,key)
        src = index["rects"][original]
        w,h = src[2:]
        if share and original in pos:
            rects[key] = pos[original]
            continue
        if x + w > 2048:
            x,y,height = 0,y+height,0
        rects[key] = [x,y,w,h]
        if share: pos[original] = rects[key]
        x += w
        height = max(h,height)
    size = (2048,y+height)
    result = Image.new("RGBA",size)
    done = set()
    for key,(x,y,w,h) in rects.items():
        if (x,y) in done: continue
        done.add((x,y))
        sx,sy,_,_ = index["rects"][alias.get(key,key)]
        result.paste(sheet.crop((sx,sy,sx+w,sy+h)),(x,y))
    return result,rects

def run(browser,n,share):
    alias = {}
    entries = []
    for i in range(n):
        entry = copy.deepcopy(accepted[i%len(accepted)])
        original = entry["id"]
        if i>=len(accepted):
            assert not entry.get("variants")
            entry["id"] = "copy_"+str(i)+"_"+original
            alias[entry["id"]] = original
            if share:
                entry["variants"]=[{"name":"Копия","atlas":original}]
        entries.append(entry)
    img,rects = packed(entries,share,alias)
    dest=args.out/f"posters-{n}-{int(share)}.webp"
    img.save(dest,"WEBP",quality=88,method=2)
    static={"catalog.json":compact(entries),"atlases/posters/posters.json":compact({"file":"posters.webp","rects":rects}),
            "atlases/posters/posters.webp":dest.read_bytes()}
    logs = []
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            req=urlsplit(self.path).path.lstrip("/") or "index.html"
            if req in static: data = static[req]
            else:
                parts=req.split("/")
                if len(parts)>2 and parts[0]=="atlases":
                    parts[1]=alias.get(parts[1],parts[1])
                target=viewer.joinpath(*parts).resolve()
                if not target.is_relative_to(viewer) or not target.is_file(): self.send_error(404);return
                data=target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type",mimetypes.guess_type(req)[0] or "application/octet-stream")
            self.send_header("Content-Length",str(len(data)))
            self.send_header("Cache-Control","max-age=3600")
            self.end_headers()
            try: self.wfile.write(data)
            except (BrokenPipeError,ConnectionResetError): pass
            logs.append((req,len(data)))
        def log_message(self,*unused): pass
    class LocalServer(ThreadingHTTPServer):
        daemon_threads=True
    with LocalServer(("127.0.0.1",0),Handler) as server:
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        ctx=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
        page=ctx.new_page()
        page_errors=[]
        page.on("pageerror",lambda error: page_errors.append(str(error)))
        try:
            page.goto(f"http://127.0.0.1:{server.server_port}/",wait_until="domcontentloaded")
            page.wait_for_function("""n=>document.querySelectorAll('.work').length===n &&
              [...document.querySelectorAll('.work .painting')].every(b=>b.getAttribute('aria-busy')==='false')""",arg=n,timeout=60000)
            measured=page.evaluate("""() => ({
              coldWallMs: Math.round(performance.now()), wallCanvasCount:document.querySelectorAll('.work canvas').length,
              wallCanvasRGBA:[...document.querySelectorAll('.work canvas')].reduce((sum,c)=>sum+c.width*c.height*4,0),
              galleryMemory:window.galleryMemory(), domElements:document.querySelectorAll('*').length})""")
            count_at_start=len(logs)
            chosen=[accepted[0]["id"],accepted[1]["id"],entries[41]["id"] if n>41 else accepted[0]["id"]]
            for key in chosen:
                page.evaluate("id=>document.querySelector('[data-select=\"'+id+'\"]').click()",key)
                page.wait_for_function("id=>{const b=document.querySelector('.feature-painting');return b.dataset.id===id && !!b.dataset.clip && b.getAttribute('aria-busy')==='false'}",arg=key,timeout=60000)
            measured["afterSwitch"]=page.evaluate("galleryMemory()")
        finally:
            ctx.close();server.shutdown()
    return {"catalogCount":n,"mode":"shared" if share else "unique","posterSize":img.size,
            "posterFileBytes":dest.stat().st_size,"sheetDecodedRGBA":img.width*img.height*4,
            "catalogBytes":len(static["catalog.json"]),**measured,"errors":page_errors,
            "coldRequests":count_at_start,"coldHttpBytes":sum(b for _,b in logs[:count_at_start]),
            "switchRequests":len(logs)-count_at_start,"switchHttpBytes":sum(b for _,b in logs[count_at_start:])}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"),args=["--disable-gpu"])
    results=[]
    for n,share in [(41,False),(100,True),(100,False),(300,True),(300,False)]:
        row=run(browser,n,share);results.append(row)
        print(json.dumps(row,ensure_ascii=False),flush=True)
        (args.out/"gallery-scale.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n")
    browser.close()
