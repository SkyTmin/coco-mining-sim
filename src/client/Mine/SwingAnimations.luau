--!strict
-- The overhead slam and resting pose from coco-prison-roblox (stage-1, 3d7ba53).
-- The first-person item uses its own display transform and the same fast-in chop.
local Swing = {}
type Key = { number }

local keys: { [string]: { Key } } = {
	RightShoulder = {
		{ 0, 0, 0, 0 },
		{ 0.4, 155, 0, 12 },
		{ 0.55, 35, 0, -6 },
		{ 0.7, 18, 0, -4 },
		{ 1, 0, 0, 0 },
	},
	RightElbow = { { 0, 0, 0, 0 }, { 0.4, 45, 0, 0 }, { 0.55, 6, 0, 0 }, { 1, 0, 0, 0 } },
	RightWrist = { { 0, 0, 0, 0 }, { 0.4, -30, 0, 0 }, { 0.55, 25, 0, 0 }, { 1, 0, 0, 0 } },
	LeftShoulder = { { 0, 0, 0, 0 }, { 0.4, -15, 0, 8 }, { 0.55, 20, 0, -4 }, { 1, 0, 0, 0 } },
	Waist = { { 0, 0, 0, 0 }, { 0.4, 10, -10, 0 }, { 0.55, -16, 8, 0 }, { 1, 0, 0, 0 } },
	Neck = { { 0, 0, 0, 0 }, { 0.4, 8, 6, 0 }, { 0.55, -10, -4, 0 }, { 1, 0, 0, 0 } },
}

Swing.hold = {
	RightShoulder = CFrame.Angles(math.rad(14), 0, math.rad(4)),
	RightElbow = CFrame.Angles(math.rad(22), 0, 0),
}
Swing.joints = { "RightShoulder", "RightElbow", "RightWrist", "LeftShoulder", "Waist", "Neck" }

function Swing.body(name: string, progress: number?): CFrame
	local hold = Swing.hold[name] or CFrame.identity
	if not progress then
		return hold
	end
	local joint = keys[name]
	for i = 1, #joint - 1 do
		local a, b = joint[i], joint[i + 1]
		if progress <= b[1] then
			local t = (progress - a[1]) / (b[1] - a[1])
			local eased = if t < 0.5 then 2 * t * t else 1 - (-2 * t + 2) ^ 2 / 2
			return hold
				* CFrame.Angles(
					math.rad(a[2] + (b[2] - a[2]) * eased),
					math.rad(a[3] + (b[3] - a[3]) * eased),
					math.rad(a[4] + (b[4] - a[4]) * eased)
				)
		end
	end
	return hold
end

local displayFrame = CFrame.fromMatrix(
	Vector3.zero,
	Vector3.new(0, 0, -1),
	Vector3.new(0, 1, 0),
	Vector3.new(1, 0, 0)
)

function Swing.held(size: number, progress: number?): CFrame
	local k = size / 0.68
	local rest = CFrame.new(0.56 * k, -0.52 * k, -0.72 * k)
		* CFrame.new(1.13 / 16 * k, 3.2 / 16 * k, 1.13 / 16 * k)
		* CFrame.Angles(0, math.rad(-90), math.rad(25))
		* displayFrame
	if not progress then
		return rest
	end
	local q = math.min(progress / 0.8, 1)
	local f = math.sin(math.sqrt(q) * math.pi)
	local shift = CFrame.new(-0.06 * k * f, -0.12 * k * f, 0.04 * k * f)
	local grip = Vector3.new(0, -0.35, -0.35) * size
	return shift
		* rest
		* CFrame.new(grip)
		* CFrame.Angles(math.rad(-50 * f), 0, 0)
		* CFrame.new(-grip)
end

return Swing
