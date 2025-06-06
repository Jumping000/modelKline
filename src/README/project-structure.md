# OKX量化交易系统项目结构说明

本文档描述了OKX量化交易系统的项目结构、已完成的内容和后续计划。

## 项目目录结构

```
modelKline/
├── config/                   # 配置文件目录
│   ├── agent-config.json     # 智能体配置
│   └── system-config.json    # 系统全局配置
├── logs/                     # 日志文件目录
├── src/                      # 源代码目录
│   ├── agents/               # 智能体目录（待实现）
│   ├── api/                  # API接口目录（待实现） 
│   ├── config/               # 配置加载模块
│   │   ├── agent-config-schema.js  # 智能体配置结构定义
│   │   ├── config-loader.js        # 配置加载器
│   │   └── env-loader.js           # 环境变量加载器
│   ├── data/                 # 数据访问层
│   │   ├── cache.js          # Redis缓存管理
│   │   └── database.js       # MySQL数据库管理
│   ├── services/             # 服务层
│   │   └── llm-service.js    # 大模型服务接口
│   ├── utils/                # 工具类
│   │   └── logger.js         # 日志工具
│   └── index.js              # 主入口文件
├── .env                      # 环境变量文件（私有）
├── .env.example              # 环境变量示例文件
├── .eslintrc.json            # ESLint配置
├── .gitignore                # Git忽略文件
├── package.json              # 项目依赖配置
└── README.md                 # 项目说明文档
```

## 已完成内容

项目初始化与基础设施搭建部分已经完成，具体包括：

### 1.1 环境配置
- ✅ 开发环境搭建：Node.js v20+、代码规范配置
- ✅ 项目结构设计：模块化目录结构、配置和日志目录
- ✅ 版本控制：Git仓库初始化和gitignore配置

### 1.2 依赖管理 
- ✅ 核心依赖集成：必要的SDK和工具库已安装
- ✅ 大模型API接口：统一的多模型接口已实现，支持6种大模型
- ✅ 数据存储配置：MySQL和Redis连接和管理已实现
- ✅ 工具库集成：开发和测试工具已配置

### 1.3 核心配置系统
- ✅ 配置加载机制：分层配置和环境变量处理
- ✅ 智能体配置结构：智能体配置模式已定义
- ✅ 参数验证逻辑：使用Joi实现的配置验证
- ✅ 热更新配置：支持配置文件监控和动态重载

## 注意事项

1. 环境变量配置：在运行系统前，请确保根据`.env.example`创建了`.env`文件并填写了必要的配置
2. 数据库连接：系统启动时会验证数据库连接，请确保数据库服务可用
3. 大模型API密钥：至少需要一个大模型API密钥才能启用大模型服务 