/**
 * 数据库连接模块
 * 负责管理MySQL数据库连接池
 */

const mysql = require('mysql2/promise');
const { createModuleLogger } = require('../utils/logger');
const { getSystemConfig } = require('../config/config-loader');

const logger = createModuleLogger('Database');
let pool = null;

/**
 * 初始化数据库连接池
 * @returns {Promise<boolean>} 是否成功初始化
 */
async function initDatabase() {
  try {
    const config = getSystemConfig();
    const dbConfig = config.database;
    
    // 从环境变量中获取数据库连接信息
    const connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'okx_trading_system',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || dbConfig.connectionPoolSize || 10,
      connectTimeout: parseInt(process.env.DB_TIMEOUT) || dbConfig.connectionTimeout || 30000,
      waitForConnections: true,
      queueLimit: 0
    };
    
    logger.info('正在创建数据库连接池...');
    pool = mysql.createPool(connectionConfig);
    
    // 如果需要在启动时验证连接，则执行验证
    if (dbConfig.validateOnStartup) {
      const isConnected = await validateConnection(dbConfig.retryConnectAttempts || 3);
      if (!isConnected) {
        logger.error('数据库连接验证失败，请检查配置');
        return false;
      }
    }
    
    logger.info('数据库连接池初始化成功');
    return true;
  } catch (error) {
    logger.error('数据库连接池初始化失败', { error: error.message });
    return false;
  }
}

/**
 * 验证数据库连接
 * @param {number} retryAttempts - 重试次数
 * @returns {Promise<boolean>} 连接是否成功
 */
async function validateConnection(retryAttempts = 3) {
  let attempts = 0;
  
  while (attempts < retryAttempts) {
    try {
      attempts++;
      logger.info(`正在验证数据库连接 (尝试 ${attempts}/${retryAttempts})...`);
      
      // 从连接池获取连接并执行简单查询
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT 1 AS connection_test');
      connection.release();
      
      if (rows && rows.length > 0 && rows[0].connection_test === 1) {
        logger.info('数据库连接验证成功');
        return true;
      }
    } catch (error) {
      const retryDelay = Math.pow(2, attempts) * 1000; // 指数退避策略
      logger.warn(`数据库连接验证失败 (尝试 ${attempts}/${retryAttempts})，将在 ${retryDelay}ms 后重试`, { 
        error: error.message 
      });
      
      // 最后一次尝试失败就直接返回失败
      if (attempts >= retryAttempts) {
        logger.error('数据库连接验证失败，已达到最大重试次数', { error: error.message });
        return false;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
}

/**
 * 获取数据库连接
 * @returns {Promise<Connection>} 数据库连接对象
 */
async function getConnection() {
  if (!pool) {
    throw new Error('数据库连接池尚未初始化');
  }
  return pool.getConnection();
}

/**
 * 执行SQL查询
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query(sql, params);
    connection.release();
    return results;
  } catch (error) {
    logger.error('SQL查询执行失败', { sql, error: error.message });
    throw error;
  }
}

/**
 * 关闭数据库连接池
 * @returns {Promise<void>} 
 */
async function closeDatabase() {
  if (pool) {
    logger.info('正在关闭数据库连接池...');
    await pool.end();
    pool = null;
    logger.info('数据库连接池已关闭');
  }
}

module.exports = {
  initDatabase,
  validateConnection,
  getConnection,
  query,
  closeDatabase
}; 