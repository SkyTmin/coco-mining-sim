--!strict

local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local PickModel = require(Shared.Models.PickModel)
local Swing = require(script.Parent.SwingAnimations)

local REST_PITCH = math.rad(5.5)
local Camera = {}
type ArmJoint = Motor6D | AnimationConstraint
type Applied = { joint: ArmJoint, base: CFrame, transform: CFrame }
export type View = {
	player: Player,
	frame: CFrame,
	mode: string,
	active: boolean,
	yaw: number,
	pitch: number,
	recenter: { at: number, yaw: number, pitch: number }?,
	snapAt: number,
	snapHand: Model?,
	swingAt: number,
	swingDuration: number,
	firstItem: Model?,
	firstRoot: BasePart?,
	firstId: string?,
	firstGold: boolean?,
	bob: number,
	held: { frame: CFrame, focus: CFrame, humanoid: Humanoid?, speed: number? }?,
	hidden: Model?,
	hideNew: RBXScriptConnection?,
	body: { [string]: Applied },
	glowing: { part: BasePart, material: Enum.Material, color: Color3 }?,
}

local function swingProgress(view: View, now: number): number?
	local progress = (now - view.swingAt) / view.swingDuration
	return if progress >= 0 and progress < 1 then progress else nil
end

local function bodyPose(view: View)
	local character = view.player.Character
	if not character or not view.active or view.mode == "first" then
		for _, state in view.body do
			if state.joint.Parent and state.joint.Transform == state.transform then
				state.joint.Transform = state.base
			end
		end
		table.clear(view.body)
		return
	end
	local progress = swingProgress(view, os.clock())
	for _, name in Swing.joints do
		local state = view.body[name]
		local joint = if state and state.joint:IsDescendantOf(character)
			then state.joint
			else character:FindFirstChild(name, true)
		if joint and (joint:IsA("Motor6D") or joint:IsA("AnimationConstraint")) then
			local base = joint.Transform
			if state and state.joint == joint and base == state.transform then
				base = state.base
			end
			local snap = os.clock() - view.snapAt
			local offset = Swing.body(name, progress)
			if snap >= 0 and snap < 0.15 then
				if name == "RightShoulder" then
					offset = CFrame.Angles(math.rad(85), 0, math.rad(12))
				elseif name == "RightElbow" then
					offset = CFrame.Angles(math.rad(80), 0, 0)
				elseif name == "RightWrist" then
					offset = CFrame.Angles(0, 0, math.rad(25))
				end
			end
			local pose = base * offset
			joint.Transform = pose
			if not state or state.joint ~= joint then
				view.body[name] = { joint = joint, base = base, transform = pose }
			else
				state.base, state.transform = base, pose
			end
		end
	end
end

function Camera.new(player: Player, frame: CFrame): View
	local view: View = {
		player = player,
		frame = frame,
		mode = "first",
		active = false,
		yaw = 0,
		pitch = REST_PITCH,
		snapAt = -math.huge,
		swingAt = -math.huge,
		swingDuration = 0.35,
		bob = 0,
		body = {},
	}
	RunService.PreSimulation:Connect(function()
		bodyPose(view)
	end)
	return view
end

function Camera.adopt(view: View, direction: Vector3)
	local localDirection = view.frame:VectorToObjectSpace(direction)
	view.yaw = math.atan2(-localDirection.X, -localDirection.Z)
	view.pitch =
		math.clamp(math.asin(math.clamp(localDirection.Y, -1, 1)), -math.rad(60), math.rad(60))
	view.recenter = nil
end

function Camera.inZone(
	view: View,
	p: Vector3,
	halfWidth: number,
	depth: number,
	height: number
): boolean
	local margin = if view.active then 1 else -1
	return math.abs(p.X) <= halfWidth + margin
		and p.Z >= -margin
		and p.Z <= depth + margin
		and p.Y >= -1 - margin
		and p.Y <= height + 6 + margin
end

function Camera.pan(view: View, delta: Vector2)
	view.recenter = nil
	view.yaw = (view.yaw - delta.X * 0.004 + math.pi) % (2 * math.pi) - math.pi
	view.pitch = math.clamp(view.pitch - delta.Y * 0.004, -math.rad(60), math.rad(60))
end

function Camera.faceWall(view: View, now: number)
	view.recenter = { at = now, yaw = view.yaw, pitch = view.pitch }
end

function Camera.away(view: View): boolean
	return math.abs(view.yaw) > math.rad(60)
