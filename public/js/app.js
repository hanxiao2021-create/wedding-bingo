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
    const card = cards[state
