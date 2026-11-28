import type { Scene } from '../types';
import bench from './sunlit_bench';

const scene: Scene = (p, t) => bench(p, t);
scene.front = bench.front;
// Felt under the tray lip, or the tabletop at the depth of the hanging star.
scene.ground = (x) => (x >= 111 && x <= 148 ? 102 : 95);
export default scene;
