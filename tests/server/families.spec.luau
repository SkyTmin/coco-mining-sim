--!strict
-- Exercise the real service callbacks, with deterministic clock and in-memory profile/remotes.
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Collection = Loader.load("src/shared/Play/Collection.luau")
local Copy = Loader.load("src/shared/Persistence.luau").copy
local State = Loader.load("src/shared/Mine/MineState.luau")
local expect = Test.expect
local events, received = {}, {}
local function event(name: string): any
	if not events[name] then
		local handlers = {}
		events[name] = {
			OnServerEvent = {
				Connect = function(_, callback)
					table.insert(handlers, callback)
				end,
			},
			FireClient = function(_, _, ...)
				table.insert(received, { name = name, values = { ... } })
			end,
			dispatch = function(...)
				for _, callback in handlers do
					callback(...)
				end
			end,
		}
	end
	return events[name]
end
local noSignal = { Connect = function() end }
local now, epoch, p = 100, 86400 * 100, nil
local session = { state = State.new(91, 5, 3) }
local attributes = {}
local player = {
	GetAttribute = function(_, key)
		return attributes[key]
	end,
	SetAttribute = function(_, key, value)
		attributes[key] = value
	end,
}
local globals: any = {
	os = {
		clock = function()
			return now
		end,
		time = function()
			return epoch
		end,
	},
	task = {
		defer = function(callback, ...)
			callback(...)
		end,
	},
	workspace = {
		GetServerTimeNow = function()
			return now
		end,
	},
}
local loader = Loader.withOverrides({
	["src/shared/Remotes.luau"] = { event = event },
	["src/shared/Models/PickModel.luau"] = {},
	["src/server/Services/ProfileService.luau"] = {
		Mutate = function(_, callback)
			callback(p)
		end,
		Read = function(_, callback)
			return callback(p)
		end,
		OnLoaded = function() end,
	},
	["src/server/Services/MineService.luau"] = {
		get = function()
			return session
		end,
		window = function() end,
	},
	["src/server/Services/Analytics.luau"] = { event = function() end },
	["src/server/Services/ServerLog.luau"] = { analytics = function() end },
}, globals)
-- Mutate the borrowed globals table before loading services (the loader copies it on each require).
globals.game = {
	GetService = function(_, name)
		return if name == "Players"
			then { PlayerRemoving = noSignal }
			else { Shared = loader.node("src/shared") }
	end,
}
local Service = loader.load("src/server/Services/CollectionService.luau")
local Upgrades = loader.load("src/server/Services/UpgradeService.luau")
Service.Start()
Upgrades.Start()
local function fresh()
	p = { coins = 1e16, pickaxe = "starter" }
	Circle.initialize(p)
	Collection.grant(p, "storm_common")
	p.deepestWorld = 5
	now += 10
	attributes = {}
	table.clear(received)
end
local function send(op: string, a: any?, b: any?, advance: number?)
	now += advance or 0.6
	event("PickaxeIntent").dispatch(player, op, a, b)
end
Test.describe("Family server intents", function()
	Test.it(
		"rejects foreign equipment, unowned gold, locked skills, empty chests and insufficient duplicates",
		function()
			fresh()
			Collection.grant(p, "frost_legendary")
			local before = Copy(p)
			send("Equip", "frost_legendary", false)
			send("Equip", "storm_common", true)
			send("Merge", "storm_common")
			send("OpenChest")
			event("UpgradeIntent").dispatch(player, "BuySkill", "storm", 2)
			expect(p).toEqual(before)
			for _, value in { "bad", {}, 0 / 0, math.huge, -1, 1.5 } do
				now += 1
				event("UpgradeIntent").dispatch(player, "BuySkill", "storm", value)
			end
			expect(p).toEqual(before)
		end
	)
	Test.it("atomically charges a key once and rejects double clicks before 0.5 seconds", function()
		fresh()
		p.keys = 3
		send("OpenChest")
		expect(p.keys).toBe(2)
		expect(p.pickChestsOpened).toBe(1)
		expect(received[1].name).toBe("PickaxeResult")
		expect(received[1].values[1].id).toBe("storm_rare")
		send("OpenChest", nil, nil, 0.49)
		expect(p.keys).toBe(2)
		send("OpenChest", nil, nil, 0.11)
		expect(p.keys).toBe(1)
		expect(p.pickChestsOpened).toBe(2)
	end)
	Test.it(
		"offers one shop purchase for a collected pick without opening the key chest",
		function()
			fresh()
			send("BuyPick", "storm")
			expect(p.collection.storm_common.count).toBe(2)
			expect(received[1].name).toBe("Toast")
			expect(received[1].values[1]).toBe("pick_shop_done")
			send("BuyPick", "storm")
			expect(p.collection.storm_common.count).toBe(2)
			expect(#received).toBe(1)
		end
	)
	Test.it(
		"changes family at most once per UTC day and uses the strongest owned variant",
		function()
			fresh()
			Collection.grant(p, "frost_legendary", true)
			send("ChangeFamily", "frost")
			expect(p.family).toBe("frost")
			expect(p.pickaxeGolden).toBe(true)
			send("ChangeFamily", "storm")
			expect(p.family).toBe("frost")
			epoch += 86400
			send("ChangeFamily", "storm")
			expect(p.family).toBe("storm")
		end
	)
	Test.it(
		"accepts BuySkill only for an unlocked active skill and gates every Creative action",
		function()
			fresh()
			for _ = 1, 3 do
				now += 1
				event("UpgradeIntent").dispatch(player, "BuySkill", "storm", 1)
			end
			now += 1
			event("UpgradeIntent").dispatch(player, "BuySkill", "storm", 2)
			expect(p.skills.storm[2]).toBe(1)
			local before = Copy(p)
			expect(Service.Creative(player, "mine.keys", nil, nil, nil)).toBe(false)
			expect(p).toEqual(before)
			attributes.CreativeAllowed = true
			assert(Service.Creative(player, "mine.keys", nil, nil, nil))
			expect(p.keys).toBe(10)
		end
	)
end)
return true
