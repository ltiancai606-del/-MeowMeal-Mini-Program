import rawIngredients from '../data/ingredients.json';
import rawStandards from '../data/standards.json';
import rawSupplements from '../data/supplements.json';

export type IngredientRole =
  | 'red_meat'
  | 'white_meat'
  | 'fish'
  | 'mussel'
  | 'liver'
  | 'heart'
  | 'other_organ'
  | 'egg'
  | 'fat';

export type StandardType = 'NRC' | 'AAFCO';
export type LifeStage = 'adult' | 'kitten';

export interface IngredientNutrients {
  kcal: number;
  protein_g: number | null;
  fat_g: number | null;
  water_g: number | null;
  carb_g: number | null;
  calcium_mg: number | null;
  phosphorus_mg: number | null;
  potassium_mg: number | null;
  sodium_mg: number | null;
  magnesium_mg: number | null;
  iron_mg: number | null;
  zinc_mg: number | null;
  copper_mg: number | null;
  manganese_mg: number | null;
  iodine_ug: number | null;
  selenium_ug: number | null;
  taurine_mg: number | null;
  choline_mg: number | null;
  epa_mg: number | null;
  dha_mg: number | null;
  epa_dha_mg: number | null;
  va_iu: number | null;
  vd_iu: number | null;
  ve_mg: number | null;
  vb1_mg: number | null;
  vb2_mg: number | null;
  vb3_mg: number | null;
  vb5_mg: number | null;
  vb6_mg: number | null;
  vb7_ug: number | null;
  vb9_ug: number | null;
  vb12_ug: number | null;
  retinol_ug?: number | null;
  va_rae_ug?: number | null;
  vd_ug?: number | null;
}

export type UnifiedNutrientKey =
  | 'protein_g'
  | 'fat_g'
  | 'water_g'
  | 'carb_g'
  | 'calcium_mg'
  | 'phosphorus_mg'
  | 'potassium_mg'
  | 'sodium_mg'
  | 'magnesium_mg'
  | 'iron_mg'
  | 'zinc_mg'
  | 'copper_mg'
  | 'manganese_mg'
  | 'iodine_ug'
  | 'selenium_ug'
  | 'taurine_mg'
  | 'choline_mg'
  | 'epa_mg'
  | 'dha_mg'
  | 'epa_dha_mg'
  | 'va_iu'
  | 'vd_iu'
  | 've_mg'
  | 'vb1_mg'
  | 'vb2_mg'
  | 'vb3_mg'
  | 'vb5_mg'
  | 'vb6_mg'
  | 'vb7_ug'
  | 'vb9_ug'
  | 'vb12_ug';

export type StandardNutrientKey =
  | 'protein_g'
  | 'fat_g'
  | 'calcium_mg'
  | 'phosphorus_mg'
  | 'ca_p_ratio'
  | 'potassium_mg'
  | 'sodium_mg'
  | 'magnesium_mg'
  | 'iron_mg'
  | 'zinc_mg'
  | 'copper_mg'
  | 'manganese_mg'
  | 'iodine_ug'
  | 'selenium_ug'
  | 'taurine_mg'
  | 'choline_mg'
  | 'epa_dha_mg'
  | 'va_iu'
  | 'vd_iu'
  | 've_mg'
  | 'vb1_mg'
  | 'vb2_mg'
  | 'vb3_mg'
  | 'vb5_mg'
  | 'vb6_mg'
  | 'vb7_ug'
  | 'vb9_ug'
  | 'vb12_ug';

export interface IngredientRecord {
  id: string;
  excel_row: number;
  category: string;
  role: IngredientRole;
  name: string;
  state: string;
  basis: string;
  dry_matter_g: number | null;
  match_status: string;
  confidence_tier: string;
  is_proxy: boolean;
  source_code: string;
  source_original_name: string;
  source_note: string;
  taurine_source: string;
  choline_source: string;
  trace_fields: string[];
  missing_count: number;
  nutrients: IngredientNutrients;
}

export interface SupplementNutrients {
  calcium_mg: number | null;
  potassium_mg: number | null;
  sodium_mg: number | null;
  iodine_ug: number | null;
  taurine_mg: number | null;
  choline_mg: number | null;
  epa_mg: number | null;
  dha_mg: number | null;
  epa_dha_mg: number | null;
  ve_mg: number | null;
  vb1_mg: number | null;
  vb2_mg: number | null;
  vb3_mg: number | null;
  vb5_mg: number | null;
  vb6_mg: number | null;
  vb7_ug: number | null;
  vb9_ug: number | null;
  vb12_ug: number | null;
}

export type SupplementCategoryKey =
  | 'calcium'
  | 'fish_oil'
  | 'iodine'
  | 'vb'
  | 've'
  | 'taurine';

export interface SupplementRecord {
  id: string;
  name: string;
  category: string;
  type: SupplementCategoryKey;
  unit_basis: 'g' | 'capsule' | 'tablet';
  unit_label: string;
  unit: string; // 短单位: 'g' | '粒' | '片'
  brand: string;
  unquantified_fields: string[];
  nutrients: SupplementNutrients;
  note: string;
}

export interface StandardsDatabase {
  version: string;
  basis: string;
  notes: string[];
  units: Record<string, string>;
  NRC_2006: {
    adult_maintenance_ra: Record<string, number | null>;
    kitten_growth_ra: Record<string, number | null>;
    safe_upper_limit_sul: Record<string, number>;
  };
  AAFCO_2016_2026: {
    adult_maintenance_min: Record<string, number | null>;
    kitten_growth_min: Record<string, number | null>;
    max_limit: Record<string, number>;
  };
}

