/**
 * 数据库连接模块
 * 负责MySQL数据库连接管理
 */

const mysql = require('mysql2/promise');
const { createModuleLogger } = require('../utils/logger');

// 创建日志记录器
const logger = createModuleLogger('Database');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'okx_trading',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
  waitForConnections: true,
  queueLimit: 0
};

// 数据库连接池
let pool = null;

// 最大重试次数
const MAX_RETRY_COUNT = 3;
// 重试间隔(毫秒)
const RETRY_INTERVAL = 2000;

/**
 * 初始化数据库连接池
 * @returns {Promise<boolean>} 连接是否成功
 */
async function initDatabase() {
  try {
    logger.info('正在初始化数据库连接...');
    
    // 创建连接池
    pool = mysql.createPool(dbConfig);
    
    // 测试连接
    const conn = await pool.getConnection();
    await conn.query('SELECT 1 AS result');
    conn.release();
    
    logger.info('数据库连接已建立');
    return true;
  } catch (error) {
    logger.error('数据库连接初始化失败', { error: error.message });
    
    // 重试连接
    logger.info(`将在${RETRY_INTERVAL/1000}秒后尝试重新连接数据库...`);
    return await retryConnect(1);
  }
}

/**
 * 重试数据库连接
 * @param {number} retryCount 当前重试次数
 * @returns {Promise<boolean>} 连接是否成功
 */
async function retryConnect(retryCount) {
  if (retryCount > MAX_RETRY_COUNT) {
    logger.error(`数据库连接失败，已超过最大重试次数(${MAX_RETRY_COUNT})`);
    return false;
  }
  
  return new Promise(resolve => {
    setTimeout(async () => {
      try {
        logger.info(`尝试重新连接数据库(${retryCount}/${MAX_RETRY_COUNT})...`);
        
        pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        await conn.query('SELECT 1 AS result');
        conn.release();
        
        logger.info('数据库重新连接成功');
        resolve(true);
      } catch (error) {
        logger.error(`数据库重新连接失败(${retryCount}/${MAX_RETRY_COUNT})`, { error: error.message });
        resolve(await retryConnect(retryCount + 1));
      }
    }, RETRY_INTERVAL);
  });
}

/**
 * 获取数据库连接池
 * @returns {Pool} 数据库连接池
 */
function getPool() {
  if (!pool) {
    throw new Error('数据库连接池尚未初始化');
  }
  return pool;
}

/**
 * 执行数据库查询
 * @param {string} sql SQL查询语句
 * @param {Array} params 查询参数
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('数据库查询失败', { error: error.message, sql });
    throw error;
  }
}

/**
 * 执行事务
 * @param {Function} callback 事务回调函数
 * @returns {Promise<any>} 事务执行结果
 */
async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    logger.error('事务执行失败', { error: error.message });
    throw error;
  } finally {
    conn.release();
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
  getPool,
  query,
  transaction,
  closeDatabase
}; 