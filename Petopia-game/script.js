// Telegram WebApp SDK Initialization
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
    tg.ready();
}

// 1. STATE MANAGEMENT
let coins = parseInt(localStorage.getItem('petopia_coins')) || 0;
let clicks = parseInt(localStorage.getItem('petopia_clicks')) || 0;
let isHatched = localStorage.getItem('petopia_hatched') === 'true';
let hasPet = localStorage.getItem('petopia_hasPet') === 'true';
let m1Claimed = localStorage.getItem('petopia_m1') === 'true';

const target = 10;

// Dynamic DOM Elements References
let coinsDisplay, clicksDisplay, mainInteractiveBtn, mainImg, statusSubtitle, counterLabel, rewardModal, claimBtn, m1Btn;

// 2. FETCH ALL VIEWS SECURELY
async function loadViews() {
    try {
        const views = [
            { id: 'tab-home', file: 'views/home.html' },
            { id: 'tab-collection', file: 'views/pets.html' },
            { id: 'tab-shop', file: 'views/shop.html' },
            { id: 'tab-missions', file: 'views/missions.html' }
        ];

        // Pobieramy pliki równolegle
        await Promise.all(views.map(async (view) => {
            const response = await fetch(view.file);
            const html = await response.text();
            document.getElementById(view.id).innerHTML = html;
        }));

        // Dopiero gdy pliki HTML W PEŁNI się załadują – przypisujemy zmienne i logikę!
        bindDOMElements();
        setupEventListeners();
        initGame();

    } catch (err) {
        console.error("Błąd podczas ładowania widoków fetch:", err);
    }
}

// 3. BIND ELEMENTS (Gwarantujemy, że elementy istnieją w DOM)
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

// 4. EVENT LISTENERS
function setupEventListeners() {
    if (mainInteractiveBtn) mainInteractiveBtn.addEventListener('click', handleMainClick);
    if (claimBtn) claimBtn.addEventListener('click', claimPet);
    if (m1Btn) m1Btn.addEventListener('click', claimMission1);

    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) targetElement.classList.add('active');
        });
    });
}

// 5. LOGIKA GRY
function initGame() {
    if (coinsDisplay) coinsDisplay.innerText = coins;
    if (clicksDisplay) clicksDisplay.innerText = clicks;

    if (hasPet) {
        showPetInMainArea();
    } else if (isHatched) {
        showReward();
    }

    updateMissionsUI();
}

function handleMainClick() {
    if (hasPet) {
        coins += 1;
        if (coinsDisplay) coinsDisplay.innerText = coins;
        localStorage.setItem('petopia_coins', coins);
        triggerHaptic();
        animateClick();
        return;
    }

    if (isHatched) return;

    clicks++;
    if (clicksDisplay) clicksDisplay.innerText = clicks;
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
    if (!mainImg) return;
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
    if (rewardModal) rewardModal.style.display = 'flex';
}

function claimPet() {
    if (rewardModal) rewardModal.style.display = 'none';
    hasPet = true;
    localStorage.setItem('petopia_hasPet', 'true');

    showPetInMainArea();
    updateMissionsUI();
}

function showPetInMainArea() {
    if (mainImg) mainImg.src = 'img/pets/slime.png';
    if (statusSubtitle) statusSubtitle.innerText = 'Tap your pet to earn coins!';
    if (counterLabel) counterLabel.innerText = 'Pet Level';
    if (clicksDisplay) clicksDisplay.innerText = '1';
}

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
        if (coinsDisplay) coinsDisplay.innerText = coins;
        triggerHaptic();
        updateMissionsUI();
    }
}

// ODPALENIE PROCESU Z FETCH
loadViews();
