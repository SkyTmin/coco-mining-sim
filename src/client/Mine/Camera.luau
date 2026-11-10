--!strict

local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Camera = {}
export type View = {
	player: Player,
	frame: CFrame,
	mode: string,
	active: boolean,
	yaw: number,
	pitch: number,
	swingAt: number,
	swingDuration: number,
	side: number,
	ability: boolean,
	heavyAt: number,
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

local function aimJoint(joint: ArmJoint, parentFrame: CFrame, orientation: CFrame): CFrame
	local pivot = parentFrame * joint.C0
	local desired = CFrame.new(pivot.Position - orientation:VectorToWorldSpace(joint.C1.Position))
		* orientation
	joint.Transform = pivot:ToObjectSpace(desired * joint.C1)
	return desired
end

function Camera.new(player: Player, frame: CFrame): View
	local view: View = {
		player = player,
		frame = frame,
		mode = "first",
		active = false,
		yaw = 0,
		pitch = math.rad(8),
		swingAt = -math.huge,
		swingDuration = 0.35,
		side = 1,
		ability = false,
		heavyAt = -math.huge,
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
		local elapsed = (os.clock() - view.swingAt) / view.swingDuration
		local pitch = if view.mode == "first" then 0.06 + view.pitch * 0.5 else -0.48
		local roll = if view.mode == "first" then 0.20 else -0.03
		if elapsed >= 0 and elapsed < 1 then
			local strength = if not view.ability
				then 1
				elseif view.mode == "first" then 0.64
				else 1.5
			local wind = if view.ability
				then (if elapsed < 0.48
					then -0.66 * elapsed / 0.48
					elseif elapsed < 0.58 then -0.66 + 1.12 * (elapsed - 0.48) / 0.10
					else 0.46 * (1 - elapsed) / 0.42)
				elseif elapsed < 0.343 then -0.58 * elapsed / 0.343
				elseif elapsed < 0.457 then -0.58 + 1.18 * (elapsed - 0.343) / 0.114
				elseif elapsed < 0.629 then 0.6 - 0.8 * (elapsed - 0.457) / 0.172
				else -0.2 * (1 - elapsed) / 0.371
			pitch += wind * strength * (if os.clock() - view.heavyAt < view.swingDuration
				then 1.55
				else 1)
			roll += view.side * 0.17 * math.sin(elapsed * math.pi)
		end
		if view.mode == "first" or elapsed < 1 then
			local facing = (view.frame * CFrame.Angles(0, view.yaw + roll, 0)).LookVector
			local up = -(facing * math.cos(pitch) + Vector3.yAxis * math.sin(pitch))
			local right = facing:Cross(Vector3.yAxis)
			local orientation = CFrame.fromMatrix(Vector3.zero, right, up, right:Cross(up))
			local upper = aimJoint(shoulder, shoulder.Part0.CFrame, orientation)
			local forearm = aimJoint(elbow, upper, orientation)
			aimJoint(wrist, forearm, orientation)
		end
	end)
	return view
end

function Camera.emphasize(view: View, now: number)
	view.heavyAt = now
end

function Camera.pan(view: View, delta: Vector2)
	view.yaw = math.clamp(view.yaw - delta.X * 0.004, -math.rad(35), math.rad(35))
	view.pitch = math.clamp(view.pitch - delta.Y * 0.004, -math.rad(25), math.rad(25))
end

function Camera.swing(view: View, interval: number, ability: boolean?)
	view.swingAt, view.swingDuration, view.side, view.ability =
		os.clock(), interval, -view.side, ability == true
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
