# Сборка галереи «Каторги»

Исходники взяты из `SkyTmin/coco-instruments`, ревизия `523bae1fdc0e06052648a3c3d09e9f1642ca615d`. Собственные рисунки и код игры распространяются по лицензии MIT, © 2025–2026 Shamil. Копия лицензии включена в галерею. [Исходный код](https://github.com/SkyTmin/coco-instruments/tree/523bae1fdc0e06052648a3c3d09e9f1642ca615d) · [Лицензия](../viewer/atlases/neutral/LICENSE.txt)

Понадобятся Node.js с npm, Python 3 с Pillow, Playwright и Chromium. Из корня `bosses-art` подготовьте отдельный клон игры и запустите Vite. Для этой сборки в клон устанавливаются только зависимости.

```sh
export GAME=/tmp/b4b/coco-instruments
mkdir -p /tmp/b4b
git clone https://github.com/SkyTmin/coco-instruments.git "$GAME"
git -C "$GAME" checkout --detach 523bae1fdc0e06052648a3c3d09e9f1642ca615d
(cd "$GAME" && npm ci && npm exec vite -- --host 127.0.0.1 --port 5201 --strictPort)
```

Во втором терминале из корня `bosses-art` укажите пути к установленным Playwright и Chromium. Пример использует пути облачного рабочего окружения.

```sh
export GAME=/tmp/b4b/coco-instruments PORT=5201
export PLAYWRIGHT_PATH=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs
export CHROMIUM=/usr/bin/chromium
node tools/creatures/katorga/bosses/export.mjs "$GAME" /tmp/b4b/bosses
python tools/creatures/katorga/pack.py --game "$GAME" --bosses /tmp/b4b/bosses --catalog /tmp/b4b/externals.json
(cd tools/creatures && node --import tsx gallery-catalog.ts /tmp/b4b/externals.json)
python tools/creatures/katorga/check.py --game "$GAME" --bosses /tmp/b4b/bosses
```

Экспортёр вызывает игровой `scripts/dungeon/anim-sheet.mjs` с режимами этажей из `bosses/specs.mjs`. Сборщик использует полные крупные полосы питомцев, число кадров, частоту и смещение из `PET_PX.large`. В компоненте игры `PetArt.tsx` суффикс `-l-v1.webp` выбирает золотую шкуру. Оба облика имеют одну систему координат и по шесть клипов.

Нейтральная стена и семь материалов рам общие для всех картин. Сборщик сохраняет исходные пиксели в WebP без потерь. Проверка сравнивает каждый кадр готового атласа с источником, измеряет границы, сверяет частоту и количество кадров, все 72 фазы каждой рамы и видимость внешних эффектов по разности игрового рендера с эффектом и без него. В конце она проверяет ограничения на вес и число файлов всей папки `viewer`.

Для босса «Отражение героя» в галерею вошли готовые кадры боевой композиции седьмого этажа. Игра создаёт зеркальный облик героя из графики Ninja Adventure Asset Pack, Pixel-boy и AAA, CC0 1.0. Исходные игровые полосы в поставку галереи не входят. [Атрибуция этажа](https://github.com/SkyTmin/coco-instruments/blob/523bae1fdc0e06052648a3c3d09e9f1642ca615d/public/dungeon/f7/CREDITS.txt) · [Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
