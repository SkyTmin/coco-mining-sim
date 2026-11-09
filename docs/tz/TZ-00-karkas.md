# ТЗ-00. Каркас проекта

Ветка `stage-00`. Объём ≈ 2–3 «дня Codex».

## Цель простыми словами

Пустой, но правильный скелет игры: проект собирается, игрок заходит, у него создаётся и надёжно сохраняется профиль,
есть конфиги из одного файла решений, строки на 4 языках, экран загрузки, тестовый режим для владельца и запуск
тестов без Studio. Ни одной игровой механики — только фундамент, на котором этапы 1–2 строят шахту.

## 0. Что прочитать

- `AGENTS.md` (правила — обязательно).
- `docs/design/wiki/16-tekhnika-i-plan-rabot.md` §1.3 (что переносим, что выкидываем) и §1.4 (конфиги).
- Образцы: `reference/katorga/src/server/Services/ProfileService.luau`, `src/shared/Persistence.luau`, `Wire.luau`,
  `StorageNames.luau`, `Remotes.luau`, `Types.luau`, `Strings/init.luau`, `Config/init.luau`,
  `src/server/Services/CreativeService.luau`, `src/server/init.server.luau`, `src/first/*`, `scripts/build-configs.mjs`,
  `scripts/make-studio-sync.mjs`, `scripts/studio-loader.luau`, `scripts/serve-repo.mjs`, `scripts/setup-streaming.luau`,
  `scripts/qa-studio-render-state.luau`, корневые `rokit.toml`, `selene.toml`, `stylua.toml`, `.luaurc`, `default.project.json`.

## 1. Инструменты и корень репозитория

1. `rokit.toml` — ровно эти версии:
   ```toml
   [tools]
   rojo = "rojo-rbx/rojo@7.7.1"
   selene = "Kampfkarren/selene@0.32.0"
   stylua = "JohnnyMorganz/StyLua@2.6.0"
   lune = "lune-org/lune@0.10.4"
   ```
   Wally не нужен (внешних пакетов нет).
2. `stylua.toml`, `selene.toml`, `.luaurc` — перенести из образца без изменений (табы, `--!strict` по умолчанию).
3. `.gitignore`: `build/`, `*.rbxl`, `*.rbxlx`, `*.lock` от Studio, `node_modules/`, `sim-out/`.
4. `default.project.json` — по образцу, имя `"coco-mining-sim"`:
   ReplicatedFirst.Loading ← `src/first`; ReplicatedStorage.Shared ← `src/shared`; ServerScriptService.Server ← `src/server`;
   StarterPlayer.StarterPlayerScripts.Client ← `src/client`; TextChatService (ChatVersion = TextChatService).
   **Без** MaterialService и без `$path` на `reference/`. `globIgnorePaths: ["**/*.md", "**/*.spec.luau"]`.
5. `package.json` не нужен; Node-скрипты — чистый Node ≥ 20 без зависимостей.

## 2. Общие модули `src/shared`

### 2.1 `Remotes.luau`
Перенести механизм ленивого создания `ReplicatedStorage.Remotes` (`Remotes.event(name)`, `Remotes.func(name)`,
`Remotes.unreliable(name)`), **выкинуть** весь старый список событий из комментария. Новый комментарий-реестр в шапке,
на этом этапе только:
- сервер → клиент: `ProfileUpdated(profile)` один раз, затем `ProfilePatch(ops)`; `Toast(key, args?)`; `ServerLog(message, isError)`;
- клиент → сервер: `Creative(op, a?, b?)`.
Каждое новое событие в следующих этапах дописывается в этот реестр.

### 2.2 `Wire.luau`, `Persistence.luau`, `StorageNames.luau`
Перенести как есть (убрать упоминания старых систем в комментариях). `StorageNames` — префикс хранилищ для Studio/тестов,
как в образце.

