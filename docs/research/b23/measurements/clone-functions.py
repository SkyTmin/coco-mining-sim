"""Run from tools/creatures. Compare full bodies of tracked named TypeScript functions in c/."""
from collections import Counter, defaultdict
from hashlib import sha256
from pathlib import Path
from subprocess import check_output
import bisect
import json
import re

# Standalone lexical pass. Keep identifiers, all literal spellings and punctuation.
# Treat a whole template as a token. This intentionally misses equivalence inside interpolations.
lex = re.compile(r"""//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|=>|===|!==|==|!=|<=|>=|\?\?|\?\.|&&|\|\||\+\+|--|[^\s]""")
ids = sorted((p.stem for p in Path('golden').glob('*.json')), key=len, reverse=True)
files = check_output(['git', 'ls-files', 'c/*.ts'], text=True).splitlines()

def mate(tokens, index, opening, closing):
    level = 0
    for pos in range(index, len(tokens)):
        level += (tokens[pos] == opening) - (tokens[pos] == closing)
        if level == 0:
            return pos

bodies = defaultdict(list)
private = []
count = 0
excluded = []
for name in files:
    path = Path(name)
    owner = next((owner for owner in ids if path.stem == owner or path.stem.startswith(owner + '-')), None)
    if not owner:
        excluded.append(name)
        continue
    source = path.read_text()
    lines = [m.start() for m in re.finditer('\n', source)]
    matches = [m for m in lex.finditer(source) if not m[0].startswith(('//','/*'))]
    t = [m[0] for m in matches]
    freq = Counter(t)
    for k in range(len(t)-4):
        if t[k] != 'function' or not re.fullmatch(r'[A-Za-z_$][\w$]*',t[k+1]) or t[k+2] != '(':
            continue
        closing = mate(t,k+2,'(',')')
        if closing is None:
            continue
        body = closing+1
        if t[body] == ':':
            while body < len(t) and t[body] not in ('{',';'):
                body += 1
        if body >= len(t) or t[body] != '{':
            continue
        end = mate(t,body,'{','}')
        if end is None:
            continue
        if end+1 < len(t) and t[end+1] == '{':
            body = end+1
            end = mate(t,body,'{','}')
        if end is None:
            continue
        line = 1 + bisect.bisect_left(lines,matches[k].start())
        end_line = 1 + bisect.bisect_left(lines,matches[end].start())
        label = dict(owner=owner, file=name,line=line,end=end_line,name=t[k+1])
        if freq[t[k+1]] == 1 and 'export' not in t[max(0,k-3):k]:
            private.append(label)
        words = t[body:end+1]
        if len(words) < 60:
            continue
        count += 1
        # Readable JSON framing avoids accidental ambiguity between adjacent tokens.
        key = sha256(json.dumps(words,ensure_ascii=False).encode()).hexdigest()
        bodies[key].append(dict(**label,tokens=len(words)))
groups = [loc for loc in bodies.values() if len({r['owner'] for r in loc})>=2]
groups.sort(key=lambda g:(-len(g)*g[0]['tokens'],g[0]['file'],g[0]['line']))
print(json.dumps(dict(tree=check_output(['git','rev-parse','HEAD:tools/creatures'],text=True).strip(),owned_files=len(files)-len(excluded),
    excluded_files=excluded,minimum_tokens=60,considered_named_functions=count,cross_owner_groups=len(groups),
    group_instances=sum(map(len,groups)), only_name_occurrence_private_candidates=private, groups=groups),indent=2))
