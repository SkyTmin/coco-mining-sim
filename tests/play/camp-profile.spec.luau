--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Camp = Loader.load("src/shared/Play/CampProfile.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Defaults = Loader.load("src/shared/Play/ProfileDefaults.luau")
Test.describe("Camp profile", function()
	Test.it(
		"migrates the greatest record once and never counts cumulative layers as depth",
		function()
			local p = Defaults.new(1)
			p.v, p.mine, p.bestDepth, p.maxDepth, p.stats.layers =
				4, { front = 600 }, 200, 750, 1200
			assert(Circle.migrate(p) and p.bestDepth == 750 and p.settings.guests == "friends")
			p.likes = 8
			assert(Circle.migrate(p) and p.likes == 8)
			p.settings.guests = "invalid"
			assert(not Circle.migrate(p))
		end
	)
	Test.it(
		"publishes only the public fields and orders showcases by rarity, gold and family order",
		function()
			local p = Defaults.new(1)
			p.collection.storm_rare = { count = 1, golden = 0 }
			p.collection.rift_rare = { count = 1, golden = 0 }
			p.collection.frost_rare = { count = 0, golden = 1 }
			p.collection.dynamite_legendary = { count = 1, golden = 0 }
			local card = Camp.card(p, "Miner")
			assert(table.concat(card.showcase, ",") == "dynamite_legendary,frost_rare,storm_rare")
			local keys = {}
			for key in card do
				table.insert(keys, key)
			end
			table.sort(keys)
			assert(
				table.concat(keys, ",") == "bestDepth,duelWins,golden,likes,name,pick,rank,showcase"
			)
		end
	)
	Test.it("uses ISO weeks across calendar years and only advances the current record", function()
		assert(Camp.week(1609459200) == "2020W53" and Camp.week(1609718400) == "2021W01")
		local p = Defaults.new(1)
		Camp.advance(p, 600, "2020W53")
		Camp.advance(p, 12, "2021W01")
		assert(p.bestDepth == 600 and p.weekBest.depth == 12)
	end)
end)
return true