### 2.3 `Types.luau`
Новый, маленький. Тип `Profile` версии 1:
```lua
export type Settings = {
	language: string?,        -- nil = язык Roblox игрока
	camera: string,           -- "first" | "third"; по умолчанию "first" [владелец 09.11]
	music: number, sfx: number, ui: number, -- громкости 0..1 (по умолчанию 0.7 / 1 / 1)
	reducedMotion: boolean,   -- меньше тряски и вспышек
	effects: string,          -- "auto" | "high" | "low"
}
export type Profile = {
	v: number,                -- версия схемы = 1
	coins: number,            -- монеты (double, без старого moneyScale)
	stats: { blocks: number, layers: number, playSeconds: number },
	settings: Settings,
	firstJoin: number, lastJoin: number, joins: number,
	mine: any?,               -- заполняет этап 1/2 (MineState.encode)
	loadFailed: boolean?,     -- служебное, никогда не сохраняется
}
```

### 2.4 `Format.luau` — числа для детей [владелец 08.11: «всегда 3 цифры … 1.15K, 1.15M»]
- `Format.short(n)`: меньше 1 000 — целое без дробей (`0`, `7`, `125`, `999`); дальше **ровно 3 значащие цифры** и суффикс:
  `1.15K`, `11.5K`, `115K`, `1.15M`, `B`, `T`, `Qa`, `Qi`, `Sx`, `Sp`, `Oc`, `No`, `Dc`; выше — `1.15e36`.
  Округление вниз (никогда не показывать больше, чем есть: 1 999 → `1.99K`, а не `2.00K`). Отрицательные — с минусом.
  Хвостовые нули не убирать (`1.00K` допустимо — «всегда 3 цифры»).
- `Format.grouped(n)`: `12 540` (узкий неразрывный пробел U+202F между тройками) — для барабана цифр.
- Тесты (Lune): `0, 7, 999, 1000→1.00K, 1149→1.14K, 1150→1.15K, 11500→11.5K, 115000→115K, 999999→999K, 1e6→1.00M, 1.15e12→1.15T, -1500→-1.50K`.

### 2.5 `Strings/`
- `Strings/init.luau` — функции по образцу: `Strings.t(key, locale?, ...)` (подстановка `{1}`, `{2}`), `Strings.has`,
  `Strings.localeOf(player)` (атрибут/настройка `language` → `LocalizationService`/`player.LocaleId` → `en`).
  **Язык по умолчанию — en** [владелец 09.11]. Фолбэк: нет строки в языке → en → сам ключ (и предупреждение в Studio).
- Таблицы строк — отдельные модули-части `Strings/Core.luau` (этот этап), дальше `Strings/Mine.luau` и т. д.:
  `return { key = { en = "...", ru = "...", es = "...", fr = "..." }, ... }`. Один модуль ≤ 150 000 символов (лимит
  ModuleScript 200 000 с запасом).
- Строки этапа: `loading_title`, `loading_tip_1..3`, `toast_saved`, `toast_load_failed`, `creative_on`, `creative_off`,
  `creative_title`. Переводы — нормальные, не машинный мусор; короткие (кнопка ≤ 12 знаков в любом языке).
- Тест (Lune): у каждого ключа во всех частях есть все 4 языка и нет пустых строк; плейсхолдеры `{n}` совпадают во всех языках.

### 2.6 `Config.luau` + `Config/*.json` (генерируются)
`Config.luau` по образцу: читает дочерние JSON-модули, даёт типизированный доступ. На этом этапе разделы `game` и `creative`.

## 3. Конфиги: `scripts/design-decisions.json` → `scripts/build-configs.mjs`

- Переписать `build-configs.mjs` **с нуля** по духу образца (образец читает старую вики — это выкинуть). Вход — только
  `scripts/design-decisions.json`. Выход — `src/shared/Config/<раздел>.json` (+ `init.luau` не трогать, он руками).
- Архитектура: таблица разделов `{ name, validate(data) → errors[], emit(data) → json }`; любой `errors.length > 0` →
  печать всех ошибок и `process.exit(1)`. Поля, начинающиеся с `_`, — комментарии/источники: в выход не идут.
