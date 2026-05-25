export default async function handler(req, res) {
  // 检查环境变量
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!hasUrl || !hasToken) {
    return res.status(500).json({
      success: false,
      message: 'Redis environment variables not found',
      hasUrl: hasUrl,
      hasToken: hasToken
    });
  }
  
  try {
    // 动态导入 Redis 模块
    const { Redis } = await import('@upstash/redis');
    
    // 初始化 Redis 客户端
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // 测试 Redis 连接
    await redis.set('test', 'Hello World');
    const testValue = await redis.get('test');
    
    res.status(200).json({
      success: true,
      message: 'Redis connection successful',
      testValue: testValue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error connecting to Redis',
      error: error.message
    });
  }
}
