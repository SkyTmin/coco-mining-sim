# AGENTS.md — coco-mining-sim (instructions for Codex and other agents)

Roblox mining simulator (Luau + Rojo). Owner: SkyTmin (not a programmer, Russian-speaking). Codex writes the code
from task specs (ТЗ) in `docs/tz/`; Claude writes the specs and reviews every stage before the next one starts.

## Read first, in this order

1. `docs/PROGRESS.md` — current stage, what is done, what is next.
2. The ТЗ of the current stage: `docs/tz/TZ-NN-*.md`. **Do only what that ТЗ asks.** Anything outside it → write it
   in the stage report as a proposal, do not build it.
3. Design canon (Russian): `docs/design/wiki/00-README.md` (glossary + index). Open only the wiki files the ТЗ names.
   **Precedence:** the ТЗ → `wiki/18-balans-chisla.md` (all numbers, pickaxes, families, shop) and
   `wiki/19-lager-shakhta-i-lyudi.md` (camp, 8 players, social) → wiki files 01–17. Stage order: `docs/tz/README.md`.
   Balance data lives in `scripts/balance/data.mjs`; from stage 3 it feeds `scripts/design-decisions.json`.
   `docs/design/studio/*` are raw research behind the wiki — read only when the ТЗ points there.

## Where things come from

- `reference/katorga/` — read-only copies of files from the owner's previous game «Каторга»
  (github.com/SkyTmin/coco-prison-roblox, branch `stage-1`). Port from them; **never** edit them, never let Rojo build
  them (they are outside `src/`). When you port a file, strip everything the new game does not have (needs, hunger,
  combat, bosses, factions, locations, old mine) instead of copying it as is.
- `reference/prototype/tunnel-game.html` — the owner's HTML prototype of the tunnel. The owner liked its lightning a lot.
  Use it for the look/feel of the lightning and the wall ride; its data model (`class Mine`) is replaced by the one in
  `docs/tz/TZ-01`.

## Hard rules

1. **Server owns every outcome.** Clients send intents (`Hit(x, y, dRel)`), never amounts. Validate type, range,
   rate (token bucket), ownership of the plot, visibility of the cell. Rejected intents are dropped silently (`reject(seq)`),
   no kicks.
2. **Profile mutations only via `ProfileService.Mutate`.** A failed load sets `loadFailed` and is never saved.
3. `--!strict` in every Luau file. Pure logic in `src/shared/Mine` and `src/shared/Play` must not touch `game` or any
   Instance — it runs in Lune (tests, simulator) as well as in Roblox.
4. Before every commit: `stylua --check src tests`, `rojo build -o build/game.rbxl`, `lune run tests`. All green.
   `selene src` too when it runs in your environment (it needs a Roblox API dump; if it cannot run, say so in the report).
5. **Generated configs are never hand-edited.** Edit `scripts/design-decisions.json`, run `node scripts/build-configs.mjs`.
   The build must fail loudly on invalid data (rules in the ТЗ).
6. Every player-facing string goes into `src/shared/Strings` in **four locales: en (default), ru, es, fr**. No hard-coded
   UI text.
7. Numbers in configs/docs carry a source tag in a `_note`/`_why` field: `[владелец]`, `[решение]`, `[вики]`.
8. Never publish the place and never touch Roblox experience settings — the owner does Save/Publish.
9. Original game: genre mechanics are fine; never copy assets, names or levels of a specific existing game.
   «Better Combat» animations are All Rights Reserved — never use them.
10. Children are the audience: no free text input, no dark patterns, paid random items show odds before purchase.

## Conventions

- Code, identifiers and code comments: English. Docs, commit messages, stage reports: Russian.
- Commit messages short, Russian, typed: `feat(mine): …`, `fix(net): …`, `test(mine): …`, `docs: …`.
- One stage = one branch `stage-NN` (from `main`), commits as you go, PR to `main` at the end of the stage.
  Do not merge — Claude reviews, the owner merges.
- At the end of a stage append to `docs/PROGRESS.md`: what was done, how it was checked (commands + output summary),
  what is not done or deviates from the ТЗ, measured numbers (timings, sizes). Honest: a failing check is reported as
  failing.
- Tools are pinned in `rokit.toml`. Lune `lune-org/lune@0.10.4`. If a tool cannot be installed in your environment,
  stop and report it instead of working around it silently.

## Layout (target, see TZ-00)

```
src/first/   loading screen            src/shared/   Config/ (generated) Config.luau Strings/ Remotes.luau Types.luau Format.luau
src/shared/Mine/  MineGen MineState Shapes Worlds MineWire Hash        src/shared/Play/  (later stages)
src/server/  init.server.luau, Services/*                              src/client/  init.client.luau, Mine/ Fx/ Audio/ Ui/
scripts/     build-configs.mjs design-decisions.json make-studio-sync.mjs ...
tests/       *.spec.luau + run.luau (lune run tests)
reference/   read-only sources (not built)      docs/   PROGRESS.md, tz/, design/
```
