import { aim, reach } from '../bodies/goals';
import type { V3 } from '../rig/f15-rig';

interface FrogTargets {
  mouth: V3;
  staffFoot: V3;
  staffTip: V3;
  handR: V3;
  handL: V3;
  footL: V3;
  footR: V3;
  pitch: number;
  twist: number;
  kick?: number;
  neck?: number;
}
// All targets are in body space (forward, right, up); the crook remains a rigid object.
function pose({
  mouth,
  staffFoot,
  staffTip,
  handR,
  handL,
  footL,
  footR,
  pitch,
  twist,
  kick = 0,
  neck = 0,
}: FrogTargets) {
  return {
    ...reach('mouth', mouth),
    ...aim('staffFoot', staffFoot),
    ...aim('staffTip', staffTip),
    ...reach('handR', handR),
    ...reach('handL', handL),
    ...reach('footL', footL),
    ...reach('footR', footR),
    pitch,
    twist,
    kick,
    neck,
    referenced: 1,
  };
}

// Stand with both palms on the crook.
const staffReady = pose({
  mouth: [30.7, 8.8, 34.0],
  staffFoot: [23.0, 41.7, 9.0],
  staffTip: [6.3, 29.8, 85.5],
  handR: [14.6, 35.7, 47.5],
  handL: [18.1, 38.2, 31.6],
  footL: [15.5, -39.7, 1.0],
  footR: [-17.1, 42.0, 1.0],
  pitch: 0.04,
  twist: 0.85,
  neck: -0.73,
});

export const staffDrive = [
  staffReady,
  // Lift above the crown with spring still in the ankles.
  pose({
    mouth: [25.5, 2.8, 52.0],
    staffFoot: [12.0, -34.1, 88.0],
    staffTip: [11.0, 43.4, 103.8],
    handR: [11.3, 17.5, 98.5],
    handL: [11.7, -14.1, 92.1],
    footL: [15.2, -37.0, 1.0],
    footR: [-12.5, 40.4, 1.0],
    pitch: -0.49,
    twist: -0.27,
  }),
  // Turn the raised shaft into the descending arc.
  pose({
    mouth: [33.1, 2.4, 32.0],
    staffFoot: [42.1, -42.5, 12.0],
    staffTip: [20.0, 10.4, 66.6],
    handR: [29.0, -11.0, 44.5],
    handL: [34.7, -24.8, 30.3],
    footL: [11.6, -31.0, 1.0],
    footR: [-12.1, 37.7, 1.0],
    pitch: 0.04,
    twist: -0.15,
  }),
  // Plant the heel in front of the face.
  pose({
    mouth: [18.4, -15.4, 28.0],
    staffFoot: [47.3, -38.3, 0.0],
    staffTip: [1.1, 11.4, 40.8],
    handR: [22.8, -11.9, 21.6],
    handL: [31.2, -20.9, 14.3],
    footL: [11.2, -38.9, 1.0],
    footR: [-9.0, 36.4, 1.0],
    pitch: 0.04,
    twist: 0.04,
  }),
  // Recoil in the arms and hips.
  pose({
    mouth: [28.4, 6.4, 46.0],
    staffFoot: [35.0, -40.4, 52.0],
    staffTip: [40.9, 36.1, 71.7],
    handR: [37.8, -3.9, 61.4],
    handL: [36.4, -22.6, 56.6],
    footL: [9.3, -37.5, 1.0],
    footR: [-9.6, 41.9, 1.0],
    pitch: -0.33,
    twist: -0.26,
  }),
  // Return to the initial two-handed grip.
  staffReady,
];

export const frogLeap = [
  // Stand above both folded hind webs.
  pose({
    mouth: [29.2, 11.1, 33.0],
    staffFoot: [-5.6, 53.1, 1.0],
    staffTip: [-11.4, 27.0, 75.5],
    handR: [-7.3, 45.3, 23.1],
    handL: [15.5, -25.3, 1.0],
    footL: [14.8, -48.3, 1.0],
    footR: [-20.3, 41.3, 1.0],
    pitch: 0.05,
    twist: 0,
  }),
  // Compress the hips and lower the chest.
  pose({
    mouth: [31.6, 12.0, 19.0],
    staffFoot: [-6.0, 61.3, 1.0],
    staffTip: [3.1, 37.8, 76.0],
    handR: [-3.8, 55.6, 19.1],
    handL: [16.1, -25.1, 1.0],
    footL: [13.0, -41.3, 1.0],
    footR: [-13.2, 40.7, 1.0],
    pitch: 0.42,
    twist: -0.15,
  }),
  // Extend both trailing legs with the front palm already reaching.
  pose({
    mouth: [15.2, -15.7, 58.0],
    staffFoot: [-1.8, 41.2, 31.0],
    staffTip: [1.9, 18.1, 106.6],
    handR: [-0.6, 33.3, 56.8],
    handL: [50.8, -31.0, 54.0],
    footL: [-27.6, 54.1, 38.0],
    footR: [-23.6, 55.6, 15.0],
    pitch: -0.05,
    twist: -0.12,
    kick: 1,
  }),
  // Receive the first contact on the front palm.
  pose({
    mouth: [28.3, 6.7, 31.0],
    staffFoot: [0.2, 51.6, 1.0],
    staffTip: [-10.6, 23.4, 74.2],
    handR: [-3.0, 43.2, 22.7],
    handL: [22.6, -28.2, 1.0],
    footL: [21.0, -48.8, 1.0],
    footR: [-13.2, 48.9, 1.0],
    pitch: 0.05,
    twist: 0,
  }),
  // Hold the palm fixed and absorb the remaining load through elbow and hips.
  pose({
    mouth: [35.2, 9.4, 25.0],
    staffFoot: [-10.7, 54.4, 1.0],
    staffTip: [-0.9, 27.2, 74.7],
    handR: [-7.8, 46.2, 23.1],
    handL: [22.6, -28.2, 1.0],
    footL: [13.9, -50.0, 1.0],
    footR: [-21.7, 51.3, 1.0],
    pitch: 0.04,
    twist: 0.14,
  }),
  // Rise from the contact before stepping back to the neutral stance.
  pose({
    mouth: [33.1, 10.8, 33.0],
    staffFoot: [-2.4, 50.6, 1.0],
    staffTip: [-9.9, 24.5, 75.3],
    handR: [-4.7, 42.6, 23.6],
    handL: [19.3, -27.5, 1.0],
    footL: [19.7, -49.3, 1.0],
    footR: [-15.5, 40.8, 1.0],
    pitch: 0.04,
    twist: 0,
  }),
];
