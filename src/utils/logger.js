/**
 * 日志工具模块
 * 使用Winston提供分级日志功能
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const moment = require('moment-timezone');
const path = require('path');
const { getSystemConfig } = require('../config/config-loader');

// 获取系统配置
const config = getSystemConfig();

// 创建日志目录
const logDir = path.join(process.cwd(), 'logs');

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => moment().tz(config.system.timeZone).format('YYYY-MM-DD HH:mm:ss.SSS')
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: () => moment().tz(config.system.timeZone).format('YYYY-MM-DD HH:mm:ss.SSS')
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: config.system.logLevel || 'info',
  format: logFormat,
  defaultMeta: { service: config.system.name },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    }),
    // 文件输出 - 所有日志
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.system.maxLogFileSize || '10m',
      maxFiles: config.system.maxLogFiles || '14d',
      format: logFormat
    }),
    // 文件输出 - 错误日志
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.system.maxLogFileSize || '10m',
      maxFiles: config.system.maxLogFiles || '14d',
      level: 'error',
      format: logFormat
    })
  ]
});

/**
 * 根据不同模块创建日志实例
 * @param {string} moduleName - 模块名称
 * @returns {object} - 带模块名的日志记录器
 */
function createModuleLogger(moduleName) {
  return logger.child({ module: moduleName });
}

module.exports = {
  logger,
  createModuleLogger,
}; 