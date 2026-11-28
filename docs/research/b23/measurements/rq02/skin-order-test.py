from math import hypot
left = {(x, y) for x in range(4) for y in range(4)}
right = {(x, y) for x in range(2, 6) for y in range(4)}
def composite(first, second):
    pixels = dict.fromkeys(first[0], first[1])
    pixels.update(dict.fromkeys(second[0], second[1]))
    return pixels
front = composite((left, 'red'), (right, 'blue'))
back = composite((right, 'blue'), (left, 'red'))
print('silhouette pixels', len(set(front) | set(back)))
print('silhouette difference', len(set(front) ^ set(back)))
print('changed visible colour', sum(front[p] != back[p] for p in front))
# A bind-space unit vector rotated around the same root by +90 and -90 degrees.
a, b = (0.0, 1.0), (0.0, -1.0)
v = tuple((x+y)/2 for x,y in zip(a, b))
print('single influence lengths', hypot(*a), hypot(*b))
print('blended length', hypot(*v))
