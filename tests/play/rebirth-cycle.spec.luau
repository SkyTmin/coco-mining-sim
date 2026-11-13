--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local testCircle = table.clone(Circle)
function testCircle.pick(...)
	local p = Circle.pick(...)
	p.strength = 1e12
	return p
end
local load = Loader.withOverrides({ ["src/shared/Play/Circle.luau"] = testCircle }).load
local A = load("src/shared/Play/MiningAction.luau")
local D = load("src/shared/Play/ProfileDefaults.luau")
local S = load("src/shared/Mine/MineState.luau")
local Codec = load("src/shared/Mine/MineCodec.luau")
local W = load("src/shared/Mine/Worlds.luau")
local R = load("src/shared/Play/Rebirth.luau")
local Ranks = load("src/shared/Play/Ranks.luau")
local C = load("src/shared/Play/Collection.luau")
local Perks = load("src/shared/Play/Perks.luau")
local Streak = load("src/shared/Play/Streak.luau")
local Income = load("src/shared/Play/Income.luau")
local Family = load("src/shared/Play/Family.luau")
local E = load("src/shared/Play/MineEvents.luau")
local Copy = load("src/shared/Persistence.luau")
local Hold = load("src/shared/Play/RebirthHold.luau")
local expect = Test.expect
Test.describe("Complete rebirth cycle", function()
	Test.it(
		"mines worlds one through four, builds rush, catches fever, then earns ten real circles and no skipped lift plates",
		function()
			local p = D.new(0)
			C.grant(p, "storm_common")
			C.grant(p, "frost_common")
			local st = S.new(66, 5, 3)
			local runtime, streak = Perks.new(), Streak.new(0)
			local e = E.new(0, function()
				return 0
			end)
			local now = 0
			local tiers, fever = false, false
			local function hit(ability: boolean?)
				now += 0.35
				local x, y = 0, 1
				if not ability then
					local found = false
					for xx = -2, 2 do
						for yy = 0, 2 do
							if not found and S.isSolid(st, xx, yy, st.front) then
								x, y, found = xx, yy, true
							end
						end
					end
				end
				Streak.decay(streak, now, false)
				local ctx = Income.context(
					p,
					Family.effects(p),
					{ Streak.multiplier(streak) },
					now,
					e.feverUntil
				)
				local request = {
					ability = ability,
					now = now,
					playSeconds = now,
					x = x,
					y = y,
					d = st.front,
					income = ctx,
					marks = e,
					ultLayers = 10000,
				}
				local result = assert(A.perform(st, p, runtime, request))
				E.after(e, st, request, result.coins)
				if not ability then
					Streak.add(streak, now, 0.35)
				end
				tiers = tiers or Streak.tier(streak) == 4
				for _, event in
					E.tick(e, st, now, now, p.staged.firstVein == true, false, function()
						return 0
					end)
				do
					if event.type == 1 then
						p.staged.firstVein = true
					end
				end
				fever = fever or ctx.F == 5
				return result
			end
			while p.circleDeepestPlate < 3 do
				hit()
			end
			expect(W.of(st.front).index).toBe(4)
			assert(tiers and fever)
			local q = R.quote(p)
			assert(q.available and q.profitable)
			expect(q.gain).toBe(1)
			for i = 1, 3 do
				assert(p.worldBest[tostring(i)] > 0)
			end
			p.mine = Codec.encode(st)
			local keep = Copy.copy(p)
			local plan = assert(
				R.plan(
					p,
					{ serial = 0, gain = 1, family = "frost", start = 1, playSeconds = now },
					67,
					0
				)
			)
			R.commit(p, plan)
			st = plan.state
			expect(p.family).toBe("frost")
			expect(p.cups).toBe(1)
			expect(p.circle.cards).toEqual({})
			expect(p.circle.pickLevels).toEqual({})
			expect(p.coins).toBe(0)
			for _, key in
				{
					"skills",
					"collection",
					"keys",
					"worldBest",
					"stats",
					"familyChangeDay",
					"hitCounter",
					"unlocked",
					"width",
				}
			do
				expect(p[key]).toEqual(keep[key])
			end
			local base = Copy.copy(p)
			base.cups = 0
			local request = { now = now + 0.35, x = 0, y = 1, d = 0 }
			local first = assert(A.perform(Copy.copy(st), base, Perks.new(), request))
			local second = assert(A.perform(Copy.copy(st), Copy.copy(p), Perks.new(), request))
			expect(second.coins).toBe(first.coins * 2)
			for circle = 2, 10 do
				runtime, streak, e =
					Perks.new(), Streak.new(now), E.new(now, function()
						return 0
					end)
				while p.circleDeepestPlate < 3 do
					hit(true)
				end
				expect(R.quote(p).gain).toBe(1)
				local nextPlan = assert(R.plan(p, {
					serial = p.rebirths,
					gain = 1,
					family = "frost",
					start = 1,
					playSeconds = now,
				}, 66 + circle, 0))
				R.commit(p, nextPlan)
				st = nextPlan.state
			end
			expect(p.cups).toBe(10)
			expect(p.rebirths).toBe(10)
			expect(Ranks.liftMax(p.cups, p.deepestWorld)).toBe(3)
			-- Lift is chosen for the following real circle; it never counts its skipped plates.
			runtime, streak, e =
				Perks.new(), Streak.new(now), E.new(now, function()
					return 0
				end)
			while p.circleDeepestPlate < 3 do
				hit(true)
			end
			local lifted = assert(
				R.plan(
					p,
					{ serial = 10, gain = 1, family = "frost", start = 3, playSeconds = now },
					99,
					W.at(3).start
				)
			)
			R.commit(p, lifted)
			st = lifted.state
			expect(p.circleDeepestPlate).toBe(0)
			expect(R.quote(p).available).toBe(false)
			runtime, streak, e =
				Perks.new(), Streak.new(now), E.new(now, function()
					return 0
				end)
			while p.circleDeepestPlate < 3 do
				hit(true)
			end
			expect(R.quote(p).available).toBe(true)
		end
	)
	Test.it(
		"cancels a short hold, sends once after 1.5s and recovers from missing replies",
		function()
			local h = Hold.new()
			Hold.begin(h, 0)
			expect(Hold.step(h, 1, 0.1)).toBe(nil)
			Hold.cancel(h)
			Hold.step(h, 1.2, 0.2)
			expect(h.ratio).toBe(0)
			Hold.begin(h, 2)
			expect(Hold.step(h, 3.499, 0.1)).toBe(nil)
			expect(Hold.step(h, 3.5, 0.001)).toBe("send")
			Hold.begin(h, 3.6)
			expect(Hold.step(h, 4, 0.4)).toBe(nil)
			expect(Hold.step(h, 8.5, 0.1)).toBe("timeout")
			Hold.begin(h, 9)
			expect(Hold.step(h, 10.5, 1.5)).toBe("send")
			Hold.reply(h)
			expect(h.sent).toBe(nil)
		end
	)
end)
return true
