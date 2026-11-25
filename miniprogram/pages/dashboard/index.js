const storage = require('../../utils/storage');
const engine = require('../../utils/nutritionEngine');

Page({
  data: {
    user: { nickname: '铲屎官' },
    cats: [],
    normalCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    activeRecipe: null,
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const user = storage.getUser();
    const cats = storage.getCats();
    const recipes = storage.getRecipes();
    const inventory = storage.getInventory();

    let normalCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    inventory.forEach((item) => {
      const days = engine.daysBetweenToday(item.expiryDate);
      if (days < 0) expiredCount += 1;
      else if (days <= 3) expiringCount += 1;
      else normalCount += 1;
    });

    const active = recipes.find((r) => r.isActive) || null;
    let activeRecipe = null;
    if (active) {
      const targetCats = cats.filter((c) => (active.catIds || []).indexOf(c.id) !== -1);
      const lifeStage = active.lifeStage || engine.inferLifeStageFromCats(targetCats);
      const calc = engine.calculateRecipeNutrition(
        active.ingredients,
        active.supplements,
        active.standard || 'NRC',
        lifeStage
      );
      const totalDays = Math.max(1, Number(active.days) || 7);
      const executedDays = Math.min(totalDays, Math.max(0, Number(active.executedDays) || 0));
      const remainingDays = Math.max(0, totalDays - executedDays);
      const progressPct = Math.min(100, Math.round((executedDays / totalDays) * 100));

      activeRecipe = {
        id: active.id,
        name: active.name,
        standard: active.standard === 'AAFCO' ? 'AAFCO' : 'NRC 2006',
        executedDays,
        totalDays,
        remainingDays,
        progressPct,
        caPRatio: calc.caPRatio.toFixed(2),
      };
    }

    this.setData({
      user,
      cats,
      normalCount,
      expiringCount,
      expiredCount,
      activeRecipe,
    });
  },

  goCreateRecipe() {
    wx.navigateTo({ url: '/pages/recipe-create/index' });
  },

  goRecipes() {
    wx.switchTab({ url: '/pages/recipes/index' });
  },

  goInventory() {
    wx.switchTab({ url: '/pages/inventory/index' });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  goActiveRecipeDetail() {
    if (this.data.activeRecipe) {
      wx.navigateTo({ url: `/pages/recipe-detail/index?id=${this.data.activeRecipe.id}` });
    } else {
      wx.switchTab({ url: '/pages/recipes/index' });
    }
  },

  goNutritionIngredients() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=ingredients' });
  },

  goNutritionSupplements() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=supplements' });
  },
});
