"""Detail metrics of a sprite frame (alpha > 200 = body).
Usage: python3 tools/creatures/detail-metric.py frame.png [frame2.png ...]
Prints: pixels, colours used by >= 3 pixels, edge density, largest one-colour region share.
Bar: skill pixel-bosses §7.1в."""
from PIL import Image
from collections import Counter
import sys
def stats(px, mask, W, H):
    pts=[(x,y) for y in range(H) for x in range(W) if mask(x,y)]
    S=set(pts); n=len(pts)
    cols=Counter(px[p] for p in pts)
    edge=sum(1 for (x,y) in pts if any((q in S and px[q]!=px[(x,y)]) for q in ((x+1,y),(x-1,y),(x,y+1),(x,y-1))))
    # largest flat region
    seen=set(); big=0
    for p in pts:
        if p in seen: continue
        c=px[p]; st=[p]; seen.add(p); k=0
        while st:
            x,y=st.pop(); k+=1
            for q in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if q in S and q not in seen and px[q]==c: seen.add(q); st.append(q)
        big=max(big,k)
    many=sum(1 for c,k in cols.items() if k>=3)
    return n, many, round(edge/n,2), round(big/n,3)

if __name__ == "__main__":
    for f in sys.argv[1:]:
        im = Image.open(f).convert("RGBA"); p = im.load(); W, H = im.size
        rgb = {(x, y): p[x, y][:3] for y in range(H) for x in range(W)}
        n, cols, edge, flat = stats(rgb, lambda x, y: p[x, y][3] > 200, W, H)
        print(f"{f}: px={n} colours={cols} edge={edge} flat={flat}")
