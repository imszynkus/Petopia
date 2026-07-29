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

// NOWE: Czy na ekranie głównym znajduje się kupione jajko do rozbicia?
let isEggActive = localStorage.getItem('petopia_is_egg_active') === 'true';
let eggClicks = parseInt(localStorage.getItem('petopia_egg_clicks')) || 0;
const EGG_TARGET_CLICKS = 50; // Liczba kliknięć potrzebna do rozbicia jajka ze sklepu

let activePetId = localStorage.getItem('petopia_active_pet') || 'slime';
let userPets = JSON.parse(localStorage.getItem('petopia_user_pets')) || {
    slime: { level: 1, shards: 0, unlocked: true }
};

const TUTORIAL_TARGET = 10;
const EGG_PRICE = 100;

// Dynamic DOM References
let coinsDisplay, clicksDisplay, mainInteractiveBtn, mainImg, statusSubtitle, counterLabel, rewardModal, claimBtn, buyEggBtn, collectionGrid;

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

    if (isEggActive) {
        showEggInMainArea();
    } else if (hasPet) {
        showActivePetInMainArea();
    } else if (isHatched) {
        showStarterReward();
    } else {
        // Stan poczatkowy samouczka
        if (clicksDisplay) clicksDisplay.innerText = clicks;
    }
}

function getClickPower() {
    if (!hasPet) return 1;
    const petData = userPets[activePetId];
    if (!petData) return 1;
    if (activePetId === 'slime') return 1;

    return Math.pow(2, petData.level);
}

// 7. OBSŁUGA KLIKANIA W GŁÓWNYM EKRANIE
function handleMainClick() {
    // SCENARIUSZ A: Rozbijanie kupionego jajka ze sklepu
    if (isEggActive) {
        eggClicks++;
        localStorage.setItem('petopia_egg_clicks', eggClicks);
        if (clicksDisplay) clicksDisplay.innerText = eggClicks;

        triggerHaptic();
        animateClick();

        if (eggClicks >= EGG_TARGET_CLICKS) {
            hatchShopEgg();
        }
        return;
    }

    // SCENARIUSZ B: Klikanie w aktywnego Zwierzaka (Zarabianie monet)
    if (hasPet) {
        const power = getClickPower();
        coins += power;
        if (coinsDisplay) coinsDisplay.innerText = coins;
        localStorage.setItem('petopia_coins', coins);

        triggerHaptic();
        animateClick();
        return;
    }

    // SCENARIUSZ C: Samouczek (Pierwsze jajko ze Slime)
    if (isHatched) return;

    clicks++;
    if (clicksDisplay) clicksDisplay.innerText = clicks;
    localStorage.setItem('petopia_clicks', clicks);

    triggerHaptic();
    animateClick();

    if (clicks >= TUTORIAL_TARGET) {
        isHatched = true;
        localStorage.setItem('petopia_hatched', 'true');
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        setTimeout(showStarterReward, 200);
    }
}

// 8. KUPOWANIE JAJKA W SKLEPIE
function buyCommonEgg() {
    if (isEggActive) {
        alert("You already have an egg to hatch on the main screen!");
        switchTab('tab-home');
        return;
    }

    if (coins < EGG_PRICE) {
        alert("Not enough coins! You need 100 🪙");
        return;
    }

    coins -= EGG_PRICE;
    localStorage.setItem('petopia_coins', coins);
    if (coinsDisplay) coinsDisplay.innerText = coins;

    // Aktywujemy jajko na ekranie głównym
    isEggActive = true;
    eggClicks = 0;
    localStorage.setItem('petopia_is_egg_active', 'true');
    localStorage.setItem('petopia_egg_clicks', '0');

    showEggInMainArea();
    switchTab('tab-home');
    triggerHaptic();
}

