--!strict

local player = game:GetService("Players").LocalPlayer
local Candy = require(script.Parent.Ui.Candy)

type Translate = (string, ...any) -> string
type Message = { key: string, args: { any }? }

local Toast = {}

function Toast.create(playerGui: Instance, translate: Translate): (string, { any }?) -> ()
	local gui = Candy.layer(playerGui, "Toast", 20)
	local box, surface =
		Candy.panel(gui, "Message", UDim2.fromOffset(340, 44), UDim2.new(0.5, 0, 1, -80))
	box.AnchorPoint, box.Visible = Vector2.new(0.5, 1), false
	local label =
		Candy.text(box, "Label", UDim2.fromScale(0.93, 0.94), UDim2.fromScale(0.035, 0.03), 17)
	label.TextWrapped = true

	local queue: { Message } = {}
	local showing = false
	local current: Message? = nil
	local function refresh()
		local message = current
		if message then
			local morph = message.key:sub(1, 12) == "morph_toast_"
			box.AnchorPoint = Vector2.new(0.5, if morph then 0 else 1)
			Candy.move(box, if morph then UDim2.new(0.5, 0, 0, 88) else UDim2.new(0.5, 0, 1, -80))
			surface.BackgroundColor3 = if morph then Candy.purple else Candy.panelColor
			label.TextColor3 = if morph then Candy.white else Candy.ink
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
				box.Visible = true
				task.wait(4)
			end
			box.Visible = false
			current = nil
			showing = false
		end)
	end
end

return Toast
