/**
 * OKX量化交易系统 - 大模型多智能体架构
 * 主入口文件
 */

// 首先加载环境变量
const { loadEnvVariables } = require('./config/env-loader');
loadEnvVariables();

const { createModuleLogger } = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./data/database');
const { initRedisCache, closeCache } = require('./data/cache');
const { initLLMService, getDefaultProvider, getAvailableProviders } = require('./services/llm-service');
const { 
  getSystemConfig, 
  getAgentConfig, 
  enableConfigHotReload, 
  onConfigChange, 
  CONFIG_EVENTS 
} = require('./config/config-loader');

// 创建主日志记录器
const logger = createModuleLogger('App');

// 系统启动函数
async function startSystem() {
  try {
    logger.info('系统启动中...');
    
    // 加载系统配置
    const config = getSystemConfig();
    logger.info(`系统名称: ${config.system.name}`);
    logger.info(`系统版本: ${config.system.version}`);
    
    // 加载智能体配置
    const agentConfig = getAgentConfig();
    const enabledAgents = Object.keys(agentConfig).filter(key => agentConfig[key].enabled);
    logger.info(`已启用的智能体: ${enabledAgents.join(', ')}`);
    
    // 启用配置热更新（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      enableConfigHotReload();
      
      // 监听配置变更事件
      onConfigChange(CONFIG_EVENTS.SYSTEM_CONFIG_CHANGED, ({ oldConfig, newConfig }) => {
        logger.info('系统配置已更新');
        
        // 检查关键配置是否更改
        if (oldConfig.system.logLevel !== newConfig.system.logLevel) {
          logger.info(`日志级别已更改: ${oldConfig.system.logLevel} -> ${newConfig.system.logLevel}`);
        }
      });
      
      onConfigChange(CONFIG_EVENTS.AGENT_CONFIG_CHANGED, () => {
        logger.info('智能体配置已更新');
      });
    }
    
    // 初始化数据库
    logger.info('正在初始化数据库...');
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      logger.error('数据库初始化失败');
      process.exit(1);
    }
    
    // 初始化Redis缓存
    logger.info('正在初始化Redis缓存...');
    const cacheInitialized = await initRedisCache();
    if (!cacheInitialized) {
      logger.error('Redis缓存初始化失败');
      process.exit(1);
    }
    
    // 初始化大模型服务
    logger.info('正在初始化大模型服务...');
    const llmInitialized = await initLLMService();
    if (!llmInitialized) {
      logger.error('大模型服务初始化失败');
      process.exit(1);
    }
    
    // 获取可用的大模型提供商
    const availableProviders = getAvailableProviders();
    const defaultProvider = getDefaultProvider();
    logger.info(`可用的大模型提供商: ${availableProviders.join(', ')}`);
    logger.info(`默认使用的大模型: ${defaultProvider}`);
    
    logger.info('系统启动完成，步骤1已完成');
  } catch (error) {
    logger.error('系统启动失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 优雅关闭
async function gracefulShutdown() {
  try {
    logger.info('系统正在关闭...');
    
    // 关闭数据库连接
    await closeDatabase();
    logger.info('数据库连接已关闭');
    
    // 关闭Redis连接
    await closeCache();
    logger.info('Redis连接已关闭');
    
    logger.info('系统已安全关闭');
    process.exit(0);
  } catch (error) {
    logger.error('系统关闭失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 处理进程终止信号
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  gracefulShutdown();
});

// 启动系统
startSystem(); 