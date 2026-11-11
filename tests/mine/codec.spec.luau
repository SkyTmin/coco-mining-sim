--!strict

local serde = require("@lune/serde")
local Test = require("../lib/expect")
local Fixture = require("./fixture")
local State = Fixture.load("MineState")
local Codec = Fixture.load("MineCodec")
local Bytes = Fixture.load("Bytes")
local expect = Test.expect

local function wire(bytes: string): string
	return Bytes.base64Encode(buffer.fromstring(bytes), #bytes)
end

local function varints(values: { number }): string
	local buf = buffer.create(5 * #values)
	local offset = 0
	for _, value in values do
		offset = Bytes.writeVarint(buf, offset, value)
	end
	return Bytes.base64Encode(buf, offset)
end

Test.describe("Mine codec", function()
	Test.it("round trips widened lanes and deep holes while dropping ordinary damage", function()
		local st, out = State.new(4294967295, 5, 3), {}
		State.removeLayers(st, 0, 125, out)
		State.advance(st)
		State.removeRange(st, -2, 1, 125, 230, out)
		State.removeRange(st, -2, 1, 410, 565, out)
		State.removeRange(st, -2, 1, 5010, 5190, out)
		State.removeCell(st, 2, 0, 128, out)
		State.widen(st, 9)
		local key = State.cellKey(3, 1, 125)
		st.damage[key] = 0.5
		local encoded = Codec.encode(st)
		expect(next(encoded.damage)).toBe(nil)
		expect(st.damage[key]).toBe(0.5)
		local decoded = assert(Codec.decode(serde.decode("json", serde.encode("json", encoded))))
		expect(next(decoded.damage)).toBe(nil)
		st.damage = {}
		expect(decoded).toEqual(st)
		expect(Codec.encode(decoded)).toEqual(encoded)
	end)

	Test.it("ignores legacy block damage and keeps saved plate damage", function()
		local st = State.new(17, 5, 3, 498)
		st.plateDamage = 6
		local legacy = Codec.encode(st)
		legacy.damage[State.cellKey(0, 1, 498)] = 0.75
		local decoded = assert(Codec.decode(legacy))
		expect(next(decoded.damage)).toBe(nil)
		expect(decoded.plateDamage).toBe(6)
	end)

	Test.it("rejects more than fifty malformed saves with explanations", function()
		local valid = Codec.encode(State.new(11, 1, 1))
		local cases = {
			{ "v", { -1, 0, 1, 3, "2", false } },
			{ "seed", { -1, 4294967296, 1.5, "11", math.huge, 0 / 0 } },
			{ "w", { 0, -1, 2, 16, 17, "1", false } },
			{ "h", { 0, -1, 8, 1.5, "1", true } },
			{ "front", { -1, 2147483649, 1.5, "0", math.huge, 0 / 0 } },
			{ "plateDamage", { -1, 120, 121, math.huge, 0 / 0, "0", true } },
			{
				"top",
				{
					valid.top:sub(1, -2),
					"?A==",
					"A=AA",
					"AB==",
					"AA=A",
					"AAAA====",
					"",
					wire(string.char(128)),
					wire(string.char(128, 0)),
					wire(string.char(255, 255, 255, 255, 16)),
					varints({ 1 }),
					varints({ 10000 }),
					varints({ 0, 0 }),
					0,
				},
			},
			{
				"holes",
				{
					"",
					"?A==",
					wire(string.char(128)),
					varints({ 4001 }),
					varints({ 1, 1 }),
					varints({ 1, 0, 1 }),
					varints({ 1, 1, 0 }),
					varints({ 2, 1, 3, 0, 2 }),
					varints({ 2, 1, 3, 4294967295, 2 }),
					varints({ 1, 9998, 2 }),
					varints({ 1, 1, 4294967295 }),
					varints({ 0, 1 }),
					true,
				},
			},
		}
		local checked = 0
		for _, group in cases do
			local field, values = group[1] :: string, group[2] :: { any }
			for _, bad in values do
				local damaged = table.clone(valid)
				damaged[field] = bad
				local decoded, problem = Codec.decode(damaged)
				assert(
					decoded == nil and type(problem) == "string",
					"Accepted corruption in " .. field
				)
				checked += 1
			end
			local missing = table.clone(valid)
			missing[field] = nil
			local decoded, problem = Codec.decode(missing)
			assert(decoded == nil and type(problem) == "string", "Accepted missing " .. field)
			checked += 1
		end
		assert(checked >= 50)
		print(string.format("Mine codec: %d malformed saves rejected", checked))
	end)

	Test.it("keeps a save with 4,000 sparse intervals below 20 KiB", function()
		local st, out = State.new(123456789, 5, 3), {}
		for i = 0, 3999 do
			local lane = i % 15
			local d = 130 + i // 15 * 7
			State.removeRange(st, lane // 3 - 2, lane % 3, d, d + 1, out)
		end
		expect(st.holeCount).toBe(4000)
		local encoded = Codec.encode(st)
		expect(assert(Codec.decode(encoded))).toEqual(st)
		local bytes = #serde.encode("json", encoded)
		print(string.format("Mine codec: 4,000 intervals = %d bytes of JSON", bytes))
		assert(bytes <= 20 * 1024)
	end)
end)

return true
