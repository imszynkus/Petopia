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

const target = 10;

// DOM Elements
const coinsDisplay = document.getElementById('coins-display');
const clicksDisplay = document.getElementById('clicks');
const mainInteractiveBtn = document.getElementById('main-interactive-btn');
const mainImg = document.getElementById('main-img');
const statusSubtitle = document.getElementById('status-subtitle');
const counterLabel = document.getElementById('counter-label');
const rewardModal = document.getElementById('reward-modal');
const claimBtn = document.getElementById('claim-btn');

// Navbar Elements
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Event Listeners
mainInteractiveBtn.addEventListener('click', handleMainClick);
claimBtn.addEventListener('click', claimPet);

// Navbar Tab Switching
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');

        navButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// 2. INITIALIZATION
function initGame() {
    coinsDisplay.innerText = coins;
    clicksDisplay.innerText = clicks;

    if (hasPet) {
        showPetInMainArea();
    } else if (isHatched) {
        showReward();
    }
}

// 3. CLICK LOGIC
function handleMainClick() {
    // If player owns a pet -> Click gives COINS
    if (hasPet) {
        coins += 1; // +1 Coin per click
        coinsDisplay.innerText = coins;
        localStorage.setItem('petopia_coins', coins);

        triggerHaptic();
        animateClick();
        return;
    }

    // If player is hatching the tutorial egg
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

// 4. CLAIM PET
function claimPet() {
    rewardModal.style.display = 'none';
    hasPet = true;
    localStorage.setItem('petopia_hasPet', 'true');

    showPetInMainArea();
}

function showPetInMainArea() {
    mainImg.src = 'img/pets/slime.png';
    statusSubtitle.innerText = 'Tap your pet to earn coins!';
    counterLabel.innerText = 'Pet Level';
    clicksDisplay.innerText = '1';
}

// Start Game
initGame();
