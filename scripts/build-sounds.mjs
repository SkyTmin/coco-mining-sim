import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const decisionsPath = resolve(root, "scripts/design-decisions.json");
const decisions = readFileSync(decisionsPath, "utf8");
const rules = JSON.parse(decisions).sounds.rules;
const event = JSON.parse(decisions).sounds.eventSynthesis;
const scratch = resolve(root, "build/sound-atlas");
const output = resolve(root, "assets/sounds/build");
const report = resolve(root, "docs/reports/stage-05");
for (const dir of [scratch, output, report]) mkdirSync(dir, { recursive: true });

const RATE = 48000;
const GAP = 0.12;
const mining = ["default_dirt_footstep.1", "default_dirt_footstep.2",
  "default_gravel_footstep.1", "default_gravel_footstep.2", "default_gravel_footstep.3"];
const gravel = ["default_gravel_dug.1", "default_gravel_dug.2", "default_gravel_dug.3",
  "default_gravel_dig.1", "default_gravel_dig.2"];
const sample = (file, duration, lowpass, sourceEnd = duration) => ({ file, duration, lowpass, sourceEnd });
const tone = (expression, duration, lowpass) => ({ expression, duration, lowpass });
const sine = (hz) => "sin(2*PI*" + hz + "*t)";
const softNote = (hz, decay, duration = 0.44) =>
  tone("(0.78*" + sine(hz) + "+0.1*" + sine(hz * 2) + ")*exp(-" + decay + "*t)", duration, 2400);
const notes = (frequencies, startGap, decay, duration) => tone(frequencies.map((hz, i) =>
  "0.55*" + sine(hz) + "*gte(t," + i * startGap + ")*exp(-" + decay + "*max(0,t-" +
  i * startGap + "))*min(1,max(0,t-" + i * startGap + ")/0.015)").join("+"), duration, 3000);
