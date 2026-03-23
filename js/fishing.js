// ─── Fishing System ───────────────────────────────────────────────────────────
class FishingSystem {
    constructor(scene, camera) {
        this.scene  = scene;
        this.camera = camera;

        // States: idle | charging | waiting | biting | reeling
        this.state = 'idle';

        this.castPower    = 0;
        this.biteTimer    = 0;
        this.biteWindow   = 0;  // seconds before fish escapes
        this.tension      = 50; // 0–100
        this.reelProgress = 0;  // 0–100
        this.currentFish  = null;

        // Tension safe zone
        this.safeMin = 28;
        this.safeMax = 72;

        this.keys = {};
        this._prevQ = false;
        this._prevSpace = false;

        this._buildRod();
        this._buildBobber();
        this._buildLine();
        this._setupInput();
    }

    // ── Input ────────────────────────────────────────────────────────────────
    _setupInput() {
        document.addEventListener('keydown', e => {
            if (e.repeat) return;
            this.keys[e.code] = true;
        });
        document.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    // ── Build visuals ────────────────────────────────────────────────────────
    _buildRod() {
        const g = new THREE.Group();

        const rodColor = GameState.equipment.rod === 'stealth' ? 0x111111
                       : GameState.equipment.rod === 'carbon'  ? 0x222222
                       : 0x4a3020;

        // Shaft
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.032, 1.85, 6),
            new THREE.MeshLambertMaterial({ color: rodColor })
        );
        shaft.rotation.z = Math.PI / 14;
        shaft.position.set(0, 0.05, 0);
        g.add(shaft);