end

function Camera.snap(view: View, now: number)
	view.snapAt = now
end

function Camera.swing(view: View, now: number, duration: number)
	view.swingAt, view.swingDuration = now, duration
end

function Camera.contact(view: View, interval: number): number
	-- The camera chop peaks at 0.20; the R15 slam meets the wall on its 0.55 key.
	return interval * (if view.mode == "first" then 0.20 else 0.55)
end

local function hideBody(view: View, character: Model?)
	if view.hidden == character then
		return
	end
	if view.hideNew then
		view.hideNew:Disconnect()
		view.hideNew = nil
	end
	if view.hidden then
		for _, part in view.hidden:GetDescendants() do
			if part:IsA("BasePart") then
				part.LocalTransparencyModifier = 0
			end
		end
	end
	view.hidden = character
	if character then
		local function hide(item: Instance)
			if item:IsA("BasePart") then
				item.LocalTransparencyModifier = 1
			end
		end
		for _, item in character:GetDescendants() do
			hide(item)
		end
		view.hideNew = character.DescendantAdded:Connect(hide)
	end
end

function Camera.glow(view: View, color: Color3?)
	local old = view.glowing
	if not old and not color then
		return
	end
	local character = view.player.Character
	local pick = if view.mode == "first"
		then view.firstItem
		else character and character:FindFirstChild("MinePickaxe")
	local head = pick and pick:FindFirstChild("Head")
	if old and (not color or old.part ~= head) then
		old.part.Material, old.part.Color = old.material, old.color
		view.glowing = nil
	end
	if color and not view.glowing and head and head:IsA("BasePart") then
		view.glowing = { part = head, material = head.Material, color = head.Color }
		head.Material, head.Color = Enum.Material.Neon, color
	end
end

local function drawHeld(
	view: View,
	camera: Camera,
	humanoid: Humanoid?,
	first: boolean,
	dt: number,
	reduced: boolean
)
	local snap = os.clock() - view.snapAt
	local snapping = first and snap >= 0 and snap < 0.15
	if snapping then
		local model = view.snapHand
		if not model then
			model = Instance.new("Model")
			model.Name = "SnapHand"
			local character = view.player.Character
			for _, name in { "RightLowerArm", "RightHand" } do
				local source = character and character:FindFirstChild(name)
				if source and source:IsA("BasePart") then
					local limb = source:Clone() :: BasePart
					limb:ClearAllChildren()
					limb.Anchored, limb.CanCollide, limb.CanQuery, limb.CanTouch =
						true, false, false, false
					limb.LocalTransparencyModifier, limb.CastShadow = 0, false
					limb.Size *= 0.6
					limb.Parent = model
				end
			end
			view.snapHand = model
		end
		model.Parent = camera
		local lift = math.sin(math.pi * snap / 0.15)
		local frame = camera.CFrame
			* CFrame.new(0.70, -0.62 + 0.50 * lift, -1.25)
			* CFrame.Angles(math.rad(-65), 0, math.rad(-15))
		for _, limb in model:GetChildren() do
			if limb:IsA("BasePart") then
				limb.CFrame = frame
					* CFrame.new(0, if limb.Name == "RightHand" then -0.45 else 0.1, 0)
			end
		end
	elseif view.snapHand then
		view.snapHand.Parent = nil
	end
	if not first or snapping then
		if view.firstItem then
			view.firstItem.Parent = nil
		end
		return
	end
	local id = view.player:GetAttribute("MinePickaxe") or "starter"
	local golden = view.player:GetAttribute("MinePickaxeGolden") == true
	if view.firstItem and view.firstId ~= id then
		view.firstItem:Destroy()
		view.firstItem, view.firstRoot = nil, nil
	end
	if not view.firstItem then
		view.firstItem, view.firstRoot = PickModel.forPick(id, CFrame.identity, true, true)
		view.firstItem.Name = "FirstPersonPickaxe"
		PickModel.appearance(view.firstItem, id, golden)
		view.firstId, view.firstGold = id, golden
	elseif view.firstGold ~= golden then
		PickModel.appearance(view.firstItem, id, golden)
		view.firstGold = golden
	end
	local item, root = view.firstItem, view.firstRoot
	if not item or not root then
		return
	end
	if item.Parent ~= camera then
		item.Parent = camera
	end
	local speed = if humanoid and not reduced then humanoid.MoveDirection.Magnitude else 0
	if speed > 0.1 then
		view.bob += dt * 9
	end
	local bob = CFrame.new(
		math.sin(view.bob) * 0.03 * speed,
		-math.abs(math.cos(view.bob)) * 0.03 * speed,
		0
	)
	root.CFrame = camera.CFrame * bob * Swing.held(root.Size.Y, swingProgress(view, os.clock()))
