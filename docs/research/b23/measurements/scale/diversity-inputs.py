"""Run in checkout root. Make drafts only in a private temporary copy of the authoring tool."""
import json,os,random,shutil,subprocess,sys,tempfile
from pathlib import Path
root=Path('tools/creatures').resolve()
schema=json.loads((root/'studio/card.schema.json').read_text())
types=schema['definitions']['body']['enum']
moves=schema['definitions']['template']['enum']
counts=dict(common=2,uncommon=2,rare=3,epic=4,legendary=5,mythic=6,secret=6)
scenes=[p.stem for p in sorted((root/'scenes').glob('*.ts')) if 'export default' in p.read_text() and p.stem.replace('_','').isalnum()]
rng=random.Random(2523)
bodies=types*3; rng.shuffle(bodies)
rarities=list(counts)*4; rng.shuffle(rarities)
cases=[]
for i in range(24):
    rarity=rarities[i]
    cases.append(dict(id='study_case_'+str(i),body=bodies[i],theme=rng.choice(scenes),rarity=rarity,moves=','.join(rng.sample(moves,counts[rarity]))))
with tempfile.TemporaryDirectory(prefix='b25-drafts-') as tmp:
    tool=Path(tmp)/'tools/creatures'
    shutil.copytree(root,tool,ignore=shutil.ignore_patterns('node_modules','atlases','golden','.studio','out','review','test','vendor','.render-cache'))
    (tool/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
    # Some accepted scene or skeleton sources use their baseline assets at import.
    (Path(tmp)/'assets').symlink_to(root.parents[1]/'assets',target_is_directory=True)
    script=Path(__file__).with_name('draft-combinations.mjs')
    (tool/'cases.json').write_text(json.dumps(cases))
    run=subprocess.run([os.environ.get('NODE_BIN','node'),'--import','tsx',str(script.resolve())],cwd=tool,check=True,text=True,capture_output=True)
    print(run.stdout)
