// Telegram WebApp SDK
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.expand();
    tg.ready();
}

// 0. IKONA MONETY
const COIN_ICON = `<img src="img/coin.png" class="coin-icon" style="width: 1.1em; height: 1.1em; vertical-align: middle; margin-left: 2px;" alt="coin">`;

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

// SYSTEM ENERGII
let maxEnergy = parseInt(localStorage.getItem('petopia_max_energy')) || 1000;
let energy = localStorage.getItem('petopia_energy') !== null ? parseInt(localStorage.getItem('petopia_energy')) : maxEnergy;
let energyRechargeRate = parseInt(localStorage.getItem('petopia_energy_rate')) || 1; // 1 ⚡ / sek
let lastEnergyUpdate = parseInt(localStorage.getItem('petopia_last_energy_update')) || Date.now();

// SYSTEM IDLE (ZARABIANIE OFFLINE)
let lastActiveTime = parseInt(localStorage.getItem('petopia_last_active_time')) || Date.now();
let maxOfflineHours = parseInt(localStorage.getItem('petopia_max_offline_hours')) || 3; // Startowo 3 godziny (max 8h)

// SYSTEM STACKÓW FULL REFILL (Domyślnie 2/2 max)
let fullRefillStacks = parseInt(localStorage.getItem('petopia_refill_stacks'));
if (isNaN(fullRefillStacks)) fullRefillStacks = 2;
let lastRefillRegenTime = parseInt(localStorage.getItem('petopia_last_refill_regen')) || Date.now();
const REFILL_REGEN_TIME = 12 * 60 * 60 * 1000; // 12 godzin

// SYSTEM KOŁA FORTUNY (DAILY SPIN)
let lastSpinTime = parseInt(localStorage.getItem('petopia_last_spin')) || 0;
let isSpinning = false;
let spinTimerInterval = null;
let currentWheelRotation = 0;

// Pula nagród koła fortuny
const WHEEL_REWARDS = [
    { name: "Legendarne Jajko", type: "egg_legendary", val: "legendary", index: 0, chance: 0.1 },
    { name: "1000 Monet",        type: "coins",         val: 1000,         index: 1, chance: 8.4 },
    { name: "Rzadkie Jajko",     type: "egg_rare",      val: "rare",      index: 2, chance: 0.5 },
    { name: "250 Monet",         type: "coins",         val: 250,          index: 3, chance: 30.0 },
    { name: "+1 Refill Stack",   type: "refill_stack",  val: 1,            index: 4, chance: 1.0 },
    { name: "50 Monet",          type: "coins",         val: 50,           index: 5, chance: 60.0 }
];

let completedMissions = JSON.parse(localStorage.getItem('petopia_missions')) || [];

let isEggActive = localStorage.getItem('petopia_is_egg_active') === 'true';
let eggClicks = parseInt(localStorage.getItem('petopia_egg_clicks')) || 0;
const EGG_TARGET_CLICKS = 50;

let activePetId = localStorage.getItem('petopia_active_pet') || 'slime';
let userPets = JSON.parse(localStorage.getItem('petopia_user_pets')) || {
    slime: { level: 1, shards: 0, unlocked: true }
};

const TUTORIAL_TARGET = 10;
const EGG_PRICE = 100;

// Dynamic DOM References
let coinsDisplay, clicksDisplay, clickArea, mainImg, statusSubtitle, counterLabel, rewardModal, claimBtn, buyEggBtn, collectionGrid;
let energyText, energyBarFill;
let buyMaxEnergyBtn, buyRegenSpeedBtn;

// 3. FETCH LOADER (ŁADOWANIE WIDOKÓW)
async function loadViews() {
    try {
        const views = [
            { id: 'tab-home', file: 'views/home.html' },
            { id: 'tab-collection', file: 'views/pets.html' },
            { id: 'tab-upgrades', file: 'views/upgrades.html' },
            { id: 'tab-shop', file: 'views/shop.html' },
            { id: 'tab-missions', file: 'views/missions.html' }
        ];

        await Promise.all(views.map(async (view) => {
            const response = await fetch(view.file);
            const html = await response.text();
            const el = document.getElementById(view.id);
            if (el) el.innerHTML = html;
        }));

        bindDOMElements();
        setupEventListeners();
        initGame();
        initSpinWheel();
        startEnergyRegen();
        applyWheelStyles();

    } catch (err) {
        console.error("Błąd podczas ładowania widoków:", err);
    }
}

