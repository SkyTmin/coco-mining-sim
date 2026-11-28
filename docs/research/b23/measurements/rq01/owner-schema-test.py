from jsonschema import Draft202012Validator
def placement(kind, field):
    return {'type':'object','properties':{'kind':{'const':kind},field:{'type':'string','minLength':1}},
            'required':['kind',field],'additionalProperties':False}
schema = {'oneOf':[placement('held','socket'),placement('scenery','anchor')]}
v = Draft202012Validator(schema)
cases = [
    ('held', {'kind':'held','socket':'paw'}),
    ('scenery', {'kind':'scenery','anchor':'table'}),
    ('no-owner', {'kind':'held'}),
    ('two-owners', {'kind':'held','socket':'paw','anchor':'table'}),
    ('dangling-socket', {'kind':'held','socket':'not-a-socket'}),
]
for label, item in cases:
    print(label, v.is_valid(item))
