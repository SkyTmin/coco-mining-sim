--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local Fixture = require("./fixture")
local expect = Test.expect
local Config = Loader.load("src/shared/Config")
local State = Loader.load("src/shared/Mine/MineState.luau")

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
		local layers = table.create(Config.mine.nearWindow, layer)
		local damage = { { x = -1, y = 2, dRel = 0, amount = 128 } }
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
		local distant = {
			plot = win.plot,
			front = win.front,
			width = 5,
			height = 3,
			offset = Config.mine.nearWindow,
			layers = table.create(Config.mine.layerBatch, layer),
		}
		expect(Wire.decodeLayers(Wire.encodeLayers(distant))).toEqual(distant)
		distant.offset = Config.mine.window - 1
		expect(Wire.decodeLayers(Wire.encodeLayers(distant))).toBe(nil)
		local result = {
			seq = 7,
			plot = 8,
			front = 36004,
			accepted = true,
			streak = 253,
			streakTier = 2,
			delta = 4,
			ability = true,
			heavy = true,
			crit = true,
			mega = false,
			rain = true,
			width = 5,
			height = 3,
			layers = layers,
			damage = damage,
			charge = 0,
			plateDamage = 0,
			cells = { { x = 2, y = 1, dRel = 1, gen = 1 } },
			runs = { { x = -2, y = 1, a = 36030, b = 36160 } },
			events = {
				{
					kind = 7,
					gen = 1,
					delayMs = 0,
					flags = 0,
					points = table.create(26, { x = 0, y = 0, dRel = 0 }),
				},
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
		result.lastFace = { depth = result.front - 1, tiles = layer }
		expect(Wire.decodeResult(Wire.encodeResult(result))).toEqual(result)
		result.lastFace.depth = result.front
		expect(Wire.decodeResult(Wire.encodeResult(result))).toBe(nil)
		result.lastFace.depth = result.front - 1
		local blob = Wire.encodeResult(result)
		local truncated = buffer.create(buffer.len(blob) - 1)
		buffer.copy(truncated, 0, blob, 0, buffer.len(truncated))
		expect(Wire.decodeResult(truncated)).toBe(nil)
	end)

	Test.it("encodes DigStop as an argumentless intent and rejects a payload", function()
		local stop = Wire.encodeIntent("DigStop")
		expect(buffer.len(stop)).toBe(1)
		expect(Wire.decodeIntent(stop)).toEqual({ op = "DigStop" })
		local withPayload = Wire.encodeIntent("Hit", 1, 0, 0, 0)
		buffer.copy(withPayload, 0, stop)
		expect(Wire.decodeIntent(withPayload)).toBe(nil)
	end)

	Test.it("keeps the first window under 4 KiB with 4000 holes", function()
		local st, removed = State.new(303, 7, 3, 1600), {}
		for i = 0, 3999 do
			local lane = i % 21
			local d = st.front + 2 + (i // 21) * 2
			State.removeRange(st, lane // 3 - 3, lane % 3, d, d + 1, removed)
		end
		expect(st.holeCount).toBe(4000)
		local layers, damage = {}, {}
		for dRel = 0, Config.mine.nearWindow - 1 do
			local layer = {}
			for x = -3, 3 do
				for y = 0, 2 do
					local solid = State.isSolid(st, x, y, st.front + dRel)
					table.insert(layer, if solid then 1 else 0)
					if solid then
						table.insert(damage, { x = x, y = y, dRel = dRel, amount = 128 })
					end
				end
			end
			table.insert(layers, layer)
		end
		local packet = Wire.encodeWindow({
			plot = 1,
			front = st.front,
			charge = 0,
			plateDamage = 0,
			width = 7,
			height = 3,
			layers = layers,
			damage = damage,
		})
		print(string.format("MineWindow with 4000 holes: %d bytes", buffer.len(packet)))
		assert(buffer.len(packet) <= 4096)
		expect(Wire.decodeWindow(packet).layers).toEqual(layers)
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
				buffer.writeu8(data, 0, rand(5, 255))
			end
			expect(Wire.decodeIntent(data)).toBe(nil)
		end
		for _, v in { false, 23, "Hit", {} } do
			expect(Wire.decodeIntent(v)).toBe(nil)
		end
	end)
end)

return true