// Wyklucie jajka ze sklepu po osiągnięciu limitu kliknięć
function hatchShopEgg() {
    isEggActive = false;
    eggClicks = 0;
    localStorage.setItem('petopia_is_egg_active', 'false');
    localStorage.setItem('petopia_egg_clicks', '0');

    const shopPets = ['turtle', 'cat', 'owl'];
    const randomPetId = shopPets[Math.floor(Math.random() * shopPets.length)];
    const petData = PETS_DATABASE[randomPetId];

    if (!userPets[randomPetId]) {
        userPets[randomPetId] = { level: 1, shards: 0, unlocked: true };
        alert(`🎉 EGG HATCHED!\nYou unlocked ${petData.name}! (+2 🪙/tap)`);
    } else {
        const userPet = userPets[randomPetId];
        if (userPet.level >= 3) {
            coins += 50;
            localStorage.setItem('petopia_coins', coins);
            if (coinsDisplay) coinsDisplay.innerText = coins;
            alert(`✨ You hatched ${petData.name} (MAX LEVEL)!\nConverted into +50 🪙 refund.`);
        } else {
            userPet.shards += 1;
            const requiredShards = userPet.level === 1 ? 3 : 5;

            if (userPet.shards >= requiredShards) {
                userPet.level += 1;
                userPet.shards = 0;
                alert(`🚀 LEVEL UP!\nYour ${petData.name} reached Level ${userPet.level}!`);
            } else {
                alert(`💎 SHARD RECEIVED!\nGot 1 ${petData.name} shard (${userPet.shards}/${requiredShards}).`);
            }
        }
    }

    localStorage.setItem('petopia_user_pets', JSON.stringify(userPets));
    
    // Ustawiamy wyklutego zwierzaka jako aktywnego
    activePetId = randomPetId;
    localStorage.setItem('petopia_active_pet', activePetId);

    showActivePetInMainArea();
}

// 9. POMOCNICZE WIDOKI EKRANU GŁÓWNEGO
function showEggInMainArea() {
    if (mainImg) mainImg.src = 'img/eggs/egg.png';
    if (statusSubtitle) statusSubtitle.innerText = 'Tap to hatch your Common Egg!';
    if (counterLabel) counterLabel.innerText = 'Hatching Progress';
    
    // Ustawiamy właściwy postęp (np. 0 / 50)
    if (clicksDisplay) {
        clicksDisplay.innerHTML = `${eggClicks} <span style="font-size: 0.8em; opacity: 0.6;">/ ${EGG_TARGET_CLICKS}</span>`;
    }
}

// Wyświetlanie aktywnego Zwierzaka na ekranie głównym
function showActivePetInMainArea() {
    const currentPet = PETS_DATABASE[activePetId] || PETS_DATABASE.slime;
    if (mainImg) mainImg.src = currentPet.img;

    const petInfo = userPets[activePetId];
    const levelText = activePetId === 'slime' ? 'MAX' : `Lvl ${petInfo.level}`;

    if (statusSubtitle) statusSubtitle.innerText = `Active: ${currentPet.name}`;
    if (counterLabel) counterLabel.innerText = `${currentPet.name} (${levelText})`;
    
    // Pokazuje aktualny zarobek na kliknięcie zamiast staroświeckiego limitu /10
    if (clicksDisplay) {
        clicksDisplay.innerHTML = `+${getClickPower()} <span style="font-size: 0.75em; opacity: 0.7;">🪙 / tap</span>`;
    }
}

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

function switchTab(tabId) {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    const tab = document.getElementById(tabId);

    if (btn) btn.classList.add('active');
    if (tab) tab.classList.add('active');
}

// 10. RENDEROWANIE KOLEKCJI
function renderCollection() {
    if (!collectionGrid) return;
    collectionGrid.innerHTML = '';

    Object.keys(PETS_DATABASE).forEach(petId => {
        const pet = PETS_DATABASE[petId];
        const userData = userPets[petId];
        const isUnlocked = userData && userData.unlocked;
        const isActive = activePetId === petId && !isEggActive;

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

window.equipPet = function(petId) {
    if (!userPets[petId] || !userPets[petId].unlocked) return;
    if (isEggActive) {
        alert("Hatch your egg first before equipping another pet!");
        return;
    }
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
