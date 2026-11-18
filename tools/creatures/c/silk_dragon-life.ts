import type { MotionPlan,XY } from '../types';

const deck=(x:number,y:number):XY=>[x/208,y/160];

// Flight crosses the same seam twice at different altitudes. The two attacks
// take place on opposite lobes, with the landing shadows on the planks.
const silkFlight:MotionPlan={
  stride:29, yaw:.36, fly:true,
  beats:[
    {seconds:.75,at:deck(75,132),anim:'idle',side:0,lift:0},
    {seconds:1.12,at:deck(75,132),anim:'fly',lift:0},
    {seconds:1.13,at:deck(52,140),anim:'fly',lift:4},
    {seconds:.90,at:deck(63,147),anim:'fly',lift:3},
    {seconds:1.10,at:deck(87,151),anim:'fly',lift:2},
    {seconds:1.80,at:deck(106,140),anim:'tech_kites',side:0,lift:3},
    {seconds:1.47,at:deck(106,140),anim:'fly',lift:3},
    {seconds:.98,at:deck(141,137),anim:'fly',lift:3},
    {seconds:1.02,at:deck(154,137),anim:'fly',lift:4},
    {seconds:.73,at:deck(146,147),anim:'fly',lift:4},
    {seconds:1.10,at:deck(126,151),anim:'tech_lash',side:0,lift:1},
    {seconds:1.05,at:deck(126,151),anim:'fly',lift:1},
    {seconds:1.35,at:deck(105,143),anim:'fly',lift:4},
    {seconds:.50,at:deck(75,132),anim:'idle',side:0,lift:0}
  ]
};
export default silkFlight;
