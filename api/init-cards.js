import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 允许 GET 和 POST 请求
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    console.log('Starting cards generation...');
    
    // 获取 prompts
    const prompts = await redis.get('prompts');
    if (!prompts || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompts not found. Please run /api/init-data first.'
      });
    }
    
    // 生成卡片
    console.log('Generating cards...');
    const cards = generateAllCards(prompts);
    
    // 保存卡片
    console.log('Saving cards...');
    await redis.set('cards', cards);
    
    console.log('Cards generation complete!');
    res.status(200).json({ 
      success: true, 
      message: 'Cards generated successfully',
      cardCount: Object.keys(cards).length
    });
  } catch (error) {
    console.error('Error generating cards:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating cards',
      error: error.message
    });
  }
}

function generateAllCards(prompts) {
  const cards = {};
  const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  
  // Generate one card for each prefix
  const prefixCards = {};
  prefixes.forEach(prefix => {
    prefixCards[prefix] = generateSingleCard(prompts);
  });
  
  // Use the same card for all cards with the same prefix
  prefixes.forEach(prefix => {
    for (let i = 1; i <= 8; i++) {
      const cardId = `${prefix}${i}`;
      cards[cardId] = JSON.parse(JSON.stringify(prefixCards[prefix]));
    }
  });
  
  return cards;
}

function generateSingleCard(allPrompts) {
  const shuffled = [...allPrompts].sort(() => Math.random() - 0.5);
  const selectedPrompts = shuffled.slice(0, 24);
  
  const grid = [];
  let promptIndex = 0;
  
  for (let row = 0; row < 5; row++) {
    const rowCells = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        // Center cell is FREE
        rowCells.push({
          isFree: true,
          completed: true,
          prompt: null,
          prompt_cn: null,
          answers: []
        });
      } else {
        const prompt = selectedPrompts[promptIndex];
        rowCells.push({
          isFree: false,
          completed: false,
          prompt: prompt.prompt,
          prompt_cn: prompt.prompt_cn,
          answers: prompt.answers,
          promptId: prompt.id
        });
        promptIndex++;
      }
    }
    grid.push(rowCells);
  }
  
  return {
    grid: grid,
    bingoLines: [],
    firstBingo: false
  };
}
