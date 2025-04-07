/**
 * 配置加载器
 * 负责加载和验证系统配置
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');

// 配置验证模式
const configSchema = Joi.object({
  system: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    maxLogFileSize: Joi.string().default('10m'),
    maxLogFiles: Joi.number().default(10),
    timeZone: Joi.string().default('Asia/Shanghai')
  }).required(),
  market: Joi.object({
    defaultSymbol: Joi.string().required(),
    supportedSymbols: Joi.array().items(Joi.string()).required(),
    defaultKlineInterval: Joi.string().required(),
    supportedIntervals: Joi.array().items(Joi.string()).required()
  }).required(),
  agents: Joi.object().required(),
  trading: Joi.object({
    riskManagement: Joi.object().required(),
    executionSettings: Joi.object().required()
  }).required(),
  database: Joi.object({
    connectionPoolSize: Joi.number().default(10),
    connectionTimeout: Joi.number().default(30000),
    queryTimeout: Joi.number().default(5000)
  }).required(),
  cache: Joi.object({
    ttlSeconds: Joi.number().default(300),
    maxCacheSize: Joi.string().default('1gb'),
    preloadMarketData: Joi.boolean().default(true)
  }).required()
});

let systemConfig = null;

/**
 * 加载配置文件
 * @param {string} configName - 配置文件名称
 * @param {boolean} required - 是否为必需配置
 * @returns {object} - 配置对象
 */
function loadConfig(configName, required = true) {
  // 首先尝试加载 .js 配置文件
  const jsConfigPath = path.join(process.cwd(), 'config', `${configName}.js`);
  if (fs.existsSync(jsConfigPath)) {
    try {
      // 清除缓存以确保获取最新的配置
      delete require.cache[require.resolve(jsConfigPath)];
      return require(jsConfigPath);
    } catch (error) {
      console.error(`加载JavaScript配置文件 ${configName}.js 失败: ${error.message}`);
      throw new Error(`加载JavaScript配置文件 ${configName}.js 失败: ${error.message}`);
    }
  }
  
  // 如果没有找到 .js 文件，尝试加载 .json 文件
  const jsonConfigPath = path.join(process.cwd(), 'config', `${configName}.json`);
  
  try {
    if (!fs.existsSync(jsonConfigPath)) {
      if (required) {
        throw new Error(`必需的配置文件 ${configName}.json 不存在`);
      }
      console.warn(`配置文件 ${configName}.json 不存在，将使用默认配置`);
      return {};
    }
    
    const configContent = fs.readFileSync(jsonConfigPath, 'utf8');
    const configData = JSON.parse(configContent);
    
    // 验证配置
    const { error, value } = configSchema.validate(configData);
    if (error) {
      console.error('配置验证失败:', error.details);
      process.exit(1);
    }
    
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`配置文件 ${configName}.json 格式错误`, { error: error.message });
      throw new Error(`配置文件 ${configName}.json 格式错误: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 获取系统配置
 * @returns {object} - 系统配置对象
 */
function getSystemConfig() {
  if (!systemConfig) {
    return loadConfig('system-config');
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
          console.info(`已加载自定义JavaScript智能体配置: ${customConfigPath}`);
          return customConfig;
        } else {
          // 处理JSON文件
          const customConfig = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
          console.info(`已加载自定义JSON智能体配置: ${customConfigPath}`);
          return customConfig;
        }
      } catch (error) {
        console.error(`加载自定义配置失败: ${error.message}`);
      }
    } else {
      console.error(`自定义配置文件不存在: ${customConfigPath}`);
    }
  }
  
  // 如果没有提供自定义配置或加载失败，使用默认配置
  const systemConfig = getSystemConfig();
  return systemConfig.agents || {};
}

// 重新加载配置
function reloadConfig() {
  systemConfig = null;
  return loadConfig('system-config');
}

module.exports = {
  loadConfig,
  getSystemConfig,
  getAgentConfig,
  reloadConfig
}; 