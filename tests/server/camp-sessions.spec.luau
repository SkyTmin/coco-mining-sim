--!strict
local Loader = require("../lib/loader")
local Test = require("../lib/expect")
local Defaults = Loader.load("src/shared/Play/ProfileDefaults.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Wire = Loader.load("src/shared/Mine/MineWire.luau")
local Equal = Loader.load("src/shared/Persistence.luau").equal

-- Real MineService, HitService and DuelService; advance the server clock and record remote deliveries.
local function server()
	local now = 100
	local idle = function() end
	local signal = {
		Connect = function()
			return { Disconnect = idle }
		end,
	}
	local players = { PlayerRemoving = signal }
	local profiles, actors, visits, packets, jobs = {}, {}, {}, {}, {}
	local loaded, save, challenge, receive
	local function actor(id)
		local a = {
			UserId = id,
			DisplayName = tostring(id),
			Parent = players,
			OnTeleport = signal,
			CharacterRemoving = signal,
		}
		a.Character = {
			PivotTo = idle,
			FindFirstChildOfClass = function()
				return { Died = signal }
			end,
		}
		a.GetAttribute = function(self, key)
			return self[key]
		end
		a.SetAttribute = function(self, key, value)
			self[key] = value
		end
		local p = Defaults.new(1)
		local st = State.new(100 + id, p.width, 3)
		for x = -(p.width - 1) // 2, (p.width - 1) // 2 do
			for y = 0, 2 do
				if x ~= 0 or y ~= 1 then
					State.removeCell(st, x, y, st.front, {})
				end
			end
		end
		st.damage[State.cellKey(0, 1, 1)] = 0.5
		p.mine = Codec.encode(st)
		actors[id], profiles[a] = a, p
		return a
	end
	local a, b = actor(1), actor(2)
	local remotes = {
		event = function(name)
			return {
				OnServerEvent = {
					Connect = function(_, cb)
						if name == "MineIntent" then
							receive = cb
						end
					end,
				},
				FireClient = function(_, player, kind, payload, extra)
					table.insert(packets, {
						remote = name,
						player = player,
						kind = kind,
						data = payload,
						extra = extra,
					})
				end,
			}
		end,
	}
	local access = function(p, fn)
		return fn(profiles[p])
	end
	local loader
	loader = Loader.withOverrides({
		["src/shared/Remotes.luau"] = remotes,
		["src/server/Services/ProfileService.luau"] = {
			OnLoaded = function(cb)
				loaded = cb
			end,
			BeforeSave = function(cb)
				save = cb
			end,
			Get = function(p)
				return profiles[p]
			end,
			Read = access,
			Mutate = access,
			PlaySeconds = function()
				return now
			end,
		},
		["src/server/Services/PlotService.luau"] = {
			get = function(p)
				return p.UserId
			end,
			onOwnPlatform = function()
				return true
			end,
			inZone = function()
				return true
			end,
			owner = function(i)
				return actors[i]
			end,
			depth = idle,
			digFrame = idle,
			frame = idle,
		},
		["src/server/Services/GuestService.luau"] = {
			offer = function(_, _, _, accept)
				accept()
			end,
		},
		["src/server/Services/VisitService.luau"] = {
			clear = idle,
			leave = function(p)
				visits[p] = nil
			end,
			get = function(p)
				return visits[p]
			end,
		},
		["src/server/Services/SocialService.luau"] = {
			handle = function(_, cb)
				challenge = cb
			end,
		},
		["src/server/Services/PickaxeService.luau"] = { attachDisplay = idle },
		["src/server/Services/Analytics.luau"] = { event = idle, mined = idle },
		["src/server/Services/RebirthService.luau"] = { hint = idle },
		["src/server/Camp/CampBuilder.luau"] = { get = idle },
	}, {
		game = {
			GetService = function(_, name)
				if name == "Players" then
					return players
				end
				if name == "RunService" then
					return { Heartbeat = signal }
				end
				return { Shared = loader.node("src/shared") }
			end,
		},
		workspace = {
			GetServerTimeNow = function()
				return now
			end,
		},
		Random = {
			new = function()
				return {
					NextNumber = function()
						return 0.5
					end,
				}
			end,
		},
		task = {
			spawn = function(fn)
				table.insert(jobs, coroutine.create(fn))
			end,
			wait = coroutine.yield,
		},
		os = {
			time = os.time,
			date = os.date,
			clock = function()
				return now
			end,
		},
	})
	local mines = loader.load("src/server/Services/MineService.luau")
	local duel = loader.load("src/server/Services/DuelService.luau")
	mines.Start()
	loader.load("src/server/Services/HitService.luau").Start()
	duel.Start()
	loaded(a)
	loaded(b)
	return {
		a = a,
		b = b,
		profiles = profiles,
		visits = visits,
		packets = packets,
		mines = mines,
		duel = duel,
		challenge = challenge,
		saved = function(p)
			save(p)
			return profiles[p].mine
		end,
		strike = function(p, x, op)
			receive(p, Wire.encodeIntent(op or "Hit", 5, x, 1, 0))
		end,
		time = function(t)
			now = t
		end,
		tick = function()
			local ok, err = coroutine.resume(jobs[#jobs])
			assert(ok, err)
		end,
	}
end

Test.describe("Camp server sessions", function()
	Test.it(
		"routes duel hits, enforces the countdown, saves the original wall and restores it after 60 seconds",
		function()
			local s = server()
			local a, b = s.a, s.b
			local oldA, oldB = s.saved(a), s.saved(b)
			s.challenge(a, b)
			assert(a.InDuel and b.InDuel)
			assert(s.mines.display(a).state.seed == s.mines.display(b).state.seed)
			s.strike(a, -2)
			assert(s.mines.display(a).state.holeCount == 0)
			s.time(103)
			s.strike(a, -2)
			s.time(105)
			s.strike(a, 2)
			assert(s.mines.display(a).state.front == 1 and s.mines.display(b).state.front == 0)
			assert(Equal(s.saved(a), oldA) and Equal(s.saved(b), oldB))
			s.time(162.75)
			s.tick()
			assert(a.InDuel)
			s.time(163)
			s.tick()
			assert(not a.InDuel and not b.InDuel and s.mines.display(a) == s.mines.get(a))
			assert(Equal(s.saved(a), oldA) and Equal(s.saved(b), oldB))
			assert(
				s.profiles[a].duelWins == 1
					and s.profiles[a].coins > s.profiles[b].coins
					and s.profiles[b].coins > 0
			)
		end
	)
	Test.it("aborts a duel without paying either player or altering the saved mine", function()
		local s = server()
		local a, b = s.a, s.b
		local before = s.saved(a)
		s.challenge(a, b)
		s.time(104)
		s.strike(a, 0)
		s.duel.abort(b)
		s.duel.abort(b)
		assert(not a.InDuel and not b.InDuel and Equal(s.saved(a), before))
		assert(
			s.profiles[a].coins == 0 and s.profiles[b].coins == 0 and s.profiles[a].duelWins == 0
		)
	end)
	Test.it(
		"sends a private spectator snapshot and pays a helper only for an accepted host hit",
		function()
			local s = server()
			local a, b = s.a, s.b
			local mineB = s.saved(b)
			table.clear(s.packets)
			s.mines.subscribe(b, s.mines.get(a))
			local windows, tails = 0, 0
			for _, packet in s.packets do
				assert(packet.player == b)
				if packet.kind == "window" then
					windows += 1
				end
				if packet.kind == "layers" then
					tails += 1
				end
			end
			assert(windows == 1 and tails > 0)
			s.visits[b] = { role = "guest", owner = a, plot = 1 }
			s.strike(b, 0, "Ability")
			assert(s.profiles[a].coins == 0 and s.profiles[b].coins == 0)
			s.strike(b, 0)
			assert(s.profiles[a].coins > 0 and s.profiles[b].coins == s.profiles[a].coins * 0.5)
			assert(s.profiles[b].keyHits == 0.5 and s.profiles[a].keyHits == 0.5)
			assert(
				s.profiles[a].bestDepth > 0
					and s.profiles[b].bestDepth == 0
					and Equal(s.saved(b), mineB)
			)
		end
	)
end)
return true
