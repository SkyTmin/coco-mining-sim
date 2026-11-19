// Each row names a source AI mode, its Russian caption, recording window (seconds),
// and optional strike (art, shape, radius, warning), zone or projectile painters.
// An @ suffix distinguishes attacks that share the same pose in the game.
const floors = [
  [
    1,
    'king',
    `
roar|Рёв|1.25
chase|Ходьба|1.4
rollAim|Прицеливание перед перекатом|0.85
roll|Перекат|2.2|z:f1_rolldust
whipAim|Хлыст хвостом|1.65|f1_whip,ring,2.1,.7
cleaveAim|Рубка тесаком|1.7|f1_cleave,cone,2.4,.75
summon|Призыв стражи|1.6|z:f1_bulge
swap|Смена оружия|1.6|z:f1_cleaverdrop_hit
sweepAim|Тройной взмах рельсом|2.3|f1_sweep,cone,3,.7
leapAim|Подготовка прыжка|0.85|z:f1_takeoff
leap|Прыжок и ударная волна|1.7|f1_shock,ring,3,.5 z:f1_leap_hit
dizzy|Головокружение|1.3
stun|Оглушение|0.45
recover|Передышка|0.85`,
  ],
  [
    1,
    'kinglet',
    `
roar|Рёв|1.2
chase|Ходьба|1.4
rollAim|Прицеливание перед перекатом|.85
roll|Перекат|2.2|z:f1_rolldust
whipAim|Хлыст хвостом|1.5|f1_whip,ring,1.7,.7
dizzy|Головокружение|.85
recover|Передышка|.8`,
  ],
  [
    2,
    'f2_armor',
    `
roar|Пробуждение|1.5
chase|Ходьба|1.5
swing|Рубка мечом|1.6|f2_sword,cone,2.4,.72
thrustAim|Замах для укола|1.1|f2_thrust,line,3.2,.72
lunge|Выпад|.7
crouch|Подготовка прыжка|.8
air|Прыжок с ударом|1.8|f2_leap,circle,2,.72
idle@crack|Латы трещат|1.6
idle@burst|Латы разбиты|1.6|z:f2v_burst
rebuild|Сборка доспехов|2.1|z:f2v_reform
dizzy|Ошеломление|1.4
recover|Передышка|.9`,
  ],
  [
    2,
    'f2_mite',
    `
chase|Ходьба|1.4
ring|Кружение роя|1.8
windup|Укус|.85
hop|Прыжок в сторону|.7
gather|Сбор роя|1.5
escape|Уход под латы|.75
recover|Передышка|.8`,
  ],
  [
    3,
    'f3_maw',
    `
roar|Пробуждение|1.6|z:f3_fx_roar
swim|Плавание|1.6|z:f3_fx_wake
crawl|Ползание|1.6
rise|Всплытие|1|z:f3_fx_boil
leap|Прыжок из воды|2.1|f3_splash,circle,2,.65
beached|На берегу|2.3|f3_thrash,circle,2.6,.85
tail|Хвостовая волна|2|f3_wave,cone,4,.75
surface|Выныривание|1.5|z:f3_fx_splash
spit|Плевок|2.1|f3_spit,circle,1.3,.9
roar@phase|Голод|1.5|z:f3_fx_hunger`,
  ],
  [
    4,
    'f4_idol',
    `
roar|Пробуждение|1.3
idle@law1|Заповедь поклона|3.8|z:f4_judge
idle@law2|Заповедь неподвижности|3.8|z:f4_judge
idle@law3|Заповедь опущенного меча|3.8|z:f4_judge
idle@open|Открытое сердце|5
idle@gaze|Каменный взор|3.2|f4_beam,line,5,1.6
idle@spent|Истощение|3.6
idle@wrath|Гнев|1.65|z:f4_wrath
idle@slam|Удар рукой|1.8|f4_slam,circle,2,.8
idle@phase|Пробуждение стражей|2.5|z:f4_quake`,
  ],
  [
    4,
    'f4_statue',
    `
dormant|Дремота на постаменте|1.4
rise|Пробуждение|1.2|f4_wake,circle,1,.25
creep|Крадётся|1.5|z:f4_step
still|Замирание|1|z:f4_freeze
wind|Удар клинком|1.5|z:f4_cut
bow|Поклон|1.4
recover|Передышка|.7`,
  ],
  [
    5,
    'f5_minotaur',
    `
roar|Пробуждение|1.6
chase|Ходьба|1.6
aim|Прицеливание рогами|1.1
gore|Набег|1.4
skid|Торможение|.9
dizzy|Оглушение|2
axe|Удар секирой|1.8|f5_axe,cone,2.6,.8
whirl|Вихрь секиры|2.1|f5_whirl,ring,3,.9
bellow|Боевой рёв|2.1|f5_roar,circle,4,.9
idle@phase|Рёв лабиринта|3.2|z:f5_fxphase
idle@rage|Кровавая ярость|3.2|z:f5_fxphase
recover|Передышка|.85`,
  ],
  [
    6,
    'f6boss',
    `
roar|Пробуждение|1.7
chase|Ползание|2
f6_bite|Укус|1.8|f6_bite,cone,2.8,.8
f6_tail|Взмах хвостом|1.8|f6_tail,cone,3,.8
f6_wave|Полоса пламени|2.5|f6_wave,line,5,1
f6_sweep|Огненный веер|2.5|f6_sweep,cone,4,.9
f6_takeoff|Взлёт|1.4
f6_fly|Полёт|2
f6_mark|Прицеливание с высоты|1.25|f6_dive,circle,2.5,.95
f6_dive|Пикирование|1.8|f6_dive,circle,2.5,.7
f6_summon|Призыв змеёнышей|1.8
chase@phase|Смена фазы|1.8|z:f6_fxphase
dizzy|Оглушение|1.8
recover|Передышка|1`,
  ],
  [
    7,
    'f7boss',
    `
roar|Появление|1.5
intro|Выход из зеркала|2.5|z:f7_fxemerge
chase|Ходьба|1.6
combo|Первый удар|1.3
combo@second|Второй удар|1.35
combo@third|Завершающий удар|1.5
heavy|Тяжёлый удар|1.7|z:f7_fxheavy
dashAim|Подготовка рывка|.8
dash|Рывок|1.2|z:f7_fxstreak
guard|Блок|1.4
riposte|Контрудар|1.3|z:f7_fxparry
gaze|Зеркальный взгляд|2|z:f7_gazeflash
mdive|Нырок в зеркало|1.5|z:f7_fxdive
maim|Прицеливание из зеркала|1.5
mrun|Зеркальный пробег|1.5|z:f7_fxrun
shift|Фаза теней|1.6|z:f7_fxphase
shift@light|Отражённый свет|1.6|z:f7_fxphase
shift@shards|Разбитое зеркало|1.6|z:f7_fxphase
idle@shards|Залп осколков|2.3|f7_shardline,line,8,1
daze|Ошеломление|1.7
recover|Передышка|1`,
  ],
  [
    8,
    'f8boss',
    `
roar|Пробуждение|1.6
chase|Ходьба|1.5
phase|Шесть глаз|2.2
phase@crescent|Лунный серп|2.2
phase@moons|Семь лун|2.2
idle@moonray|Луч луны|2|f8_moonray,line,6,.9
fan|Веер полумесяцев|2.2|f8_crescent,cone,3,.75
sweep|Круговой взмах|1.8|f8_sweep,ring,3,.8
aim|Прицеливание|.9
dash|Рывок|1.6|f8_trail,line,4,.65
eyes|Разрезы глаз|2.4|f8_eyeslash,line,4,.9
volley|Змеиный залп|2.4|f8_serp,line,4,.9
rings|Лунные кольца|3.3
recover|Передышка|1`,
  ],
  [
    9,
    'f9boss',
    `
idle@tail|Взмах хвостом|2|f9_tail,cone,8.5,1.15 z:f9_tailfx
idle@flood|Разлив озера|1.8|z:f9_flood
idle@geyser|Гейзер|2.1|f9_geyser,circle,1.6,.9
idle@rise|Подъём из воды|2.4`,
  ],
  [
    9,
    'f9_head',
    `
rise|Подъём из воды|1.5
bite|Укус|1.6|f9_bite,circle,.85,.6
cast@fire|Огненный выдох|2.1|f9_firecone,cone,3.2,.7
cast@ice|Ледяной шар|2.1|f9_iceball,circle,1.6,.85
cast@venom|Ядовитый плевок|2.1|f9_venomglob,circle,1.5,.8
cast@bolt|Молния|2.1|f9_bolt,line,3.5,.8
cast@light|Световой луч|2.1|f9_glare,line,3.5,.8
heal|Исцеление|1.8|z:f9_healed`,
  ],
  [
    9,
    'f9_crown',
    `
rise|Подъём коронованной головы|1.5
up|Над водой|1.8
bite|Укус|1.7|f9_bite,circle,1.3,.7
prism|Призматический залп|2
dive|Нырок|1.3|z:f9_mud
hunt|Подводная охота|1.6
whirl|Водоворот|2|f9_whirl,ring,3,1`,
  ],
  [
    10,
    'f10boss',
    `
f10_throne|На троне|2
f10_command|Приказ свите|2|f10_bolt,line,4,.85
f10_rise|Подъём с трона|1.8|f10_shock,circle,2.8,.75
chase|Ходьба|1.5
slash|Рубящий удар|1.8|f10_slash,cone,3,.75
cleave|Раскол земли|2|f10_cleave,line,3.8,.85
stuck|Меч в земле|1.6
f10_storm|Грозовой залп|2.3|f10_bolt_line,line,4,.9
f10_unfurl|Расправление крыльев|1.7
f10_takeoff|Взлёт|1.5
f10_air|Перья в полёте|2.3|f10_feather,line,3,.8
f10_dive|Пикирование|2.1|f10_diveland,circle,2.8,.7
f10_landed|Приземление|1.6|f10_shockring,ring,3,.25
f10_roar|Рёв ярости|1.7
recover|Передышка|1`,
  ],
  [
    11,
    'f11boss',
    `
f11_wake|Пробуждение|2.4
f11_gaze|Взгляд линзы|1.8|f11_beam,line,4,1.43
f11_slam|Кулаки в землю|1.65|f11_slam,circle,1.8,0.9
f11_stomp|Топот|1.4|f11_stomp,ring,2.3,0.65
f11_rockets|Ракетная батарея|1.8|f11_rocket,circle,1.2,0.7
f11_spin|Двойной луч|4.25|f11_beam,line,5,.95
f11_shift|Перестройка корпуса|1.3
f11_stagger|На колене|2.3
chase|Ходьба|1.6
recover|Передышка|1`,
  ],
  [
    12,
    'f12boss',
    `
roar|Пробуждение|2.4
f12b_tusk|Бивни|1.35|z:f12_tuskhit
f12b_stomp|Топот|1.55|z:f12_stompring
f12b_paw|Скребёт копытом|1.05
f12b_charge|Набег|2.3
f12b_skid|Юз|0.85
f12b_stunned|Удар в стену|2.4|z:f12_wallhit
f12b_drum|Бубен шаманки|1.5|f12_snowwall,circle,3,0.35
f12b_spikes|Шипы из пола|1.75|f12_spikes,line,3,0.9
f12b_blow|Выдох на жаровню|1.3|z:f12_frostburst
f12b_douse|Идёт к жаровне|1.5
f12b_rear|Дыбы и вьюга|1.7|z:f12_phase
f12b_rear@ice|Ледниковый период|1.7|z:f12_phase
f12b_drop|Сияние и падение на колени|1.8|z:f12_phase
f12b_getup|Подъём|1.4
chase|Ходьба|1.6`,
  ],
  [
    13,
    'f13boss',
    `
f13_hang@rest|Покой|3
roar|Выход на сцену|2.4
f13_trans|Перемена декораций|3.2
f13_cut1|Рубка вагой|0.95|z:f13_v_cut
f13_cut2|Укол вагой|1.06|z:f13_v_thrust
f13_snare|Аркан|1.4|z:f13_v_snarethrow
f13_grid|Сетка|2.4|f13_gridline,line,3,1.2
f13_needle|Иглы|3.4
f13_hang@bolt|Молния над кораблём|1.55|f13_bolt,circle,1.2,1
f13_hang@memory|Память звезды|1.8|f13_memory,circle,1.5,1.1
f13_hang@star|Падение звезды|1.5|z:f13_starfall
f13_hang@wave|Волна сцены|1.8|z:f13_splash
f13_spent|Без сил|2.4
chase|Ходьба|1.6
recover|Передышка|1`,
  ],
  [
    14,
    'f14boss',
    `
roar|Пробуждение|2.4
f14_hour|Часовая стрелка|1.4|f14_lordhour,cone,2.7,0.8
f14_minute|Минутная стрелка|1.4|z:f14b_minmark
f14_lunge|Выпад|0.22
f14_stuck|Застрял|1.2
f14_spin|Вращение маятником|1.65|f14_lordspin,ring,2.1,0.9
f14_clap|Хлопок|2.25|z:f14b_stop
f14_place|Остановка и ножи|2.55|f14b_lknife,line,2.5,2.2
f14_ritual|Отмотка|5.5|z:f14b_ritualfx
f14_broken|Сломанные часы|2.4
f14_tired|Полночь|3|f14_midnight,circle,3,2
chase|Ходьба|1.6
recover|Передышка|1
f14_toHub|Путь к центру часов|1.6`,
  ],
  [
    15,
    'f15boss',
    `
f15l_sleep|Спящий плащ|2
f15l_stir|Шевелится|0.9
f15l_wake|Пробуждение|3.4
f15l_palm|Ладонь-созвездие|1.9|f15b_palm,circle,1.7,0.85
f15l_sweep|Рубящая дуга|1.35|f15b_sweep,cone,3.3,0.7
f15l_repel|Три кольца|1.8|f15b_repel,ring,3,0.95
f15l_well|Колодец тяготения|1.8|f15b_well,circle,3,0.9
f15l_orbit|Планеты короны|2|f15b_planet,circle,1.4,0.7
f15l_meteor|Звездопад|1.9|f15b_meteor,circle,1.0,0.9
f15l_conduct|Дирижёр памяти|1.5
f15l_dstrike|Когти из тьмы|1.8|f15b_nightclaw,cone,2.6,1.05
f15l_dstrike@stars|Пять звёзд из тьмы|1.8|f15b_starfall,circle,0.95,1.05
f15l_gather|Сбор орбит|2.2
f15l_memory|Память подземелья|2.4
f15l_wrap|Затмение|1.8
f15l_dark|Тёмный ход|1.5
f15l_open|Открытое ядро|2.6
f15l_nova|Сверхновая|3.6
f15l_core@beam|Вращение лучей звезды|6.9|z:f15b_fxsear
f15l_core@pulse|Ядро и импульс|2.1|f15b_pulse,ring,3.2,1.3
f15l_core@breath|Выдох звезды|2.8
chase|Ходьба|1.6
recover|Передышка|1`,
  ],
  [
    13,
    'f13_giant',
    `
f13_stand|На сцене|1.5
chase|Ходьба|1.5
f13_lance|Выпад копьём|1.6|z:f13_v_thrust
f13_shield|Удар щитом|1.8|z:f13_v_bash
f13_charge_aim|Подготовка разбега|1.2
f13_charge|Таран|1.8|z:f13_v_ram
f13_slump|Падение на колени|2|z:f13_v_slump
f13_rebuild|Подъём на нитях|2.3|z:f13_retie
recover|Передышка|1`,
  ],
  [
    15,
    'f15b_echo_king',
    `
chase|Ходьба|1.6
windup|Замах и рубка|1.5|
rollAim|Подготовка переката|.9
roll|Перекат|1.8
dizzy|Ошеломление|1.2
recover|Передышка|1`,
  ],
  [
    15,
    'f15b_echo_mino',
    `
chase|Ходьба|1.6
axe|Удар секирой|1.8|f15b_axe,cone,2.6,.75
aim|Подготовка набега|1
gore|Набег рогами|1.6
dizzy|Оглушение|1.5
recover|Передышка|1`,
  ],
  [
    15,
    'f15b_echo_serpent',
    `
chase|Ползание|1.6
f6_bite|Укус|1.7|f15b_bite,cone,2,.7
f6_wave|Волна пламени|2.2|z:f15b_flames
f6_sweep|Огненный веер|2.2|z:f15b_flames
dizzy|Ошеломление|1.4
recover|Передышка|1`,
  ],
  [
    15,
    'f15b_echo_hydra',
    `
chase|Призыв трёх голов|2.1`,
  ],
  [
    15,
    'f15b_echo_head',
    `
chase|Парение|1.4
bite|Укус|1.7|f15b_bite,circle,1.2,.7
cast@fire|Огненный плевок|2|z:f15b_flames
cast@ice|Ледяной плевок|2
cast@venom|Ядовитый плевок|2|z:f15b_miasma
recover|Передышка|1`,
  ],
  [
    15,
    'f15b_echo_demon',
    `
chase|Ходьба|1.6
slash|Рубящий удар|1.7|f15b_slash,cone,2.5,.7
cleave|Раскол|1.9|f15b_cleave,line,3,.8
stuck|Меч в земле|1.3
f10_storm|Грозовой залп|2.2|f15b_bolt,line,3.5,.9
recover|Передышка|1`,
  ],
];

