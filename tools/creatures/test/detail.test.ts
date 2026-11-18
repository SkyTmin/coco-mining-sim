import test from 'node:test';
import assert from 'node:assert/strict';
import { measureDetail, minimumColours } from '../detail';
import { Px } from '../rig/px';
import { loadPainting } from '../render';
import { sizes } from '../types';

test('native metrics distinguish four-connected islands and exclude the transparent boundary', () => {
  const p = new Px(4,3);
  for(const [i,v] of [0,1,1,0, 1,0,0,1, 0,1,1,0].entries())
    p.set(i%4,Math.floor(i/4),[v,10,20,255]);
  const m=measureDetail(p);
  assert.equal(m.pixels,12); assert.equal(m.colours,2);
  assert.equal(m.edge,1); assert.equal(m.flat,2/12);
  p.data[3]=200;
  assert.equal(measureDetail(p).pixels,11);
});

for(const id of ['bramble_warden','gem_beetle','silk_dragon','frost_yeti','toad_shaman','crater_titan','coin_dragon']){
  test(id+' meets the native painting detail bar',async()=>{
    const {c}=await loadPainting(id);
    const [,fieldHeight,canvas]=sizes[c.rarity];
    const body=c.frame('idle',0,0,'normal').px;
    const m=measureDetail(body), diagnostic=JSON.stringify(m);
    assert.equal(body.w,canvas); assert.equal(body.h,canvas);
    assert.ok(m.colours>=minimumColours[c.rarity],diagnostic);
    assert.ok(m.edge>=.85,diagnostic); assert.ok(m.flat<=.03,diagnostic);
    assert.ok(m.height>=fieldHeight*.55 && m.height<=fieldHeight*.65,diagnostic);
  });
}
