// ─── NPC System ───────────────────────────────────────────────────────────────
class NPCSystem {
    constructor(scene, world) {
        this.npcs = [];
        this._spawn(scene);
    }

    _spawn(scene) {
        // Patrol route around the lake
        const wp = [
            [36, 0], [26, -26], [0, -36], [-26, -26],
            [-36, 0], [-26, 26], [0, 36], [26, 26]
        ].map(([x, z]) => new THREE.Vector3(x, 0, z));

        this.npcs.push(new Guard(scene, wp, { speed: 2.6, flashRange: 22, flashAngle: Math.PI / 5.5 }));
    }

    update(dt, playerEyePos, playerNoise, playerHiding) {
        let maxAlert = 0;
        for (const npc of this.npcs) {
            npc.update(dt, playerEyePos, playerNoise, playerHiding);
            maxAlert = Math.max(maxAlert, npc.alertContrib);
        }

        // If any guard fully alerted → caught immediately
        if (maxAlert >= 100) {
            GameState.alertLevel = 100;
            return true;
        }

        // Smooth global alert bar toward current max
        GameState.alertLevel += (maxAlert - GameState.alertLevel) * 0.06;
        GameState.alertLevel = Math.max(0, Math.min(99.9, GameState.alertLevel));
        return false;
    }

    getFlashlightData() {
        return this.npcs.map(n => ({
            position:  n.mesh.position.clone(),
            direction: n.facing.clone(),
            range:     n.flashRange,
            angle:     n.flashAngle
        }));
    }
}

// ─── Individual Guard ────────────────────────────────────────────────────────
class Guard {
    constructor(scene, waypoints, cfg) {
        this.scene     = scene;
        this.waypoints = waypoints;
        this.wpIdx     = 0;

        this.speed      = cfg.speed      || 2.5;
        this.flashRange = cfg.flashRange || 20;
        this.flashAngle = cfg.flashAngle || Math.PI / 6;
        this.hearRange  = 16;

        this.state         = 'patrol'; // patrol | investigate | chase
        this.alertContrib  = 0;
        this.investTarget  = new THREE.Vector3();
        this.investTimer   = 0;

        this.facing = new THREE.Vector3(1, 0, 0);

        this._buildMesh(scene);
        this._buildFlashlight();
        this.mesh.position.copy(waypoints[0]);
    }

