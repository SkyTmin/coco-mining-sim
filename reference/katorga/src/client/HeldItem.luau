--!strict
-- All clients render the server-owned HeldItem attribute; no physical Tools or gameplay state.
local CollectionService = game:GetService("CollectionService")
local MaterialService = game:GetService("MaterialService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Config = require(ReplicatedStorage:WaitForChild("Shared").Config)
local Combat = require(ReplicatedStorage:WaitForChild("Shared").Combat)
local ItemModels = require(script.Parent:WaitForChild("ItemModels"))
local CharacterAnimator = require(script.Parent:WaitForChild("CharacterAnimator"))
local BowState = require(script.Parent:WaitForChild("BowState"))

type Rig = {
	character: Model,
	connections: { RBXScriptConnection },
	visual: Instance?,
	variant: string?,
}
local HeldItem = {}
local rigs: { [Instance]: Rig } = {}
local playerConnections: { [Player]: { RBXScriptConnection } } = {}
local started = false
-- The swing [владелец 22.10: «замах от первого и третьего лица, видно другим»]. It runs in whole cycles of
-- SWING_SECONDS: a cycle that has started always finishes (instant mining used to restart it every few
-- frames, so the arm never moved). Each cycle drives the first-person hand (SwingAmount) and plays our
-- keyframed animation on the character (CharacterAnimator), which the server relays so every player sees
-- it. Digging repeats the overhead blow; a melee attack (Attack) plays the combo animation of the weapon
-- over its attack length. The hold pose (arm relaxed, item in front) is CharacterAnimator's too.
local SWING_SECONDS = Combat.SWING_SECONDS
local swingActive = false -- digging: keep swinging
local swingPhase = -1 -- 0..1 inside a cycle, -1 = resting
local swingKind = "slam" -- the animation of the current cycle
local swingLength = SWING_SECONDS
local heldUntil = 0 -- hitstop: the swing cycle stands still until then

local function startCycle()
	swingPhase = 0
	swingKind, swingLength = "slam", SWING_SECONDS
	CharacterAnimator.PlayLocal("slam", SWING_SECONDS)
end

function HeldItem.SetDigging(active: boolean)
	swingActive = active
	if active and swingPhase < 0 then
		startCycle()
	end
end

-- 0..1 while the arm swings; FirstPersonHand animates with it
function HeldItem.SwingAmount(): number
	return if swingPhase < 0 then 0 else math.sin(math.pi * swingPhase)
end

-- the current swing for the first-person hand: animation kind and progress 0..1 (nil when resting)
function HeldItem.SwingState(): (string, number?)
	return swingKind, if swingPhase < 0 then nil else swingPhase
end

-- One plain swing (no weapon combo), e.g. a tap that hit nothing to dig
function HeldItem.Swing(repeating: boolean?): boolean
	if swingPhase < 0 or (not repeating and swingPhase >= 0.5) then
		heldUntil = 0
		startCycle()
		return true
	end
	return false
end

-- Body hitstop only: first-person strikes keep their short, continuous cycle.
function HeldItem.Hitstop(seconds: number)
	-- First-person motion stays responsive; hitstop belongs to the body animation.
	CharacterAnimator.HoldLocal(seconds)
end

-- Studio QA (ClientDebug swingAt): the swing stands at `phase` for `seconds`, for screenshots
function HeldItem.DebugHold(phase: number, seconds: number)
	swingPhase, heldUntil = phase, os.clock() + seconds
end

-- Accepted melee combo: body and hand share the short strike; weapon recovery is separate.
function HeldItem.Attack(kind: string, duration: number)
	heldUntil = 0
	swingPhase, swingKind, swingLength = 0, kind, math.min(duration, SWING_SECONDS)
	CharacterAnimator.PlayLocal(kind, swingLength)
end

-- The bow's grip in its model (assets/models/bow/bow.py: the middle of the limb arc, upper left of the 16×16 item):
-- sprite px (3.6, 3.6) from the top left → model space (depth, up, right) in pixels from the centre
local BOW_GRIP_PX = Vector3.new(0, 8 - 3.6, 3.6 - 8)
function HeldItem.BowGrip(size: number): Vector3
	return BOW_GRIP_PX * (size / 16)
end
-- the bow in the hand [ваниль, Minecraft's bow-and-arrow pose]: the string upright and the arrow pointing forward
-- along the arm raised by CharacterAnimator (hand −Y forward, hand −Z up); the model's arrow points to the item's
-- upper left, (0, 1, −1), its string runs from the lower left to the upper right, (0, 1, 1): a −135° turn round X
local BOW_TURN = CFrame.Angles(math.rad(-135), 0, 0)

local function rightHand(character: Model): BasePart?
	local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
	return if hand and hand:IsA("BasePart") then hand else nil
end

-- The held item as a model: a textured cube for blocks, the extruded sprite for items (ItemModels),
-- a flat icon plane when there is no sprite. Used for characters and the first-person hand.
function HeldItem.MakeVisual(
	id: string,
	level: number,
	spriteScale: number?,
	variant: string?, -- the model to show instead of the item's own (the bow's pull stages)
	enchanted: boolean?
): (Instance, BasePart, boolean)
	local icon = Config.iconFor(id, if level > 0 then level else nil)
	local block = Config.block(id)
	-- a cross-sprite block (cobweb) is held as its extruded sprite, as in Minecraft [ваниль]
	local sprites = (Config.textures :: any).sprites
	local cube = block ~= nil and not block.itemOnly and not (sprites and sprites[id])
	local tool = Config.tools[id] ~= nil
	local spriteSize = (if tool then 1.45 else 1.2) * (spriteScale or 1)
	local visual: BasePart
	local container: Instance
	if cube then
		local p = Instance.new("Part")
		p.Name = "HeldItemVisual"
		p.Size = Vector3.one * 1.2 * (spriteScale or 1)
		p.Material = Enum.Material.Plastic
		if MaterialService:FindFirstChild("px_" .. id) then
			p.MaterialVariant = "px_" .. id
		else
			local texture = Config.textures.textures[id]
			if texture then
				for _, face in ipairs(Enum.NormalId:GetEnumItems()) do
					local decal = Instance.new("Decal")
					decal.Face, decal.Texture, decal.Parent = face, texture, p
				end
			end
		end
		visual, container = p, p
	else
		local model = ItemModels.get(variant or id, if level > 0 then level else nil, spriteSize)
		if not model then
			-- no sprite data: fall back to a flat icon plane
			local p = Instance.new("Part")
			p.Name = "HeldItemVisual"
			p.Size = Vector3.new(0.1, spriteSize, spriteSize)
			p.Transparency = 1
			if icon then
				for _, face in ipairs({ Enum.NormalId.Left, Enum.NormalId.Right }) do
					local decal = Instance.new("Decal")
					decal.Face, decal.Texture, decal.Parent = face, icon, p
				end
			end
			visual, container = p, p
		else
			model.Name = "HeldItemVisual"
			visual, container = model.PrimaryPart :: BasePart, model
		end
	end
	visual.CanCollide, visual.CanTouch, visual.CanQuery = false, false, false
	visual.Massless = true
	visual.CastShadow = false
	if tool and not cube and id ~= "bow" then
		-- the weapon trail of a blow (CharacterAnimator turns it on): from the grip to the head of the item
		local a0 = Instance.new("Attachment")
		a0.Name = "TrailBase"
		a0.Position = Vector3.new(0, -spriteSize * 0.15, -spriteSize * 0.15)
		a0.Parent = visual
		local a1 = Instance.new("Attachment")
		a1.Name = "TrailTip"
		a1.Position = Vector3.new(0, spriteSize * 0.45, spriteSize * 0.45)
		a1.Parent = visual
		local trail = Instance.new("Trail")
		trail.Attachment0, trail.Attachment1 = a0, a1
		trail.Lifetime = 0.16
		trail.MinLength = 0.05
		trail.FaceCamera = true
		trail.LightEmission = 0.6
		trail.Color =
			ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(170, 210, 255))
		trail.Transparency = NumberSequence.new(0.35, 1)
		trail.WidthScale = NumberSequence.new(1, 0.3)
		trail.Enabled = false
		trail.Parent = visual
	end
	if
		enchanted
		or require(ReplicatedStorage.Shared.ItemEnchantment).active({ id = id, level = level })
	then
		require(script.Parent.EnchantmentVisual).held(container, visual)
	end
	return container, visual, cube
