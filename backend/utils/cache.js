/**
 * Response Caching Utility
 * Cache Grok API responses to reduce costs and improve response time
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

// Create cache instance (1 hour TTL by default)
const cache = new NodeCache({
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, // Don't clone objects (better performance)
});

/**
 * Generate cache key from request body
 */
function generateCacheKey(data) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Get cached response
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set cached response
 */
function set(key, value, ttl = 3600) {
  return cache.set(key, value, ttl);
}

/**
 * Clear specific cache key
 */
function del(key) {
  return cache.del(key);
}

/**
 * Clear all cache
 */
function flush() {
  return cache.flushAll();
}

/**
 * Get cache statistics
 */
function stats() {
  return cache.getStats();
}

module.exports = {
  generateCacheKey,
  get,
  set,
  del,
  flush,
  stats,
};
