const engine = require('../../utils/nutritionEngine');
const storage = require('../../utils/storage');

const GROUP_ORDER = ['宏量营养素', '矿物质', '氨基酸与脂肪酸', '维生素'];

const ROLE_COLORS = {
  white_meat: '#FF7B4A',
  red_meat: '#EF4444',
  heart: '#EC4899',
  fish: '#3B82F6',
  mussel: '#14B8A6',
  liver: '#8B5CF6',
  other_organ: '#F59E0B',
  egg: '#EAB308',
  fat: '#6366F1',
};

const FALLBACK_COLORS = ['#FF7B4A', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#EF4444'];

Page({
  data: {
    recipeId: '',
    recipe: null,
    standard: 'NRC',
    lifeStage: 'adult',
    lifeStageText: '成猫维持期',
    catNamesText: '',
    isEditing: false,

    // 编辑态草稿
    draftIngredients: [],
    draftSupplements: [],

    // 视图派生数据
    ingredientRows: [],
    supplementRows: [],
    roleSlices: [],
    rolePieGradient: 'conic-gradient(#E7E5E4 0% 100%)',
    displayEvaluations: [],
    groupedEvaluations: [],
    unqualifiedCount: 0,
    unqualifiedDetailText: '',
    summary: {
      totalWeightG: 0,
      totalKcal: 0,
      dailyWeightG: 0,
      caPRatioText: '0.00 : 1',
      caPClass: '',
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

    // 弹窗状态
    roleFilterTabs: engine.ROLE_FILTER_TABS,
    showFullNutrients: false,
    showIngPicker: false,
    pickerIngIndex: -1,
    ingPickerKeyword: '',
    ingPickerRole: 'all',
    preferredReplaceRole: '',
    pickerIngredients: [],
    showSuppPicker: false,
    pickerSuppIndex: -1,
    pickerSupplements: [],
  },

  onLoad(options) {
    const id = options && options.id ? options.id : '';
    this.setData({ recipeId: id }, () => {
      this.loadRecipe();
    });
  },

  onShow() {
    if (!this.data.isEditing) {
      this.loadRecipe();
    }
  },

  loadRecipe() {
    const all = storage.getRecipes();
    let recipe = all.find((r) => r.id === this.data.recipeId);
    if (!recipe && all.length > 0) {
      recipe = all[0];
    }
    if (!recipe) {
      wx.showToast({ title: '未找到该食谱', icon: 'none' });
      return;
    }

    const cats = storage.getCats();
    const linkedCats = (recipe.catIds || [])
      .map((cid) => cats.find((x) => x.id === cid))
      .filter(Boolean);
    const catNames = linkedCats.map((c) => c.name);

    // 根据关联猫咪自动判定成猫/幼猫；若无关联猫咪则沿用食谱创建时的生命阶段
    const inferredStage =
      linkedCats.length > 0
        ? engine.inferLifeStageFromCats(linkedCats)
        : recipe.lifeStage || 'adult';

    this.setData(
      {
        recipeId: recipe.id,
        recipe,
        standard: recipe.standard || 'NRC',
        lifeStage: inferredStage,
        lifeStageText: inferredStage === 'kitten' ? '幼猫生长期' : '成猫维持期',
        catNamesText: catNames.join('、'),
        draftIngredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
        draftSupplements: JSON.parse(JSON.stringify(recipe.supplements || [])),
      },
      () => {
        this.recomputeView();
      }
    );
  },

  recomputeView() {
    const { recipe, isEditing, draftIngredients, draftSupplements, standard, lifeStage } = this.data;
    if (!recipe) return;

    const activeIngredients = isEditing ? draftIngredients : recipe.ingredients || [];
    const activeSupplements = isEditing ? draftSupplements : recipe.supplements || [];

    const result = engine.calculateRecipeNutrition(
      activeIngredients,
      activeSupplements,
      standard,
      lifeStage
    );

    const totalW = result.totalWeightG || 1;
    const ingredientRows = activeIngredients.map((item) => {
      const ing = engine.getIngredientById(item.meatId);
      const roleMeta = ing && engine.ROLE_META[ing.role] ? engine.ROLE_META[ing.role] : { label: '肉类', icon: '🥩' };
      const badge = ing ? engine.getConfidenceBadgeInfo(ing) : { shortLabel: '未知', badgeClass: 'badge-stone', isProxy: false };
      return {
        meatId: item.meatId,
        weight: item.weight,
        pct: Math.round(((Number(item.weight) || 0) / totalW) * 100),
        name: ing ? ing.name : item.meatId,
        roleIcon: roleMeta.icon,
        roleLabel: roleMeta.label,
        badgeLabel: badge.shortLabel,
        badgeClass: badge.badgeClass,
        isProxy: badge.isProxy,
      };
    });

    const supplementRows = activeSupplements.map((item) => {
      const supp = engine.getSupplementById(item.supplementId);
      return {
        supplementId: item.supplementId,
        amount: item.amount,
        name: supp ? supp.name : item.supplementId,
        category: supp ? supp.category : '补剂',
        unit: supp ? supp.unit : '',
        unitLabel: supp ? supp.unit_label : '',
      };
    });

    // 饼状图切片与 conic-gradient 生成
    const roleSlices = Object.keys(result.roleWeights)
      .filter((role) => result.roleWeights[role] > 0)
      .map((role, idx) => {
        const meta = engine.ROLE_META[role] || { label: role, icon: '🥩' };
        const weight = Math.round(result.roleWeights[role]);
        const exactPct = (result.roleWeights[role] / totalW) * 100;
        return {
          role,
          label: meta.label,
          icon: meta.icon,
          weight,
          pct: Math.round(exactPct * 10) / 10,
          exactPct,
          color: ROLE_COLORS[role] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
        };
      })
      .sort((a, b) => b.weight - a.weight);

    let rolePieGradient = 'conic-gradient(#E7E5E4 0% 100%)';
    if (roleSlices.length > 0) {
      let acc = 0;
      const stops = roleSlices.map((s, idx) => {
        const start = acc;
        acc = idx === roleSlices.length - 1 ? 100 : acc + s.exactPct;
        return `${s.color} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;
      });
      rolePieGradient = `conic-gradient(${stops.join(', ')})`;
    }

    // 不合格项统计 & 置顶展示（红灯优先，其次黄灯，再附其余核心达标项）
    const redItems = result.evaluations.filter((ev) => ev.status === 'red');
    const yellowItems = result.evaluations.filter((ev) => ev.status === 'yellow');
    const unqualifiedAll = redItems.concat(yellowItems);
    const unqualifiedKeySet = {};
    unqualifiedAll.forEach((ev) => {
      unqualifiedKeySet[ev.key] = true;
    });

    const remainingCore = result.evaluations.filter((ev) => ev.core && !unqualifiedKeySet[ev.key]);
    const displayEvaluations = unqualifiedAll.concat(remainingCore);

    const detailParts = [];
    if (redItems.length > 0) detailParts.push(`${redItems.length} 项红灯`);
    if (yellowItems.length > 0) detailParts.push(`${yellowItems.length} 项黄灯`);
    const unqualifiedDetailText = detailParts.join(' · ');

    // 全部 28 项弹窗严格按照标准库原始顺序分组展示
    const groupedEvaluations = GROUP_ORDER.map((group) => ({
      group,
      items: result.evaluations.filter((ev) => ev.group === group),
    })).filter((g) => g.items.length > 0);

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
      roleSlices,
      rolePieGradient,
      displayEvaluations,
      groupedEvaluations,
      unqualifiedCount: unqualifiedAll.length,
      unqualifiedDetailText,
      summary: {
        totalWeightG: Math.round(result.totalWeightG),
        totalKcal: Math.round(result.totalKcal),
        dailyWeightG: Math.round(result.totalWeightG / Math.max(1, recipe.days || 1)),
        caPRatioText: `${result.caPRatio.toFixed(2)} : 1`,
        caPClass,
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

  persistRecipePatch(patch) {
    const all = storage.getRecipes();
    const next = all.map((r) => (r.id === this.data.recipeId ? Object.assign({}, r, patch) : r));
    storage.saveRecipes(next);
    const updated = next.find((r) => r.id === this.data.recipeId);
    this.setData({ recipe: updated }, () => this.recomputeView());
  },

  onSwitchStandard(e) {
    const standard = e.currentTarget.dataset.val;
    if (standard === this.data.standard) return;
    this.setData({ standard }, () => {
      this.persistRecipePatch({ standard });
    });
  },

  onToggleEdit() {
    if (this.data.isEditing) {
      this.setData(
        {
          isEditing: false,
          draftIngredients: JSON.parse(JSON.stringify(this.data.recipe.ingredients || [])),
          draftSupplements: JSON.parse(JSON.stringify(this.data.recipe.supplements || [])),
        },
        () => this.recomputeView()
      );
    } else {
      this.setData(
        {
          isEditing: true,
          draftIngredients: JSON.parse(JSON.stringify(this.data.recipe.ingredients || [])),
          draftSupplements: JSON.parse(JSON.stringify(this.data.recipe.supplements || [])),
        },
        () => this.recomputeView()
      );
    }
  },

  onSaveEdits() {
    const cleanIngs = this.data.draftIngredients.filter((i) => Number(i.weight) > 0);
    const cleanSupps = this.data.draftSupplements.filter((s) => Number(s.amount) > 0);
    if (cleanIngs.length === 0) {
      wx.showToast({ title: '请至少保留一项食材', icon: 'none' });
      return;
    }
    this.setData({ isEditing: false });
    this.persistRecipePatch({
      ingredients: cleanIngs,
      supplements: cleanSupps,
      standard: this.data.standard,
      lifeStage: this.data.lifeStage,
    });
    wx.showToast({ title: '已保存修改', icon: 'success' });
  },

  // 编辑态：食材操作
  onIngWeightInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const val = parseFloat(e.detail.value);
    const next = this.data.draftIngredients.slice();
    next[index] = Object.assign({}, next[index], { weight: isNaN(val) ? 0 : Math.max(0, val) });
    this.setData({ draftIngredients: next }, () => this.recomputeView());
  },

  onStepIngWeight(e) {
    const index = Number(e.currentTarget.dataset.index);
    const delta = Number(e.currentTarget.dataset.delta);
    const next = this.data.draftIngredients.slice();
    const cur = Number(next[index].weight) || 0;
    next[index] = Object.assign({}, next[index], { weight: Math.max(0, cur + delta) });
    this.setData({ draftIngredients: next }, () => this.recomputeView());
  },

  onRemoveIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = this.data.draftIngredients.slice();
    next.splice(index, 1);
    this.setData({ draftIngredients: next }, () => this.recomputeView());
  },

  onOpenAddIngredient() {
    this.setData(
      {
        showIngPicker: true,
        pickerIngIndex: -1,
        ingPickerKeyword: '',
        ingPickerRole: 'all',
        preferredReplaceRole: '',
      },
      () => {
        this.refreshIngPicker();
      }
    );
  },

  onOpenReplaceIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    const currentItem = this.data.draftIngredients[index];
    const currentIng = currentItem ? engine.getIngredientById(currentItem.meatId) : null;
    const role = currentIng && currentIng.role ? currentIng.role : 'all';
    this.setData(
      {
        showIngPicker: true,
        pickerIngIndex: index,
        ingPickerKeyword: '',
        ingPickerRole: role,
        preferredReplaceRole: role,
      },
      () => {
        this.refreshIngPicker();
      }
    );
  },

  onSelectIngPickerRole(e) {
    const role = e.currentTarget.dataset.role || 'all';
    this.setData({ ingPickerRole: role }, () => this.refreshIngPicker());
  },

  onIngPickerSearch(e) {
    this.setData({ ingPickerKeyword: e.detail.value || '' }, () => this.refreshIngPicker());
  },

  refreshIngPicker() {
    const kw = (this.data.ingPickerKeyword || '').trim().toLowerCase();
    const roleFilter = this.data.ingPickerRole || 'all';
    const preferredRole = this.data.preferredReplaceRole || '';
    const replaceIdx = this.data.pickerIngIndex;

    const existingIds = {};
    this.data.draftIngredients.forEach((item, idx) => {
      if (idx !== replaceIdx) existingIds[item.meatId] = true;
    });

    const filtered = engine.INGREDIENTS_DB.filter((ing) => {
      if (roleFilter !== 'all' && ing.role !== roleFilter) return false;
      if (!kw) return true;
      return (
        ing.name.toLowerCase().indexOf(kw) !== -1 ||
        (ing.category || '').toLowerCase().indexOf(kw) !== -1
      );
    });

    filtered.sort((a, b) => {
      if (preferredRole) {
        const aSame = a.role === preferredRole ? 0 : 1;
        const bSame = b.role === preferredRole ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
      }
      const aUsed = existingIds[a.id] ? 1 : 0;
      const bUsed = existingIds[b.id] ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed;
      const aProxy = a.is_proxy ? 1 : 0;
      const bProxy = b.is_proxy ? 1 : 0;
      return aProxy - bProxy;
    });

    const list = filtered.map((ing) => {
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
        alreadyAdded: Boolean(existingIds[ing.id]),
      };
    });
    this.setData({ pickerIngredients: list });
  },

  onSelectPickerIngredient(e) {
    const meatId = e.currentTarget.dataset.id;
    const replaceIdx = this.data.pickerIngIndex;
    const isDup = this.data.draftIngredients.some(
      (item, idx) => idx !== replaceIdx && item.meatId === meatId
    );
    if (isDup) {
      wx.showToast({ title: '该食材已在食谱中，不可重复添加', icon: 'none' });
      return;
    }

    const next = this.data.draftIngredients.slice();
    if (replaceIdx >= 0) {
      next[replaceIdx] = Object.assign({}, next[replaceIdx], { meatId });
    } else {
      next.push({ meatId, weight: 0 });
    }
    this.setData({ draftIngredients: next, showIngPicker: false }, () => this.recomputeView());
  },

  // 编辑态：补剂操作
  onSuppAmountInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const val = parseFloat(e.detail.value);
    const next = this.data.draftSupplements.slice();
    next[index] = Object.assign({}, next[index], { amount: isNaN(val) ? 0 : Math.max(0, val) });
    this.setData({ draftSupplements: next }, () => this.recomputeView());
  },

  onRemoveSupplement(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = this.data.draftSupplements.slice();
    next.splice(index, 1);
    this.setData({ draftSupplements: next }, () => this.recomputeView());
  },

  onRecalcSupplements() {
    const recommended = engine.recommendSupplements(
      this.data.draftIngredients,
      this.data.standard,
      this.data.lifeStage,
      this.data.draftSupplements
    );
    this.setData({ draftSupplements: recommended }, () => {
      this.recomputeView();
      wx.showToast({ title: '已智能重算补剂', icon: 'success' });
    });
  },

  refreshSuppPicker(replaceIdx) {
    const existingIds = {};
    this.data.draftSupplements.forEach((s, idx) => {
      if (idx !== replaceIdx) existingIds[s.supplementId] = true;
    });
    const pickerSupplements = engine.SUPPLEMENTS_DB.map((s) =>
      Object.assign({}, s, { alreadyAdded: Boolean(existingIds[s.id]) })
    );
    this.setData({ pickerSupplements });
  },

  onOpenAddSupplement() {
    this.setData({ showSuppPicker: true, pickerSuppIndex: -1 }, () => {
      this.refreshSuppPicker(-1);
    });
  },

  onOpenReplaceSupplement(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ showSuppPicker: true, pickerSuppIndex: index }, () => {
      this.refreshSuppPicker(index);
    });
  },

  onSelectPickerSupplement(e) {
    const suppId = e.currentTarget.dataset.id;
    const replaceIdx = this.data.pickerSuppIndex;
    const isDup = this.data.draftSupplements.some(
      (s, idx) => idx !== replaceIdx && s.supplementId === suppId
    );
    if (isDup) {
      wx.showToast({ title: '该补剂已在列表中', icon: 'none' });
      return;
    }

    const supp = engine.getSupplementById(suppId);
    if (!supp) return;

    const meatOnly = engine.calculateRecipeNutrition(
      this.data.draftIngredients,
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

    const next = this.data.draftSupplements.slice();
    if (replaceIdx >= 0) {
      next[replaceIdx] = { supplementId: suppId, amount: recommended };
    } else {
      next.push({ supplementId: suppId, amount: recommended });
    }
    this.setData({ draftSupplements: next, showSuppPicker: false }, () => this.recomputeView());
  },

  // 底部执行、复制、删除操作
  onToggleActive() {
    const isNowActive = !this.data.recipe.isActive;
    const all = storage.getRecipes();
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const next = all.map((r) => {
      if (r.id === this.data.recipeId) {
        return Object.assign({}, r, {
          isActive: isNowActive,
          startDate: isNowActive ? stamp : r.startDate,
        });
      }
      return isNowActive ? Object.assign({}, r, { isActive: false }) : r;
    });
    storage.saveRecipes(next);
    this.loadRecipe();
    wx.showToast({ title: isNowActive ? '已开始执行' : '已暂停执行', icon: 'success' });
  },

  onCopyRecipe() {
    const copy = Object.assign({}, JSON.parse(JSON.stringify(this.data.recipe)), {
      id: `r_${Date.now()}`,
      name: `${this.data.recipe.name} (副本)`,
      isActive: false,
      executedDays: 0,
    });
    const all = storage.getRecipes();
    all.unshift(copy);
    storage.saveRecipes(all);
    wx.showToast({ title: '已复制新食谱', icon: 'success' });
  },

  onDeleteRecipe() {
    wx.showModal({
      title: '删除食谱',
      content: `确认删除「${this.data.recipe.name}」吗？`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return;
        const next = storage.getRecipes().filter((r) => r.id !== this.data.recipeId);
        storage.saveRecipes(next);
        wx.showToast({ title: '已删除', icon: 'none' });
        setTimeout(() => {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/recipes/index' }) });
        }, 300);
      },
    });
  },

  onOpenFullNutrients() {
    this.setData({ showFullNutrients: true });
  },

  onCloseModals() {
    this.setData({
      showFullNutrients: false,
      showIngPicker: false,
      showSuppPicker: false,
    });
  },

  noop() {},
});
