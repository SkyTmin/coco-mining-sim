"""Profile eight idle clips with the existing V8 sampler. Run from tools/creatures on the fixed revision."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
from time import perf_counter

subjects=['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician']
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('output',type=Path);args=parser.parse_args()
root=args.output.resolve();root.mkdir(parents=True,exist_ok=True)
revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
node=subprocess.check_output(['node','--version'],text=True).strip()
canvas=json.loads(Path('node_modules/@napi-rs/canvas/package.json').read_text())['version']
for subject in subjects:
    record_path=root/(subject+'.json');logpath=root/(subject+'.txt')
    if record_path.exists():
        row=json.loads(record_path.read_text())
        if row['revision']!=revision or row['node']!=node or row['canvas']!=canvas or sha256(logpath.read_bytes()).hexdigest()!=row['sha256']:
            raise ValueError('Recorded profile from different revision or input '+subject)
        continue
    cmd=['node','--import','tsx','studio/ws.ts','profile',subject,'idle'];start=perf_counter()
    with logpath.open('wb') as output:
        proc=subprocess.run(cmd,stdout=output,stderr=subprocess.STDOUT)
    raw=logpath.read_bytes();text=raw.decode();
    record={'id':subject,'clip':'idle','revision':revision,'node':node,'canvas':canvas,'at':datetime.now(timezone.utc).isoformat(),'wall_s':round(perf_counter()-start,3),'exit':proc.returncode,'sha256':sha256(raw).hexdigest(),'command':cmd}
    metrics=re.search(r': ([\d.]+) s · composes (\d+) \(history (\d+)\), rasters (\d+) \(wasted (\d+)\)',text)
    stages=re.search(r'^  stages: ([^\n]+)',text,re.M);functions=re.search(r'^  functions: ([^\n]+)',text,re.M)
    if metrics and stages and functions:
        record.update(profile_s=float(metrics[1]),composes=int(metrics[2]),history=int(metrics[3]),rasters=int(metrics[4]),wasted=int(metrics[5]), stages={k:int(v)for k,v in re.findall(r'([^ ·]+) (\d+)%',stages[1])},functions=functions[1].split(' · '))
    tmp=record_path.with_suffix('.part');tmp.write_text(json.dumps(record,indent=2,ensure_ascii=False)+'\n');tmp.replace(record_path)
    print(subject,record.get('profile_s'),record.get('stages'),flush=True)
    if proc.returncode!=0:raise SystemExit(proc.returncode)
