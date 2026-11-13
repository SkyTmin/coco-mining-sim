--!strict
-- Keep Studio and live progress in separate namespaces.
local StorageNames = {}
local Config = require(script.Parent.Config)
local Policy = require(script.Parent.Play.StoragePolicy)
local studio = game:GetService("RunService"):IsStudio()

StorageNames.Environment = if studio then "studio" else "live"
StorageNames.LivePrefix = Config.game.storage.livePrefix
StorageNames.StudioPrefix = Config.game.storage.studioPrefix
StorageNames.Prefix = if studio then StorageNames.StudioPrefix else StorageNames.LivePrefix

function StorageNames.progress(base: string): string
	return Policy.name(Config.game.storage, studio, game.PlaceId, base)
end

return StorageNames
