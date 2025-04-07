/**
 * 智能体配置模式
 * 定义智能体配置的验证模式和默认配置
 */

const Joi = require('joi');

// K线智能体通用模式
const kLineAgentSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  weight: Joi.number().min(0).max(1).default(0.5),
  parameters: Joi.object().default({})
}).unknown();

// 市场环境智能体通用模式
const marketAgentSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  weight: Joi.number().min(0).max(1).default(0.5),
  parameters: Joi.object().default({})
}).unknown();

// 各类智能体特定模式
const agentSchemas = {
  // K线形态识别智能体
  kLinePatternAgent: kLineAgentSchema.keys({
    parameters: Joi.object({
      patterns: Joi.array().items(Joi.string()).default(['hammer', 'shootingStar', 'doji', 'engulfing']),
      minConfidence: Joi.number().min(0).max(1).default(0.6),
      timeframes: Joi.array().items(Joi.string()).default(['1h', '4h', '1d'])
    }).default()
  }),
  
  // 蜡烛图模式智能体
  candlestickPatternAgent: kLineAgentSchema.keys({
    parameters: Joi.object({
      patterns: Joi.array().items(Joi.string()).default(['headAndShoulders', 'doubleTop', 'doubleBottom', 'triangle']),
      confirmationBars: Joi.number().min(1).default(2),
      timeframes: Joi.array().items(Joi.string()).default(['4h', '1d', '1w'])
    }).default()
  }),
  
  // 周期性分析智能体
  cyclicalAnalysisAgent: kLineAgentSchema.keys({
    parameters: Joi.object({
      windowSize: Joi.number().min(10).default(100),
      minCycles: Joi.number().min(2).default(3),
      significance: Joi.number().min(0).max(1).default(0.7),
      timeframes: Joi.array().items(Joi.string()).default(['1d', '1w'])
    }).default()
  }),
  
  // 市场情绪分析智能体
  marketSentimentAgent: marketAgentSchema.keys({
    parameters: Joi.object({
      dataWindow: Joi.number().min(1).default(24),
      updateInterval: Joi.number().min(60).default(3600),
      sentimentSources: Joi.array().items(Joi.string()).default(['news', 'social', 'onchain']),
      minConfidence: Joi.number().min(0).max(1).default(0.7)
    }).default()
  }),
  
  // 实时行情智能体
  realTimeMarketAgent: marketAgentSchema.keys({
    parameters: Joi.object({
      updateInterval: Joi.number().min(1).default(60),
      depth: Joi.number().min(5).default(20),
      volatilityWindow: Joi.number().min(5).default(24),
      indicators: Joi.array().items(Joi.string()).default(['volume', 'spread', 'momentum'])
    }).default()
  }),
  
  // 趋势捕捉智能体
  trendCaptureAgent: marketAgentSchema.keys({
    parameters: Joi.object({
      shortPeriod: Joi.number().min(5).default(9),
      longPeriod: Joi.number().min(10).default(21),
      signalPeriod: Joi.number().min(3).default(7),
      trendStrength: Joi.number().min(0).max(1).default(0.3),
      timeframes: Joi.array().items(Joi.string()).default(['1h', '4h', '1d'])
    }).default()
  })
};

// 组合所有智能体模式
const agentConfigSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    ...Object.values(agentSchemas),
    Joi.object({
      enabled: Joi.boolean().default(false),
      weight: Joi.number().min(0).max(1).default(0.5),
      parameters: Joi.object().default({})
    }).unknown()
  )
).default();

// 默认智能体配置
const defaultAgentConfig = {
  kLinePatternAgent: {
    enabled: true,
    weight: 0.8,
    parameters: {
      patterns: ['hammer', 'shootingStar', 'doji', 'engulfing'],
      minConfidence: 0.7,
      timeframes: ['1h', '4h', '1d']
    }
  },
  candlestickPatternAgent: {
    enabled: true,
    weight: 0.7,
    parameters: {
      patterns: ['headAndShoulders', 'doubleTop', 'doubleBottom', 'triangle'],
      confirmationBars: 2,
      timeframes: ['4h', '1d', '1w']
    }
  },
  marketSentimentAgent: {
    enabled: true,
    weight: 0.6,
    parameters: {
      dataWindow: 24,
      updateInterval: 3600,
      sentimentSources: ['news', 'social'],
      minConfidence: 0.7
    }
  },
  realTimeMarketAgent: {
    enabled: true,
    weight: 0.9,
    parameters: {
      updateInterval: 60,
      depth: 20,
      volatilityWindow: 24,
      indicators: ['volume', 'spread', 'momentum']
    }
  }
};

/**
 * 验证智能体配置并添加默认值
 * @param {Object} config 智能体配置
 * @returns {Object} 验证后的配置
 */
function validateAgentConfig(config) {
  const { error, value } = agentConfigSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`智能体配置验证失败: ${error.message}`);
  }
  
  return value;
}

/**
 * 获取默认智能体配置
 * @returns {Object} 默认智能体配置
 */
function getDefaultAgentConfig() {
  return JSON.parse(JSON.stringify(defaultAgentConfig));
}

/**
 * 合并智能体配置
 * @param {Object} baseConfig 基础配置
 * @param {Object} overrideConfig 覆盖配置
 * @returns {Object} 合并后的配置
 */
function mergeAgentConfigs(baseConfig, overrideConfig) {
  const merged = JSON.parse(JSON.stringify(baseConfig));
  
  // 合并顶级智能体配置
  Object.keys(overrideConfig).forEach(agentKey => {
    if (typeof overrideConfig[agentKey] !== 'object') {
      merged[agentKey] = overrideConfig[agentKey];
      return;
    }
    
    if (!merged[agentKey]) {
      merged[agentKey] = {};
    }
    
    // 合并智能体属性
    Object.keys(overrideConfig[agentKey]).forEach(propKey => {
      if (propKey === 'parameters' && 
          typeof overrideConfig[agentKey][propKey] === 'object' && 
          typeof merged[agentKey][propKey] === 'object') {
        // 合并参数对象
        merged[agentKey][propKey] = {
          ...merged[agentKey][propKey],
          ...overrideConfig[agentKey][propKey]
        };
      } else {
        // 直接覆盖其他属性
        merged[agentKey][propKey] = overrideConfig[agentKey][propKey];
      }
    });
  });
  
  return merged;
}

module.exports = {
  agentConfigSchema,
  validateAgentConfig,
  getDefaultAgentConfig,
  mergeAgentConfigs
}; 