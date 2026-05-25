import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { type, data } = req.body;
  
  if (!type || !data) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  try {
    await kv.set(type, data);
    
    // 获取更新后的所有数据
    const players = await kv.get('players') || {};
    const scores = await kv.get('scores') || {};
    const cards = await kv.get('cards') || {};
    const prompts = await kv.get('prompts') || [];
    const guests = await kv.get('guests') || [];
    const settings = await kv.get('settings') || {
      bingoLineScore: 100,
      socialBonusScore: 20,
      firstBingoBonus: 20,
      fullCardBonus: 500,
      fullCardBonusEnabled: true,
      siteTitle: "Wedding Bingo"
    };
    
    res.status(200).json({ 
      success: true, 
      gameData: { players, scores, cards, prompts, guests, settings }
    });
  } catch (error) {
    console.error('Error updating game data:', error);
    res.status(500).json({ message: 'Error updating game data' });
  }
}
