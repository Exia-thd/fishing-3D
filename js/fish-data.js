// ─── Fish Database ────────────────────────────────────────────────────────────
const FishData = {
    types: {
        giec: {
            id: 'giec', name: 'Cá Giếc',
            value: 20, tensionSpeed: 0.28,
            noiseOnCatch: 10, biteDelay: [5, 15],
            color: 0x88ccff, scale: 0.32,
            desc: 'Loài cá nhỏ phổ biến, dễ câu.'
        },
        chep: {
            id: 'chep', name: 'Cá Chép',
            value: 80, tensionSpeed: 0.55,
            noiseOnCatch: 40, biteDelay: [10, 25],
            color: 0xffcc44, scale: 0.6,
            desc: 'Kéo dai sức, hay quẫy nước.'
        },
        tram: {
            id: 'tram', name: 'Cá Trắm',
            value: 200, tensionSpeed: 0.85,
            noiseOnCatch: 60, biteDelay: [20, 45],
            color: 0x44bb44, scale: 1.0,
            desc: 'Cá lớn, cực khó giữ dây.'
        },
        rong: {
            id: 'rong', name: 'Cá Rồng 🔥',
            value: 800, tensionSpeed: 1.35,
            noiseOnCatch: 90, biteDelay: [60, 180],
            color: 0xff4400, scale: 1.7,
            desc: 'Cá huyền thoại. Nguy hiểm tột cùng!', rare: true
        },
        giay: {
            id: 'giay', name: 'Chiếc Giày Cũ',
            value: 5, tensionSpeed: 0.15,
            noiseOnCatch: 5, biteDelay: [3, 8],
            color: 0x884422, scale: 0.38,
            desc: 'Sao lại có ở đây nhỉ?'
        },
        vi: {
            id: 'vi', name: "Ví Tiền Quản Lý 💰",
            value: 500, tensionSpeed: 0.18,
            noiseOnCatch: 15, biteDelay: [40, 100],
            color: 0xffd700, scale: 0.22,
            desc: 'Lão đánh rơi hồi nào vậy?', rare: true, special: true
        }
    },

    // Weighted random fish by level (1–3)
    getRandom(level = 1) {
        const tables = {
            1: { giec:58, chep:24, tram:5,  rong:0,  giay:10, vi:3 },
            2: { giec:28, chep:38, tram:22, rong:2,  giay:7,  vi:3 },
            3: { giec:8,  chep:28, tram:38, rong:12, giay:10, vi:4 }
        };
        const w = tables[Math.min(Math.max(level, 1), 3)];
        const total = Object.values(w).reduce((a,b) => a + b, 0);
        let r = Math.random() * total;
        for (const [id, wt] of Object.entries(w)) {
            r -= wt;
            if (r <= 0) return { ...FishData.types[id] };
        }
        return { ...FishData.types.giec };
    }
};
