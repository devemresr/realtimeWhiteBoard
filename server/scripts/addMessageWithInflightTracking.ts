export const addMessageWithInflightTracking = `
-- Add message to stream
	local messageId = redis.call('XADD', unpack(ARGV))
	
	-- Create incremented key for HSET
	local roomId = KEYS[1]
	local roomKey = 'inFlight-' .. roomId

	-- Store messageId in hash
	local result = redis.call('SADD', roomKey, messageId)
	
	local resultObj = {
		result = result,
		messageId = messageId
	}
	
	return cjson.encode(resultObj)`;
