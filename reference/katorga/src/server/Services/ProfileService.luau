--!strict
-- Player profiles (schema v3). In-memory per player, saved on leave / close / every AUTOSAVE_SECONDS.
-- Rules: failed load => session never saved; all mutations via Mutate(); client gets copies only.
-- Session lock [27.10, before the auction]: the record carries _lock = {job, at}; only the server holding it loads
-- and saves the profile, so a player who hops servers can never act on an old copy (the classic trade dupe: sell on
-- server A, rejoin B before A saved, still own the item). A live lock is asked to let go (MessagingService) and
-- waited for; a lock older than LOCK_STALE_SECONDS (its server died) is taken over; if the lock is stolen anyway,
-- this server stops saving and kicks the player. Autosave refreshes the lock even when nothing changed.

local DataStoreService = game:GetService("DataStoreService")
local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Types = require(Shared.Types)
local Remotes = require(Shared.Remotes)
local Wire = require(Shared.Wire)
local Boosters = require(Shared.Boosters)
local Config = require(Shared.Config)
local Vault = require(Shared.Vault)
local Persistence = require(Shared.Persistence)
local Numbers = require(Shared.Numbers)
local StorageNames = require(Shared.StorageNames)

type Profile = Types.Profile
-- fresh: nothing was stored for this player before this load (a brand-new profile — ReferralService)
type Session = {
	profile: Profile,
	loadFailed: boolean,
	dirty: boolean,
	saving: boolean,
	token: string,
	fresh: boolean?,
	resetting: boolean?,
	resetCharacter: Model?, -- old body must never repopulate the cleared saved position
	closing: boolean?, -- one final release, shared by PlayerRemoving and BindToClose
}

local STORE_NAME = StorageNames.progress("PlayerProfiles_v3")
local SCHEMA_VERSION = 3
local AUTOSAVE_SECONDS = 120
local LOCK_STALE_SECONDS = 300 -- > 2 autosaves: a lock this old belongs to a dead server
local LOCK_WAIT_SECONDS = 20 -- how long a join waits for another server to let go
local RELEASE_TOPIC = StorageNames.progress("ProfileRelease")
local JOB_ID = if game.JobId == "" then "studio" else game.JobId

local ProfileService = {}
local sessions: { [Player]: Session } = {}
local closingSessions: { [Session]: Player } = {} -- detached sessions still own an in-flight final write
local onLoaded: ((Player) -> ())? = nil -- set in Start: puts the character back at the logout spot
local loadedHooks: { (Player) -> () } = {} -- ProfileService.OnLoaded: settle pending boosters / auction steps
local store: DataStore? = nil
local testStore: DataStore? = nil
local function storeFor(player: Player): DataStore?
	if player.UserId < 0 and RunService:IsStudio() then
		local scope = require(script.Parent.TestSessionScope).Get()
		if scope then
			if not testStore then
				testStore = DataStoreService:GetDataStore(
					StorageNames.progress("PlayerProfiles_v3_QA"),
					scope
				)
			end
			return testStore
		end
	end
	return store
end
-- The whole profile goes to the client at most every REPLICATE_SECONDS: one dug block mutates it
-- 2–3 times (inventory, hunger, achievements), and sending each copy at 20 blocks a second flooded
-- the connection — dig confirmations then came seconds late and the client put the blocks back.
local REPLICATE_SECONDS = 0.1
local replicateDue: { [Player]: boolean } = {}
local replicatedAt: { [Player]: number } = {}

function ProfileService.defaultProfile(): Profile
	return {
		schemaVersion = SCHEMA_VERSION,
		level = 1,
		coins = 0,
		blocksTotal = 0,
		counters = {},
		inventory = { [1] = { id = "shovel", count = 1, level = 1, books = {} } }, -- starting shovel [владелец]
		caseContents = {},
		enderChest = {},
		artifacts = {},
		armor = {},
		selectedSlot = 1,
		professions = {
			xp = { mason = 0, surveyor = 0, blademaster = 0 },
			level = { mason = 0, surveyor = 0, blademaster = 0 },
			points = 0,
			upgrades = { blocks = 0, money = 0, mobs = 0 },
		},
		keys = {},
		passes = {},
		needs = { hygiene = 100, sleep = 100, toilet = 100 },
		hunger = Config.rules.survival.hunger.max,
		achievements = {},
		stats = {},
		nicknames = {},
		skills = {},
		trainer = { strength = 0, agility = 0, needs = 0 },
		location = "prison",
		operationIds = {},
		tutorial = require(Shared.Tutorial).new(),
	}
end

local function keyFor(player: Player): string
	return "User_" .. tostring(player.UserId)
end

-- DataStore turns sparse numeric keys into strings: inventory slots are stored as string keys
-- and restored to numbers on load.
local function encodeInventory(inv: { [number]: Types.ItemStack }): { [string]: Types.ItemStack }
	local out = {}
	for slot, stack in pairs(inv) do
		out[tostring(slot)] = Persistence.copy(stack)
	end
	return out
end

local function decodeInventory(inv: any): { [number]: Types.ItemStack }
	local out = {}
	if typeof(inv) == "table" then
		for slot, stack in pairs(inv) do
			local n = tonumber(slot)
			if n then
				out[n] = stack
			end
		end
	end
	return out
end

