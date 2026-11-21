# Крысиный король · этаж 1 «Крысиные норы»

Источник — игровой код `SkyTmin/coco-instruments`, ревизия `523bae1`. Засечки проверяются по **личному** здоровью большого короля. Общая полоса включает также по 12% его начального здоровья на каждого малого. До раскола это запас, после — оставшееся здоровье живых малых. [Засечки][bars] · [Общая полоса][hp]

| Стадия | Когда и кто действует |
| --- | --- |
| I · тесак и крышка | Старт с узлом хвостов и двумя малыми на нём. Король преследует героя. Свыше 3 клеток или при броске `r < 0,35` целится линией и катится. Вблизи при `r < 0,7` рубит тесаком конусом, иначе хлещет хвостами по кольцу. [Выбор приёма][choice] |
| II · «Стража!» | При ≤75% король ревёт. Из двух самых дальних от героя нор выходят латники с интервалом 0,4 с. Остаются приёмы I. С этой стадии отдельный призыв при готовом таймере и `r < 0,25` выводит из нор 3–4 крысы с шагом 0,2 с, затем перерыв 12 с. [Переходы][stages] · [Норы][holes] |
| III · «Узел лопнул» | При ≤50% король ревёт, узел рвётся один раз. Два малых вылетают назад под углами ±0,7 рад от обратного курса, начинают оглушёнными. Затем каждый сам преследует цель, выбирает перекат или хлыст. У большого остаются тесак, перекат, хлыст и призыв. [Раскол][split] · [Действия частей][choice] |
| IV · «Смена оружия» | При ≤25% король 1,5 с меняет оружие, оставляет тесак на полу, вызывает ещё одного латника. Главный теперь преследует быстрее. Издали (>3,4 клетки) или при `r < 0,3` прыгает, иначе трижды машет рельсом. Призыв имеет прежний приоритет. Малые сохраняют свои перекат и хлыст. [Смена оружия][stages] · [Выбор приёма][choice] |

**Движение и ритм.** Большой выбирает следующий приём после 1,3 с преследования, малый после 0,9 с. В первой половине замаха доводит тесак или рельс до цели. Перекат большого идёт со скоростью 9 клеток/с, малого — 10. Оба отражаются от стен и кружатся после второго отскока, попадания или 2,2 с качения. У головокружения большого длительность 1,3 с, малого — 0,8 с. После 150 с боя ярость ускоряет атаки и усиливает урон. [Преследование][choice] · [Перекат][roll] · [Стена][wall] · [Ярость][bars]

**Рельс и эффекты.** У тройного взмаха три раздельных конуса с шагом вперёд и веером искр. Перед прыжком круг следует за целью первые 0,4 с. Затем полёт длится 0,5 с, на приземлении появляется воронка, вслед за ней — кольцо радиусом 3 клетки с безопасной серединой. Родной рисовальщик берёт метку из состояния моба, контакт рисует в миг удара на двух слоях. [Взмахи][sweep] · [Прыжок и волна][leap] · [Метки и контакт][fx]

**Облик и стороны.** Сутулый король в профиль, корона, белая манишка, щит-крышка и узел хвостов с двумя венчанными головами. После раскола рисовальщик убирает привязанные головы, после смены оружия показывает рельс. Обычные позы короля используют правый и зеркальный левый профиль, малые — собственный четвероногий риг с таким же зеркалом. Для переката игра выбирает отдельный клубок по направлению. Курс движения и угол метки остаются мировыми. [Облик][art] · [Король и клубок][rig] · [Малый][quad] · [Угол метки][tele]

**Гибель.** Главный роняет оружие и корону, подламывается и падает; клип длится 1,5 с. Малый за секунду опрокидывается, его венчик откатывается вперёд. Если большой погиб до раскола, малые всё равно отрываются и продолжают бой. Корона как награда достаётся из общего сундука. Для повторения в галерее после IV малые подбегают к хвостам во время передышки и король возвращает тесак. Это переход картины по §2.7 ТЗ. [Гибель короля][death] · [Малый][smallDeath] · [Гибель части][hp] · [Сундук][chest]

[bars]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1283-L1293
[choice]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1388-L1447
[holes]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1324-L1355
[split]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1357-L1386
[roll]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1451-L1485
[wall]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1685-L1699
[sweep]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1538-L1568
[leap]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1571-L1641
[stages]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1725-L1761
[hp]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L1763-L1791
[art]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-art.ts#L5-L23
[rig]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-art.ts#L8521-L8554
[quad]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-art.ts#L8152-L8174
[fx]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-boss-fx.ts#L1-L28
[tele]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-boss-fx.ts#L949-L1027
[death]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-art.ts#L7381-L7394
[smallDeath]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-art.ts#L8122-L8144
[chest]: https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib/dungeon-floors/f1-brains.ts#L24-L33
