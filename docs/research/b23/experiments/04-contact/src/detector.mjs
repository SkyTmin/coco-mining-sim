// Isolated candidate, without a change to the workshop. primitivesOf is the workshop's own accessor.
export function continuousPairs(rig, primitivesOf) {
    const {ells, caps} = primitivesOf(rig);
    const pairs = [];
    for (const cap of caps) {
        const volume = cap.r * cap.r * (cap.len + cap.r);
        const delta = cap.b.map((value, axis) => value - cap.a[axis]);
        for (const ell of ells) {
            if (ell.radii[0] * ell.radii[1] * ell.radii[2] < 3 * volume) continue;
            const from = cap.a.map((value, axis) => value - ell.c[axis]);
            const transform = v => ell.inv.map(row => row[0]*v[0] + row[1]*v[1] + row[2]*v[2]);
            const a = transform(from), d = transform(delta);
            const lengthSq = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
            const at = lengthSq === 0 ? 0 : Math.max(0,Math.min(1,-(a[0]*d[0]+a[1]*d[1]+a[2]*d[2])/lengthSq));
            const depth = Math.hypot(a[0]+at*d[0], a[1]+at*d[1], a[2]+at*d[2]);
            if (depth < 1) pairs.push({cap:cap.i,radius:cap.r,ell:ell.i,capLabel:cap.label,ellLabel:ell.label,depth});
        }
    }
    return pairs;
}

export function baseline(rig, pairs) {
    const byIndex = new Map(), byLabel = new Map();
    for (const hit of pairs) {
        byIndex.set(hit.cap+':'+hit.ell,hit.depth);
        const k = hit.capLabel+'|'+hit.ellLabel;
        byLabel.set(k,Math.min(byLabel.get(k) ?? 1,hit.depth));
    }
    return {count:rig.prims.length,byIndex,byLabel};
}

export function referenceDepth(rig, hit, bases) {
    const label=hit.capLabel+'|'+hit.ellLabel, index=hit.cap+':'+hit.ell;
    return Math.min(1,...bases.map(base=>{
        const byIndex=base.count===rig.prims.length ? base.byIndex.get(index) : undefined;
        return byIndex ?? base.byLabel.get(label) ?? 1;
    }));
}

export function reportable(rig, pairs, bases, allowed, depthLimit, dropLimit) {
    const result=[];
    for (const hit of pairs) {
        if (hit.depth >= depthLimit) continue;
        const matches=(a,b)=>hit.capLabel.includes(a) && hit.ellLabel.includes(b);
        if (allowed.some(({a,b})=>matches(a,b)||matches(b,a))) continue;
        const ref=referenceDepth(rig,hit,bases);
        const drop=ref-hit.depth;
        if (drop>dropLimit) result.push({...hit,drop});
    }
    return result.sort((a,b)=>b.drop-a.drop);
}