local function migrate(data: any): Profile
	local profile = ProfileService.defaultProfile()
	if typeof(data) == "table" and data.schemaVersion == SCHEMA_VERSION then
		for field, value in pairs(data) do
			(profile :: any)[field] = value
		end
		profile.inventory = decodeInventory(data.inventory)
		profile.enderChest = decodeInventory(data.enderChest)
		-- the Хранилище sections (Shared/Vault): a broken count is put back in 1 … MAX; slots of every possible
		-- section stay (a locked section can hold nothing, but nothing is ever dropped because of the count)
		profile.vaultSections = if Vault.unlocked(profile) > 1 then Vault.unlocked(profile) else nil
		for slot in pairs(profile.enderChest) do
			if slot < 1 or slot > Vault.SLOTS * Vault.MAX or slot ~= math.floor(slot) then
				profile.enderChest[slot] = nil
			end
		end
		-- Ancient overflow remains claimable if the player leaves during its non-modal roulette.
		local ancient = if typeof(data.caseContents) == "table"
			then data.caseContents.ancientCase
			else nil
		profile.caseContents = { ancientCase = decodeInventory(ancient) }
		if data.tutorial == nil then
			(profile :: any).tutorial = { version = 1, step = 4, legacy = true }
		end
	end
	-- older schemas are discarded on purpose during development (no live players yet)
	profile.schemaVersion = SCHEMA_VERSION
	if typeof(profile.nicknames) ~= "table" then
		profile.nicknames = {}
	end
	if typeof(profile.skills) ~= "table" then
		profile.skills = {}
	end
	if typeof(profile.trainer) ~= "table" then
		profile.trainer = { strength = 0, agility = 0, needs = 0 }
	end
	if not Config.faction(profile.faction) then
		profile.faction = nil
	end
	if typeof(profile.factionChanges) ~= "number" then
		profile.factionChanges = 0
	end
	if typeof(profile.gang) ~= "table" then
		profile.gang = nil
	elseif typeof((profile.gang :: any).id) ~= "string" then
		(profile.gang :: any).id = nil
	end
	if typeof(profile.gangOps) ~= "table" then
		profile.gangOps = nil
	end
	-- «Пригласить друга» / «Избранное» (ReferralService)
	if typeof(profile.referral) ~= "table" or typeof((profile.referral :: any).by) ~= "number" then
		profile.referral = nil
	end
	if typeof(profile.invites) ~= "table" then
		profile.invites = nil
	else
		local invites = profile.invites :: any
		invites.seen = if typeof(invites.seen) == "table" then invites.seen else {}
		invites.rewarded = if typeof(invites.rewarded) == "number" then invites.rewarded else 0
	end
	if typeof(profile.favorite) ~= "table" then
		profile.favorite = nil
	end
	if typeof(profile.thanked) ~= "table" then -- /thx (ChatCommandService)
		profile.thanked = nil
	end
	-- «Ежедневные награды» / Столовая (DailyService)
	local daily = profile.daily :: any
	if
		typeof(daily) ~= "table"
		or typeof(daily.streak) ~= "number"
		or typeof(daily.lastDay) ~= "number"
		or typeof(daily.lastAt) ~= "number"
	then
		profile.daily = nil
	end
	if typeof(profile.canteen) ~= "number" then
		profile.canteen = nil
	end
	if typeof(profile.settings) ~= "table" then
		profile.settings = nil
	else
		-- the chat's own feed is gone (Roblox's chat since 28.10): its old switches are dropped
		local settings = profile.settings :: any
		settings.chatFade, settings.chatGlobalOff, settings.chatButton = nil, nil, nil
	end
	-- [owner 02.11] Move the formerly hidden/right-hand camera control to the LEFT of the hotbar once.
	-- Other HUD positions survive; later edits of the new view button remain authoritative.
	if profile.hudLayoutVersion ~= 2 then
		if typeof(profile.hudLayout) == "table" then
			local layouts = table.clone(profile.hudLayout)
			for _, mode in ipairs({ "desktop", "mobile" }) do
				if typeof(layouts[mode]) == "table" then
					layouts[mode] = table.clone(layouts[mode])
					layouts[mode].view = nil
				end
			end
			profile.hudLayout = layouts
		end
		profile.hudLayoutVersion = 2
	end
	-- PRIS+ and the rubies (этап 8, Shared/PrisPlus)
	if
		typeof(profile.prisPlusUntil) ~= "number"
		or profile.prisPlusUntil ~= profile.prisPlusUntil
	then
		profile.prisPlusUntil = nil
	end
	if profile.noAuctionFee ~= true then
		profile.noAuctionFee = nil
	end
	-- paid auction announcements (AuctionService): whole credits; the queued one {lot, at}
	if typeof(profile.announceCredits) ~= "number" or profile.announceCredits < 1 then
		profile.announceCredits = nil
	else
		profile.announceCredits = math.floor(profile.announceCredits)
	end
	local pending = profile.announcePending
	if
		typeof(pending) ~= "table"
		or typeof(pending.lot) ~= "string"
		or typeof(pending.at) ~= "number"
	then
		profile.announcePending = nil
	end
	local rubies = profile.rubies
	profile.rubies = if typeof(rubies) == "number"
			and rubies == rubies
			and rubies > 0
			and rubies < math.huge
		then math.floor(rubies)
		else nil
	-- Numeric fragment keys can return as strings from DataStore, just like inventory slots.
	local rawArtifacts = profile.artifacts
	profile.artifacts = {}
	local function count(value: any): number
		return if typeof(value) == "number"
				and value == value
				and value < math.huge
			then math.max(0, math.floor(value))
			else 0
	end
	for _, tier in ipairs({ "common", "rare", "epic" }) do
		local raw = if typeof(rawArtifacts) == "table" then rawArtifacts[tier] else nil
		local state: Types.ArtifactTier = { fragments = {}, duplicates = 0, completed = 0 }
		if typeof(raw) == "table" then
			state.duplicates, state.completed = count(raw.duplicates), count(raw.completed)
			if typeof(raw.fragments) == "table" then
				for index = 1, 9 do
					state.fragments[index] = count(
						(raw.fragments :: any)[index] or (raw.fragments :: any)[tostring(index)]
					)
				end
			end
		end
		profile.artifacts[tier] = state
	end
	-- Tools never stack; old profiles may hold "bow ×N" from before the bow was a tool [владелец 26.10]:
	-- split such stacks into free slots of the same container (the ender chest holds what does not fit).
	local chestSlots = Vault.SLOTS * Vault.unlocked(profile) -- only into the open sections
	local function split(
		container: { [number]: Types.ItemStack },
		size: number,
		spill: { [number]: Types.ItemStack }?
	)
		for slot = 1, size do
			local stack = container[slot]
			if stack and Config.tools[stack.id] and (stack.count or 1) > 1 then
				local extra = stack.count - 1
				stack.count = 1
				for _, target in ipairs({ container, spill or container }) do
					for free = 1, if target == container then size else chestSlots do
						if extra > 0 and not target[free] then
							target[free] = { id = stack.id, count = 1, level = stack.level }
							extra -= 1
						end
					end
				end
			end
		end
	end
	split(profile.inventory, 36, profile.enderChest)
	split(profile.enderChest, chestSlots)
	-- v3 remains compatible. «Копатель (<блок>)» cards [27.10] replace the tool chains (21.10) and the digger_*
	-- keys. Existing claimed tiers stay; unclaimed counters are evaluated by AchievementService.
	for _, old in ipairs({ "pickaxe", "shovel", "axe", "sword" }) do
		profile.achievements[old] = nil
		profile.counters[old .. (if old == "sword" then "_kills" else "_blocks")] = nil
	end
	for id in pairs(profile.achievements) do
		if string.sub(id, 1, 7) == "digger_" then
			profile.achievements[id] = nil
		end
	end
	-- Current v3 counters may cross a milestone through AoE while offline catch-up is pending.
	-- Missing claimed tiers are unclaimed, never silently converted into paid rewards.
	if typeof(profile.dug) ~= "table" then
		profile.dug = nil
	end
	if typeof(profile.boosters) ~= "table" then
		profile.boosters = nil
	end
	if typeof(profile.auction) ~= "table" then
		profile.auction = nil
	else
		for _, field in ipairs({ "lots", "pendingSells", "pendingBuys", "returns" }) do
			if typeof((profile.auction :: any)[field]) ~= "table" then
				(profile.auction :: any)[field] = {}
			end
		end
	end
	if typeof(profile.pendingBoosters) ~= "table" then
		profile.pendingBoosters = nil
	end
	if typeof(profile.activeBoosters) ~= "table" then
		profile.activeBoosters = nil
	else
		Boosters.prune(profile)
	end
	local hunger = profile.hunger
	profile.hunger = if typeof(hunger) == "number" and hunger == hunger
		then math.clamp(hunger, 0, Config.rules.survival.hunger.max)
		else Config.rules.survival.hunger.max
	if
		typeof(profile.locale) ~= "string"
		or not table.find(Config.rules.ui.locales, profile.locale)
	then
		profile.locale = nil
	end
	return profile
