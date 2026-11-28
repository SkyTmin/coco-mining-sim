# Протокол приёмки Б22

Проверка в рабочей ветке на Linux, Node 22.14.0 и npm 11.19.1. Ниже фактические строки из журналов команд. Для листов абсолютный путь сокращён до `.studio/`.

## Установка и тесты мастерской

```text
$ npm ci
added 16 packages in 2s
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   esbuild@0.25.12 (postinstall: node install.js)

$ npm test
1..281
# tests 281
# suites 0
# pass 281
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 155077.20135
```

## Полная сверка принятых картин

Параметр `--jobs 5` распределил работу между процессами. Каждая строка получена по отрисованным кадрам. У всех 41 картины повторно проверены ключи кэша, включая зависимости исходного Полюсика.

| Картина | Совпавших кадров | Секунд |
| --- | ---: | ---: |
| `apricot_bubbler` | 4004 | 24 |
| `astral_seer` | 4878 | 222 |
| `ball_pangolin` | 3600 | 71 |
| `bell_magpie` | 3805 | 59 |
| `bramble_warden` | 1134 | 14 |
| `bun_panda` | 10852 | 920 |
| `coin_dragon` | 1844 | 68 |
| `crater_titan` | 1889 | 74 |
| `dream_sneak` | 7672 | 457 |
| `eclipse_drake` | 10828 | 1679 |
| `ember_panda` | 4626 | 93 |
| `frost_fox` | 2916 | 85 |
| `frost_yeti` | 1381 | 30 |
| `garden_chameleon` | 3782 | 27 |
| `gem_beetle` | 1082 | 13 |
| `grove_lord` | 3952 | 136 |
| `herald_griffin` | 3042 | 80 |
| `ink_admiral` | 3066 | 77 |
| `kettle_crab` | 3600 | 47 |
| `lunar_plush` | 4070 | 34 |
| `meadow_colossus` | 2752 | 27 |
| `moon_magician` | 4974 | 181 |
| `moon_warden` | 2814 | 30 |
| `nebula_squid` | 3960 | 155 |
| `opal_skater` | 3858 | 30 |
| `penguin_marshal` | 2766 | 22 |
| `pocket_magnet` | 4079 | 24 |
| `prism_serpent` | 5806 | 128 |
| `puff_kit` | 5758 | 118 |
| `rat_king` | 3562 | 117 |
| `river_otter` | 3788 | 47 |
| `root_stag` | 2916 | 66 |
| `sand_scorpion` | 3468 | 142 |
| `silk_dragon` | 1201 | 22 |
| `sky_whale` | 3940 | 233 |
| `storm_lord` | 10732 | 634 |
| `storm_ram` | 1238 | 15 |
| `threshold_keeper` | 6310 | 529 |
| `toad_shaman` | 1632 | 49 |
| `tuft_owlet` | 3600 | 58 |
| `zephyr_whorl` | 3794 | 21 |
| **Всего** | **164 971** | |

## Строки завершения двух запусков

```text
$ npm run ws -- snap all --check --jobs 5
41/41 identical in 1776 s with 5 jobs

$ npm run ws -- snap all --check
33 unchanged since the identical check
moon_magician: 4974 frames identical
nebula_squid: 3960 frames identical
prism_serpent: 5806 frames identical
puff_kit: 5758 frames identical
river_otter: 3788 frames identical
rat_king: 3562 frames identical
silk_dragon: 1201 frames identical
root_stag: 2916 frames identical
41/41 identical in 260 s with 2 jobs
```

## Проверка pocket_magnet

```text
$ npm run ws -- gate pocket_magnet
✓ pocket_magnet: 14 animations, no errors, 0 warnings (18.0 s)
  pocket_magnet: FX gate checked 24 source clips and authored code
  pocket_magnet: 24 one-shot endpoints, lowest endpoint IoU 1.000

После npm ci
= pocket_magnet: unchanged since the green gate of 2026-11-28T16:51, skipped (--force re-runs)
```

## Проверка pocket_magnet_fx

```text
$ npm run ws -- gate pocket_magnet_fx
✓ pocket_magnet_fx: 14 animations, no errors, 0 warnings (15.9 s)
  pocket_magnet_fx: FX gate checked 24 source clips and authored code
  pocket_magnet_fx: 24 one-shot endpoints, lowest endpoint IoU 1.000

После npm ci
= pocket_magnet_fx: unchanged since the green gate of 2026-11-28T16:52, skipped (--force re-runs)
```

## Рабочие команды для эксперимента

```text
$ npm run ws -- drafts pocket_magnet_fx trick_b --seeds 1..3
.studio/pocket_magnet_fx-trick_b-drafts.png   3 columns × 9 rows, 144 px per frame on screen

$ npm run ws -- against pocket_magnet_fx trick_b --ref pocket_magnet
.studio/pocket_magnet_fx-trick_b-against-pocket_magnet.png   2 columns × 9 rows, 144 px per frame on screen

$ npm run verify -- --all-frames pocket_magnet_fx
{
  id: 'pocket_magnet_fx',
  animations: 26,
  gifs: 29,
  comparedFrames: 3435
}
```

## Мобильное воспроизведение и свет

```text
47 actual mobile frames, Chromium 151.0.7922.34, 47 frames differed; worst 323 pixels, max channel difference 3
selected 110→111→112→113→114→115 changed pixels [1484, 0, 0, 17424, 18077]
live 110→111→112→113→114→115 changed pixels [1480, 0, 0, 17422, 18078]
8 actual mobile frames, Chromium 151.0.7922.34, 8 frames differed; worst 69 pixels, max channel difference 1
light delta trick 43: worst 0, count 0, base worst 1
light delta trick 44: worst 1, count 81, base worst 2
light delta trick 45: worst 1, count 127, base worst 2
light delta trick 48: worst 1, count 28, base worst 2
light delta trick 131: worst 1, count 35, base worst 1
light delta trick 132: worst 1, count 54, base worst 2
light delta trick_b 111: worst 1, count 135, base worst 1
light delta trick_b 114: worst 1, count 217, base worst 2
light delta trick_b 120: worst 1, count 272, base worst 2
light delta trick_b 127: worst 1, count 207, base worst 1
light delta trick_b 132: worst 1, count 169, base worst 1
```

## Изменённые кадры относительно оригинала

```text
trick duration 166 changed 26 frames 44,45,46,47,48,49,50,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149 identical stepped light 0
trick_b duration 180 changed 37 frames 111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147 identical stepped light 180
```

## Проверки проекта

```text
$ stylua --check src tests
exit 0
$ rojo build -o build/game.rbxl
Built project to game.rbxl
exit 0
$ lune run tests
192 passed, 0 failed (49 spec files)
$ selene src
Input.luau:87,90,93   if_same_then_else
3 errors
10 warnings
0 parse errors
exit 1
```
