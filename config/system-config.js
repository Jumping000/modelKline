/**
 * OKX量化交易系统配置文件
 * 包含系统所有主要配置项
 */

module.exports = {
  // 系统全局配置部分
  system: {
    name: "OKX量化交易系统",            // 系统名称
    version: "0.1.0",                 // 系统版本号
    logLevel: "info",                 // 日志级别设置
    maxLogFileSize: "10m",            // 单个日志文件最大大小
    maxLogFiles: 10,                  // 最大保留的日志文件数量
    timeZone: "Asia/Shanghai"         // 系统时区设置
  },
  
  // 市场相关配置
  market: {
    defaultSymbol: "UNI-USDT",        // 默认交易对，使用UNI-USDT
    supportedSymbols: [               // 支持的交易对列表
      "BTC-USDT", 
      "ETH-USDT", 
      "SOL-USDT", 
      "UNI-USDT"                      // 已添加UNI-USDT交易对
    ],
    defaultKlineInterval: "1m",       // 默认K线时间间隔
    supportedIntervals: [             // 支持的K线时间间隔列表
      "1m", "5m", "15m", "30m", "1h", "4h", "1d"
    ]
  },
  
  // 智能体配置部分
  agents: {
    // K线形态识别智能体
    kLinePatternAgent: {
      enabled: true,                  // 是否启用该智能体
      weight: 0.8,                    // 该智能体在决策中的权重
      parameters: {                   // 智能体特定参数
        patterns: [                   // 需要识别的K线形态列表
          "hammer", 
          "shootingStar", 
          "doji", 
          "engulfing"
        ]
      }
    },
    
    // 蜡烛图形态识别智能体
    candlestickPatternAgent: {
      enabled: true,                  // 是否启用该智能体
      weight: 0.7,                    // 该智能体在决策中的权重
      parameters: {                   // 智能体特定参数
        patterns: [                   // 需要识别的蜡烛图形态列表
          "headAndShoulders", 
          "doubleTop", 
          "doubleBottom", 
          "triangle"
        ]
      }
    },
    
    // 市场情绪分析智能体
    marketSentimentAgent: {
      enabled: true,                  // 是否启用该智能体
      weight: 0.6,                    // 该智能体在决策中的权重
      parameters: {                   // 智能体特定参数
        dataWindow: 24,               // 数据分析窗口大小（小时）
        updateInterval: 3600          // 更新间隔（秒）
      }
    }
  },
  
  // 交易相关配置
  trading: {
    // 风险管理配置
    riskManagement: {
      maxPositionSize: 0.1,           // 最大仓位比例（占总资产百分比）
      stopLossPercentage: 0.02,       // 止损百分比
      takeProfitPercentage: 0.05,     // 止盈百分比
      maxDrawdown: 0.15               // 最大允许回撤比例
    },
    
    // 执行设置
    executionSettings: {
      orderType: "limit",             // 订单类型（限价单）
      slippageTolerance: 0.001,       // 滑点容忍度
      retryAttempts: 3,               // 失败重试次数
      retryDelay: 1000                // 重试延迟（毫秒）
    }
  },
  
  // 数据库配置
  database: {
    connectionPoolSize: 10,           // 连接池大小
    connectionTimeout: 30000,         // 连接超时时间（毫秒）
    queryTimeout: 5000                // 查询超时时间（毫秒）
  },
  
  // 缓存配置
  cache: {
    ttlSeconds: 300,                  // 缓存生存时间（秒）
    maxCacheSize: "1gb",              // 最大缓存大小
    preloadMarketData: true           // 是否预加载市场数据
  }
}; 