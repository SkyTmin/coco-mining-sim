import {lightFrame} from '../bodies/light-quadruped';
import {readCreatureCard} from '../bodies/card-data';
import {withTechniques} from '../technique';
import {effects} from './frost_fox-fx';
import book from './frost_fox-keys';
import {clips,gesture} from './frost_fox-poses';
import {foxSkin} from './frost_fox-skin';
const card=readCreatureCard('frost_fox');
const durations:Record<string,number>=Object.fromEntries(Object.entries(clips).map(([name,spec])=>[name,spec.seconds]));
const appearance={...foxSkin,pose:gesture,draw(...args:Parameters<typeof foxSkin.draw>){
  const [rig,skeleton,card,variant]=args;
  const duration=durations[skeleton.anim]??2;
  const end=duration-1/24;
  const idleLoop=['idle','walk','sleep','turn'].includes(skeleton.anim);
  const settle=Math.max(0,Math.min(1,(end-skeleton.time)/.35));
  const time=idleLoop?skeleton.time:skeleton.time*settle*settle*(3-2*settle);
  foxSkin.draw(rig,{...skeleton,time},card,variant);
}};
for(const move of Object.values(book))move.interpolate=true;
export default withTechniques({
  id:card.id,rarity:card.rarity,theme:card.theme,
  animations:{...clips,...Object.fromEntries(Object.keys(book).map(id=>[id,{seconds:2}]))},
  frame:lightFrame(card,card.life,appearance),effects,
},book);
