# Б4. Пингвин-маршал
Ранняя точка, 19 ноября 2026. Время UTC.

| Работа | Начало | Конец | Время | Клипы | Листы | Генерации с повторами | Автор |
|---|---|---|---|---:|---:|---:|---|
| Общая библиотека, включая чтение ТЗ и разбор 23 наблюдений Б3 | 03:48:31 | 03:49:53 | 1 мин 22 с | — | — | — | — |
| Пингвин-маршал, до приёмки | 03:50:04 | 04:12:52 | 0:22:48 | 23 | 9 | 10 | medium |

От первого обновления ветки до приёмки прошло 0:24:21. Время включает листы, программную анимацию и оба прохода критика. Переход на high не потребовался.

**Листы.** [Облик](references/penguin_marshal/appearance.png) · [Покой и взгляд](references/penguin_marshal/idle-look.png) · [Два жеста](references/penguin_marshal/fidgets.png) · [Радость](references/penguin_marshal/happy.png) · [Трюк](references/penguin_marshal/trick.png) · [Засыпание и пробуждение](references/penguin_marshal/sleep-io.png) · [Испуг и вылупление](references/penguin_marshal/wake-hatch.png) · [Скольжение](references/penguin_marshal/tech_slide.png) · [Снежный притоп](references/penguin_marshal/tech_leap.png).

Первая попытка [скольжения](references/penguin_marshal/tech_slide.try1.png) меняла хват. По замечанию критика автор сделал [вторую](references/penguin_marshal/tech_slide.try2.png). При итоговом просмотре укоротили маршрут у правого края, чтобы в кадре оставались клюв и точка удара.

[Отличия движений и источники](references/penguin_marshal/study.md) · [Самопроверка клеток](references/penguin_marshal/check.md) · [Библиотека](../../../../.agents/skills/pixel-bosses/references/motions/README.md).

**Проверка.** У маршала 42 ключа по листам, минимальный IoU 0,603. В обоих приёмах эффекты рождаются в точках контакта. Критик поставил 4,6/5 за каждый приём и минимум 4,5/5 за картину. В финальном life на кадрах 331–340 видны остриё и снег. На всех 720 кадрах тело остаётся внутри рамы, запас составляет минимум 6 пикселей. В просмотрщике на эмуляции Pixel 7 проверены выбор главной картины по подписи, одиночный и двойной тап, приём, уход и возвращение. Полная проверка экспорта сравнила 2 892 кадра. В атласе 23 клипа.

`npm test` — 127 из 127. `gate all` — 10 из 10. `snap all --check` подтвердил совпадение всех 14 153 кадров девяти старых картин и 2 766 кадров нового эталона.

`sheet-lint` проверил фон, края, цельность силуэта и палитру у всех 44 клеток. Для шести листов он отмечает разницу в высоте более 12% между стойкой и низкими позами. Масштаб головы и линию пола для этих клеток автор проверил вручную и привёл замеры в самопроверке.

[Showreel — жесты и оба приёма](https://github.com/SkyTmin/coco-mining-sim/releases/download/creatures-b4-penguin-preview/penguin-showreel.gif) · [Life — прогулка по картине](https://github.com/SkyTmin/coco-mining-sim/releases/download/creatures-b4-penguin-preview/penguin-life.gif).
