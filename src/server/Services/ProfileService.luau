--!strict

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local Persistence = require(Shared.Persistence)
local Remotes = require(Shared.Remotes)
local StorageNames = require(Shared.StorageNames)
local Types = require(Shared.Types)
local Wire = require(Shared.Wire)
local Circle = require(Shared.Play.Circle)

type Profile = Types.Profile
type ProfilePatchOp = Types.ProfilePatchOp
type Session = {
	profile: Profile,
	token: string,
	fresh: boolean,
	canSave: boolean,
	dirty: boolean,
	saving: boolean,
	replicateDue: boolean,
	replicatedAt: number,
	sent: { [string]: any }?,
	playAt: number,
}
type SaveResult = "saved" | "retry" | "stopped"

local STORE_NAME =
	StorageNames.progress(if RunService:IsStudio() then "Profiles_v1_QA" else "Profiles_v1")
local JOB_ID = if game.JobId ~= "" then game.JobId else "studio"
local LOCK_WAIT_SECONDS = 20
local RETRY_SECONDS = 2
local DATASTORE_ATTEMPTS = 3
local CLOSE_SECONDS = 25
local REPLICATE_SECONDS = 0.1
local PLAY_TICK_SECONDS = 10

local updated = Remotes.event("ProfileUpdated")
local patch = Remotes.event("ProfilePatch")
local toast = Remotes.event("Toast")

local ProfileService = {}
local sessions: { [Player]: Session } = {}
local loading: { [Player]: boolean } = {}
local closingWrites = 0
local shuttingDown = false
local loadedHooks: { (Player) -> () } = {}
local saveHooks: { (Player) -> () } = {}
local store: DataStore? = nil

function ProfileService.DefaultProfile(): Profile
	local now = os.time()
	local profile: any = {
		coins = 0,
		pickaxe = "starter",
		stats = { blocks = 0, layers = 0, playSeconds = 0 },
		settings = {
			camera = "first",
			music = 0.7,
			sfx = Config.sounds.rules.defaultSfx,
			ui = 1,
			reducedMotion = false,
			haptics = true,
			effects = "auto",
		},
		firstJoin = now,
		lastJoin = now,
		joins = 0,
	}
	Circle.initialize(profile)
	return profile
end

local function migrate(data: any): (Profile?, boolean)
	if data == nil then
		return ProfileService.DefaultProfile(), true
	end
	if typeof(data) ~= "table" then
		return nil, false
	end
	local firstKey = next(data)
	if firstKey == nil or (firstKey == "_lock" and next(data, firstKey) == nil) then
		return ProfileService.DefaultProfile(), true
	end

	-- Reject unknown or damaged records before acquiring their lock.
	local stats, settings = data.stats, data.settings
	if
		typeof(data.coins) ~= "number"
		or typeof(data.firstJoin) ~= "number"
		or typeof(data.lastJoin) ~= "number"
		or typeof(data.joins) ~= "number"
		or typeof(stats) ~= "table"
		or typeof(stats.blocks) ~= "number"
		or typeof(stats.layers) ~= "number"
		or typeof(stats.playSeconds) ~= "number"
		or typeof(settings) ~= "table"
		or typeof(settings.camera) ~= "string"
		or typeof(settings.music) ~= "number"
		or typeof(settings.sfx) ~= "number"
		or typeof(settings.ui) ~= "number"
		or typeof(settings.reducedMotion) ~= "boolean"
		or (settings.haptics ~= nil and typeof(settings.haptics) ~= "boolean")
		or typeof(settings.effects) ~= "string"
		or (settings.language ~= nil and typeof(settings.language) ~= "string")
		or not Persistence.finiteTree(data)
	then
		return nil, false
	end
	local profile = Persistence.copy(data)
	profile.pickaxe = if type(data.pickaxe) == "string" then data.pickaxe else "starter"
	if profile.settings.haptics == nil then
		profile.settings.haptics = true
	end
	if not Circle.migrate(profile) then
		return nil, false
	end
	profile._lock, profile.loadFailed = nil, nil
	return profile, false
