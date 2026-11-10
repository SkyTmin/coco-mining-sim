--!strict

type Translate = (string, ...any) -> string
type Message = { key: string, args: { any }? }

local Toast = {}

function Toast.create(playerGui: Instance, translate: Translate): (string, { any }?) -> ()
	local gui = Instance.new("ScreenGui")
	gui.Name = "Toast"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 110

	local label = Instance.new("TextLabel")
	label.AnchorPoint = Vector2.new(0.5, 1)
	label.Position = UDim2.new(0.5, 0, 1, -24)
	label.Size = UDim2.fromScale(0.9, 0)
	label.AutomaticSize = Enum.AutomaticSize.Y
	label.BackgroundColor3 = Color3.fromRGB(18, 32, 60)
	label.BorderSizePixel = 0
	label.Font = Enum.Font.GothamMedium
	label.TextColor3 = Color3.fromRGB(240, 245, 255)
	label.TextSize = 16
	label.TextWrapped = true
	label.Visible = false
	label.Parent = gui

	local size = Instance.new("UISizeConstraint")
	size.MaxSize = Vector2.new(440, math.huge)
	size.Parent = label
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 10)
	padding.PaddingBottom = UDim.new(0, 10)
	padding.PaddingLeft = UDim.new(0, 14)
	padding.PaddingRight = UDim.new(0, 14)
	padding.Parent = label
	gui.Parent = playerGui

	local queue: { Message } = {}
	local showing = false
	return function(key, args)
		table.insert(queue, { key = key, args = args })
		if showing then
			return
		end
		showing = true
		task.spawn(function()
			while #queue > 0 do
				local message = table.remove(queue, 1)
				label.Text = translate(message.key, table.unpack(message.args or {}))
				label.Visible = true
				task.wait(4)
			end
			label.Visible = false
			showing = false
		end)
	end
end

return Toast
