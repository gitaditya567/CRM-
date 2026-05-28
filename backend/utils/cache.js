// Simple in-memory cache helper with TTL support
const cache = {};

const getCache = (key) => {
    const item = cache[key];
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        delete cache[key];
        return null;
    }
    return item.data;
};

const setCache = (key, data, ttlMs = 15000) => {
    cache[key] = {
        data,
        expiresAt: Date.now() + ttlMs
    };
};

const clearCachePrefix = (prefix) => {
    Object.keys(cache).forEach(key => {
        if (key.startsWith(prefix)) {
            delete cache[key];
        }
    });
};

const clearAllCache = () => {
    Object.keys(cache).forEach(key => {
        delete cache[key];
    });
};

module.exports = { getCache, setCache, clearCachePrefix, clearAllCache };
