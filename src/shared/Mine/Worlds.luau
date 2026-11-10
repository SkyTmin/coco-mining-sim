--!strict
--!native

local Config = require(script.Parent.Parent.Config)
type WorldConfig = Config.WorldConfig
export type World = WorldConfig & {
	index: number,
	start: number,
	finish: number,
	plateDepth: number,
	weights: { number },
	orePrices: { number },
}

local worlds: { World } = {}
local start = 0
for index, definition in Config.worlds do
	assert(
		definition.length > 0 and definition.length % Config.mine.chunk == 0,
		"Invalid world length: " .. definition.id
	)
	local weights, orePrices = {}, {}
	local sum = 0
	for ore, entry in definition.ores do
		local id, share = entry[1] :: string, entry[2] :: number
		assert(share >= 0 and share <= 1, "Invalid ore share: " .. id)
		weights[ore], orePrices[ore] = share, definition.prices[id]
		sum += share
	end
	assert(math.abs(sum - 1) <= 1e-9, "Ore shares must sum to one: " .. definition.id)
	local world = table.clone(definition) :: World
	world.index = index
	world.start, world.finish = start, start + world.length
	world.plateDepth = world.finish - 1
	world.weights, world.orePrices = weights, orePrices
	worlds[index] = world
	start = world.finish
end
assert(#worlds > 0, "No worlds configured")

local Worlds = {}

function Worlds.of(d: number): World
	local lo, hi = 1, #worlds
	while lo < hi do
		local mid = (lo + hi) // 2
		if d < worlds[mid].finish then
			hi = mid
		else
			lo = mid + 1
		end
	end
	return worlds[lo]
end

function Worlds.durability(d: number): number
	local world = Worlds.of(d)
	local t = math.clamp(d - world.start, 0, world.length - 1) / world.length
	return world.durability.base * world.durability.growthInWorld ^ t
end

function Worlds.price(worldIndex: number, oreIndex: number): number
	return worlds[worldIndex].orePrices[oreIndex]
end

return Worlds