end

-- Takes the profile's session lock and returns the stored data. Retries while another live server holds it (asking
-- it to let go); false + "locked" when it never does.
local function acquire(player: Player, token: string): (boolean, any)
	local deadline = os.clock() + LOCK_WAIT_SECONDS
	local asked = false
	while true do
		local lockedBy: string? = nil
		local data: any = nil
		local ok, err = pcall(function()
			(storeFor(player) :: DataStore):UpdateAsync(keyFor(player), function(old: any)
				local lock = if typeof(old) == "table" then old._lock else nil
				if
					typeof(lock) == "table"
					and not Persistence.owns(lock, JOB_ID, token)
					and os.time() - (tonumber(lock.at) or 0) < LOCK_STALE_SECONDS
				then
					lockedBy = lock.job
					return nil -- leave it as it is
				end
				lockedBy = nil
				data = old
				local new = if typeof(old) == "table" then Persistence.copy(old) else {}
				new._lock = { job = JOB_ID, token = token, at = os.time() }
				return new
			end)
		end)
		if not ok then
			return false, err
		end
		if not lockedBy then
			if typeof(data) == "table" then
				data._lock = nil
			end
			return true, data
		end
		if not player.Parent or os.clock() > deadline then
			return false, "locked"
		end
		if not asked then
			asked = true
			pcall(function()
				MessagingService:PublishAsync(
					RELEASE_TOPIC,
					{ userId = player.UserId, job = lockedBy }
				)
			end)
		end
		task.wait(2)
	end
end

