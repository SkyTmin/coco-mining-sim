> Часть скилла `pixel-bosses`. **Промт для листа ключевых поз**: читай перед каждой генерацией картинки-референса.

## 10. Лист ключевых поз: промт, самопроверка, исправление

Владелец [19.11]: «когда создаёт рисунок анимации, там тоже бывают артефакты, поэтому нужно максимально подробный
промт писать». Что уже ломалось на листах Б2б (Квакунья `tech_staff`): в позе «контакт пяткой» пятка посоха висит в
воздухе, навершие закрывает глаз, в «отскоке» посох лежит поперёк тела. Модель рисует красиво, но **механику и
логику сама не держит** — её задаёт промт, проверяет самопроверка и `ws sheet-lint`.

### 10.1. Правила (без исключений)

1. **Один лист — одна анимация, не больше 6 поз.** Длинное движение — несколько листов; второй лист получает первый
   как картинку-образец. Чем больше клеток, тем больше повторов и лишних конечностей (так пишут и пользователи
   генераторов).
2. **Образец облика — наш рендер.** К каждому запросу прикладывай картинку существа из нашего движка: только тело,
   ×4 ближайшим соседом, на `#FF00FF` (`npm run ws -- export-ref <id> [anim] [кадр]`). Облик берётся отсюда, а не из
   слов. Для нового существа, у которого ещё нет рига, — сначала лист облика (одна поза спереди-справа и сбоку), его
   принимает критик, дальше он и есть образец.
3. **Текст на картинке не просим.** Подписи ролей ставит наш скрипт под клетками. Модель путает буквы и рисует мусор.
4. **Всё механическое — числами и словами в промте**: какая рука что держит, где точка контакта, длина реквизита,
   куда смотрит морда, на какой ноге вес. Не «замахивается посохом», а «посох обеими руками над головой, навершие за
   затылком, локти выше ушей, вес на задних лапах».
5. **Промт пишется на английском** (модели генерации понимают его точнее), объяснения в карточке — по-русски.
   Промт целиком сохраняется в `docs/reports/creatures/<партия>/references/<id>/<anim>.prompt.txt` рядом с листом.
6. **Исправляем по одной вещи за раз** (§10.5), а не переписываем весь промт.

### 10.2. Шаблон (заполнить всё, что в фигурных скобках)

```
REFERENCE SHEET — {creature name}, animation "{anim}" ({what happens in one line})

LAYOUT
- One image, a grid of {cols} columns × {rows} rows = {N} equal cells, read left to right, top row first.
- Image size {W}×{H} px, each cell {cw}×{ch} px.
- Background: flat solid magenta #FF00FF in every pixel that is not the character. No gradient, no texture,
  no vignette, no ground plane, no cast shadow, no glow, no scenery.
- No grid lines, no cell borders, no text, no letters, no numbers, no labels, no arrows, no watermark, no logo.
- Exactly one character per cell, centred horizontally, fully inside the cell with at least 6% empty margin
  on every side. Nothing may touch or cross a cell border.

CHARACTER LOCK (same in every cell — match the attached image exactly)
- {body plan: e.g. "a squat heavy toad standing on four legs, front legs used as arms"}.
- Proportions: total height {h} units; head {x}% of height; arms reach to {where}; legs {short/long}.
- Counts that never change: {2} eyes, {2} arms with {3} fingers each, {4} legs with {4} toes each,
  {1} tail / {0} horns … Never add, remove, duplicate or fuse limbs, fingers, eyes or horns.
- Palette (keep exactly): {#hex body}, {#hex belly}, {#hex accents}, {#hex eyes}, outline {#hex}.
- Materials and details: {moss on the back, warts, belly plates, rope belt …}.
- Same size in every cell: in a standing pose the character is {p}% of the cell height; the feet stand on the
  same invisible baseline at {b}% of the cell height in every cell (except airborne poses: say so per cell).

PROP (if any)
- {staff}: one straight piece, constant length = {L}% of the character's standing height, {head shape} at the top,
  {heel} at the bottom.
- Grip: {right hand at the lower third, left hand at the middle}; fingers wrap around the shaft.
- The prop never passes in front of the eyes or the face, never goes through the body, never bends, never splits.

CAMERA (same in every cell)
- Three-quarter view from the front-right, looking slightly down (about 35°), no perspective distortion.
- The character faces {right, toward the target} in every cell unless a cell says otherwise.

STYLE
- Clean cel-shaded game illustration, dark 1-px outline, 3–4 flat tone steps, light from the top-left,
  crisp hard edges (no anti-aliased magenta fringe), strong readable silhouette.
- No motion blur, no speed lines, no impact effects, no particles unless a cell lists them.

POSES (each cell different — no two cells may show the same pose)
Cell 1 — {ROLE}: {weight: which feet carry the weight}; {torso: angle, twist}; {head: where it looks, mouth};
  {arms/hands: exact positions}; {prop: where its head and heel are relative to the body and the floor};
  {tail/ears/accessories}.
Cell 2 — …
Contact cell — the {contact part} TOUCHES {the floor | the target} exactly at {position: e.g. "one body length in
  front of the front feet, on open ground"}; the contact is fully visible, not hidden behind the body or a prop;
  the face is visible (profile or three-quarter), not the back.

AVOID
extra limbs, extra fingers, missing hands, fused or melted limbs, duplicated characters, a second character,
cropped body parts, the character touching cell borders, floating detached parts, a prop through the body or the
face, inconsistent colours or design between cells, text of any kind, background details, shadows on the
background, magenta tint on the character.
```

