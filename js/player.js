// ─── FPS Player Controller ────────────────────────────────────────────────────
class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene  = scene;

        // World position (feet)
        this.pos = new THREE.Vector3(0, 0, 34);

        // Look angles
        this.yaw   = 0;
        this.pitch = 0;

        // State
        this.crouching = false;
        this.hiding    = false;
        this.isMoving  = false;

        // Heights
        this.standH = 1.7;
        this.crouchH = 0.85;
        this.curH   = this.standH;

        // Speeds
        this.walkSpeed  = 4.2;
        this.runSpeed   = 8.5;
        this.crouchSpeed = 1.8;

        // Input
        this.keys = {};
        this._prevF = false;
        this.isLocked = false;

        this._setupInput();
        this._updateCamera();
    }

    // ── Input ────────────────────────────────────────────────────────────────
    _setupInput() {
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
        });

        document.addEventListener('mousemove', e => {
            if (!this.isLocked) return;
            this.yaw   -= e.movementX * 0.002;
            this.pitch -= e.movementY * 0.002;
            this.pitch  = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, this.pitch));
        });

        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'KeyC' && !e.repeat) this.crouching = !this.crouching;
        });

        document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    }

    requestLock() { document.body.requestPointerLock(); }
    exitLock()    { document.exitPointerLock(); }

    // ── Per-frame update ─────────────────────────────────────────────────────
    update(dt, world) {
        if (GameState.phase !== 'playing') return;

        // Toggle hide
        const fDown = !!this.keys['KeyF'];
        if (fDown && !this._prevF) {
            if (!this.hiding) {
                const b = world.nearestBush(this.pos.x, this.pos.z, 2.8);
                if (b) this._hide(b);
            } else {
                this._unhide();
            }
        }
        this._prevF = fDown;

        // Smooth height
        const tgtH = this.crouching || this.hiding ? this.crouchH : this.standH;
        this.curH += (tgtH - this.curH) * 0.14;

        // Movement
        this.isMoving = false;
        if (!this.hiding && this.isLocked) {
            const spd = this._speed();
            const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            const rgt = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));
            const dir = new THREE.Vector3();

            if (this.keys['KeyW']) dir.addScaledVector(fwd,  1);
            if (this.keys['KeyS']) dir.addScaledVector(fwd, -1);
            if (this.keys['KeyA']) dir.addScaledVector(rgt, -1);
            if (this.keys['KeyD']) dir.addScaledVector(rgt,  1);

            if (dir.lengthSq() > 0) {
                this.isMoving = true;
                dir.normalize();
                const nx = this.pos.x + dir.x * spd * dt;
                const nz = this.pos.z + dir.z * spd * dt;
                const inLake = world.isInLake(nx, nz);
                const tooFar = nx*nx + nz*nz > 95*95;
                if (!inLake && !tooFar) {
                    this.pos.x = nx;
                    this.pos.z = nz;
                }
            }
        }

        // Noise
        const noise = this._calcNoise();
        GameState.noiseLevel = noise;
        GameState.isHiding   = this.hiding;
        GameState.isCrouching = this.crouching;

        this._updateCamera();
    }

    _speed() {
        if (this.crouching) return this.crouchSpeed;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) return this.runSpeed;
        return this.walkSpeed;
    }

    _calcNoise() {
        if (this.hiding) return 0;
        if (!this.isMoving) return 3;
        if (this.crouching) return 18;
        if (this._speed() >= this.runSpeed) return 85;
        return 42;
    }

    _hide(bush) {
        this.hiding = true;
        GameState.isHiding = true;
        this.pos.x = bush.position.x;
        this.pos.z = bush.position.z;
    }

    _unhide() {
        this.hiding = false;
        GameState.isHiding = false;
    }

    _updateCamera() {
        this.camera.position.set(this.pos.x, this.pos.y + this.curH, this.pos.z);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }

    // World-space eye position
    eyePos() {
        return new THREE.Vector3(this.pos.x, this.pos.y + this.curH, this.pos.z);
    }
}
