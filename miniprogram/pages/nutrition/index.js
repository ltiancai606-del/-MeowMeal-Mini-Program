const engine = require('../../utils/nutritionEngine');

const SUPP_ICON_MAP = {
  calcium: '🦴',
  fish_oil: '🐟',
  iodine: '🧂',
  vb: '💊',
  ve: '✨',
  taurine: '⚡',
};

const SUPP_CATEGORY_TABS = [
  { id: 'all', name: '全部', icon: '💊' },
  { id: 'calcium', name: '钙粉', icon: '🦴' },
  { id: 'fish_oil', name: '鱼油', icon: '🐟' },
  { id: 'iodine', name: '碘/钾', icon: '🧂' },
  { id: 'vb', name: '复合维B', icon: '💊' },
  { id: 've', name: '维生素E', icon: '✨' },
  { id: 'taurine', name: '牛磺酸', icon: '⚡' },
];

const UNQUANTIFIED_LABEL_MAP = {
  ve_mg: '维生素 E (未定量，不计入)',
};

Page({
  data: {
    activeTab: 'ingredients',
    keyword: '',
    activeRole: 'all',
    activeSuppCat: 'all',
    roleTabs: engine.ROLE_FILTER_TABS,
    suppCategoryTabs: SUPP_CATEGORY_TABS,
    totalIngredients: engine.INGREDIENTS_DB.length,
    totalSupplements: engine.SUPPLEMENTS_DB.length,
    matchedIngredientCount: 0,
    groupedIngredients: [],
    filteredSupplements: [],
    selectedIngredient: null,
    selectedSupplement: null,
  },

  onLoad(options) {
    const initialTab = options && options.type === 'supplements' ? 'supplements' : 'ingredients';
    this.setData({ activeTab: initialTab }, () => {
      this.refreshLists();
    });
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, keyword: '' }, () => {
      this.refreshLists();
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value || '' }, () => {
      this.refreshLists();
    });
  },

  onClearSearch() {
    this.setData({ keyword: '' }, () => {
      this.refreshLists();
    });
  },

  onSelectRole(e) {
    this.setData({ activeRole: e.currentTarget.dataset.role }, () => {
      this.refreshLists();
    });
  },

  onSelectSuppCat(e) {
    this.setData({ activeSuppCat: e.currentTarget.dataset.cat }, () => {
      this.refreshLists();
    });
  },

  refreshLists() {
    const kw = (this.data.keyword || '').trim();

    // 1. 食材分组列表（支持关键字模糊匹配）
    const roleMatchedIngs = engine.INGREDIENTS_DB.filter((ing) => {
      if (this.data.activeRole !== 'all' && ing.role !== this.data.activeRole) return false;
      return true;
    });
    const filteredIngs = kw ? engine.searchIngredientsFuzzy(kw, roleMatchedIngs) : roleMatchedIngs;

    const groupMap = {};
    filteredIngs.forEach((ing) => {
      const cat = ing.category || '其他';
      if (!groupMap[cat]) groupMap[cat] = [];
      const badge = engine.getConfidenceBadgeInfo(ing);
      const roleMeta = engine.ROLE_META[ing.role] || { label: ing.role, icon: '🥩' };
      groupMap[cat].push({
        id: ing.id,
        name: ing.name,
        roleIcon: roleMeta.icon,
        badgeLabel: badge.shortLabel,
        badgeClass: badge.badgeClass,
        isProxy: badge.isProxy,
        kcalText: engine.formatIngredientNutrientValue(ing, 'kcal', 'kcal', 0).text,
        proteinText: engine.formatIngredientNutrientValue(ing, 'protein_g', 'g', 1).text,
        fatText: engine.formatIngredientNutrientValue(ing, 'fat_g', 'g', 1).text,
      });
    });

    const orderedCategories = engine.CATEGORY_ORDER.filter((cat) => groupMap[cat] && groupMap[cat].length > 0);
    Object.keys(groupMap).forEach((cat) => {
      if (orderedCategories.indexOf(cat) === -1) orderedCategories.push(cat);
    });

    const groupedIngredients = orderedCategories.map((cat) => ({
      category: cat,
      items: groupMap[cat],
    }));

    // 2. 补剂列表（支持关键字模糊匹配）
    const catMatchedSupps = engine.SUPPLEMENTS_DB.filter((supp) => {
      if (this.data.activeSuppCat !== 'all' && supp.type !== this.data.activeSuppCat) return false;
      return true;
    });
    const matchedSupps = kw ? engine.searchSupplementsFuzzy(kw, catMatchedSupps) : catMatchedSupps;
    const filteredSupplements = matchedSupps.map((supp) => {
      const highlights = [];
      engine.SUPP_NUTRIENT_LABELS.forEach((meta) => {
        const val = supp.nutrients[meta.key];
        if (val !== null && val !== undefined && val > 0 && highlights.length < 3) {
          highlights.push({
            label: meta.label,
            value: `${val} ${meta.unit}`,
          });
        }
      });
      return {
        id: supp.id,
        name: supp.name,
        category: supp.category,
        unit_label: supp.unit_label,
        brand: supp.brand,
        note: supp.note || '',
        icon: SUPP_ICON_MAP[supp.type] || '💊',
        hasUnquantified: Boolean(supp.unquantified_fields && supp.unquantified_fields.length > 0),
        highlights,
      };
    });

    this.setData({
      matchedIngredientCount: filteredIngs.length,
      groupedIngredients,
      filteredSupplements,
    });
  },

  onOpenIngredient(e) {
    const id = e.currentTarget.dataset.id;
    const ing = engine.getIngredientById(id);
    if (!ing) return;

    const badge = engine.getConfidenceBadgeInfo(ing);
    const roleMeta = engine.ROLE_META[ing.role] || { label: ing.role, icon: '🥩' };
    const fields = engine.INGREDIENT_DETAIL_FIELDS.map((f) => {
      const formatted = engine.formatIngredientNutrientValue(ing, f.key, f.unit, f.decimals);
      return {
        key: f.key,
        label: f.label,
        text: formatted.text,
        isMissing: formatted.isMissing,
        isTrace: formatted.isTrace,
      };
    });

    this.setData({
      selectedIngredient: {
        id: ing.id,
        name: ing.name,
        category: ing.category,
        roleIcon: roleMeta.icon,
        roleLabel: roleMeta.label,
        badgeClass: badge.badgeClass,
        badgeFull: badge.fullLabel || badge.shortLabel,
        isProxy: badge.isProxy,
        dryMatterText:
          ing.dry_matter_g !== null && ing.dry_matter_g !== undefined
            ? `${ing.dry_matter_g} g`
            : '未报告',
        source_code: ing.source_code || '',
        source_note: ing.source_note || '',
        fields,
      },
    });
  },

  onOpenSupplement(e) {
    const id = e.currentTarget.dataset.id;
    const supp = engine.getSupplementById(id);
    if (!supp) return;

    const nutrientRows = [];
    engine.SUPP_NUTRIENT_LABELS.forEach((meta) => {
      const val = supp.nutrients[meta.key];
      if (val !== null && val !== undefined && val > 0) {
        nutrientRows.push({
          key: meta.key,
          label: meta.label,
          valueText: `${val} ${meta.unit}`,
        });
      }
    });

    const unquantifiedList = (supp.unquantified_fields || []).map(
      (f) => UNQUANTIFIED_LABEL_MAP[f] || `${f} (未定量)`
    );

    this.setData({
      selectedSupplement: {
        id: supp.id,
        name: supp.name,
        category: supp.category,
        unit_label: supp.unit_label,
        brand: supp.brand,
        icon: SUPP_ICON_MAP[supp.type] || '💊',
        note: supp.note || '',
        nutrientRows,
        unquantifiedList,
        unquantifiedText: unquantifiedList.join('、'),
      },
    });
  },

  onCloseModals() {
    this.setData({
      selectedIngredient: null,
      selectedSupplement: null,
    });
  },

  noop() {},
});
