import type { MotionPlan,XY } from '../types';

const bog=(x:number,y:number):XY=>[x/256,y/208];

// Short steps through the fruiting bodies; the staff wakes mycelium at the
// first stop, and the throat sends ripples through a separate pool at the second.
const mushroomPatrol:MotionPlan={
  stride:22,yaw:1.22,
  beats:[
    {seconds:.75,at:bog(105,144),anim:'idle',side:0},
    {seconds:1.38,at:bog(105,144),anim:'walk'},
    {seconds:1.12,at:bog(74,157),anim:'walk'},
    {seconds:1.40,at:bog(94,151),anim:'tech_staff',side:0},
    {seconds:1.38,at:bog(94,151),anim:'walk'},
    {seconds:.97,at:bog(99,165),anim:'walk'},
    {seconds:1.50,at:bog(124,164),anim:'tech_tongue',side:0},
    {seconds:2.00,at:bog(124,164),anim:'tech_croak',side:0},
    {seconds:2.00,at:bog(124,164),anim:'tech_leap',side:0},
    {seconds:2.25,at:bog(124,164),anim:'walk'},
    {seconds:.30,at:bog(171,153),anim:'turn'},
    {seconds:.56,at:bog(171,153),anim:'walk'},
    {seconds:1.10,at:bog(142,144),anim:'walk'},
    {seconds:.29,at:bog(105,144),anim:'idle',side:0}
  ]
};
export default mushroomPatrol;
