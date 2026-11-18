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
    parser.add_argument("--ids", nargs="+", metavar="ID", help="Export just these approved creatures and their frames")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ASSETS):
        parser.error("The archive must be outside its input tree")
    metas = sorted(ASSETS.glob("*/meta.json"))
    golden = {p.stem for p in (ROOT / "tools/creatures/golden").glob("*.json")}
    exported = {p.parent.name for p in metas}
    if args.ids:
        selected = set(args.ids)
        missing = selected - (exported & golden)
        if missing:
            parser.error("Creatures missing from approved exports: " + ", ".join(sorted(missing)))
        metas = [p for p in metas if p.parent.name in selected]
    elif not golden or exported != golden:
        raise ValueError(f"Exported creatures differ from the approved inventory: {exported ^ golden}")
    inputs = []
    for path in metas:
        meta = json.loads(path.read_text())
        inputs.append(path.parent)
        frame_set = ASSETS / "frames" / meta["rarity"]
        if not frame_set.is_dir() or not any(frame_set.glob("*.png")):
            raise ValueError(f"Missing frames for {meta['rarity']}")
        inputs.append(frame_set)
        if not {"life", "showreel"}.issubset(meta["animations"]):
            raise ValueError(f"{path.parent.name} needs a fresh export")
        expected = {f"painting-{a}.gif" for a in meta["animations"]}
        main_move = next(a for a in meta["animations"] if a.startswith("tech_"))
        expected.update({"turn.gif", "painting-idle-gold.gif", f"painting-{main_move}-gold.gif"})
        actual = {f.name for f in (path.parent / "gif").glob("*.gif")}
        if actual != expected:
            raise ValueError(f"{path.parent.name} unexpected or missing GIF files: {actual ^ expected}")
    # The workshop cache contains local timestamps. Only the delivered art enters the archive.
    roots = set(inputs) if args.ids else {ASSETS}
    files = sorted(p for root in roots for p in root.rglob("*") if p.is_file() and p.name != ".ws-render.json")
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