    _buildMesh(scene) {
        const g = new THREE.Group();
        const M = (color, flat) => flat
            ? new THREE.MeshBasicMaterial({ color })
            : new THREE.MeshLambertMaterial({ color });

        // ── Palette ───────────────────────────────────────────────────
        const SKIN    = 0xc8845a;
        const UNIFORM = 0x2e4a2e;  // dark green jacket
        const PANTS   = 0x1e3018;  // darker pants
        const BOOT    = 0x16120a;  // near-black boots
        const BELT    = 0x3a2810;  // dark brown belt
        const CAP     = 0x141f14;  // dark cap
        const HAIR    = 0x160e06;

        // ── Helper ────────────────────────────────────────────────────
        const cyl  = (rt, rb, h, seg, col) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(col));
        const sph  = (r, ws, hs, col)      => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), M(col));
        const box  = (w, h, d, col)        => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(col));

        const add = (mesh, x, y, z, sx, sy, sz) => {
            mesh.position.set(x, y, z);
            if (sx !== undefined) mesh.scale.set(sx, sy, sz);
            g.add(mesh); return mesh;
        };

        // ── Boots ─────────────────────────────────────────────────────
        for (const s of [-1, 1]) {
            const ox = s * 0.105;
            add(box(0.17, 0.13, 0.30, BOOT), ox, 0.065, 0.02);      // sole+upper
            add(cyl(0.085, 0.092, 0.14, 8, BOOT), ox, 0.19, 0);     // ankle
        }

        // ── Legs ──────────────────────────────────────────────────────
        for (const s of [-1, 1]) {
            const ox = s * 0.105;
            add(cyl(0.082, 0.090, 0.38, 8, PANTS), ox, 0.46, 0);    // shin
            add(sph(0.092, 8, 7, PANTS), ox, 0.655, 0);              // knee
            add(cyl(0.110, 0.088, 0.36, 8, PANTS), ox, 0.84, 0);    // thigh
        }

        // ── Hips / waist ──────────────────────────────────────────────
        add(cyl(0.215, 0.200, 0.20, 9, PANTS),   0, 1.03, 0);
        add(cyl(0.220, 0.215, 0.055, 9, BELT),   0, 1.145, 0);      // belt
        // Belt buckle
        add(box(0.07, 0.05, 0.04, 0xbbaa55),     0, 1.145, -0.22);

        // ── Torso ─────────────────────────────────────────────────────
        add(cyl(0.235, 0.218, 0.50, 9, UNIFORM), 0, 1.40, 0);       // abdomen→chest
        // Chest bulge
        const chest = sph(0.245, 9, 7, UNIFORM);
        chest.scale.set(1, 0.62, 0.88);
        add(chest, 0, 1.60, 0);

        // Jacket details — centre seam
        add(box(0.025, 0.46, 0.02, 0x263d26), 0, 1.40, -0.235);

        // ── Shoulders & Arms ──────────────────────────────────────────
        for (const s of [-1, 1]) {
            const ox = s * 0.29;

            // Epaulet
            add(box(0.13, 0.055, 0.15, UNIFORM), ox, 1.68, 0);

            // Shoulder cap
            const shCap = sph(0.135, 8, 7, UNIFORM);
            shCap.scale.set(1, 0.80, 1);
            add(shCap, ox, 1.665, 0);

            // Upper arm
            add(cyl(0.082, 0.075, 0.36, 8, UNIFORM), ox, 1.46, 0);

            // Elbow
            add(sph(0.078, 7, 6, UNIFORM), ox, 1.27, 0);

            // Forearm (slight angle forward)
            const fa = cyl(0.068, 0.062, 0.33, 8, UNIFORM);
            fa.rotation.x = s * 0.07;
            add(fa, ox, 1.09, s * 0.02);

            // Hand
            const hand = sph(0.072, 8, 7, SKIN);
            hand.scale.set(0.85, 0.90, 1.05);
            add(hand, ox, 0.90, 0);

            // Fingers hint (flattened box)
            add(box(0.10, 0.045, 0.08, SKIN), ox, 0.858, -0.02);
        }

        // ── Neck ──────────────────────────────────────────────────────
        add(cyl(0.088, 0.098, 0.17, 8, SKIN), 0, 1.775, 0);

        // ── Head ──────────────────────────────────────────────────────
        const skull = sph(0.185, 12, 10, SKIN);
        skull.scale.set(1, 1.05, 0.92);
        add(skull, 0, 1.965, 0);

        // Jaw / lower face (slightly wider, lower)
        const jaw = sph(0.155, 10, 8, SKIN);
        jaw.scale.set(0.98, 0.62, 0.88);
        add(jaw, 0, 1.865, 0.045);

        // Ears
        for (const s of [-1, 1]) {
            const ear = sph(0.048, 6, 5, SKIN);
            ear.scale.set(0.45, 0.75, 0.9);
            add(ear, s * 0.185, 1.965, 0);
        }

        // Eyes (white + pupil)
        for (const s of [-1, 1]) {
            const eyeW = sph(0.030, 7, 6, 0xffffff);
            add(eyeW, s * 0.068, 1.975, 0.168);
            const pupil = sph(0.018, 6, 5, 0x111111, true);
            add(pupil, s * 0.068, 1.973, 0.185);
        }

        // Eyebrows
        for (const s of [-1, 1]) {
            add(box(0.065, 0.018, 0.018, HAIR), s * 0.068, 2.005, 0.165);
        }

        // Nose
        const nose = sph(0.030, 6, 5, 0xb87050);
        nose.scale.set(0.7, 0.8, 1);
        add(nose, 0, 1.938, 0.188);

        // Mouth
        add(box(0.068, 0.015, 0.016, 0x8a4a3a), 0, 1.900, 0.182);

        // ── Hair (short under cap) ────────────────────────────────────
        const hairMesh = sph(0.175, 10, 8, HAIR);
        hairMesh.scale.set(1.04, 0.72, 1.0);
        add(hairMesh, 0, 2.025, 0.02);

        // ── Military cap ──────────────────────────────────────────────
        add(cyl(0.190, 0.205, 0.155, 9, CAP), 0, 2.10, 0);          // crown
        // Brim (angled forward)
        const brim = box(0.38, 0.028, 0.18, CAP);
        brim.rotation.x = 0.18;
        add(brim, 0, 1.990, -0.11);
        // Cap top button
        add(cyl(0.022, 0.022, 0.025, 6, 0x4a6a4a), 0, 2.182, 0);

        // ── Flashlight prop (right hand) ──────────────────────────────
        const fl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.048, 0.26, 8),
            new THREE.MeshLambertMaterial({ color: 0x777777 })
        );
        fl.position.set(0.30, 1.55, -0.22);
        fl.rotation.x = Math.PI / 2.1;
        g.add(fl);
        // Lens
        add(cyl(0.042, 0.042, 0.022, 8, 0xddddff), 0.30, 1.55, -0.35);

        // ── Alert bubble ──────────────────────────────────────────────
        this.alertBubble = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        this.alertBubble.position.y = 2.55;
        g.add(this.alertBubble);

        this.mesh = g;
        scene.add(g);
    }

    _buildFlashlight() {
        this.spotlight = new THREE.SpotLight(0xffffcc, 2.2, this.flashRange, this.flashAngle, 0.28, 1.2);
        this.spotlight.position.set(0, 1.6, 0);

        this.spotTarget = new THREE.Object3D();
        this.spotTarget.position.set(0, 1.6, -12);
        this.mesh.add(this.spotTarget);
        this.mesh.add(this.spotlight);
        this.spotlight.target = this.spotTarget;
    }

    update(dt, playerEyePos, playerNoise, playerHiding) {
        const toPlayer = new THREE.Vector3().subVectors(playerEyePos, this.mesh.position);
        const dist = toPlayer.length();

        const canSee  = this._checkVision(playerEyePos, playerHiding);
        const canHear = !playerHiding && dist < this.hearRange * (playerNoise / 100);

        // State machine
        switch (this.state) {
            case 'patrol':
                this._patrol(dt);
                if (canSee || canHear) {
                    this.state = 'investigate';
                    this.investTarget.copy(playerEyePos);
                    this.investTimer = 6;
                }
                break;

            case 'investigate':
                this.investTimer -= dt;
                this._moveTo(this.investTarget, dt, this.speed * 1.55);
                if (canSee) {
                    this.investTarget.copy(playerEyePos);
                    this.investTimer = 6;
                }
                if (this.investTimer <= 0) {
                    this.state = 'patrol';
                }
                break;
        }

        // Alert contribution
        if (canSee) {
            this.alertContrib = Math.min(100, this.alertContrib + dt * 35);
        } else if (canHear) {
            this.alertContrib = Math.min(100, this.alertContrib + dt * 12);
        } else {
            this.alertContrib = Math.max(0, this.alertContrib - dt * 22);
        }

        // Update alert bubble color
        const c = this.alertContrib;
        if (c < 30)       this.alertBubble.material.color.set(0x00cc44);
        else if (c < 65)  this.alertBubble.material.color.set(0xffdd00);
        else              this.alertBubble.material.color.set(0xff3300);

        // Spotlight intensity based on state
        this.spotlight.intensity = this.state === 'investigate' ? 3.5 : 2.2;
        this.spotlight.color.set(this.state === 'investigate' ? 0xfff0aa : 0xffffcc);
    }

    _patrol(dt) {
        const wp = this.waypoints[this.wpIdx];
        if (this._moveTo(wp, dt, this.speed)) {
            this.wpIdx = (this.wpIdx + 1) % this.waypoints.length;
        }
    }

    _moveTo(target, dt, speed) {
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.4) return true;

        dir.normalize();
        this.facing.copy(dir);
        this.mesh.position.addScaledVector(dir, Math.min(speed * dt, dist));
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        return false;
    }

    _checkVision(playerPos, hiding) {
        if (hiding) return false;
        const to = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
        to.y = 0;
        const dist = to.length();
        if (dist > this.flashRange) return false;
        to.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, this.facing.dot(to))));
        return angle < this.flashAngle;
    }
}
