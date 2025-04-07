# OKX量化交易系统 - 环境配置指南

本文档提供详细的环境配置和项目初始化步骤。

## 开发环境需求

- Node.js 20.x 或更高版本
- Redis 6.x 或更高版本
- MySQL 8.x 或更高版本
- Git

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/okx-trading-system.git
cd okx-trading-system
```

### 2. 安装依赖

使用pnpm安装所有依赖：

```bash
pnpm install
```

### 3. 配置环境变量

复制示例环境变量文件并进行配置：

```bash
cp .env.example .env
```

编辑`.env`文件，填入您的API密钥和其他配置信息。

### 4. 初始化数据库

MySQL数据库初始化：

```bash
# 登录到MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE okx_trading_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户并授权
CREATE USER 'okx_app'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON okx_trading_system.* TO 'okx_app'@'localhost';
FLUSH PRIVILEGES;
```

### 5. 启动Redis

确保Redis服务器正在运行：

```bash
# Windows下可以使用命令启动Redis服务
redis-server

# 或者如果已经安装为Windows服务
net start redis
```

### 6. 运行项目

启动开发模式：

```bash
pnpm dev
```

或者启动生产模式：

```bash
pnpm start
```

## 配置文件说明

系统使用多个配置文件来控制不同方面的行为：

- `config/system-config.json`: 全局系统设置
- `config/agent-config.json`: 智能体配置（可选，默认使用system-config.json中的agents部分）

可以通过命令行参数指定使用自定义配置文件：

```bash
pnpm start:custom --config=my-custom-config.json
```

## 目录结构

```
okx-trading-system/
├── config/             # 配置文件
├── doc/                # 文档
├── logs/               # 日志文件
├── src/                # 源代码
│   ├── agents/         # 智能体模块
│   ├── api/            # API接口
│   ├── config/         # 配置加载器
│   ├── core/           # 核心功能
│   ├── data/           # 数据处理
│   ├── models/         # 数据模型
│   ├── services/       # 服务层
│   └── utils/          # 工具函数
└── test/               # 测试代码
```

## 故障排除

1. 如果遇到连接Redis失败的问题，请检查Redis服务是否正在运行，以及.env文件中的配置是否正确。

2. 如果遇到连接MySQL失败的问题，请确保MySQL服务正在运行，并检查用户名、密码和数据库名称是否正确。

3. 对于API密钥错误，请确保在OKX官网中生成了有效的API密钥，并设置了正确的权限。 