function applyWheelStyles() {
    if (document.getElementById('dynamic-wheel-styles')) return;
    const style = document.createElement('style');
    style.id = 'dynamic-wheel-styles';
    style.innerHTML = `
        .wheel-section, .wheel-label, .wheel span, .wheel div {
            font-size: 16px !important;
            font-weight: bold !important;
        }
    `;
    document.head.appendChild(style);
}

// 4. BIND ELEMENTS
function bindDOMElements() {
    coinsDisplay = document.getElementById('coins-display');
    clicksDisplay = document.getElementById('clicks');
    clickArea = document.getElementById('click-area') || document.getElementById('main-interactive-btn');
    mainImg = document.getElementById('main-img');
    statusSubtitle = document.getElementById('status-subtitle');
    counterLabel = document.getElementById('counter-label');
    rewardModal = document.getElementById('reward-modal');
    claimBtn = document.getElementById('claim-btn');
    buyEggBtn = document.getElementById('buy-egg-btn');
    collectionGrid = document.getElementById('collection-grid');

    energyText = document.getElementById('energy-text');
    energyBarFill = document.getElementById('energy-bar-fill');

    buyMaxEnergyBtn = document.getElementById('buy-max-energy-btn');
    buyRegenSpeedBtn = document.getElementById('buy-regen-speed-btn');
}

// 5. EVENT LISTENERS
function setupEventListeners() {
    if (clickArea) {
        clickArea.addEventListener('pointerdown', handleMainClick);
    }
    if (claimBtn) claimBtn.addEventListener('click', claimStarterPet);
    if (buyEggBtn) buyEggBtn.addEventListener('click', buyCommonEgg);

    if (buyMaxEnergyBtn) buyMaxEnergyBtn.addEventListener('click', buyMaxEnergyUpgrade);
    if (buyRegenSpeedBtn) buyRegenSpeedBtn.addEventListener('click', buyRegenSpeedUpgrade);

    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // === BLOKADA TUTORIALU ===
            // Jeśli gracz nie ma zwierzaka i klika inną zakładkę niż Home
            if (!hasPet && targetTab !== 'tab-home') {
                showToast("⚠️ Hatch your starter pet first!");
                triggerHaptic('error');
                return; // Przerywamy działanie, nie przełączamy zakładki
            }
            // =========================

            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) targetElement.classList.add('active');

            if (targetTab === 'tab-collection') {
                renderCollection();
            } else if (targetTab === 'tab-upgrades') {
                updateUpgradesUI();
            } else if (targetTab === 'tab-missions') {
                updateMissionsUI();
            }
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            calculateOfflineEnergy();
            checkRefillStacksRegen();
            checkOfflineEarnings();
        }
    });
}

function updateCoinsUI() {
    if (!coinsDisplay) return;
    const valSpan = document.getElementById('coins-value');
    if (valSpan) {
        valSpan.innerText = coins;
    } else {
        coinsDisplay.innerHTML = `<img src="img/coin.png" class="coin-icon" alt="Coin"> <span id="coins-value">${coins}</span>`;
    }
}

// 6. INIT GAME
function initGame() {
    calculateOfflineEnergy();
    checkRefillStacksRegen();
    checkOfflineEarnings();
    updateCoinsUI();
    updateEnergyUI();
    updateUpgradesUI();

    if (isEggActive) {
        showEggInMainArea();
    } else if (hasPet) {
        showActivePetInMainArea();
    } else if (isHatched) {
        showStarterReward();
    } else {
        if (clicksDisplay) {
            clicksDisplay.innerHTML = `${clicks} <span style="font-size: 0.8em; opacity: 0.6;">/ ${TUTORIAL_TARGET}</span>`;
        }
    }

    updateMissionsUI();
}

