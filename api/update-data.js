import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { type, data } = req.body;
  
  if (!type || !data) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  try {
    // 更新指定类型的数据到 Redis
    // 注意：Upstash Redis SDK 会自动处理对象的 JSON 序列化
    await redis.set(type, data);
    
    // 获取更新后的所有数据以返回给前端确认
    const players = await redis.get('players') || {};
    const scores = await redis.get('scores') || {};
    const cards = await redis.get('cards') || {};
    const prompts = await redis.get('prompts') || [];
    const guests = await redis.get('guests') || [];
    const settings = await redis.get('settings') || {
      bingoLineScore: 100,
      socialBonusScore: 20,
      firstBingoBonus: 20,
      fullCardBonus: 500,
      fullCardBonusEnabled: true,
      siteTitle: "Wedding Bingo"
    };
    
    // 返回更新后的所有数据
    res.status(200).json({ 
      success: true, 
      gameData: { players, scores, cards, prompts, guests, settings }
    });
  } catch (error) {
    console.error('Error updating game data:', error);
    res.status(500).json({ message: 'Error updating game data' });
  }
}
