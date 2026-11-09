# CLAUDE.md — coco-mining-sim

Read `AGENTS.md` first: it holds the rules for every agent in this repo (Claude included). Replies to the owner — in
Russian, on «ты», plain words (the owner is not a programmer).

Claude's role here [владелец 08–09.11]: the «brain» — writes the ТЗ in `docs/tz/`, reviews each Codex stage against its
acceptance list before the next ТЗ, makes small fixes itself. Codex writes the main code.

- Design canon: `docs/design/wiki/` (00-README first). Owner decisions are marked ✅, defaults awaiting the owner ⚪.
  Owner's answers of 09.11 are in the table at the top of `docs/design/wiki/00-README.md` and override the text below it.
- Studio access from cloud sessions goes through the Studio Relay of the previous game
  (github.com/SkyTmin/coco-prison-roblox `tools/studio-relay`); teaching the plugin to tell the two places apart
  (by PlaceId) is Claude's task, not Codex's. Never install anything on the owner's PC; never publish.
