"""Run in a clean checkout of the pinned revision. Stages only tracked inputs in a temporary directory."""
from pathlib import Path
import argparse, json, os, shutil, subprocess, tempfile

BASE = 'd6ebb3145d47d6bed85b088ec30b0b2faa82da6f'
TREE = '802379ea59f2275d34d7ab1fbcb6e949dbf63d61'
PROBE = Path(__file__).resolve().parent
FALLBACK = 'if (vlen(p) < 1e-4) p = vcross(u, [0, 0, 1]);'
ALTERNATE = '''if (vlen(p) < 1e-4) {
    p = vcross(u, [0, 0, 1]);
    if (vlen(p) < 1e-4) {
      const x = Math.abs(u[0]), y = Math.abs(u[1]), z = Math.abs(u[2]);
      const axis: V3 = x <= y && x <= z ? [1, 0, 0] : y <= z ? [0, 1, 0] : [0, 0, 1];
      p = vcross(u, axis);
    }
  }'''
DECL = 'export function ik(a: V3, b: V3, l1: number, l2: number, pole: V3): V3 {'
WRAPPER = '''
export function ik(a: V3, b: V3, l1: number, l2: number, pole: V3): V3 {
  const joint = rawExperimentalIK(a,b,l1,l2,pole);
  globalThis.__observeIK?.(a,b,l1,l2,pole,joint);
  return joint;
}
'''
def git(root,*args):
    return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkout',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args()
    repo=args.checkout.resolve()
    target=args.output.resolve()
    if git(repo,'rev-parse','HEAD')!=BASE or git(repo,'rev-parse','HEAD:tools/creatures')!=TREE:
        raise SystemExit('Use the fixed pre-transfer baseline commit '+BASE)
    if git(repo,'status','--porcelain','--untracked-files=no','--','tools/creatures','assets/creatures'):
        raise SystemExit('Tracked measurement inputs must match the pinned revision')
    target.mkdir(parents=True,exist_ok=True)
    deps=repo/'tools/creatures/node_modules'
    if not (deps/'tsx/package.json').is_file():
        raise SystemExit('Baseline requires its regular npm dependencies')
    tracked=git(repo,'ls-files','-z','--','tools/creatures').split('\0')
    with tempfile.TemporaryDirectory(prefix='two-bone-comparison-') as tmp:
        tmp=Path(tmp)
        for mode in ['original','candidate']:
            stage=tmp/mode
            for rel in filter(None,tracked):
                p=Path(rel)
                source_file = p.suffix in {'.ts','.mjs','.json'}
                painting_input = len(p.parts)>3 and p.parts[2] in {'scenes','frames','c','bodies'}
                if not (source_file or painting_input) or 'viewer/atlases/' in rel or '/katorga/f1/source/' in rel:
                    continue
                dest=stage/p; dest.parent.mkdir(exist_ok=True,parents=True)
                shutil.copyfile(repo/p,dest)
            (stage/'tools/creatures/node_modules').symlink_to(deps.resolve(),target_is_directory=True)
            # The renderer only reads matching behavior.json inputs.
            for p in (repo/'assets/creatures').glob('*/behavior.json'):
                dest=stage/p.relative_to(repo);dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(p,dest)
            kit=stage/'tools/creatures/kit/f11-mobkit.ts'
            src=kit.read_text()
            if src.count(FALLBACK)!=1 or src.count(DECL)!=1:
                raise ValueError('Expected exactly one known solver and fallback')
            if mode=='candidate':
                src=src.replace(FALLBACK,ALTERNATE)
            kit.write_text(src.replace(DECL,DECL.replace('function ik','function rawExperimentalIK'))+WRAPPER)
        env=dict(os.environ,UV_THREADPOOL_SIZE='1')
        program=['node','--import','tsx',str(PROBE/'observe.mjs'),str(tmp),str(target),BASE,TREE]
        subprocess.run(program,cwd=repo/'tools/creatures',env=env,check=True)

if __name__=='__main__':
    main()
