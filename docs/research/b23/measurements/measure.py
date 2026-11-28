"""Linux F0 measurements. Run from tools/creatures on the exact revision under study."""
import argparse
import datetime
import hashlib
import json
import os
import platform
import re
import subprocess
import tempfile
import time
from pathlib import Path

EIGHT = ['astral_seer', 'pocket_magnet', 'eclipse_drake', 'ember_panda',
         'bun_panda', 'crater_titan', 'kettle_crab', 'moon_magician']
RENDER = """import {render} from './render.ts';
await render(process.argv[1], process.argv[3] === 'all' ? undefined : 'idle', 1, process.argv[2]);"""


def read_output(*args):
    return subprocess.check_output(args, text=True).strip()


def rss_sample_kib(group):
    # Sum resident pages for the process group at this instant. Shared pages may count twice.
    pages = 0
    for directory in Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            fields = (directory / 'stat').read_text().rsplit(')', 1)[1].split()
            if int(fields[2]) == group:
                pages += int(fields[21])
        except (FileNotFoundError, ProcessLookupError):
            pass
    return pages * os.sysconf('SC_PAGE_SIZE') // 1024


def measure(args, logfile):
    start = time.monotonic()
    peak = 0
    with logfile.open('wb') as stream:
        proc = subprocess.Popen(args, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            while True:
                peak = max(peak, rss_sample_kib(proc.pid))
                code = proc.poll()
                if code is not None:
                    break
                time.sleep(0.2)
        except BaseException:
            import signal
            os.killpg(proc.pid, signal.SIGTERM)
            proc.wait()
            raise
    return dict(exit=code, seconds=round(time.monotonic() - start, 3),
                sampled_group_peak_rss_kib=peak, log_bytes=logfile.stat().st_size,
                log_sha256=hashlib.sha256(logfile.read_bytes()).hexdigest())


def atomic_json(path, data):
    temp = path.with_suffix('.part')
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--ids', nargs='+', choices=EIGHT, default=EIGHT)
    parser.add_argument('--operations', nargs='+', choices=['gate', 'render-idle', 'render-all', 'snap'],
                        default=['gate', 'render-idle', 'snap'])
    parser.add_argument('--repetition', type=int, default=1)
    parser.add_argument('--plan', action='store_true')
    args = parser.parse_args()
    if not Path('studio/ws.ts').is_file():
        parser.error('Run from tools/creatures')
    if args.repetition < 1:
        parser.error('Use a positive repetition number')
    dest = args.output.resolve()
    results = [(i, op) for op in args.operations for i in args.ids]
    if args.plan:
        for i, op in results:
            print(i, op)
        return
    dest.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git', 'diff', '--exit-code', '--quiet', 'HEAD', '--', '.', '../../assets/creatures'], check=True)
    caps = {}
    for name in ['cpu.max', 'memory.max', 'cpuset.cpus.effective']:
        cap = Path('/sys/fs/cgroup', name)
        if cap.exists():
            caps[name] = cap.read_text().strip()
    common = dict(cgroup_limits=caps, renderer_tree=read_output('git', 'rev-parse', 'HEAD:tools/creatures'),
                  assets_tree=read_output('git', 'rev-parse', 'HEAD:assets/creatures'),
                  node=read_output('node', '--version'), canvas=json.loads(
                      Path('node_modules/@napi-rs/canvas/package.json').read_text())['version'],
                  system=platform.platform(), os_cpus=os.cpu_count(), repetition=args.repetition)
    ws = ['node', '--import', 'tsx', 'studio/ws.ts']
    for creature, op in results:
        prefix = f'{creature}-{op}-{args.repetition}'
        record = dest / (prefix + '.json')
        if record.exists():
            old = json.loads(record.read_text())
            if old['environment'] != common:
                raise ValueError(f'{record} comes from another environment; use a fresh output directory')
            print('Recorded', prefix, flush=True)
            continue
        logfile = dest / (prefix + '.log')
        stamp = Path('.studio', 'gate-' + creature + '.json')
        before = stamp.stat().st_mtime_ns if stamp.exists() else None
        with tempfile.TemporaryDirectory(dir=dest) as td:
            if op.startswith('render-'):
                cmd = ['node', '--import', 'tsx', '--input-type=module', '-e', RENDER, creature, td, op.removeprefix('render-')]
            elif op == 'gate':
                cmd = ws + ['gate', creature, '--force', '--jobs', '1']
            else:
                cmd = ws + ['snap', creature, '--force', '--check', '--jobs', '1']
            print('Running', prefix, flush=True)
            measurements = measure(cmd, logfile)
            if op.startswith('render-'):
                measurements['output_bytes'] = sum(f.stat().st_size for f in Path(td).rglob('*') if f.is_file())
                measurements['clip'] = op.removeprefix('render-')
            if op == 'gate' and stamp.exists() and stamp.stat().st_mtime_ns != before:
                gate = json.loads(stamp.read_text())
                measurements['gate'] = {k: gate[k] for k in ['key', 'ok', 'errors', 'warnings', 'more']}
            if op == 'snap':
                match = re.search(r'(\d+) frames identical', logfile.read_text(errors='replace'))
                measurements['verified_frames'] = int(match[1]) if match else None
            entry = dict(environment=common, id=creature, op=op, command=cmd,
                         at=datetime.datetime.now(datetime.timezone.utc).isoformat(), **measurements)
            if op.startswith('render-'):
                entry['command'][-2] = '<empty temporary output>'
            atomic_json(record, entry)
            print(prefix, measurements, flush=True)


if __name__ == '__main__':
    main()
