--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local D = Loader.load("src/shared/Play/ProfileDefaults.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local Copy = Loader.load("src/shared/Persistence.luau")
local Collection = Loader.load("src/shared/Play/Collection.luau")
local expect = Test.expect
local function setup()
	local now, real, mutations, saved = 10, true, 0, nil
	local p = D.new(0)
	p.circleDeepestPlate, p.deepestWorld = 3, 4
	Collection.grant(p, "storm_common")
	local attrs = {}
	local player = {
		GetAttribute = function(_, key)
			return attrs[key]
		end,
		SetAttribute = function(_, key, value)
			attrs[key] = value
		end,
	}
	local responses = {}
	local loader
	local profile = {
		Read = function(_, fn)
			return fn(p)
		end,
		IsReal = function()
			return real
		end,
		PlaySeconds = function()
			return now
		end,
		Mutate = function(_, fn)
			local before = Copy.copy(p)
			fn(p)
			mutations += 1
			if before.rebirths ~= p.rebirths then
				local s = loader.load("src/server/Services/MineService.luau").get(player)
				expect(p.mine).toEqual(Codec.encode(s.state))
				expect(p.coins).toBe(0)
			end
		end,
		Replicate = function(_, full)
			expect(full).toBe(true)
		end,
		SaveNow = function()
			saved = Copy.copy(p)
			return true
		end,
	}
	loader = Loader.withOverrides({
		["src/shared/Remotes.luau"] = {
			event = function(name)
				return {
					FireClient = function(_, who, ...)
						if name == "RebirthResult" then
							table.insert(responses, table.pack(...))
						end
					end,
				}
			end,
		},
		["src/server/Services/ProfileService.luau"] = profile,
		["src/server/Services/PlotService.luau"] = { depth = function() end },
		["src/server/Services/PickaxeService.luau"] = { refresh = function() end },
		["src/server/Services/Analytics.luau"] = { event = function() end },
	}, {
		game = {
			GetService = function(_, name)
				return { Shared = loader.node("src/shared") }
			end,
		},
		os = {
			clock = function()
				return now
			end,
		},
		workspace = {
			GetServerTimeNow = function()
				return now
			end,
		},
		task = {
			spawn = function(fn, ...)
				fn(...)
			end,
		},
		warn = function() end,
	})
	local mine = loader.load("src/server/Services/MineService.luau")
	local s = {
		player = player,
		plot = 1,
		state = State.new(33, 5, 3),
		charge = 45,
		rng = {
			NextInteger = function()
				return 34
			end,
			NextNumber = function()
				return 0.5
			end,
		},
	}
	mine.adopt(s, mine.prepareAdopt(s.state, 0))
	mine.get = function()
		return s
	end
	p.mine = Codec.encode(s.state)
	local service = loader.load("src/server/Services/RebirthService.luau")
	return {
		p = p,
		s = s,
		attrs = attrs,
		responses = responses,
		service = service,
		real = function(value)
			real = value
		end,
		send = function(...)
			service.handle(player, ...)
			now += 2
		end,
		count = function()
			return mutations
		end,
		saved = function()
			return saved
		end,
	}
end
Test.describe("Authoritative rebirth remote", function()
	Test.it(
		"commits profile and session in the same mutation, resets all session state and rejects a replay",
		function()
			local t = setup()
			t.p.coins = 1234
			t.s.charge = 45
			t.s.streak.gauge = 90
			t.s.perks.nextPierce = 7
			t.send("Confirm", 0, 1, "storm", 1)
			expect(t.responses[1][1]).toBe(true)
			expect(t.p.cups).toBe(1)
			expect(t.p.rebirths).toBe(1)
			expect(t.s.state.seed).toBe(34)
			expect(t.s.state.front).toBe(0)
			expect(t.s.charge).toBe(0)
			expect(t.s.streak.gauge).toBe(0)
			expect(t.s.perks.nextPierce).toBe(0)
			expect(t.s.pace.seconds).toEqual({})
			expect(t.s.events.giftAt).toBe(20)
			expect(t.saved().mine).toEqual(t.p.mine)
			local before = Copy.copy(t.p)
			t.send("Confirm", 0, 1, "storm", 1)
			expect(t.responses[2][2]).toBe("stale")
			expect(t.p).toEqual(before)
			expect(t.count()).toBe(1)
		end
	)
	Test.it(
		"rejects forged choices, load failures, active ult/ride and malformed types without writes",
		function()
			for _, row in
				{
					{ "gain", 90, "changed" },
					{ "family", "frost", "family" },
					{ "start", 3, "start" },
					{ "serial", 2, "stale" },
					{ "unavailable", true, "unavailable" },
					{ "real", false, "unavailable" },
					{ "ult", true, "busy" },
					{ "ride", true, "busy" },
				}
			do
				local t = setup()
				local args = { serial = 0, gain = 1, family = "storm", start = 1 }
				if row[1] == "unavailable" then
					t.p.circleDeepestPlate = 0
				elseif row[1] == "real" then
					t.real(false)
				elseif row[1] == "ult" then
					t.s.ultUntil = 20
				elseif row[1] == "ride" then
					t.attrs.MineReturnAfter = 20
				else
					args[row[1]] = row[2]
				end
				local before = Copy.copy(t.p)
				t.send("Confirm", args.serial, args.gain, args.family, args.start)
				expect(t.responses[1][2]).toBe(row[3])
				expect(t.p).toEqual(before)
				expect(t.count()).toBe(0)
			end
			local t = setup()
			for _, bad in { 0 / 0, math.huge, -1, 0.5, "0", {} } do
				t.send("Confirm", bad, 1, "storm", 1)
			end
			expect(#t.responses).toBe(0)
			expect(t.count()).toBe(0)
		end
	)
	Test.it(
		"grants the pending Master epic once, defers an inactive family and rejects claims without entitlement",
		function()
			local t = setup()
			t.send("ClaimMaster", "frost")
			expect(t.responses[1][2]).toBe("unavailable")
			t.p.rewards.masterEpic = "pending"
			t.send("ClaimMaster", "frost")
			expect(t.responses[2][2]).toBe("claimed")
			expect(t.p.collection.frost_epic.count).toBe(1)
			expect(t.p.nextFamily.frost_epic).toBe(true)
			expect(t.p.rewards.masterEpic).toBe("claimed")
			t.send("ClaimMaster", "frost")
			expect(t.responses[3][2]).toBe("unavailable")
			expect(t.p.collection.frost_epic.count).toBe(1)
		end
	)
end)
return true
