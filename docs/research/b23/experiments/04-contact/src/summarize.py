"""Collect evidence from a completed directory of trial.mjs outputs. Writes one compact JSON document."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
from statistics import median
import json
import sys

base = Path(sys.argv[1])
synthetic = json.loads((base / "synthetic.json").read_text())
ids = ['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan',
       'kettle_crab','moon_magician','dream_sneak','puff_kit','tuft_owlet']
stats = Counter()
historical = []
intentional = []
changed = []
examples = {'added': [], 'lost': []}
timing = {'sampled': [0.0]*3, 'continuous': [0.0]*3}
cpu = {'sampled': [0.0]*3, 'continuous': [0.0]*3}
subjects = []
for id in ids:
    f = base / (id+'.json')
    raw = json.loads(f.read_text())
    assert raw['revision'] == synthetic['revision']
    retained = [r for r in raw['summary'] if r['baseline']]
    subjects.append({'id':id,'baseline':raw['baseline8'],'checked':len(raw['summary']),'baselineFrames':len(retained),
                     'timedRigs':raw['timedRigCount'],'capturedFrames':raw.get('capturedFrames'),'loadAndGoldenMs':raw.get('loadAndGoldenMs'),
                     'renderAndCaptureMs':raw.get('renderAndCaptureMs'),'captureAndValidationMs':raw['captureAndValidationMs'],
                     'timings':raw['timings'],'rawSHA256':sha256(f.read_bytes()).hexdigest()})
    if raw['baseline8']:
        assert raw['timedRigCount'] == len(retained)
        for i,t in enumerate(raw['timings']):
            for arm in timing:
                timing[arm][i] += t[arm]['wallMs']
                cpu[arm][i] += t[arm]['cpuMs']
    for r in raw['summary']:
        row={'id':id,'clip':r['clip'],'frame':r['frame'],'skipped':r['skipped'],'golden':r['golden']}
        stats['sampledFrames']+=1
        if r['baseline']:stats['baseFrames']+=1
        if r.get('intended') is not None:
            intentional.append({**row,**r['intended']})
        for item in r['historical']:
            historical.append(dict(**row,**item))
        if not r['baseline']:
            continue
        for key in ['added','lost']:
            stats['raw_'+key]+=len(r[key])
            if not r['skipped']:
                stats['effective_'+key]+=len(r[key])
                if r[key]:
                    examples[key].append({**row,'baseline':r['baseline'],'number':len(r[key]),'sample':r[key][0]})
        for name in ['sampled','exact']:
            stats['rawFrames_'+name] += bool(r[name+'Worst'])
            stats['effectiveFrames_'+name] += bool(r[name+'Worst']) and not r['skipped']
        if r['added'] or r['lost']:
            changed.append({**row,'baseline':True,'add':len(r['added']),'lose':len(r['lost']),
                            'sampledPairs':r['sampledPairs'],'exactPairs':r['exactPairs']})
assert len(historical)==15
metrics={}
for arm,values in timing.items():
    metrics[arm]={'wallMs':values,'medianWallMs':median(values),'cpuMs':cpu[arm],
                  'medianCpuMs':median(cpu[arm])}
print(json.dumps({'revision':synthetic['revision'],'node':synthetic['node'],'synthetic':synthetic,
                  'stats':dict(stats),'historical':historical,'intentionalCrab':intentional,'changed':changed,'explanations':examples,
                  'timing8':metrics,'subjects':subjects},ensure_ascii=False,separators=(',',':')))
