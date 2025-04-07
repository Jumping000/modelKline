/**
 * 大模型服务模块
 * 负责管理不同的大模型接口调用
 */

const axios = require('axios');
const { createModuleLogger } = require('../utils/logger');
const { getSystemConfig } = require('../config/config-loader');

const logger = createModuleLogger('LLMService');

// 存储各提供商的配置
let llmProviders = {};
let defaultProvider = '';

/**
 * 初始化大模型服务
 * @returns {Promise<boolean>} 是否成功初始化
 */
async function initLLMService() {
  try {
    const config = getSystemConfig();
    const llmConfig = config.llm;

    // 设置默认提供商
    defaultProvider = process.env.LLM_DEFAULT_PROVIDER || llmConfig.defaultProvider || 'gemini';

    // 初始化各提供商的配置
    llmProviders = {
      gemini: {
        enabled: llmConfig.gemini.enabled,
        apiKey: process.env.GEMINI_API_KEY || llmConfig.gemini.apiKey,
        model: process.env.GEMINI_MODEL || llmConfig.gemini.model,
        endpoint: llmConfig.gemini.endpoint,
        temperature: llmConfig.gemini.temperature,
        maxTokens: llmConfig.gemini.maxTokens,
        timeout: llmConfig.gemini.timeout,
      },
      openai: {
        enabled: llmConfig.openai.enabled,
        apiKey: process.env.OPENAI_API_KEY || llmConfig.openai.apiKey,
        model: process.env.OPENAI_MODEL || llmConfig.openai.model,
        endpoint: llmConfig.openai.endpoint,
        temperature: llmConfig.openai.temperature,
        maxTokens: llmConfig.openai.maxTokens,
        timeout: llmConfig.openai.timeout,
      },
      spark: {
        enabled: llmConfig.spark.enabled,
        apiKey: process.env.SPARK_API_KEY || llmConfig.spark.apiKey,
        apiSecret: process.env.SPARK_API_SECRET || llmConfig.spark.apiSecret,
        appId: process.env.SPARK_APP_ID || llmConfig.spark.appId,
        model: process.env.SPARK_MODEL || llmConfig.spark.model,
        endpoint: llmConfig.spark.endpoint,
        temperature: llmConfig.spark.temperature,
        maxTokens: llmConfig.spark.maxTokens,
        timeout: llmConfig.spark.timeout,
      },
      baidu: {
        enabled: llmConfig.baidu.enabled,
        apiKey: process.env.BAIDU_API_KEY || llmConfig.baidu.apiKey,
        secretKey: process.env.BAIDU_SECRET_KEY || llmConfig.baidu.secretKey,
        model: process.env.BAIDU_MODEL || llmConfig.baidu.model,
        endpoint: llmConfig.baidu.endpoint,
        temperature: llmConfig.baidu.temperature,
        maxTokens: llmConfig.baidu.maxTokens,
        timeout: llmConfig.baidu.timeout,
      },
      volcengine: {
        enabled: llmConfig.volcengine.enabled,
        accessKey: process.env.VOLCENGINE_ACCESS_KEY || llmConfig.volcengine.accessKey,
        secretKey: process.env.VOLCENGINE_SECRET_KEY || llmConfig.volcengine.secretKey,
        model: process.env.VOLCENGINE_MODEL || llmConfig.volcengine.model,
        endpoint: llmConfig.volcengine.endpoint,
        temperature: llmConfig.volcengine.temperature,
        maxTokens: llmConfig.volcengine.maxTokens,
        timeout: llmConfig.volcengine.timeout,
      },
      kimi: {
        enabled: llmConfig.kimi.enabled,
        apiKey: process.env.KIMI_API_KEY || llmConfig.kimi.apiKey,
        model: process.env.KIMI_MODEL || llmConfig.kimi.model,
        endpoint: llmConfig.kimi.endpoint,
        temperature: llmConfig.kimi.temperature,
        maxTokens: llmConfig.kimi.maxTokens,
        timeout: llmConfig.kimi.timeout,
      },
    };

    // 验证默认提供商
    const provider = llmProviders[defaultProvider];
    if (!provider || !provider.enabled) {
      const availableProviders = Object.keys(llmProviders).filter(
        (key) => llmProviders[key].enabled
      );

      if (availableProviders.length > 0) {
        defaultProvider = availableProviders[0];
        logger.warn(
          `默认大模型提供商 ${defaultProvider} 不可用，已切换到 ${availableProviders[0]}`
        );
      } else {
        logger.error('没有可用的大模型提供商，请检查配置');
        return false;
      }
    }

    logger.info(`大模型服务初始化成功，默认提供商: ${defaultProvider}`);
    return true;
  } catch (error) {
    logger.error('大模型服务初始化失败', { error: error.message });
    return false;
  }
}