export const INGREDIENTS_DB: IngredientRecord[] = rawIngredients as unknown as IngredientRecord[];

export const STANDARDS_DB: StandardsDatabase = rawStandards as unknown as StandardsDatabase;

function mapSupplementType(category: string): SupplementCategoryKey {
  switch (category) {
    case '钙粉':
      return 'calcium';
    case '鱼油':
      return 'fish_oil';
    case '碘/钾':
      return 'iodine';
    case '复合维B':
      return 'vb';
    case '维生素E':
      return 've';
    case '牛磺酸':
      return 'taurine';
    default:
      return 'calcium';
  }
}

function mapUnitShort(unitBasis: string): string {
  if (unitBasis === 'g') return 'g';
  if (unitBasis === 'capsule') return '粒';
  if (unitBasis === 'tablet') return '片';
  return unitBasis;
}

function extractBrand(name: string): string {
  if (name.startsWith('NOW')) return 'NOW Foods';
  if (name.startsWith('Viva')) return 'Viva Naturals';
  if (name.startsWith('NaturesPlus')) return 'NaturesPlus';
  if (name.startsWith('Thompson')) return 'Thompson';
  if (name.includes('双鲸')) return '双鲸';
  return '通用';
}

export const SUPPLEMENTS_DB: SupplementRecord[] = (rawSupplements as Array<{
  id: string;
  name: string;
  category: string;
  unit_basis: 'g' | 'capsule' | 'tablet';
  unit_label: string;
  unquantified_fields: string[];
  nutrients: SupplementNutrients;
  note: string;
}>).map((item) => ({
  ...item,
  type: mapSupplementType(item.category),
  unit: mapUnitShort(item.unit_basis),
  brand: extractBrand(item.name),
}));

