// Inicjalizacja Telegram WebApp SDK
const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand();
    tg.ready();
}

// 1. DANE GRY I WCZYTYWANIE STANU (localStorage)
let clicks = parseInt(localStorage.getItem('petopia_clicks')) || 0;
let isHatched = localStorage.getItem('petopia_hatched') === 'true';
let hasPet = localStorage.getItem('petopia_hasPet') === 'true';

const target = 10;

// Elementy z DOM
const eggBtn = document.getElementById('egg-btn');
const eggImg = document.getElementById('egg');
const clicksDisplay = document.getElementById('clicks');
const rewardModal = document.getElementById('reward-modal');
const claimBtn = document.getElementById('claim-btn');

// Nasłuchiwanie kliknięć
eggBtn.addEventListener('click', tapEgg);
claimBtn.addEventListener('click', claimPet);

// 2. INICJALIZACJA WIDOKU PO WEJŚCIU DO GRY
function initGame() {
    clicksDisplay.innerText = clicks;

    if (hasPet) {
        // Jeśli gracz już ma Slime'a – ukrywamy jajko i pokazujemy stworka
        showPetInMainArea();
    } else if (isHatched) {
        // Jeśli jajko pękło, ale gracz jeszcze nie kliknął "Odbierz"
        showReward();
    }
}

// 3. LOGIKA KLIKANIA
function tapEgg() {
    if (isHatched || hasPet) return;

    clicks++;
    clicksDisplay.innerText = clicks;
    
    // Zapisujemy kliknięcia w pamięci
    localStorage.setItem('petopia_clicks', clicks);

    // Haptic Feedback
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    // Animacja kliknięcia
    const randomDegree = (Math.random() - 0.5) * 16;
    eggImg.style.transform = `rotate(${randomDegree}deg) scale(0.95)`;
    
    setTimeout(() => {
        eggImg.style.transform = 'rotate(0deg) scale(1)';
    }, 80);

    // Cel osiągnięty
    if (clicks >= target) {
        isHatched = true;
        localStorage.setItem('petopia_hatched', 'true');
        
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        setTimeout(showReward, 200);
    }
}

function showReward() {
    rewardModal.style.display = 'flex';
}

// 4. ODBIERANIE PET-A
function claimPet() {
    rewardModal.style.display = 'none';
    hasPet = true;
    localStorage.setItem('petopia_hasPet', 'true');

    showPetInMainArea();
}

// Podmiana jajka na Slime'a na głównym ekranie z poprawną ścieżką
function showPetInMainArea() {
    eggImg.src = 'img/pets/slime.png'; // Poprawiona ścieżka do stworka
    clicksDisplay.innerText = target;
}

// Uruchomienie przy starcie
initGame();
