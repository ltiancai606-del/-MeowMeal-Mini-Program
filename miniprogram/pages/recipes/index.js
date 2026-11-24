const storage = require('../../utils/storage');
const engine = require('../../utils/nutritionEngine');

Page({
  data: {
    tabs: [
      { id: 'all', label: '全部' },
      { id: 'active', label: '执行中' },
      { id: 'completed', label: '已完成' },
      { id: 'draft', label: '草稿' },
    ],
    activeTab: 'all',
    searchQuery: '',
    recipeCards: [],
  },

  onShow() {
    this.loadRecipes();
  },

  loadRecipes() {
    const recipes = storage.getRecipes().slice().reverse();
    const cats = storage.getCats();
    const { activeTab, searchQuery } = this.data;
    const q = (searchQuery || '').trim().toLowerCase();

    const filtered = recipes.filter((r) => {
      if (activeTab === 'active' && !r.isActive) return false;
      if (activeTab === 'completed' && (r.isActive || !r.endDate)) return false;
      if (activeTab === 'draft' && (r.isActive || r.endDate)) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    const recipeCards = filtered.map((r) => {
      const targetCats = cats.filter((c) => (r.catIds || []).indexOf(c.id) !== -1);
      const lifeStage = r.lifeStage || engine.inferLifeStageFromCats(targetCats);
      const calc = engine.calculateRecipeNutrition(
        r.ingredients,
        r.supplements,
        r.standard || 'NRC',
        lifeStage
      );
      const proteinPct = Math.round(calc.macroME.proteinPct);
      const fatPct = Math.round(calc.macroME.fatPct);
      const ingredientTags = (r.ingredients || []).slice(0, 4).map((item) => {
        const meat = engine.getIngredientById(item.meatId);
        return meat ? meat.name.split('（')[0].split('(')[0].trim() : '未知';
      });
      if ((r.ingredients || []).length > 4) {
        ingredientTags.push(`+${r.ingredients.length - 4}种`);
      }

      return {
        id: r.id,
        name: r.name,
        days: r.days,
        isActive: Boolean(r.isActive),
        statusText: r.isActive ? '执行中' : r.endDate ? '已完成' : '草稿',
        stdText: `${r.standard === 'AAFCO' ? 'AAFCO' : 'NRC 2006'} · ${lifeStage === 'kitten' ? '幼猫' : '成猫'}`,
        catNames: targetCats.map((c) => c.name),
        totalWeight: Math.round(calc.totalWeightG),
        caPRatio: calc.caPRatio.toFixed(2),
        proteinPct,
        fatPct,
        carbPct: Math.max(0, 100 - proteinPct - fatPct),
        highRiskCount: calc.highRiskAlerts.length,
        ingredientTags,
      };
    });

    this.setData({ recipeCards });
  },

  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value }, () => this.loadRecipes());
  },

  onSelectTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.id }, () => this.loadRecipes());
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/recipe-create/index' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipe-detail/index?id=${id}` });
  },

  onQuickStart(e) {
    const id = e.currentTarget.dataset.id;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const recipes = storage.getRecipes().map((r) => {
      if (r.id === id) {
        return Object.assign({}, r, { isActive: true, startDate: now, endDate: '' });
      }
      if (r.isActive) {
        return Object.assign({}, r, { isActive: false, endDate: now });
      }
      return r;
    });
    storage.saveRecipes(recipes);
    wx.showToast({ title: '已开始执行', icon: 'success' });
    this.loadRecipes();
  },
});
