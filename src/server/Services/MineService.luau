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
}

local mine = Config.mine
local MineService = {}
local sessions: { [Player]: Session } = {}
local subscribers: { [number]: { [Player]: boolean } } = {}
local windowRemote = Remotes.event("MineWindow")
local resultRemote = Remotes.event("MineResult")

function MineService.get(player: Player): Session?
	return sessions[player]
end

local function fresh(rng: Random): State.MineState
	return State.new(rng:NextInteger(1, 2147483647), mine.startWidth, mine.height)
end

function MineService.layers(st: State.MineState, offset: number): { { number } }
	local layers = {}
	local radius = (st.width - 1) // 2
	for relative = offset, mine.window - 1 do
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
						ore = if kind then Wire.CHEST else index
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
	for dRel = 0, mine.window - 1 do
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				local amount = st.damage[State.cellKey(x, y, st.front + dRel)]
				if amount then
					table.insert(out, { x = x, y = y, dRel = dRel, amount = amount })
				end
			end
		end
	end
	return out
end

local function send(remote: RemoteEvent, plot: number, packet: buffer)
	for player in subscribers[plot] or {} do
		if player.Parent == Players then
			remote:FireClient(player, packet)
		end
	end
end

function MineService.window(s: Session)
	local st = s.state
	send(
		windowRemote,
		s.plot,
		Wire.encodeWindow({
			plot = s.plot,
			front = st.front,
			width = st.width,
			height = st.height,
			charge = s.charge,
			plateDamage = st.plateDamage,
			damage = MineService.damage(st),
			layers = MineService.layers(st, 0),
		})
	)
end

function MineService.result(s: Session, res: any)
	send(resultRemote, s.plot, Wire.encodeResult(res))
end

function MineService.reject(player: Player, s: Session, seq: number)
	resultRemote:FireClient(
		player,
		Wire.encodeResult({ seq = seq, accepted = false, front = s.state.front, plot = s.plot })
	)
end

function MineService.reset(s: Session)
	s.state = fresh(s.rng)
	s.charge = 0
	MineService.window(s)
end

function MineService.Start()
	ProfileService.OnLoaded(function(player)
		local plot = PlotService.get(player)
		if not plot or player.Parent ~= Players then
			return
		end
		local encoded = ProfileService.Read(player, function(profile)
			return profile.mine
		end)
		local state = nil
		if encoded ~= nil then
			local problem
			state, problem = Codec.decode(encoded)
			if not state then
				warn("[Mine] Invalid saved mine: " .. tostring(problem))
				ProfileService.FailLoad(player)
			end
		end
		local rng = Random.new()
		local s: Session = {
			state = state or fresh(rng),
			plot = plot,
			rng = rng,
			bucket = Validate.bucket(os.clock()),
			charge = 0,
			resyncAt = -math.huge,
			hit = { count = 0, total = 0, max = 0 },
			ult = { count = 0, total = 0, max = 0 },
		}
		sessions[player], subscribers[plot] = s, { [player] = true }
		MineService.window(s)
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
