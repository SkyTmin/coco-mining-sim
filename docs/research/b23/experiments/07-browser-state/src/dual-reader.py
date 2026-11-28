import argparse
import hashlib
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description="Две независимые вкладки читают один мир экспериментального модуля.")
parser.add_argument("study", type=Path, help="Каталог src опыта 01-state-price")
parser.add_argument("output", type=Path)
args = parser.parse_args()
module = (args.study / "world.mjs").read_bytes()
rule = json.loads((args.study / "rule.json").read_text())
rule["frame"] = 111
page_html = b"""<!doctype html><script type="module">
import {initial,restore,act} from '/world.mjs';
const slot='world';
let rule, snapshot, result;
window.study={
 reset(input){rule=input;localStorage.setItem(slot,JSON.stringify(initial(rule,1)));},
 setup(input){rule=input;},
 read(){snapshot=restore(localStorage.getItem(slot),rule); return snapshot;},
 propose(instance){result=act(rule,snapshot,{instance,rule:rule.id},{anim:rule.clip,frame:rule.frame}); return result.status;},
 write(){localStorage.setItem(slot,JSON.stringify(result.world));},
};
</script>"""
routes = {"/": ("text/html", page_html), "/world.mjs": ("text/javascript", module)}

class Local(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in routes:
            self.send_error(404)
            return
        mime, content = routes[self.path]
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, *unused):
        pass

def run_pair(pages, round_index, stale):
    first, second = pages if round_index % 2 == 0 else tuple(reversed(pages))
    ids = [round_index * 2 + 1, round_index * 2 + 2]
    for p in pages:
        p.evaluate("r=>study.setup(r)", rule)
    first.evaluate("r=>study.reset(r)", rule)
    for p in pages:
        p.wait_for_function("() => { const w=JSON.parse(localStorage.getItem('world')); return w && w.charge===1 && w.applied.length===0; }")
    first.evaluate("()=>study.read()")
    if stale:
        second.evaluate("()=>study.read()")
    first_code = first.evaluate("id=>study.propose(id)", ids[0])
    if not stale:
        first.evaluate("()=>study.write()")
        second.wait_for_function("id=>JSON.parse(localStorage.getItem('world')).applied.includes(id)", arg=ids[0])
        second.evaluate("()=>study.read()")
    second_code = second.evaluate("id=>study.propose(id)", ids[1])
    if stale and round_index % 2:
        second.evaluate("()=>study.write()")
        first.evaluate("()=>study.write()")
    else:
        if stale:
            first.evaluate("()=>study.write()")
        second.evaluate("()=>study.write()")
    winner = ids[0] if (not stale or round_index % 2) else ids[1]
    for p in pages:
        p.wait_for_function("id=>JSON.parse(localStorage.getItem('world')).applied.includes(id)", arg=winner, timeout=3500)
    result = [p.evaluate("()=>study.read()") for p in pages]
    assert result[0] == result[1]
    return {"round":round_index,"mode":"stale" if stale else "serial","ids":ids,"status":[first_code,second_code],
            "charge":result[0]["charge"],"applied":result[0]["applied"]}

with ThreadingHTTPServer(("127.0.0.1",0), Local) as server, sync_playwright() as pw:
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    browser = pw.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox","--disable-gpu"])
    context = browser.new_context()
    pages = (context.new_page(), context.new_page())
    for page in pages:
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        page.wait_for_function("typeof study === 'object'")
    cases = [run_pair(pages, i, stale) for i in range(12) for stale in (True,False)]
    output = {"browser":browser.version,"moduleSha256":hashlib.sha256(module).hexdigest(),"cases":cases}
    context.close()
    browser.close()
    server.shutdown()
args.output.write_text(json.dumps(output,indent=2)+"\n")
