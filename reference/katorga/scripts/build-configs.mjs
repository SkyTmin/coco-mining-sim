// Generates src/shared/Config/*.json from confirmed wiki data + scripts/design-decisions.json.
// Usage: node scripts/build-configs.mjs
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const outDir = join(root, "src", "shared", "Config");
mkdirSync(outDir, { recursive: true });
// compact = one line: big generated data (a ModuleScript holds at most 200 000 characters)
const write = (name, data, compact) => {
	writeFileSync(join(outDir, name), JSON.stringify(data, null, compact ? 0 : 2) + "\n");
	console.log("wrote", name);
};

const decisions = read("scripts/design-decisions.json");
const levelsWiki = read("wiki/in-game-wiki/levels.json");
const pricesWiki = read("wiki/in-game-wiki/block-prices.json");
const pickaxeWiki = read("wiki/client-audit/content-analysis/pickaxe-upgrades-recovery.json");
const otherWiki = read("wiki/client-audit/content-analysis/other-upgrades-recovery.json");
const armorWiki = read("wiki/client-audit/content-analysis/armor-and-axe-recovery.json");
const bossWiki = read("wiki/client-audit/content-analysis/boss-menu-recovery.json");
const sharesWiki = read("wiki/in-game-wiki/mine-shares.json");
const bowWiki = read("wiki/in-game-wiki/bow-upgrades.json");
const shearsWiki = read("wiki/in-game-wiki/shears-upgrades.json");

// ---------------------------------------------------------------- levels
// [владелец 08.11] the first levels are faster than the original (decisions.levelOverrides, tuned by simulation)
const levelOverride = (l) => (decisions.levelOverrides && decisions.levelOverrides[String(l.level)]) || {};
const levels = levelsWiki.levels.map((l) => ({
	level: l.level,
	money: levelOverride(l).money ?? l.money,
	blocks: levelOverride(l).blocks ?? l.blocks,
	hearts: decisions.hearts.base + decisions.hearts.perLevel * (l.level - 1),
	skillPoints:
		l.level >= decisions.skillPoints.firstLevel && (l.level - decisions.skillPoints.firstLevel) % decisions.skillPoints.every === 0
			? decisions.skillPoints.perLevel
			: 0,
}));
write("levels.json", {
	source: "wiki/in-game-wiki/levels.json [вики]; уровни 2–3 ускорены (design-decisions levelOverrides) [владелец 08.11]; сердца и очки навыков — [решение]",
	maxLevel: levelsWiki.rules.maxLevel,
	blocksSpent: false,
	moneySpent: true,
	levels,
	skills: decisions.skills, // the skill tree [меню 26.10, SKILL-TREE.md] (Shared/Skills)
	potions: decisions.potions, // the potion stand [вики POTIONS.md] (Shared/Potions)
});

