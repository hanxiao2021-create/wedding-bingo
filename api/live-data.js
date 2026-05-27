import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // ============================================
    // 优化：使用 mget 一次性获取多个键，减少请求次数
    // ============================================
    const [players, scores] = await redis.mget('players', 'scores');
    
    // 返回轻量级数据
    res.status(200).json({ 
      players: players || {}, 
      scores: scores || {} 
    });
  } catch (error) {
    console.error('Error fetching live data:', error);
    res.status(500).json({ message: 'Error fetching live data' });
  }
}
