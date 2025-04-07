/**
 * 配置加载器
 * 负责加载和管理系统配置，支持热更新
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const { EventEmitter } = require('events');
const { validateAgentConfig, getDefaultAgentConfig } = require('./agent-config-schema');

// 系统配置变更事件名称
const CONFIG_EVENTS = {
  SYSTEM_CONFIG_CHANGED: 'systemConfigChanged',
  AGENT_CONFIG_CHANGED: 'agentConfigChanged'
};

// 配置加载事件发射器
const configEventEmitter = new EventEmitter();

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
    queryTimeout: Joi.number().default(5000),
    maxRetryAttempts: Joi.number().default(3)
  }).required(),
  cache: Joi.object({
    ttlSeconds: Joi.number().default(300),
    maxCacheSize: Joi.string().default('1gb'),
    preloadMarketData: Joi.boolean().default(true)
  }).required(),
  llm: Joi.object({
    defaultProvider: Joi.string().default('gemini'),
    requestTimeout: Joi.number().default(30000),
    maxRetryAttempts: Joi.number().default(2),
    providers: Joi.object({
      gemini: Joi.object({
        model: Joi.string().default('gemini-pro'),
        temperature: Joi.number().min(0).max(1).default(0.4),
        maxTokens: Joi.number().default(1024)
      }).default(),
      openai: Joi.object({
        model: Joi.string().default('gpt-3.5-turbo'),
        temperature: Joi.number().min(0).max(1).default(0.5),
        maxTokens: Joi.number().default(1024)
      }).default(),
      spark: Joi.object({
        model: Joi.string().default('v3'),
        temperature: Joi.number().min(0).max(1).default(0.5),
        maxTokens: Joi.number().default(1024)
      }).default(),
      baidu: Joi.object({
        model: Joi.string().default('ernie-bot-4'),
        temperature: Joi.number().min(0).max(1).default(0.5),
        maxTokens: Joi.number().default(1024)
      }).default(),
      volcano: Joi.object({
        model: Joi.string().default('brain'),
        temperature: Joi.number().min(0).max(1).default(0.5),
        maxTokens: Joi.number().default(1024)
      }).default(),
      kimi: Joi.object({
        model: Joi.string().default('kimi-3'),
        temperature: Joi.number().min(0).max(1).default(0.5),
        maxTokens: Joi.number().default(1024)
      }).default()
    }).default()
  }).default()
});

// 配置文件路径
const CONFIG_PATHS = {
  system: path.join(process.cwd(), 'config', 'system-config.json'),
  agent: path.join(process.cwd(), 'config', 'agent-config.json')
};

// 存储当前加载的配置
let systemConfig = null;
let agentConfig = null;
let fileWatchers = {};

/**
 * 加载系统配置
 * @returns {Object} 系统配置对象
 */
function loadSystemConfig() {
  try {
    // 检查配置文件是否存在
    if (!fs.existsSync(CONFIG_PATHS.system)) {
      console.error(`系统配置文件不存在: ${CONFIG_PATHS.system}`);
      process.exit(1);
    }
    
    // 读取配置文件
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATHS.system, 'utf8'));
    
    // 验证配置
    const { error, value } = configSchema.validate(configData, {
      abortEarly: false,
      allowUnknown: true
    });
    
    if (error) {
      console.error('系统配置验证失败:', error.details);
      process.exit(1);
    }
    
    // 从环境变量覆盖部分配置
    if (process.env.LOG_LEVEL) {
      value.system.logLevel = process.env.LOG_LEVEL;
    }
    
    if (process.env.DEFAULT_LLM_PROVIDER) {
      value.llm.defaultProvider = process.env.DEFAULT_LLM_PROVIDER;
    }
    
    systemConfig = value;
    return systemConfig;
  } catch (error) {
    console.error('加载系统配置文件失败:', error.message);
    process.exit(1);
  }
}

/**
 * 加载智能体配置
 * @returns {Object} 智能体配置对象
 */