local function load(player: Player, retryToken: string?)
	player:SetAttribute("ProfileState", "loading")
	-- A failed acquire may have applied its lock before the response was lost. Retry the
	-- exact acquisition token, never contest our own fresh lock with a different token.
	local token = retryToken or HttpService:GenerateGUID(false)
	local ok, result = false, nil
	if store then
		ok, result = acquire(player, token)
		if not ok and result == "locked" then
			player:Kick(
				"Профиль ещё открыт на другом сервере. Зайдите через минуту. / Your profile is still open on another server, rejoin in a minute."
			)
			return
		end
	elseif RunService:IsStudio() and game.GameId == 0 then
		-- An unpublished local copy can be played with a fresh, in-memory profile.
		ok = true
	end
	if ok and not Persistence.finiteTree(result) then
		ok, result = false, "non-finite saved profile; refusing replacement"
	end
	local session: Session = {
		token = token,
		profile = migrate(if ok then result else nil),
		loadFailed = not ok,
		dirty = false,
		saving = false,
		-- nil, or only the lock acquire wrote (the first session died before its first save): a brand-new player
		fresh = ok and (typeof(result) ~= "table" or result.schemaVersion == nil),
	}
	if not ok then
		warn(
			string.format(
				"[ProfileService] load failed for %s (%s); session will NOT be saved",
				player.Name,
				tostring(result)
			)
		)
	end
	if not player.Parent then
		-- left while the lock was being taken: give it back at once
		if ok and store then
			pcall(function()
				(storeFor(player) :: DataStore):UpdateAsync(keyFor(player), function(old: any)
					if
						typeof(old) == "table"
						and typeof(old._lock) == "table"
						and Persistence.owns(old._lock, JOB_ID, token)
					then
						old._lock = nil
						return old
					end
					return nil
				end)
			end)
		end
		return
	end
	sessions[player] = session
	player:SetAttribute("ProfileState", if session.loadFailed then "error" else "ready")
	ProfileService.Replicate(player)
	if onLoaded then
		onLoaded(player)
	end
	if not session.loadFailed then
		for _, hook in ipairs(loadedHooks) do
			task.spawn(hook, player)
		end
	end
end

local function save(player: Player, session: Session, release: boolean?, transformed: any?): boolean
	if session.loadFailed or session.saving or not store then
		return false
	end
	if
		not Persistence.finiteTree(session.profile)
		or not Numbers.integer(session.profile.coins)
		or not Numbers.integer((session.profile :: any).crystals or 0)
		or not Numbers.integer((session.profile :: any).rubies or 0)
	then
		warn("[ProfileService] invalid numeric state; save refused for " .. player.Name)
		return false
	end
	session.saving = true
	local dirtyBefore = session.dirty
	session.dirty = false -- a Mutate during the write marks it dirty again
	local snapshot = Persistence.copy(transformed or session.profile) :: any
	snapshot.inventory = encodeInventory(snapshot.inventory)
	snapshot.enderChest = encodeInventory(snapshot.enderChest)
	local cases, artifacts = snapshot.caseContents, snapshot.artifacts
	snapshot.caseContents = {}
	snapshot.artifacts = {}
	for tier, state in pairs(artifacts) do
		local fragments: { [string]: number } = {}
		for index, amount in pairs(state.fragments) do
			fragments[tostring(index)] = amount
		end
		snapshot.artifacts[tier] = {
			fragments = fragments,
			duplicates = state.duplicates,
			completed = state.completed,
		}
	end
	for id, contents in pairs(cases) do
		snapshot.caseContents[id] = encodeInventory(contents)
	end
	local stolen = false
	local ok, err = pcall(function()
		(storeFor(player) :: DataStore):UpdateAsync(keyFor(player), function(old: any)
			local lock = if typeof(old) == "table" then old._lock else nil
			if not Persistence.owns(lock, JOB_ID, session.token) then
				stolen = true
				return nil
			end
			snapshot._lock = if release
				then nil
				else { job = JOB_ID, token = session.token, at = os.time() }
			return snapshot
		end)
	end)
	session.saving = false
	if ok and stolen then
		-- another server took the profile over (this one stalled past LOCK_STALE_SECONDS): never write again
		session.loadFailed = true
		warn(string.format("[ProfileService] %s: session lock lost, saves stopped", player.Name))
		if player.Parent then
			player:Kick(
				"Профиль открыт на другом сервере. / Your profile was opened on another server."
			)
		end
		return false
	end
	if not ok then
		session.dirty = session.dirty or dirtyBefore
		warn(string.format("[ProfileService] save failed for %s: %s", player.Name, tostring(err)))
		return false
	end
	return true
end

-- Register before detaching or yielding: shutdown must also await players already leaving.
local function beginRelease(player: Player, session: Session)
	if session.closing then
		return
	end
	session.closing = true
	closingSessions[session] = player
	if sessions[player] == session then
		sessions[player] = nil
	end
	task.spawn(function()
		local ok, err = pcall(function()
			while session.saving do
				task.wait(0.1)
			end
			save(player, session, true)
		end)
		closingSessions[session] = nil
		if not ok then
			warn("[ProfileService] final save failed for " .. player.Name .. ": " .. tostring(err))
		end
	end)
end

-- Writes the profile now and waits for it (an autosave in flight first). Steps that touch shared stores (the auction,
-- global boosters) call it after recording their pending step in the profile and before the outside write, so a
-- crash can never leave the outside effect without the profile change. false = not saved: abort the step.
function ProfileService.SaveNow(player: Player): boolean
	local session = sessions[player]
	if not session or session.loadFailed then
		return false
	end
	if not store then
		return RunService:IsStudio() -- Studio without API access: nothing is ever saved, let the steps run
	end
	while session.saving do
		task.wait(0.1)
	end
	if sessions[player] ~= session then
		return false
	end
	return save(player, session)
end

-- Confirm a transformed checkpoint before making its grants spendable. The transform must be
-- synchronous and side-effect-free outside its supplied profile; it runs once on a deep copy
-- and, after successful persistence, once on current live state (which may have changed meanwhile).
function ProfileService.MutateDurable(player: Player, transform: (any) -> ()): boolean
	local session = sessions[player]
	if not session or session.loadFailed or not store then
		return false
	end
	while session.saving do
		task.wait(0.1)
	end
	if sessions[player] ~= session then
		return false
	end
	local staged = Persistence.copy(session.profile)
	transform(staged)
	if not Persistence.finiteTree(staged) or not Numbers.integer(staged.coins) then
		return false
	end
	if not save(player, session, false, staged) then
		return false
	end
	-- A leave may detach this session while UpdateAsync yields. Its final release must preserve
	-- this acknowledged checkpoint even though the departed caller may no longer export rewards.
	transform(session.profile)
	session.dirty = true
	if sessions[player] ~= session then
		return false
	end
	ProfileService.Replicate(player)
	return true
