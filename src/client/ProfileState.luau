--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Types = require(Shared.Types)
local Wire = require(Shared.Wire)

local ProfileState = {}
local profile: Types.Profile? = nil
local earlyPatches: { { Types.ProfilePatchOp } } = {}

local function apply(current: Types.Profile, ops: { Types.ProfilePatchOp })
	for _, op in ops do
		(current :: any)[op.k] = if op.d then nil else Wire.decode(op.v)
	end
end

function ProfileState.getProfile(): Types.Profile?
	return profile
end

function ProfileState.setSnapshot(snapshot: any)
	local decoded = Wire.decode(snapshot) :: Types.Profile
	for _, ops in earlyPatches do
		apply(decoded, ops)
	end
	table.clear(earlyPatches)
	profile = decoded
end

function ProfileState.applyPatch(ops: { Types.ProfilePatchOp })
	if profile then
		apply(profile, ops)
	else
		table.insert(earlyPatches, ops)
	end
end

return ProfileState
