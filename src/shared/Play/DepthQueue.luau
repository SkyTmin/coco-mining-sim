--!strict

export type Column = { before: string, after: string, changes: boolean }
export type Counter = {
	text: string,
	shown: number,
	at: number,
	spinningAt: number?,
	reduced: boolean,
	columns: { Column },
}

local DepthQueue = {}
local SLIDE, TOTAL, STEP = 0.09, 0.15, 0.04

local function characters(text: string): { string }
	local result = {}
	for _, code in utf8.codes(text) do
		table.insert(result, utf8.char(code))
	end
	return result
end

local function columns(before: string, after: string, allDigits: boolean): { Column }
	local old, new = characters(before), characters(after)
	local result = {}
	for i, value in new do
		local previous = old[i + #old - #new] or ""
		local changes = tonumber(value) ~= nil and (allDigits or previous ~= value)
		result[i] = {
			before = if tonumber(previous) ~= nil then previous else "",
			after = value,
			changes = changes,
		}
	end
	return result
end

function DepthQueue.new(depth: number, text: string): Counter
	return {
		text = text,
		shown = depth,
		at = -math.huge,
		spinningAt = nil,
		reduced = false,
		columns = columns(text, text, false),
	}
end

local function spin(q: Counter, now: number, index: number): (string, string, number)
	local rate = 1 / (1 + (#q.columns - index) * 0.32)
	local steps = math.max(0, now - (q.spinningAt or now)) * rate / STEP
	local digit = (math.floor(steps) + index) % 10
	return tostring(digit), tostring((digit + 1) % 10), steps % 1
end

function DepthQueue.step(
	q: Counter,
	now: number,
	depth: number,
	text: string,
	rolling: boolean,
	reduced: boolean
): boolean
	q.reduced = reduced
	if rolling and not reduced then
		q.spinningAt = q.spinningAt or now
		if q.text ~= text then
			q.text, q.columns = text, columns(text, text, false)
		end
		return false
	end

	local wasSpinning = q.spinningAt ~= nil
	if q.text ~= text or wasSpinning then
		local before = q.text
		if wasSpinning then
			local spun = {}
			for i, column in q.columns do
				spun[i] = if tonumber(column.after)
					then select(1, spin(q, now, i))
					else column.after
			end
			before = table.concat(spun)
		end
		q.text, q.columns = text, columns(before, text, wasSpinning)
		q.at = now
		q.shown, q.spinningAt = depth, nil
		return true
	end
	q.shown = depth
	return false
end

function DepthQueue.pose(
	q: Counter,
	now: number,
	index: number
): (string, string, number, number, number)
	local column = q.columns[index]
	if q.spinningAt and tonumber(column.after) then
		local a, b, p = spin(q, now, index)
		return a, b, p, p - 1, 0.25
	end
	local elapsed = math.max(0, now - q.at)
	if q.reduced or not column.changes or elapsed >= TOTAL then
		return "", column.after, 1, 0, 0
	elseif elapsed < SLIDE then
		local p = 1 - (1 - elapsed / SLIDE) ^ 2
		return column.before, column.after, p, p - 1, 0.25
	end
	local p = (elapsed - SLIDE) / (TOTAL - SLIDE) - 1
	local back = 1 + 2.70158 * p ^ 3 + 1.70158 * p ^ 2
	return "", column.after, 1, math.max(0, (back - 1) * 0.8), 0.25
end

return DepthQueue
