const engine = require('../../utils/nutritionEngine');
const storage = require('../../utils/storage');

Page({
  data: {
    step: 1,
    steps: [
      { num: 1, label: '基本设置' },
      { num: 2, label: '模式分量' },
      { num: 3, label: '食材补剂' },
      { num: 4, label: '确认保存' },
    ],
    name: '',
    catOptions: [],
    selectedCatIds: [],
    selectedCatCount: 1,
    standard: 'NRC',
    lifeStage: 'adult',
    mode: 'by_need',
    days: 7,
    dailyGrams: 150,
    targetTotalWeight: 1050,

    // 原始数据数组
    ingredients: [],
    supplements: [],
    hasGenerated: false,

    // 渲染派生数据
    ingredientRows: [],
    supplementRows: [],
    liveSummary: {
      totalWeightG: 0,
      totalKcal: 0,
      caPRatioText: '0.00 : 1',
      caPClass: '',
      greenCount: 0,
      coreTotal: 14,
      proteinPct: 0,
      fatPct: 0,
      carbPct: 0,
      highRiskAlerts: [],
      proxyNames: '',
      hasMissingData: false,
      hasUnquantifiedFishOilVE: false,
      hasSyntheticVEReminder: false,
      hasBComplexCholineNote: false,
    },

    // 选择器状态
    showIngPicker: false,
    pickerIngIndex: -1,
    ingPickerKeyword: '',
    pickerIngredients: [],

    showSuppPicker: false,
    pickerSuppIndex: -1,
    allSupplements: engine.SUPPLEMENTS_DB,
  },

  onLoad() {
    const cats = storage.getCats();
    const firstCat = cats[0];
    const selectedCatIds = firstCat ? [firstCat.id] : [];
    const lifeStage = engine.inferLifeStageFromCats(firstCat ? [firstCat] : []);
    const defaultName = firstCat ? `${firstCat.name}的专属熟自制餐` : '喵膳熟自制食谱';

    this.setData({
      name: defaultName,
      selectedCatIds,
      lifeStage,
    }, () => {
      this.syncCatOptions();
      this.updateTargetWeight();
    });
  },

  syncCatOptions() {
    const cats = storage.getCats();
    const selectedSet = this.data.selectedCatIds;
    const catOptions = cats.map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      weight: c.weight,
      allergyText: (c.allergies || []).join('、'),
      selected: selectedSet.indexOf(c.id) !== -1,
    }));
    const selectedCats = cats.filter((c) => selectedSet.indexOf(c.id) !== -1);
    const lifeStage = engine.inferLifeStageFromCats(selectedCats);

    this.setData({
      catOptions,
      selectedCatCount: Math.max(1, selectedCats.length),
      lifeStage,
    });
  },

  updateTargetWeight() {
    const target = Math.max(1, this.data.selectedCatCount) * this.data.days * this.data.dailyGrams;
    this.setData({ targetTotalWeight: target });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onToggleCat(e) {
    const id = e.currentTarget.dataset.id;
    const current = this.data.selectedCatIds.slice();
    const idx = current.indexOf(id);
    if (idx !== -1) {
      if (current.length === 1) {
        wx.showToast({ title: '至少选择一只猫咪', icon: 'none' });
        return;
      }
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    this.setData({ selectedCatIds: current }, () => {
      this.syncCatOptions();
      this.updateTargetWeight();
    });
  },

  onSelectStandard(e) {
    this.setData({ standard: e.currentTarget.dataset.val }, () => {
      if (this.data.hasGenerated) this.recomputeLiveView();
    });
  },

  onSelectLifeStage(e) {
    this.setData({ lifeStage: e.currentTarget.dataset.val }, () => {
      if (this.data.hasGenerated) this.recomputeLiveView();
    });
  },

  onSelectMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode, hasGenerated: false });
  },

  onDaysChange(e) {
    this.setData({ days: Number(e.detail.value), hasGenerated: false }, () => {
      this.updateTargetWeight();
    });
  },

  onDailyGramsChange(e) {
    this.setData({ dailyGrams: Number(e.detail.value), hasGenerated: false }, () => {
      this.updateTargetWeight();
    });
  },

  generateInitialFormula() {
    const cats = storage.getCats().filter((c) => this.data.selectedCatIds.indexOf(c.id) !== -1);
    const allergies = [];
    cats.forEach((c) => {
      (c.allergies || []).forEach((a) => {
        if (allergies.indexOf(a) === -1) allergies.push(a);
      });
    });

    const ingredients = engine.generateAutoRecipeIngredients(this.data.targetTotalWeight, {
      mode: this.data.mode,
      allergies,
      inventory: storage.getInventory(),
    });
    const supplements = engine.recommendSupplements(
      ingredients,
      this.data.standard,
      this.data.lifeStage
    );

    this.setData({
      ingredients,
      supplements,
      hasGenerated: true,
    }, () => {
      this.recomputeLiveView();
    });
  },

  recomputeLiveView() {
    const { ingredients, supplements, standard, lifeStage } = this.data;
    const result = engine.calculateRecipeNutrition(ingredients, supplements, standard, lifeStage);

    const ingredientRows = ingredients.map((item) => {
      const ing = engine.getIngredientById(item.meatId);
      const roleMeta = ing && engine.ROLE_META[ing.role] ? engine.ROLE_META[ing.role] : { label: '肉类', icon: '🥩' };
      const badge = ing ? engine.getConfidenceBadgeInfo(ing) : { shortLabel: '未知', badgeClass: 'badge-stone', isProxy: false };
      return {
        meatId: item.meatId,
        weight: item.weight,
        name: ing ? ing.name : item.meatId,
        roleIcon: roleMeta.icon,
        roleLabel: roleMeta.label,
        badgeLabel: badge.shortLabel,
        badgeClass: badge.badgeClass,
        isProxy: badge.isProxy,
      };
    });

    const supplementRows = supplements.map((item) => {
      const supp = engine.getSupplementById(item.supplementId);
      const alternatives = supp
        ? engine.SUPPLEMENTS_DB.filter((s) => s.type === supp.type).map((s) => ({
            id: s.id,
            shortName: s.name.split('（')[0].split('(')[0].slice(0, 14),
          }))
        : [];
      return {
        supplementId: item.supplementId,
        amount: item.amount,
        name: supp ? supp.name : item.supplementId,
        category: supp ? supp.category : '补剂',
        unit: supp ? supp.unit : '',
        unitLabel: supp ? supp.unit_label : '',
        alternatives,
      };
    });

    const coreEvals = result.evaluations.filter((ev) => ev.core);
    const greenCount = coreEvals.filter((ev) => ev.status === 'green').length;
    const caPEval = result.evaluations.find((ev) => ev.key === 'ca_p_ratio');
    const caPClass =
      caPEval && caPEval.status === 'green'
        ? 'val-green'
        : caPEval && caPEval.status === 'yellow'
        ? 'val-amber'
        : 'val-red';

    this.setData({
      ingredientRows,
      supplementRows,
      liveSummary: {
        totalWeightG: Math.round(result.totalWeightG),
        totalKcal: Math.round(result.totalKcal),
        caPRatioText: `${result.caPRatio.toFixed(2)} : 1`,
        caPClass,
        greenCount,
        coreTotal: coreEvals.length,
        proteinPct: Math.round(result.macroME.proteinPct),
        fatPct: Math.round(result.macroME.fatPct),
        carbPct: Math.round(result.macroME.carbPct),
        highRiskAlerts: result.highRiskAlerts,
        proxyNames: result.proxyIngredients.map((p) => p.name).join('、'),
        hasMissingData: result.hasMissingData,
        hasUnquantifiedFishOilVE: result.hasUnquantifiedFishOilVE,
        hasSyntheticVEReminder: result.hasSyntheticVEReminder,
        hasBComplexCholineNote: result.hasBComplexCholineNote,
      },
    });
  },

  onPrevStep() {
    if (this.data.step <= 1) return;
    this.setData({ step: this.data.step - 1 });
  },

  onNextStep() {
    const { step, name, ingredients } = this.data;
    if (step === 1) {
      if (!name.trim()) {
        wx.showToast({ title: '请输入食谱名称', icon: 'none' });
        return;
      }
      this.setData({ step: 2 });
      return;
    }
    if (step === 2) {
      if (!this.data.hasGenerated) {
        this.generateInitialFormula();
      } else {
        this.recomputeLiveView();
      }
      this.setData({ step: 3 });
      return;
    }
    if (step === 3) {
      if (ingredients.length === 0) {
        wx.showToast({ title: '请至少保留一项食材', icon: 'none' });
        return;
      }
      this.recomputeLiveView();
      this.setData({ step: 4 });
    }
  },

  // Step 3 食材编辑操作
  onIngWeightInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const val = parseFloat(e.detail.value);
    const next = this.data.ingredients.slice();
    next[index] = Object.assign({}, next[index], { weight: isNaN(val) ? 0 : Math.max(0, val) });
    this.setData({ ingredients: next }, () => this.recomputeLiveView());
  },

  onStepIngWeight(e) {
    const index = Number(e.currentTarget.dataset.index);
    const delta = Number(e.currentTarget.dataset.delta);
    const next = this.data.ingredients.slice();
    const cur = Number(next[index].weight) || 0;
    next[index] = Object.assign({}, next[index], { weight: Math.max(0, cur + delta) });
    this.setData({ ingredients: next }, () => this.recomputeLiveView());
  },

  onRemoveIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = this.data.ingredients.slice();
    next.splice(index, 1);
    this.setData({ ingredients: next }, () => this.recomputeLiveView());
  },

  onOpenAddIngredient() {
    this.setData({ showIngPicker: true, pickerIngIndex: -1, ingPickerKeyword: '' }, () => {
      this.refreshIngPicker();
    });
  },

  onOpenReplaceIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ showIngPicker: true, pickerIngIndex: index, ingPickerKeyword: '' }, () => {
      this.refreshIngPicker();
    });
  },

  onIngPickerSearch(e) {
    this.setData({ ingPickerKeyword: e.detail.value || '' }, () => this.refreshIngPicker());
  },

  refreshIngPicker() {
    const kw = (this.data.ingPickerKeyword || '').trim().toLowerCase();
    const list = engine.INGREDIENTS_DB.filter((ing) => {
      if (!kw) return true;
      return (
        ing.name.toLowerCase().indexOf(kw) !== -1 ||
        (ing.category || '').toLowerCase().indexOf(kw) !== -1
      );
    }).slice(0, 60).map((ing) => {
      const roleMeta = engine.ROLE_META[ing.role] || { label: ing.role, icon: '🥩' };
      const badge = engine.getConfidenceBadgeInfo(ing);
      return {
        id: ing.id,
        name: ing.name,
        category: ing.category,
        roleIcon: roleMeta.icon,
        roleLabel: roleMeta.label,
        badgeClass: badge.badgeClass,
        badgeLabel: badge.shortLabel,
      };
    });
    this.setData({ pickerIngredients: list });
  },

  onSelectPickerIngredient(e) {
    const meatId = e.currentTarget.dataset.id;
    const next = this.data.ingredients.slice();
    if (this.data.pickerIngIndex >= 0) {
      next[this.data.pickerIngIndex] = Object.assign({}, next[this.data.pickerIngIndex], { meatId });
    } else {
      next.push({ meatId, weight: 100 });
    }
    this.setData({ ingredients: next, showIngPicker: false }, () => this.recomputeLiveView());
  },

  // Step 3 补剂编辑操作
  onSuppAmountInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const val = parseFloat(e.detail.value);
    const next = this.data.supplements.slice();
    next[index] = Object.assign({}, next[index], { amount: isNaN(val) ? 0 : Math.max(0, val) });
    this.setData({ supplements: next }, () => this.recomputeLiveView());
  },

  onRemoveSupplement(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = this.data.supplements.slice();
    next.splice(index, 1);
    this.setData({ supplements: next }, () => this.recomputeLiveView());
  },

  onSwitchSuppBrand(e) {
    const index = Number(e.currentTarget.dataset.index);
    const suppId = e.currentTarget.dataset.suppid;
    const supp = engine.getSupplementById(suppId);
    if (!supp) return;

    const meatOnly = engine.calculateRecipeNutrition(
      this.data.ingredients,
      [],
      this.data.standard,
      this.data.lifeStage
    );
    const recommended = engine.computeRecommendedAmountForSupplement(
      supp,
      meatOnly,
      this.data.standard,
      this.data.lifeStage
    );

    const next = this.data.supplements.slice();
    next[index] = { supplementId: suppId, amount: recommended };
    this.setData({ supplements: next }, () => this.recomputeLiveView());
  },

  onRecalcSupplements() {
    const recommended = engine.recommendSupplements(
      this.data.ingredients,
      this.data.standard,
      this.data.lifeStage,
      this.data.supplements
    );
    this.setData({ supplements: recommended }, () => {
      this.recomputeLiveView();
      wx.showToast({ title: '已按当前食材重算补剂', icon: 'success' });
    });
  },

  onOpenAddSupplement() {
    this.setData({ showSuppPicker: true, pickerSuppIndex: -1 });
  },

  onOpenReplaceSupplement(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ showSuppPicker: true, pickerSuppIndex: index });
  },

  onSelectPickerSupplement(e) {
    const suppId = e.currentTarget.dataset.id;
    const supp = engine.getSupplementById(suppId);
    if (!supp) return;

    const meatOnly = engine.calculateRecipeNutrition(
      this.data.ingredients,
      [],
      this.data.standard,
      this.data.lifeStage
    );
    const recommended = engine.computeRecommendedAmountForSupplement(
      supp,
      meatOnly,
      this.data.standard,
      this.data.lifeStage
    );

    const next = this.data.supplements.slice();
    if (this.data.pickerSuppIndex >= 0) {
      next[this.data.pickerSuppIndex] = { supplementId: suppId, amount: recommended || 1 };
    } else {
      next.push({ supplementId: suppId, amount: recommended || 1 });
    }
    this.setData({ supplements: next, showSuppPicker: false }, () => this.recomputeLiveView());
  },

  onClosePickers() {
    this.setData({ showIngPicker: false, showSuppPicker: false });
  },

  onSaveRecipe() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newRecipe = {
      id: `r_${Date.now()}`,
      name: this.data.name.trim() || '新建熟自制食谱',
      catIds: this.data.selectedCatIds,
      standard: this.data.standard,
      lifeStage: this.data.lifeStage,
      days: this.data.days,
      mode: this.data.mode,
      ingredients: this.data.ingredients.filter((i) => Number(i.weight) > 0),
      supplements: this.data.supplements.filter((s) => Number(s.amount) > 0),
      createdAt: today,
      isActive: false,
      executedDays: 0,
      startDate: '',
    };

    const recipes = storage.getRecipes();
    recipes.unshift(newRecipe);
    storage.saveRecipes(recipes);

    wx.showToast({ title: '食谱已保存', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/recipe-detail/index?id=${newRecipe.id}`,
      });
    }, 350);
  },

  noop() {},
});
