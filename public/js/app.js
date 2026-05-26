// ============================================
// GLOBAL VARIABLES
// ============================================

let state = {
    currentPage: 'landing',
    currentCard: null,
    currentPlayer: null,
    selectedCell: null,
    adminTab: 'guests',
    selectedGuestName: null,
    leaderboardUpdateInterval: null,
    serverPollingInterval: null
};
// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    showLanding();
    startServerPolling();
    
    // Close modal on overlay click
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) {
            hideModal();
        }
    });
    
    // Close guest names list when clicking outside
    document.addEventListener('click', (e) => {
        const guestNamesList = document.getElementById('guest-names-list');
        const nameSearchInput = document.getElementById('name-search-input');
        
        if (guestNamesList && !guestNamesList.contains(e.target) && e.target !== nameSearchInput) {
            guestNamesList.classList.add('hidden');
        }
    });
});

async function initializeData() {
    try {
        // 尝试从服务器获取数据
        const response = await fetch('/api/game-data');
        
        if (response.ok) {
            const data = await response.json();
            
            // 更新本地存储
            localStorage.setItem('bingo_prompts', JSON.stringify(data.prompts || []));
            localStorage.setItem('bingo_guests', JSON.stringify(data.guests || []));
            localStorage.setItem('bingo_players', JSON.stringify(data.players || {}));
            localStorage.setItem('bingo_scores', JSON.stringify(data.scores || {}));
            localStorage.setItem('bingo_cards', JSON.stringify(data.cards || {}));
            localStorage.setItem('bingo_settings', JSON.stringify(data.settings || {
                bingoLineScore: 100,
                socialBonusScore: 20,
                firstBingoBonus: 20,
                fullCardBonus: 500,
                fullCardBonusEnabled: true,
                siteTitle: "Wedding Bingo"
            }));
        } else {
            console.error('Failed to fetch game data from server');
            // 如果服务器请求失败，使用本地存储的数据
            if (!localStorage.getItem('bingo_prompts')) {
                // 如果本地存储也没有数据，显示错误信息
                showToast('无法加载游戏数据，请刷新页面重试', 'error');
            }
        }
    } catch (error) {
        console.error('Error initializing data:', error);
        showToast('加载数据时出错，请刷新页面重试', 'error');
    }
}

// ============================================
// SERVER POLLING
// ============================================

function startServerPolling() {
    // 立即执行一次
    pollServerForUpdates();
    
    // 设置轮询间隔（每3秒）
    state.serverPollingInterval = setInterval(pollServerForUpdates, 3000);
}

function stopServerPolling() {
    if (state.serverPollingInterval) {
        clearInterval(state.serverPollingInterval);
        state.serverPollingInterval = null;
    }
}

