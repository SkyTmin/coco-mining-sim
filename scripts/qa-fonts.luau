--!strict
-- Studio Edit preview, removed with the rest of the local QA changes.
assert(game.PlaceId == 87020443315503 and not game:GetService("RunService"):IsRunning())
local StarterGui = game:GetService("StarterGui")
local previous = StarterGui:FindFirstChild("Stage02Fonts")
if previous then
	previous:Destroy()
end
local gui = Instance.new("ScreenGui")
gui.Name = "Stage02Fonts"
local panel = Instance.new("Frame")
panel.Size, panel.Position = UDim2.fromOffset(680, 285), UDim2.fromScale(0.06, 0.12)
panel.BackgroundColor3, panel.Parent = Color3.fromRGB(250, 238, 218), gui
for i, name in { "FredokaOne", "LuckiestGuy", "BuilderSans", "GothamBold", "Arimo" } do
	local text = Instance.new("TextLabel")
	text.Size, text.Position = UDim2.new(1, -12, 0, 50), UDim2.fromOffset(6, (i - 1) * 55 + 4)
	text.Text = name
		.. "   Монеты 1.15K · Мир 3 · Ульта!   /   Coins · World · Ultimate"
	text.TextSize, text.TextWrapped, text.BackgroundTransparency = 19, true, 1
	local ok, font = pcall(function()
		return (Enum.Font :: any)[name]
	end)
	if ok and font then
		text.Font = font
	end
	text.Parent = panel
end
gui.Parent = StarterGui
return "Stage02Fonts"
