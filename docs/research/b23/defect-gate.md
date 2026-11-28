# Ошибки gate до Б22 · 41 картина

Прогон `aaa5b9a7ed19b6b0ef54856a8a40f3d80429d31b`. Команда CI `npm run -s ws -- gate all --force --jobs 3`. Все идентификаторы прочитаны из полного текста задания. Его итог — 27/41 за 1 000 с. Разные рабочие процессы возвращают блоки целиком. Первая строка ✓/✗ в блоке относится к автоматическому разбору клипов; далее могут упасть другие проверки, например регистрация исходных листов. Поэтому результат картины считался по всем сообщениям в её блоке, включая строку ✗ detail, а затем сопоставлен с итогом CI. [Полный лог задания](https://github.com/SkyTmin/coco-mining-sim/actions/runs/46155357823/job/141010703342) · [Артефакт](https://github.com/SkyTmin/coco-mining-sim/actions/runs/46155357823/artifacts/15268225458) · [Каждая ошибка, клип и диапазон кадров](defect-gate.tsv)

| Картина | Строка начала в полном логе | Ошибки (строки) | Другие сообщения `·` | Исход gate |
| --- | ---: | ---: | ---: | --- |
| apricot_bubbler | 251 | 0 | 0 | прошла |
| astral_seer | 284 | 22 | 12 | отказ |
| ball_pangolin | 222 | 12 | 14 | отказ |
| bell_magpie | 269 | 0 | 0 | прошла |
| bramble_warden | 266 | 0 | 0 | прошла |
| bun_panda | 329 | 22 | 13 | отказ |
| coin_dragon | 321 | 1 | 0 | отказ |
| crater_titan | 325 | 1 | 0 | отказ |
| dream_sneak | 366 | 21 | 21 | отказ |
| eclipse_drake | 874 | 26 | 12 | отказ |
| ember_panda | 428 | 16 | 9 | отказ |
| frost_fox | 411 | 0 | 0 | прошла |
| frost_yeti | 472 | 0 | 0 | прошла |
| garden_chameleon | 456 | 0 | 1 | прошла |
| gem_beetle | 477 | 0 | 0 | прошла |
| grove_lord | 501 | 0 | 5 | прошла |
| herald_griffin | 480 | 0 | 3 | прошла |
| ink_admiral | 531 | 0 | 2 | прошла |
| kettle_crab | 551 | 12 | 6 | отказ |
| lunar_plush | 572 | 0 | 0 | прошла |
| meadow_colossus | 587 | 0 | 0 | прошла |
| moon_magician | 641 | 20 | 10 | отказ |
| moon_warden | 614 | 0 | 11 | прошла |
| nebula_squid | 720 | 0 | 6 | прошла |
| opal_skater | 674 | 0 | 0 | прошла |
| penguin_marshal | 689 | 0 | 0 | прошла |
| pocket_magnet | 705 | 0 | 0 | прошла |
| prism_serpent | 749 | 15 | 10 | отказ |
| puff_kit | 777 | 21 | 5 | отказ |
| rat_king | 823 | 0 | 4 | прошла |
| river_otter | 806 | 0 | 2 | прошла |
| root_stag | 850 | 0 | 7 | прошла |
| sand_scorpion | 918 | 0 | 5 | прошла |
| silk_dragon | 915 | 0 | 0 | прошла |
| sky_whale | 947 | 0 | 2 | прошла |
| storm_lord | 1043 | 21 | 7 | отказ |
| storm_ram | 944 | 0 | 0 | прошла |
| threshold_keeper | 1014 | 0 | 8 | прошла |
| toad_shaman | 972 | 0 | 0 | прошла |
| tuft_owlet | 977 | 13 | 6 | отказ |
| zephyr_whorl | 999 | 0 | 0 | прошла |

`·` — строки диагностического вывода, включая информационные. Это пояснение к объёму журнала; число предупреждений проверяющей утилиты может иметь другой знаменатель. Ошибки считаются строками: несколько несоблюдённых порогов детализации внутри одной строки остаются в ней дословно. Нулевой исход относится к историческому набору правил.

| Класс | Строк в логе | Разных картин | Объекты |
| --- | ---: | ---: | --- |
| нет листа/ключа | 200 | 12 | astral_seer, ball_pangolin, bun_panda, dream_sneak, eclipse_drake, ember_panda, kettle_crab, moon_magician, prism_serpent, puff_kit, storm_lord, tuft_owlet |
| проникновение | 15 | 6 | astral_seer, dream_sneak, ember_panda, moon_magician, puff_kit, tuft_owlet |
| перекрытие | 2 | 2 | coin_dragon, crater_titan |
| детализация | 1 | 1 | bun_panda |
| шов | 5 | 1 | eclipse_drake |
