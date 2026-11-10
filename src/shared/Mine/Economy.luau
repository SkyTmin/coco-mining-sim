--!strict

local Worlds = require(script.Parent.Worlds)
local Power = require(script.Parent.Parent.Play.Power)
local Economy = {}

function Economy.coinsFor(
	hist: { [number]: number },
	cardLevel: number?,
	multiplier: number?
): number
	local coins = 0
	for key, count in hist do
		coins += count * Power.coins(Worlds.price(key // 64, key % 64), cardLevel or 0, multiplier)
	end
	return coins
end

return Economy
