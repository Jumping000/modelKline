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

// 文件日志格式 - 详细格式
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => moment().tz(defaultConfig.system.timeZone).format('YYYY-MM-DD HH:mm:ss.SSS')
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台日志格式 - 简洁格式
const consoleLogFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: () => moment().tz(defaultConfig.system.timeZone).format('HH:mm:ss')
  }),
  winston.format.printf(({ timestamp, level, message, module }) => {
    const moduleStr = module ? `[${module}]` : '';
    return `${timestamp} ${level} ${moduleStr}: ${message}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: defaultConfig.system.logLevel,
  format: fileLogFormat,
  defaultMeta: { service: defaultConfig.system.name },
  transports: [
    // 控制台输出 - 只输出info及以上级别
    new winston.transports.Console({
      level: 'info',
      format: consoleLogFormat
    }),
    // 文件输出 - 所有日志
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: defaultConfig.system.maxLogFileSize,
      maxFiles: defaultConfig.system.maxLogFiles,
      format: fileLogFormat
    }),
    // 文件输出 - 错误日志
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: defaultConfig.system.maxLogFileSize,
      maxFiles: defaultConfig.system.maxLogFiles,
      level: 'error',
      format: fileLogFormat
    }),
    // 文件输出 - 调试日志
    new DailyRotateFile({
      filename: path.join(logDir, 'debug-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: defaultConfig.system.maxLogFileSize,
      maxFiles: defaultConfig.system.maxLogFiles,
      level: 'debug',
      format: fileLogFormat
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