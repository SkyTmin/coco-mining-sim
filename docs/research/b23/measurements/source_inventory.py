"""Count tracked sources and exact cross-painting repeats. Run from any working directory."""
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[4]
TOOLS = ROOT / 'tools/creatures'
WINDOW = 8


def tracked():
    raw = subprocess.check_output(['git', 'ls-files', '-z', '--', 'tools/creatures'], cwd=ROOT)
    return [ROOT / name.decode() for name in raw.split(b'\0') if name]


def author(path, ids):
    return next((id for id in ids if path.stem == id or path.stem.startswith(id + '-')), None)


def inventory():
    ids = sorted((p.stem for p in (TOOLS / 'golden').glob('*.json')), key=len, reverse=True)
    buckets, individual, native = Counter(), Counter(), Counter()
    samples = defaultdict(list)
    for path in tracked():
        relative = path.relative_to(TOOLS)
        group = relative.parts[0] if len(relative.parts) > 1 else '(корень)'
        if group == 'vendor':
            continue
        if group == 'katorga' and path.suffix in {'.ts', '.js', '.mjs', '.py'}:
            native[str(path.suffix)] += len(path.read_text().splitlines())
        if path.suffix != '.ts':
            continue
        lines = path.read_text().splitlines()
        buckets[group] += len(lines)
        if group != 'c':
            continue
        id = author(path, ids)
        individual[id or '(shared)'] += len(lines)
        if id is None:
            continue
        code = [(n, s.strip()) for n, s in enumerate(lines, 1)
                if s.strip() and not s.lstrip().startswith(('//', '/*', '*', '*/'))]
        for i in range(len(code) - WINDOW + 1):
            window = code[i:i + WINDOW]
            text = '\n'.join(s for _, s in window)
            if len(text) < 160 or len(set(re.findall(r'[A-Za-z_][A-Za-z_0-9]*', text))) < 8:
                continue
            digest = hashlib.sha256(text.encode()).digest()
            samples[digest].append((id, relative.as_posix(), tuple(n for n, _ in window)))
    shared = [g for g in samples.values() if len({id for id, _, _ in g}) >= 2]
    covered, families = set(), Counter()
    for group in shared:
        families[tuple(sorted({id for id, _, _ in group}))] += 1
        for _, path, nums in group:
            covered.update((path, n) for n in nums)
    examples = []
    for family, count in families.most_common(8):
        locations = next(g for g in shared if tuple(sorted({id for id, _, _ in g})) == family)
        examples.append(dict(family=family, windows=count, first=[(p, ns[0]) for _, p, ns in locations]))
    return dict(ts_lines_by_area=dict(sorted(buckets.items())), c_lines_by_owner=dict(sorted(individual.items())),
                katorga_source_lines=dict(native), cross_owner_unique_windows=len(shared),
                cross_owner_covered_lines=len(covered), repetitions=examples)


if __name__ == '__main__':
    print(json.dumps(inventory(), indent=2, ensure_ascii=False))
