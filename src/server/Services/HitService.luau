--!strict

local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local State = require(Shared.Mine.MineState)
local Resolve = require(Shared.Mine.Resolve)
local Codec = require(Shared.Mine.MineCodec)
local Economy = require(Shared.Mine.Economy)
local Validate = require(Shared.Mine.Validate)
local Worlds = require(Shared.Mine.Worlds)
local Wire = require(Shared.Mine.MineWire)
local Storm = require(Shared.Play.Storm)
local Circle = require(Shared.Play.Circle)
local Power = require(Shared.Play.Power)
local MineService = require(script.Parent.MineService)
local ProfileService = require(script.Parent.ProfileService)
local PlotService = require(script.Parent.PlotService)
local Pickaxe = require(script.Parent.PickaxeService)
local Analytics = require(script.Parent.Analytics)

type Session = MineService.Session
type HitResult = Resolve.HitResult
local mine, budget = Config.mine, Config.cascade
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
	strike: Power.Strike?
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
		finds[i] = { kind = 1, id = State.cellKey(find.x, find.y, find.d) % 65536 }
	end
	MineService.result(s, {
		seq = seq,
		accepted = true,
		front = st.front,
		plot = s.plot,
		delta = delta,
		ability = ability,
		heavy = strike and strike.heavy,
		crit = strike and strike.crit,
		mega = strike and strike.mega,
		rain = strike and strike.rain,
		charge = s.charge,
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

local function merge(base: HitResult, extra: HitResult)
	for _, cell in extra.cells do
		cell.gen = 1
		table.insert(base.cells, cell)
	end
	for _, run in extra.runs do
		table.insert(base.runs, run)
	end
	for _, find in extra.finds do
		table.insert(base.finds, find)
	end
	for key, count in extra.hist do
		base.hist[key] = (base.hist[key] or 0) + count
	end
	base.blocks += extra.blocks
end

local function stormHit(
	s: Session,
	pick: Circle.Pick,
	x: number,
	y: number,
	d: number,
	res: HitResult,
	events: { any },
	strike: Power.Strike
)
	local st = s.state
	if not pick.storm or d >= State.barrier(st) or budget.maxGen < 1 then
		return
	end
	local rng = {
		range = function(_: any, lo: number, hi: number)
			return s.rng:NextInteger(lo, hi)
		end,
	}
	local route = Storm.chain(st, rng, x, y, d, pick.storm)
	local previous = point(x, y, d, st.front)
	local single = { strength = pick.strength, shape = "single", ultLayers = 0 }
	for i, nextCell in route do
		if #res.cells + 4 > budget.maxCells or #res.runs + 4 > budget.maxRuns then
			break
		end
		local struck = Resolve.hit(st, single, nextCell.x, nextCell.y, nextCell.d, strike)
		if struck then
			merge(res, struck)
			local nextPoint = point(nextCell.x, nextCell.y, nextCell.d, st.front)
			table.insert(
				events,
				{ kind = 1, gen = 1, delayMs = (i - 1) * 45, points = { previous, nextPoint } }
			)
			previous = nextPoint
		end
	end
end

local function stormUlt(s: Session, events: { any })
	local st = s.state
	local radius = (st.width - 1) // 2
	local count, waveSize = s.rng:NextInteger(12, 24), s.rng:NextInteger(4, 6)
	for i = 1, count do
		local x, y = s.rng:NextInteger(-radius, radius), s.rng:NextInteger(0, st.height - 1)
		local other = if x < radius then x + 1 else math.max(-radius, x - 1)
		table.insert(events, {
			kind = 2,
			gen = 1,
			delayMs = 600 + ((i - 1) // waveSize) * 150,
			points = {
				{ x = x, y = y, dRel = 0 },
				{ x = other, y = (y + 1) % st.height, dRel = if i == count then 10 else 0 },
			},
		})
	end
end

local function record(timing: MineService.Timing, elapsed: number)
	timing.count += 1
	timing.total += elapsed
	timing.max = math.max(timing.max, elapsed)
end

local function onIntent(player: Player, packet: any)
	local intent = Wire.decodeIntent(packet)
	if not intent then
		return
	end
	local s = MineService.get(player)
	if not s then
		return
	end
	local started = os.clock()
	if intent.op == "Resync" then
		if started - s.resyncAt >= 0.5 then
			s.resyncAt = started
			MineService.window(s)
		end
		return
	end
	local st = s.state
	local pick, cards, hitCounter, critCounter
	ProfileService.Read(player, function(profile)
		pick = Circle.pick(profile.pickaxe, profile.circle, st.front)
		cards = profile.circle.cards
		hitCounter, critCounter = profile.hitCounter, profile.critCounter
		return true
	end)
	local own = PlotService.onOwnPlatform(player)
	if
		not pick
		or not cards
		or not hitCounter
		or not critCounter
		or not own
		or not Validate.take(s.bucket, started, pick.interval)
	then
		MineService.reject(player, s, intent.seq)
		return
	end
	local oldFront = st.front
	local res: HitResult?
	local strike: Power.Strike?
	local events: { any } = {}
	local ability = intent.op == "Ability"
	if ability then
		if
			s.charge >= pick.ultCharge
			and intent.dRel < mine.window
			and State.inWall(st, intent.x, intent.y)
		then
			res = Resolve.ult(st, pick)
			s.charge = 0
			if pick.family == "storm" then
				stormUlt(s, events)
			end
		end
	else
		local d = Validate.target(st, own, intent.x, intent.y, intent.dRel)
		if d then
			strike = Power.strike(st.seed, hitCounter + 1, critCounter, pick.strength, cards)
			res = Resolve.hit(st, pick, intent.x, intent.y, d, strike)
			if res then
				s.charge = math.min(pick.ultCharge, s.charge + 1)
				stormHit(s, pick, intent.x, intent.y, d, res, events, strike)
			end
		end
	end
	if not res then
		MineService.reject(player, s, intent.seq)
		return
	end
	local coins = Economy.coinsFor(res.hist, cards.coins, strike and strike.coinMultiplier)
		+ (res.plateReward or 0)
	local blocks, plateBroken = res.blocks, res.plateBroken
	local delta = State.advance(st)
	local oldWorld, world = Worlds.of(oldFront).index, Worlds.of(st.front).index
	local newCards = {}
	ProfileService.Mutate(player, function(profile)
		profile.coins += coins
		profile.stats.blocks += blocks
		profile.stats.layers += delta
		if strike then
			profile.hitCounter += 1
			profile.critCounter += if strike.crit then 1 else 0
		end
		if plateBroken then
			profile.platesBroken += 1
		end
		if world > oldWorld then
			newCards = Circle.reach(profile, world)
		end
	end)
	publish(s, intent.seq, oldFront, res, events, coins, ability, strike)
	for _, id in newCards do
		Remotes.event("Toast"):FireClient(player, "card_unlocked_" .. id)
	end
	record(if ability then s.ult else s.hit, (os.clock() - started) * 1000)
	Analytics.mined(player, ability, blocks, delta, oldWorld, world, plateBroken)
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
			Pickaxe.equip(player, a)
		end
		return
	elseif op == "mine.level" then
		if type(a) == "number" and (a == 1 or a == -1 or a == 0) then
			ProfileService.Mutate(player, function(profile)
				local id = profile.pickaxe
				local rarity = Config.progress.rarities[Config.pickaxes[id].rarity]
				local level = profile.circle.pickLevels[id] or 1
				profile.circle.pickLevels[id] = if a == 0
					then Power.cap(rarity)
					else math.clamp(level + a, 1, Power.cap(rarity))
			end)
		end
		return
	elseif op == "mine.depth" then
		local world = if type(a) == "number" and a % 1 == 0 then Worlds.at(a) else nil
		if world then
			local depth = if b == true then world.plateDepth - 30 else world.start
			ProfileService.Mutate(player, function(profile)
				Circle.reach(profile, world.index)
			end)
			MineService.reset(s, depth, st.width)
		end
		return
	elseif op == "mine.reset" or op == "reset" then
		ProfileService.Mutate(player, function(profile)
			profile.circle = Circle.new()
			profile.coins = 0
		end)
		MineService.reset(s, 0, st.width)
		return
	elseif op == "mine.charge" then
		s.charge = mine.ultCharge
		MineService.window(s)
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
