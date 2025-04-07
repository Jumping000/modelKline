/**
 * 环境变量加载模块
 * 负责处理和加载环境变量
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * 加载环境变量
 * 按照优先顺序加载：.env.local > .env.{NODE_ENV} > .env
 */
function loadEnvVariables() {
  // 项目根目录
  const rootDir = process.cwd();
  
  // 当前环境
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // 环境变量文件优先级
  const envFiles = [
    path.join(rootDir, '.env'),
    path.join(rootDir, `.env.${nodeEnv}`),
    path.join(rootDir, '.env.local')
  ];
  
  // 加载环境变量文件
  envFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const envConfig = dotenv.parse(fs.readFileSync(filePath));
      
      // 将解析的环境变量添加到 process.env
      Object.entries(envConfig).forEach(([key, value]) => {
        // 只在环境变量不存在时设置，确保命令行设置的优先级更高
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      });
      
      console.log(`已加载环境变量文件: ${path.basename(filePath)}`);
    }
  });
  
  // 设置默认值
  setDefaultEnvValues();
  
  // 验证必需的环境变量
  validateRequiredEnvVariables();
}

/**
 * 为关键环境变量设置默认值
 */
function setDefaultEnvValues() {
  // 系统默认值
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.PORT = process.env.PORT || '3000';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  
  // 数据库默认值
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '3306';
  
  // Redis默认值
  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
  
  // 大模型默认值
  process.env.DEFAULT_LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || 'gemini';
}

/**
 * 验证必需的环境变量
 */
function validateRequiredEnvVariables() {
  // 定义必需的环境变量组
  const requiredGroups = [
    // 数据库配置组 - 至少需要一组完整的数据库配置
    {
      name: '数据库配置',
      variables: ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'],
      required: true
    },
    // 大模型API密钥组 - 至少需要一个大模型API密钥
    {
      name: '大模型API密钥',
      variables: ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'SPARK_API_KEY', 'BAIDU_API_KEY', 'VOLCANO_API_KEY', 'KIMI_API_KEY'],
      required: false,
      minRequired: 1
    }
  ];
  
  // 验证每组环境变量
  let hasError = false;
  
  for (const group of requiredGroups) {
    if (group.required) {
      // 检查组内所有变量是否存在
      const missingVars = group.variables.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.error(`错误: ${group.name}不完整，缺少以下环境变量: ${missingVars.join(', ')}`);
        hasError = true;
      }
    } else if (group.minRequired) {
      // 检查组内至少有指定数量的变量存在
      const existingVars = group.variables.filter(varName => process.env[varName]);
      
      if (existingVars.length < group.minRequired) {
        console.error(`错误: ${group.name}组至少需要${group.minRequired}个配置，但目前有${existingVars.length}个`);
        console.error(`请至少配置以下变量之一: ${group.variables.join(', ')}`);
        hasError = true;
      }
    }
  }
  
  // 如果是生产环境且有错误，则退出进程
  if (hasError && process.env.NODE_ENV === 'production') {
    console.error('由于缺少必要的环境变量配置，系统无法在生产环境中启动');
    process.exit(1);
  } else if (hasError) {
    console.warn('环境变量配置不完整，系统可能无法正常工作');
  }
}

/**
 * 获取运行环境
 * @returns {string} 当前运行环境 ('development', 'production', 'test')
 */
function getNodeEnv() {
  return process.env.NODE_ENV || 'development';
}

/**
 * 判断是否为开发环境
 * @returns {boolean} 是否为开发环境
 */
function isDevelopment() {
  return getNodeEnv() === 'development';
}

/**
 * 判断是否为生产环境
 * @returns {boolean} 是否为生产环境
 */
function isProduction() {
  return getNodeEnv() === 'production';
}

/**
 * 判断是否为测试环境
 * @returns {boolean} 是否为测试环境
 */
function isTest() {
  return getNodeEnv() === 'test';
}

module.exports = {
  loadEnvVariables,
  getNodeEnv,
  isDevelopment,
  isProduction,
  isTest
}; 