--!strict
local Config = require(script.Parent.Parent.Config)
local Upgrade = require(script.Parent.Upgrade)
local Ranks = {}
function Ranks.of(cups: number): any?
	local result = nil
	for _, rank in Config.rebirth.ranks do
		if cups < rank.cups then
			break
		end
		result = rank
	end
	return result
end
function Ranks.lift(cups: number): number
	local result = 1
	for _, rank in Config.rebirth.ranks do
		if cups < rank.cups then
			break
		end
		result = rank.lift or result
	end
	return result
end
function Ranks.liftMax(cups: number, deepestWorld: number): number
	return math.max(1, math.min(Ranks.lift(cups), deepestWorld - 1))
end
function Ranks.startSize(cups: number): number
	local result = 1
	if Upgrade.hitSizeEnabled then
		for _, rank in Config.rebirth.ranks do
			if cups < rank.cups then
				break
			end
			result = rank.size or result
		end
	end
	return result
end
function Ranks.master(cups: number): boolean
	for _, rank in Config.rebirth.ranks do
		if rank.id == "master" then
			return cups >= rank.cups
		end
	end
	return false
end
return Ranks
