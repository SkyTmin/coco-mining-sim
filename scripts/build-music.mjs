import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(readFileSync(root+'scripts/design-decisions.json','utf8')).music;
const c=config.synthesis, beat=config.secondsPerMinute/config.bpm;
const out=root+'assets/music/build/';mkdirSync(out,{recursive:true});mkdirSync(root+'build/music',{recursive:true});
const count=Math.round(config.loopSeconds*c.sampleRate);
for(const stem of ['base','full','fever']){
 const wav=Buffer.alloc(44+count*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(c.sampleRate,24);wav.writeUInt32LE(c.sampleRate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++){
  const t=i/c.sampleRate, n=Math.floor(t/beat), bar=Math.floor(n/config.beatsPerBar);
  const subdivision=stem==='fever'?c.subdivision:1;
  const k=Math.floor(t/(beat/subdivision)), local=t-k*beat/subdivision;
  const note=c.melodyPattern[k%c.melodyPattern.length], bass=c.bassPattern[bar%c.bassPattern.length];
  const hz=c.frequencies[stem==='base'?bass:note]*(stem==='fever'?c.feverOctave:1);
  const tone=Math.sin(2*Math.PI*hz*local)+c.harmonicGain*Math.sin(2*Math.PI*hz*c.harmonic*local);
  const envelope=Math.min(1,local/c.attack)*Math.exp(-(stem==='base'?c.bassDecay:c.decay)*local);
  const kick=stem==='base'?Math.sin(2*Math.PI*c.kickFrequency*(t%beat))*Math.exp(-c.kickDecay*(t%beat))*c.kickGain:0;
  const edge=Math.min(1,t/c.attack,(config.loopSeconds-t)/c.attack);
  const sample=Math.max(-1,Math.min(1,(tone*envelope+kick)*c.gain*edge));
  wav.writeInt16LE(Math.round(sample*32767),44+i*2);
 }
 const path=root+'build/music/'+stem+'.wav';writeFileSync(path,wav);
 const result=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y','-i',path,'-af',`loudnorm=I=${c.targetLufs}:TP=${c.truePeak}:LRA=5`,'-ar',String(c.sampleRate),'-c:a','libvorbis','-q:a',String(c.vorbisQuality),out+stem+'.ogg'],{encoding:'utf8'});
 if(result.status!==0) throw new Error(result.stderr);
 console.log(`${stem}: ${config.loopSeconds}s, ${config.bpm} BPM, ${out+stem+'.ogg'}`);
}
writeFileSync(out+'README.md','# Временная тема этапа 5\n\nТри собственных стема, 120 BPM, 32 секунды, до-мажорная пентатоника. Синтезируются `node scripts/build-music.mjs`, без внешних семплов. Файлы загружает владелец; ID задаются в `scripts/design-decisions.json` → `music.worlds`. До загрузки движок молчит.\n');
