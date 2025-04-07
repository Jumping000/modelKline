/**
 * OKX量化交易系统 - 大模型多智能体架构
 * 主入口文件
 */

// 加载环境变量
require('dotenv').config();

// 引入配置加载器
const { getSystemConfig } = require('./config/config-loader');

// 记录系统启动
console.log('OKX量化交易系统启动中...');

// 未来将在这里导入和初始化各个模块
// const { initDatabase } = require('./data/database');
// const { initRedisCache } = require('./data/cache');
// const { initAgents } = require('./agents');
// const { initApi } = require('./api');

// 临时的启动代码
const startSystem = async () => {
  try {
    console.log('正在初始化环境...');
    // await initDatabase();
    // await initRedisCache();
    
    console.log('正在加载配置...');
    const config = getSystemConfig();
    console.log(`系统名称: ${config.system.name}`);
    console.log(`使用默认交易对: ${config.market.defaultSymbol}`);
    
    console.log('正在启动智能体...');
    // await initAgents(config.agents);
    
    console.log('正在启动API服务...');
    // await initApi();
    
    console.log('系统初始化完成，运行中...');
  } catch (error) {
    console.error('系统启动失败:', error);
    process.exit(1);
  }
};

// 启动系统
startSystem();

// 处理进程终止信号
process.on('SIGINT', () => {
  console.log('接收到终止信号，系统正在优雅关闭...');
  // 在这里添加清理代码
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 在这里添加错误报告代码
}); 