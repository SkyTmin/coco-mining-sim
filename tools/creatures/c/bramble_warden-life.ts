import type { MotionPlan, XY } from '../types';
const floor = (x: number, y: number): XY => [x / 160, y / 128];
export default {
  yaw: 0.49,
  stride: 23,
  beats: [
    { seconds: 0.8, at: floor(54, 82), anim: 'idle', side: 1.4 },
    { seconds: 2.7, at: floor(54, 82), anim: 'walk' },
    { seconds: 1.5, at: floor(88, 109), anim: 'look', side: 2.8 },
    { seconds: 2.2, at: floor(88, 109), anim: 'walk' },
    { seconds: 2, at: floor(50, 98), anim: 'tech_ram', side: 0 },
    { seconds: 2.0, at: floor(50, 98), anim: 'walk' },
    { seconds: 0.25, at: floor(96, 94), anim: 'turn' },
    { seconds: 0.75, at: floor(96, 94), anim: 'walk' },
    { seconds: 0.3, at: floor(91, 83), anim: 'turn' },
    { seconds: 2, at: floor(91, 83), anim: 'walk' },
    { seconds: 0.5, at: floor(54, 82), anim: 'turn', side: 1.4 },
  ],
} satisfies MotionPlan;
