--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Config = Loader.load("src/shared/Config")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Power = Loader.load("src/shared/Play/Power.luau")
local expect = Test.expect
local hardDepth = Worlds.at(2).start

local function startMine(depth: number, prepare: ((any) -> ())?)
	local now, seq = 0, 0
	local loaded, beforeSave, heartbeat, receive
	local players = { PlayerRemoving = { Connect = function() end } }
	local attributes: { [string]: any } = {}
	local player = {
		Parent = players,
		GetAttribute = function(_, key)
			return attributes[key]
		end,
		SetAttribute = function(_, key, value)
			attributes[key] = value
		end,
	}
	local profile: any = { coins = 0, pickaxe = "starter", stats = { blocks = 0, layers = 0 } }
	Circle.initialize(profile)
	local st = State.new(17, profile.width, Config.mine.height, depth)
	if prepare then
		prepare(st)
	end
	profile.mine = Codec.encode(st)
	local windows, results = {}, {}
	local loader
	loader = Loader.withOverrides({
		["src/server/Services/RebirthService.luau"] = { hint = function() end },
		["src/shared/Remotes.luau"] = {
			event = function(name)
				if name == "MineIntent" then
					return {
						OnServerEvent = {
							Connect = function(_, callback)
								receive = callback
							end,
						},
					}
				end
				return {
					FireClient = function(_, owner, kind, packet, damageReset)
						assert(owner == player)
						if name == "MineWindow" and kind == "window" then
							table.insert(
								windows,
								{ data = assert(Wire.decodeWindow(packet)), reset = damageReset }
							)
						elseif name == "MineWindow" and kind == "result" then
							table.insert(results, assert(Wire.decodeResult(packet)))
						end
					end,
				}
			end,
		},
		["src/server/Services/ProfileService.luau"] = {
			PlaySeconds = function()
				return now
			end,
			OnLoaded = function(callback)
				loaded = callback
			end,
			BeforeSave = function(callback)
				beforeSave = callback
			end,
			Get = function()
				return profile
			end,
			Read = function(_, fn)
				return fn(profile)
			end,
			Mutate = function(_, fn)
				fn(profile)
			end,
		},
		["src/server/Services/PlotService.luau"] = {
			get = function()
				return 1
			end,
			onOwnPlatform = function()
				return true
			end,
			depth = function() end,
		},
		["src/server/Services/PickaxeService.luau"] = { refresh = function() end },
		["src/server/Services/Analytics.luau"] = { event = function() end, mined = function() end },
	}, {
		game = {
			GetService = function(_, name)
				if name == "Players" then
					return players
				elseif name == "RunService" then
					return {
						Heartbeat = {
							Connect = function(_, callback)
								heartbeat = callback
							end,
						},
					}
				end
				return { Shared = loader.node("src/shared") }
			end,
		},
		os = {
			clock = function()
				return now
			end,
		},
		workspace = {
			GetServerTimeNow = function()
				return now + 1000
			end,
		},
		task = { spawn = function() end },
		Random = {
			new = function()
				return {
					NextNumber = function()
						return 0.5
					end,
				}
			end,
		},
	})
	local service = loader.load("src/server/Services/MineService.luau")
	service.Start()
	loader.load("src/server/Services/HitService.luau").Start()
	assert(loaded)(player)
	local session = assert(service.get(player))
	return {
		session = session,
		profile = profile,
		attributes = attributes,
		windows = windows,
		results = results,
		step = function(time: number)
			now = time
			assert(heartbeat)()
		end,
		send = function(op: string, x: number?, y: number?, dRel: number?)
			seq += 1
			assert(receive)(player, Wire.encodeIntent(op, seq, x or 0, y or 1, dRel or 0))
		end,
		save = function()
			assert(beforeSave)(player)
			return profile.mine
		end,
	}
end

