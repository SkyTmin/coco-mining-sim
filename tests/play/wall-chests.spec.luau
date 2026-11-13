--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Config = Loader.load("src/shared/Config")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Family = Loader.load("src/shared/Play/Family.luau")
local Chests = Loader.load("src/shared/Play/WallChests.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local Resolve = Loader.load("src/shared/Mine/Resolve.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local expect = Test.expect
local function fresh(): any
	local p = { coins = 0, pickaxe = "starter" }
	Circle.initialize(p)
	return p
end
Test.describe("Wall chests", function()
	Test.it(
		"generates one per forty layers, increases frequency, and samples the four tiers",
		function()
			local base = Chests.list(1204, 0, 4000000, 1)
			assert(math.abs(#base - 100000) < 100)
			local more = Chests.list(1204, 0, 4000000, 1.3)
			assert(math.abs(#more / #base - 1.3) < 0.01)
			local counts = { 0, 0, 0, 0 }
			for _, chest in base do
				counts[chest.tier] += 1
			end
			for i, tier in Config.chests.wall.tiers do
				assert(math.abs(counts[i] / #base - tier.share) < 0.003)
			end
		end
	)
	Test.it(
		"prices every chest by its own depth, applies greed and permits keys only from hand hits",
		function()
			local p = fresh()
			for _, depth in { 0, 500, 1600, 4000, 9300 } do
				local world, mean = Worlds.of(depth), 0
				for i, weight in world.weights do
					mean += world.orePrices[i] * weight
				end
				for tier, cfg in Config.chests.wall.tiers do
					local reward = Chests.reward(
						p,
						{ d = depth, tier = tier },
						false,
						17,
						Family.effects(p),
						Family.effects(p).coins
					)
					expect(reward.coins).toBe(math.floor(mean * cfg.blocks))
					expect(reward.keys).toBe(0)
				end
			end
			p.circle.cards.keys, p.wallChestKeyCounter = 10, 19
			expect(
				Chests.reward(
					p,
					{ d = 500, tier = 1 },
					true,
					17,
					Family.effects(p),
					Family.effects(p).coins
				).keys
			).toBe(1)
			p.circle.cards.coins = 25
			local reward = Chests.reward(
				p,
				{ d = 0, tier = 1 },
				false,
				17,
				Family.effects(p),
				Family.effects(p).coins
			)
			expect(reward.coins).toBe(2400)
		end
	)
	Test.it(
		"takes exactly three direct hits at any strength and persists staged chests across reloads",
		function()
			for _, strength in { 0.1, 1, 1000000 } do
				local st = State.new(1204, 5, 3)
				st.chestFrequency = 1.3
				local chest = assert(Chests.place(st, "firstStorm"))
				local saved = assert(Codec.decode(Codec.encode(st)))
				expect(saved.chestFrequency).toBe(1.3)
				expect(saved.chests[State.cellKey(chest.x, chest.y, chest.d)].stage).toBe(
					"firstStorm"
				)
				local pick =
					{ strength = strength, shape = "single", ultLayers = 10, chestFrequency = 1 }
				for i = 1, 3 do
					local res = assert(Resolve.hit(st, pick, chest.x, chest.y, chest.d))
					expect(#res.finds).toBe(if i == 3 then 1 else 0)
					expect(State.isSolid(st, chest.x, chest.y, chest.d)).toBe(i < 3)
				end
			end
		end
	)
	Test.it(
		"stages Storm and the first key once, retrying when an ult broke the key chest",
		function()
			local p, st = fresh(), State.new(37, 5, 3)
			expect(Chests.stage(st, p, 224)).toBe(false)
			assert(Chests.stage(st, p, 225))
			local key = next(st.chests)
			local reward = Chests.reward(
				p,
				st.chests[key],
				true,
				9,
				Family.effects(p),
				Family.effects(p).coins
			)
			expect(reward.pick.id).toBe("storm_common")
			expect(p.family).toBe("storm")
			st.chests = {}
			expect(Chests.stage(st, p, 899)).toBe(false)
			assert(Chests.stage(st, p, 900))
			local _, keyChest = next(st.chests)
			expect(
				Chests.reward(p, keyChest, false, 9, Family.effects(p), Family.effects(p).coins).keys
			).toBe(0)
			expect(p.staged.firstKey).toBe(nil)
			st.chests = {}
			assert(Chests.stage(st, p, 901))
			local _, retry = next(st.chests)
			expect(
				Chests.reward(p, retry, true, 9, Family.effects(p), Family.effects(p).coins).keys
			).toBe(1)
			expect(p.staged.firstKey).toBe(true)
		end
	)
end)
return true
