const KEYS = {
  USER: 'meowmeal_prod_user',
  CATS: 'meowmeal_prod_cats',
  INVENTORY: 'meowmeal_prod_inventory',
  RECIPES: 'meowmeal_prod_recipes',
};

const LEGACY_DEMO_KEYS = [
  'meowmeal_wx_user',
  'meowmeal_wx_cats',
  'meowmeal_wx_inventory',
  'meowmeal_wx_recipes',
];

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeDaysUsed(firstUseDate) {
  if (!firstUseDate) return 1;
  const start = new Date(String(firstUseDate).replace(/-/g, '/'));
  if (isNaN(start.getTime())) return 1;
  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.floor((today - startDay) / (24 * 60 * 60 * 1000)) + 1);
}

function createDefaultUser() {
  return {
    nickname: '铲屎官',
    firstUseDate: getTodayStr(),
    daysUsed: 1,
  };
}

function safeGet(key, fallback) {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const val = wx.getStorageSync(key);
      if (val !== '' && val !== null && val !== undefined) {
        return val;
      }
    }
  } catch (e) {
    console.error('wx.getStorageSync failed:', e);
  }
  return JSON.parse(JSON.stringify(fallback));
}

function safeSet(key, value) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(key, value);
    }
  } catch (e) {
    console.error('wx.setStorageSync failed:', e);
  }
}

function ensureInitialized() {
  if (typeof wx === 'undefined' || !wx.getStorageSync) return;
  // 清理旧版演示初始化缓存，确保上线为纯净空状态
  LEGACY_DEMO_KEYS.forEach((legacyKey) => {
    try {
      if (wx.removeStorageSync) wx.removeStorageSync(legacyKey);
    } catch (e) {
      // ignore
    }
  });

  if (!wx.getStorageSync(KEYS.USER)) safeSet(KEYS.USER, createDefaultUser());
  if (wx.getStorageSync(KEYS.CATS) === '') safeSet(KEYS.CATS, []);
  if (wx.getStorageSync(KEYS.INVENTORY) === '') safeSet(KEYS.INVENTORY, []);
  if (wx.getStorageSync(KEYS.RECIPES) === '') safeSet(KEYS.RECIPES, []);
}

function getUser() {
  const user = safeGet(KEYS.USER, createDefaultUser());
  const firstUseDate = user.firstUseDate || getTodayStr();
  return Object.assign({}, user, {
    nickname: user.nickname || '铲屎官',
    firstUseDate,
    daysUsed: computeDaysUsed(firstUseDate),
  });
}

function saveUser(user) {
  const current = getUser();
  safeSet(
    KEYS.USER,
    Object.assign({}, current, user, {
      firstUseDate: (user && user.firstUseDate) || current.firstUseDate || getTodayStr(),
    })
  );
}

function getCats() {
  const list = safeGet(KEYS.CATS, []);
  return Array.isArray(list) ? list : [];
}

function saveCats(cats) {
  safeSet(KEYS.CATS, Array.isArray(cats) ? cats : []);
}

function getInventory() {
  const list = safeGet(KEYS.INVENTORY, []);
  return Array.isArray(list) ? list : [];
}

function saveInventory(items) {
  safeSet(KEYS.INVENTORY, Array.isArray(items) ? items : []);
}

function getRecipes() {
  const list = safeGet(KEYS.RECIPES, []);
  return Array.isArray(list) ? list : [];
}

function saveRecipes(recipes) {
  safeSet(KEYS.RECIPES, Array.isArray(recipes) ? recipes : []);
}

function getRecipeById(id) {
  return getRecipes().find((r) => r.id === id) || null;
}

module.exports = {
  ensureInitialized,
  getUser,
  saveUser,
  getCats,
  saveCats,
  getInventory,
  saveInventory,
  getRecipes,
  saveRecipes,
  getRecipeById,
};