function loadAgentConfig() {
  try {
    // 获取默认智能体配置
    const defaultConfig = getDefaultAgentConfig();
    
    // 检查配置文件是否存在
    if (!fs.existsSync(CONFIG_PATHS.agent)) {
      console.warn(`智能体配置文件不存在: ${CONFIG_PATHS.agent}，将使用默认配置`);
      agentConfig = defaultConfig;
      return agentConfig;
    }
    
    // 读取配置文件
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATHS.agent, 'utf8'));
    
    // 合并配置并验证
    try {
      const mergedConfig = { ...defaultConfig, ...configData };
      agentConfig = validateAgentConfig(mergedConfig);
      return agentConfig;
    } catch (validationError) {
      console.error('智能体配置验证失败:', validationError.message);
      console.warn('将使用默认智能体配置');
      agentConfig = defaultConfig;
      return agentConfig;
    }
  } catch (error) {
    console.error('加载智能体配置文件失败:', error.message);
    console.warn('将使用默认智能体配置');
    agentConfig = getDefaultAgentConfig();
    return agentConfig;
  }
}

/**
 * 获取系统配置
 * @returns {Object} 系统配置对象
 */
function getSystemConfig() {
  if (!systemConfig) {
    return loadSystemConfig();
  }
  return systemConfig;
}

/**
 * 获取智能体配置
 * @returns {Object} 智能体配置对象
 */
function getAgentConfig() {
  if (!agentConfig) {
    return loadAgentConfig();
  }
  return agentConfig;
}

/**
 * 启用配置文件热更新
 */
function enableConfigHotReload() {
  if (fileWatchers.system || fileWatchers.agent) {
    console.warn('配置热更新已启用，无需重复操作');
    return;
  }
  
  // 监控系统配置文件变更
  fileWatchers.system = fs.watch(CONFIG_PATHS.system, (eventType) => {
    if (eventType === 'change') {
      console.info('系统配置文件已更改，正在重新加载...');
      try {
        const oldConfig = systemConfig;
        systemConfig = null;
        const newConfig = loadSystemConfig();
        
        // 触发配置变更事件
        configEventEmitter.emit(CONFIG_EVENTS.SYSTEM_CONFIG_CHANGED, {
          oldConfig,
          newConfig
        });
        
        console.info('系统配置文件重新加载成功');
      } catch (error) {
        console.error('重新加载系统配置文件失败:', error.message);
      }
    }
  });
  
  // 监控智能体配置文件变更
  if (fs.existsSync(CONFIG_PATHS.agent)) {
    fileWatchers.agent = fs.watch(CONFIG_PATHS.agent, (eventType) => {
      if (eventType === 'change') {
        console.info('智能体配置文件已更改，正在重新加载...');
        try {
          const oldConfig = agentConfig;
          agentConfig = null;
          const newConfig = loadAgentConfig();
          
          // 触发配置变更事件
          configEventEmitter.emit(CONFIG_EVENTS.AGENT_CONFIG_CHANGED, {
            oldConfig,
            newConfig
          });
          
          console.info('智能体配置文件重新加载成功');
        } catch (error) {
          console.error('重新加载智能体配置文件失败:', error.message);
        }
      }
    });
  }
  
  console.info('配置热更新已启用');
}

/**
 * 禁用配置文件热更新
 */
function disableConfigHotReload() {
  if (fileWatchers.system) {
    fileWatchers.system.close();
    fileWatchers.system = null;
  }
  
  if (fileWatchers.agent) {
    fileWatchers.agent.close();
    fileWatchers.agent = null;
  }
  
  console.info('配置热更新已禁用');
}

/**
 * 订阅配置变更事件
 * @param {string} event 事件名称
 * @param {Function} callback 回调函数
 */
function onConfigChange(event, callback) {
  if (!Object.values(CONFIG_EVENTS).includes(event)) {
    throw new Error(`未知的配置事件: ${event}`);
  }
  
  configEventEmitter.on(event, callback);
}

/**
 * 重新加载配置
 * @returns {Object} 包含系统配置和智能体配置的对象
 */
function reloadConfig() {
  systemConfig = null;
  agentConfig = null;
  
  return {
    systemConfig: loadSystemConfig(),
    agentConfig: loadAgentConfig()
  };
}

module.exports = {
  CONFIG_EVENTS,
  loadSystemConfig,
  loadAgentConfig,
  getSystemConfig,
  getAgentConfig,
  enableConfigHotReload,
  disableConfigHotReload,
  onConfigChange,
  reloadConfig
}; 