end

-- Called only after CreativeService validates an own-player, single-use confirmation.
-- Unknown/idempotency fields and paid entitlements survive; session acquisition stays unchanged.
function ProfileService.ResetOwnProgress(player: Player): (boolean, string?)
	local session = sessions[player]
	local Reset = require(Shared.ProgressReset)
	if not session or session.loadFailed or session.resetting or not store then
		return false, "release_reset_failed"
	end
	if Reset.blocked(session.profile) then
		return false, "release_reset_busy"
	end
	session.resetting = true
	local ok, saved = pcall(ProfileService.MutateDurable, player, function(p: any)
		Reset.apply(p, ProfileService.defaultProfile())
	end)
	if ok and saved then
		session.resetCharacter = player.Character
	end
	session.resetting = nil
	if not ok or not saved then
		-- The write might have applied. Never leave the old inventory spendable after an uncertain reset.
		session.loadFailed = true
		local strings = require(Shared.Strings)
		player:Kick(strings.t("release_reset_reload", strings.localeOf(player)))
		return false, "release_reset_failed"
	end
	session.fresh = false -- reset never replays referral/new-account rewards
	ProfileService.Replicate(player)
	return true, nil
end

-- Runs fn(player) after each successful profile load (pending booster / auction steps are settled there).
function ProfileService.OnLoaded(fn: (Player) -> ())
	table.insert(loadedHooks, fn)
end

function ProfileService.Get(player: Player): Profile?
	local session = sessions[player]
	return if session then session.profile else nil
end

-- false when the profile failed to load (a default one that is never saved): keep it out of the global tops
function ProfileService.IsReal(player: Player): boolean
	local session = sessions[player]
	return session ~= nil and not session.loadFailed and not session.resetting
end

-- An unfinished shared transfer cannot be exported into another durable account or world item.
function ProfileService.CanExport(player: Player): boolean
	local session = sessions[player]
	return session ~= nil
		and not session.loadFailed
		and not session.resetting
		and (session.profile :: any).storageTransfer == nil
		and (session.profile :: any).storageDeath == nil
		and (session.profile :: any).bossRewardPending == nil
		and (session.profile :: any).playerTransfer == nil
		and (session.profile :: any).playerTransferIncoming == nil
end

-- true when this session started a brand-new profile (no record existed): the invite reward is for new players only
function ProfileService.IsNew(player: Player): boolean
	local session = sessions[player]
	return session ~= nil and not session.loadFailed and session.fresh == true
end

function ProfileService.Mutate(player: Player, mutator: (Profile) -> ())
	local session = sessions[player]
	if not session or session.resetting then
		return
	end
	mutator(session.profile)
	session.dirty = true
	ProfileService.Replicate(player)
end

function ProfileService.Replicate(player: Player)
	local session = sessions[player]
	if session then
		local character = player.Character
		local stack = session.profile.inventory[session.profile.selectedSlot]
		if character then
			local held = if stack then stack.id .. ":" .. tostring(stack.level or 0) else ""
			if character:GetAttribute("HeldItem") ~= held then
				character:SetAttribute("AttackResetAt", workspace:GetServerTimeNow())
			end
			character:SetAttribute("HeldItem", held)
			character:SetAttribute("HeldEnchanted", require(Shared.ItemEnchantment).active(stack))
			local armor: { string } = {}
			for _, id in ipairs({ "helmet", "chestplate", "leggings", "boots" }) do
				local piece = session.profile.armor[id]
				if piece then
					table.insert(armor, id .. ":" .. tostring(piece.level or 1))
				end
			end
			character:SetAttribute("Armor", table.concat(armor, ","))
		end
		player:SetAttribute("LocaleManual", session.profile.locale ~= nil)
		player:SetAttribute(
			"Locale",
			session.profile.locale or player:GetAttribute("AutoLocale") or "en"
		)
		replicateDue[player] = true
	end
end

-- Deltas: the client gets the whole profile once (ProfileUpdated), then only what changed since the
-- last send (ProfilePatch) — a changed top-level value, or the changed entries of a top-level table
-- (one inventory slot, one counter). Roblox: "replicate only what changed" (docs/research/server-scaling.md).
local sentCopies: { [Player]: { [string]: any } } = {}

local function deepEqual(a: any, b: any): boolean
	if a == b then
		return true
	end
	if typeof(a) ~= "table" or typeof(b) ~= "table" then
		return false
	end
	for key, value in pairs(a) do
		if not deepEqual(value, b[key]) then
			return false
		end
	end
	for key in pairs(b) do
		if a[key] == nil then
			return false
		end
	end
	return true
end

local function deepCopy(value: any): any
	if typeof(value) ~= "table" then
		return value
	end
	local out = {}
	for key, item in pairs(value) do
		out[key] = deepCopy(item)
	end
	return out
end

