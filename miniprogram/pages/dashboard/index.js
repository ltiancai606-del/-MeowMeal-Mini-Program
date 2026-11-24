const storage = require('../../utils/storage');
const engine = require('../../utils/nutritionEngine');

Page({
  data: {
    user: { nickname: '铲屎官' },
    cats: [],
    recipesCount: 0,
    inventoryCount: 0,
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

    let expiringCount = 0;
    let expiredCount = 0;
    inventory.forEach((item) => {
      const days = engine.daysBetweenToday(item.expiryDate);
      if (days < 0) expiredCount += 1;
      else if (days <= 30) expiringCount += 1;
    });

    const active = recipes.find((r) => r.isActive) || recipes[0] || null;
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
      const proteinPct = Math.round(calc.macroME.proteinPct);
      const fatPct = Math.round(calc.macroME.fatPct);
      activeRecipe = {
        id: active.id,
        name: active.name,
        standard: active.standard === 'AAFCO' ? 'AAFCO' : 'NRC 2006',
        lifeStageText: lifeStage === 'kitten' ? '幼猫' : '成猫',
        totalWeight: Math.round(calc.totalWeightG),
        totalKcal: Math.round(calc.totalKcal),
        caPRatio: calc.caPRatio.toFixed(2),
        proteinPct,
        fatPct,
        carbPct: Math.max(0, 100 - proteinPct - fatPct),
      };
    }

    this.setData({
      user,
      cats,
      recipesCount: recipes.length,
      inventoryCount: inventory.length,
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
    }
  },

  goNutritionIngredients() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=ingredients' });
  },

  goNutritionSupplements() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=supplements' });
  },
});
