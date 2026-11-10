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
	swingAt: number,
	swingDuration: number,
	firstItem: Model?,
	firstRoot: Part?,
	bob: number,
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
			local pose = base * Swing.body(name, progress)
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
	if not first then
		if view.firstItem then
			view.firstItem.Parent = nil
		end
		return
	end
	if not view.firstItem then
		view.firstItem, view.firstRoot = PickModel.view()
		view.firstItem.Name = "FirstPersonPickaxe"
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

function Camera.step(view: View, active: boolean, shake: Vector3, dt: number, reduced: boolean)
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
			camera.CameraType = Enum.CameraType.Custom
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
	camera.CFrame = CFrame.lookAt(eye + shake, eye + shake + direction)
	camera.Focus = CFrame.new(eye + direction * 24)
	drawHeld(view, camera, humanoid, first, dt, reduced)
end

return Camera
