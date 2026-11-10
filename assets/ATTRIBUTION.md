# Источники арта

[владелец] Эталон этапа 3в — `SkyTmin/coco-prison-roblox`, ветка `stage-1`, ревизия
`3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a`. Готовые текстуры и трещины используют ID владельца из
`assets/textures/ids.json` и `assets/cracks/ids.json` исходной игры. [Исходная ветка](https://github.com/SkyTmin/coco-prison-roblox/tree/3d7ba53c690cf7059df7930d3fa0b09dc3d32c0a)

- `assets/textures/blocks/reference/` — земля, терракота и цельный камень. Из них `scripts/prison-tiles.mjs`
  строит 14 новых плиток для миров 1–3 и общий атлас. [Лист сравнения](../docs/reports/stage-03c/art.md)
- `assets/models/pickaxe/pickaxe2.py` — модель владельца. Фоновый Blender экспортирует геометрию в
  `src/shared/Models/wooden_pickaxe.json`. Перенесены поза, удар и трансформация кирки из `SwingAnimations`,
  `CharacterAnimator`, `HeldItem` и `FirstPersonHand`.
- Десять стадий трещин и частицы разлома перенесены из `assets/cracks` и `src/client/BlockBreak.luau`.
