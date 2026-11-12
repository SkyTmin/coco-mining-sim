--!strict

local player = game:GetService("Players").LocalPlayer
local Candy = require(script.Parent.Ui.Candy)
local RewardBurst = require(script.Parent.Fx.RewardBurst)
local Sfx = require(game:GetService("ReplicatedStorage").Shared.Sfx)

type Translate = (string, ...any) -> string
type Message = { key: string, args: { any }? }

local Toast = {}

function Toast.create(playerGui: Instance, translate: Translate): (string, { any }?) -> ()
	local gui = Candy.layer(playerGui, "Toast", 20)
	local box = Candy.panel(gui, "Message", UDim2.fromOffset(340, 44), UDim2.new(0.5, 0, 1, -80))
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
			label.Text = translate(message.key, table.unpack(message.args or {}))
		end
	end
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	return function(key, args)
		-- card morphs: the lintly level-up burst instead of a text panel [владелец 11.11: «уведомления … убрать»]
		local id = key:match("^morph_toast_(%a+)_%d+$")
		if id then
			local text = translate(key)
			local name = text:match("[:：]%s*(.+)$") or text
			RewardBurst.show({
				icon = id,
				palette = RewardBurst.palettes.epic,
				kicker = translate("burst_morph"),
				title = name,
				subtitle = translate("card_" .. id),
			})
			return
		end
		if key == "key_received" then
			Sfx.play("buy_soft", 0.3)
		end
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
