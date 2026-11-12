--!strict
local Config = require(script.Parent.Parent.Config)
local Family = require(script.Parent.Family)
local Collection = {}

function Collection.initialize(profile: any)
	local old = profile.pickaxe
	profile.collection = { starter = { count = 1, golden = 0 } }
	profile.skills = {}
	for _, family in Config.familyRules.order do
		profile.skills[family] = { 0, 0, 0, 0 }
	end
	profile.nextFamily, profile.staged, profile.boughtPickaxes = {}, {}, {}
	profile.keys, profile.keyHits = 0, 0
	profile.chestPity = { epic = 0, legendary = 0 }
	profile.familyChangeDay = -1
	profile.pickChestsOpened, profile.merges, profile.wallChestsOpened = 0, 0, 0
	profile.keySerial, profile.wallChestKeyCounter = 0, 0
	profile.ultCounter = 0
	profile.family, profile.pickaxeGolden = nil, false
	local hadStorm = old == "storm_common"
		or (profile.circle and profile.circle.pickLevels.storm_common ~= nil)
	if hadStorm then
		profile.collection.storm_common = { count = 1, golden = 0 }
		profile.family = "storm"
		profile.boughtPickaxes.storm_common = true
	elseif old ~= "starter" then
		profile.pickaxe = "starter"
	end
end

local function integer(value: any, maximum: number): boolean
	return type(value) == "number" and value >= 0 and value <= maximum and value % 1 == 0
end

function Collection.validate(profile: any): boolean
	if
		type(profile.collection) ~= "table"
		or type(profile.skills) ~= "table"
		or type(profile.pickaxeGolden) ~= "boolean"
		or (profile.family ~= nil and not Config.families[profile.family])
		or type(profile.chestPity) ~= "table"
		or not integer(profile.chestPity.epic, Config.chests.pick.pityEpic - 1)
		or not integer(profile.chestPity.legendary, Config.chests.pick.pityLegendary - 1)
		or type(profile.familyChangeDay) ~= "number"
		or not integer(profile.familyChangeDay + 1, 2 ^ 31)
	then
		return false
	end
	for _, field in
		{
			"keys",
			"pickChestsOpened",
			"merges",
			"wallChestsOpened",
			"keySerial",
			"wallChestKeyCounter",
			"ultCounter",
		}
	do
		if not integer(profile[field], 2 ^ 53 - 1) then
			return false
		end
	end
	if
		type(profile.keyHits) ~= "number"
		or not (profile.keyHits >= 0 and profile.keyHits < Config.chests.keyHits)
	then
		return false
	end
	for id, entry in profile.collection do
		if
			not Config.pickaxes[id]
			or type(entry) ~= "table"
			or not integer(entry.count, 2 ^ 53 - 1)
			or not integer(entry.golden, 2 ^ 53 - 1)
		then
			return false
		end
	end
	if not Family.owns(profile, "starter") then
		return false
	end
	for _, family in Config.familyRules.order do
		local levels = profile.skills[family]
		if type(levels) ~= "table" or #levels ~= 4 then
			return false
		end
		for _, level in levels do
			if not integer(level, 10) then
				return false
			end
		end
	end
	for family in profile.skills do
		if not Config.families[family] then
			return false
		end
	end
	for _, name in { "nextFamily", "staged", "boughtPickaxes" } do
		local flags = profile[name]
		if type(flags) ~= "table" then
			return false
		end
		for key, value in flags do
			if type(key) ~= "string" or value ~= true then
				return false
			end
			if name ~= "staged" and not Config.pickaxes[key] then
				return false
			end
			if
				name == "staged"
				and key ~= "firstStorm"
				and key ~= "firstKey"
				and key ~= "firstVein"
			then
				return false
			end
		end
	end
	return true
end

function Collection.grant(profile: any, id: string, golden: boolean?): any?
	local pick = Config.pickaxes[id]
	if not pick or (id == "starter" and golden) then
		return nil
	end
	local entry = profile.collection[id] or { count = 0, golden = 0 }
	local fresh = entry.count + entry.golden == 0
	profile.collection[id] = entry
	if golden then
		entry.golden += 1
	else
		entry.count += 1
	end
	if id == "starter" then
		entry.count = 1
	end
	if pick.family == "storm" and profile.family == nil then
		profile.family, profile.pickaxe, profile.pickaxeGolden = "storm", id, golden == true
	end
	local deferred = pick.family ~= nil and pick.family ~= profile.family
	if deferred then
		profile.nextFamily[id] = true
	end
	return {
		id = id,
		rarity = pick.rarity,
		family = pick.family,
		golden = golden == true,
		new = fresh,
		nextFamily = deferred,
	}
end

function Collection.equip(profile: any, id: string, golden: boolean?): boolean
	if not Family.canEquip(profile, id, golden) then
		return false
	end
	profile.pickaxe, profile.pickaxeGolden = id, golden == true
	return true
end

function Collection.merge(profile: any, id: string): boolean
	local entry = profile.collection[id]
	if id == "starter" or not entry or entry.count < Config.familyRules.mergeNeed then
		return false
	end
	entry.count -= Config.familyRules.mergeNeed
	entry.golden += 1
	profile.merges += 1
	if profile.pickaxe == id then
		profile.pickaxeGolden = true
	end
	return true
end

function Collection.buy(profile: any, family: string): any?
	local cfg = Config.families[family]
	local id = family .. "_common"
	if
		not cfg
		or profile.boughtPickaxes[id]
		or profile.deepestWorld < cfg.world
		or profile.coins < cfg.price
	then
		return nil
	end
	profile.coins -= cfg.price
	profile.boughtPickaxes[id] = true
	return Collection.grant(profile, id)
end

return Collection