// 7. ENERGIA, IDLE ORAZ REGENERACJA
function calculateOfflineEnergy() {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastEnergyUpdate) / 1000);

    if (elapsedSeconds > 0 && energy < maxEnergy) {
        const energyGained = elapsedSeconds * energyRechargeRate;
        energy = Math.min(maxEnergy, energy + energyGained);
        
        localStorage.setItem('petopia_energy', energy);
        updateEnergyUI();
    }
    
    lastEnergyUpdate = now;
    localStorage.setItem('petopia_last_energy_update', lastEnergyUpdate);
}

function startEnergyRegen() {
    setInterval(() => {
        const now = Date.now();
        if (energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + energyRechargeRate);
            localStorage.setItem('petopia_energy', energy);
            updateEnergyUI();
        }
        lastEnergyUpdate = now;
        localStorage.setItem('petopia_last_energy_update', lastEnergyUpdate);
    }, 1000);
}

// SYSTEM IDLE: Obliczanie dochodu pasywnego ze wszystkich zwierzaków
function calculatePassiveIncomeRate() {
    let totalRatePerSecond = 0;
    
    // Jeśli gracz nie ma jeszcze aktywnego zwierzaka (np. klika pierwsze jajko), nie generuje jeszcze pasywnego dochodu
    if (!hasPet) return 0;
    
    Object.keys(userPets).forEach(petId => {
        const userData = userPets[petId];
        if (userData && userData.unlocked) {
            let clickPowerForPet = (petId === 'slime') ? 1 : Math.pow(2, userData.level);
            // Każdy odblokowany zwierzak daje pasywnie 20% swojej mocy kliknięcia na sekundę
            totalRatePerSecond += clickPowerForPet * 0.2;
        }
    });
    
    return totalRatePerSecond;
}

function checkOfflineEarnings() {
    const now = Date.now();
    const elapsedMs = now - lastActiveTime;
    const passiveCoinsPerSecond = calculatePassiveIncomeRate();

    if (passiveCoinsPerSecond > 0 && elapsedMs > 5000) {
        const maxOfflineMs = maxOfflineHours * 60 * 60 * 1000;
        const effectiveMs = Math.min(elapsedMs, maxOfflineMs);
        
        const elapsedSeconds = Math.floor(effectiveMs / 1000);
        const earnedCoins = Math.floor(elapsedSeconds * passiveCoinsPerSecond);

        if (earnedCoins > 0) {
            coins += earnedCoins;
            localStorage.setItem('petopia_coins', coins);
            updateCoinsUI();
            
            const hoursFormatted = (elapsedSeconds / 3600).toFixed(1);
            showToast(`💤 Offline! Zarobiłeś +${earnedCoins} ${COIN_ICON} w ciągu ${hoursFormatted}h.`);
        }
    }

    updateLastActiveTime();
}

function updateLastActiveTime() {
    lastActiveTime = Date.now();
    localStorage.setItem('petopia_last_active_time', lastActiveTime);
}

setInterval(updateLastActiveTime, 15000);

function checkRefillStacksRegen() {
    const now = Date.now();
    const elapsed = now - lastRefillRegenTime;

    if (elapsed >= REFILL_REGEN_TIME && fullRefillStacks < 2) {
        const stacksToAdd = Math.floor(elapsed / REFILL_REGEN_TIME);
        fullRefillStacks = Math.min(2, fullRefillStacks + stacksToAdd);
        lastRefillRegenTime = now;
        
        localStorage.setItem('petopia_refill_stacks', fullRefillStacks);
        localStorage.setItem('petopia_last_refill_regen', lastRefillRegenTime);
    }
}