        // Reel
        const reel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.048, 0.048, 0.12, 10),
            new THREE.MeshLambertMaterial({ color: 0xcc3311 })
        );
        reel.position.set(0.01, -0.16, 0.04);
        reel.rotation.z = Math.PI / 2;
        g.add(reel);

        // Hands hint mesh
        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.1, 0.3),
            new THREE.MeshLambertMaterial({ color: 0xcc9966 })
        );
        hand.position.set(0, -0.38, 0.12);
        g.add(hand);

        this.rod = g;
        this.scene.add(g);
    }

    _buildBobber() {
        const g = new THREE.Group();

        const top = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0xff3300 })
        );
        const bot = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        g.add(top); g.add(bot);

        // Antenna
        const ant = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
        );
        ant.position.y = 0.16;
        g.add(ant);

        g.visible = false;
        this.bobber = g;
        this.scene.add(g);
    }

    _buildLine() {
        const geo = new THREE.BufferGeometry();
        const buf = new Float32Array(6);
        geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
        this.line = new THREE.Line(geo,
            new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.55 }));
        this.line.visible = false;
        this.scene.add(this.line);
    }

    // ── Update ───────────────────────────────────────────────────────────────
    update(dt) {
        if (GameState.phase !== 'playing') return;

        // Edge-detect Q
        const qDown = !!this.keys['KeyQ'];
        const spaceDown = !!this.keys['Space'];

        if (qDown && !this._prevQ) this._onQPress();
        if (!qDown && this._prevQ) this._onQRelease();
        this._prevQ = qDown;

        // Rod follows camera
        this._followCamera();

        switch (this.state) {
            case 'charging':
                this.castPower = Math.min(1, this.castPower + dt * 0.9);
                UI.updateCastBar(this.castPower);
                break;

            case 'waiting':
                this._updateLine();
                this.biteTimer -= dt;
                if (this.biteTimer <= 0) {
                    this.state = 'biting';
                    this.biteWindow = 5;
                    UI.showBiteAlert();
                }
                break;

            case 'biting':
                this._updateLine();
                this._bobberDance(dt);
                this.biteWindow -= dt;
                if (qDown && !this._prevQ) { /* handled by onQPress */ }
                if (this.biteWindow <= 0) {
                    this._fishEscape(Lang.t('fish_miss'));
                }
                break;

            case 'reeling':
                this._updateLine();
                this._updateReel(dt, spaceDown);
                break;
        }

        this._prevSpace = spaceDown;
    }

    _onQPress() {
        if (this.state === 'idle') {
            this.state = 'charging';
            this.castPower = 0;
        } else if (this.state === 'biting') {
            this._startReel();
        }
    }

    _onQRelease() {
        if (this.state === 'charging') this._cast();
    }

    _cast() {
        UI.hideCastUI();
        this.state = 'waiting';

        // Landing point
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const dist = 6 + this.castPower * 22;
        this.bobber.position.copy(this.camera.position).addScaledVector(dir, dist);
        this.bobber.position.y = -0.06;

        // Clamp to lake (can cast outside but fish only bite in lake)
        this.bobber.visible = true;
        this.line.visible   = true;

        // Pick fish
        this.currentFish = FishData.getRandom(1);
        const d = this.currentFish.biteDelay;
        this.biteTimer = d[0] + Math.random() * (d[1] - d[0]);

        UI.showMessage(Lang.t('cast_waiting'), 2, '#aaffaa');
    }

    _startReel() {
        this.state = 'reeling';
        this.tension = 50;
        this.reelProgress = 0;
        UI.hideBiteAlert();
        UI.showTensionUI();
    }

    _updateReel(dt, spaceDown) {
        const fish = this.currentFish;

        // Tension random walk + reel
        this.tension += (Math.random() - 0.48) * fish.tensionSpeed * 65 * dt;
        if (spaceDown) {
            this.tension      += 16 * dt;
            this.reelProgress += 9 * dt;
            // Noise while reeling
            GameState.noiseLevel = Math.max(GameState.noiseLevel, fish.noiseOnCatch * 0.55);
        } else {
            this.tension -= 9 * dt;
        }

        this.tension      = Math.max(0, Math.min(100, this.tension));
        this.reelProgress = Math.max(0, Math.min(100, this.reelProgress));

        UI.updateTensionBar(this.tension, this.safeMin, this.safeMax);
        UI.updateReelProgress(this.reelProgress);

        // Big noise near catch
        if (this.reelProgress > 65) {
            GameState.noiseLevel = Math.max(GameState.noiseLevel, fish.noiseOnCatch);
        }

        if (this.tension < 5) {
            this._fishEscape(Lang.t('fish_escape_loose'));
        } else if (this.tension > 95) {
            this._fishEscape(Lang.t('fish_escape_break'));
        } else if (this.reelProgress >= 100) {
            this._catchFish();
        }
    }

    _catchFish() {
        const fish = this.currentFish;
        GameState.addFish(fish);
        GameState.noiseLevel = Math.max(GameState.noiseLevel, fish.noiseOnCatch);

        this.state = 'idle';
        this._clearLine();
        UI.hideTensionUI();
        UI.showCatchMessage(fish);
        UI.updateFishCount();
    }

    _fishEscape(msg) {
        this.state = 'idle';
        this._clearLine();
        UI.hideTensionUI();
        UI.hideBiteAlert();
        UI.showMessage(msg, 2, '#ff8888');
    }

    _clearLine() {
        if (this.bobber) this.bobber.visible = false;
        if (this.line)   this.line.visible = false;
    }

    _bobberDance(dt) {
        this.bobber.position.y = -0.06 + Math.sin(Date.now() * 0.009) * 0.065;
    }

    _followCamera() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();

        this.rod.position.copy(this.camera.position)
            .addScaledVector(dir, 0.46)
            .addScaledVector(right, 0.19)
            .add(new THREE.Vector3(0, -0.28, 0));

        this.rod.rotation.order = 'YXZ';
        this.rod.rotation.y = this.camera.rotation.y;
        this.rod.rotation.x = this.camera.rotation.x - 0.28;
    }

    _updateLine() {
        if (!this.line || !this.bobber) return;
        const tip = this.rod.position.clone().add(new THREE.Vector3(0, 0.65, 0));
        const pos = this.line.geometry.attributes.position;
        pos.setXYZ(0, tip.x, tip.y, tip.z);
        pos.setXYZ(1, this.bobber.position.x, this.bobber.position.y + 0.08, this.bobber.position.z);
        pos.needsUpdate = true;
    }

    cancel() {
        this.state = 'idle';
        this._clearLine();
        UI.hideTensionUI();
        UI.hideCastUI();
        UI.hideBiteAlert();
    }
}
