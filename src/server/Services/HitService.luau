--!strict

local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local State = require(Shared.Mine.MineState)
local Resolve = require(Shared.Mine.Resolve)
local Codec = require(Shared.Mine.MineCodec)
local Validate = require(Shared.Mine.Validate)
local Worlds = require(Shared.Mine.Worlds)
local Wire = require(Shared.Mine.MineWire)
local Ride = require(Shared.Mine.Ride)
local Perks = require(Shared.Play.Perks)
local MiningAction = require(Shared.Play.MiningAction)
local Circle = require(Shared.Play.Circle)
local Family = require(Shared.Play.Family)
local Income = require(Shared.Play.Income)
local Streak = require(Shared.Play.Streak)
local Pace = require(Shared.Play.Pace)
local Power = require(Shared.Play.Power)
local MineService = require(script.Parent.MineService)
local ProfileService = require(script.Parent.ProfileService)
local PlotService = require(script.Parent.PlotService)
local Pickaxe = require(script.Parent.PickaxeService)
local Analytics = require(script.Parent.Analytics)

type Session = MineService.Session
type HitResult = Resolve.HitResult
local mine, budget = Config.mine, Config.cascade
local RESET_ON_RETARGET = false
local HitService = {}

local function point(x: number, y: number, d: number, front: number): any
	return { x = x, y = y, dRel = d - front }
end

