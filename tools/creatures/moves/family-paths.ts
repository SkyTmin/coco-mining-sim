// Positions in each pilot skeleton's native units (forward, right, up). A dragon sweeps
// with its tail or claw; a beetle uses its horn, and a biped holds a full-length pole.
// The choreography and six timing landmarks still come from the selected move template.
import type { BodyType } from '../bodies/card-data';
import type { MoveId, TargetPath, Track } from './templates';

type Paths = Partial<Record<MoveId, TargetPath>>;
type Sockets = Record<string, Paths>;

const armedPole: Paths = {
  overhead: [[12,-5,88],[21,-20,78],[36,-33,0],[43,-31,2]],
  ram: [[9,-38,65],[18,-39,54],[53,-35,28],[58,-32,25]],
  sweep: [[0,-45,57],[15,-45,44],[44,-26,0],[55,-19,3]],
  volley: [[27,-36,7],[32,-38,12],[32,-40,74],[32,-33,81]],
  pillars: [[12,-7,83],[21,-19,71],[34,-34,0],[38,-33,1]],
};
const beetleHorn: Paths = {
  sweep: [[22,18,47],[26,22,38],[48,10,0],[52,14,2]],
  ram: [[32,-11,42],[36,-8,36],[49,4,30],[54,5,32]],
  volley: [[37,-9,22],[40,-6,28],[39,4,61],[34,6,70]],
};
const silkTail: Paths = {
  sweep: [[-75,0,49],[-66,24,37],[49,-30,0],[48,-37,0]],
  leap: [[-64,6,65],[-53,8,82],[49,-30,0],[46,-35,0]],
  volley: [[-65,-16,36],[-62,-12,43],[-51,22,89],[-46,29,98]],
};
const titanFist: Paths = {
  ram: [[-2,51,44],[7,51,39],[34,45,24],[39,43,21]],
  summon: [[-3,53,42],[5,55,51],[18,61,79],[22,63,85]],
  overhead: [[14,47,106],[19,45,98],[20,44,0],[24,46,1]],
  pillars: [[-19,56,93],[-11,54,83],[23,45,0],[30,44,1]],
  sweep: [[-7,65,56],[1,64,41],[26,43,0],[31,37,2]],
  volley: [[18,46,11],[21,49,17],[33,53,64],[37,52,72]],
};
const dragonClaw: Paths = {
  pillars: [[17,38,73],[23,38,64],[31,32,0],[34,31,1]],
  sweep: [[18,38,71],[25,41,59],[32,30,0],[35,24,1]],
  volley: [[29,26,14],[31,28,21],[33,34,71],[33,36,78]],
  summon: [[21,25,28],[28,30,36],[37,37,66],[40,39,71]],
  ram: [[14,28,50],[22,30,44],[46,29,29],[52,26,27]],
};

const familyPaths: Partial<Record<BodyType,Sockets>> = {
  'armed-biped': {weaponTip:armedPole},
  'heavy-quadruped': {
    weaponTip:{sweep:[[-2,25,33],[13,29,24],[31,-8,0],[25,-20,6]]},
  },
  hexapod: {
    weaponTip:beetleHorn, horn:beetleHorn,
    mouth:{
      breath:[[20,7,36],[23,6,33],[32,-3,22],[34,-4,21]],
      dive:[[19,4,42],[23,2,36],[32,-1,7],[33,-3,23]],
    },
  },
  'long-flier': {
    weaponTip:silkTail, tailTip:silkTail,
    mouth:{
      breath:[[26,8,112],[34,7,111],[68,-1,96],[72,-5,91]],
      roar:[[41,6,91],[44,3,96],[46,2,106],[48,2,107]],
      dive:[[27,7,120],[38,7,113],[73,2,69],[51,2,120]],
    },
    handR:{summon:[[-12,32,84],[-10,33,85],[1,42,96],[6,44,101]]},
  },
  'squat-mage': {
    weaponTip:{
      overhead:[[15,52,103],[27,58,91],[45,67,0],[48,69,1]],
      ram:[[14,33,92],[24,39,84],[53,52,63],[58,55,60]],
      sweep:[[19,52,100],[25,58,93],[44,71,0],[54,79,10]],
      volley:[[43,70,29],[40,65,39],[29,52,95],[25,49,105]],
      pillars:[[15,52,103],[27,58,91],[45,67,0],[50,76,6]],
    },
    mouth:{
      breath:[[27,8,66],[35,6,61],[53,-4,45],[55,-6,41]],
      roar:[[31,7,41],[34,6,46],[44,-1,68],[46,-3,74]],
    },
    footL:{leap:[[11,-43,3],[13,-41,21],[21,-46,0],[24,-48,0]]},
    handR:{summon:[[9,48,34],[13,49,40],[19.8,46.28,61.64],[22.8,47.28,67.64]]},
  },
  giant:{
    weaponTip:titanFist, handR:titanFist,
    mouth:{
      breath:[[-12,6,95],[-4,5,96],[20,-5,91],[26,-7,87]],
      roar:[[-5,7,87],[-3,5,95],[7,-3,111],[11,-4,115]],
      dive:[[-8,7,103],[-1,6,99],[19,-3,77],[21,-4,94]],
    },
    footL:{leap:[[17,-22,5],[18,-24,31],[23,-26,0],[26,-27,0]]},
  },
  'winged-dragon':{
    weaponTip:dragonClaw, handR:dragonClaw,
    footL:{leap:[[2,-24,3],[5,-25,17],[12,-28,0],[14,-30,0]]},
    tailTip:{sweep:[[-39,33,73],[-33,42,60],[33,54,0],[43,48,1]]},
    mouth:{
      breath:[[40,9,111],[44,5,108],[65,-8,83],[68,-11,78]],
      dive:[[41,2,110],[49,1,101],[59,-3,13],[56,-7,85]],
    },
  },
};

export function familyPath(body:BodyType, socket:string, id:MoveId):TargetPath|undefined {
  return familyPaths[body]?.[socket]?.[id];
}

const familyMotion: Partial<Record<BodyType,Partial<Record<MoveId,{advance?:Track; lift?:Track}>>>> = {
  // Follow the blade across the front foot, keeping the sweep distinct from the downward blow.
  'armed-biped': {sweep: {advance: [-14,-10,20,25]}},
  // The giant's long legs need a lower lift to fit the airborne silhouette inside the picture.
  giant: {leap: {lift: [0,8,0,0]}},
};
export function movementFor(body:BodyType,id:MoveId) {
  return familyMotion[body]?.[id] ?? {};
}
