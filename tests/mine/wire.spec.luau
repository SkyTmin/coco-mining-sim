--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local Fixture = require("./fixture")
local expect = Test.expect

Test.describe("Mine protocol", function()
	Test.it("round trips intents, full masks, incremental layers, effects and rejects", function()
		for _, op in { "Hit", "Ability" } do
			expect(Wire.decodeIntent(Wire.encodeIntent(op, 65535, -2, 2, 19))).toEqual({
				op = op,
				seq = 65535,
				x = -2,
				y = 2,
				dRel = 19,
			})
		end
		expect(Wire.decodeIntent(Wire.encodeIntent("Resync"))).toEqual({ op = "Resync" })
		local layer = { 1, 0, 3, 0, 0, Wire.CHEST, 3, 2, 0, 1, 0, 2, Wire.PLATE, 0, 4 }
		local layers = table.create(20, layer)
		local damage = { { x = -1, y = 2, dRel = 0, amount = 2 } }
		local win = {
			plot = 8,
			front = 36000,
			width = 5,
			height = 3,
			charge = 45,
			plateDamage = 37.25,
			layers = layers,
			damage = damage,
		}
		expect(Wire.decodeWindow(Wire.encodeWindow(win))).toEqual(win)
		local result = {
			seq = 7,
			plot = 8,
			front = 36004,
			accepted = true,
			delta = 4,
			ability = true,
			width = 5,
			height = 3,
			layers = table.create(4, layer),
			damage = damage,
			charge = 0,
			plateDamage = 0,
			cells = { { x = 2, y = 1, dRel = 1, gen = 1 } },
			runs = { { x = -2, y = 1, a = 36030, b = 36160 } },
			events = {
				{
					kind = 1,
					gen = 1,
					delayMs = 45,
					points = {
						{ x = -2, y = 0, dRel = 0 },
						{ x = -1, y = 1, dRel = 1 },
					},
				},
			},
			coins = 115123456789.25,
			blocks = 131,
			finds = { { kind = 1, id = 617 } },
		}
		expect(Wire.decodeResult(Wire.encodeResult(result))).toEqual(result)
		local rejected = { seq = 7, plot = 8, front = 36004, accepted = false }
		expect(Wire.decodeResult(Wire.encodeResult(rejected))).toEqual(rejected)
		local blob = Wire.encodeResult(result)
		local truncated = buffer.create(buffer.len(blob) - 1)
		buffer.copy(truncated, 0, blob, 0, buffer.len(truncated))
		expect(Wire.decodeResult(truncated)).toBe(nil)
	end)

	Test.it("rejects 10,000 randomized malformed inputs without throwing", function()
		local rand = Fixture.random(670142)
		for i = 1, 10000 do
			local len = if i % 5 == 0 then 6 else rand(0, 72)
			local data = buffer.create(len)
			for j = 0, len - 1 do
				buffer.writeu8(data, j, rand(0, 255))
			end
			if len == 1 or len == 6 then
				buffer.writeu8(data, 0, rand(4, 255))
			end
			expect(Wire.decodeIntent(data)).toBe(nil)
		end
		for _, v in { false, 23, "Hit", {} } do
			expect(Wire.decodeIntent(v)).toBe(nil)
		end
	end)
end)

return true
