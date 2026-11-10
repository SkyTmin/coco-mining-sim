--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local PickModel = require(Shared.Models.PickModel)
local ProfileService = require(script.Parent.ProfileService)
local PickaxeService = {}
local cameraAt: { [Player]: number } = {}
local preferencesAt: { [Player]: number } = {}

local function attach(character: Model, id: string)
	local hand = character:WaitForChild("RightHand", 5)
	if not hand or not hand:IsA("BasePart") or not character.Parent then
		return
	end
	local old = character:FindFirstChild("MinePickaxe")
	if old then
		old:Destroy()
	end
	local grip = CFrame.new(0, -hand.Size.Y * 0.17, -0.10)
		* CFrame.Angles(math.rad(-77), 0, math.rad(-13))
	local model, handle = PickModel.new(PickModel.icon(id), hand.CFrame * grip, 0.061, false)
	local motor = Instance.new("Motor6D")
	motor.Name, motor.Part0, motor.Part1, motor.C0 = "PickaxeGrip", hand, handle, grip
	motor.Parent = handle
	model.Parent = character
end

function PickaxeService.equip(player: Player, id: string)
	if player:GetAttribute("CreativeAllowed") ~= true or not Config.pickaxes[id] then
		return
	end
	ProfileService.Mutate(player, function(profile)
		profile.pickaxe = id
	end)
	player:SetAttribute("MinePickaxe", id)
	if player.Character then
		task.defer(attach, player.Character, id)
	end
end

function PickaxeService.Start()
	ProfileService.OnLoaded(function(player)
		local function loadedCharacter(character: Model)
			local id = ProfileService.Read(player, function(p)
				return p.pickaxe
			end) or "starter"
			if not Config.pickaxes[id] then
				id = "starter"
			end
			player:SetAttribute("MinePickaxe", id)
			attach(character, id)
		end
		player.CharacterAdded:Connect(loadedCharacter)
		if player.Character then
			task.spawn(loadedCharacter, player.Character)
		end
	end)
	Remotes.event("CameraView").OnServerEvent:Connect(function(player: Player, mode: any)
		local now = os.clock()
		if typeof(mode) == "table" then
			if now - (preferencesAt[player] or -math.huge) < 0.1 then
				return
			end
			local language, sfx, haptics, reduced =
				mode.language, mode.sfx, mode.haptics, mode.reducedMotion
			if
				language ~= nil
					and (typeof(language) ~= "string" or not table.find(
						Config.game.languages,
						language
					))
				or sfx ~= nil and (typeof(sfx) ~= "number" or not (sfx >= 0 and sfx <= 1))
				or haptics ~= nil and typeof(haptics) ~= "boolean"
				or reduced ~= nil and typeof(reduced) ~= "boolean"
			then
				return
			end
			if language == nil and sfx == nil and haptics == nil and reduced == nil then
				return
			end
			preferencesAt[player] = now
			ProfileService.Mutate(player, function(p)
				local settings = p.settings
				settings.language = language or settings.language
				settings.sfx = sfx or settings.sfx
				if haptics ~= nil then
					settings.haptics = haptics
				end
				if reduced ~= nil then
					settings.reducedMotion = reduced
				end
			end)
			return
		end
		if mode ~= "first" and mode ~= "third" then
			return
		end
		if now - (cameraAt[player] or -math.huge) < 0.2 then
			return
		end
		cameraAt[player] = now
		ProfileService.Mutate(player, function(p)
			p.settings.camera = mode
		end)
	end)
	Players.PlayerRemoving:Connect(function(player)
		cameraAt[player] = nil
		preferencesAt[player] = nil
	end)
end

return PickaxeService
