# Источники звука

| Файл в `source/` | Автор | Лицензия | Источник |
|---|---|---|---|
| `impactMining_000.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactMining_000.ogg) |
| `impactMining_001.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactMining_001.ogg) |
| `impactMining_002.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactMining_002.ogg) |
| `impactMining_003.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactMining_003.ogg) |
| `impactMining_004.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactMining_004.ogg) |
| `impactSoft_medium_001.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactSoft_medium_001.ogg) |
| `impactSoft_medium_003.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactSoft_medium_003.ogg) |
| `impactPlate_light_000.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactPlate_light_000.ogg) |
| `impactPlate_light_003.ogg` | Kenney | CC0 1.0 | [Impact Sounds](https://kenney.nl/assets/impact-sounds) · [копия исходника](https://github.com/benjosua/nimbic/blob/8354f494e17f3ad1e7333f99d725a2980f15126c/static/audio/impactPlate_light_003.ogg) |
| `default_gravel_dug.1.ogg` | lolamadeus | CC0 1.0 | [Запись](https://freesound.org/people/lolamadeus/sounds/179341/) · [вариант Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/sounds/default_gravel_dug.1.ogg) |
| `default_gravel_dug.2.ogg` | lolamadeus | CC0 1.0 | [Запись](https://freesound.org/people/lolamadeus/sounds/179341/) · [вариант Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/sounds/default_gravel_dug.2.ogg) |
| `default_gravel_dug.3.ogg` | lolamadeus | CC0 1.0 | [Запись](https://freesound.org/people/lolamadeus/sounds/179341/) · [вариант Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/sounds/default_gravel_dug.3.ogg) |
| `default_gravel_dig.1.ogg` | lolamadeus | CC0 1.0 | [Запись](https://freesound.org/people/lolamadeus/sounds/179341/) · [вариант Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/sounds/default_gravel_dig.1.ogg) |
| `default_gravel_dig.2.ogg` | lolamadeus | CC0 1.0 | [Запись](https://freesound.org/people/lolamadeus/sounds/179341/) · [вариант Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/sounds/default_gravel_dig.2.ogg) |

Монеты, ноты, разряды, рокот, удары ульты, разрушение Плиты и нажатия синтезируются из осцилляторов в [build-sounds.mjs](../../scripts/build-sounds.mjs).
Новые сигналы этапа 3 (`buy_soft`, `level_tick`, `card_morph`, `heavy_hit`, `crit_soft`, `coin_rain`, `world_enter`,
`depth_knock`, `locked`) синтезированы для COCO из осцилляторов в том же скрипте, без сторонних сэмплов. Лицензия CC0 1.0.
Имена и уровни всех сегментов перечислены в [отчёте](../../docs/reports/stage-03/sounds.md).

Лицензии исходников подтверждены на странице [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) и в [списке звуков Luanti](https://github.com/luanti-org/minetest_game/blob/9e895af6e9feb98332fa1a778001442f5669bc20/mods/default/README.md).


## Этап 3в

Удар и шаги дополнены исходниками из «Каторги»-Roblox. Перечень лицензий сверён по `mcl_sounds-README.txt`.

| Файл в `source/` | Автор | Лицензия | Источник |
|---|---|---|---|
| `default_dirt_footstep.1.ogg` | Mito551 | CC BY-SA 3.0 | [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_dirt_footstep.2.ogg` | Mito551 | CC BY-SA 3.0 | [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_gravel_footstep.1.ogg` | Mito551 | CC BY-SA 3.0 | [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_gravel_footstep.2.ogg` | Mito551 | CC BY-SA 3.0 | [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_gravel_footstep.3.ogg` | Mito551 | CC BY-SA 3.0 | [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_hard_footstep.1.ogg` | Erdie | CC BY 3.0 | [Запись](https://freesound.org/people/Erdie/sounds/41579/) · [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |
| `default_hard_footstep.2.ogg` | Erdie | CC BY 3.0 | [Запись](https://freesound.org/people/Erdie/sounds/41579/) · [VoxeLibre](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a/assets/thirdparty/voxelibre/sounds) |

Итоговый атлас обработан и распространяется под CC BY-SA 4.0. [Лицензия](https://creativecommons.org/licenses/by-sa/4.0/) · [Замеры](../../docs/reports/stage-03c/sounds.md)
