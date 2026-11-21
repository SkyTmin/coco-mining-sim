import type { MotionPlan, XY } from '../types';
const floor = (x: number, y: number): XY => [x / 160, y / 128];
export default {
  yaw: 0.5,
  stride: 27,
  beats: [
    { seconds: 1.1, at: floor(103, 84), anim: 'idle', side: 5.2 },
    { seconds: 2.24, at: floor(103, 84), anim: 'walk' },
    { seconds: 0.16, at: floor(76, 100), anim: 'turn' },
    { seconds: 1.5, at: floor(76, 100), anim: 'walk' },
    { seconds: 1.4, at: floor(80, 101), anim: 'tech_prism', side: 0 },
    { seconds: 0.35, at: floor(80, 101), anim: 'turn' },
    { seconds: 2.05, at: floor(80, 101), anim: 'walk' },
    { seconds: 1.6, at: floor(102, 106), anim: 'look', side: 2.3 },
    { seconds: 1.58, at: floor(102, 106), anim: 'walk' },
    { seconds: 0.26, at: floor(115, 91), anim: 'turn' },
    { seconds: 1.06, at: floor(115, 91), anim: 'walk' },
    { seconds: 0.7, at: floor(103, 84), anim: 'turn', side: 5.2 },
  ],
} satisfies MotionPlan;