const clips = {
  hit_soft: mining.map((name) => sample(name, 0.52, 3500, 0.25)),
  break_soft: gravel.map((name) => sample(name, 0.48, 5600)),
  coin: [tone("(0.72*" + sine(523.25) + "+0.12*" + sine(1046.5) + ")*exp(-10*t)", 0.48, 4200)],
  link_note: [tone("(0.8*" + sine(329.63) + "+0.08*" + sine(659.26) + ")*exp(-19*t)", 0.44, 3000)],
  bolt_soft: [
    tone("sin(2*PI*(163*t-50*t*t))*(0.8+0.2*cos(48*t))*exp(-13*t)", 0.46, 1400),
    tone("sin(2*PI*(190*t-75*t*t))*(0.8+0.2*cos(37*t))*exp(-14*t)", 0.46, 1400),
  ],
  ride_stop: [sample("impactSoft_medium_001", 0.50, 1300, 0.182), sample("impactSoft_medium_003", 0.50, 1300, 0.139)],
  ult_windup: [tone("sin(2*PI*(86*t+160*t*t))*min(1,t/0.15)*exp(-22*max(0,t-0.15))", 0.45, 520)],
  ult_whump: [tone("(sin(2*PI*(99*t-37*t*t))+0.18*" + sine(157) + ")*exp(-8*t)", 0.52, 420)],
  ult_rumble_away: [tone("(" + sine(60) + "+0.38*" + sine(91) + "+0.18*" + sine(132) + ")*(0.81+0.19*cos(43*t))*exp(-3.7*t)", 0.92, 420)],
  ult_rumble_near: [tone("(" + sine(58) + "+0.33*" + sine(83) + "+0.22*" + sine(113) + ")*(0.83+0.17*cos(35*t))*(0.12+0.24*t*t)", 1.76, 440)],
  ult_thud: [tone("(sin(2*PI*(86*t-24*t*t))+0.18*" + sine(125) + ")*exp(-9*t)", 0.54, 380)],
  plate_hit: [sample("impactPlate_light_000", 0.58, 2900, 0.540), sample("impactPlate_light_003", 0.58, 2900, 0.526)],
  plate_break: [tone("(" + sine(121) + "+0.26*" + sine(307) + "+0.18*" + sine(515) + ")*(exp(-8*t)+0.4*exp(-8*abs(t-0.17)))", 0.68, 2100)],
  ui_tap: [tone("(" + sine(349.23) + "+0.12*" + sine(698.46) + ")*exp(-24*t)", 0.44, 2500)],
  buy_soft: [392, 415.3, 440].map((hz) => softNote(hz, 21)),
  level_tick: [softNote(587.33, 30)],
  card_morph: [notes([261.63, 329.63, 392, 523.25], 0.10, 10, 0.74)],
  heavy_hit: [tone("(sin(2*PI*(161*t-66*t*t))+0.18*" + sine(227) + ")*exp(-18*t)", 0.49, 900)],
  crit_soft: [softNote(523.25, 16), softNote(554.37, 16)],
  coin_rain: [notes([392, 523.25, 659.25], 0.075, 16, 0.57)],
  world_enter: [notes([196, 293.66, 392, 493.88], 0.12, 7, 1.02)],
  depth_knock: [205, 229, 253].map((hz) => softNote(hz, 37)),
  locked: [notes([293.66, 233.08], 0.08, 26, 0.49)],
  step_dirt: ["default_dirt_footstep.1", "default_dirt_footstep.2"].map(name => sample(name, 0.46, 4300, 0.25)),
  step_stone: ["default_hard_footstep.1", "default_hard_footstep.2"].map(name => sample(name, 0.46, 4300, 0.26)),
};
Object.assign(clips, {
 vein_chime: [notes(event.veinNotes,event.noteGap,event.noteDecay,event.veinSeconds)],
 bomb_tick: [softNote(event.tickHz,event.tickDecay,event.tickSeconds)],
 bomb_fizzle: [softNote(event.fizzleHz,event.fizzleDecay,event.fizzleSeconds)],
 bomb_blast: [softNote(event.blastHz,event.blastDecay,event.blastSeconds)],
 streak_step: [softNote(event.stepHz,event.noteDecay,event.stepSeconds)],
 rebirth_sting: [notes(event.rebirthNotes,event.rebirthGap,event.rebirthDecay,event.rebirthSeconds)],
 combo_sting: [notes(event.comboNotes,event.noteGap,event.noteDecay,event.comboSeconds)],
});
const frequent = new Set(["bomb_tick", "bomb_fizzle", "streak_step", "hit_soft", "break_soft", "coin", "link_note", "buy_soft", "level_tick",
  "heavy_hit", "crit_soft", "coin_rain", "depth_knock", "locked", "step_dirt", "step_stone"]);
const master = (target) => "loudnorm=I=" + target + ":TP=-2:LRA=5";
const format = ["-ar", String(RATE), "-ac", "1"];
const seconds = (value) => value.toFixed(3);

function ffmpeg(args) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { encoding: "utf8" });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stderr;
}

function measured(args, filter) {
  const log = ffmpeg([...args, "-af", filter, "-f", "null", "-"]);
  const result = log.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!result) throw new Error("FFmpeg loudnorm did not report loudness");
  const values = JSON.parse(result[0]);
  if (!Number.isFinite(Number(values.input_i))) throw new Error("No measurable signal");
  return values;
}