- Разделы этапа 0:
  ```json
  {
    "_why": "Решения новой игры. Каждое число с пометкой источника в _note/_why.",
    "game": { "defaultLanguage": "en", "languages": ["en", "ru", "es", "fr"], "autosaveSeconds": 120,
              "_note": "[владелец 09.11] английский по умолчанию; [решение] автосохранение 120 с" },
    "creative": { "admins": [], "_note": "userId владельца и тестеров; место-создатель и Studio — всегда" }
  }
  ```
- Проверки: `languages` содержит `defaultLanguage`; `autosaveSeconds` 30…600; `admins` — массив целых.
- Тест (Lune или Node, на выбор): битый `design-decisions.json` (подложить временный файл через аргумент
  `--input <path>`) → код выхода 1 и понятная ошибка.

## 4. Сервер

### 4.1 `src/server/init.server.luau`
Загрузчик по образцу: список сервисов, `Start()` по порядку, ошибки в `pcall` с понятным логом, уступка кадра, если
старт длится > 0,5 с (функция `breathe()` из образца). На этом этапе: `ProfileService`, `CreativeService`, `ServerLog`.

### 4.2 `Services/ProfileService.luau` — перенос с упрощением
Сохранить **поведение** образца, выкинуть **содержимое** старой игры:
- Хранилище `StorageNames.progress("Profiles_v1")`; в Studio — отдельное `_QA`-хранилище как в образце.
- **Сессионный замок** `_lock = { job, token, at }` (acquire/release через `UpdateAsync`, чужой свежий замок → повтор с
  ожиданием, протухший замок (> 30 мин без продления) перехватывается) — как в образце.
- Загрузка с повторами; неудача → профиль по умолчанию с `loadFailed = true`, **никогда не сохраняется**, игроку тост
  `toast_load_failed`. `migrate(data)` — с поля `v`; сейчас только v1 и «пусто → по умолчанию».
- `ProfileService.Get(player)`, `IsReal(player)`, `IsNew(player)`, `OnLoaded(fn)`, `Mutate(player, fn)` (единственный способ
  менять профиль; помечает «грязный»), `SaveNow(player)`, `Replicate(player)`.
- Автосохранение каждые `Config.game.autosaveSeconds`, при выходе, в `BindToClose` (параллельно по игрокам, с лимитом
  времени как в образце).
- Репликация: `ProfileUpdated(profile)` целиком один раз после загрузки, дальше `ProfilePatch(ops)` с изменёнными
  верхнеуровневыми полями не чаще 10 раз/с (diff/deepCopy из образца). Служебные поля (`_lock`, `loadFailed`) клиенту не идут.
- Удалить: инвентарь, броню, всё про уровни/нужды/профессии/кейсы/аукцион/фракции/банды/экспорт/перенос, `ResetOwnProgress`
  (в Creative будет свой сброс, см. 4.3).
- `joins += 1`, `lastJoin = os.time()` при загрузке; `stats.playSeconds` копится раз в 10 с.

### 4.3 `Services/CreativeService.luau` — тестовый режим владельца
- Атрибут игрока `CreativeAllowed = true`, если: Studio (`RunService:IsStudio()`), или `player.UserId == game.CreatorId`
  (для группы — владелец группы), или userId в `Config.creative.admins`. Атрибут `Creative` (вкл/выкл).
- Remote `Creative(op, a?, b?)`, только при `CreativeAllowed`, иначе молча игнор. Операции этапа:
  `"toggle"`; `"coins", delta` (через `Mutate`); `"reset"` — профиль к значениям по умолчанию (**только в Studio**).
  Дальнейшие этапы добавят свои операции (шахта).
- Клиент: кнопка/окно на клавише **K** и маленькой кнопке в углу только для `CreativeAllowed` (заглушка-окно со
  списком операций; красота — позже).

### 4.4 `ServerLog`
Перехват `LogService.MessageOut` (предупреждения и ошибки сервера) → `ServerLog(message, isError)` всем игрокам с
`CreativeAllowed` (с ограничением: не больше 20 сообщений/с, дубликаты склеивать). Клиент показывает их в окне Creative.

