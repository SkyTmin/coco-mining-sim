--!strict
local Config = require(script.Parent.Parent.Config)
local State = require(script.Parent.Parent.Mine.MineState)
local Worlds = require(script.Parent.Parent.Mine.Worlds)
local Chests = require(script.Parent.WallChests)
local cfg = Config.events
local Events = {}
function Events.key(cell: any): number
	return State.cellKey(cell.x, cell.y, cell.d)
end
function Events.new(now: number, random: () -> number): any
	return {
		veinAt = now + cfg.vein.minSeconds + random() * (cfg.vein.maxSeconds - cfg.vein.minSeconds),
		bombAt = now + cfg.bomb.minSeconds + random() * (cfg.bomb.maxSeconds - cfg.bomb.minSeconds),
		freeAt = now,
		lastHand = -math.huge,
		feverUntil = 0,
		feverTotal = 0,
		rubble = {},
	}
end
function Events.free(e: any, now: number): boolean
	return not e.vein and not e.bomb and e.feverUntil <= now and not e.giftAt and now >= e.freeAt
end
local function eligible(st: any, e: any, x: number, y: number, d: number): boolean
	return d < State.barrier(st)
		and State.isExposed(st, x, y, d)
		and not Chests.at(st, x, y, d)
		and not e.rubble[State.cellKey(x, y, d)]
end
local function candidates(st: any, e: any, maxDepth: number): { any }
	local out = {}
	local radius = (st.width - 1) // 2
	for d = st.front, st.front + maxDepth do
		for y = 0, st.height - 1 do
			for x = -radius, radius do
				if eligible(st, e, x, y, d) then
					table.insert(out, { x = x, y = y, d = d })
				end
			end
		end
	end
	return out
end
local function shuffle(values: { any }, random: () -> number)
	for i = #values, 2, -1 do
		local j = math.min(i, math.floor(random() * i) + 1)
		values[i], values[j] = values[j], values[i]
	end
