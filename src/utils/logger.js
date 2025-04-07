/**
 * 日志工具模块
 * 使用Winston提供分级日志功能
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const moment = require('moment-timezone');
const path = require('path');

// 默认配置
const defaultConfig = {
  system: {
    name: 'OKX量化交易系统',
    logLevel: 'info',
    maxLogFileSize: '10m',
    maxLogFiles: 10,
    timeZone: 'Asia/Shanghai'
  }
};

// 创建日志目录
const logDir = path.join(process.cwd(), 'logs');

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => moment().tz(defaultConfig.system.timeZone).format('YYYY-MM-DD HH:mm:ss.SSS')
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: () => moment().tz(defaultConfig.system.timeZone).format('YYYY-MM-DD HH:mm:ss.SSS')
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
  level: defaultConfig.system.logLevel,
  format: logFormat,
  defaultMeta: { service: defaultConfig.system.name },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    }),
    // 文件输出 - 所有日志
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: defaultConfig.system.maxLogFileSize,
      maxFiles: defaultConfig.system.maxLogFiles,
      format: logFormat
    }),
    // 文件输出 - 错误日志
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: defaultConfig.system.maxLogFileSize,
      maxFiles: defaultConfig.system.maxLogFiles,
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

// 导出日志工具
module.exports = {
  logger,
  createModuleLogger
}; 