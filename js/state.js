// ─── Global Game State ───────────────────────────────────────────────────────
const GameState = {
    // Economy
    money: 500,

    // Inventory (fish caught this night)
    inventory: [],

    // Equipment
    equipment: {
        rod: 'basic',   // basic | carbon | stealth
        bait: 'natural' // natural | silent | dragon
    },

    // Consumables
    consumables: {
        bait: { natural: 99, silent: 0, dragon: 0 },
        flashbang: 0
    },

    // Extras owned
    extras: [], // 'mosquito' | 'flashbang' | 'night_vision'

    // Runtime
    phase: 'menu', // menu | playing | caught | complete | shop
    alertLevel: 0,   // 0–100
    noiseLevel: 0,   // 0–100, current frame noise radius

    isHiding: false,
    isCrouching: false,

    // Night stats
    nightFishCaught: 0,

    // ── Methods ──────────────────────────────────────────────────────────────

    addMoney(n) { this.money += n; },
    spendMoney(n) { this.money = Math.max(0, this.money - n); },

    addFish(fish) {
        this.inventory.push({ ...fish });
        this.nightFishCaught++;
    },

    sellAllFish() {
        const total = this.inventory.reduce((s, f) => s + f.value, 0);
        this.money += total;
        this.inventory = [];
        return total;
    },

    penalise() {
        // Lose all fish + 50% money fine
        this.inventory = [];
        this.money = Math.floor(this.money * 0.5);
    },

    resetNight() {
        this.alertLevel = 0;
        this.noiseLevel = 0;
        this.isHiding = false;
        this.isCrouching = false;
        this.nightFishCaught = 0;
        this.phase = 'playing';
    }
};
