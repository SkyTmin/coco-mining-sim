"""Export the interactive trial at fixed clock steps using headless Chromium."""
import argparse
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
from threading import Thread
import time
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
FPS = 24
DURATION = 16
TAKES = {"early": 90, "late": 232}
PHASES = [0, 65, 90, 120, 144, 200, 246, 290, 358]

class QuietServer(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def render_take(page, output, label, tap):
    page.evaluate("window.study.begin()")
    start = time.monotonic()
    frames, stills, samples = [], [], []
    for n in sorted(set(range(0, FPS * DURATION, 2)).union(PHASES, [FPS * DURATION])):
        report = page.evaluate("([f,t]) => window.study.sample(f,[t])", [n, tap])
        if n in PHASES or n == FPS * DURATION:
            samples.append(report)
        if n % 2 == 0 or n in PHASES:
            encoded = page.evaluate("document.querySelector('canvas').toDataURL('image/png').split(',')[1]")
            pic = Image.open(BytesIO(base64.b64decode(encoded))).convert("RGB")
            if n in PHASES:
                stills.append((n, pic))
            if n % 2 == 0 and n < FPS * DURATION:
                frames.append(pic)
    # One shared palette reduces flicker between GIF frames.
    bank = Image.new("RGB", (288, 180 * 8))
    for i in range(8):
        bank.paste(frames[i * 20], (0, i * 180))
    palette = bank.quantize(colors=256)
    indexed = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    durations = [80, 80, 90] * (len(frames) // 3)
    indexed[0].save(output / (label + ".gif"), save_all=True, append_images=indexed[1:],
                    duration=durations, optimize=False, disposal=1)
    sheet = Image.new("RGB", (3 * 288, 3 * 202), "#182729")
    brush = ImageDraw.Draw(sheet)
    for i, (n, pic) in enumerate(stills):
        x, y = (i % 3) * 288, (i // 3) * 202
        sheet.paste(pic, (x, y))
        brush.text((x + 6, y + 184), f"{label}   {n} / 384", fill="#f2dfbc")
    sheet.save(output / (label + "-phases.png"))
    return {"tapFrame": tap, "samples": samples, "renderSeconds": round(time.monotonic() - start, 2)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "out")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    service = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietServer, directory=str(ROOT)))
    Thread(target=service.serve_forever, daemon=True).start()
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=args.chromium, args=["--no-sandbox"])
        page = browser.new_page()
        page.goto(f"http://127.0.0.1:{service.server_port}/probe.html")
        results = {key: render_take(page, args.output, key, tap) for key, tap in TAKES.items()}
        measurements=page.evaluate("""() => {
          study.begin();const t=performance.now();for(let i=1;i<=384;i++)study.sample(i,[90]);
          return (performance.now()-t)/384;
        }""")
        results["meanMsPerDrawAndTick"] = round(measurements, 3)
        results["browserVersion"] = browser.version
        browser.close()
    service.shutdown()
    (args.output / "captures.json").write_text(json.dumps(results, indent=2) + "\n")

if __name__ == "__main__":
    main()