function useFullRefillStack() {
    if (fullRefillStacks <= 0) {
        showToast("❌ Brak ładunków Full Refill!");
        return;
    }

    fullRefillStacks--;
    energy = maxEnergy;

    localStorage.setItem('petopia_refill_stacks', fullRefillStacks);
    localStorage.setItem('petopia_energy', energy);

    updateEnergyUI();
    showToast(`⚡ Energia uzupełniona! Pozostało: ${fullRefillStacks}`);
    triggerHaptic('success');
}

function updateEnergyUI() {
    if (energyText) energyText.innerText = `${energy} / ${maxEnergy}`;
    if (energyBarFill) {
        const percentage = (energy / maxEnergy) * 100;
        energyBarFill.style.width = `${percentage}%`;
    }
}

function getClickPower() {
    if (!hasPet) return 1;
    const petData = userPets[activePetId];
    if (!petData) return 1;
    if (activePetId === 'slime') return 1;

    return Math.pow(2, petData.level);
}

// 8. KLIKANIE
function handleMainClick(e) {
    if (e) e.preventDefault();

    if (energy <= 0) {
        showToast("⚡ Out of energy!");
        triggerHaptic('error');
        return;
    }

    energy--;
    lastEnergyUpdate = Date.now();
    localStorage.setItem('petopia_energy', energy);
    localStorage.setItem('petopia_last_energy_update', lastEnergyUpdate);
    updateEnergyUI();

    if (isEggActive) {
        eggClicks++;
        localStorage.setItem('petopia_egg_clicks', eggClicks);
        
        if (clicksDisplay) {
            clicksDisplay.innerHTML = `${eggClicks} <span style="font-size: 0.8em; opacity: 0.6;">/ ${EGG_TARGET_CLICKS}</span>`;
        }

        triggerHaptic('light');
        animateClick();

        if (eggClicks >= EGG_TARGET_CLICKS) {
            hatchShopEgg();
        }
        return;
    }

    if (hasPet) {
        const power = getClickPower();
        coins += power;
        clicks++;
        
        updateCoinsUI();
        localStorage.setItem('petopia_coins', coins);
        localStorage.setItem('petopia_clicks', clicks);

        triggerHaptic('light');
        animateClick();
        return;
    }

    if (isHatched) return;

    clicks++;
    localStorage.setItem('petopia_clicks', clicks);
    
    if (clicksDisplay) {
        clicksDisplay.innerHTML = `${clicks} <span style="font-size: 0.8em; opacity: 0.6;">/ ${TUTORIAL_TARGET}</span>`;
    }

    triggerHaptic('light');
    animateClick();

    if (clicks >= TUTORIAL_TARGET) {
        isHatched = true;
        localStorage.setItem('petopia_hatched', 'true');
        triggerHaptic('success');
        setTimeout(showStarterReward, 200);
    }
}

// 9. SKLEP I JAJKA
function buyCommonEgg() {
    if (isEggActive) {
        showToast("⚠️ You already have an egg to hatch!");
        switchTab('tab-home');
        return;
    }

    if (coins < EGG_PRICE) {
        showToast(`❌ Not enough coins! Need ${EGG_PRICE} ${COIN_ICON}`);
        return;
    }

    coins -= EGG_PRICE;
    localStorage.setItem('petopia_coins', coins);
    updateCoinsUI();

    isEggActive = true;
    eggClicks = 0;
    localStorage.setItem('petopia_is_egg_active', 'true');
    localStorage.setItem('petopia_egg_clicks', '0');

    showEggInMainArea();
    switchTab('tab-home');
    triggerHaptic('light');
    showToast("🥚 Egg purchased!");
}

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
        showToast(`🎉 Unlocked ${petData.name}!`);
    } else {
        const userPet = userPets[randomPetId];
        if (userPet.level >= 3) {
            coins += 50;
            localStorage.setItem('petopia_coins', coins);
            updateCoinsUI();
            showToast(`✨ Hatched ${petData.name} (MAX)! +50 ${COIN_ICON}`);
        } else {
            userPet.shards += 1;
            const requiredShards = userPet.level === 1 ? 3 : 5;

            if (userPet.shards >= requiredShards) {
                userPet.level += 1;
                userPet.shards = 0;
                showToast(`🚀 LEVEL UP! ${petData.name} Lvl ${userPet.level}!`);
            } else {
                showToast(`💎 Got 1 shard (${userPet.shards}/${requiredShards})`);
            }
        }
    }

    localStorage.setItem('petopia_user_pets', JSON.stringify(userPets));
    activePetId = randomPetId;
    localStorage.setItem('petopia_active_pet', activePetId);

    showActivePetInMainArea();
}

