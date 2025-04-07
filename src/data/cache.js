/**
 * 缓存模块
 * 负责管理Redis缓存连接和操作
 */

const redis = require('redis');
const { createModuleLogger } = require('../utils/logger');
const { getSystemConfig } = require('../config/config-loader');

const logger = createModuleLogger('Cache');
let client = null;

/**
 * 初始化Redis缓存
 * @returns {Promise<boolean>} 是否成功初始化
 */
async function initRedisCache() {
  try {
    const config = getSystemConfig();
    const cacheConfig = config.cache;
    
    // 从环境变量中获取Redis连接信息
    const redisUrl = `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    
    logger.info('正在创建Redis客户端连接...');
    client = redis.createClient({
      url: redisUrl
    });
    
    // 设置事件监听器
    client.on('error', (error) => {
      logger.error('Redis连接错误', { error: error.message });
    });
    
    client.on('connect', () => {
      logger.info('Redis客户端已连接');
    });
    
    client.on('reconnecting', () => {
      logger.info('Redis客户端正在重新连接...');
    });
    
    // 连接到Redis服务器
    await client.connect();
    
    // 验证Redis连接
    const isConnected = await validateConnection();
    if (!isConnected) {
      logger.error('Redis连接验证失败，请检查配置');
      return false;
    }
    
    logger.info('Redis缓存初始化成功');
    return true;
  } catch (error) {
    logger.error('Redis缓存初始化失败', { error: error.message });
    return false;
  }
}

/**
 * 验证Redis连接
 * @param {number} retryAttempts - 重试次数
 * @returns {Promise<boolean>} 连接是否成功
 */
async function validateConnection(retryAttempts = 3) {
  let attempts = 0;
  
  while (attempts < retryAttempts) {
    try {
      attempts++;
      logger.info(`正在验证Redis连接 (尝试 ${attempts}/${retryAttempts})...`);
      
      // 执行PING命令检查连接
      const ping = await client.ping();
      
      if (ping === 'PONG') {
        logger.info('Redis连接验证成功');
        return true;
      }
    } catch (error) {
      const retryDelay = Math.pow(2, attempts) * 1000; // 指数退避策略
      logger.warn(`Redis连接验证失败 (尝试 ${attempts}/${retryAttempts})，将在 ${retryDelay}ms 后重试`, { 
        error: error.message 
      });
      
      // 最后一次尝试失败就直接返回失败
      if (attempts >= retryAttempts) {
        logger.error('Redis连接验证失败，已达到最大重试次数', { error: error.message });
        return false;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
}

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {string|object} value - 缓存值
 * @param {number} ttl - 过期时间（秒）
 * @returns {Promise<boolean>} 是否设置成功
 */
async function set(key, value, ttl = null) {
  try {
    if (!client) {
      throw new Error('Redis客户端尚未初始化');
    }
    
    // 如果value是对象，则转为JSON字符串
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    
    // 如果设置了ttl，则使用带过期时间的设置
    if (ttl) {
      await client.setEx(key, ttl, valueToStore);
    } else {
      await client.set(key, valueToStore);
    }
    
    return true;
  } catch (error) {
    logger.error('设置缓存失败', { key, error: error.message });
    return false;
  }
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @param {boolean} parseJson - 是否解析JSON
 * @returns {Promise<any>} 缓存值
 */
async function get(key, parseJson = true) {
  try {
    if (!client) {
      throw new Error('Redis客户端尚未初始化');
    }
    
    const value = await client.get(key);
    
    if (!value) {
      return null;
    }
    
    // 如果需要解析JSON，则尝试解析
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // 如果解析失败，则返回原始值
        return value;
      }
    }
    
    return value;
  } catch (error) {
    logger.error('获取缓存失败', { key, error: error.message });
    return null;
  }
}

/**
 * 删除缓存
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>} 是否删除成功
 */
async function del(key) {
  try {
    if (!client) {
      throw new Error('Redis客户端尚未初始化');
    }
    
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('删除缓存失败', { key, error: error.message });
    return false;
  }
}

/**
 * 关闭Redis连接
 * @returns {Promise<void>}
 */
async function closeCache() {
  if (client) {
    logger.info('正在关闭Redis连接...');
    await client.quit();
    client = null;
    logger.info('Redis连接已关闭');
  }
}

module.exports = {
  initRedisCache,
  validateConnection,
  set,
  get,
  del,
  closeCache
}; 