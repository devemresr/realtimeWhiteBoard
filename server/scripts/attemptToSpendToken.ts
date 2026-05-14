export const attemptToSpendToken = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local cost = tonumber(ARGV[4])
      local TTLforBuckets = tonumber(ARGV[5])
      
      -- Get current state
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local time_elapsed = (now - last_refill) / 1000 -- convert to seconds
      local tokens_to_add = time_elapsed * refill_rate
      tokens = math.min(capacity, tokens + tokens_to_add)
      
      -- Check if the user can consume
      if tokens >= cost then
        tokens = tokens - cost
        -- Update state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, TTLforBuckets) -- expire after 1 hour of inactivity (the default)
        return 1 -- allowed
      else
        -- Update state even if not consuming (for accurate refill tracking)
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, TTLforBuckets)
        return 0 -- not allowed
      end
    `;
