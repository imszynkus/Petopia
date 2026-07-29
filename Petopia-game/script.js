// Telegram WebApp SDK Initialization
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
    tg.ready();
}

// 1. GAME DATA & LOCALSTORAGE
let coins = parseInt(localStorage.getItem('petopia_coins')) || 0;
let clicks = parseInt(localStorage.getItem('petopia_clicks')) || 0;
let isHatched = localStorage.getItem('petopia_hatched') === 'true';
let hasPet = localStorage.getItem('petopia_hasPet') === 'true';
let m1Claimed = localStorage.getItem('petopia_m1') === 'true';

const target = 10;

// Dynamic DOM Reference Holders
let coinsDisplay, clicksDisplay, mainInteractiveBtn, mainImg, statusSubtitle, counterLabel, rewardModal, claimBtn, m1Btn;

// 2. FETCH VIEWS LOADER
async function loadAllViews() {
    try {
        const [home, pets, shop, missions] = await Promise.all([
            fetch('views/home.html').then(res => res.text()),
            fetch('views/pets.html').then(res => res.text()),
            fetch('views/shop.html').then(res => res.text()),
            fetch('views/missions.html').then(res => res.text())
        ]);

        document.getElementById('tab-home').innerHTML = home;
        document.getElementById('tab-collection').innerHTML = pets;
        document.getElementById('tab-shop').innerHTML = shop;
        document.getElementById('tab-missions').innerHTML = missions;

        // Bind DOM Elements after HTML injection
        bindDOMElements();
        // Setup Event Listeners
        setupEventListeners();
        // Initialize Game State
        initGame();

    } catch (error) {
        console.error("Error loading views:", error);
    }
}

// Bind elements dynamically loaded into HTML
function bindDOMElements() {
    coinsDisplay = document.getElementById('coins-display');
    clicksDisplay = document.getElementById('clicks');
    mainInteractiveBtn = document.getElementById('main-interactive-btn');
    mainImg = document.getElementById('main-img');
    statusSubtitle = document.getElementById('status-subtitle');
    counterLabel = document.getElementById('counter-label');
    rewardModal = document.getElementById('reward-modal');
    claimBtn = document.getElementById('claim-btn');
    m1Btn = document.getElementById('m1-btn');
}

// Setup click handlers
function setupEventListeners() {
    mainInteractiveBtn.addEventListener('click', handleMainClick);
    claimBtn.addEventListener('click', claimPet);
    m1Btn.addEventListener('click', claimMission1);

    // Navbar Tab Switching
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// 3. INITIALIZATION
function initGame() {
    coinsDisplay.innerText = coins;
    clicksDisplay.innerText = clicks;

    if (hasPet) {
        showPetInMainArea();
    } else if (isHatched) {
        showReward();
    }

    updateMissionsUI();
}

// 4. GAME LOGIC
function handleMainClick() {
    if (hasPet) {
        coins += 1;
        coinsDisplay.innerText = coins;
        localStorage.setItem('petopia_coins', coins);
        triggerHaptic();
        animateClick();
        return;
    }

    if (isHatched) return;

    clicks++;
    clicksDisplay.innerText = clicks;
    localStorage.setItem('petopia_clicks', clicks);

    triggerHaptic();
    animateClick();

    if (clicks >= target) {
        isHatched = true;
        localStorage.setItem('petopia_hatched', 'true');
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        setTimeout(showReward, 200);
    }
}

function animateClick() {
    const randomDegree = (Math.random() - 0.5) * 16;
    mainImg.style.transform = `rotate(${randomDegree}deg) scale(0.95)`;
    setTimeout(() => {
        mainImg.style.transform = 'rotate(0deg) scale(1)';
    }, 80);
}

function triggerHaptic() {
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function showReward() {
    rewardModal.style.display = 'flex';
}

function claimPet() {
    rewardModal.style.display = 'none';
    hasPet = true;
    localStorage.setItem('petopia_hasPet', 'true');
    showPetInMainArea();
    updateMissionsUI();
}

function showPetInMainArea() {
    mainImg.src = 'img/pets/slime.png';
    statusSubtitle.innerText = 'Tap your pet to earn coins!';
    counterLabel.innerText = 'Pet Level';
    clicksDisplay.innerText = '1';
}

// 5. MISSIONS LOGIC
function updateMissionsUI() {
    if (!m1Btn) return;
    if (m1Claimed) {
        m1Btn.innerText = 'DONE';
        m1Btn.className = 'claim-mission-btn completed';
    } else if (hasPet) {
        m1Btn.innerText = 'CLAIM';
        m1Btn.className = 'claim-mission-btn';
    } else {
        m1Btn.innerText = 'LOCKED';
        m1Btn.className = 'claim-mission-btn disabled';
    }
}

function claimMission1() {
    if (hasPet && !m1Claimed) {
        coins += 50;
        m1Claimed = true;
        localStorage.setItem('petopia_coins', coins);
        localStorage.setItem('petopia_m1', 'true');
        coinsDisplay.innerText = coins;
        triggerHaptic();
        updateMissionsUI();
    }
}

// Start Game by Loading Views
loadAllViews();