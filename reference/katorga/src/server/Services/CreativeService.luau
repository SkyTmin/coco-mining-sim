--!strict
-- Creative test mode [владелец 21.10]: any item from a catalog window, instant digging, no damage,
-- no hunger or needs drain. Only in Studio, for the place creator and Config.rules.creative.admins.
-- The player attribute `CreativeAllowed` shows the window button; `Creative` = the mode is on
-- (DigService, HungerService and NeedsService read it). Client → server: Creative(op, a, b).

local LogService = game:GetService("LogService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Boosters = require(Shared.Boosters)
local Config = require(Shared.Config)
local ItemInfo = require(Shared.ItemInfo)
local Remotes = require(Shared.Remotes)
local Types = require(Shared.Types)
local InventoryService = require(script.Parent.InventoryService)
local ProfileService = require(script.Parent.ProfileService)

local CreativeService = {}
local rules = Config.rules.creative
local started = false
local catalog: { [string]: boolean } = {}
local resets: { [Player]: { token: string, expires: number } } = {}

local function resetAllowed(player: Player): boolean
	return table.find(rules.admins, player.UserId) ~= nil
		or (game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId)
end

local function resetRequest(player: Player, action: any, token: any): any
	if not resetAllowed(player) or not ProfileService.IsReal(player) then
		return { ok = false, key = "release_reset_failed" }
	end
	if action == "prepare" then
		if require(Shared.ProgressReset).blocked(ProfileService.Get(player)) then
			return { ok = false, key = "release_reset_busy" }
		end
		local request = { token = HttpService:GenerateGUID(false), expires = os.clock() + 45 }
		resets[player] = request
		return { ok = true, token = request.token }
	end
	local request = resets[player]
	if
		action ~= "confirm"
		or not request
		or token ~= request.token
		or os.clock() > request.expires
	then
		return { ok = false, key = "release_action_expired" }
	end
	resets[player] = nil
	local ok, reason = ProfileService.ResetOwnProgress(player)
	if ok then
		task.defer(function()
			if player.Parent then
				player:LoadCharacterAsync()
			end
		end)
	end
	return { ok = ok, key = reason or "release_reset_done" }
end

local function allowed(player: Player): boolean
	return RunService:IsStudio()
		or table.find(rules.admins, player.UserId) ~= nil
		or (game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId)
end

function CreativeService.IsOn(player: Player): boolean
	return player:GetAttribute("Creative") == true
end

local function maxLevel(id: string): number
	local tool = Config.tools[id]
	return if tool then #tool.upgrades + 1 else 0
end

-- an invisible ForceField: every damage source uses Humanoid:TakeDamage, which it blocks
local function shield(player: Player)
	local character = player.Character
	if not character then
		return
	end
	local existing = character:FindFirstChild("CreativeShield")
	if CreativeService.IsOn(player) and not existing then
		local field = Instance.new("ForceField")
		field.Name = "CreativeShield"
		field.Visible = false
		field.Parent = character
	elseif not CreativeService.IsOn(player) and existing then
		existing:Destroy()
	end
end

local function refill(player: Player)
	ProfileService.Mutate(player, function(profile)
		profile.hunger = 20
		for need in pairs(profile.needs) do
			(profile.needs :: any)[need] = 100
		end
	end)
	local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.Health > 0 then
		humanoid.Health = humanoid.MaxHealth
	end
end

local function give(player: Player, id: any, level: any, bookLevel: any)
	if typeof(id) ~= "string" then
		return
	end
	if id == "ancient_book" then
		-- a book of the chosen level (default the top one), always applies (effect id in `level`)
		local effect = Config.books.effects[level]
		local entry = Config.books.catalog[level]
		if typeof(level) ~= "string" or not effect or not entry then
			return
		end
		local wanted = math.clamp(math.floor(tonumber(bookLevel) or #effect), 1, #effect)
		ProfileService.Mutate(player, function(profile)
			local stack: any = {
				id = "ancient_book",
				count = 1,
				level = wanted,
				books = { { id = level, level = wanted } },
				rarity = entry.rarity,
				applyChance = 100,
			}
			for slot = 1, InventoryService.SLOTS do
				if not profile.inventory[slot] then
					profile.inventory[slot] = stack
					return
				end
			end
		end)
		return
	end
	if not catalog[id] then
		return
	end
	local top = maxLevel(id)
	local itemLevel = if top > 0 then math.clamp(math.floor(tonumber(level) or 1), 1, top) else nil
	local count = if InventoryService.isStackable(id) then rules.stackCount else 1
	ProfileService.Mutate(player, function(profile)
		InventoryService.add(profile, id, count, itemLevel)
	end)
end

local function onRequest(player: Player, op: any, a: any, b: any, c: any)
	if not allowed(player) or not ProfileService.Get(player) then
		return
	end
	if op == "toggle" then
		player:SetAttribute("Creative", not CreativeService.IsOn(player))
		shield(player)
		if CreativeService.IsOn(player) then
			refill(player)
		end
	elseif op == "give" then
		give(player, a, b, c)
	elseif op == "coins" then
		ProfileService.Mutate(player, function(profile)
			profile.coins += 1000 * Config.moneyScale
		end)
	elseif op == "level" then
		ProfileService.Mutate(player, function(profile)
			profile.level = math.min(Config.levels.maxLevel, profile.level + 1)
		end)
		local profile = ProfileService.Get(player) :: Types.Profile
		local rule = Config.levelRule(profile.level)
		local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
		if humanoid and rule then
			humanoid.MaxHealth = rule.hearts * 2
			humanoid.Health = humanoid.MaxHealth
		end
	elseif op == "refill" then
		refill(player)
	elseif op == "clear" then
		ProfileService.Mutate(player, function(profile)
			table.clear(profile.inventory)
		end)
	end
end

function CreativeService.Start()
	if started then
		return
	end
	started = true
	for _, id in ipairs(ItemInfo.knownIds()) do
		catalog[id] = true
	end
	for id in pairs(Config.blocks) do
		catalog[id] = true
	end
	catalog.ancient_book = nil -- books come with their effect (give "ancient_book", effectId, level)
	catalog.money_bag = nil -- a bag without coins; money comes from the +1000 $ button
	for _, kind in ipairs(Boosters.kinds) do
		catalog["booster_" .. kind] = nil -- the plain pictures; the items are per scope
		for _, scope in ipairs(Boosters.scopes) do
			catalog[Boosters.itemId(kind, scope)] = true
		end
	end
	Remotes.event("Creative").OnServerEvent:Connect(onRequest)
	Remotes.func("CreativeReset").OnServerInvoke = resetRequest
	Players.PlayerRemoving:Connect(function(player)
		resets[player] = nil
	end)
	-- the server's warnings and errors go to the creative window of allowed players: the owner reads
	-- them on a phone where the chat (and /console) is not available [владелец 21.10]
	local logRemote = Remotes.event("ServerLog")
	local sentThisSecond, second = 0, 0
	LogService.MessageOut:Connect(function(message: string, kind: Enum.MessageType)
		if kind ~= Enum.MessageType.MessageWarning and kind ~= Enum.MessageType.MessageError then
			return
		end
		local now = math.floor(os.clock())
		if now ~= second then
			second, sentThisSecond = now, 0
		end
		sentThisSecond += 1
		if sentThisSecond > 10 then
			return -- an error in a loop must not flood the network
		end
		for _, player in ipairs(Players:GetPlayers()) do
			if player:GetAttribute("CreativeAllowed") then
				logRemote:FireClient(
					player,
					string.sub(message, 1, 300),
					kind == Enum.MessageType.MessageError
				)
			end
		end
	end)
	local function added(player: Player)
		player:SetAttribute("CreativeResetAllowed", resetAllowed(player))
		if allowed(player) then
			player:SetAttribute("CreativeAllowed", true)
		end
		player.CharacterAdded:Connect(function()
			task.defer(shield, player)
		end)
	end
	Players.PlayerAdded:Connect(added)
	for _, player in ipairs(Players:GetPlayers()) do
		added(player)
	end
end

return CreativeService
