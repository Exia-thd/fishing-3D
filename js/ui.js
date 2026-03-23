// ─── UI System ────────────────────────────────────────────────────────────────
const UI = {
    _msgTimeout: null,

    init() {
        this.radarCanvas = document.getElementById('radar');
        this.radarCtx    = this.radarCanvas.getContext('2d');
        this.flashEl     = document.getElementById('flash-overlay');
        this.msgEl       = document.getElementById('message-overlay');
        this.biteEl      = document.getElementById('bite-alert');

        // Create hide indicator
        if (!document.getElementById('hide-indicator')) {
            const h = document.createElement('div');
            h.id = 'hide-indicator';
            h.textContent = '[ ĐANG NẤP ]';
            document.body.appendChild(h);
        }
        this.hideEl = document.getElementById('hide-indicator');
    },

    // ── Radar ────────────────────────────────────────────────────────────────
    updateRadar(playerPos, playerYaw, npcData, fishPositions) {
        const ctx = this.radarCtx;
        const W = 200, H = 200, cx = 100, cy = 100, R = 92;
        const scale = R / 52; // 52 world units = radar radius

        ctx.clearRect(0, 0, W, H);

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();

        // Background
        ctx.fillStyle = 'rgba(0,18,8,0.88)';
        ctx.fillRect(0, 0, W, H);

        // Lake fill
        ctx.beginPath();
        ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,44,90,0.5)';
        ctx.fill();

        // Restricted ring
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,40,40,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Grid rings
        ctx.strokeStyle = 'rgba(0,90,40,0.18)';
        ctx.lineWidth = 1;
        [R * 0.33, R * 0.66, R].forEach(r => {
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        });
        // Grid cross
        ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

        // Helper: world → radar pixel (rotated to player yaw)
        const w2r = (wx, wz) => {
            const dx = wx - playerPos.x, dz = wz - playerPos.z;
            const cos = Math.cos(-playerYaw), sin = Math.sin(-playerYaw);
            return [
                cx + (dx * cos - dz * sin) * scale,
                cy + (dx * sin + dz * cos) * scale
            ];
        };

        // Fish blips
        if (fishPositions && fishPositions.length) {
            for (const fp of fishPositions) {
                const [px, py] = w2r(fp.x, fp.z);
                if (px < 4 || px > W-4 || py < 4 || py > H-4) continue;
                ctx.beginPath();
                ctx.arc(px, py, fp.rare ? 4 : 3, 0, Math.PI * 2);
                ctx.fillStyle = fp.rare ? '#ffd700' : '#22cc55';
                ctx.fill();
            }
        }

        // NPC data
        for (const npc of (npcData || [])) {
            const [px, py] = w2r(npc.position.x, npc.position.z);

            // Flashlight cone
            const cos = Math.cos(-playerYaw), sin = Math.sin(-playerYaw);
            const fx = npc.direction.x, fz = npc.direction.z;
            const rfx = fx * cos - fz * sin;
            const rfz = fx * sin + fz * cos;
            const fwdAngle = Math.atan2(rfx, rfz) + Math.PI;
            const coneLen = npc.range * scale;

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.arc(px, py, coneLen, fwdAngle - npc.angle, fwdAngle + npc.angle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,240,80,0.12)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,240,80,0.38)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // NPC dot
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
        }

        // Player (center)
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#4488ff';
        ctx.fill();

        // Player forward triangle
        ctx.beginPath();
        ctx.moveTo(cx, cy - 13);
        ctx.lineTo(cx - 5, cy + 1);
        ctx.lineTo(cx + 5, cy + 1);
        ctx.closePath();
        ctx.fillStyle = '#88aaff';
        ctx.fill();

        ctx.restore();

        // Border
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,200,90,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // "RESTRICTED AREA" label
        ctx.fillStyle = 'rgba(255,50,50,0.75)';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('RESTRICTED AREA', cx, cy - R + 13);
    },

    // ── Alert Meter ──────────────────────────────────────────────────────────
    updateAlertMeter(level) {
        const pct  = document.getElementById('alert-percent');
        const bar  = document.getElementById('reel-bar');
        const lbl  = document.getElementById('alert-label');
        if (!pct || !bar) return;

        pct.textContent = Math.floor(level) + '%';
        bar.style.width = level + '%';

        if (level < 35) {
            pct.style.color = '#00ff00'; bar.style.background = '#00ff00'; lbl.style.color = '#00ff00';
        } else if (level < 70) {
            pct.style.color = '#ffff00'; bar.style.background = '#ffff00'; lbl.style.color = '#ffff00';
        } else {
            pct.style.color = '#ff4400'; bar.style.background = '#ff4400'; lbl.style.color = '#ff4400';
        }
    },

    // ── Cast bar ─────────────────────────────────────────────────────────────
    updateCastBar(power) {
        document.getElementById('cast-ui').classList.remove('hidden');
        document.getElementById('cast-bar').style.width = (power * 100) + '%';
    },

    hideCastUI() {
        document.getElementById('cast-ui').classList.add('hidden');
    },

    // ── Tension bar ──────────────────────────────────────────────────────────
    showTensionUI() {
        document.getElementById('tension-ui').classList.remove('hidden');
    },

    updateTensionBar(tension, safeMin, safeMax) {
        const ind  = document.getElementById('tension-indicator');
        const safe = document.getElementById('tension-safe-zone');
        if (!ind) return;
        ind.style.left  = tension + '%';
        safe.style.left  = safeMin + '%';
        safe.style.width = (safeMax - safeMin) + '%';
        const inSafe = tension >= safeMin && tension <= safeMax;
        ind.style.background = inSafe ? '#00ff00' : '#ff4400';
    },

    updateReelProgress(pct) {
        const bar = document.getElementById('reel-progress-bar');
        if (bar) bar.style.width = pct + '%';
    },

    hideTensionUI() {
        document.getElementById('tension-ui').classList.add('hidden');
        this.updateReelProgress(0);
    },

    // ── Bite alert ───────────────────────────────────────────────────────────
    showBiteAlert() {
        if (this.biteEl) this.biteEl.classList.remove('hidden');
        this.flash('rgba(255,255,0,0.18)', 400);
    },

    hideBiteAlert() {
        if (this.biteEl) this.biteEl.classList.add('hidden');
    },

    // ── Messages ─────────────────────────────────────────────────────────────
    showMessage(text, secs = 3, color = '#ffffff') {
        if (!this.msgEl) return;
        this.msgEl.textContent = text;
        this.msgEl.style.color = color;
        this.msgEl.style.display = 'block';
        clearTimeout(this._msgTimeout);
        this._msgTimeout = setTimeout(() => {
            if (this.msgEl) this.msgEl.style.display = 'none';
        }, secs * 1000);
    },

    showCatchMessage(fish) {
        const emoji = fish.rare ? '🌟' : '✅';
        this.showMessage(`${emoji} Bắt được ${fish.name}! +${fish.value}g`, 3, fish.rare ? '#ffd700' : '#00ff00');
    },

    // ── Flash ────────────────────────────────────────────────────────────────
    flash(color = 'rgba(255,0,0,0.35)', ms = 350) {
        if (!this.flashEl) return;
        this.flashEl.style.background = color;
        this.flashEl.style.opacity = '1';
        clearTimeout(this._flashTO);
        this._flashTO = setTimeout(() => { this.flashEl.style.opacity = '0'; }, ms);
    },

    // ── HUD counts ───────────────────────────────────────────────────────────
    updateMoney()     { const e = document.getElementById('money');      if(e) e.textContent = GameState.money; },
    updateFishCount() { const e = document.getElementById('fish-caught');if(e) e.textContent = GameState.inventory.length; },

    // ── Heartbeat screen shake ───────────────────────────────────────────────
    updateHeartbeat(level) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        if (level > 60) {
            const i = (level - 60) / 40 * 4;
            canvas.style.transform = `translate(${(Math.random()-0.5)*i}px,${(Math.random()-0.5)*i}px)`;
        } else {
            canvas.style.transform = '';
        }
    },

    // ── Hide indicator ───────────────────────────────────────────────────────
    showHideIndicator()  { if(this.hideEl) this.hideEl.style.display = 'block'; },
    hideHideIndicator()  { if(this.hideEl) this.hideEl.style.display = 'none'; },

    // ── Screens ──────────────────────────────────────────────────────────────
    showScreen(id)  { document.getElementById(id).classList.remove('hidden'); },
    hideScreen(id)  { document.getElementById(id).classList.add('hidden'); },

    buildEarnings() {
        const list  = document.getElementById('earnings-list');
        const total = document.getElementById('earnings-total');
        if (!list) return;
        let sum = 0;
        list.innerHTML = GameState.inventory.length
            ? GameState.inventory.map(f => { sum += f.value; return `<p>• ${f.name}: +${f.value}g</p>`; }).join('')
            : '<p style="color:#666">Không câu được con nào...</p>';
        if (total) total.textContent = `Tổng: ${GameState.inventory.reduce((s,f)=>s+f.value,0)}g`;
    },

    buildShop() {
        const grid = document.getElementById('shop-grid');
        const moneyEl = document.getElementById('shop-money');
        if (!grid) return;
        if (moneyEl) moneyEl.textContent = GameState.money;

        const items = [
            { id:'silent_bait',  name:'Mồi Silent-Fish', desc:'Giảm tiếng động 20%', cost:100 },
            { id:'dragon_bait',  name:'Mồi Rồng x3',     desc:'+12% cơ hội cá rồng', cost:500 },
            { id:'carbon_rod',   name:'Cần Carbon Đen',  desc:'Giảm tầm nhìn NPC',   cost:250 },
            { id:'stealth_rod',  name:'Cần Tàng Hình',   desc:'Gần vô hình với đèn', cost:1000 },
            { id:'mosquito',     name:'Bình Xịt Muỗi',   desc:'Nấp lâu hơn 50%',     cost:150 },
            { id:'flashbang',    name:'Pháo Giấy x3',    desc:'Đánh lạc hướng NPC',  cost:300 },
            { id:'night_vision', name:'Kính Nhìn Đêm',   desc:'Thấy cá trên radar',  cost:2000 },
        ];

        grid.innerHTML = items.map(item => {
            const owned = Shop.isOwned(item.id);
            const can   = GameState.money >= item.cost;
            return `<div class="shop-card">
                <h4>${item.name}</h4>
                <p>${item.desc}</p>
                <button ${owned || !can ? 'disabled' : ''}
                    onclick="Shop.buy('${item.id}',${item.cost})">
                    ${owned ? '✓ Đã có' : can ? item.cost+'g' : 'Không đủ'}
                </button>
            </div>`;
        }).join('');
    }
};