// 10. MISJE
function updateMissionsUI() {
    const m1Btn = document.getElementById('m1-btn');
    const m2Btn = document.getElementById('m2-btn');

    if (m1Btn) {
        if (completedMissions.includes(1)) {
            m1Btn.innerText = "DONE ✅";
            m1Btn.className = "claim-mission-btn disabled";
            m1Btn.onclick = null;
        } else if (hasPet) {
            m1Btn.innerText = "CLAIM";
            m1Btn.className = "claim-mission-btn";
            m1Btn.onclick = () => claimMissionReward(1, 50);
        } else {
            m1Btn.innerText = "LOCKED";
            m1Btn.className = "claim-mission-btn disabled";
            m1Btn.onclick = null;
        }
    }

    if (m2Btn) {
        if (completedMissions.includes(2)) {
            m2Btn.innerText = "DONE ✅";
            m2Btn.className = "claim-mission-btn disabled";
            m2Btn.onclick = null;
        } else if (clicks >= 50) {
            m2Btn.innerText = "CLAIM";
            m2Btn.className = "claim-mission-btn";
            m2Btn.onclick = () => claimMissionReward(2, 100);
        } else {
            m2Btn.innerText = `${clicks} / 50`;
            m2Btn.className = "claim-mission-btn disabled";
            m2Btn.onclick = null;
        }
    }
}

function claimMissionReward(missionId, rewardCoins) {
    if (completedMissions.includes(missionId)) return;

    coins += rewardCoins;
    completedMissions.push(missionId);

    localStorage.setItem('petopia_coins', coins);
    localStorage.setItem('petopia_missions', JSON.stringify(completedMissions));

    updateCoinsUI();
    updateMissionsUI();
    triggerHaptic('success');
    showToast(`🎉 Mission completed! +${rewardCoins} ${COIN_ICON}`);
}

// 11. WIDOK GŁÓWNY
function showEggInMainArea() {
    if (mainImg) mainImg.src = 'img/eggs/egg.png';
    if (statusSubtitle) statusSubtitle.innerText = 'Tap to hatch your Common Egg!';
    if (counterLabel) counterLabel.innerText = 'HATCHING PROGRESS';
    
    if (clicksDisplay) {
        clicksDisplay.innerHTML = `${eggClicks} <span style="font-size: 0.8em; opacity: 0.6;">/ ${EGG_TARGET_CLICKS}</span>`;
    }
}