const entries = [];
const metadata = {};
let position = 0;
for (const [name, variants] of Object.entries(clips)) {
  metadata[name] = [];
  for (const [index, clip] of variants.entries()) {
    const label = name + "-" + (index + 1);
    console.log("mastering " + label);
    const raw = resolve(scratch, "raw.wav");
    const target = frequent.has(name) ? rules.frequentLufs : rules.rareLufs;
    const outputName = label + ".wav";
    const input = clip.file
      ? ["-i", resolve(root, "assets/sounds/source", clip.file + ".ogg")]
      : ["-f", "lavfi", "-i", "aevalsrc=" + clip.expression.replaceAll(",", "\\,") + ":s=" + RATE + ":d=" + clip.duration];
    const clipEnd = name === "break_soft" ? 0.275 : clip.sourceEnd ?? clip.duration;
    ffmpeg([...input, "-af", [
      "highpass=f=45", "lowpass=f=" + Math.min(clip.lowpass, rules.lowpassHz),
      "acompressor=threshold=0.09:ratio=4:attack=0.15:release=45:detection=peak",
      "afade=t=in:d=" + rules.fadeSeconds,
      "afade=t=out:st=" + (clipEnd - rules.fadeSeconds) + ":d=" + rules.fadeSeconds,
      "apad=whole_dur=" + clip.duration, "atrim=duration=" + clip.duration,
    ].join(","), ...format, "-c:a", "pcm_f32le", raw]);
    const stats = measured(["-i", raw], master(target) + ":print_format=json");
    const filter = master(target) + ":measured_I=" + stats.input_i + ":measured_TP=" + stats.input_tp +
      ":measured_LRA=" + stats.input_lra + ":measured_thresh=" + stats.input_thresh +
      ":offset=" + stats.target_offset + ":linear=true";
    const normalized = resolve(scratch, "normalized.wav");
    ffmpeg(["-i", raw, "-af", filter, ...format, "-c:a", "pcm_f32le", normalized]);
    const check = measured(["-i", normalized], master(target) + ":print_format=json");
    const correction = target - Number(check.input_i);
    ffmpeg(["-i", normalized, "-af", "volume=" + correction + "dB,apad=pad_dur=" + GAP +
      ",alimiter=limit=0.77:attack=1:release=30:level=false:latency=true",
      ...format, "-c:a", "pcm_f32le", resolve(scratch, outputName)]);
    metadata[name].push([position, clip.duration]);
    entries.push({ outputName, label, source: clip.file ? clip.file + ".ogg" : "синтез", position, duration: clip.duration, target });
    position = Number(seconds(position + clip.duration + GAP));
  }
}

const concat = resolve(scratch, "concat.txt");
writeFileSync(concat, entries.map(({ outputName }) => "file '" + outputName + "'").join("\n") + "\n");
const atlas = resolve(output, "atlas.ogg");
ffmpeg(["-f", "concat", "-safe", "1", "-i", concat, "-map_metadata", "-1",
  "-c:a", "libvorbis", "-q:a", "5", atlas]);

const rows = entries.map(({ label, source, position, duration, target }) => {
  const start = Math.round(position * RATE);
  const end = start + Math.round(duration * RATE);
  const trim = "atrim=start_sample=" + start + ":end_sample=" + end;
  const { input_i: actual, input_tp: peak } = measured(["-i", atlas], trim + "," + master(target) + ":print_format=json");
  if (Math.abs(Number(actual) - target) > 1) throw new Error(label + " measured " + actual + " LUFS, target " + target);
  return "| " + [label, source, seconds(position), seconds(duration), target, actual, peak].join(" | ") + " |";
});
const marker = /^    "clips": (?:\{\}|\{\r?\n[\s\S]*?^    \}),/m;
if (!marker.test(decisions)) throw new Error("Missing sounds.clips in design-decisions.json");
const json = Object.entries(metadata).map(([name, values]) => "      " + JSON.stringify(name) + ": " + JSON.stringify(values)).join(",\n");
writeFileSync(decisionsPath, decisions.replace(marker, '    "clips": {\n' + json + "\n    },"));
writeFileSync(resolve(report, "sounds.md"), [
  "# Громкость атласа этапа 5",
  "",
  "Сегменты измерены по декодированному atlas.ogg через ffmpeg loudnorm. Интервалы тишины между сегментами исключены.",
  "У всех исходников затухание по 10 мс с обоих концов, у ударов и разломов срез ниже 9 кГц [решение ТЗ-02б].",
  "",
  "| Сегмент | Исходник | Начало, с | Длина, с | Цель, LUFS | Измерено, LUFS | Пик, dBTP |",
  "|---|---|---:|---:|---:|---:|---:|",
  ...rows, "",
].join("\n"));
console.log(entries.length + " segments, " + seconds(position) + " s, " + atlas);
