// Inicjalizacja Telegram WebApp SDK
const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand(); // Rozciągnięcie aplikacji na pełny ekran
    tg.ready();
}

let clicks = 0;
const target = 10;
let isHatched = false;

// Elementy z DOM
const eggBtn = document.getElementById('egg-btn');
const egg = document.getElementById('egg');
const clicksDisplay = document.getElementById('clicks');
const rewardModal = document.getElementById('reward-modal');
const claimBtn = document.getElementById('claim-btn');

// Nasłuchiwanie kliknięć
eggBtn.addEventListener('click', tapEgg);
claimBtn.addEventListener('click', claimPet);

function tapEgg() {
    if (isHatched) return;

    clicks++;
    clicksDisplay.innerText = clicks;

    // Lekka wibracja w telefonie (Telegram Haptic)
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    // Animacja obrotu jajka
    const randomDegree = (Math.random() - 0.5) * 16;
    egg.style.transform = `rotate(${randomDegree}deg) scale(0.95)`;
    
    setTimeout(() => {
        egg.style.transform = 'rotate(0deg) scale(1)';
    }, 80);

    // Sprawdzamy czy osiągnięto cel 10 kliknięć
    if (clicks >= target) {
        isHatched = true;
        
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        setTimeout(showReward, 200);
    }
}

function showReward() {
    rewardModal.style.display = 'flex';
}

function claimPet() {
    rewardModal.style.display = 'none';
    eggBtn.style.display = 'none';
    alert('🟢 Starter Slime został przydzielony do Twojego konta!');
}