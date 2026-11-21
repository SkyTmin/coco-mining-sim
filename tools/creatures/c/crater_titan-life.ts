import type { MotionPlan } from '../types';
export default {
  stride: 30,
  yaw: 0.77,
  beats: [
    { seconds: 0.53, at: [0.47, 0.76], anim: 'idle', side: 0.45 },
    { seconds: 2, at: [0.47, 0.76], anim: 'tech_ash', side: 0 },
    { seconds: 2.07, at: [0.47, 0.76], anim: 'walk' },
    { seconds: 0.34, at: [0.27, 0.83], anim: 'turn' },
    { seconds: 0.91, at: [0.27, 0.83], anim: 'walk' },
    { seconds: 0.35, at: [0.255, 0.78], anim: 'turn' },
    { seconds: 2.7, at: [0.255, 0.78], anim: 'walk' },
    { seconds: 1.6, at: [0.52, 0.612], anim: 'tech_quake', side: 0.4 },
    { seconds: 2.5, at: [0.52, 0.612], anim: 'walk' },
    { seconds: 1.2, at: [0.645, 0.755], anim: 'tech_fist', side: 0 },
    { seconds: 0.3, at: [0.645, 0.755], anim: 'turn' },
    { seconds: 2.04, at: [0.645, 0.755], anim: 'walk' },
    { seconds: 0.46, at: [0.47, 0.76], anim: 'turn', side: 0.45 },
  ],
} satisfies MotionPlan;
