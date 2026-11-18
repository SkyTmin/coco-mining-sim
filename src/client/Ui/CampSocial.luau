--!strict
local Players = game:GetService("Players")
local UIS = game:GetService("UserInputService")
local Gui = game:GetService("GuiService")
local Http = game:GetService("HttpService")
local RS = game:GetService("ReplicatedStorage")
local Shared = RS.Shared
local Remotes = require(Shared.Remotes)
local Config = require(Shared.Config)
local CampProfile = require(Shared.Play.CampProfile)
local Format = require(Shared.Format)
local Candy = require(script.Parent.Candy)
local Widgets = require(script.Parent.MenuWidgets)
local Look = require(script.Parent.Parent.Art.CampLook)
local Profile = require(script.Parent.Parent.ProfileState)
local Social = {}
local glyphs =
	{ like = "👍", fire = "🔥", bolt = "⚡", wow = "😮", party = "🎉", gem = "💎" }
local function thumb(id: number): string
	return if id > 0 then "rbxthumb://type=AvatarHeadShot&id=" .. id .. "&w=150&h=150" else ""
end
function Social.start(parent: Instance, tr: any)
	local me = Players.LocalPlayer
	local action = Remotes.event("CampAction")
	local plots = workspace:WaitForChild("Plots")
	local function modal(name: string, size: UDim2, color: Color3)
		return Candy.modal(parent, name, size, color, function(open)
			me:SetAttribute("CampWindow", open)
		end)
	end
	local card = modal("MinerCard", UDim2.fromScale(0.85, 0.81), Candy.purple)
	local panel = card.panel
	local portrait =
		Candy.icon(panel, nil, UDim2.fromScale(0.21, 0.29), UDim2.fromScale(0.06, 0.11))
	portrait.BackgroundTransparency, portrait.BackgroundColor3 = 0, Color3.fromHex("EAD5FA")
	Candy.round(portrait, 0)
	local nameLabel =
		Candy.text(panel, "Miner", UDim2.fromScale(0.65, 0.15), UDim2.fromScale(0.30, 0.11), 25)
	local rankLabel = Candy.text(
		panel,
		"Rank",
		UDim2.fromScale(0.65, 0.10),
		UDim2.fromScale(0.30, 0.27),
		16,
		Candy.purple
	)
	local item = Candy.icon(panel, nil, UDim2.fromScale(0.15, 0.16), UDim2.fromScale(0.05, 0.43))
	local pickLabel =
		Candy.text(panel, "Pick", UDim2.fromScale(0.34, 0.16), UDim2.fromScale(0.2, 0.43), 16)
	local stats =
		Candy.text(panel, "Stats", UDim2.fromScale(0.44, 0.23), UDim2.fromScale(0.53, 0.39), 15)
	local hint =
		Candy.text(panel, "Reason", UDim2.fromScale(0.92, 0.08), UDim2.fromScale(0.04, 0.91), 13)
	local current, cardId = nil, nil
	local friends, buttons, reasons = {}, {}, {}
	local function findPlot(id: number)
		for _, plot in plots:GetChildren() do
			if plot:GetAttribute("CampUser") == id then
				return plot
			end
		end
		return nil
	end
	local function render()
		if
			not current
			or current:GetAttribute("CampUser") ~= cardId
			or not current:GetAttribute("CampCard")
		then
			Candy.show(card, false)
			return
		end
		local data = Http:JSONDecode(current:GetAttribute("CampCard"))
		local mine = cardId == me.UserId
		local offline = current:GetAttribute("Hologram")
		nameLabel.Text = data.name
		rankLabel.Text = tr(if data.rank == "none" then "camp_rank_none" else "rank_" .. data.rank)
		if offline then
			rankLabel.Text ..= "  ·  " .. tr(
				"camp_week_place",
				current:GetAttribute("WeekPlace") or 1
			)
		end
		portrait.Image = thumb(cardId)
		local pick = data.showcase[1] or data.pick
		if item:GetAttribute("Shown") ~= pick then
			Widgets.pickIcon(item, pick)
			item:SetAttribute("Shown", pick)
		end
		pickLabel.Text = Widgets.pickName(tr, pick)
		stats.Text = tr("camp_record")
			.. "   "
			.. Format.short(data.bestDepth)
			.. "\n"
			.. tr("camp_likes")
			.. "   "
			.. Format.short(data.likes)
			.. "\n"
			.. tr("camp_wins")
			.. "   "
			.. Format.short(data.duelWins)
		card.title.Text = tr("camp_card")
		local p = Profile.getProfile()
		local liked = p
			and p.likesGiven.day == CampProfile.day(os.time())
			and p.likesGiven.ids[tostring(cardId)]
		local busy = current:GetAttribute("Busy")
			or me:GetAttribute("GuestPlot")
			or me:GetAttribute("InDuel")
		local access = current:GetAttribute("CampGuests")
		table.clear(reasons)
		reasons.like = if liked then "camp_liked" else nil
		reasons.friend = if cardId < 0
			then "camp_qa_friend"
			elseif friends[cardId] then "camp_mode_friends"
			else nil
		reasons.help = if busy
			then "camp_busy"
			elseif access == "none" then "camp_no_help"
			elseif
				access == "friends"
				and cardId > 0
				and not friends[cardId]
			then "camp_need_friends"
			else nil
		reasons.duel = if busy
			then "camp_busy"
			elseif
				not (current:GetAttribute("AtWall") and me:GetAttribute("OnMinePlatform"))
			then "camp_wall_required"
			else nil
		if (me:GetAttribute("DuelReadyAt") or 0) > workspace:GetServerTimeNow() then
			reasons.duel = "camp_again_at"
		end
		reasons.watch = if me:GetAttribute("GuestPlot") or me:GetAttribute("InDuel")
			then "camp_busy"
			else nil
		for op, b in buttons do
			b.box.Visible = not offline and ((op == "settings" or op == "invite") == mine)
			b.text.Text = tr(if op == "like" and liked then "camp_liked" else "camp_" .. op)
			Candy.paint(
				b,
				if reasons[op]
					then "disabled"
					elseif op == "like" then "coin"
					elseif op == "duel" then "purple"
					else "neutral"
			)
		end
	end
	for i, op in { "like", "watch", "help", "duel", "friend", "settings", "invite" } do
		local n = if i >= 6 then i - 6 else i - 1
		local b = Candy.button(
			panel,
			op,
			UDim2.fromScale(0.29, 0.12),
			UDim2.fromScale(0.045 + (n % 3) * 0.31, 0.63 + math.floor(n / 3) * 0.15),
			"neutral",
			16
		)
		buttons[op] = b
		b.input.Activated:Connect(function()
			if not current or current:GetAttribute("CampUser") ~= cardId then
				Candy.show(card, false)
				return
			end
			if reasons[op] then
				hint.Text = tr(reasons[op])
				return
			end
			if op == "friend" then
				local other = Players:GetPlayerByUserId(cardId)
				if other then
					pcall(function()
						game:GetService("StarterGui"):SetCore("PromptSendFriendRequest", other)
					end)
				end
			elseif op == "invite" then
				pcall(function()
					game:GetService("SocialService"):PromptGameInvite(me)
				end)
			elseif op == "settings" then
				Candy.show(card, false)
				me:SetAttribute("OpenCampSettings", os.clock())
			elseif op == "watch" then
				Remotes.event("CampWatch"):FireServer(tonumber(current.Name:match("%d+$")))
				Candy.show(card, false)
			else
				action:FireServer(op, cardId)
				if op ~= "like" then
					Candy.show(card, false)
				end
			end
		end)
	end
	local function open(plot: any)
		local id = plot and plot:GetAttribute("CampUser")
		if not id or not plot:GetAttribute("CampCard") then
			return
		end
		current, cardId = plot, id
		hint.Text = ""
		render()
		Candy.show(card, true)
		action:FireServer("card", id)
		if id > 0 and id ~= me.UserId and friends[id] == nil then
			task.spawn(function()
				local ok, value = pcall(me.IsFriendsWith, me, id)
				if ok then
					friends[id] = value
					if card.open then
						render()
					end
				end
			end)
		end
	end
	local function at(point: Vector2, screen: boolean)
		local cam = workspace.CurrentCamera
		if not cam then
			return
		end
		local ray = if screen
			then cam:ScreenPointToRay(point.X, point.Y)
			else cam:ViewportPointToRay(point.X, point.Y)
		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Exclude
		params.FilterDescendantsInstances = if me.Character then { me.Character } else {}
		local hit = workspace:Raycast(ray.Origin, ray.Direction * 145, params)
		local obj: Instance? = hit and hit.Instance
		while obj and obj ~= workspace do
			if obj.Parent == plots and hit and hit.Instance.Name ~= "Plaque" then
				return
			end
			local id = obj:GetAttribute("CampUser")
			if id then
				open(findPlot(id))
				return
			end
			if obj:IsA("Model") then
				local other = Players:GetPlayerFromCharacter(obj)
				if other then
					open(findPlot(other.UserId))
					return
				end
			end
			obj = obj.Parent
		end
	end
	local controls = Candy.layer(parent, "CampActions", 7)
	local dial = Candy.button(
		controls,
		"React",
		UDim2.fromOffset(42, 42),
		UDim2.new(1, -61, 0.51, 0),
		"purple",
		22
	)
	dial.text.Text = "☺"
	local ring = modal("ReactionWheel", UDim2.fromScale(0.54, 0.69), Candy.purple)
	ring.title.Text = tr("camp_react")
	for i, id in Config.social.reactions do
		local angle = (i - 1) * math.pi / 3 - math.pi / 2
		local b = Candy.button(
			ring.panel,
			"react_" .. id,
			UDim2.fromScale(0.24, 0.22),
			UDim2.fromScale(0.38 + math.cos(angle) * 0.31, 0.42 + math.sin(angle) * 0.30),
			"neutral",
			24
		)
		b.text.Text = glyphs[id]
		b.input.Activated:Connect(function()
			action:FireServer("react", id)
			Candy.show(ring, false)
		end)
	end
	local function toggleRing()
		if dial.box.Visible then
			ring.title.Text = tr("camp_react")
			Candy.show(ring, not ring.open)
		end
	end
	dial.input.Activated:Connect(toggleRing)
	UIS.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.DPadDown and not me:GetAttribute("CampWindow") then
			toggleRing()
		elseif
			input.KeyCode == Enum.KeyCode.ButtonA
			and not Gui.SelectedObject
			and workspace.CurrentCamera
		then
			at(workspace.CurrentCamera.ViewportSize / 2, false)
		elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
			at(UIS:GetMouseLocation(), false)
		end
	end)
	UIS.TouchTapInWorld:Connect(function(point, processed)
		if not processed then
			at(point, false)
		end
	end)
	local function bindPlot(plot: Instance)
		local function plaque()
			if not plot:GetAttribute("Hologram") then
				return
			end
			local raw = plot:GetAttribute("CampCard")
			local inscription = plot:FindFirstChild("Inscription", true)
			if raw and inscription and inscription:IsA("TextLabel") then
				local d = Http:JSONDecode(raw)
				inscription.Text = string.format(
					"🏆 %s   %s   ⛏ %s",
					tr("camp_week_place", plot:GetAttribute("WeekPlace") or 1),
					d.name,
					Format.short(d.bestDepth)
				)
			end
		end
		local language = me:GetAttributeChangedSignal("MineLanguage"):Connect(plaque)
		plot.Destroying:Once(function()
			language:Disconnect()
		end)
		plot.DescendantAdded:Connect(function(item)
			if item.Name == "Inscription" then
				task.defer(plaque)
			end
		end)
		plot.AttributeChanged:Connect(function(key)
			if key == "Hologram" or key == "WeekPlace" or key == "CampCard" then
				task.defer(plaque)
			end
			if card.open and current == plot then
				render()
			end
		end)
		plaque()
		task.defer(function()
			local strip = plot:WaitForChild("SpectatorStrip", 8)
			if not strip then
				return
			end
			local prompt = Instance.new("ProximityPrompt")
			local function refresh()
				local id = plot:GetAttribute("CampUser")
				local p = Profile.getProfile()
				local liked = p
					and p.likesGiven.day == CampProfile.day(os.time())
					and p.likesGiven.ids[tostring(id)]
				prompt.Enabled = id ~= nil
					and id ~= me.UserId
					and not plot:GetAttribute("Hologram")
					and not liked
				prompt.ActionText, prompt.ObjectText = tr("camp_like"), "♥"
			end
			prompt.RequiresLineOfSight, prompt.MaxActivationDistance, prompt.Parent =
				false, 11, strip
			prompt.Triggered:Connect(function()
				action:FireServer("like", plot:GetAttribute("CampUser"))
			end)
			plot:GetAttributeChangedSignal("CampUser"):Connect(refresh)
			plot:GetAttributeChangedSignal("Hologram"):Connect(refresh)
			local changes = Profile.changed:Connect(refresh)
			plot.Destroying:Once(function()
				changes:Disconnect()
			end)
			refresh()
		end)
	end
	plots.ChildAdded:Connect(bindPlot)
	for _, plot in plots:GetChildren() do
		bindPlot(plot)
	end
	Profile.changed:Connect(function()
		if card.open then
			render()
		end
	end)
	local offer = modal("CampOffer", UDim2.fromScale(0.72, 0.42), Candy.purple)
	local invitation = Candy.text(
		offer.panel,
		"Invitation",
		UDim2.fromScale(0.9, 0.4),
		UDim2.fromScale(0.05, 0.14),
		20
	)
	local token = nil
	for i, yes in { true, false } do
		local b = Candy.button(
			offer.panel,
			if yes then "Yes" else "No",
			UDim2.fromScale(0.38, 0.25),
			UDim2.fromScale(0.08 + (i - 1) * 0.46, 0.63),
			if yes then "confirm" else "neutral",
			16
		)
		b.text.Text = tr(if yes then "camp_affirm" else "camp_decline")
		b.input.Activated:Connect(function()
			action:FireServer("answer", nil, { id = token, yes = yes })
			Candy.show(offer, false)
		end)
	end
	local helping =
		Candy.panel(controls, "Helper", UDim2.fromOffset(228, 40), UDim2.new(0.5, -114, 0, 38))
	local helpText =
		Candy.text(helping, "Host", UDim2.fromScale(0.64, 1), UDim2.fromScale(0, 0), 15)
	local leave = Candy.button(
		helping,
		"Leave",
		UDim2.fromScale(0.32, 0.78),
		UDim2.fromScale(0.66, 0.09),
		"close",
		15
	)
	leave.text.Text = tr("camp_leave")
	leave.input.Activated:Connect(function()
		action:FireServer("leave")
	end)
	local function role()
		local index = me:GetAttribute("GuestPlot")
		local plot = index and plots:FindFirstChild("Plot_" .. index)
		local raw = plot and plot:GetAttribute("CampCard")
		helping.Visible = index ~= nil
		helpText.Text = if raw then tr("camp_helping", Http:JSONDecode(raw).name) else ""
	end
	me:GetAttributeChangedSignal("GuestPlot"):Connect(role)
	role()
	Remotes.event("CampSignal").OnClientEvent:Connect(function(kind, id, value, seq)
		if kind == "offer" then
			token = seq
			offer.title.Text = tr(if id == "duel" then "camp_duel" else "camp_help")
			invitation.Text = tr(if id == "duel" then "camp_duel_ask" else "camp_guest_ask", value)
			Candy.show(offer, true)
			task.delay(Config.social.askSeconds, function()
				if token == seq then
					Candy.show(offer, false)
				end
			end)
			return
		end
		if kind == "reaction" and (id == me.UserId or not Profile.preference("hideReactions")) then
			local other = Players:GetPlayerByUserId(id)
			if other and other.Character then
				Look.reaction(other.Character, value)
			end
		end
	end)
	local function device()
		dial.box.Visible = not me:GetAttribute("OnMinePlatform")
	end
	me:GetAttributeChangedSignal("OnMinePlatform"):Connect(device)
	device()
end
return Social
