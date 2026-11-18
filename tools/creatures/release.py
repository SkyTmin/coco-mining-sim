"""Pack the deterministic, git-ignored creature release after render and verify --all-frames."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "creatures"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    output = parser.parse_args().output.resolve()
    if output.is_relative_to(ASSETS):
        parser.error("The archive must be outside its input tree")
    metas = sorted(ASSETS.glob("*/meta.json"))
    if len(metas) != 7:
        raise ValueError("Expected the seven pilot creatures")
    for path in metas:
        meta = json.loads(path.read_text())
        if not {"life", "showreel"}.issubset(meta["animations"]):
            raise ValueError(f"{path.parent.name} needs a fresh export")
        expected = {f"painting-{a}.gif" for a in meta["animations"]}
        main_move = next(a for a in meta["animations"] if a.startswith("tech_"))
        expected.update({"turn.gif", "painting-idle-gold.gif", f"painting-{main_move}-gold.gif"})
        actual = {f.name for f in (path.parent / "gif").glob("*.gif")}
        if actual != expected:
            raise ValueError(f"{path.parent.name} unexpected or missing GIF files: {actual ^ expected}")
    files = sorted(p for p in ASSETS.rglob("*") if p.is_file())
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(".partial")
    with zipfile.ZipFile(temp, "w", allowZip64=True) as archive:
        for path in files:
            if path.suffix not in {".gif", ".png", ".json"}:
                raise ValueError(f"Unrecognized asset: {path}")
            name = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compresslevel=6)
    with zipfile.ZipFile(temp) as archive:
        broken = archive.testzip()
        if broken:
            raise ValueError(f"CRC failed: {broken}")
    temp.replace(output)
    with output.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    print(json.dumps({"files": len(files), "bytes": output.stat().st_size, "sha256": checksum}))

if __name__ == "__main__":
    main()
