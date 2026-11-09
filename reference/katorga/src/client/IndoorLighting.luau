--!strict
-- Brighter light inside closed places [владелец 22.10: «в шахте плохое освещение, камня почти не видно»].
-- Under a roof the sky does not reach the blocks and only Lighting.Ambient lights them, which made the
-- quarry cave nearly black. Parts tagged IndoorLighting (scripts/build-quarry.luau: the cave volume)
-- carry the attributes Ambient (Color3) and Exposure (number); while the local player stands inside one,
-- the client eases Lighting toward those values and thins the outdoor haze, and eases back outside.
-- Optional attributes tint the air of a whole location (Преисподняя: a red murk, scripts/build-underworld.luau):
-- Haze (Atmosphere.Density instead of the thin indoor haze), AtmosphereColor, AtmosphereDecay (Color3);
-- ClockTime and Brightness turn an open location to night (Пустотная крепость: scripts/build-end-castle.luau).
-- Tint (Color3) colours the whole picture through a ColorCorrectionEffect: the atmosphere's haze does not show at
-- low render quality (Studio 26.10, Изнанка: the red dusk read as a plain blue sky).
-- Local only: other players keep their own lighting.
-- PRIS+ «Включение ночи» [клиент prison_plus] (этап 8): IndoorLighting.SetNight(on) turns the outdoor clock to
-- Config.pris.nightClock / nightBrightness on this screen; a volume with its own clock still wins inside it.

local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Config = require(ReplicatedStorage:WaitForChild("Shared").Config)

local IndoorLighting = {}

local CHECK_EVERY = 0.25
local EASE = TweenInfo.new(0.8, Enum.EasingStyle.Sine)
local INDOOR_HAZE = 0.05 -- Atmosphere.Density inside: the outdoor haze turned the cave grey

local started = false
local wantNight = false

-- replaced in Start; before it only remembers the wish
function IndoorLighting.SetNight(on: boolean)
	wantNight = on
end

local function inside(volume: BasePart, position: Vector3): boolean
	local p = volume.CFrame:PointToObjectSpace(position)
	local half = volume.Size / 2
	return math.abs(p.X) <= half.X and math.abs(p.Y) <= half.Y and math.abs(p.Z) <= half.Z
end

function IndoorLighting.Start()
	if started then
		return
	end
	started = true
	local player = Players.LocalPlayer
	local outdoor: {
		Ambient: Color3,
		ExposureCompensation: number,
		ClockTime: number,
		Brightness: number,
		Density: number?,
		Color: Color3?,
		Decay: Color3?,
		Haze: number?,
	}? =
		nil
	local current: BasePart? = nil
	local tintEffect: ColorCorrectionEffect? = nil
	local function tint(colour: Color3)
		if not tintEffect then
			if colour == Color3.new(1, 1, 1) then
				return
			end
			local effect = Instance.new("ColorCorrectionEffect")
			effect.Name = "VolumeTint"
			effect.Parent = Lighting
			tintEffect = effect
		end
		TweenService:Create(tintEffect :: ColorCorrectionEffect, EASE, { TintColor = colour })
			:Play()
	end
	local function atmosphere(): Atmosphere?
		return Lighting:FindFirstChildOfClass("Atmosphere")
	end
	-- the night: the day values it replaced (outdoors, or in the remembered outdoor values while inside a volume)
	local nightSaved: { ClockTime: number, Brightness: number }? = nil
	IndoorLighting.SetNight = function(on: boolean)
		wantNight = on
		if on == (nightSaved ~= nil) then
			return
		end
		local target: any = if current and outdoor then outdoor else Lighting
		if on then
			nightSaved = { ClockTime = target.ClockTime, Brightness = target.Brightness }
			target.ClockTime = Config.pris.nightClock
			target.Brightness = Config.pris.nightBrightness
		elseif nightSaved then
			target.ClockTime = nightSaved.ClockTime
			target.Brightness = nightSaved.Brightness
			nightSaved = nil
		end
	end
	local function apply(volume: BasePart?)
		if volume == current then
			return
		end
		local air = atmosphere()
		if volume then
			if not current then
				-- remember the outdoor values (the server sets them) to come back to
				outdoor = {
					Ambient = Lighting.Ambient,
					ExposureCompensation = Lighting.ExposureCompensation,
					ClockTime = Lighting.ClockTime,
					Brightness = Lighting.Brightness,
					Density = if air then air.Density else nil,
					Color = if air then air.Color else nil,
					Decay = if air then air.Decay else nil,
					Haze = if air then air.Haze else nil,
				}
			end
			local ambient = volume:GetAttribute("Ambient")
			local exposure = volume:GetAttribute("Exposure")
			local tintColour = volume:GetAttribute("Tint")
			tint(if typeof(tintColour) == "Color3" then tintColour else Color3.new(1, 1, 1))
			TweenService:Create(Lighting, EASE, {
				Ambient = if typeof(ambient) == "Color3" then ambient else Lighting.Ambient,
				ExposureCompensation = if typeof(exposure) == "number"
					then exposure
					else Lighting.ExposureCompensation,
			}):Play()
			-- the clock jumps (a tween would sweep the sun across the sky)
			local clock = volume:GetAttribute("ClockTime")
			local brightness = volume:GetAttribute("Brightness")
			if outdoor then
				Lighting.ClockTime = if typeof(clock) == "number" then clock else outdoor.ClockTime
				Lighting.Brightness = if typeof(brightness) == "number"
					then brightness
					else outdoor.Brightness
			end
			if air and outdoor then
				local haze = volume:GetAttribute("Haze")
				local color = volume:GetAttribute("AtmosphereColor")
				local decay = volume:GetAttribute("AtmosphereDecay")
				TweenService
					:Create(air, EASE, {
						Density = if typeof(haze) == "number" then haze else INDOOR_HAZE,
						Color = if typeof(color) == "Color3"
							then color
							else outdoor.Color or air.Color,
						Decay = if typeof(decay) == "Color3"
							then decay
							else outdoor.Decay or air.Decay,
						-- the outdoor haze glows in the sky colour; indoors it washed everything milky white
						Haze = 0,
					})
					:Play()
			end
		elseif outdoor then
			tint(Color3.new(1, 1, 1))
			TweenService:Create(Lighting, EASE, {
				Ambient = outdoor.Ambient,
				ExposureCompensation = outdoor.ExposureCompensation,
			}):Play()
			Lighting.ClockTime = outdoor.ClockTime
			Lighting.Brightness = outdoor.Brightness
			if air and outdoor.Density then
				TweenService:Create(air, EASE, {
					Density = outdoor.Density,
					Color = outdoor.Color or air.Color,
					Decay = outdoor.Decay or air.Decay,
					Haze = outdoor.Haze or air.Haze,
				}):Play()
			end
			outdoor = nil
		end
		current = volume
	end
	if wantNight then
		IndoorLighting.SetNight(true)
	end
	task.spawn(function()
		while true do
			task.wait(CHECK_EVERY)
			local character = player.Character
			local root = character and character:FindFirstChild("HumanoidRootPart")
			-- the smallest volume around the player wins: a hall inside a location-wide air (Замок: KeepAir in OvercastAir)
			local found: BasePart? = nil
			local foundSize = math.huge
			if root and root:IsA("BasePart") then
				for _, volume in ipairs(CollectionService:GetTagged("IndoorLighting")) do
					if volume:IsA("BasePart") and inside(volume, root.Position) then
						local size = volume.Size.X * volume.Size.Y * volume.Size.Z
						if size < foundSize then
							found, foundSize = volume, size
						end
					end
				end
			end
			apply(found)
		end
	end)
end

return IndoorLighting
