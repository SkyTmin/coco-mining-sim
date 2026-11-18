import type { MotionPlan } from '../types';
export default {
  stride: 34,
  yaw: 0.48,
  beats: [
    { seconds: 0.42, at: [0.405, 0.76], anim: 'idle', side: 0.35 },
    { seconds: 1.8, at: [0.405, 0.76], anim: 'tech_breath', side: 0 },
    { seconds: 1.68, at: [0.405, 0.76], anim: 'walk' },
    { seconds: 0.31, at: [0.32, 0.657], anim: 'turn' },
    { seconds: 1.89, at: [0.32, 0.657], anim: 'walk' },
    { seconds: 1.6, at: [0.56, 0.615], anim: 'tech_chest', side: 0 },
    { seconds: 2.7, at: [0.56, 0.615], anim: 'walk' },
    { seconds: 0.25, at: [0.7, 0.82], anim: 'turn' },
    { seconds: 1.25, at: [0.7, 0.82], anim: 'walk' },
    { seconds: 2, at: [0.683, 0.697], anim: 'tech_dive', side: 2.45 },
    { seconds: 0.28, at: [0.683, 0.697], anim: 'turn' },
    { seconds: 2.18, at: [0.683, 0.697], anim: 'walk' },
    { seconds: 0.44, at: [0.405, 0.76], anim: 'turn', side: 0.35 },
  ],
} satisfies MotionPlan;