async function pollServerForUpdates() {
    try {
        const response = await fetch('/api/game-data');
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        
        // 更新本地存储
        localStorage.setItem('bingo_players', JSON.stringify(data.players || {}));
        localStorage.setItem('bingo_scores', JSON.stringify(data.scores || {}));
        localStorage.setItem('bingo_cards', JSON.stringify(data.cards || {}));
        
        // 更新UI
        updateLeaderboardIfVisible();
        if (state.currentCard) {
            updateBingoCardDisplay();
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

async function syncDataToServer(type, data) {
    try {
        const response = await fetch('/api/update-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: type,
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to sync data');
        }
        
        // 同步成功后立即获取最新数据
        await pollServerForUpdates();
    } catch (error) {
        console.error('Sync error:', error);
        showToast('数据同步失败，请检查网络连接', 'error');
    }
}

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

function getPrompts() {
    return JSON.parse(localStorage.getItem('bingo_prompts')) || [];
}

function getGuests() {
    return JSON.parse(localStorage.getItem('bingo_guests')) || [];
}

function getCards() {
    return JSON.parse(localStorage.getItem('bingo_cards')) || {};
}

function getPlayers() {
    return JSON.parse(localStorage.getItem('bingo_players')) || {};
}

function getSettings() {
    return JSON.parse(localStorage.getItem('bingo_settings')) || {
        bingoLineScore: 100,
        socialBonusScore: 20,
        firstBingoBonus: 20,
        fullCardBonus: 500,
        fullCardBonusEnabled: true,
        siteTitle: "Wedding Bingo"
    };
}

// 统一计算总分的函数
function calculateTotalScore(scoreData) {
    const settings = getSettings();
    
    // 基础分
    let total = 0;
    
    // Bingo 连线分 = 连线数 * 单线分数
    total += (scoreData.bingoCount || 0) * (settings.bingoLineScore || 100);
    
    // 社交奖励分 = 奖励次数 * 单次奖励分
    // 注意：我们将字段改为 socialBonusCount (次数)，方便后台管理
    total += (scoreData.socialBonusCount || 0) * (settings.socialBonusScore || 20);
    
    // 首次 Bingo 奖励
    total += (scoreData.firstBingoBonus || 0);

     // 4. 新增：首格奖励
    total += (scoreData.firstCellBonus || 0);
   
    // 4. 全卡奖励
    if (settings.fullCardBonusEnabled && scoreData.completedCells === 24) {
        total += (settings.fullCardBonus || 500);
    }
    
    return total;
}


function getScores() {
    return JSON.parse(localStorage.getItem('bingo_scores')) || {};
}

function savePrompts(prompts) {
    localStorage.setItem('bingo_prompts', JSON.stringify(prompts));
    syncDataToServer('prompts', prompts);
}

function saveGuests(guests) {
    localStorage.setItem('bingo_guests', JSON.stringify(guests));
    syncDataToServer('guests', guests);
}

function saveCards(cards) {
    localStorage.setItem('bingo_cards', JSON.stringify(cards));
    syncDataToServer('cards', cards);
}

function savePlayers(players) {
    localStorage.setItem('bingo_players', JSON.stringify(players));
    syncDataToServer('players', players);
}

function saveSettings(settings) {
    localStorage.setItem('bingo_settings', JSON.stringify(settings));
    syncDataToServer('settings', settings);
}

function saveScores(scores) {
    localStorage.setItem('bingo_scores', JSON.stringify(scores));
    syncDataToServer('scores', scores);
    updateLeaderboardIfVisible();
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('#app main > div').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show selected page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.remove('hidden');
        page.classList.add('fade-in');
    }
    
    state.currentPage = pageId;
    
    // Start or stop leaderboard update interval based on current page
    if (pageId === 'leaderboard') {
        startLeaderboardUpdateInterval();
    } else {
        stopLeaderboardUpdateInterval();
    }
}

function showLanding() {
    showPage('landing');
}

function showRegistration(cardNumber) {
    document.getElementById('display-card-number').textContent = cardNumber;
    document.getElementById('name-search-input').value = '';
    document.getElementById('selected-guest-name').value = '';
    document.getElementById('nickname-input').value = '';
    document.getElementById('guest-names-list').classList.add('hidden');
    showPage('registration');
}

function showBingoCard() {
    updateBingoCardDisplay();
    showPage('bingo');
}

function showVerifyPage() {
    showPage('verify');
    document.getElementById('verify-card-input').value = '';
    document.getElementById('verify-card-preview').classList.add('hidden');
}

function hideVerifyPage() {
    if (state.currentCard) {
        showBingoCard();
    } else {
        showLanding();
    }
}

function showLeaderboard() {
    updateLeaderboard();
    showPage('leaderboard');
}

function hideLeaderboard() {
    if (state.currentCard) {
        showBingoCard();
    } else {
        showLanding();
    }
}

function showAdminLogin() {
    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blush-300 to-sage-300 flex items-center justify-center">
                <i class="fas fa-lock text-white text-2xl"></i>
            </div>
            <h3 class="font-display text-xl font-bold text-blush-700">Admin Access</h3>
            <p class="text-sm text-sage-600">管理后台访问</p>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Password 密码</label>
                <input type="password" id="admin-password" placeholder="请输入管理密码" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none"
                    onkeypress="if(event.key === 'Enter') verifyAdminPassword()">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="verifyAdminPassword()" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Confirm 确认
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function verifyAdminPassword() {
    const password = document.getElementById('admin-password').value;
    if (password === 'WANG') {
        hideModal();
        showAdminPage();
    } else {
        showToast('Incorrect password 密码错误', 'error');
    }
}

function showAdminPage() {
    switchAdminTab('guests');
    showPage('admin');
}

function hideAdminPage() {
    if (state.currentCard) {
        showBingoCard();
    } else {
        showLanding();
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-sage-500' : type === 'error' ? 'bg-blush-500' : 'bg-beige-500';
    
    toast.className = `toast ${bgColor} text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// LANDING PAGE FUNCTIONS
// ============================================

function submitCardNumber() {
    const cardInput = document.getElementById('card-input');
    const cardNumber = cardInput.value.trim().toUpperCase();
    
    if (!cardNumber) {
        showToast('Please enter a card number 请输入卡号', 'error');
        return;
    }
    
    const cards = getCards();
    if (!cards[cardNumber]) {
        showToast('Invalid card number 无效卡号', 'error');
        return;
    }
    
    // Check if card is already registered
    const players = getPlayers();
    if (players[cardNumber]) {
        // Card already registered, load player
        state.currentCard = cardNumber;
        state.currentPlayer = players[cardNumber];
        showBingoCard();
    } else {
        // New registration
        state.currentCard = cardNumber;
        showRegistration(cardNumber);
    }
}

// ============================================
// REGISTRATION FUNCTIONS
// ============================================

function searchGuestNames(query) {
    const guests = getGuests();
    const container = document.getElementById('guest-names-list');
    container.innerHTML = '';
    
    // Filter guests based on query
    const filtered = query ? 
        guests.filter(g => g.name.toLowerCase().includes(query.toLowerCase())) : 
        guests;
    
    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="p-3 text-center text-sage-600">
                No guests found 未找到宾客
            </div>
        `;
    } else {
        filtered.forEach(guest => {
            const guestDiv = document.createElement('div');
            guestDiv.className = 'p-3 cursor-pointer hover:bg-white/40 transition-all';
            guestDiv.innerHTML = `
                <p class="font-medium text-gray-700">${guest.name}</p>
                <p class="text-xs text-sage-600">Group ${guest.group}</p>
            `;
            guestDiv.onclick = () => selectGuestName(guest.name);
            container.appendChild(guestDiv);
        });
    }
    
    container.classList.remove('hidden');
}

function selectGuestName(name) {
    document.getElementById('name-search-input').value = name;
    document.getElementById('selected-guest-name').value = name;
    document.getElementById('guest-names-list').classList.add('hidden');
}

function submitRegistration() {
    const name = document.getElementById('selected-guest-name').value;
    const nicknameInput = document.getElementById('nickname-input');
    
    const nickname = nicknameInput.value.trim() || name;
    
    if (!name) {
        showToast('Please select your name 请选择您的姓名', 'error');
        return;
    }
    
    // Create player
    const player = {
        name: name,
        nickname: nickname,
        cardNumber: state.currentCard,
        group: findGuestGroup(name)
    };
    
    // Save player
    const players = getPlayers();
    players[state.currentCard] = player;
    savePlayers(players);
    
    // Initialize score
    const scores = getScores();
    scores[state.currentCard] = {
        totalScore: 0,
        bingoCount: 0,
        socialBonus: 0,
        firstBingoBonus: 0,
        completedCells: 0
    };
    saveScores(scores);
    
    state.currentPlayer = player;
    
    showToast('Registration successful 注册成功！', 'success');
    showBingoCard();
}

function findGuestGroup(name) {
    const guests = getGuests();
    const guest = guests.find(g => g.name.toLowerCase() === name.toLowerCase());
    return guest ? guest.group : 0;
}

// Continue in next message due to length...

// ============================================
// BINGO CARD DISPLAY FUNCTIONS
// ============================================

function updateBingoCardDisplay() {
    if (!state.currentCard || !state.currentPlayer) return;
    
    const cards = getCards();
    const card = cards[state.currentCard];
    const scores = getScores();
    const score = scores[state.currentCard] || { totalScore: 0 };
    
    // Update player info
    document.getElementById('player-name-display').textContent = state.currentPlayer.nickname || state.currentPlayer.name;
    document.getElementById('player-score-display').textContent = score.totalScore;
    document.getElementById('bingo-card-number').textContent = state.currentCard;
    
    // Generate grid
    const gridContainer = document.getElementById('bingo-grid');
    gridContainer.innerHTML = '';
    
    let completedCount = 0;
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = card.grid[row][col];
            const cellDiv = document.createElement('div');
            
            if (cell.completed) completedCount++;
            
            const isBingoLine = card.bingoLines.some(line => 
                line.some(pos => pos[0] === row && pos[1] === col)
            );
            
            cellDiv.className = `bingo-cell aspect-square rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                cell.completed ? 'completed' : 'glass hover:bg-white/40'
            } ${isBingoLine ? 'bingo-line' : ''}`;
            
            if (cell.isFree) {
                cellDiv.innerHTML = `
                    <div class="font-bold text-blush-600 text-xs">FREE</div>
                    <div class="text-xs text-sage-600">免费</div>
                `;
            } else {
                cellDiv.innerHTML = `
                    <div class="text-xs font-medium text-gray-700 leading-tight mb-1">${cell.prompt_cn}</div>
                    <div class="text-xs text-sage-500 leading-tight">${cell.prompt}</div>
                    ${cell.completed ? '<i class="fas fa-check text-blush-500 mt-1"></i>' : ''}
                `;
            }
            
            cellDiv.onclick = () => showCellDetails(row, col);
            gridContainer.appendChild(cellDiv);
        }
    }
    
    document.getElementById('completed-count').textContent = completedCount;
}

function showCellDetails(row, col) {
    const cards = getCards();
    const card = cards[state.currentCard];
    const cell = card.grid[row][col];
    
    if (cell.isFree) {
        showToast('This is a FREE space! 这是免费格子！', 'info');
        return;
    }
    
    if (cell.completed) {
        showToast('Already completed! 已完成！', 'info');
        return;
    }
    
    // Show prompt details
    const modalContent = `
        <div class="text-center mb-4">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blush-300 to-sage-300 flex items-center justify-center">
                <i class="fas fa-question text-white text-xl"></i>
            </div>
            <h3 class="font-display text-lg font-bold text-blush-700 mb-2">Bingo Prompt 题目</h3>
        </div>
        <div class="glass rounded-2xl p-4 mb-4">
            <p class="text-gray-700 font-medium mb-2">${cell.prompt}</p>
            <p class="text-sage-600">${cell.prompt_cn}</p>
        </div>
        <div class="text-sm text-sage-600 mb-4">
            <p><i class="fas fa-info-circle mr-1"></i> Find someone who matches this description and ask them to sign your Bingo card!</p>
            <p class="mt-1">找到符合描述的人，请他/她在Bingo卡上签字。</p>
        </div>
        <button onclick="hideModal()" class="w-full glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
            Close 关闭
        </button>
    `;
    
    showModal(modalContent);
}

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

function loadVerifyCard() {
    const cardInput = document.getElementById('verify-card-input');
    const cardNumber = cardInput.value.trim().toUpperCase();
    
    if (!cardNumber) {
        showToast('Please enter a card number 请输入卡号', 'error');
        return;
    }
    
    const cards = getCards();
    if (!cards[cardNumber]) {
        showToast('Invalid card number 无效卡号', 'error');
        return;
    }
    
    const players = getPlayers();
    if (!players[cardNumber]) {
        showToast('Card not registered yet 卡片尚未注册', 'error');
        return;
    }
    
    state.selectedCard = cardNumber;
    state.selectedCell = null;
    
    // Show card preview
    document.getElementById('verify-card-preview').classList.remove('hidden');
    document.getElementById('verify-player-name').textContent = players[cardNumber].nickname || players[cardNumber].name;
    
    // Generate verify grid
    updateVerifyGrid();
    
    // Load guest list
    searchGuests('');
}

function updateVerifyGrid() {
    const cards = getCards();
    const card = cards[state.selectedCard];
    const gridContainer = document.getElementById('verify-grid');
    gridContainer.innerHTML = '';
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = card.grid[row][col];
            const cellDiv = document.createElement('div');
            
            const isSelected = state.selectedCell && state.selectedCell[0] === row && state.selectedCell[1] === col;
            
            cellDiv.className = `aspect-square rounded-lg p-1 flex items-center justify-center text-center cursor-pointer text-xs transition-all ${
                cell.completed ? 'bg-blush-200 text-blush-700' : 
                isSelected ? 'bg-sage-300 text-white' : 'glass hover:bg-white/40'
            }`;
            
            if (cell.isFree) {
                cellDiv.innerHTML = '<span class="font-bold">FREE</span>';
            } else {
                cellDiv.innerHTML = cell.completed ? 
                    '<i class="fas fa-check"></i>' : 
                    `<span class="leading-tight">${row * 5 + col + 1}</span>`;
            }
            
            if (!cell.completed && !cell.isFree) {
                cellDiv.onclick = () => selectVerifyCell(row, col);
            }
            
            gridContainer.appendChild(cellDiv);
        }
    }
}
function selectVerifyCell(row, col) {
    state.selectedCell = [row, col];
    updateVerifyGrid();
    
    const cards = getCards();
    const card = cards[state.selectedCard];
    const cell = card.grid[row][col];
    
    showToast(`Selected: ${cell.prompt_cn}`, 'info');
}

