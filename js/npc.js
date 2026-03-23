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

        // Smooth global alert
        const target = maxAlert;
        GameState.alertLevel += (target - GameState.alertLevel) * 0.06;
        GameState.alertLevel = Math.max(0, Math.min(100, GameState.alertLevel));

        return GameState.alertLevel >= 100; // caught!
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

        // Body
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.28, 1.0, 4, 8),
            new THREE.MeshLambertMaterial({ color: 0x2d3d4e })
        );
        body.position.y = 0.82;
        g.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0xcc9966 })
        );
        head.position.y = 1.88;
        g.add(head);

        // Cap
        const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.24, 0.18, 8),
            new THREE.MeshLambertMaterial({ color: 0x1a2a1a })
        );
        cap.position.y = 2.04;
        g.add(cap);

        // Flashlight prop
        const fl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.28, 7),
            new THREE.MeshLambertMaterial({ color: 0x888888 })
        );
        fl.position.set(0.32, 1.6, -0.18);
        fl.rotation.x = Math.PI / 2.2;
        g.add(fl);

        // Alert indicator (bubble above head)
        this.alertBubble = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        this.alertBubble.position.y = 2.5;
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
