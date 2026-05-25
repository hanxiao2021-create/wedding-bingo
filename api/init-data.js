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
  { id: 3, prompt: "The K-BBQ Guy", prompt_cn: "自带烤肉技能的人", answers: ["Ji-Woong Sun"] },
  { id: 4, prompt: "ESG-Certified Zero-Methane Emitter", prompt_cn: "ESG认证的零甲烷排放者", answers: ["Tiffany Hendratama", "Jevan Choo"] },
  { id: 5, prompt: "Toblerone Choc Ad Resident", prompt_cn: "多宝乐巧克力广告里的居住者", answers: ["Runqi Wang", "Shin Yoong Chua"] },
  { id: 6, prompt: "No-WiFi Cruise Companion", prompt_cn: "新郎的海上戒网搭子", answers: ["Daniel Poon", "Mark Liang", "Timothy Ang", "Marcus Hutabarut", "Rochele Ng", "Sheryl Choong", "Juliet Sam"] },
  { id: 7, prompt: "Post-Wedding Next-Door Roomies", prompt_cn: "新人婚后隔壁室友", answers: ["Yi Fu Zhu", "Jin Xuan Tan"] },
  { id: 8, prompt: "Military Driving License Holder", prompt_cn: "军用驾照持有者", answers: ["Minjia Fu"] },
  { id: 9, prompt: "Founding Member of Groom's Circle", prompt_cn: "新郎朋友圈初代元老", answers: ["Chenyu Liang"] },
  { id: 10, prompt: "The One Who Sees the Sun First", prompt_cn: "生活在比这里更早迎接明天的人", answers: ["Yuzhu Chen"] },
  { id: 11, prompt: "Singapore MBFC Tower 2", prompt_cn: "Singapore MBFC Tower 2", answers: ["Karys Lam", "Jia Qi Law"] },
  { id: 12, prompt: "Two-character Chinese names", prompt_cn: "中文名字只有两个字的人", answers: ["Wen Tong", "Yi Yang", "Zhuo Jiao", "Ning Shan", "Juan Du", "Zi Wang", "Juan Wang", "Shuo Liu"] },
  { id: 13, prompt: "Cat Count > 1", prompt_cn: "猫 > 1", answers: ["Xingchen Yao", "Ning Shan"] },
  { id: 14, prompt: "Walked by a Dog", prompt_cn: "每天被狗溜", answers: ["Pearl Kiang", "Charlie Oh", "Mei Jye Foo", "Juan Wang", "Wen Tong", "Qihang Chen"] },
  { id: 15, prompt: "Licensed Slope Pusher", prompt_cn: "雪场合法推坡选手", answers: ["Ning Shan"] },
  { id: 16, prompt: "The Shared Senpai", prompt_cn: "新人的前辈", answers: ["Xidan Hua", "Yanwei Liang", "Pearl Kiang", "Yili Fang", "Fuying Lu", "Fuxin Lu", "Garreth Lee", "Charlie Oh", "Guowen Ma"] },
  { id: 17, prompt: "Smash That Crossed the Causeway", prompt_cn: "前大马杀球王", answers: ["Peter Foo"] },
  { id: 18, prompt: "Ex Groom's Homework Supplier", prompt_cn: "新郎的作业发布者", answers: ["Betty Foo", "Thomas Ang"] },
  { id: 19, prompt: "On Call or On Court", prompt_cn: "不打网球就打电话", answers: ["Yili Fang"] },
  { id: 20, prompt: "K-Kid Magnet", prompt_cn: "会韩语的孩子王", answers: ["Elisa Toh"] },
  { id: 21, prompt: "Groom's Ex-Workmate", prompt_cn: "新郎前同事", answers: ["Theresa Ang", "Jane Teo"] },
  { id: 22, prompt: "Public Sector Buyer", prompt_cn: "公家买手", answers: ["Leroy Chong"] },
  { id: 23, prompt: "Shutter Headhunter", prompt_cn: "快门猎头", answers: ["Melvern Iskandar"] },
  { id: 24, prompt: "Pastors", prompt_cn: "牧师", answers: ["Charlie Oh", "Peter Foo"] },
  { id: 25, prompt: "Solves X Daily", prompt_cn: "每天都在解X", answers: ["Daniel Poon"] },
  { id: 26, prompt: "Majors & Industry, All Hit Groom", prompt_cn: "和新郎专业行业全撞", answers: ["Terence Lam"] },
  { id: 27, prompt: "Pearl Surveyor", prompt_cn: "测量珍珠的人", answers: ["Shiou Hong Lin"] },
  { id: 28, prompt: "Former IB", prompt_cn: "前投行", answers: ["Garreth Lee"] },
  { id: 29, prompt: "Scrolled from TikTok to Rednote", prompt_cn: "从抖音刷到小红书", answers: ["Qifeng Song"] },
  { id: 30, prompt: "Bali Wedding Boomerang", prompt_cn: "巴厘岛婚礼回旋镖", answers: ["Melvern Iskandar", "Tiffany Hendratama"] },
  { id: 31, prompt: "Kent Ridge All-Nighter Champ", prompt_cn: "肯特岗熬夜冠军", answers: ["Mark Liang"] },
  { id: 32, prompt: "Knows How to Inject", prompt_cn: "会打针的", answers: ["Marcus Hutabarut", "Melvern Iskandar"] },
  { id: 33, prompt: "Geography Teacher", prompt_cn: "地理老师", answers: ["Xiaoyi Liu", "Thomas Ang"] },
  { id: 34, prompt: "Twin", prompt_cn: "双胞胎", answers: ["Fuying Lu", "Fuxin Lu"] },
  { id: 35, prompt: "Fact-Checker for Consultants", prompt_cn: "帮咨询顾问查资料的人", answers: ["Frances Lim"] },
  { id: 36, prompt: "Bride's Tent Partner", prompt_cn: "新娘的帐篷合伙人", answers: ["Yang Liu", "Keyee Siah", "Guowen Ma", "Tzy Woei Yap", "Siang Ang Tay", "Hou Haang Wong"] },
  { id: 37, prompt: "Same Gen at Reunion Table", prompt_cn: "过年坐同一桌的同辈", answers: ["Qian Cheng", "Xueshan Lin"] },
  { id: 38, prompt: "Bride's Two-Time Schoolmate", prompt_cn: "和新娘两次同窗过", answers: ["Tingya Xiao", "Shuyue Zhu", "Yang Liu", "Keyee Siah"] },
  { id: 39, prompt: "Groom's Poly Project Ride-or-Die", prompt_cn: "新郎理工学院的作业搭子", answers: ["Rochele Ng", "Sheryl Choong", "Juliet Sam"] },
  { id: 40, prompt: "Rookie Mom", prompt_cn: "新手妈妈", answers: ["Jiawen Zhang"] }
];

