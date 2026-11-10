--!strict
-- Keep Studio and live progress in separate namespaces.
local StorageNames = {}
local studio = game:GetService("RunService"):IsStudio()

StorageNames.Environment = if studio then "studio" else "live"
StorageNames.LivePrefix = "CMS_L_"
StorageNames.StudioPrefix = "CMS_S_"
StorageNames.Prefix = if studio then StorageNames.StudioPrefix else StorageNames.LivePrefix

function StorageNames.progress(base: string): string
	return StorageNames.Prefix .. base
end

return StorageNames
