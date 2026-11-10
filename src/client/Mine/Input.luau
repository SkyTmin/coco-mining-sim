--!strict

local InputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Input = {}

function Input.start(callbacks: any)
	local heldTouch: InputObject? = nil
	local panTouch: InputObject? = nil
	local heldMouse = false
	local rotating = false
	local touchPoint = Vector2.zero

	local function point(): Vector2
		if heldTouch then
			return touchPoint
		end
		local camera = workspace.CurrentCamera
		if callbacks.first() and camera then
			return camera.ViewportSize / 2
		end
		return InputService:GetMouseLocation()
	end

	local function strike(nearby: boolean): boolean
		local target = callbacks.aim(point(), nearby)
		if not target then
			return false
		end
		callbacks.hit(target)
		return true
	end

	InputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.Q then
			callbacks.ult()
			return
		end
		if input.KeyCode == Enum.KeyCode.V then
			callbacks.toggle()
			return
		end
		if not callbacks.active() then
			return
		end
		if input.UserInputType == Enum.UserInputType.Touch then
			if heldTouch or panTouch then
				return
			end
			heldTouch, touchPoint = input, Vector2.new(input.Position.X, input.Position.Y)
			if not strike(true) then
				heldTouch, panTouch = nil, input
			end
		elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = strike(false)
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = true
		end
	end)
	InputService.InputChanged:Connect(function(input)
		if input == heldTouch then
			touchPoint = Vector2.new(input.Position.X, input.Position.Y)
		elseif
			input == panTouch
			or (
				input.UserInputType == Enum.UserInputType.MouseMovement
				and (callbacks.first() or rotating)
			)
		then
			if callbacks.active() then
				callbacks.pan(Vector2.new(input.Delta.X, input.Delta.Y))
			end
		end
	end)
	InputService.InputEnded:Connect(function(input)
		if input == heldTouch then
			heldTouch = nil
		end
		if input == panTouch then
			panTouch = nil
		end
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = false
		end
		if input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = false
		end
	end)
	InputService.WindowFocusReleased:Connect(function()
		heldMouse, rotating, heldTouch, panTouch = false, false, nil, nil
	end)
	RunService.RenderStepped:Connect(function()
		if (heldMouse or heldTouch) and callbacks.active() then
			strike(heldTouch ~= nil)
		end
	end)
end

return Input
