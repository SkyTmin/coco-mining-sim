--!strict
-- One authoritative mining transaction. The server calls it only inside ProfileService.Mutate.
-- Frozen stage-4 implementation (a6b4c52), used only as an independent regression oracle.
local Shared = script.Parent.Parent.Parent.src.shared
local Config = require(Shared.Config)
local State = require(Shared.Mine.MineState)
local Resolve = require(Shared.Mine.Resolve)
local Codec = require(Shared.Mine.MineCodec)
local Economy = require(Shared.Mine.Economy)
local Worlds = require(Shared.Mine.Worlds)
local Hash = require(Shared.Mine.Hash)
local Wave = require(Shared.Mine.UltWave)
local Ride = require(Shared.Mine.Ride)
local Power = require(Shared.Play.Power)
local Circle = require(Shared.Play.Circle)
local Family = require(Shared.Play.Family)
local Perks = require(Shared.Play.Perks)
local WallChests = require(script.Parent["stage4-wall-chests"])
local Keys = require(Shared.Play.Keys)
local FxFlags = require(Shared.Play.FxFlags)
local MiningAction = {}

local function merge(base: any, extra: any)
	for _, cell in extra.cells do
		cell.gen = 1
		table.insert(base.cells, cell)
	end
	for _, run in extra.runs do
		table.insert(base.runs, run)
	end
	for _, find in extra.finds do
		find.source = "perk"
		table.insert(base.finds, find)
	end
	for key, value in extra.hist do
		base.hist[key] = (base.hist[key] or 0) + value
	end
	base.blocks += extra.blocks
end

local function event(
	kind: number,
	family: string,
	rarity: string,
	cells: { any },
	front: number,
	duration: number
): any
	local points = {}
	for _, cell in cells do
		if cell.d >= front and cell.d < front + Config.mine.window and #points < 200 then
			table.insert(points, { x = cell.x, y = cell.y, dRel = cell.d - front })
		end
	end
	return {
		kind = kind,
		type = if kind == 3 then "perk" elseif kind == 4 then "ult" else "frozen",
		family = family,
		rarity = rarity,
		gen = 1,
		delayMs = 0,
		durationMs = duration,
		points = points,
	}
end