export const ROLE_META: Record<IngredientRole, { label: string; icon: string; badgeBg: string; badgeText: string }> = {
  white_meat: { label: '白肉', icon: '🍗', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700' },
  red_meat: { label: '红肉', icon: '🥩', badgeBg: 'bg-rose-50', badgeText: 'text-rose-700' },
  heart: { label: '心脏', icon: '❤️', badgeBg: 'bg-pink-50', badgeText: 'text-pink-700' },
  fish: { label: '鱼类', icon: '🐟', badgeBg: 'bg-sky-50', badgeText: 'text-sky-700' },
  mussel: { label: '青口贝', icon: '🦪', badgeBg: 'bg-teal-50', badgeText: 'text-teal-700' },
  liver: { label: '肝脏', icon: '🩸', badgeBg: 'bg-red-50', badgeText: 'text-red-700' },
  other_organ: { label: '其他内脏', icon: '🍖', badgeBg: 'bg-purple-50', badgeText: 'text-purple-700' },
  egg: { label: '蛋类', icon: '🥚', badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-700' },
  fat: { label: '油脂', icon: '🧈', badgeBg: 'bg-orange-50', badgeText: 'text-orange-700' },
};

export const CATEGORY_ORDER = [
  '鸡',
  '鸭',
  '鹅',
  '火鸡',
  '特种禽肉',
  '猪肉',
  '牛肉',
  '羊',
  '鹿',
  '兔',
  '马',
  '鱼类与海鲜',
  '蛋类',
  '调脂油脂',
];

export const ALL_UNIFIED_NUTRIENT_KEYS: UnifiedNutrientKey[] = [
  'protein_g',
  'fat_g',
  'water_g',
  'carb_g',
  'calcium_mg',
  'phosphorus_mg',
  'potassium_mg',
  'sodium_mg',
  'magnesium_mg',
  'iron_mg',
  'zinc_mg',
  'copper_mg',
  'manganese_mg',
  'iodine_ug',
  'selenium_ug',
  'taurine_mg',
  'choline_mg',
  'epa_mg',
  'dha_mg',
  'epa_dha_mg',
  'va_iu',
  'vd_iu',
  've_mg',
  'vb1_mg',
  'vb2_mg',
  'vb3_mg',
  'vb5_mg',
  'vb6_mg',
  'vb7_ug',
  'vb9_ug',
  'vb12_ug',
];

export interface NutrientDisplayMeta {
  key: StandardNutrientKey;
  label: string;
  unit: string;
  group: '宏量营养素' | '矿物质' | '氨基酸与脂肪酸' | '维生素';
  core?: boolean;
  highRiskUpper?: boolean; // 重点监控上限: VA, VD, 锌, 磷, 碘
  decimals?: number;
}

export const NUTRIENT_META_LIST: NutrientDisplayMeta[] = [
  { key: 'protein_g', label: '蛋白质', unit: 'g', group: '宏量营养素', core: true, decimals: 1 },
  { key: 'fat_g', label: '脂肪', unit: 'g', group: '宏量营养素', core: true, decimals: 1 },
  { key: 'calcium_mg', label: '钙 (Ca)', unit: 'mg', group: '矿物质', core: true, decimals: 1 },
  { key: 'phosphorus_mg', label: '磷 (P)', unit: 'mg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'ca_p_ratio', label: '钙磷比', unit: ': 1', group: '矿物质', core: true, decimals: 2 },
  { key: 'potassium_mg', label: '钾 (K)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'sodium_mg', label: '钠 (Na)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'magnesium_mg', label: '镁 (Mg)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'iron_mg', label: '铁 (Fe)', unit: 'mg', group: '矿物质', core: true, decimals: 1 },
  { key: 'zinc_mg', label: '锌 (Zn)', unit: 'mg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'copper_mg', label: '铜 (Cu)', unit: 'mg', group: '矿物质', decimals: 2 },
  { key: 'manganese_mg', label: '锰 (Mn)', unit: 'mg', group: '矿物质', decimals: 2 },
  { key: 'iodine_ug', label: '碘 (I)', unit: 'μg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'selenium_ug', label: '硒 (Se)', unit: 'μg', group: '矿物质', decimals: 1 },
  { key: 'taurine_mg', label: '牛磺酸', unit: 'mg', group: '氨基酸与脂肪酸', core: true, decimals: 1 },
  { key: 'choline_mg', label: '胆碱', unit: 'mg', group: '氨基酸与脂肪酸', decimals: 1 },
  { key: 'epa_dha_mg', label: 'EPA + DHA', unit: 'mg', group: '氨基酸与脂肪酸', core: true, decimals: 1 },
  { key: 'va_iu', label: '维生素 A', unit: 'IU', group: '维生素', core: true, highRiskUpper: true, decimals: 0 },
  { key: 'vd_iu', label: '维生素 D', unit: 'IU', group: '维生素', core: true, highRiskUpper: true, decimals: 1 },
  { key: 've_mg', label: '维生素 E', unit: 'mg', group: '维生素', core: true, decimals: 1 },
  { key: 'vb1_mg', label: '维生素 B1', unit: 'mg', group: '维生素', core: true, decimals: 2 },
  { key: 'vb2_mg', label: '维生素 B2', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb3_mg', label: '维生素 B3 (烟酸)', unit: 'mg', group: '维生素', decimals: 1 },
  { key: 'vb5_mg', label: '维生素 B5 (泛酸)', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb6_mg', label: '维生素 B6', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb7_ug', label: '维生素 B7 (生物素)', unit: 'μg', group: '维生素', decimals: 1 },
  { key: 'vb9_ug', label: '维生素 B9 (叶酸)', unit: 'μg', group: '维生素', decimals: 1 },
  { key: 'vb12_ug', label: '维生素 B12', unit: 'μg', group: '维生素', decimals: 2 },
];

export const COOKED_HOMEMADE_TAURINE_FLOOR_MG = 500;
export const COOKED_HOMEMADE_CAP_MIN = 1.1;
export const COOKED_HOMEMADE_CAP_MAX = 1.4;
export const TARGET_CAP_RATIO = 1.2;

export function getIngredientById(id: string): IngredientRecord | undefined {
  return INGREDIENTS_DB.find((item) => item.id === id);
}

export function getSupplementById(id: string): SupplementRecord | undefined {
  return SUPPLEMENTS_DB.find((item) => item.id === id);
}

/**
 * 格式化食材单项营养素展示：
 * - trace_fields 中字段 -> "微量 (Tr)"
 * - null / undefined -> "未报告"（严禁显示为 0）
 * - 数值 -> 保留合适小数 + 单位
 */
export function formatIngredientNutrientValue(
  ingredient: IngredientRecord,
  key: keyof IngredientNutrients,
  unit: string,
  decimals = 2
): { text: string; isMissing: boolean; isTrace: boolean } {
  if (ingredient.trace_fields && ingredient.trace_fields.includes(key)) {
    return { text: '微量 (Tr)', isMissing: false, isTrace: true };
  }
  const raw = ingredient.nutrients[key];
  if (raw === null || raw === undefined) {
    return { text: '未报告', isMissing: true, isTrace: false };
  }
  const formatted = Number.isInteger(raw)
    ? String(raw)
    : Number(raw.toFixed(decimals)).toString();
  return { text: `${formatted} ${unit}`.trim(), isMissing: false, isTrace: false };
}

/**
 * 获取置信度等级徽章样式（L1 / L2 / L3 / L4）
 */
export function getConfidenceBadgeInfo(ingredient: IngredientRecord): {
  shortLabel: string;
  fullLabel: string;
  className: string;
  isProxy: boolean;
} {
  const tier = ingredient.confidence_tier || '';
  if (ingredient.is_proxy || tier.startsWith('L3') || tier.startsWith('L4')) {
    const code = tier.slice(0, 2) || 'L3';
    return {
      shortLabel: `${code} 近似估算`,
      fullLabel: tier,
      className: 'bg-amber-100 text-amber-800 border border-amber-300',
      isProxy: true,
    };
  }
  if (tier.startsWith('L1')) {
    return {
      shortLabel: 'L1 官方实测',
      fullLabel: tier,
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      isProxy: false,
    };
  }
  return {
    shortLabel: 'L2 官方主源',
    fullLabel: tier || 'L2-官方主源+多源补齐',
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
    isProxy: false,
  };
}

export interface StandardBounds {
  min: number | null;
  max: number | null;
  maxLabel?: 'SUL' | 'Max' | '推荐上限';
  note?: string;
}

/**
 * 读取统一标准（每 1,000 kcal ME）的下限与安全上限
 */
export function getStandardBounds(
  key: StandardNutrientKey,
  standard: StandardType,
  lifeStage: LifeStage
): StandardBounds {
  const nrcMin =
    lifeStage === 'kitten'
      ? STANDARDS_DB.NRC_2006.kitten_growth_ra
      : STANDARDS_DB.NRC_2006.adult_maintenance_ra;
  const nrcSul = STANDARDS_DB.NRC_2006.safe_upper_limit_sul;

  const aafcoMin =
    lifeStage === 'kitten'
      ? STANDARDS_DB.AAFCO_2016_2026.kitten_growth_min
      : STANDARDS_DB.AAFCO_2016_2026.adult_maintenance_min;
  const aafcoMax = STANDARDS_DB.AAFCO_2016_2026.max_limit;

  const baseMinTable = standard === 'NRC' ? nrcMin : aafcoMin;
  let min = baseMinTable[key] ?? null;
  let max: number | null = null;
  let maxLabel: 'SUL' | 'Max' | '推荐上限' | undefined;
  let note: string | undefined;

  if (key === 'ca_p_ratio') {
    min = standard === 'AAFCO' ? (aafcoMin.ca_p_ratio ?? 1.0) : (nrcMin.ca_p_ratio ?? 1.1);
    max = COOKED_HOMEMADE_CAP_MAX;
    maxLabel = '推荐上限';
    note = 'AAFCO 最低 1.0，熟自制推荐 1.1–1.4';
    return { min, max, maxLabel, note };
  }

  if (key === 'taurine_mg') {
    if (standard === 'NRC') {
      min = nrcMin.taurine_wet_recommended_mg ?? nrcMin.taurine_mg ?? 170;
      note = 'NRC 湿粮推荐 170；熟自制高水分兜底 500';
    } else {
      min = aafcoMin.taurine_mg ?? 500;
    }
  }

  // 上限判定：同时监控 SUL 与 AAFCO Max，重点防范 VA、VD、锌、磷、碘超标
  if (key === 'va_iu') {
    if (standard === 'NRC') {
      max = lifeStage === 'kitten' ? nrcSul.va_iu_kitten : nrcSul.va_iu_adult;
      maxLabel = 'SUL';
    } else {
      max = aafcoMax.va_iu;
      maxLabel = 'Max';
    }
  } else if (key === 'vd_iu') {
    max = standard === 'NRC' ? nrcSul.vd_iu : aafcoMax.vd_iu;
    maxLabel = standard === 'NRC' ? 'SUL' : 'Max';
  } else if (key === 'zinc_mg') {
    max = nrcSul.zinc_mg;
    maxLabel = 'SUL';
  } else if (key === 'fat_g') {
    if (standard === 'NRC') {
      max = nrcSul.fat_g;
      maxLabel = 'SUL';
    }
  } else if (key === 'phosphorus_mg') {
    max = aafcoMax.phosphorus_mg;
    maxLabel = 'Max';
  } else if (key === 'iodine_ug') {
    max = aafcoMax.iodine_ug;
    maxLabel = 'Max';
  }

  return { min, max, maxLabel, note };
}

export type TrafficLightStatus = 'green' | 'yellow' | 'red' | 'neutral';

export interface NutrientEvaluation {
  key: StandardNutrientKey;
  label: string;
  unit: string;
  group: NutrientDisplayMeta['group'];
  core: boolean;
  highRiskUpper: boolean;
  decimals: number;
  totalAmount: number; // 食谱绝对总量（对于 ca_p_ratio 为比值）
  per1000kcal: number; // 每 1,000 kcal ME 数值（对于 ca_p_ratio 为比值）
  min: number | null;
  max: number | null;
  maxLabel?: 'SUL' | 'Max' | '推荐上限';
  note?: string;
  status: TrafficLightStatus;
  reason: 'ok' | 'low_warn' | 'low_critical' | 'high_warn' | 'high_danger' | 'no_std';
  hasMissingSource: boolean;
  missingCount: number;
}

export interface RecipeCalculationResult {
  totalWeightG: number;
  totalKcal: number;
  meatTotals: Record<UnifiedNutrientKey, number>;
  supplementTotals: Record<UnifiedNutrientKey, number>;
  totals: Record<UnifiedNutrientKey, number>;
  per1000kcal: Record<StandardNutrientKey, number>;
  caPRatio: number;
  macroME: {
    proteinPct: number;
    fatPct: number;
    carbPct: number;
  };
  roleWeights: Record<IngredientRole, number>;
  evaluations: NutrientEvaluation[];
  highRiskAlerts: NutrientEvaluation[];
  hasMissingData: boolean;
  missingNutrientKeys: UnifiedNutrientKey[];
  proxyIngredients: IngredientRecord[];
  hasUnquantifiedFishOilVE: boolean;
  hasSyntheticVEReminder: boolean;
  hasBComplexCholineNote: boolean;
}

export interface RecipeIngredientInput {
  meatId: string;
  weight: number;
}

export interface RecipeSupplementInput {
  supplementId: string;
  amount: number;
}

function createEmptyNutrientMap(): Record<UnifiedNutrientKey, number> {
  const obj = {} as Record<UnifiedNutrientKey, number>;
  for (const k of ALL_UNIFIED_NUTRIENT_KEYS) {
    obj[k] = 0;
  }
  return obj;
}

/**
 * 核心营养汇总与达标计算引擎（严格直接相加，严禁任何 1000 倍换算）
 */
export function calculateRecipeNutrition(
  ingredients: RecipeIngredientInput[],
  supplements: RecipeSupplementInput[],
  standard: StandardType = 'NRC',
  lifeStage: LifeStage = 'adult'
): RecipeCalculationResult {
  const meatTotals = createEmptyNutrientMap();
  const supplementTotals = createEmptyNutrientMap();
  const totals = createEmptyNutrientMap();

  const missingCounts: Partial<Record<UnifiedNutrientKey, number>> = {};
  const proxyIngredientsMap = new Map<string, IngredientRecord>();

  const roleWeights: Record<IngredientRole, number> = {
    red_meat: 0,
    white_meat: 0,
    fish: 0,
    mussel: 0,
    liver: 0,
    heart: 0,
    other_organ: 0,
    egg: 0,
    fat: 0,
  };

  let totalWeightG = 0;
  let totalKcal = 0;

  for (const item of ingredients) {
    const weight = Number(item.weight) || 0;
    if (weight <= 0) continue;
    const ing = getIngredientById(item.meatId);
    if (!ing) continue;

    totalWeightG += weight;
    roleWeights[ing.role] = (roleWeights[ing.role] || 0) + weight;

    if (ing.is_proxy) {
      proxyIngredientsMap.set(ing.id, ing);
    }

    const factor = weight / 100;
    totalKcal += factor * (ing.nutrients.kcal || 0);

    for (const key of ALL_UNIFIED_NUTRIENT_KEYS) {
      // trace_fields 按 0 计算（不算缺失）
      if (ing.trace_fields && ing.trace_fields.includes(key)) {
        continue;
      }
      const val = ing.nutrients[key];
      if (val === null || val === undefined) {
        missingCounts[key] = (missingCounts[key] || 0) + 1;
        continue;
      }
      meatTotals[key] += factor * val;
    }
  }

  let hasUnquantifiedFishOilVE = false;
  let hasSyntheticVEReminder = false;
  let hasBComplexCholineNote = false;

  for (const item of supplements) {
    const amount = Number(item.amount) || 0;
    if (amount <= 0) continue;
    const supp = getSupplementById(item.supplementId);
    if (!supp) continue;

    if (supp.unquantified_fields.includes('ve_mg')) {
      hasUnquantifiedFishOilVE = true;
    }
    if (supp.id === 'sup_08' || supp.type === 've') {
      hasSyntheticVEReminder = true;
    }
    if (supp.type === 'vb') {
      hasBComplexCholineNote = true;
    }

    for (const key of ALL_UNIFIED_NUTRIENT_KEYS) {
      const val = (supp.nutrients as unknown as Record<string, number | null | undefined>)[key];
      if (val === null || val === undefined) continue;
      supplementTotals[key] += amount * val;
    }
  }

  for (const key of ALL_UNIFIED_NUTRIENT_KEYS) {
    totals[key] = meatTotals[key] + supplementTotals[key];
  }

  const caPRatio = totals.phosphorus_mg > 0 ? totals.calcium_mg / totals.phosphorus_mg : 0;

  const per1000kcal = {} as Record<StandardNutrientKey, number>;
  for (const meta of NUTRIENT_META_LIST) {
    if (meta.key === 'ca_p_ratio') {
      per1000kcal.ca_p_ratio = caPRatio;
    } else {
      const totalVal = totals[meta.key as UnifiedNutrientKey] || 0;
      per1000kcal[meta.key] = totalKcal > 0 ? (totalVal / totalKcal) * 1000 : 0;
    }
  }

  // 宏量代谢能占比（改良 Atwater 系数：蛋白 3.5，脂肪 8.5，碳水 3.5）
  const proteinKcal = totals.protein_g * 3.5;
  const fatKcal = totals.fat_g * 8.5;
  const carbKcal = totals.carb_g * 3.5;
  const macroKcalSum = proteinKcal + fatKcal + carbKcal;

  const macroME = {
    proteinPct: macroKcalSum > 0 ? (proteinKcal / macroKcalSum) * 100 : 0,
    fatPct: macroKcalSum > 0 ? (fatKcal / macroKcalSum) * 100 : 0,
    carbPct: macroKcalSum > 0 ? (carbKcal / macroKcalSum) * 100 : 0,
  };

  const evaluations: NutrientEvaluation[] = NUTRIENT_META_LIST.map((meta) => {
    const bounds = getStandardBounds(meta.key, standard, lifeStage);
    const val = per1000kcal[meta.key];
    const totalAmount =
      meta.key === 'ca_p_ratio'
        ? caPRatio
        : totals[meta.key as UnifiedNutrientKey] || 0;

    const missingCount =
      meta.key === 'ca_p_ratio'
        ? (missingCounts.calcium_mg || 0) + (missingCounts.phosphorus_mg || 0)
        : missingCounts[meta.key as UnifiedNutrientKey] || 0;

    let status: TrafficLightStatus = 'green';
    let reason: NutrientEvaluation['reason'] = 'ok';

    if (meta.key === 'ca_p_ratio') {
      if (totalWeightG === 0 || totals.phosphorus_mg === 0) {
        status = 'neutral';
        reason = 'no_std';
      } else if (val < 1.0) {
        status = 'red';
        reason = 'low_critical';
      } else if (val > 2.0) {
        status = 'red';
        reason = 'high_danger';
      } else if (val < COOKED_HOMEMADE_CAP_MIN) {
        status = 'yellow';
        reason = 'low_warn';
      } else if (val > COOKED_HOMEMADE_CAP_MAX) {
        status = 'yellow';
        reason = 'high_warn';
      } else {
        status = 'green';
        reason = 'ok';
      }
    } else if (bounds.min === null && bounds.max === null) {
      status = 'neutral';
      reason = 'no_std';
    } else if (bounds.max !== null && val > bounds.max) {
      status = 'red';
      reason = 'high_danger';
    } else if (bounds.min !== null && val < bounds.min) {
      // 低于最低值：低于 70% 标红灯，70%–100% 标黄灯
      if (val < bounds.min * 0.7) {
        status = 'red';
        reason = 'low_critical';
      } else {
        status = 'yellow';
        reason = 'low_warn';
      }
    } else {
      status = 'green';
      reason = 'ok';
    }

    return {
      key: meta.key,
      label: meta.label,
      unit: meta.unit,
      group: meta.group,
      core: Boolean(meta.core),
      highRiskUpper: Boolean(meta.highRiskUpper),
      decimals: meta.decimals ?? 1,
      totalAmount,
      per1000kcal: val,
      min: bounds.min,
      max: bounds.max,
      maxLabel: bounds.maxLabel,
      note: bounds.note,
      status,
      reason,
      hasMissingSource: missingCount > 0,
      missingCount,
    };
  });

  const highRiskAlerts = evaluations.filter(
    (ev) => ev.reason === 'high_danger' && (ev.highRiskUpper || ev.key === 'fat_g' || ev.key === 'ca_p_ratio')
  );

  const missingNutrientKeys = Object.entries(missingCounts)
    .filter(([, count]) => (count || 0) > 0)
    .map(([k]) => k as UnifiedNutrientKey);

  return {
    totalWeightG,
    totalKcal,
    meatTotals,
    supplementTotals,
    totals,
    per1000kcal,
    caPRatio,
    macroME,
    roleWeights,
    evaluations,
    highRiskAlerts,
    hasMissingData: missingNutrientKeys.length > 0,
    missingNutrientKeys,
    proxyIngredients: Array.from(proxyIngredientsMap.values()),
    hasUnquantifiedFishOilVE,
    hasSyntheticVEReminder,
    hasBComplexCholineNote,
  };
}

function roundDosage(val: number, unitBasis: 'g' | 'capsule' | 'tablet'): number {
  if (!Number.isFinite(val) || val <= 0) return 0;
  // 向上取整至 0.01，确保自动推荐后不因四舍五入略低于最低标准
  const factor = unitBasis === 'g' ? 100 : 100;
  return Math.ceil(val * factor) / factor;
}

/**
 * 计算单款补剂对当前食材清单的推荐用量（严格遵循 6 大补剂公式）
 */
export function computeRecommendedAmountForSupplement(
  supplement: SupplementRecord,
  meatResult: RecipeCalculationResult,
  standard: StandardType,
  lifeStage: LifeStage
): number {
  const { totalKcal, meatTotals } = meatResult;
  if (totalKcal <= 0) return 0;

  const stdTable =
    standard === 'NRC'
      ? lifeStage === 'kitten'
        ? STANDARDS_DB.NRC_2006.kitten_growth_ra
        : STANDARDS_DB.NRC_2006.adult_maintenance_ra
      : lifeStage === 'kitten'
      ? STANDARDS_DB.AAFCO_2016_2026.kitten_growth_min
      : STANDARDS_DB.AAFCO_2016_2026.adult_maintenance_min;

  const kcalFactor = totalKcal / 1000;

  switch (supplement.type) {
    case 'calcium': {
      // target_ca = Math.max(total_meat_phosphorus_mg * 1.2, (total_kcal / 1000) * std.calcium_mg)
      const stdCa = stdTable.calcium_mg ?? 720;
      const targetCa = Math.max(meatTotals.phosphorus_mg * TARGET_CAP_RATIO, kcalFactor * stdCa);
      const caPerG = supplement.nutrients.calcium_mg || 0;
      if (caPerG <= 0) return 0;
      return roundDosage(Math.max(0, targetCa - meatTotals.calcium_mg) / caPerG, supplement.unit_basis);
    }

    case 'iodine': {
      // 陆生肉碘为 null 时按 0 保守计算（meatTotals.iodine_ug 已自动跳过 null 仅累加海鲜实测值）
      // 推荐片数 = Math.max(0, (total_kcal / 1000) * std.iodine_ug - total_meat_iodine_ug) / 225
      const stdIodine = stdTable.iodine_ug ?? 350;
      const iodinePerTab = supplement.nutrients.iodine_ug || 225;
      if (iodinePerTab <= 0) return 0;
      return roundDosage(
        Math.max(0, kcalFactor * stdIodine - meatTotals.iodine_ug) / iodinePerTab,
        supplement.unit_basis
      );
    }

    case 'fish_oil': {
      // 按 EPA+DHA 缺口除以每粒含量（NOW 750mg/粒，Viva 1035mg/粒）
      // 若当前标准 epa_dha_mg 为 null（如 AAFCO 成猫），使用 NRC 成猫 25mg/1000kcal 作为参考基准
      const stdEpaDha =
        stdTable.epa_dha_mg ?? STANDARDS_DB.NRC_2006.adult_maintenance_ra.epa_dha_mg ?? 25;
      const epaDhaPerCap = supplement.nutrients.epa_dha_mg || 0;
      if (epaDhaPerCap <= 0) return 0;
      return roundDosage(
        Math.max(0, kcalFactor * stdEpaDha - meatTotals.epa_dha_mg) / epaDhaPerCap,
        supplement.unit_basis
      );
    }

    case 've': {
      // 按 ve_mg 缺口计算（双鲸 100mg/粒）
      const stdVe = stdTable.ve_mg ?? 10;
      const vePerCap = supplement.nutrients.ve_mg || 0;
      if (vePerCap <= 0) return 0;
      return roundDosage(
        Math.max(0, kcalFactor * stdVe - meatTotals.ve_mg) / vePerCap,
        supplement.unit_basis
      );
    }

    case 'vb': {
      // 优先补齐 VB1 缺口，元素胆碱已在 supplement.nutrients.choline_mg 按 41.1% 折算好
      const stdVb1 = stdTable.vb1_mg ?? 1.4;
      const vb1PerTab = supplement.nutrients.vb1_mg || 0;
      if (vb1PerTab <= 0) return 0;
      return roundDosage(
        Math.max(0, kcalFactor * stdVb1 - meatTotals.vb1_mg) / vb1PerTab,
        supplement.unit_basis
      );
    }

    case 'taurine': {
      // 熟自制按高水分兜底基准（500 mg / 1,000 kcal），不含 VE
      const targetTaurine = kcalFactor * COOKED_HOMEMADE_TAURINE_FLOOR_MG;
      const taurinePerCap = supplement.nutrients.taurine_mg || 0;
      if (taurinePerCap <= 0) return 0;
      return roundDosage(
        Math.max(0, targetTaurine - meatTotals.taurine_mg) / taurinePerCap,
        supplement.unit_basis
      );
    }

    default:
      return 0;
  }
}

export const DEFAULT_SUPPLEMENT_BRANDS: Record<SupplementCategoryKey, string> = {
  calcium: 'sup_01', // NOW Calcium Citrate Pure Powder
  iodine: 'sup_05', // NOW Potassium Plus Iodine
  fish_oil: 'sup_03', // NOW Ultra Omega-3 (750mg)
  ve: 'sup_08', // 双鲸维生素 E 软胶囊
  vb: 'sup_06', // NaturesPlus B-Complex (90片版)
  taurine: 'sup_09', // NOW Taurine 1000 mg
};

/**
 * 智能推荐食谱补剂清单：
 * 保留用户已选择的同类补剂品牌，按最新食材清单重新计算推荐用量
 */
export function recommendSupplements(
  ingredients: RecipeIngredientInput[],
  standard: StandardType = 'NRC',
  lifeStage: LifeStage = 'adult',
  existingSupplements: Array<{ supplementId: string; amount: number | string }> = []
): Array<{ supplementId: string; amount: number }> {
  const meatOnly = calculateRecipeNutrition(ingredients, [], standard, lifeStage);
  if (meatOnly.totalKcal <= 0) return [];

  // 尊重用户当前已选品牌
  const brandByType: Record<SupplementCategoryKey, string> = { ...DEFAULT_SUPPLEMENT_BRANDS };
  for (const existing of existingSupplements) {
    const supp = getSupplementById(existing.supplementId);
    if (supp) {
      brandByType[supp.type] = supp.id;
    }
  }

  const order: SupplementCategoryKey[] = ['calcium', 'iodine', 'fish_oil', 've', 'vb', 'taurine'];
  const result: Array<{ supplementId: string; amount: number }> = [];

  for (const type of order) {
    const supp = getSupplementById(brandByType[type]);
    if (!supp) continue;
    const amount = computeRecommendedAmountForSupplement(supp, meatOnly, standard, lifeStage);
    if (amount > 0) {
      result.push({ supplementId: supp.id, amount });
    }
  }

  return result;
}

/**
 * 自动生成食谱食材分配比例（严格符合 role 配比规范）：
 * 红肉 20–30% (25%)、白肉 25–40% (35%)、心脏 5–20% (15%)、
 * 鱼类 8–10% (10%)、青口贝 5%、肝脏 5–10% (5%)、其他内脏 5%
 * 合计 = 100%
 */
export const AUTO_RECIPE_ROLE_RATIOS: Array<{ role: IngredientRole; ratio: number; preferredIds: string[] }> = [
  { role: 'white_meat', ratio: 0.35, preferredIds: ['ing_086', 'ing_101', 'ing_167', 'ing_092'] }, // 鸡胸/鸭胸/火鸡胸
  { role: 'red_meat', ratio: 0.25, preferredIds: ['ing_001', 'ing_055', 'ing_002', 'ing_054'] },   // 猪里脊/牛里脊/猪后腿
  { role: 'heart', ratio: 0.15, preferredIds: ['ing_089', 'ing_171', 'ing_004', 'ing_059'] },      // 鸡心/火鸡心/猪心/牛心
  { role: 'fish', ratio: 0.10, preferredIds: ['ing_126', 'ing_127', 'ing_132', 'ing_135'] },       // 三文鱼/鲭鱼/青花鱼
  { role: 'mussel', ratio: 0.05, preferredIds: ['ing_131', 'ing_128'] },                           // 青口贝(生)/青口贝(煮熟)
  { role: 'liver', ratio: 0.05, preferredIds: ['ing_090', 'ing_104', 'ing_172', 'ing_005'] },      // 鸡肝/鸭肝/火鸡肝/猪肝
  { role: 'other_organ', ratio: 0.05, preferredIds: ['ing_006', 'ing_014', 'ing_015', 'ing_091'] }, // 猪腰/猪舌/猪脾/鸡胗
];

function matchesAllergy(ing: IngredientRecord, allergies: string[]): boolean {
  if (!allergies || allergies.length === 0) return false;
  const cleanName = ing.name.replace(/牛磺酸/g, '');
  return allergies.some((raw) => {
    const keyword = raw.trim();
    if (!keyword) return false;
    const base = keyword.replace(/肉$/u, '');
    return (
      cleanName.includes(keyword) ||
      ing.category.includes(keyword) ||
      (base.length > 0 && (cleanName.includes(base) || ing.category.includes(base)))
    );
  });
}

export interface InventoryCandidate {
  meatId: string;
  weight: number;
  expiryDate?: string;
}

/**
 * 按 role 比例自动生成食谱食材清单，优先实测数据 (is_proxy: false)，兼容库存优先模式与过敏源过滤
 */
export function generateAutoRecipeIngredients(
  totalWeightG: number,
  options?: {
    mode?: 'custom' | 'by_inventory' | 'standard';
    inventory?: InventoryCandidate[];
    allergies?: string[];
  }
): Array<{ meatId: string; weight: number }> {
  const mode = options?.mode || 'custom';
  const allergies = options?.allergies || [];
  const inventory = (options?.inventory || [])
    .filter((i) => i.weight > 0)
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

  const chosen: Array<{ meatId: string; weight: number }> = [];
  let allocated = 0;

  for (let idx = 0; idx < AUTO_RECIPE_ROLE_RATIOS.length; idx++) {
    const slot = AUTO_RECIPE_ROLE_RATIOS[idx];
    const targetWeight =
      idx === AUTO_RECIPE_ROLE_RATIOS.length - 1
        ? Math.max(10, Math.round(totalWeightG - allocated))
        : Math.max(10, Math.round((totalWeightG * slot.ratio) / 5) * 5);

    let selected: IngredientRecord | undefined;

    // 1. 若按库存生成，优先从库存中找对应 role 且未过敏的食材（优先临期）
    if (mode === 'by_inventory' && inventory.length > 0) {
      for (const inv of inventory) {
        const ing = getIngredientById(inv.meatId);
        if (ing && ing.role === slot.role && !matchesAllergy(ing, allergies)) {
          selected = ing;
          break;
        }
      }
    }

    // 2. 从该 role 的首选实测食材中挑未过敏的
    if (!selected) {
      for (const id of slot.preferredIds) {
        const ing = getIngredientById(id);
        if (ing && !ing.is_proxy && !matchesAllergy(ing, allergies)) {
          selected = ing;
          break;
        }
      }
    }

    // 3. 退回任意该 role 的实测食材
    if (!selected) {
      selected = INGREDIENTS_DB.find(
        (ing) => ing.role === slot.role && !ing.is_proxy && !matchesAllergy(ing, allergies)
      );
    }

    // 4. 最终兜底任意该 role 食材
    if (!selected) {
      selected = INGREDIENTS_DB.find((ing) => ing.role === slot.role);
    }

    if (selected) {
      chosen.push({ meatId: selected.id, weight: targetWeight });
      allocated += targetWeight;
    }
  }

  return chosen;
}

/**
 * 判断猫咪生命阶段（任一选中猫咪年龄 < 1 岁则为幼猫生长期）
 */
export function inferLifeStageFromCats(cats: Array<{ age?: number }>): LifeStage {
  if (cats.some((c) => typeof c.age === 'number' && c.age > 0 && c.age < 1)) {
    return 'kitten';
  }
  return 'adult';
}

/**
 * 兼容旧版 localStorage 中的食材与补剂 ID 迁移
 */
const LEGACY_MEAT_ID_MAP: Record<string, string> = {
  m1: 'ing_001', // 猪里脊
  m2: 'ing_002', // 猪后腿肉
  m3: 'ing_003', // 猪前腿肉
  m4: 'ing_004', // 猪心
  m5: 'ing_005', // 猪肝
  m6: 'ing_006', // 猪腰/猪肾
  m7: 'ing_086', // 鸡胸肉
  m8: 'ing_087', // 鸡腿肉
  m9: 'ing_088', // 鸡腿肉(带皮)
  m10: 'ing_089', // 鸡心
  m11: 'ing_090', // 鸡肝
  m12: 'ing_091', // 鸡胗
  m13: 'ing_101', // 鸭胸肉
  m14: 'ing_102', // 鸭腿肉
  m15: 'ing_103', // 鸭心
  m16: 'ing_104', // 鸭肝
  m17: 'ing_055', // 牛里脊
  m18: 'ing_056', // 牛腱子
  m19: 'ing_059', // 牛心
  m20: 'ing_060', // 牛肝
  m21: 'ing_126', // 三文鱼
  m22: 'ing_127', // 鲭鱼
  m23: 'ing_131', // 青口贝
};

const LEGACY_SUPP_ID_MAP: Record<string, string> = {
  s1: 'sup_01', // 柠檬酸钙
  s2: 'sup_02', // 碳酸钙
  s3: 'sup_03', // NOW 鱼油
  s4: 'sup_04', // Viva 鱼油
  s5: 'sup_05', // 碘化钾
  s6: 'sup_07', // Thompson B族
  s7: 'sup_06', // NaturesPlus B族
  s8: 'sup_08', // 双鲸 VE
  s9: 'sup_09', // NOW 牛磺酸 1000mg
  s10: 'sup_10', // NOW 牛磺酸 500mg
};

export function migrateLegacyMeatId(id: string): string {
  if (getIngredientById(id)) return id;
  if (LEGACY_MEAT_ID_MAP[id] && getIngredientById(LEGACY_MEAT_ID_MAP[id])) {
    return LEGACY_MEAT_ID_MAP[id];
  }
  return 'ing_086'; // fallback 鸡胸肉
}

export function migrateLegacySupplementId(id: string): string {
  if (getSupplementById(id)) return id;
  if (LEGACY_SUPP_ID_MAP[id] && getSupplementById(LEGACY_SUPP_ID_MAP[id])) {
    return LEGACY_SUPP_ID_MAP[id];
  }
  return 'sup_01';
}
