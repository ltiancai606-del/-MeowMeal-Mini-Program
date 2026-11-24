const engine = require('./nutritionEngine');

const KEYS = {
  USER: 'meowmeal_wx_user',
  CATS: 'meowmeal_wx_cats',
  INVENTORY: 'meowmeal_wx_inventory',
  RECIPES: 'meowmeal_wx_recipes',
};

const DEFAULT_USER = {
  nickname: '铲屎官小王',
  daysUsed: 48,
};

const DEFAULT_CATS = [
  {
    id: 'c1',
    name: '汤圆',
    age: 2,
    weight: 4.5,
    gender: 'male',
    neutered: true,
    allergies: ['牛肉'],
    dietNeeds: ['化毛', '美毛'],
  },
  {
    id: 'c2',
    name: '布丁',
    age: 1.5,
    weight: 3.8,
    gender: 'female',
    neutered: true,
    allergies: [],
    dietNeeds: ['护肾', '减脂'],
  },
];

const DEFAULT_INVENTORY = [
  { id: 'inv1', meatId: 'ing_086', weight: 1000, price: 28, productionDate: '2026-11-20', expiryDate: '2027-01-15' },
  { id: 'inv2', meatId: 'ing_001', weight: 500, price: 24, productionDate: '2026-11-20', expiryDate: '2026-12-05' },
  { id: 'inv3', meatId: 'ing_089', weight: 300, price: 15, productionDate: '2026-11-20', expiryDate: '2026-12-01' },
  { id: 'inv4', meatId: 'ing_126', weight: 250, price: 38, productionDate: '2026-11-20', expiryDate: '2026-12-03' },
];

const DEFAULT_RECIPE_INGREDIENTS = [
  { meatId: 'ing_086', weight: 350 },
  { meatId: 'ing_001', weight: 250 },
  { meatId: 'ing_089', weight: 150 },
  { meatId: 'ing_126', weight: 100 },
  { meatId: 'ing_131', weight: 50 },
  { meatId: 'ing_090', weight: 50 },
  { meatId: 'ing_006', weight: 50 },
];

const DEFAULT_RECIPES = [
  {
    id: 'r1',
    name: '汤圆的日常鸡猪均衡餐',
    catIds: ['c1'],
    standard: 'NRC',
    lifeStage: 'adult',
    days: 7,
    mode: 'by_need',
    ingredients: DEFAULT_RECIPE_INGREDIENTS,
    supplements: engine.recommendSupplements(DEFAULT_RECIPE_INGREDIENTS, 'NRC', 'adult'),
    createdAt: '2026-11-20',
    isActive: true,
    executedDays: 2,
    startDate: '2026-11-20 08:00',
  },
];

function safeGet(key, fallback) {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const val = wx.getStorageSync(key);
      if (val && (Array.isArray(val) ? val.length >= 0 : true)) {
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
  if (!wx.getStorageSync(KEYS.USER)) safeSet(KEYS.USER, DEFAULT_USER);
  if (!wx.getStorageSync(KEYS.CATS)) safeSet(KEYS.CATS, DEFAULT_CATS);
  if (!wx.getStorageSync(KEYS.INVENTORY)) safeSet(KEYS.INVENTORY, DEFAULT_INVENTORY);
  if (!wx.getStorageSync(KEYS.RECIPES)) safeSet(KEYS.RECIPES, DEFAULT_RECIPES);
}

function getUser() {
  return safeGet(KEYS.USER, DEFAULT_USER);
}
function saveUser(user) {
  safeSet(KEYS.USER, user);
}

function getCats() {
  return safeGet(KEYS.CATS, DEFAULT_CATS);
}
function saveCats(cats) {
  safeSet(KEYS.CATS, cats);
}

function getInventory() {
  return safeGet(KEYS.INVENTORY, DEFAULT_INVENTORY);
}
function saveInventory(items) {
  safeSet(KEYS.INVENTORY, items);
}

function getRecipes() {
  return safeGet(KEYS.RECIPES, DEFAULT_RECIPES);
}
function saveRecipes(recipes) {
  safeSet(KEYS.RECIPES, recipes);
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
