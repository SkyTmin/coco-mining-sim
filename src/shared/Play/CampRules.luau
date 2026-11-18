--!strict
local Config = require(script.Parent.Parent.Config)
local Rules = {}
function Rules.space(roles: { [any]: string }, role: string): boolean
	local count = 0
	for _, value in roles do
		if value == role then
			count += 1
		end
	end
	return count < (if role == "guest" then Config.social.guests else Config.social.viewers)
end
return Rules
