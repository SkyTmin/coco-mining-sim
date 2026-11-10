--!strict

local Config = require(script.Parent.Parent.Config)
local Bytes = require(script.Parent.Bytes)
local MineState = require(script.Parent.MineState)
type State = MineState.MineState

export type SavedMine = {
	v: number,
	seed: number,
	w: number,
	h: number,
	front: number,
	plateDamage: number,
	top: string,
	holes: string,
}

local mine = Config.mine
local MineCodec = {}

function MineCodec.encode(st: State): SavedMine
	local ok, problem = MineState.check(st)
	assert(ok, problem)
	local lanes = st.width * st.height
	local tops = buffer.create(lanes * 5)
	local intervals = buffer.create((lanes + st.holeCount * 2) * 5)
	local topOffset, holeOffset = 0, 0
	local radius = (st.width - 1) // 2
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			local lane = MineState.laneKey(x, y)
			local top, holes = st.top[lane], st.holes[lane]
			topOffset = Bytes.writeVarint(tops, topOffset, top - st.front)
			holeOffset = Bytes.writeVarint(intervals, holeOffset, if holes then #holes // 2 else 0)
			if holes then
				local previous = top
				for i = 1, #holes, 2 do
					local a, b = holes[i], holes[i + 1]
					holeOffset = Bytes.writeVarint(intervals, holeOffset, a - previous)
					holeOffset = Bytes.writeVarint(intervals, holeOffset, b - a)
					previous = b
				end
			end
		end
	end
	return {
		v = MineState.version,
		seed = st.seed,
		w = st.width,
		h = st.height,
		front = st.front,
		plateDamage = st.plateDamage,
		top = Bytes.base64Encode(tops, topOffset),
		holes = Bytes.base64Encode(intervals, holeOffset),
	}
end

local function integer(value: any, min: number, max: number): boolean
	return type(value) == "number" and value >= min and value <= max and value % 1 == 0
end

function MineCodec.decode(data: any): (State?, string?)
	if type(data) ~= "table" or data.v ~= MineState.version then
		return nil, "Invalid mine version"
	end
	if not integer(data.seed, 0, 0xffffffff) then
		return nil, "Invalid seed"
	end
	if
		not integer(data.w, 1, mine.maxWidth)
		or data.w % 2 ~= 1
		or not integer(data.h, 1, mine.maxHeight)
	then
		return nil, "Invalid wall dimensions"
	end
	if not integer(data.front, 0, mine.maxDepth + 1) then
		return nil, "Invalid front depth"
	end
	if type(data.top) ~= "string" or type(data.holes) ~= "string" then
		return nil, "Missing mine byte strings"
	end
	local lanes = data.w * data.h
	local tops, topError = Bytes.base64Decode(data.top, lanes * 5)
	if not tops then
		return nil, "Top: " .. (topError or "Invalid base64")
	end
	local intervals, intervalError = Bytes.base64Decode(data.holes, (lanes + mine.maxHoles * 2) * 5)
	if not intervals then
		return nil, "Holes: " .. (intervalError or "Invalid base64")
	end

	local st = MineState.new(data.seed, data.w, data.h)
	st.front, st.plateDamage = data.front, data.plateDamage
	local topOffset, holeOffset = 0, 0
	local barrier = MineState.barrier(st)
	local radius = (st.width - 1) // 2
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			local lane = MineState.laneKey(x, y)
			local delta, nextTop = Bytes.readVarint(tops, topOffset)
			if delta == nil or st.front + delta > barrier then
				return nil, "Invalid top delta"
			end
			topOffset = nextTop
			local top = st.front + delta
			st.top[lane] = top
			local count, nextHole = Bytes.readVarint(intervals, holeOffset)
			if count == nil or count + st.holeCount > mine.maxHoles then
				return nil, "Invalid interval count"
			end
			holeOffset = nextHole
			if count > 0 then
				local holes = table.create(count * 2) :: { number }
				local previous = top
				for i = 1, count do
					local gap, afterGap = Bytes.readVarint(intervals, holeOffset)
					local length, afterLength = Bytes.readVarint(intervals, afterGap)
					if gap == nil or gap == 0 or length == nil or length == 0 then
						return nil, "Invalid interval gap or length"
					end
					local a = previous + gap
					local b = a + length
					if b > barrier then
						return nil, "Interval exceeds its world barrier"
					end
					holes[i * 2 - 1], holes[i * 2] = a, b
					previous, holeOffset = b, afterLength
				end
				st.holes[lane] = holes
				st.holeCount += count
			end
		end
	end
	if topOffset ~= buffer.len(tops) or holeOffset ~= buffer.len(intervals) then
		return nil, "Trailing mine bytes"
	end
	local ok, problem = MineState.check(st)
	if not ok then
		return nil, problem
	end
	return st
end

return MineCodec
