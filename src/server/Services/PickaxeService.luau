--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Analytics = require(script.Parent.Analytics)
local SettingsPatch = require(Shared.Play.SettingsPatch)
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local PickModel = require(Shared.Models.PickModel)
local Family = require(Shared.Play.Family)
local Collection = require(Shared.Play.Collection)
local ProfileService = require(script.Parent.ProfileService)
local PickaxeService = {}
local cameraAt: { [Player]: number } = {}
local preferencesAt: { [Player]: number } = {}

local function attach(character: Model, id: string)
	local hand = character:WaitForChild("RightHand", 5)
	if not hand or not hand:IsA("BasePart") or not character.Parent then
		return
	end
	local owner = Players:GetPlayerFromCharacter(character)
	if not owner or owner:GetAttribute("MinePickaxe") ~= id then
		return
	end
	local old = character:FindFirstChild("MinePickaxe")
	if old then
		old:Destroy()
	end
	local grip = CFrame.new(0, -hand.Size.Y * 0.17, -0.10)
		* CFrame.Angles(math.rad(-77), 0, math.rad(-13))
	local model, handle = PickModel.forPick(id, hand.CFrame * grip, false)
	local player = Players:GetPlayerFromCharacter(character)
	PickModel.appearance(
		model,
		id,
		player ~= nil and player:GetAttribute("MinePickaxeGolden") == true
	)
	local motor = Instance.new("Motor6D")
	motor.Name, motor.Part0, motor.Part1, motor.C0 = "PickaxeGrip", hand, handle, grip
	motor.Parent = handle
	model.Parent = character
end

function PickaxeService.refresh(player: Player)
	local current = ProfileService.Read(player, function(p)
		return { id = p.pickaxe, golden = p.pickaxeGolden }
	end)
	if not current then
		return
	end
	if
		player:GetAttribute("MinePickaxe") == current.id
		and player:GetAttribute("MinePickaxeGolden") == current.golden
	then
		return
	end
	player:SetAttribute("MinePickaxe", current.id)
	player:SetAttribute("MinePickaxeGolden", current.golden)
	if player.Character then
		task.defer(attach, player.Character, current.id)
	end
end

function PickaxeService.equip(
	player: Player,
	id: string,
	golden: boolean?,
	creative: boolean?
): boolean
	if not Config.pickaxes[id] then
		return false
	end
	local allowed = creative == true and player:GetAttribute("CreativeAllowed") == true
	local equipped = false
	ProfileService.Mutate(player, function(profile)
		if allowed then
			if not Family.owns(profile, id, golden) then
				Collection.grant(profile, id, golden)
			end
			if not Family.canEquip(profile, id, golden) then
				warn("[Creative] Family equip override: " .. id)
			end
			profile.pickaxe, profile.pickaxeGolden, equipped = id, golden == true, true
		else
			equipped = Collection.equip(profile, id, golden)
		end
	end)
	if equipped then
		PickaxeService.refresh(player)
	end
	return equipped
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
			player:SetAttribute("MinePickaxeGolden", ProfileService.Read(player, function(p)
				return p.pickaxeGolden
			end) == true)
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
			local patch = SettingsPatch.parse(mode)
			if not patch then
				return
			end
			local previousMusic = ProfileService.Read(player, function(p)
				return p.settings.music
			end)
			preferencesAt[player] = now
			ProfileService.Mutate(player, function(p)
				for key, value in patch do
					(p.settings :: any)[key] = value
				end
			end)
			if patch.music ~= nil and patch.music ~= previousMusic then
				Analytics.event(player, "music_volume", patch.music, "")
			end
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
