--!strict
local Storage = {}
function Storage.name(config: any, studio: boolean, placeId: number, base: string): string
	local prefix = if studio then config.studioPrefix else config.livePrefix
	return prefix
		.. base
		.. (if table.find(config.isolatedPlaces, placeId) then "_P" .. tostring(placeId) else "")
end
return Storage
