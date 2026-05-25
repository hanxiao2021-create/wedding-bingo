import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 初始数据
const INITIAL_PROMPTS = [
  { id: 1, prompt: "Ambassador of 'Please Bring Your Seat Back Upright'", prompt_cn: "“请调直座椅靠背” 推广大使", answers: ["Juliet Sam", "Jody Wong"] },
  { id: 2, prompt: "ROM Eyewitness", prompt_cn: "“二人合法”目击证人", answers: ["Ning Shan", "Xingchen Yao", "Shuyue Zhu", "Qifeng Song", "Charlie Oh", "Mei Jye Foo"] },
  // ... 其他提示数据保持不变 ...
];

const INITIAL_GUESTS = [
  { name: "Timothy Ang", group: 1 },
  { name: "Xidan Hua", group: 1 },
  // ... 其他宾客数据保持不变 ...
];

const DEFAULT_SETTINGS = {
  bingoLineScore: 100,
  socialBonusScore: 20,
  firstBingoBonus: 20,
  fullCardBonus: 500,
  fullCardBonusEnabled: true,
  siteTitle: "Wedding Bingo"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // 初始化数据到 Redis
    await redis.set('prompts', INITIAL_PROMPTS);
    await redis.set('guests', INITIAL_GUESTS);
    await redis.set('players', {});
    await redis.set('scores', {});
    await redis.set('settings', DEFAULT_SETTINGS);
    await redis.set('cards', generateAllCards(INITIAL_PROMPTS));
    
    res.status(200).json({ success: true, message: 'Game data initialized' });
  } catch (error) {
    console.error('Error initializing game data:', error);
    res.status(500).json({ message: 'Error initializing game data' });
  }
}

const DEFAULT_SETTINGS = {
  bingoLineScore: 100,
  socialBonusScore: 20,
  firstBingoBonus: 20,
  fullCardBonus: 500,
  fullCardBonusEnabled: true,
  siteTitle: "Wedding Bingo"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // 初始化数据
    await kv.set('prompts', INITIAL_PROMPTS);
    await kv.set('guests', INITIAL_GUESTS);
    await kv.set('players', {});
    await kv.set('scores', {});
    await kv.set('settings', DEFAULT_SETTINGS);
    await kv.set('cards', generateAllCards(INITIAL_PROMPTS));
    
    res.status(200).json({ success: true, message: 'Game data initialized' });
  } catch (error) {
    console.error('Error initializing game data:', error);
    res.status(500).json({ message: 'Error initializing game data' });
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
