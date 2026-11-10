--!strict

local Config = require(script.Parent.Parent.Config)
local mine = Config.mine
local cascade = Config.cascade
local Wire = { CHEST = 64, PLATE = 65 }
local opcodes = { Hit = 1, Ability = 2, Resync = 3 }

local function check(condition: boolean)
	assert(condition, "Malformed mine packet")
end

function Wire.encodeIntent(op: string, seq: number?, x: number?, y: number?, dRel: number?): buffer
	local out = buffer.create(if op == "Resync" then 1 else 6)
	buffer.writeu8(out, 0, (opcodes :: { [string]: number })[op])
	if op ~= "Resync" then
		buffer.writeu16(out, 1, seq :: number)
		buffer.writei8(out, 3, x :: number)
		buffer.writeu8(out, 4, y :: number)
		buffer.writeu8(out, 5, dRel :: number)
	end
	return out
end

function Wire.decodeIntent(value: any): any?
	if typeof(value) ~= "buffer" then
		return nil
	end
	local n = buffer.len(value)
	if n ~= 1 and n ~= 6 then
		return nil
	end
	local opcode = buffer.readu8(value, 0)
	if n == 1 then
		return if opcode == 3 then { op = "Resync" } else nil
	end
	if opcode ~= 1 and opcode ~= 2 then
		return nil
	end
	local seq = buffer.readu16(value, 1)
	if seq == 0 then
		return nil
	end
	return {
		op = if opcode == 1 then "Hit" else "Ability",
		seq = seq,
		x = buffer.readi8(value, 3),
		y = buffer.readu8(value, 4),
		dRel = buffer.readu8(value, 5),
	}
end

local widths = { u8 = 1, i8 = 1, u16 = 2, u32 = 4, f64 = 8 }
local writes = {
	u8 = buffer.writeu8,
	i8 = buffer.writei8,
	u16 = buffer.writeu16,
	u32 = buffer.writeu32,
	f64 = buffer.writef64,
}
local reads = {
	u8 = buffer.readu8,
	i8 = buffer.readi8,
	u16 = buffer.readu16,
	u32 = buffer.readu32,
	f64 = buffer.readf64,
}

local function writer(capacity: number)
	local data, offset = buffer.create(capacity), 0
	local function put(kind: string, value: number)
		(writes :: { [string]: (buffer, number, number) -> () })[kind](data, offset, value)
		offset += (widths :: { [string]: number })[kind]
	end
	return put,
		function(): buffer
			local result = buffer.create(offset)
			buffer.copy(result, 0, data, 0, offset)
			return result
		end
end

local function reader(data: buffer)
	local offset, size = 0, buffer.len(data)
	return function(kind: string): number
		local width = (widths :: { [string]: number })[kind]
		check(offset + width <= size)
		local value = (reads :: { [string]: (buffer, number) -> number })[kind](data, offset)
		offset += width
		return value
	end, function()
		check(offset == size)
	end
end

type Put = (string, number) -> ()
type Get = (string) -> number

local function putPoint(put: Put, point: any)
	put("i8", point.x)
	put("u8", point.y)
	put("u8", point.dRel)
end

local function getPoint(get: Get): any
	local point = { x = get("i8"), y = get("u8"), dRel = get("u8") }
	check(
		math.abs(point.x) <= (mine.maxWidth - 1) // 2
			and point.y < mine.maxHeight
			and point.dRel < mine.window
	)
	return point
end