end
function Events.veinCells(st: any, e: any, random: () -> number): { any }
	local all = candidates(st, e, cfg.veinDepth)
	shuffle(all, random)
	local target = cfg.vein.cells[1]
		+ math.floor(random() * (cfg.vein.cells[2] - cfg.vein.cells[1] + 1))
	local best = {}
	local function walk(path: { any }, used: { [number]: boolean }): boolean
		if #path > #best then
			best = table.clone(path)
		end
		if #path == target then
			return true
		end
		local last = path[#path]
		for _, cell in all do
			local key = Events.key(cell)
			if
				not used[key]
				and cell.d == last.d
				and math.abs(cell.x - last.x) + math.abs(cell.y - last.y) == 1
			then
				used[key] = true
				table.insert(path, cell)
				if walk(path, used) then
					return true
				end
				table.remove(path)
				used[key] = nil
			end
		end
		return false
	end
	for _, cell in all do
		if cell.d == st.front and walk({ cell }, { [Events.key(cell)] = true }) then
			break
		end
	end
	return if #best >= cfg.vein.cells[1] then best else {}
end
function Events.bombCell(st: any, e: any, random: () -> number): any?
	local all = candidates(st, e, cfg.bombDepth)
	local front = {}
	for _, cell in all do
		if cell.d == st.front then
			table.insert(front, cell)
		end
	end
	local options = if #front > 0 then front else all
	return options[math.floor(random() * #options) + 1]
end
function Events.blastCells(st: any, cell: any): { any }
	local out = {}
	local box = cfg.bomb.box
	local rx, ry = (box[1] - 1) // 2, (box[2] - 1) // 2
	local barrier = Worlds.of(cell.d).plateDepth
	for d = cell.d, math.min(cell.d + box[3], barrier) - 1 do
		for y = cell.y - ry, cell.y + ry do
			for x = cell.x - rx, cell.x + rx do
				if State.isSolid(st, x, y, d) then
					table.insert(out, { x = x, y = y, d = d })
				end
			end
		end
	end
	return out
end
function Events.rubbleCells(st: any): { any }
	local out = {}
	local radius = (st.width - 1) // 2
	for d = st.front, math.min(st.front + cfg.bomb.rubbleLayers, State.barrier(st)) - 1 do
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				if State.isSolid(st, x, y, d) and not Chests.at(st, x, y, d) then
					table.insert(out, { x = x, y = y, d = d })
				end
			end
		end
	end
	return out
end
function Events.inTime(event: any, now: number): boolean
	return now <= event.deadline + cfg.latencyGrace
end
function Events.hitVein(e: any, st: any, request: any): boolean
	if not e.vein or not Events.inTime(e.vein, request.now) then
		return false
	end
	for _, cell in e.vein.cells do
		if
			(
				not request.ability
				and request.x == cell.x
				and request.y == cell.y
				and request.d == cell.d
			) or not State.isSolid(st, cell.x, cell.y, cell.d)
		then
			return true
		end
	end
	return false
end
function Events.hitBomb(e: any, st: any, now: number): boolean
	return e.bomb ~= nil
		and Events.inTime(e.bomb, now)
		and not State.isSolid(st, e.bomb.cell.x, e.bomb.cell.y, e.bomb.cell.d)
end
-- Scheduling is pure too: tests use the same clock and slot transitions as the server.
local function emit(
	out: { any },
	kind: number,
	deadline: number?,
	points: { any }?,
	reason: number?,
	total: number?
)
	table.insert(out, {
		type = kind,
		deadline = deadline or 0,
		points = points or {},
		reason = reason or 0,
		total = total or 0,
	})
end
function Events.fever(e: any, now: number, source: string): { any }
	local out = {}
	e.vein, e.bomb, e.giftAt = nil, nil, nil
	e.feverSource = source
	e.feverUntil = now + (if source == "gift" then cfg.fever.giftSeconds else cfg.fever.seconds)
	e.feverTotal = 0
	emit(out, 3, e.feverUntil, {}, if source == "gift" then 1 else 0)
	return out
end
function Events.start(e: any, st: any, kind: string, now: number, random: () -> number): { any }?
	if not Events.free(e, now) then
		return nil
	end
	local out = {}
	if kind == "vein" then
		local cells = Events.veinCells(st, e, random)
		if #cells == 0 then
			e.veinAt = now + cfg.retrySeconds
			e.retryAt = e.veinAt
			return nil
		end
		e.vein = { cells = cells, deadline = now + cfg.vein.windowSeconds }
		emit(out, 1, e.vein.deadline, cells)
	elseif kind == "bomb" then
		if Worlds.of(st.front).index < cfg.bomb.fromWorld then
			return nil
		end
		local cell = Events.bombCell(st, e, random)
		if not cell then
			e.bombAt = now + cfg.retrySeconds
			return nil
		end
		e.bomb = { cell = cell, deadline = now + cfg.bomb.fuseSeconds }
		emit(out, 5, e.bomb.deadline, { cell })
	elseif kind == "fever" then
		return Events.fever(e, now, "vein")
	else
		return nil
	end
	return out
end
function Events.after(e: any, st: any, request: any, coins: number): { any }
	local out = {}
	if not request.ability then
		e.lastHand = request.now
	end
	if request.now < e.feverUntil then
		e.feverTotal += coins
	end
	if e.giftAt and not request.ability then
		out = Events.fever(e, request.now, "gift")
		e.feverTotal = coins
	elseif Events.hitVein(e, st, request) then
		emit(out, 2, 0, e.vein.cells, 1)
		out[#out].source = if request.ability
			then "ult"
			elseif request.source then request.source
			else "hand"
		for _, event in Events.fever(e, request.now, "vein") do
			table.insert(out, event)
		end
	end
	return out
end
function Events.tick(
	e: any,
	st: any,
	now: number,
	playSeconds: number,
	seen: boolean,
	blocked: boolean,
	random: () -> number
): { any }
	local out = {}
	if e.bomb and not Events.inTime(e.bomb, now) then
		local cells = Events.rubbleCells(st)
		for _, cell in cells do
			e.rubble[Events.key(cell)] = true
			st.damage[Events.key(cell)] = nil
		end
		emit(out, 6, 0, cells)
		emit(out, 7, 0, cells)
		e.bomb = nil
		e.freeAt = now + cfg.slotGapSeconds
		e.bombAt = now
			+ cfg.bomb.minSeconds
			+ random() * (cfg.bomb.maxSeconds - cfg.bomb.minSeconds)
	end
	if e.vein and not Events.inTime(e.vein, now) then
		emit(out, 2, 0, e.vein.cells, 0)
		e.vein = nil
		e.freeAt = now + cfg.slotGapSeconds
		e.veinAt = now
			+ cfg.vein.minSeconds
			+ random() * (cfg.vein.maxSeconds - cfg.vein.minSeconds)
	end
	if e.feverUntil > 0 and now >= e.feverUntil then
		emit(out, 4, 0, {}, 0, e.feverTotal)
		e.feverUntil = 0
		e.freeAt = now + cfg.slotGapSeconds
		e.veinAt = now
			+ cfg.vein.minSeconds
			+ random() * (cfg.vein.maxSeconds - cfg.vein.minSeconds)
	end
	if e.giftAt and now >= e.giftAt then
		for _, event in Events.fever(e, now, "gift") do
			table.insert(out, event)
		end
	end
	if now < (e.pollAt or 0) then
		return out
	end
	e.pollAt = now + cfg.tickSeconds
	if blocked or now - e.lastHand > cfg.activeWithinSeconds or not Events.free(e, now) then
		return out
	end
	local due = if seen then now >= e.veinAt else playSeconds >= cfg.vein.firstPlaySeconds
	if due and now >= (e.retryAt or 0) then
		local spawned = Events.start(e, st, "vein", now, random)
		for _, event in spawned or {} do
			table.insert(out, event)
		end
	end
	if now >= e.bombAt and Events.free(e, now) then
		for _, event in Events.start(e, st, "bomb", now, random) or {} do
			table.insert(out, event)
		end
	end
	return out
end

return Events