// ---------------------------------------------------------------- blocks + locations
const counterByBlock = {
	sand: "Песок", gravel: "Гравий", dirt: "Земля", oak_log: "Дерево", melon: "Арбуз",
	stone: "Камень", cobblestone: "Камень", coal_ore: "Каменный уголь", coal: "Каменный уголь",
	iron_ore: "Железная руда", gold_ore: "Золотая руда",
	white_wool: "Белая шерсть", cobweb: "Паутина", // the shears' requirements [меню 26.10, SHEARS-UPGRADES.md]
};
const blocks = {};
const locations = [];
for (const loc of pricesWiki.locations) {
	const dec = decisions.mines[loc.id] || {};
	const def = decisions.mines._default;
	// Mine composition: confirmed menu tooltips ([меню]) win over design decisions; "air" = empty cells.
	const wikiShares = sharesWiki.mines[loc.id];
	const shares = wikiShares
		? Object.fromEntries(Object.entries(wikiShares).map(([k, v]) => [k, v / 100]))
		: dec.shares || Object.fromEntries(loc.blocks.map((b) => [b.id, 1 / loc.blocks.length]));
	if (wikiShares) for (const k of Object.keys(wikiShares)) if (k !== "air" && !loc.blocks.some((b) => b.id === k)) throw new Error(`share block ${k} not in price list of ${loc.id}`);
	for (const b of loc.blocks) {
		const phys = decisions.blocks[b.id];
		if (!phys) throw new Error(`no physics for block ${b.id}`);
		blocks[b.id] ??= {
			id: b.id,
			name: b.name,
			basePrice: b.base,
			hardness: phys.hardness,
			tool: phys.tool,
			minTier: phys.minTier,
			dropsAs: phys.dropsAs ?? null,
			dropCount: phys.dropCount ?? null,
			sellable: phys.sellable ?? true,
			itemOnly: phys.itemOnly ?? false,
			upgradeCounter: counterByBlock[b.id] ?? null,
		};
	}
	locations.push({
		id: loc.id,
		kind: dec.kind ?? "mine",
		name: dec.name ?? loc.name, // [владелец] a location may be renamed (prison → «Начальная локация»)
		unlockLevel: loc.level,
		requiresPass: loc.requiresPass ?? false,
		pvp: dec.pvp ?? (loc.level >= decisions.pvpFromLevel && loc.id !== "fraction_base"),
		requiresFaction: dec.requiresFaction ?? false,
		requiresGang: dec.requiresGang ?? false,
		requiresGangUpgrade: dec.requiresGangUpgrade ?? null,
		friendlyFire: dec.friendlyFire ?? false,
		miniMine: dec.miniMine ?? null,
		// Шот-шахта [вики HANDBOOK-WIKI]: one hit breaks any block; tool null = any (DigService, Config.shotTime)
		shot: dec.shot ? { tool: dec.shotTool ?? null } : null,
		mine: {
			size: dec.size ?? def.size,
			resetSeconds: dec.resetSeconds ?? def.resetSeconds,
			warnSeconds: dec.warnSeconds ?? def.warnSeconds,
			shares,
		},
		mines: Object.fromEntries(Object.entries(decisions.mines).filter(([k, v]) => k.startsWith(loc.id + "_") && v.shares).map(([k, v]) => [k, { shares: v.shares, ...(v.resetSeconds ? { resetSeconds: v.resetSeconds } : {}), source: v._source || "[решение]" }])), // per-mine overrides (e.g. prison_small)
		sellList: loc.blocks.map((b) => b.id),
		sharesSource: wikiShares ? "[меню]" : "[решение]",
	});
}
// Social locations with no price list (База банды, Гетто [вики LOCATIONS-MENU]): declared only in
// design-decisions.mines.<id> with kind + name + level, no mine of their own.
for (const [id, dec] of Object.entries(decisions.mines)) {
	if (id.startsWith("_") || !dec.kind || typeof dec.level !== "number" || !dec.name || locations.some((l) => l.id === id)) continue;
	const def = decisions.mines._default;
	locations.push({
		id,
		kind: dec.kind,
		name: dec.name,
		unlockLevel: dec.level,
		requiresPass: false,
		pvp: dec.pvp ?? false,
		requiresFaction: dec.requiresFaction ?? false,
		requiresGang: dec.requiresGang ?? false,
		requiresGangUpgrade: dec.requiresGangUpgrade ?? null,
		friendlyFire: dec.friendlyFire ?? false,
		miniMine: dec.miniMine ?? null, // Дворы: the 5×5 pads at the beacons (mines.warzone_<point>)
		mine: { size: def.size, resetSeconds: def.resetSeconds, warnSeconds: dec.warnSeconds ?? def.warnSeconds, shares: {} },
		mines: Object.fromEntries(Object.entries(decisions.mines).filter(([k, v]) => k.startsWith(id + "_") && v.shares).map(([k, v]) => [k, { shares: v.shares, ...(v.resetSeconds ? { resetSeconds: v.resetSeconds } : {}), source: v._source || "[решение]" }])),
		sellList: [],
		sharesSource: "[решение]",
	});
}
// Item-only entries (drops that are not blocks, e.g. melon slices): name/price from design decisions.
for (const [id, phys] of Object.entries(decisions.blocks)) {
	if (phys.itemOnly && !blocks[id]) {
		blocks[id] = { id, name: phys.name, basePrice: phys.basePrice, hardness: 0, tool: "any", minTier: 0, dropsAs: null, dropCount: null, sellable: phys.sellable ?? true, itemOnly: true, upgradeCounter: null };
	}
}
write("blocks.json", { source: "wiki/in-game-wiki/block-prices.json [меню]; твёрдость [ваниль]", money: decisions.money, blocks });
write("locations.json", { source: "wiki/in-game-wiki/block-prices.json [меню]; размеры/доли/таймеры [решение]", locations });

