/**
 * Cache Utility Tests
 */

const cache = require('../../../utils/cache');

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear cache before each test
    cache.flush();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same input', () => {
      const data = { messages: ['hello'], temperature: 0.7 };
      const key1 = cache.generateCacheKey(data);
      const key2 = cache.generateCacheKey(data);

      expect(key1).toBe(key2);
      expect(key1).toBeDefined();
      expect(typeof key1).toBe('string');
    });

    it('should generate different keys for different inputs', () => {
      const data1 = { messages: ['hello'], temperature: 0.7 };
      const data2 = { messages: ['goodbye'], temperature: 0.7 };
      const key1 = cache.generateCacheKey(data1);
      const key2 = cache.generateCacheKey(data2);

      expect(key1).not.toBe(key2);
    });

    it('should handle complex nested objects', () => {
      const data = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        systemPrompt: 'You are helpful',
        temperature: 0.7,
      };
      const key = cache.generateCacheKey(data);

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should be order-sensitive for arrays', () => {
      const data1 = { messages: ['a', 'b', 'c'] };
      const data2 = { messages: ['c', 'b', 'a'] };
      const key1 = cache.generateCacheKey(data1);
      const key2 = cache.generateCacheKey(data2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      const key = 'test-key';
      const value = { response: 'Hello world' };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('non-existent-key');

      expect(retrieved).toBeUndefined();
    });

    it('should handle string values', () => {
      cache.set('string-key', 'simple string');
      const retrieved = cache.get('string-key');

      expect(retrieved).toBe('simple string');
    });

    it('should handle number values', () => {
      cache.set('number-key', 12345);
      const retrieved = cache.get('number-key');

      expect(retrieved).toBe(12345);
    });

    it('should handle array values', () => {
      const array = [1, 2, 3, 4, 5];
      cache.set('array-key', array);
      const retrieved = cache.get('array-key');

      expect(retrieved).toEqual(array);
    });

    it('should handle nested objects', () => {
      const nested = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };
      cache.set('nested-key', nested);
      const retrieved = cache.get('nested-key');

      expect(retrieved).toEqual(nested);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire values after TTL', async () => {
      const key = 'expiring-key';
      const value = 'expiring value';

      // Set with 1 second TTL
      cache.set(key, value, 1);

      // Should exist immediately
      expect(cache.get(key)).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get(key)).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      const key = 'default-ttl-key';
      cache.set(key, 'value');

      // Should exist
      expect(cache.get(key)).toBe('value');
    });
  });

  describe('del', () => {
    it('should delete existing keys', () => {
      cache.set('delete-key', 'value');
      expect(cache.get('delete-key')).toBe('value');

      cache.del('delete-key');

      expect(cache.get('delete-key')).toBeUndefined();
    });

    it('should return number of deleted keys', () => {
      cache.set('key1', 'value1');

      const deleted = cache.del('key1');

      expect(deleted).toBe(1);
    });

    it('should handle deleting non-existent keys', () => {
      const deleted = cache.del('non-existent');

      expect(deleted).toBe(0);
    });
  });

  describe('flush', () => {
    it('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.flush();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });

  describe('stats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const statistics = cache.stats();

      expect(statistics).toBeDefined();
      expect(statistics.keys).toBe(2);
    });

    it('should track cache hits', () => {
      cache.set('hit-key', 'value');

      // First get is a hit
      cache.get('hit-key');

      const statistics = cache.stats();
      expect(statistics.hits).toBeGreaterThan(0);
    });

    it('should track cache misses', () => {
      // Try to get non-existent key
      cache.get('non-existent');

      const statistics = cache.stats();
      expect(statistics.misses).toBeGreaterThan(0);
    });
  });
});