### 10.3. Позы по анимациям (что вписывать в POSES)

Фазы — из аналога из жизни и подсмотренных примеров (§4.3в). Опорные наборы:

| Анимация | Клетки (по порядку) |
|---|---|
| `idle` | вдох (грудь выше, плечи чуть вверх) · выдох (грудь ниже) · перенос веса или свой жест · моргание |
| `fidget_*` | исход · жест (осмотреться, почесать, зевнуть, отряхнуться) в 2–3 фазах · возврат |
| `walk` (двуногий) | контакт (пятка передней ноги касается пола, ноги шире всего) · опускание (колено согнуто, тело ниже всего) · проход (ноги рядом, тело выше) · подъём (толчок носком) |
| `walk` (четвероногий) | шаг четырёхтактный: задняя левая → передняя левая → задняя правая → передняя правая; в каждой клетке одна лапа в воздухе |
| `happy` | присед (сжатие) · прыжок/подъём рук (растяжение) · верх радости (морда счастливая, глаза дугой) · приземление (сжатие) · отскок |
| `trick` | исход · подготовка · сам трюк (2 фазы) · финальная поза «та-да» · возврат |
| `tech_*` / `attack` | стойка · подготовка (замах, откуда сила) · разгон · контакт (§10.2 «Contact cell») · отдача / проводка · возврат |
| `sleep_in` | зевок · садится / опускается · ложится, глаза закрываются |
| `sleep` | вдох · выдох (спина или бока ходят) |
| `sleep_out` / `wake_startled` | спит · рывок (глаза открыты, тело подпрыгнуло) · оглядывается · стойка |

### 10.4. Самопроверка листа (автор отвечает письменно, по каждой клетке, до `ws sheet-lint`)

1. Сколько глаз, рук, ног, пальцев, рогов — как в CHARACTER LOCK?
2. Реквизит: одна цельная прямая деталь нужной длины; в той руке, что указано; пальцы обхватывают?
3. Точка контакта: касается пола или цели там, где сказано; видна?
4. Морда видна (кроме клеток, где спина задумана)?
5. Все позы разные? Порядок соответствует фазам?
6. Рост и линия ступней одинаковые (кроме прыжков)?
7. Ничего не касается края клетки? Нет текста, теней, фона?
8. Логика: из позы N в позу N+1 можно перейти, не телепортируя конечности и реквизит?

Ответы — в карточку (`references/<id>/<anim>.check.md`). Есть «нет» — §10.5.

### 10.5. Исправление

- Найди одну причину и добавь **одно** уточняющее предложение в клетку, где ошибка (например: «the staff heel TOUCHES
  the floor one body length in front of the front feet; the staff head is above and behind the head, far from the
  eyes»). Перегенерируй.
- Если инструмент умеет править часть картинки — правь только плохую клетку; иначе весь лист с прошлым листом
  как образцом.
- Не больше трёх попыток на одну ошибку; дальше упрости позу (меньше деталей в клетке) и запиши в карточку, что
  не получилось.
- Каждая попытка: промт и картинка сохраняются (`<anim>.try2.prompt.txt` …) — следующий автор не повторит ошибку.

### 10.6. Машинная проверка `ws sheet-lint`

`npm run ws -- sheet-lint <sheet.png> --grid <cols>x<rows> [--ref <наш рендер>]` — до того как лист идёт в работу:
- фон: доля чистого `#FF00FF` вне силуэтов; нет градиента и теней (близкие к пурпуру, но не он);
- в каждой клетке ровно один крупный силуэт; посторонние пятна больше 12 px — ошибка;
- силуэт не ближе 4 % к краю клетки;
- рост и линия ступней по клеткам в пределах ±12 % (клетки-прыжки помечаются `--air 3,4`);
- кайма: пиксели-смесь пурпура с цветом существа по контуру — не больше 2 % контура;
- палитра клеток близка к палитре нашего рендера (`--ref`): чужой цвет больше 5 % силуэта — ошибка.

Лист с ошибкой `sheet-lint` в работу не идёт.
