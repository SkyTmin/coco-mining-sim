--!strict

local Players = game:GetService("Players")
local ReplicatedFirst = game:GetService("ReplicatedFirst")

local Locale = require(script.Parent.Locale)
local State = require(script.Parent.LoadingState)

local Controller = {}
local TIMEOUT = 30
local TIP_SECONDS = 6

function Controller.Start()
	local startedAt = os.clock()
	local player = Players.LocalPlayer
	local playerGui = player:WaitForChild("PlayerGui", TIMEOUT)
	if not playerGui then
		ReplicatedFirst:RemoveDefaultLoadingScreen()
		return
	end

	local screen = Instance.new("ScreenGui")
	screen.Name = "Loading"
	screen.DisplayOrder = 100
	screen.IgnoreGuiInset = true
	screen.ResetOnSpawn = false

	local background = Instance.new("Frame")
	background.BackgroundColor3 = Color3.fromRGB(10, 22, 47)
	background.BorderSizePixel = 0
	background.Size = UDim2.fromScale(1, 1)
	background.Parent = screen

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.AnchorPoint = Vector2.new(0.5, 0.5)
	title.Position = UDim2.fromScale(0.5, 0.4)
	title.Size = UDim2.fromScale(0.85, 0.12)
	title.Font = Enum.Font.GothamBold
	title.TextColor3 = Color3.fromRGB(240, 245, 255)
	title.TextScaled = true
	title.Text = ""
	title.Parent = background
	local titleSize = Instance.new("UITextSizeConstraint")
	titleSize.MaxTextSize = 48
	titleSize.Parent = title

	local track = Instance.new("Frame")
	track.AnchorPoint = Vector2.new(0.5, 0.5)
	track.Position = UDim2.fromScale(0.5, 0.53)
	track.Size = UDim2.new(0.66, 0, 0, 8)
	track.BackgroundColor3 = Color3.fromRGB(40, 55, 82)
	track.BorderSizePixel = 0
	track.Parent = background
	local bar = Instance.new("Frame")
	bar.BackgroundColor3 = Color3.fromRGB(101, 182, 255)
	bar.BorderSizePixel = 0
	bar.Size = UDim2.fromScale(0.2, 1)
	bar.Parent = track

	local tip = Instance.new("TextLabel")
	tip.BackgroundTransparency = 1
	tip.AnchorPoint = Vector2.new(0.5, 0.5)
	tip.Position = UDim2.fromScale(0.5, 0.62)
	tip.Size = UDim2.fromScale(0.85, 0.12)
	tip.Font = Enum.Font.Gotham
	tip.TextColor3 = Color3.fromRGB(199, 218, 244)
	tip.TextSize = 18
	tip.TextWrapped = true
	tip.Text = ""
	tip.Parent = background

	screen.Parent = playerGui
	ReplicatedFirst:RemoveDefaultLoadingScreen()

	local translate: ((string) -> string)? = nil
	task.spawn(function()
		translate = Locale.translator(player)
	end)
	repeat
		local elapsed = os.clock() - startedAt
		if translate then
			title.Text = translate("loading_title")
			tip.Text =
				translate("loading_tip_" .. tostring(math.floor(elapsed / TIP_SECONDS) % 3 + 1))
		end
		bar.Size = UDim2.fromScale(if State.profileReceived then 0.7 else 0.2, 1)
		if (State.profileReceived and State.clientReady) or elapsed >= TIMEOUT then
			break
		end
		task.wait(0.1)
	until false
	screen:Destroy()
end

return Controller
