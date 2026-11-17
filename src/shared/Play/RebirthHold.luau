--!strict
local Config = require(script.Parent.Parent.Config)
local Hold = {}
function Hold.new(): any
	return { at = nil, sent = nil, ratio = 0 }
end
function Hold.begin(s: any, now: number)
	if not s.sent then
		s.at = now
	end
end
function Hold.cancel(s: any)
	s.at = nil
end
function Hold.reply(s: any)
	s.at, s.sent, s.ratio = nil, nil, 0
end
function Hold.step(s: any, now: number, dt: number): string?
	if s.sent then
		if now - s.sent >= Config.rebirth.replySeconds then
			Hold.reply(s)
			return "timeout"
		end
	elseif s.at then
		s.ratio = math.clamp((now - s.at) / Config.rebirth.holdSeconds, 0, 1)
		if s.ratio >= 1 then
			s.at, s.sent = nil, now
			return "send"
		end
	else
		s.ratio = math.max(0, s.ratio - dt / Config.rebirth.releaseSeconds)
	end
	return nil
end
return Hold
