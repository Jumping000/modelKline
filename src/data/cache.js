/**
 * Redis缓存模块
 * 负责管理Redis连接和缓存操作
 */

const { createClient } = require('redis');
const { createModuleLogger } = require('../utils/logger');

// 创建日志记录器
const logger = createModuleLogger('Cache');

// Redis客户端实例
let redisClient = null;

// Redis配置
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  username: process.env.REDIS_USERNAME || '',
  password: process.env.REDIS_PASSWORD || '',
  database: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => Math.min(times * 100, 3000), // 重试策略
};

// 默认TTL（秒）
const DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '300');

/**
 * 初始化Redis缓存
 * @returns {Promise<boolean>} 连接是否成功
 */
async function initRedisCache() {
  try {
    logger.info('正在初始化Redis缓存连接...');
    
    // 创建Redis客户端
    redisClient = createClient(redisConfig);
    
    // 注册事件监听
    redisClient.on('error', (err) => {
      logger.error('Redis连接错误', { error: err.message });
    });
    
    redisClient.on('reconnecting', () => {
      logger.warn('Redis尝试重新连接中...');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis连接就绪');
    });
    
    // 连接Redis
    await redisClient.connect();
    
    // 测试连接
    await redisClient.ping();
    
    logger.info('Redis缓存连接成功');
    return true;
  } catch (error) {
    logger.error('Redis缓存初始化失败', { error: error.message });
    return false;
  }
}

/**
 * 获取Redis客户端实例
 * @returns {RedisClient} Redis客户端
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis客户端尚未初始化');
  }
  return redisClient;
}

/**
 * 设置缓存
 * @param {string} key 缓存键
 * @param {any} value 缓存值
 * @param {number} ttl 过期时间(秒)，默认5分钟
 * @returns {Promise<boolean>} 是否成功
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await redisClient.set(key, stringValue, { EX: ttl });
    logger.debug(`设置缓存: ${key}`, { ttl });
    return true;
  } catch (error) {
    logger.error(`设置缓存失败: ${key}`, { error: error.message });
    return false;
  }
}

/**
 * 获取缓存
 * @param {string} key 缓存键
 * @param {boolean} parseJson 是否解析JSON
 * @returns {Promise<any>} 缓存值
 */
async function get(key, parseJson = true) {
  try {
    const value = await redisClient.get(key);
    
    if (value === null) {
      logger.debug(`缓存未命中: ${key}`);
      return null;
    }
    
    logger.debug(`缓存命中: ${key}`);
    
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // 如果不是有效的JSON，返回原始值
        return value;
      }
    }
    
    return value;
  } catch (error) {
    logger.error(`获取缓存失败: ${key}`, { error: error.message });
    return null;
  }
}

/**
 * 删除缓存
 * @param {string} key 缓存键
 * @returns {Promise<boolean>} 是否成功
 */
async function del(key) {
  try {
    await redisClient.del(key);
    logger.debug(`删除缓存: ${key}`);
    return true;
  } catch (error) {
    logger.error(`删除缓存失败: ${key}`, { error: error.message });
    return false;
  }
}

/**
 * 批量删除缓存
 * @param {string} pattern 匹配模式
 * @returns {Promise<number>} 删除的键数量
 */
async function delByPattern(pattern) {
  try {
    let cursor = 0;
    let deleteCount = 0;
    
    do {
      const { cursor: newCursor, keys } = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = newCursor;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        deleteCount += keys.length;
      }
    } while (cursor !== 0);
    
    logger.debug(`批量删除缓存: ${pattern}`, { count: deleteCount });
    return deleteCount;
  } catch (error) {
    logger.error(`批量删除缓存失败: ${pattern}`, { error: error.message });
    return 0;
  }
}

/**
 * 获取缓存TTL
 * @param {string} key 缓存键
 * @returns {Promise<number>} TTL值(秒)，-1表示永不过期，-2表示键不存在
 */
async function ttl(key) {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    logger.error(`获取缓存TTL失败: ${key}`, { error: error.message });
    return -2;
  }
}

/**
 * 关闭Redis连接
 * @returns {Promise<void>}
 */
async function closeCache() {
  if (redisClient) {
    logger.info('正在关闭Redis连接...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis连接已关闭');
  }
}

module.exports = {
  initRedisCache,
  getRedisClient,
  set,
  get,
  del,
  delByPattern,
  ttl,
  closeCache
}; 