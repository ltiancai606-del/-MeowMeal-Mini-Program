const engine = require('../../utils/nutritionEngine');
const storage = require('../../utils/storage');

function formatDateToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    activeFilter: 'all',
    keyword: '',
    stats: { all: 0, normal: 0, expiring: 0, expired: 0, low: 0 },
    statusTabs: [],
    totalWeightKg: '0.00',
    displayItems: [],
    showModal: false,
    showIngPicker: false,
    editingId: '',
    formMeatId: 'ing_086',
    formWeight: '500',
    formPrice: '20',
    formProdDate: '',
    formExpiryDate: '',
    selectedIngMeta: { icon: '🍗', name: '', isProxy: false },
    ingPickerKeyword: '',
    pickerIngredients: [],
  },

  onShow() {
    this.loadInventory();
  },

  loadInventory() {
    const rawItems = storage.getInventory();
    const kw = (this.data.keyword || '').trim().toLowerCase();

    const stats = { all: 0, normal: 0, expiring: 0, expired: 0, low: 0 };
    let totalWeight = 0;

    const enriched = rawItems.map((item) => {
      const ing = engine.getIngredientById(item.meatId);
      const roleMeta = ing && engine.ROLE_META[ing.role] ? engine.ROLE_META[ing.role] : { label: '食材', icon: '🥩' };
      const badge = ing ? engine.getConfidenceBadgeInfo(ing) : { shortLabel: '未知', badgeClass: 'badge-stone', isProxy: false };
      const daysLeft = engine.daysBetweenToday(item.expiryDate);

      let status = 'normal';
      let statusText = daysLeft < 999 ? `剩 ${daysLeft} 天` : '正常';
      let statusBadgeClass = 'badge-green';

      if (daysLeft < 0) {
        status = 'expired';
        statusText = `已过期 ${Math.abs(daysLeft)} 天`;
        statusBadgeClass = 'badge-red';
        stats.expired += 1;
      } else if (daysLeft <= 3) {
        status = 'expiring';
        statusText = daysLeft === 0 ? '今天到期' : `临期 · 剩 ${daysLeft} 天`;
        statusBadgeClass = 'badge-proxy';
        stats.expiring += 1;
      } else {
        stats.normal += 1;
      }

      const isLow = Number(item.weight) < 200;
      if (isLow) stats.low += 1;
      stats.all += 1;
      totalWeight += Number(item.weight) || 0;

      return {
        id: item.id,
        meatId: item.meatId,
        weight: item.weight,
        price: item.price || 0,
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        name: ing ? ing.name : item.meatId,
        category: ing ? ing.category : '未分类',
        roleIcon: roleMeta.icon,
        confidenceLabel: badge.shortLabel,
        confidenceClass: badge.badgeClass,
        status,
        isLow,
        statusText,
        statusBadgeClass,
        daysLeft,
      };
    });

    enriched.sort((a, b) => a.daysLeft - b.daysLeft);

    const displayItems = enriched.filter((item) => {
      if (this.data.activeFilter === 'normal' && item.status !== 'normal') return false;
      if (this.data.activeFilter === 'expiring' && item.status !== 'expiring') return false;
      if (this.data.activeFilter === 'expired' && item.status !== 'expired') return false;
      if (this.data.activeFilter === 'low' && !item.isLow) return false;
      if (!kw) return true;
      return (
        item.name.toLowerCase().indexOf(kw) !== -1 ||
        item.category.toLowerCase().indexOf(kw) !== -1
      );
    });

    const statusTabs = [
      { id: 'all', label: '全部', count: stats.all, numClass: '' },
      { id: 'normal', label: '正常', count: stats.normal, numClass: 'num-green' },
      { id: 'expiring', label: '临期', count: stats.expiring, numClass: 'num-amber' },
      { id: 'expired', label: '过期', count: stats.expired, numClass: 'num-red' },
      { id: 'low', label: '低库存', count: stats.low, numClass: 'num-blue' },
    ];

    this.setData({
      stats,
      statusTabs,
      totalWeightKg: (totalWeight / 1000).toFixed(2),
      displayItems,
    });
  },

  onSelectFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.filter }, () => {
      this.loadInventory();
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value || '' }, () => {
      this.loadInventory();
    });
  },

  onClearSearch() {
    this.setData({ keyword: '' }, () => {
      this.loadInventory();
    });
  },

  buildIngMeta(meatId) {
    const ing = engine.getIngredientById(meatId) || engine.INGREDIENTS_DB[0];
    const roleMeta = engine.ROLE_META[ing.role] || { icon: '🥩' };
    return {
      icon: roleMeta.icon,
      name: ing.name,
      isProxy: Boolean(ing.is_proxy),
    };
  },

  onOpenAdd() {
    const defaultMeatId = 'ing_086';
    this.setData({
      showModal: true,
      editingId: '',
      formMeatId: defaultMeatId,
      formWeight: '500',
      formPrice: '20',
      formProdDate: formatDateToday(0),
      formExpiryDate: formatDateToday(30),
      selectedIngMeta: this.buildIngMeta(defaultMeatId),
    });
  },

  onOpenEdit(e) {
    const id = e.currentTarget.dataset.id;
    const found = storage.getInventory().find((i) => i.id === id);
    if (!found) return;
    this.setData({
      showModal: true,
      editingId: found.id,
      formMeatId: found.meatId,
      formWeight: String(found.weight),
      formPrice: String(found.price || 0),
      formProdDate: found.productionDate || formatDateToday(0),
      formExpiryDate: found.expiryDate || formatDateToday(30),
      selectedIngMeta: this.buildIngMeta(found.meatId),
    });
  },

  onCloseModal() {
    this.setData({ showModal: false, showIngPicker: false });
  },

  onOpenIngPicker() {
    this.setData({ showIngPicker: true, ingPickerKeyword: '' }, () => {
      this.refreshPickerIngredients();
    });
  },

  onCloseIngPicker() {
    this.setData({ showIngPicker: false });
  },

  onIngPickerSearch(e) {
    this.setData({ ingPickerKeyword: e.detail.value || '' }, () => {
      this.refreshPickerIngredients();
    });
  },

  refreshPickerIngredients() {
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

  onPickIngredient(e) {
    const meatId = e.currentTarget.dataset.id;
    this.setData({
      formMeatId: meatId,
      selectedIngMeta: this.buildIngMeta(meatId),
      showIngPicker: false,
    });
  },

  onWeightInput(e) {
    this.setData({ formWeight: e.detail.value });
  },

  onPriceInput(e) {
    this.setData({ formPrice: e.detail.value });
  },

  onProdDateChange(e) {
    this.setData({ formProdDate: e.detail.value });
  },

  onExpiryDateChange(e) {
    this.setData({ formExpiryDate: e.detail.value });
  },

  onSaveItem() {
    const weight = parseFloat(this.data.formWeight);
    const price = parseFloat(this.data.formPrice) || 0;
    if (!weight || weight <= 0) {
      wx.showToast({ title: '请输入大于 0 的重量', icon: 'none' });
      return;
    }

    const items = storage.getInventory();
    if (this.data.editingId) {
      const next = items.map((item) =>
        item.id === this.data.editingId
          ? {
              id: item.id,
              meatId: this.data.formMeatId,
              weight,
              price,
              productionDate: this.data.formProdDate,
              expiryDate: this.data.formExpiryDate,
            }
          : item
      );
      storage.saveInventory(next);
    } else {
      items.unshift({
        id: `inv_${Date.now()}`,
        meatId: this.data.formMeatId,
        weight,
        price,
        productionDate: this.data.formProdDate,
        expiryDate: this.data.formExpiryDate,
      });
      storage.saveInventory(items);
    }

    this.setData({ showModal: false });
    this.loadInventory();
    wx.showToast({ title: '已保存库存', icon: 'success' });
  },

  onDeleteItem() {
    wx.showModal({
      title: '删除库存',
      content: '确认从冰箱库存中移除该食材吗？',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return;
        const next = storage.getInventory().filter((i) => i.id !== this.data.editingId);
        storage.saveInventory(next);
        this.setData({ showModal: false });
        this.loadInventory();
        wx.showToast({ title: '已移除', icon: 'none' });
      },
    });
  },

  noop() {},
});