end

local function keyFor(player: Player): string
	return "User_" .. tostring(player.UserId)
end

local function acquire(
	dataStore: DataStore,
	player: Player,
	token: string
): (Profile?, boolean, string?, boolean)
	local deadline = os.clock() + LOCK_WAIT_SECONDS
	local failures = 0
	local loggedWait = false
	local reason = "player left"
	local uncertain = false
	while player.Parent == Players and not shuttingDown do
		local profile: Profile? = nil
		local fresh = false
		local locked = false
		local submitted = false
		local ok, problem = pcall(function()
			dataStore:UpdateAsync(keyFor(player), function(old: any)
				local now = os.time()
				local lock = if typeof(old) == "table" then old._lock else nil
				locked = not Persistence.isStale(lock, now)
					and not Persistence.owns(lock, JOB_ID, token)
				profile, fresh = nil, false
				if locked then
					return nil
				end
				profile, fresh = migrate(old)
				if not profile then
					return nil
				end
				local record = if old == nil then {} else Persistence.copy(old)
				record._lock = { job = JOB_ID, token = token, at = now }
				submitted = true
				return record
			end)
		end)

		if ok and profile then
			return profile, fresh, nil, false
		elseif not ok then
			failures += 1
			uncertain = uncertain or submitted
			reason = tostring(problem)
			if failures >= DATASTORE_ATTEMPTS then
				break
			end
		elseif locked then
			reason = "session lock still held"
			if not loggedWait then
				loggedWait = true
				warn("[ProfileService] waiting for the session lock for " .. player.Name)
			end
		else
			return nil, false, "unsupported or invalid saved profile", uncertain
		end
		if os.clock() >= deadline then
			break
		end
		task.wait(RETRY_SECONDS)
	end
	return nil, false, reason, uncertain
end

local function releaseUnusedLock(dataStore: DataStore, player: Player, token: string)
	local ok, problem = pcall(function()
		dataStore:UpdateAsync(keyFor(player), function(old: any)
			if typeof(old) ~= "table" or not Persistence.owns(old._lock, JOB_ID, token) then
				return nil
			end
			local record = table.clone(old)
			record._lock = nil
			return record
		end)
	end)
	if not ok then
		warn(
			string.format(
				"[ProfileService] lock release failed for %s: %s",
				player.Name,
				tostring(problem)
			)
		)
	end
end

function ProfileService.Get(player: Player): Profile?
	local session = sessions[player]
	return if session then Persistence.copy(session.profile) else nil
end

-- The callback must neither yield nor mutate its borrowed profile.
function ProfileService.Read<T>(player: Player, fn: (Profile) -> T): T?
	local session = sessions[player]
	return if session then fn(session.profile) else nil
end

function ProfileService.IsReal(player: Player): boolean
	local session = sessions[player]
	return session ~= nil and session.canSave
end

function ProfileService.IsNew(player: Player): boolean
	local session = sessions[player]
	return session ~= nil and session.canSave and session.fresh
end

function ProfileService.OnLoaded(fn: (Player) -> ())
	table.insert(loadedHooks, fn)
end

function ProfileService.BeforeSave(fn: (Player) -> ())
	table.insert(saveHooks, fn)
end

function ProfileService.FailLoad(player: Player)
	local session = sessions[player]
	if not session or not session.canSave then
		return
	end
	session.canSave = false
	ProfileService.Mutate(player, function(profile)
		profile.loadFailed = true
	end)
	if store then
		task.spawn(releaseUnusedLock, store, player, session.token)
	end
	if session.sent then
		toast:FireClient(player, "toast_load_failed")
	end
end

local function prepareSave(player: Player): boolean
	for _, hook in saveHooks do
		local ok, problem = pcall(hook, player)
		if not ok then
			warn("[ProfileService] Could not prepare save: " .. tostring(problem))
			return false
		end
	end
	return true
end

function ProfileService.Replicate(player: Player)
	local session = sessions[player]
	if session then
		player:SetAttribute("language", session.profile.settings.language)
		session.replicateDue = true
	end
