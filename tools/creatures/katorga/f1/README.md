# Первый этаж «Каторги»

В `source/` находятся побайтные копии из `src/lib/` проекта [coco-instruments, 523bae1](https://github.com/SkyTmin/coco-instruments/tree/523bae1fdc0e06052648a3c3d09e9f1642ca615d/src/lib). Лицензия сохранена в `LICENSE`. Владелец и границы переноса указаны в [1-katorga.md](../../../../.agents/skills/pixel-bosses/references/1-katorga.md).

Из каталога `tools/creatures` выполнить `npm ci`, затем `node katorga/f1/build.mjs`. Получается автономный модуль `viewer/f1-native.mjs`. Проверка копий — `cd katorga/f1/source && sha256sum -c ../SHA256SUMS`.

Сборка извлекает оригинальные `Px` и методы определения поз, регистрирует рисовальщиков обитателей этажа и контактов босса. Декорации и плитки этажа в сборку не входят. Новые позы подключаются внутри области видимости авторского рига. Файл источника на диске остаётся идентичным upstream.

Для записи обеих GIF из того же проигрывателя галереи запустите из корня репозитория `python tools/creatures/katorga/f1/capture.py /tmp/rat-king-release`. Нужны Python Playwright, Chromium и FFmpeg. Команда сохраняет покадровые PNG и оглавление клипов в `frames/`. Для записи одного ролика добавьте `--only life` или `--only showreel`.
