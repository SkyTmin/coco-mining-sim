--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local State = require(Shared.Mine.MineState)
local Gen = require(Shared.Mine.MineGen)
local Codec = require(Shared.Mine.MineCodec)
local Wire = require(Shared.Mine.MineWire)
local Worlds = require(Shared.Mine.Worlds)
local Validate = require(Shared.Mine.Validate)
local Power = require(Shared.Play.Power)
local Family = require(Shared.Play.Family)
local Perks = require(Shared.Play.Perks)
local WallChests = require(Shared.Play.WallChests)
local ProfileService = require(script.Parent.ProfileService)
local PlotService = require(script.Parent.PlotService)

export type Timing = { count: number, total: number, max: number }
export type Session = {
	state: State.MineState,
	plot: number,
	rng: Random,
	bucket: Validate.Bucket,
	charge: number,
	resyncAt: number,
	hit: Timing,
	ult: Timing,
	perks: Perks.Runtime,
	perkFamily: string?,
}

local mine = Config.mine
local MineService = {}
local sessions: { [Player]: Session } = {}
local subscribers: { [number]: { [Player]: boolean } } = {}
local windowRemote = Remotes.event("MineWindow")

function MineService.get(player: Player): Session?
	return sessions[player]
end

local function fresh(rng: Random, width: number): State.MineState
	return State.new(rng:NextInteger(1, 2147483647), width, mine.height)
end

local function layers(st: State.MineState, offset: number, limit: number): { { number } }
	local layers = {}
	local radius = (st.width - 1) // 2
	for relative = offset, limit - 1 do
		local d = st.front + relative
		local world = Worlds.of(d)
		local layer = {}
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				local ore = 0
				if State.isSolid(st, x, y, d) then
					if d == world.plateDepth then
						ore = Wire.PLATE
					else
						local index, kind = Gen.cellAt(st.seed, x, y, d)
						local chest = WallChests.at(st, x, y, d)
						ore = if chest
							then Wire.chest(chest.tier)
							elseif kind then Wire.CHEST
							else index
					end
				end
				table.insert(layer, ore)
			end
		end
		table.insert(layers, layer)
	end
	return layers
end

function MineService.damage(st: State.MineState): { any }
	local out = {}
	local radius = (st.width - 1) // 2
	if next(st.damage) == nil then
		return out
	end
	for dRel = 0, mine.nearWindow - 1 do
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				local amount = st.damage[State.cellKey(x, y, st.front + dRel)]
				if amount then
					table.insert(
						out,
						{ x = x, y = y, dRel = dRel, amount = Power.packDamage(amount) }
					)
				end
			end
		end
	end
	return out
end

local function send(kind: string, plot: number, packet: buffer, visual: any?)
	for player in subscribers[plot] or {} do
		if player.Parent == Players then
			windowRemote:FireClient(player, kind, packet, visual)
		end
	end
end

local function sendTail(s: Session)
	local st = s.state
	for offset = mine.nearWindow, mine.window - 1, mine.layerBatch do
		send(
			"layers",
			s.plot,
			Wire.encodeLayers({
				plot = s.plot,
				front = st.front,
				width = st.width,
				height = st.height,
				offset = offset,
				layers = layers(st, offset, math.min(offset + mine.layerBatch, mine.window)),
			})
		)
	end
end

function MineService.window(s: Session)
	local st = s.state
	PlotService.depth(s.plot, st.front)
	local frozen = {}
	for _, cell in Perks.frozen(s.perks, st) do
		if #frozen < 200 then
			table.insert(frozen, { x = cell.x, y = cell.y, dRel = cell.d - st.front })
		end
	end
	send(
		"window",
		s.plot,
		Wire.encodeWindow({
			plot = s.plot,
			front = st.front,
			width = st.width,
			height = st.height,
			charge = s.charge,
			plateDamage = st.plateDamage,
			damage = MineService.damage(st),
			frozen = frozen,
			layers = layers(st, 0, mine.nearWindow),
		})
	)
	sendTail(s)
end

function MineService.result(s: Session, res: any)
	PlotService.depth(s.plot, s.state.front)
	if res.delta > 0 then
		res.layers = layers(s.state, 0, mine.nearWindow)
	end
	send("result", s.plot, Wire.encodeResult(res), res.visual)
	if res.delta > 0 then
		sendTail(s)
	end
end

function MineService.reject(player: Player, s: Session, seq: number)
	windowRemote:FireClient(
		player,
		"result",
		Wire.encodeResult({ seq = seq, accepted = false, front = s.state.front, plot = s.plot })
	)
end

function MineService.reset(s: Session, depth: number, width: number)
	s.state = State.new(s.state.seed, width, mine.height, depth)
	s.charge = 0
	s.perks = Perks.new()
	MineService.window(s)
end

function MineService.Start()
	ProfileService.OnLoaded(function(player)
		if player.Parent ~= Players then
			return
		end
		-- The profile can be ready before the plot's PlayerAdded handler runs.
		local plot = PlotService.get(player) or PlotService.assign(player)
		if not plot then
			return
		end
		local profile = ProfileService.Get(player)
		if not profile then
			return
		end
		local encoded = profile.mine
		local state = nil
		if encoded ~= nil then
			local problem
			state, problem = Codec.decode(encoded)
			if not state or state.width ~= profile.width or state.height ~= mine.height then
				state = nil
				warn("[Mine] Invalid saved mine: " .. tostring(problem))
				ProfileService.FailLoad(player)
			end
		end
		local rng = Random.new()
		local s: Session = {
			state = state or fresh(rng, profile.width),
			plot = plot,
			rng = rng,
			bucket = Validate.bucket(os.clock()),
			charge = 0,
			resyncAt = -math.huge,
			hit = { count = 0, total = 0, max = 0 },
			ult = { count = 0, total = 0, max = 0 },
			perks = Perks.new(),
			perkFamily = profile.family,
		}
		s.state.chestFrequency = Family.effects(profile).chestFrequency
		sessions[player], subscribers[plot] = s, { [player] = true }
		MineService.window(s)
	end)
	task.spawn(function()
		while true do
			task.wait(1)
			for player, session in sessions do
				if workspace:GetServerTimeNow() < (player:GetAttribute("MineReturnAfter") or 0) then
					continue
				end
				local changed = ProfileService.Read(player, function(profile)
					local frequency = Family.effects(profile).chestFrequency
					local changed = session.state.chestFrequency ~= frequency
					session.state.chestFrequency = frequency
					return WallChests.stage(
						session.state,
						profile,
						ProfileService.PlaySeconds(player)
					) or changed
				end)
				if changed then
					MineService.window(session)
				end
			end
		end
	end)
	ProfileService.BeforeSave(function(player)
		local s = sessions[player]
		if s then
			local encoded = Codec.encode(s.state)
			ProfileService.Mutate(player, function(profile)
				profile.mine = encoded
			end)
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		local s = sessions[player]
		if not s then
			return
		end
		if subscribers[s.plot] then
			subscribers[s.plot][player] = nil
		end
		-- The profile prepares its final snapshot in the same PlayerRemoving dispatch.
		task.defer(function()
			sessions[player] = nil
		end)
	end)
end

return MineService