local function publish(
	s: Session,
	seq: number,
	oldFront: number,
	res: HitResult,
	events: { any },
	coins: number,
	ability: boolean,
	strike: Power.Strike?,
	visual: Codec.SavedMine?
)
	local st = s.state
	local delta = st.front - oldFront
	local cells, runs, finds = {}, {}, {}
	for _, cell in res.cells do
		if #cells >= budget.maxCells then
			break
		end
		local encoded = point(cell.x, cell.y, cell.d, oldFront)
		encoded.gen = cell.gen
		table.insert(cells, encoded)
	end
	for i = 1, math.min(#res.runs, budget.maxRuns) do
		runs[i] = res.runs[i]
	end
	for i = 1, math.min(#res.finds, 255) do
		local find = res.finds[i]
		-- kind 2 = a wall chest (the client marks «Кладоискатель» on it), 1 = anything else
		finds[i] = {
			kind = if find.kind == "chest" then 2 else 1,
			id = State.cellKey(find.x, find.y, find.d) % 65536,
		}
	end
	MineService.result(s, {
		seq = seq,
		accepted = true,
		front = st.front,
		plot = s.plot,
		delta = delta,
		ability = ability,
		visual = visual,
		heavy = strike and strike.heavy,
		crit = strike and strike.crit,
		mega = strike and strike.mega,
		rain = strike and strike.rain,
		charge = s.charge,
		streak = math.floor(s.streak.gauge * Config.events.streakWireScale),
		streakTier = Streak.tier(s.streak),
		plateDamage = st.plateDamage,
		damage = MineService.damage(st),
		blocks = res.blocks,
		coins = coins,
		cells = cells,
		runs = runs,
		finds = finds,
		events = events,
		width = st.width,
		height = st.height,
	})
end

-- 0 = the pickaxe's own ult depth
local CREATIVE_ULT_LAYERS = { 0, 40, 150, 500, 1500, 5000 }

local function record(timing: MineService.Timing, elapsed: number)
	timing.count += 1
	timing.total += elapsed
	timing.max = math.max(timing.max, elapsed)
end

local function onIntent(player: Player, packet: any)
	local intent = Wire.decodeIntent(packet)
	local s = MineService.get(player)
	if not intent or not s then
		return
	end
	local started = os.clock()
	if intent.op == "Resync" then
		if started - s.resyncAt >= 0.5 then
			s.resyncAt = started
			MineService.window(s)
		end
		return
	elseif intent.op == "DigStop" then
		MineService.stopDigging(s, started)
		return
	end
	local st = s.state
	local pick = ProfileService.Read(player, function(p)
		return Circle.pick(p.pickaxe, p.circle, st.front, p)
	end)
	local own = PlotService.onOwnPlatform(player)
	if not pick or not own or not Validate.take(s.bucket, started, pick.interval) then
		MineService.reject(player, s, intent.seq)
		return
	end
	local ability = intent.op == "Ability"
	local creative = player:GetAttribute("CreativeAllowed") == true
	local endless = creative and player:GetAttribute("CreativeUltEndless") == true
	local d = if ability
		then st.front
		else Validate.target(st, own, intent.x, intent.y, intent.dRel)
	if
		not d
		or (
			ability
			and (
				not (endless or s.charge >= pick.ultCharge)
				or intent.dRel >= mine.window
				or not State.inWall(st, intent.x, intent.y)
			)
		)
	then
		MineService.reject(player, s, intent.seq)
		return
	end
	if RESET_ON_RETARGET and not ability then
		local target = State.cellKey(intent.x, intent.y, d)
		if s.lastTarget and s.lastTarget ~= target then
			for key in st.damage do
				if key ~= target then
					st.damage[key] = nil
				end
			end
		end
		s.lastTarget = target
	end
	local forced = if creative then player:GetAttribute("CreativeUltLayers") else nil
	local serverTime = workspace:GetServerTimeNow()
	Streak.decay(s.streak, math.min(serverTime, s.streakUntil), true)
	Streak.decay(s.streak, serverTime, false)
	local duration = 0
	for wave = 1, 2 do
		local outcome, failure
		ProfileService.Mutate(player, function(profile)
			if s.perkFamily ~= profile.family then
				s.perks, s.perkFamily = Perks.new(), profile.family
			end
			outcome, failure = MiningAction.perform(st, profile, s.perks, {
				ability = ability,
				now = started,
				income = Income.context(
					profile,
					Family.effects(profile),
					{ Streak.multiplier(s.streak) }
				),
				x = intent.x,
				y = intent.y,
				d = d,
				echo = wave == 2,
				ultLayers = if type(forced) == "number" and forced > 0 then forced else nil,
			})
		end)
		if not outcome then
			if failure == "income" then
				warn("[Mine] Rejected nonfinite income")
			end
			MineService.reject(player, s, intent.seq)
			return
		end
		if wave == 1 then
			s.lastHitAt, s.hitInterval, s.stopAfterUlt = started, pick.interval, false
		end
		s.charge = if ability
			then (if endless then pick.ultCharge else 0)
			else math.min(pick.ultCharge, s.charge + 1)
		if not ability then
			Streak.add(s.streak, serverTime, pick.interval, "hand")
		end
		Pace.record(s.pace, serverTime, outcome.delta)
		local delta = outcome.delta
		if ability or delta > 0 then
			duration += if ability then outcome.duration else Ride.timeline(delta, false).total
			if ability then
				s.ultUntil = math.max(s.ultUntil or started, started + duration)
			end
			s.streakUntil = serverTime + duration
			player:SetAttribute("MineReturnAfter", serverTime + duration)
		end
		publish(
			s,
			if wave == 1 then intent.seq else 0,
			outcome.oldFront,
			outcome.res,
			outcome.events,
			outcome.coins,
			ability,
			outcome.strike,
			outcome.visual
		)
		for _, id in outcome.newCards do
			Remotes.event("Toast"):FireClient(player, "card_unlocked_" .. id)
		end
		if outcome.keys > 0 then
			Remotes.event("Toast"):FireClient(player, "key_received", { outcome.keys })
		end
		if outcome.hitKeys > 0 then
			Analytics.event(player, "key_get", outcome.hitKeys, "hits")
		end
		for _, reward in outcome.rewards do
			Analytics.event(player, "wall_chest", reward.tier, tostring(reward.keys > 0))
			if reward.keys > 0 then
				Analytics.event(player, "key_get", reward.keys, "wall")
			end
			if reward.pick then
				Remotes.event("Toast"):FireClient(player, "pick_wall_storm")
				Analytics.event(player, "pick_get", 1, "wall", reward.pick.id)
			end
		end
		Pickaxe.refresh(player)
		Analytics.mined(
			player,
			ability,
			outcome.res.blocks,
			delta,
			outcome.oldWorld,
			outcome.world,
			outcome.res.plateBroken
		)
		if not outcome.echo then
			break
		end
	end
	record(if ability then s.ult else s.hit, (os.clock() - started) * 1000)
end

-- the endless test ult stays charged across mine resets too
local function refill(player: Player, s: MineService.Session)
	if player:GetAttribute("CreativeUltEndless") == true then
		s.charge = mine.ultCharge
		MineService.window(s)
	end
end

function HitService.Creative(player: Player, op: string, a: any, b: any, c: any)
	if player:GetAttribute("CreativeAllowed") ~= true then
		return
	end
	local s = MineService.get(player)
	if not s then
		return
	end
	local st = s.state
	if op == "mine.equip" then
		if type(a) == "string" then
			Pickaxe.equip(player, a, b == true, true)
		end
		return
	elseif op == "mine.level" then
		if type(a) == "number" and (a == 1 or a == -1 or a == 0) then
			ProfileService.Mutate(player, function(profile)
				local id = profile.pickaxe
				local rarity = Config.progress.rarities[Config.pickaxes[id].rarity]
				local level = profile.circle.pickLevels[id] or 1
				profile.circle.pickLevels[id] = if a == 0
					then Power.cap(rarity, profile.pickaxeGolden)
					else math.clamp(level + a, 1, Power.cap(rarity, profile.pickaxeGolden))
			end)
		end
		return
	elseif op == "mine.depth" then
		-- 0 = the world the mine is in now
		local index = if a == 0 then Worlds.of(st.front).index else a
		local world = if type(index) == "number" and index % 1 == 0 then Worlds.at(index) else nil
		if world then
			local depth = if b == true then world.plateDepth - 30 else world.start
			ProfileService.Mutate(player, function(profile)
				Circle.reach(profile, world.index)
			end)
			MineService.reset(s, depth, st.width)
			refill(player, s)
		end
		return
	elseif op == "mine.reset" or op == "reset" then
		ProfileService.Mutate(player, function(profile)
			profile.circle = Circle.new()
			profile.coins = 0
		end)
		MineService.reset(s, 0, st.width)
		refill(player, s)
		return
	elseif op == "mine.charge" then
		s.charge = mine.ultCharge
		MineService.window(s)
		return
	elseif op == "mine.ultEndless" then
		local on = player:GetAttribute("CreativeUltEndless") ~= true
		player:SetAttribute("CreativeUltEndless", on)
		if on then
			s.charge = mine.ultCharge
			MineService.window(s)
		end
		return
	elseif op == "mine.ultLayers" then
		local steps = CREATIVE_ULT_LAYERS
		local current = player:GetAttribute("CreativeUltLayers")
		local index = table.find(steps, if type(current) == "number" then current else 0) or 1
		player:SetAttribute("CreativeUltLayers", steps[index % #steps + 1])
		return
	elseif op == "mine.qaFamily" and RunService:IsStudio() then
		-- QA (Studio only, the QA profile store): family `a` with skill levels `b` (four numbers 0..10)
		if type(a) == "string" and Config.families[a] and type(b) == "table" and #b == 4 then
			ProfileService.Mutate(player, function(profile)
				profile.family = a
				local levels = {}
				for i = 1, 4 do
					levels[i] = math.clamp(
						math.floor(tonumber(b[i]) or 0),
						0,
						Config.families[a].skills[i].cap
					)
				end
				profile.skills[a] = levels
			end)
		end
		return
	elseif op == "mine.stats" then
		local bytes = #game:GetService("HttpService"):JSONEncode(Codec.encode(st))
		local hit, ult = s.hit, s.ult
		local report = string.format(
			"front=%d holes=%d bytes=%d hit=%.3f/%.3f ms ult=%.3f/%.3f ms counts=%d/%d",
			st.front,
			st.holeCount,
			bytes,
			hit.total / math.max(1, hit.count),
			hit.max,
			ult.total / math.max(1, ult.count),
			ult.max,
			hit.count,
			ult.count
		)
		if RunService:IsStudio() then
			print("[MineStats] " .. report)
		end
		player:SetAttribute("MineHitMs", string.format("%.3f", hit.total / math.max(1, hit.count)))
		Remotes.event("Toast"):FireClient(player, "mine_stats_value", {
			st.front,
			st.holeCount,
			bytes,
			string.format("%.3f/%.3f", hit.total / math.max(1, hit.count), hit.max),
			string.format("%.3f/%.3f", ult.total / math.max(1, ult.count), ult.max),
		})
		return
	end

	local front = st.front
	local out: { State.Range } = {}
	if
		op == "mine.drill"
		and type(a) == "number"
		and type(b) == "number"
		and type(c) == "number"
		and c % 1 == 0
		and c >= 1
		and c <= 5000
	then
		State.removeRange(st, a, b, front, front + c, out)
	elseif op == "mine.layers" and type(a) == "number" and a % 1 == 0 and a >= 1 and a <= 5000 then
		State.removeLayers(st, front, front + a, out)
	elseif op == "mine.toPlate" then
		local barrier = State.barrier(st)
		if barrier <= mine.maxDepth then
			State.removeLayers(st, front, barrier, out)
		end
	else
		return
	end
	State.compact(st, out)
	local res: HitResult =
		{ cells = {}, runs = {}, hist = {}, finds = {}, blocks = 0, plateBroken = false }
	for _, span in out do
		for d = span.a, math.min(span.b, front + mine.window) - 1 do
			table.insert(res.cells, { x = span.x, y = span.y, d = d, gen = 0 })
		end
		if span.b > front + mine.window and #res.runs < budget.maxRuns then
			table.insert(
				res.runs,
				{ x = span.x, y = span.y, a = math.max(span.a, front + mine.window), b = span.b }
			)
		end
		res.blocks += span.b - span.a
	end
	State.advance(st)
	publish(s, 0, front, res, {}, 0, false, nil)
end

function HitService.Start()
	Remotes.event("MineIntent").OnServerEvent:Connect(onIntent)
end

return HitService