-- ops: { k = field, c = entry key?, v = Wire-encoded value?, d = true when removed }
local function diff(sent: { [string]: any }, profile: { [string]: any }): { any }
	local ops = {}
	for key, value in pairs(profile) do
		local old = sent[key]
		if not deepEqual(old, value) then
			if typeof(value) == "table" and typeof(old) == "table" then
				for child, item in pairs(value) do
					if not deepEqual(old[child], item) then
						table.insert(ops, { k = key, c = child, v = Wire.encode(item) })
						old[child] = deepCopy(item)
					end
				end
				for child in pairs(old) do
					if value[child] == nil then
						table.insert(ops, { k = key, c = child, d = true })
						old[child] = nil
					end
				end
			else
				table.insert(ops, { k = key, v = Wire.encode(value) })
				sent[key] = deepCopy(value)
			end
		end
	end
	for key in pairs(sent) do
		if profile[key] == nil then
			table.insert(ops, { k = key, d = true })
			sent[key] = nil
		end
	end
	return ops
end

local function flushReplication()
	local now = os.clock()
	for player in pairs(replicateDue) do
		local session = sessions[player]
		if not session or player.Parent == nil then
			replicateDue[player] = nil
		elseif now - (replicatedAt[player] or -math.huge) >= REPLICATE_SECONDS then
			replicateDue[player] = nil
			replicatedAt[player] = now
			local sent = sentCopies[player]
			if not sent then
				sentCopies[player] = deepCopy(session.profile)
				Remotes.event("ProfileUpdated")
					:FireClient(player, Wire.encode(session.profile), not session.loadFailed)
			else
				local ops = diff(sent, session.profile :: any)
				if #ops > 0 then
					Remotes.event("ProfilePatch"):FireClient(player, ops)
				end
			end
		end
	end
end

