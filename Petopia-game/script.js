// Telegram WebApp SDK
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
    tg.ready();
}

// 1. DEFINICJE ZWIERZAKÓW
const PETS_DATABASE = {
    slime: { id: 'slime', name: 'Starter Slime', img: 'img/pets/slime.png', isStarter: true },
    turtle: { id: 'turtle', name: 'Turtle', img: 'img/pets/turtle.png', isStarter: false },
    cat: { id: 'cat', name: 'Cat', img: 'img/pets/cat.png', isStarter: false },
    owl: { id: 'owl', name: 'Owl', img: 'img/pets/owl.png', isStarter: false }
};

// 2. STATE MANAGEMENT & LOCALSTORAGE
let coins = parseInt(localStorage.getItem('petopia_coins')) || 0;
let clicks = parseInt(localStorage.getItem('petopia_clicks')) || 0;
let isHatched = localStorage.getItem('petopia_hatched') === 'true';
let hasPet = localStorage.getItem('petopia_hasPet') === 'true';

// Dane kolekcji: ID aktywnego pet oraz stany ulepszeń [level, shards]
let activePetId = localStorage.getItem('petopia_active_pet') || 'slime';
let userPets = JSON.parse(localStorage.getItem('petopia_user_pets')) || {
    slime: { level: 1, shards: 0, unlocked: true }
};

const target = 10;
const EGG_PRICE = 100;

// Dynamic DOM References
let coinsDisplay, clicksDisplay, mainInteractiveBtn, mainImg, statusSubtitle, counterLabel, rewardModal, claimBtn, m1Btn, buyEggBtn, collectionGrid;

// 3. FETCH LOADER
async function loadViews() {
    try {
        const views = [
            { id: 'tab-home', file: 'views/home.html' },
            { id: 'tab-collection', file: 'views/pets.html' },
            { id: 'tab-shop', file: 'views/shop.html' },
            { id: 'tab-missions', file: 'views/missions.html' }
        ];

        await Promise.all(views.map(async (view) => {
            const response = await fetch(view.file);
            const html = await response.text();
            document.getElementById(view.id).innerHTML = html;
        }));

        bindDOMElements();
        setupEventListeners();
        initGame();

    } catch (err) {
        console.error("Błąd podczas ładowania widoków:", err);
    }
}

// 4. BIND ELEMENTS
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
    buyEggBtn = document.getElementById('buy-egg-btn');
    collectionGrid = document.getElementById('collection-grid');
}

// 5. EVENT LISTENERS
function setupEventListeners() {
    if (mainInteractiveBtn) mainInteractiveBtn.addEventListener('click', handleMainClick);
    if (claimBtn) claimBtn.addEventListener('click', claimStarterPet);
    if (buyEggBtn) buyEggBtn.addEventListener('click', buyCommonEgg);

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

            if (targetTab === 'tab-collection') {
                renderCollection();
            }
        });
    });
}

// 6. INIT GAME
function initGame() {
    if (coinsDisplay) coinsDisplay.innerText = coins;
    if (clicksDisplay) clicksDisplay.innerText = clicks;

    if (hasPet) {
        showActivePetInMainArea();
    } else if (isHatched) {
        showStarterReward();
    }
}

// Oblicza ile monet daje 1 kliknięcie w zależności od poziomu aktywnego zwierzaka
function getClickPower() {
    if (!hasPet) return 1;
    const petData = userPets[activePetId];
    if (!petData) return 1;

    if (activePetId === 'slime') return 1; // Slime zawsze +1

    // Turtle / Cat / Owl: Lvl 1 -> +2, Lvl 2 -> +4, Lvl 3 -> +8
    return Math.pow(2, petData.level);
}

// 7. KLIKANIE NA EKRANIE GŁÓWNYM
function handleMainClick() {
    if (hasPet) {
        const power = getClickPower();
        coins += power;
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
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        setTimeout(showStarterReward, 200);
    }
}

// 8. ODBIÓR STARTER SLIME (TUTORIAL)
function showStarterReward() {
    if (rewardModal) rewardModal.style.display = 'flex';
}

function claimStarterPet() {
    if (rewardModal) rewardModal.style.display = 'none';
    hasPet = true;
    localStorage.setItem('petopia_hasPet', 'true');
    activePetId = 'slime';
    localStorage.setItem('petopia_active_pet', 'slime');
    showActivePetInMainArea();
}

function showActivePetInMainArea() {
    const currentPet = PETS_DATABASE[activePetId] || PETS_DATABASE.slime;
    if (mainImg) mainImg.src = currentPet.img;
    
    const petInfo = userPets[activePetId];
    const levelText = activePetId === 'slime' ? 'MAX' : `Lvl ${petInfo.level}`;

    if (statusSubtitle) statusSubtitle.innerText = `Active: ${currentPet.name} (+${getClickPower()} 🪙/tap)`;
    if (counterLabel) counterLabel.innerText = `${currentPet.name} (${levelText})`;
    if (clicksDisplay) clicksDisplay.innerText = getClickPower();
}

