/**
 * 大模型服务接口
 * 提供统一的大模型调用接口，支持多种大模型切换
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const axios = require('axios');
const { createModuleLogger } = require('../utils/logger');

// 创建模块日志
const logger = createModuleLogger('LLMService');

// 大模型提供商
const LLM_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  SPARK: 'spark',
  BAIDU: 'baidu',
  VOLCANO: 'volcano',
  KIMI: 'kimi'
};

// 默认大模型
const DEFAULT_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || LLM_PROVIDERS.GEMINI;

// 存储API实例
const apiInstances = {};
let isInitialized = false;
let availableProviders = [];

/**
 * 初始化大模型服务
 * @returns {Promise<boolean>} 初始化结果
 */
async function initLLMService() {
  try {
    logger.info('正在初始化大模型服务...');
    
    // 初始化Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        apiInstances[LLM_PROVIDERS.GEMINI] = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        availableProviders.push(LLM_PROVIDERS.GEMINI);
        logger.info('Google Gemini 大模型初始化成功');
      } catch (error) {
        logger.error('Google Gemini 大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置GEMINI_API_KEY，Gemini大模型将不可用');
    }
    
    // 初始化OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        apiInstances[LLM_PROVIDERS.OPENAI] = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        availableProviders.push(LLM_PROVIDERS.OPENAI);
        logger.info('OpenAI 大模型初始化成功');
      } catch (error) {
        logger.error('OpenAI 大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置OPENAI_API_KEY，OpenAI大模型将不可用');
    }
    
    // 初始化讯飞星火
    if (process.env.SPARK_APP_ID && process.env.SPARK_API_KEY && process.env.SPARK_API_SECRET) {
      try {
        // 星火API初始化逻辑
        apiInstances[LLM_PROVIDERS.SPARK] = {
          appId: process.env.SPARK_APP_ID,
          apiKey: process.env.SPARK_API_KEY,
          apiSecret: process.env.SPARK_API_SECRET
        };
        availableProviders.push(LLM_PROVIDERS.SPARK);
        logger.info('讯飞星火大模型初始化成功');
      } catch (error) {
        logger.error('讯飞星火大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置讯飞星火相关密钥，星火大模型将不可用');
    }
    
    // 初始化百度文心一言
    if (process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
      try {
        // 文心一言API初始化逻辑
        apiInstances[LLM_PROVIDERS.BAIDU] = {
          apiKey: process.env.BAIDU_API_KEY,
          secretKey: process.env.BAIDU_SECRET_KEY
        };
        availableProviders.push(LLM_PROVIDERS.BAIDU);
        logger.info('百度文心一言大模型初始化成功');
      } catch (error) {
        logger.error('百度文心一言大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置百度文心一言相关密钥，文心一言大模型将不可用');
    }
    
    // 初始化字节火山引擎
    if (process.env.VOLCANO_API_KEY) {
      try {
        // 火山引擎API初始化逻辑
        apiInstances[LLM_PROVIDERS.VOLCANO] = {
          apiKey: process.env.VOLCANO_API_KEY
        };
        availableProviders.push(LLM_PROVIDERS.VOLCANO);
        logger.info('字节火山引擎大模型初始化成功');
      } catch (error) {
        logger.error('字节火山引擎大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置字节火山引擎相关密钥，火山引擎大模型将不可用');
    }
    
    // 初始化Kimi
    if (process.env.KIMI_API_KEY) {
      try {
        // Kimi API初始化逻辑
        apiInstances[LLM_PROVIDERS.KIMI] = {
          apiKey: process.env.KIMI_API_KEY
        };
        availableProviders.push(LLM_PROVIDERS.KIMI);
        logger.info('Kimi大模型初始化成功');
      } catch (error) {
        logger.error('Kimi大模型初始化失败', { error: error.message });
      }
    } else {
      logger.warn('未配置Kimi相关密钥，Kimi大模型将不可用');
    }
    
    if (availableProviders.length === 0) {
      logger.error('没有可用的大模型服务，请至少配置一个大模型API密钥');
      return false;
    }
    
    isInitialized = true;
    logger.info(`大模型服务初始化完成，共有${availableProviders.length}个可用模型`);
    return true;
  } catch (error) {
    logger.error('大模型服务初始化过程中发生错误', { error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * 获取默认的大模型提供商
 * @returns {string} 默认提供商名称
 */
function getDefaultProvider() {
  if (availableProviders.includes(DEFAULT_PROVIDER)) {
    return DEFAULT_PROVIDER;
  } else if (availableProviders.length > 0) {
    return availableProviders[0];
  }
  return null;
}

/**
 * 获取所有可用的大模型提供商
 * @returns {string[]} 可用提供商列表
 */
function getAvailableProviders() {
  return [...availableProviders];
}

/**
 * 向大模型发送查询并获取回答
 * @param {string} prompt 提示内容
 * @param {object} options 选项
 * @param {string} options.provider 指定大模型提供商
 * @returns {Promise<string>} 大模型回答
 */
async function query(prompt, options = {}) {
  if (!isInitialized) {
    throw new Error('大模型服务尚未初始化');
  }
  
  const provider = options.provider || getDefaultProvider();
  
  if (!provider || !availableProviders.includes(provider)) {
    throw new Error(`指定的大模型提供商 ${provider} 不可用`);
  }
  
  const apiInstance = apiInstances[provider];
  logger.debug(`使用 ${provider} 进行查询`, { promptLength: prompt.length });
  
  try {
    switch (provider) {
      case LLM_PROVIDERS.GEMINI:
        const model = apiInstance.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      
      case LLM_PROVIDERS.OPENAI:
        const chatCompletion = await apiInstance.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
        });
        return chatCompletion.choices[0].message.content;
      
      // 其他大模型实现...
      default:
        throw new Error(`尚未实现的大模型提供商: ${provider}`);
    }
  } catch (error) {
    logger.error(`使用 ${provider} 查询失败`, { error: error.message });
    throw new Error(`大模型查询失败: ${error.message}`);
  }
}

module.exports = {
  LLM_PROVIDERS,
  initLLMService,
  query,
  getDefaultProvider,
  getAvailableProviders
};
