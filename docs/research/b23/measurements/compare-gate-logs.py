"""Compare matched diagnostic texts and each clip-checker header warning count across two real logs."""
import argparse
from collections import Counter, defaultdict
import csv
from hashlib import sha256
import json
from pathlib import Path
import re

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('historic_job_log',type=Path,help='ANSI-free original CI output, job 141010703342')
parser.add_argument('historic_errors',type=Path,help='defect-gate.tsv')
parser.add_argument('current_logs',type=Path,help='measurement-logs.jsonl')
args=parser.parse_args()
old=defaultdict(Counter)
with args.historic_errors.open() as stream:
    for row in csv.DictReader(stream,delimiter='\t'):
        old[row['картина']][' '.join(row['сообщение'].split())]+=1
historic=args.historic_job_log.read_text()
def warning_count(text,subject):
    found=re.search(r'[✓✗] '+re.escape(subject)+r': [^\n]*?(\d+) warnings',text)
    return int(found[1]) if found else None
for line in args.current_logs.read_text().splitlines():
    row=json.loads(line)
    if row['op']!='gate' or row['repetition']!=1: continue
    subject=row['id'];raw=row['output']
    if sha256(raw.encode()).hexdigest()!=row['sha256']:
        raise ValueError(f'SHA-256 mismatch in current output for {subject}')
    current=Counter(' '.join(s.split()) for s in raw.splitlines() if s.startswith('  !') or s.startswith(f'✗ {subject} detail:'))
    result=dict(id=subject,old_diagnostic_lines=old[subject].total(),common=(old[subject]&current).total(),
                missing=list((old[subject]-current).elements()),new=list((current-old[subject]).elements()),
                old_clip_warnings=warning_count(historic,subject),current_clip_warnings=warning_count(raw,subject))
    print(json.dumps(result,ensure_ascii=False))
