--!strict
local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Parent.Mine.Hash)
local Keys = {}

function Keys.add(profile: any, amount: number, seed: number): number
	local awarded = 0
	for _ = 1, amount do
		profile.keySerial += 1
		local double = (profile.circle.cards.keys or 0) >= Config.progress.cards.keys.steps[2]
			and Hash.unit(seed, profile.keySerial, 451) < Config.chests.doubleKeyChance
		awarded += if double then 2 else 1
	end
	profile.keys += awarded
	return awarded
end

function Keys.hit(profile: any, multiplier: number, seed: number): number
	profile.keyHits += (1 + (profile.circle.cards.keys or 0) * Config.progress.cards.keys.per) * multiplier
	local count = math.floor((profile.keyHits + 1e-9) / Config.chests.keyHits)
	profile.keyHits = math.max(0, profile.keyHits - count * Config.chests.keyHits)
	return Keys.add(profile, count, seed)
end

return Keys