// 9. KUPOWANIE JAJKA W SKLEPIE (TURTLE, CAT, OWL)
function buyCommonEgg() {
    if (coins < EGG_PRICE) {
        alert("Not enough coins! You need 100 🪙");
        return;
    }

    coins -= EGG_PRICE;
    localStorage.setItem('petopia_coins', coins);
    if (coinsDisplay) coinsDisplay.innerText = coins;

    // Losujemy jednego z 3 zwierzaków ze sklepu
    const shopPets = ['turtle', 'cat', 'owl'];
    const randomPetId = shopPets[Math.floor(Math.random() * shopPets.length)];
    const petData = PETS_DATABASE[randomPetId];

    if (!userPets[randomPetId]) {
        // NOWY ZWIERZAK!
        userPets[randomPetId] = { level: 1, shards: 0, unlocked: true };
        alert(`🎉 NEW PET UNLOCKED!\nYou hatched a ${petData.name}! (+2 🪙/tap)`);
    } else {
        // POWTÓRKA -> EKSPIENIE / FRAGMENTY
        const userPet = userPets[randomPetId];
        
        if (userPet.level >= 3) {
            // Maksymalny poziom -> zwrot monet
            coins += 50;
            localStorage.setItem('petopia_coins', coins);
            if (coinsDisplay) coinsDisplay.innerText = coins;
            alert(`✨ You hatched ${petData.name} (MAX LEVEL)!\nConverted into +50 🪙 refund.`);
        } else {
            userPet.shards += 1;
            const requiredShards = userPet.level === 1 ? 3 : 5;

            if (userPet.shards >= requiredShards) {
                // LEVEL UP!
                userPet.level += 1;
                userPet.shards = 0;
                alert(`🚀 LEVEL UP!\nYour ${petData.name} reached Level ${userPet.level}!`);
            } else {
                alert(`💎 SHARD RECEIVED!\nGot 1 ${petData.name} shard (${userPet.shards}/${requiredShards}).`);
            }
        }
    }

    localStorage.setItem('petopia_user_pets', JSON.stringify(userPets));
    triggerHaptic();
}

// 10. RENDEROWANIE KOLEKCJI (PETS TAB)
function renderCollection() {
    if (!collectionGrid) return;
    collectionGrid.innerHTML = '';

    Object.keys(PETS_DATABASE).forEach(petId => {
        const pet = PETS_DATABASE[petId];
        const userData = userPets[petId];
        const isUnlocked = userData && userData.unlocked;
        const isActive = activePetId === petId;

        const card = document.createElement('div');
        card.className = `pet-card ${isUnlocked ? '' : 'locked'}`;

        let statusHTML = '';
        if (petId === 'slime') {
            statusHTML = `<span class="badge-max">MAX LEVEL</span>`;
        } else if (isUnlocked) {
            const reqShards = userData.level === 1 ? 3 : 5;
            const shardText = userData.level >= 3 ? 'MAX' : `${userData.shards}/${reqShards} Shards`;
            statusHTML = `<div class="pet-level">Lvl ${userData.level}</div><div class="pet-shards">${shardText}</div>`;
        } else {
            statusHTML = `<div class="pet-locked-text">Locked</div>`;
        }

        const equipBtnHTML = isUnlocked ? 
            `<button class="equip-btn ${isActive ? 'active' : ''}" onclick="equipPet('${petId}')">${isActive ? 'EQUIPPED' : 'EQUIP'}</button>` : '';

        card.innerHTML = `
            <img src="${pet.img}" alt="${pet.name}" style="${isUnlocked ? '' : 'filter: grayscale(1); opacity: 0.4;'}">
            <div class="pet-card-name">${pet.name}</div>
            ${statusHTML}
            ${equipBtnHTML}
        `;

        collectionGrid.appendChild(card);
    });
}

// Wybór zwierzaka z poziomu Kolekcji
window.equipPet = function(petId) {
    if (!userPets[petId] || !userPets[petId].unlocked) return;
    activePetId = petId;
    localStorage.setItem('petopia_active_pet', activePetId);
    showActivePetInMainArea();
    renderCollection();
    triggerHaptic();
};

function animateClick() {
    if (!mainImg) return;
    const randomDegree = (Math.random() - 0.5) * 16;
    mainImg.style.transform = `rotate(${randomDegree}deg) scale(0.95)`;
    setTimeout(() => {
        mainImg.style.transform = 'rotate(0deg) scale(1)';
    }, 80);
}

function triggerHaptic() {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// RUN
loadViews();
