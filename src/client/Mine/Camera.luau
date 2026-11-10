--!strict

local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local swing = Config.fx.swing
local REST_PITCH = math.rad(5.5)
local Camera = {}
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
	side: number,
	ability: boolean,
	glowing: { part: BasePart, material: Enum.Material, color: Color3 }?,
}

type ArmJoint = Motor6D | AnimationConstraint

local function armJoint(character: Model?, name: string): ArmJoint?
	local joint = character and character:FindFirstChild(name, true)
	if joint and (joint:IsA("Motor6D") or joint:IsA("AnimationConstraint")) then
		return joint
	end
	return nil
end

local function aimJoint(
	joint: ArmJoint,
	parentFrame: CFrame,
	orientation: CFrame,
	offset: Vector3?
): CFrame
	local pivot = parentFrame * joint.C0
	local desired = CFrame.new(
		pivot.Position
			+ (offset or Vector3.zero)
			- orientation:VectorToWorldSpace(joint.C1.Position)
	) * orientation
	joint.Transform = pivot:ToObjectSpace(desired * joint.C1)
	return desired
end

local function strike(time: number): (number, number)
	local windup = -math.rad(swing.windupDegrees)
	local contact = windup + math.rad(swing.travelDegrees)
	if time < swing.windup then
		local t = time / swing.windup
		return windup * t, swing.handNear * t
	elseif time < swing.contact then
		local t = ((time - swing.windup) / (swing.contact - swing.windup)) ^ 5
		return windup + (contact - windup) * t, swing.handNear * (1 - t)
	elseif time < swing.hold then
		return contact, 0
	end
	local t = (time - swing.hold) / (swing.finish - swing.hold)
	local recoil = -math.rad(swing.recoilDegrees)
	local rebound = 0.42
	if t < rebound then
		return recoil + (contact - recoil) * (1 - t / rebound) ^ 3, 0
	end
	local settle = TweenService:GetValue(
		(t - rebound) / (1 - rebound),
		Enum.EasingStyle.Back,
		Enum.EasingDirection.Out
	)
	return recoil * (1 - settle), 0
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
		side = 1,
		ability = false,
	}
	RunService.PreSimulation:Connect(function()
		if not view.active then
			return
		end
		local character = player.Character
		local shoulder = armJoint(character, "RightShoulder")
		local elbow = armJoint(character, "RightElbow")
		local wrist = armJoint(character, "RightWrist")
		if not shoulder or not shoulder.Part0 or not elbow or not wrist then
			return
		end
		local time = os.clock() - view.swingAt
		local elapsed = time / view.swingDuration
		local pitch = if view.mode == "first" then 0.06 + view.pitch * 0.5 else -0.48
		local roll = if view.mode == "first" then 0.20 else -0.03
		local near = 0
		if elapsed >= 0 and elapsed < 1 then
			if view.ability then
				local strength = if view.mode == "first" then 0.64 else 1.5
				local wind = if elapsed < 0.48
					then -0.66 * elapsed / 0.48
					elseif elapsed < 0.58 then -0.66 + 1.12 * (elapsed - 0.48) / 0.10
					else 0.46 * (1 - elapsed) / 0.42
				pitch += wind * strength
				roll += view.side * 0.17 * math.sin(elapsed * math.pi)
			else
				local angle, reach = strike(time)
				pitch += angle
				near = reach
			end
		end
		if view.mode == "first" or elapsed < 1 then
			local facing = (view.frame * CFrame.Angles(0, view.yaw + roll, 0)).LookVector
			local up = -(facing * math.cos(pitch) + Vector3.yAxis * math.sin(pitch))
			local right = facing:Cross(Vector3.yAxis)
			local orientation = CFrame.fromMatrix(Vector3.zero, right, up, right:Cross(up))
			local armLength = shoulder.C1.Position.Magnitude
				+ elbow.C0.Position.Magnitude
				+ elbow.C1.Position.Magnitude
				+ wrist.C0.Position.Magnitude
			local upper =
				aimJoint(shoulder, shoulder.Part0.CFrame, orientation, -facing * (near * armLength))
			local forearm = aimJoint(elbow, upper, orientation)
			aimJoint(wrist, forearm, orientation)
		end
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
	return math.abs(view.yaw) > math.rad(30) or math.abs(view.pitch - REST_PITCH) > math.rad(26)
end

function Camera.swing(view: View, now: number, duration: number, ability: boolean)
	view.swingAt, view.swingDuration, view.side, view.ability =
		now, if ability then duration else swing.finish, -view.side, ability
end

local function transparency(character: Model, first: boolean)
	for _, item in character:GetDescendants() do
		if not item:IsA("BasePart") then
			continue
		end
		local name = item.Name
		local right = name == "RightUpperArm"
			or name == "RightLowerArm"
			or name == "RightHand"
			or (item.Parent ~= nil and item.Parent.Name == "MinePickaxe")
		item.LocalTransparencyModifier = if first and not right then 1 else 0
	end
end

function Camera.glow(view: View, color: Color3?)
	local old = view.glowing
	if not old and not color then
		return
	end
	local character = view.player.Character
	local pick = character and character:FindFirstChild("MinePickaxe")
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

function Camera.step(view: View, active: boolean, shake: Vector3)
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
			transparency(character, false)
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
	transparency(character, first)
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
end

return Camera