end

local function render(rig: Rig)
	if rig.visual then
		rig.visual:Destroy()
		rig.visual = nil
	end
	local attribute = rig.character:GetAttribute("HeldItem")
	local hand = rightHand(rig.character)
	if typeof(attribute) ~= "string" or attribute == "" or not hand then
		return
	end
	local id, rawLevel = string.match(attribute, "^([^:]+):(%d+)$")
	if not id then
		return
	end
	local level = tonumber(rawLevel) or 0
	local tool = Config.tools[id] ~= nil
	local variant = if id == "bow" then BowState.ModelId(rig.character) else nil
	rig.variant = variant
	-- our block body's fist is 0.7 × 0.35 × 0.7 studs (R15 hands ≈ 0.3): its grips put the handle end inside the fist so
	-- the handle comes out of it, and a block hangs under the fist (assets/models/player/hold.py renders both)
	local block = rig.character:GetAttribute("BlockBody") == true
	-- held sizes on the block body [ваниль: third-person display scales of a block = 16 skin pixels = 2.8 studs]:
	-- tools 0.85 → 2.38 studs, blocks 0.375 → 1.05, other items 0.55 → 1.54
	local blockConfig = Config.block(id)
	local sprites = (Config.textures :: any).sprites
	local isCube = blockConfig ~= nil and not blockConfig.itemOnly and not (sprites and sprites[id])
	local scale = if not block
		then 1
		elseif tool then 2.38 / 1.45
		elseif isCube then 1.05 / 1.2
		else 1.54 / 1.2
	local spriteSize = (if tool then 1.45 else 1.2) * scale
	local container, visual, cube = HeldItem.MakeVisual(
		id,
		level,
		scale,
		variant,
		rig.character:GetAttribute("HeldEnchanted") == true
	)
	local motor = Instance.new("Motor6D")
	motor.Name = "HeldItemGrip"
	motor.Part0, motor.Part1 = hand, visual
	if cube then
		local half = 0.6 * scale
		-- the block's top stays under the fist whatever its size (the grip was tuned for the 1.2-stud cube)
		motor.C0 = if block
			then CFrame.new(0, -0.62, -0.25) * CFrame.Angles(0, math.rad(25), 0) * CFrame.new(
				0,
				0.6 - 0.025 - half,
				0
			)
			else CFrame.new(0.2, -0.5, -0.9) * CFrame.Angles(0, math.rad(25), 0)
	elseif id == "bow" then
		motor.C0 = CFrame.new(0, -0.15, 0) * BOW_TURN * CFrame.new(-HeldItem.BowGrip(spriteSize))
	else
		local size = spriteSize
		-- Tuned on the live character (21.10): sprite model has image-right = +Z, so yaw it 180° to
		-- point the head forward (hand −Z); handle end (bottom-left of the icon) sits in the palm.
		-- [владелец 22.10, reference: Steve] with the arm relaxed the item points forward and a little
		-- down, not up: pitch −105° ≈ 25–30° below level (−20° stood 45° up, −90° gave 11° down)
		motor.C0 = (if block then CFrame.new(0, 0.1, 0.05) else CFrame.new(0.3, -0.3, -0.2))
			* CFrame.Angles(math.rad(-105), 0, 0)
			* CFrame.Angles(0, math.pi, 0)
			* CFrame.new(0, size * 0.45, size * 0.45)
			-- [владелец 27.10: «переверни топор, чтобы вниз смотрел»] the axe turns half round its handle (the icon's
			-- diagonal): the blade faces the ground, ready to chop
			* (
				if id == "axe"
					then CFrame.fromAxisAngle(Vector3.new(0, 1, 1).Unit, math.pi)
					else CFrame.identity
			)
	end
	visual.CFrame = hand.CFrame * motor.C0
	motor.Parent = visual
	container.Parent = rig.character
	rig.visual = container
