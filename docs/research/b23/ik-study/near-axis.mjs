// Run from tools/creatures with node --import tsx /path/to/near-axis.mjs.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { ik } = await import(pathToFileURL(resolve('kit/f11-mobkit.ts')));
const a = [3,-6,10], b = [3,-6,14];
const length = (p,q) => Math.hypot(...p.map((v,i) => v-q[i]));
for (const x of [0, 1e-6,1e-5,1e-4,1e-3,.01,.1,1]) {
  const pole = [x,0,1], joint = ik(a,b,4,4,pole);
  console.log(JSON.stringify({a,b,pole,joint,lengths:[length(a,joint),length(joint,b)]}));
}
