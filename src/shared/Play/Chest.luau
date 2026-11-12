--!strict
local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Parent.Mine.Hash)
local Collection = require(script.Parent.Collection)
local Chest = {}

function Chest.roll(seed: number, counter: number): (string, string)
	local value = Hash.unit(seed, counter, 461)
	local selected = "legendary"
	for _, rarity in Config.familyRules.rarities do
		value -= Config.chests.pick.odds[rarity]
		if value < 0 then
			selected = rarity
			break
		end
	end
	local families = Config.familyRules.order
	local family = families[math.floor(Hash.unit(seed, counter, 463) * #families) + 1]
	return selected, family
end

-- Called inside one synchronous ProfileService.Mutate, with no yields.
function Chest.open(profile: any, seed: number): any?
	if profile.keys < 1 then
		return nil
	end
	local serial = profile.pickChestsOpened + 1
	local rarity, family = Chest.roll(seed, serial)
	local pity, rules = profile.chestPity, Config.chests.pick
	if serial == 1 then
		rarity, family = "rare", profile.family or "storm"
	elseif pity.legendary + 1 >= rules.pityLegendary then
		rarity = "legendary"
	elseif pity.epic + 1 >= rules.pityEpic and rarity ~= "legendary" then
		rarity = "epic"
	end
	local high = rarity == "epic" or rarity == "legendary"
	pity.epic = if high then 0 else pity.epic + 1
	pity.legendary = if rarity == "legendary" then 0 else pity.legendary + 1
	profile.keys -= 1
	profile.pickChestsOpened = serial
	return Collection.grant(profile, family .. "_" .. rarity)
end

return Chest
