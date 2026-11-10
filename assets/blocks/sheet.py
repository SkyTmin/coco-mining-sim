# Review sheet of the final textures: every world, rock + 4 ores, in normal / golden / rainbow / cosmic.
# Run: python3 assets/blocks/sheet.py <out.html>
import base64
import io
import sys

from PIL import Image

import build

LAYOUT = {"Б": "жила наискосок", "Г": "крупинки", "Д": "средний и крошки"}
ROWS = ((None, "Обычный"), ("golden", "Золотой · 1 из 250"), ("rainbow", "Радужный · 1 из 10 000"),
        ("cosmic", "Космический · 1 из 500 000"))


def b64(im):
    buf = io.BytesIO()
    im.resize((96, 96), Image.NEAREST).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def main(out):
    worlds = {}
    for wi, world, ore, name, ims in build.blocks():
        w = worlds.setdefault(wi, {"world": world, "cols": []})
        w["cols"].append((world["rock"][1] if ore is None else ore[1], ims))
    sec = []
    for wi, w in worlds.items():
        world = w["world"]
        head = "".join(f"<div class=\"cap\">{n}</div>" for n, _ in w["cols"])
        rows = ""
        for k, label in ROWS:
            rows += f"<div class=\"side\">{label}</div>" + "".join(
                f"<img src=\"{b64(ims[k])}\" width=\"96\" height=\"96\" alt=\"{n}, {label}\">" for n, ims in w["cols"])
        final = " · финал" if world.get("frame") == "hot" else ""
        sec.append(f"<section><h2><span class=\"tag\">{wi}</span>{world['name']}{final}</h2>"
                   f"<p class=\"lay\">Раскладка {world['layout']} — {LAYOUT[world['layout']]}</p>"
                   f"<div class=\"sc\"><div class=\"grid\"><div></div>{head}{rows}</div></div></section>")
    html = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Блоки десяти миров</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap">
<style>
:root{{--bg:#16131f;--fg:#f4f0ff;--muted:#aba3c2;--accent:#ffc83d;--ink:#1e2140;--font:"Nunito",system-ui,sans-serif;color-scheme:dark}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);padding:20px max(16px,env(safe-area-inset-left,0px)) 48px}}
main{{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:30px}}
h1{{font-size:24px;font-weight:900;margin:0}} h2{{font-size:20px;font-weight:900;margin:0}}
p{{margin:0;color:var(--muted);line-height:1.5;max-width:70ch}} .lay{{font-size:14px;margin:2px 0 10px}}
.sc{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
.grid{{display:grid;grid-template-columns:86px repeat(5,96px);gap:8px;width:max-content}}
.cap{{font-size:12px;font-weight:800;color:var(--muted);line-height:1.2;align-self:end}}
.side{{font-size:12px;font-weight:800;color:var(--muted);line-height:1.25;align-self:center}}
img{{display:block;image-rendering:pixelated}}
.tag{{display:inline-block;background:var(--accent);color:var(--ink);border-radius:7px;padding:0 8px;margin-right:8px}}
</style></head><body><main>
<section><h1>Блоки десяти миров</h1>
<p>Это и есть текстуры, которые пойдут в игру: порода и четыре руды в каждом мире, от обычной к сокровищу. В строках
тот же блок в редком виде: меняется камень, руда остаётся своей. У каждой руды внутри мира своя форма и свой цвет.
Раскладки Б, Г, Д чередуются, чтобы соседние миры отличались. В игре к этому добавятся свет мира и обстановка тоннеля.</p></section>
{''.join(sec)}
</main></body></html>"""
    open(out, "w").write(html)


if __name__ == "__main__":
    main(sys.argv[1])
