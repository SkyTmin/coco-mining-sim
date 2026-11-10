--!strict

local Config = require(script.Parent.Parent.Config)
local State = require(script.Parent.MineState)
local Validate = {}
export type Bucket = { tokens: number, at: number }

function Validate.bucket(now: number): Bucket
	return { tokens = 3, at = now }
end

function Validate.take(bucket: Bucket, now: number, interval: number): boolean
	bucket.tokens = math.min(3, bucket.tokens + math.max(0, now - bucket.at) / interval)
	bucket.at = now
	if bucket.tokens < 1 then
		return false
	end
	bucket.tokens -= 1
	return true
end

function Validate.target(st: State.MineState, own: boolean, x: any, y: any, dRel: any): number?
	if
		not own
		or type(x) ~= "number"
		or type(y) ~= "number"
		or type(dRel) ~= "number"
		or dRel % 1 ~= 0
		or dRel < 0
		or dRel >= Config.mine.window
	then
		return nil
	end
	local d = st.front + dRel
	if not State.isExposed(st, x, y, d) then
		return nil
	end
	return d
end

return Validate