function ProfileService.Start()
	RunService.Heartbeat:Connect(flushReplication)
	-- Studio-only test hook (ServerStorage.ProfileDebug): execute_luau runs in its own VM, so it cannot
	-- reach this module's sessions; the BindableFunction exposes get / give / coins / set for QA.
	if game:GetService("RunService"):IsStudio() then
		local InventoryService = require(script.Parent.InventoryService) :: any
		local debugApi = Instance.new("BindableFunction")
		debugApi.Name = "ProfileDebug"
		debugApi.OnInvoke = function(op: string, userId: number, a: any, b: any, c: any): any
			local player = Players:GetPlayerByUserId(userId)
			if not player then
				return nil
			end
			-- tables cross the BindableFunction Wire-encoded too (sparse slots would be cut at the first gap)
			if op == "get" then
				return Wire.encode(ProfileService.Get(player))
			elseif op == "give" then
				local overflow = 0
				local inside = ""
				ProfileService.Mutate(player, function(profile)
					overflow = InventoryService.add(profile, a, b or 1, c)
					for slot = 1, 36 do
						local stack = profile.inventory[slot]
						if stack then
							inside ..= slot .. "=" .. stack.id .. "x" .. stack.count .. ","
						end
					end
				end)
				return { overflow = overflow, inside = inside }
			elseif op == "coins" then
				ProfileService.Mutate(player, function(profile)
					profile.coins += a
				end)
				return true
			elseif op == "lastpos" then
				local session = sessions[player]
				if session then
					session.profile.lastPosition = a
				end
				return true
			elseif op == "set" then
				ProfileService.Mutate(player, function(profile)
					(profile :: any)[a] = Wire.decode(b)
				end)
				return true
			end
			return nil
		end
		debugApi.Parent = game:GetService("ServerStorage")
	end
	-- [владелец 22.10: «настройка в меню, чтобы двигать кнопки»] the player's HUD layout (src/client/HudLayout.luau):
	-- per mode ("mobile" / "desktop") element id → {x, y}, the anchor point as a fraction of the screen; nil
	-- for a mode resets it. Only known ids and positions on the screen are kept; one save a second.
	local HUD_IDS = {
		requirements = true,
		attack = true,
		eat = true,
		menu = true,
		inventory = true,
		stats = true,
		effects = true,
		jump = true,
		toasts = true,
		boosters = true,
		view = true,
		sprint = true,
	}
	local lastLayoutAt: { [Player]: number } = {}
	Players.PlayerRemoving:Connect(function(player)
		lastLayoutAt[player] = nil
	end)
	Remotes.event("SetHudLayout").OnServerEvent
		:Connect(function(player: Player, mode: any, layout: any)
			if mode ~= "mobile" and mode ~= "desktop" then
				return
			end
			if os.clock() - (lastLayoutAt[player] or 0) < 1 then
				return
			end
			lastLayoutAt[player] = os.clock()
			local clean: { [string]: { number } }? = nil
			if typeof(layout) == "table" then
				clean = {}
				for id, pos in pairs(layout) do
					if
						typeof(id) == "string"
						and HUD_IDS[id]
						and typeof(pos) == "table"
						and typeof(pos[1]) == "number"
						and typeof(pos[2]) == "number"
						and pos[1] >= 0
						and pos[1] <= 1
						and pos[2] >= 0
						and pos[2] <= 1
					then
						-- the third number: an optional button shown (1) or removed (0); the fourth: the
						-- player's size for it, 0.5–2 (HudLayout)
						local size = if typeof(pos[4]) == "number" and pos[4] == pos[4]
							then pos[4]
							else 1
						(clean :: any)[id] = {
							math.floor(pos[1] * 10000 + 0.5) / 10000,
							math.floor(pos[2] * 10000 + 0.5) / 10000,
							if pos[3] == 0 then 0 else 1,
							math.floor(math.clamp(size, 0.5, 2) * 100 + 0.5) / 100,
						}
					end
				end
			end
			ProfileService.Mutate(player, function(p)
				local all = table.clone((p :: any).hudLayout or {}) -- a new table: the profile diff sees the change
				all[mode] = clean;
				(p :: any).hudLayout = all
			end)
		end)
	-- the settings window: one value at a time, checked by its key
	local SETTINGS: { [string]: (any) -> boolean } = {
		hideRequirements = function(v)
			return typeof(v) == "boolean"
		end,
		trackedUpgrade = function(v)
			return require(Shared.Tutorial).validTrackingTarget(v)
		end,
		volume = function(v)
			return typeof(v) == "number" and v == v and v >= 0 and v <= 1
		end,
		muted = function(v)
			return typeof(v) == "boolean"
		end,
		hideToasts = function(v)
			return typeof(v) == "boolean"
		end,
		hideBoosters = function(v)
			return typeof(v) == "boolean"
		end,
		autosellOff = function(v)
			return typeof(v) == "boolean"
		end,
		autosellTextOff = function(v)
			return typeof(v) == "boolean"
		end,
		-- the chat (этап 3): tips, transfers to me, gifts to me, the other players hidden
		tipsOff = function(v)
			return typeof(v) == "boolean"
		end,
		payOff = function(v)
			return typeof(v) == "boolean"
		end,
		giftOff = function(v)
			return typeof(v) == "boolean"
		end,
		hidePlayers = function(v)
			return typeof(v) == "boolean"
		end,
		-- PRIS+ (этап 8): auto-dig, night, AppleSkin, the enchant particles (the client acts on them; harmless
		-- without PRIS+ — the /pp window only offers them to subscribers)
		autoDig = function(v)
			return typeof(v) == "boolean"
		end,
		night = function(v)
			return typeof(v) == "boolean"
		end,
		appleSkinOff = function(v)
			return typeof(v) == "boolean"
		end,
		enchantFxOff = function(v)
			return typeof(v) == "boolean"
		end,
		-- the chat (ChatWindow sets Roblox's chat window up with them): three-step choices and switches
		chatSize = function(v)
			return v == 1 or v == 2 or v == 3
		end,
		chatBack = function(v)
			return v == 1 or v == 2 or v == 3
		end,
		bubblesOff = function(v)
			return typeof(v) == "boolean"
		end,
		chatOff = function(v)
			return typeof(v) == "boolean"
		end,
		auctionAdsOff = function(v)
			return typeof(v) == "boolean"
		end,
	}
	local Preferences = require(ReplicatedStorage.Shared.Preferences)
	for key in pairs(Preferences.numbers) do
		SETTINGS[key] = function(value)
			return Preferences.valid(key, value)
		end
	end
	Remotes.event("SetSetting").OnServerEvent:Connect(function(player: Player, key: any, value: any)
		local check = typeof(key) == "string" and SETTINGS[key]
		if not check or not check(value) then
			return
		end
		if typeof(value) == "number" then
			value = math.floor(value * 20 + 0.5) / 20
		end
		ProfileService.Mutate(player, function(p)
			local settings: any = table.clone(p.settings or {}) -- a new table: the profile diff sees the change
			settings[key] = value
			p.settings = settings
		end)
	end)
	-- Device/account locale is session-only; it must never become a stored manual choice.
	Remotes.event("SetAutoLocale").OnServerEvent:Connect(function(player: Player, locale: any)
		if typeof(locale) ~= "string" or not table.find(Config.rules.ui.locales, locale) then
			return
		end
		player:SetAttribute("AutoLocale", locale)
		local profile = ProfileService.Get(player)
		if not profile or not profile.locale then
			player:SetAttribute("LocaleManual", false)
			player:SetAttribute("Locale", locale)
		end
	end)
	Remotes.event("SetLocale").OnServerEvent:Connect(function(player: Player, locale: any)
		if typeof(locale) ~= "string" or not table.find(Config.rules.ui.locales, locale) then
			return
		end
		local profile = ProfileService.Get(player)
		if not profile or profile.locale == locale then
			return
		end
		ProfileService.Mutate(player, function(p)
			p.locale = locale
		end)
	end)
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	else
		warn(
			"[ProfileService] DataStore unavailable ("
				.. tostring(result)
				.. "); running without saves"
		)
	end

	-- [владелец 21.10] rejoining puts you where you left: the position is stored every few seconds
	-- and on leave, and applied to the first character of the next session (not after a death).
	local restored: { [Player]: boolean } = {}
	local restoring: { [Player]: Model } = {}
	local function rememberPosition(player: Player)
		-- nothing is written until the character has been put back at the saved spot: otherwise a slow
		-- DataStore load let this overwrite the logout spot with the spawn position (bug 21.10)
		if not restored[player] then
			return
		end
		local session = sessions[player]
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if
			session
			and not session.resetting
			and session.resetCharacter ~= character
			and root
			and root:IsA("BasePart")
			and humanoid
			and humanoid.Health > 0
		then
			local p = root.Position
			if p.Y > -200 then
				session.profile.lastPosition = {
					math.floor(p.X * 10) / 10,
					math.floor(p.Y * 10) / 10,
					math.floor(p.Z * 10) / 10,
				}
				session.profile.lastSeen = os.time()
				session.dirty = true
			end
		end
	end
	local function restorePosition(player: Player, character: Model)
		-- runs on spawn and again when the profile finishes loading (however long that takes)
		local session = sessions[player]
		if not session or session.loadFailed or restoring[player] == character then
			return
		end
		restoring[player] = character
		local function arrived()
			local root = character:FindFirstChild("HumanoidRootPart")
			if
				player.Character == character
				and root
				and root:IsA("BasePart")
				and session.resetCharacter ~= character
			then
				session.resetCharacter = nil
				restored[player] = true
				character:SetAttribute("ArrivalPosition", root.Position)
				character:SetAttribute("SpawnReady", true)
			end
			if restoring[player] == character then
				restoring[player] = nil
			end
		end
		if restored[player] then
			character:WaitForChild("HumanoidRootPart", 10)
			arrived()
			return
		end
		local profile = session.profile
		local pos = profile.lastPosition
		if typeof(pos) ~= "table" or #pos ~= 3 then
			character:WaitForChild("HumanoidRootPart", 10)
			arrived()
			return
		end
		-- [сеть R1] the spot is kept for 20 min after leaving, then the join starts at the spawn (no profile.lastSeen =
		-- a spot saved before this rule: still restored once). A spot with nothing under it was in a copy that is
		-- gone (a gang house lives only while its gang is inside): the spawn too
		local seen = profile.lastSeen
		local expired = typeof(seen) == "number"
			and os.time() - seen > Config.rules.teleport.rejoinReturnSeconds
		local floor =
			workspace:Raycast(Vector3.new(pos[1], pos[2] + 2, pos[3]), Vector3.new(0, -60, 0))
		if expired or not floor then
			profile.lastPosition = nil
			profile.location = "prison"
			session.dirty = true
			ProfileService.Replicate(player)
			character:WaitForChild("HumanoidRootPart", 10)
			arrived()
			return
		end
		local root = character:WaitForChild("HumanoidRootPart", 10)
		if workspace.StreamingEnabled then
			-- the logout spot may not be loaded on the device yet (StreamingEnabled)
			pcall(player.RequestStreamAroundAsync, player, Vector3.new(pos[1], pos[2], pos[3]), 5)
		end
		if root and root:IsA("BasePart") and player.Character == character then
			require(script.Parent.FallService).Reset(player)
			character:PivotTo(CFrame.new(pos[1], pos[2] + 1, pos[3]))
			arrived()
		end
		if restoring[player] == character then
			restoring[player] = nil
		end
	end
	onLoaded = function(player: Player)
		if player.Character then
			task.spawn(restorePosition, player, player.Character)
		end
	end
	local bootstrapAt: { [Player]: number } = {}
	local retrying: { [Player]: boolean } = {}
	Remotes.event("ClientBootstrap").OnServerEvent:Connect(function(player: Player, retry: any)
		local now = os.clock()
		if now - (bootstrapAt[player] or -math.huge) < 2 or retrying[player] then
			return
		end
		bootstrapAt[player] = now
		local session = sessions[player]
		if retry == true and session and session.loadFailed then
			retrying[player] = true
			restored[player] = nil
			load(player, session.token)
			retrying[player] = nil
		end
		-- Initial replication can precede the HUD listener. Explicit resync is read-only.
		if player.Character and player.Character:GetAttribute("SpawnReady") ~= true then
			task.spawn(restorePosition, player, player.Character)
		elseif player.Character and not restoring[player] and ProfileService.IsReal(player) then
			-- Mine/world safety may legitimately move a ready character before its client
			-- observed the restored pose. Refresh proof from this server's current root.
			local root = player.Character:FindFirstChild("HumanoidRootPart")
			if root and root:IsA("BasePart") then
				player.Character:SetAttribute("ArrivalPosition", root.Position)
			end
		end
		sentCopies[player] = nil
		ProfileService.Replicate(player)
	end)
	local function added(player: Player)
		player.CharacterAdded:Connect(function(character)
			ProfileService.Replicate(player)
			task.spawn(restorePosition, player, character)
		end)
		if player.Character then
			task.spawn(restorePosition, player, player.Character)
		end
		task.spawn(load, player)
	end
	task.spawn(function()
		while true do
			task.wait(5)
			for _, player in ipairs(Players:GetPlayers()) do
				rememberPosition(player)
			end
		end
	end)
	Players.PlayerAdded:Connect(added)
	for _, player in ipairs(Players:GetPlayers()) do
		added(player)
	end
	Players.PlayerRemoving:Connect(function(player)
		bootstrapAt[player], retrying[player] = nil, nil
		replicateDue[player] = nil
		replicatedAt[player] = nil
		sentCopies[player] = nil
		rememberPosition(player)
		restored[player] = nil
		restoring[player] = nil
		local session = sessions[player]
		if session then
			beginRelease(player, session)
		end
	end)
	-- another server waits for a profile this server holds: the player joined there (a double login or a hop
	-- before this server noticed the leave) — kick here, PlayerRemoving saves and lets go of the lock
	task.spawn(function()
		pcall(function()
			MessagingService:SubscribeAsync(RELEASE_TOPIC, function(message)
				local data = message.Data
				if typeof(data) ~= "table" or data.job ~= JOB_ID then
					return
				end
				local player = Players:GetPlayerByUserId(tonumber(data.userId) or 0)
				if player and sessions[player] then
					player:Kick(
						"Вы зашли на другой сервер. / You joined another server."
					)
				end
			end)
		end)
	end)
	game:BindToClose(function()
		if RunService:IsStudio() and not store then
			return
		end
		-- Start active profiles in parallel; include final writes already detached by PlayerRemoving.
		for player, session in pairs(sessions) do
			rememberPosition(player) -- shutdown may skip PlayerRemoving: keep the exact logout spot
			beginRelease(player, session)
		end
		while next(closingSessions) ~= nil do
			task.wait(0.1)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(AUTOSAVE_SECONDS)
			for player, session in pairs(sessions) do
				save(player, session) -- also when unchanged: it keeps the session lock fresh
			end
		end
	end)
end

return ProfileService
