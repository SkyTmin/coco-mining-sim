--!strict

local InputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Input = {}
local DRAG, HOLD = 12, 0.15

type Finger = {
	input: InputObject,
	origin: Vector2,
	point: Vector2,
	at: number,
	panning: boolean,
	holding: boolean,
}

local function position(input: InputObject): Vector2
	return Vector2.new(input.Position.X, input.Position.Y)
end

function Input.start(callbacks: any)
	local touch: Finger? = nil
	local heldMouse, rotating = false, false

	local function mousePoint(): Vector2
		local camera = workspace.CurrentCamera
		return if callbacks.first() and camera
			then camera.ViewportSize / 2
			else InputService:GetMouseLocation()
	end

	local function strike(point: Vector2): boolean
		local target = callbacks.aim(point)
		if target then
			callbacks.hit(target)
		end
		return target ~= nil
	end

	local function move(finger: Finger, point: Vector2)
		local delta = point - finger.point
		finger.point = point
		if not finger.panning and (point - finger.origin).Magnitude >= DRAG then
			finger.panning = true
			delta = point - finger.origin
		end
		if finger.panning and callbacks.active() and delta.Magnitude > 0 then
			callbacks.pan(delta)
		end
	end

	InputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.Q then
			callbacks.ult()
			return
		elseif input.KeyCode == Enum.KeyCode.V then
			callbacks.toggle()
			return
		elseif input.KeyCode == Enum.KeyCode.R then
			callbacks.focus()
			return
		end
		if not callbacks.active() then
			return
		end
		if input.UserInputType == Enum.UserInputType.Touch and not touch then
			local point = position(input)
			touch = {
				input = input,
				origin = point,
				point = point,
				at = os.clock(),
				panning = false,
				holding = false,
			}
		elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = strike(mousePoint())
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = true
		end
	end)
	InputService.InputChanged:Connect(function(input)
		local finger = touch
		if finger and input == finger.input then
			move(finger, position(input))
		elseif
			input.UserInputType == Enum.UserInputType.MouseMovement
			and (callbacks.first() or rotating)
			and callbacks.active()
		then
			callbacks.pan(Vector2.new(input.Delta.X, input.Delta.Y))
		end
	end)
	InputService.InputEnded:Connect(function(input)
		local finger = touch
		if finger and input == finger.input then
			touch = nil
			move(finger, position(input))
			if
				not finger.panning
				and not finger.holding
				and input.UserInputState == Enum.UserInputState.End
			then
				strike(finger.point)
			end
		elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = false
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = false
		end
	end)
	InputService.WindowFocusReleased:Connect(function()
		heldMouse, rotating, touch = false, false, nil
	end)
	RunService.RenderStepped:Connect(function()
		if not callbacks.canHit() then
			return
		end
		local finger = touch
		if finger and not finger.panning and os.clock() - finger.at >= HOLD then
			finger.holding = strike(finger.point) or finger.holding
		elseif heldMouse then
			strike(mousePoint())
		end
	end)
end

return Input
