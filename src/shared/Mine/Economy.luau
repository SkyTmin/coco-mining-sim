--!strict

local Worlds = require(script.Parent.Worlds)
local Economy = {}

function Economy.coinsFor(hist: { [number]: number }): number
	local coins = 0
	for key, count in hist do
		coins += count * Worlds.price(key // 64, key % 64)
	end
	return coins
end

return Economy
