// ─── Shop System ─────────────────────────────────────────────────────────────
const Shop = {
    isOwned(id) {
        if (id === 'carbon_rod')   return GameState.equipment.rod === 'carbon';
        if (id === 'stealth_rod')  return GameState.equipment.rod === 'stealth';
        if (id === 'silent_bait')  return GameState.consumables.bait.silent > 0;
        if (id === 'dragon_bait')  return GameState.consumables.bait.dragon > 0;
        return GameState.extras.includes(id);
    },

    buy(id, cost) {
        if (GameState.money < cost) {
            UI.showMessage(Lang.t('not_enough_money'), 2, '#ff4444');
            return;
        }
        GameState.spendMoney(cost);

        switch (id) {
            case 'carbon_rod':   GameState.equipment.rod = 'carbon';           break;
            case 'stealth_rod':  GameState.equipment.rod = 'stealth';          break;
            case 'silent_bait':  GameState.consumables.bait.silent += 5;       break;
            case 'dragon_bait':  GameState.consumables.bait.dragon += 3;       break;
            case 'flashbang':
                GameState.consumables.flashbang += 3;
                if (!GameState.extras.includes('flashbang')) GameState.extras.push('flashbang');
                break;
            default:
                if (!GameState.extras.includes(id)) GameState.extras.push(id);
        }

        UI.showMessage(Lang.t('item_bought'), 2, '#00ff00');
        UI.buildShop();  // re-render
    }
};
