--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local E = Loader.load("src/shared/Play/MineEvents.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Income = Loader.load("src/shared/Play/Income.luau")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local expect = Test.expect
local function random()
	return 0
end
Test.describe("Server event schedule", function()
	Test.it("waits for first lifetime time, a hand hit and a free animation slot", function()
		local st, e = State.new(13, 5, 3), E.new(0, random)
		e.lastHand = 329
		expect(#E.tick(e, st, 329, 329, false, false, random)).toBe(0)
		expect(#E.tick(e, st, 330, 330, false, true, random)).toBe(0)
		e.lastHand = 0
		expect(#E.tick(e, st, 331, 331, false, false, random)).toBe(0)
		e.lastHand = 332
		local out = E.tick(e, st, 332, 332, false, false, random)
		expect(out[1].type).toBe(1)
		expect(out[1].deadline).toBe(342)
		expect(E.start(e, st, "fever", 333, random)).toBe(nil)
	end)
	Test.it("retries an unsuitable plate in ten seconds and honors timeout grace", function()
		local st, e = State.new(1, 5, 3, Worlds.at(1).plateDepth), E.new(0, random)
		e.lastHand = 330
		expect(#E.tick(e, st, 330, 330, false, false, random)).toBe(0)
		expect(e.retryAt).toBe(340)
		st = State.new(1, 5, 3)
		e.lastHand = 339
		expect(#E.tick(e, st, 339, 339, false, false, random)).toBe(0)
		expect(E.tick(e, st, 340, 340, false, false, random)[1].type).toBe(1)
		expect(#E.tick(e, st, 350.25, 350.25, true, false, random)).toBe(0)
		expect(E.tick(e, st, 350.251, 350.251, true, false, random)[1].reason).toBe(0)
		expect(e.freeAt).toBe(355.251)
		expect(e.veinAt).toBe(530.251)
	end)
	Test.it("starts fever after a hit, with the next action at x5, then reports its sum", function()
		local st, e = State.new(1, 5, 3), E.new(0, random)
		E.start(e, st, "vein", 0, random)
		local c = e.vein.cells[1]
		expect(Income.context({ cups = 0 }, { coins = 1 }, {}, 10, e.feverUntil).F).toBe(1)
		local out = E.after(e, st, { now = 10.25, x = c.x, y = c.y, d = c.d }, 11)
		expect(out[1].type).toBe(2)
		expect(out[1].reason).toBe(1)
		expect(out[2].type).toBe(3)
		expect(e.feverTotal).toBe(0)
		expect(e.feverUntil).toBe(40.25)
		expect(Income.context({ cups = 0 }, { coins = 1 }, {}, 11, e.feverUntil).F).toBe(5)
		E.after(e, st, { now = 11, ability = true }, 55)
		E.after(e, st, { now = 40.25, ability = true }, 7)
		local ended = E.tick(e, st, 40.25, 400, true, false, random)
		expect(ended[1].total).toBe(55)
		expect(E.start(e, st, "vein", 44, random)).toBe(nil)
		expect(E.start(e, st, "vein", 45.25, random)[1].type).toBe(1)
	end)
	Test.it("gives a pending gift on first hand hit or after ten seconds, exactly once", function()
		for _, hit in { false, true } do
			local st, e = State.new(1, 5, 3), E.new(100, random)
			e.giftAt = 110
			expect(E.free(e, 100)).toBe(false)
			if hit then
				expect(E.after(e, st, { now = 102, ability = true }, 7)).toEqual({})
				expect(E.after(e, st, { now = 103 }, 50)[1].reason).toBe(1)
				expect(e.feverUntil).toBe(133)
				expect(e.feverTotal).toBe(50)
			else
				expect(E.tick(e, st, 110, 0, false, true, random)[1].reason).toBe(1)
				expect(e.feverUntil).toBe(140)
			end
			expect(e.giftAt).toBe(nil)
			expect(#E.after(e, st, { now = 111 }, 1)).toBe(0)
			local reset = E.new(120, random)
			expect(reset.giftAt).toBe(nil)
			expect(reset.feverUntil).toBe(0)
		end
	end)
	Test.it("round trips absolute event coordinates and rejects invalid packets", function()
		for kind = 1, 7 do
			local event = {
				type = kind,
				plot = 1,
				front = 123,
				deadline = 450.25,
				reason = 1,
				total = 1234567.5,
				points = { { x = -2, y = 2, d = 124 } },
			}
			expect(Wire.decodeEvent(Wire.encodeEvent(event))).toEqual(event)
			event.plot = 0
			expect(Wire.decodeEvent(Wire.encodeEvent(event))).toBe(nil)
		end
		for n = 0, 27 do
			expect(Wire.decodeEvent(buffer.create(n))).toBe(nil)
		end
	end)
end)
return true
