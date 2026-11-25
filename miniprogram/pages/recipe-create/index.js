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
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    isDirty: false,
    step: 1,
    steps: [
      { num: 1, label: '基本设置' },
      { num: 2, label: '模式分量' },
      { num: 3, label: '食材补剂' },
      { num: 4, label: '详情校验' },
    ],
    name: '',
    catOptions: [],
    selectedCatIds: [],
    selectedCatCount: 1,
    standard: 'NRC',
    lifeStage: 'adult',
    lifeStageText: '成猫维持期',
    catNamesText: '',
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
    roleSlices: [],
    rolePieGradient: 'conic-gradient(#E7E5E4 0% 100%)',
    displayEvaluations: [],
    groupedEvaluations: [],
    unqualifiedCount: 0,
    unqualifiedDetailText: '',
    liveSummary: {
      totalWeightG: 0,
      totalKcal: 0,
      dailyWeightG: 0,
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

    // 选择器与弹窗状态
    roleFilterTabs: engine.ROLE_FILTER_TABS,
    showFullNutrients: false,
    showIngPicker: false,
    pickerIngIndex: -1,
    ingPickerKeyword: '',
    ingPickerRole: 'all',
    ingPickerCategory: 'all',
    pickerCategories: [],
    preferredReplaceRole: '',
    pickerIngredients: [],

    showSuppPicker: false,
    pickerSuppIndex: -1,
    suppPickerKeyword: '',
    pickerSupplements: [],

    // 智能文本识别弹窗
    showSmartParser: false,
    smartParseInput: '',
    smartParseMatched: [],
    smartParseUnmatched: [],
  },

  onUnload() {
    this.setUnsavedGuard(false);
  },

  setUnsavedGuard(enabled) {
    if (enabled) {
      if (wx.enableAlertBeforeUnload) {
        wx.enableAlertBeforeUnload({ message: '未保存食谱，确认返回？' });
      }
    } else if (wx.disableAlertBeforeUnload) {
      wx.disableAlertBeforeUnload();
    }
  },

  initNavBarMetrics() {
    let statusBarHeight = 20;
    let navBarHeight = 44;
    try {
      const winInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      if (winInfo && winInfo.statusBarHeight) {
        statusBarHeight = winInfo.statusBarHeight;
      }
      if (wx.getMenuButtonBoundingClientRect) {
        const menu = wx.getMenuButtonBoundingClientRect();
        if (menu && menu.height && menu.top >= statusBarHeight) {
          navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
        }
      }
    } catch (e) {}
    this.setData({
      statusBarHeight,
      navBarHeight,
      navTotalHeight: statusBarHeight + navBarHeight,
    });
  },

  onNavBack() {
    const goBack = () => {
      this.setUnsavedGuard(false);
      wx.navigateBack({
        fail: () => {
          wx.switchTab({ url: '/pages/recipes/index' });
        },
      });
    };

    if (this.data.step >= 2 || this.data.isDirty) {
      wx.showModal({
        title: '未保存食谱',
        content: '未保存食谱，确认返回？',
        confirmText: '确认返回',
        cancelText: '继续编辑',
        confirmColor: '#EF4444',
        success: (res) => {
          if (res.confirm) {
            goBack();
          }
        },
      });
      return;
    }
    goBack();
  },

  onLoad() {
    this.initNavBarMetrics();
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

  onShow() {
    const cats = storage.getCats();
    const validSelected = (this.data.selectedCatIds || []).filter((id) =>
      cats.some((c) => c.id === id)
    );
    if (validSelected.length === 0 && cats.length > 0) {
      const firstCat = cats[0];
      const nextName = !this.data.isDirty ? `${firstCat.name}的专属熟自制餐` : this.data.name;
      this.setData(
        {
          selectedCatIds: [firstCat.id],
          name: nextName,
        },
        () => {
          this.syncCatOptions();
          this.updateTargetWeight();
        }
      );
    } else if (validSelected.length !== (this.data.selectedCatIds || []).length) {
      this.setData({ selectedCatIds: validSelected }, () => {
        this.syncCatOptions();
        this.updateTargetWeight();
      });
    } else {
      this.syncCatOptions();
    }
  },

  onGoAddCat() {
    this.setUnsavedGuard(false);
    try { wx.setStorageSync('meow_open_add_cat', '1'); } catch (e) {}
    wx.switchTab({ url: '/pages/profile/index' });
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
    const lifeStage = selectedCats.length > 0 ? engine.inferLifeStageFromCats(selectedCats) : this.data.lifeStage;

    this.setData({
      catOptions,
      selectedCatCount: Math.max(1, selectedCats.length),
      catNamesText: selectedCats.map((c) => c.name).join('、'),
      lifeStage,
      lifeStageText: lifeStage === 'kitten' ? '幼猫生长期' : '成猫维持期',
    });
  },

  updateTargetWeight() {
    const target = this.data.days * this.data.dailyGrams;
    this.setData({ targetTotalWeight: target });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value, isDirty: true });
    this.setUnsavedGuard(true);
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
    this.setUnsavedGuard(true);
    this.setData({ selectedCatIds: current, isDirty: true }, () => {
      this.syncCatOptions();
      this.updateTargetWeight();
    });
  },

  onSelectStandard(e) {
    this.setUnsavedGuard(true);
    this.setData({ standard: e.currentTarget.dataset.val, isDirty: true }, () => {
      if (this.data.hasGenerated) this.recomputeLiveView();
    });
  },

  onSelectLifeStage(e) {
    const val = e.currentTarget.dataset.val;
    this.setUnsavedGuard(true);
    this.setData(
      {
        lifeStage: val,
        lifeStageText: val === 'kitten' ? '幼猫生长期' : '成猫维持期',
        isDirty: true,
      },
      () => {
        if (this.data.hasGenerated) this.recomputeLiveView();
      }
    );
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
    const { ingredients, supplements, standard, lifeStage, days, mode } = this.data;
    const result = engine.calculateRecipeNutrition(ingredients, supplements, standard, lifeStage);
    const totalW = result.totalWeightG || 1;

    // 冰箱库存反推模式：汇总未过期可用库存克重
    const fridgeStockMap = {};
    if (mode === 'by_inventory') {
      const invList = storage.getInventory() || [];
      invList.forEach((inv) => {
        const w = Number(inv.weight) || 0;
        if (w <= 0) return;
        const leftDays = engine.daysBetweenToday(inv.expiryDate);
        if (leftDays < 0) return;
        fridgeStockMap[inv.meatId] = (fridgeStockMap[inv.meatId] || 0) + w;
      });
    }

    const ingredientRows = ingredients.map((item) => {
      const ing = engine.getIngredientById(item.meatId);
      const roleMeta = ing && engine.ROLE_META[ing.role] ? engine.ROLE_META[ing.role] : { label: '肉类', icon: '🥩' };
      const badge = ing ? engine.getConfidenceBadgeInfo(ing) : { shortLabel: '未知', badgeClass: 'badge-stone', isProxy: false };
      const fridgeStockG = Math.round(fridgeStockMap[item.meatId] || 0);
      const itemW = Number(item.weight) || 0;
      const isFromFridge = mode === 'by_inventory' && fridgeStockG > 0;
      const needBuyG = mode === 'by_inventory' ? Math.max(0, Math.round(itemW - fridgeStockG)) : 0;
      return {
        meatId: item.meatId,
        weight: item.weight,
        pct: Math.round((itemW / totalW) * 100),
        name: ing ? ing.name : item.meatId,
        roleIcon: roleMeta.icon,
        roleLabel: roleMeta.label,
        badgeLabel: badge.shortLabel,
        badgeClass: badge.badgeClass,
        isProxy: badge.isProxy,
        isFromFridge,
        fridgeStockG,
        needBuyG,
      };
    });

    const supplementRows = supplements.map((item) => {
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
      roleSlices,
      rolePieGradient,
      displayEvaluations,
      groupedEvaluations,
      unqualifiedCount: unqualifiedAll.length,
      unqualifiedDetailText,
      liveSummary: {
        totalWeightG: Math.round(result.totalWeightG),
        totalKcal: Math.round(result.totalKcal),
        dailyWeightG: Math.round(result.totalWeightG / Math.max(1, days || 1)),
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
    const nextStep = this.data.step - 1;
    this.setUnsavedGuard(nextStep >= 2);
    this.setData({ step: nextStep }, () => {
      wx.pageScrollTo({ scrollTop: 0, duration: 150 });
    });
  },

  onNextStep() {
    const { step, name, ingredients } = this.data;
    if (step === 1) {
      const cats = storage.getCats();
      if (!cats || cats.length === 0) {
        wx.showModal({
          title: '请先建立猫咪档案',
          content: '还没有猫咪档案，请先建立猫咪档案后再创建食谱。',
          confirmText: '去新建',
          cancelText: '取消',
          confirmColor: '#FF7B4A',
          success: (res) => {
            if (res.confirm) {
              this.onGoAddCat();
            }
          },
        });
        return;
      }
      if (!this.data.selectedCatIds || this.data.selectedCatIds.length === 0) {
        wx.showToast({ title: '请至少选择一只猫咪', icon: 'none' });
        return;
      }
      if (!name.trim()) {
        wx.showToast({ title: '请输入食谱名称', icon: 'none' });
        return;
      }
      this.setUnsavedGuard(true);
      this.setData({ step: 2 }, () => {
        wx.pageScrollTo({ scrollTop: 0, duration: 150 });
      });
      return;
    }
    if (step === 2) {
      if (!this.data.hasGenerated) {
        this.generateInitialFormula();
      } else {
        this.recomputeLiveView();
      }
      this.setUnsavedGuard(true);
      this.setData({ step: 3 }, () => {
        wx.pageScrollTo({ scrollTop: 0, duration: 150 });
      });
      return;
    }
    if (step === 3) {
      const validIngs = ingredients.filter((i) => Number(i.weight) > 0);
      if (validIngs.length === 0) {
        wx.showToast({ title: '请至少保留一项重量大于 0g 的食材', icon: 'none' });
        return;
      }
      this.recomputeLiveView();
      this.setUnsavedGuard(true);
      this.setData({ step: 4 }, () => {
        wx.pageScrollTo({ scrollTop: 0, duration: 150 });
      });
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
    this.setData(
      {
        showIngPicker: true,
        pickerIngIndex: -1,
        ingPickerKeyword: '',
        ingPickerRole: 'all',
        ingPickerCategory: 'all',
        preferredReplaceRole: '',
      },
      () => {
        this.refreshIngPicker();
      }
    );
  },

  onOpenReplaceIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    const currentItem = this.data.ingredients[index];
    const currentIng = currentItem ? engine.getIngredientById(currentItem.meatId) : null;
    const role = currentIng && currentIng.role ? currentIng.role : 'all';
    this.setData(
      {
        showIngPicker: true,
        pickerIngIndex: index,
        ingPickerKeyword: '',
        ingPickerRole: role,
        ingPickerCategory: 'all',
        preferredReplaceRole: role,
      },
      () => {
        this.refreshIngPicker();
      }
    );
  },

  onSelectIngPickerRole(e) {
    const role = e.currentTarget.dataset.role || 'all';
    this.setData({ ingPickerRole: role, ingPickerCategory: 'all' }, () => this.refreshIngPicker());
  },

  onSelectIngPickerCategory(e) {
    const cat = e.currentTarget.dataset.cat || 'all';
    this.setData({ ingPickerCategory: cat }, () => this.refreshIngPicker());
  },

  onIngPickerSearch(e) {
    this.setData({ ingPickerKeyword: e.detail.value || '' }, () => this.refreshIngPicker());
  },

  refreshIngPicker() {
    const kw = (this.data.ingPickerKeyword || '').trim();
    const roleFilter = this.data.ingPickerRole || 'all';
    const catFilter = this.data.ingPickerCategory || 'all';
    const preferredRole = this.data.preferredReplaceRole || '';
    const replaceIdx = this.data.pickerIngIndex;

    const existingIds = {};
    this.data.ingredients.forEach((item, idx) => {
      if (idx !== replaceIdx) existingIds[item.meatId] = true;
    });

    const roleMatched = engine.INGREDIENTS_DB.filter((ing) => {
      if (roleFilter !== 'all' && ing.role !== roleFilter) return false;
      return true;
    });

    const searched = kw ? engine.searchIngredientsFuzzy(kw, roleMatched) : roleMatched.slice();

    // 构建左侧肉类分类侧边栏（猪肉、牛肉、鸡、鸭、兔等）
    const catCountMap = {};
    searched.forEach((ing) => {
      const c = ing.category || '其他';
      catCountMap[c] = (catCountMap[c] || 0) + 1;
    });
    const orderedCats = engine.CATEGORY_ORDER.filter((c) => catCountMap[c] > 0);
    Object.keys(catCountMap).forEach((c) => {
      if (orderedCats.indexOf(c) === -1) orderedCats.push(c);
    });
    const pickerCategories = [{ id: 'all', label: '全部' }].concat(
      orderedCats.map((c) => ({
        id: c,
        label: engine.getCategoryShortLabel(c),
      }))
    );

    const effectiveCat = catFilter !== 'all' && !catCountMap[catFilter] ? 'all' : catFilter;
    const filtered = searched.filter((ing) => {
      if (effectiveCat !== 'all' && (ing.category || '其他') !== effectiveCat) return false;
      return true;
    });

    if (!kw) {
      filtered.sort((a, b) => {
        if (preferredRole) {
          const aSame = a.role === preferredRole ? 0 : 1;
          const bSame = b.role === preferredRole ? 0 : 1;
          if (aSame !== bSame) return aSame - bSame;
        }
        const aUsed = existingIds[a.id] ? 1 : 0;
        const bUsed = existingIds[b.id] ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;
        const aCatIdx = engine.CATEGORY_ORDER.indexOf(a.category);
        const bCatIdx = engine.CATEGORY_ORDER.indexOf(b.category);
        const ca = aCatIdx !== -1 ? aCatIdx : 99;
        const cb = bCatIdx !== -1 ? bCatIdx : 99;
        if (ca !== cb) return ca - cb;
        const aProxy = a.is_proxy ? 1 : 0;
        const bProxy = b.is_proxy ? 1 : 0;
        return aProxy - bProxy;
      });
    }

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
    this.setData({
      pickerCategories,
      ingPickerCategory: effectiveCat,
      pickerIngredients: list,
    });
  },

  onSelectPickerIngredient(e) {
    const meatId = e.currentTarget.dataset.id;
    const replaceIdx = this.data.pickerIngIndex;
    const isDup = this.data.ingredients.some((item, idx) => idx !== replaceIdx && item.meatId === meatId);
    if (isDup) {
      wx.showToast({ title: '该食材已在食谱中，不可重复添加', icon: 'none' });
      return;
    }

    const next = this.data.ingredients.slice();
    if (replaceIdx >= 0) {
      next[replaceIdx] = Object.assign({}, next[replaceIdx], { meatId });
    } else {
      next.push({ meatId, weight: 0 });
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

  refreshSuppPicker(replaceIdx) {
    const kw = (this.data.suppPickerKeyword || '').trim();
    const existingIds = {};
    this.data.supplements.forEach((s, idx) => {
      if (idx !== replaceIdx) existingIds[s.supplementId] = true;
    });
    const matched = kw
      ? engine.searchSupplementsFuzzy(kw, engine.SUPPLEMENTS_DB)
      : engine.SUPPLEMENTS_DB;
    const pickerSupplements = matched.map((s) =>
      Object.assign({}, s, { alreadyAdded: Boolean(existingIds[s.id]) })
    );
    this.setData({ pickerSupplements });
  },

  onSuppPickerSearch(e) {
    this.setData({ suppPickerKeyword: e.detail.value || '' }, () => {
      this.refreshSuppPicker(this.data.pickerSuppIndex);
    });
  },

  onOpenAddSupplement() {
    this.setData({ showSuppPicker: true, pickerSuppIndex: -1, suppPickerKeyword: '' }, () => {
      this.refreshSuppPicker(-1);
    });
  },

  onOpenReplaceSupplement(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ showSuppPicker: true, pickerSuppIndex: index, suppPickerKeyword: '' }, () => {
      this.refreshSuppPicker(index);
    });
  },

  // 智能文本识别添加食材
  onOpenSmartParser() {
    this.setData({
      showSmartParser: true,
      smartParseInput: '',
      smartParseMatched: [],
      smartParseUnmatched: [],
    });
  },

  onSmartParseInput(e) {
    const val = e.detail.value || '';
    const parsed = engine.parseNaturalIngredientsText(val);
    this.setData({
      smartParseInput: val,
      smartParseMatched: parsed.matched,
      smartParseUnmatched: parsed.unmatched,
    });
  },

  onApplySmartParse() {
    const parsed = engine.parseNaturalIngredientsText(this.data.smartParseInput);
    if (parsed.matched.length === 0) {
      wx.showToast({ title: '未识别到有效食材，请检查输入格式', icon: 'none' });
      return;
    }

    const next = this.data.ingredients.slice();
    let addedCount = 0;
    let updatedCount = 0;
    parsed.matched.forEach((item) => {
      const idx = next.findIndex((x) => x.meatId === item.meatId);
      if (idx !== -1) {
        const curW = Number(next[idx].weight) || 0;
        next[idx] = Object.assign({}, next[idx], { weight: item.weight > 0 ? item.weight : curW });
        updatedCount += 1;
      } else {
        next.push({ meatId: item.meatId, weight: item.weight });
        addedCount += 1;
      }
    });

    this.setData(
      {
        ingredients: next,
        showSmartParser: false,
        smartParseInput: '',
        smartParseMatched: [],
        smartParseUnmatched: [],
      },
      () => {
        this.recomputeLiveView();
        const msg =
          updatedCount > 0 && addedCount > 0
            ? `已新增 ${addedCount} 项、更新 ${updatedCount} 项`
            : updatedCount > 0
            ? `已更新 ${updatedCount} 项食材重量`
            : `已识别并添加 ${addedCount} 项食材`;
        wx.showToast({ title: msg, icon: 'success' });
      }
    );
  },

  onSelectPickerSupplement(e) {
    const suppId = e.currentTarget.dataset.id;
    const replaceIdx = this.data.pickerSuppIndex;
    const isDup = this.data.supplements.some((s, idx) => idx !== replaceIdx && s.supplementId === suppId);
    if (isDup) {
      wx.showToast({ title: '该补剂已在列表中', icon: 'none' });
      return;
    }

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
    if (replaceIdx >= 0) {
      next[replaceIdx] = { supplementId: suppId, amount: recommended };
    } else {
      next.push({ supplementId: suppId, amount: recommended });
    }
    this.setData({ supplements: next, showSuppPicker: false }, () => this.recomputeLiveView());
  },

  onOpenFullNutrients() {
    this.setData({ showFullNutrients: true });
  },

  onClosePickers() {
    this.setData({
      showFullNutrients: false,
      showIngPicker: false,
      showSuppPicker: false,
      showSmartParser: false,
    });
  },

  onSaveRecipe() {
    const cats = storage.getCats();
    if (!cats || cats.length === 0 || !this.data.selectedCatIds || this.data.selectedCatIds.length === 0) {
      wx.showToast({ title: '请先填写并选择猫咪档案', icon: 'none' });
      return;
    }
    const cleanIngs = this.data.ingredients.filter((i) => Number(i.weight) > 0);
    if (cleanIngs.length === 0) {
      wx.showToast({ title: '请至少保留一项重量大于 0g 的食材', icon: 'none' });
      return;
    }
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
      ingredients: cleanIngs,
      supplements: this.data.supplements.filter((s) => Number(s.amount) > 0),
      createdAt: today,
      isActive: false,
      executedDays: 0,
      startDate: '',
    };

    const recipes = storage.getRecipes();
    recipes.unshift(newRecipe);
    storage.saveRecipes(recipes);
    this.setUnsavedGuard(false);

    wx.showToast({ title: '食谱已保存', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/recipe-detail/index?id=${newRecipe.id}`,
      });
    }, 350);
  },

  noop() {},
});
