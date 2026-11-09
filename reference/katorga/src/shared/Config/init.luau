--!strict
-- Typed access to the generated configs in Config/*.json (Rojo syncs each JSON as a ModuleScript).
-- Source of truth: wiki/in-game-wiki/*.json + scripts/design-decisions.json → node scripts/build-configs.mjs.

local folder = script -- JSON configs are this module's children (Config/init.luau + Config/*.json)

local function load(name: string): any
	return require(folder:WaitForChild(name)) :: any
end

local Config = {}

Config.levels = load("levels")
Config.blocksFile = load("blocks")
Config.locationsFile = load("locations")
Config.toolsFile = load("tools")
Config.bosses = load("bosses")
Config.mobs = load("mobs")
Config.needs = load("needs")
Config.professions = load("professions")
Config.keys = load("keys")
Config.books = load("books")
Config.rules = load("rules")
Config.trainer = load("trainer")
Config.textures = load("textures")
Config.previews = load("previews")
Config.icons = load("icons")
Config.donate = load("donate")
Config.itemVoxels = load("itemvoxels")
Config.itemModels = load("itemmodels")
Config.armor = load("armor")
Config.effects = load("effects")
Config.achievementsCfg = load("achievements")
Config.boosters = load("boosters")
Config.auction = load("auction")
Config.artifacts = load("artifacts")
Config.market = load("market")
Config.gangs = load("gangs") -- gangs (Shared/Gangs, GangService)
Config.ghetto = load("ghetto") -- the Ghetto: trader, black market, treasure chest (GhettoService)
Config.warzone = load("warzone") -- the Дворы: four faction capture points (Shared/Warzone, WarzoneService)
Config.referrals = load("referrals") -- inviting friends, the «Избранное» card (ReferralService, FavoriteCard)
Config.chat = load("chat") -- the chat and its commands (ChatService, ChatCommandService, ChatWindow)
Config.daily = load("daily") -- the canteen portion and the daily rewards (Shared/Daily, DailyService)
Config.pris = load("pris") -- PRIS+ and the rubies (Shared/PrisPlus, PrisService, PrisWindow)

Config.money = Config.rules.money
Config.moneyScale = Config.rules.money.scale :: number
Config.blocks = Config.blocksFile.blocks
Config.tools = Config.toolsFile.tools
Config.vanilla = Config.toolsFile.vanilla
Config.defaultLocale = Config.rules.ui.defaultLocale :: string
Config.locales = Config.rules.ui.locales :: { string }

export type Block = {
	id: string,
	name: string,
	basePrice: number,
	hardness: number,
	tool: string,
	minTier: number,
	dropsAs: string?,
	itemOnly: boolean,
	sellable: boolean?, -- false: the buyer does not take it (melon slices are food only) [владелец]
	upgradeCounter: string?,
}

export type LevelRule = {
	level: number,
	money: number,
	blocks: number,
	hearts: number,
	skillPoints: number,
}

export type Upgrade = {
	from: number,
	to: number,
	cost: number,
	requirements: { [string]: number },
	enchantAfter: number,
	flameAfter: number?, -- the bow's Горящая стрела (Flame) after the upgrade [меню 26.10]
	materialAfter: string,
}

export type Location = {
	id: string,
	kind: string,
	name: string,
	unlockLevel: number,
	requiresPass: boolean,
	pvp: boolean,
	requiresFaction: boolean?, -- База фракций: only for faction members [клиент]
	requiresGang: boolean?, -- База банды / Гетто: only for gang members [вики «Нужна банда»]
	requiresGangUpgrade: string?, -- Гетто: the gang upgrade that opens it [клиент location.list.non_access.ghetto]
	friendlyFire: boolean?, -- Гетто: players of one faction may hit each other [сеть TG/10]
	miniMine: { size: { number }, resetSeconds: number }?, -- the faction base's small mines
	shot: { tool: string? }?, -- Шот-шахта [вики HANDBOOK-WIKI]: one hit breaks any block (tool nil = any)
	mine: {
		size: { number },
		resetSeconds: number,
		warnSeconds: number,
		shares: { [string]: number },
	},
	sellList: { string },
}

local locationsById: { [string]: Location } = {}
for _, loc in ipairs(Config.locationsFile.locations) do
	locationsById[loc.id] = loc
end

function Config.block(id: string): Block?
	return Config.blocks[id]
end

function Config.location(id: string): Location?
	return locationsById[id]
end

-- [сеть TG/25] the lowest location level at which a block can be dug (nil = no mine has it)
local blockMinLevel: { [string]: number } = {}
for _, loc in ipairs(Config.locationsFile.locations) do
	local any_ = loc :: any
	local function note(shares: any)
		if typeof(shares) ~= "table" then
			return
		end
		for blockId in pairs(shares) do
			local have = blockMinLevel[blockId]
			if not have or loc.unlockLevel < have then
				blockMinLevel[blockId] = loc.unlockLevel
			end
		end
	end
	note(any_.mine and any_.mine.shares)
	note(any_.miniMine and any_.miniMine.shares)
	if typeof(any_.mines) == "table" then
		for _, mine in pairs(any_.mines) do
			note(mine.shares)
		end
	end
end

-- a block from mines far above the player (rules.digging.blockLevelGap): no picking up, dropping or selling it
function Config.blockLocked(id: string, level: number): boolean
	local need = blockMinLevel[id]
	local gap = Config.rules.digging and Config.rules.digging.blockLevelGap
	return need ~= nil and typeof(gap) == "number" and need > level + gap
end

-- Factions [клиент]: four of them, joined from level 5, leaving costs money; names and taglines live in
-- Strings (faction_<id>, faction_<id>_desc), colours here
export type Faction = { id: string, color: { number } }
Config.factions = Config.rules.factions :: {
	joinLevel: number,
	leaveCost: number,
	balanceSlack: number,
	list: { Faction },
}

function Config.faction(id: any): Faction?
	for _, f in ipairs(Config.factions.list) do
		if f.id == id then
			return f
		end
	end
	return nil
end

function Config.factionColor(id: any): Color3
	local f = Config.faction(id)
	return if f
		then Color3.fromRGB(f.color[1], f.color[2], f.color[3])
		else Color3.fromRGB(170, 170, 170)
end

function Config.levelRule(level: number): LevelRule?
	for _, rule in ipairs(Config.levels.levels) do
		if rule.level == level then
			return rule
		end
	end
	return nil
end

-- Upgrade record that takes an item from `fromLevel` to `fromLevel + 1`.
function Config.upgrade(itemId: string, fromLevel: number): Upgrade?
	local tool = Config.tools[itemId]
	if not tool then
		return nil
	end
	for _, up in ipairs(tool.upgrades) do
		if up.from == fromLevel then
			return up
		end
	end
	return nil
end

-- Requirement counters that are not dug-block counters live in the stats [меню 26.10, BOW-UPGRADES.md]: «Крысы» is the
-- right panel's number (rats with the «Мобы» multiplier), «Убийства» player kills. Never spent.
local STAT_COUNTERS = {
	["Крысы"] = "ratsTotal",
	["Зомби"] = "zombiesTotal",
	["Летучие мыши"] = "batsTotal",
	["Убийства"] = "kills",
}
function Config.requirementHave(profile: any, counter: string): number
	if counter == "Оружейник" then
		-- the skill tree's Оружейник level (Shared/Skills) [меню 26.10: III → броня 14, V → 15]
		local skills = profile.skills
		return if typeof(skills) == "table" then tonumber(skills.armorer) or 0 else 0
	end
	local stat = STAT_COUNTERS[counter]
	if stat then
		local stats = profile.stats or {}
		local value = stats[stat] or (if stat == "ratsTotal" then stats.rats else nil) or 0
		return math.floor(value)
	end
	return (profile.counters and profile.counters[counter]) or 0
end

-- Picture of a requirement counter [владелец 27.10: «добавляй значки блоков … чтобы маленькие игроки понимали»]:
-- a dug-block counter shows its block (the ore when the counter has one: «Каменный уголь» → coal ore, «Камень» →
-- stone), the stat counters their own icons. nil when there is none.
local COUNTER_ICONS = {
	["Крысы"] = "hud_rat",
	["Убийства"] = "sword_iron",
	["Оружейник"] = "skill_anvil", -- the skill-tree branch (Shared/Skills)
}
local counterIconCache: { [string]: string | false } = {}
function Config.counterIcon(counter: string): string?
	local cached = counterIconCache[counter]
	if cached ~= nil then
		return cached or nil
	end
	local icon: string? = nil
	if COUNTER_ICONS[counter] then
		icon = Config.icons.icons[COUNTER_ICONS[counter]]
	else
		local best: string? = nil
		for id, block in pairs(Config.blocks) do
			if block.upgradeCounter == counter then
				local ore = string.sub(id, -4) == "_ore"
				local bestOre = best ~= nil and string.sub(best, -4) == "_ore"
				if not best or (ore and not bestOre) or (ore == bestOre and #id < #best) then
					best = id
				end
			end
		end
		icon = if best then Config.iconFor(best) else nil
	end
	counterIconCache[counter] = icon or false
	return icon
end

-- The bow's Flame level at an item level (0 or 1)
function Config.flameForLevel(itemId: string, level: number): number
	local tool = Config.tools[itemId]
	local flame = 0
	if tool then
		for _, up in ipairs(tool.upgrades) do
			if up.to <= level and up.flameAfter then
				flame = up.flameAfter
			end
		end
	end
	return flame
end

-- Material tier index for an item level: wood 0, stone 1, iron 2, diamond 3.
local MATERIALS = { "wood", "stone", "iron", "diamond" }
function Config.materialForLevel(level: number): string
	return MATERIALS[math.clamp(math.floor((level - 1) / 4) + 1, 1, 4)]
end

local ICON_FALLBACKS = { artifact_key = "ancient_key" }
function Config.iconFor(itemId: string, level: number?): string?
	local icons = Config.icons.icons
	if level and Config.tools[itemId] then
		local materialIcon = icons[itemId .. "_" .. Config.materialForLevel(level)]
		if materialIcon then
			return materialIcon
		end
	end
	-- a cross-sprite block (cobweb) shows its flat sprite in slots, as in Minecraft [ваниль]
	local sprites = (Config.textures :: any).sprites
	return icons[itemId]
		or icons[ICON_FALLBACKS[itemId]]
		or (sprites and sprites[itemId])
		or Config.textures.textures[itemId]
end

function Config.tierIndex(material: string): number
	return (table.find(MATERIALS, material) or 1) - 1
end

-- Enchant level (Efficiency/Sharpness/Protection) an item level shows, as in the original menu: I–III within a
-- material, back to 0 when the material changes [меню; владелец 27.10: «по факту уровней эффективности 3»].
function Config.enchantForLevel(itemId: string, level: number): number
	if level <= 1 then
		return 0
	end
	for _, up in ipairs(Config.tools[itemId].upgrades) do
		if up.to == level then
			return up.enchantAfter
		end
	end
	return 0
end

-- The enchant strength digging and hits use. [владелец 22.10] pickaxe / axe Efficiency and sword Sharpness keep
-- growing with the level (the maximal diamond pickaxe digs stone instantly); the item still shows the menu level.
function Config.enchantPower(itemId: string, level: number): number
	if level <= 1 then
		return 0
	end
	local curve = (
		Config.rules.digging
		and Config.rules.digging.efficiencyByLevel
		and Config.rules.digging.efficiencyByLevel[itemId]
	)
		or (
			Config.rules.combat
			and Config.rules.combat.sharpnessByLevel
			and Config.rules.combat.sharpnessByLevel[itemId]
		)
	if typeof(curve) == "table" and curve[level] then
		return curve[level]
	end
	return Config.enchantForLevel(itemId, level)
end

-- Extra sword damage of a Sharpness level, Java formula 0.5 × level + 0.5 [ваниль]
function Config.sharpnessBonus(level: number): number
	return if level > 0 then 0.5 * level + 0.5 else 0
end

-- True when the item is a tool/armor piece whose level carries an enchantment (glint in UI/world).
function Config.isEnchanted(itemId: string, level: number?): boolean
	if not level or not Config.tools[itemId] then
		return false
	end
	return Config.enchantForLevel(itemId, level) > 0
end

-- Break time in seconds, exactly Minecraft Java Edition (minecraft.wiki/w/Breaking) [ваниль]:
--   speed = 1 by hand; with the matching tool type: toolSpeed[material] (wood 2, stone 4, iron 6,
--   diamond 8) + (efficiency² + 1) when enchanted; damage per tick = speed / hardness / 30 when the
--   tool can harvest the block (or the block needs no tool), / 100 otherwise; the block breaks after
--   ceil(1 / damage) ticks of 0.05 s, instantly when damage ≥ 1; Haste ×(1 + 0.2·level) on the speed.
-- [владелец 20.10] digging by hand / with the wrong tool is always allowed and the block still drops;
-- it just takes the vanilla "wrong tool" time (pickaxe blocks: /100, e.g. stone by hand 7.5 s).
local TICK = 0.05
-- [ваниль] the shears' dig speed on a block (cobweb, *_leaves, *_wool), nil when shears do not help
function Config.shearsSpeed(blockId: string): number?
	local speeds = Config.vanilla.shearsSpeed
	if blockId == "cobweb" then
		return speeds.cobweb
	elseif string.sub(blockId, -7) == "_leaves" then
		return speeds.leaves
	elseif string.sub(blockId, -5) == "_wool" then
		return speeds.wool
	end
	return nil
end

function Config.breakTime(block: Block, toolId: string?, toolLevel: number, haste: number?): number?
	if block.itemOnly then
		return nil
	end
	local hardness = block.hardness
	if hardness <= 0 then
		return TICK
	end
	local speed = Config.vanilla.toolSpeed.hand
	local canHarvest = true
	local shears = Config.shearsSpeed(block.id)
	if toolId == "shears" and shears and toolLevel >= 1 then
		-- shears: their own speed per block kind, Efficiency on top [ваниль]
		speed = shears
		local enchant = Config.enchantForLevel("shears", toolLevel)
		if enchant > 0 then
			speed += enchant * enchant + 1
		end
	elseif toolId == "sword" and block.id == "cobweb" then
		speed = Config.vanilla.swordCobwebSpeed -- [ваниль] a sword cuts cobwebs fast
	elseif block.tool ~= "any" then
		if toolId == block.tool and toolLevel >= 1 then
			local material = Config.materialForLevel(toolLevel)
			speed = Config.vanilla.toolSpeed[material]
			local enchant = Config.enchantPower(toolId :: string, toolLevel)
			if enchant > 0 then
				speed += enchant * enchant + 1
			end
			-- the tool type speeds up digging even when its tier is too low to harvest (iron ore with
			-- a wooden pickaxe), harvesting then falls to the /100 rule like in Minecraft
			canHarvest = Config.tierIndex(material) >= block.minTier
		else
			-- shovel/axe blocks (dirt, sand, logs, melons) can be taken by hand; pickaxe blocks cannot
			canHarvest = block.tool ~= "pickaxe"
		end
	end
	-- Haste multiplies the dig speed by 1 + 0.2 per level, before the instant check [ваниль]
	speed *= 1 + 0.2 * math.max(0, haste or 0)
	local damage = speed / hardness / (if canHarvest then 30 else 100)
	if damage >= 1 then
		return TICK -- instant break [ваниль]
	end
	return math.ceil(1 / damage - 1e-9) * TICK
end

-- Minecraft pauses 6 ticks (0.3 s) after a block breaks before the next one starts; a block broken
-- instantly (in one tick) has no pause, so instant mining runs at 20 blocks a second [ваниль,
-- minecraft.wiki/w/Breaking]
function Config.hitDelayAfter(needed: number): number
	return if needed <= TICK + 1e-6 then 0 else Config.hitDelay()
end

-- Шот-шахта [вики HANDBOOK-WIKI: «любой блок ломается с одного удара»]: nil = not a shot mine, false = the
-- mine wants another tool (Лепреконова долина — лопата, Изнанка — ножницы [вики]), else the break time (one
-- tick). Any held item — even the hand — is fine where the tool is «любой» [решение].
function Config.shotTime(location: Location?, toolId: string?, toolLevel: number): (number | false)?
	local shot = if location then location.shot else nil
	if not shot then
		return nil
	end
	if shot.tool and (toolId ~= shot.tool or toolLevel < 1) then
		return false
	end
	return TICK
end

-- the pause after a broken block: a shot mine tops its one tick up to 1 / shotHitsPerSecond [решение: 8 в с]
function Config.pauseAfter(location: Location?, needed: number): number
	if location and location.shot then
		local digging = Config.rules.digging
		local rate = if digging and typeof(digging.shotHitsPerSecond) == "number"
			then digging.shotHitsPerSecond
			else 8
		return math.max(0, 1 / rate - TICK)
	end
	return Config.hitDelayAfter(needed)
end

function Config.hitDelay(): number
	local digging = Config.rules.digging
	local ticks = if digging and typeof(digging.hitDelayTicks) == "number"
		then digging.hitDelayTicks
		else 5
	return ticks * TICK
end

return Config
