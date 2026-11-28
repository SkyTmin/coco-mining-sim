# Исправление поз. Покадровая проверка

Исходная ветка совпала с эталоном третьего пилота во всех 10 026 кадрах. После правок изменились 1 017 кадров в 20 анимациях. В каждом сравнительном листе прежний кадр расположен над исправленным. Номера отсчитаны от нуля при 24 кадрах/с.

[Полный список кадров и результатов проверок](section-1.json)

| Существо | Кадров | Изменились | Ошибки до → после | Предупреждения до → после |
|---|---:|---:|---:|---:|
| `bramble_warden` | 1134 | 0 | 0 → 0 | 1 → 0 |
| `coin_dragon` | 1844 | 14 | 0 → 0 | 5 → 0 |
| `crater_titan` | 1889 | 0 | 2 → 0 | 7 → 0 |
| `frost_yeti` | 1323 | 452 | 8 → 0 | 3 → 0 |
| `gem_beetle` | 1082 | 0 | 0 → 0 | 0 → 0 |
| `silk_dragon` | 1201 | 32 | 0 → 0 | 1 → 0 |
| `toad_shaman` | 1553 | 519 | 9 → 0 | 6 → 0 |

Проверили и вложенные главы. Каждый изменившийся кадр маршрута и показа всех приёмов попадает в ту же исправленную анимацию. Шестикадровые паузы между приёмами совпали с эталоном.

| Существо | Анимация и лист | Все изменённые кадры | Показаны на листе |
|---|---|---|---|
| `coin_dragon` | [tech_rain](changes/coin_dragon/tech_rain.png) | 22–28 | 22–28 |
| `coin_dragon` | [showreel](changes/coin_dragon/showreel.png) | 175–181 | 175–181 |
| `frost_yeti` | [happy](changes/frost_yeti/happy.png) | 1–24 | 1–2, 4, 7, 10, 13, 15, 18, 21, 24 |
| `frost_yeti` | [hatch](changes/frost_yeti/hatch.png) | 16–34 | 16, 18, 20, 22, 24, 26, 28, 30, 32, 34 |
| `frost_yeti` | [tech_snowball](changes/frost_yeti/tech_snowball.png) | 0–56 | 0, 4, 8, 17, 22, 27, 32, 39, 47, 56 |
| `frost_yeti` | [tech_slam](changes/frost_yeti/tech_slam.png) | 0–29 | 0, 3, 6, 9, 12, 15, 17, 19, 24, 29 |
| `frost_yeti` | [tech_icicles](changes/frost_yeti/tech_icicles.png) | 0–46 | 0, 11, 20, 24, 30, 32, 34, 36, 38, 46 |
| `frost_yeti` | [tech_roar](changes/frost_yeti/tech_roar.png) | 0–36 | 0, 3, 6, 9, 12, 17, 22, 25, 29, 36 |
| `frost_yeti` | [life](changes/frost_yeti/life.png) | 114–143, 204–240 | 114, 123, 128, 133, 143, 204, 215, 226, 233, 240 |
| `frost_yeti` | [showreel](changes/frost_yeti/showreel.png) | 0–56, 64–93, 101–147, 155–191 | 0, 32, 47, 83, 125, 131, 133, 135, 137, 139, 177, 191 |
| `silk_dragon` | [tech_loop](changes/silk_dragon/tech_loop.png) | 9–24 | 9–12, 14, 16, 18, 20, 22, 24 |
| `silk_dragon` | [showreel](changes/silk_dragon/showreel.png) | 9–24 | 9–12, 14, 16, 18, 20, 22, 24 |
| `toad_shaman` | [tech_croak](changes/toad_shaman/tech_croak.png) | 1–46 | 1, 7, 14, 20, 26, 30, 35, 39, 44, 46 |
| `toad_shaman` | [tech_tongue](changes/toad_shaman/tech_tongue.png) | 1–20 | 1–4, 7, 10, 13, 16, 18, 20 |
| `toad_shaman` | [tech_staff](changes/toad_shaman/tech_staff.png) | 1–32 | 1, 3–4, 8, 12, 16, 20, 23, 26, 32 |
| `toad_shaman` | [tech_leap](changes/toad_shaman/tech_leap.png) | 1–41 | 1, 5, 10, 13, 17, 20, 24, 27, 34, 41 |
| `toad_shaman` | [tech_spores](changes/toad_shaman/tech_spores.png) | 1–46 | 1, 5, 10, 17, 24, 30, 37, 41, 45–46 |
| `toad_shaman` | [phase](changes/toad_shaman/phase.png) | 1–51 | 1, 4, 7, 14, 20, 27, 33, 39, 45, 51 |
| `toad_shaman` | [life](changes/toad_shaman/life.png) | 79–110, 169–188, 191–236 | 79, 88, 98, 110, 169, 181, 198, 216, 226, 236 |
| `toad_shaman` | [showreel](changes/toad_shaman/showreel.png) | 1–46, 55–74, 83–114, 123–163, 172–217 | 1, 26, 67, 102, 125, 149, 195, 201, 208, 217 |

Проверили 196 пар кадров на 20 листах. Хэши всех верхних кадров совпали с исходными golden. Пиксели нижних рядов совпали с текущими композициями. В границы листов вошли все 439 590 изменённых пикселей этих пар.