function MiningAction.perform(
	st: State.MineState,
	profile: any,
	runtime: Perks.Runtime,
	request: any
): any?
	local front = st.front
	local pick = Circle.pick(profile.pickaxe, profile.circle, front, profile)
	local effects = Family.effects(profile)
	st.chestFrequency = effects.chestFrequency
	local ability = request.ability == true
	local visual = if ability then Codec.encode(st) else nil
	local strike, res, ult = nil, nil, nil
	local events = {}
	local procFlags, pierced = 0, {}
	if ability then
		if request.ultLayers then
			pick.ultLayers = request.ultLayers
		end
		ult = Perks.ult(pick.family, runtime, effects, request.now)
		pick.plateMultiplier *= ult.plateMultiplier
		res = Resolve.ult(st, pick)
		profile.ultCounter += 1
		if pick.family then
			table.insert(events, event(4, pick.family, pick.rarity, {}, front, 800))
		end
	else
		local counter = profile.hitCounter + 1
		strike =
			Power.strike(st.seed, counter, profile.critCounter, pick.strength, profile.circle.cards)
		pick.forcedPierce = if runtime.nextPierce > 0
			then runtime.nextPierce
			else Power.pierce(Worlds.durability(request.d), strike.strength, strike)
		if runtime.nextPierce > 0 then
			procFlags = bit32.bor(procFlags, FxFlags.ultPierce)
		end
		if Hash.unit(st.seed, counter, 505) < effects.pierce then
			pick.forcedPierce += 1
			procFlags = bit32.bor(procFlags, FxFlags.pierce)
		end
		pick.brittle = Hash.unit(st.seed, counter, 507) < effects.brittle
		if pick.brittle then
			procFlags = bit32.bor(procFlags, FxFlags.brittle)
		end
		if pick.family == "frost" then
			Perks.freeze(runtime, st, request.x, request.y, request.d)
		end
		res = Resolve.hit(st, pick, request.x, request.y, request.d, strike)
		if not res then
			return nil
		end
		-- the hit cell first, then every hand cell it drove deeper (what «Пробой» shows)
		table.insert(pierced, { x = request.x, y = request.y, d = request.d })
		for _, cell in res.cells do
			if cell.d > request.d then
				table.insert(pierced, cell)
			end
		end
		runtime.nextPierce = 0
		profile.hitCounter, profile.critCounter =
			counter, profile.critCounter + (if strike.crit then 1 else 0)
	end
	for _, find in res.finds do
		find.source = if ability then "ult" else "hand"
	end
	if not ability and pick.family then
		local forced = pick.family == "storm" and request.now < runtime.stormUntil
		local count =
			Perks.count(pick.family, pick.rarity, st.seed, profile.hitCounter, effects, forced)
		count = math.min(count, Config.cascade.maxCells - #res.cells)
		local route = Perks.route(
			st,
			pick.family,
			pick.rarity,
			request.x,
			request.y,
			request.d,
			count,
			runtime
		)
		if #route > 0 then
			merge(res, Resolve.perk(st, pick, route))
			local perk = event(3, pick.family, pick.rarity, route, front, 180)
			perk.flags = if forced then FxFlags.stormForced else 0
			table.insert(events, perk)
			if pick.family == "frost" then
				table.clear(runtime.frozen)
			end
		end
	end
	if pick.family == "frost" then
		table.insert(
			events,
			event(5, pick.family, pick.rarity, Perks.frozen(runtime, st), front, 0)
		)
	end
	local multiplier = effects.coins
		* (if strike then strike.coinMultiplier else (ult and ult.coinMultiplier or 1))
	local coins = Economy.coinsFor(res.hist, profile.circle.cards.coins, multiplier)
		+ (res.plateReward or 0) * effects.coins
	profile.coins += coins
	local keys = if ability then 0 else Keys.hit(profile, effects.keys, st.seed)
	local hitKeys = keys
	if hitKeys > 0 then
		procFlags = bit32.bor(procFlags, FxFlags.key)
	end
	local rewards = {}
	local chestEffects = effects
	if ability and ult.coinMultiplier ~= 1 then
		chestEffects = table.clone(effects)
		chestEffects.coins *= ult.coinMultiplier
	end
	for _, find in res.finds do
		if find.kind == "chest" then
			find.tier = find.tier or WallChests.tier(st.seed, State.cellKey(find.x, find.y, find.d))
			local reward =
				WallChests.reward(profile, find, find.source == "hand", st.seed, chestEffects)
			coins += reward.coins
			keys += reward.keys
			table.insert(rewards, reward)
		end
	end
	local delta = State.advance(st)
	local duration = if ability
		then Wave.total(delta, if delta > 0 then Ride.timeline(delta, false).approach else 0)
		else 0
	if ability and pick.family then
		local buff = (Config.families[pick.family].ult.stormSeconds or 0)
			+ (if pick.family == "storm" then effects.stormSeconds else 0)
		events[1].durationMs = math.floor(duration * 1000)
		events[1].buffMs = math.floor(buff * 1000)
		if buff > 0 then
			runtime.stormUntil = request.now + duration + buff
		end
	end
	local oldWorld, world = Worlds.of(front).index, Worlds.of(st.front).index
	profile.stats.blocks += res.blocks
	profile.stats.layers += delta
	if res.plateBroken then
		profile.platesBroken += 1
	end
	local cards = if world > oldWorld then Circle.reach(profile, world) else {}
	local placed, placedChest = false, nil
	if ability and Hash.unit(st.seed, profile.ultCounter, 509) < effects.ultChest then
		placedChest = WallChests.place(st)
		placed = placedChest ~= nil
	end
	local echo = ability
		and not request.echo
		and Hash.unit(st.seed, profile.ultCounter, 511) < effects.echo
	if ability and pick.family then
		local ultEvent = events[1]
		ultEvent.flags = bit32.bor(
			if request.echo then FxFlags.echo else 0,
			if placed then FxFlags.placed else 0
		)
		if placedChest then
			-- the chest's cell, relative to the NEW front (the wall the player sees after the wave)
			ultEvent.points =
				{ { x = placedChest.x, y = placedChest.y, dRel = placedChest.d - st.front } }
		end
	elseif not ability and pick.family and procFlags ~= 0 then
		local proc = event(6, pick.family, pick.rarity, pierced, front, 0)
		proc.flags = procFlags
		table.insert(events, proc)
	end
	return {
		res = res,
		events = events,
		coins = coins,
		keys = keys,
		hitKeys = hitKeys,
		rewards = rewards,
		strike = strike,
		oldFront = front,
		delta = delta,
		duration = duration,
		oldWorld = oldWorld,
		world = world,
		newCards = cards,
		visual = visual,
		echo = echo,
		placed = placed,
		pick = pick,
	}
end

return MiningAction