Test.describe("Server dig lifecycle", function()
	Test.it("accumulates damage until the grace period elapses and sends a clean window", function()
		local mine = startMine(hardDepth)
		local s = mine.session
		local key = State.cellKey(0, 1, hardDepth)
		mine.send("Hit")
		local first = assert(s.state.damage[key])
		local interval = s.hitInterval
		local secondAt = interval + 0.15
		mine.step(secondAt)
		mine.send("Hit")
		assert(s.state.damage[key] > first)
		assert(mine.results[2].damage[1].amount > mine.results[1].damage[1].amount)
		expect(s.lastHitAt).toBe(secondAt)
		mine.step(secondAt + interval + 0.2)
		local beforeStreak = s.streak.gauge
		mine.send("Hit", 100)
		expect(s.streak.gauge).toBe(beforeStreak)
		expect(mine.results[2].streak).toBe(
			math.floor(s.streak.gauge * Config.events.streakWireScale)
		)
		expect(mine.results[3].accepted).toBe(false)
		expect(s.lastHitAt).toBe(secondAt)
		expect(#mine.windows).toBe(1)
		mine.step(secondAt + interval + 0.32)
		expect(next(s.state.damage)).toBe(nil)
		expect(#mine.windows).toBe(2)
		expect(mine.windows[2].reset).toBe(true)
		expect(mine.windows[2].data.damage).toEqual({})
		mine.step(secondAt + interval + 1)
		expect(#mine.windows).toBe(2)
	end)

	Test.it("accepts DigStop at once and rate-limits it independently of Resync", function()
		local mine = startMine(hardDepth)
		local key = State.cellKey(0, 1, hardDepth)
		mine.send("Hit")
		local first = assert(mine.session.state.damage[key])
		mine.send("Resync")
		mine.send("DigStop")
		expect(next(mine.session.state.damage)).toBe(nil)
		expect(#mine.windows).toBe(3)
		expect(mine.windows[3].data.damage).toEqual({})
		mine.step(0.25)
		mine.send("Hit")
		expect(mine.session.state.damage[key]).toBe(first)
		mine.send("DigStop")
		expect(mine.session.state.damage[key]).toBe(first)
		expect(#mine.windows).toBe(3)
		mine.step(0.5)
		mine.send("DigStop")
		expect(next(mine.session.state.damage)).toBe(nil)
		expect(#mine.windows).toBe(4)
	end)

	Test.it("keeps plate HP after a pause and DigStop", function()
		local mine = startMine(Worlds.at(1).plateDepth)
		mine.send("Hit")
		local damage = mine.session.state.plateDamage
		assert(damage > 0)
		mine.step(mine.session.hitInterval + 1)
		mine.send("DigStop")
		expect(mine.session.state.plateDamage).toBe(damage)
		mine.send("Resync")
		expect(mine.windows[2].data.plateDamage).toBe(damage)
	end)

	Test.it("saves no block damage while the live dig keeps its progress", function()
		local mine = startMine(hardDepth)
		local key = State.cellKey(0, 1, hardDepth)
		mine.send("Hit")
		local damage = assert(mine.session.state.damage[key])
		expect(next(mine.save().damage)).toBe(nil)
		expect(mine.session.state.damage[key]).toBe(damage)
	end)

	Test.it(
		"keeps Strength cracks on a retarget and clears the neighbor and target together",
		function()
			local depth = Worlds.at(3).start
			local mine = startMine(depth)
			mine.profile.circle.cards.power = Config.progress.cards.power.steps[2]
			local pick = Circle.pick(mine.profile.pickaxe, mine.profile.circle, depth, mine.profile)
			local hits = Power.hits(Worlds.durability(depth), pick.strength)
			local st = mine.session.state
			local neighbor, target = State.cellKey(1, 1, depth), State.cellKey(-1, 1, depth)
			for i = 1, hits do
				mine.step((i - 1) * pick.interval)
				mine.send("Hit")
			end
			local spill = assert(st.damage[neighbor])
			mine.step(hits * pick.interval)
			mine.send("Hit", -1)
			expect(st.damage[neighbor]).toBe(spill)
			assert(st.damage[target] > 0)
			mine.send("DigStop")
			expect(next(st.damage)).toBe(nil)
			expect(mine.windows[2].data.damage).toEqual({})
		end
	)

	Test.it(
		"keeps unfinished damage through an ultimate and then honors release or grace",
		function()
			for _, released in { false, true } do
				local mine = startMine(hardDepth, function(st)
					State.removeRange(st, 0, 1, hardDepth, hardDepth + 3, {})
				end)
				local s = mine.session
				local key = State.cellKey(0, 1, hardDepth + 3)
				mine.send("Hit", 0, 1, 3)
				local damage = assert(s.state.damage[key])
				s.charge = Config.mine.ultCharge
				mine.attributes.CreativeAllowed = true
				mine.attributes.CreativeUltLayers = 1
				mine.step(s.hitInterval)
				mine.send("Ability")
				assert(mine.results[2].accepted)
				local ends = mine.attributes.MineReturnAfter - 1000
				local during = ends - 0.4
				mine.step(during)
				expect(s.lastHitAt).toBe(during)
				if released then
					mine.send("DigStop")
				end
				expect(s.state.damage[key]).toBe(damage)
				expect(#mine.windows).toBe(1)
				mine.step(ends + 0.01)
				if not released then
					expect(s.state.damage[key]).toBe(damage)
					mine.step(ends + s.hitInterval + 0.31)
				end
				expect(next(s.state.damage)).toBe(nil)
				expect(mine.windows[2].data.damage).toEqual({})
			end
		end
	)
end)

return true
