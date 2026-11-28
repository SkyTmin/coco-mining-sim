"""Compare evidence selections without modifying input images. Requires Python and Pillow."""
import argparse
import hashlib
import json
from math import ceil
from pathlib import Path

from PIL import Image, ImageChops


def changed_pixels(a, b):
    if a.size != b.size:
        raise ValueError("Frame dimensions must agree")
    red, green, blue, alpha = ImageChops.difference(a, b).split()
    largest = ImageChops.lighter(ImageChops.lighter(red, green), ImageChops.lighter(blue, alpha))
    return a.width * a.height - largest.histogram()[0]


def measure(directory):
    manifest = json.loads((directory / "b24-v2-frames.json").read_text())
    frames = {}
    for entry in manifest:
        with Image.open(directory / entry["file"]) as source:
            image = source.convert("RGBA")
        if hashlib.sha256(image.tobytes()).hexdigest() != entry["rgbaSha256"]:
            raise ValueError("RGBA hash mismatch in " + entry["file"])
        frames[entry["id"], entry["clip"], entry["frame"]] = image
    sheets = {}
    for filename in ["b24-v2-phases.png", "b24-v2-adjacent.png"]:
        with Image.open(directory / filename) as image:
            w, h = image.size
            sheets[filename] = [w, h, ceil(w / 28) * ceil(h / 28)]
    controls = []
    for subject, mid, phases in [
        ("pocket_magnet", 79, [44, 79, 131]),
        ("astral_seer", 57, [24, 57, 96]),
    ]:
        before, center, after = (frames[subject, "trick", i] for i in [mid - 1, mid, mid + 1])
        # Positive control: the next frame erroneously repeats the center frame.
        # All other inputs, including idle, stay byte-identical to their originals.
        for selection, ids in [
            ("single", [mid]), ("phases", phases), ("adjacent", [mid - 1, mid, mid + 1]),
        ]:
            deltas = [
                changed_pixels(frames[subject, "trick", i], center) if i == mid + 1 else 0
                for i in ids
            ]
            controls.append([subject, selection, ids, deltas])
        # Complementary control: replace the last selected action phase with the center pose.
        # The neighboring triplet stays unchanged.
        last = phases[-1]
        controls.append([subject, "wrong final pose", last,
                         changed_pixels(frames[subject, "trick", last], center)])
        controls.append([subject, "ordinary adjacent changes",
                         [changed_pixels(before, center), changed_pixels(center, after)]])
    return dict(verified_frames=len(frames), sheets=sheets, controls=controls)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    print(json.dumps(measure(parser.parse_args().directory), indent=2))
