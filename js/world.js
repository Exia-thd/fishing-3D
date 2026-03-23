// ─── World / Scene Setup ──────────────────────────────────────────────────────
class World {
    constructor(scene) {
        this.scene = scene;
        this.bushes = [];   // { mesh, hideRadius }
        this.waterTime = 0;
        this.lakeRadius = 30;

        this._build();
    }

    _build() {
        this._sky();
        this._lighting();
        this._terrain();
        this._lake();
        this._trees();
        this._bushes();
        this._dock();
        this._props();
        this._fog();
    }

    // ── Sky & Stars ──────────────────────────────────────────────────────────
    _sky() {
        this.scene.background = new THREE.Color(0x040810);

        // Stars
        const geo = new THREE.BufferGeometry();
        const pts = [];
        for (let i = 0; i < 2400; i++) {
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(Math.random() * 2 - 1);
            const r = 480;
            pts.push(
                r * Math.sin(ph) * Math.cos(th),
                r * Math.sin(ph) * Math.sin(th),
                r * Math.cos(ph)
            );
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        this.scene.add(new THREE.Points(geo,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.85 })));

        // Moon sphere
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(9, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xfffce0 })
        );
        moon.position.set(-110, 130, -190);
        this.scene.add(moon);

        // Moon glow (point light)
        const moonGlow = new THREE.PointLight(0xaabbdd, 1.0, 600);
        moonGlow.position.copy(moon.position);
        this.scene.add(moonGlow);
    }

    // ── Lighting ─────────────────────────────────────────────────────────────
    _lighting() {
        this.scene.add(new THREE.AmbientLight(0x1a2e44, 1.1));

        const dir = new THREE.DirectionalLight(0x99bbdd, 0.75);
        dir.position.set(-2, 4, -3);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 200;
        dir.shadow.camera.left = dir.shadow.camera.bottom = -80;
        dir.shadow.camera.right = dir.shadow.camera.top = 80;
        this.scene.add(dir);
    }

    // ── Fog ──────────────────────────────────────────────────────────────────
    _fog() {
        this.scene.fog = new THREE.FogExp2(0x040810, 0.018);
    }

    // ── Terrain ──────────────────────────────────────────────────────────────
    _terrain() {
        const geo = new THREE.PlaneGeometry(240, 240, 60, 60);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getY(i);
            const d = Math.sqrt(x * x + z * z);
            if (d > 32) pos.setZ(i, (Math.random() - 0.5) * 0.7);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const ground = new THREE.Mesh(geo,
            new THREE.MeshLambertMaterial({ color: 0x172210 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Bank ring
        const bank = new THREE.Mesh(
            new THREE.RingGeometry(29, 40, 64),
            new THREE.MeshLambertMaterial({ color: 0x253018, side: THREE.DoubleSide })
        );
        bank.rotation.x = -Math.PI / 2;
        bank.position.y = 0.02;
        this.scene.add(bank);
    }

    // ── Lake ─────────────────────────────────────────────────────────────────
    _lake() {
        this.waterMat = new THREE.MeshLambertMaterial({
            color: 0x003355, transparent: true, opacity: 0.88,
            emissive: new THREE.Color(0x001122), emissiveIntensity: 0.4
        });
        const water = new THREE.Mesh(new THREE.CircleGeometry(this.lakeRadius, 72), this.waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.12;
        this.scene.add(water);
    }

    // ── Trees ────────────────────────────────────────────────────────────────
    _trees() {
        const positions = [];
        // Ring around lake
        for (let i = 0; i < 44; i++) {
            const a = (i / 44) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const d = 42 + Math.random() * 28;
            positions.push([ Math.cos(a) * d, Math.sin(a) * d ]);
        }
        // Scattered
        for (let i = 0; i < 35; i++) {
            positions.push([
                (Math.random() - 0.5) * 190,
                (Math.random() - 0.5) * 190
            ]);
        }
        for (const [x, z] of positions) {
            if (x*x + z*z < 38*38) continue;
            this._tree(x, z);
        }
    }

    _tree(x, z) {
        const g = new THREE.Group();
        const h = 4 + Math.random() * 5;
        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.32, h * 0.4, 6),
            new THREE.MeshLambertMaterial({ color: 0x3c2810 })
        );
        trunk.position.set(0, h * 0.2, 0);
        g.add(trunk);
        // Foliage cones
        const cols = [0x1a3a0e, 0x1f4412, 0x163a0a];
        for (let i = 0; i < 3; i++) {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(1.9 - i * 0.4 + Math.random() * 0.2, h * 0.34, 8),
                new THREE.MeshLambertMaterial({ color: cols[i] })
            );
            cone.position.y = h * (0.4 + i * 0.24);
            g.add(cone);
        }
        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(g);
    }

    // ── Bushes (hiding spots) ─────────────────────────────────────────────────
    _bushes() {
        const spots = [
            [34, 2], [-34, 8], [22, -33], [-22, 33],
            [33, 24], [-33, -22], [12, 36], [-14, -34],
            [38, -14], [-38, 20], [26, 31], [-27, -27],
            [35, -28], [-35, 28], [0, 40]
        ];
        for (const [x, z] of spots) this._bush(x, z);
    }

    _bush(x, z) {
        const g = new THREE.Group();
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.55 + Math.random() * 0.38, 7, 6),
                new THREE.MeshLambertMaterial({ color: new THREE.Color(
                    0.08, 0.22 + Math.random() * 0.1, 0.04
                )})
            );
            mesh.position.set(
                (Math.random() - 0.5) * 1.4,
                0.38 + Math.random() * 0.28,
                (Math.random() - 0.5) * 1.4
            );
            g.add(mesh);
        }
        g.position.set(x, 0, z);
        g.userData.isBush = true;
        g.userData.hideRadius = 2.5;
        this.scene.add(g);
        this.bushes.push(g);
    }

    // ── Dock ─────────────────────────────────────────────────────────────────
    _dock() {
        const g = new THREE.Group();
        const plankMat = new THREE.MeshLambertMaterial({ color: 0x5c3c22 });
        const postMat  = new THREE.MeshLambertMaterial({ color: 0x3c2810 });

        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 2.2), plankMat);
            p.position.set(i * 0.31 - 1.09, -0.04, 29.5);
            g.add(p);
        }
        for (let i = 0; i < 4; i++) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 6), postMat);
            post.position.set(i < 2 ? -0.75 : 0.75, -0.55, 28.6 + (i % 2) * 1.0);
            g.add(post);
        }
        this.scene.add(g);
        this.playerStart = new THREE.Vector3(0, 0, 34);
    }

    // ── Props ────────────────────────────────────────────────────────────────
    _props() {
        const add = (geo, mat, x, y, z) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            this.scene.add(m);
        };
        // Tackle box
        add(new THREE.BoxGeometry(0.5, 0.22, 0.32),
            new THREE.MeshLambertMaterial({ color: 0x1a3a88 }), 1.1, 0.11, 32.2);
        // Water bottle
        add(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 8),
            new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.75 }), -0.6, 0.12, 32.2);
        // Backpack
        add(new THREE.BoxGeometry(0.4, 0.55, 0.22),
            new THREE.MeshLambertMaterial({ color: 0x3a3a44 }), -1.2, 0.28, 32.8);
        // Rocks near shore
        const rockMat = new THREE.MeshLambertMaterial({ color: 0x445544 });
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2, d = 31 + Math.random() * 3;
            add(new THREE.SphereGeometry(0.2 + Math.random() * 0.25, 5, 5),
                rockMat, Math.cos(a)*d, -0.08, Math.sin(a)*d);
        }
    }

    // ── Update (animations) ──────────────────────────────────────────────────
    update(dt) {
        this.waterTime += dt;
        if (this.waterMat) {
            this.waterMat.emissiveIntensity = 0.35 + Math.sin(this.waterTime * 0.6) * 0.06;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    isInLake(x, z) {
        return x * x + z * z < (this.lakeRadius - 1) * (this.lakeRadius - 1);
    }

    nearestBush(x, z, maxDist = 2.8) {
        let best = null, bestD = Infinity;
        for (const b of this.bushes) {
            const dx = b.position.x - x, dz = b.position.z - z;
            const d = Math.sqrt(dx*dx + dz*dz);
            if (d < maxDist && d < bestD) { best = b; bestD = d; }
        }
        return best;
    }
}