// ---------------------------------------------------------------- tools and gear
const val = (r) => r.exactValue ?? r.approximateValue ?? null;
function tiers(level) {
	return ["wood", "stone", "iron", "diamond"][Math.min(3, Math.floor((level - 1) / 4))];
}
function fromTransitions(list, mapReq) {
	return list.map((t) => ({
		from: t.fromLevel,
		to: t.toLevel,
		cost: t.cost.exactValue,
		requirements: mapReq(t),
		enchantAfter: (t.efficiencyChange ?? t.enchantmentChange)?.after ?? 0,
		materialAfter: tiers(t.toLevel),
	}));
}
const reqMap = (t) => Object.fromEntries(Object.entries(t.requirements).map(([k, v]) => [k, val(v)]));
const tools = {
	pickaxe: { buyPrice: decisions.toolShop.pickaxe, enchant: "efficiency", upgrades: fromTransitions(pickaxeWiki.transitions, reqMap) },
	shovel: { buyPrice: decisions.toolShop.shovel, enchant: "efficiency", upgrades: fromTransitions(otherWiki.shovel.transitions, reqMap) },
	sword: { buyPrice: null, enchant: "sharpness", upgrades: fromTransitions(otherWiki.sword.transitions, reqMap) },
};
const armorReq = (t) => {
	const r = {};
	if (t.counterThreshold && t.requiredCounter) r[t.requiredCounter] = t.counterThreshold.exactValue ?? t.counterThreshold.approximateValue;
	if (t.armorerLevel) r["Оружейник"] = t.armorerLevel;
	return r;
};
for (const [id, item] of Object.entries(armorWiki.items)) {
	tools[id] = {
		buyPrice: id === "axe" ? decisions.toolShop.axe : null,
		enchant: id === "axe" ? "efficiency" : "protection",
		upgrades: item.transitions.map((t) => ({
			from: t.fromLevel,
			to: t.toLevel,
			cost: t.moneyCost,
			requirements: armorReq(t),
			enchantAfter: t.enchantmentChangeShown?.after ?? 0,
			materialAfter: tiers(t.toLevel),
		})),
	};
}
// The bow [меню 26.10, BOW-UPGRADES.md]: no material (always «Лук»), Power by level, Flame I at level 5; being a tool it
// never stacks (InventoryService.isStackable).
tools.bow = {
	buyPrice: null,
	enchant: "power",
	noMaterial: true,
	upgrades: bowWiki.transitions.map((t) => ({ from: t.from, to: t.to, cost: t.cost, requirements: t.requirements, enchantAfter: t.power[1], flameAfter: t.flame[1], materialAfter: "wood" })),
};
// The shears [меню 26.10, SHEARS-UPGRADES.md]: 1 → 6, Efficiency I–V, no material; bought for 4 000 $.
tools.shears = {
	buyPrice: decisions.toolShop.shears,
	enchant: "efficiency",
	noMaterial: true,
	upgrades: shearsWiki.upgrades.map((u) => ({ from: u.from, to: u.to, cost: u.cost, requirements: u.requirements, enchantAfter: u.enchantAfter, materialAfter: "wood" })),
};
// Sword upgrades beyond 12 need Оружейник from the sword table (field "Оружейник" is inside requirements already as a counter name).
// Explicit owner-requested extensions stay separate from the immutable recovered screenshot data.
for (const [id, extensions] of Object.entries(decisions.toolUpgradeExtensions ?? {})) {
	const tool = tools[id];
	if (!tool) throw new Error(`Unknown extended tool ${id}`);
	for (const extension of extensions) {
		const previous = tool.upgrades.at(-1)?.to ?? 1;
		if (extension.from !== previous || extension.to !== previous + 1 || !Number.isFinite(extension.cost) || extension.cost < 0 || !extension.source) {
			throw new Error(`Invalid or discontinuous tool extension ${id} ${extension.from}->${extension.to}`);
		}
		for (const value of Object.values(extension.requirements)) {
			if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${id} extension requirement`);
		}
		tool.upgrades.push(structuredClone(extension));
	}
}
// [владелец 08.11] single upgrade steps made easier (decisions.upgradeOverrides.<tool>.<fromLevel>)
for (const [toolId, steps] of Object.entries(decisions.upgradeOverrides || {})) {
	if (toolId === "_why" || !tools[toolId]) continue;
	for (const [from, change] of Object.entries(steps)) {
		const up = tools[toolId].upgrades.find((u) => u.from === Number(from));
		if (up) Object.assign(up, change);
	}
}
write("tools.json", {
	source: "wiki/client-audit/content-analysis/*-recovery.json [меню]; материал по уровню — интерпретация; явные дополнительные ступени — design-decisions.toolUpgradeExtensions [владелец/решение]",
	vanilla: {
		// [ваниль] Java: attack speed per second and tool damage by material; hand 1 damage at 4/s
		attackSpeed: { hand: 4, sword: 1.6, axe: { wood: 0.8, stone: 0.8, iron: 0.9, diamond: 1 }, pickaxe: 1.2, shovel: 1 },
		toolDamage: { axe: { wood: 7, stone: 9, iron: 9, diamond: 9 }, pickaxe: { wood: 2, stone: 3, iron: 4, diamond: 5 }, shovel: { wood: 2.5, stone: 3.5, iron: 4.5, diamond: 5.5 } },
		handDamage: 1,
		swordDamage: { wood: 4, stone: 5, iron: 6, diamond: 7 },
		sharpnessBonus: [0, 1.0, 1.5, 2.0, 2.5, 3.0],
		toolSpeed: { hand: 1, wood: 2, stone: 4, iron: 6, diamond: 8 },
		efficiencyBonus: "level^2 + 1 added to toolSpeed",
		armorPoints: { wood: [1, 3, 2, 1], stone: [2, 5, 4, 1], iron: [2, 6, 5, 2], diamond: [3, 8, 6, 3] },
		armorToughness: { wood: 0, stone: 0, iron: 0, diamond: 2 },
		protectionPerLevelPerPiece: 0.04,
		maxEpf: 20,
		// [ваниль] minecraft.wiki Bow / Arrow (Java = Bedrock): power f = t/20 s, f = (f² + 2f)/3 capped at 1 (full at 1 s of
		// draw, the sprite's last stage from 0.9); a shot below 0.1 is not fired; speed 3 blocks/tick × f, gravity 0.05
		// blocks/tick², drag 0.99 a tick; damage ceil(speed × (2 + Power 0.5·lvl + 0.5)), crit (full draw) + random up to
		// damage/2 + 2; Flame: 5 s of fire; walking at sneak speed while drawing; a stuck arrow despawns after 60 s
		// [ваниль] minecraft.wiki Shears: dig speed 15 on cobwebs and leaves, 5 on wool (Efficiency adds level² + 1); a sword
		// cuts cobwebs at 15 too
		shearsSpeed: { cobweb: 15, leaves: 15, wool: 5 },
		swordCobwebSpeed: 15,
		bow: { drawSeconds: 1, pullStages: [0, 0.65, 0.9], minPower: 0.1, speedBlocksPerTick: 3, baseDamage: 2, gravity: 0.05, drag: 0.99, drawWalkMultiplier: 0.3, flameSeconds: 5, flameDamagePerSecond: 1, stuckSeconds: 60, pickupBlocks: 1.5, maxFlightSeconds: 6 },
	},
	tools,
});

// ---------------------------------------------------------------- bosses
const bosses = bossWiki.entries.map((e) => {
	const id = e.localizationMatch?.id ?? e.name;
	const dec = decisions.bosses[id] || {};
	return {
		id,
		name: e.name,
		location: e.location,
		unlockLevel: dec.unlockLevel ?? e.locationUnlockLevel,
		locationId: dec.locationId ?? null,
		nameEn: dec.nameEn ?? null,
		fight: dec.fight ?? null,
		money: e.possibleRewards?.money ? [e.possibleRewards.money.min, e.possibleRewards.money.max] : null,
		ancientStars: e.possibleRewards?.ancientStars ? [e.possibleRewards.ancientStars.min, e.possibleRewards.ancientStars.max] : null,
		powderChance: e.possibleRewards?.ancientPowder ?? null,
		shard: e.possibleRewards?.shard ?? null,
		hp: dec.hp ?? null,
		damage: dec.damage ?? null,
		respawnSeconds: dec.respawnSeconds ?? null,
	};
});
for (const [id, b] of Object.entries(decisions.bosses)) if (b.name && !bosses.some((x) => x.id === id)) bosses.push({ id, name: b.name, location: b.location, unlockLevel: b.unlockLevel, locationId: b.locationId ?? null, nameEn: b.nameEn ?? null, fight: b.fight ?? null, money: b.money, ancientStars: b.ancientStars ?? null, powderChance: b.powderChance ?? null, shard: null, hp: b.hp, damage: b.damage, respawnSeconds: b.respawnSeconds });
write("bosses.json", { source: "boss-menu-recovery.json [меню]; hp/damage/respawn [решение]", safety: decisions.bossSafety, rewards: decisions.bossRewards, bosses });

// ---------------------------------------------------------------- pure decisions
write("mobs.json", { source: "[решение]", mobs: decisions.mobs });
write("needs.json", { source: "эффекты и зоны снятия [вики]; таймеры и штрафы [решение]", ...decisions.needs });
write("trainer.json", { source: "первые требования [меню]; остальное [решение]", ...decisions.trainer });
write("keys.json", { source: "[решение]; цены ключей у обменника [меню]", starExchange: { ancient_key: 10, improved_ancient_key: 60, dispeller: 15 }, ...decisions.keys });
write("books.json", { source: "лимиты [вики]; остальное [решение]", ...decisions.books });
write("rules.json", { source: "[решение]; телепорт и UI — [владелец]", death: decisions.death, combo: decisions.combo, money: decisions.money, teleport: decisions.teleport, ui: decisions.ui, digging: decisions.digging, survival: decisions.survival, creative: decisions.creative, combat: decisions.combat, factions: decisions.factions });
write("effects.json", { source: "assets/cracks/ids.json + assets/sounds/ids.json — трещины и звуки блоков", cracks: read("assets/cracks/ids.json"), sounds: read("assets/sounds/ids.json") });
// «Копатель (<блок>)» cards: one per upgrade counter (Камень = cobblestone + stone) or per block without one, in the
// order the floors open; a card shows once the first location selling or mining its blocks is open (unlockLevel).
const achievementCards = [];
{
	const byKey = {};
	for (const loc of [...locations].sort((a, b) => a.unlockLevel - b.unlockLevel)) {
		const ids = new Set([...(loc.sellList ?? []), ...Object.keys(loc.mine?.shares ?? {})]);
		for (const m of Object.values(loc.mines ?? {})) for (const id of Object.keys(m.shares ?? {})) ids.add(id);
		for (const id of ids) {
			const block = blocks[id];
			if (!block || block.itemOnly) continue;
			const key = block.upgradeCounter ?? id;
			if (!byKey[key]) {
				byKey[key] = { id: key, counter: block.upgradeCounter ?? null, blocks: [], unlockLevel: loc.unlockLevel, location: loc.id };
				achievementCards.push(byKey[key]);
			}
			if (!byKey[key].blocks.includes(id)) byKey[key].blocks.push(id);
		}
	}
	// the card's price (reward) and icon: the dearest of its blocks (iron ore over stone in a shared counter)
	for (const card of achievementCards) {
		card.blocks.sort((a, b) => blocks[b].basePrice - blocks[a].basePrice || a.localeCompare(b));
		card.icon = card.blocks[0];
		card.price = Math.min(...card.blocks.map((id) => blocks[id].basePrice));
	}
}
write("achievements.json", { source: "[вики] карточки «Копатель» по блокам; [владелец 27.10] появляются с этажами; [решение] награды", ...decisions.achievements, cards: achievementCards });
write("gangs.json", { source: "[вики, сеть, клиент] банды; числа — [решение] (docs/research/remaining-features-design.md §1)", ...decisions.gangs });
write("auction.json", { source: "[вики] аукцион; [решение] цены, задержки", ...decisions.auction });
write("donate.json", { source: "[меню] донат-магазин; [решение] наборы за Robux", ...decisions.donate });
write("boosters.json", { source: "[вики] хранилище бустеров; [владелец 27.10] локальные ×1.1", ...decisions.boosters });
// Artifact pictures: assets/artifacts/ids.json maps picture name → asset id; each tier gets `images`
// (all its pictures) and `image` (the first picture, shown in the rarity card and the mosaic).
const artifactImages = read("assets/artifacts/ids.json").images;
const artifactTiers = Object.fromEntries(Object.entries(decisions.artifacts.tiers).map(([tier, def]) => {
	const images = Object.fromEntries(def.pictures.filter((p) => artifactImages[p]).map((p) => [p, artifactImages[p]]));
	return [tier, { ...def, images, image: images[def.pictures[0]] ?? "" }];
}));
write("artifacts.json", { source: "[меню, клиент]; шанс за блок [владелец], из кейса [решение]; картинки — assets/artifacts/ids.json", ...decisions.artifacts, tiers: artifactTiers });
write("market.json", { source: "[меню] NPC-MENU-RECOVERY", ...decisions.market });
write("ghetto.json", { source: "[вики, клиент] Гетто; числа — [решение] (docs/research/remaining-features-design.md, этап 1в)", ...decisions.ghetto });
write("warzone.json", { source: "[клиент, вики] Дворы и фракционные точки; числа — [решение] (docs/research/remaining-features-design.md, этап 2)", ...decisions.warzone });
write("referrals.json", { source: "[решение] приглашение друзей и карточка «Избранное» (docs/research/remaining-features-design.md, этап 10)", ...decisions.referrals });
write("daily.json", { source: "[решение] Столовая и ежедневные награды (docs/research/remaining-features-design.md, этап 7)", canteen: decisions.canteen, daily: decisions.daily });
write("chat.json", { source: "[решение] чат и команды (docs/research/remaining-features-design.md, этап 3)", ...decisions.chat });
write("pris.json", { source: "[клиент, вики, сеть] PRIS+ и рубины; числа — [решение] (docs/research/remaining-features-design.md, этап 8)", ...decisions.prisPlus });
// our own armor faces for the block body (assets/models/armor/armor.py → assets/armor/block/*.png, uploaded → ids.json)
const blockArmorIds = existsSync(join(root, "assets/armor/block/ids.json")) ? read("assets/armor/block/ids.json") : undefined;
const blockArmor = blockArmorIds?.faces;
// each face's enchant glint mask (assets/armor/block/glint-map.json: face → mask; ids.json glints: mask → id)
const blockGlint = {};
if (blockArmorIds?.glints) {
	for (const [face, mask] of Object.entries(read("assets/armor/block/glint-map.json").map)) {
		if (blockArmorIds.glints[mask]) blockGlint[face] = blockArmorIds.glints[mask];
	}
}
write("armor.json", {
	source: "assets/armor/ids.json — textured armor faces (CC BY-SA 4.0); block = our own faces (assets/armor/block/ids.json)",
	...read("assets/armor/ids.json"),
	...(blockArmor ? { block: blockArmor, blockGlint } : {}),
});
write("itemvoxels.json", { source: "assets/icons/voxels.json — 3D extruded item sprites (16×16 rectangles)", ...read("assets/icons/voxels.json") });
// a ModuleScript holds at most 200 000 characters: the Blender item models get their own file
write("itemmodels.json", { source: "assets/icons/models3d.json — Blender voxel item models (assets/models/*/<item>.py -- export)", ...read("assets/icons/models3d.json") }, true);
write("icons.json", { source: "assets/icons/ids.json — Codex image gen + Studio upload; lookup: <id>_<material>, then <id>, then block texture", ...read("assets/icons/ids.json") });
write("textures.json", { source: "assets/textures/ids.json — Codex image gen + Studio upload", ...read("assets/textures/ids.json") });
write("previews.json", { source: "assets/previews/ids.json — Codex image gen + Studio upload; пусто = процедурная диорама", ...read("assets/previews/ids.json") });
// Rojo nested project for MaterialService: one MaterialVariant per texture (edit-time instances).
{
	const ids = read("assets/textures/ids.json");
	const tree = { "$className": "MaterialService" };
	for (const [id, assetId] of Object.entries(ids.textures)) {
		tree["px_" + id] = { "$className": "MaterialVariant", "$properties": { BaseMaterial: "Plastic", ColorMap: assetId, StudsPerTile: ids.studsPerTile || 4 } };
	}
	writeFileSync(join(root, "src", "materials.project.json"), JSON.stringify({ name: "materials", tree }, null, 2) + "\n");
	console.log("wrote src/materials.project.json");
}
write("professions.json", { source: "[меню] Работы/Прокачки; формула опыта [решение]", ...decisions.professions });
