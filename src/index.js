/**
 * OKX量化交易系统 - 大模型多智能体架构
 * 主入口文件
 */

// 加载环境变量
require('dotenv').config();

// 引入配置加载器和必要模块
const { getSystemConfig } = require('./config/config-loader');
const { initDatabase, closeDatabase } = require('./data/database');
const { initRedisCache, closeCache } = require('./data/cache');
const { initLLMService, getDefaultProvider, getAvailableProviders } = require('./services/llm-service');
const { createModuleLogger } = require('./utils/logger');

const logger = createModuleLogger('App');

// 记录系统启动
logger.info('OKX量化交易系统启动中...');

// 未来将在这里导入和初始化各个模块
// const { initAgents } = require('./agents');
// const { initApi } = require('./api');

// 临时的启动代码
const startSystem = async () => {
  try {
    logger.info('正在初始化环境...');
    
    // 加载配置
    logger.info('正在加载配置...');
    const config = getSystemConfig();
    logger.info(`系统名称: ${config.system.name}`);
    logger.info(`使用默认交易对: ${config.market.defaultSymbol}`);
    
    // 初始化数据库连接并验证
    logger.info('正在初始化数据库...');
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      logger.error('数据库初始化失败，系统无法启动');
      process.exit(1);
    }
    
    // 初始化Redis缓存
    logger.info('正在初始化Redis缓存...');
    const cacheInitialized = await initRedisCache();
    if (!cacheInitialized) {
      logger.warn('Redis缓存初始化失败，系统将在无缓存模式下运行');
    }
    
    // 初始化大模型服务
    logger.info('正在初始化大模型服务...');
    const llmInitialized = await initLLMService();
    if (llmInitialized) {
      const defaultProvider = getDefaultProvider();
      const availableProviders = getAvailableProviders();
      logger.info(`大模型服务初始化成功，默认使用: ${defaultProvider}`);
      logger.info(`可用的大模型: ${availableProviders.join(', ')}`);
    } else {
      logger.warn('大模型服务初始化失败，部分功能可能不可用');
    }
    
    logger.info('正在启动智能体...');
    // await initAgents(config.agents);
    
    logger.info('正在启动API服务...');
    // await initApi();
    
    logger.info('系统初始化完成，运行中...');
  } catch (error) {
    logger.error('系统启动失败:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// 启动系统
startSystem();

// 处理进程终止信号
process.on('SIGINT', async () => {
  logger.info('接收到终止信号，系统正在优雅关闭...');
  
  // 关闭数据库连接
  await closeDatabase();
  
  // 关闭Redis连接
  await closeCache();
  
  logger.info('系统已安全关闭');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', { error: error.message, stack: error.stack });
  
  // 在生产环境中，可以添加错误报告代码，如发送告警邮件、短信通知等
}); 