local function putDamage(put: Put, damage: { any })
	put("u16", #damage)
	for _, cell in damage do
		putPoint(put, cell)
		put("u8", cell.amount)
	end
end

local function getDamage(get: Get): { any }
	local count = get("u16")
	check(count <= mine.maxWidth * mine.maxHeight * mine.nearWindow)
	local damage = table.create(count)
	for i = 1, count do
		local point = getPoint(get)
		point.amount = get("u8")
		check(point.amount > 0 and point.amount < 255 and point.dRel < mine.nearWindow)
		damage[i] = point
	end
	return damage
end

local function putLayers(put: Put, width: number, height: number, layers: { { number } })
	put("u8", width)
	put("u8", height)
	put("u8", #layers)
	local lanes = width * height
	for _, layer in layers do
		for base = 1, lanes, 8 do
			local mask = 0
			for i = base, math.min(base + 7, lanes) do
				if layer[i] ~= 0 then
					mask += 2 ^ (i - base)
				end
			end
			put("u8", mask)
		end
		for _, ore in layer do
			if ore ~= 0 then
				put("u8", ore)
			end
		end
	end
end

local function getLayers(get: Get): (number, number, { { number } })
	local width, height, count = get("u8"), get("u8"), get("u8")
	check(
		width > 0
			and width <= mine.maxWidth
			and width % 2 == 1
			and height > 0
			and height <= mine.maxHeight
	)
	check(count > 0 and count <= mine.window)
	local lanes = width * height
	local layers = table.create(count)
	for z = 1, count do
		local layer = table.create(lanes, 0)
		for base = 1, lanes, 8 do
			local mask = get("u8")
			check(mask < 2 ^ math.min(8, lanes - base + 1))
			for i = base, math.min(base + 7, lanes) do
				if bit32.btest(mask, bit32.lshift(1, i - base)) then
					layer[i] = -1
				end
			end
		end
		for i = 1, lanes do
			if layer[i] == -1 then
				local ore = get("u8")
				check(ore > 0 and ore <= Wire.PLATE)
				layer[i] = ore
			end
		end
		layers[z] = layer
	end
	return width, height, layers
end

local function decode(data: any, read: (Get) -> any): any?
	if typeof(data) ~= "buffer" or buffer.len(data) > 24000 then
		return nil
	end
	local get, done = reader(data)
	local ok, result = pcall(function()
		local value = read(get)
		done()
		return value
	end)
	return if ok then result else nil
end

function Wire.encodeWindow(win: any): buffer
	local put, finish = writer(4096)
	put("u8", win.plot)
	put("u32", win.front)
	put("u8", win.charge)
	put("f64", win.plateDamage)
	putLayers(put, win.width, win.height, win.layers)
	putDamage(put, win.damage)
	return finish()
end

function Wire.decodeWindow(data: any): any?
	if typeof(data) ~= "buffer" or buffer.len(data) > 4096 then
		return nil
	end
	return decode(data, function(get)
		local win = {
			plot = get("u8"),
			front = get("u32"),
			charge = get("u8"),
			plateDamage = get("f64"),
		} :: any
		win.width, win.height, win.layers = getLayers(get)
		check(#win.layers == mine.nearWindow)
		win.damage = getDamage(get)
		return win
	end)
end

function Wire.encodeLayers(part: any): buffer
	local put, finish = writer(2048)
	put("u8", part.plot)
	put("u32", part.front)
	put("u8", part.offset)
	putLayers(put, part.width, part.height, part.layers)
	return finish()
end

function Wire.decodeLayers(data: any): any?
	return decode(data, function(get)
		local part = { plot = get("u8"), front = get("u32"), offset = get("u8") } :: any
		part.width, part.height, part.layers = getLayers(get)
		check(
			part.offset >= mine.nearWindow
				and #part.layers <= mine.layerBatch
				and part.offset + #part.layers <= mine.window
		)
		return part
	end)
end

function Wire.encodeResult(res: any): buffer
	local put, finish = writer(if res.accepted then 16000 else 8)
	put("u16", res.seq)
	local flags = (if res.accepted then 1 else 0)
		+ (if res.delta and res.delta > 0 then 2 else 0)
		+ (if res.ability then 4 else 0)
		+ (if res.heavy then 8 else 0)
		+ (if res.crit then 16 else 0)
		+ (if res.mega then 32 else 0)
		+ (if res.rain then 64 else 0)
	put("u8", flags)
	put("u32", res.front)
	put("u8", res.plot)
	if not res.accepted then
		return finish()
	end
	put("u16", #res.cells)
	for _, cell in res.cells do
		putPoint(put, cell)
		put("u8", cell.gen)
	end
	put("u8", #res.runs)
	for _, run in res.runs do
		put("i8", run.x)
		put("u8", run.y)
		put("u32", run.a)
		put("u32", run.b - run.a)
	end
	put("u8", #res.events)
	for _, event in res.events do
		put("u8", event.kind)
		put("u8", event.gen)
		put("u16", event.delayMs)
		put("u8", #event.points)
		for _, point in event.points do
			putPoint(put, point)
		end
	end
	put("f64", res.coins)
	put("f64", res.blocks)
	put("u8", #res.finds)
	for _, find in res.finds do
		put("u8", find.kind)
		put("u16", find.id)
	end
	if bit32.btest(flags, 2) then
		put("u32", res.delta)
		putLayers(put, res.width, res.height, res.layers)
	end
	put("u8", res.charge)
	put("f64", res.plateDamage)
	putDamage(put, res.damage)
	return finish()
end

function Wire.decodeResult(data: any): any?
	return decode(data, function(get)
		local seq, flags, front, plot = get("u16"), get("u8"), get("u32"), get("u8")
		check(flags <= 127)
		local res =
			{ seq = seq, accepted = bit32.btest(flags, 1), front = front, plot = plot } :: any
		if not res.accepted then
			check(flags == 0)
			return res
		end
		res.ability, res.delta = bit32.btest(flags, 4), 0
		res.heavy, res.crit = bit32.btest(flags, 8), bit32.btest(flags, 16)
		res.mega, res.rain = bit32.btest(flags, 32), bit32.btest(flags, 64)
		local cells = get("u16")
		check(cells <= cascade.maxCells)
		res.cells = table.create(cells)
		for i = 1, cells do
			local point = getPoint(get)
			point.gen = get("u8")
			check(point.gen <= cascade.maxGen)
			res.cells[i] = point
		end
		local runs = get("u8")
		check(runs <= cascade.maxRuns)
		res.runs = table.create(runs)
		for i = 1, runs do
			local x, y, a, length = get("i8"), get("u8"), get("u32"), get("u32")
			check(length > 0 and a + length <= mine.maxDepth + 1)
			res.runs[i] = { x = x, y = y, a = a, b = a + length }
		end
		local events = get("u8")
		check(events <= 25)
		res.events = table.create(events)
		for i = 1, events do
			local event = { kind = get("u8"), gen = get("u8"), delayMs = get("u16"), points = {} }
			local count = get("u8")
			check(count <= 6 and event.gen <= cascade.maxGen)
			for j = 1, count do
				event.points[j] = getPoint(get)
			end
			res.events[i] = event
		end
		res.coins, res.blocks = get("f64"), get("f64")
		local finds = get("u8")
		res.finds = table.create(finds)
		for i = 1, finds do
			res.finds[i] = { kind = get("u8"), id = get("u16") }
		end
		if bit32.btest(flags, 2) then
			res.delta = get("u32")
			res.width, res.height, res.layers = getLayers(get)
			check(res.delta > 0 and res.delta <= front and #res.layers == mine.nearWindow)
		end
		res.charge, res.plateDamage, res.damage = get("u8"), get("f64"), getDamage(get)
		return res
	end)
end

return Wire