## 5. Клиент

- `src/first/*` — экран загрузки по образцу (`Bootstrap`, `LoadingController`, `LoadingState`, `Locale`), без брендинга
  «Каторги»: тёмно-синий фон, крупное название-заглушка, полоска, подсказки `loading_tip_*`. Закрывается, когда клиент
  получил `ProfileUpdated` и `init.client` сказал «готов»; таймаут 30 с → закрыть всё равно.
- `src/client/init.client.luau` — пустой каркас: ждёт `ProfileUpdated`, хранит профиль, применяет `ProfilePatch`,
  предоставляет `getProfile()` модулям, показывает `Toast` (простая плашка внизу по центру, очередь), окно Creative.
- Никакого старого HUD/окон.

## 6. Тесты без Studio: Lune

- `tests/run.luau` — находит все `tests/**/*.spec.luau`, запускает, печатает итог, код выхода ≠ 0 при падении.
- `tests/lib/expect.luau` — маленькая библиотека: `expect(v).toBe(x)`, `toEqual` (глубокое), `toBeCloseTo(x, eps)`,
  `toThrow()`; `describe/it`.
- `tests/lib/loader.luau` — **важно**: модули `src/shared` пишутся в стиле Roblox (`require(script.Parent.X)`). Загрузчик
  читает файл, компилирует через `@lune/luau` `load(source, { environment = ... })` и подставляет фиктивный `script`,
  у которого `.Parent`, `:FindFirstChild(name)`, `:WaitForChild(name)` и индексация по имени отображаются на файлы/папки
  репозитория (`init.luau` = сама папка, `X.json` = таблица из JSON). Кэш модулей как у `require`. Так один и тот же
  код работает и в Roblox, и в Lune. Запрещено в чистых модулях: `game`, `workspace`, `Instance`, `task.wait`.
- Тесты этапа: `format.spec.luau` (2.4), `strings.spec.luau` (2.5), `config.spec.luau` (конфиг собирается, обязательные
  поля есть), `wire.spec.luau` (Wire туда-обратно с nil-дырами), `persistence.spec.luau` (логика `owns(lock, job, token)` и
  «протух/свежий»).

## 7. Скрипты для Studio (их использует Claude через реле — перенести и привести к новому проекту)

`scripts/make-studio-sync.mjs` (читает новый `default.project.json`, умеет фильтр `только,эти`), `scripts/studio-loader.luau`,
`scripts/serve-repo.mjs`, `scripts/setup-streaming.luau`, `scripts/qa-studio-render-state.luau`. Пути и имена — под новый
проект. `tools/studio-relay` **не переносить** (это делает Claude).

## Чего НЕ делать

Шахту, кирки, HUD, магазин, звуки, музыку, бустеры, топы — следующие этапы. Не переносить ничего из «выкидываем»
(16 §1.3). Не трогать `reference/`.

## Приёмка (всё должно быть правдой)

1. `rokit install` ставит инструменты; `stylua --check src tests` — чисто; `rojo build -o build/game.rbxl` — без ошибок;
   `lune run tests` — все тесты зелёные (в отчёте — вывод); `node scripts/build-configs.mjs` — генерирует, на битом входе падает.
2. В `src/` нет ни одного файла/упоминания систем «Каторги» из списка «выкидываем» (grep по словам: hunger, needs, boss,
   faction, gang, location, MineService старый, Dig, inventory — в отчёте вывод grep).
3. `selene src` — чисто, **или** в отчёте объяснено, почему не запускается (нет API dump) — тогда Claude прогонит у себя.
4. Проверка в Studio (делает Claude через реле, Codex готовит): игрок заходит → экран загрузки закрывается → в консоли
   «профиль загружен v1»; Creative `coins +100` → `ProfilePatch` пришёл; выход/вход → монеты на месте; второй заход того
   же игрока с другого сервера ждёт замок (лог), а не дюпает.
5. Отчёт в `docs/PROGRESS.md` (см. `AGENTS.md`) + PR `stage-00 → main`.
