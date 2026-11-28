"""Rebuild the three chroma-keyed technique/trick plates from their original ImageGen attempts.

Run ws export-ref meadow_colossus idle 0 first. Pass that PNG as the sole argument.
Use ws label to add captions after rebuilding the unlabelled working plates.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree


DIRECTORY = Path(__file__).resolve().parent / 'references' / 'meadow_colossus'
MAGENTA = np.array([255, 0, 255], dtype=np.uint8)
# Cell numbers start at one. Other cells retain the original approved drawing.
REVIEWS = {
    'tech_forefall': {3: 2},
    'tech_heelwave': {},
    'trick': {4: 2, 5: 4},
}


def chroma(rgb):
    r, g, b = rgb.astype(int).transpose(2, 0, 1)
    return (r - g > 12) & (b - g > 12) & (b > r * 0.68)


def lab(rgb):
    values = rgb.astype(float) / 255
    linear = np.where(values <= 0.04045, values / 12.92, ((values + 0.055) / 1.055) ** 2.4)
    matrix = np.array([[0.4124564, 0.2126729, 0.0193339],
                       [0.3575761, 0.7151522, 0.119192],
                       [0.1804375, 0.0721750, 0.9503041]])
    xyz = (linear @ matrix) / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz * (29 / 6) ** 2 / 3 + 4 / 29)
    return np.column_stack((116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])))


def rebuild(native):
    appearance = np.array(Image.open(DIRECTORY / 'appearance.png').convert('RGB'))
    unique_paint = appearance[~chroma(appearance)]
    sample = unique_paint[: len(unique_paint) // 256 * 256].reshape(-1, 256, 3)
    identity_palette = Image.fromarray(sample).quantize(colors=158, method=Image.Quantize.MEDIANCUT)
    native_colors = np.unique(np.array(Image.open(native).convert('RGB')).reshape(-1, 3), axis=0)
    native_colors = native_colors[~(native_colors == MAGENTA).all(axis=1)]
    native_tree = cKDTree(lab(native_colors))

    for clip, replacements in REVIEWS.items():
        source = Image.open(DIRECTORY / f'{clip}.try1.png').convert('RGB')
        width, height = source.width // 3, source.height // 2
        for cell, attempt in replacements.items():
            col, row = (cell - 1) % 3, (cell - 1) // 3
            box = (col * width, row * height, (col + 1) * width, (row + 1) * height)
            revised = Image.open(DIRECTORY / f'{clip}.try{attempt}.png')
            source.paste(revised.crop(box), box)
        source = source.resize((768, 512), Image.Resampling.NEAREST)
        matte = chroma(np.array(source))
        indexed = np.array(source.quantize(palette=identity_palette, dither=Image.Dither.NONE).convert('RGB'))
        colors, inverse = np.unique(indexed[~matte], axis=0, return_inverse=True)
        nearest = native_tree.query(lab(colors))[1]
        indexed[~matte] = native_colors[nearest][inverse.reshape(-1)]
        indexed[matte] = MAGENTA
        Image.fromarray(indexed).save(DIRECTORY / f'{clip}.png', optimize=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('native', type=Path)
    rebuild(parser.parse_args().native)
