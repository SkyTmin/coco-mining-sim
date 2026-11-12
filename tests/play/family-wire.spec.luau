--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local Config = Loader.load("src/shared/Config")
local expect = Test.expect
Test.describe("Family wire hooks", function()
	Test.it(
		"preserves chest kinds, frozen flags and typed family events with server timing",
		function()
			local layer = table.create(15, 1)
			for tier = 1, 4 do
				layer[tier] = Wire.chest(tier)
				expect(Wire.chestTier(layer[tier])).toBe(tier)
			end
			local frozen = { { x = -2, y = 0, dRel = 0 } }
			local win = {
				plot = 1,
				front = 5,
				width = 5,
				height = 3,
				charge = 0,
				plateDamage = 0,
				damage = {},
				layers = table.create(Config.mine.nearWindow, layer),
				frozen = frozen,
			}
			expect(Wire.decodeWindow(Wire.encodeWindow(win))).toEqual(win)
			local events = {}
			for i, family in Config.familyRules.order do
				for kind = 3, 6 do
					table.insert(events, {
						kind = kind,
						type = if kind == 3
							then "perk"
							elseif kind == 4 then "ult"
							elseif kind == 5 then "frozen"
							else "proc",
						flags = (kind * 13 + i) % 128,
						family = family,
						rarity = Config.familyRules.rarities[i],
						gen = 1,
						delayMs = 45,
						durationMs = 180,
						buffMs = if kind == 4 then 0 else nil,
						points = frozen,
					})
				end
			end
			local res = {
				seq = 0,
				plot = 1,
				front = 5,
				accepted = true,
				ability = true,
				heavy = false,
				crit = false,
				mega = false,
				rain = false,
				delta = 0,
				cells = {},
				runs = {},
				finds = {},
				damage = {},
				charge = 0,
				plateDamage = 0,
				coins = 0,
				blocks = 0,
				events = events,
			}
			expect(Wire.decodeResult(Wire.encodeResult(res))).toEqual(res)
		end
	)
end)
return true
