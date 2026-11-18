--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Candy = require(script.Parent.Candy)
local Remotes = require(Shared.Remotes)
local Debris = game:GetService("Debris")
local CampHud = {}
function CampHud.start(wallet: Frame, player: Player)
	local badge = Candy.panel(wallet, "Viewers", UDim2.fromOffset(85, 30), UDim2.new(0, 0, 1, 32))
	local count = Candy.text(badge, "Count", UDim2.fromScale(1, 1), UDim2.fromScale(0, 0), 16)
	local function refresh()
		local n = player:GetAttribute("CampViewers") or 0
		badge.Visible = n > 0
		count.Text = "👀  " .. n
	end
	refresh()
	player:GetAttributeChangedSignal("CampViewers"):Connect(refresh)
	Remotes.event("CampNotice").OnClientEvent:Connect(function(kind, id)
		if kind ~= "viewer" and kind ~= "like" then
			return
		end
		local row = Candy.panel(wallet, "Notice", UDim2.fromOffset(72, 36), UDim2.new(1, 6, 1, 3))
		local img = Instance.new("ImageLabel")
		img.BackgroundTransparency, img.Size, img.Image, img.Parent =
			1,
			UDim2.fromScale(0.5, 1),
			"rbxthumb://type=AvatarHeadShot&id=" .. id .. "&w=48&h=48",
			row
		Candy.round(img, 0)
		Candy.text(row, "Glyph", UDim2.fromScale(0.48, 1), UDim2.fromScale(0.5, 0), 16).Text = if kind
				== "viewer"
			then "👀"
			else "♥"
		if kind == "like" then
			require(Shared.Sfx).play("buy_soft", 0.6)
		end
		Debris:AddItem(row, 2)
	end)
end
return CampHud
