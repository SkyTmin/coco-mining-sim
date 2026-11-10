--!strict

local player = game:GetService("Players").LocalPlayer
local Kit = require(script.Parent.Ui.Kit)

type Translate = (string, ...any) -> string
type Message = { key: string, args: { any }? }

local Toast = {}

function Toast.create(playerGui: Instance, translate: Translate): (string, { any }?) -> ()
	local gui = Kit.gui(playerGui, "Toast", 110, true)
	local panel = Kit.image(
		gui,
		"Panel",
		UDim2.new(0.88, 0, 0, 54),
		UDim2.new(0.5, 0, 1, -24),
		"frame-iron",
		Vector2.new(0.5, 1)
	)
	panel.Visible = false
	local size = Instance.new("UISizeConstraint")
	size.MaxSize, size.Parent = Vector2.new(440, 54), panel
	local label = Kit.label(panel, "Text", UDim2.new(1, -26, 1, -12), UDim2.fromOffset(13, 6), 16)
	label.TextWrapped = true

	local queue: { Message } = {}
	local showing = false
	local current: Message? = nil
	local function refresh()
		local message = current
		if message then
			local morph = message.key:sub(1, 12) == "morph_toast_"
			panel.AnchorPoint = Vector2.new(0.5, if morph then 0 else 1)
			panel.Position = if morph then UDim2.new(0.5, 0, 0, 88) else UDim2.new(0.5, 0, 1, -24)
			label.Text = translate(message.key, table.unpack(message.args or {}))
		end
	end
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	return function(key, args)
		table.insert(queue, { key = key, args = args })
		if showing then
			return
		end
		showing = true
		task.spawn(function()
			while #queue > 0 do
				current = table.remove(queue, 1)
				refresh()
				panel.Visible = true
				task.wait(4)
			end
			panel.Visible = false
			current = nil
			showing = false
		end)
	end
end

return Toast
