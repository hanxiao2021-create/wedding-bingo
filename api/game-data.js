import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // ============================================
    // 优化：一次性获取所有数据
    // ============================================
    const keys = ['players', 'scores', 'cards', 'prompts', 'guests', 'settings'];
    const data = await redis.mget(...keys);
    
    // 将数组结果映射回对象
    const [players, scores, cards, prompts, guests, settings] = data;
    
    res.status(200).json({ 
      players: players || {}, 
      scores: scores || {}, 
      cards: cards || {}, 
      prompts: prompts || [], 
      guests: guests || [], 
      settings: settings || {
        bingoLineScore: 100,
        socialBonusScore: 20,
        firstBingoBonus: 20,
        firstCellBonus: 10,
        fullCardBonus: 500,
        fullCardBonusEnabled: true,
        siteTitle: "Wedding Bingo"
      }
    });
  } catch (error) {
    console.error('Error fetching game data:', error);
    res.status(500).json({ message: 'Error fetching game data' });
  }
}
