from copy import deepcopy
def migrate(card):
    card = deepcopy(card)
    if card['version'] == 1:
        card['beats'] = {key: int(frame) for key, frame in card.pop('marks')}
        card['version'] = 2
    return card
def resolve(card):
    events = sorted((card['beats'][key] + delta, verb) for key, delta, verb in card['events'])
    assert all(0 <= frame < card['frames'] for frame, verb in events)
    return events
old = {'version': 1, 'frames': 12, 'marks': [('hit', 5)], 'events': [('hit', 0, 'contact'), ('hit', 1, 'spark')]}
new = migrate(old)
before = resolve(new)
new['beats']['hit'] = 7
print('v1 unchanged', old['marks'])
print('idempotent', migrate(new) == new)
print('original',before,'retimed',resolve(new))
try:
    broken = migrate(old)
    broken['events'].append(('absent', 0, 'noise'))
    resolve(broken)
except KeyError as error:
    print('rejected unresolved anchor',error)
