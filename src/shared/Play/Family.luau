--!strict
-- Pure family rules shared by the server, UI, tests and simulator.
local Config = require(script.Parent.Parent.Config)
local Power = require(script.Parent.Power)
local Family = {}

function Family.level(profile: any, family: string): number
	local total = 0
	for _, level in (profile.skills and profile.skills[family]) or {} do
		total += level
	end
	return total
end

function Family.unlocked(profile: any, family: string, index: number): boolean
	local cfg = Config.families[family]
	local skill = cfg and cfg.skills[index]
	return skill ~= nil
		and profile.family == family
		and Family.level(profile, family) >= skill.unlock
end

function Family.coinBonus(profile: any): number
	local total = 0
	for _, family in Config.familyRules.order do
		total += Family.level(profile, family)
	end
	return 1 + Config.familyRules.accountCoins * total
end

function Family.effects(profile: any): any
	local out: { [string]: number } = {
		perkSize = 1,
		coins = Family.coinBonus(profile),
		strength = 1,
		plateDamage = 1,
		keys = 1,
		chestCoins = 1,
		chestFrequency = 1,
		ultDepth = 1,
		stormSeconds = 0,
		ultChest = 0,
		echo = 0,
		pierce = 0,
		brittle = 0,
		luck = 1,
	}
	local family = profile.family
	local cfg = family and Config.families[family]
	if not cfg then
		return out
	end
	for index, skill in cfg.skills do
		local level = (profile.skills[family] or {})[index] or 0
		local value = skill.per * level
		if skill.effect == "treasure" then
			out.chestCoins += value
			out.chestFrequency += Config.familyRules.chestFrequencyPerLevel * level
		elseif skill.effect == "coins" then
			out.coins *= 1 + value
		elseif not skill.deferred then
			out[skill.effect] += value
		end
	end
	return out
end

function Family.owns(profile: any, id: string, golden: boolean?): boolean
	local entry = profile.collection and profile.collection[id]
	return entry ~= nil and (if golden then entry.golden else entry.count) > 0
end

function Family.canEquip(profile: any, id: string, golden: boolean?): boolean
	local pick = Config.pickaxes[id]
	return pick ~= nil
		and Family.owns(profile, id, golden)
		and (id == "starter" or pick.family == profile.family)
end

function Family.best(profile: any, family: string): (string?, boolean)
	local best, bestGold, strength = nil, false, -1
	for _, rarityId in Config.familyRules.rarities do
		local id = family .. "_" .. rarityId
		local pick = Config.pickaxes[id]
		if not pick then
			continue
		end
		for _, golden in { false, true } do
			if Family.owns(profile, id, golden) then
				local rarity = Config.progress.rarities[pick.rarity]
				local level =
					math.min(profile.circle.pickLevels[id] or 1, Power.cap(rarity, golden))
				local power = Power.strength(rarity, level, profile.circle.cards, golden)
				if power > strength then
					best, bestGold, strength = id, golden, power
				end
			end
		end
	end
	return best, bestGold
end

-- Stage 5 must call this same transition with bypassDay=true, and MUST retain all skills.
function Family.change(profile: any, family: string, day: number, bypassDay: boolean?): boolean
	if not Config.families[family] or family == profile.family then
		return false
	end
	local id, golden = Family.best(profile, family)
	if not id or (not bypassDay and day <= profile.familyChangeDay) then
		return false
	end
	profile.family, profile.pickaxe, profile.pickaxeGolden = family, id, golden
	if not bypassDay then
		profile.familyChangeDay = day
	end
	for pickId in profile.nextFamily do
		if Config.pickaxes[pickId].family == family then
			profile.nextFamily[pickId] = nil
		end
	end
	return true
end

function Family.skillPrice(level: number): number
	return Config.familyRules.skillFirstCost * Config.familyRules.skillGrowth ^ level
end

function Family.buySkill(profile: any, family: string, index: number): boolean
	if not Family.unlocked(profile, family, index) then
		return false
	end
	local levels, skill = profile.skills[family], Config.families[family].skills[index]
	local level = levels[index]
	local price = Family.skillPrice(level)
	if level >= skill.cap or profile.coins < price then
		return false
	end
	profile.coins -= price
	levels[index] += 1
	return true
end

return Family
