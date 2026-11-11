--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Action = Loader.load("src/shared/Play/MiningAction.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Collection = Loader.load("src/shared/Play/Collection.luau")
local Perks = Loader.load("src/shared/Play/Perks.luau")
local Chests = Loader.load("src/shared/Play/WallChests.luau")
local Resolve = Loader.load("src/shared/Mine/Resolve.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local expect = Test.expect
local function profile(family: string): any
	local p =
		{ coins = 0, pickaxe = "starter", stats = { blocks = 0, layers = 0, playSeconds = 0 } }
	Circle.initialize(p)
	Collection.grant(p, family .. "_common")
	p.family, p.pickaxe = family, family .. "_common"
	return p
end
Test.describe("Authoritative family mining", function()
	Test.it(
		"starts the Storm buff after the entire ult animation and applies Dynamite to all ult block coins",
		function()
			local p, runtime = profile("storm"), Perks.new()
			p.skills.storm[4] = 3
			local outcome = Action.perform(
				State.new(17, 5, 3),
				p,
				runtime,
				{ ability = true, now = 10, ultLayers = 10 }
			)
			expect(runtime.stormUntil).toBe(10 + outcome.duration + 8)
			expect(outcome.events[1].buffMs).toBe(8000)
			local a = Action.perform(
				State.new(17, 5, 3),
				profile("storm"),
				Perks.new(),
				{ ability = true, now = 0, ultLayers = 10 }
			)
			local b = Action.perform(
				State.new(17, 5, 3),
				profile("dynamite"),
				Perks.new(),
				{ ability = true, now = 0, ultLayers = 10 }
			)
			assert(math.abs(b.coins / a.coins - 1.5) < 1e-12)
		end
	)
	Test.it("keeps a valid mine when tiny crack overflow rounds below one damage unit", function()
		local st = State.new(1, 5, 3, Worlds.at(9).start)
		st.damage[State.cellKey(0, 1, st.front)] = 0.875
		assert(
			Resolve.hit(
				st,
				{ strength = 1e9, shape = "single", ultLayers = 10 },
				0,
				1,
				st.front,
				{ strength = 1e9 + 2 ^ -23, cracks = true }
			)
		)
		local valid, problem = State.check(st)
		assert(valid, problem)
	end)
	Test.it(
		"uses x2 Frost plate damage and the remaining-layer fraction after the skill bonus",
		function()
			local storm, frost = profile("storm"), profile("frost")
			frost.skills.frost[3] = 2
			local st, fr = State.new(17, 5, 3, 1569), State.new(17, 5, 3, 1569)
			local request = { ability = true, now = 0, ultLayers = 60 }
			local a = Action.perform(st, storm, Perks.new(), request)
			local b = Action.perform(fr, frost, Perks.new(), request)
			assert(math.abs(b.res.plateHit / a.res.plateHit - 3.2) < 1e-12)
			expect(State.isSolid(fr, 0, 0, 1600)).toBe(true)
		end
	)
	Test.it(
		"awards wall coins once, grants no ult key and retries the staged key for hand mining",
		function()
			local p, st = profile("dynamite"), State.new(17, 5, 3)
			local chest = assert(Chests.place(st, "firstKey"))
			local outcome =
				Action.perform(st, p, Perks.new(), { ability = true, now = 0, ultLayers = 10 })
			expect(outcome.keys).toBe(0)
			expect(p.coins).toBe(outcome.coins)
			expect(p.staged.firstKey).toBe(nil)
			expect(st.chests[State.cellKey(chest.x, chest.y, chest.d)]).toBe(nil)
			local retry = assert(Chests.place(st, "firstKey"))
			local runtime = Perks.new()
			local reward
			for i = 1, 3 do
				reward = Action.perform(
					st,
					p,
					runtime,
					{ now = i, x = retry.x, y = retry.y, d = retry.d }
				)
			end
			expect(p.staged.firstKey).toBe(true)
			assert(reward.keys >= 1)
		end
	)
	Test.it("echo is a complete second wave with no charge and cannot recurse", function()
		local p, found = profile("rift"), false
		p.skills.rift[3] = 10
		for serial = 0, 100 do
			p.ultCounter = serial
			local st, runtime = State.new(19, 5, 3), Perks.new()
			local first =
				Action.perform(st, p, runtime, { ability = true, now = 0, ultLayers = 10 })
			if first.echo then
				local front = st.front
				local second = Action.perform(
					st,
					p,
					runtime,
					{ ability = true, echo = true, now = 0, ultLayers = 10 }
				)
				expect(st.front - front).toBe(10)
				expect(second.echo).toBe(false)
				expect(second.events[1].type).toBe("ult")
				found = true
				break
			end
		end
		assert(found)
	end)
end)
return true
