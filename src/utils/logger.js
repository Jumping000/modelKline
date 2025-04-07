/**
 * 日志工具模块
 * 使用Winston提供分级日志功能
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDirectory = process.env.LOG_DIRECTORY || 'logs';
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// 创建Winston日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'okx-trading-system' },
  transports: [
    // 错误日志写入单独文件
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'error.log'), 
      level: 'error' 
    }),
    // 所有日志级别写入综合日志文件
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'combined.log') 
    }),
  ],
});

// 在非生产环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * 根据不同模块创建日志实例
 * @param {string} moduleName - 模块名称
 * @returns {object} - 带模块名的日志记录器
 */
function createModuleLogger(moduleName) {
  return {
    error: (message, meta = {}) => logger.error(message, { ...meta, module: moduleName }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, module: moduleName }),
    info: (message, meta = {}) => logger.info(message, { ...meta, module: moduleName }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, module: moduleName }),
  };
}

module.exports = {
  logger,
  createModuleLogger,
}; 