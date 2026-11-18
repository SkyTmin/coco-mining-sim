--!strict
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local Http = game:GetService("HttpService")
local Candy = require(script.Parent.Candy)
local Profile = require(script.Parent.Parent.ProfileState)
local Format = require(RS.Shared.Format)
local Remotes = require(RS.Shared.Remotes)
local CampBoard = {}

local function text(
	parent: Instance,
	name: string,
	size: UDim2,
	pos: UDim2,
	font: number
): TextLabel
	local v = Instance.new("TextLabel")
	v.Name, v.BackgroundTransparency, v.Size, v.Position = name, 1, size, pos
	v.Font, v.TextSize, v.TextColor3, v.Parent = Enum.Font.GothamBold, font, Candy.ink, parent
	return v
end
local function fill(parent: Instance, rows: { any }, own: any, tr: any)
	local old = parent:FindFirstChild("Rows")
	local scroll = if old then (old :: ScrollingFrame).CanvasPosition else Vector2.zero
	if old then
		old:Destroy()
	end
	local list = Instance.new("ScrollingFrame")
	list.Name, list.Position, list.Size =
		"Rows", UDim2.fromScale(0.03, 0.22), UDim2.fromScale(0.94, 0.59)
	list.BackgroundTransparency, list.BorderSizePixel, list.ScrollBarThickness = 1, 0, 5
	list.CanvasSize, list.Parent = UDim2.fromOffset(0, #rows * 38), parent
	for i, entry in rows do
		local row = Instance.new("Frame")
		row.Size, row.Position = UDim2.new(1, -6, 0, 35), UDim2.fromOffset(0, (i - 1) * 38)
		row.BackgroundColor3 = if i == 1
			then Color3.fromHex("FFE7A0")
			elseif i % 2 == 0 then Color3.fromHex("EFE5FA")
			else Color3.fromHex("FFFAEB")
		row.BorderSizePixel, row.Parent = 0, list
		Candy.round(row, 6)
		text(row, "Place", UDim2.fromScale(0.13, 1), UDim2.fromScale(0, 0), 17).Text = tostring(i)
		local avatar = Instance.new("ImageLabel")
		avatar.BackgroundTransparency, avatar.Size, avatar.Position =
			1, UDim2.fromOffset(32, 32), UDim2.fromScale(0.13, 0)
		avatar.Image, avatar.Parent =
			"rbxthumb://type=AvatarHeadShot&id=" .. entry.userId .. "&w=48&h=48", row
		Candy.round(avatar, 0)
		local who = text(row, "Name", UDim2.fromScale(0.48, 1), UDim2.fromScale(0.26, 0), 16)
		who.TextXAlignment, who.TextTruncate, who.Text =
			Enum.TextXAlignment.Left, Enum.TextTruncate.AtEnd, entry.name
		text(row, "Depth", UDim2.fromScale(0.25, 1), UDim2.fromScale(0.74, 0), 17).Text = "⛏ "
			.. Format.short(entry.depth)
	end
	if #rows == 0 then
		text(list, "Empty", UDim2.new(1, 0, 0, 40), UDim2.fromScale(0, 0), 15).Text =
			tr("camp_empty")
	end
	list.CanvasPosition = scroll
	local footer = parent:FindFirstChild("YourRow")
		or text(parent, "YourRow", UDim2.fromScale(0.95, 0.08), UDim2.fromScale(0.025, 0.82), 16)
	footer.Text = string.format("%s   %s   ⛏ %s", own.place, own.name, Format.short(own.depth))
	local gap = parent:FindFirstChild("Gap")
		or text(parent, "Gap", UDim2.fromScale(0.95, 0.08), UDim2.fromScale(0.025, 0.91), 14)
	gap.Text = if #rows >= 100 and own.place == "100+"
		then tr("camp_gap", Format.short(math.max(0, rows[100].depth + 1 - own.depth)))
		else ""
end

function CampBoard.start(parent: Instance, tr: any)
	local self = Players.LocalPlayer
	local cache = RS:WaitForChild("Leaderboard")
	local model = workspace:WaitForChild("Camp"):WaitForChild("TopBoard")
	local switch = model:WaitForChild("Switch") :: BasePart
	local board = model:WaitForChild("Face"):WaitForChild("BoardSurface")
	local surface = board:Clone() :: SurfaceGui
	surface.Adornee, surface.Active, surface.Parent = board.Parent :: BasePart, true, parent
	board.Enabled = false
	local page = "Week"
	local function analytics()
		Remotes.event("CampAction"):FireServer("board")
	end
	local modal = Candy.modal(
		parent,
		"CampRecords",
		UDim2.fromScale(0.86, 0.82),
		Candy.purple,
		function(open)
			self:SetAttribute("CampWindow", open)
			if open then
				analytics()
			end
		end
	)
	local paper = surface:WaitForChild("Content")
	local title = text(paper, "Title", UDim2.fromScale(1, 0.13), UDim2.fromScale(0, 0), 30)
	local pageButtons = {}
	local function refresh()
		local rows = Http:JSONDecode(cache:GetAttribute(page) or "[]")
		local p = Profile.getProfile()
		local depth = if not p
			then 0
			elseif page == "Week" then (if p.weekBest.week
					== cache:GetAttribute("WeekKey")
				then p.weekBest.depth
				else 0)
			else p.bestDepth
		local own = { place = "100+", name = self.DisplayName, depth = depth }
		for i, row in rows do
			if row.userId == self.UserId then
				own.place = tostring(i)
				break
			end
		end
		for _, panel in { paper, modal.panel } do
			fill(panel, rows, own, tr)
		end
		title.Text = "🏆  " .. tr("camp_board")
		modal.title.Text = tr("camp_board")
		for _, b in pageButtons do
			b.Text = tr(if b.Name == "Week" then "camp_week" else "camp_all")
			b.BackgroundColor3 = if b.Name == page
				then Color3.fromHex("E5C5FF")
				else Color3.fromHex("FFF3D8")
		end
	end
	for _, panel in { paper, modal.panel } do
		for i, period in { "Week", "All" } do
			local button = Instance.new("TextButton")
			button.Name, button.Size, button.Position =
				period, UDim2.fromScale(0.4, 0.08), UDim2.fromScale(0.08 + (i - 1) * 0.44, 0.13)
			button.Font, button.TextScaled, button.TextColor3, button.Parent =
				Enum.Font.GothamBold, true, Candy.ink, panel
			Candy.round(button, 5)
			table.insert(pageButtons, button)
			button.Activated:Connect(function()
				page = period
				refresh()
			end)
		end
	end
	local click = Instance.new("ClickDetector")
	click.MaxActivationDistance, click.Parent = 25, switch
	click.MouseClick:Connect(function()
		page = if page == "Week" then "All" else "Week"
		refresh()
	end)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText, prompt.ObjectText, prompt.RequiresLineOfSight, prompt.MaxActivationDistance, prompt.Parent =
		tr("camp_board"), "", false, 10, switch
	prompt.Triggered:Connect(function()
		Candy.show(modal, true)
	end)
	local near = false
	task.spawn(function()
		while model.Parent do
			local char = self.Character
			local close = char ~= nil and (char:GetPivot().Position - switch.Position).Magnitude < 6
			if close and not near then
				Candy.show(modal, true)
			end
			near = close
			task.wait(0.5)
		end
	end)
	cache.AttributeChanged:Connect(refresh)
	self:GetAttributeChangedSignal("MineLanguage"):Connect(function()
		prompt.ActionText = tr("camp_board")
		refresh()
	end)
	local lastDepth = ""
	Profile.changed:Connect(function()
		local p = Profile.getProfile()
		local key = p and tostring(p.bestDepth) .. "/" .. p.weekBest.depth
		if key ~= lastDepth then
			lastDepth = key
			refresh()
		end
	end)
	refresh()
end
return CampBoard
