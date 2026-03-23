// ─── Main Entry Point & Game Loop ────────────────────────────────────────────
let renderer, scene, camera, clock;
let world, player, fishing, npcs;

// Fish positions for radar (static per night)
let radarFishPositions = [];

const Game = {
    phase: 'menu',  // menu | playing | caught | complete | shop

    init() {
        // Three.js core
        scene    = new THREE.Scene();
        camera   = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 800);
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        renderer.setSize(innerWidth, innerHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        clock = new THREE.Clock();

        // Resize
        window.addEventListener('resize', () => {
            camera.aspect = innerWidth / innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(innerWidth, innerHeight);
        });

        // Init UI
        UI.init();

        // Build world (once)
        world = new World(scene);

        // Button bindings
        document.getElementById('btn-start').addEventListener('click', () => this.startNight());

        document.getElementById('btn-retry').addEventListener('click', () => {
            UI.hideScreen('screen-caught');
            this.startNight();
        });

        document.getElementById('btn-shop').addEventListener('click', () => {
            UI.hideScreen('screen-complete');
            const earned = GameState.sellAllFish();
            UI.updateMoney();
            UI.buildShop();
            UI.showScreen('screen-shop');
            this.phase = 'shop';
        });

        document.getElementById('btn-new-night').addEventListener('click', () => {
            UI.hideScreen('screen-shop');
            this.startNight();
        });

        // ESC → end night (exit pointer lock first, second press ends night)
        document.addEventListener('keydown', e => {
            if (e.code !== 'Escape') return;
            if (this.phase !== 'playing') return;
            if (document.pointerLockElement) {
                document.exitPointerLock();
            } else {
                this.endNight();
            }
        });

        // Click to lock pointer (during playing)
        document.addEventListener('click', () => {
            if (this.phase === 'playing' && !document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });

        this._loop();
    },

    startNight() {
        GameState.resetNight();
        this.phase = 'playing';

        // Init / reset player
        if (!player) {
            player = new Player(camera, scene);
        } else {
            player.pos.set(0, 0, 34);
            player.yaw = 0; player.pitch = 0;
            player.hiding = false; player.crouching = false;
        }

        // Init / reset fishing
        if (!fishing) {
            fishing = new FishingSystem(scene, camera);
        } else {
            fishing.cancel();
        }

        // Init NPCs (recreate for fresh patrol)
        if (npcs) {
            for (const npc of npcs.npcs) { scene.remove(npc.mesh); }
        }
        npcs = new NPCSystem(scene, world);

        // Generate fish positions for radar
        radarFishPositions = [];
        for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = 5 + Math.random() * 23;
            radarFishPositions.push({
                x: Math.cos(a) * d, z: Math.sin(a) * d,
                rare: Math.random() < 0.07
            });
        }

        // Show/hide screens
        UI.hideScreen('screen-menu');
        UI.updateMoney();
        UI.updateFishCount();

        setTimeout(() => document.body.requestPointerLock(), 150);
        UI.showMessage(Lang.t('night_start'), 3, '#aaffaa');
    },

    endNight() {
        this.phase = 'complete';
        if (document.pointerLockElement) document.exitPointerLock();
        if (fishing) fishing.cancel();

        UI.buildEarnings();
        UI.showScreen('screen-complete');
    },

    playerCaught() {
        this.phase = 'caught';
        if (document.pointerLockElement) document.exitPointerLock();
        if (fishing) fishing.cancel();

        UI.flash('rgba(255,0,0,0.55)', 900);

        const fishLost = GameState.inventory.length;
        const moneyBefore = GameState.money;
        GameState.penalise();
        const fine = moneyBefore - GameState.money;

        document.getElementById('caught-fine-msg').textContent =
            Lang.t('caught_fine', { fish: fishLost, fine });

        setTimeout(() => {
            UI.updateMoney();
            UI.updateFishCount();
            UI.showScreen('screen-caught');
        }, 700);
    },

    // ── Loop ─────────────────────────────────────────────────────────────────
    _loop() {
        requestAnimationFrame(() => this._loop());
        const dt = Math.min(clock.getDelta(), 0.1);

        if (this.phase === 'playing') {
            this._tick(dt);
        }

        renderer.render(scene, camera);
    },

    _tick(dt) {
        world.update(dt);
        player.update(dt, world);
        fishing.update(dt);

        const eyePos = player.eyePos();
        const caught = npcs.update(dt, eyePos, GameState.noiseLevel, GameState.isHiding);

        if (caught) {
            this.playerCaught();
            return;
        }

        // Natural noise decay
        GameState.noiseLevel = Math.max(0, GameState.noiseLevel - 60 * dt);

        this._updateUI();
    },

    _updateUI() {
        const fish = GameState.extras.includes('night_vision') ? radarFishPositions : [];
        UI.updateRadar(player.pos, player.yaw, npcs.getFlashlightData(), fish);
        UI.updateAlertMeter(GameState.alertLevel);
        UI.updateMoney();
        UI.updateHeartbeat(GameState.alertLevel);

        // Fishing state UI
        if (fishing.state !== 'charging')  UI.hideCastUI();
        if (fishing.state !== 'reeling')   UI.hideTensionUI();

        // Bite timer hint in waiting
        if (fishing.state === 'biting') {
            UI.showBiteAlert();
        }

        // Hide indicator
        if (GameState.isHiding) {
            UI.showHideIndicator();
        } else {
            UI.hideHideIndicator();
        }
    }
};

window.addEventListener('load', () => Game.init());