end

-- Mutators run synchronously on the session profile.
function ProfileService.Mutate(player: Player, fn: (Profile) -> ())
	local session = sessions[player]
	if session then
		fn(session.profile)
		session.dirty = true
		ProfileService.Replicate(player)
	end
end

local function visibleProfile(profile: Profile): { [string]: any }
	local view = table.clone(profile) :: any
	view._lock, view.loadFailed = nil, nil
	view.mine, view.hitCounter, view.critCounter, view.funnel = nil, nil, nil, nil
	return view
end

local function diff(sent: { [string]: any }, profile: { [string]: any }): { ProfilePatchOp }
	local ops: { ProfilePatchOp } = {}
	for key, value in profile do
		if not Persistence.equal(sent[key], value) then
			table.insert(ops, { k = key, v = Wire.encode(value) })
			sent[key] = Persistence.copy(value)
		end
	end
	for key in sent do
		if profile[key] == nil then
			table.insert(ops, { k = key, d = true })
			sent[key] = nil
		end
	end
	return ops
end

local function flushReplication()
	local now = os.clock()
	for player, session in sessions do
		if
			session.replicateDue
			and player.Parent == Players
			and now - session.replicatedAt >= REPLICATE_SECONDS
		then
			session.replicateDue = false
			session.replicatedAt = now
			local view = visibleProfile(session.profile)
			if session.sent then
				local ops = diff(session.sent, view)
				if #ops > 0 then
					patch:FireClient(player, ops)
				end
			else
				session.sent = Persistence.copy(view)
				updated:FireClient(player, Wire.encode(view))
				if not session.canSave then
					toast:FireClient(player, "toast_load_failed")
				end
			end
		end
	end
end

local function load(player: Player)
	-- Reuse this token across retries in case a write succeeded before its response failed.
	local token = HttpService:GenerateGUID(false)
	local dataStore = store
	local profile: Profile? = nil
	local fresh = false
	local problem: string? = "DataStore unavailable"
	local uncertain = false
	if dataStore then
		profile, fresh, problem, uncertain = acquire(dataStore, player, token)
	end
	if player.Parent ~= Players or shuttingDown then
		if dataStore and (profile or uncertain) then
			releaseUnusedLock(dataStore, player, token)
		end
		return
	end

	local canSave = profile ~= nil
	if not profile then
		profile = ProfileService.DefaultProfile()
		profile.loadFailed = true
		warn(
			string.format("[ProfileService] load failed for %s: %s", player.Name, tostring(problem))
		)
	end
	sessions[player] = {
		profile = profile,
		token = token,
		fresh = fresh,
		canSave = canSave,
		dirty = false,
		saving = false,
		replicateDue = false,
		replicatedAt = -math.huge,
		playAt = os.clock(),
	}
	ProfileService.Mutate(player, function(p)
		p.joins += 1
		p.lastJoin = os.time()
	end)
	if canSave then
		print(string.format("[ProfileService] profile loaded v%d for %s", profile.v, player.Name))
	elseif dataStore and uncertain then
		-- The last response may have been lost after acquiring our token.
		releaseUnusedLock(dataStore, player, token)
	end
	for _, hook in loadedHooks do
		task.spawn(hook, player)
	end
end

