import { aim, reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';

const palm = (f: number,r: number,z: number) => reach('handR',[f,r,z]);
const sweep = sixPoses([
  [0,{}],
  [18,{squat:15,roll:.17,...reach('footR',[-12,12,0]),twist:-.73,pitch:.29,ear:-.35,shaftPitch:Math.PI*2-1.39,...palm(-5,20,39)}],
  [22,{squat:4,...reach('footL',[17,-12,0]),twist:-.52,roll:-.22,shaftPitch:Math.PI*2-.68,...palm(4,23,53)}],
  [25,{squat:5,...reach('footL',[23,-10,0]),...reach('footR',[-16,10,0]),twist:.43,pitch:.42,ear:.26,shaftPitch:Math.PI*2+1.46,...palm(24,18,46),...aim('weaponTip',[68,17,44],25)}],
  [30,{squat:8,...reach('footL',[23,-10,0]),...reach('footR',[-16,10,0]),twist:.78,pitch:.42,shaftPitch:Math.PI*2+1.89,...palm(25,18,34),...aim('weaponTip',[65,22,13])}],
  [47,{shaftPitch:Math.PI*2}],
]);
const tide = sixPoses([
  [0,{}],
  [19,{jump:20,ear:.42,nod:-.42,pitch:-.34,shaftPitch:1.24,...palm(10,22,65),twoHand:.35}],
  [23,{squat:1,ear:.18,shaftPitch:.57,...palm(19,19,62),twoHand:.35}],
  [27,{squat:14,pitch:.65,twist:.23,ear:-.4,...palm(15,21,36),...aim('weaponHeel',[27,23,0],27)}],
  [32,{squat:7,pitch:.28,nod:-.16,...palm(14,22,46),...aim('weaponHeel',[23,22,10])}],
  [47,{}],
]);
const book: TechniqueBook = {};
for (const move of readCreatureCard('moon_warden').moves) {
  const isSweep = move.id === 'tech_crescent';
  book[move.id] = {title:move.title,reference:move.reference,weapon:move.weapon,
    keys:isSweep?sweep:tide, contactKind:isSweep?'air':'floor',...(isSweep?{reachHand:'R' as const}:{}), seconds:2,
    ...(isSweep?{pathKeys:[
      {role:'prep' as const,frame:6,pose:{shaftPitch:1.52,shaftYaw:-.48,squat:4,...palm(11,27,43)}},
      {role:'prep' as const,frame:12,pose:{shaftPitch:3.13,shaftYaw:-.45,squat:7,...palm(2,25,50)}},
      {role:'strike' as const,frame:23,pose:{squat:4,twist:-.12,pitch:.14,...reach('footL',[20,-11,0]),shaftPitch:6.65,shaftYaw:-.80,...palm(16,25,57)}},
    ]}:{floorSocket:'weaponHeelGround',recovery:'rebound' as const}),
    stop:1/24,shake:isSweep?.35:.47,interpolate:true};
}
export default book;