const moving = new Set(
  'chase crawl swim roll gore skid creep ring gather escape dash mrun hunt f6_fly f10_air f12b_charge f12b_douse f12b_skid f13_charge f14_lunge f14_toHub f15l_dark'.split(
    ' ',
  ),
);
const idol = { law1: 1, law2: 1, law3: 1, open: 2, gaze: 3, spent: 4, wrath: 5 };
function poseData(kind, mode, variant, dur) {
  if (kind === 'f7boss') return { k: variant === 'third' ? 2 : variant === 'second' ? 1 : 0, len: 10 };
  if (kind === 'f2_armor' && variant === 'crack') return { vCrack: 0 };
  if (kind === 'f8boss' && mode === 'phase')
    return { phase: variant === 'moons' ? 3 : variant === 'crescent' ? 2 : 1 };
  if (kind === 'f4_idol')
    return {
      st: idol[variant] ?? 0,
      vRule: variant?.startsWith('law') ? Number(variant.at(-1)) : 1,
      vDur: dur,
      ...(variant === 'slam' ? { vSlam0: 0 } : {}),
      ...(variant === 'phase' ? { vPh0: 0, phase: 1 } : {}),
    };
  if (kind === 'f9boss')
    return variant === 'rise'
      ? { risen: 1, vRiseT: 0 }
      : variant === 'tail'
        ? { vLash: 0, vLashA: 0.65 }
        : {};
  if (kind === 'f9_head' || kind === 'f15b_echo_head')
    return {
      el:
        ['fire', 'ice', 'venom', 'bolt', 'light'].indexOf(variant) < 0
          ? 0
          : ['fire', 'ice', 'venom', 'bolt', 'light'].indexOf(variant),
    };
  if (kind === 'king')
    return { f1blade: ['swap', 'sweepAim', 'leapAim', 'leap'].includes(mode) ? 1 : 0, combo: 3 };
  if (kind === 'f13boss')
    return { lift: ['f13_hang', 'f13_needle', 'f13_trans', 'roar'].includes(mode) ? 1 : 0 };
  if (kind === 'f11boss') return { lock: 0.65, sa: 0.65, sdir: 1 };
  return {};
}

