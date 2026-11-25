import {
  INGREDIENTS_DB,
  SUPPLEMENTS_DB,
  IngredientRecord,
  SupplementRecord,
  LifeStage,
  StandardType,
  migrateLegacyMeatId,
  migrateLegacySupplementId,
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

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
  firstUseDate: string;
}

const STORAGE_KEYS = {
  USER: 'meowmeal_prod_user',
  CATS: 'meowmeal_prod_cats',
  INVENTORY: 'meowmeal_prod_inventory',
  RECIPES: 'meowmeal_prod_recipes',
};

const LEGACY_KEYS = ['meowmeal_cats', 'meowmeal_inventory', 'meowmeal_recipes'];

function cleanupLegacyDemoStorage() {
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

cleanupLegacyDemoStorage();

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDaysUsed(firstUseDate?: string): number {
  if (!firstUseDate) return 1;
  const start = new Date(firstUseDate.replace(/-/g, '/'));
  if (isNaN(start.getTime())) return 1;
  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.floor((today - startDay) / (24 * 60 * 60 * 1000)) + 1);
}

const loadUser = (): UserProfile => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<UserProfile>;
      return {
        nickname: parsed.nickname || '铲屎官',
        avatarUrl: parsed.avatarUrl || '',
        firstUseDate: parsed.firstUseDate || getTodayStr(),
      };
    }
  } catch (e) {
    console.error('Failed to load user', e);
  }
  const fresh: UserProfile = {
    nickname: '铲屎官',
    avatarUrl: '',
    firstUseDate: getTodayStr(),
  };
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
};

export const MOCK_USER: UserProfile = loadUser();

export const saveUser = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(MOCK_USER));
  } catch (e) {
    console.error('Failed to save user', e);
  }
};

const loadCats = (): CatProfile[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CATS);
    if (saved) {
      const parsed = JSON.parse(saved) as CatProfile[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load cats', e);
  }
  return [];
};

export const MOCK_CATS: CatProfile[] = loadCats();

export const saveCats = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATS, JSON.stringify(MOCK_CATS));
  } catch (e) {
    console.error('Failed to save cats', e);
  }
};

// 唯一数据源：直接来自 ingredients.json (176项) 与 supplements.json (10款)
export const MEAT_DATABASE: MeatNutrient[] = INGREDIENTS_DB;
export const SUPPLEMENTS: Supplement[] = SUPPLEMENTS_DB;

const loadInventory = (): InventoryItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (saved) {
      const parsed = JSON.parse(saved) as InventoryItem[];
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          meatId: migrateLegacyMeatId(item.meatId),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load inventory', e);
  }
  return [];
};

export const MOCK_INVENTORY: InventoryItem[] = loadInventory();

export const saveInventory = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(MOCK_INVENTORY));
  } catch (e) {
    console.error('Failed to save inventory', e);
  }
};

const loadRecipes = (): Recipe[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (saved) {
      const parsed = JSON.parse(saved) as Recipe[];
      if (Array.isArray(parsed)) {
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
  return [];
};

export const MOCK_RECIPES: Recipe[] = loadRecipes();

export const saveRecipes = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(MOCK_RECIPES));
  } catch (e) {
    console.error('Failed to save recipes', e);
  }
};
