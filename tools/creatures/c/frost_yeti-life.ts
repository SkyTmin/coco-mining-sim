import type { MotionPlan,XY } from '../types';

const snow=(x:number,y:number):XY=>[x/208,y/160];

// A heavy triangular patrol, with a pause to examine the foreground crust,
// a two-handed blow, and a reply to its echo from the far side of the old lead.
const icePatrol:MotionPlan={
  stride:26,yaw:1.06,
  beats:[
    {seconds:.75,at:snow(70,118),anim:'idle',side:0},
    {seconds:2.5,at:snow(70,118),anim:'walk'},
    {seconds:1.5,at:snow(110,121),anim:'look',side:1},
    {seconds:1.3,at:snow(110,121),anim:'tech_slam',side:0},
    {seconds:1.30,at:snow(110,121),anim:'walk'},
    {seconds:.31,at:snow(143,137),anim:'turn'},
    {seconds:.84,at:snow(143,137),anim:'walk'},
    {seconds:1.60,at:snow(144,118),anim:'tech_roar',side:0},
    {seconds:1.40,at:snow(144,118),anim:'walk'},
    {seconds:1.40,at:snow(111,118),anim:'walk'},
    {seconds:2.10,at:snow(70,118),anim:'idle',side:0}
  ]
};
export default icePatrol;
