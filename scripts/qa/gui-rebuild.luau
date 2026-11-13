-- QA (Studio, Edit): rebuilds a scripts/qa/gui-dump.luau output under StarterGui.QAGuiSnapshot for a real screenshot.
-- Prepend: local DATA = [==[<dump json>]==]   Delete the ScreenGui after the shot; never save the place with it.
local Http = game:GetService("HttpService")
local data = Http:JSONDecode(DATA)
local old = game.StarterGui:FindFirstChild("QAGuiSnapshot") if old then old:Destroy() end
local gui = Instance.new("ScreenGui")
gui.Name, gui.IgnoreGuiInset, gui.ZIndexBehavior, gui.ResetOnSpawn = "QAGuiSnapshot", true, Enum.ZIndexBehavior.Global, false
gui.ScreenInsets = Enum.ScreenInsets.None
local vp = workspace.CurrentCamera.ViewportSize
local kx, ky = vp.X / data.vp[1], vp.Y / data.vp[2]
local k = math.min(kx, ky)
local function C(t) return Color3.fromRGB(t[1], t[2], t[3]) end
for i, e in data.items do
	local o
	if e.t ~= nil then o = Instance.new("TextLabel") elseif e.img ~= nil then o = Instance.new("ImageLabel") else o = Instance.new("Frame") end
	o.AnchorPoint = Vector2.new(0.5, 0.5)
	o.Position = UDim2.fromOffset(e.x * kx, e.y * ky)
	o.Size = UDim2.fromOffset(e.w * kx, e.h * ky)
	o.Rotation, o.BorderSizePixel, o.ZIndex = e.r, 0, i
	o.BackgroundColor3, o.BackgroundTransparency = C(e.bg), e.bt
	if e.t ~= nil then
		o.Text, o.TextColor3, o.TextTransparency, o.TextScaled, o.TextSize = e.t, C(e.tc), e.tt, e.sc, e.ts * k
		o.TextXAlignment, o.TextYAlignment = Enum.TextXAlignment[e.xa], Enum.TextYAlignment[e.ya]
		o.TextWrapped, o.RichText = e.wr, e.rich
		o.FontFace = Font.new(e.font, Enum.FontWeight[e.wt])
		if e.mx then local c = Instance.new("UITextSizeConstraint") c.MaxTextSize, c.MinTextSize = math.max(1, math.round(e.mx * k)), math.max(1, math.round(e.mn * k)) c.Parent = o end
	end
	if e.img ~= nil then
		o.Image, o.ImageColor3, o.ImageTransparency = e.img, C(e.ic), e.it
		o.ImageRectOffset, o.ImageRectSize = Vector2.new(e.ro[1], e.ro[2]), Vector2.new(e.rs[1], e.rs[2])
		o.ScaleType = Enum.ScaleType[e.st]
	end
	if e.cr then local c = Instance.new("UICorner") c.CornerRadius = UDim.new(e.cr[1], e.cr[2] * k) c.Parent = o end
	if e.sk then local s = Instance.new("UIStroke") s.Color, s.Thickness, s.ApplyStrokeMode, s.Transparency = C(e.sk[1]), e.sk[2] * k, Enum.ApplyStrokeMode[e.sk[3]], e.sk[4] s.Parent = o end
	if e.gr then
		local ks = {}
		for _, kp in e.gr[1] do table.insert(ks, ColorSequenceKeypoint.new(kp[1], C(kp[2]))) end
		local g = Instance.new("UIGradient") g.Color, g.Rotation = ColorSequence.new(ks), e.gr[2] g.Parent = o
	end
	o.Parent = gui
end
gui.Parent = game.StarterGui
return string.format("rebuilt %d items, vp %s from %dx%d", #data.items, tostring(vp), data.vp[1], data.vp[2])
