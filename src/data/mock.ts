import {
  INGREDIENTS_DB,
  SUPPLEMENTS_DB,
  IngredientRecord,
  SupplementRecord,
  LifeStage,
  StandardType,
  migrateLegacyMeatId,
  migrateLegacySupplementId,
  recommendSupplements,
} from '../lib/nutritionEngine';

export type MeatNutrient = IngredientRecord;
export type Supplement = SupplementRecord;

export interface CatProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  neutered: boolean;
  allergies: string[];
  dietNeeds: string[];
  avatarUrl: string;
}

export interface InventoryItem {
  id: string;
  meatId: string;
  weight: number; // g
  price?: number;
  productionDate?: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  addedDate?: string; // YYYY-MM-DD
  status?: 'normal' | 'expiring' | 'expired';
}

export interface Recipe {
  id: string;
  name: string;
  catIds: string[];
  standard: StandardType;
  lifeStage?: LifeStage;
  days: number;
  mode: 'by_need' | 'by_inventory' | 'custom' | 'standard';
  ingredients: { meatId: string; weight: number }[];
  supplements: { supplementId: string; amount: number }[];
  createdAt: string;
  isActive?: boolean;
  executedDays?: number;
  startDate?: string;
  endDate?: string;
}

export const MOCK_USER = {
  nickname: '铲屎官小王',
  avatarUrl: '',
};

export const MOCK_CATS: CatProfile[] = [
  {
    id: 'c1',
    name: '汤圆',
    age: 2,
    weight: 4.5,
    gender: 'male',
    neutered: true,
    allergies: ['牛肉'],
    dietNeeds: ['化毛', '美毛'],
    avatarUrl: '',
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
    avatarUrl: '',
  },
];

// 唯一数据源：直接来自 ingredients.json (176项) 与 supplements.json (10款)
export const MEAT_DATABASE: MeatNutrient[] = INGREDIENTS_DB;
export const SUPPLEMENTS: Supplement[] = SUPPLEMENTS_DB;

const defaultInventory: InventoryItem[] = [
  { id: 'inv1', meatId: 'ing_086', weight: 1000, price: 28, productionDate: '2026-11-20', expiryDate: '2027-01-15', addedDate: '2026-11-20', status: 'normal' }, // 鸡胸肉
  { id: 'inv2', meatId: 'ing_001', weight: 500, price: 24, productionDate: '2026-11-20', expiryDate: '2026-12-05', addedDate: '2026-11-20', status: 'expiring' },  // 猪里脊
  { id: 'inv3', meatId: 'ing_089', weight: 300, price: 15, productionDate: '2026-11-20', expiryDate: '2026-12-01', addedDate: '2026-11-20', status: 'expiring' },  // 鸡心
  { id: 'inv4', meatId: 'ing_126', weight: 250, price: 38, productionDate: '2026-11-20', expiryDate: '2026-12-03', addedDate: '2026-11-20', status: 'expiring' },  // 三文鱼
];

const loadInventory = (): InventoryItem[] => {
  try {
    const saved = localStorage.getItem('meowmeal_inventory');
    if (saved) {
      const parsed = JSON.parse(saved) as InventoryItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          ...item,
          meatId: migrateLegacyMeatId(item.meatId),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load inventory', e);
  }
  return defaultInventory;
};

export const MOCK_INVENTORY: InventoryItem[] = loadInventory();

export const saveInventory = () => {
  try {
    localStorage.setItem('meowmeal_inventory', JSON.stringify(MOCK_INVENTORY));
  } catch (e) {
    console.error('Failed to save inventory', e);
  }
};

// 默认食谱严格遵循 role 分配比例（白肉35%、红肉25%、心脏15%、鱼类10%、青口贝5%、肝脏5%、其他内脏5%）
const defaultRecipeIngredients = [
  { meatId: 'ing_086', weight: 350 }, // 鸡胸肉 (white_meat 35%)
  { meatId: 'ing_001', weight: 250 }, // 猪里脊 (red_meat 25%)
  { meatId: 'ing_089', weight: 150 }, // 鸡心 (heart 15%)
  { meatId: 'ing_126', weight: 100 }, // 三文鱼 (fish 10%)
  { meatId: 'ing_131', weight: 50 },  // 青口贝生 (mussel 5%)
  { meatId: 'ing_090', weight: 50 },  // 鸡肝 (liver 5%)
  { meatId: 'ing_006', weight: 50 },  // 猪腰/猪肾 (other_organ 5%)
];

const defaultRecipes: Recipe[] = [
  {
    id: 'r1',
    name: '汤圆的日常鸡猪均衡餐',
    catIds: ['c1'],
    standard: 'NRC',
    lifeStage: 'adult',
    days: 7,
    mode: 'by_need',
    ingredients: defaultRecipeIngredients,
    supplements: recommendSupplements(defaultRecipeIngredients, 'NRC', 'adult'),
    createdAt: '2026-11-20',
    isActive: true,
    executedDays: 2,
    startDate: '2026-11-20T08:00:00.000Z',
  },
];

const loadRecipes = (): Recipe[] => {
  try {
    const saved = localStorage.getItem('meowmeal_recipes');
    if (saved) {
      const parsed = JSON.parse(saved) as Recipe[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r) => ({
          ...r,
          standard: r.standard === 'AAFCO' ? 'AAFCO' : 'NRC',
          lifeStage: r.lifeStage === 'kitten' ? 'kitten' : 'adult',
          ingredients: (r.ingredients || []).map((ing) => ({
            ...ing,
            meatId: migrateLegacyMeatId(ing.meatId),
          })),
          supplements: (r.supplements || []).map((sup) => ({
            ...sup,
            supplementId: migrateLegacySupplementId(sup.supplementId),
          })),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load recipes', e);
  }
  return defaultRecipes;
};

export const MOCK_RECIPES: Recipe[] = loadRecipes();

export const saveRecipes = () => {
  try {
    localStorage.setItem('meowmeal_recipes', JSON.stringify(MOCK_RECIPES));
  } catch (e) {
    console.error('Failed to save recipes', e);
  }
};
