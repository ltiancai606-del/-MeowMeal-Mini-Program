const storage = require('../../utils/storage');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    user: { nickname: '铲屎官', daysUsed: 1 },
    cats: [],
    selectedCatId: '',
    activeCat: null,
    recipeCount: 0,
    totalMadeKg: '0.0',
    totalSpent: 0,
    showUserModal: false,
    formNickname: '',
    showCatModal: false,
    editingCatId: '',
    formName: '',
    formAge: '2',
    formWeight: '4.5',
    formGender: 'male',
    formNeutered: true,
    formAllergies: '',
    formDietNeeds: '',
  },

  onLoad() {
    this.initNavBarMetrics();
  },

  onShow() {
    this.loadData();
    try {
      if (wx.getStorageSync('meow_open_add_cat') === '1') {
        wx.removeStorageSync('meow_open_add_cat');
        this.onOpenAddCat();
      }
    } catch (e) {}
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
    this.setData({ statusBarHeight, navBarHeight });
  },

  loadData() {
    const user = storage.getUser();
    const cats = storage.getCats();
    const recipes = storage.getRecipes();
    const inventory = storage.getInventory();

    let selectedCatId = this.data.selectedCatId;
    if (!cats.some((c) => c.id === selectedCatId)) {
      selectedCatId = cats.length > 0 ? cats[0].id : '';
    }

    const rawActive = cats.find((c) => c.id === selectedCatId) || null;
    const activeCat = rawActive
      ? Object.assign({}, rawActive, {
          lifeStageLabel: rawActive.age > 0 && rawActive.age < 1 ? '幼猫生长期' : '成猫维持期',
          dailyMeatG: Math.round((Number(rawActive.weight) || 4) * 35),
        })
      : null;

    const totalGrams = recipes.reduce(
      (sum, r) => sum + (r.ingredients || []).reduce((s, ing) => s + (Number(ing.weight) || 0), 0),
      0
    );
    const totalSpent = Math.round(
      inventory.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
    );

    this.setData({
      user,
      cats,
      selectedCatId,
      activeCat,
      recipeCount: recipes.length,
      totalMadeKg: (totalGrams / 1000).toFixed(1),
      totalSpent,
    });
  },

  onOpenEditUser() {
    this.setData({
      showUserModal: true,
      formNickname: this.data.user.nickname || '',
    });
  },

  onCloseUserModal() {
    this.setData({ showUserModal: false });
  },

  onNicknameInput(e) {
    this.setData({ formNickname: e.detail.value });
  },

  onSaveUser() {
    const nickname = (this.data.formNickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    const nextUser = Object.assign({}, this.data.user, { nickname });
    storage.saveUser(nextUser);
    this.setData({ showUserModal: false });
    this.loadData();
    wx.showToast({ title: '昵称已更新', icon: 'success' });
  },

  onSelectCat(e) {
    this.setData({ selectedCatId: e.currentTarget.dataset.id }, () => {
      this.loadData();
    });
  },

  onOpenAddCat() {
    this.setData({
      showCatModal: true,
      editingCatId: '',
      formName: '',
      formAge: '1',
      formWeight: '4.0',
      formGender: 'male',
      formNeutered: true,
      formAllergies: '',
      formDietNeeds: '',
    });
  },

  onOpenEditCat() {
    const cat = this.data.activeCat;
    if (!cat) return;
    this.setData({
      showCatModal: true,
      editingCatId: cat.id,
      formName: cat.name,
      formAge: String(cat.age),
      formWeight: String(cat.weight),
      formGender: cat.gender || 'male',
      formNeutered: Boolean(cat.neutered),
      formAllergies: (cat.allergies || []).join(', '),
      formDietNeeds: (cat.dietNeeds || []).join(', '),
    });
  },

  onCloseCatModal() {
    this.setData({ showCatModal: false });
  },

  onNameInput(e) { this.setData({ formName: e.detail.value }); },
  onAgeInput(e) { this.setData({ formAge: e.detail.value }); },
  onWeightInput(e) { this.setData({ formWeight: e.detail.value }); },
  onAllergiesInput(e) { this.setData({ formAllergies: e.detail.value }); },
  onDietNeedsInput(e) { this.setData({ formDietNeeds: e.detail.value }); },
  onGenderTap(e) { this.setData({ formGender: e.currentTarget.dataset.val }); },
  onNeuteredTap(e) { this.setData({ formNeutered: e.currentTarget.dataset.val === '1' }); },

  splitTags(text) {
    return String(text || '')
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  },

  onSaveCat() {
    const name = (this.data.formName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写猫咪昵称', icon: 'none' });
      return;
    }
    const age = parseFloat(this.data.formAge) || 1;
    const weight = parseFloat(this.data.formWeight) || 4;

    const payload = {
      id: this.data.editingCatId || `c_${Date.now()}`,
      name,
      age,
      weight,
      gender: this.data.formGender,
      neutered: this.data.formNeutered,
      allergies: this.splitTags(this.data.formAllergies),
      dietNeeds: this.splitTags(this.data.formDietNeeds),
    };

    const cats = storage.getCats();
    let next;
    if (this.data.editingCatId) {
      next = cats.map((c) => (c.id === this.data.editingCatId ? payload : c));
    } else {
      next = cats.concat([payload]);
    }
    storage.saveCats(next);
    this.setData({
      showCatModal: false,
      selectedCatId: payload.id,
    });
    this.loadData();
    wx.showToast({ title: '已保存猫咪档案', icon: 'success' });
  },

  confirmDeleteCatById(catId, catName) {
    wx.showModal({
      title: '删除猫咪档案',
      content: `确认删除「${catName}」的档案吗？`,
      confirmColor: '#E11D48',
      success: (res) => {
        if (!res.confirm) return;
        const next = storage.getCats().filter((c) => c.id !== catId);
        storage.saveCats(next);
        this.setData({
          showCatModal: false,
          selectedCatId: next[0] ? next[0].id : '',
        });
        this.loadData();
        wx.showToast({ title: '已删除档案', icon: 'none' });
      },
    });
  },

  onDeleteActiveCat() {
    const cat = this.data.activeCat;
    if (!cat) return;
    this.confirmDeleteCatById(cat.id, cat.name);
  },

  onDeleteCat() {
    if (!this.data.editingCatId) return;
    this.confirmDeleteCatById(this.data.editingCatId, this.data.formName || '该猫咪');
  },

  onGoIngredients() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=ingredients' });
  },

  onGoSupplements() {
    wx.navigateTo({ url: '/pages/nutrition/index?type=supplements' });
  },

  noop() {},
});