end

function Camera.step(
	view: View,
	active: boolean,
	shake: Vector3,
	dt: number,
	reduced: boolean,
	travel: number?
)
	local camera = workspace.CurrentCamera
	local character = view.player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local head = character and character:FindFirstChild("Head")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if
		not camera
		or not character
		or not root
		or not root:IsA("BasePart")
		or not head
		or not head:IsA("BasePart")
	then
		return
	end
	if not active then
		if view.active then
			local previous, focus = camera.CFrame, camera.Focus
			camera.CameraType = Enum.CameraType.Custom
			camera.CameraSubject = humanoid
			camera.CFrame, camera.Focus = previous, focus
			camera.FieldOfView = 70
			UserInputService.MouseBehavior = Enum.MouseBehavior.Default
			UserInputService.MouseIconEnabled = true
			if humanoid then
				humanoid.AutoRotate = true
			end
			hideBody(view, nil)
			drawHeld(view, camera, humanoid, false, dt, reduced)
		end
		view.active = false
		return
	end
	if not view.active and not view.recenter then
		Camera.adopt(view, camera.CFrame.LookVector)
	end
	view.active = true
	local recenter = view.recenter
	if recenter then
		local t = math.clamp((os.clock() - recenter.at) / 0.15, 0, 1)
		local ease = 1 - (1 - t) ^ 2
		view.yaw = recenter.yaw * (1 - ease)
		view.pitch = recenter.pitch + (REST_PITCH - recenter.pitch) * ease
		if t == 1 then
			view.recenter = nil
		end
	end
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 70
	if humanoid then
		humanoid.AutoRotate = false
	end
	local facing = (view.frame * CFrame.Angles(0, view.yaw, 0)).LookVector
	local direction = (view.frame * CFrame.Angles(0, view.yaw, 0) * CFrame.Angles(view.pitch, 0, 0)).LookVector
	local pos = root.Position
	if root.CFrame.LookVector:Dot(facing) < 0.9998 then
		root.CFrame = CFrame.lookAt(pos, pos + facing)
	end
	local first = view.mode == "first"
	local opened = view.player:GetAttribute("MineMenuOpen") == true
		or view.player:GetAttribute("MineSettingsOpen") == true
		or view.player:GetAttribute("MineUpgradesOpen") == true
	local mouseLock = first
		and UserInputService.MouseEnabled
		and not UserInputService.TouchEnabled
		and not opened
	UserInputService.MouseBehavior = if mouseLock
		then Enum.MouseBehavior.LockCenter
		else Enum.MouseBehavior.Default
	UserInputService.MouseIconEnabled = not mouseLock
	hideBody(view, if first then character else nil)
	local headCenter = Vector3.new(pos.X, head.Position.Y, pos.Z)
	local eye = if first
		then headCenter + facing * 0.12 + facing:Cross(Vector3.yAxis) * 0.10 + Vector3.new(
			0,
			0.14,
			0
		)
		else headCenter - facing * 11 + Vector3.new(0, 2.5, 0)
	if view.held then
		local offset = view.frame.LookVector * (travel or 0)
		camera.CFrame, camera.Focus = view.held.frame + offset, view.held.focus + offset
	else
		camera.CFrame = CFrame.lookAt(eye + shake, eye + shake + direction)
		camera.Focus = CFrame.new(eye + direction * 24)
	end
	drawHeld(view, camera, humanoid, first, dt, reduced)
end

function Camera.hold(view: View, enabled: boolean)
	local held = view.held
	local camera = workspace.CurrentCamera
	if enabled and not held and camera then
		local character = view.player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		view.held = {
			frame = camera.CFrame,
			focus = camera.Focus,
			humanoid = humanoid,
			speed = humanoid and humanoid.WalkSpeed,
		}
		if humanoid then
			humanoid.WalkSpeed = 0
		end
	elseif not enabled and held then
		if held.humanoid and held.speed and held.humanoid.WalkSpeed == 0 then
			held.humanoid.WalkSpeed = held.speed
		end
		view.held = nil
	end
end
return Camera