function searchGuests(query) {
    const guests = getGuests();
    const container = document.getElementById('guest-list');
    container.innerHTML = '';
    
    const filtered = query ? 
        guests.filter(g => g.name.toLowerCase().includes(query.toLowerCase())) : 
        guests;
    
    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    filtered.forEach(guest => {
        const guestDiv = document.createElement('div');
        guestDiv.className = 'glass rounded-xl p-3 cursor-pointer hover:bg-white/40 transition-all';
        guestDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-700">${guest.name}</p>
                    <p class="text-xs text-sage-600">Group ${guest.group}</p>
                </div>
                <button onclick="verifyGuest('${guest.name}')" class="btn-primary px-3 py-1 rounded-lg text-white text-sm">
                    Verify
                </button>
            </div>
        `;
        container.appendChild(guestDiv);
    });
}

function verifyGuest(guestName) {
    if (!state.selectedCell) {
        showToast('Please select a cell first 请先选择一个格子', 'error');
        return;
    }
    
    const [row, col] = state.selectedCell;
    const cards = getCards();
    const card = cards[state.selectedCard];
    const cell = card.grid[row][col];
    
    // Check if answer is correct
    const isCorrect = cell.answers.some(answer => 
        answer.toLowerCase() === guestName.toLowerCase()
    );
    
    if (isCorrect) {
        // Mark cell as completed
        cell.completed = true;
        cell.verifiedBy = guestName;
        saveCards(cards);
        
        const players = getPlayers();
        const player = players[state.selectedCard];
        const guests = getGuests();
        const guest = guests.find(g => g.name === guestName);
        const settings = getSettings();
        
        // 获取分数对象
        let scores = getScores();
        
        // 确保分数对象存在
        if (!scores[state.selectedCard]) {
            scores[state.selectedCard] = {
                bingoCount: 0,
                socialBonusCount: 0,
                firstBingoBonus: 0,
                firstCellBonus: 0, // 新增字段
                completedCells: 0,
                totalScore: 0
            };
        }
        
        const score = scores[state.selectedCard];
        score.completedCells = score.completedCells || 0;
        score.socialBonusCount = score.socialBonusCount || 0;
        score.bingoCount = score.bingoCount || 0;
        score.firstCellBonus = score.firstCellBonus || 0;
        score.firstBingoBonus = score.firstBingoBonus || 0; // 确保初始化
        
        // ============================================
        // 1. 新增：首格奖励判定 (在 completedCells 增加之前判定)
        // ============================================
        if (score.completedCells === 0) {
            score.firstCellBonus = settings.firstCellBonus || 0;
            showToast(`First Cell Bonus +${score.firstCellBonus}! 首格奖励!`, 'success');
        }
        
        // 检查社交奖励
        if (guest && player.group !== guest.group) {
            score.socialBonusCount++;
            showToast(`Correct! Social Bonus +1 正确！跨圈互动奖励 +1`, 'success');
        } else {
            // 如果不是首格，也不跨圈，只提示正确
            if (score.completedCells !== 0) {
                showToast('Correct! 正确！', 'success');
            }
        }
        
        score.completedCells++;
        
        // Check for Bingo
        const bingoResult = checkBingo(card);
        if (bingoResult.newBingos.length > 0) {
            
            // 增加连线次数
            bingoResult.newBingos.forEach(() => {
                score.bingoCount++;
            });
            
            // First Bingo bonus - 关键修改
            // 只有当 card.firstBingo 为 false 且这是第一次检测到 Bingo 时才添加
            if (!card.firstBingo) {
                card.firstBingo = true;
                score.firstBingoBonus = settings.firstBingoBonus; // 记录首次奖励分
                showToast(`BINGO! First Bingo Bonus +${settings.firstBingoBonus}!`, 'success');
                triggerConfetti();
            } else {
                showToast(`BINGO!`, 'success');
                triggerConfetti();
            }
            saveCards(cards);
        }
        // 全卡奖励提示
        if (settings.fullCardBonusEnabled && score.completedCells === 24) {
            showToast(`FULL CARD! +${settings.fullCardBonus} 完成全卡！`, 'success');
            triggerConfetti();
        }
        // ============================================
        // 关键修改：统一重新计算总分
        // ============================================
        score.totalScore = calculateTotalScore(score);
        
        // 保存并同步
        saveScores(scores);
        
        // 更新显示
        updateVerifyGrid();
        if (state.currentCard === state.selectedCard) {
            updateBingoCardDisplay();
        }
    } else {
        showToast('Incorrect answer 答案错误', 'error');
    }
}


// ============================================
// BINGO CHECK FUNCTIONS
// ============================================

function checkBingo(card) {
    const grid = card.grid;
    const existingBingos = card.bingoLines || [];
    const newBingos = [];
    
    // Check rows
    for (let row = 0; row < 5; row++) {
        const line = [];
        let isBingo = true;
        for (let col = 0; col < 5; col++) {
            if (!grid[row][col].completed) {
                isBingo = false;
                break;
            }
            line.push([row, col]);
        }
        if (isBingo && !isLineInBingos(line, existingBingos)) {
            newBingos.push(line);
            existingBingos.push(line);
        }
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
        const line = [];
        let isBingo = true;
        for (let row = 0; row < 5; row++) {
            if (!grid[row][col].completed) {
                isBingo = false;
                break;
            }
            line.push([row, col]);
        }
        if (isBingo && !isLineInBingos(line, existingBingos)) {
            newBingos.push(line);
            existingBingos.push(line);
        }
    }
    
    // Check diagonals
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < 5; i++) {
        diag1.push([i, i]);
        diag2.push([i, 4 - i]);
    }
    
    let isDiag1Bingo = true;
    let isDiag2Bingo = true;
    
    for (let i = 0; i < 5; i++) {
        if (!grid[i][i].completed) isDiag1Bingo = false;
        if (!grid[i][4 - i].completed) isDiag2Bingo = false;
    }
    
    if (isDiag1Bingo && !isLineInBingos(diag1, existingBingos)) {
        newBingos.push(diag1);
        existingBingos.push(diag1);
    }
    
    if (isDiag2Bingo && !isLineInBingos(diag2, existingBingos)) {
        newBingos.push(diag2);
        existingBingos.push(diag2);
    }
    
    card.bingoLines = existingBingos;
    
    return { newBingos, existingBingos };
}

function isLineInBingos(line, bingos) {
    return bingos.some(bingo => 
        bingo.length === line.length && 
        bingo.every((pos, idx) => pos[0] === line[idx][0] && pos[1] === line[idx][1])
    );
}

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

function updateLeaderboard() {
    const players = getPlayers();
    const scores = getScores();
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '';
    
    // Create leaderboard data
    const leaderboard = Object.keys(players).map(cardNumber => {
        const player = players[cardNumber];
        const score = scores[cardNumber] || {
            totalScore: 0,
            bingoCount: 0,
            socialBonus: 0,
            firstBingoBonus: 0,
            completedCells: 0
        };
        
        return {
            name: player.nickname || player.name,
            ...score
        };
    });
    
    // Sort by total score
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    if (leaderboard.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-trophy text-4xl text-sage-300 mb-3"></i>
                <p class="text-sage-600">No players yet 还没有玩家</p>
            </div>
        `;
        return;
    }
    
    leaderboard.forEach((player, index) => {
        const itemDiv = document.createElement('div');
        const isTopThree = index < 3;
        
        itemDiv.className = `leaderboard-item glass rounded-2xl p-4 ${isTopThree ? 'border-2 border-blush-300' : ''}`;
        
        const medalIcon = index === 0 ? 'fa-crown text-yellow-500' : 
                         index === 1 ? 'fa-medal text-gray-400' : 
                         index === 2 ? 'fa-medal text-amber-600' : '';
        
        itemDiv.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-100' : 
                    index === 1 ? 'bg-gray-100' : 
                    index === 2 ? 'bg-amber-100' : 'bg-sage-100'
                }">
                    ${index < 3 ? `<i class="fas ${medalIcon} text-lg"></i>` : `<span class="font-bold text-sage-600">${index + 1}</span>`}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-700 truncate">${player.name}</p>
                    <div class="flex items-center gap-3 text-xs text-sage-600">
                        <span><i class="fas fa-check-circle mr-1"></i>${player.completedCells}/25</span>
                        <span><i class="fas fa-star mr-1"></i>${player.bingoCount} Bingo</span>
                        <span><i class="fas fa-users mr-1"></i>${player.socialBonus} 社交分</span>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-xl text-blush-600">${player.totalScore}</p>
                    <p class="text-xs text-sage-600">总分</p>
                </div>
            </div>
        `;
        
        container.appendChild(itemDiv);
    });
}

function updateLeaderboardIfVisible() {
    if (state.currentPage === 'leaderboard') {
        updateLeaderboard();
    }
}

function startLeaderboardUpdateInterval() {
    // Clear any existing interval
    stopLeaderboardUpdateInterval();
    
    // Set up a new interval to update the leaderboard every 5 seconds
    state.leaderboardUpdateInterval = setInterval(() => {
        updateLeaderboard();
    }, 5000);
}

function stopLeaderboardUpdateInterval() {
    if (state.leaderboardUpdateInterval) {
        clearInterval(state.leaderboardUpdateInterval);
        state.leaderboardUpdateInterval = null;
    }
}

// ============================================
// CONFETTI ANIMATION
// ============================================

function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FFB6C1', '#98FB98', '#FFE4B5', '#DDA0DD', '#87CEEB'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

function switchAdminTab(tab) {
    state.adminTab = tab;
    
    // Update tab styles
    document.querySelectorAll('.admin-tab').forEach(tabBtn => {
        if (tabBtn.dataset.tab === tab) {
            tabBtn.classList.add('tab-active');
        } else {
            tabBtn.classList.remove('tab-active');
        }
    });
    
    // Load tab content
    const content = document.getElementById('admin-content');
    
    switch (tab) {
        case 'guests':
            renderGuestsTab(content);
            break;
        case 'prompts':
            renderPromptsTab(content);
            break;
        case 'cards':
            renderCardsTab(content);
            break;
        case 'settings':
            renderSettingsTab(content);
            break;
        case 'export':
            renderExportTab(content);
            break;
    }
}

function renderGuestsTab(container) {
    const guests = getGuests();
    const players = getPlayers();
    const scores = getScores();
    
    container.innerHTML = `
        <div class="mb-4">
            <button onclick="showAddGuestModal()" class="btn-primary px-4 py-2 rounded-xl text-white font-medium">
                <i class="fas fa-plus mr-2"></i>Add Guest 添加宾客
            </button>
        </div>
        <div class="glass rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-white/30">
                        <tr>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-sage-700">Name 姓名</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-sage-700">Group 组别</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-sage-700">Card 卡号</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-sage-700">Score 积分</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-sage-700">Actions 操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/30">
                        ${guests.map((guest, index) => {
                            const playerCard = Object.keys(players).find(card => 
                                players[card].name.toLowerCase() === guest.name.toLowerCase()
                            );
                            
                            const playerScore = playerCard ? (scores[playerCard] ? scores[playerCard].totalScore : 0) : 0;
                            
                            return `
                                <tr class="hover:bg-white/20 transition-all">
                                    <td class="px-4 py-3 text-sm text-gray-700">${guest.name}</td>
                                    <td class="px-4 py-3 text-sm text-gray-700">${guest.group}</td>
                                    <td class="px-4 py-3 text-sm text-gray-700">
                                        ${playerCard ? 
                                            `<span class="glass px-2 py-1 rounded-lg text-xs text-blush-700">${playerCard}</span>` : 
                                            `<button onclick="showAssignCardModal('${guest.name}')" class="text-xs text-sage-600 hover:text-sage-800 underline">
                                                Assign Card 分配卡号
                                            </button>`
                                        }
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-700">
                                        ${playerCard ? 
                                            `<span class="font-medium text-blush-700">${playerScore}</span>
                                            <button onclick="showEditScoreModal('${playerCard}')" class="ml-2 text-xs text-sage-600 hover:text-sage-800">
                                                <i class="fas fa-edit"></i>
                                            </button>` : 
                                            `<span class="text-gray-400">-</span>`
                                        }
                                    </td>
                                    <td class="px-4 py-3 text-right">
                                        <button onclick="editGuest(${index})" class="text-sage-600 hover:text-sage-800 mr-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteGuest(${index})" class="text-blush-600 hover:text-blush-800">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 继续在下一部分...
// ============================================
// ADMIN FUNCTIONS (CONTINUED)
// ============================================

function showAddGuestModal() {
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Add Guest 添加宾客</h3>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Name 姓名</label>
                <input type="text" id="new-guest-name" placeholder="Guest name" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Group 组别</label>
                <input type="number" id="new-guest-group" placeholder="Group number" min="1" max="10"
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="addGuest()" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Add 添加
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function addGuest() {
    const name = document.getElementById('new-guest-name').value.trim();
    const group = parseInt(document.getElementById('new-guest-group').value);
    
    if (!name || !group) {
        showToast('Please fill all fields 请填写所有字段', 'error');
        return;
    }
    
    const guests = getGuests();
    guests.push({ name, group });
    saveGuests(guests);
    
    hideModal();
    showToast('Guest added 宾客已添加', 'success');
    switchAdminTab('guests');
}

function editGuest(index) {
    const guests = getGuests();
    const guest = guests[index];
    
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Edit Guest 编辑宾客</h3>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Name 姓名</label>
                <input type="text" id="edit-guest-name" value="${guest.name}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Group 组别</label>
                <input type="number" id="edit-guest-group" value="${guest.group}" min="1" max="10"
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="saveGuestEdit(${index})" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Save 保存
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function saveGuestEdit(index) {
    const name = document.getElementById('edit-guest-name').value.trim();
    const group = parseInt(document.getElementById('edit-guest-group').value);
    
    if (!name || !group) {
        showToast('Please fill all fields 请填写所有字段', 'error');
        return;
    }
    
    const guests = getGuests();
    guests[index] = { name, group };
    saveGuests(guests);
    
    hideModal();
    showToast('Guest updated 宾客已更新', 'success');
    switchAdminTab('guests');
}

function deleteGuest(index) {
    if (!confirm('Are you sure you want to delete this guest? 确定要删除这位宾客吗？')) {
        return;
    }
    
    const guests = getGuests();
    guests.splice(index, 1);
    saveGuests(guests);
    
    showToast('Guest deleted 宾客已删除', 'success');
    switchAdminTab('guests');
}

function showAssignCardModal(guestName) {
    const cards = getCards();
    const players = getPlayers();
    const guests = getGuests();
    const guest = guests.find(g => g.name === guestName);
    
    // Get available cards (not assigned to any player)
    const availableCards = Object.keys(cards).filter(cardId => !players[cardId]);
    
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Assign Card 分配卡号</h3>
            <p class="text-sm text-sage-600 mt-1">为 ${guestName} 分配卡号</p>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Select Card 选择卡号</label>
                <select id="assign-card-select" class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                    <option value="">-- Select Card 选择卡号 --</option>
                    ${availableCards.sort().map(cardId => `
                        <option value="${cardId}">${cardId}</option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Nickname 昵称 (可选)</label>
                <input type="text" id="assign-nickname" placeholder="排行榜显示的昵称" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="assignCardToGuest('${guestName}')" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Assign 分配
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function assignCardToGuest(guestName) {
    const cardId = document.getElementById('assign-card-select').value;
    const nickname = document.getElementById('assign-nickname').value.trim() || guestName;
    
    if (!cardId) {
        showToast('Please select a card 请选择卡号', 'error');
        return;
    }
    
    const guests = getGuests();
    const guest = guests.find(g => g.name === guestName);
    
    if (!guest) {
        showToast('Guest not found 未找到宾客', 'error');
        return;
    }
    
    // Create player
    const player = {
        name: guestName,
        nickname: nickname,
        cardNumber: cardId,
        group: guest.group
    };
    
    // Save player
    const players = getPlayers();
    
    // Check if this card was previously assigned to another player
    let previousPlayerName = null;
    if (players[cardId]) {
        previousPlayerName = players[cardId].name;
    }
    
    players[cardId] = player;
    savePlayers(players);
    
    // Reset card verification results
    const cards = getCards();
    if (cards[cardId]) {
        // Reset all cells to not completed
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!cards[cardId].grid[row][col].isFree) {
                    cards[cardId].grid[row][col].completed = false;
                    cards[cardId].grid[row][col].verifiedBy = null;
                }
            }
        }
        
        // Reset bingo lines
        cards[cardId].bingoLines = [];
        cards[cardId].firstBingo = false;
        
        saveCards(cards);
    }
    
    // Initialize score
    const scores = getScores();
    scores[cardId] = {
        totalScore: 0,
        bingoCount: 0,
        socialBonus: 0,
        firstBingoBonus: 0,
        completedCells: 0
    };
    saveScores(scores);
    
    // Update leaderboard immediately
    updateLeaderboard();
    
    hideModal();
    
    if (previousPlayerName) {
        showToast(`Card ${cardId} reassigned from ${previousPlayerName} to ${guestName}. All progress has been reset. 卡号 ${cardId} 已从 ${previousPlayerName} 重新分配给 ${guestName}，所有进度已重置`, 'success');
    } else {
        showToast(`Card ${cardId} assigned to ${guestName} 卡号 ${cardId} 已分配给 ${guestName}`, 'success');
    }
    
    switchAdminTab('guests');
}

function renderPromptsTab(container) {
    const prompts = getPrompts();
    
    container.innerHTML = `
        <div class="mb-4">
            <button onclick="showAddPromptModal()" class="btn-primary px-4 py-2 rounded-xl text-white font-medium">
                <i class="fas fa-plus mr-2"></i>Add Prompt 添加题目
            </button>
        </div>
        <div class="space-y-3 max-h-96 overflow-y-auto">
            ${prompts.map((prompt, index) => `
                <div class="glass rounded-2xl p-4">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex-1">
                            <p class="font-medium text-gray-700">${prompt.prompt}</p>
                            <p class="text-sm text-sage-600">${prompt.prompt_cn}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editPrompt(${index})" class="text-sage-600 hover:text-sage-800">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deletePrompt(${index})" class="text-blush-600 hover:text-blush-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${prompt.answers.map(answer => `
                            <span class="glass px-2 py-1 rounded-lg text-xs text-sage-700">${answer}</span>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddPromptModal() {
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Add Prompt 添加题目</h3>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Prompt (English)</label>
                <input type="text" id="new-prompt-en" placeholder="English prompt" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Prompt (Chinese)</label>
                <input type="text" id="new-prompt-cn" placeholder="中文题目" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Answers (comma separated)</label>
                <input type="text" id="new-prompt-answers" placeholder="Name1, Name2, Name3" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="addPrompt()" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Add 添加
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function addPrompt() {
    const promptEn = document.getElementById('new-prompt-en').value.trim();
    const promptCn = document.getElementById('new-prompt-cn').value.trim();
    const answersStr = document.getElementById('new-prompt-answers').value.trim();
    
    if (!promptEn || !promptCn || !answersStr) {
        showToast('Please fill all fields 请填写所有字段', 'error');
        return;
    }
    
    const answers = answersStr.split(',').map(a => a.trim()).filter(a => a);
    
    const prompts = getPrompts();
    prompts.push({
        id: prompts.length + 1,
        prompt: promptEn,
        prompt_cn: promptCn,
        answers: answers
    });
    savePrompts(prompts);
    
    hideModal();
    showToast('Prompt added 题目已添加', 'success');
    switchAdminTab('prompts');
}

function editPrompt(index) {
    const prompts = getPrompts();
    const prompt = prompts[index];
    
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Edit Prompt 编辑题目</h3>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Prompt (English)</label>
                <input type="text" id="edit-prompt-en" value="${prompt.prompt}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Prompt (Chinese)</label>
                <input type="text" id="edit-prompt-cn" value="${prompt.prompt_cn}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Answers (comma separated)</label>
                <input type="text" id="edit-prompt-answers" value="${prompt.answers.join(', ')}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none">
            </div>
            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="savePromptEdit(${index})" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Save 保存
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function savePromptEdit(index) {
    const promptEn = document.getElementById('edit-prompt-en').value.trim();
    const promptCn = document.getElementById('edit-prompt-cn').value.trim();
    const answersStr = document.getElementById('edit-prompt-answers').value.trim();
    
    if (!promptEn || !promptCn || !answersStr) {
        showToast('Please fill all fields 请填写所有字段', 'error');
        return;
    }
    
    const answers = answersStr.split(',').map(a => a.trim()).filter(a => a);
    
    const prompts = getPrompts();
    prompts[index] = {
        ...prompts[index],
        prompt: promptEn,
        prompt_cn: promptCn,
        answers: answers
    };
    savePrompts(prompts);
    
    hideModal();
    showToast('Prompt updated 题目已更新', 'success');
    switchAdminTab('prompts');
}

function deletePrompt(index) {
    if (!confirm('Are you sure you want to delete this prompt? 确定要删除这个题目吗？')) {
        return;
    }
    
    const prompts = getPrompts();
    prompts.splice(index, 1);
    savePrompts(prompts);
    
    showToast('Prompt deleted 题目已删除', 'success');
    switchAdminTab('prompts');
}

function renderCardsTab(container) {
    const cards = getCards();
    const players = getPlayers();
    
    container.innerHTML = `
        <div class="mb-4">
            <button onclick="regenerateAllCards()" class="btn-secondary px-4 py-2 rounded-xl text-white font-medium">
                <i class="fas fa-sync-alt mr-2"></i>Regenerate All Cards 重新生成所有卡片
            </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            ${Object.keys(cards).sort().map(cardId => {
                const player = players[cardId];
                return `
                    <div class="glass rounded-xl p-3 text-center ${player ? 'border-2 border-sage-300' : ''}">
                        <p class="font-bold text-blush-700 mb-1">${cardId}</p>
                        ${player ? 
                            `<div>
                                <p class="text-xs text-sage-600 truncate">${player.nickname || player.name}</p>
                                <button onclick="unassignCard('${cardId}')" class="text-xs text-blush-500 hover:text-blush-700 mt-1">
                                    <i class="fas fa-unlink mr-1"></i>Unassign 解除绑定
                                </button>
                            </div>` : 
                            `<p class="text-xs text-gray-400">Not claimed</p>`
                        }
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function unassignCard(cardId) {
    if (!confirm(`Are you sure you want to unassign card ${cardId}? 确定要解除卡号 ${cardId} 的绑定吗？`)) {
        return;
    }
    
    const players = getPlayers();
    const scores = getScores();
    const cards = getCards();
    
    // Remove player and score
    delete players[cardId];
    delete scores[cardId];
    
    // Reset card verification results
    if (cards[cardId]) {
        // Reset all cells to not completed
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!cards[cardId].grid[row][col].isFree) {
                    cards[cardId].grid[row][col].completed = false;
                    cards[cardId].grid[row][col].verifiedBy = null;
                }
            }
        }
        
        // Reset bingo lines
        cards[cardId].bingoLines = [];
        cards[cardId].firstBingo = false;
    }
    
    savePlayers(players);
    saveScores(scores);
    saveCards(cards);
    
    // Update leaderboard immediately
    updateLeaderboard();
    
    showToast(`Card ${cardId} unassigned and reset 卡号 ${cardId} 已解除绑定并重置`, 'success');
    switchAdminTab('cards');
}

async function resetGame() {
    if (!confirm('This will DELETE ALL player data, scores, and progress. Are you sure? 这将删除所有玩家数据、积分和进度。确定要继续吗？')) {
        return;
    }

    try {
        showToast('Resetting game... 正在重置游戏...', 'info');
        
        // 1. 调用后端API重置数据
        const response = await fetch('/api/init-data', {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // 2. 清除本地存储
            localStorage.removeItem('bingo_players');
            localStorage.removeItem('bingo_scores');
            localStorage.removeItem('bingo_cards');
            
            // 3. 使用服务器返回的新数据更新本地存储
            localStorage.setItem('bingo_cards', JSON.stringify(data.gameData.cards));
            localStorage.setItem('bingo_prompts', JSON.stringify(data.gameData.prompts));
            localStorage.setItem('bingo_guests', JSON.stringify(data.gameData.guests));
            localStorage.setItem('bingo_settings', JSON.stringify(data.gameData.settings));
            
            // 4. 重置当前状态
            state.currentCard = null;
            state.currentPlayer = null;
            
            // 5. 刷新页面以确保界面完全重置
            showToast('Game reset successful! Refreshing... 游戏重置成功！正在刷新...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } else {
            throw new Error('Failed to reset game on server');
        }
    } catch (error) {
        console.error('Error resetting game:', error);
        showToast('Failed to reset game 重置游戏失败', 'error');
    }
}

function regenerateAllCards() {
    if (!confirm('This will regenerate all Bingo cards and remove all player assignments. Current progress will be lost. Continue? 这将重新生成所有Bingo卡片并移除所有玩家绑定，当前进度将丢失。继续吗？')) {
        return;
    }
    
    // Call API to reinitialize data
    fetch('/api/init-data', {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            showToast('All cards regenerated and player assignments removed 所有卡片已重新生成，玩家绑定已移除', 'success');
            // Refresh data from server
            pollServerForUpdates();
            switchAdminTab('cards');
        } else {
            throw new Error('Failed to regenerate cards');
        }
    })
    .catch(error => {
        console.error('Error regenerating cards:', error);
        showToast('Failed to regenerate cards 重新生成卡片失败', 'error');
    });
}

function renderSettingsTab(container) {
    const settings = getSettings();
    
    container.innerHTML = `
        <div class="glass rounded-2xl p-6">
            <h3 class="font-display text-lg font-bold text-blush-700 mb-4">Game Settings 游戏设置</h3>
            <div class="space-y-4">
                
                <div>
                    <label class="block text-sm font-medium text-sage-700 mb-2">First Cell Bonus 首格奖励</label>
                    <input type="number" id="setting-first-cell" value="${settings.firstCellBonus || 0}" 
                        class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-sage-700 mb-2">Bingo Line Score 连线积分</label>
                    <input type="number" id="setting-bingo-score" value="${settings.bingoLineScore}" 
                        class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-sage-700 mb-2">Social Bonus Score 跨圈奖励</label>
                    <input type="number" id="setting-social-score" value="${settings.socialBonusScore}" 
                        class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-sage-700 mb-2">First Bingo Bonus 首次连线奖励</label>
                    <input type="number" id="setting-first-bingo" value="${settings.firstBingoBonus}" 
                        class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-sage-700 mb-2">Full Card Bonus 全卡奖励</label>
                    <input type="number" id="setting-full-card" value="${settings.fullCardBonus}" 
                        class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                </div>
                
                <div class="flex items-center gap-3">
                    <input type="checkbox" id="setting-full-card-enabled" ${settings.fullCardBonusEnabled ? 'checked' : ''} 
                        class="w-5 h-5 rounded border-sage-300 text-blush-600 focus:ring-blush-500">
                    <label class="text-sm font-medium text-sage-700">Enable Full Card Bonus 启用全卡奖励</label>
                </div>
                
                <button onclick="saveSettings()" class="btn-primary w-full py-3 rounded-2xl text-white font-semibold">
                    <i class="fas fa-save mr-2"></i>Save Settings 保存设置
                </button>
            </div>
        </div>
    `;
}


function saveSettings() {
    const settings = {
        firstCellBonus: parseInt(document.getElementById('setting-first-cell').value) || 0, // 新增
        bingoLineScore: parseInt(document.getElementById('setting-bingo-score').value),
        socialBonusScore: parseInt(document.getElementById('setting-social-score').value),
        firstBingoBonus: parseInt(document.getElementById('setting-first-bingo').value),
        fullCardBonus: parseInt(document.getElementById('setting-full-card').value),
        fullCardBonusEnabled: document.getElementById('setting-full-card-enabled').checked
    };
    
    saveSettings(settings);
    showToast('Settings saved 设置已保存', 'success');
}


function renderExportTab(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="glass rounded-2xl p-4 border-2 border-red-200">
                <h3 class="font-display text-lg font-bold text-red-600 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Danger Zone 危险区域
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                    Reset the entire game. This will delete all player progress and scores. 
                    重置整个游戏。这将删除所有玩家进度和积分。
                </p>
                <button onclick="resetGame()" class="w-full bg-red-500 hover:bg-red-600 py-3 rounded-2xl text-white font-semibold transition-all">
                    <i class="fas fa-redo mr-2"></i>Reset Game 重置游戏
                </button>
            </div>

            <div class="border-t border-gray-200 pt-4">
                <button onclick="exportGuests()" class="w-full glass py-4 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-users"></i>
                    Export Guests 导出宾客名单
                </button>
            </div>
            <button onclick="exportScores()" class="w-full glass py-4 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all flex items-center justify-center gap-2">
                <i class="fas fa-trophy"></i>
                Export Scores 导出积分
            </button>
            <button onclick="exportLeaderboard()" class="w-full glass py-4 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all flex items-center justify-center gap-2">
                <i class="fas fa-list-ol"></i>
                Export Leaderboard 导出排行榜
            </button>
            <button onclick="exportAllData()" class="btn-primary w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2">
                <i class="fas fa-download"></i>
                Export All Data 导出所有数据
            </button>
        </div>
    `;
}

function exportGuests() {
    const guests = getGuests();
    const players = getPlayers();
    
    const data = guests.map(guest => {
        const playerCard = Object.keys(players).find(card => 
            players[card].name.toLowerCase() === guest.name.toLowerCase()
        );
        
        return {
            Name: guest.name,
            Group: guest.group,
            Card: playerCard || ''
        };
    });
    
    downloadCSV(data, 'guests.csv');
    showToast('Guests exported 宾客名单已导出', 'success');
}

function exportScores() {
    const players = getPlayers();
    const scores = getScores();
    
    const data = Object.keys(players).map(cardId => {
        const player = players[cardId];
        const score = scores[cardId] || {};
        
        return {
            Card: cardId,
            Name: player.name,
            Nickname: player.nickname || '',
            TotalScore: score.totalScore || 0,
            BingoCount: score.bingoCount || 0,
            SocialBonus: score.socialBonus || 0,
            FirstBingoBonus: score.firstBingoBonus || 0,
            CompletedCells: score.completedCells || 0
        };
    });
    
    downloadCSV(data, 'scores.csv');
    showToast('Scores exported 积分已导出', 'success');
}

function exportLeaderboard() {
    const players = getPlayers();
    const scores = getScores();
    
    const leaderboard = Object.keys(players).map(cardId => {
        const player = players[cardId];
        const score = scores[cardId] || {};
        
        return {
            Rank: 0,
            Name: player.nickname || player.name,
            TotalScore: score.totalScore || 0,
            BingoCount: score.bingoCount || 0,
            CompletedCells: score.completedCells || 0
        };
    });
    
    // Sort by score
    leaderboard.sort((a, b) => b.TotalScore - a.TotalScore);
    
    // Add rank
    leaderboard.forEach((item, index) => {
        item.Rank = index + 1;
    });
    
    downloadCSV(leaderboard, 'leaderboard.csv');
    showToast('Leaderboard exported 排行榜已导出', 'success');
}

function exportAllData() {
    const data = {
        guests: getGuests(),
        prompts: getPrompts(),
        cards: getCards(),
        players: getPlayers(),
        scores: getScores(),
        settings: getSettings()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bingo_all_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('All data exported 所有数据已导出', 'success');
}

function downloadCSV(data, filename) {
    if (data.length === 0) {
        showToast('No data to export 没有数据可导出', 'error');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function showEditScoreModal(cardId) {
    const players = getPlayers();
    const scores = getScores();
    const player = players[cardId];
    const score = scores[cardId] || {};
    const settings = getSettings();
    
    const modalContent = `
        <div class="text-center mb-4">
            <h3 class="font-display text-xl font-bold text-blush-700">Edit Score 编辑积分</h3>
            <p class="text-sm text-sage-600 mt-1">${player.nickname || player.name} (${cardId})</p>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">First Cell Bonus 首格奖励</label>
                <input type="number" id="edit-first-cell" value="${score.firstCellBonus || 0}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Bingo Lines 连线数</label>
                <input type="number" id="edit-bingo-count" value="${score.bingoCount || 0}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                <p class="text-xs text-gray-400 mt-1">每线 ${settings.bingoLineScore} 分</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Social Bonus Count 社交奖励次数</label>
                <input type="number" id="edit-social-bonus" value="${score.socialBonusCount || 0}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
                <p class="text-xs text-gray-400 mt-1">每次 ${settings.socialBonusScore} 分</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">First Bingo Bonus 首次连线奖励分</label>
                <input type="number" id="edit-first-bingo" value="${score.firstBingoBonus || 0}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium text-sage-700 mb-2">Completed Cells 完成格子数</label>
                <input type="number" id="edit-completed-cells" value="${score.completedCells || 0}" 
                    class="input-field w-full px-4 py-3 rounded-2xl text-gray-700 focus:outline-none">
            </div>
            
            <div class="glass p-3 rounded-xl text-center">
                <p class="text-sm text-sage-600">预估总分 (自动计算)</p>
                <p class="text-2xl font-bold text-blush-600" id="estimated-total">
                    ${(score.firstCellBonus || 0) + (score.bingoCount || 0) * settings.bingoLineScore + (score.socialBonusCount || 0) * settings.socialBonusScore + (score.firstBingoBonus || 0)}
                </p>
            </div>

            <div class="flex gap-3">
                <button onclick="hideModal()" class="flex-1 glass py-3 rounded-2xl text-sage-700 font-medium hover:bg-white/40 transition-all">
                    Cancel 取消
                </button>
                <button onclick="saveScoreEdit('${cardId}')" class="flex-1 btn-primary py-3 rounded-2xl text-white font-semibold">
                    Save 保存
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // 实时计算逻辑
    const updateEstimate = () => {
        const fCell = parseInt(document.getElementById('edit-first-cell').value) || 0;
        const bCount = parseInt(document.getElementById('edit-bingo-count').value) || 0;
        const sCount = parseInt(document.getElementById('edit-social-bonus').value) || 0;
        const fBingo = parseInt(document.getElementById('edit-first-bingo').value) || 0;
        // 注意：全卡奖励需要根据输入的 completedCells 判断，这里简化处理仅做加权和展示
        const total = fCell + bCount * settings.bingoLineScore + sCount * settings.socialBonusScore + fBingo;
        document.getElementById('estimated-total').textContent = total;
    };
    
    document.getElementById('edit-first-cell').addEventListener('input', updateEstimate);
    document.getElementById('edit-bingo-count').addEventListener('input', updateEstimate);
    document.getElementById('edit-social-bonus').addEventListener('input', updateEstimate);
    document.getElementById('edit-first-bingo').addEventListener('input', updateEstimate);
}

function saveScoreEdit(cardId) {
    const firstCellBonus = parseInt(document.getElementById('edit-first-cell').value) || 0;
    const bingoCount = parseInt(document.getElementById('edit-bingo-count').value) || 0;
    const socialBonusCount = parseInt(document.getElementById('edit-social-bonus').value) || 0;
    const firstBingoBonus = parseInt(document.getElementById('edit-first-bingo').value) || 0;
    const completedCells = parseInt(document.getElementById('edit-completed-cells').value) || 0;
    
    const scores = getScores();
    
    const newScoreData = {
        firstCellBonus,
        bingoCount,
        socialBonusCount,
        firstBingoBonus,
        completedCells,
        totalScore: 0
    };
    
    // 统一计算总分
    newScoreData.totalScore = calculateTotalScore(newScoreData);
    
    scores[cardId] = newScoreData;
    
    saveScores(scores);
    
    hideModal();
    showToast('Score updated 积分已更新', 'success');
    switchAdminTab('guests');
}