-- A clean save still renews the lease. A mutation during UpdateAsync marks the next save dirty.
local function save(player: Player, session: Session, release: boolean): SaveResult
	local dataStore = store
	if not dataStore or not session.canSave then
		return "stopped"
	end
	if not release and not prepareSave(player) then
		return "stopped"
	end
	local wasDirty = session.dirty
	local snapshot = if wasDirty then Persistence.copy(session.profile) else nil
	if snapshot and not Persistence.finiteTree(snapshot) then
		warn("[ProfileService] invalid numeric state for " .. player.Name)
		return "stopped"
	end

	session.saving = true
	session.dirty = false
	local owned = false
	local ok, problem = pcall(function()
		dataStore:UpdateAsync(keyFor(player), function(old: any)
			owned = typeof(old) == "table" and Persistence.owns(old._lock, JOB_ID, session.token)
			if not owned then
				return nil
			end
			local record = snapshot or table.clone(old)
			record.loadFailed = nil
			record._lock = if release
				then nil
				else { job = JOB_ID, token = session.token, at = os.time() }
			return record
		end)
	end)
	session.saving = false
	if not ok then
		session.dirty = session.dirty or wasDirty
		warn(
			string.format("[ProfileService] save failed for %s: %s", player.Name, tostring(problem))
		)
		return "retry"
	end
	if not owned then
		session.canSave = false
		warn("[ProfileService] session lock no longer held for " .. player.Name)
		if sessions[player] == session then
			ProfileService.Mutate(player, function(p)
				p.loadFailed = true
			end)
			if session.sent and player.Parent == Players then
				toast:FireClient(player, "toast_load_failed")
			end
		end
		return "stopped"
	end
	return "saved"
end

function ProfileService.SaveNow(player: Player): boolean
	local session = sessions[player]
	if not session then
		return false
	end
	while session.saving and sessions[player] == session do
		task.wait()
	end
	if sessions[player] ~= session or save(player, session, false) ~= "saved" then
		return false
	end
	if sessions[player] == session and player.Parent == Players then
		toast:FireClient(player, "toast_saved")
	end
	return true
end

local function recordPlayTime(player: Player, session: Session, now: number)
	local seconds = math.floor(now - session.playAt)
	if seconds > 0 then
		session.playAt += seconds
		ProfileService.Mutate(player, function(p)
			p.stats.playSeconds += seconds
		end)
	end
end

local function beginRelease(player: Player)
	local session = sessions[player]
	if not session then
		return
	end
	recordPlayTime(player, session, os.clock())
	local prepared = session.canSave and prepareSave(player)
	sessions[player] = nil
	if not session.canSave then
		return
	end

	-- Register before yielding so shutdown also awaits already-detached writes.
	closingWrites += 1
	task.spawn(function()
		while session.saving do
			task.wait()
		end
		if not prepared then
			if store then
				releaseUnusedLock(store, player, session.token)
			end
			closingWrites -= 1
			return
		end
		for attempt = 1, DATASTORE_ATTEMPTS do
			if save(player, session, true) ~= "retry" then
				break
			end
			if attempt < DATASTORE_ATTEMPTS then
				task.wait(RETRY_SECONDS)
			end
		end
		closingWrites -= 1
	end)
end

function ProfileService.Start()
	local ok, result = pcall(DataStoreService.GetDataStore, DataStoreService, STORE_NAME)
	if ok then
		store = result
	else
		warn("[ProfileService] DataStore unavailable: " .. tostring(result))
	end

	RunService.Heartbeat:Connect(flushReplication)
	Players.PlayerRemoving:Connect(beginRelease)
	game:BindToClose(function()
		shuttingDown = true
		local deadline = os.clock() + CLOSE_SECONDS
		for player in sessions do
			beginRelease(player)
		end
		while (closingWrites > 0 or next(loading) ~= nil) and os.clock() < deadline do
			task.wait(0.1)
		end
		if closingWrites > 0 or next(loading) ~= nil then
			warn("[ProfileService] timed out waiting for DataStore operations at shutdown")
		end
	end)

	local function added(player: Player)
		if shuttingDown or loading[player] or sessions[player] then
			return
		end
		loading[player] = true
		task.spawn(function()
			load(player)
			loading[player] = nil
		end)
	end
	Players.PlayerAdded:Connect(added)
	for _, player in Players:GetPlayers() do
		added(player)
	end

	task.spawn(function()
		while not shuttingDown do
			task.wait(PLAY_TICK_SECONDS)
			local now = os.clock()
			for player, session in sessions do
				recordPlayTime(player, session, now)
			end
		end
	end)
	task.spawn(function()
		while not shuttingDown do
			task.wait(Config.game.autosaveSeconds)
			for player, session in sessions do
				if not session.saving then
					task.spawn(save, player, session, false)
				end
			end
		end
	end)
end

return ProfileService