const INITIAL_GUESTS = [
  { name: "Timothy Ang", group: 1 },
  { name: "Xidan Hua", group: 1 },
  { name: "Elisa Toh", group: 1 },
  { name: "Ji-Woong Sun", group: 1 },
  { name: "Daniel Poon", group: 1 },
  { name: "Mark Liang", group: 1 },
  { name: "Yili Fang", group: 1 },
  { name: "Jevan Choo", group: 1 },
  { name: "Jane Teo", group: 1 },
  { name: "Melvern Iskandar", group: 1 },
  { name: "Tiffany Hendratama", group: 1 },
  { name: "Fuying Lu", group: 1 },
  { name: "Fuxin Lu", group: 1 },
  { name: "Theresa Ang", group: 1 },
  { name: "Frances Lim", group: 1 },
  { name: "Marcus Hutabarut", group: 1 },
  { name: "Garreth Lee", group: 1 },
  { name: "Charlie Oh", group: 1 },
  { name: "Mei Jye Foo", group: 1 },
  { name: "Peter Foo", group: 1 },
  { name: "Betty Foo", group: 1 },
  { name: "Thomas Ang", group: 1 },
  { name: "Pearl Kiang", group: 2 },
  { name: "Shiou Hong Lin", group: 2 },
  { name: "Terence Lam", group: 2 },
  { name: "Leroy Chong", group: 2 },
  { name: "Yi Fu Zhu", group: 3 },
  { name: "Jin Xuan Tan", group: 3 },
  { name: "Runqi Wang", group: 3 },
  { name: "Shin Yoong Chua", group: 3 },
  { name: "Minjia Fu", group: 3 },
  { name: "Yifan Zhou", group: 3 },
  { name: "Chenyu Liang", group: 4 },
  { name: "Yanwei Liang", group: 4 },
  { name: "Ning Shan", group: 5 },
  { name: "Xingchen Yao", group: 5 },
  { name: "Shuyue Zhu", group: 5 },
  { name: "Qifeng Song", group: 5 },
  { name: "Shuo Liu", group: 5 },
  { name: "Jiawen Zhang", group: 5 },
  { name: "Yang Liu", group: 6 },
  { name: "Keyee Siah", group: 6 },
  { name: "Guowen Ma", group: 6 },
  { name: "Tzy Woei Yap", group: 6 },
  { name: "Siang Ang Tay", group: 6 },
  { name: "Hou Haang Wong", group: 6 },
  { name: "Jody Wong", group: 6 },
  { name: "Yuzhu Chen", group: 7 },
  { name: "Tingya Xiao", group: 7 },
  { name: "Junwei Wang", group: 7 },
  { name: "Wen Tong", group: 7 },
  { name: "Qihang Chen", group: 7 },
  { name: "Zhuo Jiao", group: 7 },
  { name: "Yi Yang", group: 7 },
  { name: "Xiaoyi Liu", group: 7 },
  { name: "Rochele Ng", group: 8 },
  { name: "Sheryl Choong", group: 8 },
  { name: "Juliet Sam", group: 8 },
  { name: "Karys Lam", group: 9 },
  { name: "John Yan", group: 9 },
  { name: "Jia Qi Law", group: 9 },
  { name: "Chester", group: 9 },
  { name: "Jianhui Wang", group: 10 },
  { name: "Juan Du", group: 10 },
  { name: "Lanxiang Wang", group: 10 },
  { name: "Juan Wang", group: 10 },
  { name: "Andy He", group: 10 },
  { name: "Qian Cheng", group: 10 },
  { name: "Shaomei An", group: 10 },
  { name: "Zi Wang", group: 10 },
  { name: "Xueshan Lin", group: 10 },
  { name: "Xian Ge", group: 10 }
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
if (req.method !== 'POST' && req.method !== 'GET') {
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
