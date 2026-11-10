--!strict

local Players = game:GetService("Players")
local Remotes = require(game:GetService("ReplicatedStorage").Shared.Remotes)
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local plots, mine = Config.plots, Config.mine
local S = mine.blockSize
local WIDTH = plots.frameWidth * S
local DEPTH = plots.platformDepth * S
local HEIGHT = mine.height * S
local SPECTATORS = plots.spectatorDepth * S

local PlotService = {}
local slots: { [number]: { frame: CFrame, origin: Part, owner: Player? } } = {}
local assignments: { [Player]: number } = {}

local function part(
	parent: Instance,
	name: string,
	size: Vector3,
	frame: CFrame,
	color: Color3
): Part
	local p = Instance.new("Part")
	p.Name, p.Size, p.CFrame, p.Color = name, size, frame, color
	p.Material = Enum.Material.SmoothPlastic
	p.Anchored, p.CanTouch = true, false
	p.Parent = parent
	return p
end

function PlotService.get(player: Player): number?
	return assignments[player]
end

function PlotService.depth(plot: number, front: number)
	local slot = slots[plot]
	if slot and slot.owner and slot.origin:GetAttribute("MineFront") ~= front then
		slot.origin:SetAttribute("MineFront", front)
	end
end

function PlotService.onOwnPlatform(player: Player): boolean
	local index = assignments[player]
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if not index or slots[index].owner ~= player or not root or not root:IsA("BasePart") then
		return false
	end
	local p = slots[index].frame:PointToObjectSpace(root.Position)
	return math.abs(p.X) <= WIDTH / 2
		and p.Z >= 0
		and p.Z <= DEPTH
		and p.Y >= -1
		and p.Y <= HEIGHT + 6
end

function PlotService.digFrame(player: Player): CFrame?
	local i = assignments[player]
	return if i then slots[i].frame * CFrame.new(0, 3.5, DEPTH * 0.72) else nil
end

function PlotService.Start()
	local root = Instance.new("Folder")
	root.Name = "Plots"
	root.Parent = workspace
	local gray, trim = Color3.fromRGB(87, 94, 103), Color3.fromRGB(112, 120, 132)
	local radius = plots.entranceRadius
	local floor = part(
		root,
		"CommonFloor",
		Vector3.new(1, radius * 2, radius * 2),
		CFrame.new(0, -0.5, 0) * CFrame.Angles(0, 0, math.pi / 2),
		gray
	)
	floor.Shape = Enum.PartType.Cylinder
	for i = 1, plots.count do
		local angle = (i - 1) * math.pi * 2 / plots.count
		local outward = Vector3.new(math.sin(angle), 0, -math.cos(angle))
		local position = outward * (radius + DEPTH + SPECTATORS)
		local frame = CFrame.lookAt(position, position + outward)
		local model = Instance.new("Model")
		model.Name = "Plot_" .. tostring(i)
		model.Parent = root
		local origin = part(model, "Origin", Vector3.one, frame, gray)
		origin.Transparency, origin.CanCollide, origin.CanQuery = 1, false, false
		slots[i] = { frame = frame, origin = origin }
		part(
			model,
			"Platform",
			Vector3.new(WIDTH, 1, DEPTH),
			frame * CFrame.new(0, -0.5, DEPTH / 2),
			gray
		)
		part(
			model,
			"SpectatorStrip",
			Vector3.new(WIDTH, 1, SPECTATORS + 6),
			frame * CFrame.new(0, -0.5, DEPTH + (SPECTATORS + 6) / 2),
			trim
		)
		local line = part(
			model,
			"Boundary",
			Vector3.new(WIDTH, 0.05, 0.22),
			frame * CFrame.new(0, 0.035, 0.35),
			Color3.fromRGB(127, 222, 255)
		)
		line.Material, line.CanCollide = Enum.Material.Neon, false
		local barrier = part(
			model,
			"Barrier",
			Vector3.new(WIDTH + 2, HEIGHT + 14, 1),
			frame * CFrame.new(0, (HEIGHT + 14) / 2, -0.5),
			gray
		)
		barrier.Transparency = 1
		for _, side in { -1, 1 } do
			part(
				model,
				"FrameSide",
				Vector3.new(1, HEIGHT, DEPTH),
				frame * CFrame.new(side * (WIDTH / 2 + 0.5), HEIGHT / 2, DEPTH / 2),
				trim
			)
		end
		part(
			model,
			"FrameTop",
			Vector3.new(WIDTH + 2, 1, 2),
			frame * CFrame.new(0, HEIGHT + 0.5, 0),
			trim
		)
	end

	local returned: { [Player]: number } = {}
	Remotes.func("MineReturn").OnServerInvoke = function(player: Player)
		local now = workspace:GetServerTimeNow()
		if now < (returned[player] or 0) or now < (player:GetAttribute("MineReturnAfter") or 0) then
			return false
		end
		local character = player.Character
		local rootPart = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		local target = PlotService.digFrame(player)
		if
			not character
			or not rootPart
			or not rootPart:IsA("BasePart")
			or not humanoid
			or humanoid.Health <= 0
			or not target
		then
			return false
		end
		returned[player] = now + 0.6
		rootPart.AssemblyLinearVelocity, rootPart.AssemblyAngularVelocity =
			Vector3.zero, Vector3.zero
		character:PivotTo(target)
		return true
	end

	local function add(player: Player)
		if assignments[player] then
			return
		end
		for i, slot in slots do
			if slot.owner then
				continue
			end
			slot.owner, assignments[player] = player, i
			player:SetAttribute("Plot", i)
			local function spawnAt(character: Model)
				local pivot = character:WaitForChild("HumanoidRootPart", 8)
				if not pivot or player.Character ~= character or assignments[player] ~= i then
					return
				end
				character:PivotTo(PlotService.digFrame(player) :: CFrame)
			end
			player.CharacterAdded:Connect(spawnAt)
			if player.Character then
				task.defer(spawnAt, player.Character)
			end
			break
		end
	end
	Players.PlayerAdded:Connect(add)
	Players.PlayerRemoving:Connect(function(player)
		returned[player] = nil
		local i = assignments[player]
		if i then
			slots[i].owner, assignments[player] = nil, nil
			slots[i].origin:SetAttribute("MineFront", nil)
		end
	end)
	for _, player in Players:GetPlayers() do
		add(player)
	end
end

return PlotService
