// ─── Bilingual Language System ────────────────────────────────────────────────
const Lang = {
    current: 'vi', // 'vi' | 'en'

    strings: {
        // ── Menu ──────────────────────────────────────────────────────────────
        menu_title:      { vi: 'CÁ TRỘM',          en: 'FISH THIEF' },
        menu_subtitle:   { vi: 'ĐÊM KHÔNG NGỦ',    en: 'SLEEPLESS NIGHT' },
        menu_tagline:    { vi: 'Đột nhập vào hồ cấm · Câu cá quý · Tránh quản lý',
                           en: 'Break into restricted lakes · Catch rare fish · Avoid wardens' },
        menu_controls:   { vi: 'WASD di chuyển · Q quăng cần · SPACE kéo cá · C cúi · F nấp vào bụi',
                           en: 'WASD move · Q cast rod · SPACE reel · C crouch · F hide in bush' },
        btn_start:       { vi: '▶ Bắt Đầu Đêm Nay', en: '▶ Start Tonight' },

        // ── HUD ───────────────────────────────────────────────────────────────
        hud_night:       { vi: '🌙 ĐÊM',           en: '🌙 NIGHT' },
        reel_tension:    { vi: 'CĂNG DÂY',          en: 'REEL TENSION' },
        alert_label:     { vi: 'CẢNH BÁO',          en: 'ALERT' },
        restricted:      { vi: 'VÙNG CẤM',          en: 'RESTRICTED' },
        controls_hint:   { vi: 'WASD · Chuột · Q: Câu/Kéo · C: Cúi · Shift: Chạy · F: Nấp · ESC: Kết thúc',
                           en: 'WASD · Mouse · Q: Cast/Reel · C: Crouch · Shift: Run · F: Hide · ESC: End night' },

        // ── Fishing UI ────────────────────────────────────────────────────────
        cast_label:      { vi: 'LỰC QUĂNG',         en: 'CAST POWER' },
        cast_hint:       { vi: 'Thả [Q] để quăng',  en: 'Release [Q] to cast' },
        tension_label:   { vi: 'CĂNG DÂY',          en: 'LINE TENSION' },
        tension_hint:    { vi: 'Giữ [SPACE] để kéo · Thả ra để nghỉ',
                           en: 'Hold [SPACE] to reel · Release to ease' },
        bite_alert:      { vi: '🐟 CÁ CẮN! Nhấn [Q] ngay!', en: '🐟 FISH ON! Press [Q] now!' },
        hide_indicator:  { vi: '[ ĐANG NẤP ]',      en: '[ HIDING ]' },

        // ── Messages ──────────────────────────────────────────────────────────
        night_start:     { vi: '🌙 Đêm bắt đầu! Câu cá và đừng để bị bắt!',
                           en: '🌙 Night begins! Fish and avoid the warden!' },
        cast_waiting:    { vi: 'Đã quăng cần. Chờ cá cắn...',
                           en: 'Rod cast. Waiting for a bite...' },
        fish_escape_loose: { vi: 'Dây lỏng quá, cá trốn!', en: 'Line too loose, fish escaped!' },
        fish_escape_break: { vi: 'Đứt dây rồi!',           en: 'Line snapped!' },
        fish_miss:       { vi: 'Cá sổng mất rồi!',        en: 'Fish got away!' },
        not_enough_money:{ vi: 'Không đủ tiền!',           en: 'Not enough money!' },
        item_bought:     { vi: 'Đã mua!',                  en: 'Purchased!' },

        // ── Catch messages ────────────────────────────────────────────────────
        catch_prefix:    { vi: 'Bắt được',           en: 'Caught' },
        catch_suffix:    { vi: '',                   en: '!' },

        // ── Screens ───────────────────────────────────────────────────────────
        caught_title:    { vi: '🚨 BỊ BẮT! 🚨',    en: '🚨 BUSTED! 🚨' },
        caught_sub:      { vi: 'Quản lý đã tóm được bạn!', en: 'The warden caught you!' },
        caught_fine:     { vi: 'Mất {fish} cá + phạt {fine}g tiền mặt!',
                           en: 'Lost {fish} fish + fined {fine}g!' },
        btn_retry:       { vi: '↺ Thử Lại',          en: '↺ Try Again' },

        complete_title:  { vi: '🌅 Đêm Kết Thúc!',  en: '🌅 Night Over!' },
        complete_none:   { vi: 'Không câu được con nào...', en: 'Caught nothing...' },
        complete_total:  { vi: 'Tổng: {n}g',         en: 'Total: {n}g' },
        btn_shop:        { vi: '🏪 Vào Cửa Hàng',   en: '🏪 Go to Shop' },

        shop_title:      { vi: '🏪 Cửa Hàng Đen',   en: '🏪 Black Market' },
        shop_money_label:{ vi: 'Tiền:',              en: 'Money:' },
        btn_new_night:   { vi: '🌙 Ra Đi Đêm Mới',  en: '🌙 Start New Night' },
        shop_owned:      { vi: '✓ Đã có',            en: '✓ Owned' },
        shop_no_money:   { vi: 'Không đủ',           en: 'Can\'t afford' },

        // ── Shop items ────────────────────────────────────────────────────────
        item_silent_bait_name: { vi: 'Mồi Silent-Fish', en: 'Silent-Fish Bait' },
        item_silent_bait_desc: { vi: 'Giảm tiếng động 20%', en: 'Reduces noise 20%' },
        item_dragon_bait_name: { vi: 'Mồi Rồng x3', en: 'Dragon Bait x3' },
        item_dragon_bait_desc: { vi: '+12% cơ hội cá rồng', en: '+12% legendary fish chance' },
        item_carbon_rod_name:  { vi: 'Cần Carbon Đen', en: 'Black Carbon Rod' },
        item_carbon_rod_desc:  { vi: 'Giảm tầm nhìn NPC', en: 'Reduces NPC vision range' },
        item_stealth_rod_name: { vi: 'Cần Tàng Hình', en: 'Stealth Rod' },
        item_stealth_rod_desc: { vi: 'Gần vô hình với đèn', en: 'Near-invisible under flashlight' },
        item_mosquito_name:    { vi: 'Bình Xịt Muỗi', en: 'Mosquito Spray' },
        item_mosquito_desc:    { vi: 'Nấp lâu hơn 50%', en: 'Hide 50% longer' },
        item_flashbang_name:   { vi: 'Pháo Giấy x3', en: 'Distraction Flare x3' },
        item_flashbang_desc:   { vi: 'Đánh lạc hướng NPC', en: 'Distract the warden' },
        item_nv_name:          { vi: 'Kính Nhìn Đêm', en: 'Night-Vision Goggles' },
        item_nv_desc:          { vi: 'Thấy cá trên radar', en: 'See fish on radar' },

        // ── Fish names ────────────────────────────────────────────────────────
        fish_giec:   { vi: 'Cá Giếc',            en: 'Crucian Carp' },
        fish_chep:   { vi: 'Cá Chép',            en: 'Common Carp' },
        fish_tram:   { vi: 'Cá Trắm',            en: 'Grass Carp' },
        fish_rong:   { vi: 'Cá Rồng 🔥',         en: 'Dragon Fish 🔥' },
        fish_giay:   { vi: 'Chiếc Giày Cũ',      en: 'Old Boot' },
        fish_vi:     { vi: 'Ví Tiền Quản Lý 💰', en: "Warden's Wallet 💰" },

        // ── Language toggle ───────────────────────────────────────────────────
        lang_toggle: { vi: 'EN', en: 'VI' }, // label shows the OTHER language
    },

    // Get a string in current language
    t(key, replacements = {}) {
        const entry = this.strings[key];
        if (!entry) { console.warn('Lang: missing key', key); return key; }
        let s = entry[this.current] ?? entry['vi'] ?? key;
        for (const [k, v] of Object.entries(replacements)) {
            s = s.replace(`{${k}}`, v);
        }
        return s;
    },

    toggle() {
        this.current = this.current === 'vi' ? 'en' : 'vi';
        this._applyAll();
    },

    // Apply language to all [data-lang] elements in DOM
    _applyAll() {
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.dataset.lang;
            el.textContent = this.t(key);
        });
        // Update language button label
        const btn = document.getElementById('btn-lang');
        if (btn) btn.textContent = this.t('lang_toggle');
        // Update fish data names
        FishData.applyLang();
    },

    init() {
        this._applyAll();
    }
};
