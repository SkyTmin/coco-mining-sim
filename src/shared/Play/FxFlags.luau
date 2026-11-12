--!strict
-- Visual-only marks on family events [владелец 12.11: «навыки должны визуально взаимодействовать с блоками»]. The server
-- already decides every outcome; these bits only tell the client WHICH skill fired so it can draw it. No amounts, no
-- chances: changing them never changes the mine or the profile.
local FxFlags = table.freeze({
	stormForced = 1, -- a lightning perk forced by the storm buff (bolt from the ceiling)
	pierce = 2, -- the «Пробой» skill added a layer to this hand hit
	brittle = 4, -- the «Хрупкость» skill broke the hit block in one blow
	key = 8, -- this hand hit dropped a key
	echo = 16, -- the second, echo wave of an ult
	placed = 32, -- the ult left a chest in the wall (its cell is the event's point)
	ultPierce = 64, -- the rift ult's charged next hit
})

return FxFlags