export const specs = floors
  .sort((a, b) => a[0] - b[0])
  .map(([floor, kind, text]) => {
    const lines = ['idle|Покой|2.4', ...text.trim().split('\n')];
    if (kind.startsWith('f15b_echo_')) lines.push('f15e_rise|Сборка созвездия|1.4');
    lines.push('dying|Гибель|auto');
    const rows = lines.map((line) => {
      const [key, label, seconds, effects = ''] = line.split('|');
      const [mode, variant] = key.split('@');
      const dur = seconds === 'auto' ? 0.7 : Number(seconds);
      const row = {
        id: key.replace('@', '_'),
        label,
        mode,
        dur,
        face: 0.65,
        dir: 0.65,
        data: poseData(kind, mode, variant, dur),
      };
      if (moving.has(mode)) Object.assign(row, { vx: 2.25, vy: 1.7 });
      if (effects)
        for (const fx of effects.split(' ')) {
          if (fx.startsWith('z:')) (row.zones ??= []).push(fx.slice(2));
          else {
            const [art, shape, r, warn] = fx.split(',');
            row.strike = { art, shape, r: Number(r), warn: Number(warn), w: 0.55, ang: 0.65, arc: 2.1 };
          }
        }
      return row;
    });
    return { kind, floor, rows, fps: 24, scale: 1 };
  });
