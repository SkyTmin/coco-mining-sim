--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
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
	local model = Instance.new("Model")
	model.Name = "MinePickaxe"
	local color = if id == "starter"
		then Color3.fromRGB(142, 91, 51)
		elseif id == "storm_common" then Color3.fromRGB(139, 225, 255)
		else Color3.fromRGB(182, 193, 203)
	local function piece(name: string, size: Vector3, relative: CFrame, tint: Color3): Part
		local p = Instance.new("Part")
		p.Name, p.Size, p.Color, p.CFrame = name, size, tint, hand.CFrame * relative
		p.Massless, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
		p.Material = Enum.Material.SmoothPlastic
		p.Parent = model
		return p
	end
	local grip = CFrame.new(0, -hand.Size.Y * 0.17, -0.12) * CFrame.Angles(math.rad(-70), 0, 0)
	local handle = piece("Handle", Vector3.new(0.20, 1.65, 0.20), grip, Color3.fromRGB(108, 76, 53))
	local function fixed(name: string, size: Vector3, x: number, y: number, tint: Color3)
		local head = piece(name, size, grip * CFrame.new(x, y, 0), tint)
		local weld = Instance.new("WeldConstraint")
		weld.Part0, weld.Part1, weld.Parent = handle, head, handle
	end
	fixed("Head", Vector3.new(1.04, 0.27, 0.31), 0, 0.77, color)
	if id == "starter" then
		for _, side in { -1, 1 } do
			fixed("Shoulder", Vector3.new(0.3, 0.31, 0.30), side * 0.59, 0.64, color)
			fixed(
				"Tip",
				Vector3.new(0.22, 0.27, 0.25),
				side * 0.77,
				0.48,
				Color3.fromRGB(177, 120, 68)
			)
		end
		fixed("Binding", Vector3.new(0.28, 0.44, 0.36), 0, 0.63, Color3.fromRGB(205, 165, 108))
		fixed("GripEnd", Vector3.new(0.26, 0.26, 0.25), 0, -0.69, Color3.fromRGB(156, 103, 62))
	end
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