/**
 * 获取大模型回复
 * @param {string} prompt - 提示语
 * @param {string} provider - 提供商名称
 * @returns {Promise<string>} 大模型回复
 */
async function getLLMResponse(prompt, provider = null) {
  try {
    // 使用指定的提供商或默认提供商
    const providerName = provider && llmProviders[provider]?.enabled ? provider : defaultProvider;
    const providerConfig = llmProviders[providerName];

    if (!providerConfig || !providerConfig.enabled) {
      throw new Error(`大模型提供商 ${providerName} 不可用`);
    }

    // 根据不同提供商调用不同的处理函数
    switch (providerName) {
      case 'gemini':
        return await callGemini(prompt, providerConfig);
      case 'openai':
        return await callOpenAI(prompt, providerConfig);
      case 'spark':
        return await callSpark(prompt, providerConfig);
      case 'baidu':
        return await callBaidu(prompt, providerConfig);
      case 'volcengine':
        return await callVolcengine(prompt, providerConfig);
      case 'kimi':
        return await callKimi(prompt, providerConfig);
      default:
        throw new Error(`未支持的大模型提供商: ${providerName}`);
    }
  } catch (error) {
    logger.error('获取大模型回复失败', { error: error.message });
    throw error;
  }
}

/**
 * 调用Google Gemini API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callGemini(prompt, config) {
  try {
    if (!config.apiKey) {
      throw new Error('Gemini API密钥未配置');
    }

    const url = `${config.endpoint}${config.model}:generateContent?key=${config.apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: config.timeout,
      }
    );

    // 解析响应
    if (response.data.candidates && response.data.candidates.length > 0) {
      const content = response.data.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        return content.parts[0].text;
      }
    }

    throw new Error('未能从Gemini响应中提取有效内容');
  } catch (error) {
    logger.error('调用Gemini API失败', { error: error.message });
    throw error;
  }
}

/**
 * 调用OpenAI API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callOpenAI(prompt, config) {
  try {
    if (!config.apiKey) {
      throw new Error('OpenAI API密钥未配置');
    }

    const url = `${config.endpoint}/chat/completions`;

    const response = await axios.post(
      url,
      {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: config.timeout,
      }
    );

    // 解析响应
    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    }

    throw new Error('未能从OpenAI响应中提取有效内容');
  } catch (error) {
    logger.error('调用OpenAI API失败', { error: error.message });
    throw error;
  }
}

/**
 * 调用讯飞星火API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callSpark(prompt, config) {
  logger.info('调用讯飞星火API');
  // 这里需要实现讯飞星火API的调用，因其需要WebSocket连接和特殊的鉴权方式
  // 仅作为示例，实际实现需要更复杂的处理
  return '讯飞星火API调用示例（需要实现）';
}

/**
 * 调用百度文心一言API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callBaidu(prompt, config) {
  logger.info('调用百度文心一言API');
  // 这里需要实现百度文心一言API的调用，包括获取access_token等
  // 仅作为示例，实际实现需要更复杂的处理
  return '百度文心一言API调用示例（需要实现）';
}

/**
 * 调用字节火山引擎API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callVolcengine(prompt, config) {
  logger.info('调用字节火山引擎API');
  // 这里需要实现字节火山引擎API的调用
  // 仅作为示例，实际实现需要更复杂的处理
  return '字节火山引擎API调用示例（需要实现）';
}

/**
 * 调用Kimi API
 * @param {string} prompt - 提示语
 * @param {object} config - 配置
 * @returns {Promise<string>} 回复内容
 */
async function callKimi(prompt, config) {
  logger.info('调用Kimi API');
  // 这里需要实现Kimi API的调用
  // 仅作为示例，实际实现需要更复杂的处理
  return 'Kimi API调用示例（需要实现）';
}

/**
 * 获取所有可用的大模型提供商
 * @returns {Array<string>} 提供商列表
 */
function getAvailableProviders() {
  return Object.keys(llmProviders).filter((key) => llmProviders[key].enabled);
}

/**
 * 获取当前默认提供商
 * @returns {string} 默认提供商名称
 */
function getDefaultProvider() {
  return defaultProvider;
}

module.exports = {
  initLLMService,
  getLLMResponse,
  getAvailableProviders,
  getDefaultProvider,
};
