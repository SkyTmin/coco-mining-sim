import { aim, reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const aurora = sixPoses([
  [0,{}],[18,{yaw:-.58,twist:-.26,crouch:7,tailFan:-.4,...reach('tailTip',[-42,-16,36])}],
  [22,{yaw:.64,...reach('hindR',[-16,24,0]),crouch:4,tailFan:.64,'head.yaw':-.55,...reach('tailTip',[-15,26,38])}],
  [25,{yaw:2.06,twist:.22,...reach('hindR',[-16,24,0]),tailFan:1.2,'head.yaw':-1.36,...aim('tailTip',[34,21,33],25)}],
  [31,{yaw:2.43,...reach('hindR',[-16,24,0]),tailFan:.95,'head.yaw':-1.55,...reach('tailTip',[43,16,29])}],[47,{}],
]);
const pounce = sixPoses([
  [0,{}],[18,{dx:-6,jump:23,pitch:-.24,earFold:.86,tailLift:-1,...reach('foreR',[9,7,34])}],
  [23,{jump:13,pitch:.28,tailLift:-.67,...reach('foreR',[17,7,16])}],
  [26,{dx:8,lean:4,pitch:.47,crouch:4,tailLift:.3,...aim('foreR',[22,7,0],26),...reach('foreL',[18,-6,3])}],
  [32,{dx:8,crouch:9,pitch:.34,earFold:.45,...reach('foreR',[22,7,0])}],[47,{}],
]);
const rime = sixPoses([
  [0,{}],[18,{dx:-5,pitch:-.26,lean:-3,'head.pitch':-.42,tailLift:1,...reach('mouth',[17,1,57])}],
  [22,{dy:-2,lean:2,pitch:.14,'head.pitch':.13,tailFan:.43,...reach('mouth',[37,0,34])}],
  [25,{dy:-5,lean:7,pitch:.30,crouch:4,tailFan:.85,jaw:1,...aim('mouth',[50,-5,24],25)}],
  [31,{dy:-5,lean:9,pitch:.31,crouch:5,jaw:.9,...reach('mouth',[56,-6,23])}],[47,{}],
]);
const book:TechniqueBook={};
for (const {id,title,weapon,reference} of readCreatureCard('frost_fox').moves) {
  const floor=id==='tech_pounce';
  book[id]={title,weapon,reference,keys:floor?pounce:id==='tech_rime'?rime:aurora,
    contactKind:floor?'floor':'air',seconds:2,stop:1/24,shake:floor?.46:.26,
    ...(floor?{floorSocket:'foreRGround',recovery:'absorb',pathKeys:[{role:'prep',frame:8,pose:{crouch:8,pitch:.21,earLift:1.3,tailLift:.6}},{role:'prep',frame:20,pose:{dx:-5,jump:28,pitch:-.06,tailLift:-1.1,earFold:.95,...reach('foreR',[12,6,42])}}]}:{})};
}
export default book;