function showActivePetInMainArea() {
    const currentPet = PETS_DATABASE[activePetId] || PETS_DATABASE.slime;
    if (mainImg) mainImg.src = currentPet.img;

    const petInfo = userPets[activePetId];
    const levelText = activePetId === 'slime' ? 'MAX' : `Lvl ${petInfo ? petInfo.level : 1}`;

    if (statusSubtitle) statusSubtitle.innerText = `Active: ${currentPet.name}`;
    if (counterLabel) counterLabel.innerText = `${currentPet.name} (${levelText})`;
    
    if (clicksDisplay) {
        clicksDisplay.innerHTML = `+${getClickPower()} <span style="font-size: 0.85em; opacity: 0.8;">${COIN_ICON} / tap</span>`;
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
    updateMissionsUI();
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

// 12. KOLEKCJA
function renderCollection() {
    if (!collectionGrid) return;
    
    // Szukamy kontenera zakładki, aby wstrzyknąć element z łącznym podsumowaniem dochodu u góry
    const collectionTab = document.getElementById('tab-collection');
    if (collectionTab) {
        let summaryBox = document.getElementById('total-passive-summary');
        const totalPerSec = calculatePassiveIncomeRate();
        const totalPerMin = (totalPerSec * 60).toFixed(1);
        const totalPerHour = (totalPerSec * 3600).toFixed(0);

        if (!summaryBox) {
            summaryBox = document.createElement('div');
            summaryBox.id = 'total-passive-summary';
            summaryBox.style.cssText = `
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 12px;
                padding: 10px 15px;
                margin-bottom: 15px;
                text-align: center;
                font-size: 0.9em;
                color: #fff;
            `;
            collectionTab.prepend(summaryBox);
        }

        summaryBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 2px; color: #ffd700;">💤 Total Passive Income</div>
            <div><b>+${totalPerSec.toFixed(1)}</b> ${COIN_ICON}/s &nbsp;|&nbsp; <b>+${totalPerMin}</b> /min &nbsp;|&nbsp; <b>+${totalPerHour}</b> /h</div>
        `;
    }

    collectionGrid.innerHTML = '';

    Object.keys(PETS_DATABASE).forEach(petId => {
        const pet = PETS_DATABASE[petId];
        const userData = userPets[petId];
        
        // POPRAWKA: Slime jest uznawany za odblokowany tylko wtedy, gdy gracz odebrał już nagrodę startową (hasPet)
        let isUnlocked = userData && userData.unlocked;
        if (petId === 'slime' && !hasPet) {
            isUnlocked = false;
        }

        const isActive = activePetId === petId && !isEggActive && hasPet;

        const card = document.createElement('div');
        card.className = `pet-card ${isUnlocked ? '' : 'locked'}`;

        let statusHTML = '';
        let idleRateHTML = '';

        if (petId === 'slime') {
            statusHTML = `<span class="badge-max">${isUnlocked ? 'MAX LEVEL' : 'Locked'}</span>`;
            const idlePerSec = isUnlocked ? (1 * 0.2).toFixed(1) : '0.0';
            idleRateHTML = `<div class="pet-idle-rate" style="font-size: 0.8em; color: ${isUnlocked ? '#ffd700' : 'inherit'}; opacity: ${isUnlocked ? '1' : '0.4'}; margin: 4px 0;">💤 +${idlePerSec} ${COIN_ICON}/s</div>`;
        } else if (isUnlocked) {
            const reqShards = userData.level === 1 ? 3 : 5;
            const shardText = userData.level >= 3 ? 'MAX' : `${userData.shards}/${reqShards} Shards`;
            statusHTML = `<div class="pet-level">Lvl ${userData.level}</div><div class="pet-shards">${shardText}</div>`;
            
            const clickPower = Math.pow(2, userData.level);
            const idlePerSec = (clickPower * 0.2).toFixed(1);
            idleRateHTML = `<div class="pet-idle-rate" style="font-size: 0.8em; color: #ffd700; margin: 4px 0;">💤 +${idlePerSec} ${COIN_ICON}/s</div>`;
        } else {
            statusHTML = `<div class="pet-locked-text">Locked</div>`;
            idleRateHTML = `<div class="pet-idle-rate" style="font-size: 0.8em; opacity: 0.4; margin: 4px 0;">💤 +0.0 ${COIN_ICON}/s</div>`;
        }

        const equipBtnHTML = isUnlocked ? 
            `<button class="equip-btn ${isActive ? 'active' : ''}" onclick="equipPet('${petId}')">${isActive ? 'EQUIPPED' : 'EQUIP'}</button>` : '';

        card.innerHTML = `
            <img src="${pet.img}" alt="${pet.name}" style="${isUnlocked ? '' : 'filter: grayscale(1); opacity: 0.4;'}">
            <div class="pet-card-name">${pet.name}</div>
            ${statusHTML}
            ${idleRateHTML}
            ${equipBtnHTML}
        `;

        collectionGrid.appendChild(card);
    });
}

window.equipPet = function(petId) {
    if (!userPets[petId] || !userPets[petId].unlocked) return;
    if (isEggActive) {
        showToast("⚠️ Hatch your egg first!");
        return;
    }
    activePetId = petId;
    localStorage.setItem('petopia_active_pet', activePetId);
    showActivePetInMainArea();
    renderCollection();
    triggerHaptic('light');
};

// 13. ULEPSZENIA
function getMaxEnergyCost() {
    const level = (maxEnergy - 1000) / 200;
    return Math.floor(150 * Math.pow(1.8, level));
}

function getRegenSpeedCost() {
    const level = energyRechargeRate - 1;
    return Math.floor(200 * Math.pow(2.2, level));
}

function updateUpgradesUI() {
    const maxEnergyCost = getMaxEnergyCost();
    const regenCost = getRegenSpeedCost();

    const costMaxEl = document.getElementById('cost-max-energy');
    const statsMaxEl = document.getElementById('upgrade-max-energy-stats');
    if (costMaxEl) costMaxEl.innerText = maxEnergyCost;
    if (statsMaxEl) statsMaxEl.innerText = `+200 ⚡ (Current: ${maxEnergy})`;

    const costRegenEl = document.getElementById('cost-regen-speed');
    const statsRegenEl = document.getElementById('upgrade-regen-rate-stats');
    if (costRegenEl) costRegenEl.innerText = regenCost;
    if (statsRegenEl) statsRegenEl.innerText = `+1 ⚡/s (Current: ${energyRechargeRate}/s)`;
}

function buyMaxEnergyUpgrade() {
    const cost = getMaxEnergyCost();
    if (coins < cost) {
        showToast(`❌ Need ${cost} ${COIN_ICON}`);
        return;
    }

    coins -= cost;
    maxEnergy += 200;
    energy += 200;

    localStorage.setItem('petopia_coins', coins);
    localStorage.setItem('petopia_max_energy', maxEnergy);
    localStorage.setItem('petopia_energy', energy);

    updateCoinsUI();
    updateEnergyUI();
    updateUpgradesUI();
    triggerHaptic('success');
    showToast(`⚡ Max Energy increased to ${maxEnergy}!`);
}

function buyRegenSpeedUpgrade() {
    const cost = getRegenSpeedCost();
    if (coins < cost) {
        showToast(`❌ Need ${cost} ${COIN_ICON}`);
        return;
    }

    coins -= cost;
    energyRechargeRate += 1;

    localStorage.setItem('petopia_coins', coins);
    localStorage.setItem('petopia_energy_rate', energyRechargeRate);

    updateCoinsUI();
    updateUpgradesUI();
    triggerHaptic('success');
    showToast(`🚀 Recharge rate is now ${energyRechargeRate} ⚡/sec!`);
}

// 14. KOŁO FORTUNY
function initSpinWheel() {
    document.addEventListener('click', (e) => {
        const spinBadgeBtn = e.target.closest('#spin-badge-btn');
        const closeSpinBtn = e.target.closest('#close-spin-btn');
        const spinBtn = e.target.closest('#spin-btn');
        const spinModal = document.getElementById('spin-modal');

        if (spinBadgeBtn) {
            // === BLOKADA TUTORIALU DLA KOŁA FORTUNY ===
            if (!hasPet) {
                showToast("⚠️ Hatch your starter pet first!");
                triggerHaptic('error');
                return;
            }
            // ==========================================

            if (spinModal) spinModal.style.display = 'flex';
            checkSpinAvailability();
            return;
        }

        if (closeSpinBtn) {
            if (spinModal) spinModal.style.display = 'none';
            return;
        }

        if (spinBtn) {
            startSpin();
            return;
        }
    });

    startBadgeTimer();
}

function startBadgeTimer() {
    if (spinTimerInterval) clearInterval(spinTimerInterval);
    updateBadgeTimerUI();
    spinTimerInterval = setInterval(updateBadgeTimerUI, 1000);
}

function updateBadgeTimerUI() {
    const spinBadgeBtn = document.getElementById('spin-badge-btn');
    const badgeTimerText = document.getElementById('spin-badge-timer');
    const spinBtn = document.getElementById('spin-btn');
    const modalTimerText = document.getElementById('spin-timer-text');

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const timePassed = now - lastSpinTime;

    if (timePassed < cooldown) {
        const timeLeft = cooldown - timePassed;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (badgeTimerText) badgeTimerText.innerText = formattedTime;
        if (spinBadgeBtn) spinBadgeBtn.classList.add('disabled');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerText = "LOCKED";
        }
        if (modalTimerText) modalTimerText.innerText = `Next spin in: ${formattedTime}`;
    } else {
        if (badgeTimerText) badgeTimerText.innerText = "READY!";
        if (spinBadgeBtn) spinBadgeBtn.classList.remove('disabled');
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerText = "SPIN!";
        }
        if (modalTimerText) modalTimerText.innerText = "Spin the wheel for free rewards!";
    }
}

function getRandomWeightedReward() {
    const random = Math.random() * 100;
    let cumulativeChance = 0;

    for (const reward of WHEEL_REWARDS) {
        cumulativeChance += reward.chance;
        if (random <= cumulativeChance) {
            return reward;
        }
    }
    return WHEEL_REWARDS[WHEEL_REWARDS.length - 1];
}

function startSpin() {
    if (isSpinning) return;
    
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    if (now - lastSpinTime < cooldown) {
        showToast("⏳ Wheel is locked!");
        return;
    }

    const spinBtn = document.getElementById('spin-btn');
    const wheel = document.getElementById('wheel');

    isSpinning = true;
    if (spinBtn) spinBtn.disabled = true;

    const selectedReward = getRandomWeightedReward();

    const sliceAngle = 60;
    const targetCenterAngle = (selectedReward.index * sliceAngle) + (sliceAngle / 2);
    
    const extraRounds = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetDeg = 360 - targetCenterAngle;
    
    currentWheelRotation += extraRounds + (targetDeg - (currentWheelRotation % 360) + 360) % 360;

    if (wheel) {
        wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)';
        wheel.style.transform = `rotate(${currentWheelRotation}deg)`;
    }

    triggerHaptic('light');

    setTimeout(() => {
        isSpinning = false;
        lastSpinTime = Date.now();
        localStorage.setItem('petopia_last_spin', lastSpinTime);

        applySpinReward(selectedReward);
        updateBadgeTimerUI();
    }, 4000);
}

function applySpinReward(reward) {
    if (reward.type === "coins") {
        coins += reward.val;
        localStorage.setItem('petopia_coins', coins);
        updateCoinsUI();
        showToast(`🎉 Won ${reward.val} ${COIN_ICON}!`);

    } else if (reward.type === "refill_stack") {
        fullRefillStacks += 1;
        localStorage.setItem('petopia_refill_stacks', fullRefillStacks);
        showToast(`⚡ Won +1 Full Refill Stack! (${fullRefillStacks}/2)`);

    } else if (reward.type === "egg_rare" || reward.type === "egg_legendary") {
        const name = reward.type === "egg_rare" ? "Rare Egg 🥚" : "Legendary Egg 🌟";
        isEggActive = true;
        eggClicks = 0;
        localStorage.setItem('petopia_is_egg_active', 'true');
        localStorage.setItem('petopia_egg_clicks', '0');
        localStorage.setItem('petopia_active_egg_type', reward.val);

        showEggInMainArea();
        showToast(`🎁 Amazing! Won ${name}!`);
    }

    triggerHaptic('success');
}

function checkSpinAvailability() {
    updateBadgeTimerUI();
}

// 15. EFEKTY I POMOCNICZE
function animateClick() {
    if (!mainImg) return;
    const randomDegree = (Math.random() - 0.5) * 16;
    mainImg.style.transform = `rotate(${randomDegree}deg) scale(0.95)`;
    setTimeout(() => {
        mainImg.style.transform = 'rotate(0deg) scale(1)';
    }, 80);
}

function triggerHaptic(type = 'light') {
    if (tg && tg.HapticFeedback) {
        if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else tg.HapticFeedback.impactOccurred('light');
    }
}

function showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// RUN
loadViews();