end

local function clear(player: Instance)
	local rig = rigs[player]
	if not rig then
		return
	end
	for _, connection in ipairs(rig.connections) do
		connection:Disconnect()
	end
	if rig.visual then
		rig.visual:Destroy()
	end
	rigs[player] = nil
end

local function characterAdded(player: Instance, character: Model)
	clear(player)
	local rig: Rig = { character = character, connections = {}, visual = nil }
	rigs[player] = rig
	table.insert(
		rig.connections,
		character:GetAttributeChangedSignal("HeldItem"):Connect(function()
			render(rig)
		end)
	)
	table.insert(
		rig.connections,
		character:GetAttributeChangedSignal("HeldEnchanted"):Connect(function()
			render(rig)
		end)
	)
	table.insert(
		rig.connections,
		character.DescendantAdded:Connect(function(descendant)
			if
				descendant.Name == "RightHand"
				or descendant.Name == "Right Arm"
				or descendant.Name == "RightGripAttachment"
			then
				render(rig)
			end
		end)
	)
	render(rig)
end

local function watch(player: Player)
	playerConnections[player] = {
		player.CharacterAdded:Connect(function(character)
			characterAdded(player, character)
		end),
		player.CharacterRemoving:Connect(function()
			clear(player)
			if player == Players.LocalPlayer then
				HeldItem.SetDigging(false)
			end
		end),
	}
	if player.Character then
		characterAdded(player, player.Character)
	end
end

function HeldItem.Start()
	if started then
		return
	end
	started = true
	Players.PlayerAdded:Connect(watch)
	Players.PlayerRemoving:Connect(function(player)
		clear(player)
		for _, connection in ipairs(playerConnections[player] or {}) do
			connection:Disconnect()
		end
		playerConnections[player] = nil
	end)
	for _, player in ipairs(Players:GetPlayers()) do
		watch(player)
	end
	local function mannequin(model: Instance)
		if model:IsA("Model") then
			characterAdded(model, model)
		end
	end
	for _, model in ipairs(CollectionService:GetTagged("HeldMannequin")) do
		mannequin(model)
	end
	CollectionService:GetInstanceAddedSignal("HeldMannequin"):Connect(mannequin)
	CollectionService:GetInstanceRemovedSignal("HeldMannequin"):Connect(clear)
	RunService.Heartbeat:Connect(function()
		-- the bow's pull stages: a new model when the stage changes
		for _, rig in pairs(rigs) do
			if rig.variant and BowState.ModelId(rig.character) ~= rig.variant then
				render(rig)
			end
		end
	end)
	-- the swing cycle
	RunService.Heartbeat:Connect(function(dt)
		if swingPhase >= 0 and os.clock() >= heldUntil then
			swingPhase += dt / swingLength
			if swingPhase >= 1 then
				if swingActive then
					startCycle()
				else
					swingPhase = -1
				end
			end
		end
	end)
end

return HeldItem
