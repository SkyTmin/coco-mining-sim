--!strict
-- Deterministic overlays preserve the ore generator's fast range histogram.
local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Parent.Mine.Hash)
local State = require(script.Parent.Parent.Mine.MineState)
local Worlds = require(script.Parent.Parent.Mine.Worlds)
local Gen = require(script.Parent.Parent.Mine.MineGen)
local Power = require(script.Parent.Power)
local Keys = require(script.Parent.Keys)
local Collection = require(script.Parent.Collection)
local WallChests = {}

function WallChests.tier(seed: number, serial: number): number
	local roll = Hash.unit(seed, serial, 471)
	for i, tier in Config.chests.wall.tiers do
		roll -= tier.share
		if roll < 0 then
			return i
		end
	end
	return #Config.chests.wall.tiers
end

local function generated(seed: number, band: number, second: boolean, multiplier: number): any?
	if second and Hash.unit(seed, band, 473) >= multiplier - 1 then
		return nil
	end
	local salt = if second then 100 else 0
	local width, height, span =
		Config.mine.startWidth, Config.mine.height, Config.chests.wall.perLayers
	local d = band * span + math.floor(Hash.unit(seed, band, 475 + salt) * span)
	if second and d % span == math.floor(Hash.unit(seed, band, 475) * span) then
		d = band * span + (d + 1) % span
	end
	if Worlds.of(d).plateDepth == d then
		return nil
	end
	return {
		x = math.floor(Hash.unit(seed, band, 477 + salt) * width) - (width - 1) // 2,
		y = math.floor(Hash.unit(seed, band, 479 + salt) * height),
		d = d,
		tier = WallChests.tier(seed, band * 2 + (if second then 1 else 0)),
		kind = "chest",
	}
end

local cachedSeed, cachedBand, cachedMultiplier = -1, -1, -1
local cached: { any } = {}
local function bandChests(seed: number, band: number, multiplier: number): { any }
	if cachedSeed == seed and cachedBand == band and cachedMultiplier == multiplier then
		return cached
	end
	cachedSeed, cachedBand, cachedMultiplier, cached = seed, band, multiplier, {}
	for _, second in { false, true } do
		local chest = generated(seed, band, second, multiplier)
		if chest then
			table.insert(cached, chest)
		end
	end
	return cached
end

function WallChests.list(seed: number, a: number, b: number, multiplier: number): { any }
	local out = {}
	for band = a // Config.chests.wall.perLayers, (b - 1) // Config.chests.wall.perLayers do
		for _, chest in bandChests(seed, band, multiplier) do
			if chest.d >= a and chest.d < b then
				table.insert(out, chest)
			end
		end
	end
	return out
end

function WallChests.at(st: any, x: number, y: number, d: number, multiplier: number?): any?
	if not Config.chests then
		return nil
	end
	local override = st.chests and st.chests[State.cellKey(x, y, d)]
	if override then
		return override
	end
	local band = d // Config.chests.wall.perLayers
	for _, chest in bandChests(st.seed, band, multiplier or st.chestFrequency or 1) do
		if chest.x == x and chest.y == y and chest.d == d then
			return chest
		end
	end
	return nil
end

-- Remove the overlaid ore from the tally and return exactly one reward per removed chest.
function WallChests.tally(st: any, out: { State.Range }, res: any, multiplier: number)
	if not Config.chests then
		return
	end
	local span = Config.chests.wall.perLayers
	local function include(chest: any, run: State.Range)
		if chest.x ~= run.x or chest.y ~= run.y or chest.d < run.a or chest.d >= run.b then
			return
		end
		local key = State.cellKey(chest.x, chest.y, chest.d)
		local override = st.chests and st.chests[key]
		if override and chest ~= override then
			return
		end
		local ore, kind = Gen.cellAt(st.seed, chest.x, chest.y, chest.d)
		if not kind then
			local histKey = Worlds.of(chest.d).index * 64 + ore
			res.hist[histKey] = (res.hist[histKey] or 0) - 1
		end
		table.insert(res.finds, chest)
		if override then
			st.chests[key] = nil
		end
	end
	for _, run in out do
		for band = run.a // span, (run.b - 1) // span do
			for _, chest in bandChests(st.seed, band, multiplier) do
				include(chest, run)
			end
		end
		for _, chest in table.clone(st.chests or {}) do
			include(chest, run)
		end
	end
end

function WallChests.place(st: any, stage: string?): any?
	local barrier = State.barrier(st)
	if st.front >= barrier then
		return nil
	end
	st.chests = st.chests or {}
	for key, chest in st.chests do
		if not State.isSolid(st, chest.x, chest.y, chest.d) then
			st.chests[key] = nil
		end
	end
	local pending = 0
	for _ in st.chests do
		pending += 1
	end
	if pending >= 8 then
		return nil
	end
	for _, chest in st.chests do
		if chest.stage == stage and stage then
			return nil
		end
	end
	local radius = (st.width - 1) // 2
	for distance = 0, Config.mine.nearWindow - 1 do
		local d = st.front + distance
		if d >= barrier then
			break
		end
		for y = 0, st.height - 1 do
			for x = -radius, radius do
				if State.isExposed(st, x, y, d) and not WallChests.at(st, x, y, d) then
					local chest = { x = x, y = y, d = d, tier = 2, stage = stage, kind = "chest" }
					st.chests[State.cellKey(x, y, d)] = chest
					st.damage[State.cellKey(x, y, d)] = nil
					return chest
				end
			end
		end
	end
	return nil
end

function WallChests.stage(st: any, profile: any, playSeconds: number): boolean
	for _, name in { "firstStorm", "firstKey" } do
		if not profile.staged[name] and playSeconds >= Config.familyRules[name] then
			if WallChests.place(st, name) then
				return true
			end
		end
	end
	return false
end

function WallChests.reward(
	profile: any,
	chest: any,
	hand: boolean,
	seed: number,
	effects: any,
	incomeMultiplier: number
): any
	local world, mean = Worlds.of(chest.d), 0
	for ore, weight in world.weights do
		mean += world.orePrices[ore] * weight
	end
	local tier = Config.chests.wall.tiers[chest.tier]
	local greedy = (profile.circle.cards.coins or 0) >= Config.progress.cards.coins.steps[2]
	local coins = Power.coins(
		mean * tier.blocks,
		profile.circle.cards.coins or 0,
		incomeMultiplier
			* effects.chestCoins
			* (if greedy then Config.progress.cardEffects.chestMultiplier else 1)
	)
	profile.wallChestsOpened += 1
	local key = false
	if hand then
		profile.wallChestKeyCounter += 1
		local guaranteed = (profile.circle.cards.keys or 0) >= Config.progress.cards.keys.steps[1]
			and profile.wallChestKeyCounter % Config.chests.keyEveryChest == 0
		key = chest.stage == "firstKey"
			or guaranteed
			or Hash.unit(seed, profile.wallChestsOpened, 481)
				< math.min(1, tier.key * effects.keys)
	end
	local keys = if key then Keys.add(profile, 1, seed) else 0
	local pick = nil
	if chest.stage == "firstStorm" and not profile.staged.firstStorm then
		if not profile.collection.storm_common then
			pick = Collection.grant(profile, "storm_common")
		end
		profile.staged.firstStorm = true
	elseif chest.stage == "firstKey" and hand then
		profile.staged.firstKey = true
	end
	profile.coins += coins
	return { tier = chest.tier, coins = coins, keys = keys, pick = pick, stage = chest.stage }
end

return WallChests
