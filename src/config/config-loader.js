/**
 * 配置加载器
 * 负责加载和验证系统配置
 */

const fs = require('fs');
const path = require('path');
const { createModuleLogger } = require('../utils/logger');

const logger = createModuleLogger('ConfigLoader');
const CONFIG_DIR = path.resolve(__dirname, '../../config');

/**
 * 加载配置文件
 * @param {string} configName - 配置文件名称
 * @param {boolean} required - 是否为必需配置
 * @returns {object} - 配置对象
 */
function loadConfig(configName, required = true) {
  // 首先尝试加载 .js 配置文件
  const jsConfigPath = path.join(CONFIG_DIR, `${configName}.js`);
  if (fs.existsSync(jsConfigPath)) {
    try {
      logger.info(`正在加载JavaScript配置文件: ${configName}.js`);
      // 清除缓存以确保获取最新的配置
      delete require.cache[require.resolve(jsConfigPath)];
      return require(jsConfigPath);
    } catch (error) {
      logger.error(`加载JavaScript配置文件 ${configName}.js 失败`, { error: error.message });
      throw new Error(`加载JavaScript配置文件 ${configName}.js 失败: ${error.message}`);
    }
  }
  
  // 如果没有找到 .js 文件，尝试加载 .json 文件
  const jsonConfigPath = path.join(CONFIG_DIR, `${configName}.json`);
  
  try {
    if (!fs.existsSync(jsonConfigPath)) {
      if (required) {
        throw new Error(`必需的配置文件 ${configName}.json 不存在`);
      }
      logger.warn(`配置文件 ${configName}.json 不存在，将使用默认配置`);
      return {};
    }
    
    logger.info(`正在加载JSON配置文件: ${configName}.json`);
    const configContent = fs.readFileSync(jsonConfigPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error(`配置文件 ${configName}.json 格式错误`, { error: error.message });
      throw new Error(`配置文件 ${configName}.json 格式错误: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 验证配置项
 * @param {object} config - 配置对象
 * @param {object} schema - 配置模式
 * @returns {boolean} - 验证结果
 */
function validateConfig(config, schema) {
  // 基本验证实现，未来可以扩展为更复杂的模式验证
  for (const [key, specification] of Object.entries(schema)) {
    if (specification.required && (config[key] === undefined || config[key] === null)) {
      logger.error(`配置缺少必需项: ${key}`);
      return false;
    }
    
    if (config[key] !== undefined && specification.type && 
        typeof config[key] !== specification.type) {
      logger.error(`配置项 ${key} 类型错误, 期望 ${specification.type} 但得到 ${typeof config[key]}`);
      return false;
    }
  }
  return true;
}

/**
 * 获取系统配置
 * @returns {object} - 系统配置对象
 */
function getSystemConfig() {
  const systemConfig = loadConfig('system-config');
  
  // 合并环境变量中的配置覆盖
  if (process.env.LOG_LEVEL) {
    systemConfig.system.logLevel = process.env.LOG_LEVEL;
  }
  
  return systemConfig;
}

/**
 * 获取智能体配置
 * @param {string} customConfigPath - 自定义配置路径（可选）
 * @returns {object} - 智能体配置对象
 */
function getAgentConfig(customConfigPath) {
  if (customConfigPath) {
    const absolutePath = path.resolve(process.cwd(), customConfigPath);
    if (fs.existsSync(absolutePath)) {
      try {
        // 根据文件扩展名决定如何加载
        if (absolutePath.endsWith('.js')) {
          // 清除缓存以确保获取最新的配置
          delete require.cache[require.resolve(absolutePath)];
          const customConfig = require(absolutePath);
          logger.info(`已加载自定义JavaScript智能体配置: ${customConfigPath}`);
          return customConfig;
        } else {
          // 处理JSON文件
          const customConfig = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
          logger.info(`已加载自定义JSON智能体配置: ${customConfigPath}`);
          return customConfig;
        }
      } catch (error) {
        logger.error(`加载自定义配置失败: ${error.message}`);
      }
    } else {
      logger.error(`自定义配置文件不存在: ${customConfigPath}`);
    }
  }
  
  // 如果没有提供自定义配置或加载失败，使用默认配置
  const systemConfig = getSystemConfig();
  return systemConfig.agents || {};
}

module.exports = {
  loadConfig,
  validateConfig,
  getSystemConfig,
  getAgentConfig,
}; 