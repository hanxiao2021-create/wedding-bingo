import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // 从 Redis 获取所有游戏数据
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
    
    // 返回所有数据
    res.status(200).json({ players, scores, cards, prompts, guests, settings });
  } catch (error) {
    console.error('Error fetching game data:', error);
    res.status(500).json({ message: 'Error fetching game data' });
  }